/**
 * CMMS Components
 * 
 * Componentes específicos do módulo CMMS (TrakNor):
 * - Work Order (Ordens de Serviço)
 * - Equipment (Equipamentos)
 * - Plans (Planos de Manutenção)
 * - Inventory (Inventário)
 * - Procedures (Procedimentos)
 * - Checklists
 * - SLA
 */

// Work Order components
export { WorkOrderList } from '@/components/WorkOrderList';
export { WorkOrderKanban } from '@/components/WorkOrderKanban';
export { WorkOrderModal } from '@/components/WorkOrderModal';
export { WorkOrderEditModal } from '@/components/WorkOrderEditModal';
export { WorkOrderViewModal } from '@/components/WorkOrderViewModal';
export { WorkOrderPanel } from '@/components/WorkOrderPanel';
export { WorkOrderDetails } from '@/components/WorkOrderDetails';
export { WorkOrderDetailView } from '@/components/WorkOrderDetailView';

// Equipment components
export { EquipmentEditModal } from '@/components/EquipmentEditModal';
export { EquipmentSearch } from '@/components/EquipmentSearch';
export { EquipmentStatusTracking } from '@/components/EquipmentStatusTracking';

// Plans components
export { PlanFormModal } from '@/components/PlanFormModal';
export { PlansTestingSuite } from '@/components/PlansTestingSuite';
export { PlanTestScenarios } from '@/components/PlanTestScenarios';

// Procedure components
export { NewProcedureModal } from '@/components/NewProcedureModal';
export { ProcedureViewModal } from '@/components/ProcedureViewModal';

// Location components
export { LocationTree } from '@/components/LocationTree';
export { LocationDetails } from '@/components/LocationDetails';
export { LocationFormModal } from '@/components/LocationFormModal';

// SLA components
export { SLABadge } from '@/components/SLABadge';
export { SLAConfigModal } from '@/components/SLAConfigModal';

// Request/Solicitation components
export { CreateRequestModal } from '@/components/CreateRequestModal';
export { SolicitationFilters } from '@/components/SolicitationFilters';
export { SolicitationModal } from '@/components/SolicitationModal';
export { SolicitationsDrawer } from '@/components/SolicitationsDrawer';

// Dashboard components
export { KPICard } from '@/components/KPICard';

// Layout components
export { ViewToggle } from '@/components/ViewToggle';
export { PanelLayout } from '@/components/PanelLayout';

// Re-export checklist components
export * from '@/components/checklist';

// Re-export inventory components
export { InventoryTable } from '@/components/inventory/InventoryTable';
export { InventoryCards } from '@/components/inventory/InventoryCards';
export { InventoryTabs } from '@/components/inventory/InventoryTabs';
export { InventoryHistory } from '@/components/inventory/InventoryHistory';
export { InventoryAnalysis } from '@/components/inventory/InventoryAnalysis';
export { NewItemModal } from '@/components/inventory/NewItemModal';
export { EditItemModal } from '@/components/inventory/EditItemModal';
export { MoveItemModal } from '@/components/inventory/MoveItemModal';
export { ViewItemModal } from '@/components/inventory/ViewItemModal';

// Re-export procedure components
export { ProcedureTable } from '@/components/procedure/ProcedureTable';
export { ProcedureModal } from '@/components/procedure/ProcedureModal';
export { ProcedureViewer } from '@/components/procedure/ProcedureViewer';
export { ProcedureFilters } from '@/components/procedure/ProcedureFilters';
export { VersionHistory } from '@/components/procedure/VersionHistory';
export { VersionComparison } from '@/components/procedure/VersionComparison';
export { AnnotationOverlay } from '@/components/procedure/AnnotationOverlay';
export { AnnotationPanel } from '@/components/procedure/AnnotationPanel';
export { AnnotationToolbar } from '@/components/procedure/AnnotationToolbar';
export { PDFViewerFallback } from '@/components/procedure/PDFViewerFallback';
