/**
 * React Query hooks para Quick Repair AI Agent
 * 
 * Fornece diagnóstico rápido para técnicos em campo.
 */

import { useState, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  runQuickRepairAnalysis,
  analyzeQuickRepairAndWait,
  getAIJob,
  pollAIJob,
  listAIJobs,
  JobStatus,
  type QuickRepairInput,
  type QuickRepairOutput,
  type AIJob,
  type AIJobRunResponse,
} from '@/services/aiService';

// Query key factory
export const quickRepairKeys = {
  all: ['quick-repair'] as const,
  jobs: () => [...quickRepairKeys.all, 'jobs'] as const,
  job: (jobId: string) => [...quickRepairKeys.all, 'job', jobId] as const,
  byAsset: (assetId: number) => [...quickRepairKeys.all, 'asset', assetId] as const,
};

/**
 * Hook para executar diagnóstico rápido (async - retorna job_id)
 * 
 * Útil quando você quer iniciar a análise e fazer polling manualmente
 */
export function useQuickRepairMutation() {
  const queryClient = useQueryClient();

  return useMutation<
    AIJobRunResponse,
    Error,
    { assetId: number; symptom: string; options?: Omit<QuickRepairInput, 'asset_id' | 'symptom'> }
  >({
    mutationFn: async ({ assetId, symptom, options = {} }) => {
      return runQuickRepairAnalysis(assetId, symptom, options);
    },
    onSuccess: (data, variables) => {
      // Invalida cache de jobs do ativo
      queryClient.invalidateQueries({
        queryKey: quickRepairKeys.byAsset(variables.assetId),
      });
    },
  });
}

/**
 * Hook para executar diagnóstico rápido e aguardar resultado
 * 
 * Útil quando você quer o resultado completo diretamente
 */
export function useQuickRepairAnalysis() {
  const queryClient = useQueryClient();

  return useMutation<
    QuickRepairOutput,
    Error,
    { assetId: number; symptom: string; options?: Omit<QuickRepairInput, 'asset_id' | 'symptom'> }
  >({
    mutationFn: async ({ assetId, symptom, options = {} }) => {
      return analyzeQuickRepairAndWait(assetId, symptom, options);
    },
    onSuccess: (data, variables) => {
      // Invalida cache de jobs do ativo
      queryClient.invalidateQueries({
        queryKey: quickRepairKeys.byAsset(variables.assetId),
      });
    },
  });
}

/**
 * Hook para buscar um job de diagnóstico específico
 */
export function useQuickRepairJob(jobId: string | null, options?: { refetchInterval?: number }) {
  return useQuery<AIJob | null>({
    queryKey: quickRepairKeys.job(jobId || ''),
    queryFn: async () => {
      if (!jobId) return null;
      return getAIJob(jobId);
    },
    enabled: !!jobId,
    refetchInterval: options?.refetchInterval,
    staleTime: 5000,
  });
}

/**
 * Hook para listar jobs de diagnóstico de um ativo
 */
export function useQuickRepairJobsByAsset(assetId: number | null) {
  return useQuery<AIJob[]>({
    queryKey: quickRepairKeys.byAsset(assetId || 0),
    queryFn: async () => {
      if (!assetId) return [];
      return listAIJobs({
        agent: 'quick_repair',
        related_type: 'asset',
        related_id: assetId,
      });
    },
    enabled: !!assetId,
    staleTime: 30000,
  });
}

/**
 * Estado do diagnóstico rápido
 */
export type QuickRepairState =
  | { status: 'idle' }
  | { status: 'loading'; jobId?: string }
  | { status: 'error'; error: string }
  | { status: 'success'; data: QuickRepairOutput };

/**
 * Hook completo para diagnóstico rápido com gestão de estado
 * 
 * Combina mutação + polling + estado em uma interface simples
 */
export function useQuickRepair() {
  const [state, setState] = useState<QuickRepairState>({ status: 'idle' });
  const queryClient = useQueryClient();

  const runDiagnosis = useCallback(
    async (
      assetId: number,
      symptom: string,
      options?: Omit<QuickRepairInput, 'asset_id' | 'symptom'>
    ) => {
      setState({ status: 'loading' });

      try {
        // Iniciar job
        const jobResponse = await runQuickRepairAnalysis(assetId, symptom, options);
        setState({ status: 'loading', jobId: jobResponse.job_id });

        // Fazer polling (300 tentativas x 2s = 10 min para modelos locais lentos)
        const completedJob = await pollAIJob(jobResponse.job_id, 300, 2000);

        if (!completedJob) {
          throw new Error('Job não encontrado após polling');
        }

        if (completedJob.status === JobStatus.FAILED) {
          throw new Error(completedJob.error_message || 'Diagnóstico falhou');
        }

        if (completedJob.status === JobStatus.TIMEOUT) {
          throw new Error('Diagnóstico expirou (timeout)');
        }

        if (completedJob.status !== JobStatus.SUCCEEDED) {
          throw new Error(`Status inesperado: ${completedJob.status}`);
        }

        const result = completedJob.output_data as unknown as QuickRepairOutput;
        setState({ status: 'success', data: result });

        // Invalidar cache
        queryClient.invalidateQueries({
          queryKey: quickRepairKeys.byAsset(assetId),
        });

        return result;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        setState({ status: 'error', error: errorMessage });
        throw error;
      }
    },
    [queryClient]
  );

  const reset = useCallback(() => {
    setState({ status: 'idle' });
  }, []);

  return {
    ...state,
    runDiagnosis,
    reset,
    isLoading: state.status === 'loading',
    isError: state.status === 'error',
    isSuccess: state.status === 'success',
  };
}

/**
 * Tipos auxiliares para componentes
 */
export interface QuickRepairDialogProps {
  assetId: number;
  assetTag: string;
  isOpen: boolean;
  onClose: () => void;
  onApplySuggestion?: (suggestion: QuickRepairOutput['suggested_work_order']) => void;
}
