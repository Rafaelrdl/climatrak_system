import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { WorkOrder } from '@/types';

interface WorkOrderStore {
  selectedWorkOrderId: string | null;
  selectedWorkOrder: WorkOrder | null;
  setSelectedWorkOrder: (workOrder: WorkOrder | null) => void;
  setSelectedWorkOrderId: (id: string | null) => void;
  clearSelection: () => void;
}

export const useWorkOrderStore = create<WorkOrderStore>()(
  persist(
    (set) => ({
      selectedWorkOrderId: null,
      selectedWorkOrder: null,
      setSelectedWorkOrder: (workOrder) =>
        set({
          selectedWorkOrder: workOrder,
          selectedWorkOrderId: workOrder?.id || null,
        }),
      setSelectedWorkOrderId: (id) =>
        set({
          selectedWorkOrderId: id,
          selectedWorkOrder: null, // Will be fetched separately
        }),
      clearSelection: () =>
        set({
          selectedWorkOrder: null,
          selectedWorkOrderId: null,
        }),
    }),
    {
      name: 'workorder-selection',
      partialize: (state) => ({ selectedWorkOrderId: state.selectedWorkOrderId }),
    }
  )
);