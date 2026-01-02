"""
Finance URLs

Configuração de rotas da API Finance.

Endpoints:
- /api/finance/cost-centers/ - Centros de Custo
- /api/finance/rate-cards/ - Tabelas de Custo
- /api/finance/budget-plans/ - Planos Orçamentários
- /api/finance/budget-envelopes/ - Envelopes de Orçamento
- /api/finance/budget-months/ - Meses do Orçamento
- /api/finance/transactions/ - Transações de Custo (Ledger)
- /api/finance/adjustments/ - Ajustes de Ledger
- /api/finance/commitments/ - Compromissos de Orçamento
- /api/finance/savings-events/ - Eventos de Economia
- /api/finance/budget-summary/ - Summary Mensal de Orçamento

V2 Endpoints:
- /api/finance/energy-tariffs/ - Tarifas de Energia
- /api/finance/energy-readings/ - Leituras de Energia
- /api/finance/baselines/ - Baselines para Savings Automático
- /api/finance/risk-snapshots/ - Snapshots de Risco
- /api/finance/bar/ - Budget-at-Risk
"""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import BudgetPlanViewSet  # V2
from .views import (
    BARViewSet,
    BaselineViewSet,
    BudgetEnvelopeViewSet,
    BudgetMonthViewSet,
    BudgetSummaryViewSet,
    CommitmentViewSet,
    CostCenterViewSet,
    CostTransactionViewSet,
    EnergyReadingViewSet,
    EnergyTariffViewSet,
    LedgerAdjustmentViewSet,
    RateCardViewSet,
    RiskSnapshotViewSet,
    SavingsEventViewSet,
)

router = DefaultRouter()
router.register(r"cost-centers", CostCenterViewSet, basename="cost-center")
router.register(r"rate-cards", RateCardViewSet, basename="rate-card")
router.register(r"budget-plans", BudgetPlanViewSet, basename="budget-plan")
router.register(r"budget-envelopes", BudgetEnvelopeViewSet, basename="budget-envelope")
router.register(r"budget-months", BudgetMonthViewSet, basename="budget-month")
router.register(r"transactions", CostTransactionViewSet, basename="cost-transaction")
router.register(r"adjustments", LedgerAdjustmentViewSet, basename="ledger-adjustment")
router.register(r"commitments", CommitmentViewSet, basename="commitment")
router.register(r"savings-events", SavingsEventViewSet, basename="savings-event")
router.register(r"budget-summary", BudgetSummaryViewSet, basename="budget-summary")

# V2 (M4/M5)
router.register(r"energy-tariffs", EnergyTariffViewSet, basename="energy-tariff")
router.register(r"energy-readings", EnergyReadingViewSet, basename="energy-reading")
router.register(r"baselines", BaselineViewSet, basename="baseline")
router.register(r"risk-snapshots", RiskSnapshotViewSet, basename="risk-snapshot")
router.register(r"bar", BARViewSet, basename="bar")

urlpatterns = [
    path("", include(router.urls)),
]
