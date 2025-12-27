import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DashboardLayout, DashboardWidget, WidgetType, widgetDefinitions } from '@/types/dashboard';

interface DashboardState {
  layouts: DashboardLayout[];
  currentLayoutId: string;
  editMode: boolean;
  
  // Actions
  setCurrentLayout: (layoutId: string) => void;
  createLayout: (name: string, fromLayoutId?: string) => void;
  updateLayout: (layoutId: string, updates: Partial<DashboardLayout>) => void;
  deleteLayout: (layoutId: string) => void;
  
  addWidget: (layoutId: string, widgetType: WidgetType, position: { x: number; y: number }) => void;
  updateWidget: (layoutId: string, widgetId: string, updates: Partial<DashboardWidget>) => void;
  removeWidget: (layoutId: string, widgetId: string) => void;
  moveWidget: (layoutId: string, widgetId: string, position: { x: number; y: number }) => void;
  reorderWidgets: (layoutId: string, widgetIds: string[]) => void;
  resetWidgetSizes: (layoutId: string) => void;
  
  setEditMode: (editMode: boolean) => void;
}

// Layout padrão vazio - usuário adiciona widgets manualmente
const defaultLayout: DashboardLayout = {
  id: 'default',
  name: 'Padrão',
  isDefault: true,
  widgets: [],
  createdAt: new Date(),
  updatedAt: new Date(),
};

// Helper: obter título baseado no tipo de widget
function getWidgetTitle(widgetType: WidgetType): string {
  const definition = widgetDefinitions.find(d => d.id === widgetType);
  return definition?.name || widgetType
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Helper: obter tamanho padrão baseado no tipo de widget
function getWidgetDefaultSize(widgetType: WidgetType): DashboardWidget['size'] {
  const definition = widgetDefinitions.find(d => d.id === widgetType);
  return definition?.defaultSize || 'col-2';
}

export const useDashboardStore = create<DashboardState>()(
  persist(
    (set, get) => ({
      layouts: [defaultLayout],
      currentLayoutId: 'default',
      editMode: false,

      setCurrentLayout: (layoutId: string) => {
        set({ currentLayoutId: layoutId });
      },

      createLayout: (name: string, fromLayoutId?: string) => {
        const id = `layout-${Date.now()}`;
        const sourceLayout = fromLayoutId 
          ? get().layouts.find(l => l.id === fromLayoutId)
          : null;
        
        const newLayout: DashboardLayout = {
          id,
          name,
          isDefault: false,
          widgets: sourceLayout 
            ? sourceLayout.widgets.map(w => ({ ...w, id: `${w.id}-copy-${Date.now()}` })) 
            : [],
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        set(state => ({
          layouts: [...state.layouts, newLayout],
          currentLayoutId: id
        }));
      },

      updateLayout: (layoutId: string, updates: Partial<DashboardLayout>) => {
        set(state => ({
          layouts: state.layouts.map(layout =>
            layout.id === layoutId 
              ? { ...layout, ...updates, updatedAt: new Date() } 
              : layout
          )
        }));
      },

      deleteLayout: (layoutId: string) => {
        const state = get();
        const layout = state.layouts.find(l => l.id === layoutId);
        
        // Não permitir excluir o layout padrão
        if (layout?.isDefault) return;
        
        const newLayouts = state.layouts.filter(l => l.id !== layoutId);
        const newCurrentId = state.currentLayoutId === layoutId 
          ? (newLayouts.find(l => l.isDefault)?.id || newLayouts[0]?.id || 'default')
          : state.currentLayoutId;

        set({
          layouts: newLayouts,
          currentLayoutId: newCurrentId
        });
      },

      addWidget: (layoutId: string, widgetType: WidgetType, position: { x: number; y: number }) => {
        const widgetId = `widget-${Date.now()}`;
        const widget: DashboardWidget = {
          id: widgetId,
          type: widgetType,
          title: getWidgetTitle(widgetType),
          size: getWidgetDefaultSize(widgetType),
          position,
          config: {},
        };

        set(state => ({
          layouts: state.layouts.map(layout =>
            layout.id === layoutId
              ? { 
                  ...layout, 
                  widgets: [...layout.widgets, widget],
                  updatedAt: new Date(),
                }
              : layout
          )
        }));
      },

      updateWidget: (layoutId: string, widgetId: string, updates: Partial<DashboardWidget>) => {
        set(state => ({
          layouts: state.layouts.map(layout =>
            layout.id === layoutId
              ? {
                  ...layout,
                  widgets: layout.widgets.map(widget =>
                    widget.id === widgetId ? { ...widget, ...updates } : widget
                  ),
                  updatedAt: new Date(),
                }
              : layout
          )
        }));
      },

      removeWidget: (layoutId: string, widgetId: string) => {
        set(state => ({
          layouts: state.layouts.map(layout =>
            layout.id === layoutId
              ? { 
                  ...layout, 
                  widgets: layout.widgets.filter(w => w.id !== widgetId),
                  updatedAt: new Date(),
                }
              : layout
          )
        }));
      },

      moveWidget: (layoutId: string, widgetId: string, position: { x: number; y: number }) => {
        set(state => ({
          layouts: state.layouts.map(layout =>
            layout.id === layoutId
              ? {
                  ...layout,
                  widgets: layout.widgets.map(widget =>
                    widget.id === widgetId ? { ...widget, position } : widget
                  ),
                  updatedAt: new Date(),
                }
              : layout
          )
        }));
      },

      reorderWidgets: (layoutId: string, widgetIds: string[]) => {
        set(state => ({
          layouts: state.layouts.map(layout => {
            if (layout.id !== layoutId) return layout;
            
            // Criar mapa de widgets por ID
            const widgetMap = new Map(layout.widgets.map(w => [w.id, w]));
            
            // Reordenar widgets de acordo com a nova ordem
            const reorderedWidgets = widgetIds
              .map(id => widgetMap.get(id))
              .filter((w): w is DashboardWidget => w !== undefined);
            
            return { 
              ...layout, 
              widgets: reorderedWidgets,
              updatedAt: new Date(),
            };
          })
        }));
      },

      resetWidgetSizes: (layoutId: string) => {
        set(state => ({
          layouts: state.layouts.map(layout => 
            layout.id === layoutId
              ? {
                  ...layout,
                  widgets: layout.widgets.map(widget => ({
                    ...widget,
                    position: { ...widget.position, w: undefined, h: undefined }
                  })),
                  updatedAt: new Date(),
                }
              : layout
          )
        }));
      },

      setEditMode: (editMode: boolean) => {
        set({ editMode });
      },
    }),
    {
      name: 'traknor:custom-dashboards',
      version: 1,
    }
  )
);
