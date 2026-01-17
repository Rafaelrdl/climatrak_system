import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Play, 
  Edit, 
  Calendar, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  GripVertical, 
  XCircle,
  Wrench,
  AlertTriangle,
  Zap,
  HelpCircle,
  Settings
} from 'lucide-react';
import { format, isPast, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useEquipments } from '@/hooks/useEquipmentQuery';
import type { WorkOrder, Equipment } from '@/types';
import { getPriorityLabel } from '@/shared/ui/statusBadgeUtils';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  useDroppable
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface KanbanColumnProps {
  title: string;
  status: WorkOrder['status'];
  workOrders: WorkOrder[];
  equipmentById: Map<string, Equipment>;
  onStartWorkOrder?: (id: string) => void;
  onEditWorkOrder?: (wo: WorkOrder) => void;
}

interface WorkOrderCardProps {
  workOrder: WorkOrder;
  equipmentById: Map<string, Equipment>;
  onStartWorkOrder?: (id: string) => void;
  onEditWorkOrder?: (wo: WorkOrder) => void;
}

function WorkOrderCard({ 
  workOrder, 
  equipmentById,
  onStartWorkOrder, 
  onEditWorkOrder 
}: WorkOrderCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: workOrder.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const eq = equipmentById.get(String(workOrder.equipmentId));
  
  // Parsear data como local para evitar timezone issues
  const parseLocalDate = (dateString: string): Date => {
    if (dateString.includes('T')) return new Date(dateString);
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
  };
  
  const scheduledDate = workOrder.scheduledDate 
    ? parseLocalDate(workOrder.scheduledDate) 
    : null;
  
  const formattedDate = scheduledDate 
    ? format(scheduledDate, "dd/MM", { locale: ptBR })
    : '';

  const isOverdue = scheduledDate && isPast(scheduledDate) && !isToday(scheduledDate) && workOrder.status !== 'COMPLETED' && workOrder.status !== 'CANCELLED';
  const isDueToday = scheduledDate && isToday(scheduledDate);

  const priorityLabel = getPriorityLabel(workOrder.priority);

  // Configuração visual por tipo de OS
  const getTypeConfig = () => {
    switch (workOrder.type) {
      case 'PREVENTIVE':
        return { icon: Settings, color: 'text-blue-600', bgColor: 'bg-blue-50', label: 'Preventiva' };
      case 'CORRECTIVE':
        return { icon: Wrench, color: 'text-orange-600', bgColor: 'bg-orange-50', label: 'Corretiva' };
      case 'EMERGENCY':
        return { icon: Zap, color: 'text-red-600', bgColor: 'bg-red-50', label: 'Emergência' };
      case 'REQUEST':
        return { icon: HelpCircle, color: 'text-purple-600', bgColor: 'bg-purple-50', label: 'Solicitação' };
      default:
        return { icon: Wrench, color: 'text-gray-600', bgColor: 'bg-gray-50', label: workOrder.type };
    }
  };

  // Configuração visual por prioridade
  const getPriorityConfig = () => {
    switch (workOrder.priority) {
      case 'LOW':
        return { color: 'bg-blue-100 text-blue-700 border-blue-200', dotColor: 'bg-blue-500' };
      case 'MEDIUM':
        return { color: 'bg-yellow-100 text-yellow-700 border-yellow-200', dotColor: 'bg-yellow-500' };
      case 'HIGH':
        return { color: 'bg-orange-100 text-orange-700 border-orange-200', dotColor: 'bg-orange-500' };
      case 'CRITICAL':
        return { color: 'bg-red-100 text-red-700 border-red-200', dotColor: 'bg-red-500' };
      default:
        return { color: 'bg-gray-100 text-gray-700 border-gray-200', dotColor: 'bg-gray-500' };
    }
  };

  // Configuração visual por status (borda lateral)
  const getStatusBorderColor = () => {
    switch (workOrder.status) {
      case 'OPEN':
        return 'border-l-blue-500';
      case 'IN_PROGRESS':
        return 'border-l-orange-500';
      case 'COMPLETED':
        return 'border-l-green-500';
      case 'CANCELLED':
        return 'border-l-gray-400';
      default:
        return 'border-l-gray-300';
    }
  };

  const typeConfig = getTypeConfig();
  const priorityConfig = getPriorityConfig();
  const TypeIcon = typeConfig.icon;

  // Gerar iniciais do responsável
  const getInitials = (name: string) => {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <TooltipProvider>
      <div
        ref={setNodeRef}
        style={style}
        className="touch-none mb-3"
      >
        <Card className={cn(
          "group hover:shadow-lg transition-all duration-200 border-l-4",
          "hover:border-primary/50 overflow-hidden",
          getStatusBorderColor()
        )}>
          <CardContent className="p-3">
            {/* Header: Drag handle + Número + Tipo + Ações */}
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-start gap-2 flex-1 min-w-0">
                {/* Drag Handle */}
                <div 
                  {...attributes}
                  {...listeners}
                  className="cursor-grab active:cursor-grabbing opacity-30 hover:opacity-100 transition-opacity mt-0.5"
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                </div>
                
                <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                  {/* Número da OS */}
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-foreground truncate" title={workOrder.number}>
                      {workOrder.number}
                    </span>
                    
                    {/* Badge de prioridade */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge 
                          variant="outline" 
                          className={cn(
                            "text-[9px] px-1.5 py-0 h-4 font-medium border",
                            priorityConfig.color
                          )}
                        >
                          {priorityLabel}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">
                        Prioridade: {priorityLabel}
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  
                  {/* Tipo de manutenção */}
                  {workOrder.type && (
                    <div className={cn(
                      "flex items-center gap-1.5 w-fit px-2 py-0.5 rounded-full text-[10px] font-medium",
                      typeConfig.bgColor,
                      typeConfig.color
                    )}>
                      <TypeIcon className="h-3 w-3" />
                      <span>{typeConfig.label}</span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Ações (visíveis no hover) */}
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                {workOrder.status === 'OPEN' && onStartWorkOrder && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 w-7 p-0 hover:bg-green-100 hover:text-green-700"
                        onClick={(e) => {
                          e.stopPropagation();
                          onStartWorkOrder(workOrder.id);
                        }}
                      >
                        <Play className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      Iniciar OS
                    </TooltipContent>
                  </Tooltip>
                )}
                
                {onEditWorkOrder && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 w-7 p-0 hover:bg-blue-100 hover:text-blue-700"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditWorkOrder(workOrder);
                        }}
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      Editar OS
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
            </div>

            {/* Descrição */}
            <Tooltip>
              <TooltipTrigger asChild>
                <p 
                  className="text-xs text-muted-foreground mb-2.5 leading-relaxed line-clamp-2"
                >
                  {workOrder.description || 'Sem descrição'}
                </p>
              </TooltipTrigger>
              {workOrder.description && workOrder.description.length > 60 && (
                <TooltipContent side="bottom" className="max-w-[280px] text-xs">
                  {workOrder.description}
                </TooltipContent>
              )}
            </Tooltip>

            {/* Equipamento */}
            {eq && (
              <div className="flex items-center gap-1.5 mb-2.5">
                <div className="flex items-center gap-1.5 px-2 py-1 bg-muted/50 rounded-md text-xs">
                  <Settings className="h-3 w-3 text-primary" />
                  <span className="font-medium truncate max-w-[180px]" title={eq.tag}>
                    {eq.tag}
                  </span>
                </div>
              </div>
            )}

            {/* Footer: Data + Responsável */}
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/50">
              {/* Data programada */}
              {formattedDate ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className={cn(
                      "flex items-center gap-1.5 text-xs px-2 py-1 rounded-md",
                      isOverdue && "bg-red-100 text-red-700",
                      isDueToday && !isOverdue && "bg-amber-100 text-amber-700",
                      !isOverdue && !isDueToday && "text-muted-foreground"
                    )}>
                      {isOverdue ? (
                        <AlertTriangle className="h-3 w-3" />
                      ) : (
                        <Calendar className="h-3 w-3" />
                      )}
                      <span className="font-medium">{formattedDate}</span>
                      {isOverdue && <span className="text-[10px]">Atrasada</span>}
                      {isDueToday && !isOverdue && <span className="text-[10px]">Hoje</span>}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    {isOverdue 
                      ? `OS atrasada - agendada para ${format(scheduledDate!, "dd/MM/yyyy", { locale: ptBR })}`
                      : isDueToday 
                        ? 'Agendada para hoje'
                        : `Agendada para ${format(scheduledDate!, "dd/MM/yyyy", { locale: ptBR })}`
                    }
                  </TooltipContent>
                </Tooltip>
              ) : (
                <div className="flex items-center gap-1 text-xs text-muted-foreground/60">
                  <Calendar className="h-3 w-3" />
                  <span className="italic">Sem data</span>
                </div>
              )}

              {/* Responsável */}
              {workOrder.assignedToName ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1.5">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-medium">
                          {getInitials(workOrder.assignedToName)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs text-muted-foreground truncate max-w-[80px]">
                        {workOrder.assignedToName.split(' ')[0]}
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    Responsável: {workOrder.assignedToName}
                  </TooltipContent>
                </Tooltip>
              ) : (
                <div className="flex items-center gap-1.5">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-[10px] bg-muted text-muted-foreground">
                      --
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs text-muted-foreground/60 italic">Não atribuída</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}

function KanbanColumn({ 
  title, 
  status,
  workOrders, 
  equipmentById,
  onStartWorkOrder, 
  onEditWorkOrder 
}: KanbanColumnProps) {
  const {
    isOver,
    setNodeRef
  } = useDroppable({
    id: status,
  });

  // Cores e ícones por status
  const getStatusConfig = () => {
    switch (status) {
      case 'OPEN':
        return {
          icon: AlertCircle,
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          hoverBg: 'bg-blue-100',
        };
      case 'IN_PROGRESS':
        return {
          icon: Clock,
          color: 'text-orange-600',
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-200',
          hoverBg: 'bg-orange-100',
        };
      case 'COMPLETED':
        return {
          icon: CheckCircle2,
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          hoverBg: 'bg-green-100',
        };
      case 'CANCELLED':
        return {
          icon: XCircle,
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          hoverBg: 'bg-red-100',
        };
      default:
        return {
          icon: AlertCircle,
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          hoverBg: 'bg-gray-100',
        };
    }
  };

  const config = getStatusConfig();
  const StatusIcon = config.icon;

  return (
    <div className="flex-1 min-w-[280px] max-w-[400px] flex flex-col">
      <Card className={`flex flex-col h-full border-t-4 ${config.borderColor}`}>
        {/* Header fixo */}
        <CardHeader className={`pb-3 pt-4 ${config.bgColor} border-b`}>
          <CardTitle className="flex items-center justify-between text-sm font-semibold">
            <div className="flex items-center gap-2">
              <StatusIcon className={`h-4 w-4 ${config.color}`} />
              <span>{title}</span>
            </div>
            <Badge 
              variant="secondary" 
              className={`${config.color} ${config.bgColor} border-0 font-bold`}
            >
              {workOrders.length}
            </Badge>
          </CardTitle>
        </CardHeader>

        {/* Área de drop com scroll */}
        <CardContent className="flex-1 p-3 overflow-hidden">
          <ScrollArea className="h-full pr-3">
            <div
              ref={setNodeRef}
              className={`min-h-full rounded-lg transition-all duration-200 ${
                isOver ? `${config.hoverBg} ring-2 ring-primary ring-offset-2` : ''
              }`}
            >
              <SortableContext 
                items={workOrders.map(wo => wo.id)} 
                strategy={verticalListSortingStrategy}
              >
                {workOrders.length > 0 ? (
                  workOrders.map((wo) => (
                    <WorkOrderCard
                      key={wo.id}
                      workOrder={wo}
                      equipmentById={equipmentById}
                      onStartWorkOrder={onStartWorkOrder}
                      onEditWorkOrder={onEditWorkOrder}
                    />
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <StatusIcon className="h-12 w-12 mb-3 opacity-20" />
                    <p className="text-sm font-medium">Nenhuma OS</p>
                    <p className="text-xs mt-1">Arraste os cards para cá</p>
                  </div>
                )}
              </SortableContext>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

interface WorkOrderKanbanProps {
  workOrders: WorkOrder[];
  onUpdateWorkOrder: (id: string, updates: Partial<WorkOrder>) => void;
  onStartWorkOrder?: (id: string) => void;
  onEditWorkOrder?: (wo: WorkOrder) => void;
}

export function WorkOrderKanban({ 
  workOrders, 
  onUpdateWorkOrder,
  onStartWorkOrder, 
  onEditWorkOrder 
}: WorkOrderKanbanProps) {
  const { data: equipment = [] } = useEquipments();
  const [activeId, setActiveId] = useState<string | null>(null);
  const equipmentById = useMemo(() => {
    const map = new Map<string, Equipment>();
    equipment.forEach((eq) => map.set(String(eq.id), eq));
    return map;
  }, [equipment]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const columns = useMemo(() => [
    {
      id: 'OPEN',
      title: 'Abertas',
      status: 'OPEN' as const,
      workOrders: workOrders.filter(wo => wo.status === 'OPEN'),
    },
    {
      id: 'IN_PROGRESS',
      title: 'Em Progresso',
      status: 'IN_PROGRESS' as const,
      workOrders: workOrders.filter(wo => wo.status === 'IN_PROGRESS'),
    },
    {
      id: 'COMPLETED',
      title: 'Finalizadas',
      status: 'COMPLETED' as const,
      workOrders: workOrders.filter(wo => wo.status === 'COMPLETED'),
    },
    {
      id: 'CANCELLED',
      title: 'Canceladas',
      status: 'CANCELLED' as const,
      workOrders: workOrders.filter(wo => wo.status === 'CANCELLED'),
    },
  ], [workOrders]);

  const activeWorkOrder = activeId 
    ? workOrders.find(wo => wo.id === activeId) 
    : null;

  function handleDragStart(event: DragStartEvent) {

    setActiveId(event.active.id as string);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;



    if (!over) {

      setActiveId(null);
      return;
    }

    const activeWorkOrder = workOrders.find(wo => wo.id === active.id);
    if (!activeWorkOrder) {

      setActiveId(null);
      return;
    }

    // Verificar se estamos soltando em uma coluna (droppable zone)
    const overId = over.id as string;

    
    // overId pode ser 'OPEN', 'IN_PROGRESS', 'COMPLETED' ou 'CANCELLED'
    if (['OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].includes(overId)) {
      const newStatus = overId as WorkOrder['status'];
      
      if (activeWorkOrder.status !== newStatus) {
        onUpdateWorkOrder(activeWorkOrder.id, { 
          status: newStatus,
          ...(newStatus === 'COMPLETED' && { completedAt: new Date().toISOString() })
        });
      }
      // No action needed if status is the same
    }
    // No action needed for invalid drop targets

    setActiveId(null);
  }

  return (
    <div className="h-full w-full overflow-hidden">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {/* Container responsivo com altura fixa e scroll horizontal */}
        <div className="flex gap-4 h-[calc(100vh-200px)] px-1">
          {columns.map((column) => (
            <KanbanColumn
              key={column.id}
              title={column.title}
              status={column.status}
              workOrders={column.workOrders}
              equipmentById={equipmentById}
              onStartWorkOrder={onStartWorkOrder}
              onEditWorkOrder={onEditWorkOrder}
            />
          ))}
        </div>

        <DragOverlay>
          {activeWorkOrder ? (
            <div className="rotate-3 scale-105 opacity-90">
              <WorkOrderCard
                workOrder={activeWorkOrder}
                equipmentById={equipmentById}
                onStartWorkOrder={onStartWorkOrder}
                onEditWorkOrder={onEditWorkOrder}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
