import { 
  LayoutDashboard, 
  Wrench, 
  ClipboardList, 
  MessageSquare, 
  Calendar,
  TrendingUp,
  Package,
  FileText,
  Bell,
  User,
  Settings,
  HelpCircle,
  Sparkles
} from 'lucide-react';
import type { TourConfig, TourStep } from './InteractiveTour';
import type { UserRole } from '@/models/user';

// ==================== MAIN WELCOME TOUR ====================

export const welcomeTourSteps: TourStep[] = [
  {
    id: 'welcome',
    title: '🎉 Bem-vindo ao TrakNor CMMS!',
    content: 'Este tour rápido vai te ajudar a conhecer as principais funcionalidades do sistema. Leva apenas 1 minuto!',
    placement: 'center',
    roles: ['admin', 'technician', 'requester'],
    showSkipOnFirst: true  // Show skip button prominently on first step
  },
  {
    id: 'product-switcher',
    title: 'Alternador de Módulos',
    content: 'Aqui você pode alternar entre os módulos CMMS (manutenção) e Monitor (sensores IoT). Clique para ver todas as opções.',
    target: '[data-tour="product-switcher"]',
    placement: 'bottom',
    spotlightPadding: 8,
    roles: ['admin', 'technician', 'requester']
  },
  {
    id: 'navigation',
    title: 'Menu de Navegação',
    content: 'Use esta barra para acessar todas as seções do sistema: Dashboard, Ativos, Ordens de Serviço, Planos e muito mais.',
    target: '[data-tour="navigation"]',
    placement: 'bottom',
    spotlightPadding: 12,
    roles: ['admin', 'technician', 'requester']
  },
  {
    id: 'user-menu',
    title: 'Seu Perfil',
    content: 'Acesse suas configurações pessoais, preferências e opção de logout através deste menu.',
    target: '[data-tour="user-menu"]',
    placement: 'bottom',
    spotlightPadding: 8,
    roles: ['admin', 'technician', 'requester']
  },
  {
    id: 'dashboard-kpis',
    title: 'Indicadores em Tempo Real',
    content: 'Acompanhe os principais KPIs de manutenção: ordens abertas, taxa de conclusão, MTTR e MTBF.',
    target: '[data-tour="dashboard-kpis"]',
    placement: 'bottom',
    spotlightPadding: 12,
    waitForElement: true,
    roles: ['admin', 'technician']
  },
  {
    id: 'dashboard-charts',
    title: 'Gráficos e Tendências',
    content: 'Visualize a evolução das ordens de serviço ao longo do tempo e identifique padrões.',
    target: '[data-tour="dashboard-charts"]',
    placement: 'top',
    spotlightPadding: 12,
    waitForElement: true,
    roles: ['admin', 'technician']
  },
  {
    id: 'next-maintenances',
    title: 'Próximas Manutenções',
    content: 'Fique atento às manutenções programadas. Clique em uma para ver detalhes ou iniciar o trabalho.',
    target: '[data-tour="next-maintenances"]',
    placement: 'top',
    spotlightPadding: 12,
    waitForElement: true,
    roles: ['admin', 'technician']
  },
  {
    id: 'completion',
    title: '✅ Tour Concluído!',
    content: 'Você está pronto para começar! Lembre-se: você pode reiniciar este tour a qualquer momento no menu de ajuda.',
    placement: 'center',
    roles: ['admin', 'technician', 'requester']
  }
];

export const welcomeTourConfig: TourConfig = {
  id: 'welcome-tour',
  name: 'Tour de Boas-vindas',
  description: 'Conheça as principais funcionalidades do TrakNor CMMS',
  steps: welcomeTourSteps,
  allowSkip: true,
  showProgress: true,
  showStepNumbers: true,
  persistProgress: true,
  storageKey: 'welcome',
  onComplete: () => {
    // Mark all onboarding tour steps as completed
    localStorage.setItem('onboarding:tourCompleted', 'true');
    localStorage.setItem('onboarding:firstTimeGuideCompleted', 'true');
    localStorage.setItem('onboarding:interactiveTourCompleted', 'true');
  },
  onSkip: () => {
    // Mark as skipped/completed so it doesn't show again
    localStorage.setItem('onboarding:tourCompleted', 'true');
    localStorage.setItem('onboarding:firstTimeGuideCompleted', 'true');
    localStorage.setItem('onboarding:interactiveTourSkipped', 'true');
  }
};

// ==================== ASSETS TOUR ====================

export const assetsTourSteps: TourStep[] = [
  {
    id: 'assets-intro',
    title: 'Gestão de Ativos',
    content: 'Aqui você gerencia todos os equipamentos e suas localizações de forma hierárquica.',
    placement: 'center',
    roles: ['admin', 'technician']
  },
  {
    id: 'assets-tree',
    title: 'Árvore de Locais',
    content: 'Navegue pela estrutura: Empresa → Setor → Equipamento. Clique em um item para ver seus detalhes.',
    target: '[data-tour="assets-tree"]',
    placement: 'right',
    spotlightPadding: 8,
    waitForElement: true,
    roles: ['admin', 'technician']
  },
  {
    id: 'assets-details',
    title: 'Detalhes do Ativo',
    content: 'Visualize informações completas: especificações técnicas, histórico de manutenções e documentos anexados.',
    target: '[data-tour="assets-details"]',
    placement: 'left',
    spotlightPadding: 12,
    waitForElement: true,
    roles: ['admin', 'technician']
  },
  {
    id: 'assets-actions',
    title: 'Ações Rápidas',
    content: 'Crie ordens de serviço diretamente do ativo ou acesse o histórico completo de manutenções.',
    target: '[data-tour="assets-actions"]',
    placement: 'bottom',
    spotlightPadding: 8,
    waitForElement: true,
    roles: ['admin', 'technician']
  }
];

export const assetsTourConfig: TourConfig = {
  id: 'assets-tour',
  name: 'Tour de Ativos',
  description: 'Aprenda a gerenciar equipamentos e localizações',
  steps: assetsTourSteps,
  allowSkip: true,
  showProgress: true,
  showStepNumbers: true,
  persistProgress: true,
  storageKey: 'assets'
};

// ==================== WORK ORDERS TOUR ====================

export const workOrdersTourSteps: TourStep[] = [
  {
    id: 'wo-intro',
    title: 'Ordens de Serviço',
    content: 'Gerencie todas as manutenções corretivas e preventivas em um só lugar.',
    placement: 'center',
    roles: ['admin', 'technician']
  },
  {
    id: 'wo-views',
    title: 'Múltiplas Visualizações',
    content: 'Alterne entre Lista, Kanban e Painel. Cada uma oferece uma perspectiva diferente das suas OS.',
    target: '[data-tour="wo-views"]',
    placement: 'bottom',
    spotlightPadding: 8,
    waitForElement: true,
    roles: ['admin', 'technician']
  },
  {
    id: 'wo-filters',
    title: 'Filtros Avançados',
    content: 'Filtre por status, prioridade, técnico responsável e período. Encontre rapidamente o que precisa.',
    target: '[data-tour="wo-filters"]',
    placement: 'bottom',
    spotlightPadding: 8,
    waitForElement: true,
    roles: ['admin', 'technician']
  },
  {
    id: 'wo-create',
    title: 'Nova Ordem de Serviço',
    content: 'Clique aqui para criar uma nova OS. Preencha os detalhes, adicione checklist e atribua a um técnico.',
    target: '[data-tour="wo-create"]',
    placement: 'bottom',
    spotlightPadding: 8,
    waitForElement: true,
    roles: ['admin', 'technician']
  }
];

export const workOrdersTourConfig: TourConfig = {
  id: 'work-orders-tour',
  name: 'Tour de Ordens de Serviço',
  description: 'Aprenda a gerenciar manutenções',
  steps: workOrdersTourSteps,
  allowSkip: true,
  showProgress: true,
  showStepNumbers: true,
  persistProgress: true,
  storageKey: 'work-orders'
};

// ==================== INVENTORY TOUR ====================

export const inventoryTourSteps: TourStep[] = [
  {
    id: 'inv-intro',
    title: 'Controle de Estoque',
    content: 'Gerencie materiais, peças de reposição e acompanhe movimentações de entrada e saída.',
    placement: 'center',
    roles: ['admin', 'technician']
  },
  {
    id: 'inv-views',
    title: 'Visualizações',
    content: 'Alterne entre Tabela (dados completos), Cards (visual) e Análise (gráficos de consumo).',
    target: '[data-tour="inv-views"]',
    placement: 'bottom',
    spotlightPadding: 8,
    waitForElement: true,
    roles: ['admin', 'technician']
  },
  {
    id: 'inv-alerts',
    title: 'Alertas de Reposição',
    content: 'Configure níveis mínimos e máximos. O sistema avisa automaticamente quando precisa repor.',
    target: '[data-tour="inv-alerts"]',
    placement: 'bottom',
    spotlightPadding: 8,
    waitForElement: true,
    roles: ['admin', 'technician']
  },
  {
    id: 'inv-movements',
    title: 'Movimentações',
    content: 'Registre entradas e saídas de materiais. O histórico completo fica disponível para auditoria.',
    target: '[data-tour="inv-movements"]',
    placement: 'left',
    spotlightPadding: 8,
    waitForElement: true,
    roles: ['admin', 'technician']
  }
];

export const inventoryTourConfig: TourConfig = {
  id: 'inventory-tour',
  name: 'Tour de Estoque',
  description: 'Aprenda a controlar materiais e movimentações',
  steps: inventoryTourSteps,
  allowSkip: true,
  showProgress: true,
  showStepNumbers: true,
  persistProgress: true,
  storageKey: 'inventory'
};

// ==================== PLANS TOUR ====================

export const plansTourSteps: TourStep[] = [
  {
    id: 'plans-intro',
    title: 'Planos de Manutenção',
    content: 'Configure manutenções preventivas que geram OS automaticamente com base em frequência.',
    placement: 'center',
    roles: ['admin', 'technician']
  },
  {
    id: 'plans-list',
    title: 'Lista de Planos',
    content: 'Veja todos os planos ativos, pausados e finalizados. Clique em um para ver detalhes.',
    target: '[data-tour="plans-list"]',
    placement: 'bottom',
    spotlightPadding: 12,
    waitForElement: true,
    roles: ['admin', 'technician']
  },
  {
    id: 'plans-frequency',
    title: 'Frequência',
    content: 'Defina se a manutenção ocorre diariamente, semanalmente, mensalmente ou em intervalo customizado.',
    target: '[data-tour="plans-frequency"]',
    placement: 'right',
    spotlightPadding: 8,
    waitForElement: true,
    roles: ['admin', 'technician']
  },
  {
    id: 'plans-checklist',
    title: 'Checklist do Plano',
    content: 'Crie templates de checklist que serão automaticamente incluídos nas OS geradas.',
    target: '[data-tour="plans-checklist"]',
    placement: 'left',
    spotlightPadding: 8,
    waitForElement: true,
    roles: ['admin', 'technician']
  }
];

export const plansTourConfig: TourConfig = {
  id: 'plans-tour',
  name: 'Tour de Planos',
  description: 'Configure manutenções preventivas automatizadas',
  steps: plansTourSteps,
  allowSkip: true,
  showProgress: true,
  showStepNumbers: true,
  persistProgress: true,
  storageKey: 'plans'
};

// ==================== MONITOR TOUR (IoT) ====================

export const monitorTourSteps: TourStep[] = [
  {
    id: 'monitor-intro',
    title: 'Módulo Monitor (TrakSense)',
    content: 'Acompanhe sensores IoT em tempo real, configure alertas e visualize dados de telemetria.',
    placement: 'center',
    roles: ['admin', 'technician']
  },
  {
    id: 'monitor-dashboard',
    title: 'Dashboard de Sensores',
    content: 'Visualize todos os seus sensores e seus status em tempo real. Cores indicam normalidade ou alerta.',
    target: '[data-tour="monitor-dashboard"]',
    placement: 'bottom',
    spotlightPadding: 12,
    waitForElement: true,
    roles: ['admin', 'technician']
  },
  {
    id: 'monitor-alerts',
    title: 'Alertas Inteligentes',
    content: 'Configure regras de alerta baseadas em valores, tendências ou combinações de sensores.',
    target: '[data-tour="monitor-alerts"]',
    placement: 'bottom',
    spotlightPadding: 8,
    waitForElement: true,
    roles: ['admin', 'technician']
  },
  {
    id: 'monitor-history',
    title: 'Histórico de Telemetria',
    content: 'Acesse dados históricos com gráficos interativos. Analise tendências e identifique anomalias.',
    target: '[data-tour="monitor-history"]',
    placement: 'top',
    spotlightPadding: 12,
    waitForElement: true,
    roles: ['admin', 'technician']
  }
];

export const monitorTourConfig: TourConfig = {
  id: 'monitor-tour',
  name: 'Tour do Monitor',
  description: 'Aprenda a usar o módulo de sensores IoT',
  steps: monitorTourSteps,
  allowSkip: true,
  showProgress: true,
  showStepNumbers: true,
  persistProgress: true,
  storageKey: 'monitor'
};

// ==================== ALL TOURS REGISTRY ====================

export const allTours = {
  welcome: welcomeTourConfig,
  assets: assetsTourConfig,
  workOrders: workOrdersTourConfig,
  inventory: inventoryTourConfig,
  plans: plansTourConfig,
  monitor: monitorTourConfig
};

// ==================== UTILITY FUNCTIONS ====================

export function getTourForPage(pathname: string): TourConfig | null {
  if (pathname === '/' || pathname === '/cmms' || pathname === '/cmms/') {
    return welcomeTourConfig;
  }
  if (pathname.includes('/ativos') || pathname.includes('/assets')) {
    return assetsTourConfig;
  }
  if (pathname.includes('/work-orders') || pathname.includes('/os')) {
    return workOrdersTourConfig;
  }
  if (pathname.includes('/inventory') || pathname.includes('/estoque')) {
    return inventoryTourConfig;
  }
  if (pathname.includes('/plans') || pathname.includes('/planos')) {
    return plansTourConfig;
  }
  if (pathname.includes('/monitor')) {
    return monitorTourConfig;
  }
  return null;
}

export function hasCompletedTour(tourId: string): boolean {
  // Consider completed OR skipped as "done" to not show tour again
  return localStorage.getItem(`tour:${tourId}:completed`) === 'true' ||
         localStorage.getItem(`tour:${tourId}:skipped`) === 'true';
}

export function resetAllTours(): void {
  Object.values(allTours).forEach(tour => {
    if (tour.storageKey) {
      localStorage.removeItem(`tour:${tour.storageKey}:completed`);
      localStorage.removeItem(`tour:${tour.storageKey}:skipped`);
      localStorage.removeItem(`tour:${tour.storageKey}:step`);
    }
  });
  localStorage.removeItem('onboarding:interactiveTourCompleted');
  localStorage.removeItem('onboarding:interactiveTourSkipped');
}

export function getTourProgress(): { completed: number; total: number; percentage: number } {
  const tours = Object.values(allTours);
  const completed = tours.filter(tour => 
    tour.storageKey && hasCompletedTour(tour.storageKey)
  ).length;
  const total = tours.length;
  const percentage = Math.round((completed / total) * 100);
  
  return { completed, total, percentage };
}
