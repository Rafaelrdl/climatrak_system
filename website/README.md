# ClimaTrak Website Institucional

Website institucional do ecossistema ClimaTrak - plataforma de gestão de ativos HVAC.

## Produtos apresentados

- **TrakNor** - CMMS (Sistema de Gestão de Manutenção)
- **TrakSense** - Plataforma IoT de Monitoramento
- **AirTrak** - Sensor Inteligente para HVAC

## Stack Tecnológico

- **React 19** - Biblioteca UI
- **TypeScript** - Type safety
- **Vite 6** - Build tool
- **Tailwind CSS 4** - Estilização
- **Radix UI** - Componentes acessíveis
- **Lucide Icons** - Ícones
- **Framer Motion** - Animações
- **React Router** - Roteamento

## Estrutura do Projeto

```
website/
├── public/
│   └── favicon.svg
├── src/
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Header.tsx
│   │   │   ├── Footer.tsx
│   │   │   └── Layout.tsx
│   │   └── ui/
│   │       ├── button.tsx
│   │       ├── card.tsx
│   │       ├── badge.tsx
│   │       └── input.tsx
│   ├── lib/
│   │   └── utils.ts
│   ├── pages/
│   │   ├── HomePage.tsx
│   │   ├── ProductsPage.tsx
│   │   ├── PricingPage.tsx
│   │   ├── SolutionsPage.tsx
│   │   ├── AboutPage.tsx
│   │   ├── ContactPage.tsx
│   │   ├── DemoPage.tsx
│   │   ├── BlogPage.tsx
│   │   └── products/
│   │       ├── TrakNorPage.tsx
│   │       ├── TrakSensePage.tsx
│   │       └── AirTrakPage.tsx
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── package.json
├── tailwind.config.js
├── vite.config.ts
└── tsconfig.json
```

## Instalação

```bash
cd website
npm install
```

## Desenvolvimento

```bash
npm run dev
```

O servidor de desenvolvimento estará disponível em `http://localhost:3000`.

## Build para Produção

```bash
npm run build
```

Os arquivos estáticos serão gerados na pasta `dist/`.

## Preview da Build

```bash
npm run preview
```

## Páginas

| Rota | Descrição |
|------|-----------|
| `/` | Home page com hero, features, produtos e CTA |
| `/produtos` | Visão geral dos 3 produtos |
| `/produtos/traknor` | Página detalhada do TrakNor CMMS |
| `/produtos/traksense` | Página detalhada do TrakSense IoT |
| `/produtos/airtrak` | Página detalhada do sensor AirTrak |
| `/solucoes` | Soluções por segmento (hospitais, indústrias, facilities) |
| `/precos` | Tabela de preços e planos |
| `/sobre` | Sobre a empresa, missão e valores |
| `/contato` | Formulário de contato |
| `/demo` | Solicitação de demonstração |
| `/blog` | Lista de artigos do blog |

## Design System

O website segue o Design System definido em `docs/design/DESIGN_SYSTEM.md` do projeto principal, adaptado para um contexto de website institucional (não plataforma).

### Cores

- **Primary**: Blue (#0967d2) - CTAs e elementos de destaque
- **Emerald**: (#10b981) - TrakSense, status online
- **Violet**: (#8b5cf6) - AirTrak
- **Amber**: (#f59e0b) - Alertas, destaques

### Tipografia

- **Font Family**: Inter
- **Headings**: Bold (700-800)
- **Body**: Regular (400-500)

## Integração com a Plataforma

Este website é independente da plataforma principal (frontend/) e serve como site institucional/marketing. 

Links para a plataforma podem apontar para:
- `app.climatrak.com.br` (produção)
- Subdomínios de tenants específicos
