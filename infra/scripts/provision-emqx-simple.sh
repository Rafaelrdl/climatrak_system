#!/bin/bash
set -e

TENANT="${1:-COMG}"
API_URL="${2:-http://api:8000}"

# Login
echo ">>> Fazendo login..."
TOKEN=$(curl -sS -X POST 'http://emqx:18083/api/v5/login' \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"Climatrak@2025"}' \
  | jq -r '.token')

AUTH="Authorization: Bearer $TOKEN"

# Body template (nao expandir ${...} no bash)
read -r -d '' ACTION_BODY_TEMPLATE <<'EOF' || true
{
  "client_id": "${client_id}",
  "topic": "${topic}",
  "ts": ${ts},
  "payload": ${payload}
}
EOF

# Optional dev token for ingest auth
INGEST_DEVICE_TOKEN="${INGEST_DEVICE_TOKEN:-${INGESTION_SECRET:-}}"
DEVICE_TOKEN_HEADER_KEY="${DEVICE_TOKEN_HEADER_KEY:-x-device-token}"

# 1. Criar Connector
CONN_NAME="http_ingest_${TENANT}"
echo ">>> Criando connector: $CONN_NAME"
curl -sS -X POST "http://emqx:18083/api/v5/connectors" \
  -H "$AUTH" \
  -H "Content-Type: application/json" \
  -d "{
    \"type\": \"http\",
    \"name\": \"$CONN_NAME\",
    \"url\": \"$API_URL\"
  }" | jq -r '.name // .message'

# 2. Criar Action
ACTION_NAME="http_ingest_${TENANT}"
ACTION_PAYLOAD="$(jq -nc \
  --arg name "$ACTION_NAME" \
  --arg connector "http:$CONN_NAME" \
  --arg tenant "$TENANT" \
  --arg body "$ACTION_BODY_TEMPLATE" \
  --arg dtk "$DEVICE_TOKEN_HEADER_KEY" \
  --arg dtv "$INGEST_DEVICE_TOKEN" \
  '{
    type: "http",
    name: $name,
    connector: $connector,
    parameters: {
      path: "/ingest",
      method: "post",
      headers: (
        {"content-type": "application/json", "x-tenant": $tenant}
        + (if ($dtv | length) > 0 then {($dtk): $dtv} else {} end)
      ),
      body: $body
    }
  }'
)"

echo ">>> Criando action: $ACTION_NAME"
curl -sS -X POST "http://emqx:18083/api/v5/actions" \
  -H "$AUTH" \
  -H "Content-Type: application/json" \
  -d "$ACTION_PAYLOAD" | jq -r '.name // .message'

# 3. Criar Rule
RULE_ID="r_${TENANT}_ingest"
echo ">>> Criando rule: $RULE_ID"
curl -sS -X POST "http://emqx:18083/api/v5/rules" \
  -H "$AUTH" \
  -H "Content-Type: application/json" \
  -d "{
    \"id\": \"$RULE_ID\",
    \"sql\": \"SELECT clientid as client_id, topic, payload, timestamp as ts FROM \\\"tenants/$TENANT/#\\\"\",
    \"actions\": [\"http:$ACTION_NAME\"]
  }" | jq -r '.id // .message'

echo
echo "✅ Provisionamento concluído!"
echo "   Connector: http:$CONN_NAME"
echo "   Action: http:$ACTION_NAME"
echo "   Rule: $RULE_ID"
