import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  PlayCircle,
  CheckCircle2,
  AlertTriangle,
  Users,
  Settings2,
  Calendar,
  Wrench
} from 'lucide-react';
import { toast } from 'sonner';
import { PlanFormModal } from '@/components/PlanFormModal';
import { useCompanies, useSectors } from '@/hooks/useLocationsQuery';
import { useEquipments } from '@/hooks/useEquipmentQuery';
import { useMaintenancePlansNew } from '@/hooks/useMaintenancePlans';
import { generateWorkOrdersFromPlan } from '@/data/workOrdersStore';
import type { MaintenancePlan } from '@/models/plan';

interface TestScenario {
  id: string;
  title: string;
  description: string;
  steps: string[];
  expectedResult: string;
  company?: string;
  sector?: string;
  equipmentCount: number;
  frequency: MaintenancePlan['frequency'];
  autoGenerate: boolean;
  isCompleted: boolean;
  result?: string;
}

export function PlanTestScenarios() {
  const { data: companies = [] } = useCompanies();
  const { data: sectors = [] } = useSectors();
  const { data: equipment = [] } = useEquipments();
  const [plans, setPlans] = useMaintenancePlansNew();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentScenario, setCurrentScenario] = useState<TestScenario | null>(null);
  const [scenarios, setScenarios] = useState<TestScenario[]>([
    {
      id: 'scenario-1',
      title: 'Cenário 1: Plano para Toda uma Empresa',
      description: 'Criar um plano de manutenção que cubra todos os equipamentos de uma empresa específica',
      steps: [
        'Abrir modal de criação de plano',
        'Selecionar empresa "TechCorp Industrial"',
        'Verificar se todos os equipamentos da empresa aparecem',
        'Selecionar todos os equipamentos disponíveis',
        'Configurar frequência mensal',
        'Ativar geração automática',
        'Salvar o plano'
      ],
      expectedResult: 'Plano criado com todos os equipamentos da TechCorp Industrial (mínimo 2 equipamentos)',
      company: 'TechCorp Industrial',
      equipmentCount: 2,
      frequency: 'Mensal',
      autoGenerate: true,
      isCompleted: false
    },
    {
      id: 'scenario-2', 
      title: 'Cenário 2: Plano Específico por Setor',
      description: 'Criar um plano focado apenas nos equipamentos de um setor específico',
      steps: [
        'Abrir modal de criação de plano',
        'Selecionar setor "Departamento de TI"', 
        'Verificar filtragem de equipamentos por setor',
        'Selecionar equipamentos disponíveis no setor',
        'Configurar frequência trimestral',
        'Desativar geração automática (controle manual)',
        'Adicionar tarefas específicas do setor',
        'Salvar o plano'
      ],
      expectedResult: 'Plano criado apenas com equipamentos do Departamento de TI',
      sector: 'Departamento de TI',
      equipmentCount: 1,
      frequency: 'Trimestral',
      autoGenerate: false,
      isCompleted: false
    },
    {
      id: 'scenario-3',
      title: 'Cenário 3: Plano Industrial Complexo',
      description: 'Criar um plano abrangente para equipamentos industriais com alta frequência',
      steps: [
        'Selecionar empresa "Industrial Corp"',
        'Filtrar equipamentos industriais (chillers, centrais)',
        'Selecionar múltiplos equipamentos de alta capacidade',
        'Configurar frequência semanal (alta criticidade)',
        'Adicionar checklist detalhado para cada tarefa',
        'Ativar geração automática',
        'Definir data de início específica',
        'Validar próxima execução calculada'
      ],
      expectedResult: 'Plano industrial com geração automática semanal e tarefas detalhadas',
      company: 'Industrial Corp',
      equipmentCount: 1,
      frequency: 'Semanal',
      autoGenerate: true,
      isCompleted: false
    }
  ]);

  const executeScenario = async (scenario: TestScenario) => {
    setCurrentScenario(scenario);
    setIsModalOpen(true);
    
    toast.info(`Iniciando ${scenario.title}`, {
      description: 'Modal de criação de plano aberto. Siga os passos do cenário.'
    });
  };

  const validateScenario = (scenario: TestScenario, createdPlan: MaintenancePlan): boolean => {
    try {
      // Validate company/sector selection
      if (scenario.company) {
        const company = companies.find(c => c.name === scenario.company);
        if (!company) return false;
        
        // Check if plan is associated with the right company
        if (createdPlan.scope.location_name !== company.name) {
          return false;
        }
      }

      if (scenario.sector) {
        const sector = sectors.find(s => s.name === scenario.sector);
        if (!sector) return false;
        
        // Check if plan is associated with the right sector
        if (createdPlan.scope.location_name !== sector.name) {
          return false;
        }
      }

      // Validate equipment count
      const equipmentIds = createdPlan.scope.equipment_ids || [];
      if (equipmentIds.length < scenario.equipmentCount) {
        return false;
      }

      // Validate frequency
      if (createdPlan.frequency !== scenario.frequency) {
        return false;
      }

      // Validate auto-generate setting
      if (createdPlan.auto_generate !== scenario.autoGenerate) {
        return false;
      }

      // Validate plan is active
      if (createdPlan.status !== 'Ativo') {
        return false;
      }

      return true;
    } catch (error) {
      console.error('Validation error:', error);
      return false;
    }
  };

  const handlePlanSave = (savedPlan: MaintenancePlan) => {
    setPlans(current => [...current, savedPlan]);
    
    if (currentScenario) {
      const isValid = validateScenario(currentScenario, savedPlan);
      
      setScenarios(prev => prev.map(s => 
        s.id === currentScenario.id 
          ? { 
              ...s, 
              isCompleted: isValid,
              result: isValid 
                ? `✅ Sucesso: Plano "${savedPlan.name}" criado conforme esperado`
                : `❌ Falha: Plano não atende aos critérios do cenário`
            }
          : s
      ));

      if (isValid) {
        toast.success(`${currentScenario.title} - Concluído!`, {
          description: `Plano "${savedPlan.name}" criado com sucesso.`
        });
      } else {
        toast.error(`${currentScenario.title} - Falhou!`, {
          description: 'O plano não atende aos critérios do cenário.'
        });
      }
    }

    setCurrentScenario(null);
  };

  const testWorkOrderGeneration = async (scenario: TestScenario) => {
    // Find the plan created for this scenario
    const scenarioPlans = plans.filter(p => {
      if (scenario.company && p.scope.location_name === scenario.company) return true;
      if (scenario.sector && p.scope.location_name === scenario.sector) return true;
      return false;
    });

    if (scenarioPlans.length === 0) {
      toast.error('Nenhum plano encontrado para este cenário');
      return;
    }

    const planToTest = scenarioPlans[scenarioPlans.length - 1]; // Get most recent
    
    try {
      const workOrders = generateWorkOrdersFromPlan(planToTest);
      const equipmentCount = planToTest.scope.equipment_ids?.length || 0;
      
      if (workOrders.length === equipmentCount) {
        toast.success(`OSs geradas com sucesso!`, {
          description: `${workOrders.length} ordem(ns) de serviço criada(s) para ${equipmentCount} equipamento(s).`
        });
      } else {
        toast.error('Falha na geração de OSs', {
          description: `Esperado ${equipmentCount} OSs, mas gerou ${workOrders.length}.`
        });
      }
    } catch (error) {
      toast.error('Erro ao gerar OSs: ' + (error as Error).message);
    }
  };

  const resetScenarios = () => {
    setScenarios(prev => prev.map(s => ({ ...s, isCompleted: false, result: undefined })));
    toast.info('Cenários resetados');
  };

  const getScenarioIcon = (scenario: TestScenario) => {
    if (scenario.isCompleted) {
      return scenario.result?.startsWith('✅') 
        ? <CheckCircle2 className="h-5 w-5 text-green-600" />
        : <AlertTriangle className="h-5 w-5 text-red-600" />;
    }
    return <PlayCircle className="h-5 w-5 text-gray-400" />;
  };

  const getScenarioBadge = (scenario: TestScenario) => {
    if (!scenario.isCompleted) {
      return <Badge variant="secondary">Pendente</Badge>;
    }
    
    return scenario.result?.startsWith('✅') 
      ? <Badge variant="default" className="bg-green-100 text-green-800">Aprovado</Badge>
      : <Badge variant="destructive">Reprovado</Badge>;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Cenários de Teste - Casos de Uso Reais
          </CardTitle>
          <Button variant="outline" onClick={resetScenarios}>
            Resetar Cenários
          </Button>
        </CardHeader>
        <CardContent>
          <Alert className="mb-6">
            <Users className="h-4 w-4" />
            <AlertTitle>Como usar os cenários</AlertTitle>
            <AlertDescription>
              Cada cenário simula um caso de uso real. Clique em "Executar" para abrir o modal de criação 
              e siga os passos descritos. O sistema validará automaticamente se o plano foi criado conforme esperado.
            </AlertDescription>
          </Alert>

          <div className="grid gap-6">
            {scenarios.map((scenario) => (
              <Card key={scenario.id} className="relative">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      {getScenarioIcon(scenario)}
                      <div>
                        <CardTitle className="text-lg mb-2">{scenario.title}</CardTitle>
                        <p className="text-sm text-muted-foreground mb-4">
                          {scenario.description}
                        </p>
                      </div>
                    </div>
                    {getScenarioBadge(scenario)}
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {/* Scenario Configuration */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
                    <div>
                      <div className="text-xs font-medium text-muted-foreground">LOCALIZAÇÃO</div>
                      <div className="text-sm">{scenario.company || scenario.sector}</div>
                    </div>
                    <div>
                      <div className="text-xs font-medium text-muted-foreground">FREQUÊNCIA</div>
                      <div className="text-sm">{scenario.frequency}</div>
                    </div>
                    <div>
                      <div className="text-xs font-medium text-muted-foreground">MIN. EQUIPAMENTOS</div>
                      <div className="text-sm">{scenario.equipmentCount}</div>
                    </div>
                    <div>
                      <div className="text-xs font-medium text-muted-foreground">AUTO-GERAÇÃO</div>
                      <div className="text-sm">{scenario.autoGenerate ? 'Ativa' : 'Manual'}</div>
                    </div>
                  </div>

                  {/* Steps */}
                  <div>
                    <h4 className="font-medium mb-3">Passos do Teste:</h4>
                    <ol className="space-y-1">
                      {scenario.steps.map((step, index) => (
                        <li key={index} className="text-sm flex items-start gap-2">
                          <span className="bg-primary/10 text-primary font-medium text-xs rounded px-1.5 py-0.5 mt-0.5">
                            {index + 1}
                          </span>
                          <span className="text-muted-foreground">{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>

                  {/* Expected Result */}
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="text-xs font-medium text-blue-800 mb-1">RESULTADO ESPERADO</div>
                    <div className="text-sm text-blue-700">{scenario.expectedResult}</div>
                  </div>

                  {/* Actual Result */}
                  {scenario.result && (
                    <div className={`p-3 border rounded-lg ${
                      scenario.result.startsWith('✅') 
                        ? 'bg-green-50 border-green-200' 
                        : 'bg-red-50 border-red-200'
                    }`}>
                      <div className={`text-xs font-medium mb-1 ${
                        scenario.result.startsWith('✅') ? 'text-green-800' : 'text-red-800'
                      }`}>
                        RESULTADO ATUAL
                      </div>
                      <div className={`text-sm ${
                        scenario.result.startsWith('✅') ? 'text-green-700' : 'text-red-700'
                      }`}>
                        {scenario.result}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2 pt-4 border-t">
                    <Button 
                      onClick={() => executeScenario(scenario)}
                      variant={scenario.isCompleted ? "outline" : "default"}
                      className="flex items-center gap-2"
                    >
                      <PlayCircle className="h-4 w-4" />
                      {scenario.isCompleted ? 'Re-executar' : 'Executar Cenário'}
                    </Button>
                    
                    {scenario.isCompleted && (
                      <Button 
                        variant="outline"
                        onClick={() => testWorkOrderGeneration(scenario)}
                        className="flex items-center gap-2"
                      >
                        <Wrench className="h-4 w-4" />
                        Testar Geração de OS
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      <PlanFormModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        plan={undefined}
        onSave={handlePlanSave}
      />
    </div>
  );
}