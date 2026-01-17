"""
Base Django settings for TrakSense backend.

For more information on this file, see
https://docs.djangoproject.com/en/5.0/topics/settings/
"""

import os
import importlib.util
from pathlib import Path

from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Build paths inside the project
BASE_DIR = Path(__file__).resolve().parent.parent.parent

# ============================================================================
# 🔒 SECURITY: Validate critical secrets
# ============================================================================

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.getenv("DJANGO_SECRET_KEY")

if not SECRET_KEY:
    raise ValueError(
        "🚨 SECURITY: DJANGO_SECRET_KEY environment variable is required!\n"
        "Generate one with: python -c 'import secrets; print(secrets.token_hex(50))'\n"
        "Add to .env: DJANGO_SECRET_KEY=<generated_key>"
    )

# Warn if using default/weak secret
INSECURE_SECRETS = [
    "dev-secret-key-change-in-production",
    "django-insecure-",
    "change-me",
    "secret",
]
if any(weak in SECRET_KEY.lower() for weak in INSECURE_SECRETS):
    import warnings

    warnings.warn(
        "⚠️ SECURITY WARNING: Detected weak SECRET_KEY! "
        "Generate a new one with: python -c 'import secrets; print(secrets.token_hex(50))'",
        RuntimeWarning,
        stacklevel=2,
    )

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = os.getenv("DEBUG", "False") == "True"

# Allow X-Tenant header override only in dev/test.
ALLOW_X_TENANT_HEADER = DEBUG and os.getenv("ALLOW_X_TENANT_HEADER", "False") == "True"

# Environment metadata for observability
ENVIRONMENT = os.getenv("DJANGO_ENV", "development" if DEBUG else "production")
SERVICE_NAME = os.getenv("SERVICE_NAME", "climatrak-backend")
LOG_LEVEL = os.getenv("LOG_LEVEL", "DEBUG" if DEBUG else "INFO")

# Metrics configuration
METRICS_ENABLED = os.getenv("METRICS_ENABLED", "True" if DEBUG else "False") == "True"
METRICS_ALLOW_ALL = os.getenv("METRICS_ALLOW_ALL", "False") == "True"
METRICS_ALLOWED_IPS = [
    ip.strip()
    for ip in os.getenv("METRICS_ALLOWED_IPS", "127.0.0.1,::1").split(",")
    if ip.strip()
]
CELERY_METRICS_ENABLED = os.getenv("CELERY_METRICS_ENABLED", "False") == "True"
CELERY_METRICS_PORT = int(os.getenv("CELERY_METRICS_PORT", "9187"))

# OpenTelemetry configuration (optional)
OTEL_ENABLED = os.getenv("OTEL_ENABLED", "False") == "True"
OTEL_EXPORTER_OTLP_ENDPOINT = os.getenv(
    "OTEL_EXPORTER_OTLP_ENDPOINT", "http://otel-collector:4317"
)
OTEL_SERVICE_NAME = os.getenv("OTEL_SERVICE_NAME", SERVICE_NAME)
OTEL_SAMPLE_RATIO = float(os.getenv("OTEL_SAMPLE_RATIO", "1.0"))

# Domain for auth cookies (set to ".localhost" in dev to share across subdomains).
AUTH_COOKIE_DOMAIN = os.getenv("AUTH_COOKIE_DOMAIN")
if AUTH_COOKIE_DOMAIN in ("", "localhost", ".localhost"):
    AUTH_COOKIE_DOMAIN = None

ALLOWED_HOSTS = os.getenv("ALLOWED_HOSTS", "localhost").split(",")

# Application definition
SHARED_APPS = [
    "django_tenants",  # Must be first
    "apps.accounts",  # Must be before auth for custom user model (TEMPORARY: will be moved to TENANT_APPS only after migration)
    "django.contrib.contenttypes",
    "django.contrib.auth",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
]

if importlib.util.find_spec("unfold"):
    SHARED_APPS += [
        "unfold",  # Must be before django.contrib.admin
        "unfold.contrib.filters",  # Enhanced filters
        "unfold.contrib.forms",  # Enhanced forms
        "unfold.contrib.inlines",  # Enhanced inlines
    ]

SHARED_APPS += [
    "django.contrib.admin",  # Admin only in public schema
    # Third-party
    "rest_framework",
    # Note: token_blacklist disabled for multi-tenant compatibility
    # 'rest_framework_simplejwt.token_blacklist',
    "corsheaders",
    "drf_spectacular",
    # Local shared apps
    "apps.tenants",
    "apps.ops",  # Ops panel (staff-only, public schema)
    "apps.public_identity",  # Public identity management (TenantUserIndex, TenantMembership)
    "apps.marketing",  # Marketing site content (blog, news)
]

TENANT_APPS = [
    "apps.accounts",  # Must be before auth for custom user model
    "django.contrib.contenttypes",
    "django.contrib.auth",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # NOTE: django.contrib.admin is NOT in TENANT_APPS
    # Admin is centralized in public schema only
    # NOTE: token_blacklist is NOT in TENANT_APPS
    # Token blacklist is centralized in public schema only
    # Tenant-specific apps
    "apps.ingest",  # MQTT telemetry ingestion
    "apps.assets",  # Catálogo de Ativos (Sites, Assets, Devices, Sensors)
    "apps.alerts",  # Sistema de Alertas e Regras
    "apps.locations",  # Hierarquia de Localizações (Company, Sector, Subsection)
    "apps.inventory",  # Gestão de Estoque (Categorias, Itens, Movimentações)
    "apps.cmms",  # CMMS - Ordens de Serviço, Solicitações, Planos de Manutenção
    "apps.trakledger",  # TrakLedger - Orçamento Vivo (Centros de Custo, RateCard, Budget)
    "apps.trakservice",  # TrakService - Field Service Management (Dispatch, Routing, Tracking)
    "apps.core_events",  # Domain Events Outbox (processamento assíncrono de eventos)
]


INSTALLED_APPS = list(SHARED_APPS) + [
    app for app in TENANT_APPS if app not in SHARED_APPS
]

MIDDLEWARE = [
    "django_tenants.middleware.main.TenantMainMiddleware",  # Must be first
    "apps.tenants.middleware.TenantHeaderMiddleware",  # X-Tenant header support (after TenantMainMiddleware)
    "apps.common.middleware.BlockTenantAdminMiddleware",  # Block admin in tenant schemas
    "apps.common.middleware.BlockTenantOpsMiddleware",  # Block ops panel in tenant schemas
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",  # Serve static files in production
    "django.contrib.sessions.middleware.SessionMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "apps.common.observability.middleware.RequestContextMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"

# Database
# https://docs.djangoproject.com/en/5.0/ref/settings/#databases
DATABASES = {
    "default": {
        "ENGINE": "django_tenants.postgresql_backend",
        "NAME": os.getenv("DB_NAME", "app"),
        "USER": os.getenv("DB_USER", "app"),
        "PASSWORD": os.getenv("DB_PASSWORD", "app"),
        "HOST": os.getenv("DB_HOST", "postgres"),
        "PORT": os.getenv("DB_PORT", "5432"),
    }
}

DATABASE_ROUTERS = ["django_tenants.routers.TenantSyncRouter"]

# Multi-tenant settings
TENANT_MODEL = "tenants.Tenant"
TENANT_DOMAIN_MODEL = "tenants.Domain"
PUBLIC_SCHEMA_NAME = os.getenv("PUBLIC_SCHEMA_NAME", "public")
# Fallback to public schema when hostname is unknown (useful for EMQX in dev)
_show_public_fallback = os.getenv("SHOW_PUBLIC_IF_NO_TENANT_FOUND")
if _show_public_fallback is None:
    SHOW_PUBLIC_IF_NO_TENANT_FOUND = DEBUG
else:
    SHOW_PUBLIC_IF_NO_TENANT_FOUND = _show_public_fallback == "True"

# URLConf settings for multi-tenant
PUBLIC_SCHEMA_URLCONF = "config.urls_public"  # Used when schema == 'public'
ROOT_URLCONF = "config.urls"  # Default URLConf for tenants

# Marketing/editor access
MARKETING_EDITOR_KEY = os.getenv("MARKETING_EDITOR_KEY", "")

# Authentication backends
AUTHENTICATION_BACKENDS = [
    "apps.accounts.backends.EmailBackend",  # Custom backend for email authentication
    "django.contrib.auth.backends.ModelBackend",  # Fallback to default
]

# Password validation
# https://docs.djangoproject.com/en/5.0/ref/settings/#auth-password-validators
AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
    },
]

# Internationalization
# https://docs.djangoproject.com/en/5.0/topics/i18n/
LANGUAGE_CODE = "pt-br"
TIME_ZONE = "America/Sao_Paulo"
USE_I18N = True
USE_TZ = True

# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/5.0/howto/static-files/
STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STATICFILES_DIRS = [
    BASE_DIR / "static",  # Custom static files (admin CSS, etc.)
]

# Media files (User uploaded files)
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

# Upload validation
UPLOAD_MAX_SIZE_BYTES = int(os.getenv("UPLOAD_MAX_SIZE_BYTES", "5242880"))
UPLOAD_ALLOWED_CONTENT_TYPES = [
    item.strip()
    for item in os.getenv(
        "UPLOAD_ALLOWED_CONTENT_TYPES", "image/jpeg,image/png,image/webp"
    ).split(",")
    if item.strip()
]

# WhiteNoise configuration for serving static files
STORAGES = {
    "default": {
        "BACKEND": "django.core.files.storage.FileSystemStorage",
    },
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
    },
}

# Default primary key field type
# https://docs.djangoproject.com/en/5.0/ref/settings/#default-auto-field
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# Custom User Model
AUTH_USER_MODEL = "accounts.User"

# Django REST Framework
REST_FRAMEWORK = {
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",  # 🔧 Mudado de LimitOffsetPagination para PageNumberPagination
    "PAGE_SIZE": 50,  # 🔧 Reduzido de 200 para 50 (mais apropriado para paginação por página)
    "DEFAULT_FILTER_BACKENDS": [
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ],
    "DEFAULT_RENDERER_CLASSES": [
        "rest_framework.renderers.JSONRenderer",
    ],
    "DEFAULT_PARSER_CLASSES": [
        "rest_framework.parsers.JSONParser",
        "rest_framework.parsers.MultiPartParser",
        "rest_framework.parsers.FormParser",
    ],
    "DEFAULT_AUTHENTICATION_CLASSES": [
        # 🔐 SECURITY FIX: Custom JWT authentication from HttpOnly cookies
        # Protects against XSS by reading tokens from cookies instead of headers
        "apps.common.authentication.JWTCookieAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "tenant_discovery": os.getenv("TENANT_DISCOVERY_THROTTLE", "10/min"),
    },
}

# drf-spectacular settings
SPECTACULAR_SETTINGS = {
    "TITLE": "TrakSense / ClimaTrak API",
    "DESCRIPTION": "Backend multi-tenant para monitoramento HVAC/IoT",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
    "SCHEMA_PATH_PREFIX": "/api",
    "COMPONENT_SPLIT_REQUEST": True,
    "SWAGGER_UI_SETTINGS": {
        "deepLinking": True,
        "persistAuthorization": True,
        "displayOperationId": True,
    },
}

# CORS settings
CORS_ALLOWED_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOWED_ORIGIN_REGEXES = [
    r"^http://localhost:\d+$",
    r"^http://127\.0\.0\.1:\d+$",
]
CORS_ALLOW_HEADERS = [
    "accept",
    "accept-encoding",
    "authorization",
    "content-type",
    "dnt",
    "origin",
    "user-agent",
    "x-csrftoken",
    "x-requested-with",
    "x-tenant",  # Custom header for tenant identification
]

# Session & Cookie settings (for JWT cookies)
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SECURE = not DEBUG  # True in production
SESSION_COOKIE_SAMESITE = "Lax"

CSRF_COOKIE_HTTPONLY = False  # Allow JavaScript to read CSRF token
CSRF_COOKIE_SECURE = not DEBUG
CSRF_COOKIE_SAMESITE = "Lax"
CSRF_TRUSTED_ORIGINS = os.getenv("CSRF_ORIGINS", "http://localhost:5173").split(",")

# Simple JWT settings
from datetime import timedelta

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=60),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": False,  # Disabled for multi-tenant compatibility
    "BLACKLIST_AFTER_ROTATION": False,  # Disabled for multi-tenant (blacklist only in public schema)
    "UPDATE_LAST_LOGIN": True,
    "ALGORITHM": "HS256",
    "SIGNING_KEY": SECRET_KEY,
    "VERIFYING_KEY": None,
    "AUDIENCE": None,
    "ISSUER": None,
    "AUTH_HEADER_TYPES": ("Bearer",),
    "AUTH_HEADER_NAME": "HTTP_AUTHORIZATION",
    "USER_ID_FIELD": "id",
    "USER_ID_CLAIM": "user_id",
    "AUTH_TOKEN_CLASSES": ("rest_framework_simplejwt.tokens.AccessToken",),
    "TOKEN_TYPE_CLAIM": "token_type",
    "JTI_CLAIM": "jti",
    "SLIDING_TOKEN_REFRESH_EXP_CLAIM": "refresh_exp",
    "SLIDING_TOKEN_LIFETIME": timedelta(minutes=60),
    "SLIDING_TOKEN_REFRESH_LIFETIME": timedelta(days=7),
}

# Redis
REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")

# Frontend URL (for email links, OAuth callbacks, etc.)
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

# 🔒 SECURITY: MQTT Ingestion Authentication
# INGESTION_SECRET is used for HMAC signature validation on /ingest endpoint
# Generate with: python -c "import secrets; print(secrets.token_hex(32))"
INGESTION_SECRET = os.getenv("INGESTION_SECRET", None)
if not INGESTION_SECRET and not DEBUG:
    raise ValueError("INGESTION_SECRET must be set in production environment")

# Ingest HMAC settings
_ingest_allow_global = os.getenv("INGEST_ALLOW_GLOBAL_SECRET")
if _ingest_allow_global is None:
    INGEST_ALLOW_GLOBAL_SECRET = DEBUG
else:
    INGEST_ALLOW_GLOBAL_SECRET = _ingest_allow_global.strip().lower() == "true"
INGEST_SIGNATURE_MAX_SKEW_SECONDS = int(
    os.getenv("INGEST_SIGNATURE_MAX_SKEW_SECONDS", "300")
)
INGEST_REPLAY_TTL_SECONDS = int(os.getenv("INGEST_REPLAY_TTL_SECONDS", "600"))

# Celery Configuration
CELERY_BROKER_URL = REDIS_URL
CELERY_RESULT_BACKEND = REDIS_URL
CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TASK_SERIALIZER = "json"
CELERY_RESULT_SERIALIZER = "json"
CELERY_TIMEZONE = TIME_ZONE
CELERYD_HIJACK_ROOT_LOGGER = False

# Celery Beat Schedule - Tarefas periódicas
CELERY_BEAT_SCHEDULE = {
    # Verificar status online/offline dos sensores a cada 1 hora
    "check-sensors-online-status": {
        "task": "assets.check_sensors_online_status",
        "schedule": 3600.0,  # 1 hora em segundos
        "options": {
            "expires": 300,  # Expira em 5 minutos se não executar
        },
    },
    # Atualizar status dos devices baseado nos sensores (logo após sensores)
    "update-device-online-status": {
        "task": "assets.update_device_online_status",
        "schedule": 3600.0,  # 1 hora em segundos
        "options": {
            "expires": 300,
        },
    },
    # Calcular disponibilidade dos devices (após atualizar status)
    "calculate-device-availability": {
        "task": "assets.calculate_device_availability",
        "schedule": 3600.0,  # 1 hora em segundos
        "options": {
            "expires": 300,
        },
    },
    # Avaliar regras de alertas a cada 5 minutos
    "evaluate-alert-rules": {
        "task": "alerts.evaluate_rules",
        "schedule": 300.0,  # 5 minutos em segundos
        "options": {
            "expires": 60,  # Expira em 1 minuto se não executar
        },
    },
    # Limpar alertas antigos uma vez por dia (às 2:00 AM)
    "cleanup-old-alerts": {
        "task": "alerts.cleanup_old_alerts",
        "schedule": 86400.0,  # 24 horas em segundos
        "options": {
            "expires": 3600,  # Expira em 1 hora se não executar
        },
    },
    # Despachar eventos pendentes da Outbox a cada 30 segundos
    "dispatch-outbox-events": {
        "task": "apps.core_events.tasks.dispatch_pending_events",
        "schedule": 30.0,  # 30 segundos
        "options": {
            "expires": 25,  # Expira em 25 segundos se não executar
        },
    },
    # Limpar eventos processados antigos uma vez por dia
    "cleanup-old-outbox-events": {
        "task": "apps.core_events.tasks.cleanup_old_events",
        "schedule": 86400.0,  # 24 horas em segundos
        "kwargs": {"days": 30, "status": "processed"},
        "options": {
            "expires": 3600,  # Expira em 1 hora se não executar
        },
    },
}

# MinIO / S3
MINIO_ENDPOINT = os.getenv("MINIO_ENDPOINT", "minio:9000")
MINIO_ACCESS_KEY = os.getenv("MINIO_ACCESS_KEY")
MINIO_SECRET_KEY = os.getenv("MINIO_SECRET_KEY")
MINIO_BUCKET = os.getenv("MINIO_BUCKET", "files")
MINIO_USE_SSL = os.getenv("MINIO_USE_SSL", "False") == "True"

# 🔒 SECURITY: Validate MinIO credentials if not in DEBUG mode
if not DEBUG:
    if not MINIO_ACCESS_KEY or MINIO_ACCESS_KEY == "minioadmin":
        raise ValueError(
            "🚨 SECURITY: MINIO_ACCESS_KEY must be set to a unique value in production!\n"
            "Do not use 'minioadmin' in production. Generate secure credentials."
        )
    if not MINIO_SECRET_KEY or MINIO_SECRET_KEY == "minioadmin123":
        raise ValueError(
            "🚨 SECURITY: MINIO_SECRET_KEY must be set to a unique value in production!\n"
            "Do not use 'minioadmin123' in production. Generate secure credentials."
        )
else:
    # Use defaults in development only
    MINIO_ACCESS_KEY = MINIO_ACCESS_KEY or "minioadmin"
    MINIO_SECRET_KEY = MINIO_SECRET_KEY or "minioadmin123"

# EMQX / MQTT
EMQX_URL = os.getenv("EMQX_URL", "mqtt://emqx:1883")

# ============================================================================
# PAYLOAD PARSERS - Sistema plugável para diferentes formatos de dispositivos
# ============================================================================
PAYLOAD_PARSER_MODULES = [
    "apps.ingest.parsers.standard",  # Formato padrão TrakSense
    "apps.ingest.parsers.khomp_senml",  # Gateway LoRaWAN Khomp (SenML)
    # Adicione novos parsers aqui conforme necessário
]

# Email Configuration (SMTP)
# Configure via environment variables: MAIL_HOST, MAIL_PORT, MAIL_USERNAME, MAIL_PASSWORD, MAIL_ENCRYPTION, MAIL_FROM_ADDRESS
EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
EMAIL_HOST = os.getenv("MAIL_HOST", "smtp.hostinger.com")
EMAIL_PORT = int(os.getenv("MAIL_PORT", "465"))
EMAIL_USE_TLS = os.getenv("MAIL_ENCRYPTION", "ssl").lower() == "tls"
EMAIL_USE_SSL = os.getenv("MAIL_ENCRYPTION", "ssl").lower() == "ssl"
EMAIL_HOST_USER = os.getenv("MAIL_USERNAME", "")
EMAIL_HOST_PASSWORD = os.getenv("MAIL_PASSWORD", "")
DEFAULT_FROM_EMAIL = os.getenv("MAIL_FROM_ADDRESS", "noreply@climatrak.com.br")
EMAIL_TIMEOUT = 10  # Timeout de 10 segundos para conexão SMTP

# ============================================================================
# DJANGO UNFOLD - Modern Admin Interface (ClimaTrak)
# ============================================================================
# Documentation: https://unfoldadmin.com/docs/configuration/settings/
# Primary color derived from frontend design system: oklch(0.45 0.15 200) (teal/verde-petróleo)
# Color scale generated to match frontend primary color hue (200° = teal)

from django.templatetags.static import static
from django.urls import reverse_lazy
from django.utils.translation import gettext_lazy as _

# Environment detection for admin badge
_IS_PRODUCTION = os.getenv("DJANGO_ENV", "development") == "production"


def _environment_callback(request):
    """Return environment badge for admin header."""
    if _IS_PRODUCTION:
        return ["Production", "danger"]
    return ["Development", "warning"]


def _environment_title_prefix(request):
    """Prefix for browser tab title."""
    if _IS_PRODUCTION:
        return ""
    return "[DEV] "


UNFOLD = {
    # ==========================================================================
    # Branding ClimaTrak
    # ==========================================================================
    "SITE_TITLE": "ClimaTrak Admin",
    "SITE_HEADER": "ClimaTrak",
    "SITE_SUBHEADER": "Multi-Tenant Asset Management Platform",
    "SITE_URL": "/",
    # Logo and icons (using lambdas for static file resolution)
    "SITE_ICON": lambda request: static("admin/brand/favicon.svg"),
    "SITE_LOGO": {
        "light": lambda request: static("admin/brand/logo-light.svg"),
        "dark": lambda request: static("admin/brand/logo-dark.svg"),
    },
    "SITE_SYMBOL": "speed",  # Material icon for compact views
    "SITE_FAVICONS": [
        {
            "rel": "icon",
            "sizes": "32x32",
            "type": "image/svg+xml",
            "href": lambda request: static("admin/brand/favicon.svg"),
        },
    ],
    # ==========================================================================
    # Environment & Theme
    # ==========================================================================
    "ENVIRONMENT": "config.settings.base._environment_callback",
    "ENVIRONMENT_TITLE_PREFIX": "config.settings.base._environment_title_prefix",
    # "THEME": "dark",  # Uncomment to force dark mode (disables toggle)
    "SHOW_HISTORY": True,
    "SHOW_VIEW_ON_SITE": True,
    "SHOW_BACK_BUTTON": True,
    # Dashboard customizado com cards por domínio
    "DASHBOARD_CALLBACK": "apps.ops.admin_dashboard.dashboard_callback",
    # ==========================================================================
    # Login Page
    # ==========================================================================
    "LOGIN": {
        "image": lambda request: static("admin/brand/login-bg.jpg"),
        "redirect_after": lambda request: reverse_lazy("admin:index"),
    },
    # ==========================================================================
    # Styling
    # ==========================================================================
    "BORDER_RADIUS": "8px",
    # ==========================================================================
    # Colors - ClimaTrak Verde Petróleo (Teal)
    # Primary derived from frontend: oklch(0.45 0.15 200)
    # Generated scale maintaining hue 200 (teal/verde-petróleo)
    # ==========================================================================
    "COLORS": {
        "base": {
            # Using Unfold defaults (neutral gray scale)
            "50": "oklch(98.5% .002 247.839)",
            "100": "oklch(96.7% .003 264.542)",
            "200": "oklch(92.8% .006 264.531)",
            "300": "oklch(87.2% .01 258.338)",
            "400": "oklch(70.7% .022 261.325)",
            "500": "oklch(55.1% .027 264.364)",
            "600": "oklch(44.6% .03 256.802)",
            "700": "oklch(37.3% .034 259.733)",
            "800": "oklch(27.8% .033 256.848)",
            "900": "oklch(21% .034 264.665)",
            "950": "oklch(13% .028 261.692)",
        },
        "primary": {
            # Teal/Verde-Petróleo scale (hue 200)
            # Generated from frontend primary: oklch(0.45 0.15 200)
            "50": "oklch(97% .02 200)",
            "100": "oklch(93% .04 200)",
            "200": "oklch(87% .07 200)",
            "300": "oklch(78% .11 200)",
            "400": "oklch(65% .14 200)",
            "500": "oklch(52% .15 200)",  # Base (close to frontend primary)
            "600": "oklch(45% .15 200)",  # Frontend primary: oklch(0.45 0.15 200)
            "700": "oklch(38% .13 200)",
            "800": "oklch(32% .11 200)",
            "900": "oklch(26% .09 200)",
            "950": "oklch(18% .06 200)",
        },
        "font": {
            "subtle-light": "var(--color-base-500)",
            "subtle-dark": "var(--color-base-400)",
            "default-light": "var(--color-base-600)",
            "default-dark": "var(--color-base-300)",
            "important-light": "var(--color-base-900)",
            "important-dark": "var(--color-base-100)",
        },
    },
    # ==========================================================================
    # Custom Styles
    # ==========================================================================
    "STYLES": [
        lambda request: static("admin/css/climatrak_unfold.css"),
    ],
    # ==========================================================================
    # Sidebar Navigation - Organized by Business Domain
    # ==========================================================================
    "SIDEBAR": {
        "show_search": True,
        "show_all_applications": True,
        "navigation": [
            # ──────────────────────────────────────────────────────────────────
            # Dashboard
            # ──────────────────────────────────────────────────────────────────
            {
                "title": _("Dashboard"),
                "separator": True,
                "items": [
                    {
                        "title": _("Home"),
                        "icon": "home",
                        "link": reverse_lazy("admin:index"),
                    },
                    {
                        "title": _("Ops Panel"),
                        "icon": "monitoring",
                        "link": "/ops/",
                        "permission": lambda request: request.user.is_superuser,
                    },
                ],
            },
            # ──────────────────────────────────────────────────────────────────
            # Plataforma (Tenants, Users)
            # ──────────────────────────────────────────────────────────────────
            {
                "title": _("Platform"),
                "separator": True,
                "collapsible": True,
                "items": [
                    {
                        "title": _("Tenants"),
                        "icon": "apartment",
                        "link": reverse_lazy("admin:tenants_tenant_changelist"),
                        "permission": lambda request: request.user.is_superuser,
                    },
                    {
                        "title": _("Domains"),
                        "icon": "language",
                        "link": reverse_lazy("admin:tenants_domain_changelist"),
                        "permission": lambda request: request.user.is_superuser,
                    },
                    {
                        "title": _("Users"),
                        "icon": "person",
                        "link": reverse_lazy("admin:accounts_user_changelist"),
                        "permission": lambda request: request.user.has_perm("accounts.view_user"),
                    },
                    {
                        "title": _("Memberships"),
                        "icon": "badge",
                        "link": reverse_lazy("admin:public_identity_tenantmembership_changelist"),
                        "permission": lambda request: request.user.is_superuser,
                    },
                ],
            },
            # ──────────────────────────────────────────────────────────────────
            # CMMS (Manutenção)
            # ──────────────────────────────────────────────────────────────────
            {
                "title": _("CMMS"),
                "separator": True,
                "collapsible": True,
                "items": [
                    {
                        "title": _("Work Orders"),
                        "icon": "assignment",
                        "link": reverse_lazy("admin:cmms_workorder_changelist"),
                    },
                    {
                        "title": _("Requests"),
                        "icon": "help",
                        "link": reverse_lazy("admin:cmms_request_changelist"),
                    },
                    {
                        "title": _("Maintenance Plans"),
                        "icon": "event_repeat",
                        "link": reverse_lazy("admin:cmms_maintenanceplan_changelist"),
                    },
                    {
                        "title": _("Checklists"),
                        "icon": "checklist",
                        "link": reverse_lazy("admin:cmms_checklisttemplate_changelist"),
                    },
                ],
            },
            # ──────────────────────────────────────────────────────────────────
            # Inventário
            # ──────────────────────────────────────────────────────────────────
            {
                "title": _("Inventory"),
                "separator": True,
                "collapsible": True,
                "items": [
                    {
                        "title": _("Items"),
                        "icon": "inventory_2",
                        "link": reverse_lazy("admin:inventory_inventoryitem_changelist"),
                    },
                    {
                        "title": _("Categories"),
                        "icon": "category",
                        "link": reverse_lazy("admin:inventory_inventorycategory_changelist"),
                    },
                    {
                        "title": _("Movements"),
                        "icon": "swap_horiz",
                        "link": reverse_lazy("admin:inventory_inventorymovement_changelist"),
                    },
                    {
                        "title": _("Counts"),
                        "icon": "inventory",
                        "link": reverse_lazy("admin:inventory_inventorycount_changelist"),
                    },
                ],
            },
            # ──────────────────────────────────────────────────────────────────
            # Localizações
            # ──────────────────────────────────────────────────────────────────
            {
                "title": _("Locations"),
                "separator": True,
                "collapsible": True,
                "items": [
                    {
                        "title": _("Companies"),
                        "icon": "business",
                        "link": reverse_lazy("admin:locations_company_changelist"),
                    },
                    {
                        "title": _("Units"),
                        "icon": "location_city",
                        "link": reverse_lazy("admin:locations_unit_changelist"),
                    },
                    {
                        "title": _("Sectors"),
                        "icon": "layers",
                        "link": reverse_lazy("admin:locations_sector_changelist"),
                    },
                    {
                        "title": _("Subsections"),
                        "icon": "grid_view",
                        "link": reverse_lazy("admin:locations_subsection_changelist"),
                    },
                ],
            },
            # ──────────────────────────────────────────────────────────────────
            # Alertas
            # ──────────────────────────────────────────────────────────────────
            {
                "title": _("Alerts"),
                "separator": True,
                "collapsible": True,
                "items": [
                    {
                        "title": _("Alerts"),
                        "icon": "notifications",
                        "link": reverse_lazy("admin:alerts_alert_changelist"),
                    },
                    {
                        "title": _("Rules"),
                        "icon": "rule",
                        "link": reverse_lazy("admin:alerts_rule_changelist"),
                    },
                    {
                        "title": _("Notification Preferences"),
                        "icon": "tune",
                        "link": reverse_lazy("admin:alerts_notificationpreference_changelist"),
                    },
                ],
            },
            # ──────────────────────────────────────────────────────────────────
            # TrakLedger (Finance)
            # ──────────────────────────────────────────────────────────────────
            {
                "title": _("Finance"),
                "separator": True,
                "collapsible": True,
                "items": [
                    {
                        "title": _("Budget Plans"),
                        "icon": "pie_chart",
                        "link": reverse_lazy("admin:trakledger_budgetplan_changelist"),
                    },
                    {
                        "title": _("Envelopes"),
                        "icon": "mail",
                        "link": reverse_lazy("admin:trakledger_budgetenvelope_changelist"),
                    },
                    {
                        "title": _("Months"),
                        "icon": "calendar_month",
                        "link": reverse_lazy("admin:trakledger_budgetmonth_changelist"),
                    },
                    {
                        "title": _("Cost Centers"),
                        "icon": "account_tree",
                        "link": reverse_lazy("admin:trakledger_costcenter_changelist"),
                    },
                    {
                        "title": _("Rate Cards"),
                        "icon": "payments",
                        "link": reverse_lazy("admin:trakledger_ratecard_changelist"),
                    },
                ],
            },
            # ──────────────────────────────────────────────────────────────────
            # TrakService (Field Service)
            # ──────────────────────────────────────────────────────────────────
            {
                "title": _("Field Service"),
                "separator": True,
                "collapsible": True,
                "items": [
                    {
                        "title": _("Technicians"),
                        "icon": "engineering",
                        "link": reverse_lazy("admin:trakservice_technicianprofile_changelist"),
                    },
                    {
                        "title": _("Assignments"),
                        "icon": "event_available",
                        "link": reverse_lazy("admin:trakservice_serviceassignment_changelist"),
                    },
                ],
            },
            # ──────────────────────────────────────────────────────────────────
            # Sistema (Ops, Events)
            # ──────────────────────────────────────────────────────────────────
            {
                "title": _("System"),
                "separator": True,
                "collapsible": True,
                "items": [
                    {
                        "title": _("Export Jobs"),
                        "icon": "download",
                        "link": reverse_lazy("admin:ops_exportjob_changelist"),
                        "permission": lambda request: request.user.is_superuser,
                    },
                    {
                        "title": _("Audit Logs"),
                        "icon": "history",
                        "link": reverse_lazy("admin:ops_auditlog_changelist"),
                        "permission": lambda request: request.user.is_superuser,
                    },
                    {
                        "title": _("Outbox Events"),
                        "icon": "send",
                        "link": reverse_lazy("admin:core_events_outboxevent_changelist"),
                        "permission": lambda request: request.user.is_superuser,
                    },
                    {
                        "title": _("Blog Posts"),
                        "icon": "article",
                        "link": reverse_lazy("admin:marketing_blogpost_changelist"),
                        "permission": lambda request: request.user.is_superuser,
                    },
                ],
            },
        ],
    },
}

# Logging (JSON + context + redaction)
from apps.common.observability.logging import build_logging_config

LOGGING = build_logging_config(LOG_LEVEL)
