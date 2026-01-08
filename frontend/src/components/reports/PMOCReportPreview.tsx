/**
 * PMOCReportPreview - Componente de preview do relatório PMOC
 * 
 * Exibe uma prévia formatada do relatório PMOC mensal ou anual.
 */

import { 
  Building2, 
  Calendar, 
  ClipboardCheck, 
  Download, 
  FileText, 
  Gauge, 
  Loader2,
  Thermometer,
  Wrench,
  AlertTriangle,
  CheckCircle2,
  User,
  BarChart3,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { PMOCMonthlyReport, PMOCAnnualReport } from '@/services/reportsService';
import { cn } from '@/lib/utils';

interface PMOCMonthlyPreviewProps {
  report: PMOCMonthlyReport;
  onExportPDF?: () => void;
  isExporting?: boolean;
}

export function PMOCMonthlyPreview({ report, onExportPDF, isExporting }: PMOCMonthlyPreviewProps) {
  const { establishment, climate_systems, maintenance_summary, equipment_list, observations, responsible_technician } = report;
  
  return (
    <div className="space-y-6">
      {/* Cabeçalho do Relatório */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <ClipboardCheck className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">RELATÓRIO PMOC MENSAL</h2>
                <p className="text-muted-foreground">
                  Plano de Manutenção, Operação e Controle
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    {report.period.month_name} / {report.period.year}
                  </span>
                </div>
              </div>
            </div>
            {onExportPDF && (
              <Button onClick={onExportPDF} disabled={isExporting} className="gap-2">
                {isExporting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                Exportar PDF
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 1. Identificação do Estabelecimento */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            1. Identificação do Estabelecimento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Razão Social</p>
              <p className="font-medium">{establishment.company || establishment.name || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Unidade/Site</p>
              <p className="font-medium">{establishment.name || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Setor</p>
              <p className="font-medium">{establishment.sector || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Endereço</p>
              <p className="font-medium">{establishment.address || '-'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. Sistemas de Climatização */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Thermometer className="w-4 h-4" />
            2. Sistemas de Climatização
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground">Total de Equipamentos</p>
              <p className="text-2xl font-bold">{climate_systems.total_equipment}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground">Capacidade Total</p>
              <p className="text-2xl font-bold">
                {(climate_systems.total_capacity_btu / 1000).toLocaleString('pt-BR')}k
              </p>
              <p className="text-xs text-muted-foreground">BTUs</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground">Capacidade (TR)</p>
              <p className="text-2xl font-bold">{climate_systems.total_capacity_tr}</p>
              <p className="text-xs text-muted-foreground">Toneladas</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground">Tipos de Equip.</p>
              <p className="text-2xl font-bold">{climate_systems.equipment_by_type.length}</p>
            </div>
          </div>

          {/* Distribuição por tipo */}
          {climate_systems.equipment_by_type.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">Distribuição por Tipo</p>
              <div className="flex flex-wrap gap-2">
                {climate_systems.equipment_by_type.map((item) => (
                  <Badge key={item.type} variant="secondary">
                    {item.type}: {item.count}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 3. Resumo de Manutenções */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Wrench className="w-4 h-4" />
            3. Manutenções Realizadas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Preventivas */}
            <div className="p-4 rounded-lg border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Preventivas</span>
                <Badge variant="outline" className="bg-blue-50 text-blue-700">
                  {maintenance_summary.preventive.compliance_rate}%
                </Badge>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Programadas</span>
                  <span>{maintenance_summary.preventive.scheduled}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Executadas</span>
                  <span className="text-green-600">{maintenance_summary.preventive.completed}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Pendentes</span>
                  <span className="text-amber-600">{maintenance_summary.preventive.pending}</span>
                </div>
              </div>
              <Progress 
                value={maintenance_summary.preventive.compliance_rate} 
                className="mt-2 h-2"
              />
            </div>

            {/* Corretivas */}
            <div className="p-4 rounded-lg border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Corretivas</span>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Abertas</span>
                  <span>{maintenance_summary.corrective.opened}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Concluídas</span>
                  <span className="text-green-600">{maintenance_summary.corrective.completed}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Pendentes</span>
                  <span className="text-amber-600">{maintenance_summary.corrective.pending}</span>
                </div>
                {maintenance_summary.corrective.average_response_hours && (
                  <div className="flex justify-between text-sm mt-2 pt-2 border-t">
                    <span className="text-muted-foreground">MTTR</span>
                    <span>{maintenance_summary.corrective.average_response_hours}h</span>
                  </div>
                )}
              </div>
            </div>

            {/* Taxa de Conformidade */}
            <div className="p-4 rounded-lg border bg-gradient-to-br from-primary/5 to-transparent">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Conformidade Geral</span>
              </div>
              <div className="flex items-center justify-center py-4">
                <div className="relative">
                  <Gauge className="w-16 h-16 text-primary/20" />
                  <span className="absolute inset-0 flex items-center justify-center text-xl font-bold">
                    {maintenance_summary.overall_compliance_rate}%
                  </span>
                </div>
              </div>
              <p className="text-xs text-center text-muted-foreground">
                Meta: 80%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 4. Observações */}
      {observations.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-4 h-4" />
              4. Observações e Recomendações
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {observations.map((obs, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  {obs.includes('⚠️') ? (
                    <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                  ) : obs.includes('✅') ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  ) : (
                    <span className="w-4 h-4 flex-shrink-0" />
                  )}
                  <span>{obs.replace(/⚠️|✅|ℹ️/g, '').trim()}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* 5. Responsável Técnico */}
      {responsible_technician.name && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="w-4 h-4" />
              5. Responsável Técnico
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Nome</p>
                <p className="font-medium">{responsible_technician.name}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">CREA</p>
                <p className="font-medium">{responsible_technician.crea || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Telefone</p>
                <p className="font-medium">{responsible_technician.phone || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">E-mail</p>
                <p className="font-medium">{responsible_technician.email || '-'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista de Equipamentos (colapsável) */}
      {equipment_list.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Detalhamento por Equipamento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tag</TableHead>
                    <TableHead>Equipamento</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Local</TableHead>
                    <TableHead className="text-center">Prev.</TableHead>
                    <TableHead className="text-center">Corr.</TableHead>
                    <TableHead className="text-right">Conformidade</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {equipment_list.slice(0, 10).map((eq) => (
                    <TableRow key={eq.tag || eq.name}>
                      <TableCell className="font-mono text-xs">{eq.tag || '-'}</TableCell>
                      <TableCell>{eq.name}</TableCell>
                      <TableCell>{eq.type}</TableCell>
                      <TableCell className="max-w-[150px] truncate">{eq.location}</TableCell>
                      <TableCell className="text-center">{eq.preventive_count}</TableCell>
                      <TableCell className="text-center">{eq.corrective_count}</TableCell>
                      <TableCell className="text-right">
                        <Badge 
                          variant="secondary"
                          className={cn(
                            eq.compliance_rate >= 80 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-amber-100 text-amber-700'
                          )}
                        >
                          {eq.compliance_rate}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {equipment_list.length > 10 && (
                <p className="text-xs text-muted-foreground text-center mt-2">
                  Mostrando 10 de {equipment_list.length} equipamentos. 
                  Exporte o PDF para ver a lista completa.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rodapé */}
      <div className="text-xs text-muted-foreground text-center py-4 border-t">
        <p>Relatório gerado em {new Date(report.generated_at).toLocaleString('pt-BR')}</p>
        <p>Sistema ClimaTrak - Gestão de Manutenção e Monitoramento</p>
      </div>
    </div>
  );
}

interface PMOCAnnualPreviewProps {
  report: PMOCAnnualReport;
  onExportPDF?: () => void;
  isExporting?: boolean;
}

export function PMOCAnnualPreview({ report, onExportPDF, isExporting }: PMOCAnnualPreviewProps) {
  const { 
    establishment, 
    climate_systems, 
    maintenance_annual, 
    monthly_breakdown, 
    kpis, 
    conclusions,
    responsible_technician 
  } = report;
  
  return (
    <div className="space-y-6">
      {/* Cabeçalho do Relatório */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <ClipboardCheck className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">RELATÓRIO PMOC ANUAL</h2>
                <p className="text-muted-foreground">
                  Consolidado Anual - Plano de Manutenção, Operação e Controle
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    Ano {report.period.year}
                  </span>
                </div>
              </div>
            </div>
            {onExportPDF && (
              <Button onClick={onExportPDF} disabled={isExporting} className="gap-2">
                {isExporting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                Exportar PDF
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 1. Identificação do Estabelecimento */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            1. Identificação do Estabelecimento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Razão Social</p>
              <p className="font-medium">{establishment.company || establishment.name || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Unidade/Site</p>
              <p className="font-medium">{establishment.name || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Setor</p>
              <p className="font-medium">{establishment.sector || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Endereço</p>
              <p className="font-medium">{establishment.address || '-'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. KPIs Anuais */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Gauge className="w-4 h-4" />
            2. Indicadores de Desempenho (KPIs)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="p-4 rounded-lg bg-gradient-to-br from-blue-50 to-transparent border border-blue-100">
              <p className="text-xs text-muted-foreground">Conformidade Preventiva</p>
              <p className="text-2xl font-bold text-blue-700">{kpis.preventive_compliance}%</p>
            </div>
            <div className="p-4 rounded-lg bg-gradient-to-br from-amber-50 to-transparent border border-amber-100">
              <p className="text-xs text-muted-foreground">Razão Corretivas</p>
              <p className="text-2xl font-bold text-amber-700">{kpis.corrective_ratio}%</p>
            </div>
            <div className="p-4 rounded-lg bg-gradient-to-br from-green-50 to-transparent border border-green-100">
              <p className="text-xs text-muted-foreground">Disponibilidade</p>
              <p className="text-2xl font-bold text-green-700">{kpis.equipment_availability}%</p>
            </div>
            <div className="p-4 rounded-lg bg-gradient-to-br from-purple-50 to-transparent border border-purple-100">
              <p className="text-xs text-muted-foreground">MTTR Médio</p>
              <p className="text-2xl font-bold text-purple-700">
                {kpis.average_response_time ? `${kpis.average_response_time}h` : '-'}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-gradient-to-br from-red-50 to-transparent border border-red-100">
              <p className="text-xs text-muted-foreground">Aging Backlog</p>
              <p className="text-2xl font-bold text-red-700">{kpis.backlog_aging_days}d</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. Consolidado Anual */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Wrench className="w-4 h-4" />
            3. Consolidado de Manutenções
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground">Total de OS</p>
              <p className="text-2xl font-bold">{maintenance_annual.total_work_orders}</p>
            </div>
            <div className="p-3 rounded-lg bg-blue-50">
              <p className="text-xs text-muted-foreground">Preventivas</p>
              <p className="text-2xl font-bold text-blue-700">{maintenance_annual.total_preventive}</p>
            </div>
            <div className="p-3 rounded-lg bg-amber-50">
              <p className="text-xs text-muted-foreground">Corretivas</p>
              <p className="text-2xl font-bold text-amber-700">{maintenance_annual.total_corrective}</p>
            </div>
            <div className="p-3 rounded-lg bg-green-50">
              <p className="text-xs text-muted-foreground">Conformidade Geral</p>
              <p className="text-2xl font-bold text-green-700">{maintenance_annual.overall_compliance_rate}%</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 4. Breakdown Mensal */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            4. Evolução Mensal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mês</TableHead>
                  <TableHead className="text-center">Prev. Prog.</TableHead>
                  <TableHead className="text-center">Prev. Exec.</TableHead>
                  <TableHead className="text-center">Corr. Abertas</TableHead>
                  <TableHead className="text-center">Corr. Exec.</TableHead>
                  <TableHead className="text-right">Conformidade</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {monthly_breakdown.map((month) => (
                  <TableRow key={month.month}>
                    <TableCell className="font-medium">{month.month_name}</TableCell>
                    <TableCell className="text-center">{month.preventive_scheduled}</TableCell>
                    <TableCell className="text-center text-green-600">{month.preventive_completed}</TableCell>
                    <TableCell className="text-center">{month.corrective_opened}</TableCell>
                    <TableCell className="text-center text-green-600">{month.corrective_completed}</TableCell>
                    <TableCell className="text-right">
                      <Badge 
                        variant="secondary"
                        className={cn(
                          month.compliance_rate >= 80 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-amber-100 text-amber-700'
                        )}
                      >
                        {month.compliance_rate}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* 5. Conclusões e Recomendações */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-4 h-4" />
              5. Conclusões e Recomendações
            </CardTitle>
            <Badge 
              variant={conclusions.overall_status === 'CONFORME' ? 'default' : 'destructive'}
              className={conclusions.overall_status === 'CONFORME' ? 'bg-green-600' : ''}
            >
              {conclusions.overall_status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium mb-2">Resumo</p>
            <ul className="space-y-1">
              {conclusions.summary.map((item, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  {item.includes('⚠️') ? (
                    <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                  ) : item.includes('✅') ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  ) : (
                    <span className="w-4 h-4 flex-shrink-0" />
                  )}
                  <span>{item.replace(/⚠️|✅|ℹ️/g, '').trim()}</span>
                </li>
              ))}
            </ul>
          </div>
          
          <Separator />
          
          <div>
            <p className="text-sm font-medium mb-2">Recomendações</p>
            <ul className="space-y-1">
              {conclusions.recommendations.map((rec, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <span className="font-medium text-primary">{index + 1}.</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* 6. Responsável Técnico */}
      {responsible_technician.name && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="w-4 h-4" />
              6. Responsável Técnico
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Nome</p>
                <p className="font-medium">{responsible_technician.name}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">CREA</p>
                <p className="font-medium">{responsible_technician.crea || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Telefone</p>
                <p className="font-medium">{responsible_technician.phone || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">E-mail</p>
                <p className="font-medium">{responsible_technician.email || '-'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rodapé */}
      <div className="text-xs text-muted-foreground text-center py-4 border-t">
        <p>Relatório gerado em {new Date(report.generated_at).toLocaleString('pt-BR')}</p>
        <p>Sistema ClimaTrak - Gestão de Manutenção e Monitoramento</p>
      </div>
    </div>
  );
}
