# Métricas de Uso de Tokens LLM

## Visão Geral

O ClimaTrak registra automaticamente métricas de uso de tokens para cada chamada ao LLM realizada por agentes de IA. Essas métricas permitem:

- **Monitorar custos**: Acompanhar consumo de tokens por tenant/agente/modelo
- **Análise de uso**: Identificar padrões de utilização e otimizar prompts
- **Auditoria**: Rastrear chamadas LLM por usuário e job

## Modelo de Dados

### AIUsageLog

Cada chamada ao LLM gera um registro `AIUsageLog` com:

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID | Identificador único do log |
| `tenant_id` | UUID | ID do tenant (determinístico) |
| `tenant_schema` | String | Nome do schema PostgreSQL |
| `agent_key` | String | Agente que fez a chamada (ex: `preventive`, `predictive`) |
| `model` | String | Modelo LLM usado (ex: `mistral-nemo`) |
| `provider` | String | Provider LLM (default: `openai_compat`) |
| `input_tokens` | Integer | Tokens de entrada (prompt) |
| `output_tokens` | Integer | Tokens de saída (completion) |
| `total_tokens` | Integer | Total de tokens (input + output) |
| `job` | FK → AIJob | Job relacionado (opcional) |
| `created_by` | FK → User | Usuário que solicitou (opcional) |
| `created_at` | DateTime | Timestamp da chamada |
| `raw_usage` | JSON | Payload bruto de métricas |

### Índices

O modelo possui índices otimizados para queries por tenant:

- `(tenant_id, created_at)` - Consultas por período
- `(tenant_id, agent_key, created_at)` - Consultas por agente
- `(tenant_id, model, created_at)` - Consultas por modelo

## Mapeamento de Métricas

### Formato OpenAI Compat (Padrão)

O ClimaTrak usa Z.ai GLM-4.7-Flash como provider default, que retorna métricas no formato OpenAI-compat:

```json
{
  "usage": {
    "prompt_tokens": 11,
    "completion_tokens": 18,
    "total_tokens": 29
  }
}
```

**Mapeamento:**

| Campo OpenAI | Campo AIUsageLog |
|--------------|------------------|
| `prompt_tokens` | `input_tokens` |
| `completion_tokens` | `output_tokens` |
| `total_tokens` | `total_tokens` |

Este formato é compatível com Z.ai, OpenAI, vLLM, LocalAI e outros providers OpenAI-compat.

### Streaming

Em modo streaming, as métricas só aparecem no **último chunk** quando `done=true`. O provider aguarda esse chunk para capturar os valores.

## API de Métricas

### GET /api/ai/usage/monthly/

Retorna uso agregado de tokens por mês.

**Query Parameters:**

| Parâmetro | Tipo | Descrição | Default |
|-----------|------|-----------|---------|
| `months` | int | Meses para análise (max: 36) | 12 |
| `agent` | string | Filtrar por agente | - |
| `model` | string | Filtrar por modelo | - |
| `user_id` | int | Filtrar por usuário | - |

**Exemplo de Request:**

```bash
GET /api/ai/usage/monthly/?months=6&agent=preventive
Authorization: Bearer <token>
X-Tenant: umc
```

**Exemplo de Response:**

```json
{
  "tenant_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "tenant_schema": "umc",
  "months_requested": 6,
  "filters": {
    "agent": "preventive",
    "model": null,
    "user_id": null
  },
  "buckets": [
    {
      "month": "2026-01",
      "input_tokens": 15420,
      "output_tokens": 8230,
      "total_tokens": 23650,
      "calls": 142
    },
    {
      "month": "2025-12",
      "input_tokens": 12100,
      "output_tokens": 6890,
      "total_tokens": 18990,
      "calls": 98
    }
  ],
  "totals": {
    "input_tokens": 27520,
    "output_tokens": 15120,
    "total_tokens": 42640,
    "calls": 240
  }
}
```

## Implementação Técnica

### Captura de Métricas

A captura acontece automaticamente em `BaseAgent.call_llm()`:

```python
def call_llm(self, user_prompt: str, ..., context: AgentContext = None) -> LLMResponse:
    # Chamada ao LLM
    response = self.provider.chat_sync(messages=messages, ...)
    
    # Registro best-effort (não propaga exceções)
    AIUsageService.record_llm_call(
        context=context,
        agent_key=self.agent_key,
        response=response,
    )
    
    return response
```

### Best-Effort

O registro de uso é **best-effort**:

- Erros de gravação são logados como warning
- Exceções não propagam para o agente
- A execução do agente continua normalmente

### Multi-Tenant

Cada log é isolado por schema PostgreSQL via `django-tenants`:

- `tenant_id`: UUID determinístico gerado a partir do nome do schema
- `tenant_schema`: Nome do schema para auditoria

## Comandos de Validação

```bash
# Criar migration
docker exec climatrak-api python manage.py makemigrations ai

# Aplicar migrations em todos os schemas
docker exec climatrak-api python manage.py migrate_schemas

# Rodar testes
docker exec climatrak-api python manage.py test apps.ai -v 2

# Testar endpoint (dev)
curl -X GET http://localhost:8000/api/ai/usage/monthly/ \
  -H "Authorization: Bearer <token>" \
  -H "X-Tenant: umc"
```

## Referências

- [01-visao-geral.md](01-visao-geral.md) - Visão geral do módulo AI
- [02-contrato-api.md](02-contrato-api.md) - Contrato da API de agentes
- Z.ai API: https://www.bigmodel.cn/dev/api
