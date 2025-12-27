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
  const [isLoading, setIsLoading] = useState(() => {
    // If we already have auth in localStorage, no need to show loading
    return !isUserAuthenticated();
  });

  useEffect(() => {
    const checkAuth = () => {
      const user = localStorage.getItem('auth:user');
      setIsAuthenticated(!!user);
      setIsLoading(false);
    };

    checkAuth();

    // Listen for storage changes (logout in another tab)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'auth:user') {
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
  }, []);

  return { isAuthenticated, isLoading };
}