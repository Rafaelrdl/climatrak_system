/**
 * useMaintenanceMetrics - Hook para cálculo de métricas de manutenção
 * 
 * Calcula indicadores chave de manutenção:
 * - MTBF (Mean Time Between Failures): Tempo médio entre falhas
 * - MTTR (Mean Time To Repair): Tempo médio para reparo
 * - Availability: Disponibilidade do equipamento
 * - Reliability: Confiabilidade do equipamento
 * 
 * Fórmulas:
 * - MTBF = Tempo total de operação / Número de falhas
 * - MTTR = Tempo total de reparo / Número de reparos
 * - Availability = MTBF / (MTBF + MTTR) * 100
 * - Reliability = e^(-t/MTBF) onde t é o período de análise
 */

import { useMemo } from 'react';
import type { WorkOrder } from '@/types';

export interface MaintenanceMetrics {
  /** MTBF em horas - Tempo médio entre falhas */
  mtbf: number;
  /** MTTR em horas - Tempo médio para reparo */
  mttr: number;
  /** Disponibilidade em % */
  availability: number;
  /** Confiabilidade em % (para o período analisado) */
  reliability: number;
  /** Uptime em % */
  uptime: number;
  /** Total de falhas (manutenções corretivas) */
  totalFailures: number;
  /** Total de horas em reparo */
  totalRepairHours: number;
  /** Total de horas de operação no período */
  operatingHours: number;
  /** Período de análise em dias */
  analysisPeriodDays: number;
}

export interface UseMaintenanceMetricsOptions {
  /** Data de instalação do equipamento (para calcular período total) */
  installationDate?: string | Date | null;
  /** Período de análise em dias (padrão: 365 dias) */
  analysisPeriodDays?: number;
  /** Horas de operação diárias estimadas (padrão: 24h para equipamentos HVAC) */
  dailyOperatingHours?: number;
}

/**
 * Calcula métricas de manutenção baseadas nas ordens de serviço
 * 
 * @param workOrders - Lista de ordens de serviço do equipamento
 * @param options - Opções de configuração do cálculo
 * @returns Métricas calculadas de MTBF, MTTR, disponibilidade, etc.
 */
export function useMaintenanceMetrics(
  workOrders: WorkOrder[] | any[],
  options: UseMaintenanceMetricsOptions = {}
): MaintenanceMetrics {
  const {
    installationDate,
    analysisPeriodDays = 365,
    dailyOperatingHours = 24,
  } = options;

  return useMemo(() => {
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

    // Calcular período de operação
    let operatingHours: number;
    
    if (installationDate) {
      const installDate = new Date(installationDate);
      const now = new Date();
      const daysSinceInstall = Math.max(1, Math.floor((now.getTime() - installDate.getTime()) / (1000 * 60 * 60 * 24)));
      // Usar o menor entre dias desde instalação e período de análise
      const effectiveDays = Math.min(daysSinceInstall, analysisPeriodDays);
      operatingHours = effectiveDays * dailyOperatingHours;
    } else {
      // Sem data de instalação, usar período de análise padrão
      operatingHours = analysisPeriodDays * dailyOperatingHours;
    }

    // Calcular tempo total de reparo (downtime)
    const totalRepairHours = failureWorkOrders.reduce((total, wo) => {
      // Tentar usar actual_hours do backend ou calcular pela diferença de datas
      if (wo.actual_hours && wo.actual_hours > 0) {
        return total + wo.actual_hours;
      }
      
      // Se temos startedAt e completedAt, calcular a diferença
      if (wo.startedAt && wo.completedAt) {
        const start = new Date(wo.startedAt);
        const end = new Date(wo.completedAt);
        const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        return total + Math.max(0, hours);
      }
      
      // Se temos created_at/createdAt e completed_at/completedAt
      const createdAt = wo.created_at || wo.createdAt;
      const completedAt = wo.completed_at || wo.completedAt;
      if (createdAt && completedAt) {
        const start = new Date(createdAt);
        const end = new Date(completedAt);
        const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        // Limitar a um máximo razoável (ex: 720 horas = 30 dias)
        return total + Math.min(Math.max(0, hours), 720);
      }
      
      // Fallback: assumir tempo médio de reparo de 4 horas
      return total + 4;
    }, 0);

    // MTBF = Tempo de operação / Número de falhas
    // Se não houver falhas, MTBF é o tempo total de operação (excelente!)
    const mtbf = totalFailures > 0 
      ? Math.round(operatingHours / totalFailures) 
      : operatingHours;

    // MTTR = Tempo total de reparo / Número de reparos
    const mttr = totalFailures > 0 
      ? Math.round((totalRepairHours / totalFailures) * 10) / 10 
      : 0;

    // Availability = MTBF / (MTBF + MTTR) * 100
    // Se MTTR = 0, disponibilidade é 100%
    const availability = mtbf > 0 
      ? Math.round((mtbf / (mtbf + mttr)) * 1000) / 10 
      : 100;

    // Uptime = (Horas de operação - Horas de reparo) / Horas de operação * 100
    const uptime = operatingHours > 0 
      ? Math.round(((operatingHours - totalRepairHours) / operatingHours) * 1000) / 10 
      : 100;

    // Reliability = e^(-t/MTBF) para o próximo período de análise
    // Probabilidade de não falhar no próximo período
    const reliabilityPeriodHours = analysisPeriodDays * dailyOperatingHours;
    const reliability = mtbf > 0 
      ? Math.round(Math.exp(-reliabilityPeriodHours / mtbf) * 1000) / 10 
      : 100;

    return {
      mtbf,
      mttr,
      availability: Math.min(100, Math.max(0, availability)),
      reliability: Math.min(100, Math.max(0, reliability)),
      uptime: Math.min(100, Math.max(0, uptime)),
      totalFailures,
      totalRepairHours: Math.round(totalRepairHours * 10) / 10,
      operatingHours,
      analysisPeriodDays,
    };
  }, [workOrders, installationDate, analysisPeriodDays, dailyOperatingHours]);
}

/**
 * Formata MTBF para exibição amigável
 * 
 * @param mtbfHours - MTBF em horas
 * @returns String formatada (ex: "2.500 h" ou "104 dias")
 */
export function formatMTBF(mtbfHours: number): string {
  if (mtbfHours >= 8760) {
    // Mais de 1 ano - mostrar em anos
    const years = mtbfHours / 8760;
    return `${years.toFixed(1)} anos`;
  } else if (mtbfHours >= 720) {
    // Mais de 30 dias - mostrar em dias
    const days = Math.round(mtbfHours / 24);
    return `${days} dias`;
  } else if (mtbfHours >= 24) {
    // Mais de 1 dia - mostrar em dias com decimal
    const days = mtbfHours / 24;
    return `${days.toFixed(1)} dias`;
  } else {
    // Menos de 1 dia - mostrar em horas
    return `${mtbfHours.toLocaleString('pt-BR')} h`;
  }
}

/**
 * Formata MTTR para exibição amigável
 * 
 * @param mttrHours - MTTR em horas
 * @returns String formatada (ex: "4.5 h" ou "2 dias")
 */
export function formatMTTR(mttrHours: number): string {
  if (mttrHours === 0) {
    return '0 h';
  } else if (mttrHours >= 48) {
    // Mais de 2 dias - mostrar em dias
    const days = mttrHours / 24;
    return `${days.toFixed(1)} dias`;
  } else if (mttrHours >= 1) {
    // 1 hora ou mais - mostrar em horas
    return `${mttrHours.toFixed(1)} h`;
  } else {
    // Menos de 1 hora - mostrar em minutos
    const minutes = Math.round(mttrHours * 60);
    return `${minutes} min`;
  }
}

/**
 * Retorna a cor do indicador baseado no valor de MTBF
 * 
 * @param mtbfHours - MTBF em horas
 * @returns Classe de cor Tailwind
 */
export function getMTBFStatusColor(mtbfHours: number): string {
  if (mtbfHours >= 4320) {
    // 6 meses ou mais - excelente
    return 'text-emerald-600 dark:text-emerald-400';
  } else if (mtbfHours >= 2160) {
    // 3 meses ou mais - bom
    return 'text-blue-600 dark:text-blue-400';
  } else if (mtbfHours >= 720) {
    // 1 mês ou mais - regular
    return 'text-amber-600 dark:text-amber-400';
  } else {
    // Menos de 1 mês - crítico
    return 'text-red-600 dark:text-red-400';
  }
}

/**
 * Retorna a cor do indicador baseado no valor de MTTR
 * 
 * @param mttrHours - MTTR em horas
 * @returns Classe de cor Tailwind
 */
export function getMTTRStatusColor(mttrHours: number): string {
  if (mttrHours === 0) {
    // Sem reparos - neutro
    return 'text-gray-500 dark:text-gray-400';
  } else if (mttrHours <= 4) {
    // 4 horas ou menos - excelente
    return 'text-emerald-600 dark:text-emerald-400';
  } else if (mttrHours <= 8) {
    // 8 horas ou menos - bom
    return 'text-blue-600 dark:text-blue-400';
  } else if (mttrHours <= 24) {
    // 1 dia ou menos - regular
    return 'text-amber-600 dark:text-amber-400';
  } else {
    // Mais de 1 dia - crítico
    return 'text-red-600 dark:text-red-400';
  }
}

/**
 * Retorna descrição textual do MTBF
 */
export function getMTBFDescription(mtbfHours: number, totalFailures: number): string {
  if (totalFailures === 0) {
    return 'Nenhuma falha registrada no período';
  } else if (mtbfHours >= 4320) {
    return 'Excelente confiabilidade';
  } else if (mtbfHours >= 2160) {
    return 'Boa confiabilidade';
  } else if (mtbfHours >= 720) {
    return 'Confiabilidade regular';
  } else {
    return 'Atenção: falhas frequentes';
  }
}

/**
 * Retorna descrição textual do MTTR
 */
export function getMTTRDescription(mttrHours: number): string {
  if (mttrHours === 0) {
    return 'Sem reparos no período';
  } else if (mttrHours <= 4) {
    return 'Tempo de reparo excelente';
  } else if (mttrHours <= 8) {
    return 'Tempo de reparo adequado';
  } else if (mttrHours <= 24) {
    return 'Tempo de reparo elevado';
  } else {
    return 'Atenção: reparos demorados';
  }
}

export default useMaintenanceMetrics;
