export type PlanStatus = 'Ativo' | 'Inativo';

export interface MaintenancePlan {
  id: string;                  // uuid
  name: string;                // "Preventiva Chiller Mensal"
  description?: string;
  frequency: 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'SEMI_ANNUAL' | 'ANNUAL';
  scope?: {
    location_id?: string;
    location_name?: string;
    equipment_ids?: string[];    // Múltiplos equipamentos (opcional para flexibilidade)
    equipment_names?: string[];  // Nomes dos equipamentos para exibição (opcional)
  };
  assets?: string[];            // IDs dos ativos (novo campo da API)
  asset_tags?: string[];        // Tags dos ativos para exibição
  asset_names?: string[];       // Nomes dos ativos para exibição
  isActive?: boolean;           // Alias para is_active
  checklist_id?: string;        // ID do checklist template selecionado
  checklist_template?: string;  // Alias para checklist_id
  checklist_name?: string | null;
  status: PlanStatus;
  start_date?: string;          // ISO
  next_execution_date?: string; // Próxima data de execução automática
  last_execution_date?: string; // Última data de execução
  auto_generate: boolean;       // Se deve gerar OSs automaticamente
  work_orders_generated?: number;
  created_at?: string;          // ISO (optional for new plans)
  updated_at?: string;          // ISO (optional for new plans)
}