import { getAuthSnapshot } from '@/store/useAuthStore';

// Cache em memoria para evitar dependencia circular com getTenantConfig
let cachedTenantSlug: string | null = null;

/**
 * Detecta tenant slug sem chamar getTenantConfig (evita recursao)
 * Usa apenas fontes confiaveis (auth store + hostname)
 */
const detectTenantSlug = (): string => {
  if (cachedTenantSlug) {
    return cachedTenantSlug;
  }

  const authTenant = getAuthSnapshot().tenant;
  if (authTenant?.schema_name) {
    cachedTenantSlug = authTenant.schema_name;
    return cachedTenantSlug;
  }

  try {
    const hostname = window.location.hostname;
    if (hostname && hostname !== 'localhost' && !hostname.includes('127.0.0.1')) {
      const subdomain = hostname.split('.')[0];
      if (subdomain && subdomain !== 'www') {
        cachedTenantSlug = subdomain;
        return subdomain;
      }
    }
  } catch {
    // Ignorar erro de window em testes
  }

  cachedTenantSlug = 'default';
  return 'default';
};

/**
 * Atualiza cache do tenant slug (chamado apos login/logout)
 */
export const updateTenantSlugCache = (slug: string | null): void => {
  cachedTenantSlug = slug;
};

export const getTenantSlug = (): string => detectTenantSlug();

export const tenantStorage = {
  getTenantSlug,
};

export default tenantStorage;
