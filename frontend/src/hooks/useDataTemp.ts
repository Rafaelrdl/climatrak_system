import { useState, useMemo } from 'react';
import type { 
  User,
  Company, 
  Sector, 
  SubSection,
  Equipment, 
  WorkOrder, 
  MaintenancePlan, 
  StockItem,
  DashboardKPIs,
  Solicitation
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
  MOCK_CHART_DATA,
  MOCK_SOLICITATIONS
} from '@/data/mockData';

/**
 * HOOKS DE DADOS TEMPORÁRIOS
 * 
 * Este arquivo contém hooks personalizados para gerenciar dados da aplicação.
 * Utiliza useState em vez de useKV para corrigir problemas de carregamento.
 * 
 * Cada hook segue o padrão: [data, setData, deleteData]
 * - data: Os dados atuais
 * - setData: Função para atualizar os dados
 * - deleteData: Função para limpar os dados
 * 
 * NOTA: Atualmente usa dados mockados para desenvolvimento.
 * Em produção, estes hooks devem ser conectados a uma API real.
 */

// ========== HOOKS PARA DADOS DE LOCAIS ==========

/**
 * HOOK PARA EMPRESAS
 * 
 * Gerencia os dados das empresas do sistema.
 * Empresas são o nível mais alto da hierarquia de locais.
 */
export const useCompanies = (): [Company[], (value: Company[] | ((current: Company[]) => Company[])) => void, () => void] => {
  const [data] = useState<Company[]>(MOCK_COMPANIES);
  const setData = (value: Company[] | ((current: Company[]) => Company[])) => {
    // Por enquanto, apenas registra as mudanças pois não estamos persistindo

  };
  const deleteData = () => {

  };
  // Memoizar retorno para evitar re-criação de array
  return useMemo(() => [data, setData, deleteData] as const, [data]);
};

/**
 * HOOK PARA SETORES
 * 
 * Gerencia os dados dos setores do sistema.
 * Setores pertencem a empresas e são o segundo nível da hierarquia.
 */
export const useSectors = (): [Sector[], (value: Sector[] | ((current: Sector[]) => Sector[])) => void, () => void] => {
  const [data] = useState<Sector[]>(MOCK_SECTORS);
  const setData = (value: Sector[] | ((current: Sector[]) => Sector[])) => {

  };
  const deleteData = () => {

  };
  // Memoizar retorno para evitar re-criação de array
  return useMemo(() => [data, setData, deleteData] as const, [data]);
};

/**
 * HOOK PARA SUBSETORES
 * 
 * Gerencia os dados dos subsetores do sistema.
 * Subsetores pertencem a setores e são o terceiro nível da hierarquia.
 */
export const useSubSections = (): [SubSection[], (value: SubSection[] | ((current: SubSection[]) => SubSection[])) => void, () => void] => {
  const [data] = useState<SubSection[]>(MOCK_SUBSECTIONS);
  const setData = (value: SubSection[] | ((current: SubSection[]) => SubSection[])) => {

  };
  const deleteData = () => {

  };
  return [data, setData, deleteData];
};

// ========== HOOKS PARA DADOS DE EQUIPAMENTOS E MANUTENÇÃO ==========

/**
 * HOOK PARA EQUIPAMENTOS
 * 
 * Gerencia os dados dos equipamentos/ativos do sistema.
 * Equipamentos estão associados a setores e subsetores.
 */
export const useEquipment = (): [Equipment[], (value: Equipment[] | ((current: Equipment[]) => Equipment[])) => void, () => void] => {
  const [data] = useState<Equipment[]>(MOCK_EQUIPMENT);
  const setData = (value: Equipment[] | ((current: Equipment[]) => Equipment[])) => {

  };
  const deleteData = () => {

  };
  // Memoizar retorno para evitar re-criação de array
  return useMemo(() => [data, setData, deleteData] as const, [data]);
};

/**
 * HOOK PARA ORDENS DE SERVIÇO
 * 
 * Gerencia os dados das ordens de serviço do sistema.
 * Inclui funcionalidade real de persistência de estado.
 */
export const useWorkOrders = (): [WorkOrder[], (value: WorkOrder[] | ((current: WorkOrder[]) => WorkOrder[])) => void, () => void] => {
  const [data, setData] = useState<WorkOrder[]>(MOCK_WORK_ORDERS);
  
  const updateData = (value: WorkOrder[] | ((current: WorkOrder[]) => WorkOrder[])) => {
    if (typeof value === 'function') {
      setData(current => value(current));
    } else {
      setData(value);
    }
  };

  const deleteData = () => {
    setData([]);
  };
  
  return [data, updateData, deleteData];
};

/**
 * HOOK PARA PLANOS DE MANUTENÇÃO
 * 
 * Gerencia os dados dos planos de manutenção preventiva.
 */
export const useMaintenancePlans = (): [MaintenancePlan[], (value: MaintenancePlan[] | ((current: MaintenancePlan[]) => MaintenancePlan[])) => void, () => void] => {
  const [data] = useState<MaintenancePlan[]>(MOCK_MAINTENANCE_PLANS);
  const setData = (value: MaintenancePlan[] | ((current: MaintenancePlan[]) => MaintenancePlan[])) => {

  };
  const deleteData = () => {

  };
  return [data, setData, deleteData];
};

// ========== HOOKS PARA DADOS DE ESTOQUE E DASHBOARDS ==========

/**
 * HOOK PARA ESTOQUE
 * 
 * Gerencia os dados dos itens de estoque/almoxarifado.
 */
export const useStock = (): [StockItem[], (value: StockItem[] | ((current: StockItem[]) => StockItem[])) => void, () => void] => {
  const [data] = useState<StockItem[]>(MOCK_STOCK_ITEMS);
  const setData = (value: StockItem[] | ((current: StockItem[]) => StockItem[])) => {

  };
  const deleteData = () => {

  };
  // Memoizar retorno para evitar re-criação de array
  return useMemo(() => [data, setData, deleteData] as const, [data]);
};

// Alias para useStock para compatibilidade com componentes existentes
export const useStockItems = useStock;

/**
 * HOOK PARA KPIs DO DASHBOARD
 * 
 * Gerencia os indicadores-chave de performance exibidos no dashboard.
 */
export const useDashboardKPIs = (): [DashboardKPIs, (value: DashboardKPIs | ((current: DashboardKPIs) => DashboardKPIs)) => void, () => void] => {
  const [data] = useState<DashboardKPIs>(MOCK_DASHBOARD_KPIS);
  const setData = (value: DashboardKPIs | ((current: DashboardKPIs) => DashboardKPIs)) => {

  };
  const deleteData = () => {

  };
  return [data, setData, deleteData];
};

/**
 * HOOK PARA USUÁRIO ATUAL
 * 
 * Gerencia os dados do usuário logado no sistema.
 */
export const useUser = (): [User, (value: User | ((current: User) => User)) => void, () => void] => {
  const userData: User = {
    id: '1',
    name: 'Admin',
    email: 'admin@traknor.com',
    role: 'ADMIN',
    avatar: '/assets/avatar.png'
  };
  
  const [data] = useState<User>(userData);
  const setData = (value: User | ((current: User) => User)) => {

  };
  const deleteData = () => {

  };
  return [data, setData, deleteData];
};

/**
 * HOOK PARA DADOS DE GRÁFICOS
 * 
 * Centralizador de dados para gráficos e visualizações.
 */
export const useChartData = (): [typeof MOCK_CHART_DATA, (value: typeof MOCK_CHART_DATA | ((current: typeof MOCK_CHART_DATA) => typeof MOCK_CHART_DATA)) => void, () => void] => {
  const [data] = useState(MOCK_CHART_DATA);
  const setData = (value: typeof MOCK_CHART_DATA | ((current: typeof MOCK_CHART_DATA) => typeof MOCK_CHART_DATA)) => {

  };
  const deleteData = () => {

  };
  return [data, setData, deleteData];
};

// ========== FUNÇÕES UTILITÁRIAS PARA BUSCA ==========

/**
 * BUSCAR EMPRESA POR ID
 * 
 * Encontra uma empresa específica pelo seu identificador único.
 * 
 * @param id - ID da empresa a ser encontrada
 * @returns Empresa encontrada ou undefined
 */
export const findCompanyById = (id: string) => {
  return MOCK_COMPANIES.find(company => company.id === id);
};

/**
 * BUSCAR SETOR POR ID
 * 
 * Encontra um setor específico pelo seu identificador único.
 * 
 * @param id - ID do setor a ser encontrado
 * @returns Setor encontrado ou undefined
 */
export const findSectorById = (id: string) => {
  return MOCK_SECTORS.find(sector => sector.id === id);
};

/**
 * BUSCAR EQUIPAMENTO POR ID
 * 
 * Encontra um equipamento específico pelo seu identificador único.
 * 
 * @param id - ID do equipamento a ser encontrado
 * @returns Equipamento encontrado ou undefined
 */
export const findEquipmentById = (id: string) => {
  return MOCK_EQUIPMENT.find(equipment => equipment.id === id);
};

/**
 * BUSCAR ORDEM DE SERVIÇO POR ID
 * 
 * Encontra uma ordem de serviço específica pelo seu identificador único.
 * 
 * @param id - ID da ordem de serviço a ser encontrada
 * @returns Ordem de serviço encontrada ou undefined
 */
export const findWorkOrderById = (id: string) => {
  return MOCK_WORK_ORDERS.find(workOrder => workOrder.id === id);
};

// ========== HOOK PARA SOLICITAÇÕES ==========

/**
 * HOOK PARA SOLICITAÇÕES
 * 
 * Gerencia os dados das solicitações de materiais/serviços.
 * Inclui persistência via localStorage para demonstração.
 */
export const useSolicitations = (): [Solicitation[], (value: Solicitation[] | ((current: Solicitation[]) => Solicitation[])) => void, () => void] => {
  const [data, setData] = useState<Solicitation[]>(() => {
    // Tenta carregar do localStorage primeiro
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('traknor-solicitations');
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch (e) {
          console.warn('Error parsing stored solicitations:', e);
        }
      }
    }
    return MOCK_SOLICITATIONS;
  });
  
  const updateData = (value: Solicitation[] | ((current: Solicitation[]) => Solicitation[])) => {
    if (typeof value === 'function') {
      setData(currentData => {
        const newData = value(currentData);
        // Salva no localStorage
        if (typeof window !== 'undefined') {
          localStorage.setItem('traknor-solicitations', JSON.stringify(newData));
        }
        return newData;
      });
    } else {
      setData(value);
      // Salva no localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('traknor-solicitations', JSON.stringify(value));
      }
    }
  };

  const deleteData = () => {
    setData([]);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('traknor-solicitations');
    }
  };
  
  return [data, updateData, deleteData];
};

// ========== HOOKS UTILITÁRIOS ==========

/**
 * HOOK UTILITÁRIO PARA BUSCAR POR ID
 * 
 * Hook genérico para encontrar qualquer item em uma coleção pelo ID.
 * 
 * @param collection - Array de objetos com propriedade id
 * @param id - ID do item a ser encontrado
 * @returns Item encontrado ou null
 */
export const useFindById = <T extends { id: string }>(
  collection: T[],
  id: string | undefined
) => {
  if (!id) return null;
  return collection.find(item => item.id === id) || null;
};

/**
 * BUSCAR SOLICITAÇÃO POR ID
 * 
 * Encontra uma solicitação específica, considerando dados do localStorage.
 * 
 * @param id - ID da solicitação a ser encontrada
 * @returns Solicitação encontrada ou undefined
 */
export const findSolicitationById = (id: string) => {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('traknor-solicitations');
    if (stored) {
      try {
        const solicitations: Solicitation[] = JSON.parse(stored);
        return solicitations.find(solicitation => solicitation.id === id);
      } catch (e) {
        console.warn('Error parsing stored solicitations:', e);
      }
    }
  }
  return MOCK_SOLICITATIONS.find(solicitation => solicitation.id === id);
};

// ========== FUNÇÕES DE LÓGICA DE NEGÓCIO PARA SOLICITAÇÕES ==========

/**
 * VERIFICAR SE STATUS PODE SER AVANÇADO
 * 
 * Verifica se uma solicitação pode ter seu status avançado para o próximo estágio.
 * 
 * @param solicitation - Solicitação a ser verificada
 * @returns true se o status pode ser avançado, false caso contrário
 */
export const canAdvanceStatus = (solicitation: Solicitation): boolean => {
  switch (solicitation.status) {
    case 'Nova':
      return true; // Pode ir para 'Em triagem'
    case 'Em triagem':
      return true; // Pode ir para 'Convertida em OS'
    case 'Convertida em OS':
      return false; // Status final
    default:
      return false;
  }
};

/**
 * OBTER PRÓXIMO STATUS
 * 
 * Retorna qual seria o próximo status na sequência de uma solicitação.
 * 
 * @param currentStatus - Status atual da solicitação
 * @returns Próximo status ou null se não há próximo
 */
export const getNextStatus = (currentStatus: Solicitation['status']): Solicitation['status'] | null => {
  switch (currentStatus) {
    case 'Nova':
      return 'Em triagem';
    case 'Em triagem':
      return 'Convertida em OS';
    default:
      return null;
  }
};

/**
 * AVANÇAR STATUS DA SOLICITAÇÃO
 * 
 * Avança o status de uma solicitação para o próximo estágio,
 * registrando o histórico de mudanças.
 * 
 * @param solicitation - Solicitação a ter o status avançado
 * @returns Solicitação atualizada ou null se não pode ser avançada
 */
export const advanceSolicitationStatus = (solicitation: Solicitation): Solicitation | null => {
  if (!canAdvanceStatus(solicitation)) {
    return null;
  }

  const nextStatus = getNextStatus(solicitation.status);
  if (!nextStatus) {
    return null;
  }

  return {
    ...solicitation,
    status: nextStatus,
    status_history: [
      ...solicitation.status_history,
      {
        from: solicitation.status,
        to: nextStatus,
        at: new Date().toISOString()
      }
    ],
    updated_at: new Date().toISOString()
  };
};

/**
 * ADICIONAR ITEM À SOLICITAÇÃO
 * 
 * Adiciona um item de estoque à solicitação. Se o item já existe,
 * soma as quantidades.
 * 
 * @param solicitation - Solicitação alvo
 * @param stockItemId - ID do item de estoque
 * @param stockItemName - Nome do item de estoque
 * @param unit - Unidade de medida
 * @param qty - Quantidade solicitada
 * @returns Solicitação atualizada com o novo item
 */
export const addSolicitationItem = (
  solicitation: Solicitation, 
  stockItemId: string, 
  stockItemName: string,
  unit: string,
  qty: number
): Solicitation => {
  // Verifica se o item já existe
  const existingItemIndex = solicitation.items.findIndex(item => item.stock_item_id === stockItemId);
  
  let updatedItems: typeof solicitation.items;
  
  if (existingItemIndex >= 0) {
    // Soma as quantidades se o item já existe
    updatedItems = solicitation.items.map((item, index) =>
      index === existingItemIndex
        ? { ...item, qty: item.qty + qty }
        : item
    );
  } else {
    // Adiciona novo item
    updatedItems = [
      ...solicitation.items,
      {
        id: `item-${Date.now()}`,
        stock_item_id: stockItemId,
        stock_item_name: stockItemName,
        unit,
        qty
      }
    ];
  }

  return {
    ...solicitation,
    items: updatedItems,
    updated_at: new Date().toISOString()
  };
};

/**
 * REMOVER ITEM DA SOLICITAÇÃO
 * 
 * Remove um item específico da lista de itens da solicitação.
 * 
 * @param solicitation - Solicitação alvo
 * @param itemId - ID do item a ser removido
 * @returns Solicitação atualizada sem o item
 */
export const removeSolicitationItem = (solicitation: Solicitation, itemId: string): Solicitation => {
  return {
    ...solicitation,
    items: solicitation.items.filter(item => item.id !== itemId),
    updated_at: new Date().toISOString()
  };
};

/**
 * CONVERTER SOLICITAÇÃO EM ORDEM DE SERVIÇO
 * 
 * Converte uma solicitação aprovada em uma ordem de serviço executável,
 * transferindo todos os itens e informações relevantes.
 * 
 * @param solicitation - Solicitação a ser convertida
 * @returns Nova ordem de serviço criada
 */
export const convertSolicitationToWorkOrder = (solicitation: Solicitation): WorkOrder => {
  const workOrderNumber = `OS-${String(Date.now()).slice(-6)}`;
  
  return {
    id: `wo-${Date.now()}`,
    number: workOrderNumber,
    equipmentId: solicitation.equipment_id,
    type: 'CORRECTIVE',
    status: 'OPEN',
    scheduledDate: new Date().toISOString(),
    priority: 'MEDIUM',
    description: `Convertida da solicitação: ${solicitation.note || 'Sem observações'}`,
    stockItems: solicitation.items.map(item => ({
      id: `wosi-${Date.now()}-${item.id}`,
      workOrderId: `wo-${Date.now()}`,
      stockItemId: item.stock_item_id,
      quantity: item.qty,
      stockItem: {
        id: item.stock_item_id,
        code: item.stock_item_id,
        description: item.stock_item_name,
        unit: item.unit || 'un',
        quantity: item.qty,
        minimum: 0,
        maximum: 100
      }
    }))
  };
};