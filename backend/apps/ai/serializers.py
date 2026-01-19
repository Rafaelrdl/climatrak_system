"""
AI Serializers - DRF serializers for AI module.
"""

from rest_framework import serializers

from .models import AIJob, AIJobStatus
from .agents import get_registered_agents
from .utils.related import normalize_related_id


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
        """
        Valida estrutura do campo related e normaliza o ID para UUID.
        
        O ID pode ser:
        - UUID válido (retornado como está)
        - ID numérico (convertido para UUID determinístico)
        - String numérica (convertida para UUID determinístico)
        """
        if value is None:
            return None

        if not isinstance(value, dict):
            raise serializers.ValidationError("Related must be an object")

        if "type" not in value:
            raise serializers.ValidationError("Related object must have 'type'")

        if "id" not in value:
            raise serializers.ValidationError("Related object must have 'id'")

        # Normalizar ID para UUID determinístico
        related_type = value["type"]
        raw_id = value["id"]
        
        try:
            normalized_id = normalize_related_id(related_type, raw_id)
            if normalized_id is None:
                raise serializers.ValidationError("Related 'id' cannot be empty")
            value["_normalized_id"] = normalized_id
        except Exception as e:
            raise serializers.ValidationError(f"Failed to normalize related.id: {e}")

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
