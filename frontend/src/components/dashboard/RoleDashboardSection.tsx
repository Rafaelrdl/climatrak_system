/**
 * RoleDashboardSection - Seção do Dashboard específica por papel
 * 
 * Renderiza os widgets apropriados baseado no papel do usuário.
 * Integra com os hooks de dados e componentes de widgets.
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
import { Info } from 'lucide-react';

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
  
  // Owner: Mostrar widgets de admin/finance + operator
  if (role === 'owner') {
    return (
      <div className={className}>
        <div className="space-y-6">
          {/* Finance Overview - Owner tem acesso completo */}
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Visão Financeira
            </h3>
            <AdminFinanceWidgets 
              budgetData={adminData.budgetData} 
              isLoading={adminData.isLoading}
            />
          </div>
          
          {/* Operacional Overview */}
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-blue-500" />
              Operacional
            </h3>
            <OperatorWidgets 
              planData={operatorData.planData}
              inventoryData={operatorData.inventoryData}
              isLoadingPlans={operatorData.isLoadingPlans}
              isLoadingInventory={operatorData.isLoadingInventory}
            />
          </div>
        </div>
      </div>
    );
  }
  
  // Admin: Mostrar widgets de finance + operator (sem billing controls)
  if (role === 'admin') {
    return (
      <div className={className}>
        <div className="space-y-6">
          {/* Finance Overview */}
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Visão Financeira
            </h3>
            <AdminFinanceWidgets 
              budgetData={adminData.budgetData} 
              isLoading={adminData.isLoading}
            />
          </div>
          
          {/* Operacional Overview */}
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-blue-500" />
              Gestão Operacional
            </h3>
            <OperatorWidgets 
              planData={operatorData.planData}
              inventoryData={operatorData.inventoryData}
              isLoadingPlans={operatorData.isLoadingPlans}
              isLoadingInventory={operatorData.isLoadingInventory}
            />
          </div>
        </div>
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
