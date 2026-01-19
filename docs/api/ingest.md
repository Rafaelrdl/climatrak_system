# Contrato de ingestão MQTT → HTTP (EMQX → Django)

O caminho de ingestão conecta dispositivos IoT (via EMQX) diretamente ao backend Django.
O endpoint principal é:

```
POST /ingest
```

Ele é incluído em ambos os roteadores (`config/urls.py` e `config/urls_public.py`) e age fora do middleware padrão
para garantir que o tenant correto seja selecionado antes mesmo de autenticar.

## Payload esperado

O corpo JSON segue exatamente o que o EMQX Rule Engine envia após aplicar o parser da regra:

```json
{
  "client_id": "device-001",
  "topic": "tenants/umc/sites/Uberlandia/assets/CHILLER-001/telemetry",
  "payload": { "value": 23.5, "unit": "celsius" },
  "ts": 1697572800000,
  "labels": { ... }          # opcional
}
```

Campos obrigatórios:

- `client_id`: deve ser igual a `Device.mqtt_client_id`.
- `topic`: obrigatório para validar o tenant e extrair `site`, `asset` e `sensor`.
- `payload`: JSON bruto (telemetria completa).
- `ts`: timestamp Unix em milissegundos (fonte da regra em `apps/ingest/views.py`).

## Cabeçalhos de autenticação

O backend exige:

- `X-Tenant`: slug do tenant (`apps/tenants.models.Tenant.slug`). É usado para carregar o tenant via `schema_context`.
- `X-Ingest-Timestamp`: Unix timestamp em segundos, usado pelo backend para calcular o skew (`INGEST_SIGNATURE_MAX_SKEW_SECONDS`).
- `X-Ingest-Signature`: HMAC-SHA256 sobre a concatenação `{timestamp}.{body}` usando o segredo `device.ingest_secret`.
- `X-Device-Token`: token leg legado (aceito somente quando `INGEST_ALLOW_GLOBAL_SECRET=True`).

O método `_authenticate_ingest_request` em `apps/ingest/views.py` rejeita replay, verifica o `x-tenant` vs tópico e rejeita assinaturas inválidas antes de acessar o banco.

## Multi-tenant e schema switching

1. O tenant escolhido é buscado em `public` via `Tenant.objects.filter(slug=tenant_slug)` e o schema é ativado com `connection.set_tenant(tenant)`.
2. O middleware manual garante que apenas o schema daquele tenant receba a mensagem (`schema_context`/`connection.set_tenant` em `apps/ingest/views.py`).
3. Todos os modelos (`Telemetry`, `Reading`, `Alert` etc.) são criados dentro do schema do tenant, mantendo isolamento.

## Modelos de banco

- `apps/ingest.models.Telemetry`: guarda o MQTT cru com `device_id`, `topic`, `payload`, `timestamp` e `created_at`.
- `apps/ingest.models.Reading`: dados estruturados (várias colunas indexadas) destinados a consultas e agregações. A tabela `reading` vira hypertable via `migrations/0002`/`0004`.
- `apps/core_events.models.OutboxEvent`: eventos somam contextos de ingestões críticas (alertas/externalidades).

`Reading` usa índices compostos em `asset_tag`, `tenant`, `site` e `ts` (ver `apps/ingest/models.py`). `Telemetry` tem `topic` + `timestamp`.

## TimescaleDB e agregações

- `backend/apps/ingest/migrations/0002_convert_to_hypertable.py` remove o PK e chama `create_hypertable('reading', 'ts')`.
- `0004_timescale_hypertable_continuous_aggregates` documenta que os Continuous Aggregates foram removidos na versão Apache (aguardam Community/Enterprise).
- Apesar da limitação da licença, os endpoints em `apps/ingest/api_views.py` usam `reading_1m`, `reading_5m` e `reading_1h` (materialized views ou manual `time_bucket`).
- A extensão Timescale é criada por `infra/scripts/init-timescale.sh` durante o bootstrap.

## EMQX ↔ Backend

- A estrutura de tópicos exigida é `tenants/{tenant}/sites/{site}/assets/{asset}/telemetry`.
- Use `infra/scripts/provision-emqx.sh` para criar connector HTTP, action e rule que apontam para `/ingest`.
- Os dispositivos devem ser cadastrados em `apps/assets` (dispositivo + `ingest_secret`). Sensores são gerados automaticamente.
- Veja o guia operacional `docs/operations/emqx-sensors-setup.md` para detalhes de regras e testes com `mosquitto_pub`.

## APIs complementares

- `GET /api/telemetry/`: lista mensagens brutas (`apps/ingest/api_views.TelemetryListView`).
- `GET /api/readings/`: lista leituras normalizadas com filtros (`ReadingListView`).
- `GET /api/readings/aggregates/`: consulta buckets `1m | 5m | 1h` com `time_bucket` (continua em `apps/ingest/api_views.TimeSeriesAggregateView`, max 5000 pontos).

Esses endpoints já usam padrões DRF (OpenAPI via `drf_spectacular`) e paginam por padrão.

## Observabilidade e troubleshooting

- Logs do ingest incluem `request_id`, `tenant_slug` e `device_id` (`apps/common/observability/context.py` seta o contexto).
- `DEBUG` imprime corpo e headers nos logs (ver `settings.DEBUG` no início de `views.py`).
- Mensagens rejeitadas retornam 400/403/401 com payload JSON (prefira ler o campo `error` + `detail`).
- Consulte `docs/operations/admin.md` para pistas de auditoria e logs de outbox/alertas.

## Checklist de validação

- [ ] Tenant slug no header bate com o segmento `tenants/{slug}` do tópico.
- [ ] Secret do dispositivo armazenado em `apps/assets.models.Device.ingest_secret`.
- [ ] Ingest signature validada antes de qualquer operação de DB.
- [ ] Timescale extensão disponível (`infra/scripts/init-timescale.sh`).
- [ ] Eventos emitidos para `OutboxEvent` em `apps/core_events` (status PENDING/FAILED para retries).
