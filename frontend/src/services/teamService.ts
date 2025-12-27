/**
 * Team Service - Membros da Equipe
 * 
 * Serviço para buscar membros da equipe do tenant.
 * Endpoint: /api/team/members/
 */

import { api } from '@/lib/api';

// ============================================================================
// TYPES
// ============================================================================

export interface TeamMember {
  id: number;
  user: {
    id: number;
    email: string;
    username: string;
    first_name: string;
    last_name: string;
    full_name: string;
  };
  role: 'owner' | 'admin' | 'operator' | 'viewer' | 'technician';
  status: 'active' | 'inactive' | 'suspended';
  joined_at: string;
  invited_by?: {
    id: number;
    email: string;
    full_name: string;
  } | null;
}

export interface TeamInvite {
  id: number;
  email: string;
  role: 'owner' | 'admin' | 'operator' | 'viewer' | 'technician';
  status: 'pending' | 'accepted' | 'expired' | 'cancelled';
  invited_by?: {
    id: number;
    email: string;
    full_name: string;
  } | null;
  created_at: string;
  expires_at: string;
  is_valid: boolean;
  is_expired: boolean;
}

export interface TeamStats {
  total_members: number;
  members_by_role: Record<string, number>;
  members_by_status: Record<string, number>;
  active_members: number;
  pending_invites: number;
}

export interface CreateInviteData {
  email: string;
  role: 'admin' | 'operator' | 'viewer' | 'technician';
  message?: string;
}

export interface UpdateMemberData {
  role?: 'admin' | 'operator' | 'viewer' | 'technician';
  status?: 'active' | 'inactive' | 'suspended';
}

// ============================================================================
// SERVICE
// ============================================================================

class TeamService {
  private baseUrl = '/team';

  /**
   * Lista todos os membros da equipe
   * GET /api/team/members/
   */
  async getMembers(): Promise<TeamMember[]> {
    const response = await api.get<{ results: TeamMember[] } | TeamMember[]>(`${this.baseUrl}/members/`);
    
    // DRF pode retornar paginado {results: [...]} ou array direto
    if (response.data && typeof response.data === 'object' && 'results' in response.data) {
      return response.data.results;
    }
    
    return response.data as TeamMember[];
  }

  /**
   * Atualiza um membro da equipe
   * PATCH /api/team/members/{id}/
   */
  async updateMember(memberId: number, data: UpdateMemberData): Promise<TeamMember> {
    const response = await api.patch<TeamMember>(`${this.baseUrl}/members/${memberId}/`, data);
    return response.data;
  }

  /**
   * Remove um membro da equipe
   * DELETE /api/team/members/{id}/
   */
  async removeMember(memberId: number): Promise<void> {
    await api.delete(`${this.baseUrl}/members/${memberId}/`);
  }

  /**
   * Estatísticas da equipe
   * GET /api/team/members/stats/
   */
  async getStats(): Promise<TeamStats> {
    const response = await api.get<TeamStats>(`${this.baseUrl}/members/stats/`);
    return response.data;
  }

  /**
   * Lista convites pendentes
   * GET /api/team/invites/
   */
  async getInvites(): Promise<TeamInvite[]> {
    const response = await api.get<{ results: TeamInvite[] } | TeamInvite[]>(`${this.baseUrl}/invites/`);
    
    if (response.data && typeof response.data === 'object' && 'results' in response.data) {
      return response.data.results;
    }
    
    return response.data as TeamInvite[];
  }

  /**
   * Cria um convite
   * POST /api/team/invites/
   */
  async createInvite(data: CreateInviteData): Promise<TeamInvite> {
    const response = await api.post<TeamInvite>(`${this.baseUrl}/invites/`, data);
    return response.data;
  }

  /**
   * Reenvia um convite
   * POST /api/team/invites/{id}/resend/
   */
  async resendInvite(inviteId: number): Promise<TeamInvite> {
    const response = await api.post<TeamInvite>(`${this.baseUrl}/invites/${inviteId}/resend/`);
    return response.data;
  }

  /**
   * Cancela/revoga um convite
   * DELETE /api/team/invites/{id}/
   */
  async revokeInvite(inviteId: number): Promise<void> {
    await api.delete(`${this.baseUrl}/invites/${inviteId}/`);
  }

  /**
   * Lista técnicos disponíveis (membros com role admin, operator ou technician que estão ativos)
   */
  async getTechnicians(): Promise<TeamMember[]> {
    const members = await this.getMembers();
    return members.filter(m => 
      m.status === 'active' && 
      ['admin', 'operator', 'technician', 'owner'].includes(m.role)
    );
  }
}

export const teamService = new TeamService();
