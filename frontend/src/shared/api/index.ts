/**
 * Shared API utilities
 * 
 * Utilitários de API compartilhados entre os módulos.
 */

// Base URL por módulo
export const API_BASE_URLS = {
  cmms: '/api/cmms',
  monitor: '/api/monitor',
} as const;

// Função helper para construir URLs de API
export function getApiUrl(module: 'cmms' | 'monitor', path: string): string {
  const baseUrl = API_BASE_URLS[module];
  return `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
}
