# Django Admin — Guia de Operações ClimaTrak

Este documento define os padrões, convenções e boas práticas para o Django Admin do ClimaTrak System.

## 📍 Acesso ao Admin

O admin é centralizado no **schema público** (multi-tenant):

| Ambiente | URL | Credenciais |
|----------|-----|-------------|
| Desenvolvimento | http://localhost:8000/admin | Superuser criado via `make seed` |
| Produção | https://admin.climatrak.com.br/admin | Gerenciado via deploy |

> ⚠️ **IMPORTANTE**: O admin **NÃO** está disponível via domínios de tenant (ex: `umc.localhost`).
> Acessar `/admin` em um domínio de tenant retorna 404.

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

| Grupo | Permissões |
|-------|------------|
| **Superuser** | Tudo (is_superuser=True) |
| **Staff Admin** | Gerenciar tenants, users, ver ops |
| **Finance** | TrakLedger (view/change), reports |
| **Maintenance** | CMMS, Inventory (view/change) |
| **Viewer** | Apenas view em tudo |

### Proteção de Dados Críticos

#### TrakLedger (Finance)

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

## 🚀 Performance

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
