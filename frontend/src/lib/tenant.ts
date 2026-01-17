import { getAuthSnapshot } from '@/store/useAuthStore';
import { appStorage, STORAGE_KEYS } from './storage';

export interface TenantConfig {
  tenantId: string;
  tenantSlug: string;
  tenantName: string;
  apiBaseUrl: string;
  branding?: TenantBranding;
}

export interface TenantBranding {
  logo?: string;
  primaryColor: string;
  secondaryColor?: string;
  name: string;
  shortName?: string;
  favicon?: string;
}

/**
 * Constrói a URL da API para um tenant específico
 */
const buildApiUrlForTenant = (tenantSlug: string): string => {
  if (import.meta.env.DEV) {
    return '/api';
  }

  const urlPattern = import.meta.env.VITE_API_URL_PATTERN;
  if (urlPattern && urlPattern.includes('{tenant}')) {
    return urlPattern.replace('{tenant}', tenantSlug);
  }

  const fixedUrl = import.meta.env.VITE_API_URL;
  if (fixedUrl) {
    return fixedUrl;
  }

  return `http://${tenantSlug}.localhost:8000/api`;
};

/**
 * Extrai tenant do hostname
 */
export const getTenantFromHostname = (): string | null => {
  const hostname = window.location.hostname;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return null;
  }
  const parts = hostname.split('.');
  if (parts.length > 1) {
    return parts[0];
  }
  return null;
};

const TENANT_BRANDINGS: Record<string, TenantBranding> = {
  umc: {
    name: 'Uberlandia Medical Center',
    shortName: 'UMC',
    primaryColor: '#0A5F7F',
    secondaryColor: '#0EA5E9',
    logo: '/logos/umc.svg',
    favicon: '/favicons/umc.ico',
  },
  acme: {
    name: 'ACME Corporation',
    shortName: 'ACME',
    primaryColor: '#FF6B00',
    secondaryColor: '#F97316',
    logo: '/logos/acme.svg',
    favicon: '/favicons/acme.ico',
  },
  default: {
    name: 'TrakNor CMMS',
    shortName: 'TrakNor',
    primaryColor: '#0A5F7F',
    secondaryColor: '#0EA5E9',
    logo: '/logo.svg',
    favicon: '/favicon.ico',
  },
};

/**
 * Obtém configuração do tenant atual
 */
export const getTenantConfig = (): TenantConfig => {
  const authTenant = getAuthSnapshot().tenant;
  if (authTenant) {
    const tenantSlug = authTenant.slug || authTenant.schema_name;
    const config: TenantConfig = {
      tenantId: String(authTenant.id),
      tenantSlug,
      tenantName: authTenant.name,
      apiBaseUrl: buildApiUrlForTenant(tenantSlug),
      branding: TENANT_BRANDINGS[tenantSlug] || TENANT_BRANDINGS.default,
    };
    appStorage.set(STORAGE_KEYS.TENANT_CONFIG, config, { tenant: tenantSlug });
    return config;
  }

  const persistedConfig = appStorage.get<TenantConfig>(STORAGE_KEYS.TENANT_CONFIG);
  if (persistedConfig && persistedConfig.apiBaseUrl) {
    return {
      ...persistedConfig,
      branding: TENANT_BRANDINGS[persistedConfig.tenantSlug] || TENANT_BRANDINGS.default,
    };
  }

  const hostnameTenant = getTenantFromHostname();
  if (hostnameTenant) {
    return {
      tenantId: hostnameTenant,
      tenantSlug: hostnameTenant,
      tenantName: hostnameTenant.toUpperCase(),
      apiBaseUrl: buildApiUrlForTenant(hostnameTenant),
      branding: TENANT_BRANDINGS[hostnameTenant] || TENANT_BRANDINGS.default,
    };
  }

  const defaultTenant = import.meta.env.VITE_DEFAULT_TENANT || 'umc';
  const defaultUrl = buildApiUrlForTenant(defaultTenant);
  return {
    tenantId: defaultTenant,
    tenantSlug: defaultTenant,
    tenantName: 'TrakNor CMMS',
    apiBaseUrl: defaultUrl,
    branding: TENANT_BRANDINGS[defaultTenant] || TENANT_BRANDINGS.default,
  };
};

export const getTenantApiUrl = (): string => {
  const config = getTenantConfig();
  return config.apiBaseUrl;
};

export const getTenantBranding = (): TenantBranding => {
  const config = getTenantConfig();
  return config.branding || TENANT_BRANDINGS.default;
};

export const saveTenantConfig = (config: TenantConfig): void => {
  appStorage.set(STORAGE_KEYS.TENANT_CONFIG, config, { tenant: config.tenantSlug });
};

export const clearTenantConfig = (): void => {
  appStorage.remove(STORAGE_KEYS.TENANT_CONFIG);
};

export default {
  getTenantConfig,
  getTenantApiUrl,
  getTenantBranding,
  saveTenantConfig,
  clearTenantConfig,
};
