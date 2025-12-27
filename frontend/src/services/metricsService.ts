/**
 * Metrics Service
 * 
 * Serviço para gerenciamento de métricas e indicadores de desempenho.
 * Integração com API do backend para KPIs, tendências e dados de ML.
 */

import { api } from '@/lib/api';
import type {
  MetricFilter,
  KPIResponse,
  KPIMetric,
  TrendData,
  WorkOrderDistribution,
  EquipmentHealth,
  MLPrediction,
  AnomalyData,
  TechnicianPerformance,
  CostMetrics,
  SLAMetrics,
  HeatmapData,
  DistributionItem,
  TrendDataPoint,
} from '@/types/metrics';

// Flag para usar dados mockados (enquanto API não está pronta)
// Setar para false quando a API estiver implementada
const USE_MOCK_DATA = true;

// ============================================
// Helpers para dados mockados (temporário)
// ============================================

const generateTrendData = (days: number, baseValue: number, variance: number): TrendDataPoint[] => {
  const data: TrendDataPoint[] = [];
  const now = new Date();
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    data.push({
      date: date.toISOString().split('T')[0],
      value: baseValue + (Math.random() - 0.5) * variance * 2,
    });
  }
  
  return data;
};

const periodToDays = (period: string): number => {
  switch (period) {
    case '7d': return 7;
    case '30d': return 30;
    case '90d': return 90;
    case '1y': return 365;
    default: return 30;
  }
};

// ============================================
// Service
// ============================================

class MetricsService {
  /**
   * Obtém KPIs principais
   */
  async getKPIs(filters?: MetricFilter): Promise<KPIResponse> {
    if (USE_MOCK_DATA) return this.getMockKPIs();
    try {
      const response = await api.get('/cmms/metrics/kpis/', { params: filters });
      return response.data;
    } catch {
      return this.getMockKPIs();
    }
  }

  /**
   * Obtém dados de tendência para uma métrica específica
   */
  async getTrend(metric: string, filters?: MetricFilter): Promise<TrendData> {
    if (USE_MOCK_DATA) return this.getMockTrend(metric, filters?.period || '30d');
    try {
      const response = await api.get(`/cmms/metrics/trends/${metric}/`, { params: filters });
      return response.data;
    } catch {
      return this.getMockTrend(metric, filters?.period || '30d');
    }
  }

  /**
   * Obtém distribuição de ordens de serviço
   */
  async getWorkOrderDistribution(filters?: MetricFilter): Promise<WorkOrderDistribution> {
    if (USE_MOCK_DATA) return this.getMockDistribution();
    try {
      const response = await api.get('/cmms/metrics/wo-distribution/', { params: filters });
      return response.data;
    } catch {
      return this.getMockDistribution();
    }
  }

  /**
   * Obtém health score dos equipamentos
   */
  async getEquipmentHealth(filters?: MetricFilter): Promise<EquipmentHealth[]> {
    if (USE_MOCK_DATA) return this.getMockEquipmentHealth();
    try {
      const response = await api.get('/cmms/metrics/equipment-health/', { params: filters });
      return response.data;
    } catch {
      return this.getMockEquipmentHealth();
    }
  }

  /**
   * Obtém previsões de ML
   */
  async getMLPredictions(equipmentId?: string): Promise<MLPrediction[]> {
    if (USE_MOCK_DATA) return this.getMockMLPredictions();
    try {
      const params = equipmentId ? { equipment_id: equipmentId } : {};
      const response = await api.get('/cmms/ml/predictions/', { params });
      return response.data;
    } catch {
      return this.getMockMLPredictions();
    }
  }

  /**
   * Obtém anomalias detectadas
   */
  async getAnomalies(filters?: MetricFilter): Promise<AnomalyData[]> {
    if (USE_MOCK_DATA) return this.getMockAnomalies();
    try {
      const response = await api.get('/cmms/ml/anomalies/', { params: filters });
      return response.data;
    } catch {
      return this.getMockAnomalies();
    }
  }

  /**
   * Obtém performance da equipe
   */
  async getTeamPerformance(filters?: MetricFilter): Promise<TechnicianPerformance[]> {
    if (USE_MOCK_DATA) return this.getMockTeamPerformance();
    try {
      const response = await api.get('/cmms/metrics/team-performance/', { params: filters });
      return response.data;
    } catch {
      return this.getMockTeamPerformance();
    }
  }

  /**
   * Obtém métricas de custo
   */
  async getCostMetrics(filters?: MetricFilter): Promise<CostMetrics> {
    if (USE_MOCK_DATA) return this.getMockCostMetrics(filters?.period || '30d');
    try {
      const response = await api.get('/cmms/metrics/costs/', { params: filters });
      return response.data;
    } catch {
      return this.getMockCostMetrics(filters?.period || '30d');
    }
  }

  /**
   * Obtém métricas de SLA
   */
  async getSLAMetrics(filters?: MetricFilter): Promise<SLAMetrics> {
    if (USE_MOCK_DATA) return this.getMockSLAMetrics();
    try {
      const response = await api.get('/cmms/metrics/sla/', { params: filters });
      return response.data;
    } catch {
      return this.getMockSLAMetrics();
    }
  }

  /**
   * Obtém dados de heatmap
   */
  async getHeatmapData(type: 'failures' | 'maintenance', filters?: MetricFilter): Promise<HeatmapData> {
    if (USE_MOCK_DATA) return this.getMockHeatmapData();
    try {
      const response = await api.get(`/cmms/metrics/heatmap/${type}/`, { params: filters });
      return response.data;
    } catch {
      return this.getMockHeatmapData();
    }
  }

  // ============================================
  // Mock Data (será removido quando API estiver pronta)
  // ============================================

  private getMockKPIs(): KPIResponse {
    const mttr: KPIMetric = {
      name: 'mttr',
      label: 'MTTR',
      value: 4.2,
      unit: 'horas',
      trend: -15,
      previous_value: 4.9,
      target: 4,
      status: 'warning',
    };
    const mtbf: KPIMetric = {
      name: 'mtbf',
      label: 'MTBF',
      value: 720,
      unit: 'horas',
      trend: 12,
      previous_value: 643,
      target: 800,
      status: 'good',
    };
    const availability: KPIMetric = {
      name: 'availability',
      label: 'Disponibilidade',
      value: 96.5,
      unit: '%',
      trend: 3,
      previous_value: 93.7,
      target: 95,
      status: 'good',
    };
    const completion_rate: KPIMetric = {
      name: 'completion_rate',
      label: 'Taxa de Conclusão',
      value: 89,
      unit: '%',
      trend: -2,
      previous_value: 91,
      target: 95,
      status: 'warning',
    };
    const preventive_ratio: KPIMetric = {
      name: 'preventive_ratio',
      label: 'Preventiva vs Corretiva',
      value: 70,
      unit: '%',
      trend: 5,
      previous_value: 67,
      target: 80,
      status: 'good',
    };
    const average_cost: KPIMetric = {
      name: 'average_cost',
      label: 'Custo Médio/OS',
      value: 2450,
      unit: 'R$',
      trend: -8,
      previous_value: 2663,
      status: 'good',
    };
    const backlog: KPIMetric = {
      name: 'backlog',
      label: 'Backlog',
      value: 12,
      unit: 'OS',
      trend: 25,
      previous_value: 9.6,
      target: 10,
      status: 'warning',
    };
    const oee: KPIMetric = {
      name: 'oee',
      label: 'OEE',
      value: 78.5,
      unit: '%',
      trend: 4,
      previous_value: 75.5,
      target: 85,
      status: 'warning',
    };

    return {
      kpis: [mttr, mtbf, availability, completion_rate, preventive_ratio, average_cost, backlog, oee],
      mttr,
      mtbf,
      availability,
      completion_rate,
      preventive_ratio,
      average_cost,
      backlog,
      oee,
    };
  }

  private getMockTrend(metric: string, period: string): TrendData {
    const days = periodToDays(period);
    const configs: Record<string, { base: number; variance: number; unit: string; label: string }> = {
      mttr: { base: 4, variance: 1.5, unit: 'horas', label: 'MTTR' },
      mtbf: { base: 700, variance: 100, unit: 'horas', label: 'MTBF' },
      availability: { base: 95, variance: 3, unit: '%', label: 'Disponibilidade' },
      completion_rate: { base: 88, variance: 8, unit: '%', label: 'Taxa de Conclusão' },
      oee: { base: 78, variance: 5, unit: '%', label: 'OEE' },
    };

    const config = configs[metric] || { base: 50, variance: 10, unit: '', label: metric };
    const data = generateTrendData(days, config.base, config.variance);
    const values = data.map(d => d.value);

    return {
      metric,
      label: config.label,
      unit: config.unit,
      data,
      average: values.reduce((a, b) => a + b, 0) / values.length,
      min: Math.min(...values),
      max: Math.max(...values),
    };
  }

  private getMockDistribution(): WorkOrderDistribution {
    return {
      by_type: [
        { name: 'Preventiva', value: 45, percentage: 45, color: '#10b981' },
        { name: 'Corretiva', value: 30, percentage: 30, color: '#ef4444' },
        { name: 'Preditiva', value: 15, percentage: 15, color: '#3b82f6' },
        { name: 'Solicitação', value: 10, percentage: 10, color: '#f59e0b' },
      ],
      by_priority: [
        { name: 'Crítica', value: 8, percentage: 8, color: '#ef4444' },
        { name: 'Alta', value: 22, percentage: 22, color: '#f97316' },
        { name: 'Média', value: 45, percentage: 45, color: '#eab308' },
        { name: 'Baixa', value: 25, percentage: 25, color: '#22c55e' },
      ],
      by_status: [
        { name: 'Aberta', value: 15, percentage: 15, color: '#3b82f6' },
        { name: 'Em Andamento', value: 25, percentage: 25, color: '#f59e0b' },
        { name: 'Concluída', value: 55, percentage: 55, color: '#10b981' },
        { name: 'Cancelada', value: 5, percentage: 5, color: '#6b7280' },
      ],
      by_sector: [
        { name: 'Produção', value: 40, percentage: 40, color: '#8b5cf6' },
        { name: 'Utilidades', value: 30, percentage: 30, color: '#06b6d4' },
        { name: 'Embalagem', value: 20, percentage: 20, color: '#ec4899' },
        { name: 'Logística', value: 10, percentage: 10, color: '#84cc16' },
      ],
    };
  }

  private getMockEquipmentHealth(): EquipmentHealth[] {
    return [
      {
        equipment_id: '1',
        equipment_name: 'Chiller 01',
        equipment_tag: 'CHILLER-001',
        sector_name: 'Casa de Máquinas',
        health_score: 85,
        failure_probability: 15,
        last_maintenance: '2025-12-10',
        next_maintenance: '2026-01-10',
        risk_level: 'low',
        mttr: 3.5,
        mtbf: 850,
        total_failures: 2,
        downtime_hours: 7,
      },
      {
        equipment_id: '2',
        equipment_name: 'Compressor 01',
        equipment_tag: 'COMP-001',
        sector_name: 'Utilidades',
        health_score: 72,
        failure_probability: 35,
        last_maintenance: '2025-11-15',
        next_maintenance: '2025-12-20',
        risk_level: 'medium',
        mttr: 5.2,
        mtbf: 520,
        total_failures: 5,
        downtime_hours: 26,
      },
      {
        equipment_id: '3',
        equipment_name: 'Torre de Resfriamento',
        equipment_tag: 'TORRE-001',
        sector_name: 'Utilidades',
        health_score: 45,
        failure_probability: 68,
        last_maintenance: '2025-10-20',
        next_maintenance: '2025-12-25',
        risk_level: 'high',
        mttr: 8.1,
        mtbf: 280,
        total_failures: 8,
        downtime_hours: 65,
      },
      {
        equipment_id: '4',
        equipment_name: 'Bomba Centrífuga 02',
        equipment_tag: 'BOMB-002',
        sector_name: 'Casa de Máquinas',
        health_score: 28,
        failure_probability: 85,
        last_maintenance: '2025-09-01',
        next_maintenance: '2025-12-01',
        risk_level: 'critical',
        mttr: 12.5,
        mtbf: 180,
        total_failures: 12,
        downtime_hours: 150,
      },
      {
        equipment_id: '5',
        equipment_name: 'Fan Coil 03',
        equipment_tag: 'FC-003',
        sector_name: 'Produção',
        health_score: 92,
        failure_probability: 8,
        last_maintenance: '2025-12-15',
        next_maintenance: '2026-03-15',
        risk_level: 'low',
        mttr: 1.5,
        mtbf: 1200,
        total_failures: 1,
        downtime_hours: 1.5,
      },
    ];
  }

  private getMockMLPredictions(): MLPrediction[] {
    return [
      {
        id: 'pred-1',
        equipment_id: '4',
        equipment_name: 'Bomba Centrífuga 02',
        prediction_date: '2025-12-25',
        failure_probability: 0.85,
        confidence: 0.92,
        recommended_action: 'Manutenção preventiva urgente - substituir rolamentos',
        estimated_time_to_failure: 144,
        days_until_failure: 6,
        failure_type: 'Falha de Rolamento',
        risk_level: 'high',
        risk_score: 9.2,
        anomaly_score: 0.87,
      },
      {
        id: 'pred-2',
        equipment_id: '3',
        equipment_name: 'Torre de Resfriamento',
        prediction_date: '2026-01-05',
        failure_probability: 0.68,
        confidence: 0.78,
        recommended_action: 'Inspeção do sistema de ventilação',
        estimated_time_to_failure: 408,
        days_until_failure: 17,
        failure_type: 'Degradação de Ventilador',
        risk_level: 'medium',
        risk_score: 7.5,
        anomaly_score: 0.65,
      },
      {
        id: 'pred-3',
        equipment_id: '2',
        equipment_name: 'Compressor 01',
        prediction_date: '2026-01-15',
        failure_probability: 0.45,
        confidence: 0.85,
        recommended_action: 'Verificar nível de óleo e pressões',
        estimated_time_to_failure: 648,
        days_until_failure: 27,
        failure_type: 'Desgaste Normal',
        risk_level: 'low',
        risk_score: 5.8,
        anomaly_score: 0.42,
      },
    ];
  }

  private getMockAnomalies(): AnomalyData[] {
    return [
      {
        id: '1',
        equipment_id: '4',
        equipment_name: 'Bomba Centrífuga 02',
        detected_at: '2025-12-18T14:30:00',
        metric: 'Vibração',
        deviation: 3.2,
        anomaly_type: 'Vibração Anormal',
        severity: 'critical',
        description: 'Vibração 3x acima do normal detectada no eixo principal',
        status: 'active',
        metrics: { vibration: 12.5, normal_vibration: 4.2 },
      },
      {
        id: '2',
        equipment_id: '3',
        equipment_name: 'Torre de Resfriamento',
        detected_at: '2025-12-17T09:15:00',
        metric: 'Temperatura',
        deviation: 2.1,
        anomaly_type: 'Temperatura Elevada',
        severity: 'high',
        description: 'Temperatura de saída 15°C acima do esperado',
        status: 'acknowledged',
        metrics: { temperature: 42, expected_temperature: 27 },
      },
      {
        id: '3',
        equipment_id: '2',
        equipment_name: 'Compressor 01',
        detected_at: '2025-12-16T16:45:00',
        metric: 'Energia',
        deviation: 1.5,
        anomaly_type: 'Consumo Energético',
        severity: 'medium',
        description: 'Consumo 20% acima da média histórica',
        status: 'resolved',
        metrics: { consumption: 45.6, average_consumption: 38.0 },
      },
    ];
  }

  private getMockTeamPerformance(): TechnicianPerformance[] {
    return [
      {
        id: '1',
        user_id: '1',
        name: 'Carlos Silva',
        role: 'Técnico Sênior',
        total_work_orders: 28,
        work_orders_completed: 26,
        avg_completion_time: 3.8,
        efficiency: 92,
        satisfaction_score: 95,
        on_time_rate: 92,
        quality_score: 95,
      },
      {
        id: '2',
        user_id: '2',
        name: 'João Santos',
        role: 'Técnico Pleno',
        total_work_orders: 24,
        work_orders_completed: 22,
        avg_completion_time: 4.5,
        efficiency: 88,
        satisfaction_score: 90,
        on_time_rate: 88,
        quality_score: 90,
      },
      {
        id: '3',
        user_id: '3',
        name: 'Maria Oliveira',
        role: 'Técnica Pleno',
        total_work_orders: 22,
        work_orders_completed: 20,
        avg_completion_time: 3.2,
        efficiency: 95,
        satisfaction_score: 98,
        on_time_rate: 95,
        quality_score: 98,
      },
      {
        id: '4',
        user_id: '4',
        name: 'Pedro Costa',
        role: 'Técnico Júnior',
        total_work_orders: 18,
        work_orders_completed: 16,
        avg_completion_time: 5.1,
        efficiency: 78,
        satisfaction_score: 85,
        on_time_rate: 80,
        quality_score: 82,
      },
    ];
  }

  private getMockCostMetrics(period: string): CostMetrics {
    const days = periodToDays(period);
    
    // Gerar dados de tendência por categoria
    const trendData: { date: string; labor: number; parts: number; external: number }[] = [];
    const now = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      trendData.push({
        date: date.toISOString().split('T')[0],
        labor: 2500 + Math.random() * 1000,
        parts: 3000 + Math.random() * 1500,
        external: 800 + Math.random() * 400,
      });
    }
    
    return {
      total_cost: 185000,
      preventive_cost: 65000,
      corrective_cost: 85000,
      parts_cost: 95000,
      labor_cost: 90000,
      external_services_cost: 35000,
      cost_per_asset: 3700,
      budget: 250000,
      cost_trend: generateTrendData(days, 6000, 2000),
      trend: trendData,
      cost_by_category: [
        { name: 'Peças', value: 95000, percentage: 51, color: '#3b82f6' },
        { name: 'Mão de Obra', value: 90000, percentage: 49, color: '#10b981' },
      ],
      cost_by_sector: [
        { name: 'Produção', value: 74000, percentage: 40, color: '#8b5cf6' },
        { name: 'Utilidades', value: 55500, percentage: 30, color: '#06b6d4' },
        { name: 'Embalagem', value: 37000, percentage: 20, color: '#ec4899' },
        { name: 'Logística', value: 18500, percentage: 10, color: '#84cc16' },
      ],
    };
  }

  private getMockSLAMetrics(): SLAMetrics {
    return {
      overall_compliance: 87,
      response_time_compliance: 92,
      resolution_time_compliance: 85,
      first_fix_rate: 78,
      customer_satisfaction: 88,
      by_priority: [
        { priority: 'Crítica', target: 4, actual: 3.2, compliance: 95 },
        { priority: 'Alta', target: 8, actual: 7.5, compliance: 90 },
        { priority: 'Média', target: 24, actual: 22, compliance: 88 },
        { priority: 'Baixa', target: 72, actual: 68, compliance: 85 },
      ],
      trend: generateTrendData(30, 87, 5),
    };
  }

  private getMockHeatmapData(): HeatmapData {
    const days = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
    const hours = ['06h', '08h', '10h', '12h', '14h', '16h', '18h', '20h', '22h'];
    const data: [number, number, number][] = [];
    
    for (let i = 0; i < days.length; i++) {
      for (let j = 0; j < hours.length; j++) {
        data.push([i, j, Math.floor(Math.random() * 10)]);
      }
    }

    return {
      x_axis: days,
      y_axis: hours,
      data,
      min: 0,
      max: 10,
    };
  }
}

export const metricsService = new MetricsService();
