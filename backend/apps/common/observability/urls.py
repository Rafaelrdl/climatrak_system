"""
Observability URLs.

This module is intentionally minimal to avoid breaking public URL routing
when observability endpoints are optional.
"""

from django.urls import path

from .views import metrics_view

urlpatterns = [
    path("metrics", metrics_view, name="metrics"),
]
