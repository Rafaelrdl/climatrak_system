"""
TrakService Serializers

Serializers for TrakService API endpoints.
"""

from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import DailyRoute, LocationPing, RouteStop, ServiceAssignment, TechnicianProfile

User = get_user_model()


# =============================================================================
# Meta & Health Serializers (existing)
# =============================================================================


class TrakServiceMetaSerializer(serializers.Serializer):
    """Serializer for TrakService module metadata."""

    module = serializers.CharField(read_only=True)
    version = serializers.CharField(read_only=True)
    features = serializers.DictField(read_only=True)
    status = serializers.CharField(read_only=True)


class TrakServiceHealthSerializer(serializers.Serializer):
    """Serializer for TrakService health check."""

    status = serializers.CharField(read_only=True)
    timestamp = serializers.DateTimeField(read_only=True)
    tenant_id = serializers.IntegerField(read_only=True)
    features_enabled = serializers.ListField(
        child=serializers.CharField(), read_only=True
    )


# =============================================================================
# Technician Profile Serializers
# =============================================================================


class TechnicianUserSerializer(serializers.ModelSerializer):
    """Nested serializer for User in TechnicianProfile."""
    
    full_name = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ["id", "email", "first_name", "last_name", "full_name"]
        read_only_fields = fields
    
    def get_full_name(self, obj):
        return obj.get_full_name() or obj.email


class TechnicianProfileSerializer(serializers.ModelSerializer):
    """Serializer for TechnicianProfile (read operations)."""
    
    user = TechnicianUserSerializer(read_only=True)
    full_name = serializers.CharField(read_only=True)
    
    class Meta:
        model = TechnicianProfile
        fields = [
            "id",
            "user",
            "full_name",
            "phone",
            "skills",
            "work_start_time",
            "work_end_time",
            "is_active",
            "allow_tracking",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class TechnicianProfileCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating TechnicianProfile."""
    
    user_id = serializers.IntegerField(write_only=True)
    
    class Meta:
        model = TechnicianProfile
        fields = [
            "user_id",
            "phone",
            "skills",
            "work_start_time",
            "work_end_time",
            "is_active",
            "allow_tracking",
        ]
    
    def validate_user_id(self, value):
        """Ensure user exists and doesn't already have a profile."""
        try:
            user = User.objects.get(id=value)
        except User.DoesNotExist:
            raise serializers.ValidationError("Usuário não encontrado.")
        
        # Check if profile already exists (for create)
        if self.instance is None:
            if TechnicianProfile.objects.filter(user=user).exists():
                raise serializers.ValidationError(
                    "Este usuário já possui um perfil de técnico."
                )
        return value
    
    def create(self, validated_data):
        user_id = validated_data.pop("user_id")
        user = User.objects.get(id=user_id)
        return TechnicianProfile.objects.create(user=user, **validated_data)


class TechnicianProfileListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for technician lists/dropdowns."""
    
    full_name = serializers.CharField(read_only=True)
    email = serializers.CharField(source="user.email", read_only=True)
    
    class Meta:
        model = TechnicianProfile
        fields = ["id", "full_name", "email", "is_active"]


# =============================================================================
# Service Assignment Serializers
# =============================================================================


class ServiceAssignmentSerializer(serializers.ModelSerializer):
    """Serializer for ServiceAssignment (read operations)."""
    
    technician = TechnicianProfileListSerializer(read_only=True)
    work_order_number = serializers.CharField(
        source="work_order.number", read_only=True
    )
    work_order_description = serializers.CharField(
        source="work_order.description", read_only=True
    )
    work_order_priority = serializers.CharField(
        source="work_order.priority", read_only=True
    )
    work_order_status = serializers.CharField(
        source="work_order.status", read_only=True
    )
    asset_name = serializers.CharField(
        source="work_order.asset.name", read_only=True
    )
    asset_location = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()
    status_display = serializers.CharField(
        source="get_status_display", read_only=True
    )
    
    class Meta:
        model = ServiceAssignment
        fields = [
            "id",
            "work_order",
            "work_order_number",
            "work_order_description",
            "work_order_priority",
            "work_order_status",
            "asset_name",
            "asset_location",
            "technician",
            "scheduled_date",
            "scheduled_start",
            "scheduled_end",
            "status",
            "status_display",
            "departed_at",
            "arrived_at",
            "completed_at",
            "canceled_at",
            "notes",
            "cancellation_reason",
            "created_by",
            "created_by_name",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "departed_at",
            "arrived_at",
            "completed_at",
            "canceled_at",
            "created_at",
            "updated_at",
        ]
    
    def get_asset_location(self, obj):
        """Get asset location name if available."""
        asset = obj.work_order.asset
        if hasattr(asset, "location") and asset.location:
            return asset.location.name
        return None
    
    def get_created_by_name(self, obj):
        """Get name of user who created the assignment."""
        if obj.created_by:
            return obj.created_by.get_full_name() or obj.created_by.email
        return None


class ServiceAssignmentCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating ServiceAssignment."""
    
    class Meta:
        model = ServiceAssignment
        fields = [
            "work_order",
            "technician",
            "scheduled_date",
            "scheduled_start",
            "scheduled_end",
            "notes",
        ]
    
    def validate_work_order(self, value):
        """Validate work order exists and is not completed/cancelled."""
        if value.status in ["COMPLETED", "CANCELLED"]:
            raise serializers.ValidationError(
                "Não é possível atribuir uma OS já concluída ou cancelada."
            )
        return value
    
    def validate_technician(self, value):
        """Validate technician is active."""
        if not value.is_active:
            raise serializers.ValidationError(
                "Este técnico não está ativo."
            )
        return value
    
    def validate(self, data):
        """Cross-field validation."""
        scheduled_start = data.get("scheduled_start")
        scheduled_end = data.get("scheduled_end")
        
        if scheduled_start and scheduled_end:
            if scheduled_end <= scheduled_start:
                raise serializers.ValidationError({
                    "scheduled_end": "Horário de término deve ser após o início."
                })
        
        return data
    
    def create(self, validated_data):
        # Set created_by from request context
        request = self.context.get("request")
        if request and request.user:
            validated_data["created_by"] = request.user
        return super().create(validated_data)


class ServiceAssignmentUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating ServiceAssignment."""
    
    class Meta:
        model = ServiceAssignment
        fields = [
            "technician",
            "scheduled_date",
            "scheduled_start",
            "scheduled_end",
            "notes",
        ]
    
    def validate_technician(self, value):
        """Validate technician is active."""
        if not value.is_active:
            raise serializers.ValidationError(
                "Este técnico não está ativo."
            )
        return value


class ServiceAssignmentStatusSerializer(serializers.Serializer):
    """Serializer for status change actions."""
    
    status = serializers.ChoiceField(
        choices=ServiceAssignment.Status.choices,
        required=True,
    )
    reason = serializers.CharField(
        required=False,
        allow_blank=True,
        help_text="Motivo (obrigatório para cancelamento)",
    )
    
    def validate(self, data):
        status = data.get("status")
        reason = data.get("reason", "")
        
        if status == ServiceAssignment.Status.CANCELED and not reason:
            raise serializers.ValidationError({
                "reason": "Motivo é obrigatório para cancelamento."
            })
        
        return data


# =============================================================================
# Location Tracking Serializers
# =============================================================================


class LocationPingSerializer(serializers.ModelSerializer):
    """Serializer for reading LocationPing data."""
    
    technician_id = serializers.UUIDField(source="technician.id", read_only=True)
    technician_name = serializers.CharField(source="technician.full_name", read_only=True)
    source_display = serializers.CharField(source="get_source_display", read_only=True)
    
    class Meta:
        model = LocationPing
        fields = [
            "id",
            "technician_id",
            "technician_name",
            "latitude",
            "longitude",
            "accuracy",
            "altitude",
            "speed",
            "heading",
            "source",
            "source_display",
            "device_id",
            "recorded_at",
            "created_at",
            "assignment",
        ]
        read_only_fields = ["id", "created_at"]


class LocationPingCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating LocationPing from mobile device.
    
    Used by POST /api/trakservice/location/pings
    The technician is inferred from the authenticated user.
    """
    
    class Meta:
        model = LocationPing
        fields = [
            "latitude",
            "longitude",
            "accuracy",
            "altitude",
            "speed",
            "heading",
            "source",
            "device_id",
            "recorded_at",
            "assignment",
        ]
    
    def validate_latitude(self, value):
        """Validate latitude is within valid range."""
        if value < -90 or value > 90:
            raise serializers.ValidationError(
                "Latitude deve estar entre -90 e 90 graus."
            )
        return value
    
    def validate_longitude(self, value):
        """Validate longitude is within valid range."""
        if value < -180 or value > 180:
            raise serializers.ValidationError(
                "Longitude deve estar entre -180 e 180 graus."
            )
        return value
    
    def validate(self, data):
        """Cross-field validation and privacy checks."""
        request = self.context.get("request")
        if not request or not request.user:
            raise serializers.ValidationError("Usuário não autenticado.")
        
        # Get technician profile for the user
        try:
            technician = TechnicianProfile.objects.get(user=request.user)
        except TechnicianProfile.DoesNotExist:
            raise serializers.ValidationError(
                "Usuário não possui perfil de técnico."
            )
        
        # Check allow_tracking preference
        if not technician.allow_tracking:
            raise serializers.ValidationError(
                "Rastreamento não permitido. Verifique suas preferências."
            )
        
        # Check work window (privacy)
        # Compare in UTC to avoid timezone issues
        from datetime import timezone as dt_timezone
        from django.utils import timezone
        recorded_at = data.get("recorded_at", timezone.now())
        
        # Convert to UTC if timezone-aware, then extract time
        if timezone.is_aware(recorded_at):
            recorded_at_utc = recorded_at.astimezone(dt_timezone.utc)
        else:
            recorded_at_utc = recorded_at
        recorded_time = recorded_at_utc.time()
        
        if not (technician.work_start_time <= recorded_time <= technician.work_end_time):
            raise serializers.ValidationError(
                "Rastreamento fora da janela de trabalho não é permitido."
            )
        
        # Store technician for create
        data["_technician"] = technician
        return data
    
    def create(self, validated_data):
        """Create LocationPing with technician from context."""
        technician = validated_data.pop("_technician")
        return LocationPing.objects.create(technician=technician, **validated_data)


class LatestLocationSerializer(serializers.Serializer):
    """
    Serializer for technician's latest location.
    
    Used by GET /api/trakservice/technicians/{id}/location/latest
    """
    
    technician_id = serializers.UUIDField()
    technician_name = serializers.CharField()
    latitude = serializers.DecimalField(max_digits=10, decimal_places=7)
    longitude = serializers.DecimalField(max_digits=10, decimal_places=7)
    accuracy = serializers.FloatField(allow_null=True)
    source = serializers.CharField()
    recorded_at = serializers.DateTimeField()
    is_stale = serializers.BooleanField(help_text="True if location is older than 5 minutes")
    minutes_ago = serializers.IntegerField(help_text="Minutes since last ping")


class LocationTrailSerializer(serializers.Serializer):
    """
    Serializer for location trail response.
    
    Used by GET /api/trakservice/technicians/{id}/location?from=...&to=...
    """
    
    technician_id = serializers.UUIDField()
    technician_name = serializers.CharField()
    from_date = serializers.DateTimeField()
    to_date = serializers.DateTimeField()
    total_pings = serializers.IntegerField()
    pings = LocationPingSerializer(many=True)


# =============================================================================
# Routing & KM Serializers
# =============================================================================


class RouteStopSerializer(serializers.ModelSerializer):
    """Serializer for reading RouteStop data."""
    
    assignment_id = serializers.UUIDField(source="assignment.id", read_only=True, allow_null=True)
    work_order_number = serializers.CharField(
        source="assignment.work_order.number",
        read_only=True,
        allow_null=True,
    )
    
    class Meta:
        model = RouteStop
        fields = [
            "id",
            "sequence",
            "assignment_id",
            "work_order_number",
            "latitude",
            "longitude",
            "address",
            "description",
            "estimated_arrival",
            "estimated_duration_minutes",
            "distance_from_previous_km",
            "actual_arrival",
            "actual_departure",
        ]
        read_only_fields = ["id"]


class DailyRouteSerializer(serializers.ModelSerializer):
    """Serializer for reading DailyRoute data."""
    
    technician_id = serializers.UUIDField(source="technician.id", read_only=True)
    technician_name = serializers.CharField(source="technician.full_name", read_only=True)
    stops = RouteStopSerializer(many=True, read_only=True)
    total_stops = serializers.IntegerField(read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    
    class Meta:
        model = DailyRoute
        fields = [
            "id",
            "technician_id",
            "technician_name",
            "route_date",
            "status",
            "status_display",
            "start_latitude",
            "start_longitude",
            "start_address",
            "estimated_km",
            "actual_km",
            "total_stops",
            "stops",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class DailyRouteListSerializer(serializers.ModelSerializer):
    """Serializer for listing DailyRoutes (without nested stops)."""
    
    technician_id = serializers.UUIDField(source="technician.id", read_only=True)
    technician_name = serializers.CharField(source="technician.full_name", read_only=True)
    total_stops = serializers.IntegerField(read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    
    class Meta:
        model = DailyRoute
        fields = [
            "id",
            "technician_id",
            "technician_name",
            "route_date",
            "status",
            "status_display",
            "estimated_km",
            "actual_km",
            "total_stops",
            "created_at",
        ]


class RouteGenerateSerializer(serializers.Serializer):
    """
    Serializer for route generation request.
    
    Used by POST /api/trakservice/routes/generate
    """
    
    technician_id = serializers.UUIDField(
        required=True,
        help_text="ID do técnico para gerar a rota",
    )
    route_date = serializers.DateField(
        required=True,
        help_text="Data da rota (YYYY-MM-DD)",
    )
    start_latitude = serializers.DecimalField(
        max_digits=10,
        decimal_places=7,
        required=False,
        allow_null=True,
        help_text="Latitude do ponto de partida",
    )
    start_longitude = serializers.DecimalField(
        max_digits=10,
        decimal_places=7,
        required=False,
        allow_null=True,
        help_text="Longitude do ponto de partida",
    )
    start_address = serializers.CharField(
        max_length=500,
        required=False,
        allow_blank=True,
        default="",
        help_text="Endereço do ponto de partida",
    )
    
    def validate_technician_id(self, value):
        """Validate technician exists and is active."""
        try:
            technician = TechnicianProfile.objects.get(id=value)
        except TechnicianProfile.DoesNotExist:
            raise serializers.ValidationError("Técnico não encontrado.")
        
        if not technician.is_active:
            raise serializers.ValidationError("Este técnico não está ativo.")
        
        return value
    
    def validate(self, data):
        """Cross-field validation."""
        # If start coordinates provided, both are required
        lat = data.get("start_latitude")
        lon = data.get("start_longitude")
        
        if (lat is not None and lon is None) or (lat is None and lon is not None):
            raise serializers.ValidationError({
                "start_latitude": "Latitude e longitude devem ser fornecidas juntas.",
                "start_longitude": "Latitude e longitude devem ser fornecidas juntas.",
            })
        
        return data


class NearestTechnicianSerializer(serializers.Serializer):
    """
    Serializer for nearest technician response.
    
    Used by GET /api/trakservice/routes/nearest-technician?lat=...&lon=...
    """
    
    technician_id = serializers.UUIDField()
    technician_name = serializers.CharField()
    latitude = serializers.FloatField()
    longitude = serializers.FloatField()
    distance_km = serializers.FloatField()
    last_updated = serializers.DateTimeField()


class NearestTechnicianRequestSerializer(serializers.Serializer):
    """Serializer for nearest technician request parameters."""
    
    latitude = serializers.FloatField(
        required=True,
        min_value=-90,
        max_value=90,
        help_text="Latitude do ponto de referência",
    )
    longitude = serializers.FloatField(
        required=True,
        min_value=-180,
        max_value=180,
        help_text="Longitude do ponto de referência",
    )
    max_distance_km = serializers.FloatField(
        required=False,
        min_value=0,
        allow_null=True,
        help_text="Distância máxima de busca (km)",
    )


class KMSummarySerializer(serializers.Serializer):
    """
    Serializer for KM summary response.
    
    Used by GET /api/trakservice/km?date=...&technician_id=...
    """
    
    technician_id = serializers.UUIDField()
    technician_name = serializers.CharField()
    date = serializers.DateField()
    km_estimated = serializers.FloatField(help_text="KM estimado da rota planejada")
    km_actual = serializers.FloatField(help_text="KM real calculado dos pings GPS")
    km_difference = serializers.FloatField(help_text="Diferença (real - estimado)")
    route_id = serializers.UUIDField(allow_null=True)
    route_status = serializers.CharField(allow_null=True)
    ping_count = serializers.IntegerField(help_text="Número de pings GPS usados no cálculo")


class KMSummaryRequestSerializer(serializers.Serializer):
    """Serializer for KM summary request parameters."""
    
    date = serializers.DateField(
        required=True,
        help_text="Data para calcular KM (YYYY-MM-DD)",
    )
    technician_id = serializers.UUIDField(
        required=True,
        help_text="ID do técnico",
    )
    
    def validate_technician_id(self, value):
        """Validate technician exists."""
        if not TechnicianProfile.objects.filter(id=value).exists():
            raise serializers.ValidationError("Técnico não encontrado.")
        return value


# =============================================================================
# Service Catalog Serializers
# =============================================================================


class ServiceCatalogItemSerializer(serializers.ModelSerializer):
    """Serializer for ServiceCatalogItem (read operations)."""
    
    calculated_price = serializers.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        read_only=True
    )
    created_by_name = serializers.SerializerMethodField()
    
    class Meta:
        from .models import ServiceCatalogItem
        model = ServiceCatalogItem
        fields = [
            "id",
            "code",
            "name",
            "description",
            "estimated_duration_minutes",
            "hourly_cost",
            "base_price",
            "margin_percent",
            "calculated_price",
            "category",
            "is_active",
            "created_by",
            "created_by_name",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "created_by"]
    
    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.get_full_name() or obj.created_by.email
        return None


class ServiceCatalogItemCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating ServiceCatalogItem."""
    
    class Meta:
        from .models import ServiceCatalogItem
        model = ServiceCatalogItem
        fields = [
            "code",
            "name",
            "description",
            "estimated_duration_minutes",
            "hourly_cost",
            "base_price",
            "margin_percent",
            "category",
            "is_active",
        ]
    
    def validate_code(self, value):
        """Ensure code is unique (case-insensitive)."""
        from .models import ServiceCatalogItem
        
        qs = ServiceCatalogItem.objects.filter(code__iexact=value)
        if self.instance:
            qs = qs.exclude(id=self.instance.id)
        
        if qs.exists():
            raise serializers.ValidationError("Já existe um item com este código.")
        return value.upper()


class ServiceCatalogItemListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for catalog item lists/dropdowns."""
    
    calculated_price = serializers.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        read_only=True
    )
    
    class Meta:
        from .models import ServiceCatalogItem
        model = ServiceCatalogItem
        fields = [
            "id",
            "code",
            "name",
            "category",
            "base_price",
            "calculated_price",
            "estimated_duration_minutes",
            "is_active",
        ]


# =============================================================================
# Quote Serializers
# =============================================================================


class QuoteItemSerializer(serializers.ModelSerializer):
    """Serializer for QuoteItem (read operations)."""
    
    item_type_display = serializers.CharField(source="get_item_type_display", read_only=True)
    catalog_item_name = serializers.CharField(
        source="catalog_item.name", 
        read_only=True,
        allow_null=True,
    )
    inventory_item_name = serializers.CharField(
        source="inventory_item.name",
        read_only=True,
        allow_null=True,
    )
    
    class Meta:
        from .models import QuoteItem
        model = QuoteItem
        fields = [
            "id",
            "item_type",
            "item_type_display",
            "catalog_item",
            "catalog_item_name",
            "inventory_item",
            "inventory_item_name",
            "code",
            "description",
            "quantity",
            "unit",
            "unit_price",
            "total_price",
            "notes",
            "sequence",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "total_price", "created_at", "updated_at"]


class QuoteItemCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating QuoteItem."""
    
    class Meta:
        from .models import QuoteItem
        model = QuoteItem
        fields = [
            "item_type",
            "catalog_item",
            "inventory_item",
            "code",
            "description",
            "quantity",
            "unit",
            "unit_price",
            "notes",
            "sequence",
        ]
    
    def validate(self, data):
        """Validate item references based on type."""
        from .models import QuoteItem
        
        item_type = data.get("item_type")
        catalog_item = data.get("catalog_item")
        inventory_item = data.get("inventory_item")
        
        if item_type == QuoteItem.ItemType.SERVICE:
            if inventory_item:
                raise serializers.ValidationError({
                    "inventory_item": "Itens de serviço não devem ter referência a estoque."
                })
        elif item_type == QuoteItem.ItemType.MATERIAL:
            if catalog_item:
                raise serializers.ValidationError({
                    "catalog_item": "Itens de material não devem ter referência a catálogo de serviços."
                })
        
        return data


class QuoteSerializer(serializers.ModelSerializer):
    """Serializer for Quote (read operations)."""
    
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    items = QuoteItemSerializer(many=True, read_only=True)
    item_count = serializers.IntegerField(read_only=True)
    is_expired = serializers.BooleanField(read_only=True)
    work_order_number = serializers.CharField(source="work_order.number", read_only=True)
    work_order_description = serializers.CharField(source="work_order.description", read_only=True)
    created_by_name = serializers.SerializerMethodField()
    approved_by_name = serializers.SerializerMethodField()
    
    class Meta:
        from .models import Quote
        model = Quote
        fields = [
            "id",
            "number",
            "work_order",
            "work_order_number",
            "work_order_description",
            "status",
            "status_display",
            "valid_until",
            "is_expired",
            "subtotal_services",
            "subtotal_materials",
            "discount_percent",
            "discount_amount",
            "total",
            "notes",
            "customer_notes",
            "sent_at",
            "approved_at",
            "rejected_at",
            "rejection_reason",
            "created_by",
            "created_by_name",
            "approved_by",
            "approved_by_name",
            "created_at",
            "updated_at",
            "items",
            "item_count",
        ]
        read_only_fields = [
            "id",
            "number",
            "subtotal_services",
            "subtotal_materials",
            "discount_amount",
            "total",
            "sent_at",
            "approved_at",
            "rejected_at",
            "created_at",
            "updated_at",
        ]
    
    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.get_full_name() or obj.created_by.email
        return None
    
    def get_approved_by_name(self, obj):
        if obj.approved_by:
            return obj.approved_by.get_full_name() or obj.approved_by.email
        return None


class QuoteListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for quote lists."""
    
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    work_order_number = serializers.CharField(source="work_order.number", read_only=True)
    item_count = serializers.IntegerField(read_only=True)
    is_expired = serializers.BooleanField(read_only=True)
    
    class Meta:
        from .models import Quote
        model = Quote
        fields = [
            "id",
            "number",
            "work_order",
            "work_order_number",
            "status",
            "status_display",
            "valid_until",
            "is_expired",
            "total",
            "item_count",
            "created_at",
        ]


class QuoteCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating a Quote."""
    
    items = QuoteItemCreateSerializer(many=True, required=False)
    
    class Meta:
        from .models import Quote
        model = Quote
        fields = [
            "work_order",
            "valid_until",
            "discount_percent",
            "notes",
            "customer_notes",
            "items",
        ]
    
    def validate_work_order(self, value):
        """Validate work order exists."""
        if not value:
            raise serializers.ValidationError("Ordem de serviço é obrigatória.")
        return value
    
    def create(self, validated_data):
        """Create quote with items."""
        from .models import Quote, QuoteItem
        
        items_data = validated_data.pop("items", [])
        
        # Create quote
        quote = Quote.objects.create(**validated_data)
        
        # Create items
        for idx, item_data in enumerate(items_data):
            item_data["sequence"] = item_data.get("sequence", idx + 1)
            QuoteItem.objects.create(quote=quote, **item_data)
        
        # Recalculate totals
        quote.recalculate_totals()
        
        return quote


class QuoteUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating a Quote (draft only)."""
    
    class Meta:
        from .models import Quote
        model = Quote
        fields = [
            "valid_until",
            "discount_percent",
            "notes",
            "customer_notes",
        ]
    
    def validate(self, data):
        """Only draft quotes can be updated."""
        from .models import Quote
        
        if self.instance and self.instance.status != Quote.Status.DRAFT:
            raise serializers.ValidationError(
                "Apenas orçamentos em rascunho podem ser editados."
            )
        return data


class QuoteSendSerializer(serializers.Serializer):
    """Serializer for sending a quote."""
    
    notify_customer = serializers.BooleanField(
        default=False,
        help_text="Se deve enviar notificação por email ao cliente",
    )


class QuoteApproveSerializer(serializers.Serializer):
    """Serializer for approving a quote."""
    
    notes = serializers.CharField(
        required=False,
        allow_blank=True,
        help_text="Notas opcionais sobre a aprovação",
    )


class QuoteRejectSerializer(serializers.Serializer):
    """Serializer for rejecting a quote."""
    
    reason = serializers.CharField(
        required=False,
        allow_blank=True,
        help_text="Motivo da rejeição",
    )
