"""
URLs para Locations
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    CompanyViewSet,
    SectorViewSet,
    SubsectionViewSet,
    LocationContactViewSet
)


router = DefaultRouter()
router.register(r'companies', CompanyViewSet, basename='company')
router.register(r'sectors', SectorViewSet, basename='sector')
router.register(r'subsections', SubsectionViewSet, basename='subsection')
router.register(r'contacts', LocationContactViewSet, basename='location-contact')


urlpatterns = [
    path('', include(router.urls)),
]
