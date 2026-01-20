# AI App - ClimaTrak

Módulo de Inteligência Artificial para suporte à manutenção industrial.

## Estrutura

```
ai/
├── models.py          # AIJob - modelo de execução
├── services.py        # AIJobService - lógica de negócio
├── views.py           # ViewSets DRF
├── urls.py            # Rotas /api/ai/
├── tasks.py           # Celery tasks
├── providers/         # Clientes LLM
│   ├── base.py        # Interface abstrata
│   ├── openai_compat.py  # Cliente OpenAI-compat
│   └── factory.py     # Factory
├── agents/            # Implementações de agentes
│   ├── base.py        # Classe base
│   ├── registry.py    # Registry de agentes
│   └── dummy.py       # Agente de teste
└── tests/             # Testes unitários
```

## API Endpoints

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/ai/agents/` | Lista agentes disponíveis |
| POST | `/api/ai/agents/{key}/run/` | Executa agente |
| GET | `/api/ai/jobs/` | Lista jobs |
| GET | `/api/ai/jobs/{id}/` | Detalhe do job |
| GET | `/api/ai/health/` | Health check |
| GET | `/api/ai/usage/monthly/` | Métricas de uso de tokens |

## Configuração (.env)

```bash
# Z.ai GLM-4.7-Flash (Free tier) - default
LLM_PROVIDER=openai_compat
LLM_BASE_URL=https://api.z.ai/api/paas/v4
LLM_MODEL=glm-4.7-flash
LLM_API_KEY=your-zai-api-key  # ou use ZAI_API_KEY
LLM_TEMPERATURE=0.2
LLM_MAX_TOKENS=4096
LLM_TIMEOUT_SECONDS=60
```

Também compatível com outros providers OpenAI-compat (vLLM, LocalAI, etc.).

## Exemplo de Uso

```python
from apps.ai.services import AIJobService
from apps.ai.tasks import execute_ai_job

# Criar job
job, created = AIJobService.create_job(
    agent_key="dummy",
    input_data={"echo": "Hello!"},
    user=request.user,
)

# Enfileirar execução
if created:
    execute_ai_job.delay(str(job.id), connection.schema_name)
```

## Criar Novo Agente

```python
from apps.ai.agents.base import BaseAgent, AgentContext, AgentResult
from apps.ai.agents.registry import register_agent

@register_agent
class MyAgent(BaseAgent):
    agent_key = "my_agent"
    description = "Meu agente customizado"
    version = "1.0.0"

    def execute(self, input_data: dict, context: AgentContext) -> AgentResult:
        # Lógica do agente
        return AgentResult(
            success=True,
            data={"result": "..."},
        )
```

## Documentação

- [docs/ai/01-visao-geral.md](../../../docs/ai/01-visao-geral.md)
- [docs/ai/02-contrato-api.md](../../../docs/ai/02-contrato-api.md)
- [docs/ai/06-metricas-uso-tokens.md](../../../docs/ai/06-metricas-uso-tokens.md)
