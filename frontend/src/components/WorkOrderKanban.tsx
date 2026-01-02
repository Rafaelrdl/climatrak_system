import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Play, Edit, User, Calendar, AlertCircle, CheckCircle2, Clock, GripVertical, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useEquipments } from '@/hooks/useEquipmentQuery';
import { useWorkOrderSettingsStore } from '@/store/useWorkOrderSettingsStore';
import type { WorkOrder, Equipment } from '@/types';
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
  const { settings } = useWorkOrderSettingsStore();
  
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
  
  const formattedDate = workOrder.scheduledDate 
    ? format(parseLocalDate(workOrder.scheduledDate), "dd/MM", { locale: ptBR })
    : '';

  // Obter configuração de tipo
  const typeConfig = settings.types.find(t => t.id === workOrder.type);
  
  // Definir cor baseada na prioridade
  const getPriorityColor = () => {
    switch (workOrder.priority) {
      case 'CRITICAL': return 'bg-red-500';
      case 'HIGH': return 'bg-orange-500';
      case 'MEDIUM': return 'bg-yellow-500';
      case 'LOW': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getPriorityLabel = () => {
    switch (workOrder.priority) {
      case 'CRITICAL': return 'Crítica';
      case 'HIGH': return 'Alta';
      case 'MEDIUM': return 'Média';
      case 'LOW': return 'Baixa';
      default: return '';
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="touch-none mb-3"
    >
      <Card className="group hover:shadow-lg transition-all duration-200 border hover:border-primary/50">
        <CardContent className="p-3">
          {/* Header com número, tipo e drag handle */}
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div 
                {...attributes}
                {...listeners}
                className="cursor-grab active:cursor-grabbing opacity-40 hover:opacity-100 transition-opacity"
              >
                <GripVertical className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex flex-col gap-1 flex-1 min-w-0">
                <span className="font-semibold text-sm truncate" title={workOrder.number}>
                  {workOrder.number}
                </span>
                {typeConfig && (
                  <Badge 
                    variant="outline" 
                    className="w-fit text-[10px] px-1.5 py-0"
                    style={{ 
                      backgroundColor: `${typeConfig.color}15`,
                      borderColor: typeConfig.color,
                      color: typeConfig.color
                    }}
                  >
                    {typeConfig.label}
                  </Badge>
                )}
              </div>
            </div>
            
            {/* Ações */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {workOrder.status === 'OPEN' && onStartWorkOrder && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 w-7 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    onStartWorkOrder(workOrder.id);
                  }}
                  title="Iniciar OS"
                >
                  <Play className="h-3.5 w-3.5" />
                </Button>
              )}
              
              {onEditWorkOrder && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 w-7 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditWorkOrder(workOrder);
                  }}
                  title="Editar OS"
                >
                  <Edit className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>

          {/* Descrição */}
          <p 
            className="text-xs text-muted-foreground mb-2 leading-relaxed"
            title={workOrder.description}
            style={{
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden'
            }}
          >
            {workOrder.description}
          </p>

          {/* Equipamento */}
          {eq && (
            <div className="flex items-center gap-1.5 text-xs mb-2">
              <div className="h-1.5 w-1.5 rounded-full bg-primary"></div>
              <span className="font-medium truncate" title={eq.tag}>
                {eq.tag}
              </span>
            </div>
          )}

          {/* Footer com prioridade, data e responsável */}
          <div className="flex items-center justify-between gap-2 pt-2 border-t">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {/* Prioridade */}
              <div className="flex items-center gap-1">
                <div className={`h-2 w-2 rounded-full ${getPriorityColor()}`} title={getPriorityLabel()}></div>
              </div>
              
              {/* Data programada */}
              {formattedDate && (
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  <span>{formattedDate}</span>
                </div>
              )}
            </div>

            {/* Responsável */}
            {workOrder.assignedToName && (
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground max-w-[120px]">
                <User className="h-3 w-3 flex-shrink-0" />
                <span className="truncate" title={workOrder.assignedToName}>
                  {workOrder.assignedToName.split(' ')[0]}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
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
