import { ReactNode, useMemo } from 'react';
import { useDataFiltering } from '@/hooks/useDataFiltering';
import { useAbility } from '@/hooks/useAbility';

interface FilteredDataProviderProps {
  children: ReactNode;
  data: any[];
  dataType: 'workorder' | 'asset' | 'inventory' | 'plan' | 'procedure' | 'solicitation' | 'metrics';
  filterOptions?: {
    includeArchived?: boolean;
    includeInactive?: boolean;
    onlyOwned?: boolean;
    departments?: string[];
    sectors?: string[];
  };
  onDataFiltered?: (filteredData: any[]) => void;
}

interface FilteredDataContext {
  originalData: any[];
  filteredData: any[];
  canViewAll: boolean;
  dataType: string;
  filterStats: {
    total: number;
    visible: number;
    filtered: number;
  };
}

/**
 * Higher-order component that automatically applies role-based data filtering
 * and provides filtered data through render props pattern
 */
export function FilteredDataProvider({
  children,
  data,
  dataType,
  filterOptions = {},
  onDataFiltered
}: FilteredDataProviderProps) {
  const { role, can } = useAbility();
  const {
    filterWorkOrders,
    filterAssets,
    filterInventoryItems,
    filterMaintenancePlans,
    filterProcedures,
    filterMetricsData,
    maskSensitiveData,
  } = useDataFiltering();

  const filteredData = useMemo(() => {
    if (!data || data.length === 0) return [];

    let filtered: any[] = [];

    // Apply role-based filtering based on data type
    switch (dataType) {
      case 'workorder':
        filtered = filterWorkOrders(data, filterOptions);
        break;
      case 'asset':
        filtered = filterAssets(data, filterOptions);
        break;
      case 'inventory':
        filtered = filterInventoryItems(data, filterOptions);
        break;
      case 'plan':
        filtered = filterMaintenancePlans(data, filterOptions);
        break;
      case 'procedure':
        filtered = filterProcedures(data, filterOptions);
        break;
      case 'metrics':
        filtered = filterMetricsData(data, filterOptions);
        break;
      case 'solicitation':
        // Solicitations use similar filtering to work orders
        filtered = filterWorkOrders(data, filterOptions);
        break;
      default:
        filtered = data;
    }

    // Apply data masking to remove sensitive fields
    filtered = filtered.map(item => maskSensitiveData(item, dataType));

    // Call callback if provided
    onDataFiltered?.(filtered);

    return filtered;
  }, [
    data, 
    dataType, 
    filterOptions, 
    role,
    filterWorkOrders,
    filterAssets,
    filterInventoryItems,
    filterMaintenancePlans,
    filterProcedures,
    filterMetricsData,
    maskSensitiveData,
    onDataFiltered
  ]);

  const canViewAll = can('manage', dataType as any) || role === 'admin';

  const filterStats = {
    total: data?.length || 0,
    visible: filteredData.length,
    filtered: (data?.length || 0) - filteredData.length,
  };

  const contextValue: FilteredDataContext = {
    originalData: data || [],
    filteredData,
    canViewAll,
    dataType,
    filterStats,
  };

  // If children is a function (render props pattern), call it with context
  if (typeof children === 'function') {
    return (children as any)(contextValue);
  }

  // Otherwise, use React context (would need to create context provider)
  return <>{children}</>;
}

/**
 * Hook to access filtered data context (if using React context pattern)
 */
export function useFilteredData() {
  // This would be implemented if using React context pattern
  // For now, return null as we're using render props
  return null;
}

/**
 * Component that shows filtering statistics and warnings
 */
interface DataFilterInfoProps {
  filterStats: FilteredDataContext['filterStats'];
  dataType: string;
  canViewAll: boolean;
  className?: string;
}

export function DataFilterInfo({ 
  filterStats, 
  dataType, 
  canViewAll, 
  className = '' 
}: DataFilterInfoProps) {
  const { role } = useAbility();

  if (filterStats.filtered === 0) {
    return null;
  }

  const entityName = {
    workorder: 'ordens de serviço',
    asset: 'ativos',
    inventory: 'itens de estoque',
    plan: 'planos de manutenção',
    procedure: 'procedimentos',
    solicitation: 'solicitações',
    metrics: 'métricas',
  }[dataType] || 'itens';

  return (
    <div className={`bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm ${className}`}>
      <div className="flex items-start gap-2">
        <span className="text-amber-600">ℹ️</span>
        <div className="flex-1">
          <p className="text-amber-800 font-medium">
            Visualização filtrada por permissões
          </p>
          <p className="text-amber-700 mt-1">
            Mostrando {filterStats.visible} de {filterStats.total} {entityName}.
            {filterStats.filtered > 0 && (
              <>
                {' '}{filterStats.filtered} {entityName} não {filterStats.filtered === 1 ? 'está visível' : 'estão visíveis'} 
                devido às suas permissões de {role === 'technician' ? 'técnico' : role === 'requester' ? 'solicitante' : 'usuário'}.
              </>
            )}
          </p>
          {!canViewAll && role !== 'admin' && (
            <p className="text-amber-600 text-xs mt-1">
              Para ver todos os dados, entre em contato com um administrador.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Hook that provides role-based data filtering for specific data types
 */
export function useRoleBasedData<T>(
  data: T[], 
  dataType: FilteredDataProviderProps['dataType'],
  options: FilteredDataProviderProps['filterOptions'] = {}
) {
  const { role } = useAbility();
  const filtering = useDataFiltering();

  return useMemo(() => {
    if (!data || data.length === 0) return { data: [], stats: { total: 0, visible: 0, filtered: 0 } };

    let filtered: T[] = [];

    switch (dataType) {
      case 'workorder':
        filtered = filtering.filterWorkOrders(data as any, options) as T[];
        break;
      case 'asset':
        filtered = filtering.filterAssets(data as any, options) as T[];
        break;
      case 'inventory':
        filtered = filtering.filterInventoryItems(data as any, options) as T[];
        break;
      case 'plan':
        filtered = filtering.filterMaintenancePlans(data as any, options) as T[];
        break;
      case 'procedure':
        filtered = filtering.filterProcedures(data as any, options) as T[];
        break;
      case 'metrics':
        filtered = filtering.filterMetricsData(data as any, options) as T[];
        break;
      default:
        filtered = data;
    }

    // Apply data masking
    filtered = filtered.map(item => filtering.maskSensitiveData(item as any, dataType)) as T[];

    const stats = {
      total: data.length,
      visible: filtered.length,
      filtered: data.length - filtered.length,
    };

    return { data: filtered, stats, role };
  }, [data, dataType, options, role, filtering]);
}