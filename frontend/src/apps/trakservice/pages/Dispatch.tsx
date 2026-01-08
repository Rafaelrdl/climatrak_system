/**
 * TrakService Dispatch Page
 * 
 * Main page for dispatch management: view and assign work orders to technicians.
 * Features:
 * - List service assignments with filters (date, technician, status)
 * - Create new assignments from work orders
 * - Update assignment status
 * - Quick stats dashboard
 * 
 * Design System: Platform-first, seguindo docs/design/DESIGN_SYSTEM.md
 * TrakService accent color: orange-500
 */

import { useState, useMemo } from 'react';
import { format, startOfWeek, endOfWeek, isToday, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PageHeader } from '@/shared/ui';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DataTable, type Column } from '@/shared/ui/components/DataTable';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Target, 
  CheckCircle, 
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Car,
  MapPin,
  XCircle,
  RefreshCw,
  User,
  Wrench,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// Hooks
import {
  useAssignments,
  useTodayAssignments,
  useActiveTechnicians,
  useCreateAssignment,
  useUpdateAssignmentStatus,
  useDeleteAssignment,
} from '../hooks/useDispatchQuery';

// Types and utilities
import type { 
  ServiceAssignment, 
  AssignmentStatus, 
  AssignmentFilters,
  TechnicianListItem,
} from '../types';
import { 
  getStatusConfig, 
  getStatusOptions, 
  getNextStatuses,
  formatScheduledDate,
  formatTime,
  calculateSummary,
} from '../services/dispatchService';

// =============================================================================
// Sub-components
// =============================================================================

interface QuickStatCardProps {
  title: string;
  value: string | number;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color?: string;
  isLoading?: boolean;
}

function QuickStatCard({ 
  title, 
  value, 
  description, 
  icon: Icon, 
  color = 'text-muted-foreground',
  isLoading = false,
}: QuickStatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={cn("h-4 w-4", color)} />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <>
            <Skeleton className="h-8 w-16 mb-1" />
            <Skeleton className="h-3 w-24" />
          </>
        ) : (
          <>
            <div className="text-2xl font-bold">{value}</div>
            <p className="text-xs text-muted-foreground">{description}</p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

interface StatusBadgeProps {
  status: AssignmentStatus;
}

function StatusBadge({ status }: StatusBadgeProps) {
  const config = getStatusConfig(status);
  
  return (
    <Badge 
      variant="outline" 
      className={cn(
        config.bgColor, 
        config.color, 
        "border-transparent font-medium"
      )}
    >
      {config.label}
    </Badge>
  );
}

interface AssignmentRowActionsProps {
  assignment: ServiceAssignment;
  onStatusChange: (id: string, status: AssignmentStatus, reason?: string) => void;
  onDelete: (id: string) => void;
}

function AssignmentRowActions({ 
  assignment, 
  onStatusChange, 
  onDelete 
}: AssignmentRowActionsProps) {
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  
  const nextStatuses = getNextStatuses(assignment.status);
  
  const handleStatusChange = (status: AssignmentStatus) => {
    if (status === 'canceled') {
      setShowCancelDialog(true);
    } else {
      onStatusChange(assignment.id, status);
    }
  };
  
  const handleConfirmCancel = () => {
    onStatusChange(assignment.id, 'canceled', cancelReason);
    setShowCancelDialog(false);
    setCancelReason('');
  };
  
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">Ações</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Ações</DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          {nextStatuses.length > 0 && (
            <>
              {nextStatuses.map((status) => {
                const config = getStatusConfig(status);
                return (
                  <DropdownMenuItem 
                    key={status}
                    onClick={() => handleStatusChange(status)}
                  >
                    <span className={config.color}>
                      {status === 'en_route' && 'Marcar A Caminho'}
                      {status === 'on_site' && 'Marcar No Local'}
                      {status === 'done' && 'Marcar Concluído'}
                      {status === 'canceled' && 'Cancelar'}
                    </span>
                  </DropdownMenuItem>
                );
              })}
              <DropdownMenuSeparator />
            </>
          )}
          
          <DropdownMenuItem 
            onClick={() => onDelete(assignment.id)}
            className="text-destructive"
          >
            Excluir
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      
      {/* Cancel Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar Atribuição</DialogTitle>
            <DialogDescription>
              Você está prestes a cancelar a atribuição da OS {assignment.work_order_number}.
              Informe o motivo do cancelamento.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="cancel-reason">Motivo do Cancelamento</Label>
              <Textarea
                id="cancel-reason"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Descreva o motivo do cancelamento..."
                className="min-h-[100px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCancelDialog(false)}>
              Voltar
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleConfirmCancel}
              disabled={!cancelReason.trim()}
            >
              Confirmar Cancelamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function DispatchPage() {
  // ==========================================================================
  // State
  // ==========================================================================
  const [filters, setFilters] = useState<AssignmentFilters>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedTechnician, setSelectedTechnician] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  
  // ==========================================================================
  // Queries
  // ==========================================================================
  const { data: todayData, isLoading: isLoadingToday } = useTodayAssignments();
  const { data: technicians, isLoading: isLoadingTechnicians } = useActiveTechnicians();
  
  // Build filters for main query
  const queryFilters = useMemo((): AssignmentFilters => {
    const f: AssignmentFilters = {};
    
    if (selectedDate) {
      f.date = format(selectedDate, 'yyyy-MM-dd');
    }
    
    if (selectedStatus && selectedStatus !== 'all') {
      f.status = selectedStatus as AssignmentStatus;
    }
    
    if (selectedTechnician && selectedTechnician !== 'all') {
      f.technician_id = selectedTechnician;
    }
    
    if (searchTerm) {
      f.search = searchTerm;
    }
    
    return f;
  }, [selectedDate, selectedStatus, selectedTechnician, searchTerm]);
  
  const { 
    data: assignmentsData, 
    isLoading: isLoadingAssignments,
    refetch: refetchAssignments,
  } = useAssignments(queryFilters);
  
  // ==========================================================================
  // Mutations
  // ==========================================================================
  const createMutation = useCreateAssignment();
  const updateStatusMutation = useUpdateAssignmentStatus();
  const deleteMutation = useDeleteAssignment();
  
  // ==========================================================================
  // Computed Values
  // ==========================================================================
  const assignments = assignmentsData?.results ?? [];
  const todayAssignments = todayData ?? [];
  const todaySummary = calculateSummary(todayAssignments);
  
  // ==========================================================================
  // Handlers
  // ==========================================================================
  const handleStatusChange = (id: string, status: AssignmentStatus, reason?: string) => {
    updateStatusMutation.mutate(
      { id, data: { status, reason } },
      {
        onSuccess: () => {
          toast.success(`Status atualizado para ${getStatusConfig(status).label}`);
        },
        onError: (error) => {
          toast.error(`Erro ao atualizar status: ${error.message}`);
        },
      }
    );
  };
  
  const handleDelete = (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta atribuição?')) {
      deleteMutation.mutate(id, {
        onSuccess: () => {
          toast.success('Atribuição excluída com sucesso');
        },
        onError: (error) => {
          toast.error(`Erro ao excluir: ${error.message}`);
        },
      });
    }
  };
  
  const handleRefresh = () => {
    refetchAssignments();
    toast.info('Atualizando dados...');
  };
  
  const handleClearFilters = () => {
    setSelectedDate(new Date());
    setSelectedStatus('all');
    setSelectedTechnician('all');
    setSearchTerm('');
  };
  
  // ==========================================================================
  // Table Columns
  // ==========================================================================
  const columns: Column<ServiceAssignment>[] = useMemo(() => [
    {
      id: 'work_order',
      header: 'Ordem de Serviço',
      cell: (row) => (
        <div className="space-y-1">
          <div className="font-medium">{row.work_order_number}</div>
          <div className="text-sm text-muted-foreground line-clamp-1">
            {row.work_order_description}
          </div>
        </div>
      ),
      width: 200,
    },
    {
      id: 'asset',
      header: 'Ativo',
      cell: (row) => (
        <div className="space-y-1">
          <div className="font-medium text-sm">{row.asset_name}</div>
          {row.asset_location && (
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {row.asset_location}
            </div>
          )}
        </div>
      ),
      width: 180,
    },
    {
      id: 'technician',
      header: 'Técnico',
      cell: (row) => (
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center">
            <User className="h-4 w-4 text-orange-600" />
          </div>
          <span className="font-medium text-sm">{row.technician.full_name}</span>
        </div>
      ),
      width: 160,
    },
    {
      id: 'scheduled',
      header: 'Agendamento',
      cell: (row) => (
        <div className="space-y-1">
          <div className="font-medium text-sm">
            {formatScheduledDate(row.scheduled_date)}
          </div>
          <div className="text-xs text-muted-foreground">
            {formatTime(row.scheduled_start)} - {formatTime(row.scheduled_end)}
          </div>
        </div>
      ),
      width: 120,
    },
    {
      id: 'status',
      header: 'Status',
      cell: (row) => <StatusBadge status={row.status} />,
      width: 120,
    },
    {
      id: 'priority',
      header: 'Prioridade',
      cell: (row) => {
        const priorityConfig: Record<string, { label: string; color: string }> = {
          LOW: { label: 'Baixa', color: 'text-slate-600' },
          MEDIUM: { label: 'Média', color: 'text-blue-600' },
          HIGH: { label: 'Alta', color: 'text-amber-600' },
          CRITICAL: { label: 'Crítica', color: 'text-red-600' },
        };
        const config = priorityConfig[row.work_order_priority] || priorityConfig.MEDIUM;
        return (
          <span className={cn("text-sm font-medium", config.color)}>
            {config.label}
          </span>
        );
      },
      width: 100,
    },
    {
      id: 'actions',
      header: '',
      cell: (row) => (
        <AssignmentRowActions
          assignment={row}
          onStatusChange={handleStatusChange}
          onDelete={handleDelete}
        />
      ),
      width: 60,
      align: 'right',
    },
  ], [handleStatusChange, handleDelete]);
  
  // ==========================================================================
  // Render
  // ==========================================================================
  const isLoading = isLoadingAssignments || isLoadingToday;
  const hasActiveFilters = selectedStatus !== 'all' || 
                          selectedTechnician !== 'all' || 
                          searchTerm !== '';
  
  return (
    <div className="space-y-6">
      <PageHeader
        title="Agenda & Dispatch"
        description="Agende e distribua ordens de serviço para sua equipe"
      >
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          <Button size="sm" className="bg-orange-500 hover:bg-orange-600">
            <Plus className="h-4 w-4 mr-2" />
            Nova Atribuição
          </Button>
        </div>
      </PageHeader>
      
      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <QuickStatCard
          title="Agendamentos Hoje"
          value={todaySummary.total}
          description={todaySummary.total === 1 ? 'atribuição' : 'atribuições'}
          icon={CalendarIcon}
          color="text-blue-500"
          isLoading={isLoadingToday}
        />
        <QuickStatCard
          title="A Caminho"
          value={todaySummary.en_route}
          description="em deslocamento"
          icon={Car}
          color="text-amber-500"
          isLoading={isLoadingToday}
        />
        <QuickStatCard
          title="No Local"
          value={todaySummary.on_site}
          description="em atendimento"
          icon={MapPin}
          color="text-purple-500"
          isLoading={isLoadingToday}
        />
        <QuickStatCard
          title="Concluídos Hoje"
          value={todaySummary.done}
          description="finalizados"
          icon={CheckCircle}
          color="text-green-500"
          isLoading={isLoadingToday}
        />
      </div>
      
      {/* Filters Card */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium">Atribuições</CardTitle>
            {hasActiveFilters && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleClearFilters}
                className="text-muted-foreground"
              >
                <XCircle className="h-4 w-4 mr-1" />
                Limpar filtros
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-wrap gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por OS, ativo ou técnico..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            
            {/* Date Picker */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="min-w-[180px] justify-start">
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  {selectedDate ? (
                    format(selectedDate, "dd 'de' MMMM", { locale: ptBR })
                  ) : (
                    'Selecionar data'
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
            
            {/* Status Filter */}
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                {getStatusOptions().map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Technician Filter */}
            <Select 
              value={selectedTechnician} 
              onValueChange={setSelectedTechnician}
              disabled={isLoadingTechnicians}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Técnico" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os técnicos</SelectItem>
                {technicians?.map((tech) => (
                  <SelectItem key={tech.id} value={tech.id}>
                    {tech.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Data Table */}
          <DataTable<ServiceAssignment>
            columns={columns}
            data={assignments}
            total={assignmentsData?.count ?? 0}
            isLoading={isLoadingAssignments}
            getRowId={(row) => row.id}
            emptyState={{
              icon: <CalendarIcon className="h-12 w-12" />,
              title: 'Nenhuma atribuição encontrada',
              description: hasActiveFilters 
                ? 'Tente ajustar os filtros para ver mais resultados.'
                : 'Crie sua primeira atribuição clicando no botão acima.',
            }}
            hoverable
            striped
          />
        </CardContent>
      </Card>
    </div>
  );
}

export default DispatchPage;
