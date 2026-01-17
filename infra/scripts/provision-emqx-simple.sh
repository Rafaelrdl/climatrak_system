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
echo ">>> Criando action: $ACTION_NAME"
curl -sS -X POST "http://emqx:18083/api/v5/actions" \
  -H "$AUTH" \
  -H "Content-Type: application/json" \
  -d "{
    \"type\": \"http\",
    \"name\": \"$ACTION_NAME\",
    \"connector\": \"http:$CONN_NAME\",
    \"parameters\": {
      \"path\": \"/ingest\",
      \"method\": \"post\",
      \"headers\": {
        \"content-type\": \"application/json\",
        \"x-tenant\": \"$TENANT\"
      },
      \"body\": \"\${payload}\"
    }
  }" | jq -r '.name // .message'

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
