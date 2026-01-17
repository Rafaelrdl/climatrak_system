import { create } from 'zustand';
import type { User, UserRole } from '@/models/user';

export interface AuthTenant {
  id: string;
  schema_name: string;
  name: string;
  slug: string;
  role?: UserRole;
  features?: Record<string, boolean>;
}

interface AuthState {
  user: User | null;
  tenant: AuthTenant | null;
  isAuthenticated: boolean;
  isHydrated: boolean;
  isHydrating: boolean;
  roleOverride: UserRole | null;
  setSession: (session: { user: User; tenant: AuthTenant }) => void;
  clearSession: () => void;
  startHydration: () => void;
  finishHydration: () => void;
  updateUser: (partial: Partial<User>) => void;
  setRoleOverride: (role: UserRole | null) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  tenant: null,
  isAuthenticated: false,
  isHydrated: false,
  isHydrating: false,
  roleOverride: null,
  setSession: ({ user, tenant }) => {
    set({
      user,
      tenant,
      isAuthenticated: true,
      isHydrated: true,
      isHydrating: false,
    });
  },
  clearSession: () => {
    set({
      user: null,
      tenant: null,
      isAuthenticated: false,
      isHydrated: true,
      isHydrating: false,
      roleOverride: null,
    });
  },
  startHydration: () => {
    if (!get().isHydrating) {
      set({ isHydrating: true });
    }
  },
  finishHydration: () => {
    set({ isHydrating: false, isHydrated: true });
  },
  updateUser: (partial) => {
    const current = get().user;
    if (!current) return;
    set({ user: { ...current, ...partial } });
  },
  setRoleOverride: (role) => {
    set({ roleOverride: role });
  },
}));

export const getAuthSnapshot = () => useAuthStore.getState();
