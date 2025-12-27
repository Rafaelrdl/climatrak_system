import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  CalendarIcon,
  FileTextIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  RotateCcwIcon,
  RepeatIcon,
  SearchIcon,
  FilterIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  RefreshCwIcon,
  PackageIcon,
} from 'lucide-react';
import { format, parseISO, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { ApiInventoryMovement } from '@/types/api';
import { useInventoryMovements, useInventoryMovementsSummary } from '@/hooks/useInventoryQuery';
import type { InventoryMovementParams } from '@/services/inventoryService';

interface InventoryHistoryProps {
  className?: string;
}

const MOVEMENT_TYPE_ICONS: Record<ApiInventoryMovement['type'], React.ReactNode> = {
  IN: <TrendingUpIcon className="h-4 w-4" />,
  OUT: <TrendingDownIcon className="h-4 w-4" />,
  ADJUSTMENT: <RefreshCwIcon className="h-4 w-4" />,
  TRANSFER: <RepeatIcon className="h-4 w-4" />,
  RETURN: <RotateCcwIcon className="h-4 w-4" />
};

const MOVEMENT_TYPE_VARIANTS: Record<ApiInventoryMovement['type'], 'default' | 'secondary' | 'destructive' | 'outline'> = {
  IN: 'default',
  OUT: 'destructive', 
  ADJUSTMENT: 'secondary',
  TRANSFER: 'outline',
  RETURN: 'outline'
};

export function InventoryHistory({ className }: InventoryHistoryProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedReason, setSelectedReason] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('7'); // últimos 7 dias
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;
  
  // Calcular datas baseado no filtro
  const dateFilter = useMemo(() => {
    const days = parseInt(dateRange);
    const startDate = subDays(new Date(), days);
    return {
      created_at__gte: startDate.toISOString(),
    };
  }, [dateRange]);

  // Configurar parâmetros da query
  const queryParams = useMemo((): InventoryMovementParams => {
    const params: InventoryMovementParams = {
      ...dateFilter,
      ordering: '-created_at',
      page: currentPage,
      page_size: pageSize,
    };

    if (searchTerm.trim()) {
      params.search = searchTerm.trim();
    }

    if (selectedType !== 'all') {
      params.type = selectedType as ApiInventoryMovement['type'];
    }

    if (selectedReason !== 'all') {
      params.reason = selectedReason;
    }

    return params;
  }, [searchTerm, selectedType, selectedReason, dateFilter, currentPage]);

  // Hooks da API
  const { data: movementsData, isLoading, error } = useInventoryMovements(queryParams);
  const { data: summaryData } = useInventoryMovementsSummary(parseInt(dateRange));
  
  // Processar dados
  const movements = useMemo(() => {
    if (Array.isArray(movementsData)) {
      return movementsData;
    }
    // Handle paginated response
    return (movementsData as any)?.results || [];
  }, [movementsData]);

  // Informações de paginação
  const paginationInfo = useMemo(() => {
    if (Array.isArray(movementsData)) {
      return {
        count: movementsData.length,
        totalPages: 1,
        hasNext: false,
        hasPrevious: false,
      };
    }
    
    const data = movementsData as any;
    return {
      count: data?.count || 0,
      totalPages: Math.ceil((data?.count || 0) / pageSize),
      hasNext: !!data?.next,
      hasPrevious: !!data?.previous,
    };
  }, [movementsData]);

  // Estatísticas rápidas baseadas nos dados filtrados
  const quickStats = useMemo(() => {
    const stats = {
      totalEntries: movements.filter(m => m.type === 'IN').length,
      totalExits: movements.filter(m => m.type === 'OUT').length, 
      totalAdjustments: movements.filter(m => m.type === 'ADJUSTMENT').length,
      totalMovements: movements.length,
    };
    return stats;
  }, [movements]);

  // Resetar página quando filtros mudarem
  const handleFilterChange = (filterType: string, value: string) => {
    setCurrentPage(1);
    switch (filterType) {
      case 'search':
        setSearchTerm(value);
        break;
      case 'type':
        setSelectedType(value);
        break;
      case 'reason':
        setSelectedReason(value);
        break;
      case 'dateRange':
        setDateRange(value);
        break;
    }
  };

  const formatCurrency = (value: number | null) => {
    if (value === null) return '-';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), 'dd/MM/yyyy HH:mm', { locale: ptBR });
    } catch {
      return dateString;
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header com estatísticas rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUpIcon className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Entradas</p>
                {isLoading ? (
                  <Skeleton className="h-6 w-8" />
                ) : (
                  <p className="text-lg font-semibold">{quickStats.totalEntries}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingDownIcon className="h-4 w-4 text-red-600" />
              <div>
                <p className="text-sm text-muted-foreground">Saídas</p>
                {isLoading ? (
                  <Skeleton className="h-6 w-8" />
                ) : (
                  <p className="text-lg font-semibold">{quickStats.totalExits}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <RefreshCwIcon className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Ajustes</p>
                {isLoading ? (
                  <Skeleton className="h-6 w-8" />
                ) : (
                  <p className="text-lg font-semibold">{quickStats.totalAdjustments}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <PackageIcon className="h-4 w-4 text-purple-600" />
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                {isLoading ? (
                  <Skeleton className="h-6 w-8" />
                ) : (
                  <p className="text-lg font-semibold">{quickStats.totalMovements}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FilterIcon className="h-4 w-4" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Busca */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Buscar</label>
              <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Item, código, referência..."
                  value={searchTerm}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Tipo de movimentação */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo</label>
              <Select value={selectedType} onValueChange={(value) => handleFilterChange('type', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os tipos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  <SelectItem value="IN">Entrada</SelectItem>
                  <SelectItem value="OUT">Saída</SelectItem>
                  <SelectItem value="ADJUSTMENT">Ajuste</SelectItem>
                  <SelectItem value="TRANSFER">Transferência</SelectItem>
                  <SelectItem value="RETURN">Devolução</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Motivo */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Motivo</label>
              <Select value={selectedReason} onValueChange={(value) => handleFilterChange('reason', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os motivos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os motivos</SelectItem>
                  <SelectItem value="PURCHASE">Compra</SelectItem>
                  <SelectItem value="WORK_ORDER">Ordem de Serviço</SelectItem>
                  <SelectItem value="ADJUSTMENT">Ajuste de Inventário</SelectItem>
                  <SelectItem value="DAMAGE">Avaria</SelectItem>
                  <SelectItem value="EXPIRY">Vencimento</SelectItem>
                  <SelectItem value="RETURN_SUPPLIER">Devolução ao Fornecedor</SelectItem>
                  <SelectItem value="RETURN_STOCK">Retorno ao Estoque</SelectItem>
                  <SelectItem value="TRANSFER">Transferência</SelectItem>
                  <SelectItem value="OTHER">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Período */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Período</label>
              <Select value={dateRange} onValueChange={(value) => handleFilterChange('dateRange', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Últimos 7 dias</SelectItem>
                  <SelectItem value="30">Últimos 30 dias</SelectItem>
                  <SelectItem value="90">Últimos 90 dias</SelectItem>
                  <SelectItem value="365">Último ano</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de movimentações */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileTextIcon className="h-4 w-4" />
            Histórico de Movimentações
            {isLoading ? (
              <Skeleton className="h-5 w-16 ml-auto" />
            ) : (
              <Badge variant="outline" className="ml-auto">
                {movements.length} registros
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-12 w-full" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <PackageIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium text-destructive mb-2">Erro ao carregar movimentações</p>
              <p className="text-sm text-muted-foreground">
                Tente atualizar a página ou verifique sua conexão
              </p>
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data/Hora</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-center">Tipo</TableHead>
                      <TableHead>Motivo</TableHead>
                      <TableHead className="text-right">Quantidade</TableHead>
                      <TableHead className="text-right">Estoque</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead>Referência</TableHead>
                      <TableHead>Responsável</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movements.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="h-24 text-center">
                          <div className="flex flex-col items-center gap-2">
                            <PackageIcon className="h-8 w-8 text-muted-foreground" />
                            <p className="text-muted-foreground">Nenhuma movimentação encontrada</p>
                            <p className="text-sm text-muted-foreground">
                              Tente ajustar os filtros para encontrar movimentações
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      movements.map((movement) => (
                        <TableRow key={movement.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                              {formatDate(movement.created_at)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{movement.item_code}</p>
                              <p className="text-sm text-muted-foreground truncate max-w-xs">
                                {movement.item_name}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge 
                              variant={MOVEMENT_TYPE_VARIANTS[movement.type]}
                              className="flex items-center gap-1 w-fit"
                            >
                              {MOVEMENT_TYPE_ICONS[movement.type]}
                              {movement.type_display}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">{movement.reason_display}</span>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            <div className="flex items-center justify-end gap-1">
                              {movement.type === 'IN' ? (
                                <ArrowUpIcon className="h-3 w-3 text-green-600" />
                              ) : (
                                <ArrowDownIcon className="h-3 w-3 text-red-600" />
                              )}
                              {movement.quantity}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="text-sm">
                              <span className="text-muted-foreground">{movement.quantity_before}</span>
                              <span className="mx-1">→</span>
                              <span className="font-medium">{movement.quantity_after}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            {movement.total_value ? formatCurrency(movement.total_value) : '--'}
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {movement.work_order_number && (
                                <Badge variant="outline" className="text-xs">
                                  {movement.work_order_number}
                                </Badge>
                              )}
                              {movement.reference && (
                                <p className="text-xs text-muted-foreground">
                                  {movement.reference}
                                </p>
                              )}
                              {movement.invoice_number && (
                                <p className="text-xs text-muted-foreground">
                                  NF: {movement.invoice_number}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">{movement.performed_by_name}</span>
                            {movement.note && (
                              <p className="text-xs text-muted-foreground mt-1 truncate max-w-xs" title={movement.note}>
                                {movement.note}
                              </p>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              
              {/* Paginação */}
              {paginationInfo.totalPages > 1 && (
                <div className="flex items-center justify-between px-2 mt-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      Mostrando {Math.min((currentPage - 1) * pageSize + 1, paginationInfo.count)} a{' '}
                      {Math.min(currentPage * pageSize, paginationInfo.count)} de {paginationInfo.count} movimentações
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                    >
                      Primeira
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={!paginationInfo.hasPrevious}
                    >
                      Anterior
                    </Button>
                    <span className="text-sm text-muted-foreground px-4">
                      Página {currentPage} de {paginationInfo.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(paginationInfo.totalPages, prev + 1))}
                      disabled={!paginationInfo.hasNext}
                    >
                      Próxima
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(paginationInfo.totalPages)}
                      disabled={currentPage === paginationInfo.totalPages}
                    >
                      Última
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}