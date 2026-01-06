# ClimaTrak Mobile

Aplicativo mobile para técnicos de campo do sistema ClimaTrak, desenvolvido com React Native e Expo.

## 📱 Features

- **Gestão de Ordens de Serviço**: Visualizar, iniciar, completar e cancelar OS
- **Consulta de Ativos**: Buscar ativos por nome, tag ou QR code
- **Alertas em Tempo Real**: Acompanhar e reconhecer alertas do sistema
- **Scanner QR Code**: Localizar ativos rapidamente via câmera
- **Offline First**: Funciona sem conexão e sincroniza quando online
- **Multi-tenant**: Suporta múltiplas organizações

## 🛠 Tecnologias

- **Expo SDK 51** - Framework React Native
- **React Native 0.74** - Base mobile
- **TypeScript 5.3** - Tipagem estática
- **Expo Router 3.5** - Navegação file-based
- **TanStack Query 5.28** - Cache e fetch de dados
- **Zustand 4.5** - Gerenciamento de estado
- **Axios** - Cliente HTTP

## 📋 Pré-requisitos

- Node.js 18+
- npm ou yarn
- Expo CLI (`npm install -g expo-cli`)
- Expo Go app no dispositivo (iOS/Android)

## 🚀 Instalação

```bash
# Navegar para o diretório mobile
cd mobile

# Instalar dependências
npm install

# Copiar variáveis de ambiente
cp .env.example .env

# Configurar a URL da API no .env
# API_URL=https://api.climatrak.com.br
```

## ⚙️ Configuração

### Variáveis de Ambiente

Crie o arquivo `.env` com:

```env
# URL base da API (sem trailing slash)
API_URL=https://api.climatrak.com.br

# Ou para desenvolvimento local (com ngrok ou similar)
# API_URL=https://abc123.ngrok.io
```

### Backend

O app se conecta ao backend Django existente. Certifique-se que:

1. O backend está rodando e acessível
2. CORS está configurado para aceitar requisições do Expo
3. Os endpoints de autenticação estão funcionando

## 📲 Rodando o App

### Modo Desenvolvimento

```bash
# Iniciar servidor de desenvolvimento
npm start

# Ou com túnel (para dispositivo físico fora da rede)
npm run start:tunnel
```

Depois, escaneie o QR code com o app Expo Go.

### Builds de Desenvolvimento

```bash
# iOS Simulator
npm run ios

# Android Emulator
npm run android
```

## 📁 Estrutura do Projeto

```
mobile/
├── app/                    # Telas (Expo Router)
│   ├── (auth)/            # Fluxo de autenticação
│   │   ├── login-email.tsx
│   │   └── login-password.tsx
│   ├── (tabs)/            # Tabs principais
│   │   ├── home.tsx
│   │   ├── work-orders.tsx
│   │   ├── assets.tsx
│   │   ├── alerts.tsx
│   │   └── settings.tsx
│   ├── work-order/
│   │   └── [id].tsx       # Detalhe da OS
│   ├── asset/
│   │   └── [id].tsx       # Detalhe do ativo
│   ├── scanner.tsx        # Scanner QR
│   └── _layout.tsx        # Layout raiz
├── src/
│   ├── shared/
│   │   ├── api/           # Serviços de API
│   │   │   ├── client.ts
│   │   │   ├── authService.ts
│   │   │   ├── workOrderService.ts
│   │   │   ├── assetService.ts
│   │   │   ├── alertService.ts
│   │   │   └── inventoryService.ts
│   │   └── storage/       # Storage local
│   │       └── index.ts
│   ├── store/             # Estado global (Zustand)
│   │   ├── authStore.ts
│   │   └── syncStore.ts
│   ├── theme/             # Design tokens
│   │   └── index.ts
│   └── types/             # TypeScript types
│       └── index.ts
├── app.json               # Configuração Expo
├── package.json
└── tsconfig.json
```

## 🔐 Autenticação

O app usa autenticação em 2 etapas:

1. **Discover Tenant**: Usuário digita email, sistema descobre a organização
2. **Login**: Usuário digita senha e autentica na organização

Tokens são armazenados de forma segura usando `expo-secure-store`.

## 🔄 Offline First

O app funciona offline com:

- **Cache**: Dados são armazenados localmente
- **Fila de Sync**: Operações offline são enfileiradas
- **Idempotência**: Chaves únicas evitam duplicação
- **Auto-sync**: Sincroniza automaticamente ao reconectar

### Fluxo Offline

1. Usuário executa ação (ex: iniciar OS)
2. Se online: Envia para API imediatamente
3. Se offline: Adiciona à fila de sync
4. Ao reconectar: Processa fila com retry/backoff

## 🎨 Design System

O app segue o Design System do ClimaTrak:

- Cores: Paleta consistente com o web
- Tipografia: Escala definida
- Espaçamento: Grid system de 4px
- Componentes: Padrões visuais consistentes

## 📦 Build de Produção

### EAS Build (Recomendado)

```bash
# Instalar EAS CLI
npm install -g eas-cli

# Fazer login
eas login

# Build iOS
eas build --platform ios

# Build Android
eas build --platform android
```

### Local Build

```bash
# Gerar bundle iOS
expo build:ios

# Gerar APK/AAB Android
expo build:android
```

## 🧪 Testes

```bash
# Rodar testes
npm test

# Com coverage
npm run test:coverage
```

## 📝 Scripts Disponíveis

| Script | Descrição |
|--------|-----------|
| `npm start` | Inicia servidor Expo |
| `npm run ios` | Roda no iOS Simulator |
| `npm run android` | Roda no Android Emulator |
| `npm run web` | Roda versão web |
| `npm run lint` | Verifica linting |
| `npm run type-check` | Verifica tipos TypeScript |

## 🔧 Troubleshooting

### Erro de conexão com API

1. Verifique se `API_URL` está correto no `.env`
2. Se local, use ngrok ou similar para expor o backend
3. Verifique CORS no backend

### Câmera não funciona

1. Verifique permissões no dispositivo
2. Em emulador, use device físico para melhor experiência

### Cache desatualizado

1. Limpar cache: `expo start -c`
2. Reinstalar: `rm -rf node_modules && npm install`

## 📄 Licença

Propriedade de ClimaTrak. Todos os direitos reservados.
