"""
Management command para backfill de movimentações iniciais de itens legados.

Uso:
    python manage.py backfill_inventory_movements
    python manage.py backfill_inventory_movements --dry-run
    python manage.py backfill_inventory_movements --tenant=umc
"""

from django.core.management.base import BaseCommand
from django_tenants.utils import schema_context, get_tenant_model

from apps.inventory.models import InventoryItem, InventoryMovement
from apps.inventory.services import InventoryItemService


class Command(BaseCommand):
    help = "Cria movimentações de saldo inicial para itens legados sem histórico"

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Apenas mostra o que seria feito, sem criar movimentações",
        )
        parser.add_argument(
            "--tenant",
            type=str,
            help="Schema do tenant específico (ex: umc). Se não informado, processa todos os tenants.",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        tenant_schema = options.get("tenant")

        if dry_run:
            self.stdout.write(self.style.WARNING("=== DRY RUN - Nenhuma alteração será feita ==="))

        TenantModel = get_tenant_model()

        if tenant_schema:
            # Processar apenas um tenant
            try:
                tenant = TenantModel.objects.get(schema_name=tenant_schema)
                self._process_tenant(tenant, dry_run)
            except TenantModel.DoesNotExist:
                self.stdout.write(self.style.ERROR(f"Tenant '{tenant_schema}' não encontrado"))
                return
        else:
            # Processar todos os tenants (exceto public)
            tenants = TenantModel.objects.exclude(schema_name="public")
            for tenant in tenants:
                self._process_tenant(tenant, dry_run)

        self.stdout.write(self.style.SUCCESS("Backfill concluído!"))

    def _process_tenant(self, tenant, dry_run: bool):
        """Processa um tenant específico."""
        self.stdout.write(f"\n--- Processando tenant: {tenant.schema_name} ---")

        with schema_context(tenant.schema_name):
            # Buscar itens com quantidade > 0 que não têm nenhuma movimentação
            items_without_movements = InventoryItem.objects.filter(
                quantity__gt=0,
            ).exclude(
                id__in=InventoryMovement.objects.values_list("item_id", flat=True),
            )

            total_items = items_without_movements.count()
            self.stdout.write(f"  Itens sem movimentação encontrados: {total_items}")

            if total_items == 0:
                self.stdout.write(self.style.SUCCESS("  Nenhum item precisa de backfill."))
                return

            if dry_run:
                # Listar itens que seriam processados
                for item in items_without_movements[:10]:  # Limitar para não poluir
                    self.stdout.write(
                        f"  [DRY-RUN] Criaria movimentação para: {item.code} - {item.name} "
                        f"(qty: {item.quantity})"
                    )
                if total_items > 10:
                    self.stdout.write(f"  ... e mais {total_items - 10} itens")
                return

            # Executar backfill
            created_count = 0
            for item in items_without_movements:
                movement = InventoryItemService.backfill_initial_movement(item)
                if movement:
                    created_count += 1
                    self.stdout.write(
                        f"  [OK] {item.code} - {item.name}: movimentação criada (qty: {item.quantity})"
                    )

            self.stdout.write(
                self.style.SUCCESS(f"  Total de movimentações criadas: {created_count}")
            )
