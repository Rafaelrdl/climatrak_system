"""
Observability URLs.

This module is intentionally minimal to avoid breaking public URL routing
when observability endpoints are optional.
"""

from django.urls import path

urlpatterns = [
    # Add observability endpoints here (metrics, tracing hooks, etc.).
]
