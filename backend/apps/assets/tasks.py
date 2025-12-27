"""
Celery tasks for Assets monitoring and maintenance.
"""
import logging
from datetime import timedelta

from celery import shared_task
from django.db.models import F
from django.utils import timezone
from django_tenants.utils import schema_context

from apps.tenants.models import Tenant

logger = logging.getLogger(__name__)


@shared_task(
    name='assets.check_sensors_online_status',
    bind=True,
    max_retries=3,
    soft_time_limit=300,
    time_limit=600
)
def check_sensors_online_status(self):
    """
    Verifica periodicamente o status online/offline dos sensores.
    
    Regra:
    - Sensor é considerado OFFLINE se não publicou dados nas últimas 1 hora
    - Sensor é considerado ONLINE se last_reading_at está dentro de 1 hora
    
    Execução: A cada 1 hora (configurado no Celery Beat)
    
    Returns:
        dict: Estatísticas da execução (total_checked, online, offline, errors)
    """
    logger.info("🔍 Iniciando verificação de status de sensores...")
    
    # Threshold: 1 hora atrás
    threshold = timezone.now() - timedelta(hours=1)
    
    stats = {
        'total_tenants': 0,
        'total_sensors_checked': 0,
        'total_online': 0,
        'total_offline': 0,
        'errors': [],
    }
    
    # Processar cada tenant
    tenants = Tenant.objects.exclude(slug='public').all()
    
    for tenant in tenants:
        try:
            logger.info(f"  📊 Verificando tenant: {tenant.slug}")
            
            # 🔧 Usar schema_name (não slug) - suporta tenants com hífen
            with schema_context(tenant.schema_name):
                from apps.assets.models import Sensor
                
                # Buscar todos os sensores ativos
                sensors = Sensor.objects.filter(is_active=True)
                tenant_total = sensors.count()
                
                if tenant_total == 0:
                    logger.info(f"    ℹ️  Nenhum sensor encontrado em {tenant.slug}")
                    continue
                
                # Atualizar sensores para OFFLINE se last_reading_at < threshold
                offline_updated = sensors.filter(
                    last_reading_at__lt=threshold,
                    is_online=True  # Apenas os que estão marcados como online
                ).update(
                    is_online=False,
                    updated_at=timezone.now()
                )
                
                # Atualizar sensores para ONLINE se last_reading_at >= threshold
                online_updated = sensors.filter(
                    last_reading_at__gte=threshold,
                    is_online=False  # Apenas os que estão marcados como offline
                ).update(
                    is_online=True,
                    updated_at=timezone.now()
                )
                
                # Contabilizar status atual
                current_online = sensors.filter(is_online=True).count()
                current_offline = sensors.filter(is_online=False).count()
                
                logger.info(
                    f"    ✅ {tenant.slug}: {tenant_total} sensores | "
                    f"Online: {current_online} (+{online_updated}) | "
                    f"Offline: {current_offline} (+{offline_updated})"
                )
                
                stats['total_tenants'] += 1
                stats['total_sensors_checked'] += tenant_total
                stats['total_online'] += current_online
                stats['total_offline'] += current_offline
                
        except Exception as e:
            error_msg = f"Erro ao processar tenant {tenant.slug}: {str(e)}"
            logger.error(f"    ❌ {error_msg}")
            stats['errors'].append(error_msg)
            continue
    
    logger.info(
        f"✅ Verificação concluída: "
        f"{stats['total_sensors_checked']} sensores em {stats['total_tenants']} tenants | "
        f"Online: {stats['total_online']} | Offline: {stats['total_offline']}"
    )
    
    return stats


@shared_task(
    name='assets.update_device_online_status',
    bind=True,
    max_retries=3,
    soft_time_limit=300,
    time_limit=600
)
def update_device_online_status(self):
    """
    Atualiza o status online/offline dos Devices baseado nos sensores.
    
    Regra:
    - Device é ONLINE se pelo menos 1 sensor está online
    - Device é OFFLINE se todos os sensores estão offline
    - Device é OFFLINE se não tem sensores
    
    Execução: Logo após check_sensors_online_status
    
    Returns:
        dict: Estatísticas da execução
    """
    logger.info("🔍 Iniciando atualização de status de devices...")
    
    stats = {
        'total_tenants': 0,
        'total_devices_checked': 0,
        'total_online': 0,
        'total_offline': 0,
        'errors': [],
    }
    
    tenants = Tenant.objects.exclude(slug='public').all()
    
    for tenant in tenants:
        try:
            logger.info(f"  📊 Verificando tenant: {tenant.slug}")
            
            # 🔧 Usar schema_name (não slug) - suporta tenants com hífen
            with schema_context(tenant.schema_name):
                from apps.assets.models import Device, Sensor
                from django.db.models import Exists, OuterRef
                
                devices = Device.objects.filter(is_active=True)
                tenant_total = devices.count()
                
                if tenant_total == 0:
                    logger.info(f"    ℹ️  Nenhum device encontrado em {tenant.slug}")
                    continue
                
                # Atualizar devices para ONLINE se tem pelo menos 1 sensor online
                online_sensors_exist = Sensor.objects.filter(
                    device=OuterRef('pk'),
                    is_online=True,
                    is_active=True
                )
                
                online_updated = devices.filter(
                    status='OFFLINE'
                ).annotate(
                    has_online_sensors=Exists(online_sensors_exist)
                ).filter(
                    has_online_sensors=True
                ).update(
                    status='ONLINE',
                    last_seen=timezone.now(),
                    updated_at=timezone.now()
                )
                
                # Atualizar devices para OFFLINE se não tem sensores online
                offline_updated = devices.filter(
                    status='ONLINE'
                ).annotate(
                    has_online_sensors=Exists(online_sensors_exist)
                ).filter(
                    has_online_sensors=False
                ).update(
                    status='OFFLINE',
                    updated_at=timezone.now()
                )
                
                current_online = devices.filter(status='ONLINE').count()
                current_offline = devices.filter(status='OFFLINE').count()
                
                logger.info(
                    f"    ✅ {tenant.slug}: {tenant_total} devices | "
                    f"Online: {current_online} (+{online_updated}) | "
                    f"Offline: {current_offline} (+{offline_updated})"
                )
                
                stats['total_tenants'] += 1
                stats['total_devices_checked'] += tenant_total
                stats['total_online'] += current_online
                stats['total_offline'] += current_offline
                
        except Exception as e:
            error_msg = f"Erro ao processar tenant {tenant.slug}: {str(e)}"
            logger.error(f"    ❌ {error_msg}")
            stats['errors'].append(error_msg)
            continue
    
    logger.info(
        f"✅ Atualização concluída: "
        f"{stats['total_devices_checked']} devices em {stats['total_tenants']} tenants | "
        f"Online: {stats['total_online']} | Offline: {stats['total_offline']}"
    )
    
    return stats


@shared_task(
    name='assets.calculate_device_availability',
    bind=True,
    max_retries=3,
    soft_time_limit=300,
    time_limit=600
)
def calculate_device_availability(self):
    """
    Calcula a disponibilidade (%) de cada device nas últimas 24h.
    
    Fórmula simplificada baseada em status e last_seen:
    - Se ONLINE e last_seen < 1h: 100%
    - Se ONLINE e last_seen < 6h: 95%
    - Se ONLINE e last_seen < 12h: 90%
    - Se ONLINE e last_seen < 24h: 85%
    - Se OFFLINE e last_seen < 24h: baseado no tempo offline
    - Se sem last_seen ou > 24h: 0%
    
    Esta é uma aproximação. Para precisão total, seria necessário
    um log histórico de mudanças de status.
    
    Execução: A cada 1 hora (após update_device_online_status)
    
    Returns:
        dict: Estatísticas da execução
    """
    logger.info("📊 Iniciando cálculo de disponibilidade de devices...")
    
    stats = {
        'total_tenants': 0,
        'total_devices_updated': 0,
        'errors': [],
    }
    
    tenants = Tenant.objects.exclude(slug='public').all()
    now = timezone.now()
    
    for tenant in tenants:
        try:
            logger.info(f"  📊 Calculando disponibilidade para tenant: {tenant.slug}")
            
            with schema_context(tenant.schema_name):
                from apps.assets.models import Device
                
                devices = Device.objects.filter(is_active=True)
                tenant_total = devices.count()
                
                if tenant_total == 0:
                    logger.info(f"    ℹ️  Nenhum device encontrado em {tenant.slug}")
                    continue
                
                updated_count = 0
                
                for device in devices:
                    availability = 0.0
                    
                    if device.last_seen:
                        time_since_seen = now - device.last_seen
                        hours_since_seen = time_since_seen.total_seconds() / 3600
                        
                        if device.status == 'ONLINE':
                            # Device online - boa disponibilidade
                            if hours_since_seen < 1:
                                availability = 100.0
                            elif hours_since_seen < 6:
                                availability = 95.0
                            elif hours_since_seen < 12:
                                availability = 90.0
                            elif hours_since_seen < 24:
                                availability = 85.0
                            else:
                                availability = 70.0
                        else:
                            # Device offline - calcular baseado em tempo offline
                            if hours_since_seen < 1:
                                availability = 95.0  # Acabou de cair
                            elif hours_since_seen < 6:
                                availability = 80.0
                            elif hours_since_seen < 12:
                                availability = 60.0
                            elif hours_since_seen < 24:
                                availability = 40.0
                            else:
                                availability = 0.0
                    else:
                        # Sem histórico de last_seen
                        if device.status == 'ONLINE':
                            availability = 100.0  # Assumir online recente
                        else:
                            availability = 0.0
                    
                    # Atualizar apenas se mudou
                    if device.availability != availability:
                        device.availability = availability
                        device.save(update_fields=['availability', 'updated_at'])
                        updated_count += 1
                
                logger.info(
                    f"    ✅ {tenant.slug}: {updated_count}/{tenant_total} devices atualizados"
                )
                
                stats['total_tenants'] += 1
                stats['total_devices_updated'] += updated_count
                
        except Exception as e:
            error_msg = f"Erro ao processar tenant {tenant.slug}: {str(e)}"
            logger.error(f"    ❌ {error_msg}")
            stats['errors'].append(error_msg)
            continue
    
    logger.info(
        f"✅ Cálculo concluído: "
        f"{stats['total_devices_updated']} devices atualizados em {stats['total_tenants']} tenants"
    )
    
    return stats
