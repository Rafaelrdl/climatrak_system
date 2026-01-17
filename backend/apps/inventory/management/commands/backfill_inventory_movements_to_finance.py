"""
Management command para backfill de CostTransaction de movimentações existentes.

Este command processa todas as InventoryMovement existentes e cria CostTransaction
correspondentes (se aplicável), usando idempotency_key para evitar duplicação.

Uso:
    python manage.py backfill_inventory_movements_to_finance
    python manage.py backfill_inventory_movements_to_finance --dry-run
    python manage.py backfill_inventory_movements_to_finance --tenant=umc
    python manage.py backfill_inventory_movements_to_finance --since='2026-01-01'
"""

from django.core.management.base import BaseCommand
from django_tenants.utils import schema_context, get_tenant_model
from datetime import datetime
import django.db.models

from apps.inventory.models import InventoryMovement
from apps.inventory.services import InventoryFinanceIntegrationService


class Command(BaseCommand):
    help = "Cria CostTransaction para InventoryMovement de saída existentes (backfill)"

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Apenas mostra o que seria feito, sem criar transações",
        )
        parser.add_argument(
            "--tenant",
            type=str,
            help="Schema do tenant específico (ex: umc). Se não informado, processa todos.",
        )
        parser.add_argument(
            "--since",
            type=str,
            help="Data inicial (YYYY-MM-DD). Se não informado, processa todas.",
        )
        parser.add_argument(
            "--limit",
            type=int,
            default=1000,
            help="Máximo de movimentações a processar (default: 1000)",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        tenant_schema = options.get("tenant")
        since_str = options.get("since")
        limit = options["limit"]

        if dry_run:
            self.stdout.write(self.style.WARNING("=== DRY RUN - Nenhuma alteração será feita ==="))

        TenantModel = get_tenant_model()

        if tenant_schema:
            # Processar apenas um tenant
            try:
                tenant = TenantModel.objects.get(schema_name=tenant_schema)
                self._process_tenant(tenant, dry_run, since_str, limit)
            except TenantModel.DoesNotExist:
                self.stdout.write(self.style.ERROR(f"Tenant '{tenant_schema}' não encontrado"))
                return
        else:
            # Processar todos os tenants (exceto public)
            tenants = TenantModel.objects.exclude(schema_name="public")
            for tenant in tenants:
                self._process_tenant(tenant, dry_run, since_str, limit)

        self.stdout.write(self.style.SUCCESS("✅ Backfill concluído!"))

    def _process_tenant(self, tenant, dry_run, since_str, limit):
        """Processa um tenant específico"""
        from django.db import connection

        with schema_context(tenant.schema_name):
            self.stdout.write(
                self.style.WARNING(f"\n📍 Processando tenant: {tenant.schema_name} ({tenant.name})")
            )

            # Filtrar movimentações (IN, OUT, ADJUSTMENT geram transação)
            queryset = InventoryMovement.objects.filter(
                type__in=[
                    InventoryMovement.MovementType.IN,  # Compras = custo (Lançamentos)
                    InventoryMovement.MovementType.OUT,  # Consumo = uso operacional (Operação)
                    InventoryMovement.MovementType.ADJUSTMENT,  # Ajustes
                ]
            )

            # Filtrar por data se informado
            if since_str:
                try:
                    since_date = datetime.fromisoformat(since_str).date()
                    queryset = queryset.filter(created_at__date__gte=since_date)
                    self.stdout.write(f"   Filtrando desde: {since_date}")
                except ValueError:
                    self.stdout.write(self.style.ERROR(f"   Data inválida: {since_str}"))
                    return

            # Limitar
            queryset = queryset.order_by("created_at")[: limit]

            total = queryset.count()
            self.stdout.write(f"   Total de movimentações: {total}")

            if total == 0:
                self.stdout.write("   ℹ️ Nenhuma movimentação para processar")
                return

            # Processar
            created_count = 0
            skipped_count = 0
            error_count = 0

            for i, movement in enumerate(queryset, 1):
                try:
                    # Tentar criar CostTransaction
                    cost_txn = InventoryFinanceIntegrationService.create_cost_transaction_for_movement(
                        movement
                    )

                    if cost_txn:
                        created_count += 1
                        if not dry_run:
                            self.stdout.write(f"   [{i}/{total}] ✅ Criada para {movement.id}")
                        else:
                            self.stdout.write(
                                f"   [{i}/{total}] (dry-run) Criaria para {movement.id}"
                            )
                    else:
                        skipped_count += 1
                        if i % 10 == 0:  # Log a cada 10 skipped
                            self.stdout.write(f"   [{i}/{total}] ⏭️ Pulada (não deve gerar custo)")

                except Exception as e:
                    error_count += 1
                    self.stdout.write(
                        self.style.ERROR(f"   [{i}/{total}] ❌ Erro para {movement.id}: {e}")
                    )

            # Resumo
            self.stdout.write("\n" + "=" * 60)
            self.stdout.write(self.style.SUCCESS(f"   Criadas:  {created_count}"))
            self.stdout.write(f"   Puladas:  {skipped_count}")
            if error_count > 0:
                self.stdout.write(self.style.ERROR(f"   Erros:    {error_count}"))
            self.stdout.write("=" * 60)

            # Verificar duplicatas
            from apps.trakledger.models import CostTransaction

            duplicates = (
                CostTransaction.objects
                .values("idempotency_key")
                .annotate(count=django.db.models.Count("id"))
                .filter(count__gt=1, idempotency_key__startswith="inventory_movement:")
            )

            if duplicates.count() > 0:
                self.stdout.write(
                    self.style.ERROR(f"   ⚠️ Encontradas {duplicates.count()} chaves duplicadas!")
                )
                for dup in duplicates:
                    self.stdout.write(
                        f"      {dup['idempotency_key']}: {dup['count']} transações"
                    )
            else:
                self.stdout.write(self.style.SUCCESS("   ✅ Sem duplicatas encontradas"))

