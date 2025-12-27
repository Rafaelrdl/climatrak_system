import { useState, useEffect } from 'react';
import type { WorkOrderView } from '@/types';

const STORAGE_KEY = 'workorder-view';

export function useWorkOrderView() {
  const [view, setView] = useState<WorkOrderView>(() => {
    if (typeof window === 'undefined') return 'list';
    
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && ['list', 'kanban', 'panel'].includes(saved)) {
      return saved as WorkOrderView;
    }
    return 'list';
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, view);
  }, [view]);

  return [view, setView] as const;
}