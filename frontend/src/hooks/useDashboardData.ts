/**
 * useDashboardData - Hook para dados do Dashboard por papel
 * 
 * Centraliza as queries necessárias para cada papel de usuário,
 * transformando os dados dos endpoints existentes.
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAbility } from '@/hooks/useAbility';
import { useFinanceSummary } from '@/hooks/finance';
import { usePlanStats } from '@/hooks/usePlansQuery';
import { useInventoryStats, useLowStockItems, useCriticalItems } from '@/hooks/useInventoryQuery';
import { useWorkOrders, useWorkOrderStats } from '@/hooks/useWorkOrdersQuery';
import { useRequests, useRequestStatusCounts } from '@/hooks/useRequestsQuery';
import { useEquipments } from '@/hooks/useEquipmentQuery';
import { isUserAuthenticated } from '@/hooks/useAuth';
import { usersStore } from '@/data/usersStore';
import type {
  BudgetComplianceData,
  PlanComplianceData,
  InventoryAlertData,
  TechnicianStatsData,
  RequesterStatsData,
  ViewerStatsData,
} from '@/components/dashboard/RoleSpecificWidgets';

// ==================== Helper Functions ====================

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
}

function getStartOfWeek(): Date {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(now.setDate(diff));
}

function getStartOfMonth(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function useCurrentUserInfo() {
  const currentUser = usersStore.getCurrentUser();
  return currentUser;
}

// ==================== Admin/Owner Data Hook ====================

export function useAdminDashboardData() {
  const { role } = useAbility();
  const isAdmin = role === 'admin' || role === 'owner';
  
  const currentMonth = useMemo(() => getCurrentMonth(), []);
  
  const {
    data: financeSummary,
    isLoading: isLoadingFinance,
  } = useFinanceSummary(currentMonth, undefined);
  
  const budgetData = useMemo<BudgetComplianceData | undefined>(() => {
    if (!financeSummary) return undefined;
    
    // Calcular variance percent se não vier do backend
    const variancePercent = financeSummary.planned > 0 
      ? ((financeSummary.variance || 0) / financeSummary.planned) * 100 
      : 0;
    
    return {
      planned: financeSummary.planned || 0,
      actual: financeSummary.actual || 0,
      committed: financeSummary.committed || 0,
      savings: financeSummary.savings || 0,
      variance: financeSummary.variance || 0,
      variancePercent,
    };
  }, [financeSummary]);
  
  return {
    budgetData,
    isLoading: isLoadingFinance,
    enabled: isAdmin,
  };
}

// ==================== Operator Data Hook ====================

export function useOperatorDashboardData() {
  const { role } = useAbility();
  const isOperator = role === 'operator' || role === 'admin' || role === 'owner';
  
  const { data: planStats, isLoading: isLoadingPlans } = usePlanStats();
  const { data: inventoryStats, isLoading: isLoadingInventoryStats } = useInventoryStats();
  const { data: lowStockItems, isLoading: isLoadingLowStock } = useLowStockItems();
  const { data: criticalItems, isLoading: isLoadingCritical } = useCriticalItems();
  
  // Calcular dados de compliance de planos
  const planData = useMemo<PlanComplianceData | undefined>(() => {
    if (!planStats) return undefined;
    
    // Calcular execuções do mês baseado nas próximas execuções
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    const nextExecutions = planStats.next_executions || [];
    const executionsThisMonth = nextExecutions.filter(exec => {
      const execDate = new Date(exec.next_date);
      return execDate >= startOfMonth && execDate <= endOfMonth;
    });
    
    // Assumir que execuções passadas deste mês foram concluídas (simplificação)
    const today = new Date();
    const executedThisMonth = executionsThisMonth.filter(exec => 
      new Date(exec.next_date) < today
    ).length;
    
    const pendingThisMonth = executionsThisMonth.filter(exec => 
      new Date(exec.next_date) >= today
    ).length;
    
    // Planos em atraso: execuções que deveriam ter sido feitas mas não foram
    // (isso seria melhor calculado no backend)
    const overdueCount = executionsThisMonth.filter(exec => {
      const execDate = new Date(exec.next_date);
      return execDate < today;
    }).length - executedThisMonth;
    
    return {
      totalPlans: planStats.total || 0,
      activePlans: planStats.active || 0,
      complianceRate: executedThisMonth + pendingThisMonth > 0 
        ? (executedThisMonth / (executedThisMonth + pendingThisMonth)) * 100 
        : 100,
      executedThisMonth: Math.max(0, executedThisMonth),
      pendingThisMonth,
      overdueCount: Math.max(0, overdueCount),
    };
  }, [planStats]);
  
  // Calcular dados de inventário
  const inventoryData = useMemo<InventoryAlertData | undefined>(() => {
    if (!inventoryStats) return undefined;
    
    return {
      lowStockCount: inventoryStats.low_stock_count || lowStockItems?.length || 0,
      outOfStockCount: inventoryStats.out_of_stock_count || 0,
      criticalItemsCount: inventoryStats.critical_items_count || criticalItems?.length || 0,
      totalItems: inventoryStats.total_items || 0,
      totalValue: inventoryStats.total_value || 0,
    };
  }, [inventoryStats, lowStockItems, criticalItems]);
  
  return {
    planData,
    inventoryData,
    isLoadingPlans,
    isLoadingInventory: isLoadingInventoryStats || isLoadingLowStock || isLoadingCritical,
    enabled: isOperator,
  };
}

// ==================== Technician Data Hook ====================

export function useTechnicianDashboardData() {
  const { role } = useAbility();
  const currentUser = useCurrentUserInfo();
  const isTechnician = role === 'technician';
  
  // Buscar todas as OS
  const { data: workOrders = [], isLoading: isLoadingWO } = useWorkOrders();
  const { data: woStats } = useWorkOrderStats();
  
  // Filtrar por técnico atual
  const statsData = useMemo<TechnicianStatsData | undefined>(() => {
    if (!workOrders) return undefined;
    
    const userId = currentUser?.id;
    const userName = currentUser?.name;
    
    // Filtrar OS atribuídas ao técnico (por nome ou por ID no assignedTo)
    const myWorkOrders = workOrders.filter(wo => 
      wo.assignedTo === userName || 
      wo.assignedTo === userId ||
      wo.assignedToName === userName
    );
    
    const now = new Date();
    const startOfWeek = getStartOfWeek();
    const startOfMonth = getStartOfMonth();
    
    // Contar por status
    const assigned = myWorkOrders.filter(wo => 
      wo.status === 'OPEN' || wo.status === 'IN_PROGRESS'
    ).length;
    
    const inProgress = myWorkOrders.filter(wo => 
      wo.status === 'IN_PROGRESS'
    ).length;
    
    // Concluídas esta semana
    const completedThisWeek = myWorkOrders.filter(wo => {
      if (wo.status !== 'COMPLETED' || !wo.completedAt) return false;
      const completedDate = new Date(wo.completedAt);
      return completedDate >= startOfWeek;
    }).length;
    
    // Concluídas este mês
    const completedThisMonth = myWorkOrders.filter(wo => {
      if (wo.status !== 'COMPLETED' || !wo.completedAt) return false;
      const completedDate = new Date(wo.completedAt);
      return completedDate >= startOfMonth;
    }).length;
    
    // Em atraso
    const overdue = myWorkOrders.filter(wo => {
      if (wo.status === 'COMPLETED') return false;
      const scheduledDate = new Date(wo.scheduledDate);
      return scheduledDate < now;
    }).length;
    
    // Tempo médio de conclusão (simplificado)
    const completedWithDates = myWorkOrders.filter(wo => 
      wo.status === 'COMPLETED' && wo.createdAt && wo.completedAt
    );
    
    let avgCompletionTime = 0;
    if (completedWithDates.length > 0) {
      const totalHours = completedWithDates.reduce((sum, wo) => {
        const created = new Date(wo.createdAt!);
        const completed = new Date(wo.completedAt!);
        const hours = (completed.getTime() - created.getTime()) / (1000 * 60 * 60);
        return sum + hours;
      }, 0);
      avgCompletionTime = totalHours / completedWithDates.length;
    }
    
    return {
      assignedWorkOrders: assigned,
      completedThisWeek,
      completedThisMonth,
      avgCompletionTime,
      overdueCount: overdue,
      inProgressCount: inProgress,
    };
  }, [workOrders, currentUser]);
  
  return {
    statsData,
    isLoading: isLoadingWO,
    enabled: isTechnician,
  };
}

// ==================== Requester Data Hook ====================

export function useRequesterDashboardData() {
  const { role } = useAbility();
  const currentUser = useCurrentUserInfo();
  const isRequester = role === 'requester';
  
  const { data: requests = [], isLoading: isLoadingRequests } = useRequests();
  const { data: statusCounts } = useRequestStatusCounts();
  
  const statsData = useMemo<RequesterStatsData | undefined>(() => {
    if (!requests && !statusCounts) return undefined;
    
    const userId = currentUser?.id;
    const userName = currentUser?.name;
    
    // Filtrar por solicitante atual
    const myRequests = requests.filter(req => 
      req.requester_user_name === userName || 
      req.requester_user_id === userId
    );
    
    // Contar por status (usando os status em português)
    const pending = myRequests.filter(req => 
      req.status === 'Nova' || req.status === 'Em triagem'
    ).length;
    
    const converted = myRequests.filter(req => 
      req.status === 'Convertida em OS'
    ).length;
    
    const rejected = myRequests.filter(req => 
      req.status === 'Rejeitada'
    ).length;
    
    return {
      myRequests: myRequests.length,
      pendingRequests: pending,
      approvedRequests: converted,
      rejectedRequests: rejected,
      convertedToWO: converted,
    };
  }, [requests, statusCounts, currentUser]);
  
  return {
    statsData,
    isLoading: isLoadingRequests,
    enabled: isRequester,
  };
}

// ==================== Viewer Data Hook ====================

export function useViewerDashboardData() {
  const { role } = useAbility();
  const isViewer = role === 'viewer';
  
  const { data: equipment = [], isLoading: isLoadingEquipment } = useEquipments();
  const { data: woStats, isLoading: isLoadingWOStats } = useWorkOrderStats();
  
  const statsData = useMemo<ViewerStatsData | undefined>(() => {
    return {
      totalAssets: equipment.length,
      activeWorkOrders: (woStats?.open || 0) + (woStats?.in_progress || 0),
      alertsCount: woStats?.overdue || 0,
      uptime: 99.5, // Valor mockado - seria calculado de telemetria real
    };
  }, [equipment, woStats]);
  
  return {
    statsData,
    isLoading: isLoadingEquipment || isLoadingWOStats,
    enabled: isViewer,
  };
}

// ==================== Combined Hook ====================

/**
 * Hook combinado que retorna os dados apropriados baseado no papel do usuário
 */
export function useRoleDashboardData() {
  const { role } = useAbility();
  
  const adminData = useAdminDashboardData();
  const operatorData = useOperatorDashboardData();
  const technicianData = useTechnicianDashboardData();
  const requesterData = useRequesterDashboardData();
  const viewerData = useViewerDashboardData();
  
  return {
    role,
    adminData,
    operatorData,
    technicianData,
    requesterData,
    viewerData,
  };
}
