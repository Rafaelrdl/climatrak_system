#!/usr/bin/env bash
set -euo pipefail

# ============================================
# Provisionador EMQX (dev) â€“ Fase 0
# - Cria API key (opcional via bootstrap jÃ¡ existente)
# - Cria Connector HTTP -> backend
# - Cria Action HTTP ligada ao connector
# - Cria Rule SQL (tenants/{slug}/# -> POST /ingest)
# - (Opcional) Seta Authorization (built_in_database) em dev
#
# ReexecutÃ¡vel/idempotente.
# Requer: curl, jq
# ============================================

# --------- Config (env override) ------------
TENANT_SLUG="${TENANT_SLUG:-umc}"
# URL do EMQX (host = 'localhost' se rodando no host; 'emqx' se rodando de dentro da rede docker)
EMQX_BASE_URL="${EMQX_BASE_URL:-http://localhost:18083}"

# PreferÃªncia 1: API Key (Basic Auth)
EMQX_API_KEY="${EMQX_API_KEY:-}"
EMQX_API_SECRET="${EMQX_API_SECRET:-}"

# Alternativa (fallback): login Dashboard -> Bearer token (dev)
EMQX_DASHBOARD_USER="${EMQX_DASHBOARD_USER:-admin}"
EMQX_DASHBOARD_PASS="${EMQX_DASHBOARD_PASS:-public}"

# Para o backend local em compose, a API Django normalmente estÃ¡ como 'api:8000'
# (Se quiser usar o NGINX do compose, aponte para http://nginx/ingest)
INGEST_BASE_URL_DEFAULT="http://api:8000"
INGEST_BASE_URL="${INGEST_BASE_URL:-$INGEST_BASE_URL_DEFAULT}"
INGEST_PATH="${INGEST_PATH:-/ingest}"

# Nomes (com prefixo por tenant)
CONNECTOR_NAME="http_ingest_${TENANT_SLUG}"
ACTION_NAME="http_ingest_${TENANT_SLUG}"
RULE_ID="r_${TENANT_SLUG}_ingest"

# --------- Helpers --------------------------
need() { command -v "$1" >/dev/null 2>&1 || { echo "Erro: '$1' nÃ£o encontrado"; exit 1; }; }
need curl; need jq

AUTH_HEADER=()
if [[ -n "$EMQX_API_KEY" && -n "$EMQX_API_SECRET" ]]; then
  AUTH_HEADER=(-u "${EMQX_API_KEY}:${EMQX_API_SECRET}")
else
  echo ">> Tentando obter Bearer token via /api/v5/login (uso DEV) ..."
  TOKEN="$(curl -sS -X POST "${EMQX_BASE_URL}/api/v5/login" \
      -H 'Accept: application/json' -H 'Content-Type: application/json' \
      -d "{\"username\":\"${EMQX_DASHBOARD_USER}\",\"password\":\"${EMQX_DASHBOARD_PASS}\"}" \
      | jq -r '.token // empty')"
  if [[ -z "$TOKEN" ]]; then
    echo "Falha no login do dashboard. Informe EMQX_API_KEY/EMQX_API_SECRET ou ajuste EMQX_DASHBOARD_USER/EMQX_DASHBOARD_PASS."
    exit 1
  fi
  AUTH_HEADER=(-H "Authorization: Bearer ${TOKEN}")
fi

json() { jq -c '.'; }

get_ok_or_404() {
  local url="$1"
  set +e
  local http; http=$(curl -sS "${AUTH_HEADER[@]}" -o /dev/null -w "%{http_code}" "$url")
  set -e
  echo "$http"
}

post_json() {
  local url="$1"; local body="$2"
  curl -sS "${AUTH_HEADER[@]}" -H 'Content-Type: application/json' -d "$body" "$url"
}

put_json() {
  local url="$1"; local body="$2"
  curl -sS -X PUT "${AUTH_HEADER[@]}" -H 'Content-Type: application/json' -d "$body" "$url"
}

# --------- Healthcheck ----------------------
echo ">> Checando EMQX em ${EMQX_BASE_URL} ..."
curl -sS "${AUTH_HEADER[@]}" "${EMQX_BASE_URL}/api/v5/status" >/dev/null || {
  echo "NÃ£o consegui falar com ${EMQX_BASE_URL}. O EMQX estÃ¡ no ar?"; exit 1; }

# --------- Connector HTTP -------------------
echo ">> Criando/validando Connector HTTP: ${CONNECTOR_NAME}"
# API v5: connectors
# Se existir, GET /api/v5/connectors/{type}:{name}
if [[ "$(get_ok_or_404 "${EMQX_BASE_URL}/api/v5/connectors/http:${CONNECTOR_NAME}")" == "404" ]]; then
  BODY_CONNECTOR="$(jq -n --arg name "$CONNECTOR_NAME" --arg base "$INGEST_BASE_URL" '{
      type: "http",
      name: $name,
      description: "HTTP connector para backend ingest (dev)",
      config: {
        base_url: $base,
        pool_size: 16,
        connect_timeout: "5s",
        request_timeout: "10s",
        enable_pipelining: false
      }
    }' | json)"
  post_json "${EMQX_BASE_URL}/api/v5/connectors" "$BODY_CONNECTOR" | jq -r '.id // .message'
else
  echo "   - JÃ¡ existe."
fi

# Habilita connector (idempotente)
curl -sS -X PUT "${AUTH_HEADER[@]}" "${EMQX_BASE_URL}/api/v5/connectors/http:${CONNECTOR_NAME}/enable/true" >/dev/null || true

# --------- Action HTTP ----------------------
echo ">> Criando/validando Action HTTP: ${ACTION_NAME}"
if [[ "$(get_ok_or_404 "${EMQX_BASE_URL}/api/v5/actions/http:${ACTION_NAME}")" == "404" ]]; then
  BODY_ACTION="$(jq -n \
    --arg name "$ACTION_NAME" \
    --arg connector "http:${CONNECTOR_NAME}" \
    --arg path "$INGEST_PATH" \
    --arg tenant "$TENANT_SLUG" \
    '{
      type: "http",
      name: $name,
      connector: $connector,
      parameters: {
        method: "POST",
        path: $path,
        headers: {
          "content-type": "application/json",
          "x-tenant": $tenant
        },
        body: "${payload}",               # encaminha payload puro
        max_retries: 5,
        retry_interval: "5s",
        timeout: "10s"
      }
    }' | json)"
  post_json "${EMQX_BASE_URL}/api/v5/actions" "$BODY_ACTION" | jq -r '.id // .message'
else
  echo "   - JÃ¡ existe."
fi

# Habilita action (idempotente)
curl -sS -X PUT "${AUTH_HEADER[@]}" "${EMQX_BASE_URL}/api/v5/actions/http:${ACTION_NAME}/enable/true" >/dev/null || true

# --------- Regra (Rule Engine) --------------
echo ">> Criando/validando Regra: ${RULE_ID}"
if [[ "$(get_ok_or_404 "${EMQX_BASE_URL}/api/v5/rules/${RULE_ID}")" == "404" ]]; then
  RULE_SQL="SELECT
    clientid as client_id,
    topic,
    payload,
    timestamp as ts
  FROM \"tenants/${TENANT_SLUG}/#\""

  BODY_RULE="$(jq -n \
    --arg id "$RULE_ID" \
    --arg sql "$RULE_SQL" \
    --arg action "http:${ACTION_NAME}" \
    --arg desc "Forward tenants/${TENANT_SLUG}/# -> HTTP ${INGEST_PATH}" \
    '{
      id: $id,
      sql: $sql,
      description: $desc,
      enable: true,
      actions: [$action]
    }' | json)"
  post_json "${EMQX_BASE_URL}/api/v5/rules" "$BODY_RULE" | jq -r '.id // .message'
else
  echo "   - JÃ¡ existe."
fi

# --------- (Opcional) Authorization dev -----
# Usa built_in_database para permitir apenas tenants/${TENANT_SLUG}/# em dev.
# OBS: Neste fluxo usamos Bearer (login dashboard) conforme docs.
# VocÃª pode comentar este bloco caso esteja usando AuthZ por HTTP/JWT externamente.
echo ">> Garantindo backend de Authorization 'built_in_database' (dev)"
if [[ -z "${TOKEN:-}" ]]; then
  echo "   - Pulando AuthZ dev (sem token do dashboard)."
else
  # cria fonte se nÃ£o existir
  SOURCES="$(curl -sS -H "Authorization: Bearer ${TOKEN}" "${EMQX_BASE_URL}/api/v5/authorization/sources" | jq -r '.[].type')"
  if ! grep -q "built_in_database" <<< "$SOURCES"; then
    curl -sS -X POST -H "Authorization: Bearer ${TOKEN}" \
      -H 'Content-Type: application/json' \
      -d '{"type":"built_in_database","enable":true,"max_rules":100}' \
      "${EMQX_BASE_URL}/api/v5/authorization/sources" >/dev/null
  fi

  echo ">> Importando regras globais (allow tenant; deny resto) [dev]"
  curl -sS -X POST -H "Authorization: Bearer ${TOKEN}" \
    -H 'Content-Type: application/json' \
    -d "$(jq -n --arg t "tenants/${TENANT_SLUG}/#" '{
          rules: [
            {action:"all", permission:"deny", topic:"$queue/#"},
            {action:"all", permission:"allow", topic:$t},
            {action:"all", permission:"deny", topic:"#"}
          ]
        }')" \
    "${EMQX_BASE_URL}/api/v5/authorization/sources/built_in_database/rules/all" >/dev/null || true
fi

echo "âœ… Provisioning EMQX concluÃ­do:
- Connector: http:${CONNECTOR_NAME}
- Action:    http:${ACTION_NAME}
- Regra:     ${RULE_ID}
- TÃ³picos:   tenants/${TENANT_SLUG}/#
- Envio ->   ${INGEST_BASE_URL}${INGEST_PATH}"
