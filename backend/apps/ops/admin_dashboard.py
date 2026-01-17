"""
ClimaTrak Admin Dashboard

Dashboard customizado para o Django Admin com Unfold.
Exibe cards e métricas relevantes por domínio, respeitando permissões do usuário.

IMPORTANTE: Multi-tenant safety
- Todas as queries usam o schema do tenant atual (via django-tenants middleware)
- Dados NUNCA são cacheados entre tenants
- Cada card verifica permissões antes de exibir dados

Configuração no settings:
    UNFOLD = {
        ...
        "DASHBOARD_CALLBACK": "apps.ops.admin_dashboard.dashboard_callback",
    }
"""

from django.db.models import Count, F, Q, Sum
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

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
            "icon": "clipboard-list",
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
            "icon": "wrench",
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
                "icon": "package",
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
                "icon": "alert-triangle",
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
                "icon": "package-x",
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
            "icon": "boxes",
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
                "icon": "alert-octagon",
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
                "icon": "bell-ring",
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
                "icon": "wallet",
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
                "icon": "calendar-check",
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
                "icon": "truck",
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
                "icon": "clock",
                "color": "warning",
            })

    except Exception:
        pass

    return cards


def dashboard_callback(request, context):
    """
    Callback principal do dashboard do Unfold.

    Esta função é chamada pelo Unfold para popular o dashboard com cards.
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

    # Links rápidos por permissão
    quick_links = []

    if request.user.has_perm("cmms.add_workorder"):
        quick_links.append({
            "title": _("Nova OS"),
            "url": "/admin/cmms/workorder/add/",
            "icon": "plus-circle",
        })

    if request.user.has_perm("inventory.add_inventorymovement"):
        quick_links.append({
            "title": _("Nova Movimentação"),
            "url": "/admin/inventory/inventorymovement/add/",
            "icon": "package-plus",
        })

    if request.user.has_perm("alerts.change_alert"):
        quick_links.append({
            "title": _("Reconhecer Alertas"),
            "url": "/admin/alerts/alert/?is_acknowledged__exact=0",
            "icon": "check-circle",
        })

    context["quick_links"] = quick_links

    return context
