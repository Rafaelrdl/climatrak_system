"""
URLs para Locations

Hierarquia: Company > Unit > Sector > Subsection
"""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    CompanyViewSet,
    LocationContactViewSet,
    SectorViewSet,
    SubsectionViewSet,
    UnitViewSet,
)

router = DefaultRouter()
router.register(r"companies", CompanyViewSet, basename="company")
router.register(r"units", UnitViewSet, basename="unit")
router.register(r"sectors", SectorViewSet, basename="sector")
router.register(r"subsections", SubsectionViewSet, basename="subsection")
router.register(r"contacts", LocationContactViewSet, basename="location-contact")


urlpatterns = [
    path("", include(router.urls)),
]
