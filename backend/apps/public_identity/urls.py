"""
URL configuration for public_identity app.

These URLs are included in the public schema URLconf (urls_public.py).
They provide centralized authentication that works across all tenants.
"""

from django.urls import path

from .views import (
    CentralizedLoginView,
    CurrentUserView,
    LogoutView,
    RefreshTokenView,
    SelectTenantView,
    TenantDiscoveryView,
)

app_name = "public_identity"

urlpatterns = [
    # Authentication endpoints
    path("discover-tenant/", TenantDiscoveryView.as_view(), name="discover-tenant"),
    path("login/", CentralizedLoginView.as_view(), name="login"),
    path("select-tenant/", SelectTenantView.as_view(), name="select-tenant"),
    path("logout/", LogoutView.as_view(), name="logout"),
    path("refresh/", RefreshTokenView.as_view(), name="refresh"),
    path("me/", CurrentUserView.as_view(), name="me"),
]
