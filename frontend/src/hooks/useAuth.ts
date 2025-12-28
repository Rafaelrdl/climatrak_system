import { useState, useEffect, useMemo } from 'react';

/**
 * Verifica se o usuário está autenticado (sync check)
 * Útil para condições em queries
 */
export function isUserAuthenticated(): boolean {
  return !!localStorage.getItem('auth:user');
}

export function useAuth() {
  // Initialize with sync check to avoid flash of unauthenticated state
  const [isAuthenticated, setIsAuthenticated] = useState(() => isUserAuthenticated());
  const [isLoading, setIsLoading] = useState(false); // Não mostrar loading se já tem auth

  useEffect(() => {
    const checkAuth = () => {
      const user = localStorage.getItem('auth:user');
      const tenantSchema = localStorage.getItem('auth:tenant_schema');
      const hasAuth = !!user && !!tenantSchema;
      
      if (hasAuth !== isAuthenticated) {
        console.log('🔄 Auth state changed:', { hasAuth, user: user ? 'present' : 'missing', tenant: tenantSchema });
        setIsAuthenticated(hasAuth);
      }
      setIsLoading(false);
    };

    checkAuth();

    // Listen for storage changes (logout in another tab)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'auth:user' || e.key === 'auth:tenant_schema') {
        checkAuth();
      }
    };

    // Listen for custom auth change events
    const handleAuthChange = () => {
      checkAuth();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('authChange', handleAuthChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('authChange', handleAuthChange);
    };
  }, [isAuthenticated]);

  return { isAuthenticated, isLoading };
}