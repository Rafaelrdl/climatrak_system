import type { MaintenancePlan } from '@/models/plan';
import { calculateNextExecutionDate } from './workOrdersStore';

const STORAGE_KEY = 'traknor-maintenance-plans';

// Mock plans for seeding
export const MOCK_PLANS: MaintenancePlan[] = [
  {
    id: 'plan-1',
    name: 'Plano Mensal - Climatizadores',
    description: 'Manutenção preventiva mensal para climatizadores centrais',
    frequency: 'Mensal',
    scope: {
      location_id: '1',
      location_name: 'Setor Administrativo',
      equipment_ids: ['eq-1', 'eq-2'],
      equipment_names: ['Climatizador Central 01', 'Climatizador Central 02']
    },
    checklist_id: '1', // Checklist de splits
    status: 'Ativo',
    start_date: '2024-01-01',
    next_execution_date: '2024-03-01',
    auto_generate: true,
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T10:00:00Z'
  },
  {
    id: 'plan-2',
    name: 'Plano Trimestral - Splits',
    description: 'Manutenção preventiva trimestral para aparelhos split',
    frequency: 'Trimestral',
    scope: {
      location_id: '2',
      location_name: 'Departamento de TI',
      equipment_ids: ['eq-3', 'eq-4', 'eq-5'],
      equipment_names: ['Split LG 12.000 BTUs - Sala 1', 'Split Samsung 18.000 BTUs - Sala 2', 'Split Carrier 24.000 BTUs - Sala 3']
    },
    checklist_id: '2', // Checklist de chillers
    status: 'Ativo',
    next_execution_date: '2024-04-01',
    auto_generate: false,
    created_at: '2024-01-10T15:30:00Z',
    updated_at: '2024-01-10T15:30:00Z'
  },
  {
    id: 'plan-3',
    name: 'Plano Semestral - Chillers',
    description: 'Manutenção preventiva semestral para chillers industriais',
    frequency: 'Semestral',
    scope: {
      location_id: '3',
      location_name: 'Data Center',
      equipment_ids: ['eq-6'],
      equipment_names: ['Chiller Industrial 500TR']
    },
    checklist_id: '3', // Checklist elétrico
    status: 'Inativo',
    auto_generate: false,
    created_at: '2024-01-05T09:15:00Z',
    updated_at: '2024-01-05T09:15:00Z'
  }
];

export const loadPlans = (): MaintenancePlan[] => {
  if (typeof window === 'undefined') return MOCK_PLANS;
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.warn('Error loading plans from localStorage:', error);
  }
  
  // Save mock data to localStorage on first load
  savePlans(MOCK_PLANS);
  return MOCK_PLANS;
};

export const savePlans = (plans: MaintenancePlan[]): void => {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(plans));
  } catch (error) {
    console.error('Error saving plans to localStorage:', error);
  }
};

export const createPlan = (plan: Omit<MaintenancePlan, 'id' | 'created_at' | 'updated_at'>): MaintenancePlan => {
  const newPlan: MaintenancePlan = {
    ...plan,
    id: `plan-${Date.now()}`,
    auto_generate: plan.auto_generate ?? false,
    next_execution_date: plan.start_date ? calculateNextExecutionDate(plan.start_date, plan.frequency) : undefined,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  
  const plans = loadPlans();
  const updatedPlans = [...plans, newPlan];
  savePlans(updatedPlans);
  
  return newPlan;
};

export const updatePlan = (updatedPlan: MaintenancePlan): MaintenancePlan => {
  const plans = loadPlans();
  const index = plans.findIndex(plan => plan.id === updatedPlan.id);
  
  if (index === -1) {
    throw new Error(`Plan with id ${updatedPlan.id} not found`);
  }
  
  // Update next execution date if start date or frequency changed
  let nextExecutionDate = updatedPlan.next_execution_date;
  if (updatedPlan.start_date) {
    nextExecutionDate = calculateNextExecutionDate(updatedPlan.start_date, updatedPlan.frequency);
  }
  
  const planWithUpdatedDate = {
    ...updatedPlan,
    next_execution_date: nextExecutionDate,
    updated_at: new Date().toISOString()
  };
  
  plans[index] = planWithUpdatedDate;
  savePlans(plans);
  
  return planWithUpdatedDate;
};

// Update plan's next execution date after work orders are generated
export const updatePlanNextExecution = (planId: string): MaintenancePlan | null => {
  const plans = loadPlans();
  const index = plans.findIndex(plan => plan.id === planId);
  
  if (index === -1) {
    return null;
  }
  
  const plan = plans[index];
  if (!plan.next_execution_date) {
    return plan;
  }
  
  const nextDate = calculateNextExecutionDate(plan.next_execution_date, plan.frequency);
  
  const updatedPlan = {
    ...plan,
    next_execution_date: nextDate,
    updated_at: new Date().toISOString()
  };
  
  plans[index] = updatedPlan;
  savePlans(plans);
  
  return updatedPlan;
};

export const findPlanById = (id: string): MaintenancePlan | undefined => {
  const plans = loadPlans();
  return plans.find(plan => plan.id === id);
};

export const deletePlan = (id: string): boolean => {
  const plans = loadPlans();
  const filteredPlans = plans.filter(plan => plan.id !== id);
  
  if (filteredPlans.length === plans.length) {
    return false; // Plan not found
  }
  
  savePlans(filteredPlans);
  return true;
};