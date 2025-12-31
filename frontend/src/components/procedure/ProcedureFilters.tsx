import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { FilterBar } from '@/shared/ui';
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
  const activeFiltersCount = [
    selectedCategory ? 1 : 0,
    selectedStatus !== 'Todos' ? 1 : 0,
    searchQuery ? 1 : 0,
  ].reduce((sum, count) => sum + count, 0);

  const hasActiveFilters = activeFiltersCount > 0;

  return (
    <FilterBar
      title="Filtros"
      count={activeFiltersCount}
      onClear={onReset}
      footer={hasActiveFilters ? (
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-sm text-muted-foreground">Filtros ativos:</span>
          {selectedCategory && (
            <Badge variant="secondary" className="gap-1">
              Categoria: {categories.find((category) => category.id === selectedCategory)?.name}
              <button
                type="button"
                onClick={() => onCategoryChange(null)}
                className="ml-1 hover:bg-secondary-foreground/20 rounded-full p-0.5"
                aria-label="Remover filtro de categoria"
              >
                x
              </button>
            </Badge>
          )}
          {selectedStatus !== 'Todos' && (
            <Badge variant="secondary" className="gap-1">
              Status: {selectedStatus}
              <button
                type="button"
                onClick={() => onStatusChange('Todos')}
                className="ml-1 hover:bg-secondary-foreground/20 rounded-full p-0.5"
                aria-label="Remover filtro de status"
              >
                x
              </button>
            </Badge>
          )}
          {searchQuery && (
            <Badge variant="secondary" className="gap-1">
              Busca: "{searchQuery}"
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="ml-1 hover:bg-secondary-foreground/20 rounded-full p-0.5"
                aria-label="Limpar busca"
              >
                x
              </button>
            </Badge>
          )}
        </div>
      ) : null}
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por titulo, descricao, tags..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
            aria-label="Buscar procedimentos"
          />
        </div>

        <div className="flex gap-2 items-center">
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
        </div>
      </div>
    </FilterBar>
  );
}
