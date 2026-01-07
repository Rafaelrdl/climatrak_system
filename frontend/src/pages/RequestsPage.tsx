import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader, StatusBadge } from '@/shared/ui';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { MessageSquare, Users, Calendar, Loader2, Plus, Eye, ArrowRightCircle, XCircle } from 'lucide-react';
import { SolicitationModal } from '@/components/SolicitationModal';
import { SolicitationFilters, type SolicitationFilters as SolicitationFiltersType } from '@/components/SolicitationFilters';
import { CreateRequestModal } from '@/components/CreateRequestModal';
import { RejectRequestDialog } from '@/components/RejectRequestDialog';
import { toast } from 'sonner';
import {
  useSolicitations,
  useUpdateSolicitationStatus,
  useConvertSolicitationToWorkOrder
} from '@/hooks/useRequestsQuery';
import { filterSolicitations, getFilterOptions } from '@/utils/solicitationFilters';
import type { Solicitation } from '@/types';

export function RequestsPage() {
  // React Query hooks
  const { data: solicitations = [], isLoading, error } = useSolicitations();
  const navigate = useNavigate();
  
  // Mutations
  const convertMutation = useConvertSolicitationToWorkOrder();
  const updateStatusMutation = useUpdateSolicitationStatus();
  
  // Local state
  const [selectedSolicitation, setSelectedSolicitation] = useState<Solicitation | null>(null);
  const [filters, setFilters] = useState<SolicitationFiltersType>({});
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<Solicitation | null>(null);

  // Get filter options from all solicitations
  const filterOptions = useMemo(() => getFilterOptions(solicitations), [solicitations]);

  // Apply filters to solicitations
  const filteredSolicitations = useMemo(() => 
    filterSolicitations(solicitations, filters), 
    [solicitations, filters]
  );

  const handleConvertToWorkOrder = (solicitation: Solicitation) => {
    convertMutation.mutate({
      id: solicitation.id,
      data: {
        priority: 'MEDIUM',
        scheduled_date: new Date().toISOString().split('T')[0],
      }
    }, {
      onSuccess: ({ work_order_id, work_order_number }) => {
        setSelectedSolicitation(null);
        const workOrderPath = work_order_id
          ? `/cmms/work-orders/${work_order_id}`
          : '/cmms/work-orders';

        toast.success('Solicitacao convertida em OS com sucesso!', {
          description: `Ordem de servico ${work_order_number} criada.`,
          action: {
            label: 'Ver OS',
            onClick: () => {
              navigate(workOrderPath);
            }
          }
        });
      },
      onError: () => {
        toast.error('Erro ao converter solicitação em OS.');
      }
    });
  };

  const handleCloseDrawer = () => {
    setSelectedSolicitation(null);
  };

  const handleViewSolicitation = (solicitation: Solicitation, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedSolicitation(solicitation);
  };

  const handleConvertClick = (solicitation: Solicitation, e: React.MouseEvent) => {
    e.stopPropagation();
    if (solicitation.status === 'Convertida em OS') {
      toast.info('Esta solicitação já foi convertida em OS.');
      return;
    }
    if (solicitation.status === 'Rejeitada') {
      toast.info('Esta solicitacao foi rejeitada e nao pode ser convertida.');
      return;
    }
    handleConvertToWorkOrder(solicitation);
  };

  const handleRejectClick = (solicitation: Solicitation, e: React.MouseEvent) => {
    e.stopPropagation();
    if (solicitation.status === 'Convertida em OS') {
      toast.info('Esta solicitacao ja foi convertida em OS.');
      return;
    }
    if (solicitation.status === 'Rejeitada') {
      toast.info('Esta solicitacao ja foi rejeitada.');
      return;
    }
    setRejectTarget(solicitation);
  };

  const handleConfirmReject = async (reason: string) => {
    if (!rejectTarget) {
      return;
    }

    try {
      await updateStatusMutation.mutateAsync({ 
        id: rejectTarget.id, 
        status: 'REJECTED',
        rejection_reason: reason 
      });
      toast.success('Solicitacao rejeitada com sucesso.');
      if (selectedSolicitation?.id === rejectTarget.id) {
        setSelectedSolicitation(null);
      }
    } catch {
      toast.error('Erro ao rejeitar solicitacao.');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const truncateText = (text: string | undefined, maxLength: number = 50) => {
    if (!text) return '-';
    return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
  };

  // Statistics - use filtered data for more accurate stats
  const stats = {
    total: filteredSolicitations.length,
    nova: filteredSolicitations.filter(s => s.status === 'Nova').length,
    convertida: filteredSolicitations.filter(s => s.status === 'Convertida em OS').length,
    rejeitada: filteredSolicitations.filter(s => s.status === 'Rejeitada').length
  };

  // Show total vs filtered count
  const showingFiltered = filteredSolicitations.length !== solicitations.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader title="Solicitações" />
        <Button onClick={() => setIsCreateModalOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Nova Solicitação
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <MessageSquare className="h-8 w-8 text-muted-foreground" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">
                  Total {showingFiltered && `(${solicitations.length})`}
                </p>
                <div className="text-2xl font-bold">{stats.total}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                <span className="text-blue-600 font-bold text-sm">{stats.nova}</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Novas</p>
                <div className="text-2xl font-bold text-blue-600">{stats.nova}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                <span className="text-green-600 font-bold text-sm">{stats.convertida}</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Convertidas</p>
                <div className="text-2xl font-bold text-green-600">{stats.convertida}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center">
                <span className="text-red-600 font-bold text-sm">{stats.rejeitada}</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Rejeitadas</p>
                <div className="text-2xl font-bold text-red-600">{stats.rejeitada}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <SolicitationFilters
        filters={filters}
        onFiltersChange={setFilters}
        equipmentOptions={filterOptions.equipmentOptions}
        locationOptions={filterOptions.locationOptions}
        requesterOptions={filterOptions.requesterOptions}
      />

      {/* Main Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Lista de Solicitações
            {showingFiltered && (
              <Badge variant="secondary" className="ml-2">
                {stats.total} de {solicitations.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Carregando solicitações...</span>
            </div>
          )}
          
          {error && (
            <div className="text-center py-12 text-destructive">
              <p>Erro ao carregar solicitações.</p>
              <p className="text-sm text-muted-foreground mt-1">Tente novamente mais tarde.</p>
            </div>
          )}
          
          {!isLoading && !error && filteredSolicitations.length > 0 ? (
            <div className="overflow-x-auto">
              <table 
                className="w-full" 
                role="grid"
                aria-label="Lista de solicitações de manutenção"
              >
                <thead>
                  <tr className="border-b">
                    <th scope="col" className="text-left p-4 font-medium text-muted-foreground">
                      Localização/Equipamento
                    </th>
                    <th scope="col" className="text-left p-4 font-medium text-muted-foreground">
                      Usuário Solicitante
                    </th>
                    <th scope="col" className="text-left p-4 font-medium text-muted-foreground">
                      Observação
                    </th>
                    <th scope="col" className="text-left p-4 font-medium text-muted-foreground">
                      Status
                    </th>
                    <th scope="col" className="text-left p-4 font-medium text-muted-foreground">
                      Data
                    </th>
                    <th scope="col" className="text-center p-4 font-medium text-muted-foreground">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSolicitations.map((solicitation) => (
                    <tr
                      key={solicitation.id}
                      className="border-b hover:bg-muted/50 transition-colors"
                    >
                      <td className="p-4">
                        <div className="max-w-xs">
                          <p className="font-medium text-sm">
                            {solicitation.location_name}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {solicitation.equipment_name || '-'}
                          </p>
                        </div>
                      </td>
                      
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">
                            {solicitation.requester_user_name}
                          </span>
                        </div>
                      </td>
                      
                      <td className="p-4">
                        <div className="max-w-xs">
                          <p 
                            className="text-sm text-muted-foreground"
                            title={solicitation.note}
                          >
                            {truncateText(solicitation.note)}
                          </p>
                        </div>
                      </td>
                      
                      <td className="p-4">
                        <StatusBadge status={solicitation.status} />
                      </td>
                      
                      <td className="p-4">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          {formatDate(solicitation.created_at)}
                        </div>
                      </td>

                      <td className="p-4">
                        <div className="flex items-center justify-center gap-1">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={(e) => handleViewSolicitation(solicitation, e)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Visualizar detalhes</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>

                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-primary hover:text-primary"
                                  onClick={(e) => handleConvertClick(solicitation, e)}
                                  disabled={solicitation.status === 'Convertida em OS' || solicitation.status === 'Rejeitada'}
                                >
                                  <ArrowRightCircle className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>
                                  {solicitation.status === 'Convertida em OS'
                                    ? 'Ja convertida em OS'
                                    : solicitation.status === 'Rejeitada'
                                      ? 'Solicitacao rejeitada'
                                      : 'Converter em Ordem de Servico'}
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>

                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                  onClick={(e) => handleRejectClick(solicitation, e)}
                                  disabled={solicitation.status === 'Convertida em OS' || solicitation.status === 'Rejeitada'}
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>
                                  {solicitation.status === 'Convertida em OS'
                                    ? 'Ja convertida em OS'
                                    : solicitation.status === 'Rejeitada'
                                      ? 'Solicitacao rejeitada'
                                      : 'Rejeitar solicitacao'}
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : !isLoading && !error ? (
            <div className="text-center py-12">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-medium mb-2">
                {showingFiltered ? 'Nenhuma solicitação encontrada com os filtros aplicados' : 'Nenhuma solicitação encontrada'}
              </h3>
              <p className="text-muted-foreground">
                {showingFiltered 
                  ? 'Tente ajustar os filtros ou limpe-os para ver todas as solicitações.'
                  : 'Não há solicitações cadastradas no sistema.'
                }
              </p>
              {showingFiltered && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => setFilters({})}
                >
                  Limpar Filtros
                </Button>
              )}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Solicitation Modal */}
      <SolicitationModal
        solicitation={selectedSolicitation}
        isOpen={!!selectedSolicitation}
        onClose={handleCloseDrawer}
        onConvert={handleConvertToWorkOrder}
      />

      <RejectRequestDialog
        open={!!rejectTarget}
        onOpenChange={(open) => {
          if (!open) {
            setRejectTarget(null);
          }
        }}
        onConfirm={handleConfirmReject}
        loading={updateStatusMutation.isPending}
      />

      {/* Create Request Modal */}
      <CreateRequestModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </div>
  );
}
