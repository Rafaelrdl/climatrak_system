# Generated manually - Seed system asset types

from django.db import migrations


SYSTEM_ASSET_TYPES = [
    {"code": "CHILLER", "name": "Chiller", "description": "Sistema de resfriamento de água"},
    {"code": "AHU", "name": "AHU (Unidade de Tratamento de Ar)", "description": "Air Handling Unit - Unidade de tratamento de ar"},
    {"code": "FAN_COIL", "name": "Fan Coil", "description": "Unidade de ventilação e troca de calor"},
    {"code": "PUMP", "name": "Bomba", "description": "Bomba hidráulica"},
    {"code": "BOILER", "name": "Caldeira", "description": "Equipamento para aquecimento de água"},
    {"code": "COOLING_TOWER", "name": "Torre de Resfriamento", "description": "Torre para dissipação de calor"},
    {"code": "VRF", "name": "VRF (Variable Refrigerant Flow)", "description": "Sistema de fluxo de refrigerante variável"},
    {"code": "RTU", "name": "RTU (Rooftop Unit)", "description": "Unidade de teto para climatização"},
    {"code": "SPLIT", "name": "Split", "description": "Ar condicionado tipo split"},
    {"code": "CENTRAL", "name": "Central", "description": "Sistema central de ar condicionado"},
    {"code": "VALVE", "name": "Válvula", "description": "Válvula de controle"},
    {"code": "SENSOR", "name": "Sensor", "description": "Sensor de medição"},
    {"code": "CONTROLLER", "name": "Controlador", "description": "Controlador de automação"},
    {"code": "FILTER", "name": "Filtro", "description": "Filtro de ar ou água"},
    {"code": "DUCT", "name": "Duto", "description": "Duto de ar condicionado"},
    {"code": "METER", "name": "Medidor", "description": "Medidor de energia ou água"},
    {"code": "OTHER", "name": "Outro", "description": "Outros tipos de equipamento"},
]


def seed_asset_types(apps, schema_editor):
    """
    Insere os tipos de ativo padrão do sistema.
    Usa get_model para garantir compatibilidade com migrations.
    """
    AssetType = apps.get_model("assets", "AssetType")
    
    for asset_type_data in SYSTEM_ASSET_TYPES:
        AssetType.objects.update_or_create(
            code=asset_type_data["code"],
            defaults={
                "name": asset_type_data["name"],
                "description": asset_type_data["description"],
                "is_system": True,
                "is_active": True,
            }
        )


def reverse_seed(apps, schema_editor):
    """
    Remove os tipos de ativo do sistema (para reverter a migration).
    """
    AssetType = apps.get_model("assets", "AssetType")
    codes = [t["code"] for t in SYSTEM_ASSET_TYPES]
    AssetType.objects.filter(code__in=codes, is_system=True).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("assets", "0008_add_asset_type_model"),
    ]

    operations = [
        migrations.RunPython(seed_asset_types, reverse_seed),
    ]
