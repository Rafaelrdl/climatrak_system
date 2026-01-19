"""
Base Django settings for TrakSense backend.

For more information on this file, see
https://docs.djangoproject.com/en/5.0/topics/settings/
"""

import os
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
    "jazzmin",  # Must be before django.contrib.admin
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
    "apps.ai",  # AI - Agentes de IA (RCA, Preventivo, Preditivo, Inventário, Quick Repair)
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
STATIC_URL = "/static/"
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
    # Limpar jobs de IA antigos uma vez por dia
    "cleanup-old-ai-jobs": {
        "task": "apps.ai.tasks.cleanup_old_ai_jobs",
        "schedule": 86400.0,  # 24 horas em segundos
        "kwargs": {"days": 30},
        "options": {
            "expires": 3600,  # Expira em 1 hora se não executar
        },
    },
    # Verificar jobs de IA travados a cada 15 minutos
    "check-stuck-ai-jobs": {
        "task": "apps.ai.tasks.check_stuck_ai_jobs",
        "schedule": 900.0,  # 15 minutos em segundos
        "kwargs": {"timeout_minutes": 30},
        "options": {
            "expires": 300,  # Expira em 5 minutos se não executar
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
# AI / LLM Configuration - OpenAI-compatible API (Ollama, vLLM, etc.)
# ============================================================================
# LLM Provider settings (supports Ollama, vLLM, OpenAI, etc.)
LLM_BASE_URL = os.getenv("LLM_BASE_URL", "http://ollama:11434/v1")
LLM_MODEL = os.getenv("LLM_MODEL", "mistral-nemo")
LLM_API_KEY = os.getenv("LLM_API_KEY", "")  # Optional for local providers
LLM_TEMPERATURE = float(os.getenv("LLM_TEMPERATURE", "0.2"))
LLM_MAX_TOKENS = int(os.getenv("LLM_MAX_TOKENS", "4096"))
LLM_TIMEOUT_SECONDS = int(os.getenv("LLM_TIMEOUT_SECONDS", "60"))
LLM_RETRY_ATTEMPTS = int(os.getenv("LLM_RETRY_ATTEMPTS", "3"))
LLM_RETRY_DELAY = float(os.getenv("LLM_RETRY_DELAY", "1.0"))

# Embeddings model for RAG (optional, for future use)
EMBEDDINGS_MODEL = os.getenv("EMBEDDINGS_MODEL", "bge-m3")

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
# DJANGO JAZZMIN - AdminLTE-style Admin Interface (ClimaTrak)
# ============================================================================
# Documentation: https://django-jazzmin.readthedocs.io/
# Primary color: Teal/Verde Petróleo matching frontend design system

from django.templatetags.static import static
from django.utils.translation import gettext_lazy as _

# Environment detection for admin badge
_IS_PRODUCTION = os.getenv("DJANGO_ENV", "development") == "production"

JAZZMIN_SETTINGS = {
    # ==========================================================================
    # Branding ClimaTrak
    # ==========================================================================
    "site_title": "ClimaTrak Admin",
    "site_header": "ClimaTrak",
    "site_brand": "ClimaTrak",
    "welcome_sign": "Bem-vindo ao ClimaTrak",
    "copyright": "ClimaTrak - Multi-Tenant Asset Management",
    
    # Logo and icons
    "site_logo": "admin/brand/logo-light.svg",
    "site_logo_classes": "img-circle",
    "site_icon": "admin/brand/favicon.svg",
    "login_logo": "admin/brand/logo-light.svg",
    
    # ==========================================================================
    # UI Builder (only in DEBUG mode)
    # ==========================================================================
    "show_ui_builder": DEBUG,
    
    # ==========================================================================
    # Navigation
    # ==========================================================================
    "topmenu_links": [
        {"name": "Home", "url": "admin:index", "permissions": ["auth.view_user"]},
        {"name": "Ops Panel", "url": "/ops/", "permissions": ["auth.add_user"]},  # superuser-only
    ],
    
    # User menu links
    "usermenu_links": [
        {"name": "API Docs", "url": "/api/schema/swagger-ui/", "new_window": True, "icon": "fas fa-book"},
    ],
    
    # ==========================================================================
    # App/Model Icons (FontAwesome 5)
    # ==========================================================================
    "icons": {
        # Auth
        "auth": "fas fa-users-cog",
        "auth.user": "fas fa-user",
        "auth.Group": "fas fa-users",
        
        # Tenants/Platform
        "tenants": "fas fa-building",
        "tenants.Tenant": "fas fa-building",
        "tenants.Domain": "fas fa-globe",
        
        # Accounts
        "accounts": "fas fa-user-circle",
        "accounts.User": "fas fa-user",
        
        # Public Identity
        "public_identity": "fas fa-id-badge",
        "public_identity.TenantMembership": "fas fa-id-card",
        "public_identity.TenantUserIndex": "fas fa-address-book",
        
        # CMMS
        "cmms": "fas fa-tools",
        "cmms.WorkOrder": "fas fa-clipboard-list",
        "cmms.Request": "fas fa-question-circle",
        "cmms.MaintenancePlan": "fas fa-calendar-alt",
        "cmms.ChecklistTemplate": "fas fa-tasks",
        
        # Inventory
        "inventory": "fas fa-boxes",
        "inventory.InventoryItem": "fas fa-box",
        "inventory.InventoryCategory": "fas fa-folder",
        "inventory.InventoryMovement": "fas fa-exchange-alt",
        "inventory.InventoryCount": "fas fa-clipboard-check",
        
        # Locations
        "locations": "fas fa-map-marker-alt",
        "locations.Company": "fas fa-building",
        "locations.Unit": "fas fa-city",
        "locations.Sector": "fas fa-layer-group",
        "locations.Subsection": "fas fa-th",
        
        # Assets
        "assets": "fas fa-server",
        "assets.Asset": "fas fa-cog",
        "assets.Device": "fas fa-microchip",
        "assets.Sensor": "fas fa-thermometer-half",
        "assets.Site": "fas fa-industry",
        
        # Alerts
        "alerts": "fas fa-bell",
        "alerts.Alert": "fas fa-exclamation-triangle",
        "alerts.Rule": "fas fa-gavel",
        "alerts.NotificationPreference": "fas fa-sliders-h",
        
        # TrakLedger (Finance)
        "trakledger": "fas fa-wallet",
        "trakledger.CostCenter": "fas fa-sitemap",
        "trakledger.RateCard": "fas fa-file-invoice-dollar",
        "trakledger.BudgetPlan": "fas fa-chart-pie",
        "trakledger.BudgetEnvelope": "fas fa-envelope-open-text",
        "trakledger.BudgetMonth": "fas fa-calendar-check",
        
        # TrakService (Field Service)
        "trakservice": "fas fa-truck",
        "trakservice.TechnicianProfile": "fas fa-hard-hat",
        "trakservice.ServiceAssignment": "fas fa-tasks",
        
        # System
        "ops": "fas fa-cogs",
        "ops.ExportJob": "fas fa-download",
        "ops.AuditLog": "fas fa-history",
        "core_events": "fas fa-paper-plane",
        "core_events.OutboxEvent": "fas fa-envelope",
        "marketing": "fas fa-bullhorn",
        "marketing.BlogPost": "fas fa-newspaper",
    },
    
    # Default icons
    "default_icon_parents": "fas fa-folder",
    "default_icon_children": "fas fa-circle",
    
    # ==========================================================================
    # Hide models in admin (tenant-specific models hidden in public schema)
    # The AdminSite will handle this dynamically based on schema
    # ==========================================================================
    "hide_apps": [],
    "hide_models": [],
    
    # ==========================================================================
    # UI Options
    # ==========================================================================
    "related_modal_active": True,
    "use_google_fonts_cdn": True,
    "show_sidebar": True,
    "navigation_expanded": False,
    "changeform_format": "horizontal_tabs",
    "changeform_format_overrides": {
        "auth.user": "collapsible",
        "auth.group": "vertical_tabs",
    },
    
    # ==========================================================================
    # Custom CSS/JS
    # ==========================================================================
    "custom_css": "admin/css/climatrak_jazzmin.css",
    "custom_js": None,
    
    # ==========================================================================
    # Order of apps in sidebar
    # ==========================================================================
    "order_with_respect_to": [
        "tenants",
        "accounts", 
        "public_identity",
        "cmms",
        "inventory",
        "locations",
        "assets",
        "alerts",
        "trakledger",
        "trakservice",
        "ops",
        "core_events",
        "marketing",
        "auth",
    ],
}

JAZZMIN_UI_TWEAKS = {
    # ==========================================================================
    # Theme - Teal/Verde Petróleo (closest to ClimaTrak brand)
    # Using darkly as base and overriding with custom CSS for teal accent
    # ==========================================================================
    "navbar_small_text": False,
    "footer_small_text": False,
    "body_small_text": False,
    "brand_small_text": False,
    "brand_colour": "navbar-dark",
    "accent": "accent-primary",
    "navbar": "navbar-dark navbar-primary",
    "no_navbar_border": False,
    "navbar_fixed": True,
    "layout_boxed": False,
    "footer_fixed": False,
    "sidebar_fixed": True,
    "sidebar": "sidebar-dark-primary",
    "sidebar_nav_small_text": False,
    "sidebar_disable_expand": False,
    "sidebar_nav_child_indent": True,
    "sidebar_nav_compact_style": True,
    "sidebar_nav_legacy_style": False,
    "sidebar_nav_flat_style": False,
    "theme": "default",
    "dark_mode_theme": "darkly",
    "button_classes": {
        "primary": "btn-primary",
        "secondary": "btn-secondary",
        "info": "btn-info",
        "warning": "btn-warning",
        "danger": "btn-danger",
        "success": "btn-success",
    },
    "actions_sticky_top": True,
}

# Logging (JSON + context + redaction)
from apps.common.observability.logging import build_logging_config

LOGGING = build_logging_config(LOG_LEVEL)
