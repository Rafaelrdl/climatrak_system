/**
 * Tipos para o sistema de Dashboard Customizável
 * Baseado no design do TrakSense HVAC Monitor
 */

export interface DashboardWidget {
  id: string;
  type: WidgetType;
  title: string;
  size: 'col-1' | 'col-2' | 'col-3' | 'col-4' | 'col-5' | 'col-6';
  position: {
    x: number;
    y: number;
    w?: number;
    h?: number;
  };
  config?: {
    // Configurações específicas do widget
    label?: string;
    unit?: string;
    color?: string;
    minValue?: number;
    maxValue?: number;
    warningThreshold?: number;
    criticalThreshold?: number;
    chartType?: 'line' | 'bar' | 'area' | 'pie' | 'donut';
    timeRange?: '1h' | '6h' | '24h' | '7d' | '30d';
    refreshInterval?: number;
    decimals?: number;
    showIcon?: boolean;
    iconName?: string;
    // Dados vinculados
    dataSource?: string;
    equipmentId?: string;
    sectorId?: string;
    // Dados de sensor
    assetId?: number;
    deviceId?: string;
    sensorTag?: string;
    sensorTags?: string[];
    min?: number;
    max?: number;
    value?: number | string;
    status?: string;
    // Transformação de dados
    transform?: {
      formula?: string;
    };
    [key: string]: any;
  };
}

export type WidgetType = 
  // Cards Simples
  | 'card-kpi'              // Card KPI padrão com ícone e tendência
  | 'card-value'            // Card com valor único
  | 'card-stat'             // Card com estatística e trend
  
  // Cards de Ação
  | 'card-button'           // Card com botão de ação
  | 'card-toggle'           // Card com switch para ligar/desligar
  | 'card-status'           // Card indicador de status com cores
  
  // Gráficos de Linha
  | 'chart-line-echarts'    // Gráfico de linha (ECharts)
  | 'chart-area'            // Gráfico de área (ECharts)
  
  // Gráficos de Barra
  | 'chart-bar'             // Gráfico de barras vertical
  | 'chart-bar-horizontal'  // Gráfico de barras horizontal
  
  // Gráficos Circulares
  | 'chart-pie'             // Gráfico de pizza
  | 'chart-donut'           // Gráfico de rosca (donut)
  | 'gauge-circular'        // Medidor circular
  
  // Medidores
  | 'gauge-progress'        // Barra de progresso
  
  // Indicadores
  | 'indicator-status'      // Indicador de status (LED)
  | 'indicator-trend'       // Indicador de tendência
  | 'indicator-alert'       // Indicador de alerta
  
  // Tabelas
  | 'table-simple'          // Tabela simples
  | 'table-work-orders'     // Tabela de OS
  | 'table-equipment'       // Tabela de equipamentos
  
  // Mapas de Calor
  | 'heatmap-equipment'     // Mapa de calor por equipamento
  | 'heatmap-time'          // Mapa de calor temporal
  
  // Outros
  | 'text-display'          // Exibição de texto
  | 'photo-display';        // Exibição de imagem

export interface DashboardLayout {
  id: string;
  name: string;
  description?: string;
  widgets: DashboardWidget[];
  isDefault: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface WidgetDefinition {
  id: WidgetType;
  name: string;
  description: string;
  category: 'cards-simples' | 'cards-acao' | 'graficos-linha' | 'graficos-barra' | 'graficos-circulares' | 'medidores' | 'indicadores' | 'tabelas' | 'mapas-calor' | 'outros';
  defaultSize: DashboardWidget['size'];
  icon: string;
  configurable: boolean;
  requiresData: boolean;
}

// Definições de widgets disponíveis
export const widgetDefinitions: WidgetDefinition[] = [
  // CARDS SIMPLES (4)
  {
    id: 'card-kpi',
    name: 'Card KPI',
    description: 'Card com valor, ícone e tendência',
    category: 'cards-simples',
    defaultSize: 'col-2',
    icon: 'Activity',
    configurable: true,
    requiresData: true,
  },
  {
    id: 'card-value',
    name: 'Card Valor',
    description: 'Exibe um valor único',
    category: 'cards-simples',
    defaultSize: 'col-2',
    icon: 'Square',
    configurable: true,
    requiresData: true,
  },
  {
    id: 'card-stat',
    name: 'Card Estatística',
    description: 'Valor com tendência e comparação',
    category: 'cards-simples',
    defaultSize: 'col-2',
    icon: 'TrendingUp',
    configurable: true,
    requiresData: true,
  },

  // CARDS DE AÇÃO (3)
  {
    id: 'card-button',
    name: 'Card Botão',
    description: 'Botão para acionar comando',
    category: 'cards-acao',
    defaultSize: 'col-2',
    icon: 'MousePointerClick',
    configurable: true,
    requiresData: true,
  },
  {
    id: 'card-toggle',
    name: 'Card Toggle',
    description: 'Switch para ligar/desligar',
    category: 'cards-acao',
    defaultSize: 'col-2',
    icon: 'ToggleRight',
    configurable: true,
    requiresData: true,
  },
  {
    id: 'card-status',
    name: 'Card Status',
    description: 'Indicador de status com cores',
    category: 'cards-acao',
    defaultSize: 'col-2',
    icon: 'CircleDot',
    configurable: true,
    requiresData: true,
  },

  // GRÁFICOS DE LINHA (2)
  {
    id: 'chart-line-echarts',
    name: 'Gráfico de Linha (ECharts)',
    description: 'Linha temporal com ECharts',
    category: 'graficos-linha',
    defaultSize: 'col-4',
    icon: 'LineChart',
    configurable: true,
    requiresData: true,
  },
  {
    id: 'chart-area',
    name: 'Gráfico de Área',
    description: 'Área preenchida temporal',
    category: 'graficos-linha',
    defaultSize: 'col-4',
    icon: 'AreaChart',
    configurable: true,
    requiresData: true,
  },

  // GRÁFICOS DE BARRA (2)
  {
    id: 'chart-bar',
    name: 'Gráfico de Barras',
    description: 'Barras verticais',
    category: 'graficos-barra',
    defaultSize: 'col-4',
    icon: 'BarChart3',
    configurable: true,
    requiresData: true,
  },
  {
    id: 'chart-bar-horizontal',
    name: 'Barras Horizontais',
    description: 'Barras na horizontal',
    category: 'graficos-barra',
    defaultSize: 'col-4',
    icon: 'BarChartHorizontal',
    configurable: true,
    requiresData: true,
  },

  // GRÁFICOS CIRCULARES (3)
  {
    id: 'chart-pie',
    name: 'Gráfico de Pizza',
    description: 'Pizza com percentuais',
    category: 'graficos-circulares',
    defaultSize: 'col-3',
    icon: 'PieChart',
    configurable: true,
    requiresData: true,
  },
  {
    id: 'chart-donut',
    name: 'Gráfico Donut',
    description: 'Rosca com centro vazio',
    category: 'graficos-circulares',
    defaultSize: 'col-3',
    icon: 'Circle',
    configurable: true,
    requiresData: true,
  },
  {
    id: 'gauge-circular',
    name: 'Medidor',
    description: 'Medidor como gráfico',
    category: 'graficos-circulares',
    defaultSize: 'col-2',
    icon: 'Gauge',
    configurable: true,
    requiresData: true,
  },

  // MEDIDORES (3)
  {
    id: 'gauge-progress',
    name: 'Barra de Progresso',
    description: 'Barra de progresso horizontal',
    category: 'medidores',
    defaultSize: 'col-3',
    icon: 'Activity',
    configurable: true,
    requiresData: true,
  },

  // INDICADORES (3)
  {
    id: 'indicator-status',
    name: 'Indicador de Status',
    description: 'LED de status online/offline',
    category: 'indicadores',
    defaultSize: 'col-1',
    icon: 'CheckCircle',
    configurable: true,
    requiresData: true,
  },
  {
    id: 'indicator-trend',
    name: 'Indicador de Tendência',
    description: 'Seta de tendência up/down',
    category: 'indicadores',
    defaultSize: 'col-1',
    icon: 'TrendingUp',
    configurable: true,
    requiresData: true,
  },
  {
    id: 'indicator-alert',
    name: 'Indicador de Alerta',
    description: 'Alerta visual de limites',
    category: 'indicadores',
    defaultSize: 'col-1',
    icon: 'AlertTriangle',
    configurable: true,
    requiresData: true,
  },

  // TABELAS (2)
  {
    id: 'table-simple',
    name: 'Tabela Simples',
    description: 'Tabela de dados genérica',
    category: 'tabelas',
    defaultSize: 'col-6',
    icon: 'Table',
    configurable: true,
    requiresData: true,
  },
  {
    id: 'table-work-orders',
    name: 'Tabela de OS',
    description: 'Lista de ordens de serviço',
    category: 'tabelas',
    defaultSize: 'col-6',
    icon: 'ClipboardList',
    configurable: true,
    requiresData: true,
  },

  // MAPAS DE CALOR (2)
  {
    id: 'heatmap-equipment',
    name: 'Mapa de Calor Equipamentos',
    description: 'Mapa de calor por equipamento',
    category: 'mapas-calor',
    defaultSize: 'col-4',
    icon: 'Grid',
    configurable: true,
    requiresData: true,
  },
  {
    id: 'heatmap-time',
    name: 'Mapa de Calor Temporal',
    description: 'Mapa de calor por período',
    category: 'mapas-calor',
    defaultSize: 'col-4',
    icon: 'Calendar',
    configurable: true,
    requiresData: true,
  },

  // OUTROS (2)
  {
    id: 'text-display',
    name: 'Exibição de Texto',
    description: 'Texto formatado',
    category: 'outros',
    defaultSize: 'col-2',
    icon: 'Type',
    configurable: true,
    requiresData: false,
  },
  {
    id: 'photo-display',
    name: 'Exibição de Imagem',
    description: 'Imagem personalizada',
    category: 'outros',
    defaultSize: 'col-3',
    icon: 'Image',
    configurable: true,
    requiresData: false,
  },
];

// Nomes de categorias em português com contagem
export const categoryNames: Record<string, string> = {
  'cards-simples': 'Cards Simples',
  'cards-acao': 'Cards de Ação',
  'graficos-linha': 'Gráficos de Linha',
  'graficos-barra': 'Gráficos de Barra',
  'graficos-circulares': 'Gráficos Circulares',
  'medidores': 'Medidores',
  'indicadores': 'Indicadores',
  'tabelas': 'Tabelas',
  'mapas-calor': 'Mapas de Calor',
  'outros': 'Outros',
};

// Ordem das categorias para exibição
export const categoryOrder = [
  'cards-simples',
  'cards-acao',
  'graficos-linha',
  'graficos-barra',
  'graficos-circulares',
  'medidores',
  'indicadores',
  'tabelas',
  'mapas-calor',
  'outros',
];
