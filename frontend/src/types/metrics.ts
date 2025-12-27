/**
 * Types para Métricas e Indicadores de Desempenho
 */

// ============================================
// Filtros
// ============================================

export interface MetricFilter {
  start_date?: string;
  end_date?: string;
  sector_id?: string;
  equipment_id?: string;
  period?: '7d' | '30d' | '90d' | '1y';
}

// ============================================
// KPIs
// ============================================

export interface KPIMetric {
  name: string;
  label: string;
  value: number;
  unit: string;
  trend: number; // Percentual de mudança
  previous_value: number;
  target?: number;
  status: 'good' | 'warning' | 'critical' | 'neutral';
}

export interface KPIResponse {
  kpis: KPIMetric[];
  mttr: KPIMetric;
  mtbf: KPIMetric;
  availability: KPIMetric;
  completion_rate: KPIMetric;
  preventive_ratio: KPIMetric;
  average_cost: KPIMetric;
  backlog: KPIMetric;
  oee: KPIMetric;
}

// ============================================
// Tendências
// ============================================

export interface TrendDataPoint {
  date: string;
  value: number;
}

export interface TrendData {
  metric: string;
  label: string;
  unit: string;
  data: TrendDataPoint[];
  average: number;
  min: number;
  max: number;
}

// ============================================
// Distribuições
// ============================================

export interface DistributionItem {
  name: string;
  value: number;
  percentage: number;
  color?: string;
}

export interface WorkOrderDistribution {
  by_type: DistributionItem[];
  by_priority: DistributionItem[];
  by_status: DistributionItem[];
  by_sector: DistributionItem[];
}

// ============================================
// Equipamentos
// ============================================

export interface EquipmentHealth {
  equipment_id: string;
  equipment_name: string;
  equipment_tag: string;
  sector_name: string;
  health_score: number; // 0-100
  failure_probability: number; // 0-100
  last_maintenance: string | null;
  next_maintenance: string | null;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  mttr: number;
  mtbf: number;
  total_failures: number;
  downtime_hours: number;
}

export interface EquipmentPerformance {
  equipment_id: string;
  equipment_name: string;
  availability: number;
  performance: number;
  quality: number;
  oee: number;
}

// ============================================
// Machine Learning / Preditivo
// ============================================

export interface MLPrediction {
  id: string;
  equipment_id: string;
  equipment_name: string;
  prediction_date: string;
  failure_probability: number; // 0-1 (será multiplicado por 100 para exibição)
  confidence: number; // 0-1
  recommended_action: string;
  estimated_time_to_failure: number; // em horas
  days_until_failure: number; // em dias
  failure_type: string;
  risk_level: 'low' | 'medium' | 'high';
  risk_score: number;
  anomaly_score: number;
}

export interface AnomalyData {
  id: string;
  equipment_id: string;
  equipment_name: string;
  detected_at: string;
  metric: string;
  deviation: number;
  anomaly_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  status: 'active' | 'acknowledged' | 'resolved';
  metrics: Record<string, number>;
}

// ============================================
// Performance da Equipe
// ============================================

export interface TechnicianPerformance {
  id: string;
  user_id: string;
  name: string;
  role: string;
  total_work_orders: number;
  work_orders_completed: number;
  avg_completion_time: number; // em horas
  efficiency: number; // percentual
  satisfaction_score: number; // 0-100
  on_time_rate: number; // percentual
  quality_score: number; // 0-100
}

export interface TeamPerformanceData {
  period: string;
  total_technicians: number;
  total_work_orders: number;
  average_mttr: number;
  on_time_completion_rate: number;
  technicians: TechnicianPerformance[];
}

// ============================================
// Custos
// ============================================

export interface CostTrendPoint {
  date: string;
  labor: number;
  parts: number;
  external: number;
}

export interface CostMetrics {
  total_cost: number;
  preventive_cost: number;
  corrective_cost: number;
  parts_cost: number;
  labor_cost: number;
  external_services_cost: number;
  cost_per_asset: number;
  budget: number;
  cost_trend: TrendDataPoint[];
  trend: CostTrendPoint[];
  cost_by_category: DistributionItem[];
  cost_by_sector: DistributionItem[];
}

// ============================================
// SLA
// ============================================

export interface SLAMetrics {
  overall_compliance: number;
  response_time_compliance: number;
  resolution_time_compliance: number;
  first_fix_rate: number;
  customer_satisfaction: number;
  by_priority: {
    priority: string;
    target: number;
    actual: number;
    compliance: number;
  }[];
  trend: TrendDataPoint[];
}

// ============================================
// Heatmap
// ============================================

export interface HeatmapData {
  x_axis: string[]; // ex: dias da semana ou horas
  y_axis: string[]; // ex: setores ou equipamentos
  data: [number, number, number][]; // [x_index, y_index, value]
  min: number;
  max: number;
}
