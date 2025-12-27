/**
 * Rule Types para o módulo Monitor
 * 
 * Tipos para regras de monitoramento e alertas
 */

export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type AlertStatus = 'active' | 'acknowledged' | 'resolved';
export type NotificationAction = 'EMAIL' | 'IN_APP' | 'SMS' | 'WHATSAPP';
export type Operator = '>' | '<' | '>=' | '<=' | '==' | '!=';

export interface RuleParameter {
  id?: number;
  parameter_key: string;
  variable_key: string;
  operator: Operator;
  threshold: number;
  duration: number;
  severity: Severity;
  message_template: string;
  unit?: string;
}

export interface Rule {
  id: number;
  name: string;
  description: string;
  equipment: number;
  equipment_name?: string;
  equipment_tag?: string;
  parameters: RuleParameter[];
  
  // Campos legados (mantidos para compatibilidade)
  parameter_key?: string;
  variable_key?: string;
  operator?: Operator;
  threshold?: number;
  unit?: string;
  duration?: number;
  severity?: Severity;
  
  actions: NotificationAction[];
  enabled: boolean;
  created_by?: number;
  created_by_email?: string;
  created_at: string;
  updated_at: string;
  condition_display?: string;
}

export interface Alert {
  id: number;
  rule: number;
  rule_name: string;
  asset_tag: string;
  equipment_name: string;
  severity: Severity;
  message: string;
  raw_data: Record<string, unknown>;
  triggered_at: string;
  acknowledged: boolean;
  acknowledged_at?: string;
  acknowledged_by?: number;
  acknowledged_by_email?: string;
  acknowledged_notes?: string;
  resolved: boolean;
  resolved_at?: string;
  resolved_by?: number;
  resolved_by_email?: string;
  resolved_notes?: string;
  is_active: boolean;
}

export interface RuleStatistics {
  total: number;
  enabled: number;
  disabled: number;
  by_severity: {
    CRITICAL: number;
    HIGH: number;
    MEDIUM: number;
    LOW: number;
  };
}

export interface AlertStatistics {
  total: number;
  active: number;
  acknowledged: number;
  resolved: number;
  by_severity: {
    CRITICAL: number;
    HIGH: number;
    MEDIUM: number;
    LOW: number;
  };
}

export interface CreateRuleRequest {
  name: string;
  description: string;
  equipment: number;
  actions: NotificationAction[];
  enabled?: boolean;
  parameters?: RuleParameter[];
  
  // Formato legado
  parameter_key?: string;
  variable_key?: string;
  operator?: Operator;
  threshold?: number;
  unit?: string;
  duration?: number;
  severity?: Severity;
}

export interface UpdateRuleRequest extends Partial<CreateRuleRequest> {}

export interface RuleFilters {
  equipment?: number;
  enabled?: boolean;
  severity?: Severity;
}

export interface AlertFilters {
  status?: AlertStatus;
  severity?: Severity;
  equipment?: number;
  start_date?: string;
  end_date?: string;
}
