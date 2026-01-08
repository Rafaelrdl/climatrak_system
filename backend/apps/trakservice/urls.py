"""
TrakService URLs

URL configuration for TrakService API endpoints.
Base path: /api/trakservice/
"""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    LocationPingView,
    ServiceAssignmentViewSet,
    TechnicianLocationView,
    TechnicianProfileViewSet,
    TrakServiceHealthView,
    TrakServiceMetaView,
)

# Router for ViewSet-based endpoints
router = DefaultRouter()

# Dispatch (trakservice.dispatch)
router.register(r"technicians", TechnicianProfileViewSet, basename="technician")
router.register(r"assignments", ServiceAssignmentViewSet, basename="assignment")

# Future features
# router.register(r'routes', ServiceRouteViewSet, basename='service-route')
# router.register(r'quotes', QuoteViewSet, basename='quote')
# router.register(r'mileage', MileageViewSet, basename='mileage')

urlpatterns = [
    # Module metadata and health endpoints
    path("_meta/", TrakServiceMetaView.as_view(), name="trakservice-meta"),
    path("_health/", TrakServiceHealthView.as_view(), name="trakservice-health"),
    
    # Tracking endpoints (trakservice.tracking)
    path("location/pings/", LocationPingView.as_view(), name="location-ping"),
    path(
        "technicians/<uuid:technician_id>/location/latest/",
        TechnicianLocationView.as_view(),
        name="technician-location-latest",
    ),
    path(
        "technicians/<uuid:technician_id>/location/",
        TechnicianLocationView.as_view(),
        name="technician-location-trail",
    ),
    
    # ViewSet routes
    path("", include(router.urls)),
]
