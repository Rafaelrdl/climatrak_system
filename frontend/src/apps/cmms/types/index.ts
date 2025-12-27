/**
 * CMMS Types
 * 
 * Tipos TypeScript para o módulo CMMS:
 * - Work Orders
 * - Equipment
 * - Maintenance Plans
 * - Inventory
 * - Checklists
 */

// Re-export de tipos existentes
export type {
  WorkOrder,
  WorkOrderView,
  WorkOrderStockItem,
  ChecklistItem,
  ChecklistResponse,
  UploadedPhoto,
  Equipment,
  EquipmentFilter,
  MaintenancePlan,
  StockItem,
} from '@/types';

// Tipos específicos de API
export type {
  ApiWorkOrder,
  ApiMaintenancePlan,
  PaginatedResponse,
} from '@/types/api';

// Tipos de filtros
export type { WorkOrderFilters } from '@/services/workOrdersService';
