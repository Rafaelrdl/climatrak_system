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
  MOCK_DASHBOARD_KPIS,
  MOCK_CHART_DATA
} from '@/data/mockData';

// Hooks retornando arrays tipados para compatibilidade
export const useCompanies = (): [Company[], () => void] => {
  return [MOCK_COMPANIES, () => {}];
};

export const useSectors = (): [Sector[], () => void] => {
  return [MOCK_SECTORS, () => {}];
};

export const useSubSections = (): [SubSection[], () => void] => {
  return [MOCK_SUBSECTIONS, () => {}];
};

export const useEquipment = (): [Equipment[], () => void] => {
  return [MOCK_EQUIPMENT, () => {}];
};

export const useWorkOrders = (): [WorkOrder[], () => void] => {
  return [MOCK_WORK_ORDERS, () => {}];
};

export const useMaintenancePlans = (): [MaintenancePlan[], () => void] => {
  return [MOCK_MAINTENANCE_PLANS, () => {}];
};

export const useStock = (): [StockItem[], () => void] => {
  return [MOCK_STOCK_ITEMS, () => {}];
};

export const useDashboardKPIs = (): [DashboardKPIs, () => void] => {
  return [MOCK_DASHBOARD_KPIS, () => {}];
};

export const useUser = (): [User, () => void] => {
  const userData: User = {
    id: '1',
    name: 'Admin',
    email: 'admin@climatrak.com',
    role: 'ADMIN',
    avatar: '/assets/avatar.png'
  };
  return [userData, () => {}];
};

// Hook para dados de gráficos centralizados
export const useChartData = (): [typeof MOCK_CHART_DATA, () => void] => {
  return [MOCK_CHART_DATA, () => {}];
};

// Funções utilitárias para buscar dados específicos
export const findCompanyById = (id: string) => {
  return MOCK_COMPANIES.find(company => company.id === id);
};

export const findSectorById = (id: string) => {
  return MOCK_SECTORS.find(sector => sector.id === id);
};

export const findEquipmentById = (id: string) => {
  return MOCK_EQUIPMENT.find(equipment => equipment.id === id);
};

export const findWorkOrderById = (id: string) => {
  return MOCK_WORK_ORDERS.find(workOrder => workOrder.id === id);
};

// Hook utilitário para buscar qualquer item por ID
export const useFindById = <T extends { id: string }>(
  collection: T[],
  id: string | undefined
) => {
  if (!id) return null;
  return collection.find(item => item.id === id) || null;
};