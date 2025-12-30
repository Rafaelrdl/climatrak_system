import { Routes, Route } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { LoadingSpinner } from '@/shared/ui/components/LoadingSpinner';

const CMMSDashboard = lazy(async () => {
  const mod = await import('@/pages/Dashboard');
  return { default: mod.Dashboard };
});
const EquipmentPage = lazy(async () => {
  const mod = await import('@/pages/EquipmentPage');
  return { default: mod.EquipmentPage };
});
const AssetDetailPage = lazy(async () => {
  const mod = await import('@/pages/AssetDetailPage');
  return { default: mod.AssetDetailPage };
});
const WorkOrdersPage = lazy(async () => {
  const mod = await import('@/pages/WorkOrdersPage');
  return { default: mod.WorkOrdersPage };
});
const WorkOrderCalendarPage = lazy(async () => {
  const mod = await import('@/pages/WorkOrderCalendarPage');
  return { default: mod.WorkOrderCalendarPage };
});
const WorkOrderSchedulingPage = lazy(async () => {
  const mod = await import('@/pages/WorkOrderSchedulingPage');
  return { default: mod.WorkOrderSchedulingPage };
});
const RequestsPage = lazy(async () => {
  const mod = await import('@/pages/RequestsPage');
  return { default: mod.RequestsPage };
});
const PlansPage = lazy(async () => {
  const mod = await import('@/pages/PlansPage');
  return { default: mod.PlansPage };
});
const MetricsPage = lazy(async () => {
  const mod = await import('@/pages/MetricsPage');
  return { default: mod.MetricsPage };
});
const InventoryPage = lazy(async () => {
  const mod = await import('@/pages/InventoryPage');
  return { default: mod.InventoryPage };
});
const ProceduresPage = lazy(async () => {
  const mod = await import('@/pages/ProceduresPage');
  return { default: mod.ProceduresPage };
});
const ReportsPage = lazy(async () => {
  const mod = await import('@/pages/ReportsPage');
  return { default: mod.ReportsPage };
});
const HelpCenterPage = lazy(async () => {
  const mod = await import('@/pages/HelpCenterPage');
  return { default: mod.HelpCenterPage };
});
const HelpContentViewPage = lazy(async () => {
  const mod = await import('@/pages/HelpContentViewPage');
  return { default: mod.HelpContentViewPage };
});
const PlansTestingPage = lazy(async () => {
  const mod = await import('@/pages/PlansTestingPage');
  return { default: mod.PlansTestingPage };
});
const ProfilePage = lazy(async () => {
  const mod = await import('@/pages/ProfilePage');
  return { default: mod.ProfilePage };
});
const TeamPage = lazy(async () => {
  const mod = await import('@/pages/TeamPage');
  return { default: mod.TeamPage };
});
const SettingsPage = lazy(async () => {
  const mod = await import('@/pages/SettingsPage');
  return { default: mod.SettingsPage };
});

/**
 * Rotas do módulo CMMS (TrakNor)
 * Prefixo: /cmms/*
 * 
 * As rotas aqui são relativas ao prefixo /cmms/
 * Ex: path="ativos" renderiza em /cmms/ativos
 */
export function CmmsRoutes() {
  return (
    <Suspense fallback={<LoadingSpinner centered text="Carregando..." />}>
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
    </Suspense>
  );
}
