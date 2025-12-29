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
export type Action = 'view' | 'create' | 'edit' | 'delete' | 'move' | 'convert' | 'manage' | 'execute' | 'approve';
export type Subject =
  | 'workorder' | 'asset' | 'plan' | 'inventory' | 'procedure' | 'solicitation' | 'report' | 'user' | 'billing'
  | 'finance' | 'finance_budget' | 'finance_ledger' | 'finance_commitment' | 'finance_savings'
  | '*';

export interface AbilityRule {
  action: Action | Action[];
  subject: Subject | Subject[];
  when?: (ctx?: any) => boolean; // opcional, p/ regras contextuais
}

export type AbilityMap = Record<Role, AbilityRule[]>;

export const abilities: AbilityMap = {
  owner: [
    // Acesso total incluindo billing e finance
    { action: ['view','create','edit','delete','manage','execute','approve'], subject: '*' },
  ],
  admin: [
    // Acesso administrativo completo (exceto billing)
    { action: ['view','create','edit','delete','manage','execute'], subject: ['workorder', 'asset', 'plan', 'inventory', 'procedure', 'solicitation', 'report', 'user'] },
    { action: ['view'], subject: 'billing' },
    // Finance: acesso total (exceto aprovar commitments, que fica para owner/diretor)
    { action: ['view','create','edit','delete','manage'], subject: ['finance', 'finance_budget', 'finance_ledger', 'finance_commitment', 'finance_savings'] },
    { action: ['approve'], subject: 'finance_commitment' },
  ],
  operator: [
    // Gerencia planos, OS, estoques
    { action: ['view'], subject: '*' },
    { action: ['create','edit','delete'], subject: ['workorder', 'plan', 'inventory', 'procedure'] },
    { action: ['edit'], subject: 'asset' },
    { action: ['convert'], subject: 'solicitation' },
    // Finance: pode criar commitments e savings, mas não aprova
    { action: ['view'], subject: ['finance', 'finance_budget', 'finance_ledger', 'finance_commitment', 'finance_savings'] },
    { action: ['create'], subject: ['finance_commitment', 'finance_savings'] },
  ],
  technician: [
    // Executa OS, atualiza status
    { action: ['view'], subject: '*' },
    { action: ['execute','edit'], subject: 'workorder' },
    { action: ['edit'], subject: 'inventory' },
    { action: ['create'], subject: 'solicitation' },
    // Finance: somente visualiza custos da própria OS (controlado no backend)
    { action: ['view'], subject: 'finance_ledger' },
  ],
  requester: [
    // Abre solicitações
    { action: ['view'], subject: ['solicitation', 'asset', 'workorder'] },
    { action: ['create','edit'], subject: 'solicitation' },
    // Finance: sem acesso
  ],
  viewer: [
    // Somente visualização
    { action: ['view'], subject: '*' },
    // Finance: pode ver painel e ledger
    { action: ['view'], subject: ['finance', 'finance_ledger', 'finance_savings'] },
  ],
};