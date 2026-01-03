/**
 * CMMS Hooks
 * 
 * React Query hooks para gerenciamento de:
 * - Ordens de Serviço (Work Orders)
 * - Equipamentos (Equipment)
 * - Planos de Manutenção (Maintenance Plans)
 * - Inventário (Inventory)
 * - Procedimentos (Procedures)
 * - Solicitações (Requests)
 * - Métricas (Metrics)
 * - Checklists
 */

// Re-export de hooks existentes na raiz
// TODO: Migrar arquivos físicos para cá em fase futura
export * from '@/hooks/useWorkOrdersQuery';
export * from '@/hooks/useEquipmentQuery';
export * from '@/hooks/usePlansQuery';
export * from '@/hooks/useInventoryQuery';
export * from '@/hooks/useProceduresQuery';
export * from '@/hooks/useRequestsQuery';
export * from '@/hooks/useMetricsQuery';
export * from '@/hooks/useChecklistsQuery';
export * from '@/hooks/useLocationsQuery';
export * from '@/hooks/useMaintenancePlans';
export * from '@/hooks/useWorkOrderView';
export * from '@/hooks/useWorkOrderGeneration';
export * from '@/hooks/useMaintenanceMetrics';
export * from '@/hooks/useAverageMaintenanceMetrics';
