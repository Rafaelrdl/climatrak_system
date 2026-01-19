# AI Agent: Inventory (AI-004)

> Agente de Análise de Inventário e Recomendações de Estoque

## Visão Geral

O agente `inventory` analisa o consumo real de itens de estoque e gera recomendações acionáveis para:
- **Reposição**: itens que precisam ser repostos (risco de ruptura, estoque baixo)
- **Excesso**: itens com estoque acima do necessário
- **Estoque parado**: itens sem movimento por período prolongado

O agente usa **heurísticas determinísticas** como base, com opção de sumarização via LLM quando disponível.

## Especificação

| Atributo | Valor |
|----------|-------|
| `agent_key` | `inventory` |
| `version` | `1.0.0` |
| `require_llm` | `false` |
| Fonte de dados | `InventoryItem`, `InventoryMovement` |

## Endpoints

### Executar Agente

```http
POST /api/ai/agents/inventory/run/
```

### Input Schema

#### Modo Overview (padrão)

Analisa todos os itens ativos e retorna top recomendações.

```json
{
  "input": {
    "mode": "overview",
    "window_days": 90,
    "top_n": 30,
    "default_lead_time_days": 7,
    "safety_days": 3,
    "dead_stock_days": 180,
    "overstock_days": 180
  },
  "idempotency_key": "inventory:overview:90d:v1"
}
```

#### Modo Item

Analisa um item específico em detalhe.

```json
{
  "input": {
    "mode": "item",
    "item_id": 123,
    "window_days": 90,
    "default_lead_time_days": 7,
    "safety_days": 3
  },
  "idempotency_key": "inventory:item:123:90d:v1"
}
```

### Parâmetros de Input

| Parâmetro | Tipo | Default | Descrição |
|-----------|------|---------|-----------|
| `mode` | string | `"overview"` | Modo de análise: `"overview"` ou `"item"` |
| `window_days` | int | `90` | Janela de tempo para análise de consumo (dias) |
| `top_n` | int | `30` | Número máximo de recomendações por categoria |
| `default_lead_time_days` | int | `7` | Lead time padrão quando item não possui |
| `safety_days` | int | `3` | Dias de estoque de segurança |
| `dead_stock_days` | int | `180` | Dias sem saída para considerar estoque parado |
| `overstock_days` | int | `180` | Dias de cobertura para considerar excesso |
| `item_id` | int | - | ID do item (obrigatório quando `mode="item"`) |

## Output Schema

```json
{
  "agent_key": "inventory",
  "version": "1.0.0",
  "mode": "overview",
  "window_days": 90,
  "generated_at": "2026-01-18T12:00:00-03:00",
  "summary": {
    "total_items": 120,
    "items_with_consumption": 45,
    "total_stock_value": 123456.78,
    "low_stock_count": 12,
    "out_of_stock_count": 4,
    "critical_low_count": 3,
    "reorder_count": 15,
    "overstock_count": 8,
    "dead_stock_count": 10
  },
  "recommendations": {
    "reorder": [
      {
        "item_id": 123,
        "code": "FILTRO-123",
        "name": "Filtro G4 610x610",
        "unit": "UN",
        "category_name": "Filtros",
        "current_qty": 2,
        "avg_daily_usage": 0.15,
        "lead_time_days": 10,
        "days_of_cover": 13.3,
        "stockout_risk": true,
        "suggested_reorder_point": 2.55,
        "suggested_min_quantity": 0.45,
        "suggested_max_quantity": 7.05,
        "suggested_order_qty": 5.05,
        "confidence": "high",
        "priority": "high",
        "notes": ["Consumo médio: 0.15/dia (30 movimentações)"]
      }
    ],
    "overstock": [
      {
        "item_id": 456,
        "code": "OLEO-001",
        "name": "Óleo Lubrificante",
        "unit": "L",
        "current_qty": 500,
        "avg_daily_usage": 1.5,
        "excess_qty": 350,
        "excess_value": 1750.00,
        "confidence": "medium",
        "notes": []
      }
    ],
    "dead_stock": [
      {
        "item_id": 789,
        "code": "PECA-OLD",
        "name": "Peça Descontinuada",
        "unit": "UN",
        "current_qty": 25,
        "stock_value": 2500.00,
        "days_since_last_out": 210,
        "confidence": "high",
        "notes": []
      }
    ]
  },
  "llm_summary": "O estoque apresenta 3 itens críticos abaixo do mínimo...",
  "engine": {
    "type": "heuristic",
    "assumptions": [
      "lead_time_days default=7 quando item não possui",
      "safety_stock = avg_daily_usage * 3 dias",
      "max target = reorder_point + 30 dias de cobertura",
      "dead_stock = sem saída por 180 dias"
    ]
  }
}
```

## Heurísticas

### Cálculos Base

Para cada item com consumo no período:

```
avg_daily_usage = total_out / window_days
safety_stock = avg_daily_usage × safety_days
suggested_reorder_point = (avg_daily_usage × lead_time) + safety_stock
suggested_min_quantity = max(safety_stock, current_min)
suggested_max_quantity = suggested_reorder_point + (avg_daily_usage × 30)
days_of_cover = current_qty / avg_daily_usage
suggested_order_qty = max(0, suggested_max - current_qty)
```

### Classificações

| Classificação | Critério |
|--------------|----------|
| **stockout_risk** | `days_of_cover < lead_time` |
| **low_stock** | `current_qty < min_quantity` |
| **out_of_stock** | `current_qty <= 0` |
| **dead_stock** | Sem saída por `dead_stock_days` e `qty > 0` |
| **overstock** | `qty > avg_daily_usage × overstock_days` OU `qty > max_quantity` |

### Níveis de Confiança

| Nível | Critério |
|-------|----------|
| `high` | ≥ 10 movimentações no período |
| `medium` | 3-9 movimentações |
| `low` | < 3 movimentações |

### Prioridades (Reorder)

| Prioridade | Critério |
|------------|----------|
| `critical` | Sem estoque OU (estoque baixo E item crítico) |
| `high` | Estoque baixo |
| `medium` | Risco de ruptura |

## Integração Frontend

### Botão "Gerar Recomendações IA"

```typescript
import { runInventoryAnalysis, pollAIJob } from '@/services/aiService';

const handleAnalyze = async () => {
  setLoading(true);
  try {
    const { job_id } = await runInventoryAnalysis({ window_days: 90 });
    const result = await pollAIJob(job_id);
    setRecommendations(result.output_data);
  } catch (error) {
    toast.error('Erro ao gerar recomendações');
  } finally {
    setLoading(false);
  }
};
```

### Aplicar Sugestão

```typescript
const handleApplySuggestion = async (rec: ReorderRecommendation) => {
  const confirmed = await confirm(
    `Atualizar ${rec.code}?\n` +
    `• Ponto de Reposição: ${rec.suggested_reorder_point}\n` +
    `• Estoque Mínimo: ${rec.suggested_min_quantity}\n` +
    `• Estoque Máximo: ${rec.suggested_max_quantity}`
  );

  if (confirmed) {
    await inventoryService.updateItem(rec.item_id, {
      reorder_point: rec.suggested_reorder_point,
      min_quantity: rec.suggested_min_quantity,
      max_quantity: rec.suggested_max_quantity,
    });
    toast.success('Parâmetros atualizados');
  }
};
```

## Testes

```bash
# Backend
docker exec climatrak-api python manage.py test apps.ai.tests.test_inventory_agent -v 2

# Casos cobertos:
# - Registro do agente
# - Validação de input (mode, item_id)
# - Cálculo de heurísticas
# - Detecção de stockout_risk
# - Detecção de dead_stock
# - Detecção de overstock
# - Níveis de confiança
# - Schema de output
```

## Limitações e Notas

1. **Não cria pedidos de compra**: apenas sugere quantidades
2. **Não altera estoque automaticamente**: requer ação explícita do usuário
3. **LLM é opcional**: funciona 100% com heurísticas se LLM não disponível
4. **Multi-tenant**: cada tenant vê apenas seus dados
5. **Idempotência**: mesma `idempotency_key` retorna job existente

## Changelog

### v1.0.0 (2026-01-19)
- Implementação inicial
- Modos `overview` e `item`
- Heurísticas de reorder, overstock, dead_stock
- Sumarização opcional via LLM
