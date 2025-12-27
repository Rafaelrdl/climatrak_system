import { useState, useMemo, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { 
  Search, 
  Filter, 
  X, 
  AlertCircle, 
  Clock, 
  Wrench,
  MapPin,
  Calendar,
  Zap,
  Settings,
  Plus,
  Pencil
} from 'lucide-react';
import type { Equipment, EquipmentFilter } from '@/types';

interface EquipmentSearchProps {
  equipment: Equipment[];
  selectedLocation?: string;
  onFilteredResults: (filtered: Equipment[]) => void;
  onEquipmentSelect: (equipment: Equipment) => void;
  showCreateButton?: boolean;
  onCreateAsset?: () => void;
  onEditAsset?: (equipment: Equipment) => void;
}

export function EquipmentSearch({ 
  equipment, 
  selectedLocation,
  onFilteredResults, 
  onEquipmentSelect,
  showCreateButton = false,
  onCreateAsset,
  onEditAsset
}: EquipmentSearchProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<EquipmentFilter>({});
  const [showFilters, setShowFilters] = useState(false);

  // Get unique values for filter dropdowns
  const uniqueTypes = [...new Set(equipment.map(e => e.type))];
  const uniqueBrands = [...new Set(equipment.map(e => e.brand))];
  const uniqueStatuses = [...new Set(equipment.map(e => e.status))];

  // Helper function to extract original ID from unique node ID
  const extractOriginalId = (nodeId: string, type: 'sector' | 'subsection'): string | null => {
    if (!nodeId) return null;
    
    // Extract original sector ID from format like "company-1-sector-2"
    if (type === 'sector' && nodeId.includes('sector-')) {
      const match = nodeId.match(/sector-(\d+)(?:-|$)/);
      return match ? match[1] : null;
    }
    
    // Extract original subsection ID from format like "company-1-sector-2-subsection-3" 
    if (type === 'subsection' && nodeId.includes('subsection-')) {
      const match = nodeId.match(/subsection-(\d+)$/);
      return match ? match[1] : null;
    }
    
    return null;
  };

  // Apply filters and search
  const filteredEquipment = useMemo(() => {
    let filtered = equipment;

    // Location filter (if selectedLocation is provided)
    if (selectedLocation) {

      
      // Extract original IDs from the unique node ID
      const originalSectorId = extractOriginalId(selectedLocation, 'sector');
      const originalSubsectionId = extractOriginalId(selectedLocation, 'subsection');
      

      
      filtered = filtered.filter(eq => {
        // Log equipment details for debugging

        
        // If selectedLocation is a subsection node, match equipment's subSectionId  
        if (originalSubsectionId) {
          const match = eq.subSectionId === originalSubsectionId;

          return match;
        }
        
        // If selectedLocation is a sector node, match equipment's sectorId
        if (originalSectorId && !selectedLocation.includes('subsection-')) {
          const match = eq.sectorId === originalSectorId;

          return match;
        }
        
        // If selectedLocation is a company node, show all equipment from that company
        // Company nodes format: "company-4"
        if (selectedLocation.includes('company-') && !selectedLocation.includes('sector-')) {
          const companyMatch = selectedLocation.match(/company-(\d+)$/);
          if (companyMatch) {
            const companyId = companyMatch[1];
            // Use equipment's companyId directly instead of looking up in MOCK_SECTORS
            const match = eq.companyId === companyId;

            return match;
          }
        }
        
        return false;
      });
    }

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
  }, [equipment, selectedLocation, searchTerm, filters]);

  // Notify parent of filtered results
  useEffect(() => {
    onFilteredResults(filteredEquipment);
  }, [filteredEquipment, onFilteredResults]);

  const clearFilters = () => {
    setFilters({});
    setSearchTerm('');
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

  const getStatusIcon = (status: Equipment['status']) => {
    switch (status) {
      case 'FUNCTIONING': return <Zap className="h-4 w-4 text-green-500" />;
      case 'MAINTENANCE': return <Wrench className="h-4 w-4 text-yellow-500" />;
      case 'STOPPED': return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getMaintenanceStatus = (equipment: Equipment) => {
    const maintenanceDate = new Date(equipment.nextMaintenance);
    const now = new Date();
    const diffDays = Math.ceil((maintenanceDate.getTime() - now.getTime()) / (1000 * 3600 * 24));
    
    if (diffDays < 0) {
      return { status: 'overdue', text: `${Math.abs(diffDays)}d overdue`, variant: 'destructive' as const };
    } else if (diffDays <= 7) {
      return { status: 'upcoming', text: `${diffDays}d remaining`, variant: 'outline' as const };
    } else {
      return { status: 'scheduled', text: `${diffDays}d remaining`, variant: 'secondary' as const };
    }
  };

  return (
    <div className="space-y-4">
      {/* Search Bar and Filter Toggle */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por tag, modelo, marca, tipo ou número de série..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Popover open={showFilters} onOpenChange={setShowFilters}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="whitespace-nowrap">
                <Filter className="h-4 w-4 mr-2" />
                Filtros
                {hasActiveFilters && (
                  <Badge className="ml-2 h-5 w-5 p-0 text-xs">!</Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-96 p-6" align="end">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Filtros Avançados</h4>
                  {hasActiveFilters && (
                    <Button variant="ghost" size="sm" onClick={clearFilters}>
                      <X className="h-4 w-4 mr-1" />
                      Limpar
                    </Button>
                  )}
                </div>

                {/* Type Filter */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Tipo de Equipamento</Label>
                  <div className="space-y-2">
                    {uniqueTypes.map(type => (
                      <div key={type} className="flex items-center space-x-2">
                        <Checkbox
                          id={`type-${type}`}
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
                        <Label htmlFor={`type-${type}`} className="text-sm">
                          {type}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Status Filter */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Status</Label>
                  <div className="space-y-2">
                    {uniqueStatuses.map(status => (
                      <div key={status} className="flex items-center space-x-2">
                        <Checkbox
                          id={`status-${status}`}
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
                        <Label htmlFor={`status-${status}`} className="text-sm flex items-center gap-2">
                          {getStatusIcon(status)}
                          {status === 'FUNCTIONING' ? 'Funcionando' : 
                           status === 'MAINTENANCE' ? 'Em Manutenção' : 'Parado'}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Brand Filter */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Marca</Label>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {uniqueBrands.map(brand => (
                      <div key={brand} className="flex items-center space-x-2">
                        <Checkbox
                          id={`brand-${brand}`}
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
                        <Label htmlFor={`brand-${brand}`} className="text-sm">
                          {brand}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Maintenance Due Filter */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Manutenção</Label>
                  <Select
                    value={filters.maintenanceDue || 'all'}
                    onValueChange={(value) => 
                      setFilters(prev => ({
                        ...prev,
                        maintenanceDue: value === 'all' ? undefined : value as any
                      }))
                    }
                  >
                    <SelectTrigger>
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
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Capacidade (BTUs)</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="Mín"
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
              className="flex items-center gap-2"
              data-testid="create-asset-button"
            >
              <Plus className="h-4 w-4" />
              Ativo
            </Button>
          )}
          
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Results Count and Active Filters */}
      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
        <span>{filteredEquipment.length} equipamentos encontrados</span>
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2">
            {searchTerm && (
              <Badge variant="secondary">
                Busca: {searchTerm}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 ml-1"
                  onClick={() => setSearchTerm('')}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            )}
            {filters.type?.map(type => (
              <Badge key={type} variant="secondary">
                Tipo: {type}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 ml-1"
                  onClick={() => setFilters(prev => ({
                    ...prev,
                    type: prev.type?.filter(t => t !== type)
                  }))}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            ))}
            {filters.status?.map(status => (
              <Badge key={status} variant="secondary">
                Status: {status === 'FUNCTIONING' ? 'Funcionando' : 
                        status === 'MAINTENANCE' ? 'Em Manutenção' : 'Parado'}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 ml-1"
                  onClick={() => setFilters(prev => ({
                    ...prev,
                    status: prev.status?.filter(s => s !== status)
                  }))}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Equipment Results */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredEquipment.map(eq => {
          const maintenanceStatus = getMaintenanceStatus(eq);
          
          return (
            <Card 
              key={eq.id}
              className="location-card cursor-pointer hover:shadow-md transition-all"
              onClick={() => onEquipmentSelect(eq)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{eq.tag}</CardTitle>
                  <div className="flex items-center gap-2">
                    {onEditAsset && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditAsset(eq);
                        }}
                        title="Editar equipamento"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                    {getStatusIcon(eq.status)}
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  {eq.brand} {eq.model}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Settings className="h-4 w-4 text-muted-foreground" />
                      <span>{eq.type}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-muted-foreground" />
                      <span>{typeof eq.capacity === 'number' ? eq.capacity.toLocaleString('pt-BR') : 'N/A'} BTUs</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>{eq.installDate ? new Date(eq.installDate).toLocaleDateString('pt-BR') : 'N/A'}</span>
                    </div>
                    {eq.location && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="truncate">{eq.location}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center justify-between pt-2 border-t">
                  <Badge variant={maintenanceStatus.variant}>
                    <Clock className="h-3 w-3 mr-1" />
                    {maintenanceStatus.text}
                  </Badge>
                  <Badge variant={
                    eq.status === 'FUNCTIONING' ? 'default' :
                    eq.status === 'MAINTENANCE' ? 'secondary' : 'destructive'
                  }>
                    {eq.status === 'FUNCTIONING' ? 'Funcionando' : 
                     eq.status === 'MAINTENANCE' ? 'Em Manutenção' : 'Parado'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredEquipment.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">Nenhum equipamento encontrado</h3>
            <p className="text-muted-foreground mb-4">
              Tente ajustar os filtros de pesquisa ou adicionar novos equipamentos.
            </p>
            {hasActiveFilters && (
              <Button variant="outline" onClick={clearFilters}>
                <X className="h-4 w-4 mr-2" />
                Limpar Filtros
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}