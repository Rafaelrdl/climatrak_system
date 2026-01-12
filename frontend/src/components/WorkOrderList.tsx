import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ConfirmDialog, StatusBadge } from '@/shared/ui';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Edit, ClipboardList, AlertTriangle, User, FileText, UserPlus, Eye, Trash2, Loader2 } from 'lucide-react';
import { useEquipments } from '@/hooks/useEquipmentQuery';
import { useSectors, useCompanies, useUnits, useSubsections } from '@/hooks/useLocationsQuery';
import { useTechnicians } from '@/hooks/useTeamQuery';
import { useWorkOrderStore } from '@/store/useWorkOrderStore';
import { useWorkOrderSettingsStore } from '@/store/useWorkOrderSettingsStore';
import { useSLAStore, calculateSLAStatus } from '@/store/useSLAStore';
import { useUsers } from '@/data/usersStore';
import { SLABadge } from '@/components/SLABadge';
import { printWorkOrder } from '@/utils/printWorkOrder';
import { workOrdersService } from '@/services/workOrdersService';
import { toast } from 'sonner';
import type { WorkOrder } from '@/types';
import { cn } from '@/lib/utils';
import { getPriorityDotClass, getPriorityLabel } from '@/shared/ui/statusBadgeUtils';

/**
 * Parseia data YYYY-MM-DD como data local (não UTC)
 * Evita problema de timezone onde "2026-01-01" vira "2025-12-31"
 */
const parseLocalDate = (dateString: string): Date => {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
};

interface WorkOrderListProps {
  workOrders: WorkOrder[];
  onStartWorkOrder?: (id: string, technicianId?: string) => void;
  onEditWorkOrder?: (wo: WorkOrder) => void;
  onViewWorkOrder?: (wo: WorkOrder) => void;
  onDeleteWorkOrder?: (id: string) => void;
  compact?: boolean;
}

export function WorkOrderList({ 
  workOrders, 
  onStartWorkOrder, 
  onEditWorkOrder,
  onViewWorkOrder,
  onDeleteWorkOrder,
  compact = false
}: WorkOrderListProps) {
  const { data: equipment = [] } = useEquipments();
  const { data: sectors = [] } = useSectors();
  const { data: companies = [] } = useCompanies();
  const { data: units = [] } = useUnits();
  const { data: subsections = [] } = useSubsections();
  const { data: technicians = [] } = useTechnicians();
  const { selectedWorkOrderId, setSelectedWorkOrder } = useWorkOrderStore();
  const { settings: workOrderSettings } = useWorkOrderSettingsStore();
  const { settings: slaSettings } = useSLAStore();
  const { getCurrentUser } = useUsers();
  
  // Estado para modal de seleção de técnico
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [pendingWorkOrder, setPendingWorkOrder] = useState<WorkOrder | null>(null);
  const [selectedTechnicianId, setSelectedTechnicianId] = useState<string>('none');
  
  // Estado para modal de confirmação de exclusão
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [workOrderToDelete, setWorkOrderToDelete] = useState<WorkOrder | null>(null);
  
  // Estado para loading de impressão
  const [printingOrderId, setPrintingOrderId] = useState<string | null>(null);

  const currentUser = getCurrentUser();
  
  const handlePrintWorkOrder = async (workOrder: WorkOrder) => {
    try {
      setPrintingOrderId(workOrder.id);
      
      // Buscar dados completos da OS (inclui stockItems, photos, executionDescription)
      const fullWorkOrder = await workOrdersService.getById(String(workOrder.id));
      
      printWorkOrder({
        workOrder: fullWorkOrder,
        equipment,
        sectors,
        companies,
        settings: workOrderSettings
      });
    } catch (error) {
      console.error('Erro ao imprimir OS:', error);
      toast.error('Erro ao carregar dados para impressão');
    } finally {
      setPrintingOrderId(null);
    }
  };

  // Handler para abrir modal de seleção de técnico
  const handleStartWorkOrderClick = (workOrder: WorkOrder) => {
    setPendingWorkOrder(workOrder);
    setSelectedTechnicianId('none');
    setIsAssignModalOpen(true);
  };

  // Handler para atribuir a si mesmo
  const handleAssignToMe = () => {
    if (currentUser) {
      setSelectedTechnicianId(String(currentUser.id));
    }
  };

  // Handler para confirmar início da OS com técnico
  const confirmStartWorkOrder = () => {
    if (pendingWorkOrder && onStartWorkOrder) {
      const techId = selectedTechnicianId !== 'none' ? selectedTechnicianId : undefined;
      onStartWorkOrder(pendingWorkOrder.id, techId);
    }
    setIsAssignModalOpen(false);
    setPendingWorkOrder(null);
  };

  // Handler para abrir modal de confirmação de exclusão
  const handleDeleteClick = (workOrder: WorkOrder) => {
    setWorkOrderToDelete(workOrder);
    setDeleteDialogOpen(true);
  };

  // Handler para confirmar exclusão
  const confirmDelete = () => {
    if (workOrderToDelete && onDeleteWorkOrder) {
      onDeleteWorkOrder(workOrderToDelete.id);
    }
    setDeleteDialogOpen(false);
    setWorkOrderToDelete(null);
  };

  const handleWorkOrderClick = (workOrder: WorkOrder) => {
    // Use apenas a store global para evitar dupla atualização
    setSelectedWorkOrder(workOrder);
    // onSelectWorkOrder já seria chamado pelo handleSelectWorkOrder do panel,
    // causando dupla atualização e loop infinito
  };

  const handleKeyDown = (event: React.KeyboardEvent, workOrder: WorkOrder) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleWorkOrderClick(workOrder);
    }
  };

  // Compact mode - Gmail-style list view for panel
  if (compact) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    return (
      <div className="h-full flex flex-col bg-background">
        <div className="flex-shrink-0 bg-background/95 backdrop-blur-sm border-b px-4 py-3">
          <h3 className="font-medium text-sm text-muted-foreground">
            Ordens de Serviço ({workOrders.length})
          </h3>
        </div>
        <div className="flex-1 overflow-y-auto">
          <div className="divide-y divide-border/60" role="listbox" aria-label="Ordens de serviço">
            {workOrders.map((wo) => {
            const eq = equipment.find(e => e.id === wo.equipmentId);

            const isSelected = selectedWorkOrderId === wo.id;
            const scheduledDateObj = wo.scheduledDate
              ? (wo.scheduledDate.includes('T') ? new Date(wo.scheduledDate) : parseLocalDate(wo.scheduledDate))
              : null;
            const hasTime = !!wo.scheduledDate?.includes('T');
            const isOverdue = scheduledDateObj
              && !['COMPLETED', 'CANCELLED'].includes(wo.status)
              && (hasTime ? scheduledDateObj < now : scheduledDateObj < today);
            const isToday = scheduledDateObj && scheduledDateObj.toDateString() === today.toDateString();
            
            // Format date Gmail style (show time if today, date if not)
            const formatDate = (dateString: string) => {
              // Se contém hora (datetime), usar new Date diretamente
              const date = dateString.includes('T') ? new Date(dateString) : parseLocalDate(dateString);
              if (isToday) {
                return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
              } else {
                return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
              }
            };

            const priorityDotClass = getPriorityDotClass(
              wo.priority,
              isSelected ? 'selected' : 'default'
            );
            const priorityLabel = getPriorityLabel(wo.priority);
            const selectedBadgeStyle = isSelected
              ? {
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  borderColor: 'rgba(255, 255, 255, 0.3)',
                  color: '#ffffff',
                }
              : undefined;
            
            return (
              <div
                key={wo.id}
                role="option"
                tabIndex={0}
                aria-selected={isSelected}
                className={cn(
                  "px-4 py-4 cursor-pointer transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#006b76]/20 focus:ring-inset relative",
                  isSelected 
                    ? "bg-[#006b76] text-white border-l-4 border-l-white shadow-sm" 
                    : "hover:bg-[#006b76]/10 border-l-4 border-l-transparent",
                  isOverdue && !isSelected && "border-l-red-500/70 bg-red-50/30"
                )}
                onClick={() => handleWorkOrderClick(wo)}
                onKeyDown={(e) => handleKeyDown(e, wo)}
              >
                <div className="flex gap-3">
                  {/* Priority indicator */}
                  <div 
                    className={cn("mt-1.5 h-2 w-2 rounded-full flex-shrink-0", priorityDotClass)}
                    title={`Prioridade: ${priorityLabel}`}
                  />
                  
                  <div className="flex-1 min-w-0">
                    {/* Header row */}
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={cn(
                          "font-medium text-sm truncate",
                          isSelected ? "text-white" : "text-foreground"
                        )}>
                          {wo.number}
                        </span>
                        {isOverdue && (
                          <AlertTriangle className={cn(
                            "h-3 w-3 flex-shrink-0",
                            isSelected ? "text-red-200" : "text-red-500"
                          )} />
                        )}
                        {wo.status === 'IN_PROGRESS' && (
                          <div className={cn(
                            "h-2 w-2 rounded-full animate-pulse flex-shrink-0",
                            isSelected ? "bg-blue-200" : "bg-blue-500"
                          )} />
                        )}
                      </div>
                      <div className={cn(
                        "text-xs flex-shrink-0",
                        isSelected ? "text-white/90" : "text-muted-foreground"
                      )}>
                        {wo.scheduledDate ? formatDate(wo.scheduledDate) : ''}
                      </div>
                    </div>

                    {/* Equipment line */}
                    <div className={cn(
                      "text-xs truncate mb-1",
                      isSelected ? "text-white/90" : "text-muted-foreground"
                    )}>
                      {eq?.tag || 'Sem equipamento'} {eq && `• ${eq.brand} ${eq.model}`}
                    </div>

                    {/* Description preview - 2 lines with ellipsis */}
                    <div 
                      className={cn(
                        "text-xs mb-3 line-clamp-2 leading-relaxed",
                        isSelected ? "text-white/80" : "text-muted-foreground/80"
                      )}
                      title={wo.description}
                    >
                      {wo.description}
                    </div>

                    {/* Status and metadata row */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <StatusBadge 
                          status={wo.status} 
                          type="workOrder"
                          cmmsSettings={workOrderSettings}
                          className="text-[10px] px-1.5 py-0.5"
                          style={selectedBadgeStyle}
                        />
                        {wo.type && (
                          <StatusBadge 
                            status={wo.type}
                            type="maintenanceType"
                            cmmsSettings={workOrderSettings}
                            className="text-[10px] px-1.5 py-0.5 font-medium"
                            style={selectedBadgeStyle}
                          />
                        )}
                      </div>
                      
                      {(wo.assignedToName || wo.assignedTo) && (
                        <div className={cn(
                          "flex items-center gap-1 text-xs",
                          isSelected ? "text-white/90" : "text-muted-foreground"
                        )}>
                          <User className="h-3 w-3" />
                          <span className="truncate max-w-20" title={wo.assignedToName || wo.assignedTo}>
                            {(wo.assignedToName || wo.assignedTo || '').split(' ')[0]}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          
          {workOrders.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <ClipboardList className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium mb-1">Nenhuma ordem de serviço</p>
              <p className="text-xs">Refine os filtros ou crie uma nova OS</p>
            </div>
          )}
          </div>
        </div>
      </div>
    );
  }

  // Regular table mode
  return (
    <>
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Número</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Localização</TableHead>
          <TableHead>Equipamento</TableHead>
          <TableHead>Tipo</TableHead>
          <TableHead>Prioridade</TableHead>
          <TableHead>Criado em</TableHead>
          <TableHead>Data Agendada</TableHead>
          <TableHead>Responsável</TableHead>
          {slaSettings.enabled && (
            <>
              <TableHead className="text-center">SLA Atendimento</TableHead>
              <TableHead className="text-center">SLA Fechamento</TableHead>
            </>
          )}
          <TableHead>Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {workOrders.map((wo) => {
          const eq = equipment.find(e => e.id === wo.equipmentId);
          const sector = sectors.find(s => s.id === eq?.sectorId);
          const unit = units.find(u => u.id === sector?.unitId);
          const company = companies.find(c => c.id === unit?.companyId);
          const subsection = eq?.subSectionId ? subsections.find(sub => sub.id === eq.subSectionId) : null;
          
          // Monta string de localização hierárquica: empresa > unidade > setor > subsetor
          
          const scheduledDate = wo.scheduledDate
            ? (wo.scheduledDate.includes('T') ? new Date(wo.scheduledDate) : parseLocalDate(wo.scheduledDate))
                .toLocaleDateString('pt-BR')
            : '-';
          
          // Calcula status do SLA - não aplicável para OSs preventivas
          const slaStatus = slaSettings.enabled && wo.createdAt && wo.type !== 'PREVENTIVE'
            ? calculateSLAStatus(
                wo.createdAt,
                wo.startedAt,
                wo.completedAt,
                wo.priority,
                slaSettings,
                wo.status
              )
            : null;
          
          return (
            <TableRow key={wo.id}>
              <TableCell className="font-medium">{wo.number}</TableCell>
              <TableCell>
                <StatusBadge status={wo.status} type="workOrder" cmmsSettings={workOrderSettings} />
              </TableCell>
              <TableCell>
                <div className="text-xs space-y-0.5">
                  {company?.name && <div className="font-medium text-foreground">{company.name}</div>}
                  {unit?.name && <div className="text-muted-foreground pl-2">↳ {unit.name}</div>}
                  {sector?.name && <div className="text-muted-foreground pl-4">↳ {sector.name}</div>}
                  {subsection?.name && <div className="text-muted-foreground pl-6">↳ {subsection.name}</div>}
                  {!company?.name && !unit?.name && !sector?.name && <span className="text-muted-foreground">-</span>}
                </div>
              </TableCell>
              <TableCell>
                <div>
                  <div className="font-medium">{eq?.tag}</div>
                  <div className="text-sm text-muted-foreground">{eq?.brand} {eq?.model}</div>
                </div>
              </TableCell>
              <TableCell>
                <StatusBadge
                  status={wo.type}
                  type="maintenanceType"
                  cmmsSettings={workOrderSettings}
                  className="text-xs px-2 py-0.5 font-medium"
                />
              </TableCell>
              <TableCell>
                <StatusBadge status={wo.priority} type="priority" />
              </TableCell>
              <TableCell>
                {wo.createdAt
                  ? new Date(wo.createdAt).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })
                  : '-'}
              </TableCell>
              <TableCell>{scheduledDate}</TableCell>
              <TableCell>{wo.assignedToName || wo.assignedTo || '-'}</TableCell>
              {slaSettings.enabled && (
                <>
                  <TableCell className="text-center">
                    {slaStatus ? (
                      <SLABadge
                        status={slaStatus.responseStatus}
                        timeRemaining={slaStatus.responseTimeRemaining}
                        percentage={slaStatus.responsePercentage}
                        type="response"
                      />
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {slaStatus ? (
                      <SLABadge
                        status={slaStatus.resolutionStatus}
                        timeRemaining={slaStatus.resolutionTimeRemaining}
                        percentage={slaStatus.resolutionPercentage}
                        type="resolution"
                      />
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                </>
              )}
              <TableCell>
                <div className="flex items-center gap-1">
                  <TooltipProvider>
                    {onViewWorkOrder && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => onViewWorkOrder(wo)}
                            aria-label={`Visualizar ordem de serviço ${wo.number}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Visualizar OS</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                    {wo.status === 'OPEN' && !wo.assignedTo && onStartWorkOrder && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleStartWorkOrderClick(wo)}
                            aria-label={`Atribuir ordem de serviço ${wo.number}`}
                          >
                            <UserPlus className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Atribuir OS</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                    {onEditWorkOrder && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => onEditWorkOrder(wo)}
                            aria-label={`Editar ordem de serviço ${wo.number}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Editar OS</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handlePrintWorkOrder(wo)}
                          disabled={printingOrderId === wo.id}
                          aria-label={`Imprimir ordem de serviço ${wo.number}`}
                        >
                          {printingOrderId === wo.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <FileText className="h-4 w-4" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{printingOrderId === wo.id ? 'Carregando...' : 'Imprimir OS'}</p>
                      </TooltipContent>
                    </Tooltip>
                    {onDeleteWorkOrder && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleDeleteClick(wo)}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            aria-label={`Excluir ordem de serviço ${wo.number}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Excluir OS</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </TooltipProvider>
                </div>
              </TableCell>
            </TableRow>
          );
        })}
        {workOrders.length === 0 && (
          <TableRow>
            <TableCell colSpan={slaSettings.enabled ? 10 : 8} className="text-center py-8 text-muted-foreground">
              Nenhuma ordem de serviço encontrada
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>

    {/* Modal para designar técnico à OS */}
    <Dialog open={isAssignModalOpen} onOpenChange={setIsAssignModalOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Atribuir Ordem de Serviço
          </DialogTitle>
          <DialogDescription>
            {pendingWorkOrder && (
              <span>OS: <strong>{pendingWorkOrder.number}</strong></span>
            )}
            <br />
            Selecione um técnico para atribuir a ordem de serviço.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4 space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Técnico Responsável</label>
            <Select value={selectedTechnicianId} onValueChange={setSelectedTechnicianId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um técnico" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem técnico designado</SelectItem>
                {technicians.map((tech) => (
                  <SelectItem key={tech.user.id} value={String(tech.user.id)}>
                    {tech.user.full_name || tech.user.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {currentUser && (
            <Button 
              variant="outline" 
              className="w-full"
              onClick={handleAssignToMe}
            >
              <User className="h-4 w-4 mr-2" />
              Atribuir a mim ({currentUser.name})
            </Button>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setIsAssignModalOpen(false);
              setPendingWorkOrder(null);
            }}
          >
            Cancelar
          </Button>
          <Button onClick={confirmStartWorkOrder}>
            <UserPlus className="h-4 w-4 mr-1" />
            Atribuir OS
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Modal de confirmacao de exclusao */}
    <ConfirmDialog
      open={deleteDialogOpen}
      onOpenChange={(open) => {
        setDeleteDialogOpen(open);
        if (!open) {
          setWorkOrderToDelete(null);
        }
      }}
      title="Excluir Ordem de Servico"
      description={
        workOrderToDelete
          ? `Tem certeza que deseja excluir a ordem de servico ${workOrderToDelete.number}? Esta acao nao pode ser desfeita.`
          : 'Tem certeza que deseja excluir esta ordem de servico? Esta acao nao pode ser desfeita.'
      }
      confirmText="Excluir"
      cancelText="Cancelar"
      variant="destructive"
      onConfirm={confirmDelete}
      onCancel={() => setWorkOrderToDelete(null)}
    />

    </>
  );
}
