# AI Agent: Quick Repair (AI-003)

> Agente de Diagnóstico Rápido para Técnicos em Campo

## Visão Geral

O agente `quick_repair` oferece suporte de diagnóstico e reparo para técnicos em campo. Dado um **sintoma** reportado e o contexto do ativo, o agente gera:

- **Hipóteses de causa** com nível de confiança e evidências
- **Passos de diagnóstico** (checklist de verificações)
- **Passos de reparo** com precauções de segurança
- **Sugestões de peças** com match automático no inventário
- **Ferramentas necessárias**
- **EPIs obrigatórios e avisos de segurança**
- **Referências** a procedimentos e OSs similares
- **Sugestão de OS** com tipo, prioridade e tempo estimado

O agente **requer LLM** para análise completa, mas possui **modo fallback** que retorna diretrizes básicas quando LLM não disponível.

## Especificação

| Atributo | Valor |
|----------|-------|
| `agent_key` | `quick_repair` |
| `version` | `1.0.0` |
| `require_llm` | `true` (com fallback) |
| Fonte de dados | `Asset`, `WorkOrder`, `Procedure`, `InventoryItem` |

## Endpoints

### Executar Agente

```http
POST /api/ai/agents/quick_repair/run/
```

## Input Schema

```json
{
  "input": {
    "symptom": "O equipamento está fazendo barulho alto durante a operação e a temperatura não está estabilizando corretamente",
    "asset_id": 123,
    "constraints": [
      "Não pode parar a produção",
      "Intervenção deve ser concluída em até 2 horas"
    ],
    "observations": "O problema começou após a última manutenção preventiva realizada na semana passada. Já verificamos os filtros e estão limpos.",
    "window_days": 180
  },
  "related": {
    "type": "asset",
    "id": 123
  },
  "idempotency_key": "quick_repair:asset:123:1737315600000"
}
```

### Parâmetros de Input

| Parâmetro | Tipo | Obrigatório | Default | Descrição |
|-----------|------|-------------|---------|-----------|
| `symptom` | string | **Sim** | - | Descrição do problema (mínimo 10 caracteres) |
| `asset_id` | int | **Sim** | - | ID do ativo/equipamento |
| `constraints` | array[string] | Não | `[]` | Restrições operacionais (ex: não pode parar produção) |
| `observations` | string | Não | `""` | Observações adicionais do técnico |
| `window_days` | int | Não | `180` | Janela de tempo para buscar OSs similares (dias) |

## Output Schema

### Modo Normal (LLM Disponível)

```json
{
  "agent_key": "quick_repair",
  "version": "1.0.0",
  "generated_at": "2026-01-19T14:30:00-03:00",
  "summary": "Diagnóstico aponta para falha no compressor ou problema de refrigerante. Verificar pressão do sistema e inspeção visual do compressor são passos críticos.",
  
  "hypotheses": [
    {
      "id": "H1",
      "title": "Baixa carga de refrigerante (vazamento)",
      "confidence": 0.85,
      "evidence": [
        "Temperatura não estabiliza",
        "Ruído pode indicar compressor trabalhando sob carga inadequada",
        "Sintoma comum em sistemas com vazamento"
      ],
      "severity": "high"
    },
    {
      "id": "H2",
      "title": "Compressor com desgaste mecânico",
      "confidence": 0.65,
      "evidence": [
        "Ruído excessivo durante operação",
        "Equipamento com mais de 5 anos de operação"
      ],
      "severity": "medium"
    }
  ],
  
  "diagnosis_steps": [
    {
      "step": 1,
      "action": "Verificar pressões de sucção e descarga do sistema",
      "expected_result": "Pressões devem estar dentro da faixa especificada pelo fabricante (consultar manual)",
      "tools_required": ["Manifold de pressão", "Termômetro digital"]
    },
    {
      "step": 2,
      "action": "Inspeção visual e auditiva do compressor",
      "expected_result": "Identificar vazamentos óbvios, ruídos anormais ou vibração excessiva",
      "tools_required": ["Detector de vazamento", "Estetoscópio mecânico"]
    },
    {
      "step": 3,
      "action": "Verificar nível de óleo do compressor",
      "expected_result": "Nível deve estar no visor entre MIN e MAX",
      "tools_required": ["Lanterna"]
    }
  ],
  
  "repair_steps": [
    {
      "step": 1,
      "action": "Isolar o equipamento (LOTO) e aliviar pressão do sistema",
      "precautions": "Usar óculos de proteção e luvas. Refrigerante sob pressão pode causar queimaduras.",
      "estimated_minutes": 15
    },
    {
      "step": 2,
      "action": "Localizar e reparar vazamento (se detectado)",
      "precautions": "Trabalhar em área ventilada. Usar detector de vazamento aprovado.",
      "estimated_minutes": 60
    },
    {
      "step": 3,
      "action": "Realizar vácuo no sistema e recarregar refrigerante",
      "precautions": "Seguir especificações do fabricante para tipo e quantidade de refrigerante",
      "estimated_minutes": 90
    }
  ],
  
  "parts": [
    {
      "name": "Gás refrigerante R-410A",
      "quantity": 5,
      "purpose": "Recarga do sistema após reparo de vazamento",
      "inventory_matches": [
        {
          "inventory_id": 45,
          "code": "REF-R410A",
          "name": "Refrigerante R-410A 13.6kg",
          "available_qty": 3.0,
          "unit": "UN",
          "unit_cost": 450.00,
          "location": "A2-05"
        }
      ]
    },
    {
      "name": "Kit de reparo para vazamento",
      "quantity": 1,
      "purpose": "Vedação de pequenos vazamentos",
      "inventory_matches": []
    }
  ],
  
  "tools": [
    "Manifold de pressão",
    "Detector de vazamento",
    "Bomba de vácuo",
    "Cilindro de refrigerante",
    "Estetoscópio mecânico",
    "Termômetro digital",
    "Multímetro"
  ],
  
  "safety": {
    "ppe_required": [
      "Óculos de proteção",
      "Luvas de proteção térmica",
      "Calçado de segurança",
      "Protetor auricular"
    ],
    "warnings": [
      "Desenergizar equipamento antes de qualquer intervenção (LOTO)",
      "Refrigerante sob pressão - risco de queimaduras por frio",
      "Trabalhar em área ventilada - refrigerante pode deslocar oxigênio",
      "Não soldar ou aplicar chama em linhas pressurizadas"
    ]
  },
  
  "escalation": {
    "criteria": "Se após diagnóstico for confirmado falha no compressor, escalar para equipe especializada ou fabricante",
    "contact": "Supervisor de manutenção ou engenheiro responsável"
  },
  
  "suggested_work_order": {
    "title": "Correção de vazamento e recarga de refrigerante - CH-001",
    "type": "CORRECTIVE",
    "priority": "HIGH",
    "estimated_hours": 3.0
  },
  
  "references": {
    "similar_work_orders": [
      {
        "id": 156,
        "number": "OS-2025-0234",
        "description": "Reparo de vazamento em válvula de serviço - Chiller CH-002",
        "status": "COMPLETED"
      },
      {
        "id": 142,
        "number": "OS-2025-0189",
        "description": "Recarga de refrigerante após manutenção preventiva",
        "status": "COMPLETED"
      }
    ],
    "procedures": [
      {
        "id": 12,
        "title": "Procedimento de Detecção e Reparo de Vazamentos em Sistemas de Refrigeração",
        "file_type": "PDF"
      },
      {
        "id": 8,
        "title": "Manual de Manutenção Carrier 30XA",
        "file_type": "PDF"
      }
    ]
  },
  
  "asset": {
    "id": 123,
    "tag": "CH-001",
    "name": "Chiller Principal - Torre A",
    "asset_type": "CHILLER",
    "manufacturer": "Carrier",
    "model": "30XA-1002",
    "serial_number": "SN1234567890",
    "status": "ALERT",
    "specifications": {
      "capacity": "100TR",
      "refrigerant": "R-410A",
      "voltage": "380V"
    },
    "site_name": "Unidade Matriz",
    "sector_name": "HVAC - Produção",
    "subsection_name": null
  },
  
  "idempotency_key": "quick_repair:asset:123:a3f2b1c8:v1"
}
```

### Modo Fallback (LLM Indisponível)

```json
{
  "mode": "fallback",
  "summary": "Diagnóstico básico para CH-001 (CHILLER). LLM não disponível - consulte os procedimentos e histórico manualmente.",
  
  "hypotheses": [
    {
      "id": "H1",
      "title": "Verificar histórico de manutenção",
      "confidence": 0.5,
      "evidence": [
        "Sintoma reportado: O equipamento está fazendo barulho alto...",
        "Análise automática indisponível"
      ]
    }
  ],
  
  "diagnosis_steps": [
    {
      "step": 1,
      "action": "Verificar status visual do equipamento",
      "expected_result": "Identificar sinais óbvios de falha",
      "tools_required": ["Lanterna", "Multímetro"]
    },
    {
      "step": 2,
      "action": "Consultar histórico de OSs do equipamento",
      "expected_result": "Identificar padrões de falha recorrentes",
      "tools_required": []
    },
    {
      "step": 3,
      "action": "Consultar procedimentos técnicos relacionados",
      "expected_result": "Seguir passos de diagnóstico documentados",
      "tools_required": []
    }
  ],
  
  "repair_steps": [],
  
  "parts": [],
  
  "tools": ["Multímetro", "Chave de fenda", "Lanterna"],
  
  "safety": {
    "ppe_required": ["Óculos de proteção", "Luvas", "Calçado de segurança"],
    "warnings": [
      "Desenergizar equipamento antes de intervenção",
      "Seguir procedimento de bloqueio e etiquetagem (LOTO)"
    ]
  },
  
  "escalation": {
    "criteria": "Se o problema persistir após verificações básicas",
    "contact": "Supervisor de manutenção"
  }
}
```

## Regras de Negócio

### 1. Validação de Entrada

- **Sintoma**: obrigatório, mínimo 10 caracteres
- **Asset ID**: obrigatório, deve existir no banco
- **Constraints**: opcional, array de strings
- **Observations**: opcional, texto livre

### 2. Coleta de Contexto

O agente coleta automaticamente:

1. **Informações do Ativo**
   - Tag, nome, tipo, fabricante, modelo
   - Status atual, especificações técnicas
   - Localização (site, setor, subseção)

2. **Histórico de OSs Similares**
   - OSs do mesmo ativo
   - Status: COMPLETED ou IN_PROGRESS
   - Janela: últimos 180 dias (configurável)
   - Limite: 5 OSs mais recentes

3. **Procedimentos Relevantes**
   - Filtro por tipo de ativo (tags)
   - Status: ACTIVE
   - Ordenação: view_count DESC, updated_at DESC
   - Limite: 5 procedimentos

4. **Itens de Inventário**
   - Filtro por keywords do sintoma + tipo de ativo
   - Apenas itens ativos com estoque > 0
   - Limite: 10 itens

### 3. Match de Inventário

Para cada peça sugerida pelo LLM:
- Busca no inventário disponível por **similaridade de nome**
- Retorna: código, nome, quantidade disponível, unidade, custo, localização
- Match parcial aceito (ex: "Filtro de ar" → "Filtro de ar G4")

### 4. Idempotency Key

Padrão: `quick_repair:asset:{asset_id}:{symptom_hash}:v1`

Onde `symptom_hash` = primeiros 8 caracteres do SHA256 do sintoma.

**Importante**: Cada sintoma diferente gera uma nova análise (mesmo asset). Para **re-análise** do mesmo sintoma, usar timestamp na idempotency_key (frontend).

### 5. Fallback

Acionado automaticamente quando:
- LLM não disponível
- LLM retorna JSON inválido (após 3 tentativas)
- Timeout na chamada LLM

Retorna:
- Hipótese genérica
- 3 passos básicos de diagnóstico
- Segurança padrão (LOTO, EPIs básicos)
- Referências ao histórico e procedimentos

## Casos de Uso

### UC1: Técnico em Campo com Equipamento Parado

**Cenário**: Chiller apresentando ruído excessivo, técnico no local precisa diagnosticar rapidamente.

**Fluxo**:
1. Técnico abre modal de nova OS no mobile/web
2. Seleciona equipamento (CH-001)
3. Clica em "Assistente de Reparo (IA)"
4. Descreve sintoma: "Ruído alto e temperatura não estabiliza"
5. Adiciona observação: "Problema começou hoje de manhã"
6. Sistema chama agente `quick_repair`
7. Recebe em ~10s: hipóteses, diagnóstico, peças, segurança
8. Técnico segue checklist de diagnóstico
9. Aplica sugestão de OS se necessário

### UC2: Planejamento de Manutenção Corretiva

**Cenário**: Operador reporta problema, supervisor precisa planejar intervenção.

**Fluxo**:
1. Supervisor recebe notificação de problema
2. Usa Quick Repair para diagnóstico preliminar
3. Verifica peças disponíveis no estoque
4. Estima tempo de reparo (~3h)
5. Agenda intervenção fora do horário de produção
6. Cria OS com sugestão do agente
7. Aloca técnico e reserva peças

### UC3: Treinamento de Técnicos

**Cenário**: Novo técnico em treinamento.

**Fluxo**:
1. Instrutor apresenta sintoma hipotético
2. Técnico usa Quick Repair para diagnóstico
3. Compara resultado com procedimento padrão
4. Discute hipóteses e evidências
5. Treina seguindo passos de diagnóstico sugeridos

## Integração com Outros Agentes

### Com Inventory Agent (AI-004)

- **Quick Repair** sugere peças → **Inventory** verifica disponibilidade e recomenda reposição
- **Sem conflito**: Quick Repair foca em diagnóstico, Inventory em gestão de estoque

### Com Preventive Agent (AI-005)

- **Quick Repair** identifica falha → **Preventive** ajusta plano preventivo para evitar recorrência
- **Sem conflito**: Quick Repair é reativo (corretivo), Preventive é proativo

### Com Predictive Agent (AI-005)

- **Predictive** detecta anomalia → técnico usa **Quick Repair** para diagnóstico confirmatório
- **Sem conflito**: Predictive é baseado em telemetria/padrões, Quick Repair em sintoma reportado

### Com Patterns Agent (AI-005)

- **Patterns** identifica falha recorrente → **Quick Repair** usa histórico para melhorar hipóteses
- **Sem conflito**: Patterns analisa tendências, Quick Repair diagnostica instância específica

### Com Knowledge Base (AI-006)

- **Quick Repair** referencia procedimentos → **Knowledge Base** provê chunks indexados para contexto LLM
- **Integração**: Quick Repair pode buscar em `AIKnowledgeChunk` para enriquecer prompt (futura iteração)

## Performance

- **Tempo médio (LLM)**: 8-15 segundos
- **Tempo médio (fallback)**: <1 segundo
- **Timeout**: 90 segundos (frontend polling)
- **Tokens médios**: 1500-2500 (prompt + resposta)

## Limitações

1. **Dependência de LLM**: Diagnóstico avançado requer LLM disponível
2. **Contexto limitado**: Não acessa telemetria em tempo real (integração futura)
3. **Match de inventário**: Baseado em similaridade de texto (pode ter falsos positivos/negativos)
4. **Idioma**: Prompt em português, LLM deve suportar PT-BR

## Roadmap

- [ ] Integração com Knowledge Base (AI-006) para contexto de procedimentos
- [ ] Integração com telemetria (alertas recentes do ativo)
- [ ] Suporte a fotos (técnico tira foto do problema → incluir no diagnóstico)
- [ ] Histórico de diagnósticos do mesmo sintoma (aprendizado)
- [ ] Feedback loop (técnico confirma/rejeita hipótese → treinar modelo)

## Exemplos de Prompt

Ver arquivo de testes: `backend/apps/ai/tests/test_quick_repair_agent.py`

Ver código do agente: `backend/apps/ai/agents/quick_repair.py` → `_build_prompt()`

## Frontend Integration

### Hook: `useQuickRepair`

```typescript
import { useQuickRepair } from '@/hooks/useQuickRepair';

function MyComponent() {
  const { runDiagnosis, isLoading, isSuccess, data } = useQuickRepair();

  const handleDiagnose = async () => {
    const result = await runDiagnosis(
      123, // asset_id
      "Equipamento fazendo barulho alto", // symptom
      {
        constraints: ["Não pode parar produção"],
        observations: "Problema começou hoje"
      }
    );
    console.log(result);
  };

  return (
    <button onClick={handleDiagnose} disabled={isLoading}>
      {isLoading ? 'Analisando...' : 'Diagnosticar'}
    </button>
  );
}
```

### Component: `<QuickRepairDialog>`

```tsx
import { QuickRepairDialog } from '@/components/QuickRepairDialog';

<QuickRepairDialog
  assetId={123}
  assetTag="CH-001"
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  onApplySuggestion={(suggestion) => {
    // Preenche formulário de OS com sugestão
    setFormData({
      type: suggestion.type,
      priority: suggestion.priority,
      description: suggestion.title,
    });
  }}
/>
```

## Testes

Ver: `backend/apps/ai/tests/test_quick_repair_agent.py`

Cobertura:
- ✅ Registro do agente
- ✅ Validação de entrada
- ✅ Coleta de contexto
- ✅ Modo fallback
- ✅ Enriquecimento de output
- ✅ Extração de keywords
- ✅ Match de inventário
- ✅ Geração de idempotency_key

## Changelog

### v1.0.0 (2026-01-19)
- Implementação inicial
- Suporte a diagnóstico com LLM
- Modo fallback
- Match automático de inventário
- Referências a OSs e procedimentos
- Frontend integration (WorkOrderModal)
