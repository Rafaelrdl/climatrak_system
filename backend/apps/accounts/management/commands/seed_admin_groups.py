"""
Management command para criar grupos e permissões padrão do admin.

Cria grupos com permissões granulares para:
- CMMS Admin: gestão completa de ordens de serviço, planos, ativos
- Inventory Admin: gestão de estoque, movimentações
- Finance ReadOnly: visualização de ledger, relatórios financeiros
- Finance Admin: visualização + ações de lock/adjustment
- Ops Admin: acesso a eventos/outbox, logs, health checks
- Support ReadOnly: visualização geral para suporte (sem edição)

Uso:
    python manage.py seed_admin_groups
    python manage.py seed_admin_groups --tenant=umc  # Apenas em tenant específico
"""

from django.core.management.base import BaseCommand
from django.contrib.auth.models import Group, Permission
from django.contrib.contenttypes.models import ContentType
from django_tenants.utils import get_tenant_model, schema_context


# =============================================================================
# DEFINIÇÃO DE GRUPOS E PERMISSÕES
# =============================================================================

ADMIN_GROUPS = {
    "CMMS Admin": {
        "description": "Gestão completa de CMMS (OS, planos, procedimentos)",
        "permissions": [
            # WorkOrder
            ("cmms", "workorder", "view"),
            ("cmms", "workorder", "add"),
            ("cmms", "workorder", "change"),
            ("cmms", "workorder", "delete"),
            # MaintenancePlan
            ("cmms", "maintenanceplan", "view"),
            ("cmms", "maintenanceplan", "add"),
            ("cmms", "maintenanceplan", "change"),
            ("cmms", "maintenanceplan", "delete"),
            # ChecklistTemplate
            ("cmms", "checklisttemplate", "view"),
            ("cmms", "checklisttemplate", "add"),
            ("cmms", "checklisttemplate", "change"),
            ("cmms", "checklisttemplate", "delete"),
            # Request
            ("cmms", "request", "view"),
            ("cmms", "request", "add"),
            ("cmms", "request", "change"),
            # TimeEntry
            ("cmms", "timeentry", "view"),
            ("cmms", "timeentry", "add"),
            # ExternalCost
            ("cmms", "externalcost", "view"),
            ("cmms", "externalcost", "add"),
            ("cmms", "externalcost", "change"),
            # Assets relacionados
            ("assets", "asset", "view"),
            ("assets", "site", "view"),
        ],
    },
    "Inventory Admin": {
        "description": "Gestão de estoque e movimentações",
        "permissions": [
            # InventoryItem
            ("inventory", "inventoryitem", "view"),
            ("inventory", "inventoryitem", "add"),
            ("inventory", "inventoryitem", "change"),
            ("inventory", "inventoryitem", "delete"),
            # InventoryCategory
            ("inventory", "inventorycategory", "view"),
            ("inventory", "inventorycategory", "add"),
            ("inventory", "inventorycategory", "change"),
            # InventoryMovement - apenas view (auditoria)
            ("inventory", "inventorymovement", "view"),
            # InventoryCount
            ("inventory", "inventorycount", "view"),
            ("inventory", "inventorycount", "add"),
            ("inventory", "inventorycount", "change"),
        ],
    },
    "Finance ReadOnly": {
        "description": "Visualização de dados financeiros (ledger, orçamentos)",
        "permissions": [
            # CostTransaction - apenas view
            ("trakledger", "costtransaction", "view"),
            # CostCenter
            ("trakledger", "costcenter", "view"),
            # BudgetPlan
            ("trakledger", "budgetplan", "view"),
            # BudgetEnvelope
            ("trakledger", "budgetenvelope", "view"),
            # BudgetMonth
            ("trakledger", "budgetmonth", "view"),
            # RateCard
            ("trakledger", "ratecard", "view"),
        ],
    },
    "Finance Admin": {
        "description": "Gestão financeira completa (inclui lock, adjustments)",
        "permissions": [
            # CostTransaction
            ("trakledger", "costtransaction", "view"),
            ("trakledger", "costtransaction", "add"),  # Para adjustments
            # CostCenter
            ("trakledger", "costcenter", "view"),
            ("trakledger", "costcenter", "add"),
            ("trakledger", "costcenter", "change"),
            # BudgetPlan
            ("trakledger", "budgetplan", "view"),
            ("trakledger", "budgetplan", "add"),
            ("trakledger", "budgetplan", "change"),
            # BudgetEnvelope
            ("trakledger", "budgetenvelope", "view"),
            ("trakledger", "budgetenvelope", "add"),
            ("trakledger", "budgetenvelope", "change"),
            # BudgetMonth - inclui lock
            ("trakledger", "budgetmonth", "view"),
            ("trakledger", "budgetmonth", "change"),
            # RateCard
            ("trakledger", "ratecard", "view"),
            ("trakledger", "ratecard", "add"),
            ("trakledger", "ratecard", "change"),
        ],
    },
    "Ops Admin": {
        "description": "Acesso a operações do sistema (eventos, logs, health)",
        "permissions": [
            # OutboxEvent
            ("core_events", "outboxevent", "view"),
            # Telemetry/Ingest (se existir)
            ("ingest", "telemetryreading", "view"),
            # Alerts
            ("alerts", "alert", "view"),
            ("alerts", "alertrule", "view"),
            ("alerts", "alertrule", "change"),
        ],
    },
    "Support ReadOnly": {
        "description": "Visualização geral para equipe de suporte",
        "permissions": [
            # CMMS - view only
            ("cmms", "workorder", "view"),
            ("cmms", "maintenanceplan", "view"),
            ("cmms", "request", "view"),
            # Assets - view only
            ("assets", "asset", "view"),
            ("assets", "site", "view"),
            ("assets", "device", "view"),
            ("assets", "sensor", "view"),
            # Inventory - view only
            ("inventory", "inventoryitem", "view"),
            ("inventory", "inventorymovement", "view"),
            # Finance - view only
            ("trakledger", "costtransaction", "view"),
            ("trakledger", "costcenter", "view"),
            # Users - view only
            ("accounts", "user", "view"),
        ],
    },
}


class Command(BaseCommand):
    help = "Cria grupos e permissões padrão para o Django Admin"

    def add_arguments(self, parser):
        parser.add_argument(
            "--tenant",
            type=str,
            help="Schema do tenant onde criar os grupos (default: todos)",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Apenas mostra o que seria criado sem executar",
        )

    def handle(self, *args, **options):
        tenant_slug = options.get("tenant")
        dry_run = options.get("dry_run", False)

        if dry_run:
            self.stdout.write(self.style.WARNING("🔍 DRY RUN - Nenhuma alteração será feita"))
            self._show_groups_preview()
            return

        if tenant_slug:
            # Executar em tenant específico
            TenantModel = get_tenant_model()
            try:
                tenant = TenantModel.objects.get(schema_name=tenant_slug)
                self._seed_groups_for_tenant(tenant)
            except TenantModel.DoesNotExist:
                self.stderr.write(self.style.ERROR(f"❌ Tenant '{tenant_slug}' não encontrado"))
                return
        else:
            # Executar em todos os tenants (exceto public)
            TenantModel = get_tenant_model()
            tenants = TenantModel.objects.exclude(schema_name="public")
            
            if not tenants.exists():
                self.stdout.write(self.style.WARNING("⚠️ Nenhum tenant encontrado"))
                return
            
            for tenant in tenants:
                self._seed_groups_for_tenant(tenant)

        self.stdout.write(self.style.SUCCESS("\n✅ Seed de grupos concluído!"))

    def _show_groups_preview(self):
        """Mostra preview dos grupos que seriam criados."""
        for group_name, config in ADMIN_GROUPS.items():
            self.stdout.write(f"\n📦 {group_name}")
            self.stdout.write(f"   {config['description']}")
            self.stdout.write(f"   Permissões: {len(config['permissions'])}")
            for app, model, action in config["permissions"][:5]:
                self.stdout.write(f"     - {app}.{action}_{model}")
            if len(config["permissions"]) > 5:
                self.stdout.write(f"     ... e mais {len(config['permissions']) - 5}")

    def _seed_groups_for_tenant(self, tenant):
        """Cria grupos e permissões para um tenant específico."""
        self.stdout.write(f"\n🏢 Processando tenant: {tenant.schema_name}")
        
        with schema_context(tenant.schema_name):
            for group_name, config in ADMIN_GROUPS.items():
                group, created = Group.objects.get_or_create(name=group_name)
                
                if created:
                    self.stdout.write(f"   ✅ Grupo criado: {group_name}")
                else:
                    self.stdout.write(f"   ⏭️  Grupo existe: {group_name}")
                
                # Adicionar permissões
                permissions_added = 0
                for app_label, model_name, action in config["permissions"]:
                    try:
                        ct = ContentType.objects.get(
                            app_label=app_label,
                            model=model_name,
                        )
                        codename = f"{action}_{model_name}"
                        perm = Permission.objects.get(
                            content_type=ct,
                            codename=codename,
                        )
                        if perm not in group.permissions.all():
                            group.permissions.add(perm)
                            permissions_added += 1
                    except (ContentType.DoesNotExist, Permission.DoesNotExist):
                        # Modelo pode não existir neste tenant
                        pass
                
                if permissions_added > 0:
                    self.stdout.write(f"      + {permissions_added} permissões adicionadas")
