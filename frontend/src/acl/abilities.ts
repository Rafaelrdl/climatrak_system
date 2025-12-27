export type Role = 'admin' | 'technician' | 'requester';
export type Action = 'view' | 'create' | 'edit' | 'delete' | 'move' | 'convert' | 'manage';
export type Subject =
  | 'workorder' | 'asset' | 'plan' | 'inventory' | 'procedure' | 'solicitation' | 'report' | 'user' | '*';

export interface AbilityRule {
  action: Action | Action[];
  subject: Subject | Subject[];
  when?: (ctx?: any) => boolean; // opcional, p/ regras contextuais
}

export type AbilityMap = Record<Role, AbilityRule[]>;

export const abilities: AbilityMap = {
  admin: [
    { action: ['view','create','edit','delete','manage'], subject: '*' },
  ],
  technician: [
    { action: ['view'], subject: '*' },
    { action: ['edit','move','convert'], subject: ['workorder','inventory','procedure'] },
    // pode criar OS/solicitação, mas não deletar ativos/planos/usuários
    { action: ['create'], subject: ['workorder','solicitation'] },
    // pode converter solicitações em OS
    { action: ['convert'], subject: ['solicitation'] },
  ],
  requester: [
    { action: ['view'], subject: '*' },
    { action: ['create','edit'], subject: ['solicitation'] },
    // sem edit/delete em entidades críticas
  ],
};