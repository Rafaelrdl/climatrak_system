/**
 * Configuração de navegação do módulo Monitor (TrakSense)
 * 
 * Define os itens de menu e rotas do módulo Monitor.
 */

import {
  LayoutDashboard,
  LayoutGrid,
  Box,
  Cpu,
  Bell,
  AlertTriangle,
} from 'lucide-react';
import type { ComponentType } from 'react';

export interface NavItem {
  name: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  exact?: boolean;
}

/**
 * Itens de navegação principal do Monitor
 */
export const monitorNavigation: NavItem[] = [
  { name: 'Visão Geral', href: '/monitor', icon: LayoutDashboard, exact: true },
  { name: 'Dashboards', href: '/monitor/dashboards', icon: LayoutGrid },
  { name: 'Ativos', href: '/monitor/ativos', icon: Box },
  { name: 'Sensores', href: '/monitor/sensores', icon: Cpu },
  { name: 'Alertas', href: '/monitor/alertas', icon: Bell },
  { name: 'Regras', href: '/monitor/regras', icon: AlertTriangle },
];

/**
 * Nome do módulo para exibição
 */
export const monitorModuleName = 'TrakSense Monitor';

/**
 * Cores do tema Monitor
 */
export const monitorTheme = {
  primary: 'green',
  borderColor: 'border-green-200',
  bgColor: 'bg-green-50',
  textColor: 'text-green-700',
};
