import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { 
  ClipboardList,
  MapPin,
  Package,
  Calendar,
  User,
  FileText,
  Wrench,
  Clock,
  Camera,
  Timer,
  X,
  Loader2,
  Building2,
  Layers,
  CheckCircle2,
  PlayCircle,
  Circle,
  ChevronRight,
  Image as ImageIcon,
  DollarSign,
  Truck,
  ExternalLink,
  AlertCircle
} from 'lucide-react';
import { useEquipments } from '@/hooks/useEquipmentQuery';
import { useSectors, useCompanies } from '@/hooks/useLocationsQuery';
import { useTechnicians } from '@/hooks/useTeamQuery';
import { useWorkOrder } from '@/hooks/useWorkOrdersQuery';
import { useWorkOrderCosts } from '@/hooks/finance/useWorkOrderCosts';
import { useWorkOrderSettingsStore } from '@/store/useWorkOrderSettingsStore';
import { workOrdersService } from '@/services/workOrdersService';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { WorkOrder } from '@/types';

interface WorkOrderViewModalProps {
  workOrder: WorkOrder | null;
  isOpen: boolean;
  onClose: () => void;
}

// Componente para itens de informação
function InfoItem({ 
  icon: Icon, 
  label, 
  value, 
  className 
}: { 
  icon?: React.ElementType; 
  label: string; 
  value: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1", className)}>
      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
        {Icon && <Icon className="h-3.5 w-3.5" />}
        {label}
      </p>
      <p className="font-medium text-sm">{value || '-'}</p>
    </div>
  );
}

export function WorkOrderViewModal({
  workOrder,
  isOpen,
  onClose
}: WorkOrderViewModalProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [isProcessingCosts, setIsProcessingCosts] = useState(false);
  
  // Buscar dados completos da ordem de serviço (inclui fotos, materiais, etc.)
  const { data: workOrderDetails, isLoading: isLoadingDetails } = useWorkOrder(
    isOpen && workOrder?.id ? workOrder.id : null
  );
  
  // Usar dados completos se disponíveis, senão usar os dados passados como prop
  const queryClient = useQueryClient();
  const currentWorkOrder = workOrderDetails || workOrder;
  
  // Buscar custos da ordem de serviço
  const { 
    summary: costsSummary, 
    transactions: costTransactions,
    isLoading: isLoadingCosts,
    refetch: refetchCosts
  } = useWorkOrderCosts(isOpen && currentWorkOrder?.id ? String(currentWorkOrder.id) : undefined);
  
  const { data: equipment = [] } = useEquipments();
  const { data: sectors = [] } = useSectors();
  const { data: companies = [] } = useCompanies();
  const { data: technicians = [] } = useTechnicians();
  
  // Buscar configurações de status do store (ANTES do early return)
  const { settings } = useWorkOrderSettingsStore();

  // Verificar se a OS está completa mas não tem custos postados
  const isCompleted = currentWorkOrder?.status === 'COMPLETED';
  const hasCosts = costsSummary.total > 0;
  const needsPostCosts = isCompleted && !hasCosts && !isLoadingCosts && !isProcessingCosts;

  // Função para formatar valores monetários
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  if (!currentWorkOrder) {
    return null;
  }

  const selectedEquipment = equipment.find(e => e.id === currentWorkOrder.equipmentId);
  const selectedSector = sectors.find(s => s.id === selectedEquipment?.sectorId);
  const selectedCompany = companies.find(c => c.id === selectedSector?.companyId);
  const assignedTechnician = technicians.find(t => String(t.id) === currentWorkOrder.assignedTo);

  // Mapear ícones para cada status
  const getStatusIcon = (statusId: string) => {
    if (statusId === 'COMPLETED') return CheckCircle2;
    if (statusId === 'IN_PROGRESS') return PlayCircle;
    return Circle;
  };

  // Converter hex para classes Tailwind
  const getColorClasses = (hexColor: string) => {
    const colorMap: Record<string, { text: string; bg: string; border: string }> = {
      '#3b82f6': { text: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
      '#f59e0b': { text: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
      '#22c55e': { text: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
      '#6b7280': { text: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-200' },
      '#ef4444': { text: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
      '#8b5cf6': { text: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-200' },
    };
    return colorMap[hexColor] || { text: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-200' };
  };

  // Construir statusConfig dinamicamente a partir das configurações
  const statusConfig: Record<string, { color: string; bgColor: string; icon: React.ElementType; label: string }> = 
    settings.statuses.reduce((acc, status) => {
      const colors = getColorClasses(status.color);
      acc[status.id] = {
        color: colors.text,
        bgColor: `${colors.bg} ${colors.border}`,
        icon: getStatusIcon(status.id),
        label: status.label
      };
      return acc;
    }, {} as Record<string, { color: string; bgColor: string; icon: React.ElementType; label: string }>);

  const priorityConfig: Record<string, { color: string; bgColor: string; label: string }> = {
    'LOW': { color: 'text-slate-600', bgColor: 'bg-slate-100 border-slate-300', label: 'Baixa' },
    'MEDIUM': { color: 'text-blue-600', bgColor: 'bg-blue-100 border-blue-300', label: 'Média' },
    'HIGH': { color: 'text-orange-600', bgColor: 'bg-orange-100 border-orange-300', label: 'Alta' },
    'CRITICAL': { color: 'text-red-600', bgColor: 'bg-red-100 border-red-300', label: 'Crítica' },
  };

  // Construir typeConfig dinamicamente a partir das configurações
  const typeConfig: Record<string, { color: string; bgColor: string; label: string }> = 
    settings.types.reduce((acc, type) => {
      const colors = getColorClasses(type.color);
      acc[type.id] = {
        color: colors.text,
        bgColor: `${colors.bg} ${colors.border}`,
        label: type.label
      };
      return acc;
    }, {} as Record<string, { color: string; bgColor: string; label: string }>);

  // Buscar status/tipo atual ou usar primeiro disponível como fallback
  const status = statusConfig[currentWorkOrder.status] || Object.values(statusConfig)[0];
  const priority = priorityConfig[currentWorkOrder.priority] || priorityConfig['MEDIUM'];
  const type = typeConfig[currentWorkOrder.type] || Object.values(typeConfig)[0];
  const StatusIcon = status?.icon || Circle;

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatDateTime = (dateString: string | undefined) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const calculateExecutionTime = () => {
    if (!currentWorkOrder.completedAt || !currentWorkOrder.scheduledDate) return null;
    const days = Math.ceil(
      (new Date(currentWorkOrder.completedAt).getTime() - new Date(currentWorkOrder.scheduledDate).getTime()) 
      / (1000 * 60 * 60 * 24)
    );
    if (days === 0) return 'No mesmo dia';
    if (days === 1) return '1 dia';
    if (days < 0) return `${Math.abs(days)} dias antes`;
    return `${days} dias`;
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] p-0 gap-0 overflow-hidden">
          {/* Header com gradiente sutil */}
          <DialogHeader className="px-6 pt-6 pb-4 bg-gradient-to-b from-muted/50 to-transparent">
            <div className="flex items-start justify-between gap-4 pr-10">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <div className={cn(
                    "p-2 rounded-lg border",
                    status.bgColor
                  )}>
                    <StatusIcon className={cn("h-5 w-5", status.color)} />
                  </div>
                  <div>
                    <DialogTitle className="text-lg font-semibold">
                      OS #{currentWorkOrder.number}
                    </DialogTitle>
                    <DialogDescription className="text-sm text-muted-foreground">
                      Criada em {formatDateTime(currentWorkOrder.createdAt)}
                    </DialogDescription>
                  </div>
                </div>
              </div>
              
              {/* Badges de Status, Tipo e Prioridade */}
              <div className="flex flex-wrap items-center gap-1.5 flex-shrink-0">
                <Badge variant="outline" className={cn("font-medium", status.bgColor, status.color)}>
                  {status.label}
                </Badge>
                <Badge variant="outline" className={cn("font-medium", type.bgColor, type.color)}>
                  {type.label}
                </Badge>
                <Badge variant="outline" className={cn("font-medium", priority.bgColor, priority.color)}>
                  {priority.label}
                </Badge>
              </div>
            </div>
          </DialogHeader>

          {isLoadingDetails ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Carregando detalhes...</p>
            </div>
          ) : (
            <ScrollArea className="flex-1 max-h-[calc(90vh-180px)]">
              <div className="px-6 py-4 space-y-4">
                
                {/* Card: Localização e Equipamento */}
                <Card className="border-muted">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-4">
                      <MapPin className="h-4 w-4 text-primary" />
                      <h3 className="font-medium text-sm">Localização e Equipamento</h3>
                    </div>
                    
                    {/* Breadcrumb de localização */}
                    <div className="flex items-center gap-1.5 text-sm mb-4 flex-wrap">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Building2 className="h-3.5 w-3.5" />
                        <span>{selectedCompany?.name || '-'}</span>
                      </div>
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Layers className="h-3.5 w-3.5" />
                        <span>{selectedSector?.name || '-'}</span>
                      </div>
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
                      <div className="flex items-center gap-1.5 font-medium text-foreground">
                        <Wrench className="h-3.5 w-3.5 text-primary" />
                        <span>{selectedEquipment?.tag || '-'}</span>
                      </div>
                    </div>

                    {selectedEquipment && (
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <p className="font-medium text-sm">{selectedEquipment.tag}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {selectedEquipment.model} {selectedEquipment.manufacturer && `• ${selectedEquipment.manufacturer}`}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Card: Informações Gerais */}
                <Card className="border-muted">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-4">
                      <ClipboardList className="h-4 w-4 text-primary" />
                      <h3 className="font-medium text-sm">Informações Gerais</h3>
                    </div>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      <InfoItem 
                        icon={Calendar} 
                        label="Data Agendada" 
                        value={formatDate(currentWorkOrder.scheduledDate)} 
                      />
                      <InfoItem 
                        icon={User} 
                        label="Técnico Responsável" 
                        value={assignedTechnician?.user.full_name || currentWorkOrder.assignedToName} 
                      />
                      <InfoItem 
                        icon={Clock} 
                        label="Criada em" 
                        value={formatDateTime(currentWorkOrder.createdAt)} 
                      />
                    </div>

                    {/* Descrição */}
                    {currentWorkOrder.description && (
                      <div className="mt-4 pt-4 border-t">
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5 mb-2">
                          <FileText className="h-3.5 w-3.5" />
                          Descrição
                        </p>
                        <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                          {currentWorkOrder.description}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Card: Execução (se houver dados) */}
                {(currentWorkOrder.startedAt || currentWorkOrder.completedAt || currentWorkOrder.executionDescription) && (
                  <Card className="border-muted">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-4">
                        <Timer className="h-4 w-4 text-primary" />
                        <h3 className="font-medium text-sm">Execução</h3>
                      </div>
                      
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        {currentWorkOrder.startedAt && (
                          <InfoItem 
                            icon={PlayCircle}
                            label="Iniciada em" 
                            value={formatDateTime(currentWorkOrder.startedAt)} 
                          />
                        )}
                        {currentWorkOrder.completedAt && (
                          <InfoItem 
                            icon={CheckCircle2}
                            label="Concluída em" 
                            value={formatDateTime(currentWorkOrder.completedAt)} 
                          />
                        )}
                        {calculateExecutionTime() && (
                          <InfoItem 
                            icon={Timer}
                            label="Tempo Total" 
                            value={calculateExecutionTime()} 
                          />
                        )}
                      </div>

                      {/* Descrição da Execução */}
                      {currentWorkOrder.executionDescription && (
                        <div className="mt-4 pt-4 border-t">
                          <p className="text-xs text-muted-foreground flex items-center gap-1.5 mb-2">
                            <FileText className="h-3.5 w-3.5" />
                            Descrição da Execução
                          </p>
                          <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                            {currentWorkOrder.executionDescription}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Card: Materiais Utilizados */}
                {currentWorkOrder.stockItems && currentWorkOrder.stockItems.length > 0 && (
                  <Card className="border-muted">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-primary" />
                          <h3 className="font-medium text-sm">Materiais Utilizados</h3>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {currentWorkOrder.stockItems.length} {currentWorkOrder.stockItems.length === 1 ? 'item' : 'itens'}
                        </Badge>
                      </div>
                      
                      <div className="space-y-2">
                        {currentWorkOrder.stockItems.map((item) => (
                          <div 
                            key={item.id} 
                            className="flex items-center justify-between p-2.5 bg-muted/50 rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              <div className="p-1.5 bg-background rounded border">
                                <Package className="h-3.5 w-3.5 text-muted-foreground" />
                              </div>
                              <span className="text-sm font-medium">
                                {item.itemName || item.stockItem?.description || `Item ${item.stockItemId}`}
                              </span>
                            </div>
                            <div className="text-sm">
                              <span className="font-semibold">{item.quantity}</span>
                              <span className="text-muted-foreground ml-1">
                                {item.unit || item.stockItem?.unit || 'un'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Card: Fotos da Execução */}
                {currentWorkOrder.photos && currentWorkOrder.photos.length > 0 && (
                  <Card className="border-muted">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <Camera className="h-4 w-4 text-primary" />
                          <h3 className="font-medium text-sm">Fotos da Execução</h3>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {currentWorkOrder.photos.length} {currentWorkOrder.photos.length === 1 ? 'foto' : 'fotos'}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {currentWorkOrder.photos.map((photo) => (
                          <button
                            key={photo.id}
                            type="button"
                            className="group relative aspect-square rounded-lg overflow-hidden border-2 border-transparent hover:border-primary/50 bg-muted transition-all focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                            onClick={() => setSelectedPhoto(photo.url)}
                          >
                            <img
                              src={photo.url}
                              alt={photo.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                              <ImageIcon className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </button>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Card: Custos */}
                <Card className="border-muted">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-primary" />
                        <h3 className="font-medium text-sm">Custos</h3>
                      </div>
                      <Link 
                        to={`/finance/ledger?work_order_id=${currentWorkOrder.id}`}
                        className="text-xs text-primary hover:underline flex items-center gap-1"
                      >
                        Ver no Ledger
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </div>
                    
                    {isLoadingCosts ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      </div>
                    ) : needsPostCosts ? (
                      <div className="space-y-4">
                        {/* Aviso de custos não processados */}
                        <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
                          <div className="flex gap-3">
                            <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                              <h4 className="font-medium text-sm text-amber-900 dark:text-amber-100 mb-1">
                                Custos ainda não processados
                              </h4>
                              <p className="text-xs text-amber-700 dark:text-amber-300 mb-3">
                                Esta OS foi concluída mas os custos ainda não foram lançados no Finance. 
                                O processamento inclui:
                              </p>
                              <ul className="text-xs text-amber-700 dark:text-amber-300 space-y-1 mb-3 ml-4">
                                <li className="flex items-center gap-2">
                                  <Clock className="h-3 w-3" />
                                  <span><strong>Mão de Obra:</strong> Calculada com base nas horas trabalhadas e taxa por cargo</span>
                                </li>
                                <li className="flex items-center gap-2">
                                  <Package className="h-3 w-3" />
                                  <span><strong>Peças:</strong> Materiais utilizados do estoque</span>
                                </li>
                                <li className="flex items-center gap-2">
                                  <Truck className="h-3 w-3" />
                                  <span><strong>Terceiros:</strong> Custos externos registrados</span>
                                </li>
                              </ul>
                              <p className="text-xs text-amber-700 dark:text-amber-300 italic">
                                <strong>Importante:</strong> Para o cálculo de mão de obra, certifique-se de que os técnicos 
                                têm <strong>Cargo</strong> configurado e que há <strong>Taxas de Mão de Obra</strong> cadastradas 
                                no módulo Finance.
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Botões de ação */}
                        <div className="flex flex-col gap-3">
                          {/* Botão de concluir OS (só se não estiver concluída) */}
                          {!isCompleted && (
                            <div className="flex justify-center">
                              <Button
                                variant="default"
                                size="lg"
                                className="gap-2 bg-green-600 hover:bg-green-700"
                                onClick={async () => {
                                  try {
                                    await workOrdersService.complete(String(currentWorkOrder.id), {
                                      checklist_responses: []
                                    });
                                    toast.success('OS concluída com sucesso! Custos processados automaticamente.');
                                    onClose();
                                  } catch (error: any) {
                                    toast.error(error.message || 'Erro ao concluir OS');
                                  }
                                }}
                              >
                                <CheckCircle className="h-5 w-5" />
                                Concluir Ordem de Serviço
                              </Button>
                            </div>
                          )}
                          
                          {/* Botão para processar custos manualmente (se já concluída mas sem custos) */}
                          {isCompleted && (
                            <div className="flex justify-center">
                              <Button
                                variant="default"
                                size="sm"
                                className="gap-2"
                                disabled={isProcessingCosts}
                                onClick={async () => {
                                  setIsProcessingCosts(true);
                                  try {
                                    const result = await workOrdersService.postCosts(String(currentWorkOrder.id));
                                    toast.success(`Custos processados! ${result.transactions_created} transação(ões) criada(s)`);
                                    
                                    // Invalidar cache e refetch
                                    await queryClient.invalidateQueries({ queryKey: ['finance', 'ledger'] });
                                    await refetchCosts();
                                  } catch (error: any) {
                                    toast.error(error.message || 'Erro ao processar custos');
                                  } finally {
                                    // Aguardar um pouco antes de remover o loading para garantir que a UI atualize
                                    setTimeout(() => setIsProcessingCosts(false), 500);
                                  }
                                }}
                              >
                                {isProcessingCosts ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <DollarSign className="h-4 w-4" />
                                )}
                                {isProcessingCosts ? 'Processando...' : 'Processar Custos Agora'}
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* Breakdown por tipo */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                          {/* Mão de Obra */}
                          <div className="p-3 bg-muted/50 border border-muted rounded-lg">
                            <div className="flex items-center gap-1.5 text-muted-foreground mb-2">
                              <Clock className="h-3.5 w-3.5" />
                              <span className="text-xs font-medium">Mão de Obra</span>
                            </div>
                            <p className="font-semibold text-sm text-foreground">
                              {formatCurrency(costsSummary.labor)}
                            </p>
                          </div>
                          
                          {/* Peças */}
                          <div className="p-3 bg-muted/50 border border-muted rounded-lg">
                            <div className="flex items-center gap-1.5 text-muted-foreground mb-2">
                              <Package className="h-3.5 w-3.5" />
                              <span className="text-xs font-medium">Peças</span>
                            </div>
                            <p className="font-semibold text-sm text-foreground">
                              {formatCurrency(costsSummary.parts)}
                            </p>
                          </div>
                          
                          {/* Terceiros */}
                          <div className="p-3 bg-muted/50 border border-muted rounded-lg">
                            <div className="flex items-center gap-1.5 text-muted-foreground mb-2">
                              <Truck className="h-3.5 w-3.5" />
                              <span className="text-xs font-medium">Terceiros</span>
                            </div>
                            <p className="font-semibold text-sm text-foreground">
                              {formatCurrency(costsSummary.third_party)}
                            </p>
                          </div>

                          {/* Ajustes */}
                          <div className="p-3 bg-muted/50 border border-muted rounded-lg">
                            <div className="flex items-center gap-1.5 text-muted-foreground mb-2">
                              <AlertCircle className="h-3.5 w-3.5" />
                              <span className="text-xs font-medium">Ajustes</span>
                            </div>
                            <p className="font-semibold text-sm text-foreground">
                              {formatCurrency(costsSummary.adjustment)}
                            </p>
                          </div>
                        </div>

                        {/* Total */}
                        <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg flex items-center justify-between">
                          <span className="text-sm font-medium">Total Geral</span>
                          <span className="text-lg font-bold text-primary">
                            {formatCurrency(costsSummary.total)}
                          </span>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>
          )}

          {/* Footer */}
          <div className="px-6 py-4 border-t bg-muted/30 flex justify-end">
            <Button variant="outline" onClick={onClose}>
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Foto Ampliada */}
      {selectedPhoto && (
        <div 
          className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setSelectedPhoto(null)}
        >
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 text-white/80 hover:text-white hover:bg-white/10 h-10 w-10"
            onClick={() => setSelectedPhoto(null)}
          >
            <X className="h-6 w-6" />
          </Button>
          <img
            src={selectedPhoto}
            alt="Foto ampliada"
            className="max-w-[90vw] max-h-[90vh] rounded-lg object-contain shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
