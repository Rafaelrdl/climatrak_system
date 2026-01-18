# Django Admin — Guia de Operações ClimaTrak

Este documento define os padrões, convenções e boas práticas para o Django Admin do ClimaTrak System.

> **IMPORTANTE**: O admin do ClimaTrak é um **painel de backoffice técnico** para suporte, auditoria,
> correções controladas e manutenção do multi-tenant. **NÃO** é a UI principal (essa é o frontend React).

---

## 📍 Acesso ao Admin

O admin é centralizado no **schema público** (multi-tenant):

| Ambiente | URL | Credenciais |
|----------|-----|-------------|
| Desenvolvimento | http://localhost:8000/admin | Superuser criado via `make seed` |
| Produção | https://admin.climatrak.com.br/admin | Gerenciado via deploy |

> ⚠️ **IMPORTANTE**: O admin **NÃO** está disponível via domínios de tenant (ex: `umc.localhost`).
> Acessar `/admin` em um domínio de tenant retorna 404.

---

## 🛡️ Proteções Multi-Tenant (Prioridade Máxima)

### Banner Fixo de Tenant

O admin exibe um **banner fixo no topo** de TODAS as páginas mostrando:
- 🏢 Nome do tenant ativo
- 📦 Schema PostgreSQL atual
- ⚠️ Aviso quando em schema público

**Cores do Banner:**
- **Vermelho (`#dc3545`)**: Schema público - operações afetam TODOS os tenants
- **Teal (`#0d9488`)**: Schema de tenant - operações isoladas

### Bloqueio de Schema Errado

O `ClimaTrakAdminSite` (em `apps/common/admin_site.py`) bloqueia automaticamente:

| Schema | Apps Bloqueados |
|--------|-----------------|
| `public` | cmms, inventory, trakledger, assets, alerts, locations, ingest, trakservice |
| Tenant | tenants, public_identity |

Tentar acessar um model no schema errado retorna **403 Forbidden**.

### Regras Inegociáveis

1. ❌ **NUNCA** permitir seleção de tenant/schema via dropdown
2. ❌ **NUNCA** expor dados de tenant A para usuário de tenant B
3. ✅ Usar `schema_context()` ao acessar dados de tenant específico
4. ✅ Logging de TODAS as operações administrativas

---

## 🏗️ Arquitetura Multi-Tenant

### Schema Isolation

```
┌─────────────────────────────────────────────────────────────┐
│                    PUBLIC SCHEMA                             │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────────┐│
│  │   Tenants   │ │   Domains   │ │  TenantUserIndex/       ││
│  │             │ │             │ │  TenantMembership       ││
│  └─────────────┘ └─────────────┘ └─────────────────────────┘│
│                         │                                    │
│               Django Admin (centralizado)                    │
└─────────────────────────────────────────────────────────────┘
                          │
         ┌────────────────┼────────────────┐
         ▼                ▼                ▼
┌─────────────┐   ┌─────────────┐   ┌─────────────┐
│  TENANT A   │   │  TENANT B   │   │  TENANT C   │
│  (schema)   │   │  (schema)   │   │  (schema)   │
│             │   │             │   │             │
│  - Assets   │   │  - Assets   │   │  - Assets   │
│  - CMMS     │   │  - CMMS     │   │  - CMMS     │
│  - Inventory│   │  - Inventory│   │  - Inventory│
│  - etc.     │   │  - etc.     │   │  - etc.     │
└─────────────┘   └─────────────┘   └─────────────┘
```

### Modelos no Admin

| Tipo | Onde registrar | Exemplo |
|------|----------------|---------|
| **SHARED_APPS** | `admin.py` normal | Tenant, Domain, User |
| **TENANT_APPS** | Via TenantAdmin (views customizadas) | Assets, Devices, Sensors |

### ⛔ Regras de Segurança Multi-Tenant

1. **NUNCA** permitir seleção de tenant/schema via dropdown no admin
2. **NUNCA** expor dados de tenant A para usuário de tenant B
3. Usar `schema_context()` ao acessar dados de tenant específico
4. Middleware `BlockTenantAdminMiddleware` protege acesso via domínio de tenant

---

## 🎨 Tema e Branding

O admin usa **Jazzmin** com tema `cyborg` (dark mode).

### Configuração em `backend/config/settings/base.py`:

```python
JAZZMIN_SETTINGS = {
    "site_title": "ClimaTrak Admin",
    "site_header": "ClimaTrak",
    # ... (ver arquivo completo)
}

JAZZMIN_UI_TWEAKS = {
    "theme": "cyborg",
    "dark_mode_theme": "cyborg",
    # ...
}
```

### Badge de Ambiente

O admin exibe `[DEV]` no header quando `DJANGO_ENV != production`.
Isso previne acidentes em produção.

### CSS Customizado

Estilos adicionais em: `backend/static/admin/css/climatrak_jazzmin.css`

Cores principais:
- **Primary (Teal/Verde-Petróleo)**: `#0d9488`
- Definido via CSS Variables (`--ct-teal-*`)

Para editar cores/tema em desenvolvimento, ative o UI Builder:
```python
JAZZMIN_SETTINGS = {
    "show_ui_builder": DEBUG,  # Ativa em dev
}
```

---

## 📋 Padrões de ModelAdmin

### Template Mínimo

```python
from django.contrib import admin
from django.utils.html import format_html

from .models import MyModel


@admin.register(MyModel)
class MyModelAdmin(admin.ModelAdmin):
    # Performance
    list_select_related = ["foreign_key_field"]
    list_per_page = 25
    
    # Display
    list_display = ["name", "status_badge", "created_at"]
    list_filter = ["status", "created_at"]
    search_fields = ["name", "description"]
    ordering = ["-created_at"]
    
    # Dates
    date_hierarchy = "created_at"
    
    # Readonly
    readonly_fields = ["id", "created_at", "updated_at"]
    
    # Actions
    actions = ["my_custom_action"]
    
    def status_badge(self, obj):
        """Badge visual para status."""
        colors = {"active": "#10b981", "inactive": "#6b7280"}
        return format_html(
            '<span style="background: {}; color: white; '
            'padding: 4px 8px; border-radius: 4px;">{}</span>',
            colors.get(obj.status, "#6b7280"),
            obj.get_status_display(),
        )
    status_badge.short_description = "Status"
```

### Checklist de Novo Admin

- [ ] `list_select_related` para evitar N+1
- [ ] `list_per_page = 25` (padrão)
- [ ] `search_fields` com campos relevantes
- [ ] `readonly_fields` para campos de auditoria
- [ ] `date_hierarchy` quando houver data principal
- [ ] Badges visuais para status/prioridade
- [ ] Actions para operações em lote

---

## 🔒 Permissões e Controle

### Grupos Recomendados

| Grupo | Descrição | Permissões Principais |
|-------|-----------|----------------------|
| **CMMS Admin** | Gestão completa de manutenção | WorkOrder (CRUD), MaintenancePlan (CRUD), Asset (view) |
| **Inventory Admin** | Gestão de estoque | InventoryItem (CRUD), InventoryMovement (view-only) |
| **Finance ReadOnly** | Visualização financeira | CostTransaction (view), BudgetPlan (view), CostCenter (view) |
| **Finance Admin** | Gestão financeira completa | Inclui lock/unlock de períodos, criar adjustments |
| **Ops Admin** | Operações do sistema | OutboxEvent (view + retry), Alerts (view + acknowledge) |
| **Support ReadOnly** | Suporte ao cliente | View-only em todos os módulos principais |

### Seed de Grupos

```bash
# Criar grupos em todos os tenants
docker exec climatrak-api python manage.py seed_admin_groups

# Criar em tenant específico
docker exec climatrak-api python manage.py seed_admin_groups --tenant=umc

# Dry run (apenas mostra o que seria criado)
docker exec climatrak-api python manage.py seed_admin_groups --dry-run
```

---

## 💰 TrakLedger: Ledger Protegido (Imutabilidade)

O `CostTransaction` é a **fonte da verdade** do sistema financeiro.

### Regras de Proteção (CostTransactionAdmin)

| Operação | Permitido? | Observação |
|----------|------------|------------|
| **View** | ✅ Sim | Para todos com permissão |
| **Add** | ⚠️ Apenas superusers | Transações devem ser criadas via API |
| **Change** | ❌ Não (locked) / ⚠️ Super (unlocked) | Transações são imutáveis após lock |
| **Delete** | ❌ NUNCA | Ledger não permite delete. Use adjustments |

### Ações Disponíveis

- **➕ Criar Adjustment**: Abre wizard para correção
- **🔒 Bloquear transações**: Lock de período (superuser)
- **📊 Exportar CSV**: Download para análise

### Para Correções

❌ **NÃO** edite uma transação existente
✅ **Crie** uma transação de tipo `adjustment` que compensa o erro

```
Original:  labor, +R$ 100,00 (errado - deveria ser R$ 80)
Correção:  adjustment, -R$ 20,00 (descrição: "Correção de valor")
```

### BudgetMonth Lock

```python
# BudgetMonthAdmin
def get_readonly_fields(self, request, obj=None):
    readonly = list(super().get_readonly_fields(request, obj))
    if obj and obj.is_locked:
        # Mês bloqueado: não pode editar valor
        readonly.extend(["planned_amount", "is_locked"])
    return readonly

def has_delete_permission(self, request, obj=None):
    # Proíbe deleção de meses bloqueados
    if obj and obj.is_locked:
        return False
    return super().has_delete_permission(request, obj)
```

#### Regras de Lock Mensal

1. Meses bloqueados (`is_locked=True`) são **read-only**
2. Apenas superusers podem desbloquear meses
3. Para correções em meses fechados, usar **adjustments** (não edição direta)

---

## � Ops Console: Eventos e Monitoramento

### OutboxEventAdmin

Interface para gestão de eventos da Outbox (Event Sourcing).

| Operação | Permitido? | Observação |
|----------|------------|------------|
| **View** | ✅ Sim | Para Ops Admin |
| **Add** | ❌ Nunca | Eventos são criados pelo sistema |
| **Change** | ❌ Nunca | Eventos são imutáveis |
| **Delete** | ⚠️ Superuser | Apenas para limpeza de falhos |

### Ações Disponíveis

- **🔄 Reprocessar eventos**: Marca eventos para retry (IDEMPOTENTE via idempotency_key)
- **❌ Marcar como falho**: Desiste de processar o evento
- **📊 Exportar CSV**: Download para análise

### Colunas Úteis

- **Status**: PENDING (amarelo), PROCESSED (verde), FAILED (vermelho)
- **Tentativas**: X/Y com cor baseada em threshold
- **Tempo**: Tempo entre ocorrência e processamento

### InventoryMovementAdmin (Auditoria)

Movimentações de estoque são **100% readonly** - servem apenas para auditoria:

```python
def has_add_permission(self, request):
    return False

def has_change_permission(self, request, obj=None):
    return False

def has_delete_permission(self, request, obj=None):
    return False
```

---

## 📝 Auditoria de Ações

Todas as operações administrativas são logadas automaticamente pelo `BaseAdmin`:

### Eventos Logados

| Ação | Nível | Dados Incluídos |
|------|-------|-----------------|
| Add | INFO | model, object_id, user, tenant, schema, ip, changed_fields |
| Change | INFO | model, object_id, user, tenant, schema, ip, changed_fields |
| Delete | WARNING | model, object_id, object_repr, user, tenant, schema, ip |
| Bulk Delete | WARNING | model, count, sample_ids, user, tenant, schema, ip |

### Exemplo de Log

```json
{
  "admin_action": "change",
  "model": "trakledger.CostCenter",
  "object_id": "a1b2c3d4-...",
  "user_id": 1,
  "username": "admin",
  "tenant": "UMC",
  "schema": "umc",
  "ip": "127.0.0.1",
  "changed_fields": ["name", "is_active"]
}
```

---

## �🚀 Performance

### Evitando N+1 Queries

```python
# ❌ RUIM - N+1 queries
list_display = ["name", "asset"]  # asset é FK

# ✅ BOM - prefetch
list_select_related = ["asset"]
list_display = ["name", "asset"]
```

### Paginação

```python
list_per_page = 25  # Padrão recomendado
```

### Filtros Obrigatórios

Para tabelas grandes (>10k registros), considere filtros obrigatórios:

```python
def changelist_view(self, request, extra_context=None):
    if not request.GET.get('status'):
        # Força filtro inicial
        return redirect(f"{request.path}?status=OPEN")
    return super().changelist_view(request, extra_context)
```

---

## 🧪 Validação e Testes

### Checklist de Validação

```bash
# 1. Verificar checks do Django
docker exec climatrak-api python manage.py check

# 2. Acessar admin
open http://localhost:8000/admin

# 3. Verificar:
# - [ ] Login funciona
# - [ ] Menu organizado por domínio
# - [ ] Ícones aparecem corretamente
# - [ ] Listagens carregam rápido
# - [ ] Filtros funcionam
# - [ ] Busca funciona
# - [ ] Actions funcionam
# - [ ] Meses bloqueados são readonly

# 4. Multi-tenant isolation
# - [ ] Acessar admin via tenant domain retorna 404
# - [ ] Dados de tenant A não aparecem para tenant B
```

### Testes Automatizados

```python
# backend/apps/trakledger/tests/test_admin.py
import pytest
from django.contrib.admin.sites import AdminSite
from apps.trakledger.admin import BudgetMonthAdmin
from apps.trakledger.models import BudgetMonth


@pytest.mark.django_db
class TestBudgetMonthAdmin:
    def test_locked_month_is_readonly(self, budget_month_locked, rf, admin_user):
        request = rf.get("/admin/")
        request.user = admin_user
        
        admin = BudgetMonthAdmin(BudgetMonth, AdminSite())
        readonly = admin.get_readonly_fields(request, budget_month_locked)
        
        assert "planned_amount" in readonly
        assert "is_locked" in readonly

    def test_locked_month_cannot_be_deleted(self, budget_month_locked, rf, admin_user):
        request = rf.get("/admin/")
        request.user = admin_user
        
        admin = BudgetMonthAdmin(BudgetMonth, AdminSite())
        assert admin.has_delete_permission(request, budget_month_locked) is False
```

---

## 📁 Estrutura de Arquivos

```
backend/
├── config/
│   └── settings/
│       └── base.py          # JAZZMIN_SETTINGS, JAZZMIN_UI_TWEAKS
├── static/
│   └── admin/
│       └── css/
│           └── climatrak_admin.css  # CSS customizado
├── templates/
│   └── admin/
│       └── tenants/          # Templates customizados para TenantAdmin
├── apps/
│   ├── cmms/
│   │   └── admin.py          # WorkOrderAdmin, RequestAdmin, etc.
│   ├── inventory/
│   │   └── admin.py          # InventoryItemAdmin, etc.
│   ├── trakledger/
│   │   └── admin.py          # BudgetMonthAdmin (com lock protection)
│   └── tenants/
│       └── admin.py          # TenantAdmin (com views customizadas)
└── docs/
    └── ops/
        └── admin.md          # Esta documentação
```

---

## 📝 Changelog

| Data | Versão | Mudanças |
|------|--------|----------|
| 2025-01-17 | 1.0.0 | Setup inicial: Jazzmin, branding, menu organizado, proteção lock |

---

## 🔗 Referências

- [Django Admin Documentation](https://docs.djangoproject.com/en/5.0/ref/contrib/admin/)
- [Jazzmin Documentation](https://django-jazzmin.readthedocs.io/)
- [django-tenants](https://django-tenants.readthedocs.io/)
- [ClimaTrak Design System](../design/DESIGN_SYSTEM.md)
