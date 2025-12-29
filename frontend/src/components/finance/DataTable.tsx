/**
 * DataTable Component (Finance)
 * 
 * Tabela com paginação server-side, filtros e sort.
 * Baseado em: docs/frontend/finance/03-componentes-base.md
 */

import { useState, useMemo, type ReactNode } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Loader2,
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

// ==================== Types ====================

export interface Column<T> {
  /** Identificador único da coluna */
  id: string;
  /** Cabeçalho da coluna */
  header: string | ReactNode;
  /** Acessor para o valor da célula */
  accessorKey?: keyof T;
  /** Função custom para renderizar célula */
  cell?: (row: T) => ReactNode;
  /** Largura fixa ou mínima */
  width?: string | number;
  /** Alinhamento */
  align?: 'left' | 'center' | 'right';
  /** Permitir ordenação */
  sortable?: boolean;
  /** Classes adicionais para header */
  headerClassName?: string;
  /** Classes adicionais para célula */
  cellClassName?: string;
}

export interface SortState {
  column: string;
  direction: 'asc' | 'desc';
}

export interface PaginationState {
  page: number;
  pageSize: number;
}

export interface DataTableProps<T> {
  /** Colunas da tabela */
  columns: Column<T>[];
  /** Dados a exibir */
  data: T[];
  /** Total de itens (para paginação server-side) */
  total?: number;
  /** Estado de carregamento */
  isLoading?: boolean;
  /** Paginação atual */
  pagination?: PaginationState;
  /** Callback quando paginação muda */
  onPaginationChange?: (pagination: PaginationState) => void;
  /** Ordenação atual */
  sort?: SortState | null;
  /** Callback quando ordenação muda */
  onSortChange?: (sort: SortState | null) => void;
  /** Opções de tamanho de página */
  pageSizeOptions?: number[];
  /** Função para obter ID único da linha */
  getRowId?: (row: T) => string;
  /** Callback ao clicar em uma linha */
  onRowClick?: (row: T) => void;
  /** Mensagem quando não há dados */
  emptyMessage?: string;
  /** Classes CSS adicionais */
  className?: string;
  /** Renderizar slot de filtros (acima da tabela) */
  filters?: ReactNode;
  /** Sticky header */
  stickyHeader?: boolean;
}

// ==================== Component ====================

export function DataTable<T extends object>({
  columns,
  data,
  total,
  isLoading = false,
  pagination,
  onPaginationChange,
  sort,
  onSortChange,
  pageSizeOptions = [10, 20, 50, 100],
  getRowId,
  onRowClick,
  emptyMessage = 'Nenhum registro encontrado',
  className,
  filters,
  stickyHeader = false,
}: DataTableProps<T>) {
  // Local pagination state if not controlled
  const [localPagination, setLocalPagination] = useState<PaginationState>({
    page: 1,
    pageSize: 10,
  });

  const paginationState = pagination ?? localPagination;
  const handlePaginationChange = onPaginationChange ?? setLocalPagination;

  const totalItems = total ?? data.length;
  const totalPages = Math.ceil(totalItems / paginationState.pageSize);

  // Slice data locally if no server-side pagination
  const displayData = useMemo(() => {
    if (pagination) {
      // Server-side: data já vem paginada
      return data;
    }
    // Client-side: aplicar paginação local
    const start = (localPagination.page - 1) * localPagination.pageSize;
    return data.slice(start, start + localPagination.pageSize);
  }, [data, pagination, localPagination]);

  // Sorting handler
  const handleSort = (columnId: string) => {
    if (!onSortChange) return;
    
    if (sort?.column === columnId) {
      if (sort.direction === 'asc') {
        onSortChange({ column: columnId, direction: 'desc' });
      } else {
        onSortChange(null);
      }
    } else {
      onSortChange({ column: columnId, direction: 'asc' });
    }
  };

  // Pagination handlers
  const goToPage = (page: number) => {
    handlePaginationChange({ ...paginationState, page });
  };

  const setPageSize = (pageSize: number) => {
    handlePaginationChange({ page: 1, pageSize });
  };

  // Render sort icon
  const renderSortIcon = (columnId: string) => {
    if (sort?.column !== columnId) {
      return <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />;
    }
    return sort.direction === 'asc' 
      ? <ArrowUp className="ml-1 h-3 w-3" />
      : <ArrowDown className="ml-1 h-3 w-3" />;
  };

  // Render loading skeleton
  const renderSkeleton = () => (
    <>
      {Array.from({ length: paginationState.pageSize }).map((_, idx) => (
        <TableRow key={idx}>
          {columns.map((col) => (
            <TableCell key={col.id}>
              <Skeleton className="h-4 w-full" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );

  // Render cell value
  const renderCell = (row: T, column: Column<T>): ReactNode => {
    if (column.cell) {
      return column.cell(row);
    }
    if (column.accessorKey) {
      const value = row[column.accessorKey];
      if (value === null || value === undefined) return '—';
      return String(value);
    }
    return null;
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Filters slot */}
      {filters && <div className="flex flex-wrap gap-2">{filters}</div>}

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader className={cn(stickyHeader && 'sticky top-0 bg-background z-10')}>
            <TableRow>
              {columns.map((column) => (
                <TableHead
                  key={column.id}
                  style={{ width: column.width }}
                  className={cn(
                    column.align === 'center' && 'text-center',
                    column.align === 'right' && 'text-right',
                    column.sortable && 'cursor-pointer select-none hover:bg-muted/50',
                    column.headerClassName
                  )}
                  onClick={() => column.sortable && handleSort(column.id)}
                >
                  <div className={cn(
                    'flex items-center',
                    column.align === 'center' && 'justify-center',
                    column.align === 'right' && 'justify-end'
                  )}>
                    {column.header}
                    {column.sortable && onSortChange && renderSortIcon(column.id)}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              renderSkeleton()
            ) : displayData.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              displayData.map((row, idx) => {
                const rowId = getRowId ? getRowId(row) : String(idx);
                return (
                  <TableRow
                    key={rowId}
                    className={cn(onRowClick && 'cursor-pointer')}
                    onClick={() => onRowClick?.(row)}
                  >
                    {columns.map((column) => (
                      <TableCell
                        key={column.id}
                        className={cn(
                          column.align === 'center' && 'text-center',
                          column.align === 'right' && 'text-right',
                          column.cellClassName
                        )}
                      >
                        {renderCell(row, column)}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 0 && (
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin inline mr-1" />
              ) : (
                `${((paginationState.page - 1) * paginationState.pageSize) + 1}–${Math.min(paginationState.page * paginationState.pageSize, totalItems)} de ${totalItems}`
              )}
            </span>
            <span className="hidden sm:inline">|</span>
            <div className="hidden sm:flex items-center gap-2">
              <span>Linhas:</span>
              <Select
                value={String(paginationState.pageSize)}
                onValueChange={(v) => setPageSize(Number(v))}
              >
                <SelectTrigger className="h-8 w-[70px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {pageSizeOptions.map((size) => (
                    <SelectItem key={size} value={String(size)}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => goToPage(1)}
              disabled={paginationState.page === 1 || isLoading}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => goToPage(paginationState.page - 1)}
              disabled={paginationState.page === 1 || isLoading}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-2 text-sm">
              {paginationState.page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => goToPage(paginationState.page + 1)}
              disabled={paginationState.page === totalPages || isLoading}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => goToPage(totalPages)}
              disabled={paginationState.page === totalPages || isLoading}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default DataTable;
