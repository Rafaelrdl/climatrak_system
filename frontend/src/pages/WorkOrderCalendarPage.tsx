/**
 * WorkOrderCalendarPage - Página de Calendário de Ordens de Serviço
 * 
 * Exibe um calendário mensal com as OS agendadas, permitindo:
 * - Visualizar OS por dia
 * - Filtrar por status, tipo e prioridade
 * - Clicar em uma OS para ver detalhes
 * - Navegar entre meses
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  isToday,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  parseISO
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { StatusBadge } from '@/components/StatusBadge';
import { WorkOrderEditModal } from '@/components/WorkOrderEditModal';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon,
  User,
  ClipboardList,
  Filter,
  RotateCcw,
  ArrowLeft
} from 'lucide-react';
import { useWorkOrders, useUpdateWorkOrder } from '@/hooks/useWorkOrdersQuery';
import { useEquipments } from '@/hooks/useEquipmentQuery';
import { cn } from '@/lib/utils';
import type { WorkOrder } from '@/types';

const priorityColors = {
  CRITICAL: 'bg-red-500',
  HIGH: 'bg-orange-500',
  MEDIUM: 'bg-yellow-500',
  LOW: 'bg-blue-500',
};

const statusColors = {
  OPEN: 'border-l-blue-500',
  IN_PROGRESS: 'border-l-amber-500',
  COMPLETED: 'border-l-green-500',
};

export function WorkOrderCalendarPage() {
  const navigate = useNavigate();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(new Date());
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [editingOrder, setEditingOrder] = useState<WorkOrder | null>(null);
  
  const { data: workOrders = [], isLoading } = useWorkOrders();
  const { data: equipment = [] } = useEquipments();
  const updateMutation = useUpdateWorkOrder();

  // Filtra as OS baseado nos filtros selecionados
  const filteredWorkOrders = useMemo(() => {
    return workOrders.filter(wo => {
      const matchesStatus = statusFilter === 'ALL' || wo.status === statusFilter;
      const matchesType = typeFilter === 'ALL' || wo.type === typeFilter;
      const matchesPriority = priorityFilter === 'ALL' || wo.priority === priorityFilter;
      return matchesStatus && matchesType && matchesPriority;
    });
  }, [workOrders, statusFilter, typeFilter, priorityFilter]);

  // Agrupa OS por data
  const workOrdersByDate = useMemo(() => {
    const grouped: Record<string, WorkOrder[]> = {};
    
    filteredWorkOrders.forEach(wo => {
      if (wo.scheduledDate) {
        const dateKey = format(parseISO(wo.scheduledDate), 'yyyy-MM-dd');
        if (!grouped[dateKey]) {
          grouped[dateKey] = [];
        }
        grouped[dateKey].push(wo);
      }
    });
    
    return grouped;
  }, [filteredWorkOrders]);

  // Gera os dias do calendário
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart, { locale: ptBR });
    const calendarEnd = endOfWeek(monthEnd, { locale: ptBR });
    
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentMonth]);

  // OS do dia selecionado
  const selectedDayOrders = useMemo(() => {
    if (!selectedDay) return [];
    const dateKey = format(selectedDay, 'yyyy-MM-dd');
    return workOrdersByDate[dateKey] || [];
  }, [selectedDay, workOrdersByDate]);

  const goToPreviousMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const goToNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const goToToday = () => {
    setCurrentMonth(new Date());
    setSelectedDay(new Date());
  };

  const resetFilters = () => {
    setStatusFilter('ALL');
    setTypeFilter('ALL');
    setPriorityFilter('ALL');
  };

  const getEquipmentName = (equipmentId: string) => {
    const eq = equipment.find(e => e.id === equipmentId);
    return eq ? eq.tag : 'Equipamento não encontrado';
  };

  const handleSaveWorkOrder = (workOrder: WorkOrder) => {
    updateMutation.mutate({ id: workOrder.id, data: workOrder }, {
      onSuccess: () => setEditingOrder(null)
    });
  };

  const hasActiveFilters = statusFilter !== 'ALL' || typeFilter !== 'ALL' || priorityFilter !== 'ALL';

  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  return (
    <div className="space-y-6">
      <PageHeader title="Calendário de Ordens de Serviço">
        <Button 
          variant="outline"
          className="flex items-center gap-2"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
      </PageHeader>

      <div className="flex gap-6 h-[calc(100vh-180px)]">
        {/* Calendário */}
        <div className="flex-1 flex flex-col">
          {/* Controles do calendário */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={goToPreviousMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h2 className="text-lg font-semibold min-w-[200px] text-center capitalize">
                {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
              </h2>
              <Button variant="outline" size="icon" onClick={goToNextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={goToToday} className="ml-2">
                Hoje
              </Button>
            </div>

            {/* Filtros */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos Status</SelectItem>
                  <SelectItem value="OPEN">Abertas</SelectItem>
                  <SelectItem value="IN_PROGRESS">Em Execução</SelectItem>
                  <SelectItem value="COMPLETED">Concluídas</SelectItem>
                </SelectContent>
              </Select>

              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos Tipos</SelectItem>
                  <SelectItem value="PREVENTIVE">Preventiva</SelectItem>
                  <SelectItem value="CORRECTIVE">Corretiva</SelectItem>
                </SelectContent>
              </Select>

              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Prioridade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todas</SelectItem>
                  <SelectItem value="CRITICAL">Crítica</SelectItem>
                  <SelectItem value="HIGH">Alta</SelectItem>
                  <SelectItem value="MEDIUM">Média</SelectItem>
                  <SelectItem value="LOW">Baixa</SelectItem>
                </SelectContent>
              </Select>

              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={resetFilters}>
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Limpar
                </Button>
              )}
            </div>
          </div>

          {/* Grade do calendário */}
          <Card className="flex-1 overflow-hidden">
            <div className="h-full flex flex-col">
              {/* Cabeçalho dos dias da semana */}
              <div className="grid grid-cols-7 bg-muted/50 border-b">
                {weekDays.map(day => (
                  <div 
                    key={day} 
                    className="p-3 text-center text-sm font-medium text-muted-foreground"
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Dias do calendário */}
              <div className="flex-1 grid grid-cols-7 auto-rows-fr">
                {calendarDays.map((day, index) => {
                  const dateKey = format(day, 'yyyy-MM-dd');
                  const dayOrders = workOrdersByDate[dateKey] || [];
                  const isCurrentMonth = isSameMonth(day, currentMonth);
                  const isSelected = selectedDay && isSameDay(day, selectedDay);
                  const isTodayDate = isToday(day);

                  return (
                    <div
                      key={index}
                      className={cn(
                        "p-2 border-b border-r cursor-pointer transition-colors overflow-hidden",
                        !isCurrentMonth && "bg-muted/30 text-muted-foreground",
                        isSelected && "bg-primary/10 ring-2 ring-primary ring-inset",
                        !isSelected && "hover:bg-muted/50"
                      )}
                      onClick={() => setSelectedDay(day)}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span 
                          className={cn(
                            "text-sm font-medium h-7 w-7 flex items-center justify-center rounded-full",
                            isTodayDate && "bg-primary text-primary-foreground"
                          )}
                        >
                          {format(day, 'd')}
                        </span>
                        {dayOrders.length > 0 && (
                          <Badge variant="secondary" className="text-xs h-5">
                            {dayOrders.length}
                          </Badge>
                        )}
                      </div>
                      
                      {/* Preview das OS do dia */}
                      <div className="space-y-1">
                        {dayOrders.slice(0, 2).map(wo => (
                          <div
                            key={wo.id}
                            className={cn(
                              "text-xs p-1 rounded truncate border-l-2",
                              statusColors[wo.status as keyof typeof statusColors] || 'border-l-gray-300',
                              "bg-background/80"
                            )}
                            title={`${wo.number} - ${wo.description}`}
                          >
                            <div className="flex items-center gap-1">
                              <div className={cn(
                                "h-1.5 w-1.5 rounded-full flex-shrink-0",
                                priorityColors[wo.priority as keyof typeof priorityColors]
                              )} />
                              <span className="truncate">{wo.number}</span>
                            </div>
                          </div>
                        ))}
                        {dayOrders.length > 2 && (
                          <div className="text-xs text-muted-foreground pl-1">
                            +{dayOrders.length - 2} mais
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>

          {/* Legenda */}
          <div className="flex items-center gap-6 mt-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-4">
              <span className="font-medium">Status:</span>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 border-l-2 border-l-blue-500" />
                <span>Aberta</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 border-l-2 border-l-amber-500" />
                <span>Em Execução</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 border-l-2 border-l-green-500" />
                <span>Concluída</span>
              </div>
            </div>
            <Separator orientation="vertical" className="h-4" />
            <div className="flex items-center gap-4">
              <span className="font-medium">Prioridade:</span>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <span>Crítica</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-orange-500" />
                <span>Alta</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-yellow-500" />
                <span>Média</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span>Baixa</span>
              </div>
            </div>
          </div>
        </div>

        {/* Painel lateral - Detalhes do dia selecionado */}
        <Card className="w-[380px] flex flex-col overflow-hidden">
          <div className="p-4 border-b flex-shrink-0">
            <h3 className="font-semibold flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              {selectedDay 
                ? format(selectedDay, "dd 'de' MMMM", { locale: ptBR })
                : 'Selecione um dia'
              }
            </h3>
            {selectedDay && (
              <p className="text-sm text-muted-foreground mt-1">
                {selectedDayOrders.length} ordem(ns) de serviço
              </p>
            )}
          </div>
          
          <ScrollArea className="flex-1 min-h-0">
            <div className="p-4 space-y-3">
              {!selectedDay ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CalendarIcon className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Clique em um dia para ver as OS agendadas</p>
                </div>
              ) : selectedDayOrders.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <ClipboardList className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Nenhuma OS agendada para este dia</p>
                </div>
              ) : (
                selectedDayOrders.map(wo => (
                  <Card 
                    key={wo.id} 
                    className={cn(
                      "cursor-pointer hover:shadow-md transition-shadow border-l-4",
                      statusColors[wo.status as keyof typeof statusColors]
                    )}
                    onClick={() => setEditingOrder(wo)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-semibold text-sm">{wo.number}</h4>
                          <p className="text-xs text-muted-foreground">
                            {getEquipmentName(wo.equipmentId)}
                          </p>
                        </div>
                        <div className={cn(
                          "h-3 w-3 rounded-full",
                          priorityColors[wo.priority as keyof typeof priorityColors]
                        )} />
                      </div>
                      
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                        {wo.description}
                      </p>
                      
                      <div className="flex flex-wrap gap-2">
                        <StatusBadge status={wo.status} className="text-xs" />
                        <StatusBadge status={wo.type} className="text-xs" />
                      </div>
                      
                      {wo.assignedToName && (
                        <div className="flex items-center gap-1 mt-3 text-xs text-muted-foreground">
                          <User className="h-3 w-3" />
                          {wo.assignedToName}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>

          {/* Estatísticas do mês */}
          <div className="p-4 border-t bg-muted/30 flex-shrink-0">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <p className="text-xl font-bold text-primary">{filteredWorkOrders.length}</p>
                <p className="text-xs text-muted-foreground">Total de OS</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-red-600">
                  {filteredWorkOrders.filter(wo => wo.priority === 'CRITICAL' && wo.status !== 'COMPLETED').length}
                </p>
                <p className="text-xs text-muted-foreground">Críticas Pendentes</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-blue-600">
                  {filteredWorkOrders.filter(wo => wo.status === 'OPEN').length}
                </p>
                <p className="text-xs text-muted-foreground">Abertas</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-amber-600">
                  {filteredWorkOrders.filter(wo => wo.status === 'IN_PROGRESS').length}
                </p>
                <p className="text-xs text-muted-foreground">Em Execução</p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Edit Work Order Modal */}
      <WorkOrderEditModal
        workOrder={editingOrder}
        isOpen={!!editingOrder}
        onClose={() => setEditingOrder(null)}
        onSave={handleSaveWorkOrder}
      />
    </div>
  );
}
