# 🧪 Guia Rápido de Testes - Sistema Multi-Parâmetro

## 🎯 Objetivo

Validar que o sistema de regras multi-parâmetro está funcionando corretamente tanto no frontend quanto no backend.

---

## ✅ TESTES FRONTEND (Implementado)

### Teste 1: Criar Regra com 1 Parâmetro

**Objetivo**: Validar que sistema funciona como antes

**Passos**:
1. Abrir página de Alertas
2. Clicar em "Criar Regra"
3. Preencher:
   - Nome: "Teste 1 Parâmetro"
   - Equipamento: Qualquer
   - Adicionar 1 parâmetro
   - Configurar sensor, operador, threshold, etc.
   - Adicionar mensagem: "Teste: {value} {operator} {threshold}"
4. Salvar

**Resultado Esperado**:
- ✅ Regra criada com sucesso
- ✅ Toast de sucesso aparece
- ✅ Regra aparece na lista

---

### Teste 2: Criar Regra com 3 Parâmetros

**Objetivo**: Validar múltiplos parâmetros

**Passos**:
1. Criar nova regra
2. Adicionar 3 parâmetros diferentes:
   - Parâmetro 1: Operador `>`, Severidade CRITICAL
   - Parâmetro 2: Operador `<`, Severidade HIGH
   - Parâmetro 3: Operador `>=`, Severidade MEDIUM
3. Mensagens diferentes para cada um
4. Salvar

**Resultado Esperado**:
- ✅ 3 cards de parâmetros visíveis
- ✅ Cada um com configuração independente
- ✅ Regra salva com sucesso

**Validar no Console**:
```javascript
// Abrir DevTools → Console
// Verificar payload enviado
```

---

### Teste 3: Remover Parâmetro

**Objetivo**: Validar remoção de parâmetros

**Passos**:
1. Criar regra com 3 parâmetros
2. Clicar no ícone de lixeira do parâmetro 2
3. Verificar que ficaram 2 parâmetros
4. Salvar

**Resultado Esperado**:
- ✅ Parâmetro removido da UI imediatamente
- ✅ Regra salva com 2 parâmetros

---

### Teste 4: Editar Regra Antiga (Single-Parameter)

**Objetivo**: Validar retrocompatibilidade

**Pré-requisito**: Ter regra criada no sistema antigo (campo único)

**Passos**:
1. Clicar em editar regra antiga
2. Verificar que aparece 1 parâmetro no formato de card
3. Adicionar mais 2 parâmetros
4. Salvar

**Resultado Esperado**:
- ✅ Regra antiga convertida para array
- ✅ Parâmetro original mantido
- ✅ Novos parâmetros adicionados
- ✅ Salva no novo formato

---

### Teste 5: Validações de Campo

**Objetivo**: Validar que validações funcionam

**Passos**:
1. Tentar criar regra sem nome → erro
2. Tentar criar regra sem equipamento → erro
3. Tentar criar regra sem parâmetros → erro
4. Tentar adicionar parâmetro sem sensor → erro
5. Tentar adicionar parâmetro sem mensagem → erro
6. Tentar criar regra sem ações → erro

**Resultado Esperado**:
- ✅ Toast de erro com mensagem clara em cada caso
- ✅ Regra não é salva

---

### Teste 6: Mensagens Personalizadas

**Objetivo**: Validar que mensagens customizadas são salvas

**Passos**:
1. Criar regra com 2 parâmetros
2. Parâmetro 1: "🔥 Temperatura crítica: {value}°C"
3. Parâmetro 2: "💧 Fluxo baixo: {value} L/min"
4. Salvar
5. Reabrir para editar
6. Verificar que mensagens persistiram

**Resultado Esperado**:
- ✅ Mensagens com emojis aparecem corretamente
- ✅ Variáveis `{value}`, `{threshold}`, etc. estão presentes

---

### Teste 7: Selecionar Severidades

**Objetivo**: Validar que severidades diferentes funcionam

**Passos**:
1. Criar regra com 4 parâmetros
2. Parâmetro 1: CRITICAL (vermelho)
3. Parâmetro 2: HIGH (laranja)
4. Parâmetro 3: MEDIUM (amarelo)
5. Parâmetro 4: LOW (azul)
6. Salvar e reabrir

**Resultado Esperado**:
- ✅ Botões de severidade mudam de cor ao clicar
- ✅ Severidades persistem corretamente
- ✅ Cada parâmetro pode ter severidade diferente

---

### Teste 8: Loading de Sensores

**Objetivo**: Validar que sensores carregam dinamicamente

**Passos**:
1. Criar regra
2. Não selecionar equipamento → mensagem informativa
3. Selecionar equipamento → loading spinner
4. Sensores aparecem no dropdown

**Resultado Esperado**:
- ✅ Mensagem azul "Selecione um equipamento..."
- ✅ Spinner de loading enquanto busca sensores
- ✅ Sensores aparecem formatados (tag - tipo)

---

## ⏳ TESTES BACKEND (Pendente - Aguardando Implementação)

### Teste 9: API - Criar Regra Multi-Parâmetro

**Endpoint**: `POST /api/alerts/rules/`

**Payload**:
```json
{
  "name": "Teste API Multi-Param",
  "description": "Teste de criação via API",
  "equipment": 1,
  "parameters": [
    {
      "parameter_key": "sensor_1",
      "operator": ">",
      "threshold": 25,
      "duration": 5,
      "severity": "Critical",
      "message_template": "Temp: {value}°C > {threshold}°C",
      "unit": "°C"
    },
    {
      "parameter_key": "sensor_2",
      "operator": "<",
      "threshold": 50,
      "duration": 10,
      "severity": "High",
      "message_template": "Flow: {value} L/min < {threshold} L/min",
      "unit": "L/min"
    }
  ],
  "actions": ["EMAIL", "IN_APP"],
  "enabled": true
}
```

**cURL**:
```bash
curl -X POST http://localhost:8000/api/alerts/rules/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d @teste_multi_param.json
```

**Resultado Esperado**:
```json
{
  "id": 123,
  "name": "Teste API Multi-Param",
  "parameters": [
    {
      "id": 1,
      "parameter_key": "sensor_1",
      "operator": ">",
      "threshold": 25.0,
      ...
    },
    {
      "id": 2,
      "parameter_key": "sensor_2",
      "operator": "<",
      "threshold": 50.0,
      ...
    }
  ],
  ...
}
```

**Validar no Banco**:
```sql
-- Verificar regra criada
SELECT * FROM rules WHERE id = 123;

-- Verificar parâmetros criados
SELECT * FROM rule_parameters WHERE rule_id = 123;
```

---

### Teste 10: API - Editar Regra

**Endpoint**: `PUT /api/alerts/rules/123/`

**Payload**: Modificar parâmetros (remover 1, adicionar 1)
```json
{
  "name": "Teste API Multi-Param (editado)",
  "parameters": [
    {
      "parameter_key": "sensor_1",
      "operator": ">=",
      "threshold": 30,
      ...
    },
    {
      "parameter_key": "sensor_3",
      "operator": "==",
      "threshold": 100,
      ...
    }
  ]
}
```

**Resultado Esperado**:
- ✅ Parâmetros antigos deletados
- ✅ Novos parâmetros criados
- ✅ Response inclui 2 novos parâmetros

**Validar no Banco**:
```sql
-- Verificar que parâmetros antigos foram deletados
SELECT * FROM rule_parameters WHERE rule_id = 123;
-- Deve retornar apenas 2 registros (novos)
```

---

### Teste 11: API - Listar Regra

**Endpoint**: `GET /api/alerts/rules/123/`

**Resultado Esperado**:
```json
{
  "id": 123,
  "name": "...",
  "parameters": [
    {...},
    {...}
  ]
}
```

**Validar**:
- ✅ Array `parameters` presente
- ✅ Cada parâmetro tem todos os campos
- ✅ IDs dos parâmetros correspondem ao banco

---

### Teste 12: Celery - Avaliação de Regra

**Pré-requisito**:
1. Regra multi-parâmetro criada e habilitada
2. Leituras de telemetria que excedem thresholds

**Setup**:
```python
# Django shell
from apps.telemetry.models import TelemetryReading
from apps.assets.models import Sensor
from django.utils import timezone

# Criar leitura que excede threshold do parâmetro 1
sensor = Sensor.objects.get(id=1)
TelemetryReading.objects.create(
    sensor=sensor,
    value=30.0,  # > threshold de 25
    timestamp=timezone.now()
)
```

**Executar Task**:
```python
from apps.alerts.tasks import evaluate_rules_task
evaluate_rules_task()
```

**Resultado Esperado**:
```python
from apps.alerts.models import Alert

# Verificar que alerta foi criado
alerts = Alert.objects.filter(rule_id=123)
print(f"Alertas criados: {alerts.count()}")

# Verificar mensagem personalizada
alert = alerts.first()
print(f"Mensagem: {alert.message}")
# Deve conter valores substituídos: "Temp: 30.0°C > 25°C"
```

**Validar**:
- ✅ Alerta criado para o parâmetro que excedeu
- ✅ Mensagem contém valores corretos (não variáveis)
- ✅ Severidade correta
- ✅ `parameter_key` correto

---

### Teste 13: Celery - Cooldown por Parâmetro

**Objetivo**: Validar que cooldown funciona independentemente por parâmetro

**Setup**:
1. Regra com 2 parâmetros:
   - Parâmetro 1: duration = 5 min
   - Parâmetro 2: duration = 10 min
2. Criar leituras que excedem ambos os thresholds

**Passos**:
```python
# T=0: Executar task
evaluate_rules_task()
# Resultado: 2 alertas criados

# T=0: Executar novamente (imediatamente)
evaluate_rules_task()
# Resultado: 0 alertas criados (ambos em cooldown)

# T=6 min: Executar novamente
from freezegun import freeze_time
with freeze_time("now + 6 minutes"):
    evaluate_rules_task()
# Resultado: 1 alerta criado (apenas parâmetro 1, cooldown expirado)

# T=11 min: Executar novamente
with freeze_time("now + 11 minutes"):
    evaluate_rules_task()
# Resultado: 2 alertas criados (ambos cooldowns expiraram)
```

**Validar**:
- ✅ Cooldown funciona por parâmetro (não global)
- ✅ Parâmetros com durations diferentes funcionam independentemente

---

### Teste 14: Mensagens com Variáveis

**Objetivo**: Validar substituição de variáveis no template

**Setup**:
```python
from apps.alerts.models import RuleParameter

param = RuleParameter.objects.get(id=1)
param.message_template = "🔥 {sensor} está {operator} {threshold}{unit} (atual: {value}{unit})"
param.save()
```

**Criar Alerta**:
```python
sensor_tag = "TEMP-001"
current_value = 27.5

message = param.generate_message(sensor_tag, current_value)
print(message)
```

**Resultado Esperado**:
```
"🔥 TEMP-001 está > 25°C (atual: 27.5°C)"
```

**Validar**:
- ✅ `{sensor}` substituído por "TEMP-001"
- ✅ `{value}` substituído por "27.5"
- ✅ `{threshold}` substituído por "25"
- ✅ `{operator}` substituído por ">"
- ✅ `{unit}` substituído por "°C"
- ✅ Emojis preservados

---

### Teste 15: Retrocompatibilidade

**Objetivo**: Validar que regras antigas continuam funcionando

**Setup**: Ter regra criada no sistema antigo (campos únicos, sem `parameters[]`)

**Passos**:
```python
# Verificar que regra antiga não tem parâmetros
old_rule = Rule.objects.get(id=100)
print(f"Tem parâmetros? {old_rule.is_multi_parameter()}")  # False
print(f"Parameter key: {old_rule.parameter_key}")  # "sensor_1"

# Executar task
evaluate_rules_task()

# Verificar que alerta é criado normalmente
alerts = Alert.objects.filter(rule=old_rule)
print(f"Alertas: {alerts.count()}")
```

**Resultado Esperado**:
- ✅ Regra antiga detectada (`is_multi_parameter() == False`)
- ✅ Task usa lógica antiga (`evaluate_single_parameter_rule()`)
- ✅ Alerta criado normalmente

---

### Teste 16: Editar Regra Antiga para Novo Formato

**Objetivo**: Validar conversão de regra antiga para multi-parâmetro

**Passos**:
```python
# Regra antiga
old_rule = Rule.objects.get(id=100)
print(f"Format: old (single-parameter)")
print(f"Parameter: {old_rule.parameter_key}")

# Editar via API (frontend já converte)
# PUT /api/alerts/rules/100/
{
  "parameters": [
    {
      "parameter_key": "sensor_1",  # mesmo sensor anterior
      "operator": ">",
      "threshold": 25,
      ...
    },
    {
      "parameter_key": "sensor_2",  # NOVO sensor
      "operator": "<",
      "threshold": 50,
      ...
    }
  ]
}

# Verificar conversão
updated_rule = Rule.objects.get(id=100)
print(f"Format: new (multi-parameter)")
print(f"Parameters: {updated_rule.parameters.count()}")  # 2
```

**Resultado Esperado**:
- ✅ Regra convertida para novo formato
- ✅ Parâmetro original mantido
- ✅ Novo parâmetro adicionado
- ✅ Futuras avaliações usam lógica nova

---

## 📊 Checklist de Validação

### Frontend ✅
- [x] Criar regra com 1 parâmetro
- [x] Criar regra com 3+ parâmetros
- [x] Remover parâmetro
- [x] Editar regra antiga
- [x] Validações de campos
- [x] Mensagens personalizadas
- [x] Severidades diferentes
- [x] Loading de sensores

### Backend ⏳
- [ ] API: Criar regra multi-parâmetro
- [ ] API: Editar regra
- [ ] API: Listar regra
- [ ] Celery: Avaliar regra
- [ ] Celery: Cooldown por parâmetro
- [ ] Celery: Gerar mensagens
- [ ] Retrocompatibilidade
- [ ] Conversão de regra antiga

---

## 🐛 Problemas Conhecidos

### Frontend
Nenhum problema conhecido no momento.

### Backend (Hipotéticos)
1. **Performance**: Muitos parâmetros podem gerar muitas queries
   - **Solução**: Usar `select_related` e `prefetch_related`

2. **Mensagens com variáveis inexistentes**: Template pode ter `{variavel_errada}`
   - **Solução**: Try/catch no `generate_message()` com fallback

3. **Cooldown global vs por parâmetro**: Confusão no conceito
   - **Solução**: Documentação clara + testes

---

## 📝 Relatório de Testes

### Template de Relatório

```markdown
# Relatório de Testes - Multi-Parâmetro

**Data**: YYYY-MM-DD
**Testador**: Nome
**Ambiente**: Dev/Staging/Prod

## Frontend

### Teste 1: Criar regra com 1 parâmetro
- Status: ✅ PASSOU / ❌ FALHOU
- Observações: ...

### Teste 2: Criar regra com 3 parâmetros
- Status: ✅ PASSOU / ❌ FALHOU
- Observações: ...

... (continuar para todos os testes)

## Backend

### Teste 9: API - Criar regra
- Status: ✅ PASSOU / ❌ FALHOU
- Request: ...
- Response: ...
- Observações: ...

... (continuar para todos os testes)

## Resumo

- Total de testes: X
- Passou: Y
- Falhou: Z
- Taxa de sucesso: Y/X = %

## Bugs Encontrados

1. **Bug #1**: Descrição
   - Severidade: Alta/Média/Baixa
   - Steps to reproduce: ...
   - Expected: ...
   - Actual: ...

## Conclusão

Sistema está pronto para produção? SIM / NÃO
Motivo: ...
```

---

## 🚀 Comandos Úteis

### Frontend
```bash
# Rodar dev server
npm run dev

# Abrir em navegador
# http://localhost:5173

# DevTools
# F12 → Console → Network
```

### Backend
```bash
# Django shell
python manage.py shell

# Executar task manualmente
from apps.alerts.tasks import evaluate_rules_task
evaluate_rules_task()

# Verificar banco
python manage.py dbshell
SELECT * FROM rule_parameters;

# Logs
tail -f logs/celery.log
```

---

**Autor**: GitHub Copilot  
**Data**: ${new Date().toISOString().split('T')[0]}  
**Versão**: 1.0
