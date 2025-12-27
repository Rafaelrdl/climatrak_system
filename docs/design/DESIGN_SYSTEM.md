# 📋 Design System - Climatrak Platform

> **DOCUMENTO DE REFERÊNCIA PARA IA E DESENVOLVIMENTO**
> Este arquivo deve ser consultado sempre que houver dúvidas sobre cores, componentes, espaçamentos, tipografia, padrões visuais ou qualquer decisão de design das plataformas Climatrak (TrakSense HVAC & TrakNor CMMS).

---

## 🏷️ METADADOS DO DOCUMENTO

```yaml
documento: Design System Climatrak Platform
versão: 2.0.0
atualizado: 2025-01-24
plataformas: [TrakSense HVAC, TrakNor CMMS]
tecnologias: [React, TypeScript, Tailwind CSS, Recharts, Lucide Icons]
frameworks_ui: [shadcn/ui, Radix UI, @dnd-kit]
tipo: Platform Design (não website)
otimizado_para: [Desktops, Ultrawide, Tablets, TVs industriais]
consulta_ia: true
prioridade: crítica
```

---

## 📑 ÍNDICE DE NAVEGAÇÃO RÁPIDA

| Seção | Conteúdo | Tags |
|-------|----------|------|
| [1. Filosofia Platform-First](#1-filosofia-platform-first) | Conceito de plataforma vs website | `platform`, `app`, `saas` |
| [2. Sistema de Responsividade](#2-sistema-de-responsividade) | Breakpoints, ultrawide, dinâmica | `responsive`, `ultrawide`, `dynamic` |
| [3. Layout de Plataforma](#3-layout-de-plataforma) | Estrutura, navegação, containers | `layout`, `navigation`, `grid` |
| [4. Identidade Visual](#4-identidade-visual) | Cores, tipografia, temas | `colors`, `typography`, `themes` |
| [5. Componentes de Interface](#5-componentes-de-interface) | Widgets, cards, modais | `components`, `widgets`, `modals` |
| [6. Sistema de Navegação](#6-sistema-de-navegação) | Navbar dinâmica, responsiva | `navbar`, `navigation`, `overflow` |
| [7. Widgets e Dashboards](#7-widgets-e-dashboards) | Sistema de widgets, grid adaptativo | `widgets`, `dashboard`, `grid` |
| [8. Microinterações](#8-microinterações) | Animações, transições, feedback | `animations`, `transitions` |
| [9. Padrões de Dados](#9-padrões-de-dados) | Visualizações, gráficos, métricas | `charts`, `data`, `metrics` |
| [10. Acessibilidade](#10-acessibilidade) | WCAG, ARIA, navegação | `a11y`, `accessibility` |
| [11. Performance](#11-performance) | Otimizações, métricas | `performance`, `optimization` |

---

## 1. Filosofia Platform-First

### 1.1 Plataforma vs Website

> **FUNDAMENTAL:** Climatrak é uma **PLATAFORMA DE MONITORAMENTO**, não um website. Isso significa:

| Aspecto | Website | **Plataforma (Climatrak)** |
|---------|---------|---------------------------|
| **Uso** | Visitas ocasionais | Uso contínuo (8+ horas/dia) |
| **Layout** | Scroll vertical | **Viewport fixo, sem scroll** |
| **Conteúdo** | Páginas múltiplas | **Single-page, multi-view** |
| **Navegação** | Links e menus | **Tabs, painéis, modais** |
| **Densidade** | Espaçado, marketing | **Compacto, informação densa** |
| **Responsividade** | Mobile-first | **Desktop-first, ultrawide ready** |

### 1.2 Princípios de Design de Plataforma

```yaml
princípios:
  - viewport_fixo: "100vh sempre, sem scroll vertical na página principal"
  - informação_densa: "Máximo de dados visíveis sem comprometer legibilidade"
  - contexto_permanente: "Header e navegação sempre visíveis"
  - multi_monitor: "Suporte para setups com múltiplos monitores"
  - real_time: "Atualizações sem refresh de página"
  - professional: "Interface corporativa, não marketing"
```

---

## 2. Sistema de Responsividade

### 2.1 Breakpoints Otimizados para Plataforma

> **NOVO:** Sistema híbrido com breakpoints fixos + adaptação dinâmica

| Breakpoint | Valor | Dispositivo | Comportamento |
|------------|-------|-------------|---------------|
| `mobile` | < 640px | Smartphones | Drawer lateral, stack vertical |
| `tablet` | 640-1023px | Tablets | Interface compacta, 2 colunas |
| `desktop` | 1024-1439px | Desktop padrão | Layout completo, 3-4 colunas |
| `wide` | 1440-1919px | Desktop wide | Layout expandido, 4-6 colunas |
| `ultrawide` | 1920-2559px | Full HD/2K | Multi-painel, 6-8 colunas |
| `superwide` | 2560-3839px | QHD/Ultrawide | Layout dividido, até 12 colunas |
| `4k` | ≥ 3840px | 4K/TV industrial | Maximum density, 12+ colunas |

### 2.2 Sistema de Responsividade Dinâmica

**Implementação Real (TrakNor):**

```typescript
// Sistema dinâmico que adapta baseado no conteúdo real
const useNavbarOverflow = () => {
  // Mede largura real de cada item
  // Calcula quantos cabem considerando espaço disponível
  // Ajusta dinamicamente sem quebras bruscas
  // Zero truncamento de texto
};
```

**Vantagens:**
- ✅ Adapta-se a qualquer largura (320px → 5120px)
- ✅ Sem texto cortado ou truncado
- ✅ Transições suaves entre estados
- ✅ Uso otimizado do espaço

### 2.3 Layout para Ultrawide

```css
/* Container Ultrawide - ocupa toda largura útil */
.platform-container {
  width: 100%;
  height: 100vh;
  display: grid;
  grid-template-columns: auto 1fr auto;
  grid-template-rows: auto 1fr auto;
  overflow: hidden;
}

/* Grid adaptativo para ultrawide */
@media (min-width: 2560px) {
  .dashboard-grid {
    display: grid;
    grid-template-columns: repeat(12, 1fr);
    gap: 16px;
    padding: 16px;
  }
  
  .widget-small { grid-column: span 2; }
  .widget-medium { grid-column: span 4; }
  .widget-large { grid-column: span 6; }
  .widget-full { grid-column: span 12; }
}

/* Divisão inteligente para 32:9 */
@media (min-width: 3840px) {
  .platform-split {
    display: grid;
    grid-template-columns: 2fr 3fr 2fr;
  }
  
  .panel-left { /* Navegação e filtros */ }
  .panel-center { /* Conteúdo principal */ }
  .panel-right { /* Detalhes e ferramentas */ }
}
```

---

## 3. Layout de Plataforma

### 3.1 Estrutura Base (100vh, sem scroll)

```
┌────────────────────────────────────────────────────────────────┐
│ HEADER (64px) - Fixo, sempre visível                          │
│ [Logo] [Nav Horizontal Dinâmica] [Search] [Notif] [User]      │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  MAIN CONTENT AREA (calc(100vh - 64px))                      │
│  ┌──────────┬─────────────────────────────────┬──────────┐   │
│  │          │                                   │          │   │
│  │ SIDEBAR  │     WORKSPACE                    │  PANEL   │   │
│  │ (240px)  │     (flex: 1)                    │  (320px) │   │
│  │          │                                   │          │   │
│  │ Filters  │  • Grid de Widgets               │ Details  │   │
│  │ Tools    │  • Visualizações                 │ Actions  │   │
│  │ Tree     │  • Tabelas/Listas                │ Info     │   │
│  │          │  • Mapas/Gráficos                │          │   │
│  │          │                                   │          │   │
│  └──────────┴─────────────────────────────────┴──────────┘   │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### 3.2 Sistema de Grid Adaptativo

**Grid de 6 Colunas (TrakSense):**

```typescript
// Sistema implementado com sucesso
const gridSizes = {
  'col-1': 'col-span-1 lg:col-span-1', // 1/6 - 16.66%
  'col-2': 'col-span-1 lg:col-span-2', // 2/6 - 33.33%
  'col-3': 'col-span-1 lg:col-span-3', // 3/6 - 50%
  'col-4': 'col-span-1 lg:col-span-4', // 4/6 - 66.66%
  'col-5': 'col-span-1 lg:col-span-5', // 5/6 - 83.33%
  'col-6': 'col-span-1 lg:col-span-6', // 6/6 - 100%
};
```

### 3.3 Comportamento por Resolução

| Resolução | Layout | Widgets/Linha | Navegação | Painéis |
|-----------|--------|---------------|-----------|---------|
| **Mobile** | Stack | 1 | Drawer | Ocultos |
| **Tablet** | Grid 2 | 2 | Horizontal compacta | Modal |
| **Desktop** | Grid 6 | 3-4 | Horizontal completa | Lateral |
| **Ultrawide** | Grid 12 | 6-8 | Horizontal + atalhos | Múltiplos |
| **4K** | Grid 12+ | 8-12 | Horizontal + favoritos | Split view |

---

## 4. Identidade Visual

### 4.1 Paleta de Cores - Platform Mode

**Cores Primárias (Profissional)**
| Nome | Light Mode | Dark Mode | Uso |
|------|------------|-----------|-----|
| `primary` | `#2563eb` | `#3b82f6` | CTAs, elementos ativos |
| `secondary` | `#64748b` | `#94a3b8` | Elementos secundários |
| `accent` | `#8b5cf6` | `#a78bfa` | Destaques especiais |

**Status Operacional**
| Status | Light | Dark | Significado |
|--------|-------|------|-------------|
| `online` | `#10b981` | `#34d399` | Operacional, ativo |
| `warning` | `#f59e0b` | `#fbbf24` | Atenção necessária |
| `critical` | `#ef4444` | `#f87171` | Falha, crítico |
| `offline` | `#6b7280` | `#9ca3af` | Inativo, desconectado |

### 4.2 Tipografia para Leitura Prolongada

```css
:root {
  --font-ui: 'Inter', -apple-system, system-ui, sans-serif;
  --font-data: 'Roboto Mono', 'JetBrains Mono', monospace;
  --font-display: 'Inter', sans-serif;
  
  /* Tamanhos otimizados para densidade */
  --text-xs: 0.7rem;    /* 11px - badges, labels */
  --text-sm: 0.8rem;    /* 13px - dados secundários */
  --text-base: 0.875rem; /* 14px - texto padrão */
  --text-lg: 1rem;      /* 16px - títulos */
  --text-xl: 1.125rem;  /* 18px - headers */
}
```

---

## 5. Componentes de Interface

### 5.1 Widgets - Sistema Modular

**Tamanhos Padronizados:**
```typescript
interface WidgetSize {
  small: "1/6 da tela";   // KPIs, badges
  medium: "1/3 da tela";  // Gráficos pequenos
  large: "1/2 da tela";   // Visualizações principais
  full: "Largura total";  // Tabelas, mapas
}
```

### 5.2 Modais - Responsivos e Adaptativos

**Tamanhos por Contexto:**
```css
/* Modal de configuração */
.modal-config {
  width: min(95vw, 1024px);
  max-height: 90vh;
}

/* Modal de visualização */
.modal-view {
  width: min(95vw, 1400px);
  max-height: 90vh;
}

/* Modal fullscreen (mapas, gráficos) */
.modal-fullscreen {
  width: 100vw;
  height: 100vh;
}
```

---

## 6. Sistema de Navegação

### 6.1 Navegação Horizontal Dinâmica

**Implementação TrakSense:**

| Largura | Comportamento | Itens Visíveis | Overflow |
|---------|--------------|----------------|----------|
| ≥ 1400px | Todos visíveis | 8 itens | Não |
| 1200-1399px | Dropdown ativo | 7 itens | 1 no menu |
| 1024-1199px | Dropdown ativo | 6 itens | 2 no menu |
| 768-1023px | Compacto | 5 itens | 3 no menu |
| < 768px | Mobile drawer | 0 itens | Todos no drawer |

### 6.2 Priorização de Itens

```typescript
const navPriority = {
  1: "Dashboard",      // Sempre visível
  2: "Ativos",        // Alta prioridade
  3: "Alertas",       // Alta prioridade
  4: "Relatórios",    // Média prioridade
  5: "Manutenção",    // Média prioridade
  6: "Configurações", // Baixa prioridade
};
```

---

## 7. Widgets e Dashboards

### 7.1 Sistema de Dashboard Customizável

**Características:**
- ✅ Drag & drop para reorganização
- ✅ Redimensionamento dinâmico
- ✅ Biblioteca com 40+ templates
- ✅ Vinculação com dados reais
- ✅ Atualização em tempo real

### 7.2 Grid Responsivo

```css
.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1rem;
  height: calc(100vh - 64px);
  overflow-y: auto;
  padding: 1rem;
}

@media (min-width: 1920px) {
  .dashboard-grid {
    grid-template-columns: repeat(6, 1fr);
  }
}

@media (min-width: 3840px) {
  .dashboard-grid {
    grid-template-columns: repeat(12, 1fr);
  }
}
```

---

## 8. Microinterações

### 8.1 Transições de Plataforma

```css
:root {
  --transition-instant: 50ms;   /* Hover em botões */
  --transition-fast: 150ms;     /* Mudanças de estado */
  --transition-normal: 250ms;   /* Animações padrão */
  --transition-smooth: 350ms;   /* Modais, painéis */
}

/* Transições suaves sem causar lag */
.platform-transition {
  transition: 
    transform var(--transition-fast) ease-out,
    opacity var(--transition-normal) ease-out,
    background-color var(--transition-instant) ease-out;
}
```

---

## 9. Padrões de Dados

### 9.1 Densidade de Informação

**Desktop/Ultrawide:**
- Tabelas: 15-20 linhas visíveis
- Gráficos: Múltiplas séries simultâneas
- KPIs: 4-8 por linha
- Listas: Scroll virtual para >100 itens

**Mobile/Tablet:**
- Tabelas: Cards empilhados
- Gráficos: Uma série por vez com toggle
- KPIs: 2 por linha
- Listas: Paginação ou infinite scroll

---

## 10. Acessibilidade

### 10.1 Navegação por Teclado

```typescript
// Atalhos de plataforma
const shortcuts = {
  'Cmd/Ctrl + K': 'Busca global',
  'Cmd/Ctrl + /': 'Atalhos',
  'Tab': 'Próximo elemento',
  'Shift + Tab': 'Elemento anterior',
  'Escape': 'Fechar modal/drawer',
  'Enter': 'Ativar elemento',
};
```

---

## 11. Performance

### 11.1 Otimizações para Plataforma

| Técnica | Implementação | Impacto |
|---------|--------------|---------|
| **Virtual Scrolling** | `react-window` | Listas com milhares de itens |
| **Debouncing** | `50ms` navegação, `300ms` busca | Reduz re-renders |
| **Memoization** | `React.memo`, `useMemo` | Evita recálculos |
| **Code Splitting** | Por módulo/rota | Bundle < 200KB |
| **WebSocket** | Updates em tempo real | Sem polling |

### 11.2 Métricas de Plataforma

| Métrica | Target | Medição |
|---------|--------|---------|
| **Time to Interactive** | < 2s | Lighthouse |
| **Frame Rate** | 60 FPS | DevTools Performance |
| **Memory Usage** | < 150MB | Chrome Task Manager |
| **CPU Usage** | < 30% idle | Activity Monitor |

---

## 📚 REFERÊNCIAS RÁPIDAS

### Para Telas Ultrawide (21:9, 32:9):
```css
/* Use grid de 12+ colunas */
/* Divida em 3 zonas: nav(2) + main(8) + aside(2) */
/* Mantenha line-height entre 65-80 caracteres */
/* Use multi-column layout para listas longas */
```

### Para Monitores 4K:
```css
/* Scale UI em 125-150% */
/* Aumente densidade de informação */
/* Use grids de 16+ colunas */
/* Implemente picture-in-picture para múltiplas views */
```

### Mobile (exceção):
```css
/* Full width para todos elementos */
/* Stack vertical */
/* Touch targets mínimo 44x44px */
/* Drawer navigation */
```

---

> **IMPORTANTE:** Este documento define o padrão para as plataformas TrakSense e TrakNor. Sempre priorize a experiência de uso contínuo em desktop/ultrawide sobre adaptações mobile.