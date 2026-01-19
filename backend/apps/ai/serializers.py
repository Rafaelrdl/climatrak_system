"""
AI Serializers - DRF serializers for AI module.
"""

from rest_framework import serializers

from .models import AIJob, AIJobStatus
from .agents import get_registered_agents


class AIJobCreateSerializer(serializers.Serializer):
    """Serializer para criação de job de IA."""

    input = serializers.JSONField(
        required=False,
        default=dict,
        help_text="Dados de entrada para o agente",
    )
    related = serializers.JSONField(
        required=False,
        default=None,
        help_text="Objeto relacionado: {type: 'alert', id: 'uuid'}",
    )
    idempotency_key = serializers.CharField(
        required=False,
        max_length=255,
        help_text="Chave única para evitar duplicatas",
    )

    def validate_related(self, value):
        """Valida estrutura do campo related."""
        if value is None:
            return None

        if not isinstance(value, dict):
            raise serializers.ValidationError("Related must be an object")

        if "type" not in value:
            raise serializers.ValidationError("Related object must have 'type'")

        if "id" not in value:
            raise serializers.ValidationError("Related object must have 'id'")

        return value


class AIJobSerializer(serializers.ModelSerializer):
    """Serializer para leitura de job de IA."""

    class Meta:
        model = AIJob
        fields = [
            "id",
            "agent_key",
            "status",
            "input_data",
            "output_data",
            "related_type",
            "related_id",
            "error_message",
            "tokens_used",
            "execution_time_ms",
            "attempts",
            "created_at",
            "started_at",
            "completed_at",
        ]
        read_only_fields = fields


class AIJobListSerializer(serializers.ModelSerializer):
    """Serializer resumido para listagem de jobs."""

    class Meta:
        model = AIJob
        fields = [
            "id",
            "agent_key",
            "status",
            "created_at",
            "completed_at",
            "execution_time_ms",
        ]
        read_only_fields = fields


class AgentInfoSerializer(serializers.Serializer):
    """Serializer para informações de agente."""

    key = serializers.CharField()
    name = serializers.CharField()
    description = serializers.CharField()
    version = serializers.CharField()
    require_llm = serializers.BooleanField()


class AIHealthSerializer(serializers.Serializer):
    """Serializer para health check de IA."""

    llm = serializers.DictField()
    agents = serializers.ListField(child=AgentInfoSerializer())
    status = serializers.CharField()
