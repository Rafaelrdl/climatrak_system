export type WorkOrderType = 'Preventiva' | 'Corretiva';
export type WorkOrderStatus = 'Aberta' | 'Em Execução' | 'Concluída' | 'Cancelada';
export type WorkOrderPriority = 'Baixa' | 'Média' | 'Alta' | 'Crítica';

export interface WorkOrderTask {
  id: string;
  name: string;
  completed: boolean;
  notes?: string;
  checklist?: Array<{
    id: string;
    description: string;
    completed: boolean;
  }>;
}

export interface WorkOrder {
  id: string;
  number: string;                    // ex: "OS-2024-001"
  type: WorkOrderType;
  status: WorkOrderStatus;
  priority: WorkOrderPriority;
  
  // Relacionamentos
  plan_id?: string;                  // Link para o plano que gerou esta OS
  equipment_ids: string[];           // Múltiplos equipamentos
  equipment_names: string[];         // Nomes dos equipamentos para exibição
  location_id?: string;
  location_name?: string;
  
  // Datas
  scheduled_date: string;            // Data programada (ISO)
  due_date?: string;                 // Data limite (ISO)
  started_at?: string;               // Data de início (ISO)
  completed_at?: string;             // Data de conclusão (ISO)
  created_at: string;                // Data de criação (ISO)
  updated_at: string;                // Data de atualização (ISO)
  
  // Conteúdo
  title: string;
  description?: string;
  tasks: WorkOrderTask[];
  
  // Recursos humanos
  assigned_to?: string;              // ID do técnico responsável
  assigned_to_name?: string;         // Nome do técnico
  created_by: string;                // ID do criador
  created_by_name?: string;          // Nome do criador
  
  // Observações
  notes?: string;
  completion_notes?: string;
}

export interface WorkOrderCreationData {
  plan_id: string;
  equipment_ids: string[];
  scheduled_date: string;
  title: string;
  description?: string;
  tasks: Array<{
    name: string;
    checklist?: string[];
  }>;
  priority?: WorkOrderPriority;
  assigned_to?: string;
}