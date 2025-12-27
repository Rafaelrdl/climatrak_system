import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ClipboardList,
  MapPin,
  Package,
  Calendar,
  User,
  FileText,
  AlertCircle,
  Wrench,
  Clock
} from 'lucide-react';
import { useEquipments } from '@/hooks/useEquipmentQuery';
import { useSectors, useCompanies } from '@/hooks/useLocationsQuery';
import { useTechnicians } from '@/hooks/useTeamQuery';
import { cn } from '@/lib/utils';
import type { WorkOrder } from '@/types';

interface WorkOrderViewModalProps {
  workOrder: WorkOrder | null;
  isOpen: boolean;
  onClose: () => void;
}

export function WorkOrderViewModal({
  workOrder,
  isOpen,
  onClose
}: WorkOrderViewModalProps) {
  const { data: equipment = [] } = useEquipments();
  const { data: sectors = [] } = useSectors();
  const { data: companies = [] } = useCompanies();
  const { data: technicians = [] } = useTechnicians();

  if (!workOrder) {
    return null;
  }

  const selectedEquipment = equipment.find(e => e.id === workOrder.equipmentId);
  const selectedSector = sectors.find(s => s.id === selectedEquipment?.sectorId);
  const selectedCompany = companies.find(c => c.id === selectedSector?.companyId);
  const assignedTechnician = technicians.find(t => String(t.id) === workOrder.assignedTo);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN': return 'bg-blue-500/10 text-blue-700 border-blue-500/20';
      case 'IN_PROGRESS': return 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20';
      case 'COMPLETED': return 'bg-green-500/10 text-green-700 border-green-500/20';
      default: return 'bg-gray-500/10 text-gray-700 border-gray-500/20';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'OPEN': return 'Aberta';
      case 'IN_PROGRESS': return 'Em Execução';
      case 'COMPLETED': return 'Concluída';
      default: return status;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'LOW': return 'bg-slate-500/10 text-slate-700 border-slate-500/20';
      case 'MEDIUM': return 'bg-blue-500/10 text-blue-700 border-blue-500/20';
      case 'HIGH': return 'bg-orange-500/10 text-orange-700 border-orange-500/20';
      case 'CRITICAL': return 'bg-red-500/10 text-red-700 border-red-500/20';
      default: return 'bg-gray-500/10 text-gray-700 border-gray-500/20';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'LOW': return 'Baixa';
      case 'MEDIUM': return 'Média';
      case 'HIGH': return 'Alta';
      case 'CRITICAL': return 'Crítica';
      default: return priority;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'PREVENTIVE': return 'Preventiva';
      case 'CORRECTIVE': return 'Corretiva';
      case 'REQUEST': return 'Solicitação';
      default: return type;
    }
  };

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
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-primary" />
                Ordem de Serviço #{workOrder.number}
              </DialogTitle>
              <DialogDescription>
                Visualização detalhada da ordem de serviço
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={cn(getStatusColor(workOrder.status))}>
                {getStatusLabel(workOrder.status)}
              </Badge>
              <Badge variant="outline" className={cn(getPriorityColor(workOrder.priority))}>
                {getPriorityLabel(workOrder.priority)}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6 py-4">
            {/* Informações Principais */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-muted-foreground flex items-center gap-2">
                  <Wrench className="h-4 w-4" />
                  Tipo
                </Label>
                <p className="font-medium">{getTypeLabel(workOrder.type)}</p>
              </div>

              <div className="space-y-1">
                <Label className="text-muted-foreground flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Prioridade
                </Label>
                <p className="font-medium">{getPriorityLabel(workOrder.priority)}</p>
              </div>

              <div className="space-y-1">
                <Label className="text-muted-foreground flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Data Agendada
                </Label>
                <p className="font-medium">{formatDate(workOrder.scheduledDate)}</p>
              </div>

              <div className="space-y-1">
                <Label className="text-muted-foreground flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Técnico Responsável
                </Label>
                <p className="font-medium">{assignedTechnician?.user.full_name || workOrder.assignedToName || '-'}</p>
              </div>
            </div>

            <Separator />

            {/* Localização e Equipamento */}
            <div className="space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Localização
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pl-6">
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs">Empresa</Label>
                  <p className="font-medium text-sm">{selectedCompany?.name || '-'}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs">Setor</Label>
                  <p className="font-medium text-sm">{selectedSector?.name || '-'}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs">Equipamento</Label>
                  <p className="font-medium text-sm">
                    {selectedEquipment ? `${selectedEquipment.tag} - ${selectedEquipment.model}` : '-'}
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Descrição */}
            <div className="space-y-2">
              <Label className="text-muted-foreground flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Descrição
              </Label>
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm whitespace-pre-wrap">{workOrder.description || 'Sem descrição'}</p>
              </div>
            </div>

            {/* Datas de Execução */}
            {(workOrder.startedAt || workOrder.completedAt) && (
              <>
                <Separator />
                <div className="space-y-4">
                  <h4 className="font-medium flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Execução
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-6">
                    {workOrder.startedAt && (
                      <div className="space-y-1">
                        <Label className="text-muted-foreground text-xs">Iniciada em</Label>
                        <p className="font-medium text-sm">{formatDateTime(workOrder.startedAt)}</p>
                      </div>
                    )}
                    {workOrder.completedAt && (
                      <div className="space-y-1">
                        <Label className="text-muted-foreground text-xs">Concluída em</Label>
                        <p className="font-medium text-sm">{formatDateTime(workOrder.completedAt)}</p>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Observações de Conclusão */}
            {workOrder.executionDescription && (
              <>
                <Separator />
                <div className="space-y-2">
                  <Label className="text-muted-foreground flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Observações de Conclusão
                  </Label>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm whitespace-pre-wrap">{workOrder.executionDescription}</p>
                  </div>
                </div>
              </>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="border-t pt-4">
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
