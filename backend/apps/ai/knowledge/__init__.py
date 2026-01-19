"""
AI Knowledge Base Package (AI-006).

Módulo para RAG multi-tenant com Procedures.
"""

from .extractors import extract_text, PDFExtractor, MarkdownExtractor, DocxExtractor
from .chunking import TextChunker
from .indexer import ProcedureIndexer
from .search import KnowledgeSearch

__all__ = [
    "extract_text",
    "PDFExtractor",
    "MarkdownExtractor",
    "DocxExtractor",
    "TextChunker",
    "ProcedureIndexer",
    "KnowledgeSearch",
]
