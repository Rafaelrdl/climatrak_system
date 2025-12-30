---
applyTo: "frontend/**"
---

# Frontend Instructions — ClimaTrak Platform (Design-System First)

## Regra nº 1 (obrigatória)
Toda implementação/alteração de UI/UX DEVE seguir o Design System do projeto:
- **Fonte da verdade:** `docs/design/DESIGN_SYSTEM.md`

Se houver dúvida ou conflito entre “como fazer” e “como está no design”, priorize o **DESIGN_SYSTEM.md**.

---

## Filosofia: Plataforma (não website)
- Layout **platform-first** (uso contínuo 8+ horas/dia).
- Priorizar **desktop-first** e **ultrawide-ready**.
- Evitar “páginas longas com scroll” como padrão. Preferir:
  - viewport fixo (100vh), contexto permanente (header/nav), painéis, tabs, modais, drawers.
- Densidade de informação alta, mas legível (tipografia e espaçamento padronizados).

---

## Layout e Responsividade (obrigatório)
- Respeitar o modelo de layout: Header fixo + Workspace + painéis laterais quando aplicável.
- Breakpoints e comportamento devem seguir o DESIGN_SYSTEM:
  - mobile/tablet: stacks/drawers
  - desktop/wide/ultrawide/superwide/4k: grids densos e multi-painel
- Evitar truncamento de texto em navs/menus:
  - quando necessário, usar overflow dinâmico (ex.: menu “More”) conforme descrito no Design System.

---

## Componentes e UI Kit (padrão único)
- Usar **shadcn/ui + Radix UI** como base de componentes.
- Tailwind CSS para estilização, seguindo tokens/cores/spacing do Design System.
- Ícones: **Lucide**.
- Gráficos: **Recharts**.
- Para variantes de classes: usar `cva()` quando aplicável.
- Para merge de classes: usar `cn()`.

### Regra de ouro
Se já existir um componente equivalente (ex.: DataTable, Modal, Card, Badge, KPI), **reutilize**.
Não crie um novo padrão visual “do zero”.

---

## Padrões visuais (não negociar)
Para qualquer tela nova ou componente novo:
- Tipografia e tamanhos: seguir escala do Design System (densidade e leitura prolongada).
- Espaçamentos: consistentes (grid/gap/padding). Evitar espaçamentos aleatórios.
- Cores e status:
  - respeitar paleta e estados (`online`, `warning`, `critical`, `offline`) conforme Design System.
- Microinterações:
  - transições leves (sem lag), feedback imediato (loading/disabled/success/error).
- Acessibilidade mínima:
  - labels, foco visível, navegação por teclado, aria quando necessário.

---

## Experiência de dados (telas densas e performáticas)
- Tabelas e listas devem suportar:
  - loading/empty/error states consistentes
  - paginação server-side quando o endpoint suportar
  - filtros (mínimo: search + filtros principais)
- Quando houver listas grandes (> 100 itens visíveis):
  - considerar **virtualização** (ex.: react-window), conforme Design System.
- Charts:
  - não “lotar” a tela: permitir alternância de séries quando necessário,
  - manter legendas claras e padrão de cores/status.

---

## Arquitetura do Frontend
- Organizar por **capabilidades do sistema único** (não separar em “dois produtos”):
  - Finance, CMMS, Monitor e Shared UI/Infra.
- Preferir estrutura por features:
  - `src/features/<dominio>/...` (ou `src/apps/<dominio>/...` se já for o padrão do repo)
- Camada API:
  - services tipados por domínio em `src/services/`
  - React Query para fetch/cache, com `queryKey` factories e invalidation correta.

---

## Integração Finance/CMMS/Monitor (consistência)
Ao criar telas Finance, CMMS ou Monitor:
- manter navegação e layout consistentes (mesmo header/nav/painéis)
- usar mesmos componentes base (MoneyCell, DeltaBadge, MonthPicker, DataTable, etc.)
- garantir deep-links (ex.: clicar em custo → abrir OS/Ativo/Alerta correspondente)

---

## Checklist obrigatório antes de finalizar uma entrega UI
- [ ] Seguiu `docs/design/DESIGN_SYSTEM.md`
- [ ] Plataforma (não website): sem scroll indevido e com contexto permanente
- [ ] Responsivo (desktop/wide/ultrawide) sem quebrar layout
- [ ] Estados: loading/empty/error + feedback de ações
- [ ] RBAC/ACL respeitado (UI + backend)
- [ ] Sem duplicar componentes existentes (reuso antes de criar)
- [ ] Performance ok (virtualização se necessário)

---

## Como o Copilot deve agir ao implementar UI
1) Identificar a tela/feature e consultar `docs/design/DESIGN_SYSTEM.md`
2) Reutilizar o máximo de componentes existentes
3) Se precisar criar componente:
   - colocá-lo em shared UI (onde o repo define) e documentar uso
4) Propor rapidamente um “plano de arquivos” antes de escrever muito código
5) Entregar com exemplos de testes/validação manual (passos)
