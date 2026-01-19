# AI Knowledge Base API (AI-006)

## Visão Geral

A API de Base de Conhecimento permite indexar e buscar em documentos de procedimentos usando Full-Text Search do Postgres.

**Base URL**: `/api/ai/knowledge/`

## Endpoints

### Buscar na Base de Conhecimento

```
GET /api/ai/knowledge/search/
```

Busca full-text search na base de conhecimento.

**Query Parameters:**

| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|-------------|-----------|
| `q` | string | Sim | Termo de busca (2-200 caracteres) |
| `page` | int | Não | Página (default: 1) |
| `page_size` | int | Não | Tamanho da página (1-50, default: 10) |
| `source_type` | string | Não | Filtrar por tipo (ex: "procedure") |

**Response 200:**

```json
{
  "results": [
    {
      "chunk_id": "uuid",
      "document_id": "uuid",
      "document_title": "Procedimento de Manutenção Preventiva",
      "source_type": "procedure",
      "source_id": "uuid",
      "version": 1,
      "chunk_index": 0,
      "content": "Texto do chunk...",
      "rank": 0.85,
      "highlight": "...texto com **termos** destacados..."
    }
  ],
  "total_count": 42,
  "query": "manutenção preventiva",
  "page": 1,
  "page_size": 10
}
```

### Estatísticas da Base de Conhecimento

```
GET /api/ai/knowledge/stats/
```

Retorna estatísticas da base de conhecimento.

**Response 200:**

```json
{
  "total_documents": 150,
  "total_chunks": 2340,
  "by_status": {
    "INDEXED": 145,
    "PENDING": 3,
    "FAILED": 2
  },
  "by_source_type": {
    "procedure": 150
  },
  "by_file_type": {
    "PDF": 100,
    "MARKDOWN": 40,
    "DOCX": 10
  }
}
```

### Listar Documentos Indexados

```
GET /api/ai/knowledge/documents/
```

Lista documentos indexados.

**Query Parameters:**

| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|-------------|-----------|
| `status` | string | Não | Filtrar por status (PENDING, INDEXING, INDEXED, FAILED, OUTDATED) |
| `source_type` | string | Não | Filtrar por tipo de fonte |
| `page` | int | Não | Página (default: 1) |
| `page_size` | int | Não | Tamanho da página (1-50, default: 20) |

**Response 200:**

```json
{
  "results": [
    {
      "id": "uuid",
      "source_type": "procedure",
      "source_id": "uuid",
      "title": "Procedimento XYZ",
      "file_type": "PDF",
      "version": 2,
      "status": "INDEXED",
      "chunks_count": 15,
      "char_count": 24500,
      "created_at": "2024-01-15T10:30:00Z",
      "indexed_at": "2024-01-15T10:30:05Z"
    }
  ],
  "total_count": 150,
  "page": 1,
  "page_size": 20
}
```

## Fluxo de Indexação

1. **Evento `procedure.updated`**: Emitido quando um Procedure é aprovado, arquivado, ou tem nova versão criada/restaurada.

2. **Handler**: O handler `handle_procedure_updated` recebe o evento e enfileira a task `index_procedure_knowledge`.

3. **Task Celery**: A task:
   - Extrai texto do arquivo (PDF/DOCX/Markdown)
   - Calcula hash SHA256 do conteúdo
   - Verifica idempotência (se hash igual, não reindexa)
   - Divide em chunks com overlap
   - Salva documento e chunks no banco
   - Cria índice FTS

4. **Busca**: Endpoint de busca usa Postgres FTS com ranking.

## Status de Documento

| Status | Descrição |
|--------|-----------|
| `PENDING` | Aguardando indexação |
| `INDEXING` | Indexação em andamento |
| `INDEXED` | Indexado com sucesso |
| `FAILED` | Falha na indexação |
| `OUTDATED` | Versão antiga (substituída) |

## Tipos de Arquivo Suportados

| Tipo | Extrator | Biblioteca |
|------|----------|------------|
| PDF | PDFExtractor | pypdf |
| DOCX | DocxExtractor | python-docx |
| MARKDOWN | MarkdownExtractor | (built-in) |

## Chunking

- **Tamanho mínimo**: 1200 caracteres
- **Tamanho máximo**: 1800 caracteres
- **Overlap**: 200 caracteres

O chunking tenta preservar parágrafos e sentenças inteiras.

## Multi-Tenancy

Todos os endpoints são filtrados pelo tenant do usuário autenticado.
Documentos e chunks têm `tenant_id` denormalizado para isolamento.

## Autenticação

Todos os endpoints requerem autenticação JWT.

```
Authorization: Bearer <token>
```

## Códigos de Erro

| Código | Descrição |
|--------|-----------|
| 400 | Query inválida (q muito curto, parâmetros inválidos) |
| 401 | Não autenticado |
| 403 | Sem permissão |
| 404 | Recurso não encontrado |
