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


# ==============================================================================
# KNOWLEDGE BASE VIEWSET (AI-006)
# ==============================================================================


@extend_schema_view(
    search=extend_schema(
        summary="Buscar na base de conhecimento",
        description="""
        Busca full-text search na base de conhecimento.
        
        Busca em todos os chunks de documentos indexados (procedures).
        Retorna resultados rankeados por relevância com highlighting.
        
        Parâmetros:
        - q: Termo de busca (obrigatório, 2-200 chars)
        - page: Página (default: 1)
        - page_size: Tamanho da página (default: 10, max: 50)
        - source_type: Filtrar por tipo (ex: procedure)
        """,
        parameters=[
            OpenApiParameter(
                name="q",
                description="Termo de busca",
                required=True,
                type=str,
            ),
            OpenApiParameter(
                name="page",
                description="Página (1-based)",
                required=False,
                type=int,
            ),
            OpenApiParameter(
                name="page_size",
                description="Tamanho da página (1-50)",
                required=False,
                type=int,
            ),
            OpenApiParameter(
                name="source_type",
                description="Filtrar por tipo de fonte",
                required=False,
                type=str,
            ),
        ],
    ),
)
class AIKnowledgeViewSet(viewsets.ViewSet):
    """
    ViewSet para busca na base de conhecimento.
    
    Endpoints:
    - GET /api/ai/knowledge/search/?q=termo
    - GET /api/ai/knowledge/stats/
    - GET /api/ai/knowledge/documents/
    """

    permission_classes = [IsAuthenticated]

    def _get_tenant_id(self):
        """Obtém tenant_id do schema atual."""
        from apps.tenants.models import Tenant

        tenant_schema = connection.schema_name
        try:
            tenant = Tenant.objects.get(schema_name=tenant_schema)
            return tenant.id
        except Tenant.DoesNotExist:
            return None

    @action(detail=False, methods=["get"])
    def search(self, request):
        """
        Busca full-text search na base de conhecimento.
        
        Query params:
        - q: Termo de busca (obrigatório)
        - page: Página (default: 1)
        - page_size: Tamanho da página (default: 10)
        - source_type: Filtrar por tipo de fonte
        """
        from .knowledge.search import KnowledgeSearch
        from .serializers import (
            KnowledgeSearchQuerySerializer,
            KnowledgeSearchResponseSerializer,
        )

        # Validar query params
        query_serializer = KnowledgeSearchQuerySerializer(data=request.query_params)
        if not query_serializer.is_valid():
            return Response(
                query_serializer.errors,
                status=status.HTTP_400_BAD_REQUEST,
            )

        data = query_serializer.validated_data
        tenant_id = self._get_tenant_id()

        if not tenant_id:
            return Response(
                {"detail": "Tenant not found"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Executar busca
        searcher = KnowledgeSearch(tenant_id)
        result = searcher.search(
            query=data["q"],
            page=data.get("page", 1),
            page_size=data.get("page_size", 10),
            source_type=data.get("source_type"),
        )

        # Serializar resposta
        response_data = {
            "results": [
                {
                    "chunk_id": r.chunk_id,
                    "document_id": r.document_id,
                    "document_title": r.document_title,
                    "source_type": r.source_type,
                    "source_id": r.source_id,
                    "version": r.version,
                    "chunk_index": r.chunk_index,
                    "content": r.content,
                    "rank": r.rank,
                    "highlight": r.highlight,
                }
                for r in result.results
            ],
            "total_count": result.total_count,
            "query": result.query,
            "page": result.page,
            "page_size": result.page_size,
        }

        return Response(response_data)

    @action(detail=False, methods=["get"])
    def stats(self, request):
        """
        Retorna estatísticas da base de conhecimento.
        """
        from django.db.models import Count

        from .models import AIKnowledgeChunk, AIKnowledgeDocument

        tenant_id = self._get_tenant_id()

        if not tenant_id:
            return Response(
                {"detail": "Tenant not found"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Contagens
        docs = AIKnowledgeDocument.objects.filter(tenant_id=tenant_id)
        chunks = AIKnowledgeChunk.objects.filter(tenant_id=tenant_id)

        # Por status
        by_status = dict(
            docs.values("status").annotate(count=Count("id")).values_list("status", "count")
        )

        # Por source_type
        by_source_type = dict(
            docs.values("source_type").annotate(count=Count("id")).values_list("source_type", "count")
        )

        # Por file_type
        by_file_type = dict(
            docs.values("file_type").annotate(count=Count("id")).values_list("file_type", "count")
        )

        return Response({
            "total_documents": docs.count(),
            "total_chunks": chunks.count(),
            "by_status": by_status,
            "by_source_type": by_source_type,
            "by_file_type": by_file_type,
        })

    @action(detail=False, methods=["get"])
    def documents(self, request):
        """
        Lista documentos indexados.
        
        Query params:
        - status: Filtrar por status
        - source_type: Filtrar por tipo de fonte
        - page: Página (default: 1)
        - page_size: Tamanho da página (default: 20)
        """
        from .models import AIKnowledgeDocument

        tenant_id = self._get_tenant_id()

        if not tenant_id:
            return Response(
                {"detail": "Tenant not found"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Filtros
        queryset = AIKnowledgeDocument.objects.filter(tenant_id=tenant_id)

        status_filter = request.query_params.get("status")
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        source_type = request.query_params.get("source_type")
        if source_type:
            queryset = queryset.filter(source_type=source_type)

        # Paginação
        page = int(request.query_params.get("page", 1))
        page_size = min(int(request.query_params.get("page_size", 20)), 50)

        total = queryset.count()
        offset = (page - 1) * page_size
        documents = queryset.order_by("-indexed_at", "-created_at")[offset:offset + page_size]

        return Response({
            "results": [
                {
                    "id": doc.id,
                    "source_type": doc.source_type,
                    "source_id": doc.source_id,
                    "title": doc.title,
                    "file_type": doc.file_type,
                    "version": doc.version,
                    "status": doc.status,
                    "chunks_count": doc.chunks_count,
                    "char_count": doc.char_count,
                    "created_at": doc.created_at,
                    "indexed_at": doc.indexed_at,
                }
                for doc in documents
            ],
            "total_count": total,
            "page": page,
            "page_size": page_size,
        })


# ==============================================================================
# AI USAGE METRICS
# ==============================================================================


@extend_schema_view(
    monthly=extend_schema(
        summary="Métricas de uso mensal de tokens",
        description=(
            "Retorna uso agregado de tokens LLM por mês. "
            "Suporta filtros por agent, model e user_id."
        ),
        parameters=[
            OpenApiParameter(
                name="months",
                description="Número de meses para análise (default: 12, max: 36)",
                required=False,
                type=int,
            ),
            OpenApiParameter(
                name="agent",
                description="Filtrar por chave do agente (ex: preventive, predictive)",
                required=False,
                type=str,
            ),
            OpenApiParameter(
                name="model",
                description="Filtrar por modelo LLM (ex: mistral-nemo)",
                required=False,
                type=str,
            ),
            OpenApiParameter(
                name="user_id",
                description="Filtrar por ID do usuário",
                required=False,
                type=int,
            ),
        ],
    ),
)
class AIUsageViewSet(viewsets.ViewSet):
    """
    ViewSet para métricas de uso de tokens LLM.

    Endpoints:
    - GET /api/ai/usage/monthly/ - Retorna uso agregado por mês
    """

    permission_classes = [IsAuthenticated]

    def _get_tenant_uuid(self) -> uuid.UUID:
        """Retorna UUID determinístico do tenant atual."""
        schema_name = connection.schema_name
        return uuid.uuid5(uuid.NAMESPACE_DNS, f"tenant:{schema_name}")

    @action(detail=False, methods=["get"], url_path="monthly")
    def monthly(self, request):
        """
        Retorna uso de tokens agregado por mês.

        Query Parameters:
            - months: Número de meses (default: 12, max: 36)
            - agent: Filtrar por chave do agente
            - model: Filtrar por modelo LLM
            - user_id: Filtrar por ID do usuário
        """
        from django.db.models import Sum, Count
        from django.db.models.functions import TruncMonth
        from dateutil.relativedelta import relativedelta

        from .models import AIUsageLog
        from .serializers import AIUsageMonthlyResponseSerializer

        tenant_id = self._get_tenant_uuid()
        tenant_schema = connection.schema_name

        # Parâmetros
        months = min(int(request.query_params.get("months", 12)), 36)
        agent_filter = request.query_params.get("agent")
        model_filter = request.query_params.get("model")
        user_id_filter = request.query_params.get("user_id")

        # Data de corte
        from django.utils import timezone
        now = timezone.now()
        cutoff_date = now - relativedelta(months=months)

        # Query base
        queryset = AIUsageLog.objects.filter(
            tenant_id=tenant_id,
            created_at__gte=cutoff_date,
        )

        # Aplicar filtros
        if agent_filter:
            queryset = queryset.filter(agent_key=agent_filter)
        if model_filter:
            queryset = queryset.filter(model=model_filter)
        if user_id_filter:
            try:
                queryset = queryset.filter(created_by_id=int(user_id_filter))
            except (ValueError, TypeError):
                pass

        # Agregar por mês
        monthly_data = (
            queryset
            .annotate(month=TruncMonth("created_at"))
            .values("month")
            .annotate(
                input_tokens=Sum("input_tokens"),
                output_tokens=Sum("output_tokens"),
                total_tokens=Sum("total_tokens"),
                calls=Count("id"),
            )
            .order_by("-month")
        )

        # Formatar buckets
        buckets = [
            {
                "month": item["month"].strftime("%Y-%m"),
                "input_tokens": item["input_tokens"] or 0,
                "output_tokens": item["output_tokens"] or 0,
                "total_tokens": item["total_tokens"] or 0,
                "calls": item["calls"] or 0,
            }
            for item in monthly_data
        ]

        # Calcular totais
        totals = {
            "input_tokens": sum(b["input_tokens"] for b in buckets),
            "output_tokens": sum(b["output_tokens"] for b in buckets),
            "total_tokens": sum(b["total_tokens"] for b in buckets),
            "calls": sum(b["calls"] for b in buckets),
        }

        response_data = {
            "tenant_id": tenant_id,
            "tenant_schema": tenant_schema,
            "months_requested": months,
            "filters": {
                "agent": agent_filter,
                "model": model_filter,
                "user_id": user_id_filter,
            },
            "buckets": buckets,
            "totals": totals,
        }

        serializer = AIUsageMonthlyResponseSerializer(data=response_data)
        serializer.is_valid(raise_exception=True)

        return Response(response_data)


