"""
Serializers para CMMS - Gestão de Manutenção
"""

from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import (
    ChecklistCategory, ChecklistTemplate, WorkOrder, WorkOrderPhoto, 
    WorkOrderItem, Request, RequestItem, MaintenancePlan,
    ProcedureCategory, Procedure, ProcedureVersion
)

User = get_user_model()


# ============================================
# CHECKLIST SERIALIZERS
# ============================================

class ChecklistCategorySerializer(serializers.ModelSerializer):
    """Serializer para ChecklistCategory."""
    
    checklist_count = serializers.SerializerMethodField()
    
    class Meta:
        model = ChecklistCategory
        fields = [
            'id', 'name', 'description', 'color', 'icon',
            'is_active', 'checklist_count', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'checklist_count', 'created_at', 'updated_at']

    def get_checklist_count(self, obj):
        return obj.checklist_templates.filter(is_active=True).count()


class ChecklistTemplateListSerializer(serializers.ModelSerializer):
    """Serializer para listagem de ChecklistTemplate."""
    
    category_name = serializers.CharField(source='category.name', read_only=True, allow_null=True)
    category_color = serializers.CharField(source='category.color', read_only=True, allow_null=True)
    items_count = serializers.SerializerMethodField()
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True, allow_null=True)
    
    class Meta:
        model = ChecklistTemplate
        fields = [
            'id', 'name', 'description', 'category', 'category_name', 'category_color',
            'status', 'is_active', 'version', 'usage_count', 'estimated_time',
            'items_count', 'created_by', 'created_by_name', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'items_count', 'usage_count', 'created_by', 'created_by_name', 'created_at', 'updated_at']

    def get_items_count(self, obj):
        return len(obj.items) if obj.items else 0


class ChecklistTemplateDetailSerializer(serializers.ModelSerializer):
    """Serializer detalhado para ChecklistTemplate."""
    
    category_name = serializers.CharField(source='category.name', read_only=True, allow_null=True)
    category_color = serializers.CharField(source='category.color', read_only=True, allow_null=True)
    items_count = serializers.SerializerMethodField()
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True, allow_null=True)
    
    class Meta:
        model = ChecklistTemplate
        fields = [
            'id', 'name', 'description', 'category', 'category_name', 'category_color',
            'items', 'status', 'is_active', 'version', 'usage_count', 'estimated_time',
            'items_count', 'created_by', 'created_by_name', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'items_count', 'usage_count', 'created_by', 'created_by_name', 'created_at', 'updated_at']

    def get_items_count(self, obj):
        return len(obj.items) if obj.items else 0


class ChecklistTemplateCreateSerializer(serializers.ModelSerializer):
    """Serializer para criação de ChecklistTemplate."""
    
    class Meta:
        model = ChecklistTemplate
        fields = [
            'name', 'description', 'category', 'items', 
            'status', 'is_active', 'estimated_time'
        ]

    def create(self, validated_data):
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['created_by'] = request.user
        return super().create(validated_data)


class ChecklistTemplateUpdateSerializer(serializers.ModelSerializer):
    """Serializer para atualização de ChecklistTemplate."""
    
    class Meta:
        model = ChecklistTemplate
        fields = [
            'name', 'description', 'category', 'items', 
            'status', 'is_active', 'estimated_time'
        ]


class ChecklistTemplateSerializer(serializers.ModelSerializer):
    """Serializer legado para ChecklistTemplate (compatibilidade)."""
    
    class Meta:
        model = ChecklistTemplate
        fields = [
            'id', 'name', 'description', 'items', 
            'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


# ============================================
# WORK ORDER SERIALIZERS
# ============================================


class WorkOrderPhotoSerializer(serializers.ModelSerializer):
    """Serializer para WorkOrderPhoto."""
    
    uploaded_by_name = serializers.CharField(
        source='uploaded_by.get_full_name', 
        read_only=True
    )
    
    class Meta:
        model = WorkOrderPhoto
        fields = [
            'id', 'file', 'caption', 
            'uploaded_by', 'uploaded_by_name', 'uploaded_at'
        ]
        read_only_fields = ['id', 'uploaded_by', 'uploaded_by_name', 'uploaded_at']


class WorkOrderItemSerializer(serializers.ModelSerializer):
    """Serializer para WorkOrderItem."""
    
    item_name = serializers.CharField(
        source='inventory_item.name', 
        read_only=True
    )
    item_sku = serializers.CharField(
        source='inventory_item.sku', 
        read_only=True
    )
    unit = serializers.CharField(
        source='inventory_item.unit', 
        read_only=True
    )
    
    class Meta:
        model = WorkOrderItem
        fields = [
            'id', 'inventory_item', 'item_name', 
            'item_sku', 'quantity', 'unit'
        ]
        read_only_fields = ['id']


class WorkOrderListSerializer(serializers.ModelSerializer):
    """Serializer simplificado para listagem de OS."""
    
    asset_tag = serializers.CharField(source='asset.tag', read_only=True)
    asset_name = serializers.CharField(source='asset.name', read_only=True)
    site_name = serializers.CharField(source='asset.site.name', read_only=True)
    assigned_to_name = serializers.CharField(
        source='assigned_to.get_full_name', 
        read_only=True
    )
    is_overdue = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = WorkOrder
        fields = [
            'id', 'number', 'asset', 'asset_tag', 'asset_name', 
            'site_name', 'type', 'status', 'priority', 
            'description', 'scheduled_date', 'completed_at',
            'assigned_to', 'assigned_to_name', 'is_overdue',
            'created_at', 'updated_at'
        ]


class WorkOrderSerializer(serializers.ModelSerializer):
    """Serializer completo para WorkOrder."""
    
    asset_tag = serializers.CharField(source='asset.tag', read_only=True)
    asset_name = serializers.CharField(source='asset.name', read_only=True)
    site_name = serializers.CharField(source='asset.site.name', read_only=True)
    assigned_to_name = serializers.CharField(
        source='assigned_to.get_full_name', 
        read_only=True
    )
    created_by_name = serializers.CharField(
        source='created_by.get_full_name', 
        read_only=True
    )
    photos = WorkOrderPhotoSerializer(many=True, read_only=True)
    items = WorkOrderItemSerializer(many=True, read_only=True)
    is_overdue = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = WorkOrder
        fields = [
            'id', 'number', 'asset', 'asset_tag', 'asset_name', 'site_name',
            'type', 'status', 'priority', 'description', 'execution_description',
            'scheduled_date', 'started_at', 'completed_at',
            'assigned_to', 'assigned_to_name', 'created_by', 'created_by_name',
            'estimated_hours', 'actual_hours',
            'checklist_template', 'checklist_responses',
            'photos', 'items', 'is_overdue',
            'request', 'maintenance_plan', 'cancellation_reason',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'number', 'started_at',
            'created_by', 'is_overdue', 'created_at', 'updated_at'
        ]


class RequestItemSerializer(serializers.ModelSerializer):
    """Serializer para RequestItem."""
    
    item_name = serializers.CharField(
        source='inventory_item.name', 
        read_only=True
    )
    item_sku = serializers.CharField(
        source='inventory_item.sku', 
        read_only=True
    )
    unit = serializers.CharField(
        source='inventory_item.unit', 
        read_only=True
    )
    
    class Meta:
        model = RequestItem
        fields = [
            'id', 'inventory_item', 'item_name', 
            'item_sku', 'quantity', 'unit'
        ]
        read_only_fields = ['id']


class RequestListSerializer(serializers.ModelSerializer):
    """Serializer simplificado para listagem de Solicitações."""
    
    sector_name = serializers.CharField(source='sector.name', read_only=True, allow_null=True)
    subsection_name = serializers.CharField(source='subsection.name', read_only=True, allow_null=True)
    asset_tag = serializers.CharField(source='asset.tag', read_only=True, allow_null=True)
    asset_name = serializers.CharField(source='asset.name', read_only=True, allow_null=True)
    requester_name = serializers.CharField(
        source='requester.get_full_name', 
        read_only=True
    )
    work_order_number = serializers.SerializerMethodField()
    
    class Meta:
        model = Request
        fields = [
            'id', 'number', 'sector', 'sector_name',
            'subsection', 'subsection_name',
            'asset', 'asset_tag', 'asset_name',
            'requester', 'requester_name', 'status', 'note',
            'work_order_number', 'created_at', 'updated_at'
        ]

    def get_work_order_number(self, obj):
        if hasattr(obj, 'generated_work_order'):
            return obj.generated_work_order.number
        return None


class RequestSerializer(serializers.ModelSerializer):
    """Serializer completo para Request."""
    
    sector_name = serializers.CharField(source='sector.name', read_only=True, allow_null=True)
    subsection_name = serializers.CharField(source='subsection.name', read_only=True, allow_null=True)
    asset_tag = serializers.CharField(source='asset.tag', read_only=True, allow_null=True)
    asset_name = serializers.CharField(source='asset.name', read_only=True, allow_null=True)
    requester_name = serializers.CharField(
        source='requester.get_full_name', 
        read_only=True
    )
    items = RequestItemSerializer(many=True, read_only=True)
    work_order_id = serializers.SerializerMethodField()
    work_order_number = serializers.SerializerMethodField()
    
    class Meta:
        model = Request
        fields = [
            'id', 'number', 'sector', 'sector_name',
            'subsection', 'subsection_name',
            'asset', 'asset_tag', 'asset_name',
            'requester', 'requester_name', 'status', 'note',
            'items', 'status_history', 'rejection_reason',
            'work_order_id', 'work_order_number',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'number', 'requester', 'status_history',
            'created_at', 'updated_at'
        ]

    def get_work_order_id(self, obj):
        # Usa a relação reversa generated_work_order
        if hasattr(obj, 'generated_work_order'):
            return obj.generated_work_order.id
        return None

    def get_work_order_number(self, obj):
        if hasattr(obj, 'generated_work_order'):
            return obj.generated_work_order.number
        return None


class MaintenancePlanListSerializer(serializers.ModelSerializer):
    """Serializer simplificado para listagem de Planos."""
    
    asset_count = serializers.SerializerMethodField()
    checklist_template_name = serializers.CharField(
        source='checklist_template.name',
        read_only=True,
        allow_null=True
    )
    
    class Meta:
        model = MaintenancePlan
        fields = [
            'id', 'name', 'description', 'frequency', 'is_active',
            'asset_count', 'checklist_template_name',
            'next_execution', 'last_execution', 'auto_generate',
            'work_orders_generated', 'created_at', 'updated_at'
        ]
    
    def get_asset_count(self, obj):
        return obj.assets.count()


class MaintenancePlanSerializer(serializers.ModelSerializer):
    """Serializer completo para MaintenancePlan."""
    
    asset_tags = serializers.SerializerMethodField()
    asset_names = serializers.SerializerMethodField()
    checklist_template_name = serializers.CharField(
        source='checklist_template.name',
        read_only=True,
        allow_null=True
    )
    
    class Meta:
        model = MaintenancePlan
        fields = [
            'id', 'name', 'description', 'frequency', 'is_active',
            'auto_generate', 'assets', 'asset_tags', 'asset_names',
            'checklist_template', 'checklist_template_name',
            'next_execution', 'last_execution', 'work_orders_generated',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'work_orders_generated', 'created_at', 'updated_at'
        ]
    
    def get_asset_tags(self, obj):
        return list(obj.assets.values_list('tag', flat=True))
    
    def get_asset_names(self, obj):
        return list(obj.assets.values_list('name', flat=True))


class ConvertToWorkOrderSerializer(serializers.Serializer):
    """Serializer para conversão de Request em WorkOrder.
    
    Nota: O tipo é sempre REQUEST para solicitações convertidas (não editável).
    """
    
    priority = serializers.ChoiceField(choices=WorkOrder.Priority.choices)
    scheduled_date = serializers.DateField(required=False, allow_null=True)
    assigned_to = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        required=False,
        allow_null=True
    )
    description = serializers.CharField(required=False, allow_blank=True)


class WorkOrderStatsSerializer(serializers.Serializer):
    """Serializer para estatísticas de OS."""
    
    total = serializers.IntegerField()
    open = serializers.IntegerField()
    in_progress = serializers.IntegerField()
    completed = serializers.IntegerField()
    overdue = serializers.IntegerField()
    by_type = serializers.DictField()
    by_priority = serializers.DictField()


# ========================
# Serializers de Procedimentos
# ========================

class ProcedureCategorySerializer(serializers.ModelSerializer):
    """Serializer para ProcedureCategory."""
    
    procedures_count = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = ProcedureCategory
        fields = [
            'id', 'name', 'description', 'color', 
            'procedures_count', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class ProcedureVersionSerializer(serializers.ModelSerializer):
    """Serializer para ProcedureVersion."""
    
    created_by_name = serializers.CharField(
        source='created_by.get_full_name',
        read_only=True,
        allow_null=True
    )
    
    class Meta:
        model = ProcedureVersion
        fields = [
            'id', 'version_number', 'changelog',
            'file', 'file_type', 'created_by', 'created_by_name', 'created_at'
        ]
        read_only_fields = ['id', 'created_by', 'created_by_name', 'created_at']


class ProcedureListSerializer(serializers.ModelSerializer):
    """Serializer simplificado para listagem de Procedures."""
    
    category_name = serializers.CharField(source='category.name', read_only=True, allow_null=True)
    category_color = serializers.CharField(source='category.color', read_only=True, allow_null=True)
    created_by_name = serializers.CharField(
        source='created_by.get_full_name',
        read_only=True,
        allow_null=True
    )
    versions_count = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = Procedure
        fields = [
            'id', 'title', 'category', 'category_name', 'category_color',
            'status', 'file_type', 'file', 'version', 'versions_count',
            'is_active', 'view_count', 'tags',
            'created_by', 'created_by_name', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_by', 'created_by_name', 'created_at', 'updated_at']


class ProcedureDetailSerializer(serializers.ModelSerializer):
    """Serializer detalhado para Procedure com todas as versões."""
    
    category_name = serializers.CharField(source='category.name', read_only=True, allow_null=True)
    category_color = serializers.CharField(source='category.color', read_only=True, allow_null=True)
    created_by_name = serializers.CharField(
        source='created_by.get_full_name',
        read_only=True,
        allow_null=True
    )
    versions = ProcedureVersionSerializer(many=True, read_only=True)
    
    class Meta:
        model = Procedure
        fields = [
            'id', 'title', 'description', 'category', 'category_name', 
            'category_color', 'status', 'file_type', 'file',
            'version', 'versions', 'tags', 'view_count', 'is_active',
            'created_by', 'created_by_name', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_by', 'created_by_name', 'created_at', 'updated_at']


class ProcedureCreateSerializer(serializers.ModelSerializer):
    """Serializer para criação de Procedure."""
    
    class Meta:
        model = Procedure
        fields = [
            'title', 'description', 'category', 'status', 
            'file_type', 'file', 'tags'
        ]
    
    def validate(self, data):
        file = data.get('file')
        
        if not file:
            raise serializers.ValidationError({
                'file': 'Arquivo é obrigatório.'
            })
        
        return data


class ProcedureUpdateSerializer(serializers.ModelSerializer):
    """Serializer para atualização de Procedure."""
    
    create_version = serializers.BooleanField(default=False, write_only=True)
    version_changes = serializers.CharField(required=False, write_only=True, allow_blank=True)
    
    class Meta:
        model = Procedure
        fields = [
            'title', 'description', 'category', 'status',
            'file_type', 'file', 'tags', 'is_active',
            'create_version', 'version_changes'
        ]
    
    def update(self, instance, validated_data):
        create_version = validated_data.pop('create_version', False)
        version_changes = validated_data.pop('version_changes', '')
        
        # Se vai criar versão, salvar arquivo atual
        old_file = instance.file
        old_file_type = instance.file_type
        
        # Atualiza a procedure
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Cria nova versão se solicitado
        if create_version and old_file:
            ProcedureVersion.objects.create(
                procedure=instance,
                version_number=instance.version,
                file=old_file,
                file_type=old_file_type,
                changelog=version_changes or 'Atualização do procedimento',
                created_by=self.context['request'].user
            )
            # Incrementa versão do procedimento
            instance.version += 1
            instance.save(update_fields=['version'])
        
        return instance


class ProcedureApproveSerializer(serializers.Serializer):
    """Serializer para aprovação de Procedure."""
    
    approved = serializers.BooleanField()
    rejection_reason = serializers.CharField(required=False, allow_blank=True)

