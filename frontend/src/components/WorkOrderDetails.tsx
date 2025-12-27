import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/StatusBadge';
import { 
  Calendar, 
  User, 
  ClipboardList, 
  Wrench, 
  AlertTriangle,
  Edit,
  Play
} from 'lucide-react';
import { useEquipments } from '@/hooks/useEquipmentQuery';
import { useSectors } from '@/hooks/useLocationsQuery';
import type { WorkOrder } from '@/types';
import { cn } from '@/lib/utils';

interface WorkOrderDetailsProps {
  workOrder: WorkOrder | null;
  loading?: boolean;
  onStartWorkOrder?: (id: string) => void;
  onEditWorkOrder?: (wo: WorkOrder) => void;
  className?: string;
}

export function WorkOrderDetails({ 
  workOrder, 
  loading = false, 
  onStartWorkOrder, 
  onEditWorkOrder,
  className 
}: WorkOrderDetailsProps) {
  const { data: equipment = [] } = useEquipments();
  const { data: sectors = [] } = useSectors();

  // Loading skeleton
  if (loading) {
    return (
      <div className={cn("p-6 h-full", className)}>
        <div className="space-y-6">
          <div className="space-y-3">
            <Skeleton className="h-8 w-48" />
            <div className="flex gap-2">
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-6 w-16" />
            </div>
          </div>
          <Skeleton className="h-px w-full" />
          <div className="space-y-4">
            <Skeleton className="h-6 w-32" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
          <div className="space-y-4">
            <Skeleton className="h-6 w-40" />
            <div className="space-y-3">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Empty state
  if (!workOrder) {
    return (
      <div className={cn("flex flex-col items-center justify-center h-full p-8 text-center bg-muted/10", className)}>
        <div className="space-y-6 max-w-sm">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
            <ClipboardList className="w-10 h-10 text-primary/60" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-semibold text-foreground">
              Nenhuma OS selecionada
            </h3>
            <p className="text-muted-foreground leading-relaxed">
              Selecione uma ordem de serviço na lista ao lado para visualizar todos os detalhes, histórico e opções de execução.
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <kbd className="px-2 py-1 bg-muted rounded text-xs">↑</kbd>
            <kbd className="px-2 py-1 bg-muted rounded text-xs">↓</kbd>
            <span>para navegar</span>
          </div>
        </div>
      </div>
    );
  }

  const eq = equipment.find(e => e.id === workOrder.equipmentId);
  const sector = sectors.find(s => s.id === eq?.sectorId);
  const isOverdue = new Date(workOrder.scheduledDate) < new Date() && workOrder.status !== 'COMPLETED';

  return (
    <div className={cn("p-6 h-full overflow-y-auto", className)}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-2xl font-semibold text-foreground">
              {workOrder.number}
            </h2>
            <div className="flex items-center gap-2">
              {onEditWorkOrder && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => onEditWorkOrder(workOrder)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </Button>
              )}
              {workOrder.status === 'OPEN' && onStartWorkOrder && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => onStartWorkOrder(workOrder.id)}
                >
                  <Play className="h-4 w-4 mr-2" />
                  Iniciar
                </Button>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge status={workOrder.status} />
            <StatusBadge status={workOrder.priority} />
            <StatusBadge status={workOrder.type} />
            {isOverdue && (
              <Badge variant="destructive" className="flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Em Atraso
              </Badge>
            )}
          </div>
        </div>

        <div className="w-full h-px bg-border" />

        {/* Equipment Information */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Wrench className="h-5 w-5" />
              Equipamento
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Tag:</span>
                <p className="font-medium">{eq?.tag || 'N/A'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Modelo:</span>
                <p className="font-medium">{eq?.brand} {eq?.model || 'N/A'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Tipo:</span>
                <p className="font-medium">{eq?.type || 'N/A'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Capacidade:</span>
                <p className="font-medium">{eq?.capacity?.toLocaleString() || 'N/A'} BTUs</p>
              </div>
              <div className="col-span-2">
                <span className="text-muted-foreground">Localização:</span>
                <p className="font-medium">{sector?.name || 'N/A'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Work Order Details */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <ClipboardList className="h-5 w-5" />
              Detalhes da OS
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <span className="text-muted-foreground text-sm">Descrição:</span>
              <p className="font-medium mt-1">{workOrder.description}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <span className="text-muted-foreground">Agendada para:</span>
                  <p className="font-medium">
                    {new Date(workOrder.scheduledDate).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>
              
              {(workOrder.assignedToName || workOrder.assignedTo) && (
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <span className="text-muted-foreground">Responsável:</span>
                    <p className="font-medium">{workOrder.assignedToName || workOrder.assignedTo}</p>
                  </div>
                </div>
              )}
            </div>

            {workOrder.completedAt && (
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <span className="text-muted-foreground">Concluída em:</span>
                  <p className="font-medium">
                    {new Date(workOrder.completedAt).toLocaleDateString('pt-BR')} às {' '}
                    {new Date(workOrder.completedAt).toLocaleTimeString('pt-BR')}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stock Items (if any) */}
        {workOrder.stockItems && workOrder.stockItems.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Materiais Utilizados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {workOrder.stockItems.map((item, index) => (
                  <div key={index} className="flex justify-between items-center p-2 bg-muted rounded">
                    <span className="font-medium">{item.stockItem?.description || `Item ${item.stockItemId}`}</span>
                    <Badge variant="outline">
                      {item.quantity} {item.stockItem?.unit || 'un'}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}