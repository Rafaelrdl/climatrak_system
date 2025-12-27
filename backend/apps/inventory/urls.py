"""
URLs para Inventory
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    InventoryCategoryViewSet,
    InventoryItemViewSet,
    InventoryMovementViewSet,
    InventoryCountViewSet
)


router = DefaultRouter()
router.register(r'categories', InventoryCategoryViewSet, basename='inventory-category')
router.register(r'items', InventoryItemViewSet, basename='inventory-item')
router.register(r'movements', InventoryMovementViewSet, basename='inventory-movement')
router.register(r'counts', InventoryCountViewSet, basename='inventory-count')


urlpatterns = [
    path('', include(router.urls)),
]
