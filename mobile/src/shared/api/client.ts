// ============================================================
// ClimaTrak Mobile - API Client
// Axios-based client with auth interceptors and tenant handling
// ============================================================

import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { secureStorage, tenantStorage } from '@/shared/storage';
import type { ApiError } from '@/types';

// ==================== Configuration ====================
const API_TIMEOUT = 30000; // 30 seconds

// Get base URL from environment or use default
// In development, this should point to your local backend
// For Android emulator, use 10.0.2.2 instead of localhost
const getDefaultBaseUrl = (): string => {
  // This will be configured via environment variables
  // Default for development
  return 'http://localhost:8000';
};

// ==================== API Client Instance ====================
let baseURL = getDefaultBaseUrl();
let currentTenantSlug: string | null = null;

export const api: AxiosInstance = axios.create({
  baseURL,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ==================== Tenant Configuration ====================
export const configureApi = (tenantSlug: string, apiDomain?: string): void => {
  currentTenantSlug = tenantSlug;
  
  if (apiDomain) {
    // Use subdomain-based URL
    baseURL = `http://${tenantSlug}.${apiDomain}`;
  } else {
    // Use header-based tenant identification
    baseURL = getDefaultBaseUrl();
  }
  
  api.defaults.baseURL = baseURL;
  tenantStorage.setTenant(tenantSlug);
};

export const getApiBaseUrl = (): string => baseURL;
export const getCurrentTenant = (): string | null => currentTenantSlug;

// ==================== Refresh Token Logic ====================
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: unknown | null): void => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve();
    }
  });
  failedQueue = [];
};

// ==================== Request Interceptor ====================
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    // Add auth token
    const token = await secureStorage.getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Add tenant header if not using subdomain
    if (currentTenantSlug && !config.baseURL?.includes(currentTenantSlug)) {
      config.headers['X-Tenant'] = currentTenantSlug;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// ==================== Response Interceptor ====================
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Handle 401 Unauthorized - try to refresh token
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Queue this request while refreshing
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(() => api(originalRequest));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = await secureStorage.getRefreshToken();
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        // Call refresh endpoint
        const response = await axios.post(
          `${baseURL}/api/auth/token/refresh/`,
          { refresh: refreshToken },
          {
            headers: {
              'Content-Type': 'application/json',
              ...(currentTenantSlug ? { 'X-Tenant': currentTenantSlug } : {}),
            },
          }
        );

        const { access, refresh } = response.data;
        
        // Store new tokens
        await secureStorage.setTokens({
          access_token: access,
          refresh_token: refresh || refreshToken,
        });

        // Process queued requests
        processQueue(null);
        isRefreshing = false;

        // Retry original request
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError);
        isRefreshing = false;

        // Clear tokens and redirect to login
        await secureStorage.clearTokens();
        // Note: Navigation to login will be handled by auth store listener
        
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// ==================== Error Handling Utilities ====================
export const getErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiError>;
    const data = axiosError.response?.data;

    if (data) {
      if (data.detail) return data.detail;
      if (data.error) return data.error;
      if (data.message) return data.message;
      
      // Handle field errors
      if (data.field_errors) {
        const firstField = Object.keys(data.field_errors)[0];
        if (firstField && data.field_errors[firstField].length > 0) {
          return data.field_errors[firstField][0];
        }
      }
    }

    // Network errors
    if (axiosError.code === 'ECONNABORTED') {
      return 'Conexão expirou. Verifique sua internet.';
    }
    if (!axiosError.response) {
      return 'Sem conexão com o servidor. Verifique sua internet.';
    }

    // HTTP status messages
    switch (axiosError.response.status) {
      case 400:
        return 'Dados inválidos. Verifique as informações.';
      case 401:
        return 'Sessão expirada. Faça login novamente.';
      case 403:
        return 'Você não tem permissão para esta ação.';
      case 404:
        return 'Recurso não encontrado.';
      case 500:
        return 'Erro no servidor. Tente novamente mais tarde.';
      default:
        return 'Ocorreu um erro. Tente novamente.';
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Ocorreu um erro inesperado.';
};

export const isNetworkError = (error: unknown): boolean => {
  if (axios.isAxiosError(error)) {
    return !error.response || error.code === 'ECONNABORTED';
  }
  return false;
};

// ==================== Public API URL (for tenant discovery) ====================
let publicApiUrl = 'http://localhost:8000';

export const setPublicApiUrl = (url: string): void => {
  publicApiUrl = url;
};

export const getPublicApiUrl = (): string => publicApiUrl;

// Public API client (no tenant header)
export const publicApi = axios.create({
  baseURL: publicApiUrl,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const configurePublicApi = (url: string): void => {
  publicApiUrl = url;
  publicApi.defaults.baseURL = url;
};
