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
import type { CostTransaction, TransactionType } from '@/types/finance';

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
    queryKey: financeKeys.ledger.list({ work_order_id: workOrderId }),
    queryFn: () => financeService.getTransactions({ 
      work_order_id: workOrderId,
      page_size: 100, // Buscar todos os custos da OS
    }),
    enabled: !!workOrderId,
    staleTime: 30_000, // 30 segundos
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

    return transactions.reduce((acc, tx) => {
      const amount = tx.amount;
      acc[tx.transaction_type as TransactionType] += amount;
      acc.total += amount;
      return acc;
    }, initial);
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
