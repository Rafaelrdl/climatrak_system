import { useMemo } from 'react';
import { useAbility } from './useAbility';
import type { Role } from '@/acl/abilities';

interface DataOwnership {
  createdBy?: string;
  assignedTo?: string;
  departmentId?: string;
  sectorId?: string;
  priority?: 'Baixa' | 'Média' | 'Alta' | 'Crítica';
  status?: string;
}

interface FilterOptions {
  includeArchived?: boolean;
  includeInactive?: boolean;
  onlyOwned?: boolean;
  maxPriority?: 'Baixa' | 'Média' | 'Alta' | 'Crítica';
  departments?: string[];
  sectors?: string[];
}

// Mock user context - in a real app this would come from auth
const mockUserContext = {
  id: 'current-user-id',
  departmentId: 'dept-maintenance',
  sectorIds: ['1', '2', '3', '4', '5'], // IDs dos setores mockados
  role: 'technician' as Role,
};

export function useDataFiltering() {
  const { role, can } = useAbility();

  return useMemo(() => {
    // Priority levels for filtering
    const priorityLevels = {
      'Baixa': 1,
      'Média': 2,
      'Alta': 3,
      'Crítica': 4,
    };

    /**
     * Filters work orders based on role permissions
     */
    function filterWorkOrders<T extends DataOwnership & { id: string; type?: string }>(
      data: T[], 
      options: FilterOptions = {}
    ): T[] {
      return data.filter(item => {
        // Admin can see all work orders
        if (role === 'admin') return true;

        // Technician can see work orders assigned to them or in their sectors
        if (role === 'technician') {
          if (item.assignedTo === mockUserContext.id) return true;
          if (item.sectorId && mockUserContext.sectorIds.includes(item.sectorId)) return true;
          if (item.departmentId === mockUserContext.departmentId) return true;
        }

        // Requester can only see their own created work orders
        if (role === 'requester') {
          if (item.createdBy === mockUserContext.id) return true;
        }

        // Apply additional filters
        if (!options.includeArchived && item.status === 'archived') return false;
        if (options.maxPriority && item.priority) {
          const itemPriorityLevel = priorityLevels[item.priority];
          const maxPriorityLevel = priorityLevels[options.maxPriority];
          if (itemPriorityLevel > maxPriorityLevel) return false;
        }

        return role === 'admin' || role === 'technician';
      });
    }

    /**
     * Filters assets based on role permissions
     */
    function filterAssets<T extends DataOwnership & { id: string; status?: string; active?: boolean }>(
      data: T[], 
      options: FilterOptions = {}
    ): T[] {
      return data.filter(item => {
        // Admin can see all assets
        if (role === 'admin') return true;

        // Technician can see assets in their sectors
        if (role === 'technician') {
          if (item.sectorId && mockUserContext.sectorIds.includes(item.sectorId)) return true;
          if (item.departmentId === mockUserContext.departmentId) return true;
        }

        // Requester can see basic asset info in their sectors
        if (role === 'requester') {
          if (item.sectorId && mockUserContext.sectorIds.includes(item.sectorId)) return true;
        }

        // Apply additional filters
        if (!options.includeInactive && item.active === false) return false;
        if (!options.includeArchived && item.status === 'archived') return false;

        return false;
      });
    }

    /**
     * Filters inventory items based on role permissions
     */
    function filterInventoryItems<T extends DataOwnership & { id: string; active?: boolean }>(
      data: T[], 
      options: FilterOptions = {}
    ): T[] {
      return data.filter(item => {
        // Admin can see all inventory
        if (role === 'admin') return true;

        // Technician can see inventory items for maintenance
        if (role === 'technician') {
          // Can see items in their department
          if (item.departmentId === mockUserContext.departmentId) return true;
          // Can see general maintenance items
          if (!item.departmentId) return true;
        }

        // Requester has limited inventory view
        if (role === 'requester') {
          // Can only see basic consumables (no specialized parts)
          if (!item.sectorId && !item.departmentId) return true;
          return false;
        }

        // Apply additional filters
        if (!options.includeInactive && item.active === false) return false;

        return false;
      });
    }

    /**
     * Filters maintenance plans based on role permissions
     */
    function filterMaintenancePlans<T extends DataOwnership & { id: string; status?: string; active?: boolean }>(
      data: T[], 
      options: FilterOptions = {}
    ): T[] {
      return data.filter(item => {
        // Admin can see all plans
        if (role === 'admin') return true;

        // Technician can see plans for their sectors
        if (role === 'technician') {
          if (item.sectorId && mockUserContext.sectorIds.includes(item.sectorId)) return true;
          if (item.departmentId === mockUserContext.departmentId) return true;
        }

        // Requester cannot see maintenance plans
        if (role === 'requester') return false;

        // Apply additional filters
        if (!options.includeInactive && item.active === false) return false;
        if (!options.includeArchived && item.status === 'archived') return false;

        return false;
      });
    }

    /**
     * Filters procedures based on role permissions
     */
    function filterProcedures<T extends DataOwnership & { id: string; status?: string; active?: boolean }>(
      data: T[], 
      options: FilterOptions = {}
    ): T[] {
      return data.filter(item => {
        // Admin can see all procedures
        if (role === 'admin') return true;

        // Technician can see active procedures in their area
        if (role === 'technician') {
          if (item.sectorId && mockUserContext.sectorIds.includes(item.sectorId)) return true;
          if (item.departmentId === mockUserContext.departmentId) return true;
          if (!item.sectorId && !item.departmentId) return true; // General procedures
        }

        // Requester can see general procedures only
        if (role === 'requester') {
          if (!item.sectorId && !item.departmentId && item.status === 'active') return true;
          return false;
        }

        // Apply additional filters
        if (!options.includeInactive && item.active === false) return false;

        return false;
      });
    }

    /**
     * Filters metrics data based on role permissions
     */
    function filterMetricsData<T extends { sectorId?: string; departmentId?: string; sensitive?: boolean }>(
      data: T[], 
      options: FilterOptions = {}
    ): T[] {
      return data.filter(item => {
        // Admin can see all metrics
        if (role === 'admin') return true;

        // Hide sensitive metrics from non-admin users
        if (item.sensitive && role !== 'admin') return false;

        // Technician can see metrics for their sectors/department
        if (role === 'technician') {
          if (item.sectorId && mockUserContext.sectorIds.includes(item.sectorId)) return true;
          if (item.departmentId === mockUserContext.departmentId) return true;
          return !item.sectorId && !item.departmentId; // Global metrics
        }

        // Requester can see limited metrics
        if (role === 'requester') {
          if (item.sectorId && mockUserContext.sectorIds.includes(item.sectorId)) return true;
          return false;
        }

        return false;
      });
    }

    /**
     * Filters dashboard data based on role permissions
     */
    function filterDashboardData(dashboardData: any) {
      const filtered = { ...dashboardData };

      // Admin sees everything
      if (role === 'admin') return filtered;

      // Technician sees filtered data
      if (role === 'technician') {
        // Filter KPIs to show only relevant data
        if (filtered.kpis) {
          // Hide sensitive financial data
          delete filtered.kpis.totalCost;
          delete filtered.kpis.costPerWorkOrder;
        }
        return filtered;
      }

      // Requester sees very limited dashboard data
      if (role === 'requester') {
        return {
          kpis: filtered.kpis ? {
            openWorkOrders: filtered.kpis.openWorkOrders,
            myRequests: filtered.kpis.myRequests || 0,
          } : {},
        };
      }

      return filtered;
    }

    /**
     * Gets allowed data fields based on role permissions
     */
    function getAllowedDataFields(subject: string): string[] {
      const baseFields = ['id', 'name', 'title', 'description', 'createdAt', 'updatedAt'];
      
      if (role === 'admin') {
        // Admin can see all fields
        return ['*'];
      }

      if (role === 'technician') {
        switch (subject) {
          case 'workorder':
            return [...baseFields, 'status', 'priority', 'assignedTo', 'sectorId', 'equipmentId', 'type'];
          case 'asset':
            return [...baseFields, 'location', 'status', 'lastMaintenance', 'nextMaintenance', 'model', 'serial'];
          case 'inventory':
            return [...baseFields, 'sku', 'location', 'unit', 'category', 'reorderPoint'];
          case 'procedure':
            return [...baseFields, 'category', 'version', 'status'];
          default:
            return baseFields;
        }
      }

      if (role === 'requester') {
        switch (subject) {
          case 'workorder':
            return [...baseFields, 'status', 'type']; // Limited work order info
          case 'asset':
            return [...baseFields, 'location', 'status', 'model']; // Basic asset info
          case 'inventory':
            return [...baseFields, 'unit', 'category']; // No stock levels
          case 'solicitation':
            return [...baseFields, 'status', 'priority', 'sectorId', 'equipmentId', 'note'];
          default:
            return ['id', 'name', 'title'];
        }
      }

      return baseFields;
    }

    /**
     * Applies data masking based on role permissions
     */
    function maskSensitiveData<T extends Record<string, any>>(data: T, subject: string): Partial<T> {
      const allowedFields = getAllowedDataFields(subject);
      
      if (allowedFields.includes('*')) {
        return data;
      }

      const maskedData: Partial<T> = {};
      allowedFields.forEach(field => {
        if (field in data) {
          maskedData[field as keyof T] = data[field];
        }
      });

      return maskedData;
    }

    return {
      filterWorkOrders,
      filterAssets,
      filterInventoryItems,
      filterMaintenancePlans,
      filterProcedures,
      filterMetricsData,
      filterDashboardData,
      getAllowedDataFields,
      maskSensitiveData,
      userContext: mockUserContext,
    };
  }, [role, can]);
}