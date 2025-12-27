import { useMemo } from 'react';
import { useDataFiltering } from './useDataFiltering';
import { useAbility } from './useAbility';
import type { Role } from '@/acl/abilities';

interface DashboardKPI {
  key: string;
  value: number | string;
  label: string;
  sensitive?: boolean;
  allowedRoles?: Role[];
}

interface ChartDataPoint {
  label: string;
  value: number;
  category?: string;
  sectorId?: string;
  departmentId?: string;
  sensitive?: boolean;
}

interface DashboardData {
  kpis: DashboardKPI[];
  workOrdersOverTime: ChartDataPoint[];
  assetStatus: ChartDataPoint[];
  technicianPerformance: ChartDataPoint[];
  maintenanceMetrics: {
    mttr: number;
    mtbf: number;
    uptime: number;
    costMetrics?: {
      totalCost: number;
      costPerWorkOrder: number;
      budgetUtilization: number;
    };
  };
  upcomingMaintenance: any[];
  recentActivity: any[];
}

export function useDashboardFiltering() {
  const { role, can } = useAbility();
  const { filterDashboardData, userContext } = useDataFiltering();

  /**
   * Filters KPIs based on role permissions
   */
  function filterKPIs(kpis: DashboardKPI[]): DashboardKPI[] {
    return kpis.filter(kpi => {
      // Admin can see all KPIs
      if (role === 'admin') return true;

      // Check if KPI is marked as sensitive
      if (kpi.sensitive && role !== 'admin') return false;

      // Check explicit role restrictions
      if (kpi.allowedRoles && !kpi.allowedRoles.includes(role)) return false;

      // Default filtering based on role
      switch (role) {
        case 'technician':
          // Technicians can see operational metrics but not financial
          return !kpi.key.includes('cost') && !kpi.key.includes('budget');
        
        case 'requester':
          // Requesters can see basic status metrics
          return [
            'openRequests', 
            'myRequests', 
            'pendingApprovals',
            'assetStatus',
            'maintenanceScheduled'
          ].some(allowed => kpi.key.includes(allowed));
        
        default:
          return true;
      }
    });
  }

  /**
   * Filters chart data based on role and sector access
   */
  function filterChartData(data: ChartDataPoint[]): ChartDataPoint[] {
    return data.filter(point => {
      // Admin can see all data points
      if (role === 'admin') return true;

      // Hide sensitive data points
      if (point.sensitive && role !== 'admin') return false;

      // Technician can see data for their sectors/department
      if (role === 'technician') {
        if (point.sectorId && !userContext.sectorIds.includes(point.sectorId)) {
          return false;
        }
        if (point.departmentId && point.departmentId !== userContext.departmentId) {
          return false;
        }
        return true;
      }

      // Requester can see limited data
      if (role === 'requester') {
        if (point.sectorId && !userContext.sectorIds.includes(point.sectorId)) {
          return false;
        }
        // Only basic categories for requesters
        return ['requests', 'assets', 'status'].some(cat => 
          point.category?.toLowerCase().includes(cat)
        );
      }

      return true;
    });
  }

  /**
   * Filters maintenance metrics based on role
   */
  function filterMaintenanceMetrics(metrics: DashboardData['maintenanceMetrics']) {
    const filtered = { ...metrics };

    // Remove cost metrics for non-admin users
    if (role !== 'admin') {
      delete filtered.costMetrics;
    }

    // Requesters get very limited metrics
    if (role === 'requester') {
      return {
        uptime: filtered.uptime,
      };
    }

    return filtered;
  }

  /**
   * Gets role-appropriate dashboard description
   */
  function getDashboardDescription(): string {
    switch (role) {
      case 'admin':
        return 'Visão completa do sistema de manutenção com todos os dados e métricas';
      case 'technician':
        return 'Dashboard técnico com foco em ordens de serviço e manutenção operacional';
      case 'requester':
        return 'Painel de solicitações e status dos seus pedidos de manutenção';
      default:
        return 'Dashboard do sistema de gestão de manutenção';
    }
  }

  /**
   * Gets available dashboard widgets based on role
   */
  function getAvailableWidgets(): string[] {
    const baseWidgets = ['kpis'];
    
    switch (role) {
      case 'admin':
        return [
          ...baseWidgets,
          'workOrdersChart',
          'assetStatusChart', 
          'technicianPerformanceChart',
          'maintenanceMetrics',
          'upcomingMaintenance',
          'recentActivity',
          'costAnalysis',
          'trendAnalysis'
        ];
      
      case 'technician':
        return [
          ...baseWidgets,
          'workOrdersChart',
          'assetStatusChart',
          'technicianPerformanceChart',
          'upcomingMaintenance',
          'recentActivity'
        ];
      
      case 'requester':
        return [
          ...baseWidgets,
          'myRequests',
          'requestStatus',
          'assetStatusChart'
        ];
      
      default:
        return baseWidgets;
    }
  }

  /**
   * Main dashboard filtering function
   */
  function filterDashboard(dashboardData: DashboardData): Partial<DashboardData> {
    const availableWidgets = getAvailableWidgets();
    
    const filtered: Partial<DashboardData> = {};

    // Always include filtered KPIs
    if (dashboardData.kpis && availableWidgets.includes('kpis')) {
      filtered.kpis = filterKPIs(dashboardData.kpis);
    }

    // Filter charts based on available widgets
    if (dashboardData.workOrdersOverTime && availableWidgets.includes('workOrdersChart')) {
      filtered.workOrdersOverTime = filterChartData(dashboardData.workOrdersOverTime);
    }

    if (dashboardData.assetStatus && availableWidgets.includes('assetStatusChart')) {
      filtered.assetStatus = filterChartData(dashboardData.assetStatus);
    }

    if (dashboardData.technicianPerformance && availableWidgets.includes('technicianPerformanceChart')) {
      filtered.technicianPerformance = filterChartData(dashboardData.technicianPerformance);
    }

    // Filter maintenance metrics
    if (dashboardData.maintenanceMetrics && availableWidgets.includes('maintenanceMetrics')) {
      filtered.maintenanceMetrics = filterMaintenanceMetrics(dashboardData.maintenanceMetrics);
    }

    // Filter upcoming maintenance
    if (dashboardData.upcomingMaintenance && availableWidgets.includes('upcomingMaintenance')) {
      filtered.upcomingMaintenance = dashboardData.upcomingMaintenance.filter(item => {
        if (role === 'admin') return true;
        if (role === 'technician') {
          return item.assignedTo === userContext.id || 
                 (item.sectorId && userContext.sectorIds.includes(item.sectorId));
        }
        if (role === 'requester') {
          return item.createdBy === userContext.id;
        }
        return false;
      });
    }

    // Filter recent activity
    if (dashboardData.recentActivity && availableWidgets.includes('recentActivity')) {
      filtered.recentActivity = dashboardData.recentActivity.filter(item => {
        if (role === 'admin') return true;
        if (role === 'technician') {
          return item.assignedTo === userContext.id || 
                 item.createdBy === userContext.id ||
                 (item.sectorId && userContext.sectorIds.includes(item.sectorId));
        }
        if (role === 'requester') {
          return item.createdBy === userContext.id;
        }
        return false;
      });
    }

    return filtered;
  }

  /**
   * Gets dashboard configuration based on role
   */
  function getDashboardConfig() {
    return {
      title: `Dashboard ${role === 'admin' ? 'Administrativo' : role === 'technician' ? 'Técnico' : 'de Solicitações'}`,
      description: getDashboardDescription(),
      availableWidgets: getAvailableWidgets(),
      refreshInterval: role === 'admin' ? 30000 : role === 'technician' ? 60000 : 120000, // More frequent updates for admins
      showAdvancedFilters: role === 'admin' || role === 'technician',
      showExportOptions: role === 'admin' || (role === 'technician' && can('manage', 'report')),
      defaultDateRange: role === 'requester' ? '7d' : '30d',
    };
  }

  return {
    filterDashboard,
    filterKPIs,
    filterChartData,
    filterMaintenanceMetrics,
    getDashboardConfig,
    getDashboardDescription,
    getAvailableWidgets,
    role,
    userContext,
  };
}