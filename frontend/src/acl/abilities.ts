/**
 * Papéis do sistema:
 * - owner: Proprietário (assinou contrato, billing)
 * - admin: Administrador (gerentes, gestores)
 * - operator: Operador (gerencia planos, OS, estoques)
 * - technician: Técnico (executa OS)
 * - requester: Solicitante (abre solicitações)
 * - viewer: Visualizador (somente leitura)
 */
export type Role = 'owner' | 'admin' | 'operator' | 'technician' | 'requester' | 'viewer';
export type Action = 'view' | 'create' | 'edit' | 'delete' | 'move' | 'convert' | 'manage' | 'execute';
export type Subject =
  | 'workorder' | 'asset' | 'plan' | 'inventory' | 'procedure' | 'solicitation' | 'report' | 'user' | 'billing' | '*';

export interface AbilityRule {
  action: Action | Action[];
  subject: Subject | Subject[];
  when?: (ctx?: any) => boolean; // opcional, p/ regras contextuais
}

export type AbilityMap = Record<Role, AbilityRule[]>;

export const abilities: AbilityMap = {
  owner: [
    // Acesso total incluindo billing
    { action: ['view','create','edit','delete','manage','execute'], subject: '*' },
  ],
  admin: [
    // Acesso administrativo completo (exceto billing)
    { action: ['view','create','edit','delete','manage','execute'], subject: ['workorder', 'asset', 'plan', 'inventory', 'procedure', 'solicitation', 'report', 'user'] },
    { action: ['view'], subject: 'billing' },
  ],
  operator: [
    // Gerencia planos, OS, estoques
    { action: ['view'], subject: '*' },
    { action: ['create','edit','delete'], subject: ['workorder', 'plan', 'inventory', 'procedure'] },
    { action: ['edit'], subject: 'asset' },
    { action: ['convert'], subject: 'solicitation' },
  ],
  technician: [
    // Executa OS, atualiza status
    { action: ['view'], subject: '*' },
    { action: ['execute','edit'], subject: 'workorder' },
    { action: ['edit'], subject: 'inventory' },
    { action: ['create'], subject: 'solicitation' },
  ],
  requester: [
    // Abre solicitações
    { action: ['view'], subject: ['solicitation', 'asset', 'workorder'] },
    { action: ['create','edit'], subject: 'solicitation' },
  ],
  viewer: [
    // Somente visualização
    { action: ['view'], subject: '*' },
  ],
};