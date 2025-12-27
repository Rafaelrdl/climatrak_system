/**
 * Service for public invite operations (no authentication required)
 */
import axios from 'axios';

// API base URL
const API_BASE = '/api';

export interface InviteInfo {
  id: number;
  email: string;
  role: string;
  tenant_name: string;
  tenant_slug: string;
  invited_by_name: string;
  expires_at: string;
}

export interface AcceptInviteData {
  token: string;
  name: string;
  password: string;
}

export interface AcceptInviteResponse {
  message: string;
  user: {
    id: number;
    email: string;
    full_name: string;
  };
  membership: {
    tenant_name: string;
    tenant_slug: string;
    role: string;
  };
}

class InviteService {
  /**
   * Validates an invite token and returns invite info
   * GET /api/invites/validate/?token=<token>
   */
  async validateInvite(token: string): Promise<InviteInfo> {
    const response = await axios.get<InviteInfo>(`${API_BASE}/invites/validate/`, {
      params: { token }
    });
    return response.data;
  }

  /**
   * Accepts an invite and creates user account
   * POST /api/invites/accept/
   */
  async acceptInvite(data: AcceptInviteData): Promise<AcceptInviteResponse> {
    const response = await axios.post<AcceptInviteResponse>(`${API_BASE}/invites/accept/`, data);
    return response.data;
  }
}

export const inviteService = new InviteService();
