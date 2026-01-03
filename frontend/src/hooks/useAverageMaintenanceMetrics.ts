/**
 * useAverageMaintenanceMetrics - Hook para cálculo de métricas médias de manutenção
 * 
 * Calcula indicadores médios de MTTR e MTBF para todos os ativos cadastrados.
 * Usa o hook useMaintenanceMetrics internamente para cada ativo e então
 * calcula a média ponderada.
 * 
 * Fórmulas:
 * - MTTR Médio = Soma(MTTR * falhas) / Soma(falhas) [ponderado por falhas]
 * - MTBF Médio = Soma(MTBF * horas_operação) / Soma(horas_operação) [ponderado por operação]
 * - Disponibilidade Média = Média aritmética das disponibilidades
 */

import { useMemo } from 'react';
import { useEquipments } from '@/hooks/useEquipmentQuery';
import { useWorkOrders } from '@/hooks/useWorkOrdersQuery';
import type { WorkOrder, Equipment } from '@/types';

export interface AverageMaintenanceMetrics {
  /** MTTR médio em horas - Tempo médio para reparo (ponderado por falhas) */
  averageMTTR: number;
  /** MTBF médio em horas - Tempo médio entre falhas (ponderado por operação) */
  averageMTBF: number;
  /** Disponibilidade média em % */
  averageAvailability: number;
  /** Uptime médio em % */
  averageUptime: number;
  /** Total de ativos analisados */
  totalAssets: number;
  /** Ativos com data de instalação (métricas válidas) */
  assetsWithMetrics: number;
  /** Total de falhas em todos os ativos */
  totalFailures: number;
  /** Total de horas em reparo em todos os ativos */
  totalRepairHours: number;
  /** Total de horas de operação */
  totalOperatingHours: number;
  /** Indica se está carregando os dados */
  isLoading: boolean;
  /** Erro se houver */
  error: Error | null;
  /** Métricas detalhadas por ativo (para drill-down) */
  assetMetrics: AssetMetricDetail[];
}

export interface AssetMetricDetail {
  assetId: string;
  assetTag: string;
  assetModel: string;
  mttr: number;
  mtbf: number;
  availability: number;
  uptime: number;
  totalFailures: number;
  totalRepairHours: number;
  operatingHours: number;
  missingInstallationDate: boolean;
}

export interface UseAverageMaintenanceMetricsOptions {
  /** Período de análise em dias (padrão: 365 dias) */
  analysisPeriodDays?: number;
  /** Horas de operação diárias estimadas (padrão: 24h para equipamentos HVAC) */
  dailyOperatingHours?: number;
  /** Incluir apenas ativos ativos (não parados) */
  activeOnly?: boolean;
  /** Filtrar por tipo de equipamento */
  equipmentType?: Equipment['type'];
  /** Filtrar por setor */
  sectorId?: string;
}

/**
 * Calcula métricas de manutenção para um único ativo
 * (Função auxiliar reutilizando lógica do useMaintenanceMetrics)
 */
function calculateAssetMetrics(
  workOrders: WorkOrder[],
  installationDate: string | null | undefined,
  analysisPeriodDays: number,
  dailyOperatingHours: number
): Omit<AssetMetricDetail, 'assetId' | 'assetTag' | 'assetModel'> {
  // Verificar se a data de instalação foi fornecida
  const missingInstallationDate = !installationDate;
  
  // Filtrar apenas manutenções corretivas concluídas (falhas reais)
  const correctiveWorkOrders = workOrders.filter(
    (wo) => wo.type === 'CORRECTIVE' && wo.status === 'COMPLETED'
  );

  // Filtrar manutenções de emergência também como falhas
  const emergencyWorkOrders = workOrders.filter(
    (wo) => wo.type === 'EMERGENCY' && wo.status === 'COMPLETED'
  );

  // Total de falhas = corretivas + emergências
  const failureWorkOrders = [...correctiveWorkOrders, ...emergencyWorkOrders];
  const totalFailures = failureWorkOrders.length;

  // Se não tem data de instalação, retornar valores zerados
  if (missingInstallationDate) {
    return {
      mttr: 0,
      mtbf: 0,
      availability: 0,
      uptime: 0,
      totalFailures,
      totalRepairHours: 0,
      operatingHours: 0,
      missingInstallationDate: true,
    };
  }

  // Calcular período de operação baseado na data de instalação
  const installDate = new Date(installationDate);
  const now = new Date();
  const daysSinceInstall = Math.max(1, Math.floor((now.getTime() - installDate.getTime()) / (1000 * 60 * 60 * 24)));
  
  // Usar o período TOTAL desde a instalação
  const operatingHours = daysSinceInstall * dailyOperatingHours;

  // Calcular tempo total de reparo (downtime)
  const totalRepairHours = failureWorkOrders.reduce((total, wo) => {
    // Tentar usar actual_hours do backend ou calcular pela diferença de datas
    if ((wo as any).actual_hours && (wo as any).actual_hours > 0) {
      return total + (wo as any).actual_hours;
    }
    
    // Se temos startedAt e completedAt, calcular a diferença
    if (wo.startedAt && wo.completedAt) {
      const start = new Date(wo.startedAt);
      const end = new Date(wo.completedAt);
      const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      return total + Math.max(0, hours);
    }
    
    // Se temos createdAt e completedAt
    if (wo.createdAt && wo.completedAt) {
      const start = new Date(wo.createdAt);
      const end = new Date(wo.completedAt);
      const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      // Limitar a um máximo razoável (ex: 720 horas = 30 dias)
      return total + Math.min(Math.max(0, hours), 720);
    }
    
    // Fallback: assumir tempo médio de reparo de 4 horas
    return total + 4;
  }, 0);

  // MTBF = Tempo de operação / Número de falhas
  const mtbf = totalFailures > 0 
    ? Math.round(operatingHours / totalFailures) 
    : operatingHours;

  // MTTR = Tempo total de reparo / Número de reparos
  const mttr = totalFailures > 0 
    ? Math.round((totalRepairHours / totalFailures) * 100) / 100 
    : 0;

  // Availability = MTBF / (MTBF + MTTR) * 100
  const availabilityRaw = mtbf > 0 
    ? (mtbf / (mtbf + mttr)) * 100 
    : 100;
  const availability = Math.round(availabilityRaw * 100) / 100;

  // Uptime = (Horas de operação - Horas de reparo) / Horas de operação * 100
  const uptimeRaw = operatingHours > 0 
    ? ((operatingHours - totalRepairHours) / operatingHours) * 100 
    : 100;
  const uptime = Math.round(uptimeRaw * 100) / 100;

  return {
    mttr,
    mtbf,
    availability: Math.min(100, Math.max(0, availability)),
    uptime: Math.min(100, Math.max(0, uptime)),
    totalFailures,
    totalRepairHours: Math.round(totalRepairHours * 100) / 100,
    operatingHours,
    missingInstallationDate: false,
  };
}

/**
 * Hook para cálculo de métricas médias de manutenção de todos os ativos
 * 
 * @param options - Opções de configuração do cálculo
 * @returns Métricas médias de MTTR, MTBF, disponibilidade, etc.
 */
export function useAverageMaintenanceMetrics(
  options: UseAverageMaintenanceMetricsOptions = {}
): AverageMaintenanceMetrics {
  const {
    analysisPeriodDays = 365,
    dailyOperatingHours = 24,
    activeOnly = false,
    equipmentType,
    sectorId,
  } = options;

  // Buscar todos os equipamentos
  const { 
    data: equipments = [], 
    isLoading: isLoadingEquipments,
    error: equipmentsError 
  } = useEquipments();

  // Buscar todas as ordens de serviço
  const { 
    data: workOrders = [], 
    isLoading: isLoadingWorkOrders,
    error: workOrdersError 
  } = useWorkOrders();

  const isLoading = isLoadingEquipments || isLoadingWorkOrders;
  const error = equipmentsError || workOrdersError;

  return useMemo(() => {
    if (isLoading || error) {
      return {
        averageMTTR: 0,
        averageMTBF: 0,
        averageAvailability: 0,
        averageUptime: 0,
        totalAssets: 0,
        assetsWithMetrics: 0,
        totalFailures: 0,
        totalRepairHours: 0,
        totalOperatingHours: 0,
        isLoading,
        error: error as Error | null,
        assetMetrics: [],
      };
    }

    // Filtrar equipamentos conforme opções
    let filteredEquipments = equipments;
    
    if (activeOnly) {
      filteredEquipments = filteredEquipments.filter(eq => eq.status !== 'STOPPED');
    }
    
    if (equipmentType) {
      filteredEquipments = filteredEquipments.filter(eq => eq.type === equipmentType);
    }
    
    if (sectorId) {
      filteredEquipments = filteredEquipments.filter(eq => eq.sectorId === sectorId);
    }

    // Calcular métricas para cada ativo
    const assetMetrics: AssetMetricDetail[] = filteredEquipments.map(equipment => {
      // Filtrar OSs deste equipamento
      const assetWorkOrders = workOrders.filter(wo => wo.equipmentId === equipment.id);
      
      const metrics = calculateAssetMetrics(
        assetWorkOrders,
        equipment.installDate,
        analysisPeriodDays,
        dailyOperatingHours
      );

      return {
        assetId: equipment.id,
        assetTag: equipment.tag,
        assetModel: equipment.model,
        ...metrics,
      };
    });

    // Filtrar apenas ativos com métricas válidas (com data de instalação)
    const validAssetMetrics = assetMetrics.filter(m => !m.missingInstallationDate);
    
    // Calcular totais
    const totalAssets = assetMetrics.length;
    const assetsWithMetrics = validAssetMetrics.length;
    const totalFailures = validAssetMetrics.reduce((sum, m) => sum + m.totalFailures, 0);
    const totalRepairHours = validAssetMetrics.reduce((sum, m) => sum + m.totalRepairHours, 0);
    const totalOperatingHours = validAssetMetrics.reduce((sum, m) => sum + m.operatingHours, 0);

    // Calcular médias ponderadas
    // MTTR: Ponderado pelo número de falhas de cada ativo
    const weightedMTTR = validAssetMetrics.reduce(
      (sum, m) => sum + (m.mttr * m.totalFailures), 
      0
    );
    const averageMTTR = totalFailures > 0 
      ? Math.round((weightedMTTR / totalFailures) * 100) / 100
      : 0;

    // MTBF: Ponderado pelas horas de operação de cada ativo
    const weightedMTBF = validAssetMetrics.reduce(
      (sum, m) => sum + (m.mtbf * m.operatingHours), 
      0
    );
    const averageMTBF = totalOperatingHours > 0 
      ? Math.round(weightedMTBF / totalOperatingHours)
      : 0;

    // Disponibilidade e Uptime: Média aritmética simples
    const averageAvailability = assetsWithMetrics > 0
      ? Math.round(
          (validAssetMetrics.reduce((sum, m) => sum + m.availability, 0) / assetsWithMetrics) * 100
        ) / 100
      : 0;

    const averageUptime = assetsWithMetrics > 0
      ? Math.round(
          (validAssetMetrics.reduce((sum, m) => sum + m.uptime, 0) / assetsWithMetrics) * 100
        ) / 100
      : 0;

    return {
      averageMTTR,
      averageMTBF,
      averageAvailability,
      averageUptime,
      totalAssets,
      assetsWithMetrics,
      totalFailures,
      totalRepairHours,
      totalOperatingHours,
      isLoading,
      error: null,
      assetMetrics,
    };
  }, [
    equipments,
    workOrders,
    isLoading,
    error,
    analysisPeriodDays,
    dailyOperatingHours,
    activeOnly,
    equipmentType,
    sectorId,
  ]);
}

/**
 * Formata MTTR médio para exibição amigável
 */
export function formatAverageMTTR(mttrHours: number): string {
  if (mttrHours === 0) {
    return '0 h';
  } else if (mttrHours >= 48) {
    const days = mttrHours / 24;
    return `${days.toFixed(1)} dias`;
  } else if (mttrHours >= 1) {
    return `${mttrHours.toFixed(1)} h`;
  } else {
    const minutes = Math.round(mttrHours * 60);
    return `${minutes} min`;
  }
}

/**
 * Formata MTBF médio para exibição amigável
 */
export function formatAverageMTBF(mtbfHours: number): string {
  if (mtbfHours >= 8760) {
    const years = mtbfHours / 8760;
    return `${years.toFixed(1)} anos`;
  } else if (mtbfHours >= 720) {
    const days = Math.round(mtbfHours / 24);
    return `${days} dias`;
  } else if (mtbfHours >= 24) {
    const days = mtbfHours / 24;
    return `${days.toFixed(1)} dias`;
  } else {
    return `${mtbfHours.toLocaleString('pt-BR')} h`;
  }
}

/**
 * Retorna status/cor baseado no MTTR médio
 */
export function getAverageMTTRStatus(mttrHours: number): 'excellent' | 'good' | 'warning' | 'critical' {
  if (mttrHours === 0) return 'excellent';
  if (mttrHours <= 4) return 'excellent';
  if (mttrHours <= 8) return 'good';
  if (mttrHours <= 24) return 'warning';
  return 'critical';
}

/**
 * Retorna status/cor baseado no MTBF médio
 */
export function getAverageMTBFStatus(mtbfHours: number): 'excellent' | 'good' | 'warning' | 'critical' {
  if (mtbfHours >= 4320) return 'excellent'; // 6 meses+
  if (mtbfHours >= 2160) return 'good';      // 3 meses+
  if (mtbfHours >= 720) return 'warning';    // 1 mês+
  return 'critical';
}

export default useAverageMaintenanceMetrics;
