import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Activity, 
  BarChart3, 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Zap, 
  AlertTriangle,
  Clock,
  Gauge,
  PieChart,
  MapPin,
  Target,
  Thermometer,
  LayoutGrid,
  Award,
  List,
  ChevronRight,
  HelpCircle,
  Check
} from 'lucide-react';
import { MOCK_COMPANIES, MOCK_SECTORS, MOCK_SUBSECTIONS } from '@/data/mockData';
import type { AssetUtilization, LocationCostAnalysis, Equipment } from '@/types';

interface AssetUtilizationDashboardProps {
  equipment: Equipment[];
  selectedLocation?: string;
  selectedPeriod?: string;
}

export function AssetUtilizationDashboard({ 
  equipment,
  selectedLocation,
  selectedPeriod 
}: AssetUtilizationDashboardProps) {
  const [activeTab, setActiveTab] = useState('utilization');
  const [selectedTimeframe, setSelectedTimeframe] = useState(selectedPeriod);
  
  // Estados para a aba "Por Localização"
  const [locationFilterType, setLocationFilterType] = useState('all');
  const [locationSortBy, setLocationSortBy] = useState('cost-high');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  // Mock data generation - in real app, this would come from API
  const utilizationData = useMemo<AssetUtilization[]>(() => {
    return equipment.map(eq => ({
      equipmentId: eq.id,
      avgOperatingHours: Math.floor(Math.random() * 12) + 8, // 8-20 hours per day
      utilizationRate: Math.floor(Math.random() * 40) + 60, // 60-100%
      energyConsumption: Math.floor(Math.random() * 200) + 150, // 150-350 kWh
      maintenanceCosts: Math.floor(Math.random() * 500) + 200, // R$ 200-700
      downtimeHours: Math.floor(Math.random() * 24), // 0-24 hours
      efficiency: Math.floor(Math.random() * 20) + 80, // 80-100%
      lastUpdated: new Date().toISOString()
    }));
  }, [equipment]);

  const locationCostData = useMemo<LocationCostAnalysis[]>(() => {
    // Filter equipment based on selected location
    let filteredEquipment = equipment;
    
    if (selectedLocation) {
      filteredEquipment = equipment.filter(eq => {
        // If selected location is a company, show equipment from all sectors/subsections of that company
        if (MOCK_COMPANIES.find(c => c.id === selectedLocation)) {
          const companyId = selectedLocation;
          const companySectors = MOCK_SECTORS.filter(s => s.companyId === companyId);
          const companySectorIds = companySectors.map(s => s.id);
          const companySubsections = MOCK_SUBSECTIONS.filter(ss => 
            companySectors.some(s => s.id === ss.sectorId)
          );
          const companySubsectionIds = companySubsections.map(ss => ss.id);
          
          return companySectorIds.includes(eq.sectorId!) || companySubsectionIds.includes(eq.subSectionId!);
        }
        
        // If selected location is a sector, show equipment from that sector and its subsections
        if (MOCK_SECTORS.find(s => s.id === selectedLocation)) {
          const sectorId = selectedLocation;
          const sectorSubsections = MOCK_SUBSECTIONS.filter(ss => ss.sectorId === sectorId);
          const sectorSubsectionIds = sectorSubsections.map(ss => ss.id);
          
          return eq.sectorId === sectorId || sectorSubsectionIds.includes(eq.subSectionId!);
        }
        
        // If selected location is a subsection, show only equipment from that subsection
        if (MOCK_SUBSECTIONS.find(ss => ss.id === selectedLocation)) {
          return eq.subSectionId === selectedLocation;
        }
        
        return true;
      });
    }

    // Group equipment by sector and subsection
    const sectorGroups = filteredEquipment.reduce((acc, eq) => {
      if (eq.sectorId) {
        if (!acc[eq.sectorId]) {
          acc[eq.sectorId] = [];
        }
        acc[eq.sectorId].push(eq);
      }
      return acc;
    }, {} as Record<string, Equipment[]>);

    const subsectionGroups = equipment.reduce((acc, eq) => {
      if (eq.subSectionId) {
        if (!acc[eq.subSectionId]) {
          acc[eq.subSectionId] = [];
        }
        acc[eq.subSectionId].push(eq);
      }
      return acc;
    }, {} as Record<string, Equipment[]>);

    // Process sectors
    const sectorAnalysis = Object.entries(sectorGroups).map(([sectorId, equipments]) => {
      const sector = MOCK_SECTORS.find(s => s.id === sectorId);
      const company = MOCK_COMPANIES.find(c => c.id === sector?.companyId);
      
      const totalEquipment = equipments.length;
      const totalMaintenanceCosts = equipments.reduce((total, eq) => {
        const utilizationItem = utilizationData.find(u => u.equipmentId === eq.id);
        return total + (utilizationItem?.maintenanceCosts || 0);
      }, 0);

      const preventiveCosts = totalMaintenanceCosts * 0.6;
      const correctiveCosts = totalMaintenanceCosts * 0.3;
      const emergencyCosts = totalMaintenanceCosts * 0.1;
      const energyCosts = equipments.reduce((total, eq) => {
        const utilizationItem = utilizationData.find(u => u.equipmentId === eq.id);
        return total + (utilizationItem?.energyConsumption || 0) * 0.6;
      }, 0);

      const totalDowntimeHours = equipments.reduce((total, eq) => {
        const utilizationItem = utilizationData.find(u => u.equipmentId === eq.id);
        return total + (utilizationItem?.downtimeHours || 0);
      }, 0);

      const costTrends = Array.from({ length: 12 }, (_, i) => ({
        period: new Date(2024, i, 1).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }),
        cost: Math.floor(Math.random() * totalMaintenanceCosts * 0.3) + totalMaintenanceCosts * 0.7
      }));

      return {
        locationId: sectorId,
        locationName: sector?.name || `Setor ${sectorId}`,
        locationType: 'sector' as const,
        locationPath: `${company?.name || 'Empresa'} > ${sector?.name || `Setor ${sectorId}`}`,
        totalEquipment,
        totalMaintenanceCosts: Math.round(totalMaintenanceCosts),
        avgCostPerEquipment: Math.round(totalMaintenanceCosts / totalEquipment),
        preventiveCosts: Math.round(preventiveCosts),
        correctiveCosts: Math.round(correctiveCosts),
        emergencyCosts: Math.round(emergencyCosts),
        energyCosts: Math.round(energyCosts),
        totalDowntimeHours,
        costTrends
      };
    });

    // Process subsections
    const subsectionAnalysis = Object.entries(subsectionGroups).map(([subsectionId, equipments]) => {
      const subsection = MOCK_SUBSECTIONS.find(ss => ss.id === subsectionId);
      const sector = MOCK_SECTORS.find(s => s.id === subsection?.sectorId);
      const company = MOCK_COMPANIES.find(c => c.id === sector?.companyId);
      
      const totalEquipment = equipments.length;
      const totalMaintenanceCosts = equipments.reduce((total, eq) => {
        const utilizationItem = utilizationData.find(u => u.equipmentId === eq.id);
        return total + (utilizationItem?.maintenanceCosts || 0);
      }, 0);

      const preventiveCosts = totalMaintenanceCosts * 0.6;
      const correctiveCosts = totalMaintenanceCosts * 0.3;
      const emergencyCosts = totalMaintenanceCosts * 0.1;
      const energyCosts = equipments.reduce((total, eq) => {
        const utilizationItem = utilizationData.find(u => u.equipmentId === eq.id);
        return total + (utilizationItem?.energyConsumption || 0) * 0.6;
      }, 0);

      const totalDowntimeHours = equipments.reduce((total, eq) => {
        const utilizationItem = utilizationData.find(u => u.equipmentId === eq.id);
        return total + (utilizationItem?.downtimeHours || 0);
      }, 0);

      const costTrends = Array.from({ length: 12 }, (_, i) => ({
        period: new Date(2024, i, 1).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }),
        cost: Math.floor(Math.random() * totalMaintenanceCosts * 0.3) + totalMaintenanceCosts * 0.7
      }));

      return {
        locationId: subsectionId,
        locationName: subsection?.name || `Subsetor ${subsectionId}`,
        locationType: 'subsection' as const,
        locationPath: `${company?.name || 'Empresa'} > ${sector?.name || 'Setor'} > ${subsection?.name || `Subsetor ${subsectionId}`}`,
        totalEquipment,
        totalMaintenanceCosts: Math.round(totalMaintenanceCosts),
        avgCostPerEquipment: Math.round(totalMaintenanceCosts / totalEquipment),
        preventiveCosts: Math.round(preventiveCosts),
        correctiveCosts: Math.round(correctiveCosts),
        emergencyCosts: Math.round(emergencyCosts),
        energyCosts: Math.round(energyCosts),
        totalDowntimeHours,
        costTrends
      };
    });

    return [...sectorAnalysis, ...subsectionAnalysis].filter(location => location.totalEquipment > 0);
  }, [equipment, utilizationData, selectedLocation]);

  // Calculate overall metrics
  const overallMetrics = useMemo(() => {
    // Filter utilization data based on selected location
    let filteredUtilizationData = utilizationData;
    
    if (selectedLocation) {
      const filteredEquipmentIds = equipment.filter(eq => {
        // If selected location is a company, include equipment from all sectors/subsections of that company
        if (MOCK_COMPANIES.find(c => c.id === selectedLocation)) {
          const companyId = selectedLocation;
          const companySectors = MOCK_SECTORS.filter(s => s.companyId === companyId);
          const companySectorIds = companySectors.map(s => s.id);
          const companySubsections = MOCK_SUBSECTIONS.filter(ss => 
            companySectors.some(s => s.id === ss.sectorId)
          );
          const companySubsectionIds = companySubsections.map(ss => ss.id);
          
          return companySectorIds.includes(eq.sectorId!) || companySubsectionIds.includes(eq.subSectionId!);
        }
        
        // If selected location is a sector, include equipment from that sector and its subsections
        if (MOCK_SECTORS.find(s => s.id === selectedLocation)) {
          const sectorId = selectedLocation;
          const sectorSubsections = MOCK_SUBSECTIONS.filter(ss => ss.sectorId === sectorId);
          const sectorSubsectionIds = sectorSubsections.map(ss => ss.id);
          
          return eq.sectorId === sectorId || sectorSubsectionIds.includes(eq.subSectionId!);
        }
        
        // If selected location is a subsection, include only equipment from that subsection
        if (MOCK_SUBSECTIONS.find(ss => ss.id === selectedLocation)) {
          return eq.subSectionId === selectedLocation;
        }
        
        return true;
      }).map(eq => eq.id);
      
      filteredUtilizationData = utilizationData.filter(item => 
        filteredEquipmentIds.includes(item.equipmentId)
      );
    }
    
    if (filteredUtilizationData.length === 0) {
      return {
        avgUtilization: 0,
        totalEnergyCost: 0,
        totalMaintenanceCost: 0,
        totalDowntime: 0,
        avgEfficiency: 0,
        totalOperatingCost: 0
      };
    }
    
    const avgUtilization = filteredUtilizationData.reduce((sum, item) => sum + item.utilizationRate, 0) / filteredUtilizationData.length;
    const totalEnergyCost = filteredUtilizationData.reduce((sum, item) => sum + item.energyConsumption * 0.6, 0);
    const totalMaintenanceCost = filteredUtilizationData.reduce((sum, item) => sum + item.maintenanceCosts, 0);
    const totalDowntime = filteredUtilizationData.reduce((sum, item) => sum + item.downtimeHours, 0);
    const avgEfficiency = filteredUtilizationData.reduce((sum, item) => sum + item.efficiency, 0) / filteredUtilizationData.length;

    return {
      avgUtilization: Math.round(avgUtilization * 10) / 10,
      totalEnergyCost: Math.round(totalEnergyCost),
      totalMaintenanceCost: Math.round(totalMaintenanceCost),
      totalDowntime,
      avgEfficiency: Math.round(avgEfficiency * 10) / 10,
      totalOperatingCost: Math.round(totalEnergyCost + totalMaintenanceCost)
    };
  }, [utilizationData, selectedLocation, equipment]);

  const getUtilizationColor = (rate: number) => {
    if (rate >= 85) return 'text-green-600';
    if (rate >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getEfficiencyColor = (efficiency: number) => {
    if (efficiency >= 90) return 'text-green-600';
    if (efficiency >= 80) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* Header with Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Análise de Utilização de Ativos</h2>
          <p className="text-muted-foreground">
            Métricas de desempenho e análise de custos por local
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedTimeframe} onValueChange={setSelectedTimeframe}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">7 dias</SelectItem>
              <SelectItem value="30d">30 dias</SelectItem>
              <SelectItem value="90d">90 dias</SelectItem>
              <SelectItem value="1y">1 ano</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Utilização Média</CardTitle>
            <Gauge className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallMetrics.avgUtilization}%</div>
            <Progress value={overallMetrics.avgUtilization} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Eficiência Média</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallMetrics.avgEfficiency}%</div>
            <Progress value={overallMetrics.avgEfficiency} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Custo Operacional</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ {overallMetrics.totalOperatingCost.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">Energia + Manutenção</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tempo de Parada</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallMetrics.totalDowntime}h</div>
            <p className="text-xs text-muted-foreground mt-1">Total no período</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Ativos</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{equipment.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Equipamentos monitorados</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="utilization">Utilização de Ativos</TabsTrigger>
          <TabsTrigger value="costs">Análise de Custos</TabsTrigger>
          <TabsTrigger value="locations">Por Localização</TabsTrigger>
        </TabsList>

        <TabsContent value="utilization" className="space-y-6">
          {/* Equipment Utilization Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Utilização por Equipamento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Equipamento</TableHead>
                    <TableHead>Utilização</TableHead>
                    <TableHead>Eficiência</TableHead>
                    <TableHead>Horas Op./Dia</TableHead>
                    <TableHead>Consumo Energético</TableHead>
                    <TableHead>Tempo Parado</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {equipment.map(eq => {
                    const utilization = utilizationData.find(u => u.equipmentId === eq.id);
                    if (!utilization) return null;

                    return (
                      <TableRow key={eq.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{eq.tag}</div>
                            <div className="text-sm text-muted-foreground">
                              {eq.brand} {eq.model}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className={`text-sm font-medium ${getUtilizationColor(utilization.utilizationRate)}`}>
                              {utilization.utilizationRate}%
                            </div>
                            <Progress 
                              value={utilization.utilizationRate} 
                              className="w-16 h-2"
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className={`text-sm font-medium ${getEfficiencyColor(utilization.efficiency)}`}>
                              {utilization.efficiency}%
                            </div>
                            <Progress 
                              value={utilization.efficiency} 
                              className="w-16 h-2"
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span>{utilization.avgOperatingHours}h</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Zap className="h-4 w-4 text-muted-foreground" />
                            <span>{utilization.energyConsumption} kWh</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                            <span>{utilization.downtimeHours}h</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={
                            eq.status === 'FUNCTIONING' ? 'default' :
                            eq.status === 'MAINTENANCE' ? 'secondary' : 'destructive'
                          }>
                            {eq.status === 'FUNCTIONING' ? 'Funcionando' :
                             eq.status === 'MAINTENANCE' ? 'Manutenção' : 'Parado'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Performance Charts */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Thermometer className="h-5 w-5" />
                  Distribuição de Eficiência
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { range: '90-100%', count: utilizationData.filter(u => u.efficiency >= 90).length, color: 'bg-green-500' },
                    { range: '80-89%', count: utilizationData.filter(u => u.efficiency >= 80 && u.efficiency < 90).length, color: 'bg-yellow-500' },
                    { range: '70-79%', count: utilizationData.filter(u => u.efficiency >= 70 && u.efficiency < 80).length, color: 'bg-orange-500' },
                    { range: '< 70%', count: utilizationData.filter(u => u.efficiency < 70).length, color: 'bg-red-500' }
                  ].map(item => (
                    <div key={item.range} className="flex items-center gap-4">
                      <div className="w-20 text-sm">{item.range}</div>
                      <div className="flex-1 bg-muted rounded-full h-4 relative">
                        <div 
                          className={`h-4 rounded-full ${item.color} transition-all duration-300`}
                          style={{ width: `${(item.count / equipment.length) * 100}%` }}
                        />
                      </div>
                      <div className="w-12 text-sm text-right">{item.count}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gauge className="h-5 w-5" />
                  Distribuição de Utilização
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { range: '85-100%', count: utilizationData.filter(u => u.utilizationRate >= 85).length, color: 'bg-green-500' },
                    { range: '70-84%', count: utilizationData.filter(u => u.utilizationRate >= 70 && u.utilizationRate < 85).length, color: 'bg-yellow-500' },
                    { range: '50-69%', count: utilizationData.filter(u => u.utilizationRate >= 50 && u.utilizationRate < 70).length, color: 'bg-orange-500' },
                    { range: '< 50%', count: utilizationData.filter(u => u.utilizationRate < 50).length, color: 'bg-red-500' }
                  ].map(item => (
                    <div key={item.range} className="flex items-center gap-4">
                      <div className="w-20 text-sm">{item.range}</div>
                      <div className="flex-1 bg-muted rounded-full h-4 relative">
                        <div 
                          className={`h-4 rounded-full ${item.color} transition-all duration-300`}
                          style={{ width: `${(item.count / equipment.length) * 100}%` }}
                        />
                      </div>
                      <div className="w-12 text-sm text-right">{item.count}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="costs" className="space-y-6">
          {/* Cost Breakdown */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Distribuição de Custos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { 
                      label: 'Energia', 
                      value: overallMetrics.totalEnergyCost, 
                      color: 'bg-blue-500',
                      percentage: (overallMetrics.totalEnergyCost / overallMetrics.totalOperatingCost) * 100
                    },
                    { 
                      label: 'Manutenção Preventiva', 
                      value: Math.round(overallMetrics.totalMaintenanceCost * 0.6), 
                      color: 'bg-green-500',
                      percentage: (overallMetrics.totalMaintenanceCost * 0.6 / overallMetrics.totalOperatingCost) * 100
                    },
                    { 
                      label: 'Manutenção Corretiva', 
                      value: Math.round(overallMetrics.totalMaintenanceCost * 0.3), 
                      color: 'bg-yellow-500',
                      percentage: (overallMetrics.totalMaintenanceCost * 0.3 / overallMetrics.totalOperatingCost) * 100
                    },
                    { 
                      label: 'Emergencial', 
                      value: Math.round(overallMetrics.totalMaintenanceCost * 0.1), 
                      color: 'bg-red-500',
                      percentage: (overallMetrics.totalMaintenanceCost * 0.1 / overallMetrics.totalOperatingCost) * 100
                    }
                  ].map(item => (
                    <div key={item.label} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded ${item.color}`} />
                          <span className="text-sm">{item.label}</span>
                        </div>
                        <span className="text-sm font-medium">
                          R$ {item.value.toLocaleString()} ({item.percentage.toFixed(1)}%)
                        </span>
                      </div>
                      <Progress value={item.percentage} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Custo por Equipamento
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600">
                      R$ {Math.round(overallMetrics.totalOperatingCost / equipment.length).toLocaleString()}
                    </div>
                    <p className="text-sm text-muted-foreground">Custo médio por equipamento</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <div className="text-lg font-semibold">
                        R$ {Math.round(overallMetrics.totalEnergyCost / equipment.length).toLocaleString()}
                      </div>
                      <p className="text-xs text-muted-foreground">Energia</p>
                    </div>
                    <div>
                      <div className="text-lg font-semibold">
                        R$ {Math.round(overallMetrics.totalMaintenanceCost / equipment.length).toLocaleString()}
                      </div>
                      <p className="text-xs text-muted-foreground">Manutenção</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Equipment Cost Ranking */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Ranking de Custos por Equipamento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Equipamento</TableHead>
                    <TableHead>Energia (R$)</TableHead>
                    <TableHead>Manutenção (R$)</TableHead>
                    <TableHead>Total (R$)</TableHead>
                    <TableHead>Custo/BTU</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {equipment
                    .map(eq => {
                      const utilization = utilizationData.find(u => u.equipmentId === eq.id);
                      const energyCost = (utilization?.energyConsumption || 0) * 0.6;
                      const maintenanceCost = utilization?.maintenanceCosts || 0;
                      const totalCost = energyCost + maintenanceCost;
                      const costPerBTU = totalCost / eq.capacity;
                      
                      return {
                        ...eq,
                        energyCost,
                        maintenanceCost,
                        totalCost,
                        costPerBTU
                      };
                    })
                    .sort((a, b) => b.totalCost - a.totalCost)
                    .slice(0, 10)
                    .map(eq => (
                      <TableRow key={eq.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{eq.tag}</div>
                            <div className="text-sm text-muted-foreground">
                              {eq.brand} {eq.model}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>R$ {Math.round(eq.energyCost).toLocaleString()}</TableCell>
                        <TableCell>R$ {Math.round(eq.maintenanceCost).toLocaleString()}</TableCell>
                        <TableCell className="font-medium">
                          R$ {Math.round(eq.totalCost).toLocaleString()}
                        </TableCell>
                        <TableCell>R$ {eq.costPerBTU.toFixed(4)}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="locations" className="space-y-6">
          {/* Controles e filtros */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-4 rounded-lg border">
            <div>
              <h3 className="font-medium">Análise por Localização</h3>
              <p className="text-sm text-muted-foreground">
                Comparativo de custos e desempenho por local
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
              <Select value={locationFilterType} onValueChange={setLocationFilterType}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filtrar por" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Locais</SelectItem>
                  <SelectItem value="sector">Apenas Setores</SelectItem>
                  <SelectItem value="subsection">Apenas Subsetores</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={locationSortBy} onValueChange={setLocationSortBy}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Ordenar por" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cost-high">Maior Custo</SelectItem>
                  <SelectItem value="cost-low">Menor Custo</SelectItem>
                  <SelectItem value="equipment-high">Mais Equipamentos</SelectItem>
                  <SelectItem value="equipment-low">Menos Equipamentos</SelectItem>
                </SelectContent>
              </Select>
              
              <div className="flex gap-1">
                <Button variant={viewMode === 'cards' ? 'default' : 'outline'} size="icon" onClick={() => setViewMode('cards')}>
                  <LayoutGrid className="h-4 w-4" />
                </Button>
                <Button variant={viewMode === 'table' ? 'default' : 'outline'} size="icon" onClick={() => setViewMode('table')}>
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Métricas comparativas principais */}
          {locationCostData.length > 0 && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Local Mais Eficiente</CardTitle>
                  <Award className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{locationCostData.sort((a, b) => a.avgCostPerEquipment - b.avgCostPerEquipment)[0]?.locationName}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    R$ {locationCostData.sort((a, b) => a.avgCostPerEquipment - b.avgCostPerEquipment)[0]?.avgCostPerEquipment.toLocaleString()} por equipamento
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Local Menos Eficiente</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{locationCostData.sort((a, b) => b.avgCostPerEquipment - a.avgCostPerEquipment)[0]?.locationName}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    R$ {locationCostData.sort((a, b) => b.avgCostPerEquipment - a.avgCostPerEquipment)[0]?.avgCostPerEquipment.toLocaleString()} por equipamento
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Maior Custo Total</CardTitle>
                  <TrendingUp className="h-4 w-4 text-amber-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{locationCostData.sort((a, b) => b.totalMaintenanceCosts - a.totalMaintenanceCosts)[0]?.locationName}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    R$ {locationCostData.sort((a, b) => b.totalMaintenanceCosts - a.totalMaintenanceCosts)[0]?.totalMaintenanceCosts.toLocaleString()}
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Menor Custo Total</CardTitle>
                  <TrendingDown className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{locationCostData.sort((a, b) => a.totalMaintenanceCosts - b.totalMaintenanceCosts)[0]?.locationName}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    R$ {locationCostData.sort((a, b) => a.totalMaintenanceCosts - b.totalMaintenanceCosts)[0]?.totalMaintenanceCosts.toLocaleString()}
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
          
          {/* Visualização principal - Cards ou Tabela */}
          {viewMode === 'cards' ? (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {locationCostData
                .filter(location => {
                  if (locationFilterType === 'all') return true;
                  return location.locationType === locationFilterType;
                })
                .sort((a, b) => {
                  switch (locationSortBy) {
                    case 'cost-high':
                      return b.totalMaintenanceCosts - a.totalMaintenanceCosts;
                    case 'cost-low':
                      return a.totalMaintenanceCosts - b.totalMaintenanceCosts;
                    case 'equipment-high':
                      return b.totalEquipment - a.totalEquipment;
                    case 'equipment-low':
                      return a.totalEquipment - b.totalEquipment;
                    default:
                      return 0;
                  }
                })
                .map(location => (
                  <Card key={location.locationId} className="overflow-hidden transition-all hover:border-primary/50">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-start gap-2">
                          {location.locationType === 'sector' ? (
                            <MapPin className="h-5 w-5 text-primary mt-0.5" />
                          ) : (
                            <LayoutGrid className="h-5 w-5 text-primary mt-0.5" />
                          )}
                          <div>
                            <CardTitle className="text-base">{location.locationName}</CardTitle>
                            <p className="text-xs text-muted-foreground">{location.locationPath}</p>
                          </div>
                        </div>
                        <Badge variant="outline" className="ml-auto">
                          {location.totalEquipment} equipamentos
                        </Badge>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="pb-3">
                      {/* Métricas principais */}
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Custo Total</span>
                          </div>
                          <p className="text-lg font-semibold">
                            R$ {location.totalMaintenanceCosts.toLocaleString()}
                          </p>
                        </div>
                        
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Custo Médio</span>
                            <HelpCircle className="h-3 w-3 text-muted-foreground" />
                          </div>
                          <p className="text-lg font-semibold">
                            R$ {location.avgCostPerEquipment.toLocaleString()}
                          </p>
                        </div>
                      </div>
                      
                      {/* Mini breakdown de custos */}
                      <div className="mt-4 border-t pt-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-muted-foreground">Distribuição de custos</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div className="text-center">
                            <div className="text-green-600 font-medium">R$ {location.preventiveCosts.toLocaleString()}</div>
                            <div className="text-muted-foreground">Preventiva</div>
                          </div>
                          <div className="text-center">
                            <div className="text-orange-600 font-medium">R$ {location.correctiveCosts.toLocaleString()}</div>
                            <div className="text-muted-foreground">Corretiva</div>
                          </div>
                          <div className="text-center">
                            <div className="text-red-600 font-medium">R$ {location.emergencyCosts.toLocaleString()}</div>
                            <div className="text-muted-foreground">Emergencial</div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                    
                    <div className="px-6 pb-4 flex justify-end">
                      <Button variant="outline" size="sm">
                        Ver detalhes
                        <ChevronRight className="ml-1 h-4 w-4" />
                      </Button>
                    </div>
                  </Card>
                ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Local</TableHead>
                      <TableHead className="text-right">Equipamentos</TableHead>
                      <TableHead className="text-right">Custo Total</TableHead>
                      <TableHead className="text-right">Custo Médio</TableHead>
                      <TableHead className="text-right">Energia</TableHead>
                      <TableHead className="text-right">Downtime</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {locationCostData
                      .filter(location => {
                        if (locationFilterType === 'all') return true;
                        return location.locationType === locationFilterType;
                      })
                      .sort((a, b) => {
                        switch (locationSortBy) {
                          case 'cost-high':
                            return b.totalMaintenanceCosts - a.totalMaintenanceCosts;
                          case 'cost-low':
                            return a.totalMaintenanceCosts - b.totalMaintenanceCosts;
                          case 'equipment-high':
                            return b.totalEquipment - a.totalEquipment;
                          case 'equipment-low':
                            return a.totalEquipment - b.totalEquipment;
                          default:
                            return 0;
                        }
                      })
                      .map(location => (
                        <TableRow key={location.locationId}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {location.locationType === 'sector' ? (
                                <MapPin className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <LayoutGrid className="h-4 w-4 text-muted-foreground" />
                              )}
                              <div>
                                <p className="font-medium">{location.locationName}</p>
                                <p className="text-xs text-muted-foreground">{location.locationPath}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">{location.totalEquipment}</TableCell>
                          <TableCell className="text-right font-medium">
                            R$ {location.totalMaintenanceCosts.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right">
                            R$ {location.avgCostPerEquipment.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right">
                            R$ {location.energyCosts.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right">
                            {location.totalDowntimeHours}h
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Estado vazio aprimorado */}
          {locationCostData.length === 0 && (
            <Card className="text-center py-12">
              <CardContent>
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-muted">
                  <MapPin className="h-10 w-10 text-muted-foreground" />
                </div>
                
                <h3 className="mt-6 text-lg font-medium">Sem dados de localização disponíveis</h3>
                
                <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
                  Adicione equipamentos com localizações definidas para visualizar análises comparativas.
                </p>
                
                <div className="mt-8 border-t pt-6">
                  <p className="text-sm font-medium">Dicas para começar:</p>
                  <ul className="mt-2 grid gap-y-1.5 text-sm text-muted-foreground">
                    <li className="flex items-center gap-1.5">
                      <Check className="h-4 w-4 text-green-500" />
                      Adicione empresas, setores e subsetores
                    </li>
                    <li className="flex items-center gap-1.5">
                      <Check className="h-4 w-4 text-green-500" />
                      Cadastre equipamentos vinculados aos locais
                    </li>
                    <li className="flex items-center gap-1.5">
                      <Check className="h-4 w-4 text-green-500" />
                      Registre ordens de serviço para análise de custos
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}