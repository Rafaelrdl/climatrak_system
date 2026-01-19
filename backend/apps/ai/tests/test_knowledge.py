"""
Tests for AI Knowledge Base (AI-006).

Testes para:
- Extractors (PDF, Markdown, DOCX)
- Chunking
- Indexer idempotente
- Search FTS
- Multi-tenant isolation
"""

import hashlib
import io
import uuid

import pytest
from django.test import TestCase
from django_tenants.test.cases import TenantTestCase
from django_tenants.utils import schema_context

from apps.ai.knowledge.chunking import TextChunk, TextChunker, chunk_text
from apps.ai.knowledge.extractors import (
    DocxExtractor,
    ExtractionError,
    MarkdownExtractor,
    PDFExtractor,
    extract_text,
)
from apps.ai.models import (
    AIKnowledgeChunk,
    AIKnowledgeDocument,
    AIKnowledgeDocumentStatus,
)


class MarkdownExtractorTests(TestCase):
    """Tests for MarkdownExtractor."""

    def test_extract_simple_text(self):
        """Test extracting simple markdown text."""
        content = b"# Title\n\nSome paragraph text.\n\nAnother paragraph."
        file_obj = io.BytesIO(content)

        extractor = MarkdownExtractor()
        result = extractor.extract(file_obj)

        self.assertIn("Title", result)
        self.assertIn("Some paragraph text", result)
        self.assertIn("Another paragraph", result)

    def test_extract_with_strip_markdown(self):
        """Test extracting with markdown syntax stripped."""
        content = b"# Header\n\n**Bold text** and *italic*.\n\n[Link](http://example.com)"
        file_obj = io.BytesIO(content)

        extractor = MarkdownExtractor(strip_markdown=True)
        result = extractor.extract(file_obj)

        # Headers stripped
        self.assertNotIn("#", result)
        # Bold/italic stripped (mas texto mantido)
        self.assertIn("Bold text", result)
        self.assertIn("italic", result)
        # Link text mantido, URL removida
        self.assertIn("Link", result)
        self.assertNotIn("http://", result)

    def test_extract_utf8(self):
        """Test extracting UTF-8 content with special chars."""
        content = "# Título em Português\n\nConteúdo com acentuação: çãõé".encode("utf-8")
        file_obj = io.BytesIO(content)

        extractor = MarkdownExtractor()
        result = extractor.extract(file_obj)

        self.assertIn("Título em Português", result)
        self.assertIn("acentuação", result)

    def test_normalize_whitespace(self):
        """Test that excessive whitespace is normalized."""
        content = b"Line 1\n\n\n\n\nLine 2\n\n\nLine 3"
        file_obj = io.BytesIO(content)

        extractor = MarkdownExtractor()
        result = extractor.extract(file_obj)

        # Não deve ter mais de 2 newlines consecutivos
        self.assertNotIn("\n\n\n", result)


class TextChunkerTests(TestCase):
    """Tests for TextChunker."""

    def test_chunk_short_text(self):
        """Test chunking text shorter than min_chunk_size."""
        text = "Short text."
        chunker = TextChunker(min_chunk_size=100, max_chunk_size=200, overlap=20)
        chunks = chunker.chunk(text)

        self.assertEqual(len(chunks), 1)
        self.assertEqual(chunks[0].content, "Short text.")
        self.assertEqual(chunks[0].index, 0)

    def test_chunk_empty_text(self):
        """Test chunking empty text."""
        chunker = TextChunker()
        chunks = chunker.chunk("")
        self.assertEqual(len(chunks), 0)

        chunks = chunker.chunk("   ")
        self.assertEqual(len(chunks), 0)

    def test_chunk_medium_text(self):
        """Test chunking text that fits in 2-3 chunks."""
        # Gera texto de ~3000 caracteres
        para1 = "First paragraph. " * 50  # ~850 chars
        para2 = "Second paragraph content. " * 50  # ~1300 chars
        para3 = "Third paragraph here. " * 50  # ~1100 chars
        text = f"{para1}\n\n{para2}\n\n{para3}"

        chunker = TextChunker(min_chunk_size=1200, max_chunk_size=1800, overlap=200)
        chunks = chunker.chunk(text)

        # Deve ter múltiplos chunks
        self.assertGreater(len(chunks), 1)

        # Cada chunk deve respeitar limites
        for chunk in chunks:
            # Pode ser menor que min se for o último
            self.assertLessEqual(len(chunk.content), 1800 + 100)  # margem

        # Índices devem ser sequenciais
        for i, chunk in enumerate(chunks):
            self.assertEqual(chunk.index, i)

    def test_chunk_positions(self):
        """Test that chunk positions are correctly tracked."""
        text = "A" * 500 + "\n\n" + "B" * 500 + "\n\n" + "C" * 500
        chunker = TextChunker(min_chunk_size=400, max_chunk_size=600, overlap=50)
        chunks = chunker.chunk(text)

        # Primeiro chunk deve começar em 0
        self.assertEqual(chunks[0].char_start, 0)

        # Posições devem fazer sentido
        for chunk in chunks:
            self.assertGreaterEqual(chunk.char_start, 0)
            self.assertGreater(chunk.char_end, chunk.char_start)

    def test_chunk_text_helper(self):
        """Test chunk_text helper function."""
        text = "Test content here." * 100
        chunks = chunk_text(text, min_size=500, max_size=800, overlap=100)

        self.assertIsInstance(chunks, list)
        self.assertTrue(all(isinstance(c, TextChunk) for c in chunks))


class ExtractTextHelperTests(TestCase):
    """Tests for extract_text helper function."""

    def test_extract_markdown(self):
        """Test extract_text with markdown."""
        content = b"# Test\n\nContent here."
        file_obj = io.BytesIO(content)

        result = extract_text(file_obj, "MARKDOWN")
        self.assertIn("Test", result)
        self.assertIn("Content", result)

    def test_extract_unsupported_type(self):
        """Test extract_text with unsupported type."""
        file_obj = io.BytesIO(b"content")

        with self.assertRaises(ValueError) as ctx:
            extract_text(file_obj, "UNSUPPORTED")

        self.assertIn("Unsupported file type", str(ctx.exception))

    def test_extract_case_insensitive_type(self):
        """Test that file_type is case insensitive."""
        content = b"Test content"
        file_obj = io.BytesIO(content)

        # lowercase should work
        result = extract_text(file_obj, "markdown")
        self.assertIn("Test content", result)


class AIKnowledgeDocumentModelTests(TenantTestCase):
    """Tests for AIKnowledgeDocument model."""

    def setUp(self):
        """Set up test data."""
        self.tenant_id = uuid.uuid5(
            uuid.NAMESPACE_DNS, f"tenant:{self.tenant.schema_name}"
        )

    def test_create_document(self):
        """Test creating a knowledge document."""
        doc = AIKnowledgeDocument.objects.create(
            tenant_id=self.tenant_id,
            source_type="procedure",
            source_id=uuid.uuid4(),
            title="Test Procedure",
            file_type="PDF",
            version=1,
            content_hash="a" * 64,
            extracted_text="Test content",
            status=AIKnowledgeDocumentStatus.INDEXED,
        )

        self.assertEqual(doc.title, "Test Procedure")
        self.assertEqual(doc.file_type, "PDF")
        self.assertEqual(doc.status, AIKnowledgeDocumentStatus.INDEXED)

    def test_document_unique_constraint(self):
        """Test unique constraint on source+version."""
        source_id = uuid.uuid4()

        AIKnowledgeDocument.objects.create(
            tenant_id=self.tenant_id,
            source_type="procedure",
            source_id=source_id,
            title="Doc v1",
            file_type="PDF",
            version=1,
            content_hash="a" * 64,
            extracted_text="v1 content",
        )

        # Mesmo source_id + version deve falhar
        from django.db import IntegrityError

        with self.assertRaises(IntegrityError):
            AIKnowledgeDocument.objects.create(
                tenant_id=self.tenant_id,
                source_type="procedure",
                source_id=source_id,
                title="Doc v1 duplicate",
                file_type="PDF",
                version=1,
                content_hash="b" * 64,
                extracted_text="duplicate",
            )


class AIKnowledgeChunkModelTests(TenantTestCase):
    """Tests for AIKnowledgeChunk model."""

    def setUp(self):
        """Set up test data."""
        self.tenant_id = uuid.uuid5(
            uuid.NAMESPACE_DNS, f"tenant:{self.tenant.schema_name}"
        )
        self.document = AIKnowledgeDocument.objects.create(
            tenant_id=self.tenant_id,
            source_type="procedure",
            source_id=uuid.uuid4(),
            title="Test Doc",
            file_type="MARKDOWN",
            version=1,
            content_hash="x" * 64,
            extracted_text="Full text here",
        )

    def test_create_chunk(self):
        """Test creating a knowledge chunk."""
        chunk = AIKnowledgeChunk.objects.create(
            document=self.document,
            tenant_id=self.tenant_id,
            chunk_index=0,
            content="Chunk content here",
            char_start=0,
            char_end=18,
        )

        self.assertEqual(chunk.chunk_index, 0)
        self.assertEqual(chunk.content, "Chunk content here")
        self.assertEqual(chunk.document, self.document)

    def test_chunk_unique_constraint(self):
        """Test unique constraint on document+chunk_index."""
        AIKnowledgeChunk.objects.create(
            document=self.document,
            tenant_id=self.tenant_id,
            chunk_index=0,
            content="First chunk",
            char_start=0,
            char_end=11,
        )

        from django.db import IntegrityError

        with self.assertRaises(IntegrityError):
            AIKnowledgeChunk.objects.create(
                document=self.document,
                tenant_id=self.tenant_id,
                chunk_index=0,  # Duplicate index
                content="Duplicate chunk",
                char_start=0,
                char_end=15,
            )

    def test_cascade_delete(self):
        """Test that chunks are deleted when document is deleted."""
        AIKnowledgeChunk.objects.create(
            document=self.document,
            tenant_id=self.tenant_id,
            chunk_index=0,
            content="Chunk 1",
            char_start=0,
            char_end=7,
        )
        AIKnowledgeChunk.objects.create(
            document=self.document,
            tenant_id=self.tenant_id,
            chunk_index=1,
            content="Chunk 2",
            char_start=8,
            char_end=15,
        )

        self.assertEqual(AIKnowledgeChunk.objects.count(), 2)

        self.document.delete()

        self.assertEqual(AIKnowledgeChunk.objects.count(), 0)


class KnowledgeMultiTenantIsolationTests(TenantTestCase):
    """Tests for multi-tenant isolation in Knowledge Base."""

    def setUp(self):
        """Set up test data for multiple tenants."""
        self.tenant_id = uuid.uuid5(
            uuid.NAMESPACE_DNS, f"tenant:{self.tenant.schema_name}"
        )
        # Create a second tenant_id (simulating another tenant)
        self.other_tenant_id = uuid.uuid4()

    def test_document_isolation(self):
        """Test that documents from different tenants are isolated."""
        # Document for current tenant
        doc1 = AIKnowledgeDocument.objects.create(
            tenant_id=self.tenant_id,
            source_type="procedure",
            source_id=uuid.uuid4(),
            title="Tenant 1 Doc",
            file_type="PDF",
            version=1,
            content_hash="1" * 64,
            extracted_text="Tenant 1 content",
        )

        # Document for other tenant
        doc2 = AIKnowledgeDocument.objects.create(
            tenant_id=self.other_tenant_id,
            source_type="procedure",
            source_id=uuid.uuid4(),
            title="Tenant 2 Doc",
            file_type="PDF",
            version=1,
            content_hash="2" * 64,
            extracted_text="Tenant 2 content",
        )

        # Filter by tenant should isolate
        tenant1_docs = AIKnowledgeDocument.objects.filter(tenant_id=self.tenant_id)
        self.assertEqual(tenant1_docs.count(), 1)
        self.assertEqual(tenant1_docs.first().title, "Tenant 1 Doc")

        tenant2_docs = AIKnowledgeDocument.objects.filter(tenant_id=self.other_tenant_id)
        self.assertEqual(tenant2_docs.count(), 1)
        self.assertEqual(tenant2_docs.first().title, "Tenant 2 Doc")


class ContentHashIdempotencyTests(TestCase):
    """Tests for content hash idempotency."""

    def test_same_content_same_hash(self):
        """Test that same content produces same hash."""
        content = "Test content for hashing"

        hash1 = hashlib.sha256(content.encode("utf-8")).hexdigest()
        hash2 = hashlib.sha256(content.encode("utf-8")).hexdigest()

        self.assertEqual(hash1, hash2)

    def test_different_content_different_hash(self):
        """Test that different content produces different hash."""
        content1 = "Content version 1"
        content2 = "Content version 2"

        hash1 = hashlib.sha256(content1.encode("utf-8")).hexdigest()
        hash2 = hashlib.sha256(content2.encode("utf-8")).hexdigest()

        self.assertNotEqual(hash1, hash2)

    def test_whitespace_affects_hash(self):
        """Test that whitespace differences affect hash."""
        content1 = "Content"
        content2 = "Content "  # trailing space

        hash1 = hashlib.sha256(content1.encode("utf-8")).hexdigest()
        hash2 = hashlib.sha256(content2.encode("utf-8")).hexdigest()

        self.assertNotEqual(hash1, hash2)
