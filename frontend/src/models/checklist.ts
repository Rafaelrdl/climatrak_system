/**
 * Modelo de Checklist para Manutenção Preventiva
 * 
 * Checklists são templates de tarefas que podem ser vinculados
 * a planos de manutenção preventiva.
 */

export type ChecklistItemType = 'checkbox' | 'text' | 'number' | 'select' | 'photo';

export interface ChecklistItemOption {
  value: string;
  label: string;
}

export interface ChecklistItem {
  id: string;
  order: number;
  description: string;
  type: ChecklistItemType;
  required: boolean;
  options?: ChecklistItemOption[]; // Para tipo 'select'
  unit?: string; // Para tipo 'number' (ex: "°C", "bar", "A")
  min_value?: number; // Valor mínimo para tipo 'number'
  max_value?: number; // Valor máximo para tipo 'number'
  help_text?: string; // Texto de ajuda para o técnico
}

export interface ChecklistTemplate {
  id: string;
  name: string;
  description?: string;
  category_id?: string | null;
  equipment_type?: string; // Tipo de equipamento (ex: "Split", "Chiller", "Bomba")
  items: ChecklistItem[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
  usage_count?: number; // Quantas vezes foi usado em planos
}

export interface ChecklistCategory {
  id: string;
  name: string;
  color?: string;
  description?: string;
}

// Para resposta de checklist em uma OS
export interface ChecklistItemResponse {
  item_id: string;
  value: string | number | boolean;
  notes?: string;
  photo_url?: string;
  responded_at: string;
  responded_by: string;
}

export interface ChecklistResponse {
  checklist_id: string;
  work_order_id: string;
  responses: ChecklistItemResponse[];
  completed_at?: string;
  completion_percentage: number;
}
