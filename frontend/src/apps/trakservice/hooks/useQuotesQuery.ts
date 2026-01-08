/**
 * TrakService Quotes Hooks
 * 
 * React Query hooks for quotes operations.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  quotesKeys,
  getQuotes,
  getQuote,
  createQuote,
  updateQuote,
  deleteQuote,
  sendQuote,
  approveQuote,
  rejectQuote,
  addQuoteItem,
  updateQuoteItem,
  removeQuoteItem,
  getQuotesSummary,
  getCatalogItems,
} from '../services/quotesService';
import type { 
  QuoteFilters, 
  QuoteCreateInput, 
  QuoteUpdateInput,
  QuoteItemInput,
  QuoteSendInput,
  QuoteApproveInput,
  QuoteRejectInput,
} from '../types';

// =============================================================================
// Quote Queries
// =============================================================================

/**
 * Hook to list quotes with filters
 */
export function useQuotes(filters?: QuoteFilters) {
  return useQuery({
    queryKey: quotesKeys.quoteList(filters),
    queryFn: () => getQuotes(filters),
  });
}

/**
 * Hook to get a single quote
 */
export function useQuote(id: string) {
  return useQuery({
    queryKey: quotesKeys.quoteDetail(id),
    queryFn: () => getQuote(id),
    enabled: !!id,
  });
}

/**
 * Hook to get quotes summary
 */
export function useQuotesSummary() {
  return useQuery({
    queryKey: quotesKeys.summary(),
    queryFn: getQuotesSummary,
  });
}

/**
 * Hook to get catalog items
 */
export function useCatalogItems(type?: string) {
  return useQuery({
    queryKey: quotesKeys.catalogList(type),
    queryFn: () => getCatalogItems(type),
  });
}

// =============================================================================
// Quote Mutations
// =============================================================================

/**
 * Hook to create a quote
 */
export function useCreateQuote() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: QuoteCreateInput) => createQuote(data),
    onSuccess: (data) => {
      toast.success(`Orçamento ${data.number} criado`);
      queryClient.invalidateQueries({ queryKey: quotesKeys.quotes() });
      queryClient.invalidateQueries({ queryKey: quotesKeys.summary() });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar orçamento: ${error.message}`);
    },
  });
}

/**
 * Hook to update a quote
 */
export function useUpdateQuote() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: QuoteUpdateInput }) => 
      updateQuote(id, data),
    onSuccess: (data) => {
      toast.success('Orçamento atualizado');
      queryClient.invalidateQueries({ queryKey: quotesKeys.quotes() });
      queryClient.setQueryData(quotesKeys.quoteDetail(data.id), data);
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar orçamento: ${error.message}`);
    },
  });
}

/**
 * Hook to delete a quote
 */
export function useDeleteQuote() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => deleteQuote(id),
    onSuccess: () => {
      toast.success('Orçamento excluído');
      queryClient.invalidateQueries({ queryKey: quotesKeys.quotes() });
      queryClient.invalidateQueries({ queryKey: quotesKeys.summary() });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao excluir orçamento: ${error.message}`);
    },
  });
}

/**
 * Hook to send a quote
 */
export function useSendQuote() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data?: QuoteSendInput }) => 
      sendQuote(id, data),
    onSuccess: (data) => {
      toast.success('Orçamento enviado ao cliente');
      queryClient.invalidateQueries({ queryKey: quotesKeys.quotes() });
      queryClient.setQueryData(quotesKeys.quoteDetail(data.id), data);
      queryClient.invalidateQueries({ queryKey: quotesKeys.summary() });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao enviar orçamento: ${error.message}`);
    },
  });
}

/**
 * Hook to approve a quote
 */
export function useApproveQuote() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data?: QuoteApproveInput }) => 
      approveQuote(id, data),
    onSuccess: (data) => {
      const financeMsg = data.finance_result?.success 
        ? ` (${data.finance_result.transactions_created} transações criadas)` 
        : '';
      toast.success(`Orçamento aprovado${financeMsg}`);
      queryClient.invalidateQueries({ queryKey: quotesKeys.quotes() });
      queryClient.setQueryData(quotesKeys.quoteDetail(data.id), data);
      queryClient.invalidateQueries({ queryKey: quotesKeys.summary() });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao aprovar orçamento: ${error.message}`);
    },
  });
}

/**
 * Hook to reject a quote
 */
export function useRejectQuote() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: QuoteRejectInput }) => 
      rejectQuote(id, data),
    onSuccess: (data) => {
      toast.success('Orçamento rejeitado');
      queryClient.invalidateQueries({ queryKey: quotesKeys.quotes() });
      queryClient.setQueryData(quotesKeys.quoteDetail(data.id), data);
      queryClient.invalidateQueries({ queryKey: quotesKeys.summary() });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao rejeitar orçamento: ${error.message}`);
    },
  });
}

// =============================================================================
// Quote Items Mutations
// =============================================================================

/**
 * Hook to add item to quote
 */
export function useAddQuoteItem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ quoteId, data }: { quoteId: string; data: QuoteItemInput }) => 
      addQuoteItem(quoteId, data),
    onSuccess: (_, variables) => {
      toast.success('Item adicionado');
      queryClient.invalidateQueries({ 
        queryKey: quotesKeys.quoteDetail(variables.quoteId) 
      });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao adicionar item: ${error.message}`);
    },
  });
}

/**
 * Hook to update quote item
 */
export function useUpdateQuoteItem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ quoteId, itemId, data }: { 
      quoteId: string; 
      itemId: string; 
      data: Partial<QuoteItemInput>;
    }) => updateQuoteItem(quoteId, itemId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: quotesKeys.quoteDetail(variables.quoteId) 
      });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar item: ${error.message}`);
    },
  });
}

/**
 * Hook to remove quote item
 */
export function useRemoveQuoteItem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ quoteId, itemId }: { quoteId: string; itemId: string }) => 
      removeQuoteItem(quoteId, itemId),
    onSuccess: (_, variables) => {
      toast.success('Item removido');
      queryClient.invalidateQueries({ 
        queryKey: quotesKeys.quoteDetail(variables.quoteId) 
      });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao remover item: ${error.message}`);
    },
  });
}
