# TrakNor CMMS — Instruções Unificadas (Spark + React + Django)

## 0. Escopo e versões

* Frontend: React + TypeScript executando sob **GitHub Spark**.
* Controle de versões é do Spark. **Não** altere major versions (`react`, `react-dom`, `vite`) sem validação explícita no ambiente Spark.
* Tailwind habilitado (container queries). TypeScript/ESLint em modo estrito.

---

## 1. Integração Spark — Regras críticas

### Arquivos protegidos (NUNCA MODIFICAR)

```
src/main.tsx          ❌ integra com runtime do Spark
src/main.css          ❌ estilos estruturais do Spark
index.html            ⚠️ apenas <title> e meta tags
```

### Scripts e Vite

* `package.json` scripts **imutáveis**: `"dev"`, `"build"`, `"preview"`.
* `vite.config.ts`: apenas plugins compatíveis; **não** alterar `base`.
* Frontend roda fixo na **porta 5173**.

### APIs/Hooks Spark permitidos

* Globais: `spark.llm()`, `spark.kv`, `spark.user()`.
* Persistência: **`useKV()`** de `@github/spark/hooks`.
* **Não** importar hooks Spark não documentados além de `useKV()`.

### Assets

* **Sempre** importar explicitamente: `import logo from '@/assets/logo.png'`.
* **Nunca** usar caminhos string estáticos para assets.

---

## 2. Dados e estado — padrão atual

**Estado atual da implementação**

* **Persistência de domínio** → **Store classes** + `localStorage` (`src/data/*Store.ts`).
* **Estado efêmero de UI** → **React useState** ou **Context API**.
* **Dados temporários/mock** → hooks em `src/hooks/useDataTemp.ts`.

#### Padrão de Store atual (exemplo)

```ts
// src/data/usersStore.ts
class UsersStore {
  private users: User[] = []
  
  load() { /* localStorage */ }
  save() { /* localStorage */ }
  createUser(data: Partial<User>) { /* ... */ }
  updateUser(id: string, data: Partial<User>) { /* ... */ }
}

export const usersStore = new UsersStore()
export function useUsers() {
  return {
    createUser: usersStore.createUser.bind(usersStore),
    /* ... mais métodos ... */
  }
}
```

#### Context para estado de UI complexo

```ts
// src/contexts/LocationContext.tsx
export function LocationProvider({ children }) {
  const [selectedNode, setSelectedNode] = useState<LocationNode | null>(null)
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())
  /* contexto compartilhado entre componentes */
}
```

**Migração gradual**

* Novos recursos: usar `useKV()` quando disponível no Spark.
* Código existente: manter padrão store class até migração.

---

## 3. Arquitetura de componentes

### Estrutura de UI

* **Layout**: `src/components/Layout.tsx` com navegação baseada em ACL/role.
* **UI base**: `src/components/ui/` (shadcn/ui) — **NÃO modificar diretamente**.
* **Páginas**: `src/pages/` + roteamento protegido em `App.tsx`.
* **Responsivo**: `useIsMobile()` para lógica condicional.

### Padrões de Modal/Dialog

**Estrutura padrão dos modais:**

```tsx
// Exemplo: LocationFormModal.tsx, WorkOrderEditModal.tsx
export function MyModal({ isOpen, onClose, data }: Props) {
  const [formData, setFormData] = useState(initialData)
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="max-h-[calc(90vh-120px)]">
          {/* Conteúdo do modal */}
        </ScrollArea>
        
        <div className="flex justify-end gap-3 mt-8 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit}>Salvar</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

**Modal vs Drawer:**
* **Modais** → Formulários complexos, edição de dados.
* **Drawers** → Visualização, listas, navegação lateral.

---

## 4. ACL

* Abilities em `src/acl/abilities.ts`: `admin | technician | requester`.
* Ações: `view | create | edit | delete | move | convert | manage`.
* Integrar via `<IfCan>` (sem checagens manuais no componente).
* Técnicos podem **converter** solicitações em ordens de serviço.

---

## 5. Dados de exemplo e inicialização

* Mock: `src/data/mockData.ts`.
* Inicialização: `src/data/initializeStores.ts` deve escrever via **hooks KV**.
* OS podem ser auto-geradas a partir de planos quando habilitado.

---

## 6. Ciclo de vida de OS

```ts
// Plan → Generated → Assigned → In Progress → Completed
// Frequências: ver src/data/workOrdersStore.ts (date-fns)
// Transições: WorkOrderEditModal.tsx
```

---

## 7. PDFs

* Config: `src/utils/pdfConfig.ts` (PDF.js worker).
* Dev utils: carregadas em desenvolvimento.
* Build: excluir/adaptar workers conforme configuração do Vite.

---

## 8. Brasil/PMOC

* Planos seguem PMOC.
* Classificação de equipamentos HVAC brasileira.
* Frequências: **Semanal, Mensal, Bimestral, Trimestral**.
* **UI**: datas em **DD/MM/YYYY**; **armazenamento/API**: ISO 8601 com `Z`.

---

## 9. Onboarding e autenticação

### Fluxo de onboarding

* **`OnboardingManager`** em `useOnboardingFlow.tsx` controla jornada do usuário.
* **Estados**: convite aceito → setup → tour → guia interativo.
* **Persistência**: `localStorage` com prefixo `onboarding:`.
* **Páginas**: `OnboardingPage` → `QuickSetupPage` → `WelcomeTourPage`.

### Autenticação atual

```ts
// src/data/authStore.ts - padrão current
export function useCurrentRole(): [Role, (r: Role) => void]
export function getCurrentRole(): Role  // sync version

// Fallback: localStorage 'auth:role' se usuário não disponível
```

---

## 10. Backend Django — contrato de integração

### Porta e execução

* Executar em `0.0.0.0:3333`. **Não** usar `:8000` para o backend do app.

### CORS e headers

```py
CORS_ALLOWED_ORIGINS = [
    'http://localhost:5173',  # Spark padrão
    'http://localhost:5001',  # Alternativa Spark
    'http://localhost:5000',  # Backup Spark
]
CORS_ALLOW_CREDENTIALS = True
# Incluir/propagar 'x-spark-session' quando aplicável
```

### Formato de resposta (obrigatório)

```py
from rest_framework.response import Response

def api_response(data, success=True, error=None):
    return Response({'success': success, 'data': data, 'error': error})
```

### URLs (sem barra final; manter hífen)

```py
path('api/auth/login', LoginView.as_view()),
path('api/auth/logout', LogoutView.as_view()),
path('api/users', UserListView.as_view()),
path('api/work-orders', WorkOrderListView.as_view()),
```

### IDs e timestamps

* IDs: **UUID** como string.
* Serializers: ISO 8601 com `Z` (`'%Y-%m-%dT%H:%M:%S.%fZ'`).

---

## 11. Ferramentas e padrões

* **Forms**: React Hook Form + Zod.
* **Rotas**: React Router com guards/proteção.
* **Animações**: Framer Motion.
* **Server state**: React Query (planejado).
* **TS/ESLint**: estrito (`eslint.config.js`).
* **Tailwind**: v4 (container queries).
* **Scripts**: usar `npm run` (não chamar CLIs diretamente quando houver script).

---

## 12. Devcontainer/Codespaces

**Requisitos mínimos**

* Node 20, Python 3.12, PostgreSQL 16.
* `forwardPorts`: `5173`, `3333`, `5432` (opcional: `8000` apenas para ferramentas locais, não Django do app).

**Post-start (exemplo)**

```bash
#!/usr/bin/env bash
set -euo pipefail

pkill -f "python manage.py runserver" 2>/dev/null || true
pkill -f "npm run dev" 2>/dev/null || true
pkill -f "node simple-mock-api.js" 2>/dev/null || true

pushd backend_django >/dev/null
python manage.py runserver 0.0.0.0:3333 &
popd >/dev/null

npm run dev &
echo "Spark + Django ativos"
```

---

## 13. Testes

### Configuração atual

* **Unitários**: Vitest + Testing Library (`src/__tests__/setup.ts`).
* **E2E**: Cypress configurado (`cypress.config.ts`) — **pasta não existe ainda**.
* **Script ACL**: `npm run cy:run-acl` para testes por perfil.

### Padrões de teste descobertos

```ts
// src/__tests__/setup.ts
import '@testing-library/jest-dom'
globalThis.localStorage = { /* mock */ }
```

```bash
# Scripts disponíveis
npm test          # Testes unitários
npm run test:ui   # Interface do Vitest  
npm run cy:open   # Cypress interativo
npm run cy:run-acl # Testes E2E por ACL
```

---

## 14. Checklist de validação

```bash
# Frontend
curl -s http://localhost:5173 | grep -q "TrakNor" && echo "Frontend OK"

# Backend (saúde)
curl -s http://localhost:3333/api/health | jq -r '.success' | grep -q true && echo "Backend OK"

# Formato de resposta
curl -s http://localhost:3333/api/users | jq -e '.success and .data' && echo "Formato OK"

# CORS
curl -H "Origin: http://localhost:5173" -I http://localhost:3333/api/health | \
  grep -q "Access-Control-Allow-Origin" && echo "CORS OK"
```

---

## 15. Troubleshooting

* **Spark não carrega**: conferir `src/main.tsx`/`src/main.css`, porta `3333` livre, CORS/headers no Django, rebuild do container.
* **Assets falham**: imports explícitos; sem caminhos string; não alterar `vite.base`.
* **Persistência falha**: verificar stores em `src/data/`; padrão atual usa `localStorage`; autenticação em `authStore.ts`.

---

## 16. Regras de ouro

1. Persistência de domínio → **Store classes** + `localStorage` (atual); migrar para `useKV()` gradualmente.
2. Arquivos/scripts protegidos **intocáveis** (`main.tsx`, `main.css`, `dev/build/preview`).
3. API Django **sempre** `{ success, data, error }`; rotas **sem** barra final; recursos **com hífen**.
4. Frontend **:5173**, backend **:3333** (não usar **:8000** para o app).
5. IDs **UUID** string e datas **ISO 8601** com `Z`.
6. ACL via `<IfCan>`; sem checagens manuais.
7. Testar responsividade e cálculos de data com `date-fns`.
8. Validar compatibilidade Spark após **qualquer** mudança estrutural.
