"""
TrakService Services

Business logic layer for TrakService operations.
Following the service layer pattern: views delegate to services.

This module will contain:
- DispatchService: Job assignment and scheduling logic
- RoutingService: Route optimization algorithms
- TrackingService: GPS location processing
- QuoteService: Quote generation and management
"""

import logging
from typing import Any, Dict, List, Optional

from django.db import connection

from apps.tenants.features import get_tenant_features

logger = logging.getLogger(__name__)


class TrakServiceBaseService:
    """
    Base service class for TrakService operations.

    Provides common functionality like feature checks and event publishing.
    """

    @classmethod
    def get_tenant_id(cls) -> Optional[int]:
        """Get current tenant ID from connection."""
        tenant = getattr(connection, "tenant", None)
        if tenant:
            return tenant.id
        return None

    @classmethod
    def get_enabled_features(cls) -> List[str]:
        """Get list of enabled TrakService features for current tenant."""
        tenant_id = cls.get_tenant_id()
        if not tenant_id:
            return []

        features = get_tenant_features(tenant_id)
        enabled = []

        trakservice_keys = [
            "trakservice.enabled",
            "trakservice.dispatch",
            "trakservice.tracking",
            "trakservice.routing",
            "trakservice.km",
            "trakservice.quotes",
        ]

        for key in trakservice_keys:
            if features.get(key, False):
                enabled.append(key)

        return enabled


class TrakServiceMetaService(TrakServiceBaseService):
    """Service for TrakService module metadata and health checks."""

    MODULE_VERSION = "1.0.0"

    @classmethod
    def get_meta(cls) -> Dict[str, Any]:
        """Get TrakService module metadata."""
        tenant_id = cls.get_tenant_id()
        features = get_tenant_features(tenant_id) if tenant_id else {}

        trakservice_features = {
            k: v for k, v in features.items() if k.startswith("trakservice.")
        }

        return {
            "module": "trakservice",
            "version": cls.MODULE_VERSION,
            "features": trakservice_features,
            "status": "operational",
        }

    @classmethod
    def get_health(cls) -> Dict[str, Any]:
        """Get TrakService health status."""
        from django.utils import timezone

        return {
            "status": "healthy",
            "timestamp": timezone.now(),
            "tenant_id": cls.get_tenant_id(),
            "features_enabled": cls.get_enabled_features(),
        }


class DispatchService(TrakServiceBaseService):
    """
    Service for job dispatch and scheduling operations.
    
    Business logic for:
    - Creating and managing technician profiles
    - Assigning work orders to technicians
    - Managing assignment status transitions
    - Validating scheduling conflicts
    """

    @classmethod
    def create_assignment(
        cls,
        work_order,
        technician,
        scheduled_date,
        scheduled_start=None,
        scheduled_end=None,
        notes="",
        created_by=None,
    ):
        """
        Create a new service assignment.
        
        Args:
            work_order: WorkOrder instance
            technician: TechnicianProfile instance
            scheduled_date: Date for the assignment
            scheduled_start: Optional start time
            scheduled_end: Optional end time
            notes: Optional notes
            created_by: User who created the assignment
            
        Returns:
            ServiceAssignment instance
            
        Raises:
            ValueError: If validation fails
        """
        from .models import ServiceAssignment
        
        # Validate work order status
        if work_order.status in ["COMPLETED", "CANCELLED"]:
            raise ValueError("Não é possível atribuir uma OS já concluída ou cancelada.")
        
        # Validate technician is active
        if not technician.is_active:
            raise ValueError("Este técnico não está ativo.")
        
        # Create assignment
        assignment = ServiceAssignment.objects.create(
            work_order=work_order,
            technician=technician,
            scheduled_date=scheduled_date,
            scheduled_start=scheduled_start,
            scheduled_end=scheduled_end,
            notes=notes,
            created_by=created_by,
        )
        
        logger.info(
            f"Assignment created: {assignment.id} - "
            f"WO {work_order.number} → {technician}"
        )
        
        return assignment

    @classmethod
    def get_technician_schedule(cls, technician_id, date_from, date_to):
        """
        Get a technician's schedule for a date range.
        
        Args:
            technician_id: UUID of the technician
            date_from: Start date
            date_to: End date
            
        Returns:
            QuerySet of ServiceAssignment
        """
        from .models import ServiceAssignment
        
        return ServiceAssignment.objects.filter(
            technician_id=technician_id,
            scheduled_date__gte=date_from,
            scheduled_date__lte=date_to,
        ).exclude(
            status=ServiceAssignment.Status.CANCELED
        ).order_by("scheduled_date", "scheduled_start")

    @classmethod
    def get_daily_summary(cls, date):
        """
        Get summary statistics for a specific date.
        
        Args:
            date: Date to summarize
            
        Returns:
            Dict with counts by status
        """
        from django.db.models import Count
        from .models import ServiceAssignment
        
        stats = ServiceAssignment.objects.filter(
            scheduled_date=date
        ).values("status").annotate(count=Count("id"))
        
        summary = {
            "total": 0,
            "scheduled": 0,
            "en_route": 0,
            "on_site": 0,
            "done": 0,
            "canceled": 0,
        }
        
        for stat in stats:
            summary[stat["status"]] = stat["count"]
            if stat["status"] != "canceled":
                summary["total"] += stat["count"]
        
        return summary


class RoutingService(TrakServiceBaseService):
    """Service for route optimization operations."""

    pass


class TrackingService(TrakServiceBaseService):
    """Service for GPS tracking operations."""

    pass


class QuoteService(TrakServiceBaseService):
    """Service for quote/estimate operations."""

    pass
