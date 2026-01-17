# Logging

## Formato
Todos os logs do backend e worker são JSON para stdout. Cada log inclui um contexto compartilhado
para que requisições e tarefas possam ser correlacionadas.

### Campos padrão
- timestamp (ISO8601 UTC)
- level
- service
- env
- request_id
- trace_id (quando rastreamento está ativado)
- tenant (slug quando disponível)
- tenant_schema
- tenant_slug
- user_id (quando autenticado)
- path
- method
- status_code
- latency_ms
- task_id (Celery)
- task_name (Celery)
- device_id (ingest)
- event (marcador semântico, quando usado)

## Correlação de requisições
- Um request_id é criado por requisição a menos que X-Request-ID seja fornecido.
- A resposta inclui X-Request-ID.
- request_id é propagado para headers de tarefas Celery quando uma tarefa é enfileirada
  durante uma requisição.

## Regras de redação
- Nunca registre tokens, senhas, cookies, headers Authorization, ou payloads completos de ingest.
- Mensagens são redatadas para:
  - Valores de Authorization/Cookie/Set-Cookie
  - Padrões access_token/refresh_token/password/secret/api_key
  - Strings semelhantes a JWT (eyJ...xxx.yyy.zzz)
  - Endereços de email
- Não registre corpos de payload ingest ou headers de requisição. Registre apenas metadados.

## Exemplos

### Requisição de API (sucesso)
```json
{"timestamp":"2026-01-17T18:10:12Z","level":"INFO","service":"climatrak-backend","env":"development","logger":"apps.common.observability.middleware","message":"requisição concluída","request_id":"b3f4c2d1d0b9481ca13b0f2d622c1287","trace_id":null,"tenant":"umc","tenant_schema":"umc","tenant_slug":"umc","user_id":42,"path":"/api/alerts/","method":"GET","status_code":200,"latency_ms":37,"task_id":null,"task_name":null,"device_id":null,"event":"http_request"}
```

### Tarefa Celery (sucesso)
```json
{"timestamp":"2026-01-17T18:10:45Z","level":"INFO","service":"climatrak-backend","env":"development","logger":"apps.core_events.tasks","message":"Evento 9b3c... processado com sucesso","request_id":"b3f4c2d1d0b9481ca13b0f2d622c1287","trace_id":null,"tenant":"umc","tenant_schema":"umc","tenant_slug":"umc","user_id":null,"path":null,"method":null,"status_code":null,"latency_ms":null,"task_id":"c0a7...","task_name":"apps.core_events.tasks.process_outbox_event","device_id":null,"event":null}
```
