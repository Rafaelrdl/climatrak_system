import { useEffect } from 'react';
import { useAuthStore } from '@/store/useAuthStore';

/**
 * Verifica se o usuario esta autenticado (sync check)
 */
export function isUserAuthenticated(): boolean {
  return useAuthStore.getState().isAuthenticated;
}

export function useAuth() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const isHydrating = useAuthStore((state) => state.isHydrating);

  useEffect(() => {
    if (!isHydrated) return;
  }, [isHydrated]);

  return { isAuthenticated, isLoading: isHydrating || !isHydrated };
}
