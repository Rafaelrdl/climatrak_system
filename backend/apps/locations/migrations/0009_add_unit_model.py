"""
Migration para adicionar modelo Unit e migrar Sector para referenciar Unit.

Hierarquia: Company > Unit > Sector > Subsection
"""

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


def create_units_from_sectors(apps, schema_editor):
    """
    Para cada Company com Sectors, cria uma Unit "Unidade Principal"
    e migra todos os Sectors para essa Unit.
    """
    Company = apps.get_model('locations', 'Company')
    Unit = apps.get_model('locations', 'Unit')
    Sector = apps.get_model('locations', 'Sector')
    
    # Agrupa setores por company
    companies_with_sectors = Company.objects.filter(sectors__isnull=False).distinct()
    
    for company in companies_with_sectors:
        # Cria uma Unit padrão para a empresa
        unit = Unit.objects.create(
            name="Unidade Principal",
            code=f"UP-{company.id}",
            description=f"Unidade principal migrada automaticamente de {company.name}",
            is_active=True,
            company=company,
            # Copia dados da empresa para a unidade
            cnpj=company.cnpj or '',
            address=company.address or '',
            city=company.city or '',
            state=company.state or '',
            zip_code=company.zip_code or '',
            responsible_name=company.responsible_name or '',
            responsible_role=company.responsible_role or '',
            total_area=company.total_area,
            occupants=company.occupants,
            hvac_units=company.hvac_units,
        )
        
        # Migra todos os setores dessa company para a nova unit
        Sector.objects.filter(company=company).update(unit=unit)


def reverse_migration(apps, schema_editor):
    """
    Reverte a migração: move os setores de volta para company
    e remove as units.
    """
    Unit = apps.get_model('locations', 'Unit')
    Sector = apps.get_model('locations', 'Sector')
    
    # Para cada setor com unit, define company = unit.company
    for sector in Sector.objects.filter(unit__isnull=False).select_related('unit'):
        sector.company = sector.unit.company
        sector.save()
    
    # Remove todas as units
    Unit.objects.all().delete()


class Migration(migrations.Migration):
    
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('locations', '0008_add_contact_fields_to_sector'),
    ]

    operations = [
        # 1. Criar modelo Unit
        migrations.CreateModel(
            name='Unit',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=255, verbose_name='Nome')),
                ('code', models.CharField(blank=True, max_length=50, verbose_name='Código')),
                ('description', models.TextField(blank=True, verbose_name='Descrição')),
                ('is_active', models.BooleanField(default=True, verbose_name='Ativo')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='Criado em')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='Atualizado em')),
                ('cnpj', models.CharField(blank=True, max_length=18, verbose_name='CNPJ')),
                ('address', models.TextField(blank=True, verbose_name='Endereço')),
                ('city', models.CharField(blank=True, max_length=100, verbose_name='Cidade')),
                ('state', models.CharField(blank=True, max_length=50, verbose_name='Estado')),
                ('zip_code', models.CharField(blank=True, max_length=10, verbose_name='CEP')),
                ('responsible_name', models.CharField(blank=True, max_length=255, verbose_name='Nome do Responsável')),
                ('responsible_role', models.CharField(blank=True, max_length=100, verbose_name='Cargo do Responsável')),
                ('total_area', models.DecimalField(blank=True, decimal_places=2, max_digits=12, null=True, verbose_name='Área Total (m²)')),
                ('occupants', models.PositiveIntegerField(blank=True, null=True, verbose_name='Número de Ocupantes')),
                ('hvac_units', models.PositiveIntegerField(blank=True, null=True, verbose_name='Unidades HVAC')),
                ('company', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='units', to='locations.company', verbose_name='Empresa')),
                ('manager', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='managed_units', to=settings.AUTH_USER_MODEL, verbose_name='Gestor')),
            ],
            options={
                'verbose_name': 'Unidade',
                'verbose_name_plural': 'Unidades',
                'ordering': ['name'],
                'abstract': False,
            },
        ),
        
        # 2. Adicionar campo unit ao Sector (nullable inicialmente)
        migrations.AddField(
            model_name='sector',
            name='unit',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name='sectors',
                to='locations.unit',
                verbose_name='Unidade'
            ),
        ),
        
        # 3. Executar migração de dados: criar units e associar setores
        migrations.RunPython(create_units_from_sectors, reverse_migration),
        
        # 4. Remover o campo company do Sector
        migrations.RemoveField(
            model_name='sector',
            name='company',
        ),
        
        # 5. Tornar unit obrigatório no Sector
        migrations.AlterField(
            model_name='sector',
            name='unit',
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name='sectors',
                to='locations.unit',
                verbose_name='Unidade'
            ),
        ),
        
        # 6. Adicionar campo unit ao LocationContact
        migrations.AddField(
            model_name='locationcontact',
            name='unit',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name='contacts',
                to='locations.unit'
            ),
        ),
    ]
