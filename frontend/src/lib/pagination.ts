/**
 * Pagination utilities for DRF (Django REST Framework) API
 * 
 * DRF uses `page` and `page_size` parameters instead of `limit`/`offset`.
 * This module provides helpers to fetch all paginated results by following
 * the 'next' links returned in the response.
 * 
 * @module lib/pagination
 */

import { api } from './api';
import type { PaginatedResponse } from '@/types/api';

/**
 * Fetch all paginated results by following DRF 'next' links
 * 
 * @template T - Type of the items in the results array
 * @param endpoint - API endpoint (e.g., '/assets/')
 * @param params - Query parameters (will be converted to DRF format)
 * @returns Promise with all items from all pages
 * 
 * @example
 * ```typescript
 * // Get all assets
 * const assets = await fetchAllPages<ApiAsset>('/assets/');
 * 
 * // Get all assets for a specific site
 * const siteAssets = await fetchAllPages<ApiAsset>('/assets/', { site: 123 });
 * ```
 */
export async function fetchAllPages<T>(
  endpoint: string, 
  params?: Record<string, any>
): Promise<T[]> {
  const allResults: T[] = [];
  let nextUrl: string | null = endpoint;
  
  // Convert params to use page/page_size (DRF standard) instead of limit/offset
  const drfParams = { ...params };
  if ('limit' in drfParams) {
    drfParams.page_size = drfParams.limit;
    delete drfParams.limit;
  }
  if ('offset' in drfParams) {
    delete drfParams.offset; // DRF uses 'page' parameter instead
  }
  
  while (nextUrl) {
    const response = await api.get<PaginatedResponse<T>>(nextUrl, {
      params: nextUrl === endpoint ? drfParams : undefined // Only send params on first request
    });
    
    allResults.push(...response.data.results);
    nextUrl = response.data.next; // Follow 'next' link (null when no more pages)
    
    if (import.meta.env.DEV && nextUrl) {

    }
  }
  
  if (import.meta.env.DEV) {

  }
  
  return allResults;
}

/**
 * Fetch a single page of results
 * 
 * @template T - Type of the items in the results array
 * @param endpoint - API endpoint
 * @param params - Query parameters including page and page_size
 * @returns Promise with paginated response
 */
export async function fetchPage<T>(
  endpoint: string,
  params?: Record<string, any>
): Promise<PaginatedResponse<T>> {
  const response = await api.get<PaginatedResponse<T>>(endpoint, { params });
  return response.data;
}

/**
 * Convert DRF pagination format to our internal format
 * Useful for components that expect limit/offset style pagination
 */
export function convertDrfParams(params: Record<string, any>): Record<string, any> {
  const drfParams = { ...params };
  
  if ('limit' in drfParams) {
    drfParams.page_size = drfParams.limit;
    delete drfParams.limit;
  }
  
  if ('offset' in drfParams) {
    // Convert offset to page number (assuming page_size is set)
    const pageSize = drfParams.page_size || 50;
    drfParams.page = Math.floor(drfParams.offset / pageSize) + 1;
    delete drfParams.offset;
  }
  
  return drfParams;
}

export default {
  fetchAllPages,
  fetchPage,
  convertDrfParams,
};
