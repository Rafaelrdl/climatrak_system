import { Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { LoadingSpinner } from '@/shared/ui/components/LoadingSpinner';

const AlertsList = lazy(async () => {
  const mod = await import('./pages/AlertsList');
  return { default: mod.AlertsList };
});
const SensorsPage = lazy(async () => {
  const mod = await import('./pages/SensorsPage');
  return { default: mod.SensorsPage };
});
const MonitorAssetsPage = lazy(async () => {
  const mod = await import('./pages/MonitorAssetsPage');
  return { default: mod.MonitorAssetsPage };
});
const MonitorAssetDetailPage = lazy(async () => {
  const mod = await import('./pages/MonitorAssetDetailPage');
  return { default: mod.MonitorAssetDetailPage };
});
const RulesPage = lazy(async () => {
  const mod = await import('./pages/RulesPage');
  return { default: mod.RulesPage };
});
const EditableOverviewPage = lazy(async () => {
  const mod = await import('./pages/EditableOverviewPage');
  return { default: mod.EditableOverviewPage };
});
const CustomDashboardPage = lazy(async () => {
  const mod = await import('./pages/CustomDashboardPage');
  return { default: mod.CustomDashboardPage };
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
 * Rotas do módulo Monitor (TrakSense)
 * Prefixo: /monitor/*
 * 
 * Estrutura implementada:
 * - /monitor                → Visão Geral (Dashboard Customizável)
 * - /monitor/dashboards     → Dashboards Customizáveis (drag & drop)
 * - /monitor/alertas        → Lista de Alertas
 * - /monitor/sensores       → Grid de Sensores/Devices
 * - /monitor/ativos         → Lista de Ativos HVAC
 * - /monitor/regras         → Configuração de Regras
 * - /monitor/profile        → Perfil do Usuário
 * - /monitor/admin/team     → Gerenciamento de Equipe
 */
export function MonitorRoutes() {
  return (
    <Suspense fallback={<LoadingSpinner centered text="Carregando..." />}>
      <Routes>
        {/* Visão Geral - Dashboard Customizável (página inicial) */}
        <Route path="/" element={<EditableOverviewPage />} />
        
        {/* Dashboard Customizável com Drag & Drop */}
        <Route path="/dashboards" element={<CustomDashboardPage />} />
        
        {/* Lista de alertas */}
        <Route path="/alertas" element={<AlertsList />} />
        
        {/* Grid de sensores/devices */}
        <Route path="/sensores" element={<SensorsPage />} />
        
        {/* Lista de ativos HVAC */}
        <Route path="/ativos" element={<MonitorAssetsPage />} />
        
        {/* Detalhes de um ativo específico */}
        <Route path="/ativos/:id" element={<MonitorAssetDetailPage />} />
        
        {/* Rota legacy - redireciona equipamentos para ativos */}
        <Route path="/equipamentos/:id" element={<MonitorAssetDetailPage />} />
        
        {/* Configuração de regras */}
        <Route path="/regras" element={<RulesPage />} />
        
        {/* Perfil do usuário (compartilhado) */}
        <Route path="/profile" element={<ProfilePage />} />
        
        {/* Gerenciamento de equipe (compartilhado) */}
        <Route path="/admin/team" element={<TeamPage />} />
        
        {/* Configurações */}
        <Route path="/settings" element={<SettingsPage />} />
        
        {/* Fallback - redireciona para dashboard */}
        <Route path="/*" element={<Navigate to="/monitor" replace />} />
      </Routes>
    </Suspense>
  );
}
