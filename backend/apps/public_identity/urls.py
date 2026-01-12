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
    MobileLoginView,
    MobileRefreshTokenView,
    MobileSelectTenantView,
    RefreshTokenView,
    SelectTenantView,
    TenantDiscoveryView,
)

app_name = "public_identity"

urlpatterns = [
    # Authentication endpoints (cookie-based for web)
    path("discover-tenant/", TenantDiscoveryView.as_view(), name="discover-tenant"),
    path("login/", CentralizedLoginView.as_view(), name="login"),
    path("select-tenant/", SelectTenantView.as_view(), name="select-tenant"),
    path("logout/", LogoutView.as_view(), name="logout"),
    path("refresh/", RefreshTokenView.as_view(), name="refresh"),
    path("me/", CurrentUserView.as_view(), name="me"),
    # Mobile-specific endpoints (tokens in response body)
    path("mobile/login/", MobileLoginView.as_view(), name="mobile-login"),
    path("mobile/refresh/", MobileRefreshTokenView.as_view(), name="mobile-refresh"),
    path(
        "mobile/select-tenant/",
        MobileSelectTenantView.as_view(),
        name="mobile-select-tenant",
    ),
]
