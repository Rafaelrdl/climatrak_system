/**
 * Tipos relacionados a Alertas do módulo Monitor
 * 
 * Alertas são gerados automaticamente quando regras são disparadas
 */

/**
 * Severidade do alerta (valores armazenados no banco)
 */
export type AlertSeverity = 'Critical' | 'High' | 'Medium' | 'Low';

/**
 * Representa um alerta do sistema
 */
export interface Alert {
  id: number;
  rule: number | null;
  rule_name: string;
  equipment_name: string;
  message: string;
  severity: AlertSeverity;
  severity_display: string; // Severidade em português (vem do backend)
  asset_tag: string;
  parameter_key: string;
  parameter_value: number | null;
  threshold: number | null;
  triggered_at: string;
  acknowledged: boolean;
  acknowledged_at: string | null;
  acknowledged_by: number | null;
  acknowledged_by_email: string | null;
  resolved: boolean;
  resolved_at: string | null;
  resolved_by: number | null;
  resolved_by_email: string | null;
  work_order: number | null;
  work_order_number: string | null;
  notes: string | null;
  is_active: boolean;
}

/**
 * Filtros para listagem de alertas
 */
export interface AlertFilters {
  status?: 'active' | 'acknowledged' | 'resolved';
  severity?: AlertSeverity;
  rule_id?: number;
  asset_tag?: string;
  page?: number;
  page_size?: number;
}

/**
 * Estatísticas de alertas
 */
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

/**
 * Request para reconhecer um alerta
 */
export interface AcknowledgeAlertRequest {
  notes?: string;
}

/**
 * Request para resolver um alerta
 */
export interface ResolveAlertRequest {
  notes?: string;
}
