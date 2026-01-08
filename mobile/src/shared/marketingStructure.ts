// This file is auto-generated. Do not edit directly.
// Source: config/product-structure.json

export const mobileTabs = [
  {
    "id": "home",
    "name": "Inicio",
    "route": "/(tabs)/home"
  },
  {
    "id": "work-orders",
    "name": "OS",
    "route": "/(tabs)/work-orders"
  },
  {
    "id": "assets",
    "name": "Ativos",
    "route": "/(tabs)/assets"
  },
  {
    "id": "alerts",
    "name": "Alertas",
    "route": "/(tabs)/alerts"
  },
  {
    "id": "settings",
    "name": "Config",
    "route": "/(tabs)/settings"
  }
] as const;

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
