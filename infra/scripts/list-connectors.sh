#!/bin/bash
TOKEN=$(curl -sS -X POST 'http://emqx:18083/api/v5/login' \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"Climatrak@2025"}' \
  | jq -r '.token')

echo "=== Listando todos os connectors ==="
curl -sS -H "Authorization: Bearer $TOKEN" \
  'http://emqx:18083/api/v5/connectors' | jq '.'
