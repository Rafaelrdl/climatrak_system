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

import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { getTenantApiUrl } from './tenant';
import { tenantStorage } from './tenantStorage';

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
 */
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // 🍪 COOKIE-BASED AUTHENTICATION:
    // Tokens are sent automatically via HttpOnly cookies (withCredentials: true)
    // NO need to add Authorization header manually
    
    // Debug log in development
    if (import.meta.env.DEV) {

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
    if (import.meta.env.DEV) {

    }
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // 401 Unauthorized - Tentar refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
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
        // O refresh_token também é um cookie HttpOnly
        const { data } = await axios.post(
          `${api.defaults.baseURL}/auth/token/refresh/`,
          {},
          { withCredentials: true }
        );

        if (import.meta.env.DEV) {

        }

        processQueue(null, data.access);
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh falhou - limpar tudo e redirecionar para login
        processQueue(refreshError as AxiosError, null);
        
        // Limpar storage do tenant
        tenantStorage.clear();
        
        // Redirecionar para login
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Log outros erros
    if (import.meta.env.DEV) {
      console.error('❌ Response Error:', error.response?.status, error.message);
    }

    return Promise.reject(error);
  }
);

export default api;
