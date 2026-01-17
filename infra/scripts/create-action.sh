#!/bin/bash
set -e

TENANT="${1:-COMG}"

TOKEN=$(curl -sS -X POST 'http://emqx:18083/api/v5/login' \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"Climatrak@2025"}' \
  | jq -r '.token')

AUTH="Authorization: Bearer $TOKEN"
CONN_NAME="http_ingest_${TENANT}"
ACTION_NAME="action_ingest_${TENANT}"

read -r -d '' ACTION_BODY_TEMPLATE <<'EOF' || true
{
  "client_id": "${client_id}",
  "topic": "${topic}",
  "ts": ${ts},
  "payload": ${payload}
}
EOF

ACTION_PAYLOAD="$(jq -nc \
  --arg name "$ACTION_NAME" \
  --arg connector "http:$CONN_NAME" \
  --arg tenant "$TENANT" \
  --arg body "$ACTION_BODY_TEMPLATE" \
  '{
    type: "http",
    name: $name,
    connector: $connector,
    parameters: {
      path: "/ingest",
      method: "post",
      headers: {
        "content-type": "application/json",
        "x-tenant": $tenant
      },
      body: $body,
      max_retries: 3
    },
    resource_opts: {
      request_ttl: "45s"
    }
  }'
)"

echo ">>> Criando action: $ACTION_NAME para connector http:$CONN_NAME"
curl -sS -X POST "http://emqx:18083/api/v5/actions" \
  -H "$AUTH" \
  -H "Content-Type: application/json" \
  -d "$ACTION_PAYLOAD" | jq '.'
