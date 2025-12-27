"""
URLs para CMMS
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    ChecklistCategoryViewSet,
    ChecklistTemplateViewSet,
    WorkOrderViewSet,
    RequestViewSet,
    MaintenancePlanViewSet,
    ProcedureCategoryViewSet,
    ProcedureViewSet
)


router = DefaultRouter()
router.register(r'checklist-categories', ChecklistCategoryViewSet, basename='checklist-category')
router.register(r'checklist-templates', ChecklistTemplateViewSet, basename='checklist-template')
router.register(r'work-orders', WorkOrderViewSet, basename='work-order')
router.register(r'requests', RequestViewSet, basename='request')
router.register(r'plans', MaintenancePlanViewSet, basename='plan')
router.register(r'procedure-categories', ProcedureCategoryViewSet, basename='procedure-category')
router.register(r'procedures', ProcedureViewSet, basename='procedure')


urlpatterns = [
    path('', include(router.urls)),
]
