"""
URLs para o sistema de Alertas e Regras
"""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import AlertViewSet, NotificationPreferenceViewSet, RuleViewSet

router = DefaultRouter()
router.register(r"rules", RuleViewSet, basename="rule")
router.register(r"alerts", AlertViewSet, basename="alert")
router.register(
    r"notification-preferences",
    NotificationPreferenceViewSet,
    basename="notification-preference",
)

app_name = "alerts"

urlpatterns = [
    path("", include(router.urls)),
]
