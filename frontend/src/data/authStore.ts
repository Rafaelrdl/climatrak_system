import { useEffect, useState } from 'react';
import type { Role } from '@/acl/abilities';
import { usersStore } from './usersStore';

const LS_KEY = 'auth:role';

export function useCurrentRole(): [Role, (r: Role) => void] {
  const [role, setRole] = useState<Role>(() => {
    try {
      // Tentar obter do usuário atual primeiro
      const currentUser = usersStore.getCurrentUser();
      if (currentUser?.role) {
        return currentUser.role;
      }
    } catch {
      // Se falhar, usar localStorage como fallback
    }
    
    const stored = localStorage.getItem(LS_KEY) as Role;
    return stored || 'requester';
  });

  useEffect(() => {
    localStorage.setItem(LS_KEY, role);
  }, [role]);

  return [role, setRole];
}

// Função utilitária para obter o papel atual de forma síncrona
export function getCurrentRole(): Role {
  try {
    // Tentar obter do usuário atual primeiro
    const currentUser = usersStore.getCurrentUser();
    if (currentUser?.role) {
      return currentUser.role;
    }
  } catch {
    // Se falhar, usar localStorage como fallback
  }
  
  const stored = localStorage.getItem(LS_KEY) as Role;
  return stored || 'requester';
}

// Função para definir o papel (útil para testes)
export function setCurrentRole(role: Role): void {
  localStorage.setItem(LS_KEY, role);
}