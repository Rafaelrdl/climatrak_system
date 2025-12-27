#!/usr/bin/env python
"""
Script para deletar o Asset duplicado CHILLER-001 (tag: 4b686f6d70107115)
Verifica constraints antes de deletar
"""
import os
import sys
import django

# Setup Django
sys.path.insert(0, '/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'traksense_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from apps.tenants.models import Tenant
from apps.assets.models import Asset
from apps.alerts.models import Rule, Alert

def delete_duplicate_asset():
    """Deleta o Asset duplicado com segurança"""
    
    # Processa todos os tenants
    tenants = Tenant.objects.exclude(schema_name='public')
    
    for tenant in tenants:
        with schema_context(tenant.schema_name):
            print(f"\n{'='*80}")
            print(f"🏢 Tenant: {tenant.schema_name}")
            print(f"{'='*80}\n")
            
            # Encontra o asset duplicado
            try:
                duplicate_asset = Asset.objects.get(
                    tag='4b686f6d70107115',
                    name='CHILLER-001'
                )
                print(f"✅ Asset duplicado encontrado:")
                print(f"   - ID: {duplicate_asset.id}")
                print(f"   - Nome: {duplicate_asset.name}")
                print(f"   - Tag: {duplicate_asset.tag}\n")
                
                # Verifica se há devices associados
                devices_count = duplicate_asset.devices.count()
                print(f"📱 Devices associados: {devices_count}")
                
                if devices_count > 0:
                    print("⚠️  ATENÇÃO: Asset tem devices associados!")
                    print("   Listando devices:")
                    for device in duplicate_asset.devices.all():
                        print(f"   - Device ID {device.id}: {device.name}")
                    print("\n❌ ABORTANDO: Não é seguro deletar com devices associados")
                    return
                
                # Verifica se há regras apontando para este asset
                rules_count = Rule.objects.filter(equipment=duplicate_asset).count()
                print(f"📋 Regras apontando para este asset: {rules_count}")
                
                if rules_count > 0:
                    print("⚠️  ATENÇÃO: Existem regras associadas a este asset!")
                    print("   Listando regras:")
                    for rule in Rule.objects.filter(equipment=duplicate_asset):
                        print(f"   - Rule ID {rule.id}: {rule.rule_name}")
                    print("\n❌ ABORTANDO: Não é seguro deletar com regras associadas")
                    return
                
                # Verifica se há alertas
                alerts_count = Alert.objects.filter(asset_tag=duplicate_asset.tag).count()
                print(f"🔔 Alertas com este asset_tag: {alerts_count}")
                
                if alerts_count > 0:
                    print(f"⚠️  Existem {alerts_count} alertas com asset_tag={duplicate_asset.tag}")
                    print("   Esses alertas continuarão existindo mas sem vínculo direto ao asset")
                    print("   (Alert.asset_tag é CharField, não FK)")
                
                # Se chegou aqui, é seguro deletar
                print(f"\n{'='*80}")
                print("✅ VERIFICAÇÕES CONCLUÍDAS - Seguro para deletar")
                print(f"{'='*80}\n")
                
                print(f"🗑️  Deletando Asset ID {duplicate_asset.id}...")
                asset_id = duplicate_asset.id
                duplicate_asset.delete()
                print(f"✅ Asset ID {asset_id} deletado com sucesso!")
                
                # Verifica se foi deletado
                try:
                    Asset.objects.get(id=asset_id)
                    print("❌ ERRO: Asset ainda existe no banco!")
                except Asset.DoesNotExist:
                    print("✅ Confirmado: Asset foi removido do banco de dados")
                
                # Lista os assets restantes
                print(f"\n📦 Assets restantes no tenant {tenant.schema_name}:")
                for asset in Asset.objects.all():
                    print(f"   - Asset ID {asset.id}: {asset.name} (tag: {asset.tag})")
                    devices_count = asset.devices.count()
                    print(f"     Devices: {devices_count}")
                    if devices_count > 0:
                        for device in asset.devices.all():
                            sensors_count = device.sensors.count()
                            print(f"       → Device ID {device.id}: {device.name} ({sensors_count} sensores)")
                
            except Asset.DoesNotExist:
                print(f"⚠️  Asset duplicado não encontrado no tenant {tenant.schema_name}")
            except Exception as e:
                print(f"❌ Erro ao processar tenant {tenant.schema_name}: {str(e)}")
                import traceback
                traceback.print_exc()

if __name__ == '__main__':
    print("="*80)
    print("🗑️  SCRIPT DE DELEÇÃO DO ASSET DUPLICADO")
    print("="*80)
    delete_duplicate_asset()
    print("\n" + "="*80)
    print("✅ SCRIPT CONCLUÍDO")
    print("="*80)
