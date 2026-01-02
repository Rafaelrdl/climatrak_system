/**
 * Hook para custos de uma Work Order específica
 * 
 * Busca transações do ledger filtradas por work_order_id e calcula
 * totais por tipo (labor, parts, third_party).
 * 
 * Baseado em: docs/frontend/finance/05-telas-fluxos.md
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { financeService } from '@/services/finance/financeService';
import { financeKeys } from './keys';
import type { CostTransaction } from '@/types/finance';

interface WorkOrderCostsSummary {
  labor: number;
  parts: number;
  third_party: number;
  adjustment: number;
  total: number;
}

interface UseWorkOrderCostsReturn {
  transactions: CostTransaction[];
  summary: WorkOrderCostsSummary;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Hook para buscar e sumarizar custos de uma Work Order
 * 
 * @param workOrderId - ID da Work Order (obrigatório)
 * @returns Transações, sumário por tipo e estados de loading/error
 */
export function useWorkOrderCosts(workOrderId: string | undefined): UseWorkOrderCostsReturn {
  const query = useQuery({
    queryKey: financeKeys.ledger.list({ work_order: workOrderId }),
    queryFn: () => financeService.getTransactions({ 
      work_order: workOrderId,
      page_size: 100, // Buscar todos os custos da OS
    }),
    enabled: !!workOrderId,
    staleTime: 1000 * 30, // 30 segundos
    gcTime: 1000 * 60 * 2, // 2 minutos
  });

  const transactions = useMemo(() => 
    query.data?.data ?? [], 
    [query.data]
  );

  const summary = useMemo<WorkOrderCostsSummary>(() => {
    const initial: WorkOrderCostsSummary = {
      labor: 0,
      parts: 0,
      third_party: 0,
      adjustment: 0,
      total: 0,
    };

    if (!transactions.length) return initial;

    const result = transactions.reduce((acc, tx) => {
      // Converter string para número (backend retorna como string)
      const amount = parseFloat(tx.amount) || 0;
      const type = tx.transaction_type;
      
      // Mapear tipos de transação para as chaves corretas
      if (type === 'labor') {
        acc.labor += amount;
      } else if (type === 'parts') {
        acc.parts += amount;
      } else if (type === 'third_party') {
        acc.third_party += amount;
      } else if (type === 'adjustment') {
        acc.adjustment += amount;
      }
      
      acc.total += amount;
      return acc;
    }, initial);

    return result;
  }, [transactions]);

  return {
    transactions,
    summary,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error as Error | null,
    refetch: query.refetch,
  };
}
