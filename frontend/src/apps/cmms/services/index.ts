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
export {
  listProcedureCategories,
  getProcedureCategory,
  createProcedureCategory,
  updateProcedureCategory,
  deleteProcedureCategory,
  listProcedures,
  getProcedure,
  createProcedure,
  updateProcedure,
  deleteProcedure,
  approveProcedure,
  submitProcedureForReview,
  archiveProcedure,
  listProcedureVersions,
  createProcedureVersion,
  restoreProcedureVersion,
  getProcedureStats,
  type ProcedureCategoryInput,
  type ProcedureInput,
  type ProcedureUpdateInput,
  type CreateVersionInput,
} from '@/services/proceduresService';
export * from '@/services/requestsService';
export * from '@/services/metricsService';
export * from '@/services/checklistsService';
