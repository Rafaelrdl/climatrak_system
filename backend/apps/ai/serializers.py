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


# ==============================================================================
# KNOWLEDGE BASE SERIALIZERS (AI-006)
# ==============================================================================


class KnowledgeSearchQuerySerializer(serializers.Serializer):
    """Serializer para query de busca na base de conhecimento."""

    q = serializers.CharField(
        required=True,
        min_length=2,
        max_length=200,
        help_text="Termo de busca (2-200 caracteres)",
    )
    page = serializers.IntegerField(
        required=False,
        default=1,
        min_value=1,
        help_text="Página (1-based)",
    )
    page_size = serializers.IntegerField(
        required=False,
        default=10,
        min_value=1,
        max_value=50,
        help_text="Tamanho da página (1-50)",
    )
    source_type = serializers.CharField(
        required=False,
        max_length=50,
        help_text="Filtrar por tipo de fonte (ex: procedure)",
    )


class KnowledgeSearchResultSerializer(serializers.Serializer):
    """Serializer para resultado de busca."""

    chunk_id = serializers.UUIDField(help_text="ID do chunk")
    document_id = serializers.UUIDField(help_text="ID do documento")
    document_title = serializers.CharField(help_text="Título do documento")
    source_type = serializers.CharField(help_text="Tipo da fonte")
    source_id = serializers.UUIDField(help_text="ID da fonte (UUID determinístico)")
    version = serializers.IntegerField(help_text="Versão do documento")
    chunk_index = serializers.IntegerField(help_text="Índice do chunk no documento")
    content = serializers.CharField(help_text="Conteúdo do chunk")
    rank = serializers.FloatField(help_text="Score de relevância")
    highlight = serializers.CharField(
        required=False,
        allow_null=True,
        help_text="Trecho com termos destacados",
    )


class KnowledgeSearchResponseSerializer(serializers.Serializer):
    """Serializer para resposta de busca."""

    results = KnowledgeSearchResultSerializer(many=True)
    total_count = serializers.IntegerField(help_text="Total de resultados")
    query = serializers.CharField(help_text="Query executada")
    page = serializers.IntegerField(help_text="Página atual")
    page_size = serializers.IntegerField(help_text="Tamanho da página")


class KnowledgeDocumentSerializer(serializers.Serializer):
    """Serializer para documento de conhecimento."""

    id = serializers.UUIDField()
    source_type = serializers.CharField()
    source_id = serializers.UUIDField()
    title = serializers.CharField()
    file_type = serializers.CharField()
    version = serializers.IntegerField()
    status = serializers.CharField()
    chunks_count = serializers.IntegerField()
    char_count = serializers.IntegerField()
    created_at = serializers.DateTimeField()
    indexed_at = serializers.DateTimeField(allow_null=True)


class KnowledgeStatsSerializer(serializers.Serializer):
    """Serializer para estatísticas da base de conhecimento."""

    total_documents = serializers.IntegerField()
    total_chunks = serializers.IntegerField()
    by_status = serializers.DictField(child=serializers.IntegerField())
    by_source_type = serializers.DictField(child=serializers.IntegerField())
    by_file_type = serializers.DictField(child=serializers.IntegerField())

