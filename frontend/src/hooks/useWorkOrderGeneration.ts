import { useEffect, useRef } from 'react';
import { loadPlans, updatePlanNextExecution } from '@/data/plansStore';
import { checkAndGenerateScheduledWorkOrders } from '@/data/workOrdersStore';
import { toast } from 'sonner';

/**
 * Hook para verificar automaticamente planos e gerar ordens de serviço
 * quando necessário. Executa a verificação a cada 30 segundos.
 */
export function useAutomaticWorkOrderGeneration() {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const checkPlansAndGenerate = async () => {
    try {
      const plans = loadPlans();
      const activePlans = plans.filter(plan => 
        plan.status === 'Ativo' && 
        plan.auto_generate && 
        plan.next_execution_date
      );
      
      if (activePlans.length === 0) {
        return;
      }
      
      const generatedWorkOrders = checkAndGenerateScheduledWorkOrders(activePlans);
      
      if (generatedWorkOrders.length > 0) {
        // Update plans' next execution dates
        const updatedPlansMap = new Map<string, any>();
        
        for (const workOrder of generatedWorkOrders) {
          if (workOrder.plan_id && !updatedPlansMap.has(workOrder.plan_id)) {
            const updatedPlan = updatePlanNextExecution(workOrder.plan_id);
            if (updatedPlan) {
              updatedPlansMap.set(workOrder.plan_id, updatedPlan);
            }
          }
        }
        
        // Show notification
        toast.success(`${generatedWorkOrders.length} ordem(ns) de serviço gerada(s) automaticamente!`, {
          description: `${updatedPlansMap.size} plano(s) de manutenção executado(s)`
        });
      }
      
    } catch (error) {
      console.error('Error in automatic work order generation:', error);
    }
  };
  
  useEffect(() => {
    // Initial check
    checkPlansAndGenerate();
    
    // Set up interval for periodic checks (every 30 seconds)
    intervalRef.current = setInterval(checkPlansAndGenerate, 30000);
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);
  
  return {
    checkPlansAndGenerate
  };
}

/**
 * Hook para forçar uma verificação manual dos planos
 */
export function useManualWorkOrderGeneration() {
  const checkPlansAndGenerate = async () => {
    try {
      const plans = loadPlans();
      const activePlans = plans.filter(plan => 
        plan.status === 'Ativo' && 
        plan.next_execution_date
      );
      
      const generatedWorkOrders = checkAndGenerateScheduledWorkOrders(activePlans);
      
      if (generatedWorkOrders.length > 0) {
        // Update plans' next execution dates
        for (const workOrder of generatedWorkOrders) {
          if (workOrder.plan_id) {
            updatePlanNextExecution(workOrder.plan_id);
          }
        }
        
        toast.success(`${generatedWorkOrders.length} ordem(ns) de serviço gerada(s)!`);
        return generatedWorkOrders.length;
      } else {
        toast.info('Nenhuma ordem de serviço pendente para geração.');
        return 0;
      }
      
    } catch (error) {
      console.error('Error in manual work order generation:', error);
      toast.error('Erro ao verificar planos de manutenção.');
      return 0;
    }
  };
  
  return {
    checkPlansAndGenerate
  };
}