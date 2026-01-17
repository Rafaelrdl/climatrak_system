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
