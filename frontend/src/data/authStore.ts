import type { Role } from '@/acl/abilities';
import { useAuthStore } from '@/store/useAuthStore';

const resolveRole = (): Role => {
  const auth = useAuthStore.getState();
  return (
    (auth.roleOverride as Role | null) ||
    (auth.user?.role as Role | undefined) ||
    (auth.tenant?.role as Role | undefined) ||
    'viewer'
  );
};

export function useCurrentRole(): [Role, (r: Role) => void] {
  const role = useAuthStore((state) => {
    return (
      (state.roleOverride as Role | null) ||
      (state.user?.role as Role | undefined) ||
      (state.tenant?.role as Role | undefined) ||
      'viewer'
    );
  });
  const setRole = (r: Role) => useAuthStore.getState().setRoleOverride(r);

  return [role, setRole];
}

export function getCurrentRole(): Role {
  return resolveRole();
}

export function setCurrentRole(role: Role): void {
  useAuthStore.getState().setRoleOverride(role);
}
