import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, FilterX, Filter } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { SolicitationStatus } from '@/types';

export interface SolicitationFilters {
  status?: SolicitationStatus[];
  dateRange?: {
    from?: Date;
    to?: Date;
  };
  equipment?: string;
  location?: string;
  requester?: string;
}

interface SolicitationFiltersProps {
  filters: SolicitationFilters;
  onFiltersChange: (filters: SolicitationFilters) => void;
  equipmentOptions: { id: string; name: string }[];
  locationOptions: { id: string; name: string }[];
  requesterOptions: { id: string; name: string }[];
}

export function SolicitationFilters({
  filters,
  onFiltersChange,
  equipmentOptions,
  locationOptions,
  requesterOptions
}: SolicitationFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dateFrom, setDateFrom] = useState<Date | undefined>(filters.dateRange?.from);
  const [dateTo, setDateTo] = useState<Date | undefined>(filters.dateRange?.to);

  const statusOptions: { value: SolicitationStatus; label: string; color: string }[] = [
    { value: 'Nova', label: 'Nova', color: 'bg-blue-100 text-blue-800' },
    { value: 'Em triagem', label: 'Em Triagem', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'Convertida em OS', label: 'Convertida em OS', color: 'bg-green-100 text-green-800' }
  ];

  const handleStatusToggle = (status: SolicitationStatus) => {
    const currentStatuses = filters.status || [];
    const newStatuses = currentStatuses.includes(status)
      ? currentStatuses.filter(s => s !== status)
      : [...currentStatuses, status];
    
    onFiltersChange({
      ...filters,
      status: newStatuses.length > 0 ? newStatuses : undefined
    });
  };

  const handleDateRangeChange = () => {
    onFiltersChange({
      ...filters,
      dateRange: (dateFrom || dateTo) ? {
        from: dateFrom,
        to: dateTo
      } : undefined
    });
  };

  const clearAllFilters = () => {
    setDateFrom(undefined);
    setDateTo(undefined);
    onFiltersChange({});
  };

  const activeFiltersCount = [
    filters.status?.length ? 1 : 0,
    filters.dateRange ? 1 : 0,
    filters.equipment ? 1 : 0,
    filters.location ? 1 : 0,
    filters.requester ? 1 : 0
  ].reduce((sum, count) => sum + count, 0);

  return (
    <div className="mb-6">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button 
            variant="outline" 
            className={cn(
              "gap-2 h-10",
              activeFiltersCount > 0 && "border-primary bg-primary/5"
            )}
          >
            <Filter className="h-4 w-4" />
            Filtros
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                {activeFiltersCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="start">
          <Card className="border-0 shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-base">
                Filtros Avançados
                {activeFiltersCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearAllFilters}
                    className="h-8 px-2 text-xs"
                  >
                    <FilterX className="h-3 w-3 mr-1" />
                    Limpar
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Status Filter */}
              <div>
                <Label className="text-sm font-medium">Status</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {statusOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleStatusToggle(option.value)}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                        filters.status?.includes(option.value)
                          ? option.color
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date Range Filter */}
              <div>
                <Label className="text-sm font-medium">Período</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className={cn(
                          "justify-start text-left font-normal h-9",
                          !dateFrom && "text-muted-foreground"
                        )}
                      >
                        <Calendar className="mr-2 h-3 w-3" />
                        {dateFrom ? format(dateFrom, "dd/MM/yyyy", { locale: ptBR }) : "De"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={dateFrom}
                        onSelect={(date) => {
                          setDateFrom(date);
                          setTimeout(handleDateRangeChange, 100);
                        }}
                        disabled={(date) =>
                          date > new Date() || (dateTo && date > dateTo)
                        }
                        initialFocus
                        locale={ptBR}
                      />
                    </PopoverContent>
                  </Popover>

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className={cn(
                          "justify-start text-left font-normal h-9",
                          !dateTo && "text-muted-foreground"
                        )}
                      >
                        <Calendar className="mr-2 h-3 w-3" />
                        {dateTo ? format(dateTo, "dd/MM/yyyy", { locale: ptBR }) : "Até"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={dateTo}
                        onSelect={(date) => {
                          setDateTo(date);
                          setTimeout(handleDateRangeChange, 100);
                        }}
                        disabled={(date) =>
                          date > new Date() || (dateFrom && date < dateFrom)
                        }
                        initialFocus
                        locale={ptBR}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Equipment Filter */}
              <div>
                <Label htmlFor="equipment-filter" className="text-sm font-medium">
                  Equipamento
                </Label>
                <Select
                  value={filters.equipment || 'all'}
                  onValueChange={(value) => onFiltersChange({
                    ...filters,
                    equipment: value === 'all' ? undefined : value
                  })}
                >
                  <SelectTrigger id="equipment-filter" className="h-9">
                    <SelectValue placeholder="Todos os equipamentos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os equipamentos</SelectItem>
                    {equipmentOptions.map((equipment) => (
                      <SelectItem key={equipment.id} value={equipment.id}>
                        {equipment.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Location Filter */}
              <div>
                <Label htmlFor="location-filter" className="text-sm font-medium">
                  Localização
                </Label>
                <Select
                  value={filters.location || 'all'}
                  onValueChange={(value) => onFiltersChange({
                    ...filters,
                    location: value === 'all' ? undefined : value
                  })}
                >
                  <SelectTrigger id="location-filter" className="h-9">
                    <SelectValue placeholder="Todas as localizações" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as localizações</SelectItem>
                    {locationOptions.map((location) => (
                      <SelectItem key={location.id} value={location.id}>
                        {location.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Requester Filter */}
              <div>
                <Label htmlFor="requester-filter" className="text-sm font-medium">
                  Solicitante
                </Label>
                <Select
                  value={filters.requester || 'all'}
                  onValueChange={(value) => onFiltersChange({
                    ...filters,
                    requester: value === 'all' ? undefined : value
                  })}
                >
                  <SelectTrigger id="requester-filter" className="h-9">
                    <SelectValue placeholder="Todos os solicitantes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os solicitantes</SelectItem>
                    {requesterOptions.map((requester) => (
                      <SelectItem key={requester.id} value={requester.id}>
                        {requester.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </PopoverContent>
      </Popover>
    </div>
  );
}