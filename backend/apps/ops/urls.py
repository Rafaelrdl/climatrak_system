"""
Ops panel URL configuration.

All routes are staff-only and run on the public schema.
"""
from django.urls import path
from . import views

app_name = "ops"

urlpatterns = [
    path("", views.index, name="index"),
    path("dashboard/", views.telemetry_dashboard, name="dashboard"),
    path("api/chart-data/", views.chart_data_api, name="chart_data_api"),
    path("telemetry/", views.telemetry_list, name="telemetry_list"),
    path("telemetry/drilldown/", views.telemetry_drilldown, name="telemetry_drilldown"),
    path("telemetry/export/", views.telemetry_export_csv, name="telemetry_export_csv"),
    
    # Async export routes
    path("exports/", views.export_list, name="export_list"),
    path("exports/request/", views.export_request, name="export_request"),
    path("exports/<int:job_id>/download/", views.export_download, name="export_download"),
    path("exports/<int:job_id>/cancel/", views.export_cancel, name="export_cancel"),
]
