import { Routes, Route, Navigate } from 'react-router-dom';
import { 
  AlertsList, 
  SensorsPage, 
  MonitorAssetsPage, 
  MonitorAssetDetailPage,
  RulesPage,
  EditableOverviewPage,
  CustomDashboardPage
} from './pages';
import { ProfilePage } from '@/pages/ProfilePage';
import { TeamPage } from '@/pages/TeamPage';
import { SettingsPage } from '@/pages/SettingsPage';

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
  );
}
