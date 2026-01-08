"""
URLs para CMMS
"""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    ChecklistCategoryViewSet,
    ChecklistTemplateViewSet,
    ExternalCostAttachmentViewSet,
    ExternalCostViewSet,
    MaintenancePlanViewSet,
    PartUsageViewSet,
    ProcedureCategoryViewSet,
    ProcedureViewSet,
    ReportsViewSet,
    RequestViewSet,
    TimeEntryViewSet,
    WorkOrderCostSummaryViewSet,
    WorkOrderViewSet,
)

router = DefaultRouter()
router.register(
    r"checklist-categories", ChecklistCategoryViewSet, basename="checklist-category"
)
router.register(
    r"checklist-templates", ChecklistTemplateViewSet, basename="checklist-template"
)
router.register(r"work-orders", WorkOrderViewSet, basename="work-order")
router.register(r"requests", RequestViewSet, basename="request")
router.register(r"plans", MaintenancePlanViewSet, basename="plan")
router.register(
    r"procedure-categories", ProcedureCategoryViewSet, basename="procedure-category"
)
router.register(r"procedures", ProcedureViewSet, basename="procedure")

# Cost components (CMMS-001)
router.register(r"time-entries", TimeEntryViewSet, basename="time-entry")
router.register(r"part-usages", PartUsageViewSet, basename="part-usage")
router.register(r"external-costs", ExternalCostViewSet, basename="external-cost")
router.register(
    r"external-cost-attachments",
    ExternalCostAttachmentViewSet,
    basename="external-cost-attachment",
)
router.register(
    r"work-order-costs", WorkOrderCostSummaryViewSet, basename="work-order-cost"
)

# Reports (PMOC e outros)
router.register(r"reports", ReportsViewSet, basename="reports")


urlpatterns = [
    path("", include(router.urls)),
]
