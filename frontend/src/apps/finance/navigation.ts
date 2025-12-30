/**
 * Configuração de navegação do módulo Finance
 * 
 * Define os itens de menu e rotas do módulo Finance.
 * Baseado em: docs/frontend/finance/02-ia-rotas.md
 */

import {
  LayoutDashboard,
  Wallet,
  FileText,
  CheckSquare,
  TrendingUp,
  Settings,
} from 'lucide-react';
import type { ComponentType } from 'react';

export interface NavItem {
  name: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  exact?: boolean;
}

/**
 * Itens de navegação principal do Finance
 */
export const financeNavigation: NavItem[] = [
  { name: 'Painel', href: '/finance', icon: LayoutDashboard, exact: true },
  { name: 'Orçamentos', href: '/finance/budgets', icon: Wallet },
  { name: 'Lançamentos', href: '/finance/ledger', icon: FileText },
  { name: 'Compromissos', href: '/finance/commitments', icon: CheckSquare },
  { name: 'Economia', href: '/finance/savings', icon: TrendingUp },
  { name: 'Cadastros', href: '/finance/settings', icon: Settings },
];

/**
 * Nome do módulo para exibição
 */
export const financeModuleName = 'Finance';

/**
 * Cores do tema Finance
 */
export const financeTheme = {
  primary: 'emerald',
  borderColor: 'border-emerald-200',
  bgColor: 'bg-emerald-50',
  textColor: 'text-emerald-700',
};
