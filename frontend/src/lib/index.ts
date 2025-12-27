/**
 * Lib exports
 * 
 * Exports centralizados para a biblioteca de utilitários
 */

// API Client
export { api, reconfigureApiForTenant } from './api';

// Tenant Management
export { 
  getTenantConfig, 
  getTenantApiUrl, 
  getTenantBranding,
  saveTenantConfig,
  clearTenantConfig,
  type TenantConfig,
  type TenantBranding
} from './tenant';

// Tenant Storage
export { 
  tenantStorage, 
  updateTenantSlugCache 
} from './tenantStorage';

// Pagination
export { 
  fetchAllPages, 
  fetchPage, 
  convertDrfParams 
} from './pagination';

// Utils
export { cn } from './utils';
