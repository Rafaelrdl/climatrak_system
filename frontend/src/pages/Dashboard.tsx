import { PageHeader } from '@/shared/ui';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TechnicianPerformanceChart } from '@/components/charts/TechnicianPerformanceChart';
import { DataFilterInfo } from '@/components/data/FilteredDataProvider';
import { OnboardingProgressCard } from '@/components/onboarding/OnboardingProgressCard';
import { WelcomeGuide } from '@/components/tour/WelcomeGuide';
import { RoleDashboardSection, DashboardStatCard } from '@/components/dashboard';
import { 
  ClipboardList, 
  AlertTriangle, 
  AlertCircle, 
  Clock, 
  Activity,
  TrendingUp,
  User,
  LayoutDashboard,
  DollarSign,
  Settings2,
  Calendar,
  Package
} from 'lucide-react';
import { useDashboardKPIs, useChartData } from '@/hooks/useDataTemp';
import { useWorkOrders, useWorkOrderStats } from '@/hooks/useWorkOrdersQuery';
import { useEquipments } from '@/hooks/useEquipmentQuery';
import { useSectors } from '@/hooks/useLocationsQuery';
import { useDashboardFiltering } from '@/hooks/useDashboardFiltering';
import { useAbility } from '@/hooks/useAbility';
import { useCurrentUser } from '@/data/usersStore';
import { useSLAStore, calculateSLAStatus } from '@/store/useSLAStore';
import { useMemo } from 'react';

export function Dashboard() {
  const [kpis] = useDashboardKPIs();
  const [chartData] = useChartData();
  const { role } = useAbility();
  const currentUser = useCurrentUser();
  const currentUserId = currentUser?.id;
  const currentUserName = currentUser?.name;
  
  // Usar as mesmas ordens de serviço do sistema (React Query)
  const { data: workOrders = [] } = useWorkOrders();
  const { data: workOrderStats } = useWorkOrderStats();
  const { data: equipment = [] } = useEquipments();
  const { data: sectors = [] } = useSectors();
  const slaSettings = useSLAStore((state) => state.settings);
  
  const {
    filterDashboard,
    getDashboardConfig,
    getDashboardDescription,
    getAvailableWidgets
  } = useDashboardFiltering();

  // Get dashboard configuration based on role
  const dashboardConfig = getDashboardConfig();
  const availableWidgets = getAvailableWidgets();

  // Filtrar ordens de serviço para próximas manutenções (próximos 7 dias)
  const upcomingWorkOrders = useMemo(() => {
    const today = new Date();
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(today.getDate() + 7);
    const matchesTechnician = (wo: (typeof workOrders)[number]) => {
      if (!currentUserId && !currentUserName) return false;
      return (
        wo.assignedTo === currentUserId ||
        wo.assignedTo === currentUserName ||
        wo.assignedToName === currentUserName
      );
    };
    
    return (workOrders || [])
      .filter(wo => {
        const scheduledDate = new Date(wo.scheduledDate);
        // Apenas OS abertas ou em progresso
        const isUpcoming = wo.status === 'OPEN' || wo.status === 'IN_PROGRESS';
        // Dentro dos próximos 7 dias
        const isWithinRange = scheduledDate >= today && scheduledDate <= sevenDaysFromNow;
        
        // Filtrar baseado no papel do usuário
        if (role === 'technician') {
          // Técnico vê apenas as atribuídas a ele
          return isUpcoming && isWithinRange && matchesTechnician(wo);
        }
        
        return isUpcoming && isWithinRange;
      })
      .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime())
      .slice(0, 5); // Limitar a 5 para não poluir o dashboard
  }, [workOrders, role, currentUserId, currentUserName]);

  // Calcular evolução de OS por dia da semana baseado nos dados reais da API
  const weeklyEvolutionData = useMemo(() => {
    const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const today = new Date();
    const last7Days: { day: string; date: Date; completed: number; overdue: number; open: number }[] = [];
    
    // Criar array com os últimos 7 dias
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      date.setHours(0, 0, 0, 0);
      last7Days.push({
        day: dayNames[date.getDay()],
        date,
        completed: 0,
        overdue: 0,
        open: 0
      });
    }
    
    // Contar OS por dia
    (workOrders || []).forEach(wo => {
      // Determinar a data relevante para esta OS
      let relevantDate: Date | null = null;
      
      if (wo.status === 'COMPLETED' && wo.completedAt) {
        relevantDate = new Date(wo.completedAt);
      } else if (wo.createdAt) {
        relevantDate = new Date(wo.createdAt);
      } else if (wo.scheduledDate) {
        relevantDate = new Date(wo.scheduledDate);
      }
      
      if (!relevantDate) return;
      
      // Encontrar o dia correspondente
      const dayEntry = last7Days.find(d => {
        const entryDate = new Date(d.date);
        return entryDate.toDateString() === relevantDate!.toDateString();
      });
      
      if (!dayEntry) return;
      
      if (wo.status === 'COMPLETED') {
        dayEntry.completed++;
      } else if (wo.status === 'OPEN') {
        // Verificar se está em atraso
        const isOverdue = slaSettings.enabled && wo.createdAt
          ? (() => {
              const priority = wo.priority as 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
              const slaStatus = calculateSLAStatus(
                wo.createdAt,
                wo.startedAt,
                wo.completedAt,
                priority,
                slaSettings,
                wo.status
              );
              return slaStatus.responseStatus === 'breached' || slaStatus.resolutionStatus === 'breached';
            })()
          : new Date(wo.scheduledDate) < new Date();
        
        if (isOverdue) {
          dayEntry.overdue++;
        } else {
          dayEntry.open++;
        }
      } else if (wo.status === 'IN_PROGRESS') {
        // OS em progresso também pode estar em atraso
        const isOverdue = slaSettings.enabled && wo.createdAt
          ? (() => {
              const priority = wo.priority as 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
              const slaStatus = calculateSLAStatus(
                wo.createdAt,
                wo.startedAt,
                wo.completedAt,
                priority,
                slaSettings,
                wo.status
              );
              return slaStatus.resolutionStatus === 'breached';
            })()
          : false;
        
        if (isOverdue) {
          dayEntry.overdue++;
        } else {
          dayEntry.open++;
        }
      }
    });
    
    return last7Days.map(d => ({
      day: d.day,
      completed: d.completed,
      inProgress: d.overdue, // Renomear para manter compatibilidade com o gráfico (inProgress = overdue)
      open: d.open
    }));
  }, [workOrders, slaSettings]);

  // Calcular status dos equipamentos baseado nos dados reais da API
  const equipmentStatusData = useMemo(() => {
    const functioning = (equipment || []).filter(eq => eq.status === 'OK').length;
    const maintenance = (equipment || []).filter(eq => eq.status === 'MAINTENANCE').length;
    const stopped = (equipment || []).filter(eq => eq.status === 'STOPPED' || eq.status === 'ALERT').length;
    
    return {
      functioning,
      maintenance,
      stopped,
      total: functioning + maintenance + stopped
    };
  }, [equipment]);

  // Calcular KPIs baseados em dados reais da API
  const dashboardKPIs = useMemo(() => {
    // Usar estatísticas da API se disponíveis, senão calcular localmente
    const openWorkOrders = workOrderStats?.open ?? (workOrders || []).filter(wo => wo.status === 'OPEN').length;
    const inProgressWorkOrders = workOrderStats?.in_progress ?? (workOrders || []).filter(wo => wo.status === 'IN_PROGRESS').length;
    const completedWorkOrders = workOrderStats?.completed ?? (workOrders || []).filter(wo => wo.status === 'COMPLETED').length;
    
    // Calcular OS em atraso baseado no SLA de atendimento
    const overdueWorkOrders = (workOrders || []).filter(wo => {
      // Apenas OS abertas ou em execução podem estar em atraso
      if (wo.status === 'COMPLETED') return false;
      
      // Se SLA está habilitado, usa o cálculo de SLA
      if (slaSettings.enabled && wo.createdAt) {
        const priority = wo.priority as 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
        const slaStatus = calculateSLAStatus(
          wo.createdAt,
          wo.startedAt,
          wo.completedAt,
          priority,
          slaSettings,
          wo.status
        );
        
        // Considera em atraso se o SLA de atendimento ou resolução foi violado
        return slaStatus.responseStatus === 'breached' || slaStatus.resolutionStatus === 'breached';
      }
      
      // Fallback: usar data agendada se SLA não está habilitado
      return wo.status === 'OPEN' && new Date(wo.scheduledDate) < new Date();
    }).length;
    
    // Equipamentos críticos (prioridade alta/crítica) - usando tag ou tipo como critério
    const criticalEquipment = equipment.filter(eq => 
      eq.tag?.includes('CHI') || eq.type?.toLowerCase().includes('chiller')
    ).length;
    
    // MTTR e MTBF podem vir de cálculos mais complexos ou do metricsStore
    return {
      openWorkOrders,
      overdueWorkOrders,
      inProgressWorkOrders,
      completedWorkOrders,
      criticalEquipment,
      mttr: kpis?.mttr || 2.5,
      mtbf: kpis?.mtbf || 168
    };
  }, [workOrders, workOrderStats, equipment, kpis, slaSettings]);

  // Create mock dashboard data and apply role-based filtering
  const dashboardData = useMemo(() => {
    const mockData = {
      kpis: [
        { key: 'openWorkOrders', value: dashboardKPIs.openWorkOrders, label: 'OS em Aberto', sensitive: false },
        { key: 'overdueWorkOrders', value: dashboardKPIs.overdueWorkOrders, label: 'OS em Atraso', sensitive: false },
        { key: 'criticalEquipment', value: dashboardKPIs.criticalEquipment, label: 'Equipamentos Críticos', sensitive: false },
        { key: 'mttr', value: dashboardKPIs.mttr, label: 'MTTR', sensitive: false },
        { key: 'mtbf', value: dashboardKPIs.mtbf, label: 'MTBF', sensitive: false },
        // Role-specific KPIs
        ...(role === 'admin' ? [
          { key: 'totalCost', value: 25000, label: 'Custo Total', sensitive: true },
          { key: 'budgetUtilization', value: 78, label: 'Utilização do Orçamento (%)', sensitive: true }
        ] : [])
      ],
      workOrdersOverTime: chartData?.workOrderEvolution?.map((item: any) => ({
        label: item.day,
        value: item.completed + item.inProgress + item.open,
        category: 'workorders'
      })) || [],
      assetStatus: [
        { label: 'Funcionando', value: equipmentStatusData.functioning, category: 'assets' },
        { label: 'Em Manutenção', value: equipmentStatusData.maintenance, category: 'assets' },
        { label: 'Parado', value: equipmentStatusData.stopped, category: 'assets' }
      ],
      technicianPerformance: [], // Empty for now
      maintenanceMetrics: {
        mttr: kpis?.mttr || 0,
        mtbf: kpis?.mtbf || 0,
        uptime: 95.5,
        costMetrics: role === 'admin' ? {
          totalCost: 25000,
          costPerWorkOrder: 780,
          budgetUtilization: 78
        } : undefined
      },
      upcomingMaintenance: upcomingWorkOrders.map(wo => {
        const eq = equipment.find(e => e.id === wo.equipmentId);
        const sector = sectors.find(s => s.id === eq?.sectorId);
        const workOrderNumber = wo.number || wo.id;
        const equipmentLabel = eq?.tag || eq?.model || wo.equipmentId || 'Equipamento';
        
        const getTypeLabel = (type: string) => {
          switch(type) {
            case 'PREVENTIVE': return 'Manutenção Preventiva';
            case 'REQUEST': return 'Solicitação';
            default: return 'Manutenção Corretiva';
          }
        };
        
        return {
          id: wo.id,
          workOrderNumber,
          equipmentName: equipmentLabel,
          type: getTypeLabel(wo.type),
          scheduledDate: wo.scheduledDate,
          responsible: wo.assignedTo || 'Não atribuído',
          priority: wo.priority,
          assignedTo: wo.assignedTo,
          sectorId: eq?.sectorId,
          sectorName: sector?.name || 'Setor não definido'
        };
      }),
      recentActivity: [] // Would be populated with actual data
    };

    return filterDashboard(mockData);
  }, [kpis, chartData, role, filterDashboard, dashboardKPIs, equipment, sectors, upcomingWorkOrders, equipmentStatusData]);

  // Dados centralizados - usar dados da API para evolução de OS
  const weeklyData = weeklyEvolutionData.length > 0 ? weeklyEvolutionData : (chartData?.workOrderEvolution || []);
  const upcomingMaintenance = dashboardData.upcomingMaintenance || [];
  const filteredKPIs = dashboardData.kpis || [];

  // Calculate filter stats for display
  const filterStats = {
    total: (kpis?.openWorkOrders || 0) + (chartData?.upcomingMaintenance?.length || 0),
    visible: upcomingMaintenance.length + (filteredKPIs.length || 0),
    filtered: 0
  };

  // Verificar se é admin, owner ou operator para mostrar abas
  const showTabs = role === 'admin' || role === 'owner' || role === 'operator';

  // ==================== Componentes Reutilizáveis ====================
  
  // KPI Cards Component
  const KPICardsSection = ({ kpiList }: { kpiList: typeof filteredKPIs }) => (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5" data-tour="dashboard-kpis">
      {kpiList.map((kpi) => {
        let Icon = Activity;
        let variant: "default" | "primary" | "success" | "warning" | "danger" | "info" = "default";
        let trend: "up" | "down" | undefined;
        let trendValue: string | undefined;
        let description: string | undefined;
        let suffix: string | undefined;

        switch (kpi.key) {
          case 'openWorkOrders':
            Icon = ClipboardList;
            variant = "info";
            description = "Ordens aguardando atendimento";
            break;
          case 'overdueWorkOrders':
            Icon = AlertTriangle;
            variant = typeof kpi.value === 'number' && kpi.value > 0 ? "danger" : "success";
            description = typeof kpi.value === 'number' && kpi.value > 0 
              ? "Requer atenção imediata" 
              : "Sem atrasos no momento";
            break;
          case 'criticalEquipment':
            Icon = AlertCircle;
            variant = typeof kpi.value === 'number' && kpi.value > 0 ? "warning" : "success";
            description = "Equipamentos de alta prioridade";
            break;
          case 'mttr':
            Icon = Clock;
            variant = "success";
            trend = "down";
            trendValue = "-2h";
            suffix = "h";
            description = "Tempo médio de reparo";
            break;
          case 'mtbf':
            Icon = Activity;
            variant = "success";
            trend = "up";
            trendValue = "+5h";
            suffix = "h";
            description = "Tempo médio entre falhas";
            break;
          case 'totalCost':
            Icon = TrendingUp;
            variant = "warning";
            description = "Custo acumulado do período";
            break;
        }

        // Formatar valor
        let formattedValue: string | number = kpi.value;
        if (typeof kpi.value === 'number' && kpi.key.includes('Cost')) {
          formattedValue = `R$ ${kpi.value.toLocaleString()}`;
          suffix = undefined;
        } else if (typeof kpi.value === 'number' && kpi.key.includes('Percent')) {
          suffix = "%";
        }

        return (
          <DashboardStatCard
            key={kpi.key}
            title={kpi.label}
            value={formattedValue}
            suffix={suffix}
            icon={<Icon className="h-4 w-4" />}
            variant={variant}
            trend={trend}
            trendValue={trendValue}
            description={description}
          />
        );
      })}
    </div>
  );

  // Evolução de OS Chart Component
  const WorkOrderEvolutionChart = () => (
    <Card className="bg-card text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Evolução de OS por Dia
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-end justify-between h-40 border-b border-border">
            {weeklyData.map((day) => (
              <div key={day.day} className="flex flex-col items-center gap-2 group">
                <div className="flex flex-col items-center gap-1 relative">
                  <div className="invisible group-hover:visible absolute -top-16 left-1/2 transform -translate-x-1/2 bg-popover text-popover-foreground px-3 py-2 rounded-lg shadow-lg border text-xs whitespace-nowrap z-10">
                    <div className="font-medium mb-1">{day.day}</div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded" style={{ backgroundColor: 'var(--primary)' }}></div>
                        <span>Concluído: {day.completed}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded" style={{ backgroundColor: 'var(--destructive)' }}></div>
                        <span>Em Atraso: {day.inProgress}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded" style={{ backgroundColor: 'var(--secondary)' }}></div>
                        <span>Aberto: {day.open}</span>
                      </div>
                    </div>
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-popover"></div>
                  </div>
                  
                  <div 
                    className="w-6 rounded-t chart-bar"
                    style={{ height: `${day.completed * 8}px`, backgroundColor: 'var(--primary)' }}
                    title={`Concluído: ${day.completed}`}
                  />
                  <div 
                    className="w-6 rounded-t chart-bar"
                    style={{ height: `${day.inProgress * 8}px`, backgroundColor: 'var(--destructive)' }}
                    title={`Em Atraso: ${day.inProgress}`}
                  />
                  <div 
                    className="w-6 rounded-t chart-bar"
                    style={{ height: `${day.open * 8}px`, backgroundColor: 'var(--secondary)' }}
                    title={`Aberto: ${day.open}`}
                  />
                </div>
                <span className="text-xs text-muted-foreground transition-colors group-hover:text-foreground">{day.day}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2 hover:bg-muted/50 rounded-lg px-2 py-1 transition-colors cursor-pointer group">
              <div className="w-3 h-3 rounded transition-transform group-hover:scale-110" style={{ backgroundColor: 'var(--primary)' }} />
              <span className="transition-colors group-hover:text-foreground">Concluído</span>
            </div>
            <div className="flex items-center gap-2 hover:bg-muted/50 rounded-lg px-2 py-1 transition-colors cursor-pointer group">
              <div className="w-3 h-3 rounded transition-transform group-hover:scale-110" style={{ backgroundColor: 'var(--destructive)' }} />
              <span className="transition-colors group-hover:text-foreground">Em Atraso</span>
            </div>
            <div className="flex items-center gap-2 hover:bg-muted/50 rounded-lg px-2 py-1 transition-colors cursor-pointer group">
              <div className="w-3 h-3 rounded transition-transform group-hover:scale-110" style={{ backgroundColor: 'var(--secondary)' }} />
              <span className="transition-colors group-hover:text-foreground">Aberto</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // Status dos Ativos Chart Component
  const AssetStatusChart = () => (
    <Card>
      <CardHeader>
        <CardTitle>Status dos Ativos</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-center">
            {(() => {
              const equipmentStatus = equipmentStatusData;
              const total = equipmentStatus.functioning + equipmentStatus.maintenance + equipmentStatus.stopped;
              
              if (total === 0) return <div className="text-muted-foreground">Sem dados disponíveis</div>;
              
              const functioningPercent = (equipmentStatus.functioning / total) * 100;
              const maintenancePercent = (equipmentStatus.maintenance / total) * 100;
              const stoppedPercent = (equipmentStatus.stopped / total) * 100;
              
              const circumference = 2 * Math.PI * 40;
              const functioningLength = (functioningPercent / 100) * circumference;
              const maintenanceLength = (maintenancePercent / 100) * circumference;
              const stoppedLength = (stoppedPercent / 100) * circumference;
              
              return (
                <div className="relative w-32 h-32 group">
                  <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="40" fill="transparent" stroke="rgb(229 231 235)" strokeWidth="10" />
                    {equipmentStatus.functioning > 0 && (
                      <circle cx="50" cy="50" r="40" fill="transparent" stroke="#006b76" strokeWidth="10"
                        strokeDasharray={`${functioningLength} ${circumference}`} strokeDashoffset="0" strokeLinecap="round" />
                    )}
                    {equipmentStatus.maintenance > 0 && (
                      <circle cx="50" cy="50" r="40" fill="transparent" stroke="rgb(234 179 8)" strokeWidth="10"
                        strokeDasharray={`${maintenanceLength} ${circumference}`} strokeDashoffset={-functioningLength} strokeLinecap="round" />
                    )}
                    {equipmentStatus.stopped > 0 && (
                      <circle cx="50" cy="50" r="40" fill="transparent" stroke="#dc2626" strokeWidth="10"
                        strokeDasharray={`${stoppedLength} ${circumference}`} strokeDashoffset={-(functioningLength + maintenanceLength)} strokeLinecap="round" />
                    )}
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-bold transition-colors group-hover:text-primary">{total}</span>
                  </div>
                </div>
              );
            })()}
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between hover:bg-muted/50 rounded-lg px-2 py-1 transition-colors cursor-pointer">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: 'var(--primary)' }} />
                <span className="text-sm">Funcionando</span>
              </div>
              <span className="text-sm font-medium">{equipmentStatusData.functioning}</span>
            </div>
            <div className="flex items-center justify-between hover:bg-muted/50 rounded-lg px-2 py-1 transition-colors cursor-pointer">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-yellow-500 rounded" />
                <span className="text-sm">Em Manutenção</span>
              </div>
              <span className="text-sm font-medium">{equipmentStatusData.maintenance}</span>
            </div>
            <div className="flex items-center justify-between hover:bg-muted/50 rounded-lg px-2 py-1 transition-colors cursor-pointer">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: 'var(--destructive)' }} />
                <span className="text-sm">Parado</span>
              </div>
              <span className="text-sm font-medium">{equipmentStatusData.stopped}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // Próximas Manutenções Table Component
  const UpcomingMaintenanceTable = () => (
    <Card data-tour="next-maintenances">
      <CardHeader>
        <CardTitle>Próximas Manutenções (7 dias)</CardTitle>
      </CardHeader>
      <CardContent>
        {upcomingMaintenance.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhuma manutenção programada para os próximos 7 dias
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>OS</TableHead>
                <TableHead>Equipamento</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Prioridade</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {upcomingMaintenance.map((maintenance) => (
                <TableRow key={maintenance.id}>
                  <TableCell className="font-medium">{maintenance.workOrderNumber || maintenance.id}</TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{maintenance.equipmentName}</div>
                      <div className="text-xs text-muted-foreground">{maintenance.sectorName || 'Setor não definido'}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={maintenance.type === 'Manutenção Preventiva' ? 'default' : maintenance.type === 'Solicitação' ? 'outline' : 'secondary'}
                      className={maintenance.type === 'Solicitação' ? 'bg-violet-100 text-violet-700 border-violet-200' : ''}>
                      {maintenance.type}
                    </Badge>
                  </TableCell>
                  <TableCell>{new Date(maintenance.scheduledDate).toLocaleDateString('pt-BR')}</TableCell>
                  <TableCell>
                    <Badge variant={maintenance.priority === 'CRITICAL' ? 'destructive' : maintenance.priority === 'HIGH' ? 'outline' : 'secondary'}>
                      {maintenance.priority === 'CRITICAL' ? 'Crítica' : maintenance.priority === 'HIGH' ? 'Alta' : maintenance.priority === 'MEDIUM' ? 'Média' : 'Baixa'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );

  // ==================== Render para Admin/Owner/Operator com Abas ====================
  if (showTabs) {
    // KPIs operacionais para a aba Visão Geral
    const operationalKPIs = filteredKPIs.filter(kpi => 
      ['openWorkOrders', 'overdueWorkOrders', 'criticalEquipment', 'mttr', 'mtbf'].includes(kpi.key)
    );

    // Verificar se é admin/owner para mostrar aba financeira
    const isAdminOrOwner = role === 'admin' || role === 'owner';

    return (
      <div className="space-y-6">
        <PageHeader 
          title={dashboardConfig.title}
          description={getDashboardDescription()}
        />

        <OnboardingProgressCard />

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="overview" className="gap-2">
              <LayoutDashboard className="h-4 w-4" />
              Visão Geral
            </TabsTrigger>
            {isAdminOrOwner && (
              <TabsTrigger value="finance" className="gap-2">
                <DollarSign className="h-4 w-4" />
                Financeiro
              </TabsTrigger>
            )}
            {isAdminOrOwner ? (
              <TabsTrigger value="operations" className="gap-2">
                <Settings2 className="h-4 w-4" />
                Operacional
              </TabsTrigger>
            ) : (
              <>
                <TabsTrigger value="plans" className="gap-2">
                  <Calendar className="h-4 w-4" />
                  Planos
                </TabsTrigger>
                <TabsTrigger value="inventory" className="gap-2">
                  <Package className="h-4 w-4" />
                  Estoque
                </TabsTrigger>
              </>
            )}
          </TabsList>

          {/* ==================== ABA VISÃO GERAL ==================== */}
          <TabsContent value="overview" className="space-y-6 mt-0">
            <div className="text-sm text-muted-foreground mb-2">
              Resumo consolidado das principais métricas do sistema
            </div>
            
            {/* KPIs Operacionais */}
            {availableWidgets.includes('kpis') && operationalKPIs.length > 0 && (
              <KPICardsSection kpiList={operationalKPIs} />
            )}

            {/* Gráficos lado a lado */}
            <div className="grid gap-6 lg:grid-cols-2" data-tour="dashboard-charts">
              {availableWidgets.includes('workOrdersChart') && <WorkOrderEvolutionChart />}
              {availableWidgets.includes('assetStatusChart') && <AssetStatusChart />}
            </div>

            {/* Próximas Manutenções */}
            {availableWidgets.includes('upcomingMaintenance') && <UpcomingMaintenanceTable />}
          </TabsContent>

          {/* ==================== ABA FINANCEIRO (Admin/Owner only) ==================== */}
          {isAdminOrOwner && (
            <TabsContent value="finance" className="space-y-6 mt-0">
              <div className="text-sm text-muted-foreground mb-2">
                Acompanhamento de orçamento, variância e economia
              </div>

              {/* Widgets específicos do Finance (do RoleDashboardSection) */}
              <RoleDashboardSection variant="finance" />
            </TabsContent>
          )}

          {/* ==================== ABA OPERACIONAL (Admin/Owner) ==================== */}
          {isAdminOrOwner && (
            <TabsContent value="operations" className="space-y-6 mt-0">
              <div className="text-sm text-muted-foreground mb-2">
                Gestão de planos preventivos, estoque e desempenho da equipe
              </div>
              
              {/* Widgets de Planos e Estoque (do RoleDashboardSection) */}
              <RoleDashboardSection variant="operations" />

              {/* Desempenho por Técnico */}
              {availableWidgets.includes('technicianPerformanceChart') && (
                <TechnicianPerformanceChart />
              )}
            </TabsContent>
          )}

          {/* ==================== ABA PLANOS (Operator only) ==================== */}
          {role === 'operator' && (
            <TabsContent value="plans" className="space-y-6 mt-0">
              <div className="text-sm text-muted-foreground mb-2">
                Acompanhamento de planos preventivos e manutenções programadas
              </div>
              
              {/* Widgets de Planos Preventivos */}
              <RoleDashboardSection variant="plans" />

              {/* Próximas Manutenções */}
              {availableWidgets.includes('upcomingMaintenance') && <UpcomingMaintenanceTable />}
            </TabsContent>
          )}

          {/* ==================== ABA ESTOQUE (Operator only) ==================== */}
          {role === 'operator' && (
            <TabsContent value="inventory" className="space-y-6 mt-0">
              <div className="text-sm text-muted-foreground mb-2">
                Monitoramento de itens em estoque e alertas de reposição
              </div>
              
              {/* Widgets de Estoque */}
              <RoleDashboardSection variant="inventory" />
            </TabsContent>
          )}
        </Tabs>

        <WelcomeGuide />
      </div>
    );
  }

  // ==================== Render para outros papéis (sem abas) ====================
  return (
    <div className="space-y-6">
      <PageHeader 
        title={dashboardConfig.title}
        description={getDashboardDescription()}
      />
      
      {/* Role-based data filtering info */}
      <DataFilterInfo
        filterStats={filterStats}
        dataType="dashboard"
        canViewAll={false}
        className="mb-4"
      />

      {/* Onboarding Progress Card for new users */}
      <OnboardingProgressCard />

      {/* Role-specific Dashboard Section */}
      <RoleDashboardSection className="mb-6" />

      {/* KPI Cards - filtered based on role */}
      {availableWidgets.includes('kpis') && (
        <KPICardsSection kpiList={filteredKPIs} />
      )}

      <div className="grid gap-6 lg:grid-cols-2" data-tour="dashboard-charts">
        {availableWidgets.includes('workOrdersChart') && <WorkOrderEvolutionChart />}
        {availableWidgets.includes('assetStatusChart') && <AssetStatusChart />}
      </div>

      {availableWidgets.includes('technicianPerformanceChart') && (
        <TechnicianPerformanceChart />
      )}

      {availableWidgets.includes('upcomingMaintenance') && <UpcomingMaintenanceTable />}
      
      <WelcomeGuide />
    </div>
  );
}
