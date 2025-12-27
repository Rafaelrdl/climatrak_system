/**
 * Dashboard Types - Tipos para dashboard customizável
 */

export interface DashboardWidget {
  id: string;
  type: WidgetType;
  title: string;
  size: WidgetSize;
  position: {
    x: number;
    y: number;
    w?: number;
    h?: number;
  };
  config?: WidgetConfig;
}

export interface WidgetConfig {
  label?: string;
  unit?: string;
  color?: string;
  iconColor?: string;
  icon?: string;
  decimals?: number;
  sensorId?: string;
  assetId?: string;
  minValue?: number;
  maxValue?: number;
  warningThreshold?: number;
  criticalThreshold?: number;
  chartType?: 'line' | 'bar' | 'area' | 'pie' | 'donut';
  timeRange?: '1h' | '6h' | '24h' | '7d' | '30d';
  refreshInterval?: number;
  showIcon?: boolean;
  showLegend?: boolean;
  [key: string]: any;
}

export type WidgetSize = 
  | 'col-1' 
  | 'col-2' 
  | 'col-3' 
  | 'col-4' 
  | 'col-5' 
  | 'col-6'
  | 'small'
  | 'medium'
  | 'large';

export type WidgetType = 
  // Cards KPI
  | 'card-kpi'
  | 'card-value'
  | 'card-stat'
  | 'card-progress'
  | 'card-gauge'
  
  // Cards de ação
  | 'card-button'
  | 'card-toggle'
  | 'card-status'
  
  // Gráficos de linha
  | 'chart-line'
  | 'chart-area'
  
  // Gráficos de barra
  | 'chart-bar'
  | 'chart-bar-horizontal'
  
  // Gráficos circulares
  | 'chart-pie'
  | 'chart-donut'
  | 'chart-radial'
  
  // Medidores
  | 'gauge-circular'
  | 'gauge-tank'
  | 'gauge-thermometer'
  
  // Tabelas
  | 'table-data'
  | 'table-alerts'
  
  // Mapas de calor
  | 'heatmap-time'
  | 'heatmap-matrix'
  
  // Outros
  | 'text-display'
  | 'iframe-embed';

export interface WidgetDefinition {
  id: WidgetType;
  name: string;
  description: string;
  category: WidgetCategory;
  defaultSize: WidgetSize;
  icon: string;
  configurable: boolean;
  requiresSensor: boolean;
}

export type WidgetCategory = 
  | 'kpi'
  | 'operations'
  | 'energy'
  | 'reliability'
  | 'charts'
  | 'tables'
  | 'management';
