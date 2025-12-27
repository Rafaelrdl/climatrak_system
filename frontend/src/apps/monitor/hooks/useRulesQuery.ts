/**
 * Hooks para queries de Rules (regras de monitoramento)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { rulesService } from '../services/rulesService';
import { isUserAuthenticated } from '@/hooks/useAuth';
import type { RuleFilters, CreateRuleRequest, UpdateRuleRequest } from '../types/rule';

/**
 * Query hook para listar regras
 */
export const useRulesQuery = (filters: RuleFilters = {}) => {
  return useQuery({
    queryKey: ['monitor-rules', filters],
    queryFn: async () => {
      const response = await rulesService.list(filters);
      return response.results || [];
    },
    staleTime: 1000 * 60 * 5, // 5 minutos
    enabled: isUserAuthenticated(),
  });
};

/**
 * Query hook para uma regra específica
 */
export const useRuleQuery = (ruleId: number | null) => {
  return useQuery({
    queryKey: ['monitor-rules', ruleId],
    queryFn: () => rulesService.get(ruleId!),
    enabled: !!ruleId && isUserAuthenticated(),
  });
};

/**
 * Query hook para estatísticas de regras
 */
export const useRulesStatisticsQuery = () => {
  return useQuery({
    queryKey: ['monitor-rules', 'statistics'],
    queryFn: rulesService.statistics,
    staleTime: 1000 * 60 * 2, // 2 minutos
    enabled: isUserAuthenticated(),
  });
};

/**
 * Mutation hook para criar regra
 */
export const useCreateRuleMutation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: CreateRuleRequest) => rulesService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monitor-rules'] });
      queryClient.invalidateQueries({ queryKey: ['monitor-alerts'] });
    },
  });
};

/**
 * Mutation hook para atualizar regra
 */
export const useUpdateRuleMutation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateRuleRequest }) =>
      rulesService.patch(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['monitor-rules'] });
      queryClient.invalidateQueries({ queryKey: ['monitor-rules', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['monitor-alerts'] });
    },
  });
};

/**
 * Mutation hook para deletar regra
 */
export const useDeleteRuleMutation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (ruleId: number) => rulesService.delete(ruleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monitor-rules'] });
    },
  });
};

/**
 * Mutation hook para toggle enable/disable regra
 */
export const useToggleRuleMutation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (ruleId: number) => rulesService.toggleStatus(ruleId),
    onMutate: async (ruleId) => {
      await queryClient.cancelQueries({ queryKey: ['monitor-rules'] });
      
      const previousRules = queryClient.getQueryData(['monitor-rules', {}]);
      
      queryClient.setQueryData(['monitor-rules', {}], (old: any[] | undefined) => {
        if (!old) return old;
        return old.map((rule: any) =>
          rule.id === ruleId ? { ...rule, enabled: !rule.enabled } : rule
        );
      });
      
      return { previousRules };
    },
    onError: (_err, _ruleId, context) => {
      if (context?.previousRules) {
        queryClient.setQueryData(['monitor-rules', {}], context.previousRules);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monitor-rules'] });
    },
  });
};
