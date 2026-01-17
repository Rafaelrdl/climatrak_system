#!/bin/bash
# Testar criação de Action

TOKEN=$(curl -sS -X POST 'http://emqx:18083/api/v5/login' \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"Climatrak@2025"}' \
  | jq -r '.token')

echo "=== Criando Action de teste ==="
curl -sS -X POST "http://emqx:18083/api/v5/actions" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "http",
    "name": "test_action",
    "connector": "http:test_climatrak",
    "parameters": {
      "path": "/ingest",
      "method": "post",
      "headers": {
        "content-type": "application/json",
        "x-tenant": "COMG"
      },
      "body": "{\n  \"client_id\": \"${client_id}\",\n  \"topic\": \"${topic}\",\n  \"ts\": ${ts},\n  \"payload\": ${payload}\n}"
    }
  }' | jq '.'
