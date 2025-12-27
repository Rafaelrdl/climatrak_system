/**
 * DataTable - Tabela de dados com funcionalidades padrão
 * 
 * Wrapper para tabelas com ordenação, paginação e estados vazios.
 * 
 * @example
 * ```tsx
 * <DataTable
 *   columns={columns}
 *   data={workOrders}
 *   emptyState={{
 *     title: "Nenhuma ordem de serviço",
 *     description: "Crie sua primeira OS para começar"
 *   }}
 * />
 * ```
 */

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { EmptyState, EmptyStateProps } from './EmptyState';
import { Skeleton } from '@/components/ui/skeleton';

export interface DataTableColumn<T> {
  /** Identificador único da coluna */
  id: string;
  /** Cabeçalho da coluna */
  header: ReactNode;
  /** Acessor para o valor (pode ser função ou chave do objeto) */
  accessor: keyof T | ((row: T) => ReactNode);
  /** Classes CSS para a célula */
  className?: string;
  /** Alinhamento */
  align?: 'left' | 'center' | 'right';
  /** Largura fixa */
  width?: string | number;
}

export interface DataTableProps<T> {
  /** Definição das colunas */
  columns: DataTableColumn<T>[];
  /** Dados a serem exibidos */
  data: T[];
  /** Função para obter a key única de cada row */
  getRowKey: (row: T, index: number) => string | number;
  /** Configuração do estado vazio */
  emptyState?: Omit<EmptyStateProps, 'size'>;
  /** Estado de carregamento */
  loading?: boolean;
  /** Número de linhas skeleton durante loading */
  skeletonRows?: number;
  /** Classes CSS adicionais */
  className?: string;
  /** Callback ao clicar em uma linha */
  onRowClick?: (row: T) => void;
  /** Linha selecionada */
  selectedRowKey?: string | number;
  /** Striped rows */
  striped?: boolean;
  /** Hover effect nas linhas */
  hoverable?: boolean;
}

export function DataTable<T>({
  columns,
  data,
  getRowKey,
  emptyState,
  loading = false,
  skeletonRows = 5,
  className,
  onRowClick,
  selectedRowKey,
  striped = false,
  hoverable = true,
}: DataTableProps<T>) {
  const getCellValue = (row: T, accessor: DataTableColumn<T>['accessor']): ReactNode => {
    if (typeof accessor === 'function') {
      return accessor(row);
    }
    return row[accessor] as ReactNode;
  };

  const alignClasses = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  };

  // Loading state
  if (loading) {
    return (
      <div className={cn("rounded-md border", className)}>
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead 
                  key={column.id}
                  className={cn(alignClasses[column.align || 'left'])}
                  style={{ width: column.width }}
                >
                  {column.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: skeletonRows }).map((_, rowIndex) => (
              <TableRow key={rowIndex}>
                {columns.map((column) => (
                  <TableCell key={column.id}>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  // Empty state
  if (data.length === 0) {
    return (
      <div className={cn("rounded-md border", className)}>
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead 
                  key={column.id}
                  className={cn(alignClasses[column.align || 'left'])}
                  style={{ width: column.width }}
                >
                  {column.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
        </Table>
        <EmptyState
          title={emptyState?.title || "Nenhum dado encontrado"}
          description={emptyState?.description}
          icon={emptyState?.icon}
          action={emptyState?.action}
          size="md"
        />
      </div>
    );
  }

  // Data table
  return (
    <div className={cn("rounded-md border", className)}>
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead 
                key={column.id}
                className={cn(alignClasses[column.align || 'left'])}
                style={{ width: column.width }}
              >
                {column.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row, index) => {
            const rowKey = getRowKey(row, index);
            const isSelected = selectedRowKey === rowKey;
            
            return (
              <TableRow
                key={rowKey}
                onClick={() => onRowClick?.(row)}
                className={cn(
                  onRowClick && "cursor-pointer",
                  hoverable && "hover:bg-muted/50",
                  striped && index % 2 === 1 && "bg-muted/30",
                  isSelected && "bg-primary/10 hover:bg-primary/15"
                )}
              >
                {columns.map((column) => (
                  <TableCell
                    key={column.id}
                    className={cn(
                      alignClasses[column.align || 'left'],
                      column.className
                    )}
                    style={{ width: column.width }}
                  >
                    {getCellValue(row, column.accessor)}
                  </TableCell>
                ))}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
