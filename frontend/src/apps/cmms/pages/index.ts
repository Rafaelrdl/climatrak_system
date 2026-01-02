/**
 * CMMS Pages
 * 
 * Páginas do módulo CMMS (TrakNor):
 * - Dashboard
 * - Work Orders (Ordens de Serviço)
 * - Equipment (Equipamentos)
 * - Plans (Planos de Manutenção)
 * - Inventory (Inventário)
 * - Procedures (Procedimentos)
 * - Metrics (Métricas)
 * - Requests (Solicitações)
 * - Reports (Relatórios)
 * - Asset Detail
 */

// Re-export de pages existentes na raiz
// TODO: Migrar arquivos físicos para cá em fase futura
export { Dashboard as CMMSDashboard } from '@/pages/Dashboard';
export { WorkOrdersPage } from '@/pages/WorkOrdersPage';
export { EquipmentPage } from '@/pages/EquipmentPage';
export { PlansPage } from '@/pages/PlansPage';
export { PlansTestingPage } from '@/pages/PlansTestingPage';
export { InventoryPage } from '@/pages/InventoryPage';
export { ProceduresPage } from '@/pages/ProceduresPage';
export { MetricsPage } from '@/pages/MetricsPage';
export { RequestsPage } from '@/pages/RequestsPage';
export { ReportsPage } from '@/pages/ReportsPage';
export { AssetDetailPage } from '@/pages/AssetDetailPage';
export { EquipmentStatusPage } from '@/pages/EquipmentStatusPage';
export { WorkOrderCalendarPage } from '@/pages/WorkOrderCalendarPage';
export { WorkOrderSchedulingPage } from '@/pages/WorkOrderSchedulingPage';
export { HelpCenterPage } from '@/pages/HelpCenterPage';
export { HelpContentViewPage } from '@/pages/HelpContentViewPage';
