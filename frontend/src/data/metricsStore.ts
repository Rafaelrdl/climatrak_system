import type { MetricsSummary, MetricsRange, MTTRBySector, BacklogTrend, TopAssetByWO } from '@/models/metrics';
import type { WorkOrder, Equipment, Sector } from '@/types';
import { MOCK_EQUIPMENT, MOCK_SECTORS } from '@/data/mockData';
import { EXPANDED_WORK_ORDERS } from '@/data/mockMetricsData';

// Chaves do localStorage
const STORAGE_KEYS = {
  WORK_ORDERS: 'traknor-work-orders',
  EQUIPMENT: 'traknor-equipment',
  SECTORS: 'traknor-sectors',
};

/**
 * Carrega dados do localStorage ou usa seeds como fallback
 */
function loadEntity<T>(key: string, seed: T[]): T[] {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : seed;
  } catch (error) {
    console.warn(`Erro ao carregar ${key} do localStorage:`, error);
    return seed;
  }
}

/**
 * Salva dados no localStorage
 */
function saveEntity<T>(key: string, data: T[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.warn(`Erro ao salvar ${key} no localStorage:`, error);
  }
}

/**
 * Carrega todos os dados necessários para métricas
 */
export function loadMetricsData() {
  const workOrders = loadEntity(STORAGE_KEYS.WORK_ORDERS, EXPANDED_WORK_ORDERS);
  const equipment = loadEntity(STORAGE_KEYS.EQUIPMENT, MOCK_EQUIPMENT);
  const sectors = loadEntity(STORAGE_KEYS.SECTORS, MOCK_SECTORS);
  
  return { workOrders, equipment, sectors };
}

/**
 * Obtém data de início baseada no range
 */
function getStartDate(range: MetricsRange): Date {
  const now = new Date();
  
  switch (range) {
    case '30d':
      return new Date(now.setDate(now.getDate() - 30));
    case '90d':
      return new Date(now.setDate(now.getDate() - 90));
    case '12m':
      return new Date(now.setFullYear(now.getFullYear() - 1));
    default:
      return new Date(now.setDate(now.getDate() - 90));
  }
}

/**
 * Filtra OS por período
 */
function filterWorkOrdersByRange(workOrders: WorkOrder[], range: MetricsRange): WorkOrder[] {
  const startDate = getStartDate(range);
  
  return workOrders.filter(wo => {
    const createdAt = new Date(wo.scheduledDate);
    return createdAt >= startDate;
  });
}

/**
 * Calcula MTTR (Mean Time To Repair) em horas
 * Para OS do tipo CORRECTIVE que foram COMPLETED
 */
function calculateMTTR(workOrders: WorkOrder[]): number {
  const completedCorrectiveWOs = workOrders.filter(
    wo => wo.type === 'CORRECTIVE' && wo.status === 'COMPLETED' && wo.completedAt
  );
  
  if (completedCorrectiveWOs.length === 0) return 0;
  
  const totalHours = completedCorrectiveWOs.reduce((total, wo) => {
    const startDate = new Date(wo.scheduledDate);
    const endDate = new Date(wo.completedAt!);
    const hours = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);
    return total + Math.max(hours, 0);
  }, 0);
  
  return Math.round((totalHours / completedCorrectiveWOs.length) * 10) / 10;
}

/**
 * Calcula porcentagem de backlog
 * Backlog % = OS em aberto / Total de OS * 100
 */
function calculateBacklogPercent(workOrders: WorkOrder[]): number {
  if (workOrders.length === 0) return 0;
  
  const openWOs = workOrders.filter(wo => wo.status === 'OPEN').length;
  return Math.round((openWOs / workOrders.length) * 100);
}

/**
 * Encontra o ativo com maior número de OS
 */
function getTopAssetByWO(workOrders: WorkOrder[], equipment: Equipment[], sectors: Sector[]): TopAssetByWO | null {
  if (workOrders.length === 0) return null;
  
  // Conta OS por equipamento
  const countByEquipment = workOrders.reduce((acc, wo) => {
    acc[wo.equipmentId] = (acc[wo.equipmentId] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  // Encontra o equipamento com maior count
  const topEquipmentId = Object.entries(countByEquipment)
    .sort(([, a], [, b]) => b - a)[0]?.[0];
  
  if (!topEquipmentId) return null;
  
  const topEquipment = equipment.find(eq => eq.id === topEquipmentId);
  if (!topEquipment) return null;
  
  const sector = sectors.find(s => s.id === topEquipment.sectorId);
  
  return {
    asset_id: topEquipment.id,
    asset_name: `${topEquipment.tag} - ${topEquipment.model}`,
    count: countByEquipment[topEquipmentId],
    sector_name: sector?.name || 'N/A'
  };
}

/**
 * Calcula % de preventivas no prazo
 * Preventivas concluídas dentro do período / Total de preventivas programadas * 100
 */
function calculatePreventiveOnTimePercent(workOrders: WorkOrder[]): number {
  const preventiveWOs = workOrders.filter(wo => wo.type === 'PREVENTIVE');
  
  if (preventiveWOs.length === 0) return 0;
  
  const onTimeWOs = preventiveWOs.filter(wo => {
    if (wo.status !== 'COMPLETED' || !wo.completedAt) return false;
    
    // Considera "no prazo" se foi concluída no mesmo dia ou antes da data programada
    const scheduledDate = new Date(wo.scheduledDate);
    const completedDate = new Date(wo.completedAt);
    
    return completedDate <= scheduledDate;
  });
  
  return Math.round((onTimeWOs.length / preventiveWOs.length) * 100);
}

/**
 * Calcula MTTR por setor
 */
function calculateMTTRBySector(workOrders: WorkOrder[], equipment: Equipment[], sectors: Sector[]): MTTRBySector[] {
  const sectorMTTR: Record<string, { totalHours: number; count: number; name: string }> = {};
  
  // Agrupa OS corretivas concluídas por setor
  workOrders
    .filter(wo => wo.type === 'CORRECTIVE' && wo.status === 'COMPLETED' && wo.completedAt)
    .forEach(wo => {
      const eq = equipment.find(e => e.id === wo.equipmentId);
      if (!eq?.sectorId) return;
      
      const sector = sectors.find(s => s.id === eq.sectorId);
      if (!sector) return;
      
      const startDate = new Date(wo.scheduledDate);
      const endDate = new Date(wo.completedAt!);
      const hours = Math.max((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60), 0);
      
      if (!sectorMTTR[sector.id]) {
        sectorMTTR[sector.id] = { totalHours: 0, count: 0, name: sector.name };
      }
      
      sectorMTTR[sector.id].totalHours += hours;
      sectorMTTR[sector.id].count++;
    });
  
  // Converte para array e calcula MTTR médio
  return Object.entries(sectorMTTR)
    .map(([sectorId, data]) => ({
      sector_name: data.name,
      mttr_hours: Math.round((data.totalHours / data.count) * 10) / 10,
      wo_count: data.count
    }))
    .sort((a, b) => b.mttr_hours - a.mttr_hours) // Ordena por maior MTTR
    .slice(0, 8); // Top 8
}

/**
 * Calcula backlog % mensal para os últimos períodos
 */
function calculateBacklogTrends(workOrders: WorkOrder[], range: MetricsRange): BacklogTrend[] {
  const periods = range === '12m' ? 12 : 6;
  const trends: BacklogTrend[] = [];
  
  for (let i = periods - 1; i >= 0; i--) {
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() - i);
    endDate.setDate(1); // Primeiro dia do mês
    
    const startDate = new Date(endDate);
    startDate.setMonth(startDate.getMonth() - 1);
    
    const monthWOs = workOrders.filter(wo => {
      const woDate = new Date(wo.scheduledDate);
      return woDate >= startDate && woDate < endDate;
    });
    
    const openWOs = monthWOs.filter(wo => wo.status === 'OPEN').length;
    const totalWOs = monthWOs.length;
    const backlogPercent = totalWOs > 0 ? Math.round((openWOs / totalWOs) * 100) : 0;
    
    trends.push({
      month: endDate.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
      backlog_percent: backlogPercent,
      total_os: totalWOs,
      open_os: openWOs
    });
  }
  
  return trends;
}

/**
 * Computa todas as métricas para o range especificado
 */
export function computeMetrics(range: MetricsRange = '90d'): MetricsSummary {
  const { workOrders, equipment, sectors } = loadMetricsData();
  const filteredWOs = filterWorkOrdersByRange(workOrders, range);
  
  const rangePeriods = {
    '30d': 'Últimos 30 dias',
    '90d': 'Últimos 90 dias', 
    '12m': 'Últimos 12 meses'
  };
  
  return {
    range,
    period: rangePeriods[range],
    kpis: {
      mttr_hours: calculateMTTR(filteredWOs),
      backlog_percent: calculateBacklogPercent(filteredWOs),
      top_asset_by_os: getTopAssetByWO(filteredWOs, equipment, sectors),
      preventive_on_time_percent: calculatePreventiveOnTimePercent(filteredWOs)
    },
    charts: {
      mttr_by_sector: calculateMTTRBySector(filteredWOs, equipment, sectors),
      backlog_percent_monthly: calculateBacklogTrends(workOrders, range)
    },
    generated_at: new Date().toISOString()
  };
}

/**
 * Exporta métricas para CSV
 */
export function exportMetricsToCSV(summary: MetricsSummary): Blob {
  const csvContent = [
    // KPIs
    'INDICADORES CHAVE (KPIs)',
    `MTTR (horas),${summary.kpis.mttr_hours}`,
    `Backlog (%),${summary.kpis.backlog_percent}`,
    `Top Ativo por OS,${summary.kpis.top_asset_by_os?.asset_name || 'N/A'}`,
    `Preventivas no Prazo (%),${summary.kpis.preventive_on_time_percent}`,
    '',
    
    // MTTR por Setor
    'MTTR POR SETOR',
    'Setor,MTTR (horas),Qtd OS',
    ...summary.charts.mttr_by_sector.map(item => 
      `${item.sector_name},${item.mttr_hours},${item.wo_count}`
    ),
    '',
    
    // Backlog Trends
    'EVOLUÇÃO DO BACKLOG',
    'Mês,Backlog (%),Total OS,OS Abertas',
    ...summary.charts.backlog_percent_monthly.map(item =>
      `${item.month},${item.backlog_percent},${item.total_os},${item.open_os}`
    ),
    '',
    
    `Gerado em: ${new Date(summary.generated_at).toLocaleString('pt-BR')}`,
    `Período: ${summary.period}`
  ].join('\n');
  
  return new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
}

/**
 * Prepara página para impressão/PDF
 */
export function exportPageToPDF(): void {
  // Adiciona classe para estilo de impressão
  document.body.classList.add('printing');
  
  // Aguarda um momento para aplicar estilos e então abre o diálogo de impressão
  setTimeout(() => {
    window.print();
    
    // Remove classe após impressão
    setTimeout(() => {
      document.body.classList.remove('printing');
    }, 1000);
  }, 100);
}

/**
 * Simula API endpoint GET /metrics/summary
 */
export async function getMetricsSummary(range: MetricsRange = '90d'): Promise<MetricsSummary> {
  // Simula delay de rede
  await new Promise(resolve => setTimeout(resolve, 300));
  
  return computeMetrics(range);
}