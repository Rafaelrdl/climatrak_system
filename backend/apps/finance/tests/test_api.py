"""
Finance API Tests

Testes de integração para os endpoints da API Finance.
Usa django-tenants TenantTestCase para testes em ambiente multi-tenant.

Endpoints testados:
- CostCenter CRUD + tree + roots + children
- RateCard CRUD + current + for_role
- BudgetPlan CRUD + activate + close + summary
- BudgetEnvelope CRUD
- BudgetMonth CRUD + lock + unlock

NOTA: Estes testes usam TenantTestCase com chamadas diretas às views via
APIRequestFactory em vez de HTTP client, para funcionar corretamente com
django-tenants multi-tenant e autenticação JWT.
"""

import uuid
from decimal import Decimal
from datetime import date, timedelta
from django_tenants.test.cases import TenantTestCase
from django.urls import reverse
from rest_framework.test import APIRequestFactory, force_authenticate
from rest_framework import status

from apps.finance.models import (
    CostCenter,
    RateCard,
    BudgetPlan,
    BudgetEnvelope,
    BudgetMonth,
)
from apps.finance.views import (
    CostCenterViewSet,
    RateCardViewSet,
    BudgetPlanViewSet,
    BudgetEnvelopeViewSet,
    BudgetMonthViewSet,
)


class BaseFinanceAPITestCase(TenantTestCase):
    """
    Base class para testes de API Finance.
    
    Usa django-tenants TenantTestCase e APIRequestFactory para criar
    requests autenticados e chamar views diretamente.
    """
    
    def setUp(self):
        """Setup comum para todos os testes."""
        super().setUp()
        self.factory = APIRequestFactory()
        
        # Criar usuário de teste
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        self.user = User.objects.create_user(
            username='test_finance',
            email='test@example.com',
            password='testpass123',
            first_name='Test',
            last_name='User'
        )


class CostCenterAPITests(BaseFinanceAPITestCase):
    """Testes para endpoints de CostCenter."""
    
    def test_list_cost_centers(self):
        """GET /api/finance/cost-centers/ deve listar centros de custo."""
        CostCenter.objects.create(code='CC-001', name='Centro 1')
        CostCenter.objects.create(code='CC-002', name='Centro 2')
        
        request = self.factory.get('/api/finance/cost-centers/')
        force_authenticate(request, user=self.user)
        view = CostCenterViewSet.as_view({'get': 'list'})
        response = view(request)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('results', response.data)
        self.assertEqual(len(response.data['results']), 2)
    
    def test_create_cost_center(self):
        """POST /api/finance/cost-centers/ deve criar centro de custo."""
        data = {
            'code': 'CC-NEW',
            'name': 'Novo Centro',
            'description': 'Descrição do centro',
            'tags': ['hvac', 'crítico']
        }
        
        request = self.factory.post('/api/finance/cost-centers/', data, format='json')
        force_authenticate(request, user=self.user)
        view = CostCenterViewSet.as_view({'post': 'create'})
        response = view(request)
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['code'], 'CC-NEW')
        self.assertEqual(response.data['name'], 'Novo Centro')
        self.assertEqual(response.data['tags'], ['hvac', 'crítico'])
        self.assertEqual(response.data['level'], 0)
    
    def test_create_cost_center_with_parent(self):
        """Deve criar centro de custo filho."""
        parent = CostCenter.objects.create(code='CC-PARENT', name='Parent')
        
        data = {
            'code': 'CC-CHILD',
            'name': 'Child',
            'parent': str(parent.id)
        }
        
        request = self.factory.post('/api/finance/cost-centers/', data, format='json')
        force_authenticate(request, user=self.user)
        view = CostCenterViewSet.as_view({'post': 'create'})
        response = view(request)
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['level'], 1)
        self.assertEqual(str(response.data['parent']), str(parent.id))
    
    def test_retrieve_cost_center(self):
        """GET /api/finance/cost-centers/{id}/ deve retornar detalhes."""
        cc = CostCenter.objects.create(code='CC-001', name='Test')
        
        request = self.factory.get(f'/api/finance/cost-centers/{cc.id}/')
        force_authenticate(request, user=self.user)
        view = CostCenterViewSet.as_view({'get': 'retrieve'})
        response = view(request, pk=cc.id)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['code'], 'CC-001')
    
    def test_update_cost_center(self):
        """PUT/PATCH deve atualizar centro de custo."""
        cc = CostCenter.objects.create(code='CC-001', name='Original')
        
        request = self.factory.patch(
            f'/api/finance/cost-centers/{cc.id}/',
            {'name': 'Updated'},
            format='json'
        )
        force_authenticate(request, user=self.user)
        view = CostCenterViewSet.as_view({'patch': 'partial_update'})
        response = view(request, pk=cc.id)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name'], 'Updated')
    
    def test_delete_cost_center(self):
        """DELETE deve excluir centro de custo."""
        cc = CostCenter.objects.create(code='CC-001', name='Test')
        
        request = self.factory.delete(f'/api/finance/cost-centers/{cc.id}/')
        force_authenticate(request, user=self.user)
        view = CostCenterViewSet.as_view({'delete': 'destroy'})
        response = view(request, pk=cc.id)
        
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(CostCenter.objects.filter(id=cc.id).exists())
    
    def test_cost_centers_tree(self):
        """GET /api/finance/cost-centers/tree/ deve retornar árvore."""
        parent = CostCenter.objects.create(code='CC-001', name='Parent')
        CostCenter.objects.create(code='CC-001-01', name='Child', parent=parent)
        
        request = self.factory.get('/api/finance/cost-centers/tree/')
        force_authenticate(request, user=self.user)
        view = CostCenterViewSet.as_view({'get': 'tree'})
        response = view(request)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(len(response.data[0]['children']), 1)
    
    def test_cost_centers_roots(self):
        """GET /api/finance/cost-centers/roots/ deve retornar apenas raízes."""
        parent = CostCenter.objects.create(code='CC-001', name='Parent')
        CostCenter.objects.create(code='CC-002', name='Child', parent=parent)
        
        request = self.factory.get('/api/finance/cost-centers/roots/')
        force_authenticate(request, user=self.user)
        view = CostCenterViewSet.as_view({'get': 'roots'})
        response = view(request)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
    
    def test_cost_center_children(self):
        """GET /api/finance/cost-centers/{id}/children/ deve retornar filhos."""
        parent = CostCenter.objects.create(code='CC-001', name='Parent')
        CostCenter.objects.create(code='CC-001-01', name='Child 1', parent=parent)
        CostCenter.objects.create(code='CC-001-02', name='Child 2', parent=parent)
        
        request = self.factory.get(f'/api/finance/cost-centers/{parent.id}/children/')
        force_authenticate(request, user=self.user)
        view = CostCenterViewSet.as_view({'get': 'children'})
        response = view(request, pk=parent.id)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)
    
    def test_filter_by_code(self):
        """Deve filtrar por código."""
        CostCenter.objects.create(code='HVAC-001', name='HVAC')
        CostCenter.objects.create(code='ELEC-001', name='Elétrica')
        
        request = self.factory.get('/api/finance/cost-centers/', {'code': 'hvac'})
        force_authenticate(request, user=self.user)
        view = CostCenterViewSet.as_view({'get': 'list'})
        response = view(request)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['code'], 'HVAC-001')
    
    def test_search_cost_centers(self):
        """Deve buscar por texto."""
        CostCenter.objects.create(code='CC-001', name='Ar Condicionado')
        CostCenter.objects.create(code='CC-002', name='Elétrica')
        
        request = self.factory.get('/api/finance/cost-centers/', {'search': 'condicionado'})
        force_authenticate(request, user=self.user)
        view = CostCenterViewSet.as_view({'get': 'list'})
        response = view(request)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)


class RateCardAPITests(BaseFinanceAPITestCase):
    """Testes para endpoints de RateCard."""
    
    def test_list_rate_cards(self):
        """GET /api/finance/rate-cards/ deve listar rate cards."""
        RateCard.objects.create(
            role='Técnico HVAC',
            cost_per_hour=Decimal('85.00'),
            effective_from=date(2024, 1, 1)
        )
        
        request = self.factory.get('/api/finance/rate-cards/')
        force_authenticate(request, user=self.user)
        view = RateCardViewSet.as_view({'get': 'list'})
        response = view(request)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('results', response.data)
    
    def test_create_rate_card(self):
        """POST /api/finance/rate-cards/ deve criar rate card."""
        data = {
            'role': 'Eletricista',
            'role_code': 'ELEC-001',
            'cost_per_hour': '120.00',
            'effective_from': '2024-01-01'
        }
        
        request = self.factory.post('/api/finance/rate-cards/', data, format='json')
        force_authenticate(request, user=self.user)
        view = RateCardViewSet.as_view({'post': 'create'})
        response = view(request)
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['role'], 'Eletricista')
        self.assertEqual(response.data['cost_per_hour'], '120.00')
    
    def test_rate_cards_current(self):
        """GET /api/finance/rate-cards/current/ deve retornar apenas vigentes."""
        RateCard.objects.create(
            role='Técnico',
            cost_per_hour=Decimal('90.00'),
            effective_from=date.today() - timedelta(days=30)
        )
        RateCard.objects.create(
            role='Técnico Senior',
            cost_per_hour=Decimal('120.00'),
            effective_from=date.today() + timedelta(days=30)
        )
        
        request = self.factory.get('/api/finance/rate-cards/current/')
        force_authenticate(request, user=self.user)
        view = RateCardViewSet.as_view({'get': 'current'})
        response = view(request)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['role'], 'Técnico')
    
    def test_rate_cards_for_role(self):
        """GET /api/finance/rate-cards/for-role/?role=X deve retornar rate card."""
        RateCard.objects.create(
            role='Técnico HVAC',
            cost_per_hour=Decimal('85.00'),
            effective_from=date.today() - timedelta(days=30)
        )
        
        request = self.factory.get('/api/finance/rate-cards/for_role/', {'role': 'Técnico HVAC'})
        force_authenticate(request, user=self.user)
        view = RateCardViewSet.as_view({'get': 'for_role'})
        response = view(request)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['role'], 'Técnico HVAC')
    
    def test_rate_cards_for_role_not_found(self):
        """Deve retornar 404 se rate card não encontrado."""
        request = self.factory.get('/api/finance/rate-cards/for_role/', {'role': 'Inexistente'})
        force_authenticate(request, user=self.user)
        view = RateCardViewSet.as_view({'get': 'for_role'})
        response = view(request)
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    
    def test_rate_cards_for_role_missing_param(self):
        """Deve retornar 400 se parâmetro role não fornecido."""
        request = self.factory.get('/api/finance/rate-cards/for_role/')
        force_authenticate(request, user=self.user)
        view = RateCardViewSet.as_view({'get': 'for_role'})
        response = view(request)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class BudgetPlanAPITests(BaseFinanceAPITestCase):
    """Testes para endpoints de BudgetPlan."""
    
    def test_list_budget_plans(self):
        """GET /api/finance/budget-plans/ deve listar planos."""
        BudgetPlan.objects.create(
            code='BUDGET-2024',
            name='Orçamento 2024',
            year=2024,
            start_date=date(2024, 1, 1),
            end_date=date(2024, 12, 31)
        )
        
        request = self.factory.get('/api/finance/budget-plans/')
        force_authenticate(request, user=self.user)
        view = BudgetPlanViewSet.as_view({'get': 'list'})
        response = view(request)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('results', response.data)
    
    def test_create_budget_plan(self):
        """POST /api/finance/budget-plans/ deve criar plano."""
        data = {
            'code': 'BUDGET-2025',
            'name': 'Orçamento 2025',
            'year': 2025,
            'start_date': '2025-01-01',
            'end_date': '2025-12-31',
            'status': 'draft'
        }
        
        request = self.factory.post('/api/finance/budget-plans/', data, format='json')
        force_authenticate(request, user=self.user)
        view = BudgetPlanViewSet.as_view({'post': 'create'})
        response = view(request)
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['code'], 'BUDGET-2025')
        self.assertEqual(response.data['status'], 'draft')
    
    def test_retrieve_budget_plan_with_envelopes(self):
        """GET /api/finance/budget-plans/{id}/ deve incluir envelopes."""
        plan = BudgetPlan.objects.create(
            code='BUDGET-2024',
            name='Orçamento 2024',
            year=2024,
            start_date=date(2024, 1, 1),
            end_date=date(2024, 12, 31)
        )
        cc = CostCenter.objects.create(code='CC-001', name='Test')
        BudgetEnvelope.objects.create(
            budget_plan=plan,
            cost_center=cc,
            name='Envelope Test',
            category=BudgetEnvelope.Category.PREVENTIVE,
            amount=Decimal('50000.00')
        )
        
        request = self.factory.get(f'/api/finance/budget-plans/{plan.id}/')
        force_authenticate(request, user=self.user)
        view = BudgetPlanViewSet.as_view({'get': 'retrieve'})
        response = view(request, pk=plan.id)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('envelopes', response.data)
        self.assertEqual(len(response.data['envelopes']), 1)
    
    def test_activate_budget_plan(self):
        """POST /api/finance/budget-plans/{id}/activate/ deve ativar plano."""
        plan = BudgetPlan.objects.create(
            code='BUDGET-2024',
            name='Orçamento 2024',
            year=2024,
            start_date=date(2024, 1, 1),
            end_date=date(2024, 12, 31),
            status=BudgetPlan.Status.DRAFT
        )
        
        request = self.factory.post(f'/api/finance/budget-plans/{plan.id}/activate/')
        force_authenticate(request, user=self.user)
        view = BudgetPlanViewSet.as_view({'post': 'activate'})
        response = view(request, pk=plan.id)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'active')
    
    def test_activate_non_draft_plan_fails(self):
        """Não deve ativar plano que não está em draft."""
        plan = BudgetPlan.objects.create(
            code='BUDGET-2024',
            name='Orçamento 2024',
            year=2024,
            start_date=date(2024, 1, 1),
            end_date=date(2024, 12, 31),
            status=BudgetPlan.Status.ACTIVE
        )
        
        request = self.factory.post(f'/api/finance/budget-plans/{plan.id}/activate/')
        force_authenticate(request, user=self.user)
        view = BudgetPlanViewSet.as_view({'post': 'activate'})
        response = view(request, pk=plan.id)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_close_budget_plan(self):
        """POST /api/finance/budget-plans/{id}/close/ deve fechar plano."""
        plan = BudgetPlan.objects.create(
            code='BUDGET-2024',
            name='Orçamento 2024',
            year=2024,
            start_date=date(2024, 1, 1),
            end_date=date(2024, 12, 31),
            status=BudgetPlan.Status.ACTIVE
        )
        
        request = self.factory.post(f'/api/finance/budget-plans/{plan.id}/close/')
        force_authenticate(request, user=self.user)
        view = BudgetPlanViewSet.as_view({'post': 'close'})
        response = view(request, pk=plan.id)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'closed')
    
    def test_budget_plan_summary(self):
        """GET /api/finance/budget-plans/{id}/summary/ deve retornar resumo."""
        plan = BudgetPlan.objects.create(
            code='BUDGET-2024',
            name='Orçamento 2024',
            year=2024,
            start_date=date(2024, 1, 1),
            end_date=date(2024, 12, 31)
        )
        cc = CostCenter.objects.create(code='CC-001', name='Test')
        BudgetEnvelope.objects.create(
            budget_plan=plan,
            cost_center=cc,
            name='Preventive',
            category=BudgetEnvelope.Category.PREVENTIVE,
            amount=Decimal('30000.00')
        )
        BudgetEnvelope.objects.create(
            budget_plan=plan,
            cost_center=cc,
            name='Corrective',
            category=BudgetEnvelope.Category.CORRECTIVE,
            amount=Decimal('20000.00')
        )
        
        request = self.factory.get(f'/api/finance/budget-plans/{plan.id}/summary/')
        force_authenticate(request, user=self.user)
        view = BudgetPlanViewSet.as_view({'get': 'summary'})
        response = view(request, pk=plan.id)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('by_category', response.data)
        self.assertIn('by_cost_center', response.data)
    
    def test_filter_budget_plans_by_year(self):
        """Deve filtrar planos por ano."""
        BudgetPlan.objects.create(
            code='BUDGET-2024',
            name='2024',
            year=2024,
            start_date=date(2024, 1, 1),
            end_date=date(2024, 12, 31)
        )
        BudgetPlan.objects.create(
            code='BUDGET-2025',
            name='2025',
            year=2025,
            start_date=date(2025, 1, 1),
            end_date=date(2025, 12, 31)
        )
        
        request = self.factory.get('/api/finance/budget-plans/', {'year': '2024'})
        force_authenticate(request, user=self.user)
        view = BudgetPlanViewSet.as_view({'get': 'list'})
        response = view(request)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['year'], 2024)


class BudgetEnvelopeAPITests(BaseFinanceAPITestCase):
    """Testes para endpoints de BudgetEnvelope."""
    
    def setUp(self):
        super().setUp()
        self.plan = BudgetPlan.objects.create(
            code='BUDGET-2024',
            name='Orçamento 2024',
            year=2024,
            start_date=date(2024, 1, 1),
            end_date=date(2024, 12, 31)
        )
        self.cost_center = CostCenter.objects.create(code='CC-001', name='Test')
    
    def test_list_envelopes(self):
        """GET /api/finance/budget-envelopes/ deve listar envelopes."""
        BudgetEnvelope.objects.create(
            budget_plan=self.plan,
            cost_center=self.cost_center,
            name='Test Envelope',
            category=BudgetEnvelope.Category.PREVENTIVE,
            amount=Decimal('50000.00')
        )
        
        request = self.factory.get('/api/finance/budget-envelopes/')
        force_authenticate(request, user=self.user)
        view = BudgetEnvelopeViewSet.as_view({'get': 'list'})
        response = view(request)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('results', response.data)
    
    def test_create_envelope(self):
        """POST /api/finance/budget-envelopes/ deve criar envelope."""
        data = {
            'budget_plan': str(self.plan.id),
            'cost_center': str(self.cost_center.id),
            'name': 'Manutenção Preventiva',
            'category': 'preventive',
            'amount': '100000.00'
        }
        
        request = self.factory.post('/api/finance/budget-envelopes/', data, format='json')
        force_authenticate(request, user=self.user)
        view = BudgetEnvelopeViewSet.as_view({'post': 'create'})
        response = view(request)
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['name'], 'Manutenção Preventiva')
    
    def test_create_envelope_with_months(self):
        """Deve criar envelope com distribuição mensal."""
        data = {
            'budget_plan': str(self.plan.id),
            'cost_center': str(self.cost_center.id),
            'name': 'Com Meses',
            'category': 'preventive',
            'amount': '120000.00',
            'months': [
                {'month': '2024-01-01', 'planned_amount': '10000.00'},
                {'month': '2024-02-01', 'planned_amount': '10000.00'},
            ]
        }
        
        request = self.factory.post('/api/finance/budget-envelopes/', data, format='json')
        force_authenticate(request, user=self.user)
        view = BudgetEnvelopeViewSet.as_view({'post': 'create'})
        response = view(request)
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        envelope = BudgetEnvelope.objects.get(id=response.data['id'])
        self.assertEqual(envelope.months.count(), 2)
    
    def test_filter_envelopes_by_budget_plan(self):
        """Deve filtrar envelopes por plano."""
        BudgetEnvelope.objects.create(
            budget_plan=self.plan,
            cost_center=self.cost_center,
            name='Test',
            category=BudgetEnvelope.Category.PREVENTIVE,
            amount=Decimal('50000.00')
        )
        
        request = self.factory.get('/api/finance/budget-envelopes/', {'budget_plan': str(self.plan.id)})
        force_authenticate(request, user=self.user)
        view = BudgetEnvelopeViewSet.as_view({'get': 'list'})
        response = view(request)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
    
    def test_filter_envelopes_by_category(self):
        """Deve filtrar envelopes por categoria."""
        BudgetEnvelope.objects.create(
            budget_plan=self.plan,
            cost_center=self.cost_center,
            name='Preventive',
            category=BudgetEnvelope.Category.PREVENTIVE,
            amount=Decimal('50000.00')
        )
        BudgetEnvelope.objects.create(
            budget_plan=self.plan,
            cost_center=self.cost_center,
            name='Corrective',
            category=BudgetEnvelope.Category.CORRECTIVE,
            amount=Decimal('30000.00')
        )
        
        request = self.factory.get('/api/finance/budget-envelopes/', {'category': 'preventive'})
        force_authenticate(request, user=self.user)
        view = BudgetEnvelopeViewSet.as_view({'get': 'list'})
        response = view(request)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)


class BudgetMonthAPITests(BaseFinanceAPITestCase):
    """Testes para endpoints de BudgetMonth."""
    
    def setUp(self):
        super().setUp()
        self.plan = BudgetPlan.objects.create(
            code='BUDGET-2024',
            name='Orçamento 2024',
            year=2024,
            start_date=date(2024, 1, 1),
            end_date=date(2024, 12, 31)
        )
        self.cost_center = CostCenter.objects.create(code='CC-001', name='Test')
        self.envelope = BudgetEnvelope.objects.create(
            budget_plan=self.plan,
            cost_center=self.cost_center,
            name='Test Envelope',
            category=BudgetEnvelope.Category.PREVENTIVE,
            amount=Decimal('120000.00')
        )
    
    def test_list_budget_months(self):
        """GET /api/finance/budget-months/ deve listar meses."""
        BudgetMonth.objects.create(
            envelope=self.envelope,
            month=date(2024, 1, 1),
            planned_amount=Decimal('10000.00')
        )
        
        request = self.factory.get('/api/finance/budget-months/')
        force_authenticate(request, user=self.user)
        view = BudgetMonthViewSet.as_view({'get': 'list'})
        response = view(request)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('results', response.data)
    
    def test_create_budget_month(self):
        """POST /api/finance/budget-months/ deve criar mês."""
        data = {
            'envelope': str(self.envelope.id),
            'month': '2024-03-01',
            'planned_amount': '10000.00'
        }
        
        request = self.factory.post('/api/finance/budget-months/', data, format='json')
        force_authenticate(request, user=self.user)
        view = BudgetMonthViewSet.as_view({'post': 'create'})
        response = view(request)
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['planned_amount'], '10000.00')
    
    def test_lock_budget_month(self):
        """POST /api/finance/budget-months/{id}/lock/ deve bloquear mês."""
        month = BudgetMonth.objects.create(
            envelope=self.envelope,
            month=date(2024, 1, 1),
            planned_amount=Decimal('10000.00')
        )
        
        request = self.factory.post(f'/api/finance/budget-months/{month.id}/lock/')
        force_authenticate(request, user=self.user)
        view = BudgetMonthViewSet.as_view({'post': 'lock'})
        response = view(request, pk=month.id)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['is_locked'])
    
    def test_unlock_budget_month(self):
        """POST /api/finance/budget-months/{id}/unlock/ deve desbloquear mês."""
        month = BudgetMonth.objects.create(
            envelope=self.envelope,
            month=date(2024, 1, 1),
            planned_amount=Decimal('10000.00'),
            is_locked=True
        )
        
        request = self.factory.post(f'/api/finance/budget-months/{month.id}/unlock/')
        force_authenticate(request, user=self.user)
        view = BudgetMonthViewSet.as_view({'post': 'unlock'})
        response = view(request, pk=month.id)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data['is_locked'])
    
    def test_filter_budget_months_by_envelope(self):
        """Deve filtrar meses por envelope."""
        BudgetMonth.objects.create(
            envelope=self.envelope,
            month=date(2024, 1, 1),
            planned_amount=Decimal('10000.00')
        )
        
        request = self.factory.get('/api/finance/budget-months/', {'envelope': str(self.envelope.id)})
        force_authenticate(request, user=self.user)
        view = BudgetMonthViewSet.as_view({'get': 'list'})
        response = view(request)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
    
    def test_filter_budget_months_by_year(self):
        """Deve filtrar meses por ano."""
        BudgetMonth.objects.create(
            envelope=self.envelope,
            month=date(2024, 1, 1),
            planned_amount=Decimal('10000.00')
        )
        BudgetMonth.objects.create(
            envelope=self.envelope,
            month=date(2024, 6, 1),
            planned_amount=Decimal('10000.00')
        )
        
        request = self.factory.get('/api/finance/budget-months/', {'year': 2024})
        force_authenticate(request, user=self.user)
        view = BudgetMonthViewSet.as_view({'get': 'list'})
        response = view(request)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 2)


class FinancePaginationTests(BaseFinanceAPITestCase):
    """Testes para verificar paginação dos endpoints."""
    
    def test_cost_centers_pagination(self):
        """Deve paginar resultados de cost centers."""
        for i in range(55):
            CostCenter.objects.create(code=f'CC-{i:03d}', name=f'Centro {i}')
        
        request = self.factory.get('/api/finance/cost-centers/')
        force_authenticate(request, user=self.user)
        view = CostCenterViewSet.as_view({'get': 'list'})
        response = view(request)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('count', response.data)
        self.assertIn('next', response.data)
        self.assertIn('previous', response.data)
        self.assertIn('results', response.data)
        self.assertEqual(response.data['count'], 55)
        self.assertEqual(len(response.data['results']), 50)
    
    def test_pagination_second_page(self):
        """Deve retornar segunda página corretamente."""
        for i in range(55):
            CostCenter.objects.create(code=f'CC-{i:03d}', name=f'Centro {i}')
        
        request = self.factory.get('/api/finance/cost-centers/', {'page': '2'})
        force_authenticate(request, user=self.user)
        view = CostCenterViewSet.as_view({'get': 'list'})
        response = view(request)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 5)


class FinanceOrderingTests(BaseFinanceAPITestCase):
    """Testes para verificar ordenação dos endpoints."""
    
    def test_cost_centers_ordering_by_code(self):
        """Deve ordenar cost centers por código."""
        CostCenter.objects.create(code='ZZ-001', name='Z')
        CostCenter.objects.create(code='AA-001', name='A')
        CostCenter.objects.create(code='MM-001', name='M')
        
        request = self.factory.get('/api/finance/cost-centers/', {'ordering': 'code'})
        force_authenticate(request, user=self.user)
        view = CostCenterViewSet.as_view({'get': 'list'})
        response = view(request)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        codes = [r['code'] for r in response.data['results']]
        self.assertEqual(codes, ['AA-001', 'MM-001', 'ZZ-001'])
    
    def test_cost_centers_ordering_descending(self):
        """Deve ordenar em ordem decrescente com -."""
        CostCenter.objects.create(code='ZZ-001', name='Z')
        CostCenter.objects.create(code='AA-001', name='A')
        
        request = self.factory.get('/api/finance/cost-centers/', {'ordering': '-code'})
        force_authenticate(request, user=self.user)
        view = CostCenterViewSet.as_view({'get': 'list'})
        response = view(request)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        codes = [r['code'] for r in response.data['results']]
        self.assertEqual(codes[0], 'ZZ-001')
