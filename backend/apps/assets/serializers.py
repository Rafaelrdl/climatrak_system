"""
Serializers para a API REST do catálogo de ativos.

Este módulo implementa os serializers do Django REST Framework para expor
os modelos Site, Asset, Device e Sensor via API REST.

Classes:
    SiteSerializer: Serializer para Sites com contador de ativos
    AssetSerializer: Serializer para Assets com informações aninhadas
    DeviceSerializer: Serializer para Devices com contadores
    SensorSerializer: Serializer para Sensors com lookup de nomes
"""

from rest_framework import serializers
from .models import Site, Asset, Device, Sensor


class SiteSerializer(serializers.ModelSerializer):
    """
    Serializer para o modelo Site.
    
    Campos adicionais:
        - asset_count: Número de ativos neste site (read-only)
        - full_name: Nome completo com empresa (read-only)
    
    Campos read-only:
        - id, created_at, updated_at, asset_count, full_name
    """
    
    asset_count = serializers.SerializerMethodField()
    full_name = serializers.CharField(read_only=True)
    
    class Meta:
        model = Site
        fields = [
            'id',
            'name',
            'full_name',
            'company',
            'sector',
            'subsector',
            'address',
            'latitude',
            'longitude',
            'timezone',
            'asset_count',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'asset_count', 'full_name']
    
    def get_asset_count(self, obj):
        """
        Retorna o número de ativos ativos neste site.
        🔧 PERFORMANCE: Uses annotated 'active_asset_count' from viewset if available.
        """
        # Try to use pre-computed annotation first (from viewset)
        if hasattr(obj, 'active_asset_count'):
            return obj.active_asset_count
        # Fallback to query (for cases where annotation isn't available)
        return obj.assets.filter(status__in=['OPERATIONAL', 'WARNING', 'MAINTENANCE']).count()


class AssetListSerializer(serializers.ModelSerializer):
    """
    Serializer simplificado para listagem de Assets.
    
    Usado em endpoints de listagem para reduzir payload.
    Não inclui especificações JSON completas.
    """
    
    site_name = serializers.CharField(source='site.name', read_only=True)
    device_count = serializers.SerializerMethodField()
    
    # Campos de localização (Company/Sector/Subsection)
    company_id = serializers.SerializerMethodField()
    sector_name = serializers.CharField(source='sector.name', read_only=True, allow_null=True)
    subsection_name = serializers.CharField(source='subsection.name', read_only=True, allow_null=True)
    
    class Meta:
        model = Asset
        fields = [
            'id',
            'tag',
            'name',
            'site',
            'site_name',
            'asset_type',
            'status',
            'health_score',
            'location_description',  # ✅ ADICIONADO
            'specifications',         # ✅ ADICIONADO
            'device_count',
            'created_at',
            'updated_at',
            # Campos de localização
            'sector',
            'subsection',
            'company_id',
            'sector_name',
            'subsection_name',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'device_count', 'company_id', 'sector_name', 'subsection_name']
    
    def get_device_count(self, obj):
        """Retorna o número de dispositivos conectados a este ativo."""
        return obj.devices.count()
    
    def get_company_id(self, obj):
        """Retorna o ID da empresa via setor."""
        if obj.sector and obj.sector.company:
            return obj.sector.company.id
        return None


class AssetSerializer(serializers.ModelSerializer):
    """
    Serializer completo para o modelo Asset.
    
    Campos adicionais:
        - site_name: Nome do site (read-only)
        - full_location: Localização completa (read-only)
        - device_count: Número de dispositivos (read-only)
        - sensor_count: Número total de sensores (read-only)
        - company_id: ID da empresa (via sector)
        - sector_name: Nome do setor
        - subsection_name: Nome da subseção
    
    Campos read-only:
        - id, site_name, full_location, device_count, sensor_count,
          health_score, created_at, updated_at, company_id, sector_name, subsection_name
    """
    
    site_name = serializers.CharField(source='site.name', read_only=True)
    full_location = serializers.CharField(read_only=True)
    device_count = serializers.SerializerMethodField()
    sensor_count = serializers.SerializerMethodField()
    
    # Campos de localização (Company/Sector/Subsection)
    company_id = serializers.SerializerMethodField()
    sector_name = serializers.CharField(source='sector.name', read_only=True, allow_null=True)
    subsection_name = serializers.CharField(source='subsection.name', read_only=True, allow_null=True)
    
    class Meta:
        model = Asset
        fields = [
            'id',
            'tag',
            'name',
            'site',
            'site_name',
            'full_location',
            'asset_type',
            'asset_type_other',
            'manufacturer',
            'model',
            'serial_number',
            'location_description',
            'installation_date',
            'last_maintenance',
            'status',
            'health_score',
            'specifications',
            'device_count',
            'sensor_count',
            'created_at',
            'updated_at',
            # Campos de localização (Company/Sector/Subsection)
            'sector',
            'subsection',
            'company_id',
            'sector_name',
            'subsection_name',
        ]
        read_only_fields = [
            'id', 'site_name', 'full_location', 'device_count', 
            'sensor_count', 'health_score', 'created_at', 'updated_at',
            'company_id', 'sector_name', 'subsection_name'
        ]
    
    def get_company_id(self, obj):
        """Retorna o ID da empresa via setor."""
        if obj.sector and obj.sector.company:
            return obj.sector.company.id
        return None
    
    def get_device_count(self, obj):
        """
        Retorna o número de dispositivos conectados a este ativo.
        🔧 PERFORMANCE: Uses annotated 'total_device_count' from viewset if available.
        """
        if hasattr(obj, 'total_device_count'):
            return obj.total_device_count
        return obj.devices.count()
    
    def get_sensor_count(self, obj):
        """
        Retorna o número total de sensores conectados (via devices).
        🔧 PERFORMANCE: Uses annotated 'total_sensor_count' from viewset if available.
        """
        if hasattr(obj, 'total_sensor_count'):
            return obj.total_sensor_count
        return Sensor.objects.filter(device__asset=obj).count()
    
    def validate_tag(self, value):
        """Valida que a tag é única (case-insensitive)."""
        if value:
            value = value.upper()
            # Verifica se já existe (excluindo o próprio objeto em updates)
            queryset = Asset.objects.filter(tag=value)
            if self.instance:
                queryset = queryset.exclude(pk=self.instance.pk)
            if queryset.exists():
                raise serializers.ValidationError(
                    f"Asset com tag '{value}' já existe."
                )
        return value
    
    def validate(self, data):
        """Validações adicionais do modelo."""
        # Valida datas
        if 'installation_date' in data and 'last_maintenance' in data:
            if data['last_maintenance'] and data['installation_date']:
                if data['last_maintenance'] < data['installation_date']:
                    raise serializers.ValidationError({
                        'last_maintenance': 'Data de manutenção não pode ser anterior à instalação.'
                    })
        return data


class AssetCompleteSerializer(serializers.ModelSerializer):
    """
    Serializer completo para monitoramento de Assets.
    
    Usado pelo endpoint /api/assets/complete/ para dashboards de monitoramento.
    Inclui dados detalhados, métricas resumidas e informações de dispositivos/sensores.
    
    Este serializer é otimizado para fornecer todos os dados necessários para:
    - TrakSense HVAC Monitor (monitoramento IoT)
    - TrakNor CMMS (gestão de ativos e manutenção)
    
    Campos adicionais:
        - site_name: Nome do site
        - site_company: Empresa do site
        - full_location: Localização completa
        - device_count: Total de dispositivos
        - sensor_count: Total de sensores
        - online_device_count: Dispositivos online
        - online_sensor_count: Sensores online
        - latest_readings: Últimas leituras dos sensores
        - alert_count: Número de alertas ativos
    """
    
    site_name = serializers.CharField(source='site.name', read_only=True)
    site_company = serializers.CharField(source='site.company', read_only=True)
    site_sector = serializers.CharField(source='site.sector', read_only=True)
    site_subsector = serializers.CharField(source='site.subsector', read_only=True)
    # Campos do relacionamento direto com locations
    sector_id = serializers.IntegerField(source='sector.id', read_only=True, allow_null=True)
    sector_name = serializers.CharField(source='sector.name', read_only=True, allow_null=True)
    subsection_id = serializers.IntegerField(source='subsection.id', read_only=True, allow_null=True)
    subsection_name = serializers.CharField(source='subsection.name', read_only=True, allow_null=True)
    company_id = serializers.SerializerMethodField()
    company_name = serializers.SerializerMethodField()
    full_location = serializers.CharField(read_only=True)
    device_count = serializers.SerializerMethodField()
    sensor_count = serializers.SerializerMethodField()
    online_device_count = serializers.SerializerMethodField()
    online_sensor_count = serializers.SerializerMethodField()
    latest_readings = serializers.SerializerMethodField()
    alert_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Asset
        fields = [
            'id',
            'tag',
            'name',
            'site',
            'site_name',
            'site_company',
            'site_sector',
            'site_subsector',
            'sector_id',
            'sector_name',
            'subsection_id',
            'subsection_name',
            'company_id',
            'company_name',
            'full_location',
            'asset_type',
            'asset_type_other',
            'manufacturer',
            'model',
            'serial_number',
            'location_description',
            'installation_date',
            'last_maintenance',
            'status',
            'health_score',
            'specifications',
            'device_count',
            'sensor_count',
            'online_device_count',
            'online_sensor_count',
            'latest_readings',
            'alert_count',
            'created_at',
            'updated_at',
        ]
        read_only_fields = fields
    
    def get_company_id(self, obj):
        """Obtém o ID da empresa do setor"""
        if obj.sector and obj.sector.company:
            return obj.sector.company.id
        return None
    
    def get_company_name(self, obj):
        """Obtém o nome da empresa do setor"""
        if obj.sector and obj.sector.company:
            return obj.sector.company.name
        return None
    
    def get_device_count(self, obj):
        """Total de dispositivos ativos."""
        if hasattr(obj, 'total_device_count'):
            return obj.total_device_count
        return obj.devices.filter(is_active=True).count()
    
    def get_sensor_count(self, obj):
        """Total de sensores ativos."""
        if hasattr(obj, 'total_sensor_count'):
            return obj.total_sensor_count
        return Sensor.objects.filter(device__asset=obj, is_active=True).count()
    
    def get_online_device_count(self, obj):
        """Dispositivos online (status='ONLINE')."""
        if hasattr(obj, 'online_device_count') and obj.online_device_count is not None:
            return obj.online_device_count
        return obj.devices.filter(status='ONLINE', is_active=True).count()
    
    def get_online_sensor_count(self, obj):
        """Sensores online."""
        if hasattr(obj, 'online_sensor_count') and obj.online_sensor_count is not None:
            return obj.online_sensor_count
        return Sensor.objects.filter(device__asset=obj, is_online=True, is_active=True).count()
    
    def get_latest_readings(self, obj):
        """
        Retorna as últimas leituras dos sensores do asset.
        
        Formato:
        {
            "temperature": {"value": 22.5, "unit": "°C", "timestamp": "..."},
            "humidity": {"value": 45.0, "unit": "%", "timestamp": "..."},
            ...
        }
        """
        from apps.ingest.models import Reading
        from django.db.models import Max
        
        readings = {}
        
        # Buscar sensores ativos do asset
        sensors = Sensor.objects.filter(
            device__asset=obj,
            is_active=True
        ).select_related('device')
        
        for sensor in sensors:
            # Buscar última leitura (campo timestamp é 'ts', não 'time')
            last_reading = Reading.objects.filter(
                sensor_id=sensor.id
            ).order_by('-ts').first()
            
            if last_reading:
                metric_key = sensor.metric_type.lower() if sensor.metric_type else f'sensor_{sensor.id}'
                readings[metric_key] = {
                    'sensor_id': sensor.id,
                    'sensor_name': sensor.name,
                    'value': float(last_reading.value) if last_reading.value else None,
                    'unit': sensor.unit or '',
                    'timestamp': last_reading.ts.isoformat() if last_reading.ts else None,
                    'is_online': sensor.is_online,
                }
        
        return readings
    
    def get_alert_count(self, obj):
        """Número de alertas ativos (não resolvidos e não reconhecidos)."""
        from apps.alerts.models import Alert
        
        return Alert.objects.filter(
            asset_tag=obj.tag,
            resolved=False,
            acknowledged=False
        ).count()


class DeviceListSerializer(serializers.ModelSerializer):
    """
    Serializer simplificado para listagem de Devices.
    
    Usado em endpoints de listagem para reduzir payload.
    """
    
    asset_tag = serializers.CharField(source='asset.tag', read_only=True)
    sensor_count = serializers.SerializerMethodField()
    is_online = serializers.SerializerMethodField()
    display_name = serializers.SerializerMethodField()
    
    class Meta:
        model = Device
        fields = [
            'id',
            'name',
            'serial_number',
            'display_name',  # Nome curto para exibição (sufixo do serial)
            'mqtt_client_id',  # 🆕 IMPORTANTE: Necessário para telemetria
            'asset',
            'asset_tag',
            'device_type',
            'status',
            'sensor_count',
            'is_online',
            'last_seen',
            'created_at',
        ]
        read_only_fields = ['id', 'sensor_count', 'is_online', 'display_name', 'created_at']
    
    def get_sensor_count(self, obj):
        """Retorna o número de sensores neste dispositivo."""
        return obj.sensors.count()
    
    def get_is_online(self, obj):
        """Retorna True se o device estiver com status ONLINE."""
        return obj.status == 'ONLINE'
    
    def get_display_name(self, obj):
        """
        Retorna nome curto para exibição usando apenas sufixo do serial number.
        
        Exemplos:
            F80332010002C857 -> C857
            F8033208000308B2 -> 08B2
        
        Regra: Últimos 4 caracteres do serial_number
        """
        if obj.serial_number and len(obj.serial_number) > 4:
            return f"Device {obj.serial_number[-4:]}"
        return obj.name or obj.serial_number


class DeviceSerializer(serializers.ModelSerializer):
    """
    Serializer completo para o modelo Device.
    
    Campos adicionais:
        - asset_tag: Tag do ativo (read-only)
        - asset_name: Nome do ativo (read-only)
        - site_name: Nome do site (read-only)
        - sensor_count: Número de sensores (read-only)
    
    Campos read-only:
        - id, asset_tag, asset_name, site_name, is_online, 
          sensor_count, last_seen, created_at, updated_at
    """
    
    asset_tag = serializers.CharField(source='asset.tag', read_only=True)
    asset_name = serializers.CharField(source='asset.name', read_only=True)
    site_name = serializers.CharField(source='asset.site.name', read_only=True)
    sensor_count = serializers.SerializerMethodField()
    is_online = serializers.SerializerMethodField()
    
    class Meta:
        model = Device
        fields = [
            'id',
            'name',
            'serial_number',
            'asset',
            'asset_tag',
            'asset_name',
            'site_name',
            'device_type',
            'mqtt_client_id',
            'status',
            'firmware_version',
            'last_seen',
            'sensor_count',
            'is_online',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id', 'asset_tag', 'asset_name', 'site_name',
            'sensor_count', 'is_online', 'last_seen', 'created_at', 'updated_at'
        ]
    
    def get_sensor_count(self, obj):
        """Retorna o número de sensores neste dispositivo."""
        return obj.sensors.count()
    
    def get_is_online(self, obj):
        """Retorna True se o device estiver com status ONLINE."""
        return obj.status == 'ONLINE'
    
    def validate_serial_number(self, value):
        """Valida que o serial number é único."""
        if value:
            queryset = Device.objects.filter(serial_number=value)
            if self.instance:
                queryset = queryset.exclude(pk=self.instance.pk)
            if queryset.exists():
                raise serializers.ValidationError(
                    f"Device com serial number '{value}' já existe."
                )
        return value
    
    def validate_mqtt_client_id(self, value):
        """Valida que o mqtt_client_id é único."""
        if value:
            queryset = Device.objects.filter(mqtt_client_id=value)
            if self.instance:
                queryset = queryset.exclude(pk=self.instance.pk)
            if queryset.exists():
                raise serializers.ValidationError(
                    f"Device com MQTT Client ID '{value}' já existe."
                )
        return value


class SensorListSerializer(serializers.ModelSerializer):
    """
    Serializer simplificado para listagem de Sensors.
    
    Usado em endpoints de listagem para reduzir payload.
    """
    
    device_name = serializers.CharField(source='device.name', read_only=True)
    device_display_name = serializers.SerializerMethodField()  # Nome curto do device
    asset_tag = serializers.CharField(source='device.asset.tag', read_only=True)
    device_mqtt_client_id = serializers.CharField(source='device.mqtt_client_id', read_only=True)
    device_serial = serializers.CharField(source='device.serial_number', read_only=True)
    
    class Meta:
        model = Sensor
        fields = [
            'id',
            'tag',
            'device',
            'device_name',
            'device_display_name',  # Nome curto para exibição
            'device_serial',
            'device_mqtt_client_id',
            'asset_tag',
            'metric_type',
            'unit',
            'is_online',
            'last_value',
            'last_reading_at',
            'created_at',
        ]
        read_only_fields = [
            'id',
            'device_name',
            'device_display_name',
            'device_serial',
            'device_mqtt_client_id',
            'asset_tag',
            'is_online',
            'last_reading_at',
            'created_at'
        ]
    
    def get_device_display_name(self, obj):
        """
        Retorna nome curto do device usando apenas sufixo do serial number.
        
        Exemplos:
            F80332010002C857 -> Device C857
            F8033208000308B2 -> Device 08B2
        
        Regra: Últimos 4 caracteres do serial_number
        """
        if obj.device and obj.device.serial_number:
            serial = obj.device.serial_number
            if len(serial) > 4:
                return f"Device {serial[-4:]}"
            return serial
        return obj.device.name if obj.device else "N/A"


class SensorSerializer(serializers.ModelSerializer):
    """
    Serializer completo para o modelo Sensor.
    
    Campos adicionais:
        - device_name: Nome do dispositivo (read-only)
        - device_display_name: Nome curto do dispositivo (sufixo) (read-only)
        - device_serial: Serial do dispositivo (read-only)
        - asset_tag: Tag do ativo (read-only)
        - asset_name: Nome do ativo (read-only)
        - site_name: Nome do site (read-only)
        - availability: Percentual de disponibilidade (read-only)
    
    Campos read-only:
        - id, device_name, device_display_name, device_serial, asset_tag, asset_name, site_name,
          is_online, last_reading, availability, created_at, updated_at
    """
    
    device_name = serializers.CharField(source='device.name', read_only=True)
    device_display_name = serializers.SerializerMethodField()  # Nome curto
    device_serial = serializers.CharField(source='device.serial_number', read_only=True)
    device_mqtt_client_id = serializers.CharField(source='device.mqtt_client_id', read_only=True)
    asset_tag = serializers.CharField(source='device.asset.tag', read_only=True)
    asset_name = serializers.CharField(source='device.asset.name', read_only=True)
    site_name = serializers.CharField(source='device.asset.site.name', read_only=True)
    availability = serializers.SerializerMethodField()
    
    class Meta:
        model = Sensor
        fields = [
            'id',
            'tag',
            'device',
            'device_name',
            'device_display_name',  # Nome curto para exibição
            'device_serial',
            'device_mqtt_client_id',
            'asset_tag',
            'asset_name',
            'site_name',
            'metric_type',
            'unit',
            'thresholds',
            'is_online',
            'last_value',
            'last_reading_at',
            'availability',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id', 'device_name', 'device_serial', 'device_mqtt_client_id', 'asset_tag', 'asset_name',
            'site_name', 'is_online', 'last_reading_at', 'availability',
            'created_at', 'updated_at'
        ]
    
    def get_availability(self, obj):
        """
        Calcula a disponibilidade do sensor nos últimos 30 dias.
        
        Retorna um percentual baseado no número de leituras esperadas
        vs recebidas. Se não houver leituras, retorna None.
        
        TODO: Implementar cálculo real baseado em TelemetryReading quando necessário.
        Por enquanto, retorna None - a disponibilidade deve vir do Device.
        """
        return None
    
    def get_device_display_name(self, obj):
        """
        Retorna nome curto do device usando apenas sufixo do serial number.
        
        Exemplos:
            F80332010002C857 -> Device C857
            F8033208000308B2 -> Device 08B2
        
        Regra: Últimos 4 caracteres do serial_number
        """
        if obj.device and obj.device.serial_number:
            serial = obj.device.serial_number
            if len(serial) > 4:
                return f"Device {serial[-4:]}"
            return serial
        return obj.device.name if obj.device else "N/A"
    
    def validate(self, data):
        """Validações adicionais do modelo."""
        # Valida unique_together (device, metric_type)
        if 'device' in data and 'metric_type' in data:
            queryset = Sensor.objects.filter(
                device=data['device'],
                metric_type=data['metric_type']
            )
            if self.instance:
                queryset = queryset.exclude(pk=self.instance.pk)
            if queryset.exists():
                raise serializers.ValidationError({
                    'metric_type': f"Sensor com metric_type '{data['metric_type']}' "
                                  f"já existe neste dispositivo."
                })
        return data


class SensorBulkCreateSerializer(serializers.Serializer):
    """
    Serializer para criação em massa de sensores.
    
    Usado para criar múltiplos sensores de uma vez via POST /api/devices/{id}/sensors/bulk/
    
    Exemplo de payload:
        {
            "sensors": [
                {
                    "tag": "TEMP-001",
                    "metric_type": "TEMPERATURE",
                    "unit": "°C",
                    "description": "Temperatura de entrada"
                },
                {
                    "tag": "PRES-001",
                    "metric_type": "PRESSURE",
                    "unit": "bar"
                }
            ]
        }
    """
    
    sensors = SensorSerializer(many=True)
    
    def create(self, validated_data):
        """Cria múltiplos sensores em uma transação atômica."""
        from django.db import transaction
        
        device = self.context.get('device')
        if not device:
            raise serializers.ValidationError("Device não fornecido no contexto.")
        
        sensors_data = validated_data.get('sensors', [])
        
        # Usar transação atômica para garantir consistência
        with transaction.atomic():
            # Preparar lista de sensores para bulk_create
            sensors_to_create = []
            for sensor_data in sensors_data:
                sensor_data['device'] = device
                sensors_to_create.append(Sensor(**sensor_data))
            
            # Criar todos de uma vez (reduz round-trips ao banco)
            sensors = Sensor.objects.bulk_create(sensors_to_create)
        
        return sensors


class SensorVariableSerializer(serializers.Serializer):
    """
    Serializer para representar uma variável/sensor individual dentro de um device.
    
    Usado no DeviceSummarySerializer para listar todas as variáveis medidas.
    """
    id = serializers.IntegerField(read_only=True)
    tag = serializers.CharField(read_only=True)
    name = serializers.SerializerMethodField()
    metric_type = serializers.CharField(read_only=True)
    unit = serializers.CharField(read_only=True)
    last_value = serializers.FloatField(read_only=True)
    last_reading_at = serializers.DateTimeField(read_only=True)
    is_online = serializers.BooleanField(read_only=True)
    
    def get_name(self, obj):
        """
        Extrai nome legível da variável do tag.
        Remove o prefixo do MAC address para exibição limpa.
        
        Exemplos:
            F80332010002C857_Temperatura de retorno -> Temperatura de retorno
            F80332010002C857_rssi -> RSSI
            F80332010002C857_snr -> SNR
        """
        tag = obj.tag
        
        # Se o tag contém underscore, pegar a parte depois do MAC
        if '_' in tag:
            parts = tag.split('_', 1)
            if len(parts) > 1:
                name = parts[1]
                
                # Capitalizar siglas conhecidas
                if name.lower() == 'rssi':
                    return 'RSSI'
                elif name.lower() == 'snr':
                    return 'SNR'
                
                # Capitalizar primeira letra de cada palavra
                return name.title() if name.islower() else name
        
        # Fallback: retorna o tag completo
        return tag


class DeviceSummarySerializer(serializers.ModelSerializer):
    """
    Serializer para resumo de Device com todas as suas variáveis agrupadas.
    
    Este serializer é otimizado para exibição em UI onde queremos mostrar
    um device com todas as suas variáveis/sensores de forma agrupada.
    
    Campos adicionais:
        - variables: Lista de todas as variáveis/sensores deste device
        - online_variables_count: Número de variáveis online
        - total_variables_count: Número total de variáveis
        - device_status: Status geral do device baseado nas variáveis
        - asset_info: Informações do asset vinculado
    
    Exemplo de resposta:
        {
            "id": 8,
            "name": "Gateway Khomp",
            "mqtt_client_id": "F80332010002C857",
            "device_type": "GATEWAY",
            "status": "ONLINE",
            "last_seen": "2025-11-06T01:32:00Z",
            "asset_info": {
                "id": 7,
                "tag": "CHILLER-001",
                "name": "Chiller Principal"
            },
            "variables": [
                {
                    "id": 20,
                    "name": "Humidade Ambiente",
                    "metric_type": "humidity",
                    "unit": "percent_rh",
                    "last_value": 52.90,
                    "last_reading_at": "2025-11-06T01:32:00Z",
                    "is_online": true
                },
                ...
            ],
            "total_variables_count": 5,
            "online_variables_count": 5,
            "device_status": "ONLINE"
        }
    """
    
    variables = serializers.SerializerMethodField()
    display_name = serializers.SerializerMethodField()  # Nome curto do device
    total_variables_count = serializers.SerializerMethodField()
    online_variables_count = serializers.SerializerMethodField()
    device_status = serializers.SerializerMethodField()
    asset_info = serializers.SerializerMethodField()
    
    class Meta:
        model = Device
        fields = [
            'id',
            'name',
            'display_name',  # Nome curto para exibição (sufixo)
            'serial_number',
            'mqtt_client_id',
            'device_type',
            'status',
            'firmware_version',
            'last_seen',
            'asset_info',
            'variables',
            'total_variables_count',
            'online_variables_count',
            'device_status',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'asset_info',
            'variables',
            'total_variables_count',
            'online_variables_count',
            'device_status',
            'created_at',
            'updated_at'
        ]
    
    def get_variables(self, obj):
        """
        Retorna todas as variáveis/sensores deste device.
        Ordena por tipo de métrica para agrupamento lógico.
        """
        sensors = obj.sensors.all().order_by('metric_type', 'tag')
        return SensorVariableSerializer(sensors, many=True).data
    
    def get_display_name(self, obj):
        """
        Retorna nome curto do device usando apenas sufixo do serial number.
        
        Exemplos:
            F80332010002C857 -> Device C857
            F8033208000308B2 -> Device 08B2
        
        Regra: Últimos 4 caracteres do serial_number
        """
        if obj.serial_number and len(obj.serial_number) > 4:
            return f"Device {obj.serial_number[-4:]}"
        return obj.name or obj.serial_number
    
    def get_total_variables_count(self, obj):
        """Retorna o número total de variáveis/sensores."""
        return obj.sensors.count()
    
    def get_online_variables_count(self, obj):
        """Retorna o número de variáveis online (com leitura recente)."""
        return obj.sensors.filter(is_online=True).count()
    
    def get_device_status(self, obj):
        """
        Determina o status geral do device baseado nas variáveis.
        
        Lógica:
            - ONLINE: Se alguma variável estiver online
            - OFFLINE: Se nenhuma variável estiver online
            - Retorna o status do próprio device como fallback
        """
        online_count = self.get_online_variables_count(obj)
        
        if online_count > 0:
            return 'ONLINE'
        elif obj.sensors.count() > 0:
            return 'OFFLINE'
        
        return obj.status
    
    def get_asset_info(self, obj):
        """
        Retorna informações resumidas do asset vinculado.
        """
        if obj.asset:
            return {
                'id': obj.asset.id,
                'tag': obj.asset.tag,
                'name': obj.asset.name,
                'site_name': obj.asset.site.name if obj.asset.site else None,
            }
        return None
