"""
AI Views - DRF ViewSets for AI module.
"""

import logging
import uuid

from django.db import connection

from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from drf_spectacular.utils import extend_schema, extend_schema_view

from .agents import get_agent, get_registered_agents
from .models import AIJob
from .providers.factory import check_llm_health
from .serializers import (
    AgentInfoSerializer,
    AIHealthSerializer,
    AIJobCreateSerializer,
    AIJobListSerializer,
    AIJobSerializer,
)
from .services import AIJobService
from .tasks import execute_ai_job

logger = logging.getLogger(__name__)


def convert_related_id_to_uuid(related_id: str | int, related_type: str) -> uuid.UUID:
    """
    Converte related.id (int/string) para UUID determinístico se não for UUID válido.

    Args:
        related_id: ID do objeto relacionado (pode ser int, string numérica ou UUID)
        related_type: Tipo do objeto (ex: "alert", "work_order")

    Returns:
        UUID válido

    Raises:
        ValueError: Se conversão falhar
    """
    if related_id is None:
        return None

    # Tentar validar como UUID
    if isinstance(related_id, uuid.UUID):
        return related_id

    related_id_str = str(related_id).strip()

    # Tentar fazer parse como UUID válido
    try:
        return uuid.UUID(related_id_str)
    except (ValueError, AttributeError):
        pass

    # Não é UUID válido, gerar determinístico baseado em namespace
    try:
        # Garantir que temos um string válido para o namespace
        deterministic_id = f"{related_type}:{related_id_str}"
        return uuid.uuid5(uuid.NAMESPACE_DNS, deterministic_id)
    except Exception as e:
        raise ValueError(f"Não foi possível converter related.id '{related_id}' para UUID: {e}")


@extend_schema_view(
    list=extend_schema(
        summary="Listar jobs de IA",
        description="Lista jobs de IA do tenant atual",
        responses={200: AIJobListSerializer(many=True)},
    ),
    retrieve=extend_schema(
        summary="Detalhe do job de IA",
        description="Retorna detalhes completos de um job",
        responses={200: AIJobSerializer},
    ),
)
class AIJobViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet para consulta de jobs de IA.

    Apenas leitura - criação é via endpoints específicos de agentes.
    """

    permission_classes = [IsAuthenticated]
    lookup_field = "id"

    def get_serializer_class(self):
        if self.action == "list":
            return AIJobListSerializer
        return AIJobSerializer

    def get_queryset(self):
        """Retorna jobs do tenant atual."""
        return AIJobService.list_jobs(
            agent_key=self.request.query_params.get("agent"),
            status=self.request.query_params.get("status"),
            limit=100,
        )

    def retrieve(self, request, *args, **kwargs):
        """Retorna detalhes de um job."""
        job = AIJobService.get_job(kwargs.get("id"))
        if not job:
            return Response(
                {"detail": "Job not found"},
                status=status.HTTP_404_NOT_FOUND,
            )
        serializer = AIJobSerializer(job)
        return Response(serializer.data)


class AgentViewSet(viewsets.ViewSet):
    """
    ViewSet para operações com agentes de IA.

    Endpoints:
    - GET /agents/ - Lista agentes disponíveis
    - POST /agents/{agent_key}/run/ - Executa agente
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="Listar agentes disponíveis",
        description="Retorna lista de agentes de IA registrados",
        responses={200: AgentInfoSerializer(many=True)},
    )
    def list(self, request):
        """Lista agentes disponíveis."""
        agents = get_registered_agents()
        return Response(agents)

    @extend_schema(
        summary="Executar agente de IA",
        description=(
            "Cria um job para execução do agente especificado. "
            "O job é processado de forma assíncrona."
        ),
        request=AIJobCreateSerializer,
        responses={
            202: {"type": "object", "properties": {
                "job_id": {"type": "string", "format": "uuid"},
                "status": {"type": "string"},
            }},
            400: {"type": "object", "properties": {
                "detail": {"type": "string"},
            }},
            404: {"type": "object", "properties": {
                "detail": {"type": "string"},
            }},
        },
    )
    @action(detail=True, methods=["post"], url_path="run")
    def run(self, request, pk=None):
        """
        Executa um agente de IA.

        Cria um job e enfileira para processamento assíncrono.
        """
        agent_key = pk

        # Verificar se agente existe
        agent = get_agent(agent_key)
        if agent is None:
            return Response(
                {"detail": f"Agent '{agent_key}' not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Validar input
        serializer = AIJobCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        related = data.get("related")
        related_id = None

        if related:
            # Converter related.id (int/string) para UUID determinístico se necessário
            try:
                related_id = convert_related_id_to_uuid(related.get("id"), related.get("type"))
            except ValueError as e:
                return Response(
                    {"detail": f"Erro ao processar related.id: {str(e)}"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        try:
            # Criar job
            job, created = AIJobService.create_job(
                agent_key=agent_key,
                input_data=data.get("input", {}),
                user=request.user,
                related_type=related.get("type") if related else None,
                related_id=related_id,
                idempotency_key=data.get("idempotency_key"),
            )

            # Se criado, enfileirar para execução
            if created:
                execute_ai_job.delay(
                    job_id=str(job.id),
                    schema_name=connection.schema_name,
                )

            return Response(
                {
                    "job_id": str(job.id),
                    "status": job.status,
                    "created": created,
                },
                status=status.HTTP_202_ACCEPTED if created else status.HTTP_200_OK,
            )

        except ValueError as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )


class AIHealthViewSet(viewsets.ViewSet):
    """
    ViewSet para health check de IA.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="Health check de IA",
        description="Verifica saúde dos serviços de IA (LLM, agentes)",
        responses={200: AIHealthSerializer},
    )
    def list(self, request):
        """Retorna status de saúde dos serviços de IA."""
        llm_health = check_llm_health()
        agents = get_registered_agents()

        overall_status = "healthy" if llm_health.get("healthy") else "degraded"

        return Response({
            "llm": llm_health,
            "agents": agents,
            "status": overall_status,
        })
