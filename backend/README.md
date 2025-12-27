# TrakSense / ClimaTrak Backend

Backend multi-tenant para monitoramento HVAC/IoT com Django REST Framework, TimescaleDB, MQTT e Celery.

## 🏗️ Arquitetura

- **Framework**: Django 5 + Django REST Framework
- **Multi-tenancy**: `django-tenants` com schema PostgreSQL por tenant
- **Database**: PostgreSQL 16 + TimescaleDB para séries temporais
- **Cache/Broker**: Redis
- **Storage**: MinIO (S3-compatible)
- **MQTT**: EMQX para ingestão de telemetria
- **Tasks**: Celery + Celery Beat
- **Email**: Mailpit (desenvolvimento)
- **Proxy**: Nginx
- **Docs**: OpenAPI 3 com drf-spectacular

## 🚀 Quick Start

### Pré-requisitos

- Docker & Docker Compose
- Make (opcional, mas recomendado)

### 1. Clone e Configure

```bash
# Clone o repositório
git clone <repo-url>
cd traksense-backend

# Copie o arquivo de ambiente
cp .env.example .env

# (Opcional) Ajuste as variáveis no .env
```

### 2. Inicie os Serviços

```bash
# Usando Make (recomendado)
make dev

# Ou diretamente com docker compose
docker compose -f docker/docker-compose.yml up -d
```

### 3. Execute Migrações e Seed

```bash
# Migrações (cria schemas de tenant)
make migrate

# Seed de desenvolvimento (cria tenant + usuário)
make seed
```

### 4. Provisionar EMQX (Rule Engine)

```bash
# Windows (PowerShell) - dê permissão de execução primeiro se necessário
bash docker/scripts/provision-emqx.sh

# Linux/Mac
chmod +x docker/scripts/provision-emqx.sh
./docker/scripts/provision-emqx.sh
```

Este script configura automaticamente:
- **Connector HTTP** para o backend Django
- **Action HTTP** que encaminha mensagens MQTT para `POST /ingest`
- **Rule SQL** que captura publicações em `tenants/{slug}/#`
- **Authorization rules** (dev) permitindo apenas tópicos do tenant

### 5. Acesse a Aplicação

- **API**: http://localhost
- **Swagger Docs**: http://localhost/api/docs/
- **ReDoc**: http://localhost/api/redoc/
- **Health Check**: http://localhost/health

**Tenant de Desenvolvimento:**
- **URL**: http://umc.localhost
- **Email**: owner@umc.localhost
- **Password**: Dev@123456

**Serviços Auxiliares:**
- **MinIO Console**: http://localhost:9001 (minioadmin / minioadmin123)
- **EMQX Dashboard**: http://localhost:18083 (admin / public)
- **Mailpit UI**: http://localhost:8025
- **PostgreSQL**: localhost:5432 (app / app / app)
- **Redis**: localhost:6379

> **💡 Dica EMQX**: Após provisionar, acesse o Dashboard em http://localhost:18083 para visualizar o Connector, Action e Rule criados. Use `admin/public` para login (dev).

## 📋 Comandos Make

```bash
make help      # Mostra todos os comandos disponíveis
make dev       # Inicia todos os serviços
make stop      # Para todos os serviços
make migrate   # Executa migrações do banco
make seed      # Popula dados de desenvolvimento
make check     # Valida health checks e configuração
make fmt       # Formata código (black + isort)
make lint      # Executa linters (ruff)
make test      # Executa testes (futuro)
make ci        # Executa lint + test
make clean     # Remove volumes e cache
```

## 🗄️ Estrutura do Projeto

```
traksense-backend/
├── apps/
│   ├── tenants/          # Multi-tenancy (Tenant, Domain)
│   ├── accounts/         # Usuários e autenticação (Fase 1)
│   ├── common/           # Utilitários compartilhados
│   └── ...               # Outros apps (fases futuras)
├── config/
│   ├── settings/         # Configurações Django
│   ├── urls.py           # Rotas principais
│   ├── wsgi.py           # WSGI entry point
│   ├── asgi.py           # ASGI entry point
│   └── celery.py         # Configuração Celery
├── docker/
│   ├── docker-compose.yml
│   ├── api/Dockerfile
│   ├── nginx/nginx.conf
│   └── scripts/
├── docs/                 # 📚 Documentação organizada (37 arquivos)
│   ├── fases/           # Documentação de fases do projeto
│   ├── implementacao/   # Detalhes técnicos de implementação
│   ├── guias/           # Guias práticos e tutoriais
│   ├── emqx/            # Documentação EMQX/MQTT
│   ├── validacoes/      # Validações e relatórios
│   ├── bugfixes/        # Correções documentadas
│   └── README.md        # Índice de documentação
├── scripts/             # 🔧 Scripts utilitários (63 arquivos)
│   ├── tests/          # Scripts de teste (29)
│   ├── setup/          # Scripts de configuração (12)
│   ├── verification/   # Scripts de verificação (9)
│   ├── utils/          # Scripts diversos (9)
│   ├── maintenance/    # Scripts de manutenção (4)
│   └── README.md       # Índice de scripts
├── .env.example
├── requirements.txt
├── manage.py
├── Makefile
├── INDEX.md            # 📖 Índice geral de navegação
└── README.md
```

> **📖 Navegação**: Consulte o [INDEX.md](INDEX.md) para um guia completo de toda a documentação e scripts organizados.

## 🔧 Desenvolvimento

### Acessar Shell do Django

```bash
docker compose -f docker/docker-compose.yml exec api python manage.py shell
```

### Criar Novo App

```bash
docker compose -f docker/docker-compose.yml exec api python manage.py startapp <app_name> apps/<app_name>
```

### Ver Logs

```bash
# Todos os serviços
docker compose -f docker/docker-compose.yml logs -f

# Serviço específico
docker compose -f docker/docker-compose.yml logs -f api
docker compose -f docker/docker-compose.yml logs -f worker
```

### Executar Comandos Custom

```bash
docker compose -f docker/docker-compose.yml exec api python manage.py <comando>
```

## 🧪 Testes

```bash
# Executar todos os testes (quando implementados)
make test

# Com cobertura
docker compose -f docker/docker-compose.yml exec api pytest --cov=apps
```

## 📚 API Documentation

A documentação da API está disponível em múltiplos formatos:

- **Swagger UI**: http://localhost/api/docs/
- **ReDoc**: http://localhost/api/redoc/
- **OpenAPI Schema**: http://localhost/api/schema/

## 🔐 Multi-Tenancy

O sistema usa `django-tenants` com **schema por tenant**:

1. Cada tenant tem seu próprio schema PostgreSQL
2. Dados completamente isolados entre tenants
3. Roteamento por domínio/subdomain (ex: `umc.localhost`)

### Criar Novo Tenant (Produção)

```python
from apps.tenants.models import Tenant, Domain

# Criar tenant
tenant = Tenant.objects.create(
    name="ACME Corp",
    slug="acme-corp",
    schema_name="acme_corp"
)

# Criar domain
Domain.objects.create(
    domain="acme.traksense.com",
    tenant=tenant,
    is_primary=True
)
```

## 🐛 Troubleshooting

### Erro: "relation does not exist"

```bash
# Execute as migrações
make migrate
```

### Erro: MinIO health check failed

```bash
# Aguarde alguns segundos para MinIO iniciar
# Ou reinicie o serviço
docker compose -f docker/docker-compose.yml restart minio
```

### Erro: Cannot resolve umc.localhost

**Opção 1 - Usar localhost com header:**
```bash
curl -H "Host: umc.localhost" http://localhost/health
```

**Opção 2 - Adicionar ao hosts (Windows):**
```
# C:\Windows\System32\drivers\etc\hosts
127.0.0.1 umc.localhost
```

**Opção 3 - Adicionar ao hosts (Linux/Mac):**
```
# /etc/hosts
127.0.0.1 umc.localhost
```

### Erro: TimescaleDB extension not found

```bash
# Conectar ao banco e criar extensão manualmente
docker compose -f docker/docker-compose.yml exec postgres psql -U app -d app -c "CREATE EXTENSION IF NOT EXISTS timescaledb;"
```

### Erro: EMQX provisioning falhou

```bash
# Verifique se o EMQX está rodando
docker compose -f docker/docker-compose.yml ps emqx

# Verifique os logs do EMQX
docker compose -f docker/docker-compose.yml logs emqx

# Aguarde alguns segundos para o EMQX iniciar completamente
sleep 10

# Execute o provisionamento novamente
bash docker/scripts/provision-emqx.sh
```

## 📡 EMQX & MQTT

O TrakSense usa EMQX como broker MQTT para ingestão de telemetria IoT.

### Fluxo de Dados

```
Dispositivo IoT → Publica MQTT → EMQX (broker)
                                    ↓
                              Rule Engine (SQL)
                                    ↓
                              HTTP Action (POST)
                                    ↓
                              Django API (/ingest)
```

### Tópicos MQTT

O padrão de tópicos segue a estrutura multi-tenant:

```
tenants/{tenant_slug}/devices/{device_id}/sensors/{sensor_type}
```

**Exemplos:**
- `tenants/umc/devices/hvac-001/sensors/temperature`
- `tenants/umc/devices/hvac-001/sensors/humidity`
- `tenants/acme/devices/chiller-42/sensors/pressure`

### Publicando Mensagens (Teste)

Você pode testar a ingestão usando qualquer cliente MQTT:

```bash
# Usando mosquitto_pub (instalar: apt install mosquitto-clients)
mosquitto_pub -h localhost -p 1883 \
  -t "tenants/umc/devices/test-001/sensors/temperature" \
  -m '{"value": 23.5, "unit": "celsius", "timestamp": "2025-10-17T10:30:00Z"}'
```

### Verificando Regras no Dashboard

1. Acesse http://localhost:18083 (admin / public)
2. Navegue até **Integration → Rules**
3. Você verá a regra `r_umc_ingest` com:
   - **SQL**: `SELECT clientid as client_id, topic, payload, timestamp as ts FROM "tenants/umc/#"`
   - **Action**: HTTP POST para `http://api:8000/ingest`
   - **Status**: Enabled ✅

### API Keys (Produção)

Em produção, configure API Keys seguras:

```bash
# Gere uma API key forte
openssl rand -base64 32

# Atualize docker/emqx/default_api_key.conf (não versionar)
prod-provisioner:SUA_API_KEY_FORTE:administrator

# Configure no .env
EMQX_API_KEY=prod-provisioner
EMQX_API_SECRET=SUA_API_KEY_FORTE
```

## 🎛️ Control Center (Staff-Only)

O TrakSense inclui um **Control Center interno** acessível apenas para usuários staff. Este painel permite consultar e monitorar telemetria de **todos os tenants** a partir de uma interface centralizada.

### Acesso

- **URL**: http://localhost:8000/ops/
- **Atalho**: Botão "🎛️ Control Center" na barra lateral do Django Admin
- **Permissão**: Requer `is_staff=True` (staff member)
- **Schema**: Executa exclusivamente no schema `public`

### Funcionalidades

#### 1. Home - Seletor de Tenant e Filtros

Na página inicial (`/ops/`), você encontra:

- **Seletor de Tenant**: Lista todos os tenants cadastrados
- **Filtros de Telemetria**:
  - `device_id`: Filtrar por ID do dispositivo (opcional)
  - `sensor_id`: Filtrar por ID do sensor (opcional)
  - `from`: Timestamp ISO-8601 de início (opcional)
  - `to`: Timestamp ISO-8601 de fim (opcional)
  - `bucket`: Agregação temporal (1m, 5m, 1h)
  - `limit`: Resultados por página (padrão: 200, máx: 1000)

#### 2. Telemetry List - Resultados Agregados

Após submeter o formulário, você é redirecionado para `/ops/telemetry` com:

- **Tabela paginada** mostrando buckets agregados de tempo
- **Métricas por bucket**: avg, min, max, last, count
- **Paginação**: Navegação por offset/limit
- **Export CSV**: Botão para exportar resultados (POST com CSRF)
- **Drill-down**: Botão por linha para inspecionar sensor específico

**Exemplo de URL:**
```
http://localhost:8000/ops/telemetry?tenant_slug=uberlandia_medical_center&sensor_id=temp_01&bucket=1m&limit=200
```

#### 3. Drill-down - Leituras Raw

Ao clicar em "Drill-down" em uma linha, você acessa `/ops/telemetry/drilldown`:

- **Últimas N leituras** do sensor selecionado (padrão: 500, máx: 1000)
- **Estatísticas gerais**: Total de leituras, avg, min/max, range temporal
- **Tabela detalhada**: Timestamp preciso, device_id, sensor_id, value, labels (JSON)
- **Isolamento por schema**: Usa `schema_context(tenant)` para consultar o schema correto

**Exemplo de URL:**
```
http://localhost:8000/ops/telemetry/drilldown?tenant_slug=uberlandia_medical_center&sensor_id=temp_01&device_id=device_001
```

### Segurança e Isolamento

#### Proteção por Staff

Todas as views do Control Center usam o decorator `@staff_member_required`:

```python
from django.contrib.admin.views.decorators import staff_member_required

@staff_member_required  # Equivalente ao check do admin
def index(request):
    # ...
```

Se um usuário **não-staff** tentar acessar `/ops/`, será redirecionado para a página de login.

#### Middleware de Bloqueio

O middleware `BlockTenantOpsMiddleware` garante que `/ops/` **não seja acessível** via domínios de tenant:

```python
# apps/common/middleware.py
class BlockTenantOpsMiddleware:
    def __call__(self, request):
        if request.path.startswith("/ops/"):
            schema_name = getattr(connection, "schema_name", None)
            if schema_name and schema_name != "public":
                return HttpResponseNotFound()  # 404 se não for public
        return self.get_response(request)
```

**Resultado:**
- ✅ `http://localhost:8000/ops/` → Funciona (public schema)
- ❌ `http://umc.localhost:8000/ops/` → 404 (tenant schema)

#### Consultas com `schema_context`

O painel usa `schema_context` para executar queries SQL **no schema do tenant selecionado**, mantendo isolamento correto:

```python
from django_tenants.utils import schema_context, get_tenant_model

tenant = Tenant.objects.get(slug=tenant_slug)

with schema_context(tenant.schema_name):
    # Queries aqui executam no schema do tenant
    cursor.execute("SELECT * FROM reading WHERE sensor_id = %s", [sensor_id])
    rows = cursor.fetchall()
```

**Referências:**
- `schema_context`: https://django-tenants.readthedocs.io/en/latest/use.html
- `@staff_member_required`: https://docs.djangoproject.com/en/5.2/topics/auth/default/

#### CSRF Protection

Todos os formulários incluem `{% csrf_token %}` e o middleware `CsrfViewMiddleware` está ativo:

```django
<form method="post" action="{% url 'ops:telemetry_export_csv' %}">
    {% csrf_token %}
    <!-- campos do formulário -->
</form>
```

### Fluxo de Uso

1. **Login**: Acesse `http://localhost:8000/admin/` e faça login com usuário staff
2. **Control Center**: Clique no botão "🎛️ Control Center" na barra lateral do Admin ou navegue para `http://localhost:8000/ops/`
3. **Selecione Tenant**: Escolha tenant no dropdown (ex: "Uberlândia Medical Center")
4. **Defina Filtros**: Opcional - device_id, sensor_id, time range, bucket
5. **Query**: Clique em "Query Telemetry"
6. **Visualize**: Veja resultados agregados em tabela paginada
7. **Drill-down**: Clique em botão "Drill-down" para inspecionar sensor específico
8. **Export**: Clique em "Export CSV" para baixar dados (POST com CSRF)

### Exemplo de Criação de Usuário Staff

Para criar um usuário staff com acesso ao painel:

```bash
# Via shell Django
docker exec -it traksense-api python manage.py shell

# No shell Python
from apps.accounts.models import User
user = User.objects.create_user(
    email='ops@traksense.com',
    password='StrongOpsPassword123!',
    first_name='Ops',
    last_name='Team',
    is_staff=True,  # Requerido para acesso ao painel
    is_superuser=False  # Opcional
)
user.save()
```

### Limitações e Considerações

- **Performance**: Queries agregadas em tempo real (sem Continuous Aggregates materializadas no Apache OSS). Para datasets muito grandes (>10M rows), considere criar materialized views manualmente.
- **Paginação**: Count total aproximado para evitar overhead. Para milhões de buckets, a paginação pode ser lenta.
- **Export CSV**: Limitado a 10.000 registros por export para evitar timeouts.
- **Drill-down**: Mostra últimas 1.000 leituras por padrão. Para análises mais profundas, use ferramentas de BI ou Jupyter notebooks.

### Próximos Passos (Melhorias Futuras)

- [ ] **Grupos de Permissão**: Criar grupo `traksense_ops` além de `is_staff`
- [ ] **Visualizações**: Integrar Chart.js para gráficos de linha em drill-down
- [ ] **Alertas**: Monitorar e destacar sensores com valores anômalos
- [ ] **Logs de Auditoria**: Registrar acessos ao painel (quem, quando, qual tenant)
- [ ] **API Interna**: Endpoint JSON para consumo programático (ex: scripts de monitoramento)

### Segurança EMQX (Produção)

Para ambiente de produção, ajuste no `docker-compose.yml`:

```yaml
environment:
  EMQX_ALLOW_ANONYMOUS: "false"        # Requer autenticação
  EMQX_NODE__COOKIE: "<cookie-forte>"  # Cookie Erlang único
  EMQX_LOADED_PLUGINS: "emqx_auth_http,emqx_management,emqx_dashboard"
```

E configure authentication externa (JWT/HTTP):
- **JWT**: Tokens assinados pelo backend Django
- **HTTP**: Callback para endpoint Django de autenticação
- **Database**: PostgreSQL com credenciais por dispositivo

## 🔄 Próximas Fases

- [x] **Fase 0**: Fundação (multi-tenant + infra)
- [ ] **Fase 1**: Auth & Usuário (JWT, login, perfil)
- [ ] **Fase 2**: Equipe & Convites (memberships, roles)
- [ ] **Fase 3**: Catálogo (sites, assets, devices, sensors)
- [ ] **Fase 4**: Telemetria (ingestão MQTT, queries)
- [ ] **Fase 5**: Regras & Alertas (rules engine)
- [ ] **Fase 6**: Dashboards & Widgets (visualização)
- [ ] **Fase 7**: Relatórios (PDF/CSV)
- [ ] **Fase 8**: Notificações (email, webhooks)

## 📝 License

[Incluir licença apropriada]

## 👥 Contributing

[Incluir guidelines de contribuição]
