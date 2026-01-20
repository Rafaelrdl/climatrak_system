# Generated migration for AI Knowledge Base (AI-006)
# Adds AIKnowledgeDocument and AIKnowledgeChunk models for RAG

import uuid

from django.contrib.postgres.search import SearchVectorField
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    """
    Add Knowledge Base models for RAG (AI-006).

    Creates:
    - AIKnowledgeDocument: Indexed documents from Procedures
    - AIKnowledgeChunk: Text chunks with FTS vector

    Features:
    - Multi-tenant isolation via tenant_id
    - Idempotent indexing via content_hash (SHA256)
    - Postgres FTS with GIN index on search_vector
    """

    dependencies = [
        ("ai", "0002_aijob_related_index"),
    ]

    operations = [
        # Create AIKnowledgeDocument model
        migrations.CreateModel(
            name="AIKnowledgeDocument",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                (
                    "tenant_id",
                    models.UUIDField(
                        db_index=True,
                        help_text="ID do tenant (denormalizado)",
                        verbose_name="Tenant ID",
                    ),
                ),
                (
                    "source_type",
                    models.CharField(
                        db_index=True,
                        default="procedure",
                        help_text="Tipo do documento fonte (procedure, manual, etc)",
                        max_length=50,
                        verbose_name="Tipo de Fonte",
                    ),
                ),
                (
                    "source_id",
                    models.UUIDField(
                        db_index=True,
                        help_text="ID do objeto fonte (UUID determinístico)",
                        verbose_name="ID da Fonte",
                    ),
                ),
                (
                    "title",
                    models.CharField(max_length=255, verbose_name="Título"),
                ),
                (
                    "file_type",
                    models.CharField(
                        choices=[
                            ("PDF", "PDF"),
                            ("MARKDOWN", "Markdown"),
                            ("DOCX", "Word Document"),
                        ],
                        max_length=20,
                        verbose_name="Tipo de Arquivo",
                    ),
                ),
                (
                    "version",
                    models.PositiveIntegerField(
                        default=1,
                        help_text="Versão do documento fonte",
                        verbose_name="Versão",
                    ),
                ),
                (
                    "content_hash",
                    models.CharField(
                        db_index=True,
                        help_text="SHA256 do texto extraído",
                        max_length=64,
                        verbose_name="Hash do Conteúdo",
                    ),
                ),
                (
                    "extracted_text",
                    models.TextField(
                        help_text="Texto completo extraído do documento",
                        verbose_name="Texto Extraído",
                    ),
                ),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("PENDING", "Pending Indexation"),
                            ("INDEXING", "Indexing"),
                            ("INDEXED", "Indexed"),
                            ("FAILED", "Failed"),
                            ("OUTDATED", "Outdated"),
                        ],
                        db_index=True,
                        default="PENDING",
                        max_length=20,
                        verbose_name="Status",
                    ),
                ),
                (
                    "chunks_count",
                    models.PositiveIntegerField(
                        default=0, verbose_name="Quantidade de Chunks"
                    ),
                ),
                (
                    "char_count",
                    models.PositiveIntegerField(
                        default=0, verbose_name="Quantidade de Caracteres"
                    ),
                ),
                (
                    "error_message",
                    models.TextField(
                        blank=True, null=True, verbose_name="Mensagem de Erro"
                    ),
                ),
                (
                    "created_at",
                    models.DateTimeField(auto_now_add=True, verbose_name="Criado em"),
                ),
                (
                    "indexed_at",
                    models.DateTimeField(
                        blank=True, null=True, verbose_name="Indexado em"
                    ),
                ),
            ],
            options={
                "verbose_name": "Documento de Conhecimento",
                "verbose_name_plural": "Documentos de Conhecimento",
                "ordering": ["-created_at"],
            },
        ),
        # Create AIKnowledgeChunk model
        migrations.CreateModel(
            name="AIKnowledgeChunk",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                (
                    "tenant_id",
                    models.UUIDField(db_index=True, verbose_name="Tenant ID"),
                ),
                (
                    "chunk_index",
                    models.PositiveIntegerField(
                        help_text="Posição sequencial no documento (0-based)",
                        verbose_name="Índice do Chunk",
                    ),
                ),
                (
                    "content",
                    models.TextField(
                        help_text="Texto do chunk", verbose_name="Conteúdo"
                    ),
                ),
                (
                    "char_start",
                    models.PositiveIntegerField(
                        help_text="Posição inicial do chunk no texto original",
                        verbose_name="Posição Inicial",
                    ),
                ),
                (
                    "char_end",
                    models.PositiveIntegerField(
                        help_text="Posição final do chunk no texto original",
                        verbose_name="Posição Final",
                    ),
                ),
                (
                    "search_vector",
                    models.GeneratedField(
                        db_persist=True,
                        expression=models.Func(
                            models.Value("portuguese"),
                            models.F("content"),
                            function="to_tsvector",
                            output_field=SearchVectorField(),
                        ),
                        output_field=SearchVectorField(),
                        verbose_name="Vetor de Busca",
                    ),
                ),
                (
                    "created_at",
                    models.DateTimeField(auto_now_add=True, verbose_name="Criado em"),
                ),
                (
                    "document",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="chunks",
                        to="ai.aiknowledgedocument",
                        verbose_name="Documento",
                    ),
                ),
            ],
            options={
                "verbose_name": "Chunk de Conhecimento",
                "verbose_name_plural": "Chunks de Conhecimento",
                "ordering": ["document", "chunk_index"],
            },
        ),
        # Add indexes for AIKnowledgeDocument
        migrations.AddIndex(
            model_name="aiknowledgedocument",
            index=models.Index(
                fields=["tenant_id", "source_type", "source_id"],
                name="ai_knowledge_doc_source_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="aiknowledgedocument",
            index=models.Index(
                fields=["tenant_id", "status"],
                name="ai_knowledge_doc_status_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="aiknowledgedocument",
            index=models.Index(
                fields=["tenant_id", "content_hash"],
                name="ai_knowledge_doc_hash_idx",
            ),
        ),
        # Add constraint for unique document per source/version
        migrations.AddConstraint(
            model_name="aiknowledgedocument",
            constraint=models.UniqueConstraint(
                fields=["tenant_id", "source_type", "source_id", "version"],
                name="unique_knowledge_doc_per_source_version",
            ),
        ),
        # Add indexes for AIKnowledgeChunk
        migrations.AddIndex(
            model_name="aiknowledgechunk",
            index=models.Index(
                fields=["tenant_id"],
                name="ai_knowledge_chunk_tenant_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="aiknowledgechunk",
            index=models.Index(
                fields=["document", "chunk_index"],
                name="ai_knowledge_chunk_doc_idx",
            ),
        ),
        # Add constraint for unique chunk per document
        migrations.AddConstraint(
            model_name="aiknowledgechunk",
            constraint=models.UniqueConstraint(
                fields=["document", "chunk_index"],
                name="unique_chunk_per_document",
            ),
        ),
        # Create GIN index for FTS on search_vector
        migrations.RunSQL(
            sql="""
                CREATE INDEX IF NOT EXISTS ai_knowledge_chunk_search_gin_idx
                ON ai_aiknowledgechunk
                USING GIN (search_vector);
            """,
            reverse_sql="""
                DROP INDEX IF EXISTS ai_knowledge_chunk_search_gin_idx;
            """,
        ),
    ]
