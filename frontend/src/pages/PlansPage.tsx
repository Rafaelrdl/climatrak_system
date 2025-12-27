import { useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Plus, Edit, Play, CheckCircle, Loader2, Trash2 } from 'lucide-react';
import { PlanFormModal } from '@/components/PlanFormModal';
import { 
  useMaintenancePlans, 
  useCreatePlan, 
  useUpdatePlan,
  useDeletePlan,
  useGenerateWorkOrders,
  planKeys
} from '@/hooks/usePlansQuery';
import { plansService } from '@/services/plansService';
import { useQueryClient } from '@tanstack/react-query';
import { IfCanCreate, IfCanEdit } from '@/components/auth/IfCan';
import { toast } from 'sonner';
import type { MaintenancePlan } from '@/models/plan';

export function PlansPage() {
  // Query client para invalidar queries
  const queryClient = useQueryClient();
  
  // React Query hooks
  const { data: plans = [], isLoading, error } = useMaintenancePlans();
  
  // Mutations (mantidos para compatibilidade futura com API)
  const createMutation = useCreatePlan();
  const updateMutation = useUpdatePlan();
  const deleteMutation = useDeletePlan();
  const generateMutation = useGenerateWorkOrders();
  
  // Local state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<MaintenancePlan | undefined>();
  const [isLoadingPlanDetails, setIsLoadingPlanDetails] = useState(false);

  const handleNewPlan = () => {
    setSelectedPlan(undefined);
    setIsModalOpen(true);
  };

  const handleEditPlan = async (plan: MaintenancePlan) => {
    // Buscar detalhes completos do plano (inclui assets, asset_names, etc.)
    setIsLoadingPlanDetails(true);
    try {
      const planDetails = await plansService.getById(plan.id);
      console.log('[PlansPage] Plan details loaded:', planDetails);
      setSelectedPlan(planDetails);
      setIsModalOpen(true);
    } catch (error) {
      console.error('[PlansPage] Error loading plan details:', error);
      toast.error('Erro ao carregar detalhes do plano');
      // Fallback: usar dados da lista mesmo sem os assets
      setSelectedPlan(plan);
      setIsModalOpen(true);
    } finally {
      setIsLoadingPlanDetails(false);
    }
  };

  const handlePlanSave = (savedPlan: MaintenancePlan) => {
    // O plano já foi salvo pelo PlanFormModal no store local
    // Apenas invalidar as queries para atualizar a lista
    queryClient.invalidateQueries({ queryKey: planKeys.lists() });
    queryClient.invalidateQueries({ queryKey: planKeys.stats() });
    setIsModalOpen(false);
    // Toast já é mostrado pelo PlanFormModal
  };

  const handleDeletePlan = (plan: MaintenancePlan) => {
    if (window.confirm(`Tem certeza que deseja excluir o plano "${plan.name}"?`)) {
      deleteMutation.mutate(plan.id, {
        onSuccess: () => {
          toast.success('Plano excluído com sucesso!');
        },
        onError: () => {
          toast.error('Erro ao excluir plano.');
        }
      });
    }
  };

  const handleGenerateWorkOrders = async (plan: MaintenancePlan) => {
    const equipmentIds = plan.scope.equipment_ids || [];
    if (equipmentIds.length === 0) {
      toast.error('Este plano não possui equipamentos selecionados.');
      return;
    }

    generateMutation.mutate(plan.id, {
      onSuccess: (data) => {
        toast.success(`${data.work_orders_created || 0} ordem(ns) de serviço gerada(s) com sucesso!`, {
          description: data.next_execution_date 
            ? `Próxima execução programada para ${new Date(data.next_execution_date).toLocaleDateString('pt-BR')}`
            : undefined
        });
      },
      onError: (error) => {
        toast.error('Erro ao gerar ordens de serviço: ' + (error as Error).message);
      }
    });
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return 'Não definida';
    try {
      // Adiciona horário meio-dia para evitar problemas de timezone
      // quando a string é apenas YYYY-MM-DD
      const dateToFormat = dateString.includes('T') 
        ? dateString 
        : `${dateString}T12:00:00`;
      return new Date(dateToFormat).toLocaleDateString('pt-BR');
    } catch {
      return 'Data inválida';
    }
  };

  const formatFrequency = (frequency: string) => {
    const frequencyMap: Record<string, string> = {
      'DAILY': 'Diária',
      'WEEKLY': 'Semanal',
      'BIWEEKLY': 'Quinzenal',
      'MONTHLY': 'Mensal',
      'QUARTERLY': 'Trimestral',
      'SEMI_ANNUAL': 'Semestral',
      'ANNUAL': 'Anual',
    };
    return frequencyMap[frequency] || frequency;
  };

  const getScopeDisplay = (plan: MaintenancePlan) => {
    // Usar asset_names diretamente da API ou fallback para scope legado
    const equipmentNames = plan.asset_names || plan.scope?.equipment_names || [];
    
    if (equipmentNames.length === 0) return 'Geral';
    
    if (equipmentNames.length === 1) {
      return equipmentNames[0];
    }
    
    return `${equipmentNames.length} equipamentos`;
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Planos de Manutenção" 
        description="Planejamento de manutenções preventivas"
      >
        <IfCanCreate subject="plan">
          <Button onClick={handleNewPlan} className="flex items-center gap-2" data-testid="plan-create">
            <Plus className="h-4 w-4" />
            Novo Plano
          </Button>
        </IfCanCreate>
      </PageHeader>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Planos Cadastrados
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Carregando planos...</span>
            </div>
          )}
          
          {error && (
            <div className="text-center py-12 text-destructive">
              <p>Erro ao carregar planos.</p>
              <p className="text-sm text-muted-foreground mt-1">Tente novamente mais tarde.</p>
            </div>
          )}
          
          {!isLoading && !error && (
          <Table role="grid">
            <TableHeader>
              <TableRow>
                <TableHead scope="col">Nome do Plano</TableHead>
                <TableHead scope="col">Frequência</TableHead>
                <TableHead scope="col">Escopo</TableHead>
                <TableHead scope="col">Próxima Execução</TableHead>
                <TableHead scope="col">Geração Automática</TableHead>
                <TableHead scope="col">Status</TableHead>
                <TableHead scope="col">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plans.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    <div className="flex flex-col items-center space-y-2">
                      <Calendar className="h-8 w-8 opacity-50" />
                      <span>Nenhum plano de manutenção cadastrado.</span>
                      <IfCanCreate subject="plan">
                        <Button
                          variant="outline"
                          onClick={handleNewPlan}
                          className="mt-2"
                          data-testid="plan-create-empty"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Criar Primeiro Plano
                        </Button>
                      </IfCanCreate>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                plans.map((plan) => (
                  <TableRow key={plan.id}>
                    <TableCell className="font-medium">
                      <div>
                        <div className="font-semibold">{plan.name}</div>
                        {plan.description && (
                          <div className="text-sm text-muted-foreground truncate max-w-xs" title={plan.description}>
                            {plan.description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {formatFrequency(plan.frequency)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div>{getScopeDisplay(plan)}</div>
                        {(() => {
                          const equipmentNames = plan.asset_names || plan.scope?.equipment_names || [];
                          return equipmentNames.length > 1 && (
                            <div className="text-xs text-muted-foreground">
                              {equipmentNames.slice(0, 2).join(', ')}
                              {equipmentNames.length > 2 && ` +${equipmentNames.length - 2}`}
                            </div>
                          );
                        })()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {formatDate(plan.next_execution_date)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={plan.auto_generate ? "default" : "secondary"}>
                        {plan.auto_generate ? (
                          <CheckCircle className="h-3 w-3 mr-1" />
                        ) : null}
                        {plan.auto_generate ? 'Ativa' : 'Manual'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={plan.status === 'Ativo' ? "default" : "secondary"}>
                        {plan.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <IfCanEdit subject="plan">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleEditPlan(plan)}
                            disabled={isLoadingPlanDetails}
                            className="flex items-center gap-1"
                            aria-label={`Editar plano ${plan.name}`}
                            data-testid="plan-edit"
                          >
                            {isLoadingPlanDetails ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Edit className="h-3 w-3" />
                            )}
                            Editar
                          </Button>
                        </IfCanEdit>
                        
                        {plan.status === 'Ativo' && (plan.assets?.length || plan.scope?.equipment_ids?.length || 0) > 0 && (
                          <Button 
                            variant="default" 
                            size="sm"
                            onClick={() => handleGenerateWorkOrders(plan)}
                            className="flex items-center gap-1"
                            aria-label={`Gerar ordens de serviço para ${plan.name}`}
                            data-testid="plan-generate"
                          >
                            <Play className="h-3 w-3" />
                            Gerar OS
                          </Button>
                        )}
                        
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleDeletePlan(plan)}
                          className="flex items-center gap-1 text-destructive hover:text-destructive hover:bg-destructive/10"
                          aria-label={`Excluir plano ${plan.name}`}
                          data-testid="plan-delete"
                        >
                          <Trash2 className="h-3 w-3" />
                          Excluir
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          )}
        </CardContent>
      </Card>

      <PlanFormModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        plan={selectedPlan}
        onSave={handlePlanSave}
      />
    </div>
  );
}