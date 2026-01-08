"""
TrakService Serializers

Serializers for TrakService API endpoints.
"""

from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import ServiceAssignment, TechnicianProfile

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
