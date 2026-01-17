import type { User, UserStatus } from '@/models/user';
import { defaultPreferences, defaultSecurity } from '@/models/user';
import mockUsers from '@/mocks/users.json';
import { appStorage, STORAGE_KEYS } from '@/lib/storage';
import { getAuthSnapshot, useAuthStore } from '@/store/useAuthStore';

// Helper para carregar dados do storage ou usar seed
function load<T>(seed: T): T {
  return appStorage.get<T>(STORAGE_KEYS.DATA_USERS) ?? seed;
}

// Helper para salvar dados no storage
function save<T>(value: T): void {
  appStorage.set(STORAGE_KEYS.DATA_USERS, value);
}

// Store de usuarios
class UsersStore {
  private users: User[] = [];

  constructor() {
    this.users = load(mockUsers as User[]);
  }

  private saveUsers(): void {
    save(this.users);
  }

  listUsers(): User[] {
    return [...this.users];
  }

  getCurrentUser(): User | null {
    const authUser = getAuthSnapshot().user;
    return authUser ? { ...authUser } : null;
  }

  setCurrentUser(userId: string): void {
    const user = this.users.find((u) => u.id === userId);
    if (!user || user.status !== 'active') {
      throw new Error('Usuario nao encontrado ou inativo');
    }
    const authTenant = getAuthSnapshot().tenant;
    if (!authTenant) {
      throw new Error('Tenant nao identificado');
    }
    useAuthStore.getState().setSession({ user, tenant: authTenant });
  }

  updateCurrentUser(partial: Partial<User>): User {
    const currentUser = this.getCurrentUser();
    if (!currentUser) {
      throw new Error('Nenhum usuario autenticado');
    }

    const updatedUser = {
      ...currentUser,
      ...partial,
      id: currentUser.id,
      email: currentUser.email,
      updated_at: new Date().toISOString(),
    };

    useAuthStore.getState().updateUser(updatedUser);

    return { ...updatedUser };
  }

  updateUser(id: string, partial: Partial<User>): User {
    const userIndex = this.users.findIndex((u) => u.id === id);
    if (userIndex < 0) {
      throw new Error('Usuario nao encontrado');
    }

    const user = this.users[userIndex];
    const updatedUser = {
      ...user,
      ...partial,
      id: user.id,
      updated_at: new Date().toISOString(),
    };

    if (!updatedUser.preferences) {
      updatedUser.preferences = { ...defaultPreferences };
    }
    if (!updatedUser.security) {
      updatedUser.security = { ...defaultSecurity };
    }

    this.users[userIndex] = updatedUser;
    this.saveUsers();

    return { ...updatedUser };
  }

  addUser(user: Omit<User, 'id' | 'created_at' | 'updated_at'>): User {
    const newUser: User = {
      ...user,
      id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      preferences: user.preferences || { ...defaultPreferences },
      security: user.security || { ...defaultSecurity },
    };

    this.users.push(newUser);
    this.saveUsers();

    return { ...newUser };
  }

  setUserStatus(id: string, status: UserStatus): void {
    const userIndex = this.users.findIndex((u) => u.id === id);
    if (userIndex >= 0) {
      this.users[userIndex] = {
        ...this.users[userIndex],
        status,
        updated_at: new Date().toISOString(),
      };
      this.saveUsers();
    }
  }

  getUserByEmail(email: string): User | null {
    const user = this.users.find((u) => u.email === email);
    return user ? { ...user } : null;
  }

  generateRecoveryCodes(): string[] {
    const codes: string[] = [];
    for (let i = 0; i < 8; i++) {
      const code = Math.random().toString(36).substr(2, 6).toUpperCase();
      codes.push(code);
    }
    return codes;
  }
}

export const usersStore = new UsersStore();

export function useUsers() {
  return {
    listUsers: () => usersStore.listUsers(),
    getCurrentUser: () => usersStore.getCurrentUser(),
    setCurrentUser: (userId: string) => usersStore.setCurrentUser(userId),
    updateCurrentUser: (partial: Partial<User>) =>
      usersStore.updateCurrentUser(partial),
    updateUser: (id: string, partial: Partial<User>) =>
      usersStore.updateUser(id, partial),
    addUser: (user: Omit<User, 'id' | 'created_at' | 'updated_at'>) =>
      usersStore.addUser(user),
    setUserStatus: (id: string, status: UserStatus) =>
      usersStore.setUserStatus(id, status),
    getUserByEmail: (email: string) => usersStore.getUserByEmail(email),
    generateRecoveryCodes: () => usersStore.generateRecoveryCodes(),
  };
}

export function useCurrentUser(): User | null {
  return usersStore.getCurrentUser();
}

export function useUpdateCurrentUser() {
  return (partial: Partial<User>) => usersStore.updateCurrentUser(partial);
}
