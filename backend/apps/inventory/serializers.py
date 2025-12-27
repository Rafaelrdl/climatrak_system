"""
Serializers para Inventory
"""

from rest_framework import serializers
from decimal import Decimal

from .models import (
    InventoryCategory, InventoryItem, InventoryMovement,
    InventoryCount, InventoryCountItem
)


class InventoryCategorySerializer(serializers.ModelSerializer):
    """Serializer completo para categorias."""
    
    parent_name = serializers.CharField(source='parent.name', read_only=True)
    full_path = serializers.CharField(read_only=True)
    item_count = serializers.IntegerField(read_only=True)
    children = serializers.SerializerMethodField()
    
    class Meta:
        model = InventoryCategory
        fields = [
            'id', 'name', 'code', 'description',
            'parent', 'parent_name', 'full_path',
            'icon', 'color', 'is_active',
            'item_count', 'children',
            'created_at', 'updated_at'
        ]
    
    def get_children(self, obj):
        children = obj.children.filter(is_active=True)
        return InventoryCategoryListSerializer(children, many=True).data


class InventoryCategoryListSerializer(serializers.ModelSerializer):
    """Serializer resumido para listagem de categorias."""
    
    item_count = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = InventoryCategory
        fields = ['id', 'name', 'code', 'icon', 'color', 'is_active', 'item_count']


class InventoryCategoryTreeSerializer(serializers.ModelSerializer):
    """Serializer para árvore de categorias."""
    
    children = serializers.SerializerMethodField()
    item_count = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = InventoryCategory
        fields = ['id', 'name', 'code', 'icon', 'color', 'item_count', 'children']
    
    def get_children(self, obj):
        children = obj.children.filter(is_active=True)
        return InventoryCategoryTreeSerializer(children, many=True).data


class InventoryItemSerializer(serializers.ModelSerializer):
    """Serializer completo para itens de estoque."""
    
    category_name = serializers.CharField(source='category.name', read_only=True)
    unit_display = serializers.CharField(source='get_unit_display', read_only=True)
    is_low_stock = serializers.BooleanField(read_only=True)
    is_out_of_stock = serializers.BooleanField(read_only=True)
    needs_reorder = serializers.BooleanField(read_only=True)
    total_value = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    stock_status = serializers.CharField(read_only=True)
    
    class Meta:
        model = InventoryItem
        fields = [
            'id', 'code', 'name', 'manufacturer', 'description', 'barcode',
            'category', 'category_name',
            'unit', 'unit_display', 'quantity', 'min_quantity', 'max_quantity',
            'reorder_point', 'unit_cost', 'last_purchase_cost', 'total_value',
            'location', 'shelf', 'bin',
            'supplier', 'supplier_code', 'lead_time_days',
            'image', 'image_url', 'is_active', 'is_critical', 'notes',
            'is_low_stock', 'is_out_of_stock', 'needs_reorder', 'stock_status',
            'created_at', 'updated_at'
        ]


class InventoryItemListSerializer(serializers.ModelSerializer):
    """Serializer resumido para listagem de itens."""
    
    category_name = serializers.CharField(source='category.name', read_only=True)
    stock_status = serializers.CharField(read_only=True)
    total_value = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    is_low_stock = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = InventoryItem
        fields = [
            'id', 'code', 'name', 'manufacturer', 'description', 'barcode',
            'category', 'category_name',
            'unit', 'quantity', 'min_quantity', 'max_quantity',
            'reorder_point', 'unit_cost', 'total_value',
            'location', 'shelf', 'bin',
            'supplier', 'supplier_code',
            'image', 'image_url',
            'is_active', 'is_critical', 'is_low_stock', 'stock_status',
            'created_at', 'updated_at'
        ]


class InventoryMovementSerializer(serializers.ModelSerializer):
    """Serializer para movimentações de estoque."""
    
    item_code = serializers.CharField(source='item.code', read_only=True)
    item_name = serializers.CharField(source='item.name', read_only=True)
    type_display = serializers.CharField(source='get_type_display', read_only=True)
    reason_display = serializers.CharField(source='get_reason_display', read_only=True)
    performed_by_name = serializers.CharField(source='performed_by.get_full_name', read_only=True)
    work_order_number = serializers.CharField(source='work_order.number', read_only=True)
    total_value = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    
    class Meta:
        model = InventoryMovement
        fields = [
            'id', 'item', 'item_code', 'item_name',
            'type', 'type_display', 'reason', 'reason_display',
            'quantity', 'quantity_before', 'quantity_after', 'unit_cost', 'total_value',
            'work_order', 'work_order_number', 'reference', 'invoice_number',
            'note', 'performed_by', 'performed_by_name', 'created_at'
        ]
        read_only_fields = ['quantity_before', 'quantity_after', 'performed_by']

    def create(self, validated_data):
        validated_data['performed_by'] = self.context['request'].user
        return super().create(validated_data)


class InventoryMovementCreateSerializer(serializers.Serializer):
    """Serializer para criar movimentações (simplificado)."""
    
    item = serializers.PrimaryKeyRelatedField(queryset=InventoryItem.objects.all())
    type = serializers.ChoiceField(choices=InventoryMovement.MovementType.choices)
    reason = serializers.ChoiceField(choices=InventoryMovement.Reason.choices)
    quantity = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=Decimal('0.01'))
    unit_cost = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, allow_null=True)
    work_order_id = serializers.IntegerField(required=False, allow_null=True)
    reference = serializers.CharField(max_length=100, required=False, allow_blank=True)
    invoice_number = serializers.CharField(max_length=50, required=False, allow_blank=True)
    note = serializers.CharField(required=False, allow_blank=True)

    def create(self, validated_data):
        # Converter work_order_id para work_order se fornecido
        work_order_id = validated_data.pop('work_order_id', None)
        if work_order_id:
            try:
                from apps.cmms.models import WorkOrder
                validated_data['work_order'] = WorkOrder.objects.get(id=work_order_id)
            except Exception:
                pass
        
        validated_data['performed_by'] = self.context['request'].user
        return InventoryMovement.objects.create(**validated_data)


class InventoryCountItemSerializer(serializers.ModelSerializer):
    """Serializer para itens de contagem."""
    
    item_code = serializers.CharField(source='item.code', read_only=True)
    item_name = serializers.CharField(source='item.name', read_only=True)
    difference = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    has_discrepancy = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = InventoryCountItem
        fields = [
            'id', 'item', 'item_code', 'item_name',
            'expected_quantity', 'counted_quantity',
            'is_counted', 'difference', 'has_discrepancy', 'note',
            'created_at', 'updated_at'
        ]


class InventoryCountSerializer(serializers.ModelSerializer):
    """Serializer completo para contagens de inventário."""
    
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    performed_by_name = serializers.CharField(source='performed_by.get_full_name', read_only=True)
    items = InventoryCountItemSerializer(many=True, read_only=True)
    item_count = serializers.SerializerMethodField()
    counted_count = serializers.SerializerMethodField()
    discrepancy_count = serializers.SerializerMethodField()
    
    class Meta:
        model = InventoryCount
        fields = [
            'id', 'name', 'description', 'status', 'status_display',
            'scheduled_date', 'started_at', 'completed_at',
            'categories', 'location',
            'created_by', 'created_by_name', 'performed_by', 'performed_by_name',
            'notes', 'items', 'item_count', 'counted_count', 'discrepancy_count',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_by', 'started_at', 'completed_at']

    def get_item_count(self, obj):
        return obj.items.count()
    
    def get_counted_count(self, obj):
        return obj.items.filter(is_counted=True).count()
    
    def get_discrepancy_count(self, obj):
        return sum(1 for item in obj.items.all() if item.has_discrepancy)


class InventoryCountListSerializer(serializers.ModelSerializer):
    """Serializer resumido para listagem de contagens."""
    
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    item_count = serializers.SerializerMethodField()
    
    class Meta:
        model = InventoryCount
        fields = [
            'id', 'name', 'status', 'status_display',
            'scheduled_date', 'item_count', 'created_at'
        ]
    
    def get_item_count(self, obj):
        return obj.items.count()


class InventoryStatsSerializer(serializers.Serializer):
    """Serializer para estatísticas de estoque."""
    
    total_items = serializers.IntegerField()
    active_items = serializers.IntegerField()
    total_value = serializers.DecimalField(max_digits=14, decimal_places=2)
    low_stock_count = serializers.IntegerField()
    out_of_stock_count = serializers.IntegerField()
    critical_items_count = serializers.IntegerField()
    categories_count = serializers.IntegerField()
    recent_movements = serializers.IntegerField()
