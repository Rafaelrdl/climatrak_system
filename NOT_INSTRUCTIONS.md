# 🚨 INSTRUÇÕES CRÍTICAS - ARQUIVOS DO SPARK E INTEGRAÇÃO COM DJANGO

## ⚠️ ARQUIVOS QUE **NUNCA** DEVEM SER MODIFICADOS

### 📁 Arquivos Core do Spark (NÃO TOCAR!)

#### `/src/main.tsx`
**STATUS:** 🔒 **PROTEGIDO - NÃO MODIFICAR**
- **Função:** Conecta a aplicação React com o runtime do GitHub Spark
- **Riscos:** Modificar este arquivo quebra completamente a integração com o Spark
- **Conteúdo crítico:** Configurações de montagem do React, providers globais, integração com APIs do Spark

#### `/index.html`
**STATUS:** 🔒 **PROTEGIDO - NÃO MODIFICAR**
- **Função:** Ponto de entrada HTML principal reconhecido pelo Spark
- **Riscos:** Alterações podem quebrar o carregamento da aplicação no ambiente Spark
- **Elementos críticos:**
  - `<div id="root"></div>` - Container principal da aplicação
  - `<script type="module" src="/src/main.tsx">` - Carregamento do módulo principal
  - Meta tags de viewport e charset

#### `/src/main.css`
**STATUS:** 🔒 **PROTEGIDO - NÃO MODIFICAR**
- **Função:** Arquivo de estilos estrutural do Spark
- **Riscos:** Contém estilos críticos para o funcionamento da UI no ambiente Spark
- **Observação:** Este arquivo é mencionado explicitamente como intocável na documentação

### 🔧 Arquivos de Configuração Críticos

#### `/vite.config.ts`
**STATUS:** ⚠️ **CUIDADO EXTREMO**
- **Permitido:** Adicionar plugins específicos (com cuidado)
- **PROIBIDO:** 
  - Alterar configurações de `base`, `build.outDir`
  - Modificar configurações de HMR/dev server que afetem o Spark
  - Remover plugins existentes relacionados ao Spark

#### `/package.json`
**STATUS:** ⚠️ **CUIDADO EXTREMO**
- **Permitido:** Adicionar dependências que não conflitem
- **PROIBIDO:**
  - Alterar scripts `dev`, `build`, `preview` sem validação
  - Modificar `type: "module"` 
  - Remover dependências relacionadas ao Spark

#### `/postcss.config.js`
**STATUS:** ⚠️ **MONITORADO**
- **Função:** Configuração do PostCSS para Tailwind
- **Cuidados:** 
  - Manter sintaxe ES Module (`export default`)
  - Não remover `tailwindcss` e `autoprefixer`
  - Verificar compatibilidade antes de adicionar plugins

### 🎯 Arquivos de Integração com Spark

#### `/src/lib/utils.ts`
**STATUS:** ⚠️ **CUIDADO**
- **Função:** Utilitários do shadcn e helpers de classe
- **Riscos:** Contém funções utilizadas por componentes do Spark

#### `/src/components/ui/*`
**STATUS:** ⚠️ **COMPONENTES PRÉ-INSTALADOS**
- **Função:** Componentes shadcn v4 pré-configurados
- **Cuidados:** Estes componentes são otimizados para o Spark, modificações podem causar problemas

## 🐍 GUIA DE INTEGRAÇÃO DJANGO COM SPARK

### 📋 Princípios Fundamentais

#### 1. **SEPARAÇÃO TOTAL DE RESPONSABILIDADES**
```
frontend/ (Spark Territory - NÃO TOCAR)
├── src/
├── index.html
├── vite.config.ts
├── package.json
└── ...

backend_django/ (Área Segura para Django)
├── manage.py
├── traknor/
├── apps/
├── requirements.txt
└── ...
```

#### 2. **PORTAS E ENDPOINTS FIXOS**
- **Frontend Spark:** Sempre na porta `5173` (gerenciado pelo Spark)
- **Backend Django:** Deve usar porta `3333` (compatibilidade com mock atual)
- **PostgreSQL:** Porta `5432` (padrão)

### 🔒 Regras de Ouro para Django

#### ✅ **PERMITIDO (Área Segura)**

```bash
# Criar estrutura Django em pasta separada
mkdir backend_django/
cd backend_django/

# Instalar dependências Python
pip install django djangorestframework
pip install django-cors-headers
pip install psycopg2-binary

# Configurar Django normalmente
django-admin startproject traknor .
python manage.py startapp accounts
python manage.py startapp companies
# etc...
```

#### ❌ **PROIBIDO (Quebra Integração)**

```bash
# ❌ NUNCA fazer isso:
cd /src  # Não entrar na pasta src
rm index.html  # Não remover arquivos do Spark
npm uninstall vite  # Não remover dependências do Spark
npm run build  # Sem permissão explícita
```

### ⚙️ Configurações Django Seguras

#### settings.py - Configuração CORS
```python
# ✅ CORRETO - Não afeta o Spark
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",  # Spark frontend
    "http://localhost:5001",  # Spark preview
]
CORS_ALLOW_CREDENTIALS = True

# ✅ Configuração segura de API
REST_FRAMEWORK = {
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
    ],
    # Não usar DjangoModelPermissions que podem conflitar
}
```

#### urls.py - Rotas Seguras
```python
# ✅ CORRETO - Prefixo /api não interfere com rotas do Spark
urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('apps.core.urls')),  # Todas as APIs com prefixo
]

# ❌ EVITAR - Rotas sem prefixo podem conflitar
urlpatterns = [
    path('', include('apps.frontend.urls')),  # PERIGOSO!
]
```

### 🚀 Inicialização Segura

#### docker-compose.yml (Recomendado)
```yaml
version: '3.8'
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: traknor
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
  
  backend:
    build: ./backend_django
    ports:
      - "3333:3333"  # Porta fixa para compatibilidade
    depends_on:
      - postgres
    environment:
      - DATABASE_URL=postgres://postgres:postgres@postgres:5432/traknor
      - DJANGO_SETTINGS_MODULE=traknor.settings.dev

# ❌ NÃO incluir serviços que afetem o frontend Spark
```

#### Scripts de Inicialização
```bash
#!/bin/bash
# ✅ start-backend.sh (Seguro)
cd backend_django/
source venv/bin/activate
python manage.py migrate
python manage.py runserver 0.0.0.0:3333

# O Spark gerencia automaticamente o frontend
```

### 🔍 Validação de Integração

#### Checklist de Verificação

```bash
# ✅ Verificar se o Spark ainda funciona
curl http://localhost:5173  # Frontend deve responder
curl http://localhost:3333/api/health  # Backend deve responder

# ✅ Verificar CORS
curl -H "Origin: http://localhost:5173" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: X-Requested-With" \
     -X OPTIONS \
     http://localhost:3333/api/auth/login

# ✅ Verificar logs
tail -f backend_django/logs/django.log
```

### 🛡️ Proteções Adicionais

#### .gitignore para Django
```gitignore
# Área segura do Django
backend_django/
├── *.pyc
├── __pycache__/
├── db.sqlite3
├── media/
├── staticfiles/
└── .env

# ❌ NUNCA ignorar arquivos do Spark sem permissão
# src/
# index.html
# vite.config.ts
```

#### Variáveis de Ambiente
```bash
# .env (backend_django/.env)
DATABASE_URL=postgres://postgres:postgres@localhost:5432/traknor
DJANGO_SECRET_KEY=your-secret-key
DJANGO_DEBUG=True
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5001

# ❌ NÃO criar .env na raiz que possa afetar o Spark
```

### 🔥 Cenários de Emergência

#### 🆘 Erro: Cannot find module 'dep-*.js' (Vite Corrompido)

**Sintoma:**
```
Cannot find module '/workspaces/spark-template/node_modules/vite/dist/node/chunks/dep-CvfTChi5.js'
```

**Causa:** Arquivos internos do Vite corrompidos no node_modules

**Solução IMEDIATA:**
```bash
# Use o script de limpeza do projeto
npm run clean

# Ou manualmente:
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

**Prevenção:**
- ✅ Use `npm ci` em instalações limpas
- ✅ Não interrompa `npm install`
- ✅ Execute `npm run clean` periodicamente se houver problemas
- ❌ Nunca edite arquivos dentro de `node_modules/`

**Verificação:**
```bash
npm list vite  # Deve mostrar vite@6.3.5 sem erros
ls node_modules/vite/dist/node/chunks/  # Deve listar vários dep-*.js
```

📖 **Guia completo**: Veja `TROUBLESHOOTING.md` para mais detalhes

---

#### Se Quebrar a Integração Spark:

1. **Parar imediatamente qualquer alteração**
2. **Reverter commits recentes:**
```bash
git log --oneline  # Verificar últimos commits
git reset --hard HEAD~1  # Voltar 1 commit (cuidado!)
```

3. **Verificar arquivos críticos:**
```bash
git status
git diff HEAD~1 src/main.tsx
git diff HEAD~1 index.html
git diff HEAD~1 vite.config.ts
```

4. **Testar funcionalidade básica:**
```bash
npm run dev  # Deve iniciar sem erros
# Abrir http://localhost:5173
```

### 📚 Recursos de Referência

#### Documentação Oficial Spark
- GitHub Spark Docs (consultar sempre antes de mudanças)
- Vite.js Documentation (para configurações seguras)
- shadcn/ui Documentation (para componentes)

#### Padrões de Código Seguros
- Sempre usar TypeScript no frontend
- Sempre usar Python/Django no backend
- Nunca misturar tecnologias nas pastas erradas

### 🎯 Resumo das Regras de Ouro

| ✅ PERMITIDO | ❌ PROIBIDO |
|--------------|-------------|
| Criar `backend_django/` | Modificar `src/main.tsx` |
| Adicionar dependências Python | Remover dependências npm do Spark |
| Configurar Django/PostgreSQL | Alterar `index.html` |
| Criar APIs REST em `/api` | Criar rotas frontend sem prefixo |
| Usar porta 3333 para Django | Usar porta 5173 para Django |
| Configurar CORS corretamente | Desabilitar CORS |
| Logs de debugging Django | Logs que interferem no Spark |

### 📞 Em Caso de Dúvidas

1. **Sempre consultar esta documentação primeiro**
2. **Testar em ambiente de desenvolvimento isolado**
3. **Fazer backup antes de alterações críticas**
4. **Validar que o Spark continua funcionando após cada mudança**

---

**⚠️ LEMBRE-SE:** O GitHub Spark gerencia automaticamente o frontend. Nossa responsabilidade é **APENAS** o backend Django, mantendo total compatibilidade com a interface existente.