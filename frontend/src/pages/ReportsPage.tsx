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
  BarChart3,
  ClipboardCheck,
  Thermometer,
  Zap,
  AlertCircle,
  Clock,
  Wrench,
  Activity,
  TrendingUp,
  Shield,
  Users,
  Settings,
  Gauge,
  Timer,
  Target,
  Bell,
  ChevronDown,
  ChevronRight,
  Loader2,
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useGeneratePMOCMonthly, useGeneratePMOCAnnual } from '@/hooks/useReportsQuery';
import { PMOCMonthlyPreview, PMOCAnnualPreview } from '@/components/reports/PMOCReportPreview';
import { PMOCMonthlyReport, PMOCAnnualReport } from '@/services/reportsService';

// Tipos de relatório disponíveis
interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  icon: any;
  topic: 'conformidade' | 'equipamentos' | 'monitoramento' | 'desempenho';
  topicLabel: string;
}

// Estrutura para organização por tópicos
interface ReportTopic {
  id: 'conformidade' | 'equipamentos' | 'monitoramento' | 'desempenho';
  name: string;
  description: string;
  icon: any;
  color: string;
  bgColor: string;
}

const reportTopics: ReportTopic[] = [
  {
    id: 'conformidade',
    name: 'Conformidade',
    description: 'Relatórios de conformidade regulatória e auditorias',
    icon: Shield,
    color: 'text-blue-600',
    bgColor: 'bg-blue-500/10',
  },
  {
    id: 'equipamentos',
    name: 'Equipamentos',
    description: 'Análise e desempenho de equipamentos',
    icon: Settings,
    color: 'text-amber-600',
    bgColor: 'bg-amber-500/10',
  },
  {
    id: 'monitoramento',
    name: 'Monitoramento',
    description: 'Tendências, consumo e alertas do sistema',
    icon: Activity,
    color: 'text-green-600',
    bgColor: 'bg-green-500/10',
  },
  {
    id: 'desempenho',
    name: 'Desempenho Técnico',
    description: 'Métricas de equipe técnica e SLA',
    icon: Users,
    color: 'text-purple-600',
    bgColor: 'bg-purple-500/10',
  },
];

const reportTemplates: ReportTemplate[] = [
  // ============================================
  // CONFORMIDADE - Relatórios regulatórios
  // ============================================
  {
    id: 'pmoc-mensal',
    name: 'Relatório PMOC Mensal',
    description: 'Plano de Manutenção, Operação e Controle para conformidade regulatória mensal',
    icon: ClipboardCheck,
    topic: 'conformidade',
    topicLabel: 'Conformidade',
  },
  {
    id: 'pmoc-anual',
    name: 'Relatório PMOC Anual',
    description: 'Consolidado anual de manutenções para auditorias e fiscalização',
    icon: FileText,
    topic: 'conformidade',
    topicLabel: 'Conformidade',
  },
  {
    id: 'conformidade-anvisa',
    name: 'Conformidade ANVISA',
    description: 'Relatório de conformidade com normas da ANVISA para ambientes climatizados',
    icon: Shield,
    topic: 'conformidade',
    topicLabel: 'Conformidade',
  },
  {
    id: 'qualidade-ar',
    name: 'Qualidade do Ar Interior (QAI)',
    description: 'Análise de parâmetros de qualidade do ar conforme ABNT NBR 16401',
    icon: Activity,
    topic: 'conformidade',
    topicLabel: 'Conformidade',
  },
  {
    id: 'laudo-tecnico',
    name: 'Laudo Técnico de Inspeção',
    description: 'Laudo técnico para vistorias e inspeções obrigatórias',
    icon: FileText,
    topic: 'conformidade',
    topicLabel: 'Conformidade',
  },

  // ============================================
  // EQUIPAMENTOS - Análise de ativos
  // ============================================
  {
    id: 'equipment-performance',
    name: 'Desempenho de Equipamentos',
    description: 'Métricas de eficiência, disponibilidade e MTBF/MTTR por equipamento',
    icon: BarChart3,
    topic: 'equipamentos',
    topicLabel: 'Equipamentos',
  },
  {
    id: 'equipment-lifecycle',
    name: 'Ciclo de Vida de Ativos',
    description: 'Análise de depreciação, vida útil restante e histórico de manutenções',
    icon: TrendingUp,
    topic: 'equipamentos',
    topicLabel: 'Equipamentos',
  },
  {
    id: 'equipment-availability',
    name: 'Disponibilidade de Equipamentos',
    description: 'Taxa de disponibilidade e uptime por equipamento e período',
    icon: Gauge,
    topic: 'equipamentos',
    topicLabel: 'Equipamentos',
  },
  {
    id: 'equipment-failures',
    name: 'Análise de Falhas',
    description: 'Histórico de falhas, causas raiz e padrões recorrentes',
    icon: AlertCircle,
    topic: 'equipamentos',
    topicLabel: 'Equipamentos',
  },
  {
    id: 'equipment-maintenance-cost',
    name: 'Custo de Manutenção por Ativo',
    description: 'Análise de custos de manutenção preventiva e corretiva por equipamento',
    icon: Wrench,
    topic: 'equipamentos',
    topicLabel: 'Equipamentos',
  },
  {
    id: 'equipment-inventory',
    name: 'Inventário de Equipamentos',
    description: 'Listagem completa de ativos com especificações e status',
    icon: Settings,
    topic: 'equipamentos',
    topicLabel: 'Equipamentos',
  },

  // ============================================
  // MONITORAMENTO - IoT e Telemetria
  // ============================================
  {
    id: 'temperature-trends',
    name: 'Tendência de Temperatura',
    description: 'Análise de variações de temperatura ao longo do tempo por zona',
    icon: Thermometer,
    topic: 'monitoramento',
    topicLabel: 'Monitoramento',
  },
  {
    id: 'energy-consumption',
    name: 'Consumo Energético',
    description: 'Análise detalhada do consumo de energia dos equipamentos',
    icon: Zap,
    topic: 'monitoramento',
    topicLabel: 'Monitoramento',
  },
  {
    id: 'alerts-summary',
    name: 'Resumo de Alertas',
    description: 'Histórico de alertas gerados, severidade e tempo médio de resposta',
    icon: Bell,
    topic: 'monitoramento',
    topicLabel: 'Monitoramento',
  },
  {
    id: 'humidity-analysis',
    name: 'Análise de Umidade',
    description: 'Relatório de variações de umidade relativa por ambiente',
    icon: Activity,
    topic: 'monitoramento',
    topicLabel: 'Monitoramento',
  },
  {
    id: 'sensor-health',
    name: 'Saúde dos Sensores',
    description: 'Status de conectividade, bateria e precisão dos sensores IoT',
    icon: Gauge,
    topic: 'monitoramento',
    topicLabel: 'Monitoramento',
  },
  {
    id: 'anomaly-detection',
    name: 'Detecção de Anomalias',
    description: 'Relatório de comportamentos anômalos detectados pelo sistema',
    icon: Target,
    topic: 'monitoramento',
    topicLabel: 'Monitoramento',
  },
  {
    id: 'environmental-conditions',
    name: 'Condições Ambientais',
    description: 'Visão consolidada de temperatura, umidade e CO2 por área',
    icon: Activity,
    topic: 'monitoramento',
    topicLabel: 'Monitoramento',
  },

  // ============================================
  // DESEMPENHO TÉCNICO - Equipe e SLA
  // ============================================
  {
    id: 'sla-compliance',
    name: 'Conformidade SLA',
    description: 'Análise de cumprimento dos acordos de nível de serviço',
    icon: Clock,
    topic: 'desempenho',
    topicLabel: 'Desempenho Técnico',
  },
  {
    id: 'technician-productivity',
    name: 'Produtividade de Técnicos',
    description: 'Métricas de produtividade individual e por equipe',
    icon: Users,
    topic: 'desempenho',
    topicLabel: 'Desempenho Técnico',
  },
  {
    id: 'response-time',
    name: 'Tempo de Resposta',
    description: 'Análise de tempo médio de resposta e resolução por prioridade',
    icon: Timer,
    topic: 'desempenho',
    topicLabel: 'Desempenho Técnico',
  },
  {
    id: 'work-orders-analysis',
    name: 'Análise de Ordens de Serviço',
    description: 'Estatísticas de OS abertas, fechadas, pendentes e backlog',
    icon: FileText,
    topic: 'desempenho',
    topicLabel: 'Desempenho Técnico',
  },
  {
    id: 'first-time-fix',
    name: 'Taxa de Resolução na Primeira Visita',
    description: 'Percentual de problemas resolvidos na primeira intervenção',
    icon: Target,
    topic: 'desempenho',
    topicLabel: 'Desempenho Técnico',
  },
  {
    id: 'maintenance-backlog',
    name: 'Backlog de Manutenção',
    description: 'Análise de manutenções pendentes e aging de OS',
    icon: Clock,
    topic: 'desempenho',
    topicLabel: 'Desempenho Técnico',
  },
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
  const [topicFilter, setTopicFilter] = useState<string>('all');
  const [expandedTopics, setExpandedTopics] = useState<string[]>(['conformidade', 'equipamentos', 'monitoramento', 'desempenho']);
  
  // Form state para geração de relatório
  const [reportPeriod, setReportPeriod] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [reportYear, setReportYear] = useState(() => String(new Date().getFullYear()));
  const [selectedCompany, setSelectedCompany] = useState<string>('ALL');
  const [selectedSector, setSelectedSector] = useState<string>('ALL');
  const [reportFormat, setReportFormat] = useState<string>('pdf');
  
  // Generated report state
  const [generatedMonthlyReport, setGeneratedMonthlyReport] = useState<PMOCMonthlyReport | null>(null);
  const [generatedAnnualReport, setGeneratedAnnualReport] = useState<PMOCAnnualReport | null>(null);
  
  const { data: companies = [] } = useCompanies();
  const { data: sectors = [] } = useSectors();
  
  // Mutations para geração de relatórios
  const generateMonthlyMutation = useGeneratePMOCMonthly();
  const generateAnnualMutation = useGeneratePMOCAnnual();

  // Agrupar relatórios por tópico
  const getReportsByTopic = (topicId: string) => {
    return reportTemplates.filter(t => t.topic === topicId);
  };

  const filteredTopics = topicFilter === 'all' 
    ? reportTopics 
    : reportTopics.filter(t => t.id === topicFilter);

  const toggleTopic = (topicId: string) => {
    setExpandedTopics(prev => 
      prev.includes(topicId) 
        ? prev.filter(id => id !== topicId)
        : [...prev, topicId]
    );
  };

  const handleSelectTemplate = (template: ReportTemplate) => {
    setSelectedTemplate(template);
    setGeneratedMonthlyReport(null);
    setGeneratedAnnualReport(null);
  };

  const handleDownload = (reportId: number) => {
    console.log('Download report:', reportId);
  };

  const handleGenerateReport = async () => {
    if (!selectedTemplate) return;
    
    // Parse período
    const [year, month] = reportPeriod.split('-').map(Number);
    const yearOnly = parseInt(reportYear);
    
    // Filtros
    const filters = {
      company: selectedCompany !== 'ALL' ? selectedCompany : undefined,
    };
    
    try {
      if (selectedTemplate.id === 'pmoc-mensal') {
        const report = await generateMonthlyMutation.mutateAsync({
          month,
          year,
          ...filters,
        });
        setGeneratedMonthlyReport(report);
        setGeneratedAnnualReport(null);
      } else if (selectedTemplate.id === 'pmoc-anual') {
        const report = await generateAnnualMutation.mutateAsync({
          year: yearOnly,
          ...filters,
        });
        setGeneratedAnnualReport(report);
        setGeneratedMonthlyReport(null);
      } else {
        // Para outros relatórios, mostrar mensagem
        console.log('Relatório ainda não implementado:', selectedTemplate.id);
      }
    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
    }
  };

  const isGenerating = generateMonthlyMutation.isPending || generateAnnualMutation.isPending;
  const isPMOCTemplate = selectedTemplate?.id === 'pmoc-mensal' || selectedTemplate?.id === 'pmoc-anual';

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
      <div className="flex-1 min-h-0 overflow-hidden">
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

          <div className="flex-1 min-h-0 overflow-auto p-6">
              {/* Modelos Tab */}
              <TabsContent value="templates" className="mt-0 space-y-6 pb-6">
                {/* Filtros */}
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">Modelos de Relatório</h2>
                    <p className="text-sm text-muted-foreground">
                      Selecione um modelo para personalizar e gerar ({reportTemplates.length} modelos disponíveis)
                    </p>
                  </div>
                  <Select value={topicFilter} onValueChange={setTopicFilter}>
                    <SelectTrigger className="w-[220px]">
                      <Filter className="w-4 h-4 mr-2" />
                      <SelectValue placeholder="Filtrar por tópico" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os tópicos</SelectItem>
                      <SelectItem value="conformidade">Conformidade</SelectItem>
                      <SelectItem value="equipamentos">Equipamentos</SelectItem>
                      <SelectItem value="monitoramento">Monitoramento</SelectItem>
                      <SelectItem value="desempenho">Desempenho Técnico</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Relatórios organizados por tópico */}
                <div className="space-y-4">
                  {filteredTopics.map((topic) => {
                    const TopicIcon = topic.icon;
                    const topicReports = getReportsByTopic(topic.id);
                    const isExpanded = expandedTopics.includes(topic.id);

                    return (
                      <Collapsible 
                        key={topic.id} 
                        open={isExpanded}
                        onOpenChange={() => toggleTopic(topic.id)}
                      >
                        <Card>
                          <CollapsibleTrigger asChild>
                            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className={`p-2 rounded-lg ${topic.bgColor}`}>
                                    <TopicIcon className={`w-5 h-5 ${topic.color}`} />
                                  </div>
                                  <div>
                                    <CardTitle className="text-base flex items-center gap-2">
                                      {topic.name}
                                      <Badge variant="secondary" className="ml-2">
                                        {topicReports.length} relatórios
                                      </Badge>
                                    </CardTitle>
                                    <CardDescription>{topic.description}</CardDescription>
                                  </div>
                                </div>
                                {isExpanded ? (
                                  <ChevronDown className="w-5 h-5 text-muted-foreground" />
                                ) : (
                                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                                )}
                              </div>
                            </CardHeader>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <CardContent className="pt-0">
                              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                {topicReports.map((template) => {
                                  const Icon = template.icon;
                                  const isSelected = selectedTemplate?.id === template.id;
                                  
                                  return (
                                    <Card 
                                      key={template.id} 
                                      className={`cursor-pointer transition-all hover:shadow-md border-l-4 ${
                                        isSelected 
                                          ? 'ring-2 ring-primary border-l-primary' 
                                          : `border-l-transparent hover:border-l-${topic.color.replace('text-', '')}`
                                      }`}
                                      onClick={() => handleSelectTemplate(template)}
                                    >
                                      <CardHeader className="pb-3">
                                        <div className="flex items-start gap-3">
                                          <div className={`p-2 rounded-lg ${topic.bgColor}`}>
                                            <Icon className={`w-4 h-4 ${topic.color}`} />
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <CardTitle className="text-sm font-medium leading-tight">
                                              {template.name}
                                            </CardTitle>
                                          </div>
                                        </div>
                                      </CardHeader>
                                      <CardContent className="pt-0">
                                        <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                                          {template.description}
                                        </p>
                                        <Button 
                                          variant={isSelected ? "default" : "outline"} 
                                          size="sm"
                                          className="w-full gap-2"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleSelectTemplate(template);
                                            setActiveTab('generate');
                                          }}
                                        >
                                          <Calendar className="w-3 h-3" />
                                          Gerar
                                        </Button>
                                      </CardContent>
                                    </Card>
                                  );
                                })}
                              </div>
                            </CardContent>
                          </CollapsibleContent>
                        </Card>
                      </Collapsible>
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
                          {(() => {
                            const topic = reportTopics.find(t => t.id === selectedTemplate.topic);
                            return (
                              <div className={`p-3 rounded-lg ${topic?.bgColor || 'bg-primary/10'}`}>
                                {(() => {
                                  const Icon = selectedTemplate.icon;
                                  return <Icon className={`w-6 h-6 ${topic?.color || 'text-primary'}`} />;
                                })()}
                              </div>
                            );
                          })()}
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold">{selectedTemplate.name}</h3>
                              <Badge variant="secondary">{selectedTemplate.topicLabel}</Badge>
                            </div>
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
                          {selectedTemplate?.id === 'pmoc-anual' ? (
                            <div className="space-y-2">
                              <Label htmlFor="year">Ano</Label>
                              <Select value={reportYear} onValueChange={setReportYear}>
                                <SelectTrigger id="year">
                                  <SelectValue placeholder="Selecionar ano" />
                                </SelectTrigger>
                                <SelectContent>
                                  {Array.from({ length: 5 }, (_, i) => {
                                    const year = new Date().getFullYear() - i;
                                    return (
                                      <SelectItem key={year} value={String(year)}>
                                        {year}
                                      </SelectItem>
                                    );
                                  })}
                                </SelectContent>
                              </Select>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <Label htmlFor="period">Período</Label>
                              <Input 
                                id="period"
                                type="month" 
                                value={reportPeriod}
                                onChange={(e) => setReportPeriod(e.target.value)}
                              />
                            </div>
                          )}
                          <div className="space-y-2">
                            <Label htmlFor="company">Empresa</Label>
                            <Select value={selectedCompany} onValueChange={setSelectedCompany}>
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
                            <Select value={selectedSector} onValueChange={setSelectedSector}>
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
                            <Select value={reportFormat} onValueChange={setReportFormat}>
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
                          <Button 
                            onClick={handleGenerateReport} 
                            className="gap-2"
                            disabled={isGenerating || !isPMOCTemplate}
                          >
                            {isGenerating ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <FileText className="h-4 w-4" />
                            )}
                            {isGenerating ? 'Gerando...' : 'Gerar Relatório'}
                          </Button>
                          {!isPMOCTemplate && (
                            <span className="text-sm text-muted-foreground">
                              Este modelo ainda não está disponível para geração automática
                            </span>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Preview do Relatório Gerado */}
                    {generatedMonthlyReport && (
                      <PMOCMonthlyPreview 
                        report={generatedMonthlyReport}
                        onExportPDF={() => console.log('Export PDF')}
                        isExporting={false}
                      />
                    )}
                    
                    {generatedAnnualReport && (
                      <PMOCAnnualPreview 
                        report={generatedAnnualReport}
                        onExportPDF={() => console.log('Export PDF')}
                        isExporting={false}
                      />
                    )}

                    {/* Mensagem quando nenhum relatório foi gerado */}
                    {isPMOCTemplate && !generatedMonthlyReport && !generatedAnnualReport && !isGenerating && (
                      <Card className="border-dashed">
                        <CardContent className="flex flex-col items-center justify-center py-12">
                          <FileText className="w-12 h-12 text-muted-foreground/50 mb-4" />
                          <p className="text-muted-foreground font-medium mb-2">
                            Nenhum relatório gerado
                          </p>
                          <p className="text-sm text-muted-foreground text-center max-w-md">
                            Configure os parâmetros acima e clique em "Gerar Relatório" para visualizar o PMOC
                          </p>
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
        </Tabs>
      </div>
    </div>
  );
}