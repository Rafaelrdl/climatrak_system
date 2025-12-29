"""
Finance Serializers

Serializers para:
- CostCenter (com hierarquia)
- RateCard (com vigência)
- BudgetPlan, BudgetEnvelope, BudgetMonth
- CostTransaction (Ledger)
- LedgerAdjustment
"""

from rest_framework import serializers
from django.utils import timezone
from .models import (
    CostCenter, RateCard, BudgetPlan, BudgetEnvelope, BudgetMonth,
    CostTransaction, LedgerAdjustment, Commitment
)


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


# =============================================================================
# Ledger Serializers (CostTransaction, LedgerAdjustment)
# =============================================================================

class CostTransactionSerializer(serializers.ModelSerializer):
    """
    Serializer para Transação de Custo (Ledger).
    
    Campos computados:
    - transaction_type_display: label do tipo
    - category_display: label da categoria
    - cost_center_name: nome do centro de custo
    - is_editable: se pode ser editado (não locked)
    """
    transaction_type_display = serializers.CharField(
        source='get_transaction_type_display', 
        read_only=True
    )
    category_display = serializers.CharField(
        source='get_category_display', 
        read_only=True
    )
    cost_center_name = serializers.CharField(
        source='cost_center.name', 
        read_only=True
    )
    cost_center_code = serializers.CharField(
        source='cost_center.code', 
        read_only=True
    )
    asset_tag = serializers.CharField(
        source='asset.tag', 
        read_only=True, 
        allow_null=True
    )
    work_order_code = serializers.CharField(
        source='work_order.code', 
        read_only=True, 
        allow_null=True
    )
    created_by_name = serializers.CharField(
        source='created_by.get_full_name', 
        read_only=True, 
        allow_null=True
    )
    locked_by_name = serializers.CharField(
        source='locked_by.get_full_name', 
        read_only=True, 
        allow_null=True
    )
    is_editable = serializers.SerializerMethodField()
    
    class Meta:
        model = CostTransaction
        fields = [
            'id', 'idempotency_key',
            'transaction_type', 'transaction_type_display',
            'category', 'category_display',
            'amount', 'currency',
            'occurred_at', 'description', 'meta',
            'cost_center', 'cost_center_name', 'cost_center_code',
            'asset', 'asset_tag',
            'work_order', 'work_order_code',
            'vendor_id',
            'is_locked', 'locked_at', 'locked_by', 'locked_by_name',
            'is_editable',
            'created_at', 'updated_at', 'created_by', 'created_by_name'
        ]
        read_only_fields = [
            'id', 'idempotency_key',
            'is_locked', 'locked_at', 'locked_by',
            'created_at', 'updated_at', 'created_by'
        ]
    
    def get_is_editable(self, obj):
        """Verifica se a transação pode ser editada."""
        return not obj.is_locked
    
    def validate(self, data):
        """Validação de transação."""
        instance = self.instance
        
        # Não permitir edição de transação bloqueada
        if instance and instance.is_locked:
            raise serializers.ValidationError(
                'Transação bloqueada não pode ser alterada. Use ajuste manual.'
            )
        
        return data
    
    def create(self, validated_data):
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['created_by'] = request.user
        return super().create(validated_data)


class CostTransactionCreateSerializer(serializers.ModelSerializer):
    """
    Serializer para criação de Transação de Custo.
    Usado para criação manual de transações.
    """
    class Meta:
        model = CostTransaction
        fields = [
            'transaction_type', 'category',
            'amount', 'currency',
            'occurred_at', 'description', 'meta',
            'cost_center', 'asset', 'work_order', 'vendor_id',
            'idempotency_key'
        ]
    
    def validate_idempotency_key(self, value):
        """Validar unicidade da idempotency_key."""
        if value:
            if CostTransaction.objects.filter(idempotency_key=value).exists():
                raise serializers.ValidationError(
                    'Já existe uma transação com esta chave de idempotência.'
                )
        return value
    
    def create(self, validated_data):
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['created_by'] = request.user
        return super().create(validated_data)


class CostTransactionSummarySerializer(serializers.Serializer):
    """
    Serializer para resumo de transações.
    Usado em endpoints de summary/agregação.
    """
    category = serializers.CharField()
    category_display = serializers.CharField()
    transaction_type = serializers.CharField()
    total_amount = serializers.DecimalField(max_digits=15, decimal_places=2)
    transaction_count = serializers.IntegerField()


class LedgerAdjustmentSerializer(serializers.ModelSerializer):
    """
    Serializer para Ajuste de Ledger.
    
    Campos computados:
    - adjustment_type_display: label do tipo
    - original_transaction_info: info resumida da transação original
    """
    adjustment_type_display = serializers.CharField(
        source='get_adjustment_type_display', 
        read_only=True
    )
    created_by_name = serializers.CharField(
        source='created_by.get_full_name', 
        read_only=True
    )
    approved_by_name = serializers.CharField(
        source='approved_by.get_full_name', 
        read_only=True, 
        allow_null=True
    )
    original_transaction_info = serializers.SerializerMethodField()
    adjustment_transaction_info = serializers.SerializerMethodField()
    
    class Meta:
        model = LedgerAdjustment
        fields = [
            'id',
            'original_transaction', 'original_transaction_info',
            'adjustment_transaction', 'adjustment_transaction_info',
            'adjustment_type', 'adjustment_type_display',
            'reason',
            'original_amount', 'adjustment_amount',
            'is_approved', 'approved_at', 'approved_by', 'approved_by_name',
            'created_at', 'created_by', 'created_by_name'
        ]
        read_only_fields = [
            'id', 'adjustment_transaction',
            'approved_at', 'approved_by',
            'created_at', 'created_by'
        ]
    
    def get_original_transaction_info(self, obj):
        """Info resumida da transação original."""
        if not obj.original_transaction:
            return None
        tx = obj.original_transaction
        return {
            'id': str(tx.id),
            'amount': str(tx.amount),
            'transaction_type': tx.transaction_type,
            'occurred_at': tx.occurred_at.isoformat() if tx.occurred_at else None
        }
    
    def get_adjustment_transaction_info(self, obj):
        """Info resumida da transação de ajuste."""
        tx = obj.adjustment_transaction
        return {
            'id': str(tx.id),
            'amount': str(tx.amount),
            'transaction_type': tx.transaction_type,
            'occurred_at': tx.occurred_at.isoformat() if tx.occurred_at else None
        }


class LedgerAdjustmentCreateSerializer(serializers.Serializer):
    """
    Serializer para criação de Ajuste de Ledger.
    
    Cria automaticamente a CostTransaction de ajuste.
    """
    original_transaction = serializers.PrimaryKeyRelatedField(
        queryset=CostTransaction.objects.all(),
        required=False,
        allow_null=True,
        help_text='Transação original a ser ajustada (opcional para ajuste avulso)'
    )
    adjustment_type = serializers.ChoiceField(
        choices=LedgerAdjustment.AdjustmentType.choices
    )
    reason = serializers.CharField(
        min_length=10,
        help_text='Justificativa para o ajuste (mínimo 10 caracteres)'
    )
    adjustment_amount = serializers.DecimalField(
        max_digits=15, 
        decimal_places=2,
        help_text='Valor do ajuste (positivo ou negativo)'
    )
    cost_center = serializers.PrimaryKeyRelatedField(
        queryset=CostCenter.objects.all(),
        required=False,
        allow_null=True,
        help_text='Centro de custo (obrigatório se não houver transação original)'
    )
    category = serializers.ChoiceField(
        choices=CostTransaction.Category.choices,
        required=False,
        help_text='Categoria (obrigatório se não houver transação original)'
    )
    occurred_at = serializers.DateTimeField(
        required=False,
        help_text='Data da ocorrência (default: agora)'
    )
    description = serializers.CharField(
        required=False,
        allow_blank=True,
        help_text='Descrição adicional'
    )
    
    def validate(self, data):
        """Validação de ajuste."""
        original = data.get('original_transaction')
        cost_center = data.get('cost_center')
        category = data.get('category')
        
        # Se não tem transação original, precisa de cost_center e category
        if not original:
            if not cost_center:
                raise serializers.ValidationError({
                    'cost_center': 'Centro de custo é obrigatório para ajuste avulso.'
                })
            if not category:
                raise serializers.ValidationError({
                    'category': 'Categoria é obrigatória para ajuste avulso.'
                })
        
        return data
    
    def create(self, validated_data):
        """Cria o ajuste e a transação de ajuste."""
        request = self.context.get('request')
        user = request.user if request else None
        
        original = validated_data.get('original_transaction')
        adjustment_type = validated_data['adjustment_type']
        reason = validated_data['reason']
        adjustment_amount = validated_data['adjustment_amount']
        
        # Determinar cost_center e category
        if original:
            cost_center = original.cost_center
            category = original.category
            original_amount = original.amount
        else:
            cost_center = validated_data['cost_center']
            category = validated_data['category']
            original_amount = None
        
        # Data de ocorrência
        occurred_at = validated_data.get('occurred_at') or timezone.now()
        
        # Descrição
        description = validated_data.get('description', '')
        if not description:
            description = f"Ajuste: {reason[:100]}"
        
        # Criar transação de ajuste
        adjustment_tx = CostTransaction.objects.create(
            transaction_type=CostTransaction.TransactionType.ADJUSTMENT,
            category=category,
            amount=adjustment_amount,
            occurred_at=occurred_at,
            description=description,
            cost_center=cost_center,
            asset=original.asset if original else None,
            work_order=original.work_order if original else None,
            meta={
                'adjustment_type': adjustment_type,
                'reason': reason,
                'original_transaction_id': str(original.id) if original else None
            },
            created_by=user
        )
        
        # Criar registro de ajuste
        adjustment = LedgerAdjustment.objects.create(
            original_transaction=original,
            adjustment_transaction=adjustment_tx,
            adjustment_type=adjustment_type,
            reason=reason,
            original_amount=original_amount,
            adjustment_amount=adjustment_amount,
            created_by=user,
            is_approved=True,  # Auto-aprovado no MVP
            approved_at=timezone.now() if user else None,
            approved_by=user
        )
        
        return adjustment


# =============================================================================
# Commitment Serializers
# =============================================================================

class CommitmentSerializer(serializers.ModelSerializer):
    """
    Serializer para Compromisso de Orçamento.
    
    Campos computados:
    - cost_center_name: Nome do centro de custo
    - status_display: Display do status
    - category_display: Display da categoria
    - approved_by_name: Nome de quem aprovou
    - work_order_number: Número da OS (se houver)
    """
    cost_center_name = serializers.CharField(source='cost_center.name', read_only=True)
    cost_center_code = serializers.CharField(source='cost_center.code', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    approved_by_name = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()
    work_order_number = serializers.CharField(source='work_order.number', read_only=True, allow_null=True)
    
    class Meta:
        model = Commitment
        fields = [
            'id', 'cost_center', 'cost_center_name', 'cost_center_code',
            'budget_month', 'amount', 'currency',
            'category', 'category_display',
            'status', 'status_display',
            'description', 'vendor_name',
            'work_order', 'work_order_number',
            'approved_by', 'approved_by_name', 'approved_at',
            'rejection_reason',
            'created_at', 'updated_at', 'created_by', 'created_by_name'
        ]
        read_only_fields = [
            'id', 'status', 'approved_by', 'approved_at', 'rejection_reason',
            'created_at', 'updated_at', 'created_by'
        ]
    
    def get_approved_by_name(self, obj):
        if obj.approved_by:
            return obj.approved_by.get_full_name() or obj.approved_by.email
        return None
    
    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.get_full_name() or obj.created_by.email
        return None
    
    def create(self, validated_data):
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['created_by'] = request.user
        return super().create(validated_data)


class CommitmentCreateSerializer(serializers.ModelSerializer):
    """
    Serializer para criação de Compromisso.
    
    Permite criar com status DRAFT ou já SUBMITTED.
    """
    submit = serializers.BooleanField(
        default=False,
        write_only=True,
        help_text='Se True, já submete para aprovação'
    )
    
    class Meta:
        model = Commitment
        fields = [
            'id', 'cost_center', 'budget_month', 'amount', 'currency',
            'category', 'description', 'vendor_name', 'work_order',
            'submit'
        ]
        read_only_fields = ['id']
    
    def validate_budget_month(self, value):
        """Garante que é primeiro dia do mês."""
        if value.day != 1:
            value = value.replace(day=1)
        return value
    
    def create(self, validated_data):
        submit = validated_data.pop('submit', False)
        
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['created_by'] = request.user
        
        commitment = Commitment.objects.create(**validated_data)
        
        if submit:
            commitment.submit()
        
        return commitment


class CommitmentApproveSerializer(serializers.Serializer):
    """Serializer para ação de aprovar compromisso."""
    pass  # Não precisa de campos, usa o usuário do request


class CommitmentRejectSerializer(serializers.Serializer):
    """Serializer para ação de rejeitar compromisso."""
    reason = serializers.CharField(
        min_length=10,
        help_text='Motivo da rejeição (mínimo 10 caracteres)'
    )


class CommitmentSummarySerializer(serializers.Serializer):
    """
    Serializer para resumo de compromissos.
    
    Usado em endpoints de agregação.
    """
    budget_month = serializers.DateField()
    cost_center_id = serializers.UUIDField()
    cost_center_code = serializers.CharField()
    cost_center_name = serializers.CharField()
    category = serializers.CharField()
    status = serializers.CharField()
    total_amount = serializers.DecimalField(max_digits=15, decimal_places=2)
    count = serializers.IntegerField()