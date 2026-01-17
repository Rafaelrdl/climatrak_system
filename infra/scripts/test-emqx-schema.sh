#!/bin/bash
# Helper para descobrir o schema correto do EMQX v5

TOKEN=$(curl -sS -X POST 'http://emqx:18083/api/v5/login' \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"Climatrak@2025"}' \
  | jq -r '.token')

echo "=== Token obtido ==="
echo "$TOKEN" | cut -c1-20
echo

echo "=== Exemplo de POST Connector (HTTP) - Payload mínimo ==="
cat <<'EOF'
{
  "type": "http",
  "name": "test_http",
  "url": "http://api:8000"
}
EOF
echo

echo "=== Tentando criar connector de teste ==="
curl -sS -X POST "http://emqx:18083/api/v5/connectors" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "http",
    "name": "test_climatrak",
    "url": "http://api:8000"
  }' | jq '.'
