"""
AI Services - Business logic for AI module.

Service layer para execução de agentes e gerenciamento de jobs.
"""

import logging
import uuid
from typing import Optional

from django.db import connection, transaction

from .agents import get_agent, get_registered_agents
from .agents.base import AgentContext
from .models import AIJob, AIJobStatus

logger = logging.getLogger(__name__)


class AIJobService:
    """
    Service para gerenciamento de jobs de IA.

    Responsabilidades:
    - Criar jobs com idempotência
    - Validar agentes disponíveis
    - Preparar contexto de execução
    """

    @classmethod
    def get_tenant_uuid(cls) -> uuid.UUID:
        """
        Retorna UUID do tenant atual baseado no schema.

        Usa namespace DNS para gerar UUID determinístico.
        """
        schema_name = connection.schema_name
        return uuid.uuid5(uuid.NAMESPACE_DNS, f"tenant:{schema_name}")

    @classmethod
    def create_job(
        cls,
        agent_key: str,
        input_data: dict,
        user=None,
        related_type: str = None,
        related_id: uuid.UUID = None,
        idempotency_key: str = None,
    ) -> tuple[AIJob, bool]:
        """
        Cria um novo job de IA.

        Se idempotency_key for fornecida e já existir, retorna job existente.

        Args:
            agent_key: Chave do agente a executar
            input_data: Dados de entrada
            user: Usuário que solicitou (opcional)
            related_type: Tipo do objeto relacionado (opcional)
            related_id: ID do objeto relacionado (opcional)
            idempotency_key: Chave de idempotência (opcional)

        Returns:
            Tuple (job, created)

        Raises:
            ValueError: Se agente não existe
        """
        # Validar agente
        agent = get_agent(agent_key)
        if agent is None:
            raise ValueError(f"Agent '{agent_key}' not found")

        tenant_id = cls.get_tenant_uuid()

        # Se tem idempotency_key, usar get_or_create
        if idempotency_key:
            return AIJob.get_or_create_idempotent(
                tenant_id=tenant_id,
                agent_key=agent_key,
                idempotency_key=idempotency_key,
                defaults={
                    "input_data": input_data,
                    "created_by": user,
                    "related_type": related_type,
                    "related_id": related_id,
                },
            )

        # Criar novo job
        job = AIJob.objects.create(
            tenant_id=tenant_id,
            agent_key=agent_key,
            input_data=input_data,
            created_by=user,
            related_type=related_type,
            related_id=related_id,
        )
        return job, True

    @classmethod
    def execute_job(cls, job: AIJob) -> AIJob:
        """
        Executa um job de IA.

        Este método é chamado pela task Celery.

        Args:
            job: Job a executar

        Returns:
            Job atualizado com resultado
        """
        # Marcar como em execução
        job.mark_running()

        # Obter agente
        agent = get_agent(job.agent_key)
        if agent is None:
            job.mark_failed(f"Agent '{job.agent_key}' not found")
            return job

        # Construir contexto
        context = AgentContext(
            tenant_id=str(job.tenant_id),
            tenant_schema=connection.schema_name,
            user_id=str(job.created_by_id) if job.created_by_id else None,
            job_id=str(job.id),
            related_type=job.related_type,
            related_id=str(job.related_id) if job.related_id else None,
        )

        # Executar agente
        result = agent.run(job.input_data, context)

        # Atualizar job com resultado
        if result.success:
            job.mark_succeeded(
                output=result.data,
                tokens=result.tokens_used,
                execution_time_ms=result.execution_time_ms,
            )
        else:
            job.mark_failed(
                error_message=result.error or "Unknown error",
                error_details=result.error_details,
            )

        return job

    @classmethod
    def get_job(cls, job_id: uuid.UUID) -> Optional[AIJob]:
        """
        Retorna job pelo ID (dentro do tenant atual).

        Args:
            job_id: ID do job

        Returns:
            Job ou None se não encontrado
        """
        tenant_id = cls.get_tenant_uuid()
        return AIJob.objects.filter(
            id=job_id,
            tenant_id=tenant_id,
        ).first()

    @classmethod
    def list_jobs(
        cls,
        agent_key: str = None,
        status: str = None,
        related_type: str = None,
        related_id: uuid.UUID = None,
        limit: int = 50,
    ):
        """
        Lista jobs do tenant atual.

        Args:
            agent_key: Filtrar por agente (opcional)
            status: Filtrar por status (opcional)
            related_type: Filtrar por tipo relacionado (opcional)
            related_id: Filtrar por ID relacionado - UUID normalizado (opcional)
            limit: Limite de resultados

        Returns:
            QuerySet de jobs
        """
        tenant_id = cls.get_tenant_uuid()
        queryset = AIJob.objects.filter(tenant_id=tenant_id)

        if agent_key:
            queryset = queryset.filter(agent_key=agent_key)

        if status:
            queryset = queryset.filter(status=status)

        if related_type:
            queryset = queryset.filter(related_type=related_type)

        if related_id:
            queryset = queryset.filter(related_id=related_id)

        return queryset.order_by("-created_at")[:limit]

    @classmethod
    def cancel_job(cls, job_id: uuid.UUID) -> Optional[AIJob]:
        """
        Cancela um job pendente.

        Args:
            job_id: ID do job

        Returns:
            Job cancelado ou None se não encontrado/não cancelável
        """
        tenant_id = cls.get_tenant_uuid()
        job = AIJob.objects.filter(
            id=job_id,
            tenant_id=tenant_id,
            status=AIJobStatus.PENDING,
        ).first()

        if job:
            job.status = AIJobStatus.CANCELLED
            job.save(update_fields=["status"])

        return job
