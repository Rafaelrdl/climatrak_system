import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/store/useAuthStore';
import { getCurrentSession } from '@/services/authService';
import { useFeaturesStore } from '@/store/useFeaturesStore';
import { appStorage, migrateLegacyStorage } from '@/lib/storage';
import { getTenantFromHostname } from '@/lib/tenant';

const PUBLIC_ROUTES = [
  '/login',
  '/forgot-password',
  '/reset-password',
  '/onboarding/accept',
  '/accept-invite',
  '/quick-setup',
  '/welcome-tour',
];

const normalizeTenantKey = (value: string): string =>
  value.toLowerCase().replace(/[-_]/g, '');

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isLoading } = useAuth();
  const tenant = useAuthStore((state) => state.tenant);
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const isHydrating = useAuthStore((state) => state.isHydrating);
  const startHydration = useAuthStore((state) => state.startHydration);
  const finishHydration = useAuthStore((state) => state.finishHydration);
  const setSession = useAuthStore((state) => state.setSession);
  const clearSession = useAuthStore((state) => state.clearSession);
  const setFeatures = useFeaturesStore((state) => state.setFeatures);
  const [tenantValidated, setTenantValidated] = useState(false);
  const [sessionBlocked, setSessionBlocked] = useState(false);

  const isPublicRoute = PUBLIC_ROUTES.some((route) =>
    location.pathname.startsWith(route)
  );

  const hydrateSession = useCallback(async () => {
    if (sessionBlocked || isHydrated || isHydrating) return;
    startHydration();
    try {
      const session = await getCurrentSession();
      setSession(session);
      if (session.tenant.features) {
        setFeatures(session.tenant.features);
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        if (status === 401 || status === 404) {
          setSessionBlocked(true);
        }
      }
      clearSession();
    } finally {
      finishHydration();
    }
  }, [
    sessionBlocked,
    isHydrated,
    isHydrating,
    startHydration,
    finishHydration,
    setSession,
    clearSession,
    setFeatures,
  ]);

  useEffect(() => {
    migrateLegacyStorage();
  }, []);

  useEffect(() => {
    void hydrateSession();
  }, [hydrateSession, sessionBlocked]);

  useEffect(() => {
    const handleAuthChange = () => {
      if (sessionBlocked) {
        setSessionBlocked(false);
      }
      void hydrateSession();
    };

    const handleStorage = (event: StorageEvent) => {
      if (!event.key) return;
      if (event.key.includes(':auth.event')) {
        if (sessionBlocked) {
          setSessionBlocked(false);
        }
        void hydrateSession();
      }
    };

    window.addEventListener('authChange', handleAuthChange);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('authChange', handleAuthChange);
      window.removeEventListener('storage', handleStorage);
    };
  }, [hydrateSession]);

  useEffect(() => {
    if (isLoading) return;

    const tenantFromUrl = getTenantFromHostname();
    const storedTenant = tenant?.schema_name;
    const tenantMismatch =
      tenantFromUrl &&
      storedTenant &&
      normalizeTenantKey(tenantFromUrl) !== normalizeTenantKey(storedTenant);

    const clearTenantSession = () => {
      if (storedTenant) {
        appStorage.clearByScope({ tenant: storedTenant });
      }
      clearSession();
      appStorage.emitAuthEvent();
      window.dispatchEvent(new Event('authChange'));
    };

    if (tenantMismatch) {
      console.warn('Tenant mismatch detected - clearing session');
      clearTenantSession();
      setTenantValidated(false);
      if (!isPublicRoute) {
        navigate('/login');
      }
      return;
    }

    if (isAuthenticated && !isPublicRoute && !tenantValidated) {
      setTenantValidated(true);
    }

    if (!isAuthenticated && !isPublicRoute) {
      navigate('/login');
    } else if (isAuthenticated && location.pathname === '/login') {
      navigate('/');
    }
  }, [
    isAuthenticated,
    isLoading,
    navigate,
    location.pathname,
    isPublicRoute,
    tenantValidated,
    tenant,
    clearSession,
    sessionBlocked,
  ]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-muted-foreground">Verificando autenticacao...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated && !isPublicRoute) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-muted-foreground">Redirecionando para login...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
