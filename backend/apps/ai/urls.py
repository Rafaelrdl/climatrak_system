"""
AI URLs - URL routing for AI module.
"""

from django.urls import include, path

from rest_framework.routers import DefaultRouter

from .views import AgentViewSet, AIHealthViewSet, AIJobViewSet, AIKnowledgeViewSet

router = DefaultRouter()
router.register(r"jobs", AIJobViewSet, basename="ai-job")
router.register(r"agents", AgentViewSet, basename="ai-agent")
router.register(r"health", AIHealthViewSet, basename="ai-health")
router.register(r"knowledge", AIKnowledgeViewSet, basename="ai-knowledge")

urlpatterns = [
    path("", include(router.urls)),
]
