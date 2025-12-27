"""
Comando para testar manualmente a verificação de status de sensores.
"""
from django.core.management.base import BaseCommand

from apps.assets.tasks import check_sensors_online_status, update_device_online_status


class Command(BaseCommand):
    help = 'Testa a verificação de status online/offline de sensores e devices'

    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING('\n' + '='*80))
        self.stdout.write(self.style.WARNING('TESTE MANUAL - Verificação de Status'))
        self.stdout.write(self.style.WARNING('='*80 + '\n'))
        
        # 1. Verificar sensores
        self.stdout.write(self.style.HTTP_INFO('🔍 Executando: check_sensors_online_status'))
        result_sensors = check_sensors_online_status()
        
        self.stdout.write(self.style.SUCCESS('\n✅ Resultado - Sensores:'))
        self.stdout.write(f"  Tenants processados: {result_sensors['total_tenants']}")
        self.stdout.write(f"  Sensores verificados: {result_sensors['total_sensors_checked']}")
        self.stdout.write(f"  Online: {result_sensors['total_online']}")
        self.stdout.write(f"  Offline: {result_sensors['total_offline']}")
        
        if result_sensors['errors']:
            self.stdout.write(self.style.ERROR(f"\n❌ Erros encontrados:"))
            for error in result_sensors['errors']:
                self.stdout.write(self.style.ERROR(f"  - {error}"))
        
        # 2. Verificar devices
        self.stdout.write(self.style.HTTP_INFO('\n🔍 Executando: update_device_online_status'))
        result_devices = update_device_online_status()
        
        self.stdout.write(self.style.SUCCESS('\n✅ Resultado - Devices:'))
        self.stdout.write(f"  Tenants processados: {result_devices['total_tenants']}")
        self.stdout.write(f"  Devices verificados: {result_devices['total_devices_checked']}")
        self.stdout.write(f"  Online: {result_devices['total_online']}")
        self.stdout.write(f"  Offline: {result_devices['total_offline']}")
        
        if result_devices['errors']:
            self.stdout.write(self.style.ERROR(f"\n❌ Erros encontrados:"))
            for error in result_devices['errors']:
                self.stdout.write(self.style.ERROR(f"  - {error}"))
        
        self.stdout.write(self.style.SUCCESS('\n' + '='*80))
        self.stdout.write(self.style.SUCCESS('✅ Teste concluído!'))
        self.stdout.write(self.style.SUCCESS('='*80 + '\n'))
