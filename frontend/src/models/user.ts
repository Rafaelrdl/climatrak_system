export type UserRole = 'admin' | 'technician' | 'operator' | 'viewer';
export type UserStatus = 'active' | 'invited' | 'disabled';

export interface User {
  id: string;                 // uuid
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  avatar_url?: string;        // base64 ou URL local
  phone?: string;
  created_at: string;         // ISO
  updated_at?: string;        // ISO
  last_login_at?: string;     // ISO
  // Preferências
  preferences?: {
    theme: 'system' | 'light' | 'dark';
    language: 'pt-BR' | 'en-US';
    date_format: 'DD/MM/YYYY' | 'YYYY-MM-DD';
    time_format: '24h' | '12h';
    alert_cooldown_minutes: number;
    notifications: {
      email: boolean;
      push: boolean;
    };
  };
  // Segurança (simulado)
  security?: {
    two_factor_enabled: boolean;
    recovery_codes?: string[]; // somente client-side
  };
}

export const defaultPreferences = {
  theme: 'system' as const,
  language: 'pt-BR' as const,
  date_format: 'DD/MM/YYYY' as const,
  time_format: '24h' as const,
  alert_cooldown_minutes: 60,
  notifications: {
    email: true,
    push: true,
  },
};

export const defaultSecurity = {
  two_factor_enabled: false,
  recovery_codes: [] as string[],
};