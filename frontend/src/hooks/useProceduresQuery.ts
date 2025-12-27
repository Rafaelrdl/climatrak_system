/**
 * React Query hooks para Procedimentos
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  listProcedureCategories,
  getProcedureCategory,
  createProcedureCategory,
  updateProcedureCategory,
  deleteProcedureCategory,
  listProcedures,
  getProcedure,
  createProcedure,
  updateProcedure,
  deleteProcedure,
  approveProcedure,
  submitProcedureForReview,
  archiveProcedure,
  listProcedureVersions,
  createProcedureVersion,
  restoreProcedureVersion,
  getProcedureStats,
  type ProcedureCategoryInput,
  type ProcedureFilters,
  type ProcedureInput,
  type ProcedureUpdateInput,
  type CreateVersionInput,
} from '@/services/proceduresService';

// ============================================
// Query Keys
// ============================================

export const procedureKeys = {
  all: ['procedures'] as const,
  lists: () => [...procedureKeys.all, 'list'] as const,
  list: (filters?: ProcedureFilters) => [...procedureKeys.lists(), filters] as const,
  details: () => [...procedureKeys.all, 'detail'] as const,
  detail: (id: number) => [...procedureKeys.details(), id] as const,
  versions: (id: number) => [...procedureKeys.detail(id), 'versions'] as const,
  stats: () => [...procedureKeys.all, 'stats'] as const,
};

export const procedureCategoryKeys = {
  all: ['procedure-categories'] as const,
  lists: () => [...procedureCategoryKeys.all, 'list'] as const,
  details: () => [...procedureCategoryKeys.all, 'detail'] as const,
  detail: (id: number) => [...procedureCategoryKeys.details(), id] as const,
};

// ============================================
// Hooks de Categorias
// ============================================

export function useProcedureCategories() {
  return useQuery({
    queryKey: procedureCategoryKeys.lists(),
    queryFn: listProcedureCategories,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

export function useProcedureCategory(id: number | null) {
  return useQuery({
    queryKey: procedureCategoryKeys.detail(id!),
    queryFn: () => getProcedureCategory(id!),
    enabled: !!id,
  });
}

export function useCreateProcedureCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createProcedureCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: procedureCategoryKeys.all });
      toast.success('Categoria criada com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar categoria: ${error.message}`);
    },
  });
}

export function useUpdateProcedureCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<ProcedureCategoryInput> }) =>
      updateProcedureCategory(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: procedureCategoryKeys.all });
      queryClient.invalidateQueries({ queryKey: procedureKeys.all }); // Atualiza listagens de procedures
      toast.success('Categoria atualizada com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar categoria: ${error.message}`);
    },
  });
}

export function useDeleteProcedureCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteProcedureCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: procedureCategoryKeys.all });
      toast.success('Categoria excluída com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao excluir categoria: ${error.message}`);
    },
  });
}

// ============================================
// Hooks de Procedimentos
// ============================================

export function useProcedures(filters?: ProcedureFilters) {
  return useQuery({
    queryKey: procedureKeys.list(filters),
    queryFn: () => listProcedures(filters),
    staleTime: 2 * 60 * 1000, // 2 minutos
  });
}

export function useProcedure(id: number | null) {
  return useQuery({
    queryKey: procedureKeys.detail(id!),
    queryFn: () => getProcedure(id!),
    enabled: !!id,
  });
}

export function useCreateProcedure() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createProcedure,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: procedureKeys.all });
      queryClient.invalidateQueries({ queryKey: procedureCategoryKeys.all }); // Atualiza contadores
      toast.success('Procedimento criado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar procedimento: ${error.message}`);
    },
  });
}

export function useUpdateProcedure() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: ProcedureUpdateInput }) =>
      updateProcedure(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: procedureKeys.all });
      queryClient.invalidateQueries({ queryKey: procedureKeys.detail(variables.id) });
      toast.success('Procedimento atualizado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar procedimento: ${error.message}`);
    },
  });
}

export function useDeleteProcedure() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteProcedure,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: procedureKeys.all });
      queryClient.invalidateQueries({ queryKey: procedureCategoryKeys.all }); // Atualiza contadores
      toast.success('Procedimento excluído com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao excluir procedimento: ${error.message}`);
    },
  });
}

// ============================================
// Hooks de Ações
// ============================================

export function useApproveProcedure() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, approved, rejectionReason }: { id: number; approved: boolean; rejectionReason?: string }) =>
      approveProcedure(id, approved, rejectionReason),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: procedureKeys.all });
      queryClient.invalidateQueries({ queryKey: procedureKeys.detail(variables.id) });
      toast.success(data.message);
    },
    onError: (error: Error) => {
      toast.error(`Erro ao processar aprovação: ${error.message}`);
    },
  });
}

export function useSubmitProcedureForReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: submitProcedureForReview,
    onSuccess: (data, id) => {
      queryClient.invalidateQueries({ queryKey: procedureKeys.all });
      queryClient.invalidateQueries({ queryKey: procedureKeys.detail(id) });
      toast.success(data.message);
    },
    onError: (error: Error) => {
      toast.error(`Erro ao enviar para revisão: ${error.message}`);
    },
  });
}

export function useArchiveProcedure() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: archiveProcedure,
    onSuccess: (data, id) => {
      queryClient.invalidateQueries({ queryKey: procedureKeys.all });
      queryClient.invalidateQueries({ queryKey: procedureKeys.detail(id) });
      toast.success(data.message);
    },
    onError: (error: Error) => {
      toast.error(`Erro ao arquivar procedimento: ${error.message}`);
    },
  });
}

// ============================================
// Hooks de Versões
// ============================================

export function useProcedureVersions(procedureId: number | null) {
  return useQuery({
    queryKey: procedureKeys.versions(procedureId!),
    queryFn: () => listProcedureVersions(procedureId!),
    enabled: !!procedureId,
  });
}

export function useCreateProcedureVersion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ procedureId, data }: { procedureId: number; data: CreateVersionInput }) =>
      createProcedureVersion(procedureId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: procedureKeys.detail(variables.procedureId) });
      queryClient.invalidateQueries({ queryKey: procedureKeys.versions(variables.procedureId) });
      queryClient.invalidateQueries({ queryKey: procedureKeys.lists() });
      toast.success('Nova versão criada com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar versão: ${error.message}`);
    },
  });
}

export function useRestoreProcedureVersion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ procedureId, versionId }: { procedureId: number; versionId: number }) =>
      restoreProcedureVersion(procedureId, versionId),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: procedureKeys.detail(variables.procedureId) });
      queryClient.invalidateQueries({ queryKey: procedureKeys.versions(variables.procedureId) });
      toast.success(data.message);
    },
    onError: (error: Error) => {
      toast.error(`Erro ao restaurar versão: ${error.message}`);
    },
  });
}

// ============================================
// Hooks de Estatísticas
// ============================================

export function useProcedureStats() {
  return useQuery({
    queryKey: procedureKeys.stats(),
    queryFn: getProcedureStats,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}
