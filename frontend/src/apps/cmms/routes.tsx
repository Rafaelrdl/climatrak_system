import { Routes, Route } from 'react-router-dom';
import { Dashboard } from '@/pages/Dashboard';
import { EquipmentPage } from '@/pages/EquipmentPage';
import { AssetDetailPage } from '@/pages/AssetDetailPage';
import { WorkOrdersPage } from '@/pages/WorkOrdersPage';
import { WorkOrderCalendarPage } from '@/pages/WorkOrderCalendarPage';
import { WorkOrderSchedulingPage } from '@/pages/WorkOrderSchedulingPage';
import { RequestsPage } from '@/pages/RequestsPage';
import { PlansPage } from '@/pages/PlansPage';
import { MetricsPage } from '@/pages/MetricsPage';
import { InventoryPage } from '@/pages/InventoryPage';
import { ProceduresPage } from '@/pages/ProceduresPage';
import { ReportsPage } from '@/pages/ReportsPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { TeamPage } from '@/pages/TeamPage';
import { HelpCenterPage } from '@/pages/HelpCenterPage';
import { HelpContentViewPage } from '@/pages/HelpContentViewPage';
import { PlansTestingPage } from '@/pages/PlansTestingPage';
import { SettingsPage } from '@/pages/SettingsPage';

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
      <Route path="/" element={<Dashboard />} />
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
