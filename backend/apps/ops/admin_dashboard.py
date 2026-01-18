"""
ClimaTrak Admin Dashboard

Dashboard customizado para o Django Admin com Jazzmin (AdminLTE).
Exibe cards e métricas relevantes por domínio, respeitando permissões do usuário.

IMPORTANTE: Multi-tenant safety
- Todas as queries usam o schema do tenant atual (via django-tenants middleware)
- Dados NUNCA são cacheados entre tenants
- Cada card verifica permissões antes de exibir dados

O dashboard é integrado via ClimaTrakAdminSite.index() que chama dashboard_callback().
"""

from django.db.models import Count, F, Q, Sum
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

# Mapeamento de ícones Material Symbols → FontAwesome
# Usado para compatibilidade com templates que ainda usam os nomes antigos
ICON_MAP = {
    # CMMS
    "assignment": "clipboard-list",
    "build": "wrench",
    "inventory_2": "boxes",
    "warning": "exclamation-triangle",
    # Alerts
    "notifications": "bell",
    "error": "times-circle",
    # Finance
    "account_balance_wallet": "wallet",
    "event_available": "calendar-check",
    # TrakService
    "local_shipping": "truck",
    "schedule": "clock",
    # Quick links
    "add_circle": "plus-circle",
    "add_box": "plus-square",
    "check_circle": "check-circle",
}

# Importações condicionais - falha silenciosamente se app não existir
try:
    from apps.cmms.models import WorkOrder, MaintenancePlan

    CMMS_AVAILABLE = True
except ImportError:
    CMMS_AVAILABLE = False

try:
    from apps.inventory.models import InventoryItem

    INVENTORY_AVAILABLE = True
except ImportError:
    INVENTORY_AVAILABLE = False

try:
    from apps.alerts.models import Alert

    ALERTS_AVAILABLE = True
except ImportError:
    ALERTS_AVAILABLE = False

try:
    from apps.trakledger.models import Transaction, BudgetMonth

    TRAKLEDGER_AVAILABLE = True
except ImportError:
    TRAKLEDGER_AVAILABLE = False

try:
    from apps.trakservice.models import ServiceAssignment

    TRAKSERVICE_AVAILABLE = True
except ImportError:
    TRAKSERVICE_AVAILABLE = False


def _format_number(value: int | float) -> str:
    """Formata número para exibição (com separador de milhar)."""
    if isinstance(value, float):
        return f"{value:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
    return f"{value:,}".replace(",", ".")


def _normalize_icon(icon_name: str) -> str:
    """Converte nome de ícone legado para Material Symbols."""
    return ICON_MAP.get(icon_name, icon_name)


def _get_cmms_cards(request) -> list:
    """Retorna cards do domínio CMMS (Manutenção)."""
    if not CMMS_AVAILABLE:
        return []

    if not request.user.has_perm("cmms.view_workorder"):
        return []

    cards = []
    today = timezone.now().date()

    # Contagem de OS por status
    try:
        wo_stats = (
            WorkOrder.objects.values("status")
            .annotate(count=Count("id"))
            .order_by()
        )
        status_map = {s["status"]: s["count"] for s in wo_stats}

        open_count = status_map.get("open", 0)
        in_progress = status_map.get("in_progress", 0)
        pending_parts = status_map.get("pending_parts", 0)

        # Card: OS Abertas
        cards.append({
            "title": _("OS Abertas"),
            "metric": _format_number(open_count),
            "footer": {
                "link": "/admin/cmms/workorder/?status=open",
                "label": _("Ver todas")
            },
            "icon": "assignment",
            "color": "primary" if open_count < 10 else "warning",
        })

        # Card: OS Em Andamento
        cards.append({
            "title": _("Em Andamento"),
            "metric": _format_number(in_progress),
            "footer": {
                "link": "/admin/cmms/workorder/?status=in_progress",
                "label": _("Ver detalhes")
            },
            "icon": "build",
            "color": "info",
        })

        # Card: Aguardando Peças
        if pending_parts > 0:
            cards.append({
                "title": _("Aguardando Peças"),
                "metric": _format_number(pending_parts),
                "footer": {
                    "link": "/admin/cmms/workorder/?status=pending_parts",
                    "label": _("Verificar")
                },
                "icon": "inventory_2",
                "color": "warning",
            })

        # Card: OS Atrasadas (vencidas)
        overdue = WorkOrder.objects.filter(
            status__in=["open", "in_progress", "pending_parts"],
            due_date__lt=today,
        ).count()

        if overdue > 0:
            cards.append({
                "title": _("OS Atrasadas"),
                "metric": _format_number(overdue),
                "footer": {
                    "link": f"/admin/cmms/workorder/?status__in=open,in_progress,pending_parts&due_date__lt={today}",
                    "label": _("URGENTE")
                },
                "icon": "warning",
                "color": "danger",
            })

    except Exception:
        # Falha silenciosa - não quebrar o dashboard
        pass

    return cards


def _get_inventory_cards(request) -> list:
    """Retorna cards do domínio Inventário."""
    if not INVENTORY_AVAILABLE:
        return []

    if not request.user.has_perm("inventory.view_inventoryitem"):
        return []

    cards = []

    try:
        # Itens abaixo do estoque mínimo
        low_stock = InventoryItem.objects.filter(
            quantity__lt=F("minimum_quantity"),
            is_active=True,
        ).count()

        if low_stock > 0:
            cards.append({
                "title": _("Estoque Baixo"),
                "metric": _format_number(low_stock),
                "footer": {
                    "link": "/admin/inventory/inventoryitem/?low_stock=true",
                    "label": _("Reabastecer")
                },
                "icon": "inventory_2",
                "color": "warning",
            })

        # Total de itens ativos
        total_items = InventoryItem.objects.filter(is_active=True).count()
        cards.append({
            "title": _("Itens em Estoque"),
            "metric": _format_number(total_items),
            "footer": {
                "link": "/admin/inventory/inventoryitem/",
                "label": _("Gerenciar")
            },
            "icon": "inventory_2",
            "color": "primary",
        })

    except Exception:
        pass

    return cards


def _get_alerts_cards(request) -> list:
    """Retorna cards do domínio Alertas."""
    if not ALERTS_AVAILABLE:
        return []

    if not request.user.has_perm("alerts.view_alert"):
        return []

    cards = []

    try:
        # Alertas ativos (não reconhecidos)
        active_alerts = Alert.objects.filter(
            is_acknowledged=False,
            resolved_at__isnull=True,
        ).count()

        critical_alerts = Alert.objects.filter(
            is_acknowledged=False,
            resolved_at__isnull=True,
            severity="critical",
        ).count()

        if critical_alerts > 0:
            cards.append({
                "title": _("Alertas Críticos"),
                "metric": _format_number(critical_alerts),
                "footer": {
                    "link": "/admin/alerts/alert/?severity=critical&is_acknowledged__exact=0",
                    "label": _("AÇÃO IMEDIATA")
                },
                "icon": "error",
                "color": "danger",
            })
        elif active_alerts > 0:
            cards.append({
                "title": _("Alertas Ativos"),
                "metric": _format_number(active_alerts),
                "footer": {
                    "link": "/admin/alerts/alert/?is_acknowledged__exact=0",
                    "label": _("Verificar")
                },
                "icon": "notifications",
                "color": "warning",
            })

    except Exception:
        pass

    return cards


def _get_finance_cards(request) -> list:
    """Retorna cards do domínio Finance (TrakLedger)."""
    if not TRAKLEDGER_AVAILABLE:
        return []

    if not request.user.has_perm("trakledger.view_transaction"):
        return []

    cards = []
    today = timezone.now().date()

    try:
        # Mês atual - orçamento vs realizado
        current_month = BudgetMonth.objects.filter(
            start_date__lte=today,
            end_date__gte=today,
        ).first()

        if current_month:
            # Não exibir valores monetários específicos no dashboard
            # Apenas indicadores de saúde
            utilization = 0
            if current_month.planned_amount > 0:
                utilization = (
                    current_month.actual_amount / current_month.planned_amount * 100
                )

            color = "success"
            if utilization > 90:
                color = "danger"
            elif utilization > 75:
                color = "warning"

            cards.append({
                "title": _("Utilização Orçamento"),
                "metric": f"{utilization:.0f}%",
                "footer": {
                    "link": "/admin/trakledger/budgetmonth/",
                    "label": current_month.name or _("Ver detalhes")
                },
                "icon": "account_balance_wallet",
                "color": color,
            })

        # Meses locked vs abertos
        locked_months = BudgetMonth.objects.filter(is_locked=True).count()
        open_months = BudgetMonth.objects.filter(is_locked=False).count()

        if open_months > 0:
            cards.append({
                "title": _("Meses Abertos"),
                "metric": _format_number(open_months),
                "footer": {
                    "link": "/admin/trakledger/budgetmonth/?is_locked__exact=0",
                    "label": _("Gerenciar")
                },
                "icon": "event_available",
                "color": "info",
            })

    except Exception:
        pass

    return cards


def _get_trakservice_cards(request) -> list:
    """Retorna cards do domínio TrakService (Field Service)."""
    if not TRAKSERVICE_AVAILABLE:
        return []

    if not request.user.has_perm("trakservice.view_serviceassignment"):
        return []

    cards = []
    today = timezone.now().date()

    try:
        # Atribuições para hoje
        today_assignments = ServiceAssignment.objects.filter(
            scheduled_date=today,
        ).count()

        pending_assignments = ServiceAssignment.objects.filter(
            status="pending",
        ).count()

        if today_assignments > 0:
            cards.append({
                "title": _("Serviços Hoje"),
                "metric": _format_number(today_assignments),
                "footer": {
                    "link": f"/admin/trakservice/serviceassignment/?scheduled_date={today}",
                    "label": _("Ver agenda")
                },
                "icon": "local_shipping",
                "color": "primary",
            })

        if pending_assignments > 0:
            cards.append({
                "title": _("Pendentes"),
                "metric": _format_number(pending_assignments),
                "footer": {
                    "link": "/admin/trakservice/serviceassignment/?status=pending",
                    "label": _("Despachar")
                },
                "icon": "schedule",
                "color": "warning",
            })

    except Exception:
        pass

    return cards


def _get_budget_utilization(request) -> dict | None:
    """Retorna dados de utilização do orçamento para progress bar."""
    if not TRAKLEDGER_AVAILABLE:
        return None

    if not request.user.has_perm("trakledger.view_budgetmonth"):
        return None

    today = timezone.now().date()

    try:
        current_month = BudgetMonth.objects.filter(
            start_date__lte=today,
            end_date__gte=today,
        ).first()

        if not current_month:
            return None

        if current_month.planned_amount <= 0:
            return None

        utilization = (
            current_month.actual_amount / current_month.planned_amount * 100
        )

        if utilization > 100:
            description = _("Orçamento excedido!")
        elif utilization > 90:
            description = _("Atenção: próximo do limite")
        elif utilization > 75:
            description = _("Consumo moderado")
        else:
            description = _("Dentro do planejado")

        return {
            "value": min(utilization, 100),  # Progress bar max 100%
            "month_name": current_month.name or str(current_month),
            "description": description,
        }
    except Exception:
        return None


def _get_operations_table(request) -> dict:
    """Retorna dados para tabela de visão geral de operações."""
    headers = [_("Módulo"), _("Status"), _("Contagem")]
    rows = []

    # CMMS
    if CMMS_AVAILABLE and request.user.has_perm("cmms.view_workorder"):
        try:
            open_wo = WorkOrder.objects.filter(status="open").count()
            in_progress_wo = WorkOrder.objects.filter(status="in_progress").count()
            if open_wo > 0 or in_progress_wo > 0:
                rows.append([_("CMMS"), _("OS Abertas"), str(open_wo)])
                rows.append([_("CMMS"), _("OS Em Andamento"), str(in_progress_wo)])
        except Exception:
            pass

    # Inventory
    if INVENTORY_AVAILABLE and request.user.has_perm("inventory.view_inventoryitem"):
        try:
            low_stock = InventoryItem.objects.filter(
                quantity__lt=F("minimum_quantity"),
                is_active=True,
            ).count()
            if low_stock > 0:
                rows.append([_("Inventário"), _("Estoque Baixo"), str(low_stock)])
        except Exception:
            pass

    # Alerts
    if ALERTS_AVAILABLE and request.user.has_perm("alerts.view_alert"):
        try:
            active_alerts = Alert.objects.filter(
                is_acknowledged=False,
                resolved_at__isnull=True,
            ).count()
            if active_alerts > 0:
                rows.append([_("Alertas"), _("Não Reconhecidos"), str(active_alerts)])
        except Exception:
            pass

    return {"headers": headers, "rows": rows}


def dashboard_callback(request, context):
    """
    Callback principal do dashboard.

    Esta função é chamada pelo ClimaTrakAdminSite.index() para popular 
    o dashboard com cards KPI, quick links e dados de operações.
    Respeita permissões do usuário e não vaza dados entre tenants.

    Args:
        request: HttpRequest do Django
        context: Contexto do template

    Returns:
        Contexto atualizado com cards e dados do dashboard
    """
    # Coletar cards de todos os domínios
    all_cards = []

    # Ordem de prioridade dos cards
    all_cards.extend(_get_alerts_cards(request))  # Alertas primeiro
    all_cards.extend(_get_cmms_cards(request))  # Manutenção
    all_cards.extend(_get_inventory_cards(request))  # Inventário
    all_cards.extend(_get_trakservice_cards(request))  # Field Service
    all_cards.extend(_get_finance_cards(request))  # Finance por último

    # Adicionar cards ao contexto
    context["dashboard_cards"] = all_cards

    # Links rápidos por permissão (ícones Material Symbols)
    quick_links = []

    if request.user.has_perm("cmms.add_workorder"):
        quick_links.append({
            "title": _("Nova OS"),
            "url": "/admin/cmms/workorder/add/",
            "icon": "add_circle",
        })

    if request.user.has_perm("inventory.add_inventorymovement"):
        quick_links.append({
            "title": _("Nova Movimentação"),
            "url": "/admin/inventory/inventorymovement/add/",
            "icon": "add_box",
        })

    if request.user.has_perm("alerts.change_alert"):
        quick_links.append({
            "title": _("Reconhecer Alertas"),
            "url": "/admin/alerts/alert/?is_acknowledged__exact=0",
            "icon": "check_circle",
        })

    context["quick_links"] = quick_links

    # Detectar schema público vs tenant
    is_public_schema = False
    tenant_name = ""

    if hasattr(request, "tenant"):
        tenant = request.tenant
        if hasattr(tenant, "schema_name"):
            is_public_schema = tenant.schema_name == "public"
            tenant_name = getattr(tenant, "name", "") or tenant.schema_name

    context["is_public_schema"] = is_public_schema
    context["tenant_name"] = tenant_name

    # Dados extras para schema público
    if is_public_schema:
        try:
            from apps.tenants.models import Tenant, Domain
            context["tenant_count"] = Tenant.objects.exclude(schema_name="public").count()
            context["domain_count"] = Domain.objects.count()
        except Exception:
            context["tenant_count"] = 0
            context["domain_count"] = 0
    else:
        # Dados extras para tenant específico
        budget_data = _get_budget_utilization(request)
        if budget_data:
            context["budget_utilization"] = budget_data["value"]
            context["budget_month_name"] = budget_data["month_name"]
            context["budget_description"] = budget_data["description"]

        # Tabela de operações
        context["table_data"] = _get_operations_table(request)

    return context
