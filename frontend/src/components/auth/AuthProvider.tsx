import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

// Rotas públicas que não precisam de autenticação
const PUBLIC_ROUTES = ['/login', '/forgot-password', '/reset-password', '/onboarding/accept', '/accept-invite', '/quick-setup', '/welcome-tour'];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isLoading } = useAuth();

  const isPublicRoute = PUBLIC_ROUTES.some(route => location.pathname.startsWith(route));

  useEffect(() => {
    if (isLoading) return; // Don't redirect while checking auth status

    if (!isAuthenticated && !isPublicRoute) {
      // User not authenticated and not on public route, redirect to login
      navigate('/login');
    } else if (isAuthenticated && location.pathname === '/login') {
      // User authenticated and on login page, redirect to dashboard
      navigate('/');
    }
  }, [isAuthenticated, isLoading, navigate, location.pathname, isPublicRoute]);

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