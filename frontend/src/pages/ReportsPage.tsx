/**
 * ReportsPage - Página Unificada de Relatórios
 * 
 * Integra relatórios de PMOC (conformidade) e operacionais (monitoramento).
 * Acessível apenas pelo módulo TrakNor CMMS.
 */

import { useState } from 'react';
import { 
  FileText, 
  Download, 
  Eye, 
  Calendar, 
  Filter, 
  TrendingUp, 
  BarChart3,
  ClipboardCheck,
  Thermometer,
  Zap,
  AlertCircle,
  Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCompanies, useSectors } from '@/hooks/useLocationsQuery';
import { ScrollArea } from '@/components/ui/scroll-area';

// Tipos de relatório disponíveis
interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  icon: any;
  category: 'pmoc' | 'operacional' | 'qualidade';
  categoryLabel: string;
}

const reportTemplates: ReportTemplate[] = [
  // Relatórios PMOC / Conformidade
  {
    id: 'pmoc-mensal',
    name: 'Relatório PMOC Mensal',
    description: 'Plano de Manutenção, Operação e Controle para conformidade regulatória',
    icon: ClipboardCheck,
    category: 'pmoc',
    categoryLabel: 'Conformidade'
  },
  {
    id: 'pmoc-anual',
    name: 'Relatório PMOC Anual',
    description: 'Consolidado anual de manutenções para auditorias',
    icon: FileText,
    category: 'pmoc',
    categoryLabel: 'Conformidade'
  },
  // Relatórios Operacionais
  {
    id: 'energy-consumption',
    name: 'Consumo Energético',
    description: 'Análise detalhada do consumo de energia dos equipamentos',
    icon: Zap,
    category: 'operacional',
    categoryLabel: 'Operacional'
  },
  {
    id: 'equipment-performance',
    name: 'Desempenho de Equipamentos',
    description: 'Métricas de eficiência, disponibilidade e MTBF/MTTR',
    icon: BarChart3,
    category: 'operacional',
    categoryLabel: 'Operacional'
  },
  {
    id: 'temperature-trends',
    name: 'Tendências de Temperatura',
    description: 'Análise de variações de temperatura ao longo do tempo',
    icon: Thermometer,
    category: 'operacional',
    categoryLabel: 'Operacional'
  },
  // Relatórios de Qualidade
  {
    id: 'alerts-summary',
    name: 'Resumo de Alertas',
    description: 'Histórico de alertas gerados e tempo médio de resposta',
    icon: AlertCircle,
    category: 'qualidade',
    categoryLabel: 'Qualidade'
  },
  {
    id: 'sla-compliance',
    name: 'Conformidade SLA',
    description: 'Análise de cumprimento dos acordos de nível de serviço',
    icon: Clock,
    category: 'qualidade',
    categoryLabel: 'Qualidade'
  }
];

// Relatórios gerados (mock)
const myReports = [
  {
    id: 1,
    name: 'Relatório PMOC - Novembro 2024',
    type: 'PMOC Mensal',
    date: '2024-11-30',
    status: 'completed',
    size: '2.4 MB'
  },
  {
    id: 2,
    name: 'Consumo Energético - Q4 2024',
    type: 'Consumo Energético',
    date: '2024-12-15',
    status: 'completed',
    size: '3.1 MB'
  },
  {
    id: 3,
    name: 'Alertas - Dezembro 2024',
    type: 'Resumo de Alertas',
    date: '2024-12-01',
    status: 'completed',
    size: '1.8 MB'
  },
  {
    id: 4,
    name: 'Desempenho Equipamentos - Dezembro 2024',
    type: 'Desempenho',
    date: '2024-12-20',
    status: 'processing',
    size: '-'
  }
];

export function ReportsPage() {
  const [activeTab, setActiveTab] = useState('templates');
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  
  const { data: companies = [] } = useCompanies();
  const { data: sectors = [] } = useSectors();

  const filteredTemplates = categoryFilter === 'all' 
    ? reportTemplates 
    : reportTemplates.filter(t => t.category === categoryFilter);

  const handleSelectTemplate = (template: ReportTemplate) => {
    setSelectedTemplate(template);
  };

  const handleDownload = (reportId: number) => {
    console.log('Download report:', reportId);
  };

  const handleGenerateReport = () => {
    console.log('Generate report for template:', selectedTemplate?.id);
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 border-b bg-background px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">Relatórios</h1>
              <p className="text-sm text-muted-foreground">
                Gere relatórios de conformidade, operacionais e exporte dados
              </p>
            </div>
          </div>
          <Button className="gap-2">
            <Download className="w-4 h-4" />
            Exportar Dados
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <div className="flex-shrink-0 px-6 pt-4">
            <TabsList className="grid w-full grid-cols-3 lg:w-fit">
              <TabsTrigger value="templates" className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                <span>Modelos</span>
              </TabsTrigger>
              <TabsTrigger value="generate" className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                <span>Gerar Relatório</span>
              </TabsTrigger>
              <TabsTrigger value="history" className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>Histórico</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-6">
              {/* Modelos Tab */}
              <TabsContent value="templates" className="mt-0 space-y-6">
                {/* Filtros */}
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">Modelos de Relatório</h2>
                    <p className="text-sm text-muted-foreground">
                      Selecione um modelo para personalizar e gerar
                    </p>
                  </div>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-[180px]">
                      <Filter className="w-4 h-4 mr-2" />
                      <SelectValue placeholder="Filtrar por tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os tipos</SelectItem>
                      <SelectItem value="pmoc">Conformidade (PMOC)</SelectItem>
                      <SelectItem value="operacional">Operacional</SelectItem>
                      <SelectItem value="qualidade">Qualidade</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Grid de modelos */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filteredTemplates.map((template) => {
                    const Icon = template.icon;
                    const isSelected = selectedTemplate?.id === template.id;
                    
                    return (
                      <Card 
                        key={template.id} 
                        className={`cursor-pointer transition-all hover:shadow-md ${
                          isSelected ? 'ring-2 ring-primary border-primary' : ''
                        }`}
                        onClick={() => handleSelectTemplate(template)}
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-lg ${
                                template.category === 'pmoc' 
                                  ? 'bg-blue-500/10' 
                                  : template.category === 'operacional'
                                  ? 'bg-amber-500/10'
                                  : 'bg-green-500/10'
                              }`}>
                                <Icon className={`w-5 h-5 ${
                                  template.category === 'pmoc' 
                                    ? 'text-blue-600' 
                                    : template.category === 'operacional'
                                    ? 'text-amber-600'
                                    : 'text-green-600'
                                }`} />
                              </div>
                              <div className="space-y-1">
                                <CardTitle className="text-base">{template.name}</CardTitle>
                                <Badge 
                                  variant="secondary" 
                                  className={`text-xs ${
                                    template.category === 'pmoc' 
                                      ? 'bg-blue-100 text-blue-700' 
                                      : template.category === 'operacional'
                                      ? 'bg-amber-100 text-amber-700'
                                      : 'bg-green-100 text-green-700'
                                  }`}
                                >
                                  {template.categoryLabel}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground mb-4">
                            {template.description}
                          </p>
                          <Button 
                            variant={isSelected ? "default" : "outline"} 
                            className="w-full gap-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectTemplate(template);
                              setActiveTab('generate');
                            }}
                          >
                            <Calendar className="w-4 h-4" />
                            Configurar e Gerar
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                {/* Exportação Rápida */}
                <Card className="mt-8">
                  <CardHeader>
                    <CardTitle className="text-base">Exportação Rápida</CardTitle>
                    <CardDescription>
                      Exporte dados específicos sem gerar um relatório completo
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-3">
                      <Button variant="outline" className="gap-2">
                        <Download className="w-4 h-4" />
                        Alertas (CSV)
                      </Button>
                      <Button variant="outline" className="gap-2">
                        <Download className="w-4 h-4" />
                        Ordens de Serviço (Excel)
                      </Button>
                      <Button variant="outline" className="gap-2">
                        <Download className="w-4 h-4" />
                        Telemetria (Excel)
                      </Button>
                      <Button variant="outline" className="gap-2">
                        <Download className="w-4 h-4" />
                        Ativos (JSON)
                      </Button>
                      <Button variant="outline" className="gap-2">
                        <Download className="w-4 h-4" />
                        Manutenções (PDF)
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Gerar Relatório Tab */}
              <TabsContent value="generate" className="mt-0 space-y-6">
                {selectedTemplate ? (
                  <>
                    {/* Template selecionado */}
                    <Card className="border-primary/50 bg-primary/5">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          <div className={`p-3 rounded-lg ${
                            selectedTemplate.category === 'pmoc' 
                              ? 'bg-blue-500/10' 
                              : selectedTemplate.category === 'operacional'
                              ? 'bg-amber-500/10'
                              : 'bg-green-500/10'
                          }`}>
                            {(() => {
                              const Icon = selectedTemplate.icon;
                              return <Icon className={`w-6 h-6 ${
                                selectedTemplate.category === 'pmoc' 
                                  ? 'text-blue-600' 
                                  : selectedTemplate.category === 'operacional'
                                  ? 'text-amber-600'
                                  : 'text-green-600'
                              }`} />;
                            })()}
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold">{selectedTemplate.name}</h3>
                            <p className="text-sm text-muted-foreground">{selectedTemplate.description}</p>
                          </div>
                          <Button variant="ghost" size="sm" onClick={() => setSelectedTemplate(null)}>
                            Trocar modelo
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Parâmetros do relatório */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                          <Filter className="w-4 h-4" />
                          Parâmetros do Relatório
                        </CardTitle>
                        <CardDescription>
                          Configure os filtros e opções para geração do relatório
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="period">Período</Label>
                            <Input 
                              id="period"
                              type="month" 
                              defaultValue="2024-12"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="company">Empresa</Label>
                            <Select>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecionar empresa" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="ALL">Todas as empresas</SelectItem>
                                {companies.map(company => (
                                  <SelectItem key={company.id} value={company.id}>
                                    {company.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="sector">Setor</Label>
                            <Select>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecionar setor" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="ALL">Todos os setores</SelectItem>
                                {sectors.map(sector => (
                                  <SelectItem key={sector.id} value={sector.id}>
                                    {sector.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="format">Formato</Label>
                            <Select defaultValue="pdf">
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pdf">PDF</SelectItem>
                                <SelectItem value="excel">Excel</SelectItem>
                                <SelectItem value="csv">CSV</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 pt-4 border-t">
                          <Button onClick={handleGenerateReport} className="gap-2">
                            <FileText className="h-4 w-4" />
                            Gerar Relatório
                          </Button>
                          <Button variant="outline" className="gap-2">
                            <Eye className="h-4 w-4" />
                            Visualizar Preview
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Preview PMOC (se for template PMOC) */}
                    {selectedTemplate.category === 'pmoc' && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base flex items-center gap-2">
                            <Eye className="w-4 h-4" />
                            Preview do Relatório
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="border rounded-lg p-6 bg-muted/30">
                            <div className="text-center mb-6">
                              <h2 className="text-xl font-bold">RELATÓRIO PMOC</h2>
                              <p className="text-muted-foreground">Plano de Manutenção, Operação e Controle</p>
                              <p className="text-sm">Período: Dezembro 2024</p>
                            </div>
                            
                            <div className="space-y-4 text-sm">
                              <div>
                                <h3 className="font-semibold">1. IDENTIFICAÇÃO DA EMPRESA</h3>
                                <p>Razão Social: UMC - Universidade de Mogi das Cruzes</p>
                                <p>CNPJ: 52.562.758/0001-00</p>
                              </div>
                              
                              <div>
                                <h3 className="font-semibold">2. SISTEMAS DE CLIMATIZAÇÃO</h3>
                                <p>Total de equipamentos: 45</p>
                                <p>Capacidade total instalada: 2.500.000 BTUs</p>
                              </div>
                              
                              <div>
                                <h3 className="font-semibold">3. MANUTENÇÕES REALIZADAS</h3>
                                <p>Manutenções preventivas: 38</p>
                                <p>Manutenções corretivas: 7</p>
                                <p>Taxa de conformidade: 98.5%</p>
                              </div>

                              <div>
                                <h3 className="font-semibold">4. RESPONSÁVEL TÉCNICO</h3>
                                <p>Nome: João da Silva</p>
                                <p>CREA: SP-123456/D</p>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </>
                ) : (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <FileText className="w-12 h-12 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground font-medium mb-2">
                        Nenhum modelo selecionado
                      </p>
                      <p className="text-sm text-muted-foreground mb-4">
                        Selecione um modelo de relatório na aba "Modelos" para começar
                      </p>
                      <Button onClick={() => setActiveTab('templates')}>
                        Ver Modelos
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Histórico Tab */}
              <TabsContent value="history" className="mt-0 space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">Relatórios Gerados</h2>
                    <p className="text-sm text-muted-foreground">
                      Acesse e baixe seus relatórios anteriores
                    </p>
                  </div>
                  <Button variant="outline" className="gap-2">
                    <Filter className="w-4 h-4" />
                    Filtrar
                  </Button>
                </div>

                {myReports.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <FileText className="w-12 h-12 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground font-medium mb-2">
                        Nenhum relatório gerado ainda
                      </p>
                      <p className="text-sm text-muted-foreground mb-4">
                        Comece gerando um relatório usando os modelos disponíveis
                      </p>
                      <Button onClick={() => setActiveTab('templates')}>
                        Ver Modelos
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {myReports.map((report) => (
                      <Card key={report.id}>
                        <CardContent className="flex items-center justify-between p-4">
                          <div className="flex items-center gap-4">
                            <div className="p-2 bg-primary/10 rounded-lg">
                              <FileText className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                              <h4 className="font-medium">{report.name}</h4>
                              <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                                <span>{report.type}</span>
                                <span>•</span>
                                <span>{new Date(report.date).toLocaleDateString('pt-BR')}</span>
                                <span>•</span>
                                <span>{report.size}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge 
                              variant={report.status === 'completed' ? 'default' : 'secondary'}
                              className={report.status === 'completed' 
                                ? 'bg-green-100 text-green-700 hover:bg-green-100' 
                                : 'bg-amber-100 text-amber-700'
                              }
                            >
                              {report.status === 'completed' ? 'Concluído' : 'Processando'}
                            </Badge>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              disabled={report.status !== 'completed'}
                              onClick={() => handleDownload(report.id)}
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </div>
          </ScrollArea>
        </Tabs>
      </div>
    </div>
  );
}