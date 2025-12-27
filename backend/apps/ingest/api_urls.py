"""
URL routing for Telemetry API.
"""
from django.urls import path
from .api_views import (
    TelemetryListView,
    ReadingListView,
    TimeSeriesAggregateView
)
from .api_views_extended import (
    LatestReadingsView,
    DeviceHistoryView,
    DeviceSummaryView,
    AssetTelemetryHistoryView
)

app_name = 'telemetry'

urlpatterns = [
    # Raw telemetry data (MQTT messages)
    path('raw/', TelemetryListView.as_view(), name='telemetry-raw'),
    
    # Structured sensor readings
    path('readings/', ReadingListView.as_view(), name='readings-list'),
    
    # Aggregated time-series (Continuous Aggregates)
    path('series/', TimeSeriesAggregateView.as_view(), name='series-aggregate'),
    
    # Device-centric endpoints (FASE 3)
    path('latest/<str:device_id>/', LatestReadingsView.as_view(), name='latest-readings'),
    path('history/<str:device_id>/', DeviceHistoryView.as_view(), name='device-history'),
    path('device/<str:device_id>/summary/', DeviceSummaryView.as_view(), name='device-summary'),
    
    # Asset-centric endpoints (MQTT topic hierarchy source of truth)
    path('assets/<str:asset_tag>/history/', AssetTelemetryHistoryView.as_view(), name='asset-history'),
]
