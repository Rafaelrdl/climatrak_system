"""
Custom authentication backend for email-based login.
"""

from django.contrib.auth import get_user_model
from django.contrib.auth.backends import ModelBackend
from django.db import connection

from django_tenants.utils import schema_context


class EmailBackend(ModelBackend):
    """
    Autentica usuários usando email ao invés de username.
    Compatible with django-tenants - explicitly uses schema_context.
    """

    def authenticate(self, request, username=None, password=None, **kwargs):
        import logging

        logger = logging.getLogger(__name__)
        UserModel = get_user_model()

        # Get current schema from connection
        current_schema = connection.schema_name
        logger.info(
            f"🔐 EmailBackend.authenticate - Schema: {current_schema}, Email: {username}"
        )

        if username is None:
            username = kwargs.get(UserModel.USERNAME_FIELD)

        if username is None or password is None:
            logger.info("🔐 EmailBackend - Missing username or password")
            return None

        username = username.strip()
        if not username:
            logger.info("EmailBackend - Empty username after strip")
            return None

        # CRITICAL: Explicitly use schema_context to ensure we query the tenant schema
        # This is necessary because apps.accounts is in SHARED_APPS (for migration reasons)
        # but User data lives in tenant schemas
        with schema_context(current_schema):
            # Debug: verificar todos os usuários
            total_users = UserModel.objects.count()
            logger.debug(
                f"🔐 EmailBackend - Total users in schema {current_schema}: {total_users}"
            )

            try:
                # Tenta buscar por email
                logger.info(f"🔐 EmailBackend - Querying for email={username}")
                user = UserModel.objects.get(email__iexact=username)
                logger.info(f"🔐 EmailBackend - User found: {user.email}")
            except UserModel.DoesNotExist:
                logger.info(f"🔐 EmailBackend - User not found by email: {username}")
                # Tenta buscar por username como fallback
                try:
                    user = UserModel.objects.get(username__iexact=username)
                    logger.info(
                        f"🔐 EmailBackend - User found by username: {user.username}"
                    )
                except UserModel.DoesNotExist:
                    logger.info("🔐 EmailBackend - User not found by username either")
                    # Run the default password hasher once to reduce the timing
                    # difference between an existing and a nonexistent user (#20760).
                    UserModel().set_password(password)
                    return None

            password_ok = user.check_password(password)
            can_auth = self.user_can_authenticate(user)
            logger.info(
                f"🔐 EmailBackend - Password OK: {password_ok}, Can Auth: {can_auth}"
            )

            if password_ok and can_auth:
                return user

        return None
