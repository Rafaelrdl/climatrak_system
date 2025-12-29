/**
 * Finance Route Guard
 * 
 * Guard de rota com checagem de permissões RBAC para o módulo Finance.
 * Baseado em: docs/frontend/finance/06-rbac-permissoes.md
 */

import { Navigate, useLocation } from 'react-router-dom';
import { useAbility } from '@/hooks/useAbility';
import type { Subject, Action } from '@/acl/abilities';

interface FinanceGuardProps {
  children: React.ReactNode;
  /** Subject a verificar (padrão: 'finance') */
  subject?: Subject;
  /** Action a verificar (padrão: 'view') */
  action?: Action;
  /** Rota de fallback se não tiver permissão */
  fallback?: string;
}

/**
 * Guard de rota para páginas Finance.
 * Verifica se o usuário tem permissão antes de renderizar.
 */
export function FinanceGuard({
  children,
  subject = 'finance',
  action = 'view',
  fallback = '/cmms',
}: FinanceGuardProps) {
  const { can } = useAbility();
  const location = useLocation();

  if (!can(action, subject)) {
    // Salva a rota original para redirect após login/autorização
    return (
      <Navigate
        to={fallback}
        state={{ from: location.pathname }}
        replace
      />
    );
  }

  return <>{children}</>;
}

/**
 * HOC para wrapping de componentes com guard
 */
export function withFinanceGuard<P extends object>(
  Component: React.ComponentType<P>,
  options?: Omit<FinanceGuardProps, 'children'>
) {
  return function GuardedComponent(props: P) {
    return (
      <FinanceGuard {...options}>
        <Component {...props} />
      </FinanceGuard>
    );
  };
}

export default FinanceGuard;
