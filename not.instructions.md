# 🚨 INSTRUÇÕES CRÍTICAS - ARQUIVOS PROTEGIDOS DO GITHUB SPARK

## ⚠️ ATENÇÃO: ARQUIVOS QUE NUNCA DEVEM SER MODIFICADOS

Este documento contém informações críticas sobre a integração do GitHub Spark com o projeto TrakNor CMMS. A modificação incorreta destes arquivos pode quebrar completamente a comunicação entre o Codespace e o Spark.

## 📁 ARQUIVOS PROTEGIDOS DO SPARK

### 1. Arquivos de Configuração Principal

```
/src/main.tsx           - ❌ NUNCA MODIFICAR
/src/main.css           - ❌ NUNCA MODIFICAR  
/index.html             - ⚠️ APENAS <title> PERMITIDO
```

**Motivo**: Estes arquivos são o ponto de entrada da aplicação Spark. Qualquer alteração pode quebrar a comunicação entre o Codespace e a interface do Spark.

### 2. Estrutura de Pastas Obrigatória

```
/workspaces/spark-template/
├── src/
│   ├── main.tsx        - ❌ PROTEGIDO
│   ├── main.css        - ❌ PROTEGIDO
│   ├── App.tsx         - ✅ MODIFICÁVEL (com cuidado)
│   └── ...outros arquivos
├── index.html          - ⚠️ LIMITADO
├── package.json        - ⚠️ CUIDADO COM DEPS
├── vite.config.ts      - ⚠️ CONFIGURAÇÕES CRÍTICAS
└── postcss.config.js   - ⚠️ PLUGINS OBRIGATÓRIOS
```

### 3. Dependências Críticas (package.json)

**NUNCA REMOVER ESTAS DEPENDÊNCIAS:**
```json
{
  "@github/spark/hooks": "^*",
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "vite": "^5.0.0",
  "tailwindcss": "^*",
  "autoprefixer": "^*"
}
```

### 4. Configurações PostCSS (postcss.config.js)

**CONFIGURAÇÃO OBRIGATÓRIA:**
```javascript
export default {
  plugins: {
    tailwindcss: {},      // ❌ NUNCA REMOVER
    autoprefixer: {},     // ❌ NUNCA REMOVER
  },
}
```

## 🔧 INTEGRAÇÕES DO SPARK

### 1. Hooks do Spark

```typescript
// HOOKS OBRIGATÓRIOS - NUNCA REMOVER
import { useKV } from '@github/spark/hooks'

// Uso correto para persistência
const [data, setData] = useKV("key", defaultValue)
```

### 2. API Global do Spark

```typescript
// API GLOBAL - SEMPRE DISPONÍVEL
declare global {
  interface Window {
    spark: {
      llmPrompt: (strings: string[], ...values: any[]) => string
      llm: (prompt: string, modelName?: string, jsonMode?: boolean) => Promise<string>
      user: () => Promise<UserInfo>
      kv: {
        keys: () => Promise<string[]>
        get: <T>(key: string) => Promise<T | undefined>
        set: <T>(key: string, value: T) => Promise<void>
        delete: (key: string) => Promise<void>
      }
    }
  }
}
```

### 3. Estrutura de Componentes

```
src/components/
├── ui/           - ✅ shadcn/ui (pré-instalados)
├── layout/       - ✅ Componentes de layout
└── ...outros     - ✅ Componentes customizados
```

## 🚫 REGRAS PARA DESENVOLVIMENTO BACKEND (DJANGO)

### 1. Portas Obrigatórias

```bash
Frontend (Vite):  5173  # ❌ NUNCA ALTERAR
Backend (Django): 3333  # ❌ DEVE SER 3333 (não 8000)
PostgreSQL:       5432  # ✅ Padrão OK
```

### 2. Estrutura de Pastas para Backend

```
/workspaces/spark-template/
├── src/              # ❌ FRONTEND - NÃO TOCAR
├── backend_django/   # ✅ CRIAR AQUI
│   ├── manage.py
│   ├── requirements.txt
│   └── ...django files
├── package.json      # ⚠️ FRONTEND - CUIDADO
└── vite.config.ts    # ⚠️ FRONTEND - CUIDADO
```

### 3. Configurações Django Obrigatórias

**CORS (CRITICAL):**
```python
CORS_ALLOWED_ORIGINS = [
    'http://localhost:5173',  # ❌ SPARK FRONTEND
    'http://localhost:5001',  # ❌ SPARK PREVIEW
    'http://localhost:5000',  # ❌ SPARK BACKUP
]
```

**PORTA OBRIGATÓRIA:**
```python
# manage.py runserver DEVE usar porta 3333
python manage.py runserver 0.0.0.0:3333
```

### 4. Endpoints que o Frontend Espera

```python
# ❌ FORMATO OBRIGATÓRIO - NÃO ALTERAR
urlpatterns = [
    path('api/auth/login', ...),      # SEM barra final!
    path('api/auth/logout', ...),
    path('api/auth/refresh', ...),
    path('api/auth/me', ...),
    path('api/users', ...),
    path('api/companies', ...),
    path('api/equipment', ...),       # SINGULAR!
    path('api/work-orders', ...),     # COM HÍFEN!
]
```

### 5. Formato de Resposta Obrigatório

```python
# ❌ FORMATO FIXO - FRONTEND ESPERA EXATAMENTE ASSIM
{
  "success": true,        # ❌ OBRIGATÓRIO
  "data": { ... }         # ❌ DADOS EM camelCase
}

# Para erros:
{
  "success": false,       # ❌ OBRIGATÓRIO  
  "error": {
    "message": "...",
    "code": "...",
    "details": {}
  }
}
```

## 🔍 ARQUIVOS DE DADOS CRÍTICOS

### 1. Credenciais de Demonstração

**ARQUIVO:** `/src/data/credentialsStore.ts`
```typescript
// ❌ CREDENCIAIS OBRIGATÓRIAS
admin@traknor.com / admin123
tecnico@traknor.com / tecnico123
```

### 2. Usuários Mock

**ARQUIVO:** `/src/mocks/users.json`
```json
// ❌ IDs FIXOS - BACKEND DEVE USAR OS MESMOS
{
  "id": "user-admin-001",     // ❌ FIXO
  "email": "admin@traknor.com"
}
```

### 3. Dados Sincronizados

```
src/data/usersStore.ts      - ✅ Usuários
src/data/credentialsStore.ts - ✅ Senhas  
src/mocks/*.json           - ✅ Dados mock
```

## ⚙️ CONFIGURAÇÕES DE DESENVOLVIMENTO

### 1. Scripts Package.json

```json
{
  "scripts": {
    "dev": "vite",                    // ❌ SPARK DEPENDENCY
    "build": "tsc && vite build",     // ❌ SPARK DEPENDENCY
    "preview": "vite preview"         // ❌ SPARK DEPENDENCY
  }
}
```

### 2. Vite Configuration

```typescript
// vite.config.ts - CONFIGURAÇÕES CRÍTICAS
export default defineConfig({
  plugins: [react()],               // ❌ OBRIGATÓRIO
  base: "/",                        // ❌ NUNCA ALTERAR
  server: {
    port: 5173,                     // ❌ PORTA FIXA
    host: true                      // ❌ CODESPACES
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')  // ❌ PATHS
    }
  }
})
```

### 3. TypeScript Configuration

```json
// tsconfig.json - PATHS OBRIGATÓRIOS
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]            // ❌ IMPORTS ABSOLUTOS
    }
  }
}
```

## 🚀 INICIALIZAÇÃO AUTOMÁTICA (CODESPACES)

### 1. devcontainer.json

```json
{
  "postCreateCommand": ".devcontainer/post-create.sh",   // ❌ SETUP
  "postStartCommand": ".devcontainer/post-start.sh",    // ❌ AUTO-START
  "forwardPorts": [5173, 3333, 8000, 5432],            // ❌ PORTAS
}
```

### 2. Scripts de Inicialização

```bash
# .devcontainer/post-start.sh
npm run dev > /tmp/frontend.log 2>&1 &               # ❌ FRONTEND
python manage.py runserver 0.0.0.0:3333 > /tmp/django.log 2>&1 &  # ✅ BACKEND
```

## 🧪 TESTES E VALIDAÇÃO

### 1. Endpoints de Health Check

```bash
# ❌ VALIDAÇÕES OBRIGATÓRIAS
curl -s http://localhost:5173         # Spark Frontend
curl -s http://localhost:3333/api/health  # Django Backend
```

### 2. Estrutura de Testes

```
tests/
├── test_integration.py    # ✅ Integração frontend-backend
├── test_auth.py          # ✅ Autenticação
└── test_api.py           # ✅ Endpoints
```

## 📋 CHECKLIST DE DESENVOLVIMENTO SEGURO

### ✅ Antes de Modificar Qualquer Arquivo:

1. **Verificar se é arquivo protegido** (lista acima)
2. **Fazer backup** se necessário
3. **Testar em ambiente de desenvolvimento**
4. **Validar que Spark ainda funciona**
5. **Confirmar que credenciais demo funcionam**

### ✅ Ao Adicionar Backend Django:

1. **Criar pasta separada** (`backend_django/`)
2. **Usar porta 3333** (não 8000)
3. **Manter formato de resposta** do mock server
4. **Usar mesmos IDs/códigos** dos mocks
5. **Configurar CORS** para localhost:5173
6. **Testar integração completa**

### ✅ Ao Modificar Dependências:

1. **NUNCA remover** dependências do Spark
2. **Cuidado com versões** do React/Vite
3. **Testar PostCSS** após mudanças
4. **Validar que build funciona**

## 🆘 RESOLUÇÃO DE PROBLEMAS

### Problema: "Cannot find module 'autoprefixer'"
```bash
npm install --save-dev autoprefixer
```

### Problema: PostCSS config quebrado
```javascript
// postcss.config.js - CONFIGURAÇÃO CORRETA
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

### Problema: Frontend não carrega
```bash
# Verificar se porta 5173 está livre
npm run dev
```

### Problema: Backend na porta errada
```python
# Django DEVE rodar na porta 3333
python manage.py runserver 0.0.0.0:3333
```

## 📞 CONTATO DE EMERGÊNCIA

Se você quebrou algo crítico do Spark:

1. **Reverta mudanças** imediatamente
2. **Consulte este documento**
3. **Teste credenciais demo**
4. **Valide que Spark ainda responde**

---

**⚠️ LEMBRE-SE: O Spark é sensível a mudanças na estrutura base. Sempre que possível, adicione funcionalidades sem modificar arquivos existentes. Use a pasta `backend_django/` para desenvolvimento do backend e mantenha o frontend intocado.**