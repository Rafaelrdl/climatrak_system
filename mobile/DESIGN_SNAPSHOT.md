# Design Snapshot — ClimaTrak Mobile

> Documentação da migração do design system web para o app mobile.  
> Data: Janeiro 2025

## 📋 Resumo da Migração

O design system do frontend web (`/frontend`) foi aplicado ao app mobile React Native (`/mobile`), garantindo consistência visual entre as plataformas.

## 🎨 Design System - Fonte da Verdade

### Arquivos Analisados (Web)
| Arquivo | Propósito |
|---------|-----------|
| `frontend/tailwind.config.js` | Definição de cores, espaçamento, radius |
| `frontend/src/index.css` | CSS variables com cores oklch |
| `frontend/src/components/ui/button.tsx` | Variantes: default, destructive, outline, secondary, ghost, link |
| `frontend/src/components/ui/card.tsx` | Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter |
| `frontend/src/components/ui/badge.tsx` | Variantes: default, secondary, destructive, outline |
| `frontend/src/components/ui/input.tsx` | Input com estados focus, disabled |
| `frontend/src/components/ui/skeleton.tsx` | Loading placeholder animado |
| `frontend/src/components/ui/dialog.tsx` | Modal com overlay e conteúdo |

## 📦 Tokens Implementados (Mobile)

### Arquivo: `mobile/src/theme/tokens.ts`

```typescript
// Estrutura dos tokens
export const colors = {
  background: string,
  card: string,
  primary: { DEFAULT, light, dark, foreground },
  secondary: { DEFAULT, foreground },
  destructive: { DEFAULT, foreground },
  muted: { DEFAULT, foreground },
  neutral: { 50..950 },
  status: { online, offline, warning, maintenance, unknown, pending },
  alert: { critical, warning, info },
  workOrder: { open, in_progress, completed, cancelled },
  priority: { critical, high, medium, low },
  // ... outros
}

export const spacing = { 0, 0.5, 1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24 }
export const typography = { fonts, sizes, weights, lineHeights }
export const radius = { none, sm, DEFAULT, md, lg, xl, '2xl', full }
export const shadows = { sm, DEFAULT, md, lg, xl, '2xl' }
export const iconSizes = { xs, sm, md, lg, xl }
```

## 🧩 Componentes UI Implementados (Mobile)

| Componente | Arquivo | Props Suportadas |
|------------|---------|------------------|
| **Button** | `components/ui/Button.tsx` | variant (default/destructive/outline/secondary/ghost), size, loading, disabled, icon |
| **Card** | `components/ui/Card.tsx` | CardContent, CardHeader, CardTitle, CardDescription, CardFooter |
| **Badge** | `components/ui/Badge.tsx` | variant (default/secondary/destructive/outline), children, style |
| **Input** | `components/ui/Input.tsx` | label, error, leftIcon, rightIcon, disabled |
| **Modal** | `components/ui/Modal.tsx` | visible, onClose, title, children |
| **Skeleton** | `components/ui/Skeleton.tsx` | width, height, borderRadius, style |
| **ScreenContainer** | `components/ui/ScreenContainer.tsx` | title, rightAction, refreshing, onRefresh |

## 📱 Telas Migradas

### 1. Home (`app/(tabs)/home.tsx`)
- ✅ Usa tokens de cores e espaçamento
- ✅ Usa componentes Card, Button

### 2. Alertas (`app/(tabs)/alerts.tsx`)
- ✅ Usa tokens de cores (alert.critical, warning, info)
- ✅ Usa Badge para severidade

### 3. Configurações (`app/(tabs)/settings.tsx`)
- ✅ Migrado de `theme` para `tokens`
- ✅ Usa Card/CardContent para seções
- ✅ Usa Button para ações (Sync, Logout)
- ✅ Usa Badge para status de sync

### 4. Ativos (`app/(tabs)/assets.tsx`)
- ✅ Migrado de `theme` para `tokens`
- ✅ STATUS_COLORS e CRITICALITY_COLORS mapeados
- ✅ Usa Badge para status do asset

### 5. Ordens de Serviço (`app/(tabs)/work-orders.tsx`)
- ✅ Migrado de `theme` para `tokens`
- ✅ STATUS_COLORS e PRIORITY_COLORS mapeados
- ✅ Usa Badge para status e prioridade
- ✅ Filtros de tab (My WOs, Pending, In Progress, All)

## ✅ Checklist de Validação

### Verificação TypeScript
```bash
cd mobile
npx tsc --noEmit
```
- [x] Sem erros de tipo em `settings.tsx`
- [x] Sem erros de tipo em `assets.tsx`
- [x] Sem erros de tipo em `work-orders.tsx`

### Verificação Visual (localhost:8081)
1. **Home Tab**
   - [ ] Cards com sombra e bordas corretas
   - [ ] Cores primárias consistentes com web
   - [ ] Espaçamento uniforme

2. **Alertas Tab**
   - [ ] Badges de severidade com cores corretas
   - [ ] Ícones com tamanhos padronizados (iconSizes)

3. **Assets Tab**
   - [ ] Badges de status (Online = verde, Offline = vermelho)
   - [ ] Badges de criticidade (High = vermelho)
   - [ ] Cards com radius.md e shadows.sm

4. **Work Orders Tab**
   - [ ] Filtros de tab funcionando
   - [ ] Badges de status (Open = azul, In Progress = amarelo, Completed = verde)
   - [ ] Badges de prioridade (Critical = vermelho, High = laranja, Medium = amarelo, Low = azul)

5. **Settings Tab**
   - [ ] Cards de configuração renderizando
   - [ ] Botões com estilos corretos (Sync = primário, Logout = destructive)
   - [ ] Badge de status do sync

### Testes Unitários
```bash
cd mobile
npm test
```
- [ ] Todos os testes passando

## 📁 Estrutura de Arquivos

```
mobile/
├── src/
│   ├── theme/
│   │   ├── tokens.ts        # Tokens extraídos do web design system
│   │   └── index.ts         # Re-export de tokens + legacy theme
│   └── components/
│       └── ui/
│           ├── Button.tsx   # Botão com variantes
│           ├── Card.tsx     # Card container
│           ├── Badge.tsx    # Badge para status
│           ├── Input.tsx    # Input com label e erro
│           ├── Modal.tsx    # Modal overlay
│           ├── Skeleton.tsx # Loading placeholder
│           ├── ScreenContainer.tsx  # Container de tela padrão
│           └── index.ts     # Barrel export
└── app/
    └── (tabs)/
        ├── home.tsx         # ✅ Design system aplicado
        ├── alerts.tsx       # ✅ Design system aplicado
        ├── settings.tsx     # ✅ Design system aplicado
        ├── assets.tsx       # ✅ Design system aplicado
        └── work-orders.tsx  # ✅ Design system aplicado
```

## 🔄 Padrão de Migração Aplicado

### Antes (Legacy Theme)
```typescript
import { theme } from '@/theme';

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.background,
    padding: theme.spacing[4],
    borderRadius: theme.borderRadius.md,
  },
  text: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
  }
});
```

### Depois (Design System Tokens)
```typescript
import { colors, spacing, radius, typography, shadows, iconSizes } from '@/theme/tokens';

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    padding: spacing[4],
    borderRadius: radius.md,
  },
  text: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
  }
});
```

## 🎯 Consistência Web ↔ Mobile

| Conceito | Web (Tailwind) | Mobile (tokens.ts) |
|----------|----------------|-------------------|
| Primary color | `bg-primary` | `colors.primary.DEFAULT` |
| Card background | `bg-card` | `colors.card` |
| Border radius md | `rounded-md` | `radius.md` |
| Shadow small | `shadow-sm` | `shadows.sm` |
| Font size sm | `text-sm` | `typography.sizes.sm` |
| Spacing 4 | `p-4` (16px) | `spacing[4]` (16) |

## 📝 Notas

1. Os warnings de `shadow*` deprecated são do react-native-web e não afetam o funcionamento
2. O require cycle do gesture-handler é conhecido e inofensivo
3. Multi-tenancy: tokens são agnósticos ao tenant - dados vêm via API contextualizada
