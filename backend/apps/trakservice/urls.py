"""
TrakService URLs

URL configuration for TrakService API endpoints.
Base path: /api/trakservice/
"""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import TrakServiceHealthView, TrakServiceMetaView

# Router for ViewSet-based endpoints
router = DefaultRouter()

# Register ViewSets here as they are implemented
# router.register(r'jobs', ServiceJobViewSet, basename='service-job')
# router.register(r'routes', ServiceRouteViewSet, basename='service-route')
# router.register(r'tracking', TrackingViewSet, basename='tracking')
# router.register(r'quotes', QuoteViewSet, basename='quote')
# router.register(r'mileage', MileageViewSet, basename='mileage')

urlpatterns = [
    # Module metadata and health endpoints
    path("_meta/", TrakServiceMetaView.as_view(), name="trakservice-meta"),
    path("_health/", TrakServiceHealthView.as_view(), name="trakservice-health"),
    # ViewSet routes
    path("", include(router.urls)),
]
