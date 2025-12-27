import { useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core';
import {
  SortableContext,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { useDashboardStore } from '@/store/useDashboardStore';
import { DraggableWidget } from './DraggableWidget';
import { WidgetPalette } from './WidgetPalette';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from '@/components/ui/dialog';
import { 
  Edit3, 
  RotateCcw,
  Layout,
  Plus,
  Trash2
} from 'lucide-react';

export function CustomDashboard() {
  const { 
    layouts, 
    currentLayoutId, 
    editMode, 
    setEditMode, 
    setCurrentLayout, 
    createLayout, 
    deleteLayout, 
    updateLayout, 
    reorderWidgets, 
    resetWidgetSizes 
  } = useDashboardStore();
  
  const [showNewLayoutDialog, setShowNewLayoutDialog] = useState(false);
  const [newLayoutName, setNewLayoutName] = useState('');
  const [editingLayoutId, setEditingLayoutId] = useState<string | null>(null);
  const [editingLayoutName, setEditingLayoutName] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);
  
  const currentLayout = layouts.find(l => l.id === currentLayoutId);
  const activeWidget = currentLayout?.widgets.find(w => w.id === activeId);
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id) {
      return;
    }

    const widgets = currentLayout?.widgets || [];
    const widgetIds = widgets.map(w => w.id);
    
    const oldIndex = widgetIds.indexOf(active.id as string);
    const newIndex = widgetIds.indexOf(over.id as string);
    
    if (oldIndex === -1 || newIndex === -1) {
      return;
    }
    
    const newWidgetIds = [...widgetIds];
    const [movedWidget] = newWidgetIds.splice(oldIndex, 1);
    newWidgetIds.splice(newIndex, 0, movedWidget);
    
    if (currentLayoutId) {
      reorderWidgets(currentLayoutId, newWidgetIds);
    }
  }

  const handleCreateLayout = () => {
    if (newLayoutName.trim()) {
      createLayout(newLayoutName.trim());
      setNewLayoutName('');
      setShowNewLayoutDialog(false);
    }
  };

  const handleStartEditName = (layoutId: string, currentName: string) => {
    setEditingLayoutId(layoutId);
    setEditingLayoutName(currentName);
  };

  const handleSaveLayoutName = (layoutId: string) => {
    if (editingLayoutName.trim() && editingLayoutName !== layouts.find(l => l.id === layoutId)?.name) {
      updateLayout(layoutId, { name: editingLayoutName.trim() });
    }
    setEditingLayoutId(null);
    setEditingLayoutName('');
  };

  const handleCancelEditName = () => {
    setEditingLayoutId(null);
    setEditingLayoutName('');
  };
  
  const handleResetSizes = () => {
    if (confirm('Tem certeza que deseja resetar todos os tamanhos dos widgets para o padrão?')) {
      resetWidgetSizes(currentLayoutId);
    }
  };

  if (!currentLayout) {
    return (
      <div className="p-6 text-center">
        <div className="bg-card rounded-xl p-8 border shadow-sm">
          <Layout className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold mb-2">Nenhum layout encontrado</h2>
          <p className="text-muted-foreground mb-4">
            Crie um novo layout para começar a personalizar seu dashboard
          </p>
          <Button onClick={() => setShowNewLayoutDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Criar Layout
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Dashboards"
        description="Personalize seus dashboards com os widgets que mais importam para você"
      />

      {/* Header Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-muted-foreground">Modo Edição:</label>
          <Switch checked={editMode} onCheckedChange={setEditMode} />
        </div>
      </div>

      {/* Horizontal Layout Navigation (Tabs) */}
      <div className="border-b border-border">
        <div className="flex items-center gap-1 overflow-x-auto">
          {layouts.map((layout) => (
            <button
              key={layout.id}
              onClick={() => setCurrentLayout(layout.id)}
              className={`px-4 py-2 text-sm font-light whitespace-nowrap transition-colors border-b-2 ${
                layout.id === currentLayoutId
                  ? 'border-primary text-primary font-normal'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              }`}
            >
              {layout.name}
              {layout.isDefault && ' (Padrão)'}
            </button>
          ))}
          
          {/* Add New Layout Button */}
          <button
            onClick={() => setShowNewLayoutDialog(true)}
            className="px-4 py-2 text-sm font-light text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap flex items-center gap-1"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Tela</span>
          </button>
        </div>
      </div>

      {/* New Layout Dialog */}
      <Dialog open={showNewLayoutDialog} onOpenChange={setShowNewLayoutDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Criar Nova Tela</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Nome da Tela</label>
              <Input
                value={newLayoutName}
                onChange={(e) => setNewLayoutName(e.target.value)}
                placeholder="Ex: Produção, Qualidade, Manutenção..."
                onKeyDown={(e) => e.key === 'Enter' && handleCreateLayout()}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewLayoutDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateLayout} disabled={!newLayoutName.trim()}>
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Layout Dialog */}
      <Dialog open={!!editingLayoutId} onOpenChange={() => handleCancelEditName()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Renomear Tela</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Nome da Tela</label>
              <Input
                value={editingLayoutName}
                onChange={(e) => setEditingLayoutName(e.target.value)}
                placeholder="Digite o novo nome..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && editingLayoutId) handleSaveLayoutName(editingLayoutId);
                  if (e.key === 'Escape') handleCancelEditName();
                }}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelEditName}>
              Cancelar
            </Button>
            <Button 
              onClick={() => editingLayoutId && handleSaveLayoutName(editingLayoutId)} 
              disabled={!editingLayoutName.trim()}
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Mode Actions */}
      {editMode && (
        <div className="flex items-center justify-between bg-primary text-primary-foreground rounded-lg p-4 shadow-md">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-white/20">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <div className="font-medium">Modo de Edição Ativo</div>
              <p className="text-sm text-primary-foreground/80">
                Arraste widgets para reorganizar ou clique no X para remover
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleStartEditName(currentLayoutId, currentLayout?.name || '')}
              className="gap-2"
            >
              <Edit3 className="w-4 h-4" />
              Renomear Tela
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleResetSizes}
              className="gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Resetar Tamanhos
            </Button>
            <WidgetPalette layoutId={currentLayoutId} buttonVariant="secondary" />
            {!currentLayout?.isDefault && layouts.length > 1 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  if (confirm(`Tem certeza que deseja excluir a tela "${currentLayout?.name}"?`)) {
                    deleteLayout(currentLayoutId);
                  }
                }}
                className="gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Excluir Tela
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Dashboard Grid */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={currentLayout.widgets.map(w => w.id)} strategy={rectSortingStrategy}>
          <div 
            className="grid grid-cols-1 lg:grid-cols-6 gap-6" 
            style={{ gridAutoRows: 'minmax(200px, auto)', gridAutoFlow: 'dense' }}
          >
            {currentLayout.widgets.map(widget => (
              <DraggableWidget
                key={widget.id}
                widget={widget}
                layoutId={currentLayoutId}
              />
            ))}
          </div>
        </SortableContext>
        
        <DragOverlay dropAnimation={null}>
          {activeWidget ? (
            <div 
              className="bg-primary/10 backdrop-blur-sm rounded-xl border-2 border-primary shadow-2xl p-6 cursor-grabbing" 
              style={{ width: '240px', height: '160px' }}
            >
              <div className="flex flex-col items-center justify-center h-full gap-3">
                <Layout className="w-12 h-12 text-primary" />
                <div className="text-center">
                  <div className="text-sm font-semibold text-foreground">{activeWidget.title}</div>
                  <div className="text-xs text-muted-foreground mt-1 capitalize">
                    {activeWidget.type.replace(/-/g, ' ')}
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Empty State */}
      {currentLayout.widgets.length === 0 && (
        <div className="text-center py-12">
          <div className="bg-card rounded-xl p-8 border shadow-sm">
            <Layout className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Dashboard Vazio</h3>
            <p className="text-muted-foreground mb-6">
              {editMode 
                ? 'Use o botão "Adicionar Widget" para começar.' 
                : 'Ative o modo de edição para adicionar widgets.'
              }
            </p>
            {!editMode && (
              <Button onClick={() => setEditMode(true)} className="gap-2">
                <Edit3 className="w-4 h-4" />
                Ativar Modo de Edição
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
