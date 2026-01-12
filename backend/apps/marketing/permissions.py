from django.conf import settings
from rest_framework.permissions import SAFE_METHODS, BasePermission


class MarketingEditorPermission(BasePermission):
    @staticmethod
    def is_editor(request) -> bool:
        expected = getattr(settings, "MARKETING_EDITOR_KEY", "")
        provided = request.headers.get("X-Marketing-Key", "")
        if expected and provided and provided == expected:
            return True

        user = getattr(request, "user", None)
        return bool(user and user.is_authenticated and user.is_staff)

    def has_permission(self, request, view) -> bool:
        if request.method in SAFE_METHODS:
            return True
        return self.is_editor(request)
