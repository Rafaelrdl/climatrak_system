"""
Script para criar 10 itens de estoque no módulo CMMS
com todos os campos preenchidos
"""

import os
import sys
import django
from decimal import Decimal

# Setup Django
sys.path.insert(0, os.path.dirname(__file__))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django_tenants.utils import schema_context
from apps.tenants.models import Tenant
from apps.inventory.models import InventoryCategory, InventoryItem


def create_categories():
    """Cria categorias de exemplo se não existirem"""
    categories = {
        'ELETRICA': {'name': 'Peças Elétricas', 'code': 'ELET', 'icon': 'zap', 'color': '#FFD700'},
        'MECANICA': {'name': 'Peças Mecânicas', 'code': 'MEC', 'icon': 'settings', 'color': '#4169E1'},
        'HIDRAULICA': {'name': 'Peças Hidráulicas', 'code': 'HID', 'icon': 'droplet', 'color': '#1E90FF'},
        'CONSUMIVEL': {'name': 'Consumíveis', 'code': 'CONS', 'icon': 'package', 'color': '#32CD32'},
        'FERRAMENTA': {'name': 'Ferramentas', 'code': 'FERR', 'icon': 'wrench', 'color': '#FF8C00'},
    }
    
    created = {}
    for key, data in categories.items():
        cat, _ = InventoryCategory.objects.get_or_create(
            code=data['code'],
            defaults={
                'name': data['name'],
                'icon': data['icon'],
                'color': data['color'],
                'is_active': True
            }
        )
        created[key] = cat
    
    return created


def create_inventory_items():
    """Cria 10 itens de estoque com todos os campos preenchidos"""
    
    print("Criando categorias...")
    categories = create_categories()
    
    items_data = [
        {
            'code': 'ELET-001',
            'name': 'Capacitor 50uF 440V',
            'manufacturer': 'WEG',
            'description': 'Capacitor de partida para motores elétricos, 50uF, tensão 440V, uso industrial',
            'barcode': '7891234567890',
            'category': categories['ELETRICA'],
            'unit': 'UN',
            'quantity': Decimal('25.00'),
            'min_quantity': Decimal('5.00'),
            'max_quantity': Decimal('50.00'),
            'reorder_point': Decimal('8.00'),
            'unit_cost': Decimal('45.90'),
            'last_purchase_cost': Decimal('43.50'),
            'location': 'Almoxarifado A',
            'shelf': 'A-03',
            'bin': 'Gaveta 12',
            'supplier': 'Distribuidora Elétrica Silva LTDA',
            'supplier_code': 'CAP-50UF-440V',
            'lead_time_days': 7,
            'is_active': True,
            'is_critical': True,
            'notes': 'Item crítico para manutenção de chillers. Sempre manter estoque mínimo.'
        },
        {
            'code': 'MEC-002',
            'name': 'Rolamento SKF 6205',
            'manufacturer': 'SKF',
            'description': 'Rolamento rígido de esferas, dimensões 25x52x15mm, classe de precisão P0',
            'barcode': '7891234567891',
            'category': categories['MECANICA'],
            'unit': 'UN',
            'quantity': Decimal('40.00'),
            'min_quantity': Decimal('10.00'),
            'max_quantity': Decimal('80.00'),
            'reorder_point': Decimal('15.00'),
            'unit_cost': Decimal('28.50'),
            'last_purchase_cost': Decimal('27.00'),
            'location': 'Almoxarifado A',
            'shelf': 'B-02',
            'bin': 'Gaveta 5',
            'supplier': 'Rolamentos Industrial Ltda',
            'supplier_code': 'SKF-6205-2RS',
            'lead_time_days': 5,
            'is_active': True,
            'is_critical': True,
            'notes': 'Rolamento de uso frequente em motores e ventiladores.'
        },
        {
            'code': 'HID-003',
            'name': 'Válvula Solenóide 1/2" 220V',
            'manufacturer': 'Danfoss',
            'description': 'Válvula solenóide normalmente fechada, conexão 1/2", alimentação 220V AC',
            'barcode': '7891234567892',
            'category': categories['HIDRAULICA'],
            'unit': 'UN',
            'quantity': Decimal('12.00'),
            'min_quantity': Decimal('3.00'),
            'max_quantity': Decimal('20.00'),
            'reorder_point': Decimal('5.00'),
            'unit_cost': Decimal('185.00'),
            'last_purchase_cost': Decimal('180.00'),
            'location': 'Almoxarifado B',
            'shelf': 'C-01',
            'bin': 'Gaveta 3',
            'supplier': 'Automação Refrigeração Comércio',
            'supplier_code': 'DANF-EVR-220V',
            'lead_time_days': 10,
            'is_active': True,
            'is_critical': True,
            'notes': 'Usado em sistemas de refrigeração. Item importado.'
        },
        {
            'code': 'CONS-004',
            'name': 'Óleo Lubrificante ISO 68 - 20L',
            'manufacturer': 'Shell',
            'description': 'Óleo lubrificante para compressores e sistemas hidráulicos, viscosidade ISO 68',
            'barcode': '7891234567893',
            'category': categories['CONSUMIVEL'],
            'unit': 'L',
            'quantity': Decimal('180.00'),
            'min_quantity': Decimal('40.00'),
            'max_quantity': Decimal('400.00'),
            'reorder_point': Decimal('60.00'),
            'unit_cost': Decimal('15.80'),
            'last_purchase_cost': Decimal('15.50'),
            'location': 'Almoxarifado B',
            'shelf': 'D-04',
            'bin': 'Prateleira Inferior',
            'supplier': 'Distribuidora de Lubrificantes XYZ',
            'supplier_code': 'SHELL-ISO68-20L',
            'lead_time_days': 3,
            'is_active': True,
            'is_critical': False,
            'notes': 'Comprar sempre em lotes de 200L para melhor preço.'
        },
        {
            'code': 'FERR-005',
            'name': 'Chave Combinada 19mm',
            'manufacturer': 'Gedore',
            'description': 'Chave combinada (boca/estria) 19mm, aço cromo-vanádio temperado',
            'barcode': '7891234567894',
            'category': categories['FERRAMENTA'],
            'unit': 'UN',
            'quantity': Decimal('8.00'),
            'min_quantity': Decimal('2.00'),
            'max_quantity': Decimal('15.00'),
            'reorder_point': Decimal('3.00'),
            'unit_cost': Decimal('42.00'),
            'last_purchase_cost': Decimal('40.00'),
            'location': 'Almoxarifado A',
            'shelf': 'E-01',
            'bin': 'Caixa Ferramentas',
            'supplier': 'Ferramentas Profissionais Ltda',
            'supplier_code': 'GED-CHV-19MM',
            'lead_time_days': 5,
            'is_active': True,
            'is_critical': False,
            'notes': 'Ferramenta de alta qualidade, uso diário pela equipe.'
        },
        {
            'code': 'ELET-006',
            'name': 'Contator 25A 220V 3 Polos',
            'manufacturer': 'Schneider Electric',
            'description': 'Contator tripolar 25A, bobina 220V AC, 1NA+1NF auxiliar',
            'barcode': '7891234567895',
            'category': categories['ELETRICA'],
            'unit': 'UN',
            'quantity': Decimal('15.00'),
            'min_quantity': Decimal('4.00'),
            'max_quantity': Decimal('30.00'),
            'reorder_point': Decimal('6.00'),
            'unit_cost': Decimal('125.00'),
            'last_purchase_cost': Decimal('120.00'),
            'location': 'Almoxarifado A',
            'shelf': 'A-02',
            'bin': 'Gaveta 8',
            'supplier': 'Distribuidora Elétrica Silva LTDA',
            'supplier_code': 'LC1D25M7',
            'lead_time_days': 7,
            'is_active': True,
            'is_critical': True,
            'notes': 'Usado em painéis de comando de chillers e bombas.'
        },
        {
            'code': 'MEC-007',
            'name': 'Correia V B-52',
            'manufacturer': 'Goodyear',
            'description': 'Correia em V perfil B, comprimento interno 52 polegadas (1321mm)',
            'barcode': '7891234567896',
            'category': categories['MECANICA'],
            'unit': 'UN',
            'quantity': Decimal('20.00'),
            'min_quantity': Decimal('6.00'),
            'max_quantity': Decimal('40.00'),
            'reorder_point': Decimal('8.00'),
            'unit_cost': Decimal('35.50'),
            'last_purchase_cost': Decimal('34.00'),
            'location': 'Almoxarifado A',
            'shelf': 'B-03',
            'bin': 'Prateleira Correias',
            'supplier': 'Correias e Transmissões Industrial',
            'supplier_code': 'GY-VB-52',
            'lead_time_days': 4,
            'is_active': True,
            'is_critical': False,
            'notes': 'Verificar estoque mensalmente, item de alto giro.'
        },
        {
            'code': 'HID-008',
            'name': 'Filtro Secador 1/2" Solda',
            'manufacturer': 'Danfoss',
            'description': 'Filtro secador hermético para instalação por solda, conexão 1/2" ODF',
            'barcode': '7891234567897',
            'category': categories['HIDRAULICA'],
            'unit': 'UN',
            'quantity': Decimal('30.00'),
            'min_quantity': Decimal('8.00'),
            'max_quantity': Decimal('60.00'),
            'reorder_point': Decimal('12.00'),
            'unit_cost': Decimal('68.00'),
            'last_purchase_cost': Decimal('65.00'),
            'location': 'Almoxarifado B',
            'shelf': 'C-02',
            'bin': 'Gaveta 7',
            'supplier': 'Refrigeração Industrial ABC',
            'supplier_code': 'DCL-164S',
            'lead_time_days': 8,
            'is_active': True,
            'is_critical': True,
            'notes': 'Essencial para manutenção de circuitos frigoríficos.'
        },
        {
            'code': 'CONS-009',
            'name': 'Graxa para Rolamentos - 1kg',
            'manufacturer': 'Mobil',
            'description': 'Graxa de lítio para rolamentos e mancais, NLGI 2, temperatura -20 a 130°C',
            'barcode': '7891234567898',
            'category': categories['CONSUMIVEL'],
            'unit': 'KG',
            'quantity': Decimal('45.00'),
            'min_quantity': Decimal('10.00'),
            'max_quantity': Decimal('100.00'),
            'reorder_point': Decimal('15.00'),
            'unit_cost': Decimal('28.90'),
            'last_purchase_cost': Decimal('27.50'),
            'location': 'Almoxarifado B',
            'shelf': 'D-02',
            'bin': 'Prateleira Média',
            'supplier': 'Distribuidora de Lubrificantes XYZ',
            'supplier_code': 'MOBIL-POLY-1KG',
            'lead_time_days': 3,
            'is_active': True,
            'is_critical': False,
            'notes': 'Usado em lubrificação preventiva de todos os equipamentos.'
        },
        {
            'code': 'FERR-010',
            'name': 'Multímetro Digital True RMS',
            'manufacturer': 'Fluke',
            'description': 'Multímetro digital profissional com medição True RMS, CAT III 600V',
            'barcode': '7891234567899',
            'category': categories['FERRAMENTA'],
            'unit': 'UN',
            'quantity': Decimal('3.00'),
            'min_quantity': Decimal('1.00'),
            'max_quantity': Decimal('5.00'),
            'reorder_point': Decimal('2.00'),
            'unit_cost': Decimal('850.00'),
            'last_purchase_cost': Decimal('820.00'),
            'location': 'Almoxarifado A',
            'shelf': 'E-02',
            'bin': 'Armário Trancado',
            'supplier': 'Instrumentação Técnica Profissional',
            'supplier_code': 'FLUKE-117',
            'lead_time_days': 15,
            'is_active': True,
            'is_critical': True,
            'notes': 'Equipamento de alto valor, controlar empréstimos com ficha.'
        },
    ]
    
    print("\nCriando itens de estoque...")
    created_items = []
    
    for item_data in items_data:
        item, created = InventoryItem.objects.get_or_create(
            code=item_data['code'],
            defaults=item_data
        )
        
        if created:
            created_items.append(item)
            print(f"✓ Criado: {item.code} - {item.name}")
        else:
            print(f"⊘ Já existe: {item.code} - {item.name}")
    
    print(f"\n{'='*60}")
    print(f"Total de itens criados: {len(created_items)}")
    print(f"Total de itens no sistema: {InventoryItem.objects.count()}")
    print(f"{'='*60}")
    
    # Exibir resumo por categoria
    print("\nResumo por Categoria:")
    for cat_key, cat in categories.items():
        count = InventoryItem.objects.filter(category=cat).count()
        total_value = sum(
            item.total_value 
            for item in InventoryItem.objects.filter(category=cat)
        )
        print(f"  {cat.name}: {count} itens (Valor total: R$ {total_value:,.2f})")
    
    return created_items


if __name__ == '__main__':
    print("="*60)
    print("CRIAÇÃO DE ITENS DE ESTOQUE - CMMS")
    print("="*60)
    
    # Obter todos os tenants (exceto public)
    try:
        tenants = Tenant.objects.exclude(schema_name='public').all()
        if not tenants:
            print("\n✗ Erro: Nenhum tenant encontrado!")
            sys.exit(1)
        
        for tenant in tenants:
            print(f"\n{'='*60}")
            print(f"Tenant: {tenant.name} (schema: {tenant.schema_name})")
            print(f"{'='*60}")
            
            with schema_context(tenant.schema_name):
                items = create_inventory_items()
        
        print("\n" + "="*60)
        print("✓ Script executado com sucesso em todos os tenants!")
        print("="*60)
            
    except Exception as e:
        print(f"\n✗ Erro ao executar script: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
