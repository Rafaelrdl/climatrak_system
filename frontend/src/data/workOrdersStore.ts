import { WorkOrder, WorkOrderCreationData } from '@/models/workOrder';
import { MaintenancePlan } from '@/models/plan';
import { getChecklist } from '@/data/checklistsStore';

const WORK_ORDERS_KEY = 'workOrders:db';

// Generate unique work order number
function generateWorkOrderNumber(): string {
  const year = new Date().getFullYear();
  const timestamp = Date.now().toString().slice(-6);
  return `OS-${year}-${timestamp}`;
}

// Calculate next execution date based on frequency
export function calculateNextExecutionDate(startDate: string, frequency: MaintenancePlan['frequency']): string {
  const start = new Date(startDate);
  const now = new Date();
  
  // If start date is in the future, return it
  if (start > now) {
    return startDate;
  }
  
  const nextDate = new Date(start);
  
  // Calculate the next occurrence based on frequency
  switch (frequency) {
    case 'Semanal':
      // Find next weekly occurrence
      while (nextDate <= now) {
        nextDate.setDate(nextDate.getDate() + 7);
      }
      break;
    case 'Mensal':
      // Find next monthly occurrence
      while (nextDate <= now) {
        nextDate.setMonth(nextDate.getMonth() + 1);
      }
      break;
    case 'Bimestral':
      // Find next bi-monthly occurrence
      while (nextDate <= now) {
        nextDate.setMonth(nextDate.getMonth() + 2);
      }
      break;
    case 'Trimestral':
      // Find next quarterly occurrence
      while (nextDate <= now) {
        nextDate.setMonth(nextDate.getMonth() + 3);
      }
      break;
    case 'Semestral':
      // Find next semi-annual occurrence
      while (nextDate <= now) {
        nextDate.setMonth(nextDate.getMonth() + 6);
      }
      break;
    case 'Anual':
      // Find next annual occurrence
      while (nextDate <= now) {
        nextDate.setFullYear(nextDate.getFullYear() + 1);
      }
      break;
  }
  
  return nextDate.toISOString().split('T')[0];
}

// Load work orders from localStorage
export function loadWorkOrders(): WorkOrder[] {
  try {
    const stored = localStorage.getItem(WORK_ORDERS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error loading work orders:', error);
    return [];
  }
}

// Save work orders to localStorage
export function saveWorkOrders(workOrders: WorkOrder[]): void {
  try {
    localStorage.setItem(WORK_ORDERS_KEY, JSON.stringify(workOrders));
  } catch (error) {
    console.error('Error saving work orders:', error);
  }
}

// Create new work order
export function createWorkOrder(data: WorkOrderCreationData): WorkOrder {
  const now = new Date().toISOString();
  
  const workOrder: WorkOrder = {
    id: `wo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    number: generateWorkOrderNumber(),
    type: 'Preventiva',
    status: 'Aberta',
    priority: data.priority || 'Média',
    plan_id: data.plan_id,
    equipment_ids: data.equipment_ids,
    equipment_names: data.equipment_ids.map(id => `Equipment ${id}`), // This should be resolved from actual equipment data
    scheduled_date: data.scheduled_date,
    title: data.title,
    description: data.description,
    tasks: data.tasks.map((task, index) => ({
      id: `task-${index}-${Date.now()}`,
      name: task.name,
      completed: false,
      checklist: task.checklist?.map((item, checkIndex) => ({
        id: `check-${checkIndex}-${Date.now()}`,
        description: item,
        completed: false
      })) || []
    })),
    assigned_to: data.assigned_to,
    created_by: 'current-user', // This should be resolved from auth context
    created_at: now,
    updated_at: now
  };
  
  const workOrders = loadWorkOrders();
  workOrders.push(workOrder);
  saveWorkOrders(workOrders);
  
  return workOrder;
}

// Generate work orders from maintenance plan
export function generateWorkOrdersFromPlan(plan: MaintenancePlan, scheduledDate?: string): WorkOrder[] {
  console.log('[generateWorkOrdersFromPlan] Iniciando para plano:', plan.name);
  
  const equipmentIds = plan.scope.equipment_ids || [];
  if (equipmentIds.length === 0) {
    console.error('[generateWorkOrdersFromPlan] Nenhum equipamento no plano');
    throw new Error('Plano deve ter pelo menos um equipamento selecionado');
  }
  
  const useDate = scheduledDate || plan.next_execution_date || new Date().toISOString().split('T')[0];
  console.log('[generateWorkOrdersFromPlan] Data de agendamento:', useDate);
  
  // Buscar tasks do checklist associado ao plano
  let tasks: { name: string; checklist: string[] }[] = [];
  if (plan.checklist_id) {
    const checklist = getChecklist(plan.checklist_id);
    console.log('[generateWorkOrdersFromPlan] Checklist encontrado:', checklist?.name);
    if (checklist && checklist.items) {
      // Converter itens do checklist em tasks
      tasks = [{
        name: checklist.name,
        checklist: checklist.items.map(item => item.description)
      }];
    }
  }
  
  // Se não há checklist, criar uma task genérica
  if (tasks.length === 0) {
    console.log('[generateWorkOrdersFromPlan] Sem checklist, criando task genérica');
    tasks = [{
      name: plan.name,
      checklist: plan.description ? [plan.description] : ['Executar manutenção conforme plano']
    }];
  }
  
  // Create one work order per equipment
  const workOrders: WorkOrder[] = [];
  
  const equipmentNames = plan.scope.equipment_names || [];
  
  for (const equipmentId of equipmentIds) {
    const equipmentIndex = equipmentIds.indexOf(equipmentId);
    const equipmentName = equipmentNames[equipmentIndex] || `Equipment ${equipmentId}`;
    
    console.log('[generateWorkOrdersFromPlan] Criando OS para:', equipmentName);
    
    const workOrder = createWorkOrder({
      plan_id: plan.id,
      equipment_ids: [equipmentId],
      scheduled_date: useDate,
      title: `${plan.name} - ${equipmentName}`,
      description: plan.description,
      tasks: tasks,
      priority: 'Média'
    });
    
    console.log('[generateWorkOrdersFromPlan] OS criada:', workOrder.id, workOrder.number);
    workOrders.push(workOrder);
  }
  
  console.log('[generateWorkOrdersFromPlan] Total de OSs criadas:', workOrders.length);
  return workOrders;
}

// Check for plans that need automatic work order generation
export function checkAndGenerateScheduledWorkOrders(plans: MaintenancePlan[]): WorkOrder[] {
  const today = new Date().toISOString().split('T')[0];
  const generatedWorkOrders: WorkOrder[] = [];
  
  for (const plan of plans) {
    if (
      plan.status === 'Ativo' && 
      plan.auto_generate && 
      plan.next_execution_date && 
      plan.next_execution_date <= today
    ) {
      try {
        const workOrders = generateWorkOrdersFromPlan(plan);
        generatedWorkOrders.push(...workOrders);
        
        // Update plan's next execution date
        const nextDate = calculateNextExecutionDate(plan.next_execution_date, plan.frequency);
        // Note: This would need to be called from the component to update the plan

      } catch (error) {
        console.error(`Error generating work orders for plan ${plan.name}:`, error);
      }
    }
  }
  
  return generatedWorkOrders;
}

// Update work order
export function updateWorkOrder(workOrder: WorkOrder): WorkOrder {
  const workOrders = loadWorkOrders();
  const index = workOrders.findIndex(wo => wo.id === workOrder.id);
  
  if (index === -1) {
    throw new Error('Work order not found');
  }
  
  const updatedWorkOrder = {
    ...workOrder,
    updated_at: new Date().toISOString()
  };
  
  workOrders[index] = updatedWorkOrder;
  saveWorkOrders(workOrders);
  
  return updatedWorkOrder;
}

// Delete work order
export function deleteWorkOrder(id: string): void {
  const workOrders = loadWorkOrders();
  const filtered = workOrders.filter(wo => wo.id !== id);
  saveWorkOrders(filtered);
}

// Get work orders by plan
export function getWorkOrdersByPlan(planId: string): WorkOrder[] {
  const workOrders = loadWorkOrders();
  return workOrders.filter(wo => wo.plan_id === planId);
}