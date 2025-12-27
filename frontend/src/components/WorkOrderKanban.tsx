import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

import { Play, Edit } from 'lucide-react';
import { format } from 'date-fns';
import { useEquipments } from '@/hooks/useEquipmentQuery';
import type { WorkOrder } from '@/types';
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
  onStartWorkOrder?: (id: string) => void;
  onEditWorkOrder?: (wo: WorkOrder) => void;
}

interface WorkOrderCardProps {
  workOrder: WorkOrder;
  onStartWorkOrder?: (id: string) => void;
  onEditWorkOrder?: (wo: WorkOrder) => void;
}

function WorkOrderCard({ 
  workOrder, 
  onStartWorkOrder, 
  onEditWorkOrder 
}: WorkOrderCardProps) {
  const { data: equipment = [] } = useEquipments();
  
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
    opacity: isDragging ? 0.5 : 1,
  };

  const eq = equipment.find(e => e.id === workOrder.equipmentId);
  
  // Formatar data de forma mais compacta
  const formattedDate = workOrder.scheduledDate 
    ? format(new Date(workOrder.scheduledDate), "dd/MM") 
    : '';

  // Definir cor da borda baseada na prioridade e status
  const getBorderColor = () => {
    if (workOrder.priority === 'CRITICAL') return 'hsl(var(--destructive))';
    if (workOrder.priority === 'HIGH') return '#f97316'; // orange-500
    if (workOrder.status === 'COMPLETED') return '#22c55e'; // green-500
    return 'hsl(var(--border))';
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="touch-none"
    >
      <Card 
        className="mb-2 cursor-move hover:shadow-md transition-shadow border-l-4" 
        style={{ borderLeftColor: getBorderColor() }}
      >
        <CardContent className="p-2">
          {/* Cabeçalho compacto com número e tipo */}
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1">
              <span className="font-medium text-xs truncate max-w-[100px]" title={workOrder.number}>
                {workOrder.number}
              </span>
              <div 
                className="h-3 w-3 rounded-full flex-shrink-0" 
                style={{ 
                  backgroundColor: workOrder.type === 'PREVENTIVE' ? '#22c55e' : workOrder.type === 'REQUEST' ? '#8b5cf6' : '#f97316' 
                }} 
                title={workOrder.type === 'PREVENTIVE' ? 'Preventiva' : workOrder.type === 'REQUEST' ? 'Solicitação' : 'Corretiva'} 
              />
            </div>
            <span className="text-[10px] text-muted-foreground flex-shrink-0">{formattedDate}</span>
          </div>

          {/* Descrição truncada */}
          <p 
            className="text-xs mb-1" 
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

          {/* Linha de informação do equipamento */}
          <p className="text-xs font-medium truncate mb-1 text-muted-foreground" title={eq?.tag || ''}>
            {eq?.tag}
          </p>

          {/* Responsável (se houver) */}
          {(workOrder.assignedToName || workOrder.assignedTo) && (
            <div className="text-[10px] text-muted-foreground mb-1 truncate" title={workOrder.assignedToName || workOrder.assignedTo}>
              👤 {workOrder.assignedToName || workOrder.assignedTo}
            </div>
          )}

          {/* Ações compactas */}
          <div className="flex items-center justify-end gap-0.5">
            {workOrder.status === 'OPEN' && onStartWorkOrder && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 w-6 p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  onStartWorkOrder(workOrder.id);
                }}
                title="Iniciar OS"
              >
                <Play className="h-3 w-3" />
                <span className="sr-only">Iniciar</span>
              </Button>
            )}
            
            {onEditWorkOrder && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 w-6 p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  onEditWorkOrder(workOrder);
                }}
                title="Editar OS"
              >
                <Edit className="h-3 w-3" />
                <span className="sr-only">Editar</span>
              </Button>
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
  onStartWorkOrder, 
  onEditWorkOrder 
}: KanbanColumnProps) {
  const {
    isOver,
    setNodeRef
  } = useDroppable({
    id: status,
  });

  const style = {
    backgroundColor: isOver ? 'hsl(var(--accent))' : undefined,
  };

  return (
    <div className="flex-1 min-w-[220px]">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-sm">
            {title}
            <Badge variant="secondary" className="ml-2 text-xs px-2 py-0.5">
              {workOrders.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div
            ref={setNodeRef}
            style={style}
            className="min-h-96 rounded-md transition-colors"
          >
            <SortableContext 
              items={workOrders.map(wo => wo.id)} 
              strategy={verticalListSortingStrategy}
            >
              {workOrders.map((wo) => (
                <WorkOrderCard
                  key={wo.id}
                  workOrder={wo}
                  onStartWorkOrder={onStartWorkOrder}
                  onEditWorkOrder={onEditWorkOrder}
                />
              ))}
              {workOrders.length === 0 && (
                <div className="text-center text-muted-foreground text-sm py-8">
                  Nenhuma ordem de serviço
                </div>
              )}
            </SortableContext>
          </div>
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
  const [activeId, setActiveId] = useState<string | null>(null);

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

    
    // overId será 'OPEN', 'IN_PROGRESS', ou 'COMPLETED'
    if (['OPEN', 'IN_PROGRESS', 'COMPLETED'].includes(overId)) {
      const newStatus = overId as WorkOrder['status'];
      
      if (activeWorkOrder.status !== newStatus) {

        
        onUpdateWorkOrder(activeWorkOrder.id, { 
          status: newStatus,
          ...(newStatus === 'COMPLETED' && { completedAt: new Date().toISOString() })
        });
      } else {

      }
    } else {

    }

    setActiveId(null);
  }

  return (
    <div className="kanban-container relative">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 pb-4 w-full overflow-x-auto">
          {columns.map((column) => (
            <KanbanColumn
              key={column.id}
              title={column.title}
              status={column.status}
              workOrders={column.workOrders}
              onStartWorkOrder={onStartWorkOrder}
              onEditWorkOrder={onEditWorkOrder}
            />
          ))}
        </div>

        <DragOverlay>
          {activeWorkOrder ? (
            <WorkOrderCard
              workOrder={activeWorkOrder}
              onStartWorkOrder={onStartWorkOrder}
              onEditWorkOrder={onEditWorkOrder}
            />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}