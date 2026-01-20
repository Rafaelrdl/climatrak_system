# AI - Contrato da API

## Base URL

```
/api/ai/
```

## Autenticação

Todas as rotas requerem autenticação via JWT cookie (padrão ClimaTrak).

---

## Endpoints

### 1. Listar Agentes Disponíveis

```http
GET /api/ai/agents/
```

**Response 200:**
```json
[
  {
    "key": "dummy",
    "name": "DummyAgent",
    "description": "Agente de teste para validar infraestrutura de IA",
    "version": "1.0.0",
    "require_llm": false
  },
  {
    "key": "root_cause",
    "name": "RootCauseAgent",
    "description": "Analisa causa raiz de alertas",
    "version": "1.0.0",
    "require_llm": true
  }
]
```

---

### 2. Executar Agente

```http
POST /api/ai/agents/{agent_key}/run/
```

**Path Parameters:**
- `agent_key` (string, required): Identificador do agente

**Request Body:**
```json
{
  "input": {
    "alert_id": 123
  },
  "related": {
    "type": "alert",
    "id": 123
  },
  "idempotency_key": "rca:123:v1"
}
```

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `input` | object | Não | Dados de entrada para o agente |
| `input.alert_id` | int\|string | Sim* | ID do alerta (BigAutoField) |
| `related` | object | Não | Objeto relacionado (type + id) |
| `related.id` | int\|string\|uuid | Não | ID do recurso (convertido para UUID se necessário) |
| `related.type` | string | Não | Tipo do recurso ('alert', 'device', etc) |
| `idempotency_key` | string | Não | Chave única para evitar duplicatas |

*Obrigatório para agente root_cause

**Response 202 (Created):**
```json
{
  "job_id": "uuid-do-job",
  "status": "pending",
  "created": true
}
```

**Response 200 (Idempotent - já existe):**
```json
{
  "job_id": "uuid-do-job-existente",
  "status": "pending",
  "created": false
}
```

**Response 404:**
```json
{
  "detail": "Agent 'nonexistent' not found"
}
```

---

### 3. Listar Jobs

```http
GET /api/ai/jobs/
```

**Query Parameters:**
| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `agent` | string | Filtrar por agente (ex: `predictive`) |
| `status` | string | Filtrar por status (`pending`, `running`, `succeeded`, `failed`) |
| `related_type` | string | Filtrar por tipo de recurso relacionado (ex: `asset`, `alert`) |
| `related_id` | int\|string | Filtrar por ID do recurso (convertido para UUID internamente) |

**Exemplo com filtros:**
```http
GET /api/ai/jobs/?agent=predictive&related_type=asset&related_id=123
```

**Response 200:**
```json
[
  {
    "id": "uuid",
    "agent_key": "dummy",
    "status": "succeeded",
    "created_at": "2026-01-18T12:00:00-03:00",
    "completed_at": "2026-01-18T12:00:01-03:00",
    "execution_time_ms": 150
  }
]
```

---

### 4. Detalhe do Job

```http
GET /api/ai/jobs/{job_id}/
```

**Response 200:**
```json
{
  "id": "uuid",
  "agent_key": "dummy",
  "status": "succeeded",
  "input_data": {
    "echo": "test"
  },
  "output_data": {
    "message": "Dummy agent executed successfully",
    "echo": "test",
    "agent_key": "dummy",
    "tenant_id": "tenant-uuid"
  },
  "related_type": null,
  "related_id": null,
  "error_message": null,
  "tokens_used": 0,
  "execution_time_ms": 150,
  "attempts": 1,
  "created_at": "2026-01-18T12:00:00-03:00",
  "started_at": "2026-01-18T12:00:00-03:00",
  "completed_at": "2026-01-18T12:00:01-03:00"
}
```

**Response 404:**
```json
{
  "detail": "Job not found"
}
```

---

### 5. Health Check

```http
GET /api/ai/health/
```

**Response 200:**
```json
{
  "llm": {
    "healthy": true,
    "provider": "openai_compat",
    "base_url": "https://api.z.ai/api/paas/v4",
    "model": "glm-4.7-flash"
  },
  "agents": [
    {
      "key": "dummy",
      "name": "DummyAgent",
      "description": "...",
      "version": "1.0.0",
      "require_llm": false
    }
  ],
  "status": "healthy"
}
```

**Status possíveis:**
- `healthy`: LLM disponível
- `degraded`: LLM indisponível (agentes que não usam LLM ainda funcionam)

---

## Status do Job

| Status | Descrição |
|--------|-----------|
| `pending` | Aguardando processamento |
| `running` | Em execução |
| `succeeded` | Concluído com sucesso |
| `failed` | Falhou (ver error_message) |
| `timeout` | Excedeu tempo máximo |
| `cancelled` | Cancelado |

---

## Códigos de Erro

| Código | Descrição |
|--------|-----------|
| 400 | Bad Request - Input inválido |
| 401 | Unauthorized - Não autenticado |
| 404 | Not Found - Agente ou job não encontrado |
| 500 | Internal Server Error |

---

## Exemplos

### Executar agente dummy

```bash
curl -X POST http://localhost:8000/api/ai/agents/dummy/run/ \
  -H "Content-Type: application/json" \
  -H "Cookie: access_token=..." \
  -d '{"input": {"echo": "Hello AI!"}}'
```

### Executar agente root_cause (Análise de Causa Raiz)

```bash
curl -X POST http://localhost:8000/api/ai/agents/root_cause/run/ \
  -H "Content-Type: application/json" \
  -H "Cookie: access_token=..." \
  -d '{
    "input": {
      "alert_id": 123,
      "window_minutes": 120
    },
    "related": {
      "type": "alert",
      "id": 123
    },
    "idempotency_key": "rca:123:v1"
  }'
```

**Response 202:**
```json
{
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "pending",
  "created": true
}
```

### Consultar resultado

```bash
curl http://localhost:8000/api/ai/jobs/550e8400-e29b-41d4-a716-446655440000/ \
  -H "Cookie: access_token=..."
```

**Response 200 (após conclusão):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "agent_key": "root_cause",
  "status": "succeeded",
  "input_data": {
    "alert_id": 123,
    "window_minutes": 120
  },
  "output_data": {
    "schema_version": "1.0",
    "hypotheses": [...],
    "immediate_actions": [...],
    "recommended_work_order": {...},
    "tokens_used": 287
  },
  "error_message": null,
  "tokens_used": 287,
  "execution_time_ms": 2340,
  "created_at": "2026-01-18T12:00:00-03:00",
  "completed_at": "2026-01-18T12:00:02-03:00"
}
```

---

## Idempotência

Para operações que não devem ser duplicadas, use `idempotency_key`:

```json
{
  "input": {"alert_id": "abc123"},
  "idempotency_key": "rca:abc123:v1"
}
```

Regras:
- Mesma `idempotency_key` no mesmo tenant retorna o job existente
- O campo `created` indica se foi criado (true) ou retornado existente (false)
- Jobs já processados não são reexecutados

---

## Polling vs Webhooks

Atualmente a API usa **polling**:

1. `POST /agents/{key}/run/` → recebe `job_id`
2. `GET /jobs/{job_id}/` → poll até `status` != `pending`/`running`

**Futuro (AI-006):** Implementar webhooks para notificação de conclusão.
