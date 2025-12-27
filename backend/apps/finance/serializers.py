"""
Finance Serializers

Serializers para:
- CostCenter (com hierarquia)
- RateCard (com vigência)
- BudgetPlan, BudgetEnvelope, BudgetMonth
"""

from rest_framework import serializers
from .models import CostCenter, RateCard, BudgetPlan, BudgetEnvelope, BudgetMonth


class CostCenterSerializer(serializers.ModelSerializer):
    """
    Serializer para Centro de Custo.
    
    Campos computados:
    - level: nível na hierarquia
    - full_path: caminho completo
    - children_count: quantidade de filhos
    """
    level = serializers.IntegerField(read_only=True)
    full_path = serializers.CharField(read_only=True)
    children_count = serializers.SerializerMethodField()
    parent_name = serializers.CharField(source='parent.name', read_only=True, allow_null=True)
    
    class Meta:
        model = CostCenter
        fields = [
            'id', 'code', 'name', 'description',
            'parent', 'parent_name', 'level', 'full_path', 'children_count',
            'tags', 'is_active',
            'created_at', 'updated_at', 'created_by'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by']
    
    def get_children_count(self, obj):
        return obj.children.count()
    
    def create(self, validated_data):
        # Definir created_by do request
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['created_by'] = request.user
        return super().create(validated_data)


class CostCenterTreeSerializer(serializers.ModelSerializer):
    """
    Serializer para árvore de Centros de Custo.
    Inclui filhos recursivamente.
    """
    children = serializers.SerializerMethodField()
    
    class Meta:
        model = CostCenter
        fields = ['id', 'code', 'name', 'is_active', 'children']
    
    def get_children(self, obj):
        children = obj.children.filter(is_active=True)
        return CostCenterTreeSerializer(children, many=True).data


class RateCardSerializer(serializers.ModelSerializer):
    """
    Serializer para Tabela de Custos (RateCard).
    """
    is_current = serializers.SerializerMethodField()
    
    class Meta:
        model = RateCard
        fields = [
            'id', 'role', 'role_code', 'description',
            'cost_per_hour', 'currency',
            'effective_from', 'effective_to', 'is_current',
            'is_active',
            'created_at', 'updated_at', 'created_by'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by']
    
    def get_is_current(self, obj):
        """Verifica se este rate card está vigente hoje."""
        from django.utils import timezone
        today = timezone.now().date()
        if obj.effective_from > today:
            return False
        if obj.effective_to and obj.effective_to < today:
            return False
        return obj.is_active
    
    def create(self, validated_data):
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['created_by'] = request.user
        return super().create(validated_data)


class BudgetMonthSerializer(serializers.ModelSerializer):
    """
    Serializer para Mês do Orçamento.
    """
    month_name = serializers.SerializerMethodField()
    locked_by_name = serializers.CharField(source='locked_by.get_full_name', read_only=True, allow_null=True)
    
    class Meta:
        model = BudgetMonth
        fields = [
            'id', 'envelope', 'month', 'month_name',
            'planned_amount',
            'is_locked', 'locked_at', 'locked_by', 'locked_by_name',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'locked_at', 'locked_by', 'created_at', 'updated_at']
    
    def get_month_name(self, obj):
        return obj.month.strftime('%B/%Y')


class BudgetMonthWriteSerializer(serializers.ModelSerializer):
    """
    Serializer simplificado para criação/atualização de BudgetMonth.
    """
    class Meta:
        model = BudgetMonth
        fields = ['id', 'month', 'planned_amount']
        read_only_fields = ['id']


class BudgetEnvelopeSerializer(serializers.ModelSerializer):
    """
    Serializer para Envelope de Orçamento.
    """
    cost_center_name = serializers.CharField(source='cost_center.name', read_only=True)
    cost_center_code = serializers.CharField(source='cost_center.code', read_only=True)
    budget_plan_name = serializers.CharField(source='budget_plan.name', read_only=True)
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    months = BudgetMonthSerializer(many=True, read_only=True)
    months_total = serializers.SerializerMethodField()
    
    class Meta:
        model = BudgetEnvelope
        fields = [
            'id', 'name', 'description',
            'budget_plan', 'budget_plan_name',
            'cost_center', 'cost_center_name', 'cost_center_code',
            'category', 'category_display',
            'amount', 'currency', 'months_total',
            'is_active',
            'months',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_months_total(self, obj):
        """Soma do planejado nos meses."""
        from django.db.models import Sum
        return obj.months.aggregate(total=Sum('planned_amount'))['total'] or 0


class BudgetEnvelopeWriteSerializer(serializers.ModelSerializer):
    """
    Serializer para criação/atualização de Envelope com meses.
    """
    months = BudgetMonthWriteSerializer(many=True, required=False)
    
    class Meta:
        model = BudgetEnvelope
        fields = [
            'id', 'name', 'description',
            'budget_plan', 'cost_center', 'category',
            'amount', 'currency', 'is_active',
            'months'
        ]
        read_only_fields = ['id']
    
    def create(self, validated_data):
        months_data = validated_data.pop('months', [])
        envelope = BudgetEnvelope.objects.create(**validated_data)
        
        for month_data in months_data:
            BudgetMonth.objects.create(envelope=envelope, **month_data)
        
        return envelope
    
    def update(self, instance, validated_data):
        months_data = validated_data.pop('months', None)
        
        # Atualizar envelope
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Atualizar meses se fornecidos
        if months_data is not None:
            # Remover meses existentes e recriar
            instance.months.all().delete()
            for month_data in months_data:
                BudgetMonth.objects.create(envelope=instance, **month_data)
        
        return instance


class BudgetPlanSerializer(serializers.ModelSerializer):
    """
    Serializer para Plano Orçamentário.
    """
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    envelopes_count = serializers.SerializerMethodField()
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True, allow_null=True)
    
    class Meta:
        model = BudgetPlan
        fields = [
            'id', 'code', 'name', 'description',
            'year', 'start_date', 'end_date',
            'total_planned', 'currency',
            'status', 'status_display',
            'envelopes_count',
            'created_at', 'updated_at', 'created_by', 'created_by_name'
        ]
        read_only_fields = ['id', 'total_planned', 'created_at', 'updated_at', 'created_by']
    
    def get_envelopes_count(self, obj):
        return obj.envelopes.count()
    
    def create(self, validated_data):
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['created_by'] = request.user
        return super().create(validated_data)


class BudgetPlanDetailSerializer(BudgetPlanSerializer):
    """
    Serializer detalhado para Plano Orçamentário com envelopes.
    """
    envelopes = BudgetEnvelopeSerializer(many=True, read_only=True)
    
    class Meta(BudgetPlanSerializer.Meta):
        fields = BudgetPlanSerializer.Meta.fields + ['envelopes']
