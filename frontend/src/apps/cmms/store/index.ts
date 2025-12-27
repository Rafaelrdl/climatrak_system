/**
 * CMMS Store
 * 
 * Zustand stores para estado local do módulo CMMS:
 * - Dashboard store (widgets, layout)
 * - Work Order store (view preferences, filters)
 * - SLA store (configurações de SLA)
 * - Work Order Settings store (preferências de OS)
 */

// Re-export de stores existentes na raiz
// TODO: Migrar arquivos físicos para cá em fase futura
export * from '@/store/useDashboardStore';
export * from '@/store/useWorkOrderStore';
export * from '@/store/useSLAStore';
export * from '@/store/useWorkOrderSettingsStore';
