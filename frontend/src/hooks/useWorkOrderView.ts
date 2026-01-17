import { useState, useEffect } from 'react';
import type { WorkOrderView } from '@/types';
import { appStorage, STORAGE_KEYS } from '@/lib/storage';

const STORAGE_KEY = STORAGE_KEYS.UI_WORKORDER_VIEW;

export function useWorkOrderView() {
  const [view, setView] = useState<WorkOrderView>(() => {
    if (typeof window === 'undefined') return 'list';
    
    const saved = appStorage.get<WorkOrderView>(STORAGE_KEY);
    if (saved && ['list', 'kanban', 'panel'].includes(saved)) {
      return saved;
    }
    return 'list';
  });

  useEffect(() => {
    appStorage.set(STORAGE_KEY, view);
  }, [view]);

  return [view, setView] as const;
}
