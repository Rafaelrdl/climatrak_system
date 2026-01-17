# Configuração EMQX e Sensores (ClimaTrak)

Este guia explica como configurar o EMQX e publicar telemetria para que o backend
registre automaticamente dispositivos e sensores.

## Visão Geral
Fluxo: Dispositivo -> EMQX -> Rule Engine -> HTTP POST /ingest -> Backend

O backend espera:
- Tópico MQTT com hierarquia tenant/site/asset
- Ação HTTP enviando um JSON para `/ingest`
- Headers de autenticação (HMAC por dispositivo ou token de dev)

## Pré-requisitos
- EMQX rodando (Dashboard: http://localhost:18083)
- Backend rodando (container API ou local)
- Tenant slug (exemplo: `umc`)
- Site, Ativo e Dispositivo criados no backend

## 1) Preparar dados no backend

**Importante**: Quando um tenant é criado, automaticamente um site padrão é criado junto. Você não precisa criar um site manualmente - apenas verifique o nome do site padrão do tenant e use-o no tópico MQTT.

1. Verifique o **site padrão** criado automaticamente com o tenant (geralmente tem o mesmo nome ou um nome derivado)
2. Criar um Ativo (Asset) com uma tag (exemplo: `CHILLER-001`)
3. Criar um Dispositivo (Device):
   - `mqtt_client_id`: deve corresponder ao clientid MQTT no EMQX
   - `ingest_secret`: gerado automaticamente ao salvar (use para autenticação HMAC)

Os sensores são criados automaticamente quando a telemetria chega, com base no payload.

## 2) Formato do tópico MQTT (obrigatório)

O backend requer o site no tópico:

```
tenants/{tenant_slug}/sites/{site_name}/assets/{asset_tag}/telemetry
```

Exemplo:
```
tenants/umc/sites/Uberlandia/assets/CHILLER-001/telemetry
```

**Importante**: Se o tópico não incluir `sites/{site_name}`, o backend rejeitará
o auto-vínculo do ativo e sensores.

## 3) Configurar EMQX via script (recomendado)

Use o script de provisionamento (idempotente):

```bash
TENANT_SLUG=umc \
INGEST_BASE_URL=http://api:8000 \
INGEST_PATH=/ingest \
./infra/scripts/provision-emqx.sh
```

Isso cria:
- Conector HTTP para o backend
- Ação HTTP para `/ingest`
- Regra para `tenants/{tenant_slug}/#`

## 4) Configuração manual do EMQX (passo a passo)

Se preferir configuração manual no Dashboard do EMQX (http://localhost:18083):

### 4.1) Criar Connector (HTTP)

1. Acesse **Integration** → **Connectors** no menu lateral
2. Clique em **+ Create**
3. Selecione **HTTP Server**
4. Configure:
   - **Name**: `climatrak-backend` (ou nome de sua escolha)
   - **Base URL**: 
     - Docker Compose: `http://api:8000`
     - Local: `http://localhost:8000`
   - **Pool Size**: `8` (padrão)
   - **Request Timeout**: `30s` (padrão)
5. Clique em **Create**

### 4.2) Criar Action (HTTP)

1. Acesse **Integration** → **Actions** (ou **Data Integration** → **Rules**)
2. Clique em **+ Create**
3. Selecione **HTTP Server** como tipo
4. Configure:
   - **Name**: `forward-to-ingest` (ou nome de sua escolha)
   - **Connector**: Selecione o connector criado (`climatrak-backend`)
   - **Method**: `POST`
   - **Path**: `/ingest`
   - **Headers**:
     ```
     content-type: application/json
     x-tenant: ${tenant_slug}
     ```
     
     **Para desenvolvimento** (adicione também):
     ```
     x-device-token: <seu-INGESTION_SECRET>
     ```
     
     **Para produção** (adicione também):
     ```
     x-ingest-timestamp: ${timestamp}
     x-ingest-signature: ${signature}
     ```
   
   - **Body**:
     ```json
     {
       "client_id": "${client_id}",
       "topic": "${topic}",
       "ts": ${ts},
       "payload": ${payload}
     }
     ```
   - **Body Type**: `Plain Text`

5. Clique em **Create**

### 4.3) Criar Rule (Regra)

1. Acesse **Integration** → **Rules**
2. Clique em **+ Create**
3. Configure a SQL da regra:

```sql
SELECT
  clientid as client_id,
  topic,
  payload,
  timestamp as ts
FROM "tenants/umc/#"
```

**Importante**: Substitua `umc` pelo slug do seu tenant.

4. Em **Actions**, selecione a action criada (`forward-to-ingest`)
5. Clique em **Create**

### 4.4) Formato do tópico na Rule

A regra acima captura todos os tópicos que começam com `tenants/umc/`.

Para filtrar apenas telemetria de um site específico:
```sql
FROM "tenants/umc/sites/Uberlandia/#"
```

Para um ativo específico:
```sql
FROM "tenants/umc/sites/Uberlandia/assets/CHILLER-001/telemetry"
```

## 5) Autenticação para /ingest

O backend requer autenticação no endpoint `/ingest`.

### Produção (HMAC por dispositivo)

Para cada mensagem, envie nos headers:
- `x-ingest-timestamp`: timestamp unix (segundos)
- `x-ingest-signature`: HMAC-SHA256 usando o `ingest_secret` do dispositivo

Formato da assinatura:
```
HMAC-SHA256(secret, "{timestamp}.{raw_body}")
```

### Desenvolvimento (token global)

Para um fluxo de desenvolvimento mais simples:

1. Configure no `backend/.env`:
   ```env
   INGEST_ALLOW_GLOBAL_SECRET=True
   INGESTION_SECRET=<seu-secret-aqui>
   ```

2. Adicione este header na Action do EMQX:
   ```
   x-device-token: <INGESTION_SECRET>
   ```

3. Reinicie o container da API após alterar os valores do .env:
   ```bash
   docker restart climatrak-api
   ```

## 6) Formatos de payload

### Parser padrão (recomendado)

Envie um payload JSON assim:

```json
{
  "device_id": "GW-001",
  "timestamp": "2025-10-20T14:30:00Z",
  "sensors": [
    {"sensor_id": "temp-amb-01", "value": 23.5, "unit": "celsius", "type": "temperature"},
    {"sensor_id": "humid-01", "value": 60.1, "unit": "%RH", "type": "humidity"}
  ]
}
```

**Observações**:
- `device_id` pode ser omitido (backend usa o client_id do MQTT)
- `timestamp` pode ser omitido (backend usa o timestamp atual)
- `sensors[].labels` é opcional
- `unit` e `type` podem ser campos de nível superior ou dentro de `labels`

### SenML (Khomp)

O parser também aceita arrays SenML (RFC 8428):

```json
[
  {"bn": "4b686f6d70107115", "bt": 1552594568},
  {"n": "A", "u": "Cel", "v": 23.35},
  {"n": "A", "u": "%RH", "v": 64.0}
]
```

## 7) Validar a ingestão

### Logs do Backend

Os logs devem mostrar:
- Parser selecionado (standard ou senml)
- Sensores criados
- Telemetria salva

```bash
docker logs climatrak-api -f
```

### Interface/API

- UI: Admin → Dispositivos / Sensores
- API: `GET /api/sites/{id}/devices/summary/`
- Verifique se o dispositivo aparece com os sensores criados

### Testar publicação MQTT

Use o mosquitto_pub ou MQTTX para testar:

```bash
mosquitto_pub \
  -h localhost \
  -p 1883 \
  -t "tenants/umc/sites/Uberlandia/assets/CHILLER-001/telemetry" \
  -i "GW-001" \
  -m '{
    "device_id": "GW-001",
    "timestamp": "2026-01-17T14:30:00Z",
    "sensors": [
      {"sensor_id": "temp-01", "value": 22.5, "unit": "celsius", "type": "temperature"},
      {"sensor_id": "humid-01", "value": 55.0, "unit": "%RH", "type": "humidity"}
    ]
  }'
```

## 8) Troubleshooting (Solução de problemas)

### 401 Unauthorized
- Verifique os headers de autenticação (`x-ingest-*` ou `x-device-token`)
- Confirme que `INGESTION_SECRET` está correto no .env
- Reinicie o container da API após alterar .env

### 400 Invalid topic
- O tópico **deve** incluir: `tenants/{slug}/sites/{site}/assets/{asset}/telemetry`
- Verifique se o formato está correto
- O nome do site deve corresponder a um site existente no backend

### Device not authorized
- O `mqtt_client_id` do dispositivo deve corresponder ao `clientid` do MQTT
- O dispositivo deve ter `ingest_secret` gerado (verifique no admin)
- Verifique se o dispositivo está associado ao site correto

### Sensores não são criados
- O payload **deve** incluir array `sensors[]` com `sensor_id` e `value`
- Verifique o formato JSON (use um validador)
- Confira os logs do backend para erros de parsing

### Rule não está disparando
- Verifique se o tópico MQTT corresponde ao padrão da regra
- No Dashboard do EMQX, vá em **Integration** → **Rules** e veja os hits/execuções
- Use a aba **WebSocket Client** no EMQX para testar publicações

### Connector/Action com erro
- Verifique a URL base do connector (http://api:8000 no Docker)
- Teste se o backend está acessível: `docker exec -it climatrak-emqx curl http://api:8000/health`
- Verifique os logs da Action no Dashboard do EMQX
