import type { Invite } from '@/models/invite';
import type { UserRole, User } from '@/models/user';
import { usersStore } from './usersStore';
import { credentialsStore } from './credentialsStore';

const INVITES_KEY = 'invites:db';

// Helper para carregar dados do localStorage ou usar seed vazio
function load<T>(key: string, seed: T): T {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : seed;
  } catch {
    return seed;
  }
}

// Helper para salvar dados no localStorage
function save<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error('Erro ao salvar no localStorage:', error);
  }
}

// Helper para gerar UUID simples
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Store de convites
class InvitesStore {
  private invites: Invite[] = [];

  constructor() {
    this.invites = load(INVITES_KEY, []);
    this.cleanExpiredInvites();
  }

  private saveInvites(): void {
    save(INVITES_KEY, this.invites);
  }

  private cleanExpiredInvites(): void {
    const now = new Date();
    
    // Marcar como expirados os pendentes que passaram do prazo
    this.invites.forEach(invite => {
      if (invite.status === 'pending' && new Date(invite.expires_at) <= now) {
        invite.status = 'expired';
      }
    });

    this.saveInvites();
  }

  createInvite(params: {
    email: string;
    role: UserRole;
    invited_by_user_id: string;
  }): Invite {
    // Verificar se já existe um convite pendente para este email
    const existingInvite = this.invites.find(
      invite => invite.email === params.email && invite.status === 'pending'
    );
    
    if (existingInvite) {
      throw new Error('Já existe um convite pendente para este email');
    }

    // Verificar se usuário já existe
    const existingUser = usersStore.getUserByEmail(params.email);
    if (existingUser) {
      throw new Error('Usuário já cadastrado com este email');
    }

    const token = generateUUID();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 dias

    const invite: Invite = {
      id: generateUUID(),
      email: params.email,
      role: params.role,
      invited_by_user_id: params.invited_by_user_id,
      token,
      url: `${window.location.origin}/onboarding/accept?token=${token}`,
      status: 'pending',
      sent_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
    };

    this.invites.push(invite);
    this.saveInvites();

    return { ...invite };
  }

  listInvites(): Invite[] {
    this.cleanExpiredInvites();
    return [...this.invites].sort((a, b) => 
      new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime()
    );
  }

  getInviteByToken(token: string): Invite | null {
    const invite = this.invites.find(i => i.token === token);
    
    if (!invite) return null;
    
    // Verificar se não expirou
    if (invite.status === 'pending' && new Date(invite.expires_at) <= new Date()) {
      invite.status = 'expired';
      this.saveInvites();
      return null;
    }

    return invite.status === 'pending' ? { ...invite } : null;
  }

  resendInvite(id: string): Invite {
    const inviteIndex = this.invites.findIndex(i => i.id === id);
    if (inviteIndex < 0) {
      throw new Error('Convite não encontrado');
    }

    const invite = this.invites[inviteIndex];
    if (invite.status !== 'pending') {
      throw new Error('Convite não está pendente');
    }

    // Gerar novo token e atualizar datas
    const token = generateUUID();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 dias

    const updatedInvite: Invite = {
      ...invite,
      token,
      url: `${window.location.origin}/onboarding/accept?token=${token}`,
      sent_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
    };

    this.invites[inviteIndex] = updatedInvite;
    this.saveInvites();

    return { ...updatedInvite };
  }

  revokeInvite(id: string): void {
    const inviteIndex = this.invites.findIndex(i => i.id === id);
    if (inviteIndex >= 0) {
      this.invites[inviteIndex] = {
        ...this.invites[inviteIndex],
        status: 'revoked',
      };
      this.saveInvites();
    }
  }

  acceptInvite(token: string, userData: { name: string; password: string }): User {
    const invite = this.getInviteByToken(token);
    if (!invite) {
      throw new Error('Token de convite inválido ou expirado');
    }

    // Criar o usuário (sem password na interface User)
    const newUser = usersStore.addUser({
      name: userData.name,
      email: invite.email,
      role: invite.role,
      status: 'active',
    });

    // Salvar credenciais separadamente
    credentialsStore.addCredentials(newUser.id, newUser.email, userData.password);

    // Marcar convite como aceito
    const inviteIndex = this.invites.findIndex(i => i.id === invite.id);
    if (inviteIndex >= 0) {
      this.invites[inviteIndex] = {
        ...this.invites[inviteIndex],
        status: 'accepted',
      };
      this.saveInvites();
    }

    return newUser;
  }

  // Estatísticas para o dashboard admin
  getInviteStats(): {
    pending: number;
    accepted: number;
    expired: number;
    revoked: number;
  } {
    this.cleanExpiredInvites();
    
    const stats = {
      pending: 0,
      accepted: 0,
      expired: 0,
      revoked: 0,
    };

    this.invites.forEach(invite => {
      stats[invite.status]++;
    });

    return stats;
  }
}

// Instância singleton
export const invitesStore = new InvitesStore();

// Hooks para React
export function useInvites() {
  return {
    createInvite: (params: { email: string; role: UserRole; invited_by_user_id: string }) =>
      invitesStore.createInvite(params),
    listInvites: () => invitesStore.listInvites(),
    getInviteByToken: (token: string) => invitesStore.getInviteByToken(token),
    resendInvite: (id: string) => invitesStore.resendInvite(id),
    revokeInvite: (id: string) => invitesStore.revokeInvite(id),
    acceptInvite: (token: string, userData: { name: string; password: string }) =>
      invitesStore.acceptInvite(token, userData),
    getInviteStats: () => invitesStore.getInviteStats(),
  };
}