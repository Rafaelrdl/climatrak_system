/**
 * Configuração de navegação do módulo CMMS (TrakNor)
 * 
 * Define os itens de menu e rotas do módulo CMMS.
 */

import {
  Home,
  Package,
  ClipboardList,
  MessageSquare,
  Calendar,
  BarChart3,
  Warehouse,
  BookOpen,
  FileText,
} from 'lucide-react';
import type { ComponentType } from 'react';

export interface NavItem {
  name: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  exact?: boolean;
}

/**
 * Itens de navegação principal do CMMS
 */
export const cmmsNavigation: NavItem[] = [
  { name: 'Visão Geral', href: '/cmms', icon: Home, exact: true },
  { name: 'Ativos', href: '/cmms/ativos', icon: Package },
  { name: 'Ordens de Serviço', href: '/cmms/work-orders', icon: ClipboardList },
  { name: 'Solicitações', href: '/cmms/requests', icon: MessageSquare },
  { name: 'Planos', href: '/cmms/plans', icon: Calendar },
  { name: 'Métricas', href: '/cmms/metrics', icon: BarChart3 },
  { name: 'Estoque', href: '/cmms/inventory', icon: Warehouse },
  { name: 'Procedimentos', href: '/cmms/procedures', icon: BookOpen },
  { name: 'Relatórios', href: '/cmms/reports', icon: FileText },
];

/**
 * Nome do módulo para exibição
 */
export const cmmsModuleName = 'TrakNor CMMS';

/**
 * Cores do tema CMMS
 */
export const cmmsTheme = {
  primary: 'blue',
  borderColor: 'border-blue-200',
  bgColor: 'bg-blue-50',
  textColor: 'text-blue-700',
};
