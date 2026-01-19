# AI - Visão Geral

## 1. Introdução

O módulo AI do ClimaTrak implementa agentes de inteligência artificial para suporte à manutenção industrial e HVAC. Os agentes auxiliam em:

- **Análise de Causa Raiz (RCA)**: Identificar hipóteses para alertas
- **Manutenção Preventiva**: Recomendar ações preventivas baseadas em histórico
- **Manutenção Preditiva**: Prever falhas com base em telemetria e padrões
- **Gestão de Inventário**: Otimizar níveis de estoque baseado em consumo
- **Reparos Rápidos**: Assistente guiado para técnicos em campo

## 2. Arquitetura

```
apps/ai/
├── __init__.py
├── apps.py                  # Configuração do app Django
├── models.py                # AIJob (modelo de execução)
├── admin.py                 # Admin Django
├── serializers.py           # DRF serializers
├── views.py                 # ViewSets DRF
├── urls.py                  # Rotas API
├── services.py              # Service layer (AIJobService)
├── tasks.py                 # Celery tasks
├── providers/               # Clientes LLM
│   ├── __init__.py
│   ├── base.py              # Interface abstrata
│   ├── openai_compat.py     # Cliente OpenAI-compat (Ollama, vLLM)
│   └── factory.py           # Factory para providers
├── agents/                  # Implementações de agentes
│   ├── __init__.py
│   ├── base.py              # Classe base abstrata
│   ├── registry.py          # Registry de agentes
│   └── dummy.py             # Agente de teste
├── migrations/
└── tests/
```

## 3. Fluxo de Execução

```mermaid
sequenceDiagram
    participant Client
    participant API
    participant Celery
    participant Agent
    participant LLM

    Client->>API: POST /api/ai/agents/{key}/run/
    API->>API: Criar AIJob (status=PENDING)
    API->>Celery: Enfileirar execute_ai_job
    API-->>Client: 202 Accepted {job_id}

    Celery->>Celery: schema_context(tenant)
    Celery->>Agent: run(input, context)
    Agent->>Agent: gather_context()
    Agent->>Agent: build_user_prompt()
    Agent->>LLM: chat_sync(messages)
    LLM-->>Agent: LLMResponse
    Agent-->>Celery: AgentResult
    Celery->>Celery: AIJob.mark_succeeded()

    Client->>API: GET /api/ai/jobs/{id}/
    API-->>Client: {status: "succeeded", output: {...}}
```

## 4. Multi-Tenancy

O módulo respeita o isolamento multi-tenant do ClimaTrak:

- **AIJob.tenant_id**: UUID do tenant, denormalizado para queries eficientes
- **Execução em schema_context**: Tasks Celery executam dentro do contexto correto
- **Isolamento de dados**: Queries sempre filtram por tenant_id

```python
# Task Celery com isolamento
@shared_task
def execute_ai_job(job_id: str, schema_name: str):
    with schema_context(schema_name):
        job = AIJob.objects.get(id=job_id)
        # Execução isolada no tenant
```

## 5. Idempotência

Jobs suportam idempotency_key para evitar duplicatas:

```python
# Mesma key = mesmo job (não duplica)
job, created = AIJobService.create_job(
    agent_key="root_cause",
    input_data={"alert_id": "..."},
    idempotency_key=f"rca:{alert_id}:v1",
)
```

## 6. LLM Provider

O sistema usa API OpenAI-compatível, permitindo:

- **Ollama** (local, dev)
- **vLLM** (GPU, produção)
- **OpenAI** (cloud)
- **LocalAI**, **Mistral**, etc.

### Configuração (.env)

```bash
LLM_BASE_URL=http://ollama:11434/v1
LLM_MODEL=mistral-nemo
LLM_API_KEY=             # Opcional para providers locais
LLM_TEMPERATURE=0.2
LLM_MAX_TOKENS=4096
LLM_TIMEOUT_SECONDS=60
```

## 7. Agentes Planejados

| Agent Key | Descrição | Status |
|-----------|-----------|--------|
| `dummy` | Agente de teste | ✅ Implementado |
| `root_cause` | Análise de causa raiz (RCA) | 🔜 Planejado (AI-002) |
| `quick_repair` | Assistente de reparos | 🔜 Planejado (AI-003) |
| `inventory` | Otimização de estoque | 🔜 Planejado (AI-004) |
| `preventive` | Recomendações preventivas | 🔜 Planejado (AI-005) |
| `predictive` | Manutenção preditiva | 🔜 Planejado (AI-005) |
| `patterns` | Padrões de manutenção | 🔜 Planejado (AI-005) |

## 8. Próximos Passos

1. **AI-002**: Implementar agente RCA (`root_cause`)
2. **AI-003**: Implementar agente Quick Repair
3. **AI-004**: Implementar agente de Inventário
4. **AI-005**: Implementar agentes Preventivo, Preditivo e Padrões

## 9. Referências

- [02-contrato-api.md](02-contrato-api.md) - Contrato da API REST
- [backend/apps/ai/](../../backend/apps/ai/) - Código fonte
- [Ollama](https://ollama.ai/) - Runtime LLM local
