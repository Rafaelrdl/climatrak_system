/**
 * CMMS Services
 * 
 * Serviços para gerenciamento de:
 * - Ordens de Serviço (Work Orders)
 * - Equipamentos (Equipment)
 * - Planos de Manutenção (Maintenance Plans)
 * - Inventário (Inventory)
 * - Procedimentos (Procedures)
 * - Solicitações (Requests)
 * - Métricas (Metrics)
 * - Checklists
 */

// Re-export de services existentes na raiz
// TODO: Migrar arquivos físicos para cá em fase futura
export * from '@/services/workOrdersService';
export * from '@/services/equipmentService';
export * from '@/services/plansService';
export * from '@/services/inventoryService';
export * from '@/services/proceduresService';
export * from '@/services/requestsService';
export * from '@/services/metricsService';
export * from '@/services/checklistsService';
