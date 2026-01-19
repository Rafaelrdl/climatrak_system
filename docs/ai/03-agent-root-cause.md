# RootCauseAgent (AI-002) — Análise de Causa Raiz

## 1. Overview

O **RootCauseAgent** é um agente de IA que analisa alertas de equipamentos para identificar possíveis causas raízes, recomendações de ações e necessidade de manutenção corretiva.

**Agent Key**: `root_cause`

### Entradas

```json
{
  "alert_id": 123,                    // BigAutoField do alerta (required)
  "window_minutes": 120               // Janela de telemetria (default: 120)
}
```

### Saída

```json
{
  "schema_version": "1.0",
  "alert": {
    "id": 123,
    "asset_tag": "AHU-01",
    "parameter_key": "temp_supply",
    "current_value": 18.3,
    "threshold_value": 12.0,
    "severity": "Critical",
    "unit": "°C",
    "triggered_at": "2024-01-15T10:00:00Z"
  },
  "hypotheses": [
    {
      "id": "H1",
      "title": "Sensor de temperatura com falha",
      "confidence": 0.85,
      "evidence": [
        "Leitura anormalmente baixa (-10°C) em relação ao histórico",
        "Padrão de flutuação irregular"
      ],
      "severity": "High",
      "recommendation": "Substituir sensor de temperatura"
    },
    {
      "id": "H2",
      "title": "Damper de ar retorno preso em posição aberta",
      "confidence": 0.70,
      "evidence": [
        "Temperatura fornecida consistentemente abaixo do setpoint",
        "Sem oscilações detectadas"
      ],
      "severity": "High",
      "recommendation": "Inspecionar damper de ar retorno"
    }
  ],
  "immediate_actions": [
    "Verificar visualmente sensor de temperatura",
    "Confirmar leitura com termômetro manual",
    "Aumentar frequência de monitoramento para 5 min"
  ],
  "recommended_work_order": {
    "title": "Diagnóstico e correção - Temperatura baixa AHU-01",
    "type": "CM",
    "priority": "High",
    "estimated_duration_hours": 2,
    "parts_potentially_needed": [
      "RTD sensor -40 a +120°C",
      "Transmissor de temperatura"
    ]
  },
  "notes": "Alerta de temperatura crítica requer investigação imediata. Possíveis causas: sensor falho ou damper preso.",
  "tokens_used": 287,
  "analysis_completed_at": "2024-01-15T10:05:30Z"
}
```

## 2. Contexto Coletado

O agente coleta automaticamente:

### Alert Data
- ID, tag do ativo, parâmetro, valor atual/threshold
- Severity, unidade, hora do disparo

### Telemetry (últimas N minutos)
- Min/max/média do sensor primário
- Trend (rising/falling/stable)
- Últimos 10 valores para gráfico contextual

### Related Sensors
- Outros sensores do mesmo equipamento
- Padrões correlacionados (ex: temperatura vs umidade)

### CMMS Context
- Últimas 10 ordens de serviço do ativo
- Tipos de problema históricos
- Frequência de ocorrência

### Correlated Alerts
- Alertas simultâneos em equipamentos relacionados
- Possível propagação de falha

## 3. Prompts do Sistema

### System Prompt

```
Você é um especialista em diagnóstico de falhas para sistemas HVAC e equipamentos industriais.

Seu objetivo é:
1. Analisar alertas técnicos
2. Identificar 2-3 possíveis causas raízes
3. Atribuir confiança (0.0-1.0) a cada hipótese
4. Fornecer ações imediatas (verificações rápidas)
5. Recomendar ordem de serviço estruturada

Ser conciso. Basear-se em evidências (telemetria, histórico, padrões).
Não especular sem dados. Responder sempre em JSON.
```

### User Prompt (contexto do alerta)

```
ALERTA: {alert_data}

TELEMETRIA (últimos {window_minutes} minutos):
- Sensor primário: min={min}, max={max}, avg={avg}, trend={trend}
- Últimos valores: {readings}

SENSORES RELACIONADOS:
- Sensor2: min={min}, max={max} (padrão: {pattern})
- Sensor3: min={min}, max={max} (padrão: {pattern})

HISTÓRICO CMMS (últimas 10 OS):
- 2024-01-10: Substituição de damper (tipo: preventiva)
- 2024-01-05: Limpeza de serpentina (tipo: corretiva)

ALERTAS CORRELACIONADOS:
- AHU-02: Temperatura alta em mesmo período
- Sensor-X: Desvio anormal

Por favor, analise e retorne JSON com suas hipóteses.
```

## 4. Tratamento de Erros

| Cenário | Ação |
|---------|------|
| Alert não encontrado | ValueError: "Alert with id {id} not found" |
| alert_id inválido | ValueError: "alert_id must be int/string" |
| LLM timeout | AgentResult(success=False, error="LLM request timed out") |
| JSON inválido | Tenta remover markdown fences; se falhar, retorna erro |

## 5. Integração Frontend

### Endpoint

```bash
POST /api/ai/agents/root_cause/run/
Content-Type: application/json

{
  "alert_id": 123,
  "window_minutes": 120,
  "related": {
    "id": 123,
    "type": "alert"
  }
}
```

### Fluxo UI (Monitor)

1. Usuário abre modal de alerta
2. Clica botão "Analisar com IA"
3. POST `/api/ai/agents/root_cause/run/` → recebe job_id
4. Poll GET `/api/ai/jobs/{id}/` a cada 1s até `status=succeeded`
5. Exibe resultado em abas:
   - **Hipóteses**: Cartão para cada causa com confiança
   - **Ações Imediatas**: Checklist
   - **OS Recomendada**: Pré-preenchida com formulário

### Exemplo Frontend

```typescript
// services/aiService.ts
export async function analyzeAlertWithAI(alertId: number | string) {
  const response = await api.post('/ai/agents/root_cause/run/', {
    alert_id: alertId,
    related: { id: alertId, type: 'alert' },
  });
  return response.data; // { job_id, status }
}

// Hook para polling
export function useAIJobPolling(jobId: string | null) {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!jobId) return;
    
    setLoading(true);
    const interval = setInterval(async () => {
      const job = await api.get(`/ai/jobs/${jobId}/`);
      if (job.data.status === 'succeeded') {
        setResult(job.data.output);
        setLoading(false);
        clearInterval(interval);
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [jobId]);

  return { result, loading };
}
```

## 6. Limitações e Considerações

1. **Qualidade de Dados**: Resultado depende da qualidade da telemetria
2. **Context Window**: Window de 120 min é padrão; pode ser aumentado
3. **Sensor Failures**: Não detecta automaticamente sensores com falha (requer análise)
4. **Correlações**: Correlações entre sensores são estatísticas, não determinísticas
5. **LLM Hallucination**: Possível que LLM sugira ações não viáveis; sempre revisar

## 7. Testing

### Unit Tests

```python
# apps/ai/tests/test_root_cause_agent.py
- test_root_cause_agent_registered()
- test_validate_input_requires_alert_id()
- test_gather_context_with_alert()
- test_execute_parses_llm_json_output()
- test_convert_int_related_id_to_uuid()
```

### Integration Tests

```python
# Future: Multi-tenant isolation, E2E API flow
```

## 8. Schema Versioning

Output segue schema v1.0. Futuras versões:
- v1.1: Adicionar risk_level (low/medium/high)
- v2.0: Histórico de recomendações, feedback loop

## 9. Referências

- [01-visao-geral.md](01-visao-geral.md) - Visão geral do módulo AI
- [02-contrato-api.md](02-contrato-api.md) - Contrato da API
- [backend/apps/ai/agents/root_cause.py](../../backend/apps/ai/agents/root_cause.py) - Implementação
