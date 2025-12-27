"""
URLs para a API REST do catálogo de ativos.

Este módulo configura as rotas da API usando Django REST Framework Router.

Endpoints disponíveis:
    /api/sites/ - CRUD de sites
    /api/assets/ - CRUD de assets
    /api/devices/ - CRUD de devices
    /api/sensors/ - CRUD de sensors
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import SiteViewSet, AssetViewSet, DeviceViewSet, SensorViewSet

# Configuração do router
router = DefaultRouter()
router.register(r'sites', SiteViewSet, basename='site')
router.register(r'assets', AssetViewSet, basename='asset')
router.register(r'devices', DeviceViewSet, basename='device')
router.register(r'sensors', SensorViewSet, basename='sensor')

# URLs da aplicação
app_name = 'assets'
urlpatterns = [
    path('', include(router.urls)),
]
