"""
Models para o Catálogo de Ativos do TrakSense.

Hierarquia:
    Site → Asset → Device → Sensor → TelemetryReading
    
Mapeamento com frontend (traksense-hvac-monit):
    - Site ≈ company/sector/subsector
    - Asset ≈ HVACAsset
    - Device ≈ iotDeviceId
    - Sensor ≈ Sensor (sensor channels)
    
Note: Tenant isolation é automático via django-tenants (PostgreSQL schemas).
      Todos os models herdam de models.Model e são isolados por schema.
"""

from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator


class Site(models.Model):
    """
    Site/Localização física onde os equipamentos estão instalados.
    
    Representa a hierarquia organizacional de onde os ativos estão instalados.
    Exemplo:
        - Hospital Central - Unidade Brasília
        - Shopping Center Norte
        - Data Center São Paulo
    
    Campos principais:
        - name: Nome do site (ex: "Hospital Central")
        - company/sector/subsector: Hierarquia organizacional do frontend
        - timezone: Fuso horário local para timestamps
        - coordinates: Latitude/longitude para mapas
    """
    
    # Identificação
    name = models.CharField(
        'Nome do Site',
        max_length=200,
        help_text='Nome do local físico onde os ativos estão instalados'
    )
    
    # Endereço
    address = models.TextField(
        'Endereço',
        blank=True,
        help_text='Endereço completo do site'
    )
    
    # Coordenadas geográficas (para mapas)
    latitude = models.DecimalField(
        'Latitude',
        max_digits=9,
        decimal_places=6,
        null=True,
        blank=True,
        help_text='Coordenada geográfica (ex: -15.793889)'
    )
    longitude = models.DecimalField(
        'Longitude',
        max_digits=9,
        decimal_places=6,
        null=True,
        blank=True,
        help_text='Coordenada geográfica (ex: -47.882778)'
    )
    
    # Fuso horário
    timezone = models.CharField(
        'Fuso Horário',
        max_length=50,
        default='America/Sao_Paulo',
        help_text='IANA timezone (ex: America/Sao_Paulo, America/New_York)'
    )
    
    # Hierarquia organizacional (mapeamento do frontend)
    company = models.CharField(
        'Empresa',
        max_length=200,
        blank=True,
        help_text='Nome da empresa/organização (ex: TrakSense Healthcare)'
    )
    sector = models.CharField(
        'Setor',
        max_length=200,
        blank=True,
        help_text='Setor dentro da empresa (ex: Climatização, Centro Cirúrgico)'
    )
    subsector = models.CharField(
        'Subsetor',
        max_length=200,
        blank=True,
        help_text='Subsetor específico (ex: Chillers, Sala 01)'
    )
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField('Ativo', default=True)
    
    class Meta:
        db_table = 'sites'
        ordering = ['name']
        verbose_name = 'Site'
        verbose_name_plural = 'Sites'
        indexes = [
            models.Index(fields=['name']),
            models.Index(fields=['company', 'sector']),
            models.Index(fields=['is_active']),
        ]
    
    def __str__(self):
        return self.name
    
    @property
    def full_name(self):
        """Retorna nome completo com hierarquia organizacional"""
        parts = [self.name]
        if self.company:
            parts.append(self.company)
        if self.sector:
            parts.append(self.sector)
        return ' - '.join(parts)


class Asset(models.Model):
    """
    Asset/Equipamento HVAC (Chiller, AHU, VRF, etc.).
    
    Representa um equipamento físico HVAC instalado em um Site.
    Mapeamento direto com interface HVACAsset do frontend.
    
    Campos principais:
        - tag: Identificador único (ex: "AHU-001", "CH-002")
        - asset_type: Tipo de equipamento (15 opções + OTHER)
        - site: Localização do equipamento
        - specifications: JSON com specs técnicas (capacity, voltage, etc.)
        - status: Estado operacional (OK, Maintenance, Stopped, Alert)
    """
    
    # Choices para tipo de equipamento (mapeado do frontend EquipmentType)
    ASSET_TYPE_CHOICES = [
        ('CHILLER', 'Chiller'),
        ('AHU', 'Air Handling Unit (Unidade de Tratamento de Ar)'),
        ('FAN_COIL', 'Fan Coil'),
        ('PUMP', 'Bomba'),
        ('BOILER', 'Caldeira'),
        ('COOLING_TOWER', 'Torre de Resfriamento'),
        ('VRF', 'VRF (Variable Refrigerant Flow)'),
        ('RTU', 'Roof Top Unit'),
        ('VALVE', 'Válvula'),
        ('SENSOR', 'Sensor'),
        ('CONTROLLER', 'Controlador'),
        ('FILTER', 'Filtro'),
        ('DUCT', 'Duto'),
        ('METER', 'Medidor'),
        ('OTHER', 'Outro'),
    ]
    
    # Choices para status (mapeado do frontend)
    STATUS_CHOICES = [
        ('OK', 'Operacional'),
        ('MAINTENANCE', 'Em Manutenção'),
        ('STOPPED', 'Parado'),
        ('ALERT', 'Alerta'),
    ]
    
    # Identificação
    tag = models.CharField(
        'Tag',
        max_length=100,
        unique=True,
        db_index=True,
        help_text='Identificador único do equipamento (ex: AHU-001, CH-001)'
    )
    name = models.CharField(
        'Nome',
        max_length=200,
        blank=True,
        help_text='Nome descritivo do equipamento (ex: "Chiller Principal Torre A")'
    )
    
    # Relacionamento com Site
    site = models.ForeignKey(
        Site,
        on_delete=models.PROTECT,
        related_name='assets',
        verbose_name='Site',
        help_text='Site onde o equipamento está instalado'
    )
    
    # Relacionamento opcional com Setor e Subseção (hierarquia de localização)
    sector = models.ForeignKey(
        'locations.Sector',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assets',
        verbose_name='Setor',
        help_text='Setor onde o equipamento está instalado (opcional)'
    )
    subsection = models.ForeignKey(
        'locations.Subsection',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assets',
        verbose_name='Subseção',
        help_text='Subseção onde o equipamento está instalado (opcional)'
    )
    
    # Tipo de equipamento
    asset_type = models.CharField(
        'Tipo de Equipamento',
        max_length=20,
        choices=ASSET_TYPE_CHOICES,
        db_index=True,
        help_text='Categoria do equipamento HVAC'
    )
    asset_type_other = models.CharField(
        'Outro Tipo (texto livre)',
        max_length=200,
        blank=True,
        help_text='Especificar quando asset_type = OTHER'
    )
    
    # Fabricante e modelo
    manufacturer = models.CharField(
        'Fabricante',
        max_length=200,
        blank=True,
        help_text='Marca do equipamento (ex: Carrier, Trane, York)'
    )
    model = models.CharField(
        'Modelo',
        max_length=200,
        blank=True,
        help_text='Modelo do equipamento (ex: 30XA-1002)'
    )
    serial_number = models.CharField(
        'Número de Série',
        max_length=200,
        blank=True,
        help_text='Serial number do equipamento'
    )
    
    # Status operacional
    status = models.CharField(
        'Status',
        max_length=20,
        choices=STATUS_CHOICES,
        default='OK',
        db_index=True,
        help_text='Estado operacional atual do equipamento'
    )
    health_score = models.IntegerField(
        'Health Score',
        default=100,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        help_text='Pontuação de saúde do equipamento (0-100)'
    )
    
    # Localização dentro do site
    location_description = models.CharField(
        'Descrição da Localização',
        max_length=500,
        blank=True,
        help_text='Localização específica dentro do site (ex: "3º Andar - Ala Leste")'
    )
    
    # Especificações técnicas (JSON flexível)
    specifications = models.JSONField(
        'Especificações Técnicas',
        default=dict,
        blank=True,
        help_text='''JSON com especificações técnicas do equipamento:
        {
          "capacity": 500,
          "capacity_unit": "TR",
          "voltage": 380,
          "max_current": 100,
          "refrigerant": "R-410A",
          "power_consumption": 0,
          "operating_hours": 0,
          "brand": "Carrier",
          "model": "30XA-1002"
        }
        '''
    )
    
    # Datas importantes
    installation_date = models.DateField(
        'Data de Instalação',
        null=True,
        blank=True,
        help_text='Data de instalação do equipamento'
    )
    last_maintenance = models.DateTimeField(
        'Última Manutenção',
        null=True,
        blank=True,
        help_text='Data/hora da última manutenção realizada'
    )
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField('Ativo', default=True)
    
    class Meta:
        db_table = 'assets'
        ordering = ['tag']
        verbose_name = 'Asset'
        verbose_name_plural = 'Assets'
        indexes = [
            models.Index(fields=['tag']),
            models.Index(fields=['site', 'asset_type']),
            models.Index(fields=['status']),
            models.Index(fields=['is_active']),
            models.Index(fields=['created_at']),
        ]
    
    def __str__(self):
        return f"{self.tag} - {self.get_asset_type_display()}"
    
    @property
    def full_location(self):
        """
        Retorna localização completa do asset.
        Compatível com campo 'location' do frontend.
        
        Exemplo: "Hospital Central - 3º Andar - Ala Leste"
        """
        parts = [self.site.name]
        if self.location_description:
            parts.append(self.location_description)
        return ' - '.join(parts)
    
    def calculate_health_score(self):
        """
        Calcula health score baseado em telemetria e sensores.
        TODO: Implementar lógica na Fase 3 (Telemetria em Tempo Real)
        """
        # Placeholder - será implementado quando tivermos telemetria
        return self.health_score


class Device(models.Model):
    """
    Device/Dispositivo IoT físico conectado a um Asset.
    
    Representa o hardware IoT (controlador, medidor, gateway) que coleta
    dados do equipamento e comunica via MQTT.
    
    Relacionamento: Um Asset pode ter múltiplos Devices
        Exemplo: Um Chiller pode ter:
            - 1 Device "Controlador Principal" (mqtt_client_id: iot-chiller-001)
            - 1 Device "Medidor de Energia" (mqtt_client_id: iot-meter-001)
    
    Campos principais:
        - mqtt_client_id: ID único para conexão MQTT/EMQX
        - asset: Equipamento ao qual o device está conectado
        - status: Estado da conexão (ONLINE, OFFLINE, ERROR)
        - last_seen: Último heartbeat recebido
    """
    
    # Choices para tipo de device
    DEVICE_TYPE_CHOICES = [
        ('CONTROLLER', 'Controlador Principal'),
        ('ENERGY_METER', 'Medidor de Energia'),
        ('SENSOR_HUB', 'Hub de Sensores'),
        ('GATEWAY', 'Gateway IoT'),
        ('OTHER', 'Outro'),
    ]
    
    # Choices para status de conectividade
    STATUS_CHOICES = [
        ('ONLINE', 'Online'),
        ('OFFLINE', 'Offline'),
        ('ERROR', 'Erro'),
        ('MAINTENANCE', 'Manutenção'),
    ]
    
    # Identificação
    name = models.CharField(
        'Nome',
        max_length=200,
        help_text='Nome descritivo do device (ex: "Controlador Chiller CH-001")'
    )
    serial_number = models.CharField(
        'Número de Série',
        max_length=200,
        unique=True,
        db_index=True,
        help_text='Serial number único do hardware'
    )
    
    # Relacionamento com Asset
    asset = models.ForeignKey(
        Asset,
        on_delete=models.CASCADE,
        related_name='devices',
        verbose_name='Asset',
        help_text='Equipamento ao qual este device está conectado'
    )
    
    # Conectividade MQTT/EMQX
    mqtt_client_id = models.CharField(
        'Client ID MQTT',
        max_length=200,
        unique=True,
        db_index=True,
        help_text='Client ID único para autenticação no EMQX (ex: iot-chiller-001)'
    )
    
    # Tipo de device
    device_type = models.CharField(
        'Tipo de Dispositivo',
        max_length=20,
        choices=DEVICE_TYPE_CHOICES,
        default='CONTROLLER',
        help_text='Categoria do dispositivo IoT'
    )
    
    # Informações técnicas
    firmware_version = models.CharField(
        'Versão do Firmware',
        max_length=50,
        blank=True,
        help_text='Versão do software embarcado (ex: v2.1.3)'
    )
    
    # Status de conectividade
    status = models.CharField(
        'Status',
        max_length=20,
        choices=STATUS_CHOICES,
        default='OFFLINE',
        db_index=True,
        help_text='Estado atual da conexão MQTT'
    )
    last_seen = models.DateTimeField(
        'Última Conexão',
        null=True,
        blank=True,
        db_index=True,
        help_text='Timestamp do último heartbeat/mensagem recebida'
    )
    
    # Disponibilidade (%)
    availability = models.FloatField(
        'Disponibilidade (%)',
        default=0.0,
        validators=[MinValueValidator(0.0), MaxValueValidator(100.0)],
        help_text='Porcentagem de uptime nas últimas 24h'
    )
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField('Ativo', default=True)
    
    class Meta:
        db_table = 'devices'
        ordering = ['name']
        verbose_name = 'Device'
        verbose_name_plural = 'Devices'
        indexes = [
            models.Index(fields=['mqtt_client_id']),
            models.Index(fields=['serial_number']),
            models.Index(fields=['asset', 'status']),
            models.Index(fields=['status', 'last_seen']),
            models.Index(fields=['is_active']),
        ]
    
    def __str__(self):
        return f"{self.name} ({self.mqtt_client_id})"
    
    def update_status(self, new_status, timestamp=None):
        """
        Atualiza status do device.
        Usado pelos handlers EMQX (connect/disconnect).
        """
        from django.utils import timezone
        
        self.status = new_status
        if new_status == 'ONLINE':
            self.last_seen = timestamp or timezone.now()
        self.save(update_fields=['status', 'last_seen', 'updated_at'])


class Sensor(models.Model):
    """
    Sensor/Canal de telemetria de um Device.
    
    Representa um canal de medição específico (temperatura, pressão, potência, etc.)
    de um dispositivo IoT. Um Device pode ter múltiplos Sensors.
    
    Relacionamento: Device → Sensor → TelemetryReading
        Exemplo: Device "iot-chiller-001" tem sensores:
            - "CH-001-TEMP-SUPPLY" (temp_supply)
            - "CH-001-TEMP-RETURN" (temp_return)
            - "CH-001-POWER-KW" (power_kw)
    
    Campos principais:
        - tag: Identificador do sensor (ex: "AHU-001-TEMP-SUPPLY")
        - metric_type: Tipo de medição (30+ opções)
        - thresholds: JSON com limites (min, max, setpoint, warnings)
        - last_value: Cache da última leitura (performance)
    """
    
    # Choices para tipos de sensores (mapeado do frontend SensorType)
    SENSOR_TYPE_CHOICES = [
        # Temperatura
        ('temp_supply', 'Temperatura de Suprimento'),
        ('temp_return', 'Temperatura de Retorno'),
        ('temp_external', 'Temperatura Externa'),
        ('temp_setpoint', 'Setpoint de Temperatura'),
        
        # Umidade
        ('humidity', 'Umidade Relativa'),
        ('dewpoint', 'Ponto de Orvalho'),
        
        # Pressão
        ('pressure_suction', 'Pressão de Sucção'),
        ('pressure_discharge', 'Pressão de Descarga'),
        ('dp_filter', 'Diferencial de Pressão - Filtro'),
        ('dp_fan', 'Diferencial de Pressão - Ventilador'),
        
        # Fluxo
        ('airflow', 'Vazão de Ar'),
        
        # Rotação
        ('rpm_fan', 'Rotação do Ventilador (RPM)'),
        
        # Elétrico
        ('voltage', 'Tensão (V)'),
        ('current', 'Corrente (A)'),
        ('power_kw', 'Potência Ativa (kW)'),
        ('energy_kwh', 'Energia Acumulada (kWh)'),
        ('power_factor', 'Fator de Potência'),
        
        # Refrigeração
        ('superheat', 'Superaquecimento'),
        ('subcooling', 'Sub-resfriamento'),
        
        # Vibração e ruído
        ('vibration', 'Vibração'),
        ('noise', 'Ruído (dB)'),
        
        # Estados e controle
        ('compressor_state', 'Estado do Compressor'),
        ('valve_position', 'Posição da Válvula (%)'),
        
        # Eficiência
        ('cop', 'Coeficiente de Performance (COP)'),
        ('eer', 'Energy Efficiency Ratio (EER)'),
        
        # Manutenção
        ('maintenance', 'Status de Manutenção'),
        ('maintenance_reminder', 'Lembrete de Manutenção'),
    ]
    
    # Identificação
    tag = models.CharField(
        'Tag',
        max_length=200,
        db_index=True,
        help_text='Identificador do sensor (ex: AHU-001-TEMP-SUPPLY)'
    )
    
    # Relacionamento com Device
    device = models.ForeignKey(
        Device,
        on_delete=models.CASCADE,
        related_name='sensors',
        verbose_name='Device',
        help_text='Dispositivo IoT ao qual este sensor pertence'
    )
    
    # Tipo de métrica
    metric_type = models.CharField(
        'Tipo de Métrica',
        max_length=50,
        choices=SENSOR_TYPE_CHOICES,
        db_index=True,
        help_text='Tipo de medição que este sensor realiza'
    )
    
    # Unidade de medida
    unit = models.CharField(
        'Unidade',
        max_length=50,  # Aumentado de 20 para 50 para suportar unidades como "meters_per_second"
        help_text='Unidade de medida (ex: °C, kW, Pa, %, RPM, m/s2, meters_per_second)'
    )
    
    # Thresholds e limites (JSON)
    thresholds = models.JSONField(
        'Limites e Thresholds',
        default=dict,
        blank=True,
        help_text='''JSON com limites operacionais e alertas:
        {
          "min": 18.0,
          "max": 26.0,
          "setpoint": 22.0,
          "warning_low": 19.0,
          "warning_high": 25.0,
          "critical_low": 16.0,
          "critical_high": 28.0
        }
        '''
    )
    
    # Status de conectividade
    is_online = models.BooleanField(
        'Online',
        default=False,
        db_index=True,
        help_text='Indica se o sensor está ativo e enviando dados'
    )
    
    # Disponibilidade (%)
    availability = models.FloatField(
        'Disponibilidade (%)',
        default=0.0,
        validators=[MinValueValidator(0.0), MaxValueValidator(100.0)],
        help_text='Porcentagem de uptime nas últimas 24h'
    )
    
    # Cache da última leitura (performance)
    last_value = models.FloatField(
        'Última Leitura',
        null=True,
        blank=True,
        help_text='Valor da última medição (cache para performance)'
    )
    last_reading_at = models.DateTimeField(
        'Data da Última Leitura',
        null=True,
        blank=True,
        db_index=True,
        help_text='Timestamp da última medição recebida'
    )
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField('Ativo', default=True)
    
    class Meta:
        db_table = 'sensors'
        ordering = ['tag']
        verbose_name = 'Sensor'
        verbose_name_plural = 'Sensors'
        # Removido unique_together para permitir múltiplos sensores do mesmo tipo
        # (ex: Khomp pode ter múltiplos sensores de temperatura)
        # A unicidade é garantida pelo campo 'tag'
        indexes = [
            models.Index(fields=['tag']),
            models.Index(fields=['device', 'metric_type']),
            models.Index(fields=['metric_type']),
            models.Index(fields=['is_online']),
            models.Index(fields=['last_reading_at']),
            models.Index(fields=['is_active']),
        ]
    
    def __str__(self):
        return f"{self.tag} ({self.get_metric_type_display()})"
    
    @property
    def asset(self):
        """Atalho para acessar o Asset através do Device"""
        return self.device.asset
    
    def update_last_reading(self, value, timestamp=None):
        """
        Atualiza cache da última leitura.
        Chamado automaticamente por signal ao salvar TelemetryReading.
        """
        from django.utils import timezone
        
        self.last_value = value
        self.last_reading_at = timestamp or timezone.now()
        self.is_online = True
        self.save(update_fields=['last_value', 'last_reading_at', 'is_online', 'updated_at'])

