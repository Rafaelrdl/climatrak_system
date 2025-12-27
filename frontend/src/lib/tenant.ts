/**
 * Tenant Management System
 * 
 * Gerencia a identificação e configuração de tenants no frontend.
 * Suporta múltiplas fontes de identificação:
 * 1. Token JWT (após login)
 * 2. Hostname (nginx multi-domain)
 * 3. Fallback para configuração padrão
 */

import { tenantStorage } from './tenantStorage';

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
 * Decodifica JWT sem validação (apenas leitura do payload)
 * Suporta base64url (usado por muitos JWTs) convertendo para base64 padrão
 */
const decodeJWT = (token: string): any => {
  try {
    const payload = token.split('.')[1];
    // Normalizar base64url para base64: substituir - por + e _ por /
    const normalizedPayload = payload.replace(/-/g, '+').replace(/_/g, '/');
    // Adicionar padding se necessário
    const paddedPayload = normalizedPayload + '='.repeat((4 - normalizedPayload.length % 4) % 4);
    return JSON.parse(atob(paddedPayload));
  } catch (error) {
    console.error('❌ Erro ao decodificar JWT:', error);
    return null;
  }
};

/**
 * Constrói a URL da API para um tenant específico
 * 
 * Estratégias suportadas:
 * 1. DEV: Usa URL relativa '/api' (proxy do Vite redireciona)
 * 2. PROD com pattern: Substitui {tenant} no padrão (ex: https://{tenant}.api.traknor.com/api)
 * 3. PROD com URL fixa: Usa VITE_API_URL diretamente
 * 4. Fallback: localhost com subdomínio
 */
const buildApiUrlForTenant = (tenantSlug: string): string => {
  // DEV: URL relativa (proxy do Vite cuida do roteamento)
  if (import.meta.env.DEV) {
    return '/api';
  }
  
  // PROD: Usa pattern de URL se disponível
  const urlPattern = import.meta.env.VITE_API_URL_PATTERN;
  if (urlPattern && urlPattern.includes('{tenant}')) {
    return urlPattern.replace('{tenant}', tenantSlug);
  }
  
  // PROD: URL fixa da API (single tenant ou API centralizada)
  const fixedUrl = import.meta.env.VITE_API_URL;
  if (fixedUrl) {
    return fixedUrl;
  }
  
  // Fallback: localhost com subdomínio (dev sem .env)
  return `http://${tenantSlug}.localhost:8000/api`;
};

/**
 * Extrai tenant do hostname
 * Suporta formatos:
 * - umc.localhost:5173 → "umc"
 * - acme.traksense.com → "acme"
 * - localhost:5173 → null
 */
const getTenantFromHostname = (): string | null => {
  const hostname = window.location.hostname;
  
  // Ignorar localhost simples
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return null;;
  }
  
  // Extrair primeiro segmento do domínio
  const parts = hostname.split('.');
  if (parts.length > 1) {
    return parts[0];
  }
  
  return null;
};

/**
 * Branding padrão para tenants conhecidos
 */
const TENANT_BRANDINGS: Record<string, TenantBranding> = {
  umc: {
    name: 'Uberlândia Medical Center',
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
 * 
 * Prioridade de detecção:
 * 1. Token JWT (mais confiável, pós-login)
 * 2. Hostname (nginx multi-domain)
 * 3. localStorage (tenant anterior)
 * 4. Fallback para default
 */
export const getTenantConfig = (): TenantConfig => {
  // 1. Try to read from persisted config (includes real api_base_url from backend)
  const persistedConfig = tenantStorage.get<TenantConfig>('tenant_config');
  if (persistedConfig && persistedConfig.apiBaseUrl) {
    return {
      ...persistedConfig,
      branding: TENANT_BRANDINGS[persistedConfig.tenantSlug] || TENANT_BRANDINGS.default,
    };
  }
  
  // 2. Tentar ler do token JWT (após login, antes de persistir config)
  const token = tenantStorage.get<string>('access_token') || localStorage.getItem('access_token');
  if (token) {
    const payload = decodeJWT(token);
    if (payload?.tenant_id) {
      const tenantSlug = payload.tenant_slug || payload.tenant_id;
      // Usar URL do backend se disponível, senão construir baseado no ambiente
      const apiBaseUrl = payload.api_base_url || buildApiUrlForTenant(tenantSlug);
      
      const config: TenantConfig = {
        tenantId: payload.tenant_id,
        tenantSlug,
        tenantName: payload.tenant_name || tenantSlug.toUpperCase(),
        apiBaseUrl,
        branding: TENANT_BRANDINGS[tenantSlug] || TENANT_BRANDINGS.default,
      };
      
      // Persist config for future use
      tenantStorage.set('tenant_config', config);
      return config;
    }
  }
  
  // 3. Tentar ler do hostname
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
  
  // 4. Default tenant (from env or fallback)
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

/**
 * Obtém a URL base da API para o tenant atual
 */
export const getTenantApiUrl = (): string => {
  const config = getTenantConfig();
  return config.apiBaseUrl;
};

/**
 * Obtém o branding do tenant atual
 */
export const getTenantBranding = (): TenantBranding => {
  const config = getTenantConfig();
  return config.branding || TENANT_BRANDINGS.default;
};

/**
 * Salva configuração do tenant (chamado após login)
 */
export const saveTenantConfig = (config: TenantConfig): void => {
  tenantStorage.set('tenant_config', config);
  localStorage.setItem('current_tenant', JSON.stringify({
    tenantId: config.tenantId,
    tenantSlug: config.tenantSlug,
    tenantName: config.tenantName,
  }));
};

/**
 * Limpa configuração do tenant (chamado no logout)
 */
export const clearTenantConfig = (): void => {
  tenantStorage.remove('tenant_config');
  localStorage.removeItem('current_tenant');
};

export default {
  getTenantConfig,
  getTenantApiUrl,
  getTenantBranding,
  saveTenantConfig,
  clearTenantConfig,
};
