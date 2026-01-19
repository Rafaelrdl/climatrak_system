# Eventos de AI (AI-006)

## procedure.updated

Disparado quando um Procedure é aprovado, arquivado, ou tem nova versão criada/restaurada.

**event_name:** `procedure.updated`  
**aggregate:** `procedure`

**Payload `data`:**
```json
{
  "procedure_id": 123,
  "title": "Procedimento de Manutenção Preventiva",
  "version": 2,
  "file_type": "PDF",
  "status": "ACTIVE",
  "action": "approved",
  "has_file": true
}
```

**Campos:**

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `procedure_id` | int | ID do Procedure |
| `title` | string | Título do procedimento |
| `version` | int | Versão atual do procedimento |
| `file_type` | string | Tipo do arquivo (PDF, MARKDOWN, DOCX) |
| `status` | string | Status atual (ACTIVE, INACTIVE, DRAFT, ARCHIVED) |
| `action` | string | Ação que disparou o evento |
| `has_file` | bool | Se o procedimento tem arquivo anexado |

**Actions possíveis:**

| Action | Descrição |
|--------|-----------|
| `approved` | Procedimento aprovado (status → ACTIVE) |
| `archived` | Procedimento arquivado (status → ARCHIVED) |
| `version_created` | Nova versão criada (version incrementado) |
| `version_restored` | Versão anterior restaurada |

**Idempotency key:** `procedure:{id}:v{version}:{action}`

**Emitido por:**
- `apps.cmms.views.ProcedureViewSet.approve()`
- `apps.cmms.views.ProcedureViewSet.archive()`
- `apps.cmms.views.ProcedureViewSet.create_version()`
- `apps.cmms.views.ProcedureViewSet.restore_version()`

**Consumidores:**
- `apps.ai.handlers.handle_procedure_updated` → enfileira task `index_procedure_knowledge` para indexação na base de conhecimento

---

## Fluxo de Indexação

```
┌─────────────────────────────────────────────────────────────────────────┐
│  ProcedureViewSet                                                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐ │
│  │   approve   │  │   archive   │  │create_version│  │restore_version │ │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └───────┬─────────┘ │
│         │                │                │                  │          │
│         └────────────────┴────────────────┴──────────────────┘          │
│                                   │                                      │
│                   EventPublisher.publish_idempotent()                   │
│                                   │                                      │
│                          procedure.updated                               │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │
                                    ▼
                        ┌───────────────────────┐
                        │    Outbox Event       │
                        │    (transacional)     │
                        └───────────┬───────────┘
                                    │
                                    ▼
                        ┌───────────────────────┐
                        │  core_events Consumer │
                        │  (Celery worker)      │
                        └───────────┬───────────┘
                                    │
                                    ▼
                        ┌───────────────────────┐
                        │handle_procedure_updated│
                        │  (apps.ai.handlers)   │
                        └───────────┬───────────┘
                                    │
                        index_procedure_knowledge.delay()
                                    │
                                    ▼
                        ┌───────────────────────┐
                        │   ProcedureIndexer    │
                        │  - Extract text       │
                        │  - Compute hash       │
                        │  - Check idempotency  │
                        │  - Create chunks      │
                        │  - Save to DB         │
                        └───────────────────────┘
```

## Idempotência

A indexação é idempotente através de dois mecanismos:

1. **Event idempotency_key**: `procedure:{id}:v{version}:{action}` previne duplicação de eventos no Outbox.

2. **Content hash (SHA256)**: Se o conteúdo extraído do arquivo for idêntico ao já indexado, o processo é ignorado (status "unchanged").

## Multi-tenancy

Todos os eventos e handlers respeitam isolamento por tenant:
- Eventos são emitidos no contexto do tenant atual
- Handler executa no schema do tenant
- Documentos e chunks são filtrados por `tenant_id`
