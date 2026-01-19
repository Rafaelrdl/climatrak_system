# 🌐 Visão Geral — ClimaTrak Tecnologia Ltda.

**Transformando ativos em inteligência operacional.**

## 1) O que é a ClimaTrak

A **ClimaTrak** é uma plataforma de tecnologia que integra **CMMS (manutenção)**, **monitoramento IoT/HVAC** e **gestão financeira da operação (Orçamento Vivo)** para dar visibilidade, controle e rastreabilidade ao ciclo completo:

**dado → alerta → ação (OS) → evidência → custo → aprendizado**.

O foco inicial do produto é HVAC (climatização e refrigeração), mas a arquitetura suporta evolução para diferentes tipos de ativos e operações.

---

## 2) Missão, visão e valores

### Missão
**Democratizar o acesso à gestão de ativos com visibilidade, controle e decisão baseada em dados.**

### Visão
**Ser a plataforma de referência em gestão HVAC na América Latina, reconhecida pela inovação e impacto real.**

### Valores
- **Foco no cliente**: cada decisão parte de uma pergunta simples — isso melhora a operação do cliente?
- **Inovação aplicada**: tecnologia com impacto real em custo, confiabilidade e compliance.
- **Parceria**: não somos apenas fornecedores; somos parceiros no resultado.
- **Excelência**: qualidade no produto, no suporte e na evolução contínua.

---

## 3) O que o software é hoje (módulos reais)

O ClimaTrak é um **ecossistema único**, com quatro módulos principais na web e um app mobile para campo:

| Módulo | O que entrega | Rota web |
| --- | --- | --- |
| **TrakNor (CMMS)** | Ativos, OS, planos, inventário, execução e evidências | `/cmms` |
| **TrakSense (Monitor)** | Telemetria, dashboards, alertas e regras | `/monitor` |
| **TrakLedger (Finance)** | Orçamento Vivo: planejado/comprometido/realizado + savings | `/finance` |
| **TrakService (Field Service)** | Feature-gated: dispatch/tracking/rotas/quotes | `/trakservice` |

### Mobile (técnicos de campo)
O app **ClimaTrak Mobile** é **offline-first** e suporta:
- gestão de OS (iniciar, concluir, cancelar)
- consulta de ativos (nome/tag/QR code)
- alertas e reconhecimento
- sincronização com idempotência

---

## 4) Problemas que resolve

Em muitas operações de manutenção (especialmente HVAC), a gestão ainda é fragmentada: planilhas, WhatsApp, documentos soltos e pouca rastreabilidade. Isso gera:

- **não conformidade** por falta de evidência e padronização (ex.: rotinas, relatórios, anexos)
- **retrabalho** (OS incompleta, histórico inconsistente, execução sem checklist)
- baixa visibilidade do **custo real por OS/ativo**
- dificuldade em conectar **falha → causa → ação → custo**
- pouca integração entre **telemetria** e a rotina de manutenção

---

## 5) Público-alvo e segmentos

- empresas de manutenção predial e industrial
- hospitais, clínicas, laboratórios e ambientes críticos
- shoppings, grandes centros comerciais e operação multi-site
- indústrias com parque fabril climatizado
- facilities, condomínios e edifícios corporativos
- gestores de manutenção/operacional e financeiro (controller/gestão de custos)

---

## 6) Diferenciais competitivos (como o produto se sustenta)

- **Plataforma integrada (CMMS + IoT + Finance):** o que acontece no campo vira dado, evidência e custo rastreável.
- **Multi-tenant com isolamento por schema:** pensado para operar com múltiplas organizações com separação real de dados.
- **Eventos com Transactional Outbox:** base para automações seguras e consumidores idempotentes.
- **Pipeline IoT robusto:** MQTT (EMQX) → HTTP `/ingest` → normalização e leitura time-series.
- **Operação de campo de verdade:** mobile offline-first com sync e idempotência.
- **Observabilidade pronta para escala:** logs com contexto, métricas e tracing documentados em `docs/observability/*`.

---

## 7) Arquitetura em alto nível (visão técnica)

### Multi-tenancy (não negociável)
- Cada tenant roda em **schema PostgreSQL isolado** (`django-tenants`).
- O contexto do tenant precisa estar presente em toda leitura/escrita para evitar contaminação entre clientes.

### Ingest e telemetria (TrakSense)
- Dispositivos publicam em MQTT (EMQX).
- O Rule Engine do EMQX chama o backend via `POST /ingest`.
- O `/ingest` valida tenant + assinatura (HMAC) + anti-replay antes de gravar dados e disparar efeitos (ex.: alertas).

### Eventos (Outbox)
- Mudanças relevantes (ex.: fechamento de OS, criação de custos, eventos operacionais) geram **OutboxEvent**.
- Consumidores devem ser **idempotentes** e reprocessáveis sem duplicar efeitos.

### Finance (TrakLedger)
- O **Ledger** é a fonte de verdade (lançamentos).
- Idempotência é requisito para geração automática de custos (por OS/estoque/mão de obra) e reprocessamentos.
- Períodos fechados não são editados: correções devem ser via ajustes.

---

## 8) Conformidade e PMOC

A ClimaTrak apoia a **organização, execução e rastreabilidade** de rotinas de manutenção e conformidade (ex.: PMOC e qualidade do ar), oferecendo:
- padronização de execução (checklists/procedimentos)
- evidências (fotos, anexos, histórico)
- relatórios e trilha de auditoria

> Importante: o software **apoia a conformidade**, mas não substitui responsabilidade técnica e exigências formais de auditoria.

---

## 9) Resultados esperados (sem promessas irreais)

- redução de falhas recorrentes via histórico confiável e execução padronizada
- melhoria de SLA e produtividade (tempo de resposta e resolução)
- maior previsibilidade por integração entre telemetria e rotina de manutenção
- controle de custo por OS/ativo/categoria (base para ROI e decisões)
- auditorias mais simples por evidências e rastreabilidade

---

## 10) Links úteis dentro do repo

- APIs: `docs/api/*`
- Eventos: `docs/events/*`
- Finance: `docs/finance/*`
- Observabilidade: `docs/observability/*`
- Operações (EMQX/sensores/admin): `docs/operations/*`
- Segurança (storage policy): `docs/security/storage-policy.md`
