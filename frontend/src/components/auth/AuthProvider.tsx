import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { tenantStorage } from '@/lib/tenantStorage';

// Rotas públicas que não precisam de autenticação
const PUBLIC_ROUTES = ['/login', '/forgot-password', '/reset-password', '/onboarding/accept', '/accept-invite', '/quick-setup', '/welcome-tour'];

// Extrai tenant do hostname
const getTenantFromHostname = (): string | null => {
  const hostname = window.location.hostname;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return null;
  }
  const parts = hostname.split('.');
  if (parts.length > 1 && parts[0] !== 'www') {
    return parts[0];
  }
  return null;
};

const normalizeTenantKey = (value: string): string =>
  value.toLowerCase().replace(/[-_]/g, '');

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isLoading } = useAuth();
  const [tenantValidated, setTenantValidated] = useState(false);

  const isPublicRoute = PUBLIC_ROUTES.some(route => location.pathname.startsWith(route));

  useEffect(() => {
    if (isLoading) return; // Don't redirect while checking auth status

    const tenantFromUrl = getTenantFromHostname();
    const storedTenantSchema = localStorage.getItem('auth:tenant_schema');
    const tenantMismatch =
      tenantFromUrl &&
      storedTenantSchema &&
      normalizeTenantKey(tenantFromUrl) !== normalizeTenantKey(storedTenantSchema);

    const clearTenantSession = () => {
      tenantStorage.clear();
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

    if (!tenantFromUrl && location.pathname === '/login' && storedTenantSchema && !isAuthenticated) {
      clearTenantSession();
    }

    // Validar tenant apenas se autenticado
    if (isAuthenticated && !isPublicRoute && !tenantValidated) {
      setTenantValidated(true);
    }

    if (!isAuthenticated && !isPublicRoute) {
      // User not authenticated and not on public route, redirect to login
      navigate('/login');
    } else if (isAuthenticated && location.pathname === '/login') {
      // User authenticated and on login page, redirect to dashboard
      navigate('/');
    }
  }, [isAuthenticated, isLoading, navigate, location.pathname, isPublicRoute, tenantValidated]);

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-muted-foreground">Verificando autenticação...</p>
        </div>
      </div>
    );
  }

  // Don't render protected routes if user is not authenticated
  // This prevents API calls from being made before authentication
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
