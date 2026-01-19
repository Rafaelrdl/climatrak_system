/**
 * AlertsList - Lista de alertas do sistema de monitoramento
 * 
 * Exibe todos os alertas com:
 * - Filtros por severidade e status
 * - Ações de acknowledge e resolução
 * - Detalhes expandíveis
 * - Navegação cruzada para OS no CMMS
 * 
 * ✅ Integrado com a API real via useAlertsQuery
 */

import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader, StatusBadge, Card, CardContent, ConfirmDialog } from '@/shared/ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { 
  AlertTriangle, 
  AlertCircle,
  Info,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Eye,
  Bell,
  BellOff,
  Thermometer,
  Wrench,
  ClipboardList,
  ExternalLink,
  Loader2,
  RefreshCw,
  User,
  FileText,
  Activity,
  Target,
  Trash2,
  UserPlus,
  Zap,
  AlertOctagon,
  CheckCheckIcon,
  Lightbulb
} from 'lucide-react';
import { 
  useAlertsQuery, 
  useAlertsStatisticsQuery,
  useAcknowledgeAlertMutation,
  useLinkWorkOrderMutation,
  useDeleteAlertMutation
} from '../hooks';
import { useCreateWorkOrder } from '@/hooks/useWorkOrdersQuery';
import { useEquipments } from '@/hooks/useEquipmentQuery';
import { useTechnicians } from '@/hooks/useTeamQuery';
import { 
  analyzeAlertWithAI, 
  pollAIJob,
  type RootCauseAnalysisOutput
} from '@/services/aiService';
import type { Alert, AlertFilters, AlertSeverity } from '../types';
import type { WorkOrder } from '@/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/**
 * Retorna a cor do badge de severidade
 */
const getSeverityColor = (severity: AlertSeverity): 'destructive' | 'secondary' | 'outline' => {
  switch (severity) {
    case 'Critical':
      return 'destructive';
    case 'High':
    case 'Medium':
      return 'secondary';
    case 'Low':
    default:
      return 'outline';
  }
};

/**
 * Formata data/hora para exibição
 */
const formatDateTime = (dateString: string | null): string => {
  if (!dateString) return '-';
  try {
    return format(new Date(dateString), "dd/MM/yyyy HH:mm", { locale: ptBR });
  } catch {
    return dateString;
  }
};

/**
 * Formata número com no máximo 2 casas decimais
 */
const formatNumber = (value: number | null): string => {
  if (value === null || value === undefined) return '-';
  return Number(value).toFixed(2);
};

/**
 * Formata números dentro de uma string de mensagem para ter no máximo 2 casas decimais
 * Exemplo: "valor atual: 8.620000000000005" -> "valor atual: 8.62"
 */
const formatMessageNumbers = (message: string): string => {
  // Regex para encontrar números com muitas casas decimais
  return message.replace(/(\d+\.\d{3,})/g, (match) => {
    const num = parseFloat(match);
    return isNaN(num) ? match : num.toFixed(2);
  });
};

export function AlertsList() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSeverity, setFilterSeverity] = useState<AlertSeverity | null>(null);
  const [filterStatus, setFilterStatus] = useState<AlertFilters['status'] | null>(null);
  
  // Estado para o modal de detalhes
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  
  // Estado para criação de OS a partir do alerta
  const [alertForWorkOrder, setAlertForWorkOrder] = useState<Alert | null>(null);
  const [isCreatingWorkOrder, setIsCreatingWorkOrder] = useState(false);
  
  // Estado para o modal de seleção de técnico
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [pendingAlertForOS, setPendingAlertForOS] = useState<Alert | null>(null);
  const [selectedTechnicianId, setSelectedTechnicianId] = useState<string>('');
  
  // Estado para o dialog de confirmação de exclusão
  const [alertToDelete, setAlertToDelete] = useState<Alert | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  // Estado para análise com IA
  const [aiJobId, setAiJobId] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState<RootCauseAnalysisOutput | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Queries para dados reais da API
  const { data: alerts = [], isLoading, isError, refetch } = useAlertsQuery({ status: filterStatus || undefined });
  const { data: statistics } = useAlertsStatisticsQuery();
  const { data: equipments = [] } = useEquipments();
  
  // Lista de técnicos da API
  const { data: technicians = [] } = useTechnicians();
  
  // Mutations para ações
  const acknowledgeMutation = useAcknowledgeAlertMutation();
  const linkWorkOrderMutation = useLinkWorkOrderMutation();
  const createWorkOrderMutation = useCreateWorkOrder();
  const deleteAlertMutation = useDeleteAlertMutation();

  // Filtra alertas localmente (para busca por texto e severidade)
  const filteredAlerts = useMemo(() => {
    return alerts.filter((alert: Alert) => {
      const matchesSearch = searchTerm === '' ||
        alert.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
        alert.equipment_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        alert.rule_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        alert.asset_tag?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesSeverity = !filterSeverity || alert.severity === filterSeverity;

      return matchesSearch && matchesSeverity;
    });
  }, [alerts, searchTerm, filterSeverity]);

  // Contadores de alertas
  const activeCount = statistics?.active || 0;
  const criticalCount = statistics?.by_severity?.CRITICAL || 0;

  // Handler para ver detalhes do alerta
  const handleViewDetails = (alert: Alert) => {
    setSelectedAlert(alert);
    setIsDetailModalOpen(true);
  };

  // Handler para reconhecer um alerta
  const handleAcknowledge = (alert: Alert) => {
    acknowledgeMutation.mutate({ id: alert.id });
  };

  // Handler para excluir um alerta
  // Handler para abrir dialog de exclusão
  const handleDelete = (alert: Alert) => {
    setAlertToDelete(alert);
    setIsDeleteDialogOpen(true);
  };
  
  // Handler para confirmar exclusão
  const confirmDelete = () => {
    if (alertToDelete) {
      deleteAlertMutation.mutate(alertToDelete.id);
    }
  };

  // Handler para analisar alerta com IA
  const handleAnalyzeWithAI = async (alert: Alert) => {
    if (!alert.id) return;
    
    setIsAnalyzing(true);
    setAiError(null);
    setAiResult(null);
    setAiJobId(null);
    
    try {
      // Inicia a análise
      const jobResponse = await analyzeAlertWithAI(alert.id);
      setAiJobId(jobResponse.job_id);
      
      // Poll até a conclusão
      const completedJob = await pollAIJob(jobResponse.job_id);
      
      if (completedJob && completedJob.status === 'succeeded') {
        setAiResult(completedJob.output_data as RootCauseAnalysisOutput);
      } else {
        setAiError(`Análise falhou com status: ${completedJob?.status}`);
      }
    } catch (error) {
      setAiError(error instanceof Error ? error.message : 'Erro ao analisar alerta');
      console.error('Erro ao analisar alerta com IA:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Handler para abrir modal de designação de técnico
  const handleCreateWorkOrder = (alert: Alert) => {
    setPendingAlertForOS(alert);
    setSelectedTechnicianId('none');
    setIsAssignModalOpen(true);
  };

  // Handler para confirmar criação da OS com técnico selecionado
  const confirmCreateWorkOrder = async () => {
    if (!pendingAlertForOS) return;
    
    const alert = pendingAlertForOS;
    setAlertForWorkOrder(alert);
    setIsCreatingWorkOrder(true);
    setIsAssignModalOpen(false);
    
    // Encontra o equipamento pelo asset_tag
    const equipment = equipments.find(eq => eq.tag === alert.asset_tag);
    
    if (!equipment) {
      console.error('Equipamento não encontrado para o asset_tag:', alert.asset_tag);
      setIsCreatingWorkOrder(false);
      setPendingAlertForOS(null);
      return;
    }
    
    // Mapeia severidade do alerta para prioridade da OS
    const priorityMap: Record<string, WorkOrder['priority']> = {
      'Critical': 'CRITICAL',
      'High': 'HIGH',
      'Medium': 'MEDIUM',
      'Low': 'LOW'
    };
    
    try {
      // Define o status: se tem técnico atribuído, já inicia em execução
      const hasTechnician = selectedTechnicianId !== 'none' && selectedTechnicianId !== '';
      
      // Cria a OS
      const workOrderData = {
        equipmentId: equipment.id,
        type: 'PREDICTIVE' as const, // OS criada a partir de alerta é sempre Preditiva
        priority: priorityMap[alert.severity] || 'MEDIUM',
        scheduledDate: new Date().toISOString().split('T')[0],
        description: `Alerta: ${formatMessageNumbers(alert.message)}\n\nParâmetro: ${alert.parameter_key}\nValor: ${formatNumber(alert.parameter_value)}\nLimite: ${formatNumber(alert.threshold)}\nEquipamento: ${alert.equipment_name || alert.asset_tag}`,
        status: hasTechnician ? 'IN_PROGRESS' as const : 'OPEN' as const,
        assignedTo: hasTechnician ? selectedTechnicianId : '',
        startedAt: hasTechnician ? new Date().toISOString() : undefined,
        stockItems: []
      };
      
      createWorkOrderMutation.mutate(workOrderData, {
        onSuccess: (newWorkOrder: WorkOrder) => {
          // Vincula a OS ao alerta (isso também reconhece o alerta automaticamente)
          linkWorkOrderMutation.mutate(
            { alertId: alert.id, workOrderId: parseInt(newWorkOrder.id) },
            {
              onSuccess: () => {
                setIsCreatingWorkOrder(false);
                setAlertForWorkOrder(null);
                setPendingAlertForOS(null);
                setIsDetailModalOpen(false);
                refetch();
              },
              onError: (error) => {
                console.error('Erro ao vincular OS ao alerta:', error);
                setIsCreatingWorkOrder(false);
              }
            }
          );
        },
        onError: (error) => {
          console.error('Erro ao criar OS:', error);
          setIsCreatingWorkOrder(false);
        }
      });
    } catch (error) {
      console.error('Erro ao criar OS:', error);
      setIsCreatingWorkOrder(false);
    }
  };

  // Estado de loading
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Carregando alertas...</p>
        </div>
      </div>
    );
  }

  // Estado de erro
  if (isError) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3 text-center">
          <AlertTriangle className="h-12 w-12 text-amber-500" />
          <p className="font-medium">Erro ao carregar alertas</p>
          <p className="text-sm text-muted-foreground">Verifique sua conexão e tente novamente</p>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Alertas"
        description="Gerencie os alertas do sistema de monitoramento"
        icon={<Bell className="h-6 w-6" />}
      >
        <div className="flex items-center gap-2">
          <Badge variant="destructive" className="text-sm">
            {criticalCount} crítico{criticalCount !== 1 ? 's' : ''}
          </Badge>
          <Badge variant="secondary" className="text-sm">
            {activeCount} ativo{activeCount !== 1 ? 's' : ''}
          </Badge>
          <Button variant="ghost" size="sm" onClick={() => refetch()} title="Atualizar">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </PageHeader>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por mensagem, equipamento ou regra..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filter Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="h-4 w-4 text-muted-foreground" />
              
              {/* Severity Filter */}
              <div className="flex gap-1">
                <Button
                  variant={filterSeverity === null ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterSeverity(null)}
                >
                  Todos
                </Button>
                <Button
                  variant={filterSeverity === 'Critical' ? 'destructive' : 'outline'}
                  size="sm"
                  onClick={() => setFilterSeverity(filterSeverity === 'Critical' ? null : 'Critical')}
                >
                  Crítico
                </Button>
                <Button
                  variant={filterSeverity === 'High' ? 'secondary' : 'outline'}
                  size="sm"
                  onClick={() => setFilterSeverity(filterSeverity === 'High' ? null : 'High')}
                >
                  Alto
                </Button>
                <Button
                  variant={filterSeverity === 'Medium' ? 'secondary' : 'outline'}
                  size="sm"
                  onClick={() => setFilterSeverity(filterSeverity === 'Medium' ? null : 'Medium')}
                >
                  Médio
                </Button>
              </div>

              <span className="text-muted-foreground hidden md:inline">|</span>

              {/* Status Filter */}
              <div className="flex gap-1">
                <Button
                  variant={filterStatus === null ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterStatus(null)}
                >
                  Todos
                </Button>
                <Button
                  variant={filterStatus === 'active' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterStatus(filterStatus === 'active' ? null : 'active')}
                >
                  Ativos
                </Button>
                <Button
                  variant={filterStatus === 'acknowledged' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterStatus(filterStatus === 'acknowledged' ? null : 'acknowledged')}
                >
                  Reconhecidos
                </Button>
                <Button
                  variant={filterStatus === 'resolved' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterStatus(filterStatus === 'resolved' ? null : 'resolved')}
                >
                  Resolvidos
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Alertas */}
      <Card>
        <CardContent className="pt-6">
          {filteredAlerts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">Nenhum alerta encontrado</p>
              <p className="text-sm mt-1">
                {alerts.length === 0 
                  ? 'Não há alertas registrados no sistema'
                  : 'Não há alertas que correspondam aos filtros aplicados'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Severidade</TableHead>
                  <TableHead>Mensagem</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Ordem de Serviço</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAlerts.map((alert: Alert) => (
                  <TableRow key={alert.id}>
                    {/* Severidade */}
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {alert.severity === 'Critical' ? (
                          <AlertCircle className="h-4 w-4 text-red-500" />
                        ) : alert.severity === 'High' || alert.severity === 'Medium' ? (
                          <AlertTriangle className="h-4 w-4 text-amber-500" />
                        ) : (
                          <Info className="h-4 w-4 text-blue-500" />
                        )}
                        <Badge variant={getSeverityColor(alert.severity)}>
                          {alert.severity_display}
                        </Badge>
                      </div>
                    </TableCell>
                    
                    {/* Mensagem */}
                    <TableCell>
                      <div>
                        <p className="font-medium">{formatMessageNumbers(alert.message)}</p>
                        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                          <Thermometer className="h-3 w-3" />
                          {alert.equipment_name || alert.asset_tag}
                        </p>
                        {alert.rule_name && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Regra: {alert.rule_name}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    
                    {/* Valor */}
                    <TableCell>
                      <span className="text-sm">
                        {alert.parameter_value !== null 
                          ? `${formatNumber(alert.parameter_value)}${alert.threshold ? ` (limite: ${formatNumber(alert.threshold)})` : ''}`
                          : '-'}
                      </span>
                      {alert.parameter_key && (
                        <p className="text-xs text-muted-foreground">{alert.parameter_key}</p>
                      )}
                    </TableCell>
                    
                    {/* Status */}
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <StatusBadge
                          status={alert.resolved ? 'RESOLVED' : alert.is_active ? 'ACTIVE' : 'ACKNOWLEDGED'}
                          type="alert"
                        />
                        {alert.acknowledged && !alert.resolved && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Reconhecido
                          </span>
                        )}
                      </div>
                    </TableCell>
                    
                    {/* Data/Hora */}
                    <TableCell>
                      <div className="text-sm">
                        <p className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDateTime(alert.triggered_at)}
                        </p>
                        {alert.resolved_at && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Resolvido: {formatDateTime(alert.resolved_at)}
                          </p>
                        )}
                        {alert.acknowledged_at && !alert.resolved && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Reconhecido: {formatDateTime(alert.acknowledged_at)}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    
                    {/* Ordem de Serviço */}
                    <TableCell>
                      {alert.work_order && alert.work_order_number ? (
                        <Link 
                          to={`/cmms/work-orders/${alert.work_order}`}
                          className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          <ClipboardList className="h-3 w-3" />
                          #{alert.work_order_number}
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      ) : !alert.resolved ? (
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="text-xs border-blue-300 text-blue-700 hover:bg-blue-50"
                          onClick={() => handleCreateWorkOrder(alert)}
                          disabled={isCreatingWorkOrder && alertForWorkOrder?.id === alert.id}
                        >
                          {isCreatingWorkOrder && alertForWorkOrder?.id === alert.id ? (
                            <>
                              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                              Criando...
                            </>
                          ) : (
                            <>
                              <Wrench className="h-3 w-3 mr-1" />
                              Criar OS
                            </>
                          )}
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    
                    {/* Ações */}
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          title="Ver detalhes"
                          onClick={() => handleViewDetails(alert)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          title="Excluir alerta"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDelete(alert)}
                          disabled={deleteAlertMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Modal de Detalhes do Alerta */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedAlert?.severity === 'Critical' ? (
                <AlertCircle className="h-5 w-5 text-red-500" />
              ) : selectedAlert?.severity === 'High' || selectedAlert?.severity === 'Medium' ? (
                <AlertTriangle className="h-5 w-5 text-amber-500" />
              ) : (
                <Info className="h-5 w-5 text-blue-500" />
              )}
              Detalhes do Alerta
            </DialogTitle>
            <DialogDescription>
              Informações completas sobre o alerta #{selectedAlert?.id}
            </DialogDescription>
          </DialogHeader>

          {selectedAlert && (
            <div className="space-y-6">
              {/* Status e Severidade */}
              <div className="flex items-center gap-3">
                <Badge variant={getSeverityColor(selectedAlert.severity)}>
                  {selectedAlert.severity_display}
                </Badge>
                <StatusBadge
                  status={selectedAlert.resolved ? 'RESOLVED' : selectedAlert.is_active ? 'ACTIVE' : 'ACKNOWLEDGED'}
                  type="alert"
                />
              </div>

              {/* Mensagem */}
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-sm font-medium">{formatMessageNumbers(selectedAlert.message)}</p>
              </div>

              <Separator />

              {/* Informações do Alerta */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Thermometer className="h-3 w-3" />
                    Equipamento
                  </p>
                  <p className="text-sm font-medium">{selectedAlert.equipment_name || selectedAlert.asset_tag}</p>
                </div>

                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    Regra
                  </p>
                  <p className="text-sm font-medium">{selectedAlert.rule_name || '-'}</p>
                </div>

                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Activity className="h-3 w-3" />
                    Parâmetro
                  </p>
                  <p className="text-sm font-medium">{selectedAlert.parameter_key || '-'}</p>
                </div>

                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Target className="h-3 w-3" />
                    Valor / Limite
                  </p>
                  <p className="text-sm font-medium">
                    {formatNumber(selectedAlert.parameter_value)} / {formatNumber(selectedAlert.threshold)}
                  </p>
                </div>
              </div>

              <Separator />

              {/* Timestamps */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Disparado em
                  </p>
                  <p className="text-sm font-medium">{formatDateTime(selectedAlert.triggered_at)}</p>
                </div>

                {selectedAlert.acknowledged_at && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Reconhecido em
                    </p>
                    <p className="text-sm font-medium">{formatDateTime(selectedAlert.acknowledged_at)}</p>
                    {selectedAlert.acknowledged_by_email && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {selectedAlert.acknowledged_by_email}
                      </p>
                    )}
                  </div>
                )}

                {selectedAlert.resolved_at && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <BellOff className="h-3 w-3" />
                      Resolvido em
                    </p>
                    <p className="text-sm font-medium">{formatDateTime(selectedAlert.resolved_at)}</p>
                    {selectedAlert.resolved_by_email && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {selectedAlert.resolved_by_email}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Notas */}
              {selectedAlert.notes && (
                <>
                  <Separator />
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <FileText className="h-3 w-3" />
                      Notas
                    </p>
                    <p className="text-sm whitespace-pre-wrap bg-muted/50 rounded-lg p-3">
                      {selectedAlert.notes}
                    </p>
                  </div>
                </>
              )}

              {/* Ações */}
              <Separator />
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  {!selectedAlert.acknowledged && !selectedAlert.resolved && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        handleAcknowledge(selectedAlert);
                        setIsDetailModalOpen(false);
                      }}
                      disabled={acknowledgeMutation.isPending}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Reconhecer
                    </Button>
                  )}
                  
                  {/* Botão de Análise com IA */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAnalyzeWithAI(selectedAlert)}
                    disabled={isAnalyzing}
                    title="Usar IA para identificar possíveis causas raízes"
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        Analisando...
                      </>
                    ) : (
                      <>
                        <Zap className="h-4 w-4 mr-1" />
                        Analisar com IA
                      </>
                    )}
                  </Button>
                </div>
                
                {!selectedAlert.resolved && !selectedAlert.work_order && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => handleCreateWorkOrder(selectedAlert)}
                    disabled={isCreatingWorkOrder}
                  >
                    {isCreatingWorkOrder ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        Criando OS...
                      </>
                    ) : (
                      <>
                        <Wrench className="h-4 w-4 mr-1" />
                        Criar Ordem de Serviço
                      </>
                    )}
                  </Button>
                )}

                {selectedAlert.work_order && selectedAlert.work_order_number && (
                  <Link 
                    to={`/cmms/work-orders/${selectedAlert.work_order}`}
                    className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 hover:underline"
                    onClick={() => setIsDetailModalOpen(false)}
                  >
                    <ClipboardList className="h-4 w-4" />
                    Ver OS: #{selectedAlert.work_order_number}
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                )}
              </div>

              {/* Resultados da Análise com IA */}
              {(aiResult || aiError || isAnalyzing) && (
                <>
                  <Separator />
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-amber-500" />
                      <h3 className="font-medium">Análise com IA</h3>
                    </div>

                    {isAnalyzing && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Analisando alerta...
                      </div>
                    )}

                    {aiError && (
                      <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3">
                        <p className="text-sm text-destructive flex items-start gap-2">
                          <AlertOctagon className="h-4 w-4 mt-0.5 flex-shrink-0" />
                          {aiError}
                        </p>
                      </div>
                    )}

                    {aiResult && (
                      <div className="space-y-4">
                        {/* Hipóteses */}
                        {aiResult.hypotheses && aiResult.hypotheses.length > 0 && (
                          <div className="space-y-2">
                            <h4 className="text-sm font-medium flex items-center gap-2">
                              <Lightbulb className="h-4 w-4" />
                              Possíveis Causas Raízes
                            </h4>
                            {aiResult.hypotheses.map((hypothesis, index) => (
                              <div key={hypothesis.id} className="bg-muted/50 rounded-lg p-3 text-sm space-y-1">
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <p className="font-medium">{index + 1}. {hypothesis.title}</p>
                                    {hypothesis.evidence && hypothesis.evidence.length > 0 && (
                                      <ul className="text-xs text-muted-foreground mt-1 ml-4 space-y-0.5">
                                        {hypothesis.evidence.map((ev, i) => (
                                          <li key={i}>• {ev}</li>
                                        ))}
                                      </ul>
                                    )}
                                  </div>
                                  <Badge variant="secondary" className="text-xs whitespace-nowrap">
                                    {Math.round(hypothesis.confidence * 100)}%
                                  </Badge>
                                </div>
                                {hypothesis.recommendation && (
                                  <p className="text-xs text-foreground mt-2 italic">
                                    💡 {hypothesis.recommendation}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Ações Imediatas */}
                        {aiResult.immediate_actions && aiResult.immediate_actions.length > 0 && (
                          <div className="space-y-2">
                            <h4 className="text-sm font-medium flex items-center gap-2">
                              <CheckCheckIcon className="h-4 w-4" />
                              Ações Imediatas Recomendadas
                            </h4>
                            <ul className="bg-muted/50 rounded-lg p-3 space-y-1 text-sm">
                              {aiResult.immediate_actions.map((action, i) => (
                                <li key={i} className="flex items-start gap-2">
                                  <span className="text-amber-500 mt-0.5">•</span>
                                  {action}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* OS Recomendada */}
                        {aiResult.recommended_work_order && (
                          <div className="space-y-2">
                            <h4 className="text-sm font-medium flex items-center gap-2">
                              <Wrench className="h-4 w-4" />
                              Ordem de Serviço Recomendada
                            </h4>
                            <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1">
                              <p><span className="font-medium">Título:</span> {aiResult.recommended_work_order.title}</p>
                              <p><span className="font-medium">Prioridade:</span> {aiResult.recommended_work_order.priority}</p>
                              {aiResult.recommended_work_order.estimated_duration_hours && (
                                <p><span className="font-medium">Duração Est.:</span> {aiResult.recommended_work_order.estimated_duration_hours}h</p>
                              )}
                              {aiResult.recommended_work_order.parts_potentially_needed && 
                               aiResult.recommended_work_order.parts_potentially_needed.length > 0 && (
                                <div>
                                  <p className="font-medium">Peças Potencialmente Necessárias:</p>
                                  <ul className="ml-4 text-xs space-y-0.5">
                                    {aiResult.recommended_work_order.parts_potentially_needed.map((part, i) => (
                                      <li key={i}>• {part}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {aiResult.notes && (
                          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg p-3 text-sm">
                            <p className="text-blue-900 dark:text-blue-100">{aiResult.notes}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal para designar técnico */}
      <Dialog open={isAssignModalOpen} onOpenChange={setIsAssignModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Designar Técnico
            </DialogTitle>
            <DialogDescription>
              Selecione um técnico para executar a ordem de serviço ou deixe sem designação.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <label className="text-sm font-medium mb-2 block">Técnico Executor</label>
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

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAssignModalOpen(false);
                setPendingAlertForOS(null);
              }}
            >
              Cancelar
            </Button>
            <Button onClick={confirmCreateWorkOrder}>
              <Wrench className="h-4 w-4 mr-1" />
              Criar Ordem de Serviço
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmação de exclusão */}
      <ConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title="Excluir Alerta"
        description={`Tem certeza que deseja excluir o alerta "${alertToDelete?.rule_name || 'Alerta'}"? Esta ação não pode ser desfeita.`}
        confirmText="Excluir"
        cancelText="Cancelar"
        variant="destructive"
        loading={deleteAlertMutation.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setAlertToDelete(null)}
      />
    </div>
  );
}
