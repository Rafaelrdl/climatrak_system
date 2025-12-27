import React, { useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  TestTube, 
  Settings2, 
  BarChart3, 
  Users, 
  Wrench,
  Info,
  CheckCircle,
  AlertCircle,
  PlayCircle
} from 'lucide-react';
import { PlansTestingSuite } from '@/components/PlansTestingSuite';
import { PlanTestScenarios } from '@/components/PlanTestScenarios';
import { useCompanies, useSectors } from '@/hooks/useLocationsQuery';
import { useEquipments } from '@/hooks/useEquipmentQuery';
import { useMaintenancePlansNew } from '@/hooks/useMaintenancePlans';

export function PlansTestingPage() {
  const { data: companies = [] } = useCompanies();
  const { data: sectors = [] } = useSectors();
  const { data: equipment = [] } = useEquipments();
  const [plans] = useMaintenancePlansNew();
  
  const [activeTab, setActiveTab] = useState('overview');

  // Calculate test environment statistics
  const stats = {
    companies: companies.length,
    sectors: sectors.length,
    equipment: equipment.length,
    plans: plans.length,
    activePlans: plans.filter(p => p.status === 'Ativo').length,
    plansWithMultipleEquipment: plans.filter(p => 
      p.scope.equipment_ids && p.scope.equipment_ids.length > 1
    ).length,
    autoGenerationPlans: plans.filter(p => p.auto_generate).length
  };

  // Test environment health check
  const environmentHealth = {
    hasCompanies: companies.length > 0,
    hasSectors: sectors.length > 0,
    hasEquipment: equipment.length > 0,
    hasEquipmentWithSectors: equipment.filter(eq => eq.sectorId).length > 0,
    hasMultipleCompanies: companies.length >= 2,
    hasEquipmentPerCompany: companies.every(company => {
      const companySectors = sectors.filter(s => s.companyId === company.id);
      const sectorIds = companySectors.map(s => s.id);
      return equipment.some(eq => sectorIds.includes(eq.sectorId || ''));
    })
  };

  const healthScore = Object.values(environmentHealth).filter(Boolean).length;
  const maxHealth = Object.values(environmentHealth).length;
  const healthPercentage = Math.round((healthScore / maxHealth) * 100);

  const getHealthBadge = () => {
    if (healthPercentage >= 90) return <Badge variant="default" className="bg-green-100 text-green-800">Excelente</Badge>;
    if (healthPercentage >= 70) return <Badge variant="default" className="bg-yellow-100 text-yellow-800">Boa</Badge>;
    return <Badge variant="destructive">Requer Atenção</Badge>;
  };

  const getHealthIcon = () => {
    if (healthPercentage >= 90) return <CheckCircle className="h-5 w-5 text-green-600" />;
    if (healthPercentage >= 70) return <AlertCircle className="h-5 w-5 text-yellow-600" />;
    return <AlertCircle className="h-5 w-5 text-red-600" />;
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Testes - Planos de Manutenção" 
        description="Validação completa da funcionalidade de planos com múltiplos equipamentos"
      />
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Visão Geral
          </TabsTrigger>
          <TabsTrigger value="automated" className="flex items-center gap-2">
            <TestTube className="h-4 w-4" />
            Testes Automáticos
          </TabsTrigger>
          <TabsTrigger value="scenarios" className="flex items-center gap-2">
            <Settings2 className="h-4 w-4" />
            Cenários de Uso
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Environment Health */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getHealthIcon()}
                    Saúde do Ambiente de Teste
                  </div>
                  {getHealthBadge()}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold">{healthPercentage}%</span>
                  <span className="text-sm text-muted-foreground">
                    {healthScore}/{maxHealth} verificações aprovadas
                  </span>
                </div>
                
                <div className="space-y-3">
                  {[
                    { key: 'hasCompanies', label: 'Empresas cadastradas', value: environmentHealth.hasCompanies },
                    { key: 'hasSectors', label: 'Setores cadastrados', value: environmentHealth.hasSectors },
                    { key: 'hasEquipment', label: 'Equipamentos cadastrados', value: environmentHealth.hasEquipment },
                    { key: 'hasEquipmentWithSectors', label: 'Equipamentos vinculados a setores', value: environmentHealth.hasEquipmentWithSectors },
                    { key: 'hasMultipleCompanies', label: 'Múltiplas empresas (para teste de filtros)', value: environmentHealth.hasMultipleCompanies },
                    { key: 'hasEquipmentPerCompany', label: 'Equipamentos por empresa', value: environmentHealth.hasEquipmentPerCompany }
                  ].map(check => (
                    <div key={check.key} className="flex items-center justify-between text-sm">
                      <span>{check.label}</span>
                      {check.value ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-red-600" />
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Statistics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Estatísticas do Ambiente
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{stats.companies}</div>
                    <div className="text-sm text-blue-800">Empresas</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{stats.sectors}</div>
                    <div className="text-sm text-green-800">Setores</div>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">{stats.equipment}</div>
                    <div className="text-sm text-purple-800">Equipamentos</div>
                  </div>
                  <div className="text-center p-4 bg-orange-50 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">{stats.plans}</div>
                    <div className="text-sm text-orange-800">Planos</div>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Planos Ativos:</span>
                    <Badge variant="default">{stats.activePlans}</Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Planos c/ Múltiplos Equipamentos:</span>
                    <Badge variant="secondary">{stats.plansWithMultipleEquipment}</Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Planos c/ Auto-geração:</span>
                    <Badge variant="outline">{stats.autoGenerationPlans}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Getting Started */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                Como usar esta ferramenta de teste
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <PlayCircle className="h-4 w-4" />
                <AlertTitle>Recomendação de Uso</AlertTitle>
                <AlertDescription>
                  Execute primeiro os <strong>Testes Automáticos</strong> para validar a funcionalidade básica,
                  depois use os <strong>Cenários de Uso</strong> para testar casos reais de criação de planos.
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border border-border rounded-lg">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <TestTube className="h-4 w-4" />
                    Testes Automáticos
                  </h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Validação automática das funcionalidades principais como filtragem, 
                    validação de formulário e geração de OSs.
                  </p>
                  <Button 
                    size="sm" 
                    onClick={() => setActiveTab('automated')}
                    className="w-full"
                  >
                    Executar Testes
                  </Button>
                </div>

                <div className="p-4 border border-border rounded-lg">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Settings2 className="h-4 w-4" />
                    Cenários de Uso
                  </h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Casos de uso reais que simulam diferentes situações de criação 
                    de planos de manutenção.
                  </p>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => setActiveTab('scenarios')}
                    className="w-full"
                  >
                    Ver Cenários
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Tests */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5" />
                Testes Rápidos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <Button variant="outline" className="justify-start h-auto p-4">
                  <div className="text-left">
                    <div className="font-medium">Criar Plano de Teste</div>
                    <div className="text-xs text-muted-foreground">Novo plano com dados aleatórios</div>
                  </div>
                </Button>
                <Button variant="outline" className="justify-start h-auto p-4">
                  <div className="text-left">
                    <div className="font-medium">Validar Filtros</div>
                    <div className="text-xs text-muted-foreground">Testar filtragem por empresa/setor</div>
                  </div>
                </Button>
                <Button variant="outline" className="justify-start h-auto p-4">
                  <div className="text-left">
                    <div className="font-medium">Gerar OSs</div>
                    <div className="text-xs text-muted-foreground">Testar geração de ordens de serviço</div>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="automated">
          <PlansTestingSuite />
        </TabsContent>

        <TabsContent value="scenarios">
          <PlanTestScenarios />
        </TabsContent>
      </Tabs>
    </div>
  );
}