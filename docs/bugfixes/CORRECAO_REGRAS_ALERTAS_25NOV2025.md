# Correções de Alertas e Regras - Resumo

## Data: 25/11/2025

## Problemas Identificados e Corrigidos

### 1. Toggle de Regras (Habilitar/Desabilitar)

**Problema**: Toggle de regras retornava erro 400 (Bad Request) porque usava `PUT` com dados incompletos.

**Solução**: 
- Alterado para usar endpoint dedicado `POST /alerts/rules/{id}/toggle_status/`
- Hook `useToggleRuleMutation` agora usa `rulesApi.toggleStatus(ruleId)`

**Arquivo Modificado**: `src/hooks/queries/useRulesQuery.ts`

```typescript
// Antes (erro)
mutationFn: ({ id, enabled }: { id: number; enabled: boolean }) =>
  rulesApi.update(id, { enabled })

// Depois (correto)
mutationFn: (ruleId: number) => rulesApi.toggleStatus(ruleId)
```

---

### 2. Atualização de Regras (PATCH vs PUT)

**Problema**: `PUT` exige todos os campos, causando erros quando apenas parte dos dados é enviada.

**Solução**: 
- Mudado de `rulesApi.update()` para `rulesApi.patch()` para atualizações parciais
- PATCH aceita apenas os campos que estão sendo alterados

**Arquivo Modificado**: `src/hooks/queries/useRulesQuery.ts`

```typescript
// Antes
mutationFn: ({ id, data }) => rulesApi.update(id, data)

// Depois
mutationFn: ({ id, data }) => rulesApi.patch(id, data)
```

---

### 3. Persistência de Device/Variable ao Editar Regras

**Problema**: Ao editar uma regra, os campos de dispositivo e variável apareciam vazios porque:
1. O backend salva apenas `parameter_key: "sensor_123"` (sem `device_id`)
2. O frontend não conseguia determinar a qual device o sensor pertence

**Solução**: 
Criada/melhorada função `loadSensorsAndRecoverDevices()` que:
1. Carrega todos os devices do equipamento
2. Carrega todos os sensores de cada device em paralelo
3. Mapeia cada `parameter_key` para seu `device_id` correspondente
4. Popular `availableDevices` e `availableSensorsByDevice` para os selects funcionarem

**Arquivo Modificado**: `src/components/alerts/AddRuleModalMultiParam.tsx`

```typescript
const loadSensorsAndRecoverDevices = async (eqId: number, params: any[]) => {
  // Carregar devices
  const devices = await assetsService.getDevices(eqId);
  setAvailableDevices(devicesWithDisplay);
  
  // Carregar sensores de todos os devices
  const sensorsByDevice = {};
  await Promise.all(devices.map(async (device) => {
    const response = await api.get(`/devices/${device.id}/sensors/`);
    sensorsByDevice[device.id] = response.data.map(...);
  }));
  setAvailableSensorsByDevice(sensorsByDevice);
  
  // Recuperar device_id de cada parâmetro
  const updatedParams = params.map(param => {
    for (const [deviceId, sensors] of Object.entries(sensorsByDevice)) {
      const sensor = sensors.find(s => s.key === param.parameter_key);
      if (sensor) {
        return { ...param, device_id: parseInt(deviceId) };
      }
    }
    return param;
  });
  
  setParameters(updatedParams);
};
```

---

## Próximos Passos

### Testar

1. **Teste de Toggle**: 
   - Vá para Alertas > Regras
   - Clique no toggle de uma regra
   - Verifique se o status muda corretamente

2. **Teste de Edição**:
   - Clique em "Editar" em uma regra existente
   - Verifique se os campos Dispositivo e Variável estão preenchidos
   - Faça uma alteração e salve
   - Verifique se os dados persistiram

3. **Teste de Criação**:
   - Crie uma nova regra
   - Verifique se é salva corretamente
   - Edite a regra criada para verificar persistência

### Investigar (Requer Acesso ao Backend)

1. **Alertas não sendo gerados**:
   - Verificar se Celery está rodando (`celery -A config worker -l info`)
   - Verificar se Celery Beat está rodando (`celery -A config beat -l info`)
   - Checar logs para erros na task `evaluate_rules`
   - Executar diagnóstico: `python diagnose_alerts_full.py`

---

## Arquivos Modificados

| Arquivo | Descrição |
|---------|-----------|
| `src/hooks/queries/useRulesQuery.ts` | Toggle mutation, Update mutation (PATCH) |
| `src/components/alerts/AddRuleModalMultiParam.tsx` | loadSensorsAndRecoverDevices function |
| `src/components/alerts/RuleBuilder.tsx` | handleToggleRule (passa só ruleId) |

---

## Console Logs Úteis (Debug)

Quando editar uma regra, procure no console por:
- `📡 Parâmetros recuperados com device_id:` - Mostra os parâmetros após recuperar o device_id
