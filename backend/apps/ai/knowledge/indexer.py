"""
Procedure Indexer for AI Knowledge Base (AI-006).

Indexa Procedures na base de conhecimento de forma idempotente.
Usa content_hash (SHA256) para detectar alterações.
"""

import hashlib
import logging
import uuid
from dataclasses import dataclass
from datetime import datetime
from typing import Optional, Tuple

from django.db import transaction
from django.utils import timezone

from apps.cmms.models import Procedure

from ..models import AIKnowledgeChunk, AIKnowledgeDocument, AIKnowledgeDocumentStatus
from .chunking import TextChunker
from .extractors import ExtractionError, extract_text

logger = logging.getLogger(__name__)


@dataclass
class IndexResult:
    """Resultado de indexação."""

    document_id: uuid.UUID
    procedure_id: int
    status: str
    chunks_count: int
    char_count: int
    was_updated: bool
    error: Optional[str] = None


class ProcedureIndexer:
    """
    Indexa Procedures para busca RAG.

    Características:
    - Idempotente via content_hash (SHA256)
    - Multi-tenant via tenant_id
    - Atomic: cria documento e chunks na mesma transação
    """

    def __init__(
        self,
        tenant_id: uuid.UUID,
        min_chunk_size: int = 1200,
        max_chunk_size: int = 1800,
        overlap: int = 200,
    ):
        """
        Args:
            tenant_id: ID do tenant para isolamento
            min_chunk_size: Tamanho mínimo do chunk
            max_chunk_size: Tamanho máximo do chunk
            overlap: Overlap entre chunks
        """
        self.tenant_id = tenant_id
        self.chunker = TextChunker(
            min_chunk_size=min_chunk_size,
            max_chunk_size=max_chunk_size,
            overlap=overlap,
        )

    def index_procedure(self, procedure: Procedure) -> IndexResult:
        """
        Indexa um Procedure na base de conhecimento.

        Processo:
        1. Extrai texto do arquivo
        2. Calcula hash do conteúdo
        3. Verifica se já existe documento com mesmo hash
        4. Se não existir ou hash diferente, cria/atualiza documento e chunks

        Args:
            procedure: Instância de Procedure com arquivo

        Returns:
            IndexResult com status da indexação
        """
        procedure_id = procedure.id
        logger.info(f"Indexing procedure {procedure_id} (v{procedure.version})")

        # Converte ID para UUID determinístico
        source_id = self._to_uuid(procedure_id)

        try:
            # 1. Extrai texto do arquivo
            if not procedure.file:
                return IndexResult(
                    document_id=uuid.UUID(int=0),
                    procedure_id=procedure_id,
                    status="skipped",
                    chunks_count=0,
                    char_count=0,
                    was_updated=False,
                    error="Procedure has no file attached",
                )

            extracted_text = self._extract_procedure_text(procedure)
            if not extracted_text:
                return IndexResult(
                    document_id=uuid.UUID(int=0),
                    procedure_id=procedure_id,
                    status="skipped",
                    chunks_count=0,
                    char_count=0,
                    was_updated=False,
                    error="No text extracted from file",
                )

            # 2. Calcula hash do conteúdo
            content_hash = self._compute_hash(extracted_text)
            char_count = len(extracted_text)

            # 3. Verifica documento existente
            existing_doc = AIKnowledgeDocument.objects.filter(
                tenant_id=self.tenant_id,
                source_type="procedure",
                source_id=source_id,
                version=procedure.version,
            ).first()

            # Idempotência: se hash igual, não reindexar
            if existing_doc and existing_doc.content_hash == content_hash:
                logger.info(f"Procedure {procedure_id} already indexed with same content hash")
                return IndexResult(
                    document_id=existing_doc.id,
                    procedure_id=procedure_id,
                    status="unchanged",
                    chunks_count=existing_doc.chunks_count,
                    char_count=existing_doc.char_count,
                    was_updated=False,
                )

            # 4. Cria/atualiza documento e chunks
            with transaction.atomic():
                # Marca documentos anteriores como outdated
                AIKnowledgeDocument.objects.filter(
                    tenant_id=self.tenant_id,
                    source_type="procedure",
                    source_id=source_id,
                    status=AIKnowledgeDocumentStatus.INDEXED,
                ).exclude(
                    version=procedure.version,
                ).update(
                    status=AIKnowledgeDocumentStatus.OUTDATED,
                )

                # Cria ou atualiza documento
                document, created = AIKnowledgeDocument.objects.update_or_create(
                    tenant_id=self.tenant_id,
                    source_type="procedure",
                    source_id=source_id,
                    version=procedure.version,
                    defaults={
                        "title": procedure.title,
                        "file_type": procedure.file_type,
                        "content_hash": content_hash,
                        "extracted_text": extracted_text,
                        "status": AIKnowledgeDocumentStatus.INDEXING,
                        "char_count": char_count,
                    },
                )

                # Remove chunks antigos se documento existente
                if not created:
                    document.chunks.all().delete()

                # Gera e salva chunks
                chunks = self.chunker.chunk(extracted_text)
                chunk_objects = [
                    AIKnowledgeChunk(
                        document=document,
                        tenant_id=self.tenant_id,
                        chunk_index=chunk.index,
                        content=chunk.content,
                        char_start=chunk.char_start,
                        char_end=chunk.char_end,
                    )
                    for chunk in chunks
                ]

                AIKnowledgeChunk.objects.bulk_create(chunk_objects)

                # Atualiza documento com status final
                document.status = AIKnowledgeDocumentStatus.INDEXED
                document.chunks_count = len(chunks)
                document.indexed_at = timezone.now()
                document.error_message = None
                document.save(update_fields=["status", "chunks_count", "indexed_at", "error_message"])

            logger.info(
                f"Indexed procedure {procedure_id}: "
                f"{len(chunks)} chunks, {char_count} chars"
            )

            return IndexResult(
                document_id=document.id,
                procedure_id=procedure_id,
                status="indexed",
                chunks_count=len(chunks),
                char_count=char_count,
                was_updated=not created,
            )

        except ExtractionError as e:
            logger.error(f"Extraction failed for procedure {procedure_id}: {e}")
            self._mark_failed(source_id, procedure, str(e))
            return IndexResult(
                document_id=uuid.UUID(int=0),
                procedure_id=procedure_id,
                status="failed",
                chunks_count=0,
                char_count=0,
                was_updated=False,
                error=str(e),
            )

        except Exception as e:
            logger.exception(f"Indexing failed for procedure {procedure_id}: {e}")
            self._mark_failed(source_id, procedure, str(e))
            return IndexResult(
                document_id=uuid.UUID(int=0),
                procedure_id=procedure_id,
                status="failed",
                chunks_count=0,
                char_count=0,
                was_updated=False,
                error=str(e),
            )

    def index_procedure_by_id(self, procedure_id: int) -> IndexResult:
        """
        Indexa Procedure por ID.

        Args:
            procedure_id: ID do Procedure

        Returns:
            IndexResult
        """
        try:
            procedure = Procedure.objects.get(id=procedure_id)
        except Procedure.DoesNotExist:
            return IndexResult(
                document_id=uuid.UUID(int=0),
                procedure_id=procedure_id,
                status="not_found",
                chunks_count=0,
                char_count=0,
                was_updated=False,
                error=f"Procedure {procedure_id} not found",
            )

        return self.index_procedure(procedure)

    def _extract_procedure_text(self, procedure: Procedure) -> str:
        """Extrai texto do arquivo do Procedure."""
        file_obj = procedure.file.open("rb")
        try:
            return extract_text(file_obj, procedure.file_type)
        finally:
            file_obj.close()

    def _compute_hash(self, text: str) -> str:
        """Calcula SHA256 do texto."""
        return hashlib.sha256(text.encode("utf-8")).hexdigest()

    def _to_uuid(self, id_value: int) -> uuid.UUID:
        """
        Converte ID inteiro para UUID determinístico.

        Usa namespace UUID5 para garantir mesmo UUID para mesmo ID.
        """
        # Namespace para Procedures (fixo)
        namespace = uuid.UUID("a1b2c3d4-e5f6-7890-abcd-ef1234567890")
        return uuid.uuid5(namespace, f"procedure:{id_value}")

    def _mark_failed(self, source_id: uuid.UUID, procedure: Procedure, error: str):
        """Marca documento como falha."""
        AIKnowledgeDocument.objects.update_or_create(
            tenant_id=self.tenant_id,
            source_type="procedure",
            source_id=source_id,
            version=procedure.version,
            defaults={
                "title": procedure.title,
                "file_type": procedure.file_type,
                "content_hash": "",
                "extracted_text": "",
                "status": AIKnowledgeDocumentStatus.FAILED,
                "error_message": error[:1000],  # Limita tamanho
                "char_count": 0,
            },
        )


def index_procedure(
    tenant_id: uuid.UUID,
    procedure_id: int,
    **kwargs,
) -> IndexResult:
    """
    Função utilitária para indexar Procedure.

    Args:
        tenant_id: ID do tenant
        procedure_id: ID do Procedure
        **kwargs: Argumentos adicionais para o indexer

    Returns:
        IndexResult
    """
    indexer = ProcedureIndexer(tenant_id, **kwargs)
    return indexer.index_procedure_by_id(procedure_id)
