import { useState, useEffect } from 'react';
import type { MaintenancePlan } from '@/models/plan';
import { loadPlans, savePlans } from '@/data/plansStore';

export const useMaintenancePlansNew = (): [
  MaintenancePlan[], 
  (value: MaintenancePlan[] | ((current: MaintenancePlan[]) => MaintenancePlan[])) => void, 
  () => void
] => {
  const [data, setData] = useState<MaintenancePlan[]>(() => {
    // Load from localStorage/mock on initialization
    return loadPlans();
  });
  
  const updateData = (value: MaintenancePlan[] | ((current: MaintenancePlan[]) => MaintenancePlan[])) => {
    let newData: MaintenancePlan[];
    if (typeof value === 'function') {
      newData = value(data);
      setData(newData);
    } else {
      newData = value;
      setData(newData);
    }
    
    // Save to localStorage
    savePlans(newData);
  };

  const deleteData = () => {
    setData([]);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('traknor-maintenance-plans');
    }
  };
  
  return [data, updateData, deleteData];
};

// Utility functions for plan management
export const findPlanByIdFromHook = (plans: MaintenancePlan[], id: string): MaintenancePlan | undefined => {
  return plans.find(plan => plan.id === id);
};

export const updatePlanInList = (plans: MaintenancePlan[], updatedPlan: MaintenancePlan): MaintenancePlan[] => {
  return plans.map(plan => 
    plan.id === updatedPlan.id ? updatedPlan : plan
  );
};

export const removePlanFromList = (plans: MaintenancePlan[], planId: string): MaintenancePlan[] => {
  return plans.filter(plan => plan.id !== planId);
};