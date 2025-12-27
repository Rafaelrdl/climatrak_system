/**
 * WorkOrderSchedulingPage - Página de Programação de Ordens de Serviço
 * 
 * Permite:
 * - Visualizar OS pendentes (não atribuídas)
 * - Arrastar e soltar OS para técnicos específicos
 * - Arrastar e soltar OS para dias específicos do mês
 * - Visualização em grade: Técnicos x Dias do Mês
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  format, 
  eachDayOfInterval, 
  addWeeks,
  subWeeks,
  parseISO,
  isSameDay,
  isWeekend,
  startOfWeek,
  endOfWeek
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  useDroppable,
  useDraggable,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { StatusBadge } from '@/components/StatusBadge';
import { 
  ChevronLeft, 
  ChevronRight, 
  ArrowLeft,
  ClipboardList,
  User,
  Calendar,
  GripVertical,
  AlertCircle
} from 'lucide-react';
import { useWorkOrders, useUpdateWorkOrder } from '@/hooks/useWorkOrdersQuery';
import { useTechnicians } from '@/hooks/useTeamQuery';
import { useEquipments } from '@/hooks/useEquipmentQuery';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { WorkOrder } from '@/types';

// ============================================
// Cores de prioridade
// ============================================
const priorityColors = {
  CRITICAL: 'bg-red-100 border-red-300 text-red-800',
  HIGH: 'bg-orange-100 border-orange-300 text-orange-800',
  MEDIUM: 'bg-yellow-100 border-yellow-300 text-yellow-800',
  LOW: 'bg-blue-100 border-blue-300 text-blue-800',
};

const priorityDotColors = {
  CRITICAL: 'bg-red-500',
  HIGH: 'bg-orange-500',
  MEDIUM: 'bg-yellow-500',
  LOW: 'bg-blue-500',
};

// ============================================
// Componente de OS Arrastável
// ============================================
interface DraggableWorkOrderProps {
  workOrder: WorkOrder;
  equipmentName: string;
  isCompact?: boolean;
}

function DraggableWorkOrder({ workOrder, equipmentName, isCompact = false }: DraggableWorkOrderProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: workOrder.id,
    data: { workOrder },
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  if (isCompact) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        {...listeners}
        {...attributes}
        className={cn(
          "p-2 rounded border cursor-grab active:cursor-grabbing transition-all text-xs",
          priorityColors[workOrder.priority as keyof typeof priorityColors],
          isDragging && "opacity-50 shadow-lg scale-105"
        )}
      >
        <div className="flex items-center gap-1">
          <GripVertical className="h-3 w-3 opacity-50" />
          <span className="font-medium truncate">{workOrder.number}</span>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        "p-3 rounded-lg border cursor-grab active:cursor-grabbing transition-all",
        priorityColors[workOrder.priority as keyof typeof priorityColors],
        isDragging && "opacity-50 shadow-lg scale-105"
      )}
    >
      <div className="flex items-start gap-2">
        <GripVertical className="h-4 w-4 mt-0.5 opacity-50 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold text-sm">{workOrder.number}</span>
            <div className={cn(
              "h-2 w-2 rounded-full flex-shrink-0",
              priorityDotColors[workOrder.priority as keyof typeof priorityDotColors]
            )} />
          </div>
          <p className="text-xs opacity-75 truncate mt-0.5">{equipmentName}</p>
          <p className="text-xs opacity-60 line-clamp-1 mt-1">{workOrder.description}</p>
          <div className="flex items-center gap-1 mt-2">
            <StatusBadge status={workOrder.type} className="text-[10px] h-5" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Componente de Célula Droppable
// ============================================
interface DroppableCellProps {
  id: string;
  children: React.ReactNode;
  className?: string;
  isHighlighted?: boolean;
}

function DroppableCell({ id, children, className, isHighlighted }: DroppableCellProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "min-h-[80px] p-1 transition-colors",
        isOver && "bg-primary/20 ring-2 ring-primary ring-inset",
        isHighlighted && !isOver && "bg-muted/50",
        className
      )}
    >
      {children}
    </div>
  );
}

// ============================================
// Componente Principal
// ============================================
export function WorkOrderSchedulingPage() {
  const navigate = useNavigate();
  const [currentWeekStart, setCurrentWeekStart] = useState(() => startOfWeek(new Date(), { locale: ptBR }));
  const [activeWorkOrder, setActiveWorkOrder] = useState<WorkOrder | null>(null);
  
  const { data: workOrders = [], isLoading: isLoadingWO } = useWorkOrders();
  const { data: technicians = [], isLoading: isLoadingTech } = useTechnicians();
  const { data: equipment = [] } = useEquipments();
  const updateMutation = useUpdateWorkOrder();

  // Sensores para drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Dias da semana atual (7 dias)
  const weekDays = useMemo(() => {
    const weekEnd = endOfWeek(currentWeekStart, { locale: ptBR });
    return eachDayOfInterval({ start: currentWeekStart, end: weekEnd });
  }, [currentWeekStart]);

  // OS pendentes (sem técnico atribuído)
  const pendingWorkOrders = useMemo(() => {
    return workOrders.filter(wo => 
      wo.status === 'OPEN' && !wo.assignedTo
    );
  }, [workOrders]);

  // OS agendadas organizadas por técnico e data
  const scheduledWorkOrders = useMemo(() => {
    const scheduled: Record<string, Record<string, WorkOrder[]>> = {};
    
    workOrders
      .filter(wo => wo.assignedTo && wo.scheduledDate)
      .forEach(wo => {
        const techId = String(wo.assignedTo);
        const dateKey = format(parseISO(wo.scheduledDate), 'yyyy-MM-dd');
        
        if (!scheduled[techId]) {
          scheduled[techId] = {};
        }
        if (!scheduled[techId][dateKey]) {
          scheduled[techId][dateKey] = [];
        }
        scheduled[techId][dateKey].push(wo);
      });
    
    return scheduled;
  }, [workOrders]);

  const getEquipmentName = (equipmentId: string) => {
    const eq = equipment.find(e => e.id === equipmentId);
    return eq ? eq.tag : 'N/A';
  };

  const goToPreviousWeek = () => setCurrentWeekStart(subWeeks(currentWeekStart, 1));
  const goToNextWeek = () => setCurrentWeekStart(addWeeks(currentWeekStart, 1));
  const goToToday = () => setCurrentWeekStart(startOfWeek(new Date(), { locale: ptBR }));

  // Handlers de drag and drop
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const wo = workOrders.find(w => w.id === active.id);
    if (wo) {
      setActiveWorkOrder(wo);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveWorkOrder(null);

    if (!over) return;

    const workOrderId = active.id as string;
    const dropId = over.id as string;

    // Parse do ID do drop: "tech-{techId}-date-{dateKey}" ou "pending"
    if (dropId === 'pending') {
      // Removendo atribuição - volta para pendentes
      updateMutation.mutate(
        { 
          id: workOrderId, 
          data: { 
            assignedTo: undefined,
            assignedToName: undefined
          } 
        },
        {
          onSuccess: () => {
            toast.success('OS removida da programação');
          },
          onError: () => {
            toast.error('Erro ao atualizar OS');
          }
        }
      );
      return;
    }

    const match = dropId.match(/^tech-(\d+)-date-(.+)$/);
    if (match) {
      const techId = match[1];
      const dateKey = match[2];
      
      const technician = technicians.find(t => String(t.user.id) === techId);
      if (!technician) return;

      updateMutation.mutate(
        { 
          id: workOrderId, 
          data: { 
            assignedTo: techId,
            assignedToName: technician.user.full_name,
            scheduledDate: dateKey
          } 
        },
        {
          onSuccess: () => {
            toast.success(`OS atribuída para ${technician.user.full_name} em ${format(parseISO(dateKey), "dd/MM", { locale: ptBR })}`);
          },
          onError: () => {
            toast.error('Erro ao atribuir OS');
          }
        }
      );
    }
  };

  const isLoading = isLoadingWO || isLoadingTech;

  return (
    <div className="space-y-6">
      <PageHeader title="Programação de Ordens de Serviço">
        <Button 
          variant="outline"
          className="flex items-center gap-2"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
      </PageHeader>

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-6 h-[calc(100vh-180px)]">
          {/* Painel de OS Pendentes */}
          <Card className="w-[320px] flex flex-col overflow-hidden">
            <CardHeader className="flex-shrink-0 pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertCircle className="h-5 w-5 text-amber-500" />
                OS Pendentes
                <Badge variant="secondary" className="ml-auto">
                  {pendingWorkOrders.length}
                </Badge>
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Arraste para atribuir a um técnico
              </p>
            </CardHeader>
            
            <DroppableCell id="pending" className="flex-1 border-t">
              <ScrollArea className="h-full">
                <div className="p-3 space-y-2">
                  {pendingWorkOrders.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <ClipboardList className="h-10 w-10 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">Nenhuma OS pendente</p>
                    </div>
                  ) : (
                    pendingWorkOrders.map(wo => (
                      <DraggableWorkOrder
                        key={wo.id}
                        workOrder={wo}
                        equipmentName={getEquipmentName(wo.equipmentId)}
                      />
                    ))
                  )}
                </div>
              </ScrollArea>
            </DroppableCell>
          </Card>

          {/* Grade de Programação */}
          <Card className="flex-1 flex flex-col overflow-hidden">
            <CardHeader className="flex-shrink-0 pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Calendar className="h-5 w-5" />
                  Programação
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" onClick={goToPreviousWeek}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm font-medium min-w-[200px] text-center">
                    {format(currentWeekStart, "dd 'de' MMM", { locale: ptBR })} - {format(endOfWeek(currentWeekStart, { locale: ptBR }), "dd 'de' MMM yyyy", { locale: ptBR })}
                  </span>
                  <Button variant="outline" size="icon" onClick={goToNextWeek}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={goToToday}>
                    Hoje
                  </Button>
                </div>
              </div>
            </CardHeader>
            
            <div className="flex-1 overflow-hidden border-t">
              <ScrollArea className="h-full">
                <div className="min-w-max">
                  {/* Cabeçalho com dias */}
                  <div className="flex sticky top-0 bg-background z-10 border-b">
                    <div className="w-[180px] flex-shrink-0 p-3 border-r bg-muted/50 font-medium text-sm flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Técnico
                    </div>
                    {weekDays.map(day => {
                      const isToday = isSameDay(day, new Date());
                      const isWeekendDay = isWeekend(day);
                      
                      return (
                        <div
                          key={day.toISOString()}
                          className={cn(
                            "flex-1 min-w-[120px] p-3 border-r text-center",
                            isToday && "bg-primary/10",
                            isWeekendDay && "bg-muted/30"
                          )}
                        >
                          <div className="text-xs text-muted-foreground uppercase">
                            {format(day, 'EEEE', { locale: ptBR })}
                          </div>
                          <div className={cn(
                            "text-lg font-semibold",
                            isToday && "text-primary"
                          )}>
                            {format(day, 'd')}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {format(day, 'MMM', { locale: ptBR })}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Linhas dos técnicos */}
                  {technicians.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <User className="h-12 w-12 mx-auto mb-3 opacity-30" />
                      <p className="text-sm">Nenhum técnico cadastrado</p>
                    </div>
                  ) : (
                    technicians.map(tech => (
                      <div key={tech.id} className="flex border-b hover:bg-muted/20">
                        {/* Nome do técnico */}
                        <div className="w-[180px] flex-shrink-0 p-2 border-r bg-muted/30 min-h-[80px] flex items-center">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <User className="h-4 w-4 text-primary" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">
                                {tech.user.full_name || tech.user.username}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                {tech.role}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Células para cada dia */}
                        {weekDays.map(day => {
                          const dateKey = format(day, 'yyyy-MM-dd');
                          const cellId = `tech-${tech.user.id}-date-${dateKey}`;
                          const cellOrders = scheduledWorkOrders[String(tech.user.id)]?.[dateKey] || [];
                          const isWeekendDay = isWeekend(day);
                          const isToday = isSameDay(day, new Date());

                          return (
                            <DroppableCell
                              key={cellId}
                              id={cellId}
                              className={cn(
                                "flex-1 min-w-[120px] border-r",
                                isWeekendDay && "bg-muted/20",
                                isToday && "bg-primary/5"
                              )}
                            >
                              <div className="space-y-1">
                                {cellOrders.map(wo => (
                                  <DraggableWorkOrder
                                    key={wo.id}
                                    workOrder={wo}
                                    equipmentName={getEquipmentName(wo.equipmentId)}
                                    isCompact
                                  />
                                ))}
                              </div>
                            </DroppableCell>
                          );
                        })}
                      </div>
                    ))
                  )}
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </div>

            {/* Legenda */}
            <div className="flex-shrink-0 p-3 border-t bg-muted/30">
              <div className="flex items-center gap-6 text-xs text-muted-foreground">
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
                <Separator orientation="vertical" className="h-4" />
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-muted/50 border rounded" />
                  <span>Final de semana</span>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Overlay durante o arraste */}
        <DragOverlay>
          {activeWorkOrder ? (
            <div className={cn(
              "p-3 rounded-lg border shadow-xl cursor-grabbing",
              priorityColors[activeWorkOrder.priority as keyof typeof priorityColors]
            )}>
              <div className="flex items-center gap-2">
                <GripVertical className="h-4 w-4 opacity-50" />
                <div>
                  <span className="font-semibold text-sm">{activeWorkOrder.number}</span>
                  <p className="text-xs opacity-75">{getEquipmentName(activeWorkOrder.equipmentId)}</p>
                </div>
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
