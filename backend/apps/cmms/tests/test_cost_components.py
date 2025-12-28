"""
Testes para CMMS - Cost Components (CMMS-001)

Testes unitários e de integração para TimeEntry, PartUsage e ExternalCost.
"""

import uuid
from decimal import Decimal
from datetime import date, timedelta

from django.test import TestCase
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from rest_framework.test import APITestCase
from rest_framework import status

User = get_user_model()


class TimeEntryModelTests(TestCase):
    """Testes unitários para TimeEntry."""
    
    @classmethod
    def setUpTestData(cls):
        """Dados compartilhados entre os testes."""
        from apps.assets.models import Asset
        from apps.cmms.models import WorkOrder
        
        cls.user = User.objects.create_user(
            email='tech@test.com',
            password='testpass123',
            first_name='Tech',
            last_name='Test'
        )
        
        # Criar asset para a OS
        cls.asset = Asset.objects.create(
            tag='AST-001',
            name='Chiller 01',
            status='OPERATIONAL'
        )
        
        cls.work_order = WorkOrder.objects.create(
            asset=cls.asset,
            type='CORRECTIVE',
            priority='MEDIUM',
            status='OPEN',
            description='Teste de manutenção',
            created_by=cls.user
        )
    
    def test_create_time_entry(self):
        """Testa criação de TimeEntry."""
        from apps.cmms.models import TimeEntry
        
        entry = TimeEntry.objects.create(
            work_order=self.work_order,
            technician=self.user,
            role='Técnico HVAC',
            role_code='TECH-HVAC',
            hours=Decimal('4.5'),
            work_date=date.today(),
            hourly_rate=Decimal('85.00'),
            description='Troca de filtros',
            created_by=self.user
        )
        
        self.assertEqual(entry.role, 'Técnico HVAC')
        self.assertEqual(entry.hours, Decimal('4.5'))
        self.assertIsNotNone(entry.id)
    
    def test_time_entry_total_cost(self):
        """Testa cálculo de custo total."""
        from apps.cmms.models import TimeEntry
        
        entry = TimeEntry.objects.create(
            work_order=self.work_order,
            role='Eletricista',
            hours=Decimal('8.0'),
            work_date=date.today(),
            hourly_rate=Decimal('100.00')
        )
        
        self.assertEqual(entry.total_cost, Decimal('800.00'))
    
    def test_time_entry_total_cost_without_rate(self):
        """Testa custo total sem hourly_rate."""
        from apps.cmms.models import TimeEntry
        
        entry = TimeEntry.objects.create(
            work_order=self.work_order,
            role='Auxiliar',
            hours=Decimal('4.0'),
            work_date=date.today()
        )
        
        self.assertIsNone(entry.total_cost)
    
    def test_time_entry_str(self):
        """Testa representação string."""
        from apps.cmms.models import TimeEntry
        
        entry = TimeEntry.objects.create(
            work_order=self.work_order,
            role='Técnico',
            hours=Decimal('2.5'),
            work_date=date.today()
        )
        
        self.assertIn(self.work_order.number, str(entry))
        self.assertIn('Técnico', str(entry))
        self.assertIn('2.5', str(entry))


class PartUsageModelTests(TestCase):
    """Testes unitários para PartUsage."""
    
    @classmethod
    def setUpTestData(cls):
        from apps.assets.models import Asset
        from apps.cmms.models import WorkOrder
        
        cls.user = User.objects.create_user(
            email='tech2@test.com',
            password='testpass123'
        )
        
        cls.asset = Asset.objects.create(
            tag='AST-002',
            name='Bomba 01',
            status='OPERATIONAL'
        )
        
        cls.work_order = WorkOrder.objects.create(
            asset=cls.asset,
            type='CORRECTIVE',
            priority='HIGH',
            status='OPEN',
            description='Troca de selo',
            created_by=cls.user
        )
    
    def test_create_part_usage_manual(self):
        """Testa criação de PartUsage com dados manuais."""
        from apps.cmms.models import PartUsage
        
        usage = PartUsage.objects.create(
            work_order=self.work_order,
            part_number='SEL-001',
            part_name='Selo Mecânico',
            quantity=Decimal('2'),
            unit='UN',
            unit_cost=Decimal('150.00'),
            created_by=self.user
        )
        
        self.assertEqual(usage.part_name, 'Selo Mecânico')
        self.assertEqual(usage.quantity, Decimal('2'))
        self.assertFalse(usage.inventory_deducted)
    
    def test_part_usage_total_cost(self):
        """Testa cálculo de custo total."""
        from apps.cmms.models import PartUsage
        
        usage = PartUsage.objects.create(
            work_order=self.work_order,
            part_name='Filtro',
            quantity=Decimal('5'),
            unit='UN',
            unit_cost=Decimal('25.00')
        )
        
        self.assertEqual(usage.total_cost, Decimal('125.00'))
    
    def test_part_usage_validation_requires_identification(self):
        """Testa que é necessário identificar a peça."""
        from apps.cmms.models import PartUsage
        
        usage = PartUsage(
            work_order=self.work_order,
            quantity=Decimal('1'),
            unit='UN'
            # Sem part_name nem inventory_item
        )
        
        with self.assertRaises(ValidationError):
            usage.full_clean()
    
    def test_part_usage_str(self):
        """Testa representação string."""
        from apps.cmms.models import PartUsage
        
        usage = PartUsage.objects.create(
            work_order=self.work_order,
            part_name='Rolamento',
            quantity=Decimal('4'),
            unit='UN'
        )
        
        self.assertIn(self.work_order.number, str(usage))
        self.assertIn('Rolamento', str(usage))


class ExternalCostModelTests(TestCase):
    """Testes unitários para ExternalCost."""
    
    @classmethod
    def setUpTestData(cls):
        from apps.assets.models import Asset
        from apps.cmms.models import WorkOrder
        
        cls.user = User.objects.create_user(
            email='tech3@test.com',
            password='testpass123'
        )
        
        cls.asset = Asset.objects.create(
            tag='AST-003',
            name='Compressor 01',
            status='OPERATIONAL'
        )
        
        cls.work_order = WorkOrder.objects.create(
            asset=cls.asset,
            type='CORRECTIVE',
            priority='CRITICAL',
            status='IN_PROGRESS',
            description='Reparo emergencial',
            created_by=cls.user
        )
    
    def test_create_external_cost(self):
        """Testa criação de ExternalCost."""
        from apps.cmms.models import ExternalCost
        
        cost = ExternalCost.objects.create(
            work_order=self.work_order,
            cost_type='SERVICE',
            supplier_name='Serviço Técnico ABC',
            supplier_document='12345678000199',
            description='Serviço de solda especializada',
            amount=Decimal('2500.00'),
            invoice_number='NF-12345',
            invoice_date=date.today(),
            created_by=self.user
        )
        
        self.assertEqual(cost.supplier_name, 'Serviço Técnico ABC')
        self.assertEqual(cost.amount, Decimal('2500.00'))
        self.assertEqual(cost.cost_type, 'SERVICE')
    
    def test_external_cost_types(self):
        """Testa tipos de custo externo."""
        from apps.cmms.models import ExternalCost
        
        types = ['SERVICE', 'RENTAL', 'MATERIAL', 'TRANSPORT', 'CONSULTANT', 'OTHER']
        
        for cost_type in types:
            cost = ExternalCost.objects.create(
                work_order=self.work_order,
                cost_type=cost_type,
                supplier_name=f'Fornecedor {cost_type}',
                description=f'Teste {cost_type}',
                amount=Decimal('100.00')
            )
            self.assertEqual(cost.cost_type, cost_type)
    
    def test_external_cost_str(self):
        """Testa representação string."""
        from apps.cmms.models import ExternalCost
        
        cost = ExternalCost.objects.create(
            work_order=self.work_order,
            supplier_name='Empresa XYZ',
            description='Serviço',
            amount=Decimal('1500.00')
        )
        
        self.assertIn(self.work_order.number, str(cost))
        self.assertIn('Empresa XYZ', str(cost))
        self.assertIn('1500', str(cost))


class ExternalCostAttachmentModelTests(TestCase):
    """Testes unitários para ExternalCostAttachment."""
    
    @classmethod
    def setUpTestData(cls):
        from apps.assets.models import Asset
        from apps.cmms.models import WorkOrder, ExternalCost
        
        cls.user = User.objects.create_user(
            email='tech4@test.com',
            password='testpass123'
        )
        
        cls.asset = Asset.objects.create(
            tag='AST-004',
            name='Torre de Resfriamento',
            status='OPERATIONAL'
        )
        
        cls.work_order = WorkOrder.objects.create(
            asset=cls.asset,
            type='PREVENTIVE',
            priority='MEDIUM',
            status='OPEN',
            description='Limpeza anual',
            created_by=cls.user
        )
        
        cls.external_cost = ExternalCost.objects.create(
            work_order=cls.work_order,
            supplier_name='Limpeza Industrial',
            description='Limpeza química',
            amount=Decimal('5000.00')
        )
    
    def test_attachment_file_types(self):
        """Testa tipos de arquivo de anexo."""
        from apps.cmms.models import ExternalCostAttachment
        
        types = ['INVOICE', 'RECEIPT', 'REPORT', 'PHOTO', 'CONTRACT', 'OTHER']
        
        for file_type in types:
            attachment = ExternalCostAttachment(
                external_cost=self.external_cost,
                file_type=file_type,
                file_name=f'documento_{file_type}.pdf'
            )
            self.assertEqual(attachment.file_type, file_type)
    
    def test_attachment_str(self):
        """Testa representação string."""
        from apps.cmms.models import ExternalCostAttachment
        
        attachment = ExternalCostAttachment(
            external_cost=self.external_cost,
            file_type='INVOICE',
            file_name='nota_fiscal.pdf'
        )
        
        self.assertIn('nota_fiscal.pdf', str(attachment))


# ============================================
# API TESTS
# ============================================

class TimeEntryAPITests(APITestCase):
    """Testes de API para TimeEntry."""
    
    @classmethod
    def setUpTestData(cls):
        from apps.assets.models import Asset
        from apps.cmms.models import WorkOrder
        
        cls.user = User.objects.create_user(
            email='api_tech@test.com',
            password='testpass123'
        )
        
        cls.asset = Asset.objects.create(
            tag='AST-API-001',
            name='Chiller API Test',
            status='OPERATIONAL'
        )
        
        cls.work_order = WorkOrder.objects.create(
            asset=cls.asset,
            type='CORRECTIVE',
            priority='MEDIUM',
            status='OPEN',
            description='Teste API',
            created_by=cls.user
        )
    
    def setUp(self):
        self.client.force_authenticate(user=self.user)
    
    def test_list_time_entries(self):
        """Testa listagem de apontamentos."""
        from apps.cmms.models import TimeEntry
        
        TimeEntry.objects.create(
            work_order=self.work_order,
            role='Técnico',
            hours=Decimal('4'),
            work_date=date.today()
        )
        
        response = self.client.get('/api/cmms/time-entries/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data['results']), 1)
    
    def test_create_time_entry(self):
        """Testa criação via API."""
        data = {
            'work_order': self.work_order.id,
            'role': 'Eletricista',
            'hours': '6.5',
            'work_date': str(date.today()),
            'hourly_rate': '100.00',
            'description': 'Reparo elétrico'
        }
        
        response = self.client.post('/api/cmms/time-entries/', data)
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['role'], 'Eletricista')
        self.assertEqual(response.data['hours'], '6.50')
    
    def test_create_time_entry_cancelled_wo(self):
        """Testa que não permite criar em OS cancelada."""
        from apps.cmms.models import WorkOrder
        
        cancelled_wo = WorkOrder.objects.create(
            asset=self.asset,
            type='CORRECTIVE',
            status='CANCELLED',
            description='OS Cancelada',
            created_by=self.user
        )
        
        data = {
            'work_order': cancelled_wo.id,
            'role': 'Técnico',
            'hours': '2',
            'work_date': str(date.today())
        }
        
        response = self.client.post('/api/cmms/time-entries/', data)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_filter_time_entries_by_date(self):
        """Testa filtro por data."""
        from apps.cmms.models import TimeEntry
        
        today = date.today()
        yesterday = today - timedelta(days=1)
        
        TimeEntry.objects.create(
            work_order=self.work_order,
            role='Técnico',
            hours=Decimal('4'),
            work_date=today
        )
        TimeEntry.objects.create(
            work_order=self.work_order,
            role='Técnico',
            hours=Decimal('4'),
            work_date=yesterday
        )
        
        response = self.client.get(f'/api/cmms/time-entries/?start_date={today}')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Todos os resultados devem ser de hoje ou depois
        for entry in response.data['results']:
            self.assertGreaterEqual(entry['work_date'], str(today))
    
    def test_time_entry_stats(self):
        """Testa endpoint de estatísticas."""
        from apps.cmms.models import TimeEntry
        
        TimeEntry.objects.create(
            work_order=self.work_order,
            role='Técnico HVAC',
            hours=Decimal('8'),
            work_date=date.today()
        )
        
        response = self.client.get('/api/cmms/time-entries/stats/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('total_hours', response.data)
        self.assertIn('entries_count', response.data)


class PartUsageAPITests(APITestCase):
    """Testes de API para PartUsage."""
    
    @classmethod
    def setUpTestData(cls):
        from apps.assets.models import Asset
        from apps.cmms.models import WorkOrder
        
        cls.user = User.objects.create_user(
            email='api_tech2@test.com',
            password='testpass123'
        )
        
        cls.asset = Asset.objects.create(
            tag='AST-API-002',
            name='Bomba API Test',
            status='OPERATIONAL'
        )
        
        cls.work_order = WorkOrder.objects.create(
            asset=cls.asset,
            type='CORRECTIVE',
            priority='HIGH',
            status='IN_PROGRESS',
            description='Teste API',
            created_by=cls.user
        )
    
    def setUp(self):
        self.client.force_authenticate(user=self.user)
    
    def test_create_part_usage(self):
        """Testa criação via API."""
        data = {
            'work_order': self.work_order.id,
            'part_name': 'Selo Mecânico',
            'part_number': 'SEL-001',
            'quantity': '2',
            'unit': 'UN',
            'unit_cost': '150.00'
        }
        
        response = self.client.post('/api/cmms/part-usages/', data)
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['part_name'], 'Selo Mecânico')
    
    def test_create_part_usage_without_identification(self):
        """Testa que requer identificação."""
        data = {
            'work_order': self.work_order.id,
            'quantity': '1',
            'unit': 'UN'
            # Sem part_name nem inventory_item
        }
        
        response = self.client.post('/api/cmms/part-usages/', data)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_list_part_usages_by_work_order(self):
        """Testa listagem por OS."""
        from apps.cmms.models import PartUsage
        
        PartUsage.objects.create(
            work_order=self.work_order,
            part_name='Filtro',
            quantity=Decimal('5'),
            unit='UN',
            unit_cost=Decimal('25.00')
        )
        
        response = self.client.get(
            f'/api/cmms/part-usages/by_work_order/?work_order_id={self.work_order.id}'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('parts', response.data)
        self.assertIn('summary', response.data)


class ExternalCostAPITests(APITestCase):
    """Testes de API para ExternalCost."""
    
    @classmethod
    def setUpTestData(cls):
        from apps.assets.models import Asset
        from apps.cmms.models import WorkOrder
        
        cls.user = User.objects.create_user(
            email='api_tech3@test.com',
            password='testpass123'
        )
        
        cls.asset = Asset.objects.create(
            tag='AST-API-003',
            name='Compressor API Test',
            status='OPERATIONAL'
        )
        
        cls.work_order = WorkOrder.objects.create(
            asset=cls.asset,
            type='CORRECTIVE',
            priority='CRITICAL',
            status='IN_PROGRESS',
            description='Teste API',
            created_by=cls.user
        )
    
    def setUp(self):
        self.client.force_authenticate(user=self.user)
    
    def test_create_external_cost(self):
        """Testa criação via API."""
        data = {
            'work_order': self.work_order.id,
            'cost_type': 'SERVICE',
            'supplier_name': 'Serviço Técnico XYZ',
            'supplier_document': '12345678000199',
            'description': 'Reparo especializado',
            'amount': '3500.00',
            'invoice_number': 'NF-001',
            'invoice_date': str(date.today())
        }
        
        response = self.client.post('/api/cmms/external-costs/', data)
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['supplier_name'], 'Serviço Técnico XYZ')
    
    def test_filter_external_costs_by_type(self):
        """Testa filtro por tipo."""
        from apps.cmms.models import ExternalCost
        
        ExternalCost.objects.create(
            work_order=self.work_order,
            cost_type='SERVICE',
            supplier_name='Serviço',
            description='Teste',
            amount=Decimal('1000')
        )
        ExternalCost.objects.create(
            work_order=self.work_order,
            cost_type='RENTAL',
            supplier_name='Locadora',
            description='Teste',
            amount=Decimal('500')
        )
        
        response = self.client.get('/api/cmms/external-costs/?cost_type=SERVICE')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        for cost in response.data['results']:
            self.assertEqual(cost['cost_type'], 'SERVICE')
    
    def test_external_cost_stats(self):
        """Testa endpoint de estatísticas."""
        from apps.cmms.models import ExternalCost
        
        ExternalCost.objects.create(
            work_order=self.work_order,
            cost_type='SERVICE',
            supplier_name='Fornecedor A',
            description='Serviço A',
            amount=Decimal('2000')
        )
        
        response = self.client.get('/api/cmms/external-costs/stats/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('total_amount', response.data)
        self.assertIn('by_type', response.data)
        self.assertIn('top_suppliers', response.data)


class WorkOrderCostSummaryAPITests(APITestCase):
    """Testes de API para resumo de custos da OS."""
    
    @classmethod
    def setUpTestData(cls):
        from apps.assets.models import Asset
        from apps.cmms.models import WorkOrder, TimeEntry, PartUsage, ExternalCost
        
        cls.user = User.objects.create_user(
            email='api_summary@test.com',
            password='testpass123'
        )
        
        cls.asset = Asset.objects.create(
            tag='AST-SUM-001',
            name='Equipamento Summary',
            status='OPERATIONAL'
        )
        
        cls.work_order = WorkOrder.objects.create(
            asset=cls.asset,
            type='CORRECTIVE',
            priority='HIGH',
            status='IN_PROGRESS',
            description='OS com custos',
            created_by=cls.user
        )
        
        # Criar custos
        TimeEntry.objects.create(
            work_order=cls.work_order,
            role='Técnico',
            hours=Decimal('8'),
            work_date=date.today(),
            hourly_rate=Decimal('100')
        )
        
        PartUsage.objects.create(
            work_order=cls.work_order,
            part_name='Peça A',
            quantity=Decimal('2'),
            unit_cost=Decimal('50')
        )
        
        ExternalCost.objects.create(
            work_order=cls.work_order,
            supplier_name='Fornecedor',
            description='Serviço',
            amount=Decimal('500')
        )
    
    def setUp(self):
        self.client.force_authenticate(user=self.user)
    
    def test_get_cost_summary(self):
        """Testa resumo de custos da OS."""
        response = self.client.get(f'/api/cmms/work-order-costs/{self.work_order.id}/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['work_order_number'], self.work_order.number)
        
        # Verificar labor
        self.assertEqual(response.data['labor']['entries_count'], 1)
        self.assertEqual(response.data['labor']['total_hours'], Decimal('8'))
        self.assertEqual(response.data['labor']['total_cost'], Decimal('800'))
        
        # Verificar parts
        self.assertEqual(response.data['parts']['count'], 1)
        self.assertEqual(response.data['parts']['total_cost'], Decimal('100'))
        
        # Verificar external
        self.assertEqual(response.data['external']['count'], 1)
        self.assertEqual(response.data['external']['total_cost'], Decimal('500'))
        
        # Grand total: 800 + 100 + 500 = 1400
        self.assertEqual(response.data['grand_total'], Decimal('1400'))
    
    def test_cost_summary_not_found(self):
        """Testa OS não encontrada."""
        response = self.client.get('/api/cmms/work-order-costs/99999/')
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
