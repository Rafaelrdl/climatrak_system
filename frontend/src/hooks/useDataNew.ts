import type { 
  User, 
  Company, 
  Sector, 
  SubSection,
  Equipment, 
  WorkOrder, 
  MaintenancePlan, 
  StockItem,
  DashboardKPIs 
} from '@/types';
import { 
  MOCK_COMPANIES,
  MOCK_SECTORS,
  MOCK_SUBSECTIONS,
  MOCK_EQUIPMENT,
  MOCK_WORK_ORDERS,
  MOCK_MAINTENANCE_PLANS,
  MOCK_STOCK_ITEMS,
  MOCK_DASHBOARD_KPIS
} from '@/data/mockData';

// Hook personalizado para empresas
export const useCompanies = () => {
  return {
    data: MOCK_COMPANIES,
    isLoading: false,
    error: null
  };
};

// Hook personalizado para setores
export const useSectors = () => {
  return {
    data: MOCK_SECTORS,
    isLoading: false,
    error: null
  };
};

// Hook personalizado para subseções
export const useSubSections = () => {
  return {
    data: MOCK_SUBSECTIONS,
    isLoading: false,
    error: null
  };
};

// Hook personalizado para equipamentos
export const useEquipment = () => {
  return {
    data: MOCK_EQUIPMENT,
    isLoading: false,
    error: null
  };
};

// Hook personalizado para ordens de serviço
export const useWorkOrders = () => {
  return {
    data: MOCK_WORK_ORDERS,
    isLoading: false,
    error: null
  };
};

// Hook personalizado para planos de manutenção
export const useMaintenancePlans = () => {
  return {
    data: MOCK_MAINTENANCE_PLANS,
    isLoading: false,
    error: null
  };
};

// Hook personalizado para estoque
export const useStock = () => {
  return {
    data: MOCK_STOCK_ITEMS,
    isLoading: false,
    error: null
  };
};

// Hook personalizado para KPIs do dashboard
export const useDashboardKPIs = () => {
  return {
    data: MOCK_DASHBOARD_KPIS,
    isLoading: false,
    error: null
  };
};