# API de Inventário

Documentação dos endpoints da API de Inventário do TrakNor (CMMS).

## Base URL

```
/api/inventory/
```

---

## Itens de Estoque

### `GET /inventory/items/`

Lista itens de estoque com filtros e paginação.

**Query Parameters:**
| Param | Tipo | Descrição |
|-------|------|-----------|
| `is_active` | boolean | Filtrar por status ativo |
| `is_critical` | boolean | Filtrar itens críticos |
| `category` | integer | ID da categoria |
| `stock_status` | string | `LOW`, `OUT_OF_STOCK`, `OK` |
| `search` | string | Busca em código, nome, descrição |
| `ordering` | string | Ordenação (ex: `-quantity`, `name`) |

**Response:** `200 OK`
```json
{
  "count": 50,
  "next": "...",
  "results": [
    {
      "id": 1,
      "code": "ELET-001",
      "name": "Capacitor 50uF",
      "quantity": 27.0,
      "stock_status": "OK",
      ...
    }
  ]
}
```

### `POST /inventory/items/`

Cria um novo item de estoque.

> **IMPORTANTE:** Ao criar item com `quantity > 0`, uma movimentação de ENTRADA (tipo `IN`, motivo `OTHER`, referência `INITIAL_BALANCE:<item_id>`) é criada automaticamente para rastreabilidade.

**Request Body:**
```json
{
  "code": "MEC-001",
  "name": "Rolamento SKF 6205",
  "unit": "UN",
  "quantity": 50,
  "min_quantity": 10,
  "unit_cost": 45.90,
  "category": 2,
  "location": "Almoxarifado A",
  "is_critical": false
}
```

**Response:** `201 Created`
```json
{
  "id": 10,
  "code": "MEC-001",
  "name": "Rolamento SKF 6205",
  "quantity": 50.0,
  ...
}
```

---

## Movimentações

### `GET /inventory/movements/`

Lista movimentações de estoque com filtros.

**Query Parameters:**
| Param | Tipo | Descrição |
|-------|------|-----------|
| `type` | string | `IN`, `OUT`, `ADJUSTMENT`, `TRANSFER`, `RETURN` |
| `reason` | string | `PURCHASE`, `WORK_ORDER`, `ADJUSTMENT`, etc. |
| `item` | integer | ID do item |
| `created_at__gte` | datetime | Data/hora inicial (ISO 8601) |
| `created_at__lte` | datetime | Data/hora final (ISO 8601) |
| `search` | string | Busca em código/nome do item, referência |
| `ordering` | string | Default: `-created_at` |

**Período Default (Frontend):**
- **Aba Análise:** 90 dias
- **Aba Histórico:** 90 dias

> As duas abas agora usam o mesmo período default para garantir consistência.

**Response:** `200 OK`
```json
{
  "count": 100,
  "results": [
    {
      "id": 1,
      "item": 5,
      "item_code": "ELET-001",
      "item_name": "Capacitor 50uF",
      "type": "OUT",
      "type_display": "Saída",
      "reason": "WORK_ORDER",
      "reason_display": "Ordem de Serviço",
      "quantity": 3.0,
      "quantity_before": 30.0,
      "quantity_after": 27.0,
      "reference": "OS-2024-001",
      "performed_by_name": "João Silva",
      "created_at": "2026-01-15T14:30:00Z"
    }
  ]
}
```

### `POST /inventory/movements/`

Cria uma nova movimentação.

**Request Body:**
```json
{
  "item": 5,
  "type": "OUT",
  "reason": "WORK_ORDER",
  "quantity": 2,
  "work_order_id": 123,
  "note": "Manutenção preventiva"
}
```

### `GET /inventory/movements/consumption_by_category/`

Retorna consumo (saídas) agrupado por categoria.

**Query Parameters:**
| Param | Tipo | Default | Descrição |
|-------|------|---------|-----------|
| `days` | integer | 90 | Período em dias |

**Response:** `200 OK`
```json
[
  {
    "category_id": 1,
    "category_name": "Peças Elétricas",
    "total_consumed": 42.0
  },
  {
    "category_id": 2,
    "category_name": "Peças Mecânicas",
    "total_consumed": 38.0
  }
]
```

### `GET /inventory/movements/top_consumed_items/`

Retorna os itens mais consumidos no período.

**Query Parameters:**
| Param | Tipo | Default | Descrição |
|-------|------|---------|-----------|
| `days` | integer | 90 | Período em dias |
| `limit` | integer | 5 | Quantidade de itens |

**Response:** `200 OK`
```json
[
  {
    "item_id": 5,
    "item_name": "Contator 25A 220V",
    "item_sku": "ELET-006",
    "item_unit": "UN",
    "category_name": "Peças Elétricas",
    "total_consumed": 15.0
  }
]
```

---

## Tipos de Movimentação

| Tipo | Descrição | Afeta Saldo |
|------|-----------|-------------|
| `IN` | Entrada | +quantity |
| `OUT` | Saída | -quantity |
| `ADJUSTMENT` | Ajuste | Define quantity (valor absoluto) |
| `TRANSFER` | Transferência | Não altera (referência) |
| `RETURN` | Devolução | +quantity |

## Motivos (Reason)

| Motivo | Descrição |
|--------|-----------|
| `PURCHASE` | Compra |
| `WORK_ORDER` | Ordem de Serviço |
| `ADJUSTMENT` | Ajuste de Inventário |
| `DAMAGE` | Avaria |
| `EXPIRY` | Vencimento |
| `RETURN_SUPPLIER` | Devolução ao Fornecedor |
| `RETURN_STOCK` | Retorno ao Estoque |
| `TRANSFER` | Transferência |
| `OTHER` | Outro (inclui saldo inicial) |

---

## Movimentação Inicial (INITIAL_BALANCE)

Quando um item é criado com quantidade inicial > 0, o sistema automaticamente cria uma movimentação de entrada com:

- **type:** `IN`
- **reason:** `OTHER`
- **reference:** `INITIAL_BALANCE:<item_id>`
- **note:** "Saldo inicial do item"

Isso garante rastreabilidade completa do saldo de todos os itens.

### Backfill de Itens Legados

Para itens criados antes dessa feature, use o comando de management:

```bash
# Verificar itens afetados (dry-run)
python manage.py backfill_inventory_movements --dry-run

# Executar backfill para um tenant
python manage.py backfill_inventory_movements --tenant=umc

# Executar para todos os tenants
python manage.py backfill_inventory_movements
```

---

## Categorias

### `GET /inventory/categories/`

Lista categorias de itens.

### `GET /inventory/categories/tree/`

Retorna árvore hierárquica de categorias.

---

## Contagens de Inventário

### `GET /inventory/counts/`

Lista contagens de inventário.

### `POST /inventory/counts/{id}/start/`

Inicia uma contagem.

### `POST /inventory/counts/{id}/complete/`

Conclui a contagem e aplica ajustes.

---

## Changelog

### 2026-01-17
- **[BREAKING]** Criar item com quantidade inicial agora gera movimentação IN automática
- Alinhamento de período default entre Análise (90d) e Histórico (90d)
- Adicionada opção "Todo o histórico" no filtro de período do Histórico
- Novo comando `backfill_inventory_movements` para itens legados
