// This file is auto-generated. Do not edit directly.
// Source: config/product-structure.json

export const productModules = [
  {
    "id": "traknor",
    "name": "TrakNor CMMS",
    "websiteHref": "/produtos/traknor",
    "frontendRoute": "/cmms"
  },
  {
    "id": "traksense",
    "name": "TrakSense Monitor",
    "websiteHref": "/produtos/traksense",
    "frontendRoute": "/monitor"
  },
  {
    "id": "trakledger",
    "name": "TrakLedger Finance",
    "websiteHref": "/produtos/trakledger",
    "frontendRoute": "/finance"
  },
  {
    "id": "trakservice",
    "name": "TrakService Field Service",
    "frontendRoute": "/trakservice",
    "backendFeatures": [
      "trakservice.enabled",
      "trakservice.dispatch",
      "trakservice.tracking",
      "trakservice.routing",
      "trakservice.km",
      "trakservice.quotes"
    ]
  }
] as const;

export const personaSections = [
  {
    "id": "gestores",
    "name": "Para Gestores",
    "description": "Controle operacao, equipe e custos em um painel unificado.",
    "items": [
      {
        "name": "Ordens de servico e planos",
        "href": "/produtos/traknor",
        "description": "Planejamento, execucao e controle das OS."
      },
      {
        "name": "Monitoramento IoT",
        "href": "/produtos/traksense",
        "description": "Sensores, alertas e dashboards."
      },
      {
        "name": "Conformidade PMOC",
        "href": "/produtos/traknor",
        "description": "Relatorios e laudos automatizados."
      },
      {
        "name": "Relatorios e KPIs",
        "href": "/produtos/traknor",
        "description": "Indicadores como MTTR e backlog."
      },
      {
        "name": "Financeiro e custos",
        "href": "/produtos/trakledger",
        "description": "Orcamentos, lancamentos e economia."
      },
      {
        "name": "Equipe e produtividade",
        "href": "/produtos/traknor",
        "description": "Gestao de tecnicos e desempenho."
      }
    ]
  },
  {
    "id": "clientes",
    "name": "Para seus Clientes",
    "description": "Transparencia e comunicacao do atendimento ao longo do ciclo.",
    "items": [
      {
        "name": "Solicitacoes e acompanhamento",
        "href": "/produtos/traknor",
        "description": "Abertura e status de chamados."
      },
      {
        "name": "Alertas e comunicacao",
        "href": "/produtos/traksense",
        "description": "Notificacoes sobre eventos e falhas."
      },
      {
        "name": "Relatorios compartilhaveis",
        "href": "/produtos/traknor",
        "description": "Laudos, historico e evidencias."
      },
      {
        "name": "Central de ajuda",
        "href": "/produtos/traknor",
        "description": "Base de conhecimento e suporte."
      }
    ]
  }
] as const;

export const marketSegments = [
  {
    "id": "hospitais",
    "name": "Hospitais e Clinicas",
    "description": "Compliance, areas criticas e auditorias.",
    "href": "/solucoes#hospitais"
  },
  {
    "id": "industrias",
    "name": "Industrias",
    "description": "Manutencao preditiva e continuidade operacional.",
    "href": "/solucoes#industrias"
  },
  {
    "id": "facilities",
    "name": "Shoppings e Facilities",
    "description": "Gestao multi-site e padronizacao.",
    "href": "/solucoes#facilities"
  }
] as const;
