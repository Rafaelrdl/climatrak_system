/**
 * DataTable - Tabela de dados com funcionalidades padrao
 *
 * Suporta paginacao server-side, ordenacao, filtros e estados de loading/empty.
 */

import { useMemo, useState, type ReactNode } from 'react';
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
import { EmptyState, type EmptyStateProps } from './EmptyState';
import { cn } from '@/lib/utils';

export interface Column<T> {
  /** Identificador unico da coluna */
  id: string;
  /** Cabecalho da coluna */
  header: string | ReactNode;
  /** Acessor para o valor da celula */
  accessorKey?: keyof T;
  /** Funcao custom para renderizar celula */
  cell?: (row: T) => ReactNode;
  /** Largura fixa ou minima */
  width?: string | number;
  /** Alinhamento */
  align?: 'left' | 'center' | 'right';
  /** Permitir ordenacao */
  sortable?: boolean;
  /** Classes adicionais para header */
  headerClassName?: string;
  /** Classes adicionais para celula */
  cellClassName?: string;
}

export type DataTableColumn<T> = Column<T>;

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
  /** Total de itens (para paginacao server-side) */
  total?: number;
  /** Estado de carregamento */
  isLoading?: boolean;
  /** Alias de isLoading */
  loading?: boolean;
  /** Paginacao atual */
  pagination?: PaginationState;
  /** Callback quando paginacao muda */
  onPaginationChange?: (pagination: PaginationState) => void;
  /** Ordenacao atual */
  sort?: SortState | null;
  /** Callback quando ordenacao muda */
  onSortChange?: (sort: SortState | null) => void;
  /** Opcoes de tamanho de pagina */
  pageSizeOptions?: number[];
  /** Funcao para obter ID unico da linha */
  getRowId?: (row: T, index: number) => string | number;
  /** Alias de getRowId */
  getRowKey?: (row: T, index: number) => string | number;
  /** Callback ao clicar em uma linha */
  onRowClick?: (row: T) => void;
  /** Linha selecionada */
  selectedRowKey?: string | number;
  /** Mensagem quando nao ha dados */
  emptyMessage?: string;
  /** Configuracao do estado vazio */
  emptyState?: Omit<EmptyStateProps, 'size'>;
  /** Classes CSS adicionais */
  className?: string;
  /** Renderizar slot de filtros (acima da tabela) */
  filters?: ReactNode;
  /** Sticky header */
  stickyHeader?: boolean;
  /** Striped rows */
  striped?: boolean;
  /** Hover effect nas linhas */
  hoverable?: boolean;
}

export function DataTable<T extends object>({
  columns,
  data,
  total,
  isLoading = false,
  loading,
  pagination,
  onPaginationChange,
  sort,
  onSortChange,
  pageSizeOptions = [10, 20, 50, 100],
  getRowId,
  getRowKey,
  onRowClick,
  selectedRowKey,
  emptyMessage = 'Nenhum registro encontrado',
  emptyState,
  className,
  filters,
  stickyHeader = false,
  striped = false,
  hoverable = true,
}: DataTableProps<T>) {
  const loadingState = loading ?? isLoading;

  const [localPagination, setLocalPagination] = useState<PaginationState>({
    page: 1,
    pageSize: 10,
  });

  const paginationState = pagination ?? localPagination;
  const handlePaginationChange = onPaginationChange ?? setLocalPagination;

  const totalItems = total ?? data.length;
  const totalPages = Math.ceil(totalItems / paginationState.pageSize);

  const displayData = useMemo(() => {
    if (pagination) {
      return data;
    }
    const start = (localPagination.page - 1) * localPagination.pageSize;
    return data.slice(start, start + localPagination.pageSize);
  }, [data, pagination, localPagination]);

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

  const goToPage = (page: number) => {
    handlePaginationChange({ ...paginationState, page });
  };

  const setPageSize = (pageSize: number) => {
    handlePaginationChange({ page: 1, pageSize });
  };

  const renderSortIcon = (columnId: string) => {
    if (sort?.column !== columnId) {
      return <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />;
    }
    return sort.direction === 'asc'
      ? <ArrowUp className="ml-1 h-3 w-3" />
      : <ArrowDown className="ml-1 h-3 w-3" />;
  };

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

  const renderCell = (row: T, column: Column<T>): ReactNode => {
    if (column.cell) {
      return column.cell(row);
    }
    if (column.accessorKey) {
      const value = row[column.accessorKey];
      if (value === null || value === undefined) return '-';
      return String(value);
    }
    return null;
  };

  const getRowIdentifier = (row: T, idx: number) => {
    if (getRowId) return String(getRowId(row, idx));
    if (getRowKey) return String(getRowKey(row, idx));
    return String(idx);
  };

  return (
    <div className={cn('space-y-4', className)}>
      {filters && <div className="flex flex-wrap gap-2">{filters}</div>}

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
                    column.sortable && onSortChange && 'cursor-pointer select-none hover:bg-muted/50',
                    column.headerClassName
                  )}
                  onClick={() => column.sortable && onSortChange && handleSort(column.id)}
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
            {loadingState ? (
              renderSkeleton()
            ) : displayData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="p-0">
                  <EmptyState
                    title={emptyState?.title || emptyMessage}
                    description={emptyState?.description}
                    icon={emptyState?.icon}
                    action={emptyState?.action}
                    size="md"
                    className="py-6"
                  />
                </TableCell>
              </TableRow>
            ) : (
              displayData.map((row, idx) => {
                const rowKey = getRowIdentifier(row, idx);
                const isSelected = selectedRowKey !== undefined
                  ? String(selectedRowKey) === rowKey
                  : false;

                return (
                  <TableRow
                    key={rowKey}
                    className={cn(
                      onRowClick && 'cursor-pointer',
                      hoverable && 'hover:bg-muted/50',
                      striped && idx % 2 === 1 && 'bg-muted/30',
                      isSelected && 'bg-primary/10 hover:bg-primary/15'
                    )}
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

      {totalPages > 0 && (
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>
              {loadingState ? (
                <Loader2 className="h-4 w-4 animate-spin inline mr-1" />
              ) : (
                `${((paginationState.page - 1) * paginationState.pageSize) + 1}-${Math.min(paginationState.page * paginationState.pageSize, totalItems)} de ${totalItems}`
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
              disabled={paginationState.page === 1 || loadingState}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => goToPage(paginationState.page - 1)}
              disabled={paginationState.page === 1 || loadingState}
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
              disabled={paginationState.page === totalPages || loadingState}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => goToPage(totalPages)}
              disabled={paginationState.page === totalPages || loadingState}
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
