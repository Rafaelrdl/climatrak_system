import { useState, useMemo, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/shared/ui';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import {
  Search,
  Filter,
  X,
  Wrench,
  MapPin,
  Calendar,
  Zap,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Package,
  Building2,
  LayoutGrid,
  List,
  // Ícones para tipos de ativos
  Snowflake,        // CHILLER
  Wind,             // SPLIT, FAN_COIL, AHU
  RefreshCw,        // VRF
  Droplets,         // COOLING_TOWER, PUMP
  Flame,            // BOILER
  Gauge,            // METER
  Thermometer,      // SENSOR
  Cpu,              // CONTROLLER
  Filter as FilterIcon, // FILTER
  Square,           // DUCT
  CircleDot,        // VALVE
  Server,           // RTU
  type LucideIcon,
} from 'lucide-react';
import type { Equipment, EquipmentFilter, Company, Unit, Sector, SubSection } from '@/types';

interface EquipmentSearchProps {
  equipment: Equipment[];
  onFilteredResults: (filtered: Equipment[]) => void;
  onEquipmentSelect: (equipment: Equipment) => void;
  showCreateButton?: boolean;
  onCreateAsset?: () => void;
  onEditAsset?: (equipment: Equipment) => void;
  onDeleteAsset?: (equipment: Equipment) => void;
  // Props externas para controle a partir do pai
  externalSearchTerm?: string;
  externalViewMode?: 'grid' | 'list';
  externalShowFilters?: boolean;
  onExternalShowFiltersChange?: (show: boolean) => void;
  // Props de localização para hierarquia completa
  companies?: Company[];
  units?: Unit[];
  sectors?: Sector[];
  subsections?: SubSection[];
}

export function EquipmentSearch({ 
  equipment, 
  onFilteredResults, 
  onEquipmentSelect,
  showCreateButton = false,
  onCreateAsset,
  onEditAsset,
  onDeleteAsset,
  externalSearchTerm,
  externalViewMode,
  externalShowFilters,
  onExternalShowFiltersChange,
  companies = [],
  units = [],
  sectors = [],
  subsections = [],
}: EquipmentSearchProps) {
  const [internalSearchTerm, setInternalSearchTerm] = useState('');
  const [filters, setFilters] = useState<EquipmentFilter>({});
  const [internalShowFilters, setInternalShowFilters] = useState(false);
  const [internalViewMode, setInternalViewMode] = useState<'grid' | 'list'>('grid');
  
  // Usa valores externos se fornecidos, senão usa internos
  const searchTerm = externalSearchTerm !== undefined ? externalSearchTerm : internalSearchTerm;
  const setSearchTerm = externalSearchTerm !== undefined ? () => {} : setInternalSearchTerm;
  const viewMode = externalViewMode !== undefined ? externalViewMode : internalViewMode;
  const showFilters = externalShowFilters !== undefined ? externalShowFilters : internalShowFilters;
  const setShowFilters = onExternalShowFiltersChange !== undefined ? onExternalShowFiltersChange : setInternalShowFilters;

  // Helper para construir localização hierárquica completa
  const getFullLocation = (eq: Equipment): string => {
    const parts: string[] = [];
    
    // Encontrar setor
    const sector = sectors.find(s => s.id === eq.sectorId);
    
    // Encontrar unidade (via setor)
    const unit = sector ? units.find(u => u.id === sector.unitId) : null;
    
    // Encontrar empresa (via unidade)
    const company = unit ? companies.find(c => c.id === unit.companyId) : null;
    
    // Encontrar subsetor
    const subsection = eq.subSectionId ? subsections.find(ss => ss.id === eq.subSectionId) : null;
    
    if (company) parts.push(company.name);
    if (unit) parts.push(unit.name);
    if (sector) parts.push(sector.name);
    if (subsection) parts.push(subsection.name);
    
    return parts.length > 0 ? parts.join(' > ') : (eq.sectorName || eq.location || '');
  };

  // Get unique values for filter dropdowns
  const uniqueTypes = [...new Set(equipment.map(e => e.type))];
  const uniqueBrands = [...new Set(equipment.map(e => e.brand))];
  const uniqueStatuses = [...new Set(equipment.map(e => e.status))];

  // Calculate KPIs from equipment data
  const kpis = useMemo(() => {
    const total = equipment.length;
    const operational = equipment.filter(e => e.status === 'OK').length;
    const maintenance = equipment.filter(e => e.status === 'MAINTENANCE').length;
    const stopped = equipment.filter(e => e.status === 'STOPPED' || e.status === 'ALERT').length;
    const critical = equipment.filter(e => e.criticidade === 'CRITICA' || e.criticidade === 'ALTA').length;
    
    return {
      total,
      operational,
      maintenance,
      stopped,
      critical,
      operationalPercent: total > 0 ? Math.round((operational / total) * 100) : 0,
    };
  }, [equipment]);

  // Apply filters and search
  const filteredEquipment = useMemo(() => {
    let filtered = equipment;

    // Search term filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(eq => 
        eq.tag.toLowerCase().includes(term) ||
        eq.model.toLowerCase().includes(term) ||
        eq.brand.toLowerCase().includes(term) ||
        eq.type.toLowerCase().includes(term) ||
        eq.serialNumber?.toLowerCase().includes(term) ||
        eq.location?.toLowerCase().includes(term)
      );
    }

    // Type filter
    if (filters.type && filters.type.length > 0) {
      filtered = filtered.filter(eq => filters.type!.includes(eq.type));
    }

    // Status filter
    if (filters.status && filters.status.length > 0) {
      filtered = filtered.filter(eq => filters.status!.includes(eq.status));
    }

    // Brand filter
    if (filters.brand && filters.brand.length > 0) {
      filtered = filtered.filter(eq => filters.brand!.includes(eq.brand));
    }

    // Maintenance due filter
    if (filters.maintenanceDue) {
      const now = new Date();
      const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      
      filtered = filtered.filter(eq => {
        const maintenanceDate = new Date(eq.nextMaintenance);
        
        switch (filters.maintenanceDue) {
          case 'upcoming':
            return maintenanceDate > now && maintenanceDate <= sevenDaysFromNow;
          case 'overdue':
            return maintenanceDate < now;
          default:
            return true;
        }
      });
    }

    // Capacity filter
    if (filters.capacity) {
      if (filters.capacity.min) {
        filtered = filtered.filter(eq => eq.capacity >= filters.capacity!.min!);
      }
      if (filters.capacity.max) {
        filtered = filtered.filter(eq => eq.capacity <= filters.capacity!.max!);
      }
    }

    // Install date filter
    if (filters.installDate) {
      if (filters.installDate.from) {
        filtered = filtered.filter(eq => 
          new Date(eq.installDate) >= new Date(filters.installDate!.from!)
        );
      }
      if (filters.installDate.to) {
        filtered = filtered.filter(eq => 
          new Date(eq.installDate) <= new Date(filters.installDate!.to!)
        );
      }
    }

    return filtered;
  }, [equipment, searchTerm, filters]);

  // Notify parent of filtered results
  useEffect(() => {
    onFilteredResults(filteredEquipment);
  }, [filteredEquipment, onFilteredResults]);

  const clearFilters = () => {
    setFilters({});
    if (externalSearchTerm === undefined) {
      setInternalSearchTerm('');
    }
  };

  const hasActiveFilters = searchTerm || 
    filters.type?.length || 
    filters.status?.length || 
    filters.brand?.length || 
    filters.maintenanceDue ||
    filters.capacity?.min ||
    filters.capacity?.max ||
    filters.installDate?.from ||
    filters.installDate?.to;

  const getCriticidadeColor = (criticidade: Equipment['criticidade']) => {
    switch (criticidade) {
      case 'CRITICA': return 'bg-red-500';
      case 'ALTA': return 'bg-orange-500';
      case 'MEDIA': return 'bg-amber-500';
      case 'BAIXA': return 'bg-blue-500';
      default: return 'bg-gray-400';
    }
  };

  const getCriticidadeLabel = (criticidade: Equipment['criticidade']) => {
    switch (criticidade) {
      case 'CRITICA': return 'Crítica';
      case 'ALTA': return 'Alta';
      case 'MEDIA': return 'Média';
      case 'BAIXA': return 'Baixa';
      default: return criticidade;
    }
  };

  // Mapeamento de tipos de ativo para ícones e cores
  const getTypeIconConfig = (type: string): { icon: LucideIcon; color: string; bgColor: string } => {
    const typeUpper = type?.toUpperCase() || '';
    
    switch (typeUpper) {
      // Refrigeração
      case 'CHILLER':
        return { icon: Snowflake, color: 'text-cyan-500', bgColor: 'bg-cyan-500/10' };
      case 'VRF':
        return { icon: RefreshCw, color: 'text-indigo-500', bgColor: 'bg-indigo-500/10' };
      case 'SPLIT':
        return { icon: Wind, color: 'text-sky-500', bgColor: 'bg-sky-500/10' };
      case 'FAN_COIL':
      case 'FANCOIL':
      case 'FANCOLETE':
        return { icon: Wind, color: 'text-teal-500', bgColor: 'bg-teal-500/10' };
      case 'AHU':
      case 'CENTRAL':
        return { icon: Building2, color: 'text-blue-500', bgColor: 'bg-blue-500/10' };
      case 'RTU':
        return { icon: Server, color: 'text-slate-500', bgColor: 'bg-slate-500/10' };
      
      // Sistemas de água
      case 'COOLING_TOWER':
        return { icon: Droplets, color: 'text-blue-400', bgColor: 'bg-blue-400/10' };
      case 'PUMP':
        return { icon: Droplets, color: 'text-emerald-500', bgColor: 'bg-emerald-500/10' };
      case 'BOILER':
        return { icon: Flame, color: 'text-orange-500', bgColor: 'bg-orange-500/10' };
      
      // Controle e medição
      case 'SENSOR':
        return { icon: Thermometer, color: 'text-rose-500', bgColor: 'bg-rose-500/10' };
      case 'CONTROLLER':
        return { icon: Cpu, color: 'text-violet-500', bgColor: 'bg-violet-500/10' };
      case 'METER':
        return { icon: Gauge, color: 'text-amber-500', bgColor: 'bg-amber-500/10' };
      
      // Componentes
      case 'VALVE':
        return { icon: CircleDot, color: 'text-gray-500', bgColor: 'bg-gray-500/10' };
      case 'FILTER':
        return { icon: FilterIcon, color: 'text-lime-500', bgColor: 'bg-lime-500/10' };
      case 'DUCT':
        return { icon: Square, color: 'text-neutral-500', bgColor: 'bg-neutral-500/10' };
      
      // Padrão para tipos customizados
      default:
        return { icon: Package, color: 'text-primary', bgColor: 'bg-primary/10' };
    }
  };

  // Função auxiliar para renderizar o ícone
  const renderTypeIcon = (type: string, size: 'sm' | 'md' | 'lg' = 'md') => {
    const config = getTypeIconConfig(type);
    const Icon = config.icon;
    const sizeClass = size === 'sm' ? 'h-3.5 w-3.5' : size === 'lg' ? 'h-5 w-5' : 'h-4 w-4';
    
    return (
      <div className={cn('rounded-md flex items-center justify-center shrink-0', config.bgColor,
        size === 'sm' ? 'h-6 w-6' : size === 'lg' ? 'h-9 w-9' : 'h-7 w-7'
      )}>
        <Icon className={cn(sizeClass, config.color)} />
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {/* KPI Cards - Resumo Visual - mais compactos */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        <Card className="bg-card/50 border-0 shadow-sm">
          <CardContent className="p-2.5 sm:p-3">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Package className="h-3.5 w-3.5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider truncate">Total</p>
                <p className="text-lg font-bold">{kpis.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-0 shadow-sm">
          <CardContent className="p-2.5 sm:p-3">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider truncate">Operacionais</p>
                <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{kpis.operational}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-0 shadow-sm">
          <CardContent className="p-2.5 sm:p-3">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                <Wrench className="h-3.5 w-3.5 text-amber-500" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider truncate">Manutenção</p>
                <p className="text-lg font-bold text-amber-600 dark:text-amber-400">{kpis.maintenance}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-0 shadow-sm">
          <CardContent className="p-2.5 sm:p-3">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
                <XCircle className="h-3.5 w-3.5 text-red-500" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider truncate">Parados</p>
                <p className="text-lg font-bold text-red-600 dark:text-red-400">{kpis.stopped}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-0 shadow-sm col-span-2 sm:col-span-1">
          <CardContent className="p-2.5 sm:p-3">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-orange-500/10 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-3.5 w-3.5 text-orange-500" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider truncate">Críticos</p>
                <p className="text-lg font-bold text-orange-600 dark:text-orange-400">{kpis.critical}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search Bar and Filter Toggle - Oculto quando controle externo é usado */}
      {externalSearchTerm === undefined && (
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar por tag, modelo, marca ou série..."
            value={searchTerm}
            onChange={(e) => setInternalSearchTerm(e.target.value)}
            className="pl-8 h-8 text-sm bg-card border-0 shadow-sm"
          />
        </div>
        
        <div className="flex items-center gap-1.5">
          {/* Toggle View Mode */}
          <div className="flex border rounded-md p-0.5 bg-muted/30 shrink-0">
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => setInternalViewMode('grid')}
            >
              <LayoutGrid className="h-3 w-3" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => setInternalViewMode('list')}
            >
              <List className="h-3 w-3" />
            </Button>
          </div>

          <Popover open={showFilters} onOpenChange={setShowFilters}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1.5 border-0 shadow-sm bg-card text-xs">
                <Filter className="h-3 w-3" />
                <span className="hidden sm:inline">Filtros</span>
                {hasActiveFilters && (
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-3" align="end">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-medium">Filtros</h4>
                  {hasActiveFilters && (
                    <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={clearFilters}>
                      <X className="h-2.5 w-2.5 mr-1" />
                      Limpar
                    </Button>
                  )}
                </div>

                {/* Type Filter */}
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-medium text-muted-foreground uppercase">Tipo</Label>
                  <div className="grid grid-cols-2 gap-1">
                    {uniqueTypes.map(type => (
                      <div key={type} className="flex items-center space-x-1.5">
                        <Checkbox
                          id={`type-${type}`}
                          className="h-3.5 w-3.5"
                          checked={filters.type?.includes(type) || false}
                          onCheckedChange={(checked) => {
                            setFilters(prev => ({
                              ...prev,
                              type: checked
                                ? [...(prev.type || []), type]
                                : prev.type?.filter(t => t !== type) || []
                            }));
                          }}
                        />
                        <Label htmlFor={`type-${type}`} className="text-[11px]">
                          {type}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Status Filter */}
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-medium text-muted-foreground uppercase">Status</Label>
                  <div className="grid grid-cols-2 gap-1">
                    {uniqueStatuses.map(status => (
                      <div key={status} className="flex items-center space-x-1.5">
                        <Checkbox
                          id={`status-${status}`}
                          className="h-3.5 w-3.5"
                          checked={filters.status?.includes(status) || false}
                          onCheckedChange={(checked) => {
                            setFilters(prev => ({
                              ...prev,
                              status: checked
                                ? [...(prev.status || []), status]
                                : prev.status?.filter(s => s !== status) || []
                            }));
                          }}
                        />
                        <Label htmlFor={`status-${status}`} className="text-[11px] flex items-center">
                          <StatusBadge
                            status={status}
                            type="equipment"
                            size="sm"
                            showIcon
                            className="h-4 text-[10px] px-1.5"
                          />
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Brand Filter */}
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-medium text-muted-foreground uppercase">Marca</Label>
                  <div className="grid grid-cols-2 gap-1 max-h-20 overflow-y-auto">
                    {uniqueBrands.map(brand => (
                      <div key={brand} className="flex items-center space-x-1.5">
                        <Checkbox
                          id={`brand-${brand}`}
                          className="h-3.5 w-3.5"
                          checked={filters.brand?.includes(brand) || false}
                          onCheckedChange={(checked) => {
                            setFilters(prev => ({
                              ...prev,
                              brand: checked
                                ? [...(prev.brand || []), brand]
                                : prev.brand?.filter(b => b !== brand) || []
                            }));
                          }}
                        />
                        <Label htmlFor={`brand-${brand}`} className="text-[11px] truncate">
                          {brand}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Maintenance Due Filter */}
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-medium text-muted-foreground uppercase">Manutenção</Label>
                  <Select
                    value={filters.maintenanceDue || 'all'}
                    onValueChange={(value) => 
                      setFilters(prev => ({
                        ...prev,
                        maintenanceDue: value === 'all' ? undefined : value as any
                      }))
                    }
                  >
                    <SelectTrigger className="h-7 text-[11px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      <SelectItem value="upcoming">Próximas (7 dias)</SelectItem>
                      <SelectItem value="overdue">Em Atraso</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Capacity Range Filter */}
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-medium text-muted-foreground uppercase">Capacidade (BTUs)</Label>
                  <div className="flex gap-1.5">
                    <Input
                      type="number"
                      placeholder="Mín"
                      className="h-7 text-[11px]"
                      value={filters.capacity?.min || ''}
                      onChange={(e) => 
                        setFilters(prev => ({
                          ...prev,
                          capacity: {
                            ...prev.capacity,
                            min: e.target.value ? parseInt(e.target.value) : undefined
                          }
                        }))
                      }
                    />
                    <Input
                      type="number"
                      placeholder="Máx"
                      className="h-7 text-[11px]"
                      value={filters.capacity?.max || ''}
                      onChange={(e) => 
                        setFilters(prev => ({
                          ...prev,
                          capacity: {
                            ...prev.capacity,
                            max: e.target.value ? parseInt(e.target.value) : undefined
                          }
                        }))
                      }
                    />
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
          
          {/* Botão para criar novo ativo */}
          {showCreateButton && onCreateAsset && (
            <Button 
              onClick={onCreateAsset} 
              size="sm"
              className="h-8 gap-1.5 text-xs"
              data-testid="create-asset-button"
            >
              <Plus className="h-3 w-3" />
              <span className="hidden sm:inline">Novo Ativo</span>
            </Button>
          )}
          
          {hasActiveFilters && (
            <Button variant="ghost" size="icon" onClick={clearFilters} className="h-8 w-8">
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
      )}

      {/* Results Count and Active Filters - Compact inline display */}
      <div className="flex flex-wrap items-center gap-2 text-[11px]">
        <span className="text-muted-foreground">
          <span className="font-semibold text-foreground">{filteredEquipment.length}</span> {filteredEquipment.length === 1 ? 'ativo' : 'ativos'}
        </span>
        {hasActiveFilters && (
          <>
            <span className="text-muted-foreground/50">•</span>
            <div className="flex flex-wrap gap-1">
              {searchTerm && (
                <Badge variant="secondary" className="h-4 text-[10px] gap-0.5 pr-0.5">
                  {searchTerm}
                  <button
                    className="ml-0.5 rounded-full hover:bg-muted-foreground/20 p-0.5"
                    onClick={() => setSearchTerm('')}
                  >
                    <X className="h-2 w-2" />
                  </button>
                </Badge>
              )}
              {filters.type?.map(type => (
                <Badge key={type} variant="secondary" className="h-4 text-[10px] gap-0.5 pr-0.5">
                  {type}
                  <button
                    className="ml-0.5 rounded-full hover:bg-muted-foreground/20 p-0.5"
                    onClick={() => setFilters(prev => ({
                      ...prev,
                      type: prev.type?.filter(t => t !== type)
                    }))}
                  >
                    <X className="h-2 w-2" />
                  </button>
                </Badge>
              ))}
              {filters.status?.map(status => (
                <div key={status} className="relative inline-flex items-center">
                  <StatusBadge
                    status={status}
                    type="equipment"
                    size="sm"
                    className="h-4 text-[10px] pr-5"
                  />
                  <button
                    className="absolute right-1 rounded-full hover:bg-muted-foreground/20 p-0.5"
                    onClick={() => setFilters(prev => ({
                      ...prev,
                      status: prev.status?.filter(s => s !== status)
                    }))}
                  >
                    <X className="h-2 w-2" />
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Equipment Results */}
      <TooltipProvider>
        <div className={cn(
          viewMode === 'grid' 
            ? "grid gap-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5"
            : "flex flex-col gap-1"
        )}>
          {filteredEquipment.map(eq => {
            if (viewMode === 'list') {
              // List View - Compact Row
              return (
                <Card 
                  key={eq.id}
                  className="cursor-pointer hover:bg-accent/50 transition-colors border-0 bg-card/50 shadow-sm"
                  onClick={() => onEquipmentSelect(eq)}
                >
                  <CardContent className="p-2">
                    <div className="flex items-center gap-2.5">
                      {/* Criticidade indicator */}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className={cn("w-0.5 h-8 rounded-full", getCriticidadeColor(eq.criticidade))} />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Criticidade: {getCriticidadeLabel(eq.criticidade)}</p>
                        </TooltipContent>
                      </Tooltip>

                      {/* Type Icon */}
                      {renderTypeIcon(eq.type, 'sm')}

                      {/* Main Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm truncate">{eq.tag}</span>
                          <Badge variant="outline" className="text-[10px] h-4 px-1.5 shrink-0">{eq.type}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{eq.brand} {eq.model}</p>
                      </div>

                      {/* Location - Hierarquia completa */}
                      {(() => {
                        const fullLocation = getFullLocation(eq);
                        return fullLocation && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="hidden lg:flex items-center gap-1 text-xs text-muted-foreground max-w-[200px]">
                                <MapPin className="h-3 w-3 shrink-0" />
                                <span className="truncate">{fullLocation}</span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs">
                              <p className="text-xs">{fullLocation}</p>
                            </TooltipContent>
                          </Tooltip>
                        );
                      })()}

                      {/* Status Badge */}
                      <StatusBadge
                        status={eq.status}
                        type="equipment"
                        size="sm"
                        showIcon
                        className="shrink-0 text-[10px] h-5 px-1.5"
                      />

                      {/* Actions */}
                      {onEditAsset && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditAsset(eq);
                          }}
                          title="Editar ativo"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {onDeleteAsset && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteAsset(eq);
                          }}
                          title="Excluir ativo"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            }

            // Grid View - Card
            return (
              <Card 
                key={eq.id}
                className={cn(
                  "group cursor-pointer transition-all duration-200",
                  "hover:shadow-md hover:border-primary/30 hover:-translate-y-0.5",
                  "relative overflow-hidden border-0 bg-card/50 shadow-sm"
                )}
                onClick={() => onEquipmentSelect(eq)}
              >
                {/* Criticidade indicator bar */}
                <div className={cn(
                  "absolute top-0 left-0 right-0 h-0.5",
                  getCriticidadeColor(eq.criticidade)
                )} />

                <CardHeader className="pb-2 pt-3 px-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {renderTypeIcon(eq.type, 'md')}
                      <div className="min-w-0">
                        <CardTitle className="text-sm font-medium truncate">{eq.tag}</CardTitle>
                        <p className="text-xs text-muted-foreground truncate">{eq.brand} {eq.model}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {onEditAsset && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditAsset(eq);
                          }}
                          title="Editar ativo"
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                      )}
                      {onDeleteAsset && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteAsset(eq);
                          }}
                          title="Excluir ativo"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-2 pb-3 px-3">
                  {/* Info Grid */}
                  <div className="grid grid-cols-2 gap-1.5 text-xs">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Zap className="h-3 w-3" />
                          <span className="truncate">{typeof eq.capacity === 'number' ? eq.capacity.toLocaleString('pt-BR') : 'N/A'} BTUs</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>Capacidade</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span className="truncate">{eq.installDate ? new Date(eq.installDate).toLocaleDateString('pt-BR') : 'N/A'}</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>Data de Instalação</TooltipContent>
                    </Tooltip>

                    {/* Location - Hierarquia completa */}
                    {(() => {
                      const fullLocation = getFullLocation(eq);
                      return fullLocation && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-1 text-muted-foreground col-span-2">
                              <MapPin className="h-3 w-3 shrink-0" />
                              <span className="truncate">{fullLocation}</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-xs">
                            <p className="text-xs">{fullLocation}</p>
                          </TooltipContent>
                        </Tooltip>
                      );
                    })()}
                  </div>
                  
                  {/* Footer with Status and Criticidade */}
                  <div className="flex items-center justify-between pt-2 border-t gap-2">
                    <StatusBadge
                      status={eq.status}
                      type="equipment"
                      size="sm"
                      className="text-[10px] h-5 px-1.5"
                    />
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-1">
                          <div className={cn("w-1.5 h-1.5 rounded-full", getCriticidadeColor(eq.criticidade))} />
                          <span className="text-[10px] text-muted-foreground">{getCriticidadeLabel(eq.criticidade)}</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>Nível de Criticidade</TooltipContent>
                    </Tooltip>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </TooltipProvider>

      {filteredEquipment.length === 0 && (
        <Card className="border-dashed border">
          <CardContent className="flex flex-col items-center justify-center py-12 px-6">
            <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center mb-3">
              <Package className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-sm font-semibold mb-1">Nenhum ativo encontrado</h3>
            <p className="text-xs text-muted-foreground text-center max-w-xs mb-4">
              {hasActiveFilters 
                ? 'Nenhum ativo corresponde aos filtros aplicados.'
                : 'Comece cadastrando o primeiro ativo deste local.'}
            </p>
            <div className="flex gap-2">
              {hasActiveFilters && (
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  <X className="h-3.5 w-3.5 mr-1.5" />
                  Limpar Filtros
                </Button>
              )}
              {showCreateButton && onCreateAsset && (
                <Button size="sm" onClick={onCreateAsset}>
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                  Cadastrar Ativo
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
