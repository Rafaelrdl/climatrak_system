import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ProcedureCategory, ProcedureStatus } from '@/models/procedure';

interface ProcedureFiltersProps {
  categories: ProcedureCategory[];
  selectedCategory?: string;
  selectedStatus?: ProcedureStatus | 'Todos';
  searchQuery?: string;
  onCategoryChange: (categoryId: string | null) => void;
  onStatusChange: (status: ProcedureStatus | 'Todos') => void;
  onSearchChange: (query: string) => void;
  onReset: () => void;
}

export function ProcedureFilters({
  categories,
  selectedCategory,
  selectedStatus = 'Todos',
  searchQuery = '',
  onCategoryChange,
  onStatusChange,
  onSearchChange,
  onReset,
}: ProcedureFiltersProps) {
  const hasActiveFilters = selectedCategory || selectedStatus !== 'Todos' || searchQuery;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por título, descrição, tags..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
            aria-label="Buscar procedimentos"
          />
        </div>

        {/* Filters */}
        <div className="flex gap-2 items-center">
          {/* Category Filter */}
          <Select
            value={selectedCategory || 'todos'}
            onValueChange={(value) => onCategoryChange(value === 'todos' ? null : value)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas as categorias</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  <div className="flex items-center gap-2">
                    {category.color && (
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: category.color }}
                        aria-hidden="true"
                      />
                    )}
                    {category.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Status Filter */}
          <Select
            value={selectedStatus}
            onValueChange={(value) => onStatusChange(value as ProcedureStatus | 'Todos')}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Todos">Todos</SelectItem>
              <SelectItem value="Ativo">
                <Badge variant="default">Ativo</Badge>
              </SelectItem>
              <SelectItem value="Inativo">
                <Badge variant="secondary">Inativo</Badge>
              </SelectItem>
            </SelectContent>
          </Select>

          {/* Reset Filters */}
          {hasActiveFilters && (
            <Button variant="outline" size="sm" onClick={onReset}>
              Limpar filtros
            </Button>
          )}
        </div>
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-sm text-muted-foreground">Filtros ativos:</span>
          
          {selectedCategory && (
            <Badge variant="secondary" className="gap-1">
              Categoria: {categories.find(c => c.id === selectedCategory)?.name}
              <button
                onClick={() => onCategoryChange(null)}
                className="ml-1 hover:bg-secondary-foreground/20 rounded-full p-0.5"
                aria-label="Remover filtro de categoria"
              >
                ×
              </button>
            </Badge>
          )}
          
          {selectedStatus !== 'Todos' && (
            <Badge variant="secondary" className="gap-1">
              Status: {selectedStatus}
              <button
                onClick={() => onStatusChange('Todos')}
                className="ml-1 hover:bg-secondary-foreground/20 rounded-full p-0.5"
                aria-label="Remover filtro de status"
              >
                ×
              </button>
            </Badge>
          )}
          
          {searchQuery && (
            <Badge variant="secondary" className="gap-1">
              Busca: "{searchQuery}"
              <button
                onClick={() => onSearchChange('')}
                className="ml-1 hover:bg-secondary-foreground/20 rounded-full p-0.5"
                aria-label="Limpar busca"
              >
                ×
              </button>
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}