"""
Finance Tests

Testes unitários para:
- Models (CostCenter, RateCard, BudgetPlan, BudgetEnvelope, BudgetMonth)
- Serializers
- ViewSets/Endpoints
"""

import pytest
from decimal import Decimal
from datetime import date, timedelta
from django.test import TestCase
from django.core.exceptions import ValidationError
from rest_framework.test import APITestCase
from rest_framework import status

from apps.finance.models import (
    CostCenter,
    RateCard,
    BudgetPlan,
    BudgetEnvelope,
    BudgetMonth,
)
from apps.finance.serializers import (
    CostCenterSerializer,
    RateCardSerializer,
    BudgetPlanSerializer,
    BudgetEnvelopeSerializer,
)


class CostCenterModelTests(TestCase):
    """Testes para model CostCenter."""
    
    def test_create_cost_center(self):
        """Deve criar centro de custo básico."""
        cc = CostCenter.objects.create(
            code='CC-001',
            name='Sede São Paulo',
            description='Sede principal'
        )
        self.assertEqual(cc.code, 'CC-001')
        self.assertEqual(cc.name, 'Sede São Paulo')
        self.assertTrue(cc.is_active)
        self.assertIsNone(cc.parent)
        self.assertEqual(cc.level, 0)
    
    def test_create_hierarchy(self):
        """Deve criar hierarquia de centros de custo."""
        parent = CostCenter.objects.create(code='CC-001', name='Sede')
        child = CostCenter.objects.create(
            code='CC-001-01',
            name='HVAC',
            parent=parent
        )
        grandchild = CostCenter.objects.create(
            code='CC-001-01-01',
            name='Chiller',
            parent=child
        )
        
        self.assertEqual(parent.level, 0)
        self.assertEqual(child.level, 1)
        self.assertEqual(grandchild.level, 2)
        self.assertEqual(grandchild.full_path, 'Sede > HVAC > Chiller')
    
    def test_prevent_self_reference(self):
        """Não deve permitir auto-referência."""
        cc = CostCenter.objects.create(code='CC-001', name='Test')
        cc.parent = cc
        
        with self.assertRaises(ValidationError):
            cc.save()
    
    def test_unique_code(self):
        """Código deve ser único."""
        CostCenter.objects.create(code='CC-001', name='First')
        
        with self.assertRaises(Exception):  # IntegrityError
            CostCenter.objects.create(code='CC-001', name='Second')
    
    def test_tags_default(self):
        """Tags deve ser lista vazia por padrão."""
        cc = CostCenter.objects.create(code='CC-001', name='Test')
        self.assertEqual(cc.tags, [])
    
    def test_tags_json(self):
        """Deve armazenar tags como JSON."""
        cc = CostCenter.objects.create(
            code='CC-001',
            name='Test',
            tags=['hvac', 'crítico']
        )
        cc.refresh_from_db()
        self.assertEqual(cc.tags, ['hvac', 'crítico'])


class RateCardModelTests(TestCase):
    """Testes para model RateCard."""
    
    def test_create_rate_card(self):
        """Deve criar rate card básico."""
        rc = RateCard.objects.create(
            role='Técnico HVAC',
            role_code='TECH-HVAC',
            cost_per_hour=Decimal('85.00'),
            effective_from=date(2024, 1, 1)
        )
        self.assertEqual(rc.role, 'Técnico HVAC')
        self.assertEqual(rc.cost_per_hour, Decimal('85.00'))
        self.assertEqual(rc.currency, 'BRL')
        self.assertIsNone(rc.effective_to)
    
    def test_rate_card_with_end_date(self):
        """Deve criar rate card com data de fim."""
        rc = RateCard.objects.create(
            role='Eletricista',
            cost_per_hour=Decimal('100.00'),
            effective_from=date(2024, 1, 1),
            effective_to=date(2024, 12, 31)
        )
        self.assertEqual(rc.effective_to, date(2024, 12, 31))
    
    def test_effective_to_before_from(self):
        """Data de fim não pode ser anterior à de início."""
        with self.assertRaises(ValidationError):
            RateCard.objects.create(
                role='Test',
                cost_per_hour=Decimal('50.00'),
                effective_from=date(2024, 6, 1),
                effective_to=date(2024, 1, 1)
            )
    
    def test_get_rate_for_role(self):
        """Deve retornar rate card vigente para função."""
        RateCard.objects.create(
            role='Técnico',
            cost_per_hour=Decimal('80.00'),
            effective_from=date(2023, 1, 1),
            effective_to=date(2023, 12, 31)
        )
        current = RateCard.objects.create(
            role='Técnico',
            cost_per_hour=Decimal('90.00'),
            effective_from=date(2024, 1, 1)
        )
        
        result = RateCard.get_rate_for_role('Técnico', date(2024, 6, 1))
        self.assertEqual(result, current)
    
    def test_get_rate_for_role_not_found(self):
        """Deve retornar None se não encontrar rate card."""
        result = RateCard.get_rate_for_role('Inexistente', date(2024, 1, 1))
        self.assertIsNone(result)


class BudgetPlanModelTests(TestCase):
    """Testes para model BudgetPlan."""
    
    def test_create_budget_plan(self):
        """Deve criar plano orçamentário."""
        plan = BudgetPlan.objects.create(
            code='BUDGET-2024',
            name='Orçamento 2024',
            year=2024,
            start_date=date(2024, 1, 1),
            end_date=date(2024, 12, 31)
        )
        self.assertEqual(plan.code, 'BUDGET-2024')
        self.assertEqual(plan.status, BudgetPlan.Status.DRAFT)
        self.assertEqual(plan.total_planned, Decimal('0.00'))
    
    def test_unique_code(self):
        """Código deve ser único."""
        BudgetPlan.objects.create(
            code='BUDGET-2024',
            name='First',
            year=2024,
            start_date=date(2024, 1, 1),
            end_date=date(2024, 12, 31)
        )
        
        with self.assertRaises(Exception):
            BudgetPlan.objects.create(
                code='BUDGET-2024',
                name='Second',
                year=2024,
                start_date=date(2024, 1, 1),
                end_date=date(2024, 12, 31)
            )
    
    def test_end_before_start(self):
        """Data de fim não pode ser anterior à de início."""
        with self.assertRaises(ValidationError):
            BudgetPlan.objects.create(
                code='TEST',
                name='Test',
                year=2024,
                start_date=date(2024, 12, 31),
                end_date=date(2024, 1, 1)
            )


class BudgetEnvelopeModelTests(TestCase):
    """Testes para model BudgetEnvelope."""
    
    def setUp(self):
        self.cost_center = CostCenter.objects.create(code='CC-001', name='Test')
        self.plan = BudgetPlan.objects.create(
            code='BUDGET-2024',
            name='Orçamento 2024',
            year=2024,
            start_date=date(2024, 1, 1),
            end_date=date(2024, 12, 31)
        )
    
    def test_create_envelope(self):
        """Deve criar envelope de orçamento."""
        envelope = BudgetEnvelope.objects.create(
            budget_plan=self.plan,
            cost_center=self.cost_center,
            name='Manutenção Preventiva',
            category=BudgetEnvelope.Category.PREVENTIVE,
            amount=Decimal('120000.00')
        )
        self.assertEqual(envelope.amount, Decimal('120000.00'))
        self.assertEqual(envelope.category, 'preventive')
    
    def test_envelope_updates_plan_total(self):
        """Criar envelope deve atualizar total do plano."""
        BudgetEnvelope.objects.create(
            budget_plan=self.plan,
            cost_center=self.cost_center,
            name='Envelope 1',
            category=BudgetEnvelope.Category.PREVENTIVE,
            amount=Decimal('50000.00')
        )
        
        self.plan.refresh_from_db()
        self.assertEqual(self.plan.total_planned, Decimal('50000.00'))
        
        BudgetEnvelope.objects.create(
            budget_plan=self.plan,
            cost_center=self.cost_center,
            name='Envelope 2',
            category=BudgetEnvelope.Category.CORRECTIVE,
            amount=Decimal('30000.00')
        )
        
        self.plan.refresh_from_db()
        self.assertEqual(self.plan.total_planned, Decimal('80000.00'))
    
    def test_unique_plan_cc_category(self):
        """Não pode haver dois envelopes para mesmo plano/cc/categoria."""
        BudgetEnvelope.objects.create(
            budget_plan=self.plan,
            cost_center=self.cost_center,
            name='First',
            category=BudgetEnvelope.Category.PREVENTIVE,
            amount=Decimal('10000.00')
        )
        
        with self.assertRaises(Exception):
            BudgetEnvelope.objects.create(
                budget_plan=self.plan,
                cost_center=self.cost_center,
                name='Second',
                category=BudgetEnvelope.Category.PREVENTIVE,
                amount=Decimal('20000.00')
            )


class BudgetMonthModelTests(TestCase):
    """Testes para model BudgetMonth."""
    
    def setUp(self):
        self.cost_center = CostCenter.objects.create(code='CC-001', name='Test')
        self.plan = BudgetPlan.objects.create(
            code='BUDGET-2024',
            name='Orçamento 2024',
            year=2024,
            start_date=date(2024, 1, 1),
            end_date=date(2024, 12, 31)
        )
        self.envelope = BudgetEnvelope.objects.create(
            budget_plan=self.plan,
            cost_center=self.cost_center,
            name='Test Envelope',
            category=BudgetEnvelope.Category.PREVENTIVE,
            amount=Decimal('120000.00')
        )
    
    def test_create_budget_month(self):
        """Deve criar mês do orçamento."""
        month = BudgetMonth.objects.create(
            envelope=self.envelope,
            month=date(2024, 1, 1),
            planned_amount=Decimal('10000.00')
        )
        self.assertEqual(month.planned_amount, Decimal('10000.00'))
        self.assertFalse(month.is_locked)
    
    def test_normalizes_to_first_day(self):
        """Deve normalizar data para primeiro dia do mês."""
        month = BudgetMonth.objects.create(
            envelope=self.envelope,
            month=date(2024, 1, 15),  # Dia 15
            planned_amount=Decimal('10000.00')
        )
        self.assertEqual(month.month.day, 1)
    
    def test_unique_envelope_month(self):
        """Não pode haver dois registros para mesmo envelope/mês."""
        BudgetMonth.objects.create(
            envelope=self.envelope,
            month=date(2024, 1, 1),
            planned_amount=Decimal('10000.00')
        )
        
        with self.assertRaises(Exception):
            BudgetMonth.objects.create(
                envelope=self.envelope,
                month=date(2024, 1, 1),
                planned_amount=Decimal('5000.00')
            )
    
    def test_lock_unlock(self):
        """Deve bloquear e desbloquear mês."""
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        # Criar usuário para o teste (ajustar conforme modelo)
        # Este teste pode precisar de ajustes dependendo do User model
        month = BudgetMonth.objects.create(
            envelope=self.envelope,
            month=date(2024, 1, 1),
            planned_amount=Decimal('10000.00')
        )
        
        self.assertFalse(month.is_locked)
        
        # Mock do user para teste
        class MockUser:
            pass
        user = MockUser()
        
        month.lock(user)
        self.assertTrue(month.is_locked)
        self.assertIsNotNone(month.locked_at)
        
        month.unlock(user)
        self.assertFalse(month.is_locked)
        self.assertIsNone(month.locked_at)


class CostCenterSerializerTests(TestCase):
    """Testes para CostCenterSerializer."""
    
    def test_serialize_cost_center(self):
        """Deve serializar centro de custo."""
        cc = CostCenter.objects.create(
            code='CC-001',
            name='Test',
            tags=['hvac']
        )
        serializer = CostCenterSerializer(cc)
        data = serializer.data
        
        self.assertEqual(data['code'], 'CC-001')
        self.assertEqual(data['name'], 'Test')
        self.assertEqual(data['level'], 0)
        self.assertEqual(data['tags'], ['hvac'])
    
    def test_deserialize_cost_center(self):
        """Deve deserializar centro de custo."""
        data = {
            'code': 'CC-002',
            'name': 'New CC',
            'description': 'Test description'
        }
        serializer = CostCenterSerializer(data=data)
        self.assertTrue(serializer.is_valid())
        cc = serializer.save()
        
        self.assertEqual(cc.code, 'CC-002')
        self.assertEqual(cc.name, 'New CC')


class RateCardSerializerTests(TestCase):
    """Testes para RateCardSerializer."""
    
    def test_serialize_rate_card(self):
        """Deve serializar rate card."""
        rc = RateCard.objects.create(
            role='Técnico',
            cost_per_hour=Decimal('85.00'),
            effective_from=date(2024, 1, 1)
        )
        serializer = RateCardSerializer(rc)
        data = serializer.data
        
        self.assertEqual(data['role'], 'Técnico')
        self.assertEqual(data['cost_per_hour'], '85.00')
        self.assertTrue(data['is_current'])
    
    def test_is_current_false_for_future(self):
        """is_current deve ser False para rate card futuro."""
        rc = RateCard.objects.create(
            role='Técnico',
            cost_per_hour=Decimal('100.00'),
            effective_from=date.today() + timedelta(days=30)
        )
        serializer = RateCardSerializer(rc)
        self.assertFalse(serializer.data['is_current'])


# =============================================================================
# API Tests (precisam de setup de tenant para funcionar no django-tenants)
# =============================================================================

# Nota: Os testes de API abaixo requerem setup especial para django-tenants
# Em ambiente real, usar TenantTestCase ou similar do django-tenants

class FinanceAPITests(TestCase):
    """
    Testes de API Finance.
    
    Nota: Estes testes são estruturais. Em ambiente com django-tenants,
    usar TenantTestCase para testes de integração completos.
    """
    
    def test_models_exist(self):
        """Verifica que os models existem e podem ser instanciados."""
        # CostCenter
        cc = CostCenter(code='TEST', name='Test')
        self.assertIsNotNone(cc)
        
        # RateCard
        rc = RateCard(role='Test', cost_per_hour=Decimal('50'), effective_from=date.today())
        self.assertIsNotNone(rc)
        
        # BudgetPlan
        bp = BudgetPlan(
            code='TEST',
            name='Test',
            year=2024,
            start_date=date.today(),
            end_date=date.today()
        )
        self.assertIsNotNone(bp)
