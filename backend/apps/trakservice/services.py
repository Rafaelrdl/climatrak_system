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
    """
    Service for route optimization and KM tracking operations.
    
    Business logic for:
    - Generating daily routes for technicians
    - Finding nearest technician to a location
    - Calculating estimated and actual KM
    - Optimizing stop sequences (MVP: simple ordering)
    """
    
    # Earth radius in km for haversine formula
    EARTH_RADIUS_KM = 6371.0
    
    @classmethod
    def haversine_distance(
        cls,
        lat1: float,
        lon1: float,
        lat2: float,
        lon2: float,
    ) -> float:
        """
        Calculate the great circle distance between two points on Earth.
        
        Uses the Haversine formula for accurate distance calculation.
        
        Args:
            lat1, lon1: First point coordinates (degrees)
            lat2, lon2: Second point coordinates (degrees)
            
        Returns:
            Distance in kilometers
        """
        import math
        
        # Convert to radians
        lat1_rad = math.radians(float(lat1))
        lat2_rad = math.radians(float(lat2))
        delta_lat = math.radians(float(lat2) - float(lat1))
        delta_lon = math.radians(float(lon2) - float(lon1))
        
        # Haversine formula
        a = (
            math.sin(delta_lat / 2) ** 2 +
            math.cos(lat1_rad) * math.cos(lat2_rad) *
            math.sin(delta_lon / 2) ** 2
        )
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        
        return cls.EARTH_RADIUS_KM * c
    
    @classmethod
    def generate_route(
        cls,
        technician,
        route_date,
        start_lat=None,
        start_lon=None,
        start_address="",
        created_by=None,
    ):
        """
        Generate a daily route for a technician.
        
        Collects all assignments for the date and creates an optimized
        route with stops ordered by geographic proximity (MVP algorithm).
        
        Args:
            technician: TechnicianProfile instance
            route_date: Date for the route
            start_lat: Starting latitude (optional)
            start_lon: Starting longitude (optional)
            start_address: Starting address (optional)
            created_by: User who created the route
            
        Returns:
            DailyRoute instance with stops
            
        Raises:
            ValueError: If route already exists for the date
        """
        from decimal import Decimal
        from django.db import transaction
        
        from .models import DailyRoute, RouteStop, ServiceAssignment
        
        # Check if route already exists
        existing = DailyRoute.objects.filter(
            technician=technician,
            route_date=route_date,
        ).first()
        
        if existing:
            raise ValueError(
                f"Já existe uma rota para {technician} em {route_date}. "
                f"Delete a existente antes de gerar uma nova."
            )
        
        # Get all scheduled assignments for the date
        assignments = ServiceAssignment.objects.filter(
            technician=technician,
            scheduled_date=route_date,
        ).exclude(
            status=ServiceAssignment.Status.CANCELED
        ).select_related("work_order", "work_order__asset")
        
        if not assignments.exists():
            raise ValueError(
                f"Nenhuma atribuição encontrada para {technician} em {route_date}."
            )
        
        with transaction.atomic():
            # Create the route
            route = DailyRoute.objects.create(
                technician=technician,
                route_date=route_date,
                start_latitude=Decimal(str(start_lat)) if start_lat else None,
                start_longitude=Decimal(str(start_lon)) if start_lon else None,
                start_address=start_address,
                created_by=created_by,
            )
            
            # Build list of stops with coordinates
            stops_data = []
            for assignment in assignments:
                # Get location from asset if available
                asset = assignment.work_order.asset if assignment.work_order else None
                lat = None
                lon = None
                address = ""
                
                if asset:
                    # Try to get coordinates from asset's site (primary source)
                    site = getattr(asset, "site", None)
                    if site:
                        lat = getattr(site, "latitude", None)
                        lon = getattr(site, "longitude", None)
                        address = getattr(site, "address", "") or ""
                    
                    # Fallback: try to get coordinates directly from asset (if added later)
                    if lat is None or lon is None:
                        lat = getattr(asset, "latitude", None)
                        lon = getattr(asset, "longitude", None)
                    
                    # Build address from location hierarchy if no site address
                    if not address:
                        location = getattr(asset, "subsection", None)
                        if location:
                            address = str(location)
                
                # Skip if no coordinates (can't route)
                if lat is None or lon is None:
                    logger.warning(
                        f"Assignment {assignment.id} has no coordinates, skipping"
                    )
                    continue
                
                stops_data.append({
                    "assignment": assignment,
                    "lat": float(lat),
                    "lon": float(lon),
                    "address": address,
                    "description": (
                        f"{assignment.work_order.number}: "
                        f"{assignment.work_order.description[:50]}"
                        if assignment.work_order else "Parada"
                    ),
                })
            
            if not stops_data:
                route.delete()
                raise ValueError(
                    "Nenhuma atribuição com coordenadas válidas encontrada."
                )
            
            # MVP optimization: sort by distance from start point (greedy nearest neighbor)
            ordered_stops = cls._optimize_route_order(
                stops_data,
                start_lat=float(start_lat) if start_lat else stops_data[0]["lat"],
                start_lon=float(start_lon) if start_lon else stops_data[0]["lon"],
            )
            
            # Create RouteStop instances
            total_km = Decimal("0.00")
            prev_lat = float(start_lat) if start_lat else ordered_stops[0]["lat"]
            prev_lon = float(start_lon) if start_lon else ordered_stops[0]["lon"]
            
            for seq, stop_data in enumerate(ordered_stops, start=1):
                # Calculate distance from previous point
                distance = cls.haversine_distance(
                    prev_lat, prev_lon,
                    stop_data["lat"], stop_data["lon"],
                )
                distance_decimal = Decimal(str(round(distance, 2)))
                total_km += distance_decimal
                
                RouteStop.objects.create(
                    route=route,
                    sequence=seq,
                    assignment=stop_data["assignment"],
                    latitude=Decimal(str(stop_data["lat"])),
                    longitude=Decimal(str(stop_data["lon"])),
                    address=stop_data["address"],
                    description=stop_data["description"],
                    distance_from_previous_km=distance_decimal,
                )
                
                prev_lat = stop_data["lat"]
                prev_lon = stop_data["lon"]
            
            # Update estimated KM on route
            route.estimated_km = total_km
            route.save(update_fields=["estimated_km"])
            
            logger.info(
                f"Route generated: {route.id} - {len(ordered_stops)} stops, "
                f"{total_km} km estimated"
            )
            
            return route
    
    @classmethod
    def _optimize_route_order(
        cls,
        stops: list,
        start_lat: float,
        start_lon: float,
    ) -> list:
        """
        Optimize stop order using nearest neighbor algorithm.
        
        MVP implementation: greedy algorithm that always picks
        the nearest unvisited stop.
        
        Args:
            stops: List of stop dictionaries with lat/lon
            start_lat: Starting latitude
            start_lon: Starting longitude
            
        Returns:
            Ordered list of stops
        """
        if len(stops) <= 1:
            return stops
        
        ordered = []
        remaining = stops.copy()
        current_lat = start_lat
        current_lon = start_lon
        
        while remaining:
            # Find nearest stop
            min_distance = float("inf")
            nearest_idx = 0
            
            for idx, stop in enumerate(remaining):
                distance = cls.haversine_distance(
                    current_lat, current_lon,
                    stop["lat"], stop["lon"],
                )
                if distance < min_distance:
                    min_distance = distance
                    nearest_idx = idx
            
            # Add nearest to ordered list
            nearest = remaining.pop(nearest_idx)
            ordered.append(nearest)
            current_lat = nearest["lat"]
            current_lon = nearest["lon"]
        
        return ordered
    
    @classmethod
    def find_nearest_technician(
        cls,
        latitude: float,
        longitude: float,
        max_distance_km: float = None,
        only_active: bool = True,
    ):
        """
        Find the nearest technician to a given location.
        
        Uses the latest LocationPing for each technician to determine
        their current position.
        
        Args:
            latitude: Target latitude
            longitude: Target longitude
            max_distance_km: Maximum search radius (optional)
            only_active: Only consider active technicians
            
        Returns:
            Dict with technician info and distance, or None if not found
        """
        from django.db.models import Max
        
        from .models import TechnicianProfile, LocationPing
        
        # Get active technicians
        technicians = TechnicianProfile.objects.all()
        if only_active:
            technicians = technicians.filter(is_active=True)
        
        # Get latest ping for each technician
        technician_ids = list(technicians.values_list("id", flat=True))
        
        # Find latest ping timestamp for each technician
        latest_pings = LocationPing.objects.filter(
            technician_id__in=technician_ids
        ).values("technician_id").annotate(
            latest_at=Max("recorded_at")
        )
        
        # Build lookup
        latest_map = {
            p["technician_id"]: p["latest_at"]
            for p in latest_pings
        }
        
        # Get actual ping records for latest timestamps
        nearest = None
        min_distance = float("inf")
        
        for tech_id, latest_at in latest_map.items():
            ping = LocationPing.objects.filter(
                technician_id=tech_id,
                recorded_at=latest_at,
            ).first()
            
            if not ping:
                continue
            
            distance = cls.haversine_distance(
                latitude, longitude,
                float(ping.latitude), float(ping.longitude),
            )
            
            # Check max distance constraint
            if max_distance_km and distance > max_distance_km:
                continue
            
            if distance < min_distance:
                min_distance = distance
                technician = technicians.get(id=tech_id)
                nearest = {
                    "technician_id": str(tech_id),
                    "technician_name": technician.full_name,
                    "latitude": float(ping.latitude),
                    "longitude": float(ping.longitude),
                    "distance_km": round(distance, 2),
                    "last_updated": ping.recorded_at,
                }
        
        return nearest
    
    @classmethod
    def calculate_km_summary(cls, technician, date):
        """
        Calculate KM summary for a technician on a specific date.
        
        Returns estimated KM (from route) and actual KM (from pings).
        
        Args:
            technician: TechnicianProfile instance
            date: Date to calculate for
            
        Returns:
            Dict with km_estimated, km_actual, and details
        """
        from datetime import datetime, time, timedelta
        from django.utils import timezone
        
        from .models import DailyRoute, LocationPing
        
        # Get route for the date (if exists)
        route = DailyRoute.objects.filter(
            technician=technician,
            route_date=date,
        ).first()
        
        km_estimated = float(route.estimated_km) if route else 0.0
        
        # Calculate actual KM from pings
        # Get all pings for the date within work window
        date_start = datetime.combine(date, technician.work_start_time)
        date_end = datetime.combine(date, technician.work_end_time)
        
        # Make timezone aware
        if timezone.is_naive(date_start):
            date_start = timezone.make_aware(date_start)
        if timezone.is_naive(date_end):
            date_end = timezone.make_aware(date_end)
        
        pings = LocationPing.objects.filter(
            technician=technician,
            recorded_at__gte=date_start,
            recorded_at__lte=date_end,
        ).order_by("recorded_at")
        
        # Calculate total distance traveled
        km_actual = 0.0
        ping_count = 0
        prev_ping = None
        
        for ping in pings:
            ping_count += 1
            if prev_ping:
                distance = cls.haversine_distance(
                    float(prev_ping.latitude), float(prev_ping.longitude),
                    float(ping.latitude), float(ping.longitude),
                )
                km_actual += distance
            prev_ping = ping
        
        return {
            "technician_id": str(technician.id),
            "technician_name": technician.full_name,
            "date": date,
            "km_estimated": round(km_estimated, 2),
            "km_actual": round(km_actual, 2),
            "km_difference": round(km_actual - km_estimated, 2),
            "route_id": str(route.id) if route else None,
            "route_status": route.status if route else None,
            "ping_count": ping_count,
        }


class TrackingService(TrakServiceBaseService):
    """Service for GPS tracking operations."""

    pass


class QuoteService(TrakServiceBaseService):
    """Service for quote/estimate operations."""

    pass
