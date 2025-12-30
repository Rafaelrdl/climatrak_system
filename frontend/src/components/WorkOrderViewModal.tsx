import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
  Image as ImageIcon
} from 'lucide-react';
import { useEquipments } from '@/hooks/useEquipmentQuery';
import { useSectors, useCompanies } from '@/hooks/useLocationsQuery';
import { useTechnicians } from '@/hooks/useTeamQuery';
import { useWorkOrder } from '@/hooks/useWorkOrdersQuery';
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
  
  // Buscar dados completos da ordem de serviço (inclui fotos, materiais, etc.)
  const { data: workOrderDetails, isLoading: isLoadingDetails } = useWorkOrder(
    isOpen && workOrder?.id ? workOrder.id : null
  );
  
  // Usar dados completos se disponíveis, senão usar os dados passados como prop
  const currentWorkOrder = workOrderDetails || workOrder;
  
  const { data: equipment = [] } = useEquipments();
  const { data: sectors = [] } = useSectors();
  const { data: companies = [] } = useCompanies();
  const { data: technicians = [] } = useTechnicians();

  if (!currentWorkOrder) {
    return null;
  }

  const selectedEquipment = equipment.find(e => e.id === currentWorkOrder.equipmentId);
  const selectedSector = sectors.find(s => s.id === selectedEquipment?.sectorId);
  const selectedCompany = companies.find(c => c.id === selectedSector?.companyId);
  const assignedTechnician = technicians.find(t => String(t.id) === currentWorkOrder.assignedTo);

  const statusConfig: Record<string, { color: string; bgColor: string; icon: React.ElementType; label: string }> = {
    'OPEN': { 
      color: 'text-blue-600', 
      bgColor: 'bg-blue-50 border-blue-200', 
      icon: Circle, 
      label: 'Aberta' 
    },
    'IN_PROGRESS': { 
      color: 'text-amber-600', 
      bgColor: 'bg-amber-50 border-amber-200', 
      icon: PlayCircle, 
      label: 'Em Execução' 
    },
    'COMPLETED': { 
      color: 'text-emerald-600', 
      bgColor: 'bg-emerald-50 border-emerald-200', 
      icon: CheckCircle2, 
      label: 'Concluída' 
    },
  };

  const priorityConfig: Record<string, { color: string; bgColor: string; label: string }> = {
    'LOW': { color: 'text-slate-600', bgColor: 'bg-slate-100 border-slate-300', label: 'Baixa' },
    'MEDIUM': { color: 'text-blue-600', bgColor: 'bg-blue-100 border-blue-300', label: 'Média' },
    'HIGH': { color: 'text-orange-600', bgColor: 'bg-orange-100 border-orange-300', label: 'Alta' },
    'CRITICAL': { color: 'text-red-600', bgColor: 'bg-red-100 border-red-300', label: 'Crítica' },
  };

  const typeConfig: Record<string, { color: string; bgColor: string; label: string }> = {
    'PREVENTIVE': { color: 'text-violet-600', bgColor: 'bg-violet-50 border-violet-200', label: 'Preventiva' },
    'CORRECTIVE': { color: 'text-rose-600', bgColor: 'bg-rose-50 border-rose-200', label: 'Corretiva' },
    'REQUEST': { color: 'text-cyan-600', bgColor: 'bg-cyan-50 border-cyan-200', label: 'Solicitação' },
  };

  const status = statusConfig[currentWorkOrder.status] || statusConfig['OPEN'];
  const priority = priorityConfig[currentWorkOrder.priority] || priorityConfig['MEDIUM'];
  const type = typeConfig[currentWorkOrder.type] || typeConfig['CORRECTIVE'];
  const StatusIcon = status.icon;

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
                    <p className="text-sm text-muted-foreground">
                      Criada em {formatDateTime(currentWorkOrder.createdAt)}
                    </p>
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
