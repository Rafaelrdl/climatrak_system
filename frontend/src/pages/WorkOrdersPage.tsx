import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, ClipboardList, CheckCircle, Camera, Loader2, Calendar, LayoutGrid } from 'lucide-react';
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
  useCompleteWorkOrder,
  useDeleteWorkOrder
} from '@/hooks/useWorkOrdersQuery';
import { useEquipments } from '@/hooks/useEquipmentQuery';
import { useWorkOrderView } from '@/hooks/useWorkOrderView';
import type { WorkOrder, ChecklistItem } from '@/types';

const mockChecklist: ChecklistItem[] = [
  {
    id: '1',
    question: 'Verificar limpeza dos filtros',
    type: 'BOOLEAN',
    required: true
  },
  {
    id: '2', 
    question: 'Medir pressão do sistema (PSI)',
    type: 'NUMBER',
    required: true
  },
  {
    id: '3',
    question: 'Estado geral do equipamento',
    type: 'MULTIPLE_CHOICE',
    options: ['Excelente', 'Bom', 'Regular', 'Ruim'],
    required: true
  },
  {
    id: '4',
    question: 'Observações adicionais',
    type: 'TEXT',
    required: false
  }
];

export function WorkOrdersPage() {
  // URL params para abrir OS diretamente
  const { id: workOrderIdFromUrl } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  
  // React Query hooks
  const { data: workOrders = [], isLoading, error } = useWorkOrders();
  const { data: equipment = [] } = useEquipments();
  
  // Mutations
  const createMutation = useCreateWorkOrder();
  const updateMutation = useUpdateWorkOrder();
  const startMutation = useStartWorkOrder();
  const completeMutation = useCompleteWorkOrder();
  const deleteMutation = useDeleteWorkOrder();
  
  // Local state
  const [view, setView] = useWorkOrderView();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [originFilter, setOriginFilter] = useState<string>('ALL');
  const [selectedOrder, setSelectedOrder] = useState<WorkOrder | null>(null);
  const [editingOrder, setEditingOrder] = useState<WorkOrder | null>(null);
  const [viewingOrder, setViewingOrder] = useState<WorkOrder | null>(null);
  const [showNewOrderModal, setShowNewOrderModal] = useState(false);
  const [checklist, setChecklist] = useState<ChecklistItem[]>(mockChecklist);

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

  const completeWorkOrder = (id: string) => {
    completeMutation.mutate({ 
      id, 
      data: { 
        checklist_responses: checklist.map(item => ({
          question_id: item.id,
          response: item.response,
          observations: item.observations
        }))
      } 
    }, {
      onSuccess: () => setSelectedOrder(null)
    });
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

  const updateChecklistResponse = (questionId: string, response: any) => {
    setChecklist(current =>
      current.map(item =>
        item.id === questionId ? { ...item, response } : item
      )
    );
  };

  const updateChecklistObservations = (questionId: string, observations: string) => {
    setChecklist(current =>
      current.map(item =>
        item.id === questionId ? { ...item, observations } : item
      )
    );
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
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos Status</SelectItem>
                  <SelectItem value="OPEN">Abertas</SelectItem>
                  <SelectItem value="IN_PROGRESS">Em Execução</SelectItem>
                  <SelectItem value="COMPLETED">Concluídas</SelectItem>
                </SelectContent>
              </Select>
              <Select value={originFilter} onValueChange={setOriginFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todas Origens</SelectItem>
                  <SelectItem value="PLAN">Plano de Manutenção</SelectItem>
                  <SelectItem value="REQUEST">Solicitação</SelectItem>
                  <SelectItem value="MANUAL">Manual</SelectItem>
                </SelectContent>
              </Select>
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

      {/* Execution Sheet */}
      <Sheet open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          {selectedOrder && (
            <>
              <SheetHeader>
                <SheetTitle>Executar OS: {selectedOrder.number}</SheetTitle>
                <SheetDescription>
                  Preencha o checklist de manutenção
                </SheetDescription>
              </SheetHeader>
              
              <div className="mt-6 space-y-6">
                {/* Equipment Info */}
                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-medium mb-2">Informações do Equipamento</h4>
                  <div className="text-sm space-y-1">
                    {(() => {
                      const eq = equipment.find(e => e.id === selectedOrder.equipmentId);
                      return (
                        <>
                          <div><strong>Tag:</strong> {eq?.tag}</div>
                          <div><strong>Modelo:</strong> {eq?.brand} {eq?.model}</div>
                          <div><strong>Tipo:</strong> {eq?.type}</div>
                          <div><strong>Capacidade:</strong> {eq?.capacity.toLocaleString()} BTUs</div>
                        </>
                      );
                    })()}
                  </div>
                </div>

                <Separator />

                {/* Checklist */}
                <div className="space-y-4">
                  <h4 className="font-medium">Checklist de Manutenção</h4>
                  
                  {checklist.map((item, index) => (
                    <div key={item.id} className="space-y-3 p-4 border rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">
                              {index + 1}. {item.question}
                            </span>
                            {item.required && (
                              <Badge variant="destructive" className="text-xs">
                                Obrigatório
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Response Input */}
                      <div className="space-y-2">
                        {item.type === 'BOOLEAN' && (
                          <div className="flex items-center space-x-2">
                            <Checkbox 
                              id={item.id}
                              checked={item.response === true}
                              onCheckedChange={(checked) => 
                                updateChecklistResponse(item.id, checked === true)
                              }
                            />
                            <label htmlFor={item.id} className="text-sm">
                              Conforme
                            </label>
                          </div>
                        )}

                        {item.type === 'NUMBER' && (
                          <Input
                            type="number"
                            placeholder="Digite o valor"
                            value={typeof item.response === 'number' ? item.response.toString() : ''}
                            onChange={(e) => 
                              updateChecklistResponse(item.id, parseFloat(e.target.value))
                            }
                          />
                        )}

                        {item.type === 'TEXT' && (
                          <Textarea
                            placeholder="Digite suas observações"
                            value={typeof item.response === 'string' ? item.response : ''}
                            onChange={(e) => 
                              updateChecklistResponse(item.id, e.target.value)
                            }
                          />
                        )}

                        {item.type === 'MULTIPLE_CHOICE' && (
                          <Select 
                            value={item.response as string || undefined} 
                            onValueChange={(value) => 
                              updateChecklistResponse(item.id, value)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione uma opção" />
                            </SelectTrigger>
                            <SelectContent>
                              {item.options?.map((option) => (
                                <SelectItem key={option} value={option}>
                                  {option}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}

                        {/* Observations */}
                        <Textarea
                          placeholder="Observações adicionais (opcional)"
                          value={item.observations || ''}
                          onChange={(e) => 
                            updateChecklistObservations(item.id, e.target.value)
                          }
                          className="mt-2"
                        />

                        {/* Photo Upload */}
                        <Button variant="outline" size="sm" className="mt-2">
                          <Camera className="h-4 w-4 mr-2" />
                          Adicionar Foto
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                <Separator />

                {/* Complete Button */}
                <Button 
                  onClick={() => completeWorkOrder(selectedOrder.id)}
                  className="w-full"
                  size="lg"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Concluir OS
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

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