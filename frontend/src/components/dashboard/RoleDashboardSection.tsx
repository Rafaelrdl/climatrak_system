/**
 * RoleDashboardSection - Seção do Dashboard específica por papel
 * 
 * Renderiza os widgets apropriados baseado no papel do usuário.
 * Integra com os hooks de dados e componentes de widgets.
 * 
 * Para Admin/Owner: Usa sistema de abas para separar
 * - Visão Geral (KPIs operacionais do sistema)
 * - Financeiro (Budget, Variance, Economia)
 * - Operacional (Planos, Estoque)
 */

import { useAbility } from '@/hooks/useAbility';
import { useRoleDashboardData } from '@/hooks/useDashboardData';
import {
  AdminFinanceWidgets,
  OperatorWidgets,
  TechnicianWidgets,
  RequesterWidgets,
  ViewerWidgets,
} from './RoleSpecificWidgets';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Info, LayoutDashboard, DollarSign, Settings2 } from 'lucide-react';

interface RoleDashboardSectionProps {
  className?: string;
}

export function RoleDashboardSection({ className }: RoleDashboardSectionProps) {
  const { role, can } = useAbility();
  const {
    adminData,
    operatorData,
    technicianData,
    requesterData,
    viewerData,
  } = useRoleDashboardData();
  
  // Owner: Mostrar widgets de admin/finance + operator em abas
  if (role === 'owner') {
    return (
      <div className={className}>
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="overview" className="gap-2">
              <LayoutDashboard className="h-4 w-4" />
              Visão Geral
            </TabsTrigger>
            <TabsTrigger value="finance" className="gap-2">
              <DollarSign className="h-4 w-4" />
              Financeiro
            </TabsTrigger>
            <TabsTrigger value="operations" className="gap-2">
              <Settings2 className="h-4 w-4" />
              Operacional
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="mt-0">
            <div className="text-sm text-muted-foreground mb-4">
              Resumo consolidado das principais métricas do sistema
            </div>
            <ViewerWidgets 
              statsData={viewerData.statsData}
              isLoading={viewerData.isLoading}
            />
          </TabsContent>
          
          <TabsContent value="finance" className="mt-0">
            <div className="text-sm text-muted-foreground mb-4">
              Acompanhamento de orçamento, variância e economia
            </div>
            <AdminFinanceWidgets 
              budgetData={adminData.budgetData} 
              isLoading={adminData.isLoading}
            />
          </TabsContent>
          
          <TabsContent value="operations" className="mt-0">
            <div className="text-sm text-muted-foreground mb-4">
              Gestão de planos preventivos e controle de estoque
            </div>
            <OperatorWidgets 
              planData={operatorData.planData}
              inventoryData={operatorData.inventoryData}
              isLoadingPlans={operatorData.isLoadingPlans}
              isLoadingInventory={operatorData.isLoadingInventory}
            />
          </TabsContent>
        </Tabs>
      </div>
    );
  }
  
  // Admin: Mostrar widgets de finance + operator em abas (sem billing controls)
  if (role === 'admin') {
    return (
      <div className={className}>
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="overview" className="gap-2">
              <LayoutDashboard className="h-4 w-4" />
              Visão Geral
            </TabsTrigger>
            <TabsTrigger value="finance" className="gap-2">
              <DollarSign className="h-4 w-4" />
              Financeiro
            </TabsTrigger>
            <TabsTrigger value="operations" className="gap-2">
              <Settings2 className="h-4 w-4" />
              Operacional
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="mt-0">
            <div className="text-sm text-muted-foreground mb-4">
              Resumo consolidado das principais métricas do sistema
            </div>
            <ViewerWidgets 
              statsData={viewerData.statsData}
              isLoading={viewerData.isLoading}
            />
          </TabsContent>
          
          <TabsContent value="finance" className="mt-0">
            <div className="text-sm text-muted-foreground mb-4">
              Acompanhamento de orçamento, variância e economia
            </div>
            <AdminFinanceWidgets 
              budgetData={adminData.budgetData} 
              isLoading={adminData.isLoading}
            />
          </TabsContent>
          
          <TabsContent value="operations" className="mt-0">
            <div className="text-sm text-muted-foreground mb-4">
              Gestão de planos preventivos e controle de estoque
            </div>
            <OperatorWidgets 
              planData={operatorData.planData}
              inventoryData={operatorData.inventoryData}
              isLoadingPlans={operatorData.isLoadingPlans}
              isLoadingInventory={operatorData.isLoadingInventory}
            />
          </TabsContent>
        </Tabs>
      </div>
    );
  }
  
  // Operator: Mostrar widgets de planos e estoque
  if (role === 'operator') {
    return (
      <div className={className}>
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-blue-500" />
              Gestão de Planos e Estoque
            </h3>
            <OperatorWidgets 
              planData={operatorData.planData}
              inventoryData={operatorData.inventoryData}
              isLoadingPlans={operatorData.isLoadingPlans}
              isLoadingInventory={operatorData.isLoadingInventory}
            />
          </div>
          
          {/* Info sobre acesso limitado ao financeiro */}
          {can('view', 'finance') && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Você tem acesso de visualização ao módulo financeiro. 
                Para criar compromissos ou registrar economia, acesse o{' '}
                <a href="/finance" className="font-medium underline">Painel Financeiro</a>.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </div>
    );
  }
  
  // Technician: Mostrar widgets de minhas OS
  if (role === 'technician') {
    return (
      <div className={className}>
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            Meu Painel de Trabalho
          </h3>
          <TechnicianWidgets 
            statsData={technicianData.statsData}
            isLoading={technicianData.isLoading}
          />
        </div>
      </div>
    );
  }
  
  // Requester: Mostrar widgets de solicitações
  if (role === 'requester') {
    return (
      <div className={className}>
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-violet-500" />
            Minhas Solicitações
          </h3>
          <RequesterWidgets 
            statsData={requesterData.statsData}
            isLoading={requesterData.isLoading}
          />
        </div>
      </div>
    );
  }
  
  // Viewer: Mostrar widgets de visualização
  if (role === 'viewer') {
    return (
      <div className={className}>
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-slate-500" />
            Visão Geral do Sistema
          </h3>
          <ViewerWidgets 
            statsData={viewerData.statsData}
            isLoading={viewerData.isLoading}
          />
          
          {/* Info sobre acesso somente leitura */}
          <Alert className="mt-4">
            <Info className="h-4 w-4" />
            <AlertDescription>
              Você está em modo de visualização. Contate um administrador se precisar de mais permissões.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }
  
  // Fallback para papel desconhecido
  return (
    <div className={className}>
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Dashboard não configurado para este perfil de acesso.
        </AlertDescription>
      </Alert>
    </div>
  );
}

export default RoleDashboardSection;
