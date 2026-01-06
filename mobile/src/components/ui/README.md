# 🎨 UI Components - Guia de Uso

> Componentes base do design system ClimaTrak Mobile,  
> espelhando o shadcn/ui do frontend web.

---

## Instalação

Os componentes já estão disponíveis no projeto. Import de:

```tsx
import { Button, Card, Input, Badge, Skeleton, ScreenContainer, Modal } from '@/components/ui';
```

Ou import individual:

```tsx
import { Button } from '@/components/ui/Button';
```

---

## 📦 Componentes Disponíveis

### Button

```tsx
import { Button } from '@/components/ui';

// Variantes: default | secondary | destructive | outline | ghost | link
// Tamanhos: sm | md | lg | icon

<Button variant="default" onPress={handleSave}>
  Salvar
</Button>

<Button variant="destructive" loading={isDeleting}>
  Excluir
</Button>

<Button variant="outline" leftIcon={<PlusIcon />}>
  Adicionar
</Button>

<Button variant="ghost" size="icon">
  <SettingsIcon />
</Button>
```

### Card

```tsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui';

<Card>
  <CardHeader>
    <CardTitle>Título do Card</CardTitle>
    <CardDescription>Descrição opcional</CardDescription>
  </CardHeader>
  <CardContent>
    <Text>Conteúdo principal aqui</Text>
  </CardContent>
  <CardFooter>
    <Button variant="outline">Cancelar</Button>
    <Button>Confirmar</Button>
  </CardFooter>
</Card>
```

### Input

```tsx
import { Input } from '@/components/ui';

<Input
  label="Email"
  placeholder="seu@email.com"
  value={email}
  onChangeText={setEmail}
/>

<Input
  label="Senha"
  secureTextEntry
  error={errors.password}
  value={password}
  onChangeText={setPassword}
/>

<Input
  placeholder="Buscar..."
  leftIcon={<SearchIcon />}
  rightIcon={<ClearIcon />}
  onRightIconPress={handleClear}
/>
```

### Badge

```tsx
import { Badge } from '@/components/ui';

// Variantes: default | secondary | destructive | outline | success | warning

<Badge>Novo</Badge>
<Badge variant="success">Ativo</Badge>
<Badge variant="warning">Pendente</Badge>
<Badge variant="destructive">Erro</Badge>
<Badge variant="outline">Info</Badge>
```

### Skeleton

```tsx
import { Skeleton, SkeletonText, SkeletonCard } from '@/components/ui';

// Linha simples
<Skeleton width={200} height={16} />

// Avatar circular
<Skeleton circle width={40} height={40} />

// Múltiplas linhas de texto
<SkeletonText lines={3} />

// Card completo
<SkeletonCard hasAvatar textLines={2} />
```

### ScreenContainer

```tsx
import { ScreenContainer } from '@/components/ui';

// Tela básica com scroll e pull-to-refresh
<ScreenContainer
  loading={isLoading}
  refreshing={refreshing}
  onRefresh={handleRefresh}
>
  <YourContent />
</ScreenContainer>

// Com empty state
<ScreenContainer
  empty={items.length === 0}
  emptyTitle="Nenhum item"
  emptyDescription="Adicione um novo item para começar"
>
  <ItemList items={items} />
</ScreenContainer>
```

### Modal

```tsx
import { Modal, ModalContent, ModalFooter } from '@/components/ui';

<Modal
  visible={showModal}
  onClose={() => setShowModal(false)}
  title="Confirmar ação"
  description="Tem certeza que deseja continuar?"
>
  <ModalFooter>
    <Button variant="outline" onPress={handleCancel}>
      Cancelar
    </Button>
    <Button onPress={handleConfirm}>
      Confirmar
    </Button>
  </ModalFooter>
</Modal>
```

---

## 🎨 Tokens de Design

Acesse os tokens diretamente:

```tsx
import { colors, spacing, radius, typography, shadows } from '@/theme/tokens';

// Ou via tema existente (retrocompatível)
import { theme } from '@/theme';
```

### Cores Principais

```tsx
colors.primary.DEFAULT     // #2563eb - Azul primário
colors.secondary.DEFAULT   // #f1f5f9 - Cinza claro
colors.destructive.DEFAULT // #ef4444 - Vermelho
colors.muted.foreground    // #64748b - Texto secundário
```

### Cores de Status

```tsx
colors.status.online   // #22c55e - Verde
colors.status.warning  // #f59e0b - Amarelo
colors.status.critical // #ef4444 - Vermelho
colors.status.offline  // #64748b - Cinza
```

### Espaçamento

```tsx
spacing[1]  // 4px
spacing[2]  // 8px
spacing[4]  // 16px (padding padrão)
spacing[6]  // 24px (padding de cards)
spacing[8]  // 32px (gap entre seções)
```

### Border Radius

```tsx
radius.sm   // 4px - Badges
radius.md   // 6px - Inputs, Buttons
radius.lg   // 8px - Cards pequenos
radius.xl   // 12px - Cards, Modais
radius.full // 9999px - Pills, Avatars
```

---

## ✅ Checklist de Migração

Ao refatorar uma tela existente:

- [ ] Substituir `SafeAreaView` + `ScrollView` por `<ScreenContainer>`
- [ ] Substituir `TouchableOpacity` de ação por `<Button variant="...">`
- [ ] Substituir cards manuais por `<Card>` + subcomponentes
- [ ] Substituir badges manuais por `<Badge variant="...">`
- [ ] Substituir TextInput por `<Input>` com label/error
- [ ] Substituir loading manual por `loading` prop do ScreenContainer
- [ ] Usar tokens ao invés de valores hardcoded
- [ ] Usar cores semânticas (`primary`, `destructive`) ao invés de escalas

---

## 📁 Estrutura de Arquivos

```
mobile/
└── src/
    ├── components/
    │   ├── ui/
    │   │   ├── Button.tsx
    │   │   ├── Card.tsx
    │   │   ├── Input.tsx
    │   │   ├── Badge.tsx
    │   │   ├── Skeleton.tsx
    │   │   ├── ScreenContainer.tsx
    │   │   ├── Modal.tsx
    │   │   └── index.ts
    │   └── index.ts
    └── theme/
        ├── tokens.ts          # Tokens unificados (novo)
        ├── index.ts           # Theme principal (existente)
        └── DESIGN_SNAPSHOT.md # Referência do design system
```
