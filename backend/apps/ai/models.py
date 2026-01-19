"""
AI Models - Job Execution and Agent State

Implementa modelo de Job para execução assíncrona de agentes IA.
Cada job é isolado por tenant e respeita idempotência.

Referência: docs/ai/02-contrato-api.md
"""

import uuid

from django.conf import settings
from django.db import models
from django.utils import timezone


class AIJobStatus(models.TextChoices):
    """Status possíveis para um job de IA."""

    PENDING = "pending", "Pendente"
    RUNNING = "running", "Em Execução"
    SUCCEEDED = "succeeded", "Sucesso"
    FAILED = "failed", "Falhou"
    TIMEOUT = "timeout", "Timeout"
    CANCELLED = "cancelled", "Cancelado"


class AIJob(models.Model):
    """
    Job de execução de agente de IA.

    Cada job representa uma execução de um agente específico
    com inputs definidos e output estruturado.

    Multi-tenant:
    - tenant_id é denormalizado para queries eficientes
    - Job só pode ser acessado dentro do schema correto

    Idempotência:
    - idempotency_key único por tenant evita duplicatas
    """

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        verbose_name="ID do Job",
    )

    # Identificação do tenant (denormalizado)
    tenant_id = models.UUIDField(
        verbose_name="Tenant ID",
        db_index=True,
        help_text="ID do tenant que originou o job",
    )

    # Identificação do agente
    agent_key = models.CharField(
        max_length=50,
        verbose_name="Chave do Agente",
        db_index=True,
        help_text="Identificador único do agente (ex: root_cause, preventive)",
    )

    # Status do job
    status = models.CharField(
        max_length=20,
        choices=AIJobStatus.choices,
        default=AIJobStatus.PENDING,
        verbose_name="Status",
        db_index=True,
    )

    # Inputs do job (JSON)
    input_data = models.JSONField(
        verbose_name="Dados de Entrada",
        default=dict,
        help_text="Parâmetros de entrada para o agente",
    )

    # Contexto relacionado (opcional)
    related_type = models.CharField(
        max_length=50,
        null=True,
        blank=True,
        verbose_name="Tipo Relacionado",
        help_text="Tipo do objeto relacionado (ex: alert, work_order)",
    )
    related_id = models.UUIDField(
        null=True,
        blank=True,
        verbose_name="ID Relacionado",
        help_text="ID do objeto relacionado",
    )

    # Output do job (JSON)
    output_data = models.JSONField(
        verbose_name="Dados de Saída",
        null=True,
        blank=True,
        help_text="Resultado da execução do agente",
    )

    # Metadados de execução
    error_message = models.TextField(
        null=True,
        blank=True,
        verbose_name="Mensagem de Erro",
    )
    error_details = models.JSONField(
        null=True,
        blank=True,
        verbose_name="Detalhes do Erro",
        help_text="Stack trace e contexto adicional",
    )

    # Métricas de execução
    tokens_used = models.PositiveIntegerField(
        default=0,
        verbose_name="Tokens Utilizados",
        help_text="Total de tokens consumidos pelo LLM",
    )
    execution_time_ms = models.PositiveIntegerField(
        null=True,
        blank=True,
        verbose_name="Tempo de Execução (ms)",
    )

    # Idempotência
    idempotency_key = models.CharField(
        max_length=255,
        null=True,
        blank=True,
        verbose_name="Chave de Idempotência",
        db_index=True,
        help_text="Chave única para evitar duplicatas",
    )

    # Usuário que solicitou
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="ai_jobs",
        verbose_name="Criado por",
    )

    # Timestamps
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Criado em",
        db_index=True,
    )
    started_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Iniciado em",
    )
    completed_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Completado em",
    )

    # Configurações de retry
    attempts = models.PositiveSmallIntegerField(
        default=0,
        verbose_name="Tentativas",
    )
    max_attempts = models.PositiveSmallIntegerField(
        default=3,
        verbose_name="Máximo de Tentativas",
    )

    class Meta:
        verbose_name = "Job de IA"
        verbose_name_plural = "Jobs de IA"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["tenant_id", "status"]),
            models.Index(fields=["tenant_id", "agent_key"]),
            models.Index(fields=["tenant_id", "created_at"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["tenant_id", "idempotency_key"],
                name="unique_ai_job_idempotency_per_tenant",
                condition=models.Q(idempotency_key__isnull=False),
            ),
        ]

    def __str__(self):
        return f"{self.agent_key} - {self.status} ({self.id})"

    def mark_running(self):
        """Marca o job como em execução."""
        self.status = AIJobStatus.RUNNING
        self.started_at = timezone.now()
        self.attempts += 1
        self.save(update_fields=["status", "started_at", "attempts"])

    def mark_succeeded(self, output: dict, tokens: int = 0, execution_time_ms: int = 0):
        """Marca o job como sucesso com output."""
        self.status = AIJobStatus.SUCCEEDED
        self.output_data = output
        self.tokens_used = tokens
        self.execution_time_ms = execution_time_ms
        self.completed_at = timezone.now()
        self.save(
            update_fields=[
                "status",
                "output_data",
                "tokens_used",
                "execution_time_ms",
                "completed_at",
            ]
        )

    def mark_failed(self, error_message: str, error_details: dict = None):
        """Marca o job como falha."""
        self.status = AIJobStatus.FAILED
        self.error_message = error_message
        self.error_details = error_details
        self.completed_at = timezone.now()
        self.save(
            update_fields=["status", "error_message", "error_details", "completed_at"]
        )

    def mark_timeout(self):
        """Marca o job como timeout."""
        self.status = AIJobStatus.TIMEOUT
        self.error_message = "Job exceeded maximum execution time"
        self.completed_at = timezone.now()
        self.save(update_fields=["status", "error_message", "completed_at"])

    def can_retry(self) -> bool:
        """Verifica se o job pode ser reprocessado."""
        return (
            self.status in [AIJobStatus.FAILED, AIJobStatus.TIMEOUT]
            and self.attempts < self.max_attempts
        )

    @classmethod
    def get_or_create_idempotent(
        cls,
        tenant_id: uuid.UUID,
        agent_key: str,
        idempotency_key: str,
        defaults: dict,
    ) -> tuple["AIJob", bool]:
        """
        Cria ou retorna job existente com mesma idempotency_key.

        Args:
            tenant_id: ID do tenant
            agent_key: Chave do agente
            idempotency_key: Chave de idempotência
            defaults: Valores padrão para criação

        Returns:
            Tuple (job, created)
        """
        defaults["tenant_id"] = tenant_id
        defaults["agent_key"] = agent_key
        defaults["idempotency_key"] = idempotency_key

        return cls.objects.get_or_create(
            tenant_id=tenant_id,
            idempotency_key=idempotency_key,
            defaults=defaults,
        )


# ============================================
# KNOWLEDGE BASE MODELS (AI-006)
# ============================================


class AIKnowledgeDocumentStatus(models.TextChoices):
    """Status do documento na base de conhecimento."""

    PENDING = "PENDING", "Pending Indexation"
    INDEXING = "INDEXING", "Indexing"
    INDEXED = "INDEXED", "Indexed"
    FAILED = "FAILED", "Failed"
    OUTDATED = "OUTDATED", "Outdated"


class AIKnowledgeDocument(models.Model):
    """
    Documento indexado na base de conhecimento.

    Rastreia Procedures indexados para RAG.
    Usa content_hash (SHA256) para idempotência.
    """

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    # Denormalização do tenant para queries eficientes
    tenant_id = models.UUIDField(
        verbose_name="Tenant ID",
        db_index=True,
        help_text="ID do tenant (denormalizado)",
    )

    # Referência ao Procedure (polimórfico para futuras expansões)
    source_type = models.CharField(
        max_length=50,
        default="procedure",
        verbose_name="Tipo de Fonte",
        db_index=True,
        help_text="Tipo do documento fonte (procedure, manual, etc)",
    )
    source_id = models.UUIDField(
        verbose_name="ID da Fonte",
        db_index=True,
        help_text="ID do objeto fonte (UUID determinístico)",
    )

    # Metadados do documento
    title = models.CharField(
        max_length=255,
        verbose_name="Título",
    )
    file_type = models.CharField(
        max_length=20,
        choices=[("PDF", "PDF"), ("MARKDOWN", "Markdown"), ("DOCX", "Word Document")],
        verbose_name="Tipo de Arquivo",
    )
    version = models.PositiveIntegerField(
        default=1,
        verbose_name="Versão",
        help_text="Versão do documento fonte",
    )

    # Hash do conteúdo para idempotência
    content_hash = models.CharField(
        max_length=64,
        verbose_name="Hash do Conteúdo",
        db_index=True,
        help_text="SHA256 do texto extraído",
    )

    # Texto extraído completo (para reindexação se necessário)
    extracted_text = models.TextField(
        verbose_name="Texto Extraído",
        help_text="Texto completo extraído do documento",
    )

    # Status de indexação
    status = models.CharField(
        max_length=20,
        choices=AIKnowledgeDocumentStatus.choices,
        default=AIKnowledgeDocumentStatus.PENDING,
        verbose_name="Status",
        db_index=True,
    )

    # Métricas
    chunks_count = models.PositiveIntegerField(
        default=0,
        verbose_name="Quantidade de Chunks",
    )
    char_count = models.PositiveIntegerField(
        default=0,
        verbose_name="Quantidade de Caracteres",
    )

    # Erro se houver
    error_message = models.TextField(
        null=True,
        blank=True,
        verbose_name="Mensagem de Erro",
    )

    # Timestamps
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Criado em",
    )
    indexed_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Indexado em",
    )

    class Meta:
        verbose_name = "Documento de Conhecimento"
        verbose_name_plural = "Documentos de Conhecimento"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["tenant_id", "source_type", "source_id"]),
            models.Index(fields=["tenant_id", "status"]),
            models.Index(fields=["tenant_id", "content_hash"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["tenant_id", "source_type", "source_id", "version"],
                name="unique_knowledge_doc_per_source_version",
            ),
        ]

    def __str__(self):
        return f"{self.title} v{self.version} ({self.status})"


class AIKnowledgeChunk(models.Model):
    """
    Chunk de texto para busca.

    Cada documento é dividido em chunks para FTS.
    Usa SearchVectorField para busca eficiente.
    """

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    # Relacionamento com documento
    document = models.ForeignKey(
        AIKnowledgeDocument,
        on_delete=models.CASCADE,
        related_name="chunks",
        verbose_name="Documento",
    )

    # Denormalização para queries diretas
    tenant_id = models.UUIDField(
        verbose_name="Tenant ID",
        db_index=True,
    )

    # Posição no documento
    chunk_index = models.PositiveIntegerField(
        verbose_name="Índice do Chunk",
        help_text="Posição sequencial no documento (0-based)",
    )

    # Conteúdo do chunk
    content = models.TextField(
        verbose_name="Conteúdo",
        help_text="Texto do chunk",
    )

    # Metadados para contexto
    char_start = models.PositiveIntegerField(
        verbose_name="Posição Inicial",
        help_text="Posição inicial do chunk no texto original",
    )
    char_end = models.PositiveIntegerField(
        verbose_name="Posição Final",
        help_text="Posição final do chunk no texto original",
    )

    # Full-Text Search vector
    search_vector = models.GeneratedField(
        expression=models.Func(
            models.Value("portuguese"),
            models.F("content"),
            function="to_tsvector",
            output_field=models.TextField(),
        ),
        output_field=models.TextField(),
        db_persist=True,
        verbose_name="Vetor de Busca",
    )

    # Timestamps
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Criado em",
    )

    class Meta:
        verbose_name = "Chunk de Conhecimento"
        verbose_name_plural = "Chunks de Conhecimento"
        ordering = ["document", "chunk_index"]
        indexes = [
            models.Index(fields=["tenant_id"]),
            models.Index(fields=["document", "chunk_index"]),
            # GIN index para FTS (criado via migration raw SQL)
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["document", "chunk_index"],
                name="unique_chunk_per_document",
            ),
        ]

    def __str__(self):
        return f"Chunk {self.chunk_index} of {self.document.title}"
