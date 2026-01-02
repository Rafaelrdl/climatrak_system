/**
 * Types do módulo Monitor (TrakSense)
 * 
 * Exporta todos os tipos usados pelo módulo de monitoramento IoT
 */

export * from './device';
export * from './asset';
export type {
  Severity,
  AlertStatus,
  NotificationAction,
  Operator,
  RuleParameter,
  Rule,
  RuleStatistics,
  CreateRuleRequest,
  UpdateRuleRequest,
  RuleFilters,
  Alert as RuleAlert,
  AlertFilters as RuleAlertFilters,
  AlertStatistics as RuleAlertStatistics,
} from './rule';
export type {
  AlertSeverity,
  AcknowledgeAlertRequest,
  ResolveAlertRequest,
} from './alert';
export { type Alert, type AlertFilters, type AlertStatistics } from './alert';
export * from './dashboard';
export * from './site';
