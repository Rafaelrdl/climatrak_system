# TrakNor CMMS - Sistema de Gerenciamento de Manutenção

Sistema de gerenciamento de manutenção para equipamentos e ativos industriais.

## 🚀 Sobre o Projeto

O TrakNor CMMS é uma solução completa para gerenciamento de manutenção, monitoramento de ativos e controle de ordens de serviço. Desenvolvido com tecnologias modernas para oferecer uma experiência de usuário fluida e responsiva.

### Funcionalidades Principais

- **Dashboard Personalizável** - Widgets configuráveis para visualização de KPIs
- **Gestão de Ordens de Serviço** - Criação, acompanhamento e histórico de OS
- **Monitoramento de Ativos** - Visualização em tempo real do status dos equipamentos
- **Alertas e Regras** - Configuração de alertas automáticos baseados em sensores
- **Gestão de Manutenção** - Planejamento preventivo e corretivo
- **Relatórios** - Geração de relatórios customizados

## 📁 Estrutura do Projeto

```
├── docs/                    # 📚 Documentação organizada
│   ├── features/           # Documentação de funcionalidades
│   ├── implementation/     # Documentação técnica
│   ├── fixes/             # Documentação de correções
│   └── root-docs/         # Documentos gerais do projeto
├── src/                    # 💻 Código fonte
│   ├── apps/              # Aplicações modulares
│   ├── components/        # Componentes reutilizáveis
│   ├── hooks/             # Custom hooks
│   ├── store/             # Estado global (Zustand)
│   └── types/             # Tipos TypeScript
├── scripts/               # 🔧 Scripts utilitários
└── cypress/               # 🔍 Testes E2E
```

## 🛠️ Tecnologias

- **React 19** + **TypeScript 5.7**
- **Vite 6** - Build tool
- **Tailwind CSS 4** - Estilização
- **Zustand** - Gerenciamento de estado
- **React Query** - Cache e sincronização de dados
- **React Router DOM** - Navegação
- **Radix UI** - Componentes acessíveis
- **Recharts** - Gráficos e visualizações
- **React Hook Form** + **Zod** - Formulários e validação
- **Vitest** - Testes unitários
- **Cypress** - Testes E2E

## 🚀 Configuração

### Pré-requisitos

- Node.js 18+ 
- npm ou yarn

### Instalação

1. Clone o repositório:
```bash
git clone https://github.com/seu-usuario/traknor-cmms-sistema.git
cd traknor-cmms-sistema
```

2. Instale as dependências:
```bash
npm install
```

3. Configure as variáveis de ambiente:
```bash
cp .env.example .env
# Edite o arquivo .env com suas configurações
```

4. Execute o projeto:
```bash
npm run dev
```

O servidor de desenvolvimento estará disponível em `http://localhost:5173`

### Scripts Disponíveis

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Inicia o servidor de desenvolvimento |
| `npm run build` | Compila o projeto para produção |
| `npm run preview` | Visualiza o build de produção |
| `npm run lint` | Executa o linting do código |
| `npm test` | Executa os testes unitários |
| `npm run test:ui` | Executa os testes com interface gráfica |
| `npm run cy:open` | Abre o Cypress para testes E2E |
| `npm run cy:run` | Executa os testes E2E no terminal |

## 🆘 Solução de Problemas

### Erros Comuns

**Vite Module Not Found:**
```bash
npm run clean
```

**Porta em uso:**
```bash
npm run kill
```

**Problemas de cache:**
```bash
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

**Problemas com dependências:**
```bash
bash ./scripts/check-deps.sh
```

### Guias de Troubleshooting

- **🚑 [QUICK-FIX.md](QUICK-FIX.md)** - Soluções rápidas para erros comuns
- **🔧 [TROUBLESHOOTING.md](TROUBLESHOOTING.md)** - Guia detalhado de diagnóstico

## 📚 Documentação

Toda a documentação do projeto está organizada na pasta `docs/`. Para mais detalhes, consulte [docs/README.md](docs/README.md).

## 🔒 Segurança

Para informações sobre práticas de segurança, consulte [SECURITY.md](SECURITY.md).

## 📄 Licença

Este projeto está licenciado sob a licença MIT - veja o arquivo [LICENSE](LICENSE) para detalhes.

## 👥 Contribuindo

1. Faça um Fork do projeto
2. Crie sua Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a Branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

---

Desenvolvido com ❤️ pela equipe TrakNor
