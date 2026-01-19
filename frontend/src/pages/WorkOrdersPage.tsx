import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { PageHeader, FilterPopover, FilterItem } from '@/shared/ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, ClipboardList, Loader2, Calendar, LayoutGrid } from 'lucide-react';
import { toast } from 'sonner';
import { ViewToggle } from '@/components/ViewToggle';
import { WorkOrderList } from '@/components/WorkOrderList';
import { WorkOrderKanban } from '@/components/WorkOrderKanban';
import { WorkOrderPanel } from '@/components/WorkOrderPanel';
import { WorkOrderEditModal } from '@/components/WorkOrderEditModal';
import { WorkOrderModal } from '@/components/WorkOrderModal';
import { WorkOrderViewModal } from '@/components/WorkOrderViewModal';
import { 
  useWorkOrders, 
  useCreateWorkOrder, 
  useUpdateWorkOrder,
  useStartWorkOrder,
  useDeleteWorkOrder
} from '@/hooks/useWorkOrdersQuery';
import { useWorkOrderView } from '@/hooks/useWorkOrderView';
import type { WorkOrder } from '@/types';

export function WorkOrdersPage() {
  // URL params para abrir OS diretamente
  const { id: workOrderIdFromUrl } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  
  // React Query hooks
  const { data: workOrders = [], isLoading, error } = useWorkOrders();
  
  // Mutations
  const createMutation = useCreateWorkOrder();
  const updateMutation = useUpdateWorkOrder();
  const startMutation = useStartWorkOrder();
  const deleteMutation = useDeleteWorkOrder();
  
  // Local state
  const [view, setView] = useWorkOrderView();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [originFilter, setOriginFilter] = useState<string>('ALL');
  const [editingOrder, setEditingOrder] = useState<WorkOrder | null>(null);
  const [viewingOrder, setViewingOrder] = useState<WorkOrder | null>(null);
  const [showNewOrderModal, setShowNewOrderModal] = useState(false);

  // Efeito para abrir o modal quando há ID na URL (ex: /cmms/work-orders/5)
  useEffect(() => {
    if (workOrderIdFromUrl && workOrders.length > 0 && !isLoading) {
      const workOrder = workOrders.find(wo => wo.id === workOrderIdFromUrl);
      if (workOrder) {
        setEditingOrder(workOrder);
      }
    }
  }, [workOrderIdFromUrl, workOrders, isLoading]);

  // Limpa a URL quando fecha o modal de edição
  const handleCloseEditModal = () => {
    setEditingOrder(null);
    // Se veio de um link direto, volta para a listagem
    if (workOrderIdFromUrl) {
      navigate('/cmms/work-orders', { replace: true });
    }
  };

  // Filter work orders with useMemo for performance
  const filteredOrders = useMemo(() => {
    return workOrders.filter(wo => {
      const matchesSearch = wo.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           wo.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'ALL' || wo.status === statusFilter;
      
      // Filtro por origem
      let matchesOrigin = true;
      if (originFilter === 'PLAN') {
        matchesOrigin = !!wo.maintenancePlanId;
      } else if (originFilter === 'REQUEST') {
        matchesOrigin = !!wo.requestId;
      } else if (originFilter === 'MANUAL') {
        matchesOrigin = !wo.maintenancePlanId && !wo.requestId;
      }
      
      return matchesSearch && matchesStatus && matchesOrigin;
    });
  }, [workOrders, searchTerm, statusFilter, originFilter]);

  const startWorkOrder = (id: string, technicianId?: string) => {
    startMutation.mutate({ id, technicianId });
  };

  const updateWorkOrder = (id: string, updates: Partial<WorkOrder>) => {
    updateMutation.mutate({ id, data: updates });
  };

  const deleteWorkOrder = (id: string) => {
    // Verifica se é uma OS local (gerada por planos de manutenção)
    if (id.startsWith('wo-')) {
      toast.error('Esta OS foi gerada localmente e não pode ser excluída do servidor');
      return;
    }
    
    deleteMutation.mutate(id, {
      onSuccess: () => {
        toast.success('Ordem de serviço excluída com sucesso');
      },
      onError: (error) => {
        console.error('Erro ao excluir OS:', error);
        toast.error('Erro ao excluir ordem de serviço. Verifique se ela ainda existe.');
      }
    });
  };

  const handleSaveWorkOrder = (workOrder: WorkOrder) => {
    updateMutation.mutate({ id: workOrder.id, data: workOrder });
  };

  const handleCreateWorkOrder = (newWorkOrderData: Omit<WorkOrder, 'id' | 'number'>) => {
    createMutation.mutate(newWorkOrderData as WorkOrder, {
      onSuccess: () => setShowNewOrderModal(false)
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Ordens de Serviço">
        <div className="flex items-center gap-2">
          <Button 
            variant="outline"
            className="flex items-center gap-2"
            asChild
          >
            <Link to="/cmms/work-orders/calendar">
              <Calendar className="h-4 w-4" />
              Calendário
            </Link>
          </Button>
          <Button 
            variant="outline"
            className="flex items-center gap-2"
            asChild
          >
            <Link to="/cmms/work-orders/scheduling">
              <LayoutGrid className="h-4 w-4" />
              Programação
            </Link>
          </Button>
          <Button 
            className="flex items-center gap-2"
            onClick={() => setShowNewOrderModal(true)}
          >
            <Plus className="h-4 w-4" />
            Nova OS
          </Button>
        </div>
      </PageHeader>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Ordens de Serviço
            </CardTitle>
            <div className="flex items-center gap-4">
              <ViewToggle view={view} onViewChange={setView} />
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar OS..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              <FilterPopover
                activeCount={
                  (statusFilter !== 'ALL' ? 1 : 0) + 
                  (originFilter !== 'ALL' ? 1 : 0)
                }
                onClear={() => {
                  setStatusFilter('ALL');
                  setOriginFilter('ALL');
                }}
              >
                <FilterItem label="Status">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">Todos os status</SelectItem>
                      <SelectItem value="OPEN">Abertas</SelectItem>
                      <SelectItem value="IN_PROGRESS">Em Execução</SelectItem>
                      <SelectItem value="COMPLETED">Concluídas</SelectItem>
                      <SelectItem value="CANCELLED">Canceladas</SelectItem>
                    </SelectContent>
                  </Select>
                </FilterItem>
                
                <FilterItem label="Origem">
                  <Select value={originFilter} onValueChange={setOriginFilter}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">Todas as origens</SelectItem>
                      <SelectItem value="PLAN">Plano de Manutenção</SelectItem>
                      <SelectItem value="REQUEST">Solicitação</SelectItem>
                      <SelectItem value="MANUAL">Manual</SelectItem>
                    </SelectContent>
                  </Select>
                </FilterItem>
              </FilterPopover>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Carregando ordens de serviço...</span>
            </div>
          )}
          
          {error && (
            <div className="text-center py-12 text-destructive">
              <p>Erro ao carregar ordens de serviço.</p>
              <p className="text-sm text-muted-foreground mt-1">Tente novamente mais tarde.</p>
            </div>
          )}
          
          {!isLoading && !error && view === 'list' && (
            <WorkOrderList
              workOrders={filteredOrders}
              onStartWorkOrder={startWorkOrder}
              onEditWorkOrder={setEditingOrder}
              onViewWorkOrder={setViewingOrder}
              onDeleteWorkOrder={deleteWorkOrder}
            />
          )}
          
          {!isLoading && !error && view === 'kanban' && (
            <WorkOrderKanban
              workOrders={filteredOrders}
              onUpdateWorkOrder={updateWorkOrder}
              onStartWorkOrder={startWorkOrder}
              onEditWorkOrder={setEditingOrder}
            />
          )}
          
          {!isLoading && !error && view === 'panel' && (
            <WorkOrderPanel
              workOrders={filteredOrders}
              onStartWorkOrder={startWorkOrder}
              onEditWorkOrder={setEditingOrder}
              onUpdateWorkOrder={updateWorkOrder}
            />
          )}
        </CardContent>
      </Card>

      {/* Edit Work Order Modal */}
      <WorkOrderEditModal
        workOrder={editingOrder}
        isOpen={!!editingOrder}
        onClose={handleCloseEditModal}
        onSave={handleSaveWorkOrder}
      />

      {/* New Work Order Modal */}
      <WorkOrderModal
        isOpen={showNewOrderModal}
        onClose={() => setShowNewOrderModal(false)}
        onSave={handleCreateWorkOrder}
      />

      {/* View Work Order Modal (Read-only) */}
      <WorkOrderViewModal
        workOrder={viewingOrder}
        isOpen={!!viewingOrder}
        onClose={() => setViewingOrder(null)}
      />
    </div>
  );
}


