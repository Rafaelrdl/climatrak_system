/**
 * Tenant-Aware Storage System
 * 
 * Sistema de armazenamento que isola dados por tenant.
 * Cada tenant tem seu próprio namespace no localStorage.
 * 
 * Exemplo:
 * - Tenant UMC: "umc:access_token", "umc:user_preferences"
 * - Tenant ACME: "acme:access_token", "acme:user_preferences"
 */

// Cache em memória para evitar dependência circular com getTenantConfig
let cachedTenantSlug: string | null = null;

/**
 * Detecta tenant slug SEM chamar getTenantConfig (evita recursão)
 * Lê diretamente do localStorage ou token JWT
 */
const detectTenantSlug = (): string => {
  // 1. Usar cache se disponível
  if (cachedTenantSlug) {
    return cachedTenantSlug;
  }

  // 2. Tentar ler do hostname
  try {
    const hostname = window.location.hostname;
    if (hostname && hostname !== 'localhost' && !hostname.includes('127.0.0.1')) {
      const subdomain = hostname.split('.')[0];
      if (subdomain && subdomain !== 'www') {
        cachedTenantSlug = subdomain;
        return subdomain;
      }
    }
  } catch (error) {
    // Ignorar erro de window em testes
  }

  // 3. Tentar decodificar JWT do localStorage global (sem namespace)
  try {
    const token = localStorage.getItem('access_token');
    if (token) {
      const payload = token.split('.')[1];
      // Normalizar base64url para base64
      const normalizedPayload = payload.replace(/-/g, '+').replace(/_/g, '/');
      const paddedPayload = normalizedPayload + '='.repeat((4 - normalizedPayload.length % 4) % 4);
      const decoded = JSON.parse(atob(paddedPayload));
      
      if (decoded.tenant_slug) {
        cachedTenantSlug = decoded.tenant_slug;
        return decoded.tenant_slug;
      }
    }
  } catch (error) {
    // Token inválido ou não existe
  }

  // 4. Tentar ler de current_tenant no localStorage global
  try {
    const savedTenant = localStorage.getItem('current_tenant');
    if (savedTenant) {
      const parsed = JSON.parse(savedTenant);
      if (parsed.tenantSlug) {
        cachedTenantSlug = parsed.tenantSlug;
        return parsed.tenantSlug;
      }
    }
  } catch (error) {
    // Ignorar erro de parse
  }

  // 5. Fallback padrão
  cachedTenantSlug = 'default';
  return 'default';
};

/**
 * Atualiza cache do tenant slug (chamado após login/logout)
 */
export const updateTenantSlugCache = (slug: string | null): void => {
  cachedTenantSlug = slug;
};

/**
 * Gera chave prefixada com tenant ID
 */
const getTenantKey = (key: string): string => {
  const tenantSlug = detectTenantSlug();
  return `${tenantSlug}:${key}`;
};

/**
 * Storage isolado por tenant
 */
export const tenantStorage = {
  /**
   * Salva valor no localStorage do tenant atual
   */
  set: <T>(key: string, value: T): void => {
    try {
      const tenantKey = getTenantKey(key);
      localStorage.setItem(tenantKey, JSON.stringify(value));
    } catch (error) {
      console.error('❌ Erro ao salvar no storage:', error);
    }
  },

  /**
   * Lê valor do localStorage do tenant atual
   */
  get: <T>(key: string): T | null => {
    try {
      const tenantKey = getTenantKey(key);
      const item = localStorage.getItem(tenantKey);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error('❌ Erro ao ler do storage:', error);
      return null;
    }
  },

  /**
   * Remove valor do localStorage do tenant atual
   */
  remove: (key: string): void => {
    try {
      const tenantKey = getTenantKey(key);
      localStorage.removeItem(tenantKey);
    } catch (error) {
      console.error('❌ Erro ao remover do storage:', error);
    }
  },

  /**
   * Limpa todo o storage do tenant atual
   */
  clear: (): void => {
    try {
      const tenantSlug = detectTenantSlug();
      const keysToRemove: string[] = [];
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(`${tenantSlug}:`)) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach((key) => localStorage.removeItem(key));
      
      // Limpar também chaves globais de autenticação
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('current_tenant');
      localStorage.removeItem('auth:user');
      localStorage.removeItem('auth:role');
      
      // Resetar cache
      cachedTenantSlug = null;
    } catch (error) {
      console.error('❌ Erro ao limpar storage:', error);
    }
  },

  /**
   * Verifica se uma chave existe no tenant atual
   */
  has: (key: string): boolean => {
    const tenantKey = getTenantKey(key);
    return localStorage.getItem(tenantKey) !== null;
  },

  /**
   * Retorna o slug do tenant atual
   */
  getTenantSlug: (): string => {
    return detectTenantSlug();
  },
};

export default tenantStorage;
