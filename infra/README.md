# Infra - ClimaTrak

Esta pasta contém todos os arquivos de infraestrutura para execução do ClimaTrak em ambiente de desenvolvimento e produção.

## Estrutura

```
infra/
├── docker-compose.yml       # Orquestração de todos os serviços
├── api/
│   └── Dockerfile           # Imagem Docker da API Django
├── emqx/
│   └── default_api_key.conf # Configuração de API keys do EMQX (dev)
├── nginx/
│   └── nginx.conf           # Configuração do reverse proxy
└── scripts/
    ├── init-timescale.sh    # Script de inicialização do TimescaleDB
    └── provision-emqx.sh    # Provisiona EMQX (connectors, rules, actions)
```

## Serviços

| Serviço     | Porta(s)            | Descrição                              |
|-------------|---------------------|----------------------------------------|
| postgres    | 5432                | PostgreSQL 16 + TimescaleDB            |
| redis       | 6379                | Cache e broker Celery                  |
| minio       | 9000 (API), 9001    | Object storage S3-compatible          |
| emqx        | 1883, 8083, 18083   | Broker MQTT                            |
| api         | 8000                | Django API                             |
| worker      | -                   | Celery Worker                          |
| scheduler   | -                   | Celery Beat (scheduler)                |
| nginx       | 80                  | Reverse proxy                          |

## Uso

### Subir todos os serviços

```bash
cd infra
docker-compose up -d
```

### Ou a partir da raiz do projeto

```bash
docker-compose -f infra/docker-compose.yml up -d
```

### Provisionar EMQX

Após os containers estarem no ar, execute:

```bash
./infra/scripts/provision-emqx.sh
```

### Acessos (desenvolvimento)

- **API Django**: http://umc.localhost:8000
- **MinIO Console**: http://localhost:9001 (minioadmin/minioadmin123)
- **EMQX Dashboard**: http://localhost:18083 (admin/public)
- **Redis**: localhost:6379
- **PostgreSQL**: localhost:5432 (app/app)

## Variáveis de Ambiente

As variáveis são lidas do arquivo `backend/.env`. Copie o exemplo:

```bash
cp backend/.env.example backend/.env
```

## Notas

- Em produção, **nunca** use as credenciais padrão
- Configure secrets via vault ou variáveis de ambiente seguras
- O `nginx.conf` está configurado para aceitar `*.localhost` em desenvolvimento
