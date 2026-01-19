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

from drf_spectacular.utils import extend_schema, extend_schema_view, OpenApiParameter

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
from .utils.related import normalize_related_id

logger = logging.getLogger(__name__)


@extend_schema_view(
    list=extend_schema(
        summary="Listar jobs de IA",
        description="Lista jobs de IA do tenant atual. Aceita filtros por agent, status, related_type e related_id.",
        parameters=[
            OpenApiParameter(
                name="agent",
                description="Filtrar por chave do agente (ex: predictive, preventive)",
                required=False,
                type=str,
            ),
            OpenApiParameter(
                name="status",
                description="Filtrar por status (pending, running, succeeded, failed)",
                required=False,
                type=str,
            ),
            OpenApiParameter(
                name="related_type",
                description="Filtrar por tipo relacionado (ex: asset, work_order)",
                required=False,
                type=str,
            ),
            OpenApiParameter(
                name="related_id",
                description="Filtrar por ID relacionado (raw ID, será convertido para UUID)",
                required=False,
                type=str,
            ),
        ],
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
    
    Query Parameters:
        - agent: Filtrar por chave do agente
        - status: Filtrar por status do job
        - related_type: Filtrar por tipo do objeto relacionado
        - related_id: Filtrar por ID do objeto relacionado (raw, convertido para UUID)
    """

    permission_classes = [IsAuthenticated]
    lookup_field = "id"

    def get_serializer_class(self):
        if self.action == "list":
            return AIJobListSerializer
        return AIJobSerializer

    def get_queryset(self):
        """
        Retorna jobs do tenant atual com filtros opcionais.
        
        Filtros suportados via query params:
        - agent: chave do agente
        - status: status do job
        - related_type: tipo do objeto relacionado
        - related_id: ID raw do objeto (convertido para UUID determinístico)
        """
        agent_key = self.request.query_params.get("agent")
        status_filter = self.request.query_params.get("status")
        related_type = self.request.query_params.get("related_type")
        related_id_raw = self.request.query_params.get("related_id")
        
        # Converter related_id raw para UUID se fornecido
        related_id = None
        if related_id_raw and related_type:
            try:
                related_id = normalize_related_id(related_type, related_id_raw)
            except Exception:
                # Se falhar conversão, retorna queryset vazio
                logger.warning(f"Failed to normalize related_id: {related_id_raw}")
                return AIJob.objects.none()
        
        return AIJobService.list_jobs(
            agent_key=agent_key,
            status=status_filter,
            related_type=related_type,
            related_id=related_id,
            limit=100,
        )
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
        related_type = None

        if related:
            # Usar o ID normalizado pelo serializer (já convertido para UUID)
            related_type = related.get("type")
            related_id = related.get("_normalized_id")

        try:
            # Criar job
            job, created = AIJobService.create_job(
                agent_key=agent_key,
                input_data=data.get("input", {}),
                user=request.user,
                related_type=related_type,
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
