/**
 * EditableOverviewPage - Dashboard Customizável
 * 
 * Página de visão geral com widgets personalizáveis.
 * Permite reorganizar, adicionar e remover widgets.
 * 
 * Nota: Para funcionalidade completa de drag-drop, instalar @dnd-kit:
 * npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
 */

import { useMemo } from 'react';
import { Edit3, RotateCcw, Layout, GripVertical } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/shared/ui';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useOverviewStore } from '../store/overviewStore';
import { WidgetCard } from '../components/WidgetCard';
import { WidgetPalette } from '../components/WidgetPalette';
import { WidgetType } from '../types/dashboard';

export function EditableOverviewPage() {
  const { 
    widgets, 
    editMode, 
    addWidget,
    removeWidget, 
    setEditMode, 
    resetToDefault 
  } = useOverviewStore();

  // Dados mock para os widgets (em produção, usar React Query)
  const dashboardData = useMemo(() => {
    return {
      kpis: {
        uptime: 98.5,
        activeAlerts: 3,
        consumption: '1,250',
        avgHealth: 85.2,
        mtbf: '168',
        mttr: '2.5'
      },
      topAlerts: [
        { id: 1, message: 'Temperatura elevada no Chiller 01', severity: 'High', assetTag: 'CHLR-001' },
        { id: 2, message: 'Vibração anormal detectada', severity: 'Medium', assetTag: 'FC-015' },
        { id: 3, message: 'Manutenção preventiva pendente', severity: 'Low', assetTag: 'BAG-002' }
      ]
    };
  }, []);

  const handleAddWidget = (widgetType: WidgetType, title: string) => {
    addWidget(widgetType, title);
    toast.success(`Widget "${title}" adicionado`);
  };

  const handleRemoveWidget = (widgetId: string) => {
    removeWidget(widgetId);
    toast.info('Widget removido');
  };

  const handleResetToDefault = () => {
    if (confirm('Tem certeza que deseja restaurar os widgets padrão? Esta ação não pode ser desfeita.')) {
      resetToDefault();
      toast.success('Dashboard restaurado para configuração padrão');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Visão Geral"
        description="Monitoramento em tempo real dos sistemas HVAC críticos"
        icon={<Layout className="h-6 w-6" />}
      >
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Label htmlFor="edit-mode" className="text-sm text-muted-foreground">
              Editar:
            </Label>
            <Switch
              id="edit-mode"
              checked={editMode}
              onCheckedChange={setEditMode}
            />
          </div>
        </div>
      </PageHeader>

      {/* Edit Mode Actions */}
      {editMode && (
        <Alert className="bg-blue-50 border-blue-200">
          <Edit3 className="h-4 w-4 text-blue-600" />
          <AlertDescription className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="font-medium text-blue-800">Modo de Edição Ativo</span>
              <span className="text-blue-700 text-sm">
                Clique no X para remover widgets. Use a paleta para adicionar novos.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <WidgetPalette onAddWidget={handleAddWidget} />
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetToDefault}
                className="gap-2 border-blue-300 text-blue-700 hover:bg-blue-100"
              >
                <RotateCcw className="w-4 h-4" />
                Restaurar Padrão
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Drag-Drop Notice */}
      {editMode && (
        <Alert>
          <GripVertical className="h-4 w-4" />
          <AlertDescription>
            <strong>Drag & Drop:</strong> Para funcionalidade completa de arrastar e soltar, 
            instale o pacote @dnd-kit: <code className="bg-muted px-1 rounded">npm install @dnd-kit/core @dnd-kit/sortable</code>
          </AlertDescription>
        </Alert>
      )}

      {/* Dashboard Grid */}
      {widgets.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-6 gap-4">
          {widgets.map((widget) => (
            <WidgetCard
              key={widget.id}
              widget={widget}
              editMode={editMode}
              onRemove={handleRemoveWidget}
              data={dashboardData}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <div className="bg-card rounded-xl p-12 border shadow-sm max-w-md mx-auto">
            <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Edit3 className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Dashboard Vazio</h3>
            <p className="text-muted-foreground mb-6">
              {editMode 
                ? 'Use o botão "Adicionar Widget" para começar.' 
                : 'Ative o modo de edição para adicionar widgets.'}
            </p>
            {editMode ? (
              <div className="flex flex-col gap-2 items-center">
                <WidgetPalette onAddWidget={handleAddWidget} />
                <Button
                  variant="outline"
                  onClick={handleResetToDefault}
                  className="gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  Ou restaure os widgets padrão
                </Button>
              </div>
            ) : (
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
