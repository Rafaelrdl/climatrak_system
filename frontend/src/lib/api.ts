/**
 * API Client with Axios
 * 
 * Configuração centralizada do cliente HTTP com:
 * - Base URL configurável por tenant
 * - Interceptors para JWT authentication
 * - Auto-refresh de tokens expirados
 * - CORS credentials
 * - Multi-tenant awareness
 * - Cookie-based authentication (HttpOnly)
 */

import axios, { AxiosError, AxiosHeaders, InternalAxiosRequestConfig } from 'axios';
import { getTenantApiUrl, getTenantFromHostname } from './tenant';
import { getAuthSnapshot } from '@/store/useAuthStore';
import { appStorage, STORAGE_KEYS } from './storage';

const LOG_THROTTLE_MS = 30000;
const errorLogTimestamps = new Map<string, number>();
const CSRF_COOKIE_NAME = 'csrftoken';
const CSRF_HEADER_NAME = 'X-CSRFToken';

const shouldLogError = (key: string): boolean => {
  const now = Date.now();
  const last = errorLogTimestamps.get(key);
  if (last && now - last < LOG_THROTTLE_MS) {
    return false;
  }
  errorLogTimestamps.set(key, now);
  return true;
};

const getTenantSchema = (): string | null => {
  const authTenant = getAuthSnapshot().tenant;
  if (authTenant?.schema_name) {
    return authTenant.schema_name;
  }
  if (authTenant?.slug) {
    return authTenant.slug;
  }
  return getTenantFromHostname();
};

const shouldSendTenantHeader = (): boolean => {
  if (typeof window === 'undefined') return false;
  const hostname = window.location.hostname;
  const hostParts = hostname.split('.');
  const hasSubdomain =
    hostParts.length > 1 && hostParts[0] !== 'www' && hostParts[0] !== 'localhost';
  return !hasSubdomain;
};

const setHeader = (
  headers: InternalAxiosRequestConfig['headers'],
  name: string,
  value: string
): InternalAxiosRequestConfig['headers'] => {
  if (!headers) {
    return { [name]: value };
  }
  if (headers instanceof AxiosHeaders) {
    headers.set(name, value);
    return headers;
  }
  const withSet = headers as AxiosHeaders;
  if (typeof withSet.set === 'function') {
    withSet.set(name, value);
    return headers;
  }
  (headers as Record<string, string>)[name] = value;
  return headers;
};

const isSafeMethod = (method?: string): boolean => {
  const normalized = method?.toLowerCase();
  return !normalized || ['get', 'head', 'options'].includes(normalized);
};

const getCookie = (name: string): string | null => {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
};



// Base URL da API (dinâmica por tenant)
const getApiBaseUrl = (): string => {
  // 🔧 DEV MODE: Use relative URL to enable Vite proxy (cookies work)
  // Frontend: localhost:5173/api → Proxy → Backend: umc.localhost:8000/api
  // This way cookies are shared because browser sees same origin (localhost:5173)
  if (import.meta.env.DEV) {
    return '/api';
  }
  
  // PRODUCTION: Use full tenant URL
  return getTenantApiUrl();
};

/**
 * Cliente Axios configurado
 */
export const api = axios.create({
  baseURL: getApiBaseUrl(),
  withCredentials: true, // Importante para cookies HttpOnly
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 segundos
});

/**
 * Reconfigura a API base URL dinamicamente
 * Chamado após login para ajustar ao tenant do usuário
 * @param tenantSlugOrUrl - Slug do tenant (para localhost) ou URL completa da API
 */
export const reconfigureApiForTenant = (tenantSlugOrUrl: string): void => {
  // 🔧 DEV MODE: Keep using relative URL (proxy handles routing)
  if (import.meta.env.DEV) {
    // Don't change baseURL in dev mode - proxy handles it
    return;
  }
  
  // PRODUCTION: Reconfigure to tenant's full URL
  let newBaseUrl: string;
  
  // Se parece com URL completa (contém http/https), usa direto
  if (tenantSlugOrUrl.startsWith('http://') || tenantSlugOrUrl.startsWith('https://')) {
    newBaseUrl = tenantSlugOrUrl;
  } else {
    // Usa pattern de URL se disponível
    const urlPattern = import.meta.env.VITE_API_URL_PATTERN;
    if (urlPattern && urlPattern.includes('{tenant}')) {
      newBaseUrl = urlPattern.replace('{tenant}', tenantSlugOrUrl);
    } else {
      // Fallback: usa URL fixa ou constrói com subdomínio
      newBaseUrl = import.meta.env.VITE_API_URL || `http://${tenantSlugOrUrl}.localhost:8000/api`;
    }
  }
  
  api.defaults.baseURL = newBaseUrl;
};

/**
 * Interceptor de Request
 * 
 * 🔐 AUTHENTICATION STRATEGY:
 * - Backend sends JWT tokens in HttpOnly cookies
 * - Browser automatically includes cookies in all requests via withCredentials: true
 * - NO Authorization header needed (cookies are sent automatically)
 * - X-Tenant header is added for multi-tenant routing
 */
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // 🍪 COOKIE-BASED AUTHENTICATION:
    // Tokens are sent automatically via HttpOnly cookies (withCredentials: true)
    // NO need to add Authorization header manually
    
    // 🏢 MULTI-TENANT: Add X-Tenant header only when not on a tenant subdomain
    // Subdomain routing is preferred when available.
    const tenantSchema = getTenantSchema();
    if (tenantSchema && shouldSendTenantHeader()) {
      config.headers = setHeader(config.headers, 'X-Tenant', tenantSchema);
    }

    if (!isSafeMethod(config.method)) {
      const csrfToken = getCookie(CSRF_COOKIE_NAME);
      if (csrfToken) {
        config.headers = setHeader(config.headers, CSRF_HEADER_NAME, csrfToken);
      }
    }
    
    return config;
  },
  (error: AxiosError) => {
    console.error('❌ Request Error:', error.message);
    return Promise.reject(error);
  }
);

// Queue de requests pendentes durante refresh
let isRefreshing = false;
let refreshUnavailable = false;
let failedQueue: Array<{
  resolve: (token: string | null) => void;
  reject: (error: AxiosError) => void;
}> = [];

const processQueue = (error: AxiosError | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

const isAuthEndpoint = (url: string): boolean =>
  url.includes('/v2/auth/') ||
  url.includes('/auth/login/') ||
  url.includes('/auth/me') ||
  url.includes('/auth/token/refresh/') ||
  url.includes('/auth/password-reset/');

const handleUnauthenticated = () => {
  const authSnapshot = getAuthSnapshot();
  if (authSnapshot.tenant?.schema_name) {
    appStorage.clearByScope(
      { tenant: authSnapshot.tenant.schema_name },
      { preserveKeys: [STORAGE_KEYS.ONBOARDING_STATE, STORAGE_KEYS.TOUR_STATE] }
    );
  }
  authSnapshot.clearSession();
  appStorage.emitAuthEvent(
    authSnapshot.tenant?.schema_name
      ? { tenant: authSnapshot.tenant.schema_name }
      : undefined
  );
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('authChange'));
  }
};

/**
 * Interceptor de Response
 * 
 * Handles:
 * - Token refresh on 401
 * - Queue management for concurrent requests during refresh
 * - Redirect to login on refresh failure
 */
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    const status = error.response?.status;
    const requestUrl = originalRequest?.url ?? '';

    // 401 Unauthorized - Tentar refresh
    if (
      status === 401 &&
      !originalRequest._retry &&
      !refreshUnavailable &&
      !isAuthEndpoint(requestUrl)
    ) {
      if (isRefreshing) {
        // Aguardar refresh em andamento
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => {
            return api(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Tentar refresh do token (cookie-based)
        // O refresh_token tamb?m ? um cookie HttpOnly
        const refreshHeaders: Record<string, string> = {};
        const tenantSchema = getTenantSchema();
        if (tenantSchema && shouldSendTenantHeader()) {
          refreshHeaders['X-Tenant'] = tenantSchema;
        }

        await axios.post(
          `${api.defaults.baseURL}/auth/token/refresh/`,
          {},
          { withCredentials: true, headers: refreshHeaders }
        );

        processQueue(null, null);
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh falhou - limpar tudo e redirecionar para login
        processQueue(refreshError as AxiosError, null);
        const refreshStatus = (refreshError as AxiosError).response?.status;
        if (refreshStatus === 404) {
          refreshUnavailable = true;
        }
        handleUnauthenticated();

        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    if (status === 401 && !isAuthEndpoint(requestUrl)) {
      handleUnauthenticated();
    }
    // Log outros erros
    if (import.meta.env.DEV) {
      const url = originalRequest?.url || '';
      const status = error.response?.status ?? 'unknown';
      const logKey = `${status}:${url}`;
      if (shouldLogError(logKey)) {
        console.error('❌ Response Error:', status, error.message);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
