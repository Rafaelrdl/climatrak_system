"""
TrakService - Field Service Management Module

This app provides field service management capabilities including:
- Dispatch and scheduling
- GPS/location tracking
- Route optimization
- Mileage (km) tracking
- Quotation/estimates

All endpoints are feature-gated per tenant.
"""

default_app_config = "apps.trakservice.apps.TrakServiceConfig"
