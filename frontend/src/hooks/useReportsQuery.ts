/**
 * Hook para geração de relatórios PMOC
 * 
 * Utiliza React Query para gerenciar cache e estado de loading.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  reportsService,
  PMOCReportFilters,
  ReportHistoryFilters,
  ReportHistoryResponse,
  GeneratedReportDetail,
} from '@/services/reportsService';

// Query keys factory
export const reportKeys = {
  all: ['reports'] as const,
  pmocMonthly: (filters: PMOCReportFilters) => [...reportKeys.all, 'pmoc-monthly', filters] as const,
  pmocAnnual: (filters: Omit<PMOCReportFilters, 'month'>) => [...reportKeys.all, 'pmoc-annual', filters] as const,
  history: () => [...reportKeys.all, 'history'] as const,
  historyList: (filters: ReportHistoryFilters) => [...reportKeys.history(), 'list', filters] as const,
  historyDetail: (id: string) => [...reportKeys.history(), 'detail', id] as const,
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
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (filters: PMOCReportFilters) => reportsService.generatePMOCMonthly(filters),
    onSuccess: () => {
      // Invalida a lista de histórico para mostrar o novo relatório
      queryClient.invalidateQueries({ queryKey: reportKeys.history() });
    },
  });
}

/**
 * Mutation para gerar relatório PMOC anual sob demanda
 */
export function useGeneratePMOCAnnual() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (filters: Omit<PMOCReportFilters, 'month'>) => reportsService.generatePMOCAnnual(filters),
    onSuccess: () => {
      // Invalida a lista de histórico para mostrar o novo relatório
      queryClient.invalidateQueries({ queryKey: reportKeys.history() });
    },
  });
}

/**
 * Mutation para gerar relatório PMOC mensal sob demanda
 */
export function useGeneratePMOCMonthlyMutation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (filters: PMOCReportFilters) => reportsService.generatePMOCMonthly(filters),
    onSuccess: () => {
      // Invalida a lista de histórico para mostrar o novo relatório
      queryClient.invalidateQueries({ queryKey: reportKeys.history() });
    },
  });
}

// ============================================
// HOOKS DE HISTÓRICO DE RELATÓRIOS
// ============================================

/**
 * Hook para buscar histórico de relatórios gerados
 */
export function useReportHistory(filters: ReportHistoryFilters = {}, options?: { enabled?: boolean }) {
  return useQuery<ReportHistoryResponse>({
    queryKey: reportKeys.historyList(filters),
    queryFn: () => reportsService.getReportHistory(filters),
    enabled: options?.enabled ?? true,
    staleTime: 30 * 1000, // 30 segundos
    gcTime: 5 * 60 * 1000, // 5 minutos
  });
}

/**
 * Hook para buscar detalhes de um relatório específico
 */
export function useReportDetail(reportId: string, options?: { enabled?: boolean }) {
  return useQuery<GeneratedReportDetail>({
    queryKey: reportKeys.historyDetail(reportId),
    queryFn: () => reportsService.getReportDetail(reportId),
    enabled: (options?.enabled ?? true) && !!reportId,
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 30 * 60 * 1000, // 30 minutos
  });
}

/**
 * Mutation para deletar um relatório
 */
export function useDeleteReport() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (reportId: string) => reportsService.deleteReport(reportId),
    onSuccess: () => {
      // Invalida a lista de histórico
      queryClient.invalidateQueries({ queryKey: reportKeys.history() });
    },
  });
}
