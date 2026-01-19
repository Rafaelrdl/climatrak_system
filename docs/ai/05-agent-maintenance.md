# Agentes de Manutenção (AI-005)

## 1. Visão Geral

Este documento descreve os três agentes de IA para insights de manutenção implementados em AI-005:

| Agent Key | Propósito | Scope |
|-----------|-----------|-------|
| `preventive` | Recomendações para manutenção preventiva | asset, site, all |
| `predictive` | Score de risco preditivo por ativo | asset |
| `patterns` | Identificação de padrões recorrentes | asset, site, all |

Todos os agentes operam **offline-first** (heurísticas locais) com **LLM opcional** para resumos narrativos.

## 2. PreventiveAgent

### 2.1 Descrição

Analisa planos de manutenção preventiva e backlog de OS para gerar recomendações acionáveis.

### 2.2 Input

```json
{
  "scope": "asset",
  "asset_id": 123,
  "due_window_days": 7,        // opcional (default: 7)
  "overdue_window_days": 30    // opcional (default: 30)
}
```

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `scope` | string | Sim | `asset`, `site`, ou `all` |
| `asset_id` | int | Sim (scope=asset) | ID do ativo |
| `site_id` | int | Sim (scope=site) | ID do site |
| `due_window_days` | int | Não | Janela para "próximos vencimentos" |
| `overdue_window_days` | int | Não | Janela máxima para considerar overdue |

### 2.3 Output

```json
{
  "agent_key": "preventive",
  "as_of": "2026-01-19T10:30:00Z",
  "asset": { "id": 123, "tag": "AHU-001" },
  "summary": {
    "total_maintenance_plans": 5,
    "total_open_work_orders": 3,
    "total_overdue_plans": 1,
    "total_due_soon_plans": 2
  },
  "recommendations": [
    {
      "type": "execute_overdue_plan",
      "priority": "high",
      "title": "Executar plano vencido: Troca de Filtro",
      "rationale": "Plano vencido há 5 dias",
      "data": {
        "plan_id": 42,
        "plan_name": "Troca de Filtro G4",
        "days_overdue": 5
      }
    }
  ],
  "llm_summary": null
}
```

### 2.4 Tipos de Recomendação

| Tipo | Prioridade | Descrição |
|------|------------|-----------|
| `execute_overdue_plan` | high | Plano com vencimento ultrapassado |
| `schedule_due_plan` | medium | Plano próximo do vencimento (< 7 dias) |
| `create_plan` | medium | Ativo sem plano preventivo |
| `reduce_backlog` | high | Muitas OS abertas (> 5) |
| `adjust_frequency` | low | Sugestão de ajuste de frequência |

---

## 3. PredictiveAgent

### 3.1 Descrição

Calcula um **score de risco (0-100)** por ativo baseado em sinais de telemetria, alertas e histórico de OS corretivas.

### 3.2 Input

```json
{
  "asset_id": 123,
  "telemetry_window_days": 7   // opcional (default: 7)
}
```

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `asset_id` | int/string | Sim | ID do ativo |
| `telemetry_window_days` | int | Não | Janela de análise de telemetria |

### 3.3 Output

```json
{
  "agent_key": "predictive",
  "as_of": "2026-01-19T10:30:00Z",
  "asset": { "id": 123, "tag": "AHU-001" },
  "risk": {
    "score": 72,
    "level": "high",
    "drivers": [
      "8 alertas nas últimas 24h (+16 pts)",
      "3 alertas críticos (+30 pts)",
      "2 OS corretivas recentes (+12 pts)",
      "Anomalia em temp_supply: variação 4.2σ (+14 pts)"
    ]
  },
  "signals": {
    "alerts_last_24h": 8,
    "alerts_last_7d": 15,
    "telemetry_window_days": 7,
    "telemetry": [
      {
        "parameter": "temp_supply",
        "last_value": 18.3,
        "avg_value": 12.5,
        "std_dev": 1.4,
        "delta_sigma": 4.2
      }
    ]
  },
  "recommended_work_order": {
    "should_create": true,
    "title": "Inspeção preventiva - Risco elevado detectado",
    "priority": "high",
    "description": "Score de risco 72 (alto). Verificar: alertas críticos, anomalia em temp_supply."
  },
  "llm_summary": null
}
```

### 3.4 Níveis de Risco

| Score | Level | Ação Sugerida |
|-------|-------|---------------|
| 0-29 | `minimal` | Monitoramento normal |
| 30-49 | `low` | Atenção moderada |
| 50-69 | `medium` | Considerar inspeção |
| 70-100 | `high` | Ação imediata recomendada |

### 3.5 Pesos do Score

| Fator | Peso Base | Máximo |
|-------|-----------|--------|
| Alertas 24h | 2 pts/alerta | 40 pts |
| Alertas Críticos | 10 pts/alerta | 30 pts |
| Alertas 7d (extra) | 1 pt/alerta | 20 pts |
| Alertas não resolvidos | 5 pts/alerta | 15 pts |
| OS Corretivas recentes | 6 pts/OS | 25 pts |
| Anomalias telemetria | 5 pts/anomalia | 20 pts |

---

## 4. PatternsAgent

### 4.1 Descrição

Identifica padrões recorrentes de manutenção: falhas repetidas, peças mais consumidas, tendências.

### 4.2 Input

```json
{
  "scope": "asset",
  "asset_id": 123,
  "window_days": 30   // opcional (default: 30)
}
```

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `scope` | string | Sim | `asset`, `site`, ou `all` |
| `asset_id` | int | Sim (scope=asset) | ID do ativo |
| `site_id` | int | Sim (scope=site) | ID do site |
| `window_days` | int | Não | Janela de análise histórica |

### 4.3 Output

```json
{
  "agent_key": "patterns",
  "as_of": "2026-01-19T10:30:00Z",
  "scope": { "type": "asset", "id": 123, "tag": "AHU-001" },
  "window_days": 30,
  "kpis": {
    "total": 12,
    "corrective": 7,
    "preventive": 5,
    "ratio_corrective": 0.58
  },
  "top_parts": [
    { "part_id": 1, "name": "Filtro G4", "sku": "FLT-G4-001", "qty": 15 },
    { "part_id": 2, "name": "Correia V", "sku": "CRR-V-002", "qty": 8 }
  ],
  "patterns": [
    {
      "type": "high_corrective_ratio",
      "priority": "high",
      "title": "Alta taxa de corretivas (58%)",
      "recommendation": "Revisar plano preventivo ou condições operacionais"
    },
    {
      "type": "high_consumption_part",
      "priority": "medium",
      "title": "Alto consumo: Filtro G4 (15 un/mês)",
      "recommendation": "Verificar qualidade do ar ou frequência de troca"
    }
  ],
  "llm_summary": null
}
```

### 4.4 Tipos de Padrão

| Tipo | Prioridade | Descrição |
|------|------------|-----------|
| `high_corrective_ratio` | high | > 50% das OS são corretivas |
| `repeat_failure` | high | Falha repetida (>2x) em 30 dias |
| `high_consumption_part` | medium | Peça com consumo > 10 un/mês |
| `seasonal_pattern` | low | Padrão sazonal identificado |
| `cost_trend` | medium | Tendência de aumento de custos |

---

## 5. Scheduled Tasks

Os agentes executam automaticamente via Celery Beat:

| Task | Agent | Schedule | Idempotency Key |
|------|-------|----------|-----------------|
| `schedule_preventive_insights` | preventive | Diária 06:00 | `preventive:asset:{id}:asof:{YYYY-MM-DD}:v1` |
| `schedule_predictive_risk` | predictive | A cada 4h | `predictive:asset:{id}:bucket:{YYYY-MM-DDTHH}:v1` |
| `schedule_patterns_report` | patterns | Semanal (segunda) | `patterns:scope:{type}:{id}:week:{YYYY-WW}:v1` |

As tasks iteram todos os tenants e todos os ativos ativos, respeitando multi-tenancy.

---

## 6. Frontend Integration

### 6.1 Tab "IA" no AssetDetailPage

O componente `AssetAIInsightsTab` exibe insights dos três agentes:

```tsx
<AssetAIInsightsTab
  assetId={asset.id}
  assetTag={asset.tag}
/>
```

### 6.2 aiService Functions

```typescript
// Executar análise e aguardar resultado
const job = await analyzePredictiveAndWait(assetId);

// Buscar insights mais recentes
const insights = await getAssetAIInsights(assetId);
// Returns: { predictive: AIJob | null, preventive: AIJob | null, patterns: AIJob | null }
```

---

## 7. Referências

- [01-visao-geral.md](01-visao-geral.md) - Visão geral do módulo AI
- [02-contrato-api.md](02-contrato-api.md) - Contrato da API REST
- `backend/apps/ai/agents/preventive.py` - Implementação PreventiveAgent
- `backend/apps/ai/agents/predictive.py` - Implementação PredictiveAgent
- `backend/apps/ai/agents/patterns.py` - Implementação PatternsAgent
- `frontend/src/components/assets/AssetAIInsightsTab.tsx` - Componente React
