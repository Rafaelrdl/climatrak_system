import React, { useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { WorkOrderList } from '@/components/WorkOrderList';
import { WorkOrderDetailView } from '@/components/WorkOrderDetailView';
import { useWorkOrderStore } from '@/store/useWorkOrderStore';
import type { WorkOrder } from '@/types';

interface WorkOrderPanelProps {
  workOrders: WorkOrder[];
  onStartWorkOrder?: (id: string) => void;
  onEditWorkOrder?: (wo: WorkOrder) => void;
  onUpdateWorkOrder?: (id: string, updates: Partial<WorkOrder>) => void;
}

function WorkOrderPanelComponent({ 
  workOrders, 
  onStartWorkOrder, 
  onEditWorkOrder,
  onUpdateWorkOrder
}: WorkOrderPanelProps) {
  const { selectedWorkOrder, selectedWorkOrderId, setSelectedWorkOrder, clearSelection } = useWorkOrderStore();
  
  // Use refs to avoid dependency issues
  const setSelectedWorkOrderRef = useRef(setSelectedWorkOrder);
  const clearSelectionRef = useRef(clearSelection);
  
  // Keep refs updated
  useEffect(() => {
    setSelectedWorkOrderRef.current = setSelectedWorkOrder;
    clearSelectionRef.current = clearSelection;
  }, [setSelectedWorkOrder, clearSelection]);

  // Track if we've already auto-selected for this set of work orders
  const hasAutoSelectedRef = useRef(false);
  const workOrdersCountRef = useRef(workOrders.length);

  const getWorkOrderById = useCallback(
    (id: string) => workOrders.find((wo) => wo.id === id),
    [workOrders]
  );

  // Update URL when selection changes
  useEffect(() => {
    const url = new URL(window.location.href);
    if (selectedWorkOrderId) {
      url.searchParams.set('wo', selectedWorkOrderId);
    } else {
      url.searchParams.delete('wo');
    }
    window.history.replaceState({}, '', url.toString());
  }, [selectedWorkOrderId]);

  // Handle work order selection
  const handleSelectWorkOrder = useCallback((workOrder: WorkOrder) => {
    if (selectedWorkOrder?.id !== workOrder.id) {
      setSelectedWorkOrder(workOrder);
    }
  }, [selectedWorkOrder?.id, setSelectedWorkOrder]);

  // Sync selection with URL param, persisted selection, and list updates
  useEffect(() => {
    if (workOrdersCountRef.current !== workOrders.length) {
      workOrdersCountRef.current = workOrders.length;
      hasAutoSelectedRef.current = false;
    }

    if (workOrders.length === 0) {
      if (selectedWorkOrderId) {
        clearSelectionRef.current();
      }
      hasAutoSelectedRef.current = false;
      return;
    }

    const urlParams = typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search)
      : null;
    const urlWorkOrderId = urlParams?.get('wo');

    if (urlWorkOrderId) {
      const workOrder = getWorkOrderById(urlWorkOrderId);
      if (workOrder) {
        if (selectedWorkOrder !== workOrder) {
          setSelectedWorkOrderRef.current(workOrder);
        }
      } else if (selectedWorkOrderId) {
        clearSelectionRef.current();
      }
      hasAutoSelectedRef.current = false;
      return;
    }

    if (selectedWorkOrderId) {
      const workOrder = getWorkOrderById(selectedWorkOrderId);
      if (workOrder) {
        if (selectedWorkOrder !== workOrder) {
          setSelectedWorkOrderRef.current(workOrder);
        }
        return;
      }

      clearSelectionRef.current();
      hasAutoSelectedRef.current = false;
    }

    if (!selectedWorkOrderId && !hasAutoSelectedRef.current) {
      hasAutoSelectedRef.current = true;
      setSelectedWorkOrderRef.current(workOrders[0]);
    }
  }, [workOrders, selectedWorkOrderId, selectedWorkOrder, getWorkOrderById]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.defaultPrevented) return;

    const target = event.target as HTMLElement | null;
    const isInteractiveElement = target?.closest(
      'input, textarea, select, button, [contenteditable="true"], [role="textbox"], [role="combobox"], [role="spinbutton"]'
    );

    if (isInteractiveElement) return;
    
    if (event.key === 'Escape' && selectedWorkOrder) {
      event.preventDefault();
      clearSelectionRef.current();
      return;
    }
    
    if ((event.key === 'ArrowUp' || event.key === 'ArrowDown') && workOrders.length > 0) {
      event.preventDefault();
      const currentIndex = selectedWorkOrderId 
        ? workOrders.findIndex(wo => wo.id === selectedWorkOrderId)
        : -1;
      
      let nextIndex;
      
      if (currentIndex === -1) {
        // No selection, select first item
        nextIndex = 0;
      } else if (event.key === 'ArrowUp') {
        nextIndex = currentIndex > 0 ? currentIndex - 1 : workOrders.length - 1;
      } else {
        nextIndex = currentIndex < workOrders.length - 1 ? currentIndex + 1 : 0;
      }
      
      const nextWorkOrder = workOrders[nextIndex];
      if (nextWorkOrder) {
        handleSelectWorkOrder(nextWorkOrder);
      }
    }
  }, [workOrders, selectedWorkOrderId, selectedWorkOrder, handleSelectWorkOrder]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Navigation helpers
  const currentIndex = selectedWorkOrder ? workOrders.findIndex(wo => wo.id === selectedWorkOrder.id) : -1;
  const canGoNext = currentIndex >= 0 && currentIndex < workOrders.length - 1;
  const canGoPrev = currentIndex > 0;
  
  const goToNext = useCallback(() => {
    if (canGoNext && currentIndex >= 0) {
      const nextWorkOrder = workOrders[currentIndex + 1];
      if (nextWorkOrder) {
        handleSelectWorkOrder(nextWorkOrder);
      }
    }
  }, [canGoNext, currentIndex, workOrders, handleSelectWorkOrder]);
  
  const goToPrev = useCallback(() => {
    if (canGoPrev && currentIndex >= 0) {
      const prevWorkOrder = workOrders[currentIndex - 1];
      if (prevWorkOrder) {
        handleSelectWorkOrder(prevWorkOrder);
      }
    }
  }, [canGoPrev, currentIndex, workOrders, handleSelectWorkOrder]);

  const handleSaveWorkOrder = useCallback((updates: Partial<WorkOrder>) => {
    if (selectedWorkOrder && onUpdateWorkOrder) {
      onUpdateWorkOrder(selectedWorkOrder.id, updates);
    }
  }, [selectedWorkOrder, onUpdateWorkOrder]);

  return (
    <div className="w-full">
      <div className="h-[calc(100vh-16rem)] border rounded-lg overflow-hidden bg-background">
        <ResizablePanelGroup 
          direction="horizontal"
          className="h-full"
          autoSaveId="work-orders-panel"
        >
          {/* Lista de Ordens de Serviço */}
          <ResizablePanel 
            defaultSize={30}
            minSize={25}
            maxSize={40}
            className="bg-muted/30"
          >
            <div className="h-full flex flex-col">
              {/* Navigation Header */}
              {selectedWorkOrder && workOrders.length > 1 && (
                <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30 shrink-0">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={!canGoPrev}
                      onClick={goToPrev}
                      className="h-7 w-7 p-0"
                      title="Ordem anterior"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={!canGoNext}
                      onClick={goToNext}
                      className="h-7 w-7 p-0"
                      title="Próxima ordem"
                    >
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                    <span className="text-xs text-muted-foreground ml-2">
                      {currentIndex + 1} de {workOrders.length}
                    </span>
                  </div>
                </div>
              )}
              
              {/* Lista com ScrollArea */}
              <ScrollArea className="flex-1 h-full">
                <WorkOrderList
                  workOrders={workOrders}
                  compact
                  onStartWorkOrder={onStartWorkOrder}
                  onEditWorkOrder={onEditWorkOrder}
                />
              </ScrollArea>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Detalhes da Ordem de Serviço */}
          <ResizablePanel 
            defaultSize={70}
            minSize={60}
            className="bg-background"
          >
            <WorkOrderDetailView
              workOrder={selectedWorkOrder}
              onSave={handleSaveWorkOrder}
              readOnly={!onUpdateWorkOrder}
              className="h-full"
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
      
      {/* Keyboard navigation hints */}
      <div className="mt-2 text-xs text-muted-foreground text-center">
        Use ↑↓ para navegar • ESC para limpar seleção • Enter para selecionar
      </div>
    </div>
  );
}

// Memoizar componente para evitar re-renders desnecessários
export const WorkOrderPanel = React.memo(WorkOrderPanelComponent);
WorkOrderPanel.displayName = 'WorkOrderPanel';
