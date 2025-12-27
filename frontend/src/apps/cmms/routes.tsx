import { Routes, Route } from 'react-router-dom';

// Páginas do módulo CMMS
import {
  CMMSDashboard,
  EquipmentPage,
  AssetDetailPage,
  WorkOrdersPage,
  WorkOrderCalendarPage,
  WorkOrderSchedulingPage,
  RequestsPage,
  PlansPage,
  MetricsPage,
  InventoryPage,
  ProceduresPage,
  ReportsPage,
  HelpCenterPage,
  HelpContentViewPage,
  PlansTestingPage,
} from './pages';

// Páginas compartilhadas
import { ProfilePage, TeamPage, SettingsPage } from '@/shared/pages';

/**
 * Rotas do módulo CMMS (TrakNor)
 * Prefixo: /cmms/*
 * 
 * As rotas aqui são relativas ao prefixo /cmms/
 * Ex: path="ativos" renderiza em /cmms/ativos
 */
export function CmmsRoutes() {
  return (
    <Routes>
      <Route path="/" element={<CMMSDashboard />} />
      <Route path="ativos" element={<EquipmentPage />} />
      <Route path="ativos/:id" element={<AssetDetailPage />} />
      <Route path="work-orders" element={<WorkOrdersPage />} />
      <Route path="work-orders/calendar" element={<WorkOrderCalendarPage />} />
      <Route path="work-orders/scheduling" element={<WorkOrderSchedulingPage />} />
      <Route path="work-orders/:id" element={<WorkOrdersPage />} />
      <Route path="requests" element={<RequestsPage />} />
      <Route path="plans" element={<PlansPage />} />
      <Route path="metrics" element={<MetricsPage />} />
      <Route path="inventory" element={<InventoryPage />} />
      <Route path="procedures" element={<ProceduresPage />} />
      <Route path="reports" element={<ReportsPage />} />
      <Route path="profile" element={<ProfilePage />} />
      <Route path="admin/team" element={<TeamPage />} />
      <Route path="settings" element={<SettingsPage />} />
      <Route path="help" element={<HelpCenterPage />} />
      <Route path="help/:contentId" element={<HelpContentViewPage />} />
      <Route path="plans-testing" element={<PlansTestingPage />} />
    </Routes>
  );
}
