"""
Celery tasks for Alerts & Rules system.

This module contains periodic tasks that:
1. Evaluate rules against telemetry data
2. Create alerts when thresholds are exceeded
3. Send notifications to users
"""

import logging
from datetime import timedelta
from typing import Tuple
from django.utils import timezone
from django.conf import settings
from celery import shared_task

logger = logging.getLogger(__name__)


# Default cooldown settings (can be overridden per user)
DEFAULT_ALERT_COOLDOWN_MINUTES = 60  # 1 hour between alerts for same variable
ACKNOWLEDGED_CHECK_INTERVAL_MINUTES = 60  # Check every 1 hour if alert still acknowledged
RESOLVED_COOLDOWN_MINUTES = 30  # Can generate new alert 30 min after resolution


def check_alert_cooldown(rule, parameter_key: str) -> Tuple[bool, str]:
    """
    Check if a new alert can be generated for the given rule and parameter.
    
    Logic:
    1. If there's a recent active (unacknowledged) alert within cooldown period -> NO
    2. If there's an acknowledged (not resolved) alert -> NO (check every hour)
    3. If there's a resolved alert within 30 minutes -> NO
    4. Otherwise -> YES, can generate alert
    
    Args:
        rule: Rule model instance
        parameter_key: The parameter/sensor key to check
    
    Returns:
        Tuple[bool, str]: (can_generate_alert, reason)
    """
    from apps.alerts.models import Alert
    
    now = timezone.now()
    
    # Get cooldown from rule creator's preferences, or use default
    cooldown_minutes = DEFAULT_ALERT_COOLDOWN_MINUTES
    if rule.created_by and hasattr(rule.created_by, 'alert_cooldown_minutes'):
        cooldown_minutes = rule.created_by.alert_cooldown_minutes or DEFAULT_ALERT_COOLDOWN_MINUTES
    
    # 1. Check for active (unacknowledged) alerts within cooldown period
    cooldown_period = timedelta(minutes=cooldown_minutes)
    active_alert = Alert.objects.filter(
        rule=rule,
        parameter_key=parameter_key,
        acknowledged=False,
        resolved=False,
        triggered_at__gte=now - cooldown_period
    ).first()
    
    if active_alert:
        time_since = (now - active_alert.triggered_at).total_seconds() / 60
        remaining = cooldown_minutes - time_since
        return False, f"Active alert exists (triggered {time_since:.0f}min ago, cooldown remaining: {remaining:.0f}min)"
    
    # 2. Check for acknowledged (not resolved) alerts - blocks new alerts
    # Check every hour if still acknowledged
    acknowledged_alert = Alert.objects.filter(
        rule=rule,
        parameter_key=parameter_key,
        acknowledged=True,
        resolved=False
    ).order_by('-acknowledged_at').first()
    
    if acknowledged_alert:
        # Calculate time since last check (using acknowledged_at as reference)
        time_since_ack = (now - acknowledged_alert.acknowledged_at).total_seconds() / 60 if acknowledged_alert.acknowledged_at else 0
        check_interval = ACKNOWLEDGED_CHECK_INTERVAL_MINUTES
        
        # Only log/re-evaluate every hour, don't create new alerts while acknowledged
        return False, f"Alert is acknowledged but not resolved (ack'd {time_since_ack:.0f}min ago). Will re-check after {check_interval}min."
    
    # 3. Check for recently resolved alerts (within 30 minutes)
    resolved_cooldown = timedelta(minutes=RESOLVED_COOLDOWN_MINUTES)
    recently_resolved = Alert.objects.filter(
        rule=rule,
        parameter_key=parameter_key,
        resolved=True,
        resolved_at__gte=now - resolved_cooldown
    ).first()
    
    if recently_resolved:
        time_since_resolved = (now - recently_resolved.resolved_at).total_seconds() / 60
        remaining = RESOLVED_COOLDOWN_MINUTES - time_since_resolved
        return False, f"Alert was recently resolved ({time_since_resolved:.0f}min ago), cooldown remaining: {remaining:.0f}min"
    
    # All checks passed - can generate new alert
    return True, "OK"


@shared_task(name='alerts.evaluate_rules')
def evaluate_rules_task():
    """
    Periodic task that evaluates all enabled rules against current telemetry data.
    
    ⚠️ KNOWN LIMITATION (Nov 2025):
    This task evaluates ALL tenants sequentially in a single Celery worker.
    A slow tenant can block others. Audit recommendation: "Dividir em tarefas por 
    tenant ou processar em blocos (chunking)."
    
    FUTURE ENHANCEMENT:
    - Split into per-tenant Celery tasks: evaluate_rules_for_tenant.delay(tenant_id)
    - Use Celery groups/chords for parallel execution
    - Add timeout per tenant (e.g., 30s max)
    
    For each rule:
    1. Get the latest telemetry data for the equipment
    2. Check if the condition is met (threshold exceeded)
    3. Check if enough time has passed since last alert (cooldown)
    4. Create alert if condition is met
    5. Send notifications to users
    """
    import time
    from apps.alerts.models import Rule
    from apps.alerts.services import NotificationService
    from apps.tenants.models import Tenant
    from apps.assets.models import Sensor
    from django_tenants.utils import schema_context
    
    logger.info("Starting rule evaluation task...")
    
    evaluated_count = 0
    triggered_count = 0
    error_count = 0
    
    # 🔒 PERFORMANCE FIX #6: Prefetch to avoid N+1 queries
    # Previously: Looped tenants synchronously, N+1 queries for parameters/readings
    # Now: Prefetch related data and prepare for parallel execution
    tenants = Tenant.objects.exclude(slug='public').all()
    
    for tenant in tenants:
        # 🔧 MONITORING: Track per-tenant execution time to identify bottlenecks
        tenant_start_time = time.time()
        
        try:
            # 🔧 Usar schema_name (não slug) - suporta tenants com hífen
            with schema_context(tenant.schema_name):
                # 🔒 PREFETCH parameters and equipment to avoid N+1 queries
                rules = Rule.objects.filter(enabled=True).select_related(
                    'equipment',
                    'equipment__site'
                ).prefetch_related(
                    'parameters',  # Prefetch all rule parameters at once
                    'equipment__devices',  # Prefetch devices
                    'equipment__devices__sensors'  # Prefetch sensors
                )
                
                if not rules.exists():
                    logger.debug(f"No enabled rules found for tenant {tenant.slug}")
                    continue
                
                enabled_rule_ids = list(rules.values_list('id', 'name', 'enabled'))
                logger.info(
                    f"📋 Evaluating {rules.count()} ENABLED rules for tenant {tenant.slug}: "
                    f"{', '.join([f'#{r[0]} {r[1]} (enabled={r[2]})' for r in enabled_rule_ids])}"
                )
                
                # 🔒 OPTIMIZATION: Reuse NotificationService instance (avoid recreating per rule)
                notification_service = NotificationService()
                
                for rule in rules:
                    try:
                        evaluated_count += 1
                        
                        # Evaluate the rule
                        alert = evaluate_single_rule(rule)
                        
                        if alert:
                            triggered_count += 1
                            logger.info(
                                f"Alert {alert.id} triggered for rule {rule.id} "
                                f"({rule.name}) on equipment {rule.equipment.tag} "
                                f"in tenant {tenant.slug}"
                            )
                            
                            # Send notifications
                            try:
                                results = notification_service.send_alert_notifications(alert)
                                logger.info(
                                    f"Notifications sent for alert {alert.id}: "
                                    f"{len(results['sent'])} sent, "
                                    f"{len(results['failed'])} failed, "
                                    f"{len(results['skipped'])} skipped"
                                )
                            except Exception as e:
                                logger.error(
                                    f"Failed to send notifications for alert {alert.id}: {str(e)}"
                                )
                                error_count += 1
                                
                    except Exception as e:
                        logger.error(f"Error evaluating rule {rule.id} in tenant {tenant.slug}: {str(e)}")
                        error_count += 1
                        
        except Exception as e:
            logger.error(f"Error processing tenant {tenant.slug}: {str(e)}")
            error_count += 1
            continue
        finally:
            # 🔧 MONITORING: Log per-tenant execution time (identify slow tenants)
            tenant_duration = time.time() - tenant_start_time
            if tenant_duration > 5.0:  # Warn if tenant takes >5s
                logger.warning(
                    f"⚠️ Slow tenant detected: {tenant.slug} took {tenant_duration:.2f}s "
                    f"to evaluate {rules.count() if 'rules' in locals() else 0} rules"
                )
            else:
                logger.debug(f"Tenant {tenant.slug} evaluated in {tenant_duration:.2f}s")
    
    logger.info(
        f"Rule evaluation completed: "
        f"{evaluated_count} evaluated, "
        f"{triggered_count} triggered, "
        f"{error_count} errors"
    )
    
    return {
        'evaluated': evaluated_count,
        'triggered': triggered_count,
        'errors': error_count
    }


def evaluate_single_rule(rule):
    """
    Evaluate a single rule against current telemetry data.
    Suporta tanto regras com múltiplos parâmetros quanto regras antigas (formato único).
    
    Args:
        rule: Rule model instance
    
    Returns:
        Alert instance if condition is met and alert was created, None otherwise
    """
    from apps.alerts.models import Alert
    from apps.ingest.models import Reading
    from apps.assets.models import Sensor
    from django.db.models import Prefetch
    
    # Verificar se a regra tem parâmetros novos (múltiplos) ou usa formato antigo
    parameters = rule.parameters.all()
    
    # Se não tem parâmetros novos mas tem campos antigos, avaliar no formato antigo
    if not parameters.exists() and rule.parameter_key:
        return evaluate_single_rule_legacy(rule)
    
    # 🔧 PERFORMANCE FIX: Prefetch related data to avoid N+1 queries
    # Load all sensors with their devices in one query
    # 🔧 PERFORMANCE FIX (Nov 2025): Extract sensor tags and prefetch in one query
    # Audit finding: "Faz Sensor.objects.get() dentro de um loop, ignorando o 
    # sensors_dict já criado."
    sensor_tags = []
    sensor_id_to_tag = {}  # Map sensor_X IDs to tags
    
    for param in parameters:
        sensor_tag = param.parameter_key
        if param.parameter_key.startswith('sensor_'):
            try:
                sensor_id = int(param.parameter_key.replace('sensor_', ''))
                # Store for later mapping
                sensor_id_to_tag[sensor_id] = param.parameter_key
                # Will be resolved after prefetch
                sensor_tag = None
            except ValueError:
                pass
        if sensor_tag:
            sensor_tags.append(sensor_tag)
    
    # Prefetch sensors by ID if needed
    if sensor_id_to_tag:
        sensors_by_id = {
            s.id: s.tag 
            for s in Sensor.objects.filter(id__in=sensor_id_to_tag.keys()).only('id', 'tag')
        }
        for sensor_id, param_key in sensor_id_to_tag.items():
            if sensor_id in sensors_by_id:
                sensor_tags.append(sensors_by_id[sensor_id])
    
    # Prefetch all sensors with devices in ONE query (eliminates N+1)
    sensors_dict = {
        sensor.tag: sensor 
        for sensor in Sensor.objects.filter(tag__in=sensor_tags).select_related('device')
    }
    
    # Avaliar cada parâmetro da regra
    alerts_created = []
    
    for param in parameters:
        # Check cooldown com lógica avançada
        can_alert, reason = check_alert_cooldown(rule, param.parameter_key)
        
        if not can_alert:
            logger.debug(
                f"Rule {rule.id} parameter {param.parameter_key} cannot trigger: {reason}"
            )
            continue
    
        # ✅ FIXED: Use prefetched sensors_dict (no more queries in loop)
        sensor_tag = param.parameter_key
        if param.parameter_key.startswith('sensor_'):
            try:
                sensor_id = int(param.parameter_key.replace('sensor_', ''))
                # Get from prefetched map (not DB query)
                if sensor_id in sensors_by_id:
                    sensor_tag = sensors_by_id[sensor_id]
                else:
                    logger.warning(
                        f"Sensor ID {sensor_id} not found for parameter_key {param.parameter_key}"
                    )
                    continue
            except (ValueError, KeyError):
                logger.warning(
                    f"Could not parse sensor ID from parameter_key: {param.parameter_key}"
                )
                continue
        
        # ✅ Use sensor prefetched from dictionary (O(1) lookup, no DB query)
        sensor_obj = sensors_dict.get(sensor_tag)
        if not sensor_obj or not sensor_obj.device or not sensor_obj.device.mqtt_client_id:
            logger.warning(
                f"No valid device/mqtt_client_id found for sensor {sensor_tag}"
            )
            continue
        
        device = sensor_obj.device
        
        latest_reading = Reading.objects.filter(
            device_id=device.mqtt_client_id,
            sensor_id=sensor_tag
        ).order_by('-ts').first()
        
        if not latest_reading:
            logger.info(
                f"⚠️ Rule {rule.id} - No reading found for sensor {sensor_tag} (device: {device.mqtt_client_id})"
            )
            continue
        
        # Check if reading is recent enough (within last 15 minutes)
        # IMPORTANTE: reading.ts vem do PostgreSQL em UTC, mas precisamos comparar
        # usando o horário real (ambos em UTC). A idade é calculada em UTC.
        now = timezone.now()  # UTC
        time_diff = now - latest_reading.ts
        
        if time_diff > timedelta(minutes=15):
            logger.info(
                f"⚠️ Rule {rule.id} - Reading too old for {param.parameter_key}: "
                f"reading={latest_reading.ts}, now={now}, "
                f"diff={time_diff.total_seconds()/60:.1f} min"
            )
            continue
        
        logger.info(
            f"✅ Rule {rule.id} - Reading is fresh for {param.parameter_key}: "
            f"value={latest_reading.value}, age={time_diff.total_seconds()/60:.1f} min"
        )
        
        # Get the value to compare
        value = latest_reading.value
        
        # Evaluate the condition
        condition_met = evaluate_condition(
            value,
            param.operator,
            param.threshold
        )
        
        if not condition_met:
            logger.info(
                f"⚠️ Rule {rule.id} parameter {param.parameter_key} condition NOT MET: "
                f"{value} {param.operator} {param.threshold} = False"
            )
            continue
        
        logger.info(
            f"✅ Rule {rule.id} parameter {param.parameter_key} condition MET: "
            f"{value} {param.operator} {param.threshold} = True - Creating alert!"
        )
        
        # Condition is met - create alert
        # Gerar mensagem a partir do template
        message = generate_alert_message_from_template(
            param.message_template,
            param,
            latest_reading,
            value
        )
        
        alert = Alert.objects.create(
            rule=rule,
            asset_tag=rule.equipment.tag,
            severity=param.severity,
            parameter_key=param.parameter_key,
            parameter_value=value,
            threshold=param.threshold,
            message=message
        )
        
        logger.info(
            f"Alert {alert.id} created for rule {rule.id} parameter {param.parameter_key}: "
            f"{value} {param.operator} {param.threshold}"
        )
        
        alerts_created.append(alert)
    
    # Retornar o primeiro alerta criado (ou None se nenhum foi criado)
    return alerts_created[0] if alerts_created else None


def evaluate_single_rule_legacy(rule):
    """
    Evaluate a single rule in the old format (single parameter).
    Mantido para compatibilidade com regras antigas.
    """
    from apps.alerts.models import Alert
    from apps.ingest.models import Reading
    from apps.assets.models import Sensor  # 🔧 Import necessário para buscar device correto
    
    # Check cooldown com lógica avançada
    can_alert, reason = check_alert_cooldown(rule, rule.parameter_key)
    
    if not can_alert:
        logger.debug(
            f"Rule {rule.id} cannot trigger: {reason}"
        )
        return None
    
    try:
        # 🔧 CORRIGIDO: Buscar sensor por tag (não por sensor_id que não existe no modelo)
        # parameter_key contém o tag do sensor
        sensor_obj = Sensor.objects.select_related('device').filter(
            tag=rule.parameter_key
        ).first()
        
        if not sensor_obj or not sensor_obj.device or not sensor_obj.device.mqtt_client_id:
            logger.debug(
                f"No valid sensor/device found for parameter_key {rule.parameter_key}"
            )
            return None
        
        # Buscar a leitura mais recente usando o tag do sensor
        latest_reading = Reading.objects.filter(
            device_id=sensor_obj.device.mqtt_client_id,
            sensor_id=rule.parameter_key
        ).order_by('-ts').first()
        
        if not latest_reading:
            logger.debug(
                f"No telemetry data found for equipment {rule.equipment.tag} "
                f"parameter {rule.parameter_key} (device: {sensor_obj.device.mqtt_client_id})"
            )
            return None
        
        # Check if reading is recent enough (within last 15 minutes)
        # Comparação direta em UTC (ambos timestamps são UTC)
        now = timezone.now()
        time_diff = now - latest_reading.ts
        
        if time_diff > timedelta(minutes=15):
            logger.debug(
                f"Latest telemetry reading is too old: reading={latest_reading.ts}, now={now}, "
                f"diff={time_diff.total_seconds()/60:.1f} min for rule {rule.id}"
            )
            return None
        
        value = latest_reading.value
        
        condition_met = evaluate_condition(value, rule.operator, rule.threshold)
        
        if not condition_met:
            logger.debug(
                f"Rule {rule.id} condition not met: {value} {rule.operator} {rule.threshold} = False"
            )
            return None
        
        alert = Alert.objects.create(
            rule=rule,
            asset_tag=rule.equipment.tag,
            severity=rule.severity,
            parameter_key=rule.parameter_key,
            parameter_value=value,
            threshold=rule.threshold,
            message=generate_alert_message(rule, latest_reading, value)
        )
        
        logger.info(
            f"Alert {alert.id} created for rule {rule.id}: {value} {rule.operator} {rule.threshold}"
        )
        
        return alert
        
    except Exception as e:
        logger.error(
            f"Error evaluating rule {rule.id} for equipment {rule.equipment.tag}: {str(e)}"
        )
        return None


def evaluate_condition(value, operator, threshold):
    """
    Evaluate a condition against a threshold.
    
    Args:
        value: Current value from telemetry
        operator: Comparison operator (>, <, >=, <=, ==, !=)
        threshold: Threshold value to compare against
    
    Returns:
        True if condition is met, False otherwise
    """
    try:
        # Convert to float for numeric comparison
        value_float = float(value)
        threshold_float = float(threshold)
        
        if operator == '>':
            return value_float > threshold_float
        elif operator == '<':
            return value_float < threshold_float
        elif operator == '>=':
            return value_float >= threshold_float
        elif operator == '<=':
            return value_float <= threshold_float
        elif operator == '==':
            return value_float == threshold_float
        elif operator == '!=':
            return value_float != threshold_float
        else:
            logger.error(f"Unknown operator: {operator}")
            return False
            
    except (ValueError, TypeError) as e:
        logger.error(f"Error comparing values: {value} {operator} {threshold} - {str(e)}")
        return False


def generate_alert_message_from_template(template, param, reading, value):
    """
    Generate alert message from template with variable substitution.
    
    Args:
        template: Message template string with {variables}
        param: RuleParameter instance
        reading: Reading instance
        value: Current value that triggered the alert
    
    Returns:
        Alert message string with variables replaced
    """
    try:
        # Mapeamento de operadores para texto
        operator_map = {
            '>': 'maior que',
            '>=': 'maior ou igual a',
            '<': 'menor que',
            '<=': 'menor ou igual a',
            '==': 'igual a',
            '!=': 'diferente de',
        }
        
        # Substituir variáveis no template
        message = template
        # Suporta {variavel} e {sensor} (legado) para o nome da variável
        message = message.replace('{variavel}', param.parameter_key)
        message = message.replace('{sensor}', param.parameter_key)  # Compatibilidade com templates antigos
        message = message.replace('{value}', str(value))
        message = message.replace('{threshold}', str(param.threshold))
        message = message.replace('{operator}', operator_map.get(param.operator, param.operator))
        message = message.replace('{unit}', param.unit or '')
        
        return message
        
    except Exception as e:
        logger.error(f"Error generating alert message from template: {str(e)}")
        return f"Alerta disparado para parâmetro {param.parameter_key}"


def generate_alert_message(rule, reading, value):
    """
    Generate a human-readable alert message (legacy format).
    
    Args:
        rule: Rule model instance
        reading: TelemetryReading instance
        value: Current value that triggered the alert
    
    Returns:
        Alert message string
    """
    try:
        # Get unit from reading data if available
        unit = reading.data.get('unit', '') if hasattr(reading, 'data') else ''
        
        message = (
            f"{rule.parameter_key} value of {value}{unit} "
            f"is {rule.operator} threshold of {rule.threshold}{unit} "
            f"on equipment {rule.equipment.name} ({rule.equipment.tag})"
        )
        
        return message
        
    except Exception as e:
        logger.error(f"Error generating alert message: {str(e)}")
        return f"Alert triggered for rule: {rule.name}"


@shared_task(name='alerts.cleanup_old_alerts')
def cleanup_old_alerts_task(days=90):
    """
    Clean up old resolved alerts to keep the database lean.
    
    Args:
        days: Number of days to keep resolved alerts (default: 90)
    
    Returns:
        Number of alerts deleted
    """
    from apps.alerts.models import Alert
    
    cutoff_date = timezone.now() - timedelta(days=days)
    
    # Delete old resolved alerts
    deleted_count, _ = Alert.objects.filter(
        resolved=True,
        resolved_at__lt=cutoff_date
    ).delete()
    
    logger.info(f"Cleaned up {deleted_count} old alerts (resolved before {cutoff_date})")
    
    return deleted_count
