import type { UserRole } from './user';

export interface Invite {
  id: string;             // uuid
  email: string;
  role: UserRole;
  invited_by_user_id: string;
  token: string;          // uuid
  url: string;            // ex.: `${origin}/onboarding/accept?token=...`
  status: 'pending' | 'accepted' | 'revoked' | 'expired';
  sent_at: string;        // ISO
  expires_at: string;     // ISO (ex.: +7 dias)
}