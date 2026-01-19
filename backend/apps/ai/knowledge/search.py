"""
Knowledge Search for AI Knowledge Base (AI-006).

Busca full-text search (FTS) usando Postgres.
Implementa ranking e highlighting.
"""

import logging
import uuid
from dataclasses import dataclass
from typing import List, Optional

from django.contrib.postgres.search import SearchQuery, SearchRank
from django.db.models import F

from ..models import AIKnowledgeChunk, AIKnowledgeDocument, AIKnowledgeDocumentStatus

logger = logging.getLogger(__name__)


@dataclass
class SearchResult:
    """Resultado de busca."""

    chunk_id: uuid.UUID
    document_id: uuid.UUID
    document_title: str
    source_type: str
    source_id: uuid.UUID
    version: int
    chunk_index: int
    content: str
    rank: float
    highlight: Optional[str] = None


@dataclass
class SearchResponse:
    """Resposta de busca paginada."""

    results: List[SearchResult]
    total_count: int
    query: str
    page: int
    page_size: int


class KnowledgeSearch:
    """
    Busca na base de conhecimento usando Postgres FTS.

    Características:
    - Multi-tenant via tenant_id
    - Busca apenas em documentos INDEXED
    - Ranking por relevância
    - Suporte a português
    """

    DEFAULT_PAGE_SIZE = 10
    MAX_PAGE_SIZE = 50

    def __init__(self, tenant_id: uuid.UUID):
        """
        Args:
            tenant_id: ID do tenant para isolamento
        """
        self.tenant_id = tenant_id

    def search(
        self,
        query: str,
        page: int = 1,
        page_size: int = None,
        source_type: str = None,
        source_id: uuid.UUID = None,
    ) -> SearchResponse:
        """
        Busca por texto na base de conhecimento.

        Args:
            query: Termo de busca
            page: Página (1-based)
            page_size: Tamanho da página
            source_type: Filtrar por tipo de fonte (ex: "procedure")
            source_id: Filtrar por ID de fonte específico

        Returns:
            SearchResponse com resultados paginados
        """
        if not query or not query.strip():
            return SearchResponse(
                results=[],
                total_count=0,
                query=query or "",
                page=page,
                page_size=page_size or self.DEFAULT_PAGE_SIZE,
            )

        # Normaliza parâmetros
        page = max(1, page)
        page_size = min(
            max(1, page_size or self.DEFAULT_PAGE_SIZE),
            self.MAX_PAGE_SIZE,
        )

        # Prepara query FTS
        search_query = SearchQuery(query, config="portuguese")

        # Query base: chunks de documentos indexados do tenant
        queryset = (
            AIKnowledgeChunk.objects.filter(
                tenant_id=self.tenant_id,
                document__status=AIKnowledgeDocumentStatus.INDEXED,
            )
            .select_related("document")
        )

        # Filtros opcionais
        if source_type:
            queryset = queryset.filter(document__source_type=source_type)
        if source_id:
            queryset = queryset.filter(document__source_id=source_id)

        # Aplica busca FTS e ranking
        # Usa raw SQL para busca FTS porque o GeneratedField não funciona com SearchVector
        queryset = queryset.extra(
            where=["search_vector @@ to_tsquery('portuguese', %s)"],
            params=[self._prepare_tsquery(query)],
        ).annotate(
            rank=SearchRank(
                F("search_vector"),
                search_query,
                normalization=1,  # Normaliza por tamanho do documento
            ),
        ).order_by("-rank")

        # Contagem total
        total_count = queryset.count()

        # Paginação
        offset = (page - 1) * page_size
        chunks = queryset[offset:offset + page_size]

        # Monta resultados
        results = [
            SearchResult(
                chunk_id=chunk.id,
                document_id=chunk.document.id,
                document_title=chunk.document.title,
                source_type=chunk.document.source_type,
                source_id=chunk.document.source_id,
                version=chunk.document.version,
                chunk_index=chunk.chunk_index,
                content=chunk.content,
                rank=float(chunk.rank) if hasattr(chunk, "rank") else 0.0,
                highlight=self._highlight(chunk.content, query),
            )
            for chunk in chunks
        ]

        logger.debug(
            f"Search '{query}' returned {total_count} results, "
            f"page {page}/{(total_count + page_size - 1) // page_size}"
        )

        return SearchResponse(
            results=results,
            total_count=total_count,
            query=query,
            page=page,
            page_size=page_size,
        )

    def _prepare_tsquery(self, query: str) -> str:
        """
        Prepara query para tsquery do Postgres.

        Converte palavras separadas em busca OR.
        """
        # Remove caracteres especiais
        words = query.split()
        clean_words = []
        for word in words:
            # Remove caracteres que não são letras, números ou hífen
            clean = "".join(c for c in word if c.isalnum() or c == "-")
            if clean:
                clean_words.append(clean)

        if not clean_words:
            return ""

        # Junta com OR para busca mais flexível
        return " | ".join(clean_words)

    def _highlight(self, content: str, query: str, max_length: int = 300) -> str:
        """
        Destaca termos da busca no conteúdo.

        Args:
            content: Texto do chunk
            query: Termos buscados
            max_length: Tamanho máximo do highlight

        Returns:
            Texto com termos destacados entre **
        """
        if not content or not query:
            return content[:max_length] if content else ""

        # Termos para destacar
        terms = query.lower().split()

        # Encontra primeira ocorrência de qualquer termo
        content_lower = content.lower()
        first_pos = len(content)

        for term in terms:
            pos = content_lower.find(term)
            if pos >= 0 and pos < first_pos:
                first_pos = pos

        # Extrai trecho ao redor da primeira ocorrência
        if first_pos < len(content):
            start = max(0, first_pos - 50)
            end = min(len(content), start + max_length)

            # Ajusta para não cortar palavras
            if start > 0:
                space_pos = content.find(" ", start)
                if space_pos > 0 and space_pos < start + 20:
                    start = space_pos + 1

            if end < len(content):
                space_pos = content.rfind(" ", end - 20, end)
                if space_pos > 0:
                    end = space_pos

            snippet = content[start:end]
        else:
            snippet = content[:max_length]

        # Destaca termos (case-insensitive)
        for term in terms:
            import re

            pattern = re.compile(re.escape(term), re.IGNORECASE)
            snippet = pattern.sub(f"**{term}**", snippet)

        # Adiciona reticências se truncado
        if start > 0:
            snippet = "..." + snippet
        if end < len(content):
            snippet = snippet + "..."

        return snippet

    def get_document_chunks(
        self,
        document_id: uuid.UUID,
        page: int = 1,
        page_size: int = None,
    ) -> SearchResponse:
        """
        Retorna todos os chunks de um documento.

        Args:
            document_id: ID do documento
            page: Página (1-based)
            page_size: Tamanho da página

        Returns:
            SearchResponse com chunks do documento
        """
        page = max(1, page)
        page_size = min(
            max(1, page_size or self.DEFAULT_PAGE_SIZE),
            self.MAX_PAGE_SIZE,
        )

        # Busca documento
        try:
            document = AIKnowledgeDocument.objects.get(
                id=document_id,
                tenant_id=self.tenant_id,
            )
        except AIKnowledgeDocument.DoesNotExist:
            return SearchResponse(
                results=[],
                total_count=0,
                query="",
                page=page,
                page_size=page_size,
            )

        # Busca chunks
        queryset = AIKnowledgeChunk.objects.filter(
            document=document,
            tenant_id=self.tenant_id,
        ).order_by("chunk_index")

        total_count = queryset.count()

        offset = (page - 1) * page_size
        chunks = queryset[offset:offset + page_size]

        results = [
            SearchResult(
                chunk_id=chunk.id,
                document_id=document.id,
                document_title=document.title,
                source_type=document.source_type,
                source_id=document.source_id,
                version=document.version,
                chunk_index=chunk.chunk_index,
                content=chunk.content,
                rank=0.0,
            )
            for chunk in chunks
        ]

        return SearchResponse(
            results=results,
            total_count=total_count,
            query="",
            page=page,
            page_size=page_size,
        )


def search_knowledge(
    tenant_id: uuid.UUID,
    query: str,
    **kwargs,
) -> SearchResponse:
    """
    Função utilitária para busca na base de conhecimento.

    Args:
        tenant_id: ID do tenant
        query: Termo de busca
        **kwargs: Argumentos adicionais para search()

    Returns:
        SearchResponse
    """
    searcher = KnowledgeSearch(tenant_id)
    return searcher.search(query, **kwargs)
