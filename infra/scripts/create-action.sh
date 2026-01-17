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

echo ">>> Criando action: $ACTION_NAME para connector http:$CONN_NAME"
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
      \"body\": \"\${payload}\",
      \"max_retries\": 3
    },
    \"resource_opts\": {
      \"request_ttl\": \"45s\"
    }
  }" | jq '.'
