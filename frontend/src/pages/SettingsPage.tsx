/**
 * SettingsPage - Página de Configurações
 * 
 * Layout de plataforma com sidebar de navegação e conteúdo ocupando toda a tela.
 * Permite configurar:
 * - SLA de atendimento e fechamento por prioridade
 * - Status personalizados de ordens de serviço
 * - Tipos de serviço personalizados
 * - Notificações do sistema
 * - Integrações
 */

import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Clock, 
  AlertTriangle, 
  AlertCircle, 
  ArrowUp, 
  ArrowDown,
  Timer,
  CheckCircle2,
  Settings2,
  Plus,
  Trash2,
  ClipboardList,
  Tag,
  Palette,
  Bell,
  Shield,
  Plug,
  Building2,
  Save,
  RotateCcw,
  ChevronRight,
  Info,
  FileUp,
  Download,
  Upload,
  FileSpreadsheet,
  CheckCircle,
  XCircle,
  Loader2
} from 'lucide-react';
import { useSLAStore, type SLASettings } from '@/store/useSLAStore';
import { 
  useWorkOrderSettingsStore, 
  type WorkOrderSettings,
  type WorkOrderStatusConfig,
  type WorkOrderTypeConfig 
} from '@/store/useWorkOrderSettingsStore';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// Configurações de prioridade para SLA
const priorityLabels = {
  CRITICAL: { label: 'Crítica', icon: AlertTriangle, color: 'text-red-500', bgColor: 'bg-red-500/10', borderColor: 'border-red-500/20' },
  HIGH: { label: 'Alta', icon: AlertCircle, color: 'text-orange-500', bgColor: 'bg-orange-500/10', borderColor: 'border-orange-500/20' },
  MEDIUM: { label: 'Média', icon: ArrowUp, color: 'text-amber-500', bgColor: 'bg-amber-500/10', borderColor: 'border-amber-500/20' },
  LOW: { label: 'Baixa', icon: ArrowDown, color: 'text-blue-500', bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500/20' },
};

// Opções de cores para status/tipos
const colorOptions = [
  { value: '#3b82f6', label: 'Azul', class: 'bg-blue-500' },
  { value: '#22c55e', label: 'Verde', class: 'bg-green-500' },
  { value: '#f59e0b', label: 'Amarelo', class: 'bg-amber-500' },
  { value: '#ef4444', label: 'Vermelho', class: 'bg-red-500' },
  { value: '#8b5cf6', label: 'Roxo', class: 'bg-purple-500' },
  { value: '#ec4899', label: 'Rosa', class: 'bg-pink-500' },
  { value: '#14b8a6', label: 'Teal', class: 'bg-teal-500' },
  { value: '#6b7280', label: 'Cinza', class: 'bg-gray-500' },
];

// Seções de configuração
type SettingSection = 'work-orders' | 'sla' | 'notifications' | 'organization' | 'integrations' | 'imports';

const settingSections: { 
  id: SettingSection; 
  label: string; 
  icon: React.ElementType; 
  description: string;
}[] = [
  { 
    id: 'work-orders', 
    label: 'Ordens de Serviço', 
    icon: ClipboardList, 
    description: 'Status e tipos de serviço' 
  },
  { 
    id: 'sla', 
    label: 'SLA', 
    icon: Timer, 
    description: 'Tempos de atendimento' 
  },
  { 
    id: 'notifications', 
    label: 'Notificações', 
    icon: Bell, 
    description: 'Alertas e avisos' 
  },
  { 
    id: 'organization', 
    label: 'Organização', 
    icon: Building2, 
    description: 'Dados da empresa' 
  },
  { 
    id: 'integrations', 
    label: 'Integrações', 
    icon: Plug, 
    description: 'APIs e conexões' 
  },
  { 
    id: 'imports', 
    label: 'Importações', 
    icon: FileUp, 
    description: 'Importar localizações' 
  },
];

export function SettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeSection, setActiveSection] = useState<SettingSection>(
    (searchParams.get('section') as SettingSection) || 'work-orders'
  );
  const [hasChanges, setHasChanges] = useState(false);
  
  // SLA Store
  const { settings: slaSettings, setSettings: setSLASettings } = useSLAStore();
  const [localSLASettings, setLocalSLASettings] = useState<SLASettings>(slaSettings);
  
  // Work Order Settings Store
  const { settings: woSettings, setSettings: setWOSettings } = useWorkOrderSettingsStore();
  const [localWOSettings, setLocalWOSettings] = useState<WorkOrderSettings>(woSettings);
  
  // New status/type form
  const [newStatusLabel, setNewStatusLabel] = useState('');
  const [newStatusColor, setNewStatusColor] = useState('#3b82f6');
  const [newTypeLabel, setNewTypeLabel] = useState('');
  const [newTypeColor, setNewTypeColor] = useState('#3b82f6');

  // Sincroniza quando a página carrega
  useEffect(() => {
    setLocalSLASettings(slaSettings);
    setLocalWOSettings(woSettings);
  }, [slaSettings, woSettings]);

  // Atualiza URL quando muda a seção
  useEffect(() => {
    setSearchParams({ section: activeSection });
  }, [activeSection, setSearchParams]);

  // Detecta mudanças
  useEffect(() => {
    const slaChanged = JSON.stringify(localSLASettings) !== JSON.stringify(slaSettings);
    const woChanged = JSON.stringify(localWOSettings) !== JSON.stringify(woSettings);
    setHasChanges(slaChanged || woChanged);
  }, [localSLASettings, localWOSettings, slaSettings, woSettings]);

  const handleSave = () => {
    setSLASettings(localSLASettings);
    setWOSettings(localWOSettings);
    setHasChanges(false);
    toast.success('Configurações salvas com sucesso');
  };

  const handleReset = () => {
    setLocalSLASettings(slaSettings);
    setLocalWOSettings(woSettings);
    setHasChanges(false);
    toast.info('Alterações descartadas');
  };

  const updatePrioritySLA = (
    priority: keyof SLASettings['priorities'],
    field: 'responseTime' | 'resolutionTime',
    type: 'hours' | 'minutes',
    value: string
  ) => {
    const numValue = parseInt(value) || 0;
    setLocalSLASettings((prev) => {
      const currentTotalMinutes = prev.priorities[priority][field];
      const currentHours = Math.floor(currentTotalMinutes / 60);
      const currentMinutes = currentTotalMinutes % 60;
      
      let newTotalMinutes: number;
      if (type === 'hours') {
        newTotalMinutes = numValue * 60 + currentMinutes;
      } else {
        newTotalMinutes = currentHours * 60 + Math.min(numValue, 59);
      }
      
      return {
        ...prev,
        priorities: {
          ...prev.priorities,
          [priority]: {
            ...prev.priorities[priority],
            [field]: newTotalMinutes,
          },
        },
      };
    });
  };

  // Helpers para extrair horas e minutos de minutos totais
  const getHours = (totalMinutes: number) => Math.floor(totalMinutes / 60);
  const getMinutes = (totalMinutes: number) => totalMinutes % 60;

  const handleAddStatus = () => {
    if (!newStatusLabel.trim()) {
      toast.error('Digite um nome para o status');
      return;
    }
    
    const newStatus: WorkOrderStatusConfig = {
      id: `custom_${Date.now()}`,
      label: newStatusLabel.trim(),
      color: newStatusColor,
      isDefault: false,
    };
    
    setLocalWOSettings((prev) => ({
      ...prev,
      statuses: [...prev.statuses, newStatus],
    }));
    
    setNewStatusLabel('');
    setNewStatusColor('#3b82f6');
  };

  const handleRemoveStatus = (id: string) => {
    setLocalWOSettings((prev) => ({
      ...prev,
      statuses: prev.statuses.filter((s) => s.id !== id),
    }));
  };

  const handleAddType = () => {
    if (!newTypeLabel.trim()) {
      toast.error('Digite um nome para o tipo de serviço');
      return;
    }
    
    const newType: WorkOrderTypeConfig = {
      id: `custom_${Date.now()}`,
      label: newTypeLabel.trim(),
      color: newTypeColor,
      isDefault: false,
    };
    
    setLocalWOSettings((prev) => ({
      ...prev,
      types: [...prev.types, newType],
    }));
    
    setNewTypeLabel('');
    setNewTypeColor('#3b82f6');
  };

  const handleRemoveType = (id: string) => {
    setLocalWOSettings((prev) => ({
      ...prev,
      types: prev.types.filter((t) => t.id !== id),
    }));
  };

  // Renderiza o conteúdo baseado na seção ativa
  const renderContent = () => {
    switch (activeSection) {
      case 'work-orders':
        return <WorkOrdersSection 
          localWOSettings={localWOSettings}
          newStatusLabel={newStatusLabel}
          setNewStatusLabel={setNewStatusLabel}
          newStatusColor={newStatusColor}
          setNewStatusColor={setNewStatusColor}
          newTypeLabel={newTypeLabel}
          setNewTypeLabel={setNewTypeLabel}
          newTypeColor={newTypeColor}
          setNewTypeColor={setNewTypeColor}
          handleAddStatus={handleAddStatus}
          handleRemoveStatus={handleRemoveStatus}
          handleAddType={handleAddType}
          handleRemoveType={handleRemoveType}
        />;
      case 'sla':
        return <SLASection 
          localSLASettings={localSLASettings}
          setLocalSLASettings={setLocalSLASettings}
          updatePrioritySLA={updatePrioritySLA}
          getHours={getHours}
          getMinutes={getMinutes}
        />;
      case 'notifications':
        return <NotificationsSection />;
      case 'organization':
        return <OrganizationSection />;
      case 'integrations':
        return <IntegrationsSection />;
      case 'imports':
        return <ImportsSection />;
      default:
        return null;
    }
  };

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col">
      {/* Header fixo */}
      <div className="flex-shrink-0 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
              <Settings2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">Configurações</h1>
              <p className="text-sm text-muted-foreground">
                Personalize o sistema de acordo com suas necessidades
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {hasChanges && (
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                <Info className="h-3 w-3 mr-1" />
                Alterações não salvas
              </Badge>
            )}
            <Button 
              variant="outline" 
              onClick={handleReset}
              disabled={!hasChanges}
              className="gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Descartar
            </Button>
            <Button 
              onClick={handleSave}
              disabled={!hasChanges}
              className="gap-2"
            >
              <Save className="h-4 w-4" />
              Salvar Alterações
            </Button>
          </div>
        </div>
      </div>

      {/* Conteúdo principal com sidebar */}
      <div className="flex-1 flex min-h-0">
        {/* Sidebar de navegação */}
        <aside className="w-64 flex-shrink-0 border-r bg-muted/30">
          <ScrollArea className="h-full">
            <nav className="p-4 space-y-1">
              {settingSections.map((section) => {
                const Icon = section.icon;
                const isActive = activeSection === section.id;
                
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all",
                      isActive 
                        ? "bg-primary text-primary-foreground shadow-sm" 
                        : "hover:bg-muted text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Icon className={cn("h-5 w-5", isActive ? "text-primary-foreground" : "text-muted-foreground")} />
                    <div className="flex-1 min-w-0">
                      <div className={cn("font-medium text-sm", isActive && "text-primary-foreground")}>
                        {section.label}
                      </div>
                      <div className={cn(
                        "text-xs truncate",
                        isActive ? "text-primary-foreground/70" : "text-muted-foreground"
                      )}>
                        {section.description}
                      </div>
                    </div>
                    {isActive && <ChevronRight className="h-4 w-4 text-primary-foreground/70" />}
                  </button>
                );
              })}
            </nav>
          </ScrollArea>
        </aside>

        {/* Área de conteúdo */}
        <main className="flex-1 min-w-0">
          <ScrollArea className="h-full">
            <div className="p-6">
              {renderContent()}
            </div>
          </ScrollArea>
        </main>
      </div>
    </div>
  );
}

// ==================== SEÇÕES ====================

interface WorkOrdersSectionProps {
  localWOSettings: WorkOrderSettings;
  newStatusLabel: string;
  setNewStatusLabel: (value: string) => void;
  newStatusColor: string;
  setNewStatusColor: (value: string) => void;
  newTypeLabel: string;
  setNewTypeLabel: (value: string) => void;
  newTypeColor: string;
  setNewTypeColor: (value: string) => void;
  handleAddStatus: () => void;
  handleRemoveStatus: (id: string) => void;
  handleAddType: () => void;
  handleRemoveType: (id: string) => void;
}

function WorkOrdersSection({
  localWOSettings,
  newStatusLabel,
  setNewStatusLabel,
  newStatusColor,
  setNewStatusColor,
  newTypeLabel,
  setNewTypeLabel,
  newTypeColor,
  setNewTypeColor,
  handleAddStatus,
  handleRemoveStatus,
  handleAddType,
  handleRemoveType,
}: WorkOrdersSectionProps) {
  return (
    <div className="space-y-8">
      {/* Header da seção */}
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-primary" />
          Configuração de Ordens de Serviço
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Personalize os status e tipos de serviço disponíveis para as ordens de serviço.
        </p>
      </div>

      {/* Status Section */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Tag className="h-4 w-4" />
            Status de Ordem de Serviço
          </CardTitle>
          <CardDescription>
            Defina os status que uma ordem de serviço pode ter durante seu ciclo de vida.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Lista de status existentes */}
          <div className="flex flex-wrap gap-3">
            {localWOSettings.statuses.map((status) => (
              <div 
                key={status.id}
                className="group flex items-center gap-3 px-3 py-2 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div 
                    className="w-3 h-3 rounded-full border-2" 
                    style={{ backgroundColor: status.color, borderColor: status.color }}
                  />
                  <span className="text-sm font-medium">{status.label}</span>
                </div>
                {status.isDefault ? (
                  <Badge variant="secondary" className="text-[10px]">Padrão</Badge>
                ) : (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
                    onClick={() => handleRemoveStatus(status.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            ))}
          </div>
          
          <Separator />
          
          {/* Formulário para adicionar novo status */}
          <div className="flex items-end gap-4 p-4 bg-muted/30 rounded-lg border border-dashed">
            <div className="flex-1 space-y-2">
              <Label htmlFor="new-status" className="text-sm">Novo Status</Label>
              <Input
                id="new-status"
                placeholder="Ex: Em Análise, Aguardando Peças..."
                value={newStatusLabel}
                onChange={(e) => setNewStatusLabel(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddStatus()}
                className="h-9"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Cor</Label>
              <div className="flex gap-1.5">
                {colorOptions.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    className={cn(
                      "w-7 h-7 rounded-full transition-all",
                      color.class,
                      newStatusColor === color.value 
                        ? 'ring-2 ring-offset-2 ring-primary scale-110' 
                        : 'hover:scale-105 opacity-70 hover:opacity-100'
                    )}
                    onClick={() => setNewStatusColor(color.value)}
                    title={color.label}
                  />
                ))}
              </div>
            </div>
            <Button onClick={handleAddStatus} size="sm" className="h-9 gap-1.5">
              <Plus className="h-4 w-4" />
              Adicionar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Types Section */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Tipos de Serviço
          </CardTitle>
          <CardDescription>
            Categorize as ordens de serviço por tipo para melhor organização e relatórios.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Lista de tipos existentes */}
          <div className="flex flex-wrap gap-3">
            {localWOSettings.types.map((type) => (
              <div 
                key={type.id}
                className="group flex items-center gap-3 px-3 py-2 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div 
                    className="w-3 h-3 rounded-full border-2" 
                    style={{ backgroundColor: type.color, borderColor: type.color }}
                  />
                  <span className="text-sm font-medium">{type.label}</span>
                </div>
                {type.isDefault ? (
                  <Badge variant="secondary" className="text-[10px]">Padrão</Badge>
                ) : (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
                    onClick={() => handleRemoveType(type.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            ))}
          </div>
          
          <Separator />
          
          {/* Formulário para adicionar novo tipo */}
          <div className="flex items-end gap-4 p-4 bg-muted/30 rounded-lg border border-dashed">
            <div className="flex-1 space-y-2">
              <Label htmlFor="new-type" className="text-sm">Novo Tipo de Serviço</Label>
              <Input
                id="new-type"
                placeholder="Ex: Emergencial, Instalação, Calibração..."
                value={newTypeLabel}
                onChange={(e) => setNewTypeLabel(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddType()}
                className="h-9"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Cor</Label>
              <div className="flex gap-1.5">
                {colorOptions.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    className={cn(
                      "w-7 h-7 rounded-full transition-all",
                      color.class,
                      newTypeColor === color.value 
                        ? 'ring-2 ring-offset-2 ring-primary scale-110' 
                        : 'hover:scale-105 opacity-70 hover:opacity-100'
                    )}
                    onClick={() => setNewTypeColor(color.value)}
                    title={color.label}
                  />
                ))}
              </div>
            </div>
            <Button onClick={handleAddType} size="sm" className="h-9 gap-1.5">
              <Plus className="h-4 w-4" />
              Adicionar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface SLASectionProps {
  localSLASettings: SLASettings;
  setLocalSLASettings: React.Dispatch<React.SetStateAction<SLASettings>>;
  updatePrioritySLA: (
    priority: keyof SLASettings['priorities'],
    field: 'responseTime' | 'resolutionTime',
    type: 'hours' | 'minutes',
    value: string
  ) => void;
  getHours: (totalMinutes: number) => number;
  getMinutes: (totalMinutes: number) => number;
}

function SLASection({ localSLASettings, setLocalSLASettings, updatePrioritySLA, getHours, getMinutes }: SLASectionProps) {
  return (
    <div className="space-y-8">
      {/* Header da seção */}
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Timer className="h-5 w-5 text-primary" />
          Configuração de SLA
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Defina os tempos máximos de atendimento e resolução para cada nível de prioridade.
        </p>
      </div>

      {/* Toggle SLA */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={cn(
                "flex items-center justify-center w-12 h-12 rounded-xl transition-colors",
                localSLASettings.enabled ? "bg-green-500/10" : "bg-muted"
              )}>
                <Timer className={cn(
                  "h-6 w-6 transition-colors",
                  localSLASettings.enabled ? "text-green-600" : "text-muted-foreground"
                )} />
              </div>
              <div>
                <div className="font-medium">Controle de SLA</div>
                <p className="text-sm text-muted-foreground">
                  {localSLASettings.enabled 
                    ? 'Os indicadores de SLA estão visíveis nas ordens de serviço' 
                    : 'Ative para monitorar tempos de atendimento e resolução'}
                </p>
              </div>
            </div>
            <Switch
              checked={localSLASettings.enabled}
              onCheckedChange={(checked) => 
                setLocalSLASettings((prev) => ({ ...prev, enabled: checked }))
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Legenda */}
      <div className="flex flex-wrap gap-6 p-4 bg-muted/30 rounded-lg">
        <div className="flex items-center gap-2 text-sm">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-500/10">
            <Clock className="h-4 w-4 text-blue-600" />
          </div>
          <div>
            <div className="font-medium">SLA de Atendimento</div>
            <div className="text-xs text-muted-foreground">Tempo máximo para iniciar a OS</div>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-green-500/10">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </div>
          <div>
            <div className="font-medium">SLA de Fechamento</div>
            <div className="text-xs text-muted-foreground">Tempo máximo para concluir a OS</div>
          </div>
        </div>
      </div>

      {/* Configurações por prioridade */}
      <div className="space-y-4">
        {(Object.keys(priorityLabels) as Array<keyof typeof priorityLabels>).map((priority) => {
          const { label, icon: Icon, color, bgColor, borderColor } = priorityLabels[priority];
          const config = localSLASettings.priorities[priority];

          return (
            <Card 
              key={priority} 
              className={cn(
                "transition-all",
                !localSLASettings.enabled && "opacity-50"
              )}
            >
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  {/* Ícone e Label */}
                  <div className="flex items-center gap-3">
                    <div className={cn("flex items-center justify-center w-10 h-10 rounded-lg", bgColor)}>
                      <Icon className={cn("h-5 w-5", color)} />
                    </div>
                    <div>
                      <div className="font-medium">Prioridade {label}</div>
                      <Badge variant="outline" className={cn("text-[10px] mt-0.5", borderColor)}>
                        {priority}
                      </Badge>
                    </div>
                  </div>

                  {/* Inputs lado a lado */}
                  <div className="flex items-center gap-8">
                    <div className="flex items-center gap-3">
                      <Clock className="h-4 w-4 text-blue-500" />
                      <div className="flex items-center gap-1.5">
                        <Input
                          type="number"
                          min="0"
                          value={getHours(config.responseTime)}
                          onChange={(e) => updatePrioritySLA(priority, 'responseTime', 'hours', e.target.value)}
                          className="w-14 h-9 text-center"
                          disabled={!localSLASettings.enabled}
                        />
                        <span className="text-xs text-muted-foreground">h</span>
                        <Input
                          type="number"
                          min="0"
                          max="59"
                          value={getMinutes(config.responseTime)}
                          onChange={(e) => updatePrioritySLA(priority, 'responseTime', 'minutes', e.target.value)}
                          className="w-14 h-9 text-center"
                          disabled={!localSLASettings.enabled}
                        />
                        <span className="text-xs text-muted-foreground">min</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <div className="flex items-center gap-1.5">
                        <Input
                          type="number"
                          min="0"
                          value={getHours(config.resolutionTime)}
                          onChange={(e) => updatePrioritySLA(priority, 'resolutionTime', 'hours', e.target.value)}
                          className="w-14 h-9 text-center"
                          disabled={!localSLASettings.enabled}
                        />
                        <span className="text-xs text-muted-foreground">h</span>
                        <Input
                          type="number"
                          min="0"
                          max="59"
                          value={getMinutes(config.resolutionTime)}
                          onChange={(e) => updatePrioritySLA(priority, 'resolutionTime', 'minutes', e.target.value)}
                          className="w-14 h-9 text-center"
                          disabled={!localSLASettings.enabled}
                        />
                        <span className="text-xs text-muted-foreground">min</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function NotificationsSection() {
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(false);
  const [slaBreach, setSlaBreach] = useState(true);
  const [newWorkOrder, setNewWorkOrder] = useState(true);
  const [statusChange, setStatusChange] = useState(true);

  return (
    <div className="space-y-8">
      {/* Header da seção */}
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          Configuração de Notificações
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Defina como e quando você deseja receber alertas e notificações do sistema.
        </p>
      </div>

      {/* Canais de notificação */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Canais de Notificação</CardTitle>
          <CardDescription>
            Escolha os meios pelos quais deseja receber notificações.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-500/10">
                <Bell className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <div className="font-medium">Notificações por Email</div>
                <div className="text-sm text-muted-foreground">Receba alertas no seu email cadastrado</div>
              </div>
            </div>
            <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} />
          </div>
          
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-purple-500/10">
                <Bell className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <div className="font-medium">Notificações Push</div>
                <div className="text-sm text-muted-foreground">Receba alertas em tempo real no navegador</div>
              </div>
            </div>
            <Switch checked={pushNotifications} onCheckedChange={setPushNotifications} />
          </div>
        </CardContent>
      </Card>

      {/* Tipos de notificação */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Eventos de Notificação</CardTitle>
          <CardDescription>
            Selecione os eventos que devem gerar notificações.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between py-3 border-b">
            <div>
              <div className="font-medium text-sm">Violação de SLA</div>
              <div className="text-xs text-muted-foreground">Quando uma OS ultrapassa o tempo de SLA</div>
            </div>
            <Switch checked={slaBreach} onCheckedChange={setSlaBreach} />
          </div>
          
          <div className="flex items-center justify-between py-3 border-b">
            <div>
              <div className="font-medium text-sm">Nova Ordem de Serviço</div>
              <div className="text-xs text-muted-foreground">Quando uma nova OS é criada</div>
            </div>
            <Switch checked={newWorkOrder} onCheckedChange={setNewWorkOrder} />
          </div>
          
          <div className="flex items-center justify-between py-3">
            <div>
              <div className="font-medium text-sm">Mudança de Status</div>
              <div className="text-xs text-muted-foreground">Quando o status de uma OS é alterado</div>
            </div>
            <Switch checked={statusChange} onCheckedChange={setStatusChange} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function OrganizationSection() {
  return (
    <div className="space-y-8">
      {/* Header da seção */}
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" />
          Dados da Organização
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Informações gerais sobre sua empresa.
        </p>
      </div>

      <Card>
        <CardContent className="p-6 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="org-name">Nome da Empresa</Label>
            <Input id="org-name" placeholder="Nome da empresa" defaultValue="UMC - Universidade de Mogi das Cruzes" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="org-cnpj">CNPJ</Label>
            <Input id="org-cnpj" placeholder="00.000.000/0000-00" defaultValue="52.562.758/0001-00" />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="org-address">Endereço</Label>
            <Input id="org-address" placeholder="Endereço completo" defaultValue="Av. Dr. Cândido Xavier de Almeida Souza, 200" />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="org-city">Cidade</Label>
            <Input id="org-city" placeholder="Cidade" defaultValue="Mogi das Cruzes" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="org-state">Estado</Label>
            <Input id="org-state" placeholder="UF" defaultValue="SP" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="org-cep">CEP</Label>
            <Input id="org-cep" placeholder="00000-000" defaultValue="08780-911" />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="org-phone">Telefone</Label>
            <Input id="org-phone" placeholder="(00) 0000-0000" defaultValue="(11) 4798-7000" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="org-email">Email</Label>
            <Input id="org-email" type="email" placeholder="contato@empresa.com" defaultValue="contato@umc.br" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function IntegrationsSection() {
  return (
    <div className="space-y-8">
      {/* Header da seção */}
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Plug className="h-5 w-5 text-primary" />
          Integrações
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Conecte o TrakNor com outros sistemas e serviços.
        </p>
      </div>

      <div className="space-y-4">
        {/* API */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-blue-500/10">
                  <Shield className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <div className="font-medium">API REST</div>
                  <p className="text-sm text-muted-foreground">
                    Integre via API para automatizar processos
                  </p>
                </div>
              </div>
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                Conectado
              </Badge>
            </div>
          </CardContent>
        </Card>
        
        {/* Webhook */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-purple-500/10">
                  <Plug className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <div className="font-medium">Webhooks</div>
                  <p className="text-sm text-muted-foreground">
                    Receba eventos em tempo real
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm">Configurar</Button>
            </div>
          </CardContent>
        </Card>
        
        {/* ERP */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-amber-500/10">
                  <Building2 className="h-6 w-6 text-amber-600" />
                </div>
                <div>
                  <div className="font-medium">Integração ERP</div>
                  <p className="text-sm text-muted-foreground">
                    Conecte com seu sistema de gestão
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm">Conectar</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Interface para os dados do CSV
interface LocationCSVRow {
  empresa_nome: string;
  empresa_cnpj?: string;
  empresa_endereco?: string;
  empresa_cidade?: string;
  empresa_estado?: string;
  empresa_cep?: string;
  empresa_area_total?: string;
  empresa_ocupantes?: string;
  empresa_hvac?: string;
  unidade_nome?: string;
  unidade_cnpj?: string;
  unidade_endereco?: string;
  unidade_cidade?: string;
  unidade_estado?: string;
  unidade_cep?: string;
  unidade_area_total?: string;
  unidade_ocupantes?: string;
  unidade_hvac?: string;
  setor_nome?: string;
  setor_responsavel?: string;
  setor_telefone?: string;
  setor_email?: string;
  setor_area?: string;
  setor_ocupantes?: string;
  setor_hvac?: string;
  subsetor_nome?: string;
  subsetor_observacoes?: string;
}

interface ImportResult {
  success: boolean;
  type: 'company' | 'unit' | 'sector' | 'subsection';
  name: string;
  error?: string;
}

function ImportsSection() {
  const [isUploading, setIsUploading] = useState(false);
  const [importResults, setImportResults] = useState<ImportResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Função para gerar o modelo CSV
  const handleDownloadTemplate = () => {
    const headers = [
      'empresa_nome',
      'empresa_cnpj',
      'empresa_endereco',
      'empresa_cidade',
      'empresa_estado',
      'empresa_cep',
      'empresa_area_total',
      'empresa_ocupantes',
      'empresa_hvac',
      'unidade_nome',
      'unidade_cnpj',
      'unidade_endereco',
      'unidade_cidade',
      'unidade_estado',
      'unidade_cep',
      'unidade_area_total',
      'unidade_ocupantes',
      'unidade_hvac',
      'setor_nome',
      'setor_responsavel',
      'setor_telefone',
      'setor_email',
      'setor_area',
      'setor_ocupantes',
      'setor_hvac',
      'subsetor_nome',
      'subsetor_observacoes'
    ];

    // Dados de exemplo - demonstra a hierarquia com múltiplas empresas
    // IMPORTANTE: Repita o nome da empresa/unidade/setor em cada linha para indicar a hierarquia
    const exampleData = [
      // === EMPRESA 1: Empresa Exemplo ===
      // Linha 1: Empresa + Unidade + Setor + Subsetor (todos os níveis preenchidos)
      [
        'Empresa Exemplo',           // empresa_nome (OBRIGATÓRIO)
        '00.000.000/0001-00',        // empresa_cnpj
        'Av. Principal, 1000',       // empresa_endereco
        'São Paulo',                 // empresa_cidade
        'SP',                        // empresa_estado
        '01310-100',                 // empresa_cep
        '5000',                      // empresa_area_total
        '100',                       // empresa_ocupantes
        '10',                        // empresa_hvac
        'Filial Centro',             // unidade_nome
        '00.000.000/0002-00',        // unidade_cnpj
        'Rua Secundária, 500',       // unidade_endereco
        'São Paulo',                 // unidade_cidade
        'SP',                        // unidade_estado
        '01310-200',                 // unidade_cep
        '2000',                      // unidade_area_total
        '50',                        // unidade_ocupantes
        '5',                         // unidade_hvac
        'Produção',                  // setor_nome
        'João Silva',                // setor_responsavel
        '(11) 99999-9999',           // setor_telefone
        'joao@empresa.com',          // setor_email
        '500',                       // setor_area
        '20',                        // setor_ocupantes
        '3',                         // setor_hvac
        'Linha 1',                   // subsetor_nome
        'Linha de montagem principal' // subsetor_observacoes
      ],
      // Linha 2: Outro subsetor no mesmo setor (repete empresa + unidade + setor)
      [
        'Empresa Exemplo',           // MESMO nome da empresa
        '', '', '', '', '', '', '', '',
        'Filial Centro',             // MESMO nome da unidade
        '', '', '', '', '', '', '', '',
        'Produção',                  // MESMO nome do setor
        '', '', '', '', '', '',
        'Linha 2',                   // NOVO subsetor
        'Linha de montagem secundária'
      ],
      // Linha 3: Novo setor na mesma unidade (repete empresa + unidade)
      [
        'Empresa Exemplo',           // MESMO nome da empresa
        '', '', '', '', '', '', '', '',
        'Filial Centro',             // MESMO nome da unidade
        '', '', '', '', '', '', '', '',
        'Administrativo',            // NOVO setor
        'Maria Santos',
        '(11) 88888-8888',
        'maria@empresa.com',
        '200',
        '10',
        '2',
        '',                          // sem subsetor
        ''
      ],
      // Linha 4: Nova unidade na mesma empresa (repete empresa)
      [
        'Empresa Exemplo',           // MESMO nome da empresa
        '', '', '', '', '', '', '', '',
        'Filial Norte',              // NOVA unidade
        '00.000.000/0003-00',
        'Av. Norte, 200',
        'Guarulhos',
        'SP',
        '07000-000',
        '1500',
        '30',
        '3',
        'Estoque',                   // setor da nova unidade
        'Carlos Souza',
        '(11) 77777-7777',
        'carlos@empresa.com',
        '800',
        '15',
        '1',
        '',
        ''
      ],
      // === EMPRESA 2: Outra Empresa ===
      // Linha 5: Nova empresa completa
      [
        'Outra Empresa LTDA',        // NOVA empresa
        '11.111.111/0001-11',
        'Rua das Flores, 50',
        'Rio de Janeiro',
        'RJ',
        '20000-000',
        '3000',
        '80',
        '8',
        'Matriz RJ',                 // unidade da nova empresa
        '',
        'Rua das Flores, 50',
        'Rio de Janeiro',
        'RJ',
        '20000-000',
        '3000',
        '80',
        '8',
        'Comercial',                 // setor
        'Ana Paula',
        '(21) 99999-8888',
        'ana@outraempresa.com',
        '400',
        '25',
        '2',
        'Vendas',                    // subsetor
        'Equipe de vendas externas'
      ]
    ];

    const csvContent = [
      headers.join(';'),
      ...exampleData.map(row => row.join(';'))
    ].join('\n');

    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'modelo_importacao_localizacoes.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success('Modelo CSV baixado com sucesso!');
  };

  // Função para processar o arquivo CSV
  const parseCSV = (text: string): LocationCSVRow[] => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];

    const headers = lines[0].split(';').map(h => h.trim().toLowerCase());
    const rows: LocationCSVRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(';').map(v => v.trim());
      const row: Record<string, string> = {};
      
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });

      rows.push(row as unknown as LocationCSVRow);
    }

    return rows;
  };

  // Função para importar os dados
  const handleImport = async () => {
    if (!selectedFile) {
      toast.error('Selecione um arquivo CSV');
      return;
    }

    setIsUploading(true);
    setImportResults([]);
    setShowResults(false);

    try {
      const text = await selectedFile.text();
      const rows = parseCSV(text);

      if (rows.length === 0) {
        toast.error('Arquivo CSV vazio ou inválido');
        setIsUploading(false);
        return;
      }

      const results: ImportResult[] = [];
      const { locationsService } = await import('@/services/locationsService');
      
      // Mapas para guardar IDs criados
      const companyMap = new Map<string, string>();
      const unitMap = new Map<string, string>();
      const sectorMap = new Map<string, string>();

      // Buscar empresas e unidades existentes
      const existingCompanies = await locationsService.getCompanies();
      const existingUnits = await locationsService.getUnits();
      const existingSectors = await locationsService.getSectors();

      existingCompanies.forEach(c => companyMap.set(c.name.toLowerCase(), c.id));
      existingUnits.forEach(u => unitMap.set(`${u.companyId}-${u.name.toLowerCase()}`, u.id));
      existingSectors.forEach(s => sectorMap.set(`${s.unitId}-${s.name.toLowerCase()}`, s.id));

      for (const row of rows) {
        // 1. Processar Empresa
        if (row.empresa_nome) {
          const companyKey = row.empresa_nome.toLowerCase();
          
          if (!companyMap.has(companyKey)) {
            try {
              const company = await locationsService.createCompany({
                name: row.empresa_nome,
                segment: '',
                cnpj: row.empresa_cnpj || '',
                address: {
                  fullAddress: row.empresa_endereco || '',
                  city: row.empresa_cidade || '',
                  state: row.empresa_estado || '',
                  zip: row.empresa_cep || ''
                },
                responsible: '',
                role: '',
                totalArea: row.empresa_area_total ? Number(row.empresa_area_total) : 0,
                occupants: row.empresa_ocupantes ? Number(row.empresa_ocupantes) : 0,
                hvacUnits: row.empresa_hvac ? Number(row.empresa_hvac) : 0
              });
              companyMap.set(companyKey, company.id);
              results.push({ success: true, type: 'company', name: row.empresa_nome });
            } catch (error) {
              results.push({ 
                success: false, 
                type: 'company', 
                name: row.empresa_nome,
                error: error instanceof Error ? error.message : 'Erro ao criar empresa'
              });
              continue;
            }
          }
        }

        // 2. Processar Unidade
        if (row.unidade_nome && row.empresa_nome) {
          const companyId = companyMap.get(row.empresa_nome.toLowerCase());
          if (companyId) {
            const unitKey = `${companyId}-${row.unidade_nome.toLowerCase()}`;
            
            if (!unitMap.has(unitKey)) {
              try {
                const unit = await locationsService.createUnit({
                  name: row.unidade_nome,
                  companyId: companyId,
                  cnpj: row.unidade_cnpj || '',
                  address: {
                    fullAddress: row.unidade_endereco || '',
                    city: row.unidade_cidade || '',
                    state: row.unidade_estado || '',
                    zip: row.unidade_cep || ''
                  },
                  totalArea: row.unidade_area_total ? Number(row.unidade_area_total) : undefined,
                  occupants: row.unidade_ocupantes ? Number(row.unidade_ocupantes) : undefined,
                  hvacUnits: row.unidade_hvac ? Number(row.unidade_hvac) : undefined
                });
                unitMap.set(unitKey, unit.id);
                results.push({ success: true, type: 'unit', name: row.unidade_nome });
              } catch (error) {
                results.push({ 
                  success: false, 
                  type: 'unit', 
                  name: row.unidade_nome,
                  error: error instanceof Error ? error.message : 'Erro ao criar unidade'
                });
              }
            }
          }
        }

        // 3. Processar Setor
        if (row.setor_nome && row.unidade_nome && row.empresa_nome) {
          const companyId = companyMap.get(row.empresa_nome.toLowerCase());
          const unitKey = companyId ? `${companyId}-${row.unidade_nome.toLowerCase()}` : null;
          const unitId = unitKey ? unitMap.get(unitKey) : null;
          
          if (unitId) {
            const sectorKey = `${unitId}-${row.setor_nome.toLowerCase()}`;
            
            if (!sectorMap.has(sectorKey)) {
              try {
                const sector = await locationsService.createSector({
                  name: row.setor_nome,
                  unitId: unitId,
                  responsible: row.setor_responsavel || '',
                  phone: row.setor_telefone || '',
                  email: row.setor_email || '',
                  area: row.setor_area ? Number(row.setor_area) : 0,
                  occupants: row.setor_ocupantes ? Number(row.setor_ocupantes) : 0,
                  hvacUnits: row.setor_hvac ? Number(row.setor_hvac) : 0
                });
                sectorMap.set(sectorKey, sector.id);
                results.push({ success: true, type: 'sector', name: row.setor_nome });
              } catch (error) {
                results.push({ 
                  success: false, 
                  type: 'sector', 
                  name: row.setor_nome,
                  error: error instanceof Error ? error.message : 'Erro ao criar setor'
                });
              }
            }
          }
        }

        // 4. Processar Subsetor
        if (row.subsetor_nome && row.setor_nome && row.unidade_nome && row.empresa_nome) {
          const companyId = companyMap.get(row.empresa_nome.toLowerCase());
          const unitKey = companyId ? `${companyId}-${row.unidade_nome.toLowerCase()}` : null;
          const unitId = unitKey ? unitMap.get(unitKey) : null;
          const sectorKey = unitId ? `${unitId}-${row.setor_nome.toLowerCase()}` : null;
          const sectorId = sectorKey ? sectorMap.get(sectorKey) : null;
          
          if (sectorId) {
            try {
              await locationsService.createSubsection({
                name: row.subsetor_nome,
                sectorId: sectorId,
                notes: row.subsetor_observacoes || ''
              });
              results.push({ success: true, type: 'subsection', name: row.subsetor_nome });
            } catch (error) {
              results.push({ 
                success: false, 
                type: 'subsection', 
                name: row.subsetor_nome,
                error: error instanceof Error ? error.message : 'Erro ao criar subsetor'
              });
            }
          }
        }
      }

      setImportResults(results);
      setShowResults(true);

      const successCount = results.filter(r => r.success).length;
      const errorCount = results.filter(r => !r.success).length;

      if (errorCount === 0) {
        toast.success(`Importação concluída! ${successCount} itens criados.`);
      } else {
        toast.warning(`Importação concluída com ${successCount} sucessos e ${errorCount} erros.`);
      }

    } catch (error) {
      console.error('Erro na importação:', error);
      toast.error('Erro ao processar o arquivo CSV');
    } finally {
      setIsUploading(false);
      setSelectedFile(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.csv')) {
        toast.error('Por favor, selecione um arquivo CSV');
        return;
      }
      setSelectedFile(file);
      setShowResults(false);
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'company': return 'Empresa';
      case 'unit': return 'Unidade';
      case 'sector': return 'Setor';
      case 'subsection': return 'Subsetor';
      default: return type;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'company': return 'bg-blue-100 text-blue-700';
      case 'unit': return 'bg-orange-100 text-orange-700';
      case 'sector': return 'bg-emerald-100 text-emerald-700';
      case 'subsection': return 'bg-purple-100 text-purple-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-8">
      {/* Header da seção */}
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <FileUp className="h-5 w-5 text-primary" />
          Importação de Localizações
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Importe empresas, unidades, setores e subsetores em lote através de um arquivo CSV.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card de Download do Modelo */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-500/10">
                <Download className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-base">1. Baixar Modelo</CardTitle>
                <CardDescription>
                  Baixe o modelo CSV com os campos necessários
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground space-y-2">
              <p>O arquivo modelo contém as seguintes colunas:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li><strong>Empresa:</strong> nome, cnpj, endereço, cidade, estado, cep, área, ocupantes, hvac</li>
                <li><strong>Unidade:</strong> nome, cnpj, endereço, cidade, estado, cep, área, ocupantes, hvac</li>
                <li><strong>Setor:</strong> nome, responsável, telefone, email, área, ocupantes, hvac</li>
                <li><strong>Subsetor:</strong> nome, observações</li>
              </ul>
            </div>
            <Button onClick={handleDownloadTemplate} className="w-full gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              Baixar Modelo CSV
            </Button>
          </CardContent>
        </Card>

        {/* Card de Upload */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-500/10">
                <Upload className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <CardTitle className="text-base">2. Enviar Arquivo</CardTitle>
                <CardDescription>
                  Faça upload do arquivo CSV preenchido
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
                id="csv-upload"
                disabled={isUploading}
              />
              <label htmlFor="csv-upload" className="cursor-pointer">
                <FileSpreadsheet className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                {selectedFile ? (
                  <div>
                    <p className="font-medium text-foreground">{selectedFile.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(selectedFile.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="font-medium">Clique para selecionar</p>
                    <p className="text-sm text-muted-foreground">ou arraste o arquivo CSV</p>
                  </div>
                )}
              </label>
            </div>
            <Button 
              onClick={handleImport} 
              className="w-full gap-2"
              disabled={!selectedFile || isUploading}
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Importando...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Importar Dados
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Instruções */}
      <Card className="bg-muted/30">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Info className="h-4 w-4" />
            Instruções de Uso
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-foreground mb-2">Como preencher o CSV:</h4>
                <ul className="list-disc list-inside space-y-1">
                  <li>Use ponto e vírgula (;) como separador</li>
                  <li>A primeira linha deve conter os cabeçalhos</li>
                  <li>O campo <code className="bg-muted px-1 rounded">empresa_nome</code> é obrigatório</li>
                  <li>Deixe campos vazios se não precisar preencher</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-foreground mb-2">Hierarquia:</h4>
                <ul className="list-disc list-inside space-y-1">
                  <li><strong>Empresa</strong> → nível mais alto</li>
                  <li><strong>Unidade</strong> → pertence a uma Empresa</li>
                  <li><strong>Setor</strong> → pertence a uma Unidade</li>
                  <li><strong>Subsetor</strong> → pertence a um Setor</li>
                </ul>
              </div>
            </div>
            
            {/* Exemplo visual da hierarquia */}
            <div className="mt-4 p-4 bg-background rounded-lg border">
              <h4 className="font-medium text-foreground mb-3">⚠️ Como funciona a identificação da hierarquia:</h4>
              <p className="mb-3">
                O sistema identifica a qual nível cada item pertence através do <strong>nome repetido</strong> nas colunas.
                Cada linha do CSV pode criar até 4 itens (empresa, unidade, setor, subsetor).
              </p>
              <div className="font-mono text-xs bg-muted p-3 rounded overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-1 text-blue-600">empresa_nome</th>
                      <th className="text-left p-1 text-orange-600">unidade_nome</th>
                      <th className="text-left p-1 text-emerald-600">setor_nome</th>
                      <th className="text-left p-1 text-purple-600">subsetor_nome</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="p-1 text-blue-600">Empresa A</td>
                      <td className="p-1 text-orange-600">Filial 1</td>
                      <td className="p-1 text-emerald-600">Produção</td>
                      <td className="p-1 text-purple-600">Linha 1</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-1 text-blue-600">Empresa A</td>
                      <td className="p-1 text-orange-600">Filial 1</td>
                      <td className="p-1 text-emerald-600">Produção</td>
                      <td className="p-1 text-purple-600">Linha 2</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-1 text-blue-600">Empresa A</td>
                      <td className="p-1 text-orange-600">Filial 1</td>
                      <td className="p-1 text-emerald-600">Administrativo</td>
                      <td className="p-1 text-muted-foreground">(vazio)</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-1 text-blue-600">Empresa A</td>
                      <td className="p-1 text-orange-600">Filial 2</td>
                      <td className="p-1 text-emerald-600">Estoque</td>
                      <td className="p-1 text-muted-foreground">(vazio)</td>
                    </tr>
                    <tr>
                      <td className="p-1 text-blue-600">Empresa B</td>
                      <td className="p-1 text-orange-600">Matriz</td>
                      <td className="p-1 text-emerald-600">Vendas</td>
                      <td className="p-1 text-purple-600">Loja 1</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-xs">
                <strong>Resultado:</strong> 2 empresas, 3 unidades, 4 setores, 3 subsetores.
                O sistema não cria duplicatas - se já existir, apenas vincula ao próximo nível.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resultados da Importação */}
      {showResults && importResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Resultado da Importação
            </CardTitle>
            <CardDescription>
              {importResults.filter(r => r.success).length} itens criados com sucesso, 
              {importResults.filter(r => !r.success).length} erros
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-h-64 overflow-y-auto space-y-2">
              {importResults.map((result, index) => (
                <div 
                  key={index}
                  className={cn(
                    "flex items-center justify-between p-2 rounded-lg text-sm",
                    result.success ? "bg-green-50" : "bg-red-50"
                  )}
                >
                  <div className="flex items-center gap-2">
                    {result.success ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}
                    <Badge variant="outline" className={getTypeColor(result.type)}>
                      {getTypeLabel(result.type)}
                    </Badge>
                    <span className={result.success ? "text-green-700" : "text-red-700"}>
                      {result.name}
                    </span>
                  </div>
                  {result.error && (
                    <span className="text-xs text-red-600">{result.error}</span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
