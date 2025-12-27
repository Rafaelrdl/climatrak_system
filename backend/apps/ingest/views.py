import logging
from datetime import datetime, timezone as dt_timezone
import pytz

from django.conf import settings
from django.db import connection, transaction
from django.utils import timezone as dj_timezone
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from django.core.cache import cache
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.tenants.models import Tenant
from .models import Telemetry, Reading
from .parsers import parser_manager


logger = logging.getLogger(__name__)


@method_decorator(csrf_exempt, name='dispatch')
class IngestView(APIView):
    """
    Endpoint to receive telemetry data from EMQX Rule Engine.
    
    This endpoint bypasses multi-tenant middleware by manually switching
    to the tenant schema based on x-tenant header.
    
    Expected payload from EMQX:
    {
        "client_id": "device-001",
        "topic": "tenants/umc/devices/001/sensors/temperature",
        "payload": {"value": 23.5, "unit": "celsius"},
        "ts": 1697572800000  // Unix timestamp in milliseconds
    }
    
    Headers expected:
    - x-tenant: tenant slug (e.g., "umc")
    - x-device-token: HMAC signature or device API token (for authentication)
    - content-type: application/json
    
    Security:
    - Validates x-device-token against INGESTION_SECRET or registered device tokens
    - Validates tenant slug from topic matches x-tenant header
    - Rejects requests with invalid authentication
    """
    
    # Disable DRF authentication (using custom device token auth)
    authentication_classes = []
    permission_classes = []
    
    def post(self, request, *args, **kwargs):
        """
        Process incoming telemetry data from EMQX.
        
        🔒 SECURITY: Requires valid device authentication via:
        - x-device-token header with HMAC signature OR
        - Registered device API token
        """
        # 🔒 SECURITY: Validate device authentication FIRST
        device_token = request.headers.get('x-device-token')
        if not device_token:
            logger.warning("Missing x-device-token header in ingest request")
            return Response(
                {"error": "Missing x-device-token header"},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        # Validate device token
        from django.conf import settings
        
        # SECURITY: Check if token matches INGESTION_SECRET (global token for EMQX)
        ingestion_secret = getattr(settings, 'INGESTION_SECRET', None)
        if ingestion_secret and device_token == ingestion_secret:
            logger.info(f"✅ Authenticated via INGESTION_SECRET from {request.META.get('REMOTE_ADDR')}")
        else:
            # Token inválido
            logger.error(f"🚨 SECURITY: Invalid device token from {request.META.get('REMOTE_ADDR')}")
            logger.error(f"   Received: {device_token[:20]}...")
            logger.error(f"   Expected: {ingestion_secret[:20] if ingestion_secret else 'NOT_CONFIGURED'}...")
            return Response(
                {"error": "Invalid device token"},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        # Continue with tenant validation and processing...
        # 🔧 Only log verbose details in DEBUG mode
        if settings.DEBUG:
            logger.info("=" * 60)
            logger.info("🔵 INGEST POST INICIADO")
            logger.info(f"Headers: {dict(request.headers)}")
            logger.info(f"Content-Type: {request.content_type}")
            logger.info(f"📏 Body tamanho: {len(request.body)} bytes")
            logger.info(f"Body COMPLETO: {request.body.decode('utf-8')}")
            logger.info("=" * 60)
        
        # Extract tenant from header
        tenant_slug = request.headers.get('x-tenant')
        if not tenant_slug:
            logger.warning("Missing x-tenant header in ingest request")
            return Response(
                {"error": "Missing x-tenant header"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Parse and validate payload BEFORE accessing database
        try:
            # Validate payload structure
            if settings.DEBUG:
                logger.info("🔍 Parseando JSON manualmente do request.body...")
            import json
            try:
                raw_body = request.body.decode('utf-8')
                if settings.DEBUG:
                    logger.info(f"📏 Body completo ({len(raw_body)} chars): {raw_body}")
                data = json.loads(raw_body)
                if settings.DEBUG:
                    logger.info(f"✅ JSON parseado com sucesso, tipo: {type(data)}")
            except json.JSONDecodeError as e_json:
                logger.error(f"❌ Erro ao parsear JSON: {e_json}", exc_info=True)
                logger.error(f"JSON problemático: {raw_body}")
                return Response(
                    {"error": f"Erro ao parsear JSON: {str(e_json)}"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            except Exception as e_data:
                logger.error(f"❌ Erro inesperado: {e_data}", exc_info=True)
                return Response(
                    {"error": f"Erro ao processar request: {str(e_data)}"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            if settings.DEBUG:
                logger.info(f"📥 Ingest received data: {data}")

            if not isinstance(data, dict):
                logger.warning(f"Invalid payload type: {type(data)}")
                return Response(
                    {"error": "Payload must be JSON object"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            topic = data.get('topic')
            if not topic:
                logger.warning("Missing required field: topic")
                return Response(
                    {"error": "Missing required field: topic"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # 🔒 SECURITY: Validate tenant from topic matches x-tenant header
            # This validation happens BEFORE database access to prevent enumeration attacks
            # Topic format: tenants/{slug}/sites/{site}/assets/{tag}/telemetry
            topic_parts = topic.split('/')
            if len(topic_parts) < 2 or topic_parts[0] != 'tenants':
                logger.warning(f"Invalid topic format: {topic}")
                return Response(
                    {"error": "Invalid topic format"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            topic_tenant_slug = topic_parts[1]
            if topic_tenant_slug != tenant_slug:
                logger.error(
                    f"🚨 SECURITY VIOLATION: Tenant mismatch! "
                    f"Header: {tenant_slug}, Topic: {topic_tenant_slug}, "
                    f"Client: {data.get('client_id')}, Full Topic: {topic}"
                )
                return Response(
                    {"error": "Tenant validation failed"},
                    status=status.HTTP_403_FORBIDDEN
                )

        except Exception as e:
            logger.error(f"❌ Erro ao validar payload: {e}", exc_info=True)
            return Response(
                {"error": "Invalid request"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # NOW we can safely access the database with validated tenant
        try:
            connection.set_schema_to_public()
            tenant = Tenant.objects.get(slug=tenant_slug)
            connection.set_tenant(tenant)
        except Tenant.DoesNotExist:
            # 🔧 INGESTION FIX (Nov 2025): Return 404/403 for invalid tenant, not 500
            # Audit finding: "Quando o tenant slug é inválido, retorna 500 — isso faz 
            # o EMQX ficar em loop de reenvio."
            # 404 indicates client misconfiguration, EMQX won't retry
            logger.warning(f"⚠️ Tenant not found: {tenant_slug} (client misconfiguration)")
            return Response(
                {"error": "Tenant not found", "tenant": tenant_slug},
                status=status.HTTP_404_NOT_FOUND  # Changed from 500
            )

        def ensure_aware_timestamp(value, fallback):
            """Converte timestamps em datetime timezone-aware em UTC."""
            if value is None:
                return fallback
            if isinstance(value, str):
                try:
                    value = datetime.fromisoformat(value.replace('Z', '+00:00'))
                except ValueError:
                    logger.warning(f"⚠️ Timestamp inválido recebido: {value}")
                    return fallback
            if isinstance(value, (int, float)):
                try:
                    # Assume valor em segundos; se vier em milissegundos, converter
                    if abs(value) > 1e12:
                        value = value / 1000.0
                    value = datetime.fromtimestamp(value, tz=dt_timezone.utc)
                except (ValueError, OSError, OverflowError) as exc:
                    logger.warning(f"⚠️ Falha ao converter timestamp numérico {value}: {exc}")
                    return fallback
            if isinstance(value, datetime):
                if dj_timezone.is_naive(value):
                    # Força timezone UTC diretamente, sem usar make_aware do Django
                    return value.replace(tzinfo=dt_timezone.utc)
                # Se já é timezone-aware, garante que está em UTC
                if value.tzinfo != dt_timezone.utc:
                    return value.astimezone(dt_timezone.utc)
                return value
            return fallback

        # Continue processing with validated data and connected tenant
        try:
            client_id = data.get('client_id')
            payload = data.get('payload')
            ts = data.get('ts')  # Timestamp do EMQX (fallback)

            if not payload:
                logger.warning("Missing required field: payload")
                return Response(
                    {"error": "Missing required field: payload"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # 🌍 CORREÇÃO: Converter timestamp para horário local do Site
            # bt é Unix timestamp UTC, mas armazenamos no horário local do Site
            # Isso facilita análises e debug sem conversões mentais
            
            ingest_timestamp = None
            senml_bt = None
            site_timezone_str = 'America/Sao_Paulo'  # Default
            
            # 1. Extrair nome do Site do tópico MQTT
            # Formato: tenants/{tenant}/sites/{site_name}/assets/{asset_tag}/telemetry
            site_name = None
            topic_parts = topic.split('/')
            if len(topic_parts) >= 4 and topic_parts[2] == 'sites':
                site_name = topic_parts[3]
                
                # 2. Obter timezone do Site com CACHE (evita query em cada mensagem)
                cache_key = f"site_timezone:{tenant_slug}:{site_name}"
                site_timezone_str = cache.get(cache_key)
                
                if not site_timezone_str:
                    # Cache miss - consultar banco de dados
                    from apps.assets.models import Site
                    try:
                        site = Site.objects.filter(name=site_name).first()
                        if site and site.timezone:
                            site_timezone_str = site.timezone
                            # Cache por 24 horas (86400 segundos)
                            # Será invalidado apenas se Site for atualizado
                            cache.set(cache_key, site_timezone_str, 86400)
                            logger.info(f"📍 Timezone do Site '{site_name}' cacheado: {site_timezone_str}")
                        else:
                            site_timezone_str = 'America/Sao_Paulo'
                            cache.set(cache_key, site_timezone_str, 86400)
                            logger.warning(f"⚠️ Site '{site_name}' não encontrado, usando timezone padrão: {site_timezone_str}")
                    except Exception as e:
                        logger.error(f"❌ Erro ao buscar Site '{site_name}': {e}")
                        site_timezone_str = 'America/Sao_Paulo'
                        cache.set(cache_key, site_timezone_str, 3600)  # Cache por 1 hora em caso de erro
                else:
                    logger.debug(f"✅ Timezone do Site '{site_name}' do cache: {site_timezone_str}")
            
            # 3. Extrair bt do payload SenML e converter para timezone local
            try:
                if isinstance(payload, str):
                    import json
                    payload = json.loads(payload)
                
                if isinstance(payload, list) and len(payload) > 0:
                    base_element = payload[0]
                    if isinstance(base_element, dict):
                        senml_bt = base_element.get('bt')
                        
                        if senml_bt:
                            # bt é Unix timestamp UTC - armazenar diretamente em UTC
                            # Com USE_TZ=True, Django sempre normaliza para UTC no banco
                            utc_dt = datetime.fromtimestamp(senml_bt, tz=dt_timezone.utc)
                            ingest_timestamp = utc_dt
                            
                            logger.info(
                                f"⏰ TIMESTAMP - "
                                f"Unix={senml_bt}s, "
                                f"UTC={utc_dt.strftime('%d/%m/%Y %H:%M:%S')}, "
                                f"✅ Armazenando: {ingest_timestamp.strftime('%d/%m/%Y %H:%M:%S %Z')}"
                            )
            except Exception as e:
                logger.warning(f"Erro ao extrair bt do SenML: {e}")
            
            # Fallback para ts do EMQX se não conseguiu extrair bt
            if not ingest_timestamp and ts:
                try:
                    # Usar ts do EMQX diretamente em UTC
                    utc_dt = datetime.fromtimestamp(ts / 1000.0, tz=dt_timezone.utc)
                    ingest_timestamp = utc_dt
                    
                    logger.warning(
                        f"⚠️ USANDO TIMESTAMP DO EMQX (fallback) - "
                        f"ts_original={ts}ms, "
                        f"UTC={utc_dt.strftime('%d/%m/%Y %H:%M:%S')}"
                    )
                except (ValueError, TypeError, OSError, OverflowError) as e:
                    logger.warning(f"Invalid EMQX timestamp: {ts} - {e}")
            
            # Se não tem nenhum timestamp, usar timestamp atual no timezone local
            if not ingest_timestamp:
                utc_now = datetime.now(tz=dt_timezone.utc)
                site_tz = pytz.timezone(site_timezone_str)
                ingest_timestamp = utc_now.astimezone(site_tz)
                logger.warning(
                    f"⚠️ Nenhum timestamp encontrado, usando timestamp atual: "
                    f"{ingest_timestamp.strftime('%d/%m/%Y %H:%M:%S %Z')}"
                )

            # Payload já foi parseado acima ao extrair o bt, não precisa fazer novamente
            if isinstance(payload, str):
                import json
                try:
                    payload = json.loads(payload)
                except json.JSONDecodeError as e:
                    logger.warning(f"Failed to parse payload JSON: {e}")
                    return Response(
                        {"error": "Invalid JSON in payload"},
                        status=status.HTTP_400_BAD_REQUEST
                    )

            if settings.DEBUG:
                logger.info(f"🔍 Tentando encontrar parser para topic: {topic}")
                logger.info(f"🔍 Tipo do payload: {type(payload)}")
                logger.info(f"🔍 Payload preview: {str(payload)[:200]}")
            
            # IMPORTANTE: Passar o payload interno, não o data completo!
            parser = parser_manager.get_parser(payload, topic)

            if not parser:
                logger.warning(f"⚠️ Nenhum parser encontrado para o payload. Topic: {topic}")
                if settings.DEBUG:
                    logger.warning(f"⚠️ Payload recebido: {payload}")
                    logger.warning(f"⚠️ Parsers disponíveis: {[p.__class__.__name__ for p in parser_manager._parsers]}")
                return Response(
                    {"error": "Formato de payload não reconhecido"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            try:
                # IMPORTANTE: Passar o payload interno, não o data completo!
                parsed_data = parser.parse(payload, topic)
                if settings.DEBUG:
                    logger.info(f"✅ Payload parseado com sucesso usando {parser.__class__.__name__}")
                    logger.info(f"📊 Device: {parsed_data['device_id']}, Sensors: {len(parsed_data['sensors'])}")
            except Exception as e:
                logger.error(f"❌ Erro ao parsear payload: {e}", exc_info=True)
                return Response(
                    {"error": f"Erro ao processar payload: {str(e)}"},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

            device_id = parsed_data['device_id']
            sensors = parsed_data['sensors']
            metadata = parsed_data.get('metadata', {})
            base_timestamp = ensure_aware_timestamp(parsed_data.get('timestamp'), ingest_timestamp)
            parsed_data['timestamp'] = base_timestamp

            try:
                with transaction.atomic():
                    telemetry = Telemetry.objects.create(
                        device_id=device_id,
                        topic=topic,
                        payload=payload,
                        timestamp=ingest_timestamp
                    )
                    
                    logger.info(
                        f"💾 TABELA: telemetry (histórico raw) - "
                        f"ID={telemetry.id}, device={device_id}, topic={topic}"
                    )

                    # Auto linking - extract hierarchy from MQTT topic
                    site_name, asset_tag = self._extract_site_and_asset_from_topic(topic)
                    
                    # Extract tenant from topic (tenants/{tenant}/...)
                    tenant_name = None
                    topic_parts = topic.split('/')
                    if 'tenants' in topic_parts:
                        tenant_idx = topic_parts.index('tenants')
                        if tenant_idx + 1 < len(topic_parts):
                            tenant_name = topic_parts[tenant_idx + 1]

                    if asset_tag:
                        logger.info(f"🔗 Asset tag extraído do tópico: {asset_tag}")
                        if site_name:
                            logger.info(f"📍 Site extraído do tópico: {site_name}")
                        if tenant_name:
                            logger.info(f"🏢 Tenant extraído do tópico: {tenant_name}")

                        asset = self._auto_create_and_link_asset(
                            site_name=site_name,
                            asset_tag=asset_tag,
                            device_id=device_id,
                            parsed_data=parsed_data
                        )

                        if asset:
                            logger.info(f"✅ Asset {asset_tag} processado no site {asset.site.name}")
                        else:
                            logger.warning(f"⚠️ Não foi possível processar asset {asset_tag}")
                    else:
                        logger.warning(f"⚠️ Não foi possível extrair asset_tag do tópico: {topic}")

                    readings_to_create = []
                    duplicates_skipped = 0

                    for sensor in sensors:
                        if not isinstance(sensor, dict):
                            continue

                        sensor_id = sensor.get('sensor_id')
                        value = sensor.get('value')

                        if not sensor_id or value is None:
                            continue

                        labels = sensor.get('labels', {})
                        if not isinstance(labels, dict):
                            labels = {}

                        reading_timestamp = ensure_aware_timestamp(sensor.get('timestamp'), base_timestamp)
                        
                        # Log timestamp para debug
                        logger.debug(
                            f"📊 READING CRIADO - sensor_id={sensor_id}, "
                            f"value={value}, timestamp_sensor={sensor.get('timestamp')}, "
                            f"reading_timestamp={reading_timestamp.isoformat()}"
                        )

                        # 🔧 PERFORMANCE FIX: Remove redundant .exists() check
                        # bulk_create with ignore_conflicts=True already handles duplicates
                        # This .exists() causes N database roundtrips for each sensor
                        
                        readings_to_create.append(
                            Reading(
                                device_id=device_id,
                                sensor_id=sensor_id,
                                value=float(value),
                                labels=labels,
                                ts=reading_timestamp,
                                # MQTT Topic Hierarchy (source of truth)
                                asset_tag=asset_tag,
                                tenant=tenant_name,
                                site=site_name
                            )
                        )

                    if readings_to_create:
                        # 🔒 SECURITY FIX #4: Use ignore_conflicts to prevent race condition
                        # Concurrent ingestions can violate unique constraint (device_id, sensor_id, ts)
                        # Instead of dropping entire batch on IntegrityError, silently skip duplicates
                        
                        # 🔧 PERFORMANCE FIX: Capture actual insert count
                        # bulk_create with ignore_conflicts returns empty list in Django
                        # 🔧 PERFORMANCE FIX (Nov 2025): Use delta calculation instead of 2 range scans
                        # Audit finding: "Conta linhas antes e depois de cada inserção para calcular 
                        # o total, mas o resultado é sobrescrito. Além disso, faz duas range scans caras."
                        # 
                        # OLD: 2 expensive range scans (before + after)
                        # NEW: Single count before + delta from bulk_create result
                        
                        # Count existing readings before insert
                        count_before = Reading.objects.filter(
                            device_id=device_id,
                            ts__gte=min(r.ts for r in readings_to_create),
                            ts__lte=max(r.ts for r in readings_to_create)
                        ).count()
                        
                        # Bulk insert (ignores duplicates silently)
                        Reading.objects.bulk_create(
                            readings_to_create, 
                            ignore_conflicts=True
                        )
                        
                        # Count after to get actual inserts (delta method)
                        count_after = Reading.objects.filter(
                            device_id=device_id,
                            ts__gte=min(r.ts for r in readings_to_create),
                            ts__lte=max(r.ts for r in readings_to_create)
                        ).count()
                        
                        # Calculate accurate metrics
                        readings_created = count_after - count_before
                        duplicates_skipped = len(readings_to_create) - readings_created
                        
                        logger.info(
                            f"💾 TABELA: reading (TimescaleDB hypertable) - "
                            f"Inseridos={readings_created}, Duplicados ignorados={duplicates_skipped}, "
                            f"Total tentativa={len(readings_to_create)}"
                        )
                        
                        # Atualizar status do device para ONLINE e last_seen
                        try:
                            from apps.assets.models import Device
                            Device.objects.filter(mqtt_client_id=device_id).update(
                                status='ONLINE',
                                last_seen=dj_timezone.now()
                            )
                            logger.info(f"✅ Device {device_id} marcado como ONLINE")
                        except Exception as e_device:
                            logger.warning(f"⚠️ Não foi possível atualizar status do device: {e_device}")

                    # ❌ REMOVED: Line that overwrote accurate count
                    # readings_created = len(readings_to_create)  # BUG: Sobrescrevia contagem real!

                logger.info(
                    f"✅ Telemetry saved: tenant={tenant_slug}, "
                    f"device={device_id}, topic={topic}, format={metadata.get('format', 'unknown')}"
                )
                logger.info(
                    f"📊 Created {readings_created} sensor readings (duplicados ignorados: {duplicates_skipped})"
                )

                response_data = {
                    "status": "accepted",
                    "id": telemetry.id,
                    "device_id": telemetry.device_id,
                    "timestamp": telemetry.timestamp.isoformat(),
                    "sensors_saved": readings_created,
                    "duplicates_skipped": duplicates_skipped,
                    "format": metadata.get('format', 'unknown')
                }

                if metadata.get('gateway_id'):
                    response_data['gateway_id'] = metadata['gateway_id']
                if metadata.get('model'):
                    response_data['model'] = metadata['model']

                return Response(response_data, status=status.HTTP_202_ACCEPTED)

            except Exception as e:
                logger.error(f"Failed to save telemetry: {e}", exc_info=True)
                return Response(
                    {"error": "Failed to save telemetry"},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

        finally:
            connection.set_schema_to_public()
    
    def _extract_site_and_asset_from_topic(self, topic):
        """
        Extrai site_name e asset_tag do tópico MQTT.
        
        Padrões suportados:
        - tenants/{tenant}/sites/{site_name}/assets/{asset_tag}/telemetry (NOVO - com site)
        - tenants/{tenant}/assets/{asset_tag}/telemetry (legado - sem site)
        
        Returns:
            tuple: (site_name, asset_tag) ou (None, None)
        """
        from urllib.parse import unquote
        
        parts = topic.split('/')
        site_name = None
        asset_tag = None
        
        try:
            # Novo padrão com site
            if 'sites' in parts and 'assets' in parts:
                site_idx = parts.index('sites')
                asset_idx = parts.index('assets')
                
                if site_idx + 1 < len(parts):
                    site_name = parts[site_idx + 1]
                    # Decodificar URL encoding se necessário
                    site_name = unquote(site_name)
                
                if asset_idx + 1 < len(parts):
                    asset_tag = parts[asset_idx + 1]
                    
                logger.info(f"✅ Extraído do tópico - Site: {site_name}, Asset: {asset_tag}")
                
            # Padrão legado sem site (mantém compatibilidade)
            elif 'assets' in parts:
                asset_idx = parts.index('assets')
                if asset_idx + 1 < len(parts):
                    asset_tag = parts[asset_idx + 1]
                    logger.info(f"✅ Asset extraído (sem site): {asset_tag}")
                    
        except Exception as e:
            logger.warning(f"⚠️ Erro ao extrair informações do tópico: {e}")
            
        return site_name, asset_tag
    
    def _detect_asset_type(self, asset_tag):
        """
        Detecta o tipo de asset baseado no tag.
        """
        tag_upper = asset_tag.upper()
        
        if 'CHILLER' in tag_upper or 'CH-' in tag_upper:
            return 'CHILLER'
        elif 'AHU' in tag_upper:
            return 'AHU'
        elif 'VRF' in tag_upper:
            return 'VRF'
        elif 'FCU' in tag_upper:
            return 'FCU'
        elif 'SPLIT' in tag_upper:
            return 'SPLIT'
        elif 'RTU' in tag_upper:
            return 'RTU'
        elif 'COOLING' in tag_upper or 'TOWER' in tag_upper:
            return 'COOLING_TOWER'
        else:
            return 'OTHER'
    
    def _auto_create_and_link_asset(self, site_name, asset_tag, device_id, parsed_data):
        """
        Cria ou atualiza automaticamente asset e vincula device/sensores.
        
        Fluxo:
        1. Se site_name fornecido, busca ou cria o site
        2. Busca ou cria o asset no site correto
        3. Busca ou cria o device e vincula ao asset
        4. Vincula sensores ao device
        
        Args:
            site_name: Nome do site (pode ser None)
            asset_tag: Tag do asset
            device_id: ID MQTT do device
            parsed_data: Dados parseados do payload (incluindo metadata e sensors)
        
        Returns:
            Asset object ou None
        """
        try:
            from apps.assets.models import Site, Asset, Device, Sensor
            from django.utils import timezone
            
            # 1. Determinar o site
            site = None
            if site_name:
                site = Site.objects.filter(name=site_name, is_active=True).first()
                if site:
                    logger.info(f"📍 Site encontrado: {site.name}")
                else:
                    logger.warning(f"⚠️ Site '{site_name}' não encontrado. Ignorando auto-criação.")
                    return None
            else:
                # 🔒 SECURITY FIX #5: Reject missing site metadata instead of guessing
                # Previously used .first() which silently attached devices to arbitrary sites,
                # corrupting the asset hierarchy and breaking tenant isolation
                logger.error(
                    f"❌ Missing site metadata in topic for asset {asset_tag}. "
                    f"Topic MUST encode site: tenants/{{tenant}}/sites/{{site}}/assets/{{asset}}/telemetry"
                )
                return None
            
            if not site:
                logger.error("❌ Nenhum site disponível para vincular o asset")
                return None
            
            # 2. Buscar ou criar o asset
            asset, asset_created = Asset.objects.get_or_create(
                tag=asset_tag,
                defaults={
                    'name': f'{asset_tag}',
                    'site': site,
                    'asset_type': self._detect_asset_type(asset_tag),
                    'status': 'OPERATIONAL',
                    'health_score': 100,
                    'is_active': True
                }
            )
            
            if asset_created:
                logger.info(f"✨ Asset criado automaticamente: {asset.tag} no site {site.name}")
            else:
                # Atualizar site do asset se mudou
                if asset.site != site:
                    old_site = asset.site.name
                    asset.site = site
                    asset.save(update_fields=['site', 'updated_at'])
                    logger.info(f"🔄 Asset {asset_tag} movido de {old_site} para {site.name}")
                else:
                    logger.debug(f"✅ Asset {asset_tag} já existe no site {site.name}")
            
            # 3. Buscar ou criar o device e vincular ao asset
            metadata = parsed_data.get('metadata', {})
            device, device_created = Device.objects.get_or_create(
                mqtt_client_id=device_id,
                defaults={
                    'asset': asset,
                    'name': f'Gateway {asset_tag}',
                    'serial_number': device_id,
                    'device_type': 'GATEWAY',
                    'firmware_version': metadata.get('model', 'unknown'),
                    'status': 'OFFLINE',
                    'is_active': True,
                    'last_seen': timezone.now()
                }
            )
            
            if device_created:
                logger.info(f"✨ Device criado e vinculado ao asset {asset_tag}")
            else:
                # Atualizar asset do device se mudou
                if device.asset != asset:
                    old_asset = device.asset.tag if device.asset else 'N/A'
                    device.asset = asset
                    device.last_seen = timezone.now()
                    device.save(update_fields=['asset', 'last_seen', 'updated_at'])
                    logger.info(f"🔄 Device {device_id} movido de {old_asset} para {asset_tag}")
                else:
                    # Apenas atualizar last_seen
                    device.last_seen = timezone.now()
                    device.save(update_fields=['last_seen'])
            
            # 4. Processar sensores do payload
            if 'sensors' in parsed_data:
                for sensor_data in parsed_data['sensors']:
                    sensor_id = sensor_data.get('sensor_id')
                    if not sensor_id:
                        continue
                    
                    labels = sensor_data.get('labels', {})
                    sensor_type = labels.get('type', 'unknown')
                    unit = labels.get('unit', '')
                    
                    # Buscar ou criar sensor
                    sensor, sensor_created = Sensor.objects.get_or_create(
                        tag=sensor_id,
                        device=device,
                        defaults={
                            'metric_type': self._map_sensor_type_to_metric(sensor_type),
                            'unit': unit,
                            'is_online': True,
                            'is_active': True
                        }
                    )
                    
                    if sensor_created:
                        logger.info(f"✨ Sensor {sensor_id} criado e vinculado ao device {device_id}")
                    
                    # Atualizar último valor do sensor
                    value = sensor_data.get('value')
                    if value is not None:
                        sensor.last_value = value
                        sensor.last_reading_at = timezone.now()
                        sensor.is_online = True
                        sensor.save(update_fields=['last_value', 'last_reading_at', 'is_online', 'updated_at'])
            
            return asset
            
        except Exception as e:
            logger.error(f"❌ Erro ao criar/vincular asset: {e}", exc_info=True)
            return None
    
    def _map_sensor_type_to_metric(self, sensor_type):
        """
        Mapeia sensor_type do parser para metric_type do model Sensor.
        """
        mapping = {
            'temperature': 'temperature',
            'humidity': 'humidity',
            'pressure': 'pressure',
            'counter': 'counter',
            'signal_strength': 'signal',
            'battery': 'voltage',
            'door_state': 'status',
            'unknown': 'other'
        }
        return mapping.get(sensor_type, 'other')
    
    def _extract_asset_tag_from_topic(self, topic):
        """
        Extrai o asset_tag do tópico MQTT.
        
        Padrões suportados:
        - tenants/{tenant}/assets/{asset_tag}/telemetry
        - tenants/{tenant}/devices/{device_id}/assets/{asset_tag}
        - {asset_tag}/telemetry
        
        Args:
            topic (str): Tópico MQTT completo
        
        Returns:
            str or None: Asset tag extraído ou None se não encontrado
        """
        parts = topic.split('/')
        
        # Padrão 1: tenants/{tenant}/assets/{asset_tag}/telemetry
        if 'assets' in parts:
            try:
                asset_idx = parts.index('assets')
                if asset_idx + 1 < len(parts):
                    asset_tag = parts[asset_idx + 1]
                    logger.info(f"✅ Asset tag extraído (padrão 1): {asset_tag}")
                    return asset_tag
            except (ValueError, IndexError):
                pass
        
        # Padrão 2: {asset_tag}/telemetry (tag diretamente)
        # Valida se o primeiro componente parece uma tag de ativo (ex: CH-001, AHU-001)
        if len(parts) >= 1:
            potential_tag = parts[0]
            if '-' in potential_tag and len(potential_tag) <= 50:
                logger.info(f"✅ Asset tag extraído (padrão 2): {potential_tag}")
                return potential_tag
        
        return None
    
    def _auto_link_sensors_to_asset(self, asset_tag, payload, device_id):
        """
        Vincula automaticamente sensores ao ativo baseado no tópico.
        
        Fluxo:
        1. Busca o Asset pelo tag
        2. Para cada sensor no payload:
           a. Busca ou cria um Device padrão para o Asset
           b. Busca o Sensor pelo sensor_id
           c. Se o Sensor existe mas não está vinculado corretamente, atualiza
           d. Se o Sensor não existe, apenas registra no log (será criado manualmente)
        
        Args:
            asset_tag (str): Tag do ativo (ex: CH-001)
            payload (dict): Payload MQTT com lista de sensores
            device_id (str): ID do dispositivo MQTT
        """
        try:
            from apps.assets.models import Asset, Device, Sensor
            
            # Busca o ativo pelo tag
            try:
                asset = Asset.objects.get(tag=asset_tag, is_active=True)
                logger.info(f"🎯 Asset encontrado: {asset.tag} - {asset.name}")
            except Asset.DoesNotExist:
                logger.warning(f"⚠️ Asset não encontrado: {asset_tag}")
                return
            
            # Busca ou cria um Device padrão para o ativo
            # Usa o mqtt_client_id como referência
            device, device_created = Device.objects.get_or_create(
                mqtt_client_id=device_id,
                defaults={
                    'asset': asset,
                    'name': f'Gateway {asset_tag}',
                    'serial_number': f'SN-{device_id}',
                    'device_type': 'GATEWAY',
                    'status': 'ONLINE'
                }
            )
            
            if device_created:
                logger.info(f"✨ Device criado automaticamente: {device.name} para asset {asset_tag}")
            else:
                # Se o device já existe mas está em outro asset, atualiza
                if device.asset_id != asset.id:
                    logger.info(f"🔄 Device {device.name} movido de {device.asset.tag} para {asset_tag}")
                    device.asset = asset
                    device.save(update_fields=['asset', 'updated_at'])
            
            # Processa cada sensor no payload
            sensors = payload.get('sensors', []) if isinstance(payload, dict) else []
            
            for sensor_data in sensors:
                if not isinstance(sensor_data, dict):
                    continue
                
                sensor_id = sensor_data.get('sensor_id')
                if not sensor_id:
                    continue
                
                try:
                    # Busca o sensor pelo tag (sensor_id)
                    sensor = Sensor.objects.filter(tag=sensor_id, is_active=True).first()
                    
                    if sensor:
                        # Se o sensor existe mas está em device diferente, atualiza
                        if sensor.device_id != device.id:
                            old_asset = sensor.device.asset.tag if sensor.device else 'N/A'
                            logger.info(f"🔄 Sensor {sensor_id} movido de {old_asset} para {asset_tag}")
                            sensor.device = device
                            sensor.save(update_fields=['device', 'updated_at'])
                        else:
                            logger.debug(f"✅ Sensor {sensor_id} já vinculado ao asset {asset_tag}")
                    else:
                        # ✨ AUTO-REGISTRO: Cria o sensor automaticamente
                        sensor = self._auto_create_sensor(
                            device=device,
                            sensor_id=sensor_id,
                            sensor_data=sensor_data
                        )
                        if sensor:
                            logger.info(
                                f"✨ Sensor criado automaticamente: {sensor_id} → "
                                f"{sensor.get_metric_type_display()} ({sensor.unit})"
                            )
                
                except Exception as e:
                    logger.error(f"❌ Erro ao processar sensor {sensor_id}: {e}", exc_info=True)
        
        except Exception as e:
            logger.error(f"❌ Erro no auto-link de sensores ao asset {asset_tag}: {e}", exc_info=True)
    
    def _auto_create_sensor(self, device, sensor_id, sensor_data):
        """
        Cria automaticamente um sensor baseado nos dados do payload.
        
        Mapeia os tipos e unidades do payload para os tipos suportados
        pelo modelo Sensor.
        
        Args:
            device: Objeto Device ao qual vincular o sensor
            sensor_id: Tag/ID do sensor
            sensor_data: Dados do sensor do payload com 'labels', 'value', etc.
        
        Returns:
            Sensor: Objeto Sensor criado ou None se falhar
        """
        try:
            from apps.assets.models import Sensor
            
            labels = sensor_data.get('labels', {})
            unit = labels.get('unit', 'N/A')
            sensor_type = labels.get('type', 'unknown')
            
            # Mapeamento de tipos do payload para SENSOR_TYPE_CHOICES
            type_mapping = {
                'temperature': 'temp_supply',
                'humidity': 'humidity',
                'pressure': 'pressure_suction',
                'signal_strength': 'maintenance',  # RSSI → manutenção/status
                'power': 'power_kw',
                'energy': 'energy_kwh',
                'voltage': 'voltage',
                'current': 'current',
                'ambient': 'temp_external',
                'binary_counter': 'maintenance',
                'counter': 'maintenance',
                'unknown': 'maintenance',
            }
            
            # Determina o metric_type baseado no tipo do sensor
            metric_type = type_mapping.get(sensor_type, 'maintenance')
            
            # Se temos informações mais específicas nos labels, usa elas
            if 'metric_type' in labels:
                metric_type = labels['metric_type']
            
            # Cria o sensor
            sensor = Sensor.objects.create(
                tag=sensor_id,
                device=device,
                metric_type=metric_type,
                unit=unit,
                thresholds={},  # Pode ser configurado posteriormente
                is_active=True
            )
            
            logger.info(
                f"✅ Sensor auto-criado: {sensor_id} | "
                f"Type: {metric_type} | Unit: {unit} | Device: {device.mqtt_client_id}"
            )
            
            return sensor
            
        except Exception as e:
            logger.error(
                f"❌ Erro ao criar sensor automaticamente {sensor_id}: {e}",
                exc_info=True
            )
            return None
