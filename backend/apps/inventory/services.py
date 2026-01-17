"""
Inventory Services

Service layer para regras de negócio do módulo de Inventory.
"""

from decimal import Decimal
from typing import Optional

from django.db import transaction

from .models import InventoryItem, InventoryMovement


class InventoryItemService:
    """
    Serviço para gerenciar operações de itens de estoque.
    
    Centraliza regras de negócio, garantindo que:
    - Criar item com quantidade > 0 gera movimentação de ENTRADA
    - Idempotência via reference determinística
    """

    # Reason específico para saldo inicial
    INITIAL_BALANCE_REASON = InventoryMovement.Reason.OTHER
    INITIAL_BALANCE_REFERENCE_PREFIX = "INITIAL_BALANCE"

    @classmethod
    def create_item_with_initial_stock(
        cls,
        *,
        code: str,
        name: str,
        unit: str,
        quantity: Decimal,
        min_quantity: Decimal = Decimal("0"),
        max_quantity: Optional[Decimal] = None,
        unit_cost: Decimal = Decimal("0"),
        category=None,
        manufacturer: str = "",
        description: str = "",
        barcode: str = "",
        location: str = "",
        shelf: str = "",
        bin_location: str = "",
        supplier: str = "",
        supplier_code: str = "",
        lead_time_days: Optional[int] = None,
        image=None,
        image_url: Optional[str] = None,
        is_active: bool = True,
        is_critical: bool = False,
        notes: str = "",
        performed_by=None,
    ) -> tuple[InventoryItem, Optional[InventoryMovement]]:
        """
        Cria um item de estoque e, se a quantidade inicial > 0,
        cria automaticamente uma movimentação de ENTRADA (INITIAL_BALANCE).
        
        Returns:
            Tuple com (item, movimento). movimento é None se quantity == 0.
        """
        with transaction.atomic():
            # Criar o item com quantidade 0 inicialmente
            # A movimentação vai definir o saldo real
            item = InventoryItem.objects.create(
                code=code,
                name=name,
                manufacturer=manufacturer,
                description=description,
                barcode=barcode,
                category=category,
                unit=unit,
                quantity=Decimal("0"),  # Inicia com 0, movimentação ajusta
                min_quantity=min_quantity,
                max_quantity=max_quantity,
                reorder_point=min_quantity,  # Default igual ao mínimo
                unit_cost=unit_cost,
                location=location,
                shelf=shelf,
                bin=bin_location,
                supplier=supplier,
                supplier_code=supplier_code,
                lead_time_days=lead_time_days,
                image=image,
                image_url=image_url,
                is_active=is_active,
                is_critical=is_critical,
                notes=notes,
            )

            movement = None
            if quantity > 0:
                # Criar movimentação de entrada para saldo inicial
                reference = f"{cls.INITIAL_BALANCE_REFERENCE_PREFIX}:{item.id}"
                movement = InventoryMovement.objects.create(
                    item=item,
                    type=InventoryMovement.MovementType.IN,
                    reason=cls.INITIAL_BALANCE_REASON,
                    quantity=quantity,
                    unit_cost=unit_cost,
                    reference=reference,
                    note="Saldo inicial do item",
                    performed_by=performed_by,
                )
                # Refresh item para obter quantity atualizada pelo movimento
                item.refresh_from_db()

            return item, movement

    @classmethod
    def backfill_initial_movement(
        cls,
        item: InventoryItem,
        performed_by=None,
    ) -> Optional[InventoryMovement]:
        """
        Cria movimentação de saldo inicial para um item legado (sem movimentação).
        
        Idempotente: se já existir movimentação com reference INITIAL_BALANCE,
        não cria duplicata.
        
        Returns:
            O movimento criado, ou None se já existia ou quantity == 0.
        """
        if item.quantity <= 0:
            return None

        reference = f"{cls.INITIAL_BALANCE_REFERENCE_PREFIX}:{item.id}"

        # Verificar idempotência: já existe movimentação inicial?
        existing = InventoryMovement.objects.filter(
            item=item,
            reference=reference,
        ).first()

        if existing:
            return None  # Já existe, não duplicar

        # Verificar se o item já tem alguma movimentação
        # Se não tem nenhuma, criar a inicial
        has_movements = InventoryMovement.objects.filter(item=item).exists()
        
        if has_movements:
            # Item já tem movimentações, não criar saldo inicial retroativo
            # pois isso desbalancearia o histórico
            return None

        # Para backfill, criar movimentação sem alterar o saldo atual
        # Usamos inserção direta no banco evitando o save() override
        movement = InventoryMovement(
            item=item,
            type=InventoryMovement.MovementType.IN,
            reason=cls.INITIAL_BALANCE_REASON,
            quantity=item.quantity,
            quantity_before=Decimal("0"),
            quantity_after=item.quantity,
            unit_cost=item.unit_cost,
            reference=reference,
            note="Saldo inicial (backfill automático)",
            performed_by=performed_by,
        )
        # Bypass do save() customizado - inserir diretamente
        InventoryMovement.objects.bulk_create([movement])
        
        return movement

    @classmethod
    def backfill_all_legacy_items(cls, performed_by=None) -> dict:
        """
        Cria movimentação inicial para todos os itens legados sem movimentação.
        
        Returns:
            Dict com estatísticas: {'processed': N, 'created': N, 'skipped': N}
        """
        stats = {
            'processed': 0,
            'created': 0,
            'skipped': 0,
        }

        # Buscar itens com quantidade > 0 que não têm nenhuma movimentação
        items_without_movements = InventoryItem.objects.filter(
            quantity__gt=0,
        ).exclude(
            movements__isnull=False,
        ).distinct()

        for item in items_without_movements:
            stats['processed'] += 1
            movement = cls.backfill_initial_movement(item, performed_by)
            if movement:
                stats['created'] += 1
            else:
                stats['skipped'] += 1

        return stats

class InventoryFinanceIntegrationService:
    """
    Serviço de integração entre Inventory e Finance (TrakLedger).
    
    Responsável por:
    - Criar CostTransaction quando uma movimentação de estoque ocorre
    - Garantir idempotência via idempotency_key
    - Respeitar multi-tenant (django-tenants)
    - Usar cost_center apropriado (do item ou da OS)
    
    Implementa a regra: InventoryMovement.OUT → CostTransaction (Realizado)
    
    Referência: docs/integration/inventory-to-finance.md (documento de integração)
    """

    @classmethod
    def create_cost_transaction_for_movement(
        cls,
        movement: InventoryMovement,
    ) -> Optional["CostTransaction"]:  # type: ignore
        """
        Cria uma CostTransaction baseada em um InventoryMovement.
        
        Apenas movimentações de SAÍDA (consumo de estoque) geram lançamento.
        
        Movimentações que NÃO geram lançamento:
        - IN (entrada/compra)
        - TRANSFER (transferência interna)
        - RETURN (devolução sem custo)
        
        Args:
            movement: InventoryMovement que pode gerar custo
            
        Returns:
            CostTransaction criada ou None se não deve gerar lançamento
            
        Raises:
            ImportError: Se trakledger não está disponível
        """
        from django.db import connection
        
        # Determinar se deve gerar lançamento
        if not cls._should_generate_cost_transaction(movement):
            return None
        
        # Calcular custo total
        total_cost = movement.quantity * (movement.unit_cost or Decimal("0"))
        if total_cost <= 0:
            return None  # Não gerar lançamento sem custo
        
        # Arredondar para 2 casas decimais (campo DecimalField(decimal_places=2))
        total_cost = total_cost.quantize(Decimal("0.01"))
        
        # Determinar centro de custo
        # 1. Se movimento está vinculado a OS, usar cost_center da OS
        # 2. Se não, tentar usar cost_center padrão do item/categoria
        # 3. Se ainda não houver, usar um centro padrão do tenant (se existir)
        cost_center_id = cls._get_cost_center_for_movement(movement)
        
        if not cost_center_id:
            # Sem centro de custo, não criar transaction
            # (backend exige cost_center como FK obrigatório)
            return None
        
        # Montar chave de idempotência
        idempotency_key = f"inventory_movement:{connection.tenant.schema_name}:{movement.id}"
        
        # Determinar categoria (preventive, corrective, etc)
        category = cls._get_category_for_movement(movement)
        
        # Criar ou obter (idempotência)
        try:
            from apps.trakledger.models import CostTransaction
        except ImportError:
            # TrakLedger não disponível neste tenant
            return None
        
        cost_transaction, created = CostTransaction.objects.get_or_create(
            idempotency_key=idempotency_key,
            defaults={
                'transaction_type': 'parts',  # Sempre 'parts' para inventory
                'category': category,
                'amount': total_cost,
                'currency': 'BRL',  # Hardcoded por enquanto
                'occurred_at': movement.created_at,
                'cost_center_id': cost_center_id,
                'asset_id': movement.work_order.asset_id if movement.work_order else None,
                'work_order_id': movement.work_order_id,
                'description': cls._get_description_for_movement(movement),
                'meta': {
                    'inventory_movement_id': movement.id,
                    'item_id': movement.item_id,
                    'item_code': movement.item.code,
                    'item_name': movement.item.name,
                    'quantity': str(movement.quantity),
                    'unit_cost': str(movement.unit_cost or 0),
                    'unit': movement.item.unit,
                    'movement_type': movement.type,
                    'reason': movement.reason,
                    'reference': movement.reference,
                    'source': 'inventory_movement',
                },
            }
        )
        
        return cost_transaction if created else None

    @classmethod
    def _should_generate_cost_transaction(cls, movement: InventoryMovement) -> bool:
        """
        Determina se um movimento deve gerar lançamento em Finance.
        
        Apenas ENTRADAS (compras) geram custo:
        - IN: Entrada/compra = momento em que se GASTA dinheiro
        - ADJUSTMENT: Ajuste de inventário (pode representar perda/ganho)
        
        NÃO geram custo (custo já foi registrado na compra):
        - OUT: Saída/consumo (o item já foi pago na entrada)
        - RETURN: Devolução ao fornecedor (pode gerar crédito, tratado separadamente)
        - TRANSFER: Transferência interna (sem impacto financeiro)
        """
        return movement.type in [
            InventoryMovement.MovementType.IN,  # Compra = custo
            InventoryMovement.MovementType.ADJUSTMENT,  # Ajustes (perdas/achados)
        ]

    @classmethod
    def _get_category_for_movement(cls, movement: InventoryMovement) -> str:
        """
        Determina categoria do lançamento em Finance.
        
        Mapeamento:
        - Se tem WorkOrder → preventive/corrective (conforme WO.type)
        - Se reason == WORK_ORDER → preventive (default)
        - Outros → other
        """
        from apps.trakledger.models import CostTransaction
        
        if movement.work_order:
            # Mapear tipo de OS para categoria Finance
            # Exemplo: WO.type = 'preventive' → 'preventive'
            wo_type = getattr(movement.work_order, 'type', None)
            if wo_type in ['preventive', 'corrective', 'predictive', 'improvement']:
                return wo_type
        
        if movement.reason == InventoryMovement.Reason.WORK_ORDER:
            return 'preventive'  # Default para consumos ligados a OS
        
        # Default
        return 'other'

    @classmethod
    def _get_cost_center_for_movement(cls, movement: InventoryMovement) -> Optional[str]:
        """
        Determina o centro de custo para o lançamento.
        
        Prioridade:
        1. cost_center da WorkOrder (se existir)
        2. cost_center do Asset da WorkOrder (se existir)
        3. cost_center default do tenant (se único)
        4. None (falha)
        """
        from django.db import connection
        from apps.trakledger.models import CostCenter
        
        # 1. Se movimento tem OS, tentar obter cost_center da OS
        if movement.work_order:
            # Verificar se WorkOrder tem cost_center direto
            cost_center_id = getattr(movement.work_order, 'cost_center_id', None)
            if cost_center_id:
                return cost_center_id
            
            # Tentar obter cost_center do asset da OS
            asset = getattr(movement.work_order, 'asset', None)
            if asset:
                cost_center_id = getattr(asset, 'cost_center_id', None)
                if cost_center_id:
                    return cost_center_id
        
        # 2. Tentar usar cost_center do item (se existir campo)
        cost_center_id = getattr(movement.item, 'cost_center_id', None)
        if cost_center_id:
            return cost_center_id
        
        # 3. Se é o único tenant com único cost_center, usar
        try:
            cc = CostCenter.objects.first()  # Get first (django-tenants já filtra)
            if cc:
                return str(cc.id)
        except Exception:
            pass
        
        return None

    @classmethod
    def _get_description_for_movement(cls, movement: InventoryMovement) -> str:
        """
        Gera descrição apropriada para o lançamento em Finance.
        
        Descrições por tipo de movimento:
        - IN (compra): "Compra de {item} ({qty} {unit})"
        - ADJUSTMENT: "Ajuste de inventário: {item} ({qty} {unit})"
        """
        qty = movement.quantity
        unit = movement.item.unit
        item_name = movement.item.name
        
        if movement.type == InventoryMovement.MovementType.IN:
            return f'Compra de {item_name} ({qty} {unit})'
        elif movement.type == InventoryMovement.MovementType.ADJUSTMENT:
            return f'Ajuste de inventário: {item_name} ({qty} {unit})'
        else:
            # Fallback (não deveria chegar aqui com lógica atual)
            return f'Movimentação de {item_name} ({qty} {unit})'