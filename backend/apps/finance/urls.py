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
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CostCenterViewSet,
    RateCardViewSet,
    BudgetPlanViewSet,
    BudgetEnvelopeViewSet,
    BudgetMonthViewSet,
    CostTransactionViewSet,
    LedgerAdjustmentViewSet,
    CommitmentViewSet,
)

router = DefaultRouter()
router.register(r'cost-centers', CostCenterViewSet, basename='cost-center')
router.register(r'rate-cards', RateCardViewSet, basename='rate-card')
router.register(r'budget-plans', BudgetPlanViewSet, basename='budget-plan')
router.register(r'budget-envelopes', BudgetEnvelopeViewSet, basename='budget-envelope')
router.register(r'budget-months', BudgetMonthViewSet, basename='budget-month')
router.register(r'transactions', CostTransactionViewSet, basename='cost-transaction')
router.register(r'adjustments', LedgerAdjustmentViewSet, basename='ledger-adjustment')
router.register(r'commitments', CommitmentViewSet, basename='commitment')

urlpatterns = [
    path('', include(router.urls)),
]
