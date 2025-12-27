"""
Finance URLs

Configuração de rotas da API Finance.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CostCenterViewSet,
    RateCardViewSet,
    BudgetPlanViewSet,
    BudgetEnvelopeViewSet,
    BudgetMonthViewSet,
)

router = DefaultRouter()
router.register(r'cost-centers', CostCenterViewSet, basename='cost-center')
router.register(r'rate-cards', RateCardViewSet, basename='rate-card')
router.register(r'budget-plans', BudgetPlanViewSet, basename='budget-plan')
router.register(r'budget-envelopes', BudgetEnvelopeViewSet, basename='budget-envelope')
router.register(r'budget-months', BudgetMonthViewSet, basename='budget-month')

urlpatterns = [
    path('', include(router.urls)),
]
