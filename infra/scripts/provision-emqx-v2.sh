#!/usr/bin/env bash
# infra/scripts/provision-emqx-v2.sh
# Provisiona Connector (HTTP Server) + Action (HTTP Server) + Rule no EMQX (API v5)
# Idempotente: apaga recursos anteriores e recria.

set -euo pipefail

# =========================
# Variáveis ajustáveis (defaults conforme seu cenário)
# =========================
TENANT="${1:-COMG}"
API_BASE_URL="${2:-http://api:8000}"

# EMQX Management API
EMQX_HOST="${EMQX_HOST:-http://emqx:18083}"
EMQX_API_BASE="${EMQX_API_BASE:-${EMQX_HOST}/api/v5}"

# Auth
EMQX_USERNAME="${EMQX_USERNAME:-admin}"
EMQX_PASSWORD="${EMQX_PASSWORD:-Climatrak@2025}"

# Connector (Integration -> Connectors -> Create -> HTTP Server)
CONNECTOR_TYPE="${CONNECTOR_TYPE:-http}"
CONNECTOR_NAME="${CONNECTOR_NAME:-http_ingest_${TENANT}}"
CONNECTOR_URL="${CONNECTOR_URL:-${API_BASE_URL}}"

# Action (Integration -> Actions -> Create -> HTTP Server)
ACTION_TYPE="${ACTION_TYPE:-http}"
ACTION_NAME="${ACTION_NAME:-action_ingest_${TENANT}}"
ACTION_METHOD="${ACTION_METHOD:-post}"
ACTION_PATH="${ACTION_PATH:-/ingest}"

HEADER_CONTENT_TYPE_KEY="${HEADER_CONTENT_TYPE_KEY:-content-type}"
HEADER_CONTENT_TYPE_VAL="${HEADER_CONTENT_TYPE_VAL:-application/json}"

TENANT_HEADER_KEY="${TENANT_HEADER_KEY:-x-tenant}"
TENANT_HEADER_VAL="${TENANT_HEADER_VAL:-${TENANT}}"

# IMPORTANTE: manter literal ${payload} (não expandir no bash)
ACTION_BODY_TEMPLATE='${payload}'

# Rule
RULE_ID="${RULE_ID:-r_${TENANT}_ingest}"
TOPIC_FILTER="${TOPIC_FILTER:-tenants/${TENANT}/#}"

# SQL multi-linha (com aspas) -> usar jq --arg para escapar corretamente
read -r -d '' RULE_SQL <<EOF || true
SELECT
  clientid as client_id,
  topic,
  payload,
  timestamp as ts
FROM "${TOPIC_FILTER}"
EOF

# =========================
# Helpers
# =========================
need_cmd() { command -v "$1" >/dev/null 2>&1 || { echo "❌ Falta comando: $1"; exit 1; }; }
need_cmd curl
need_cmd jq

is_error() {
  # EMQX costuma retornar {code, message} em erro
  echo "$1" | jq -e 'has("code") and has("message")' >/dev/null 2>&1
}

api_post() {
  local path="$1"
  local json="$2"
  curl -sS -X POST "${EMQX_API_BASE}${path}" \
    -H "$AUTH" \
    -H "Content-Type: application/json" \
    -H "Accept: application/json" \
    -d "$json"
}

safe_delete() {
  local url="$1"
  curl -sS -X DELETE "$url" -H "$AUTH" >/dev/null 2>&1 || true
}

# =========================
# Auth
# =========================
LOGIN_PAYLOAD="$(jq -nc --arg u "$EMQX_USERNAME" --arg p "$EMQX_PASSWORD" '{username:$u,password:$p}')"

TOKEN="$(
  curl -sS -X POST "${EMQX_API_BASE}/login" \
    -H "Content-Type: application/json" \
    -H "Accept: application/json" \
    -d "$LOGIN_PAYLOAD" \
  | jq -r '.token // empty'
)"

if [[ -z "${TOKEN}" ]]; then
  echo "❌ Falha ao autenticar no EMQX (token vazio). Verifique EMQX_HOST/EMQX_USERNAME/EMQX_PASSWORD."
  exit 1
fi

AUTH="Authorization: Bearer ${TOKEN}"

CONNECTOR_ID="${CONNECTOR_TYPE}:${CONNECTOR_NAME}"
ACTION_ID="${ACTION_TYPE}:${ACTION_NAME}"

# =========================
# Cleanup (idempotência)
# =========================
echo ">>> Limpando recursos antigos (se existirem)..."
safe_delete "${EMQX_API_BASE}/rules/${RULE_ID}"
safe_delete "${EMQX_API_BASE}/actions/${ACTION_ID}"
safe_delete "${EMQX_API_BASE}/connectors/${CONNECTOR_ID}"
sleep 1

# =========================
# 1) Connector
# =========================
echo ">>> Criando connector (HTTP Server): ${CONNECTOR_NAME} (Base URL: ${CONNECTOR_URL})"

# Tentativa A: {type,name,enable,url}
CONN_PAYLOAD_A="$(jq -nc \
  --arg type "$CONNECTOR_TYPE" \
  --arg name "$CONNECTOR_NAME" \
  --arg url  "$CONNECTOR_URL" \
  '{type:$type,name:$name,enable:true,url:$url}'
)"
CONN_RESP="$(api_post "/connectors" "$CONN_PAYLOAD_A" || true)"

# Tentativa B: {type,name,enabled,url} (variação de campo em algumas builds)
if is_error "$CONN_RESP"; then
  CONN_PAYLOAD_B="$(jq -nc \
    --arg type "$CONNECTOR_TYPE" \
    --arg name "$CONNECTOR_NAME" \
    --arg url  "$CONNECTOR_URL" \
    '{type:$type,name:$name,enabled:true,url:$url}'
  )"
  CONN_RESP="$(api_post "/connectors" "$CONN_PAYLOAD_B" || true)"
fi

# Tentativa C: {type,name,enable,server} (variação de campo)
if is_error "$CONN_RESP"; then
  CONN_PAYLOAD_C="$(jq -nc \
    --arg type "$CONNECTOR_TYPE" \
    --arg name "$CONNECTOR_NAME" \
    --arg server "$CONNECTOR_URL" \
    '{type:$type,name:$name,enable:true,server:$server}'
  )"
  CONN_RESP="$(api_post "/connectors" "$CONN_PAYLOAD_C")"
fi

echo "$CONN_RESP" | jq -r '.name // .id // .message // .'

# =========================
# 2) Action
# =========================
echo ">>> Criando action (HTTP Server): ${ACTION_NAME} -> ${ACTION_METHOD^^} ${ACTION_PATH}"

ACTION_PAYLOAD="$(jq -nc \
  --arg type "$ACTION_TYPE" \
  --arg name "$ACTION_NAME" \
  --arg connector "$CONNECTOR_NAME" \
  --arg method "$ACTION_METHOD" \
  --arg path "$ACTION_PATH" \
  --arg body "$ACTION_BODY_TEMPLATE" \
  --arg ctk "$HEADER_CONTENT_TYPE_KEY" --arg ctv "$HEADER_CONTENT_TYPE_VAL" \
  --arg tkey "$TENANT_HEADER_KEY"       --arg tval "$TENANT_HEADER_VAL" \
  '{
    type: $type,
    name: $name,
    enable: true,
    connector: $connector,
    parameters: {
      method: $method,
      path: $path,
      headers: ({($ctk): $ctv} + {($tkey): $tval}),
      body: $body
    }
  }'
)"

ACTION_RESP="$(api_post "/actions" "$ACTION_PAYLOAD")"
echo "$ACTION_RESP" | jq -r '.name // .id // .message // .'

# =========================
# 3) Rule
# =========================
echo ">>> Criando rule: ${RULE_ID}"

RULE_PAYLOAD_A="$(jq -nc \
  --arg id "$RULE_ID" \
  --arg name "$RULE_ID" \
  --arg sql "$RULE_SQL" \
  --arg action_id "$ACTION_ID" \
  '{
    id: $id,
    name: $name,
    enable: true,
    sql: $sql,
    actions: [$action_id]
  }'
)"

RULE_RESP="$(api_post "/rules" "$RULE_PAYLOAD_A" || true)"

# Se a API recusar "id", tenta sem "id"
if is_error "$RULE_RESP"; then
  RULE_PAYLOAD_B="$(jq -nc \
    --arg name "$RULE_ID" \
    --arg sql "$RULE_SQL" \
    --arg action_id "$ACTION_ID" \
    '{
      name: $name,
      enable: true,
      sql: $sql,
      actions: [$action_id]
    }'
  )"
  RULE_RESP="$(api_post "/rules" "$RULE_PAYLOAD_B")"
fi

echo "$RULE_RESP" | jq -r '.id // .name // .message // .'

echo
echo "✅ Provisionamento concluído!"
echo "   Connector: ${CONNECTOR_ID}"
echo "   Action:    ${ACTION_ID}"
echo "   Rule:      ${RULE_ID}"
echo
echo "SQL aplicado:"
echo "$RULE_SQL"
