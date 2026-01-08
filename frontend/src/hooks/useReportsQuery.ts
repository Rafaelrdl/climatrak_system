/**
 * Hook para geração de relatórios PMOC
 * 
 * Utiliza React Query para gerenciar cache e estado de loading.
 */

import { useMutation, useQuery } from '@tanstack/react-query';
import { reportsService, PMOCReportFilters, PMOCMonthlyReport, PMOCAnnualReport } from '@/services/reportsService';

// Query keys factory
export const reportKeys = {
  all: ['reports'] as const,
  pmocMonthly: (filters: PMOCReportFilters) => [...reportKeys.all, 'pmoc-monthly', filters] as const,
  pmocAnnual: (filters: Omit<PMOCReportFilters, 'month'>) => [...reportKeys.all, 'pmoc-annual', filters] as const,
};

/**
 * Hook para gerar relatório PMOC mensal
 */
export function usePMOCMonthlyReport(filters: PMOCReportFilters, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: reportKeys.pmocMonthly(filters),
    queryFn: () => reportsService.generatePMOCMonthly(filters),
    enabled: options?.enabled ?? true,
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 30 * 60 * 1000, // 30 minutos
  });
}

/**
 * Hook para gerar relatório PMOC anual
 */
export function usePMOCAnnualReport(filters: Omit<PMOCReportFilters, 'month'>, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: reportKeys.pmocAnnual(filters),
    queryFn: () => reportsService.generatePMOCAnnual(filters),
    enabled: options?.enabled ?? true,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

/**
 * Mutation para gerar relatório PMOC mensal sob demanda
 */
export function useGeneratePMOCMonthly() {
  return useMutation({
    mutationFn: (filters: PMOCReportFilters) => reportsService.generatePMOCMonthly(filters),
  });
}

/**
 * Mutation para gerar relatório PMOC anual sob demanda
 */
export function useGeneratePMOCAnnual() {
  return useMutation({
    mutationFn: (filters: Omit<PMOCReportFilters, 'month'>) => reportsService.generatePMOCAnnual(filters),
  });
}
