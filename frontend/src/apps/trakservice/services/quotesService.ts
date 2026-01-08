/**
 * TrakService Quotes Service
 * 
 * Service for managing quotes/estimates.
 * 
 * Endpoints:
 * - GET/POST /api/trakservice/quotes/ - List/Create quotes
 * - GET /api/trakservice/quotes/{id}/ - Quote details
 * - PATCH /api/trakservice/quotes/{id}/ - Update quote
 * - DELETE /api/trakservice/quotes/{id}/ - Delete quote
 * - POST /api/trakservice/quotes/{id}/send/ - Send to customer
 * - POST /api/trakservice/quotes/{id}/approve/ - Approve quote
 * - POST /api/trakservice/quotes/{id}/reject/ - Reject quote
 * - POST /api/trakservice/quotes/{id}/items/ - Add item
 * - PATCH /api/trakservice/quotes/{id}/items/{item_id}/ - Update item
 * - DELETE /api/trakservice/quotes/{id}/items/{item_id}/ - Remove item
 * - GET /api/trakservice/catalog/ - Service catalog
 */

import { api } from '@/lib/api';
import type { PaginatedResponse } from '@/types/api';
import type {
  Quote,
  QuoteItem,
  QuoteCreateInput,
  QuoteUpdateInput,
  QuoteItemInput,
  QuoteSendInput,
  QuoteApproveInput,
  QuoteRejectInput,
  QuoteFilters,
  QuoteSummary,
  QuoteStatus,
  ServiceCatalogItem,
} from '../types';

// =============================================================================
// Query Keys Factory
// =============================================================================

export const quotesKeys = {
  all: ['trakservice', 'quotes'] as const,
  
  quotes: () => [...quotesKeys.all, 'list'] as const,
  quoteList: (filters?: QuoteFilters) => 
    [...quotesKeys.quotes(), filters] as const,
  quoteDetail: (id: string) => 
    [...quotesKeys.all, 'detail', id] as const,
  
  summary: () => [...quotesKeys.all, 'summary'] as const,
  
  catalog: () => [...quotesKeys.all, 'catalog'] as const,
  catalogList: (type?: string) => 
    [...quotesKeys.catalog(), 'list', type] as const,
};

// =============================================================================
// Quote API Functions
// =============================================================================

/**
 * Build query params for quote filters
 */
function buildQuoteParams(filters?: QuoteFilters): URLSearchParams {
  const params = new URLSearchParams();
  
  if (filters?.status) {
    const statuses = Array.isArray(filters.status) 
      ? filters.status 
      : [filters.status];
    statuses.forEach(s => params.append('status', s));
  }
  if (filters?.work_order_id) {
    params.append('work_order_id', filters.work_order_id);
  }
  if (filters?.date_from) {
    params.append('date_from', filters.date_from);
  }
  if (filters?.date_to) {
    params.append('date_to', filters.date_to);
  }
  if (filters?.search) {
    params.append('search', filters.search);
  }
  
  return params;
}

/**
 * List quotes with optional filters
 */
export async function getQuotes(
  filters?: QuoteFilters
): Promise<PaginatedResponse<Quote>> {
  const params = buildQuoteParams(filters);
  
  const response = await api.get<PaginatedResponse<Quote>>(
    '/trakservice/quotes/',
    { params }
  );
  return response.data;
}

/**
 * Get a single quote by ID
 */
export async function getQuote(id: string): Promise<Quote> {
  const response = await api.get<Quote>(
    `/trakservice/quotes/${id}/`
  );
  return response.data;
}

/**
 * Create a new quote
 */
export async function createQuote(data: QuoteCreateInput): Promise<Quote> {
  const response = await api.post<Quote>(
    '/trakservice/quotes/',
    data
  );
  return response.data;
}

/**
 * Update a quote
 */
export async function updateQuote(
  id: string,
  data: QuoteUpdateInput
): Promise<Quote> {
  const response = await api.patch<Quote>(
    `/trakservice/quotes/${id}/`,
    data
  );
  return response.data;
}

/**
 * Delete a quote
 */
export async function deleteQuote(id: string): Promise<void> {
  await api.delete(`/trakservice/quotes/${id}/`);
}

/**
 * Send quote to customer
 */
export async function sendQuote(
  id: string,
  data?: QuoteSendInput
): Promise<Quote> {
  const response = await api.post<Quote>(
    `/trakservice/quotes/${id}/send/`,
    data || {}
  );
  return response.data;
}

/**
 * Approve a quote
 */
export async function approveQuote(
  id: string,
  data?: QuoteApproveInput
): Promise<Quote & { finance_result?: { success: boolean; transactions_created: number } }> {
  const response = await api.post<Quote & { finance_result?: { success: boolean; transactions_created: number } }>(
    `/trakservice/quotes/${id}/approve/`,
    data || {}
  );
  return response.data;
}

/**
 * Reject a quote
 */
export async function rejectQuote(
  id: string,
  data: QuoteRejectInput
): Promise<Quote> {
  const response = await api.post<Quote>(
    `/trakservice/quotes/${id}/reject/`,
    data
  );
  return response.data;
}

// =============================================================================
// Quote Items API Functions
// =============================================================================

/**
 * Add item to quote
 */
export async function addQuoteItem(
  quoteId: string,
  data: QuoteItemInput
): Promise<QuoteItem> {
  const response = await api.post<QuoteItem>(
    `/trakservice/quotes/${quoteId}/items/`,
    data
  );
  return response.data;
}

/**
 * Update quote item
 */
export async function updateQuoteItem(
  quoteId: string,
  itemId: string,
  data: Partial<QuoteItemInput>
): Promise<QuoteItem> {
  const response = await api.patch<QuoteItem>(
    `/trakservice/quotes/${quoteId}/items/${itemId}/`,
    data
  );
  return response.data;
}

/**
 * Remove quote item
 */
export async function removeQuoteItem(
  quoteId: string,
  itemId: string
): Promise<void> {
  await api.delete(`/trakservice/quotes/${quoteId}/items/${itemId}/`);
}

// =============================================================================
// Summary & Catalog API Functions
// =============================================================================

/**
 * Get quotes summary (calculated from quotes list)
 */
export async function getQuotesSummary(): Promise<QuoteSummary> {
  // Fetch all quotes to calculate summary
  const response = await api.get<{ results: Quote[] } | Quote[]>(
    '/trakservice/quotes/'
  );
  
  const quotes = Array.isArray(response.data)
    ? response.data
    : response.data.results || [];
  
  // Calculate summary
  const draft = quotes.filter(q => q.status === 'draft');
  const sent = quotes.filter(q => q.status === 'sent');
  const approved = quotes.filter(q => q.status === 'approved');
  const rejected = quotes.filter(q => q.status === 'rejected');
  const expired = quotes.filter(q => q.status === 'expired');
  
  const totalValue = quotes.reduce((sum, q) => sum + (q.total || 0), 0);
  const approvedValue = approved.reduce((sum, q) => sum + (q.total || 0), 0);
  const sentAndApproved = sent.length + approved.length + rejected.length;
  const conversionRate = sentAndApproved > 0 ? (approved.length / sentAndApproved) * 100 : 0;
  
  return {
    total: quotes.length,
    draft: draft.length,
    sent: sent.length,
    approved: approved.length,
    rejected: rejected.length,
    expired: expired.length,
    total_value: totalValue,
    total_value_approved: approvedValue,
    approved_value: approvedValue,
    conversion_rate: conversionRate,
  };
}

/**
 * Get service catalog items
 */
export async function getCatalogItems(
  type?: string
): Promise<ServiceCatalogItem[]> {
  const params = new URLSearchParams();
  if (type) {
    params.append('item_type', type);
  }
  
  const response = await api.get<ServiceCatalogItem[]>(
    '/trakservice/catalog/',
    { params }
  );
  return response.data;
}

// =============================================================================
// Utility Functions
// =============================================================================

export function getQuoteStatusConfig(status: QuoteStatus) {
  const configs = {
    draft: {
      label: 'Rascunho',
      color: 'text-gray-600',
      bgColor: 'bg-gray-100',
      borderColor: 'border-gray-200',
    },
    sent: {
      label: 'Enviado',
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      borderColor: 'border-blue-200',
    },
    approved: {
      label: 'Aprovado',
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      borderColor: 'border-green-200',
    },
    rejected: {
      label: 'Rejeitado',
      color: 'text-red-600',
      bgColor: 'bg-red-100',
      borderColor: 'border-red-200',
    },
    expired: {
      label: 'Expirado',
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
      borderColor: 'border-orange-200',
    },
  };
  return configs[status] || configs.draft;
}

export function getQuoteStatusOptions() {
  return [
    { value: 'draft', label: 'Rascunho' },
    { value: 'sent', label: 'Enviado' },
    { value: 'approved', label: 'Aprovado' },
    { value: 'rejected', label: 'Rejeitado' },
    { value: 'expired', label: 'Expirado' },
  ];
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function canEditQuote(status: QuoteStatus): boolean {
  return status === 'draft';
}

export function canSendQuote(status: QuoteStatus): boolean {
  return status === 'draft';
}

export function canApproveQuote(status: QuoteStatus): boolean {
  return status === 'sent';
}

export function canRejectQuote(status: QuoteStatus): boolean {
  return status === 'sent';
}

export function getNextActions(status: QuoteStatus): string[] {
  switch (status) {
    case 'draft':
      return ['edit', 'send', 'delete'];
    case 'sent':
      return ['approve', 'reject'];
    case 'approved':
      return ['view'];
    case 'rejected':
      return ['view', 'duplicate'];
    case 'expired':
      return ['view', 'duplicate'];
    default:
      return ['view'];
  }
}
