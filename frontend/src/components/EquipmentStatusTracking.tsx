import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Activity,
  AlertTriangle,
  Calendar,
  Clock,
  DollarSign,
  FileText,
  History,
  MapPin,
  Settings,
  Shield,
  Thermometer,
  TrendingDown,
  TrendingUp,
  Wrench,
  Zap,
  Bell,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import type { Equipment, MaintenanceHistory, MaintenanceAlert, WorkOrder } from '@/types';

interface EquipmentStatusTrackingProps {
  equipment: Equipment;
  isOpen: boolean;
  onClose: () => void;
}

export function EquipmentStatusTracking({ equipment, isOpen, onClose }: EquipmentStatusTrackingProps) {
  const [activeAlerts, setActiveAlerts] = useState<MaintenanceAlert[]>([]);
  const [maintenanceHistory, setMaintenanceHistory] = useState<MaintenanceHistory[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [activeTab, setActiveTab] = useState('overview');

  // Mock data generation - in real app, this would come from API
  useEffect(() => {
    if (!isOpen) return;

    // Generate mock maintenance alerts
    const alerts: MaintenanceAlert[] = [];
    const now = new Date();
    const maintenanceDate = new Date(equipment.nextMaintenance);
    const diffDays = Math.ceil((maintenanceDate.getTime() - now.getTime()) / (1000 * 3600 * 24));

    if (diffDays < 0) {
      alerts.push({
        id: '1',
        equipmentId: equipment.id,
        type: 'OVERDUE',
        priority: 'HIGH',
        message: `Manutenção preventiva em atraso há ${Math.abs(diffDays)} dias`,
        dueDate: equipment.nextMaintenance,
        daysOverdue: Math.abs(diffDays),
        isAcknowledged: false,
        createdAt: now.toISOString()
      });
    } else if (diffDays <= 7) {
      alerts.push({
        id: '2',
        equipmentId: equipment.id,
        type: 'UPCOMING',
        priority: 'MEDIUM',
        message: `Manutenção preventiva programada em ${diffDays} dias`,
        dueDate: equipment.nextMaintenance,
        isAcknowledged: false,
        createdAt: now.toISOString()
      });
    }

    if (equipment.warrantyExpiry) {
      const warrantyDate = new Date(equipment.warrantyExpiry);
      const warrantyDays = Math.ceil((warrantyDate.getTime() - now.getTime()) / (1000 * 3600 * 24));
      
      if (warrantyDays <= 30 && warrantyDays > 0) {
        alerts.push({
          id: '3',
          equipmentId: equipment.id,
          type: 'WARRANTY_EXPIRY',
          priority: 'MEDIUM',
          message: `Garantia expira em ${warrantyDays} dias`,
          dueDate: equipment.warrantyExpiry,
          isAcknowledged: false,
          createdAt: now.toISOString()
        });
      }
    }

    if (equipment.status === 'STOPPED') {
      alerts.push({
        id: '4',
        equipmentId: equipment.id,
        type: 'CRITICAL',
        priority: 'CRITICAL',
        message: 'Equipamento fora de operação - intervenção necessária',
        dueDate: now.toISOString(),
        isAcknowledged: false,
        createdAt: now.toISOString()
      });
    }

    setActiveAlerts(alerts);

    // Generate mock maintenance history
    const history: MaintenanceHistory[] = [
      {
        id: '1',
        equipmentId: equipment.id,
        workOrderId: 'OS-2024-001',
        type: 'PREVENTIVE',
        performedBy: 'João Silva',
        date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        description: 'Manutenção preventiva trimestral',
        partsUsed: ['Filtro de ar', 'Óleo lubrificante'],
        cost: 150,
        duration: 2,
        status: 'COMPLETED',
        findings: 'Equipamento em bom estado, filtros substituídos conforme cronograma.',
        recommendations: 'Próxima manutenção em 90 dias'
      },
      {
        id: '2',
        equipmentId: equipment.id,
        workOrderId: 'OS-2024-002',
        type: 'CORRECTIVE',
        performedBy: 'Maria Santos',
        date: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
        description: 'Correção de vazamento no condensador',
        partsUsed: ['Vedação', 'Gás refrigerante R410A'],
        cost: 320,
        duration: 4,
        status: 'COMPLETED',
        findings: 'Vazamento localizado na conexão do condensador.',
        recommendations: 'Monitorar temperatura de operação'
      },
      {
        id: '3',
        equipmentId: equipment.id,
        workOrderId: 'OS-2024-003',
        type: 'PREVENTIVE',
        performedBy: 'Carlos Lima',
        date: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(),
        description: 'Limpeza e inspeção geral',
        partsUsed: ['Produto de limpeza'],
        cost: 80,
        duration: 1.5,
        status: 'COMPLETED',
        findings: 'Limpeza realizada, serpentinas em bom estado.',
        recommendations: 'Manter cronograma de limpeza'
      }
    ];

    setMaintenanceHistory(history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));

    // Generate mock work orders
    const orders: WorkOrder[] = [
      {
        id: '1',
        number: 'OS-2024-004',
        equipmentId: equipment.id,
        type: 'PREVENTIVE',
        status: 'OPEN',
        scheduledDate: equipment.nextMaintenance,
        priority: 'MEDIUM',
        description: 'Manutenção preventiva programada'
      }
    ];

    setWorkOrders(orders);
  }, [equipment, isOpen]);

  const getStatusColor = (status: Equipment['status']) => {
    switch (status) {
      case 'FUNCTIONING': return 'text-green-600';
      case 'MAINTENANCE': return 'text-yellow-600';
      case 'STOPPED': return 'text-red-600';
    }
  };

  const getStatusBadge = (status: Equipment['status']) => {
    switch (status) {
      case 'FUNCTIONING': 
        return <Badge className="bg-green-100 text-green-800">Funcionando</Badge>;
      case 'MAINTENANCE': 
        return <Badge className="bg-yellow-100 text-yellow-800">Em Manutenção</Badge>;
      case 'STOPPED': 
        return <Badge className="bg-red-100 text-red-800">Parado</Badge>;
    }
  };

  const getPriorityColor = (priority: MaintenanceAlert['priority']) => {
    switch (priority) {
      case 'LOW': return 'text-blue-600';
      case 'MEDIUM': return 'text-yellow-600';
      case 'HIGH': return 'text-orange-600';
      case 'CRITICAL': return 'text-red-600';
    }
  };

  const getPriorityIcon = (priority: MaintenanceAlert['priority']) => {
    switch (priority) {
      case 'LOW': return <Bell className="h-4 w-4" />;
      case 'MEDIUM': return <AlertCircle className="h-4 w-4" />;
      case 'HIGH': return <AlertTriangle className="h-4 w-4" />;
      case 'CRITICAL': return <XCircle className="h-4 w-4" />;
    }
  };

  const acknowledgeAlert = (alertId: string) => {
    setActiveAlerts(prev => prev.map(alert => 
      alert.id === alertId ? { ...alert, isAcknowledged: true } : alert
    ));
  };

  const calculateUptime = () => {
    // Mock calculation - would be based on real operational data
    const totalHours = equipment.totalOperatingHours || 8760; // 1 year default
    const downtimeHours = maintenanceHistory.reduce((total, record) => total + record.duration, 0);
    return Math.max(0, ((totalHours - downtimeHours) / totalHours) * 100);
  };

  const calculateMTBF = () => {
    // Mean Time Between Failures
    const correctiveMaintenances = maintenanceHistory.filter(h => h.type === 'CORRECTIVE').length;
    const operatingHours = equipment.totalOperatingHours || 8760;
    return correctiveMaintenances > 0 ? Math.round(operatingHours / correctiveMaintenances) : operatingHours;
  };

  const calculateMTTR = () => {
    // Mean Time To Repair
    const correctiveMaintenances = maintenanceHistory.filter(h => h.type === 'CORRECTIVE');
    const totalRepairTime = correctiveMaintenances.reduce((total, record) => total + record.duration, 0);
    return correctiveMaintenances.length > 0 ? Math.round(totalRepairTime / correctiveMaintenances.length * 10) / 10 : 0;
  };

  const totalMaintenanceCosts = maintenanceHistory.reduce((total, record) => total + record.cost, 0);

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            {equipment.tag} - Status e Histórico
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="alerts">Alertas ({activeAlerts.filter(a => !a.isAcknowledged).length})</TabsTrigger>
            <TabsTrigger value="history">Histórico</TabsTrigger>
            <TabsTrigger value="workorders">Ordens de Serviço</TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[70vh] pr-4">
            <TabsContent value="overview" className="space-y-6">
              {/* Equipment Overview */}
              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="h-5 w-5" />
                      Informações do Equipamento
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Status</label>
                        <div className="mt-1">
                          {getStatusBadge(equipment.status)}
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Tipo</label>
                        <p className="mt-1">{equipment.type}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Marca/Modelo</label>
                        <p className="mt-1">{equipment.brand} {equipment.model}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Capacidade</label>
                        <p className="mt-1">{equipment.capacity.toLocaleString()} BTUs</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Instalação</label>
                        <p className="mt-1">{new Date(equipment.installDate).toLocaleDateString('pt-BR')}</p>
                      </div>
                      {equipment.serialNumber && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Série</label>
                          <p className="mt-1">{equipment.serialNumber}</p>
                        </div>
                      )}
                    </div>
                    
                    {equipment.warrantyExpiry && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Garantia</label>
                        <p className="mt-1 flex items-center gap-2">
                          <Shield className="h-4 w-4" />
                          Até {new Date(equipment.warrantyExpiry).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Métricas de Performance
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium">Uptime</label>
                        <span className="text-sm font-medium">{calculateUptime().toFixed(1)}%</span>
                      </div>
                      <Progress value={calculateUptime()} className="h-2" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">MTBF</label>
                        <p className="mt-1 text-lg font-semibold">{calculateMTBF()}h</p>
                        <p className="text-xs text-muted-foreground">Tempo Médio Entre Falhas</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">MTTR</label>
                        <p className="mt-1 text-lg font-semibold">{calculateMTTR()}h</p>
                        <p className="text-xs text-muted-foreground">Tempo Médio de Reparo</p>
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Horas Operacionais</label>
                      <p className="mt-1 text-lg font-semibold">
                        {(equipment.totalOperatingHours || 0).toLocaleString()}h
                      </p>
                    </div>

                    {equipment.energyConsumption && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Consumo Energético</label>
                        <p className="mt-1 text-lg font-semibold flex items-center gap-2">
                          <Zap className="h-4 w-4" />
                          {equipment.energyConsumption.toLocaleString()} kWh/mês
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Maintenance Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wrench className="h-5 w-5" />
                    Resumo de Manutenções
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {maintenanceHistory.filter(h => h.type === 'PREVENTIVE').length}
                      </div>
                      <p className="text-sm text-muted-foreground">Preventivas</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">
                        {maintenanceHistory.filter(h => h.type === 'CORRECTIVE').length}
                      </div>
                      <p className="text-sm text-muted-foreground">Corretivas</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">
                        {maintenanceHistory.filter(h => h.type === 'EMERGENCY').length}
                      </div>
                      <p className="text-sm text-muted-foreground">Emergenciais</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        R$ {totalMaintenanceCosts.toFixed(2)}
                      </div>
                      <p className="text-sm text-muted-foreground">Custo Total</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Next Maintenance */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Próxima Manutenção
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">
                        {new Date(equipment.nextMaintenance).toLocaleDateString('pt-BR')}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Manutenção preventiva programada
                      </p>
                    </div>
                    {(() => {
                      const days = Math.ceil((new Date(equipment.nextMaintenance).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
                      return (
                        <Badge variant={days < 0 ? 'destructive' : days <= 7 ? 'outline' : 'secondary'}>
                          {days < 0 ? `${Math.abs(days)}d em atraso` : `${days}d restantes`}
                        </Badge>
                      );
                    })()}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="alerts" className="space-y-4">
              {activeAlerts.length === 0 ? (
                <Card className="text-center py-12">
                  <CardContent>
                    <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                    <h3 className="text-lg font-medium mb-2">Nenhum alerta ativo</h3>
                    <p className="text-muted-foreground">
                      Todos os alertas foram verificados ou não há problemas detectados.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {activeAlerts.map(alert => (
                    <Alert 
                      key={alert.id}
                      className={`${alert.isAcknowledged ? 'opacity-60' : ''} ${
                        alert.priority === 'CRITICAL' ? 'border-red-500 bg-red-50' :
                        alert.priority === 'HIGH' ? 'border-orange-500 bg-orange-50' :
                        alert.priority === 'MEDIUM' ? 'border-yellow-500 bg-yellow-50' :
                        'border-blue-500 bg-blue-50'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className={getPriorityColor(alert.priority)}>
                            {getPriorityIcon(alert.priority)}
                          </div>
                          <div className="space-y-1">
                            <AlertDescription className="font-medium">
                              {alert.message}
                            </AlertDescription>
                            <p className="text-xs text-muted-foreground">
                              Vencimento: {new Date(alert.dueDate).toLocaleDateString('pt-BR')}
                              {alert.daysOverdue && ` (${alert.daysOverdue} dias em atraso)`}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Criado em: {new Date(alert.createdAt).toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                        </div>
                        {!alert.isAcknowledged && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => acknowledgeAlert(alert.id)}
                          >
                            Reconhecer
                          </Button>
                        )}
                      </div>
                    </Alert>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="history" className="space-y-4">
              <div className="space-y-4">
                {maintenanceHistory.map(record => (
                  <Card key={record.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base flex items-center gap-2">
                          <History className="h-4 w-4" />
                          {record.workOrderId}
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          <Badge variant={
                            record.type === 'PREVENTIVE' ? 'default' :
                            record.type === 'CORRECTIVE' ? 'secondary' : 
                            record.type === 'REQUEST' ? 'outline' : 'destructive'
                          }>
                            {record.type === 'PREVENTIVE' ? 'Preventiva' :
                             record.type === 'CORRECTIVE' ? 'Corretiva' :
                             record.type === 'REQUEST' ? 'Solicitação' : 'Emergencial'}
                          </Badge>
                          <Badge variant={record.status === 'COMPLETED' ? 'default' : 'outline'}>
                            {record.status === 'COMPLETED' ? 'Concluída' : 
                             record.status === 'PARTIAL' ? 'Parcial' : 'Cancelada'}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <h4 className="font-medium mb-2">Detalhes</h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span>{new Date(record.date).toLocaleDateString('pt-BR')}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <span>{record.duration}h de duração</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <DollarSign className="h-4 w-4 text-muted-foreground" />
                              <span>R$ {record.cost.toFixed(2)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Settings className="h-4 w-4 text-muted-foreground" />
                              <span>{record.performedBy}</span>
                            </div>
                          </div>
                        </div>
                        <div>
                          <h4 className="font-medium mb-2">Peças Utilizadas</h4>
                          <div className="space-y-1">
                            {record.partsUsed.map((part, index) => (
                              <div key={index} className="text-sm text-muted-foreground">
                                • {part}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-medium mb-2">Descrição</h4>
                        <p className="text-sm text-muted-foreground">
                          {record.description}
                        </p>
                      </div>

                      {record.findings && (
                        <div>
                          <h4 className="font-medium mb-2">Observações</h4>
                          <p className="text-sm text-muted-foreground">
                            {record.findings}
                          </p>
                        </div>
                      )}

                      {record.recommendations && (
                        <div>
                          <h4 className="font-medium mb-2">Recomendações</h4>
                          <p className="text-sm text-muted-foreground">
                            {record.recommendations}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}

                {maintenanceHistory.length === 0 && (
                  <Card className="text-center py-12">
                    <CardContent>
                      <History className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <h3 className="text-lg font-medium mb-2">Nenhum histórico encontrado</h3>
                      <p className="text-muted-foreground">
                        Este equipamento ainda não possui registros de manutenção.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            <TabsContent value="workorders" className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>OS</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Programada</TableHead>
                    <TableHead>Prioridade</TableHead>
                    <TableHead>Descrição</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {workOrders.map(order => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">{order.number}</TableCell>
                      <TableCell>
                        <Badge variant={
                          order.type === 'PREVENTIVE' ? 'default' : 
                          order.type === 'REQUEST' ? 'outline' : 'secondary'
                        }>
                          {order.type === 'PREVENTIVE' ? 'Preventiva' : 
                           order.type === 'REQUEST' ? 'Solicitação' : 'Corretiva'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          order.status === 'COMPLETED' ? 'default' :
                          order.status === 'IN_PROGRESS' ? 'secondary' : 'outline'
                        }>
                          {order.status === 'COMPLETED' ? 'Concluída' :
                           order.status === 'IN_PROGRESS' ? 'Em Andamento' : 'Aberta'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(order.scheduledDate).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          order.priority === 'CRITICAL' ? 'destructive' :
                          order.priority === 'HIGH' ? 'outline' : 'secondary'
                        }>
                          {order.priority === 'CRITICAL' ? 'Crítica' :
                           order.priority === 'HIGH' ? 'Alta' :
                           order.priority === 'MEDIUM' ? 'Média' : 'Baixa'}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {order.description}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {workOrders.length === 0 && (
                <Card className="text-center py-12">
                  <CardContent>
                    <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-medium mb-2">Nenhuma OS encontrada</h3>
                    <p className="text-muted-foreground">
                      Não há ordens de serviço ativas para este equipamento.
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}