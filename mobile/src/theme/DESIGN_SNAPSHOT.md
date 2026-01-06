# 📋 Design Snapshot - Climatrak Web → Mobile

> **Extraído de:** `/frontend` em 2026-01-06  
> **Aplicar em:** `/mobile`

---

## 1. Paleta de Cores

### Cores Semânticas (CSS Variables do Web)

| Token Web              | Valor Light Mode (OKLCH)        | Hex Equivalente |
|------------------------|---------------------------------|-----------------|
| `--background`         | `oklch(0.98 0.01 200)`          | `#f8fafc`       |
| `--foreground`         | `oklch(0.15 0.02 200)`          | `#0f172a`       |
| `--card`               | `oklch(1 0 0)`                  | `#ffffff`       |
| `--card-foreground`    | `oklch(0.15 0.02 200)`          | `#0f172a`       |
| `--primary`            | `oklch(0.45 0.15 200)`          | `#2563eb`       |
| `--primary-foreground` | `oklch(0.98 0 0)`               | `#ffffff`       |
| `--secondary`          | `oklch(0.95 0.02 200)`          | `#f1f5f9`       |
| `--secondary-foreground`| `oklch(0.25 0.1 240)`          | `#1e293b`       |
| `--muted`              | `oklch(0.96 0.01 200)`          | `#f1f5f9`       |
| `--muted-foreground`   | `oklch(0.5 0.05 200)`           | `#64748b`       |
| `--accent`             | `oklch(0.65 0.15 45)`           | `#f59e0b`       |
| `--accent-foreground`  | `oklch(0.98 0 0)`               | `#ffffff`       |
| `--destructive`        | `oklch(0.71 0.19 27.5)`         | `#ef4444`       |
| `--destructive-foreground` | `oklch(0.98 0 0)`           | `#ffffff`       |
| `--border`             | `oklch(0.9 0.02 200)`           | `#e2e8f0`       |
| `--input`              | `oklch(0.9 0.02 200)`           | `#e2e8f0`       |
| `--ring`               | `oklch(0.45 0.15 200)`          | `#2563eb`       |

**Fonte:** [frontend/src/index.css](frontend/src/index.css#L10-L40)

### Cores de Status (Operacional)

| Status     | Cor       | Uso                          |
|------------|-----------|------------------------------|
| `online`   | `#22c55e` | Equipamento operacional      |
| `warning`  | `#f59e0b` | Atenção necessária           |
| `critical` | `#ef4444` | Falha crítica                |
| `offline`  | `#64748b` | Equipamento desconectado     |

**Fonte:** [docs/design/DESIGN_SYSTEM.md](docs/design/DESIGN_SYSTEM.md)

### Escala Neutral (Slate)

```
50: #f8fafc | 100: #f1f5f9 | 200: #e2e8f0 | 300: #cbd5e1 | 400: #94a3b8
500: #64748b | 600: #475569 | 700: #334155 | 800: #1e293b | 900: #0f172a
```

### Escala Primary (Blue)

```
50: #eff6ff | 100: #dbeafe | 200: #bfdbfe | 300: #93c5fd | 400: #60a5fa
500: #3b82f6 | 600: #2563eb | 700: #1d4ed8 | 800: #1e40af | 900: #1e3a8a
```

---

## 2. Tipografia

### Fontes
- **Sans:** `Inter, ui-sans-serif, system-ui, sans-serif`
- **Mono:** `Roboto Mono, JetBrains Mono, monospace`

**Fonte:** [frontend/src/index.css](frontend/src/index.css#L42-L77)

### Escala de Tamanhos (Design System)

| Token   | Web Value | Mobile (px) | Uso                    |
|---------|-----------|-------------|------------------------|
| `xs`    | 0.7rem    | 11-12       | Badges, labels         |
| `sm`    | 0.8rem    | 13-14       | Dados secundários      |
| `base`  | 0.875rem  | 14-16       | Texto padrão           |
| `lg`    | 1rem      | 16-18       | Títulos                |
| `xl`    | 1.125rem  | 18-20       | Headers de seção       |
| `2xl`   | 1.25rem   | 20-24       | Títulos principais     |

**Fonte:** [docs/design/DESIGN_SYSTEM.md](docs/design/DESIGN_SYSTEM.md#42-tipografia)

### Font Weights
- `normal`: 400
- `medium`: 500
- `semibold`: 600
- `bold`: 700

---

## 3. Espaçamento

### Escala (via CSS Variables)

| Token   | Value | Uso                        |
|---------|-------|----------------------------|
| `0.5`   | 2px   | Micro espaçamento          |
| `1`     | 4px   | Ícones inline              |
| `1.5`   | 6px   | Gaps pequenos              |
| `2`     | 8px   | Padding interno badges     |
| `3`     | 12px  | Gap entre elementos        |
| `4`     | 16px  | Padding padrão             |
| `5`     | 20px  | Gap médio                  |
| `6`     | 24px  | Padding de cards           |
| `8`     | 32px  | Espaço entre seções        |

**Fonte:** [frontend/tailwind.config.js](frontend/tailwind.config.js#L139-L177)

---

## 4. Border Radius

| Token   | Web Variable     | Value    | Uso                 |
|---------|------------------|----------|---------------------|
| `sm`    | `--radius-sm`    | 4px      | Badges, chips       |
| `md`    | `--radius-md`    | 6px      | Inputs, buttons     |
| `lg`    | `--radius-lg`    | 8px      | Cards               |
| `xl`    | `--radius-xl`    | 12px     | Modais pequenos     |
| `2xl`   | `--radius-2xl`   | 16px     | Cards grandes       |
| `full`  | `--radius-full`  | 9999px   | Avatars, pills      |

**Fonte:** [frontend/src/index.css](frontend/src/index.css#L63-L69)

---

## 5. Sombras

| Token | Web                                      | Mobile (elevation)  |
|-------|------------------------------------------|---------------------|
| `sm`  | `0px 1px 2px rgba(0,0,0,0.05)`           | elevation: 1        |
| `md`  | `0px 2px 4px rgba(0,0,0,0.1)`            | elevation: 3        |
| `lg`  | `0px 4px 8px rgba(0,0,0,0.15)`           | elevation: 5        |
| `xl`  | `0px 8px 16px rgba(0,0,0,0.2)`           | elevation: 8        |

**Fonte:** [frontend/src/index.css](frontend/src/index.css) + Design System

---

## 6. Componentes Base (shadcn/ui)

### Button Variants

| Variant       | Background           | Text                     |
|---------------|----------------------|--------------------------|
| `default`     | `bg-primary`         | `text-primary-foreground`|
| `secondary`   | `bg-secondary`       | `text-secondary-foreground`|
| `destructive` | `bg-destructive`     | `text-white`             |
| `outline`     | `border bg-background`| `hover:bg-accent`       |
| `ghost`       | transparent          | `hover:bg-accent`        |
| `link`        | transparent          | `text-primary underline` |

### Button Sizes

| Size      | Height | Padding            |
|-----------|--------|--------------------|
| `default` | h-9    | px-4 py-2          |
| `sm`      | h-8    | px-3               |
| `lg`      | h-10   | px-6               |
| `icon`    | 36x36  | centered           |

**Fonte:** [frontend/src/components/ui/button.tsx](frontend/src/components/ui/button.tsx)

### Card

- Background: `bg-card`
- Border: `border` (1px `--border`)
- Radius: `rounded-xl` (12px)
- Shadow: `shadow-sm`
- Padding: `py-6 px-6`

**Fonte:** [frontend/src/components/ui/card.tsx](frontend/src/components/ui/card.tsx)

### Input

- Height: `h-9`
- Border: `border-input`
- Radius: `rounded-md`
- Focus: `ring-ring/50 ring-[3px]`
- Placeholder: `text-muted-foreground`

**Fonte:** [frontend/src/components/ui/input.tsx](frontend/src/components/ui/input.tsx)

### Badge Variants

| Variant       | Style                              |
|---------------|------------------------------------|
| `default`     | `bg-primary text-primary-foreground`|
| `secondary`   | `bg-secondary text-secondary-foreground`|
| `destructive` | `bg-destructive text-white`        |
| `outline`     | `border text-foreground`           |

**Fonte:** [frontend/src/components/ui/badge.tsx](frontend/src/components/ui/badge.tsx)

### Skeleton

- Background: `bg-accent`
- Animation: `animate-pulse`
- Radius: `rounded-md`

**Fonte:** [frontend/src/components/ui/skeleton.tsx](frontend/src/components/ui/skeleton.tsx)

---

## 7. Estados de Interface

### Loading States
- Skeleton com `animate-pulse`
- ActivityIndicator com `primary` color
- Overlay semi-transparente (`bg-black/50`)

### Empty States
- Ícone ilustrativo (Lucide)
- Texto em `muted-foreground`
- CTA opcional

### Error States
- Borda `border-destructive`
- Ring `ring-destructive/20`
- Texto helper em `text-destructive`

### Disabled
- `opacity-50`
- `pointer-events-none`

### Focus
- `ring-ring/50 ring-[3px]`
- `border-ring`

### Pressed (mobile)
- `active:scale-95`
- `transition-transform duration-100`

**Fonte:** [frontend/src/index.css](frontend/src/index.css#L320-L330)

---

## 8. Transições

| Type     | Duration | Easing      |
|----------|----------|-------------|
| instant  | 50ms     | ease-out    |
| fast     | 150ms    | ease-out    |
| normal   | 250ms    | ease-out    |
| smooth   | 350ms    | ease-in-out |

**Fonte:** [docs/design/DESIGN_SYSTEM.md](docs/design/DESIGN_SYSTEM.md#81-transições)

---

## 9. Arquivos de Referência

| Aspecto        | Arquivo Web                                    |
|----------------|------------------------------------------------|
| CSS Variables  | `frontend/src/index.css`                       |
| Tailwind Config| `frontend/tailwind.config.js`                  |
| Button         | `frontend/src/components/ui/button.tsx`        |
| Card           | `frontend/src/components/ui/card.tsx`          |
| Input          | `frontend/src/components/ui/input.tsx`         |
| Badge          | `frontend/src/components/ui/badge.tsx`         |
| Skeleton       | `frontend/src/components/ui/skeleton.tsx`      |
| Dialog         | `frontend/src/components/ui/dialog.tsx`        |
| Design System  | `docs/design/DESIGN_SYSTEM.md`                 |

---

## 10. Ações para Mobile

1. **Criar tokens.ts** baseado neste snapshot
2. **Criar componentes UI** espelhando variants do web
3. **Aplicar tokens** nas telas existentes
4. **Garantir consistência** de estados (loading/empty/error)
