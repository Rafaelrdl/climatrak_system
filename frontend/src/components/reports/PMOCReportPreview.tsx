/**
 * PMOCReportPreview - Componente de preview do relatório PMOC
 *
 * Exibe uma prévia formatada do relatório PMOC mensal ou anual.
 * Ajustado para refletir um PMOC completo (capa/base legal, inventário, operação, QAI, registros/anexos).
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
  ScrollText,
  AirVent,
  ShieldCheck,
  ClipboardList,
  FileCheck2,
  Wind,
  Droplets,
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
  TableRow,
} from '@/components/ui/table';
import { PMOCMonthlyReport, PMOCAnnualReport } from '@/services/reportsService';
import { PMOCManualData } from './PMOCDataModal';
import { cn } from '@/lib/utils';

type QAIIndicatorStatus = 'OK' | 'ALERTA' | 'FORA' | 'N/A';
type AnnexStatus = 'OK' | 'PENDENTE' | 'N/A';

type PMOCMonthlyReportEnhanced = PMOCMonthlyReport & {
  pmoc?: {
    version?: string;
    validity?: { start?: string; end?: string };
    art_rrt_trt?: string;
    legal_basis?: string[];
    disclosure_location?: string;
  };
  operation?: {
    minimum_oa_m3h_person?: number; // renovação mínima
    oa_filter_min_class?: string; // filtro mínimo na captação
    setpoints?: Array<{
      area?: string;
      schedule?: string;
      temp_c?: string | number;
      rh_percent?: string | number;
      pressure_pa?: string | number;
      oa_m3h_person?: string | number;
      notes?: string;
    }>;
  };
  qai?: {
    criterion?: string; // 'RE 09/2003' | 'ABNT NBR 17037' | ...
    status?: 'CONFORME' | 'NAO_CONFORME' | 'NAO_APLICAVEL';
    last_sampled_at?: string;
    indicators?: Array<{
      name: string;
      value?: string | number;
      unit?: string;
      limit?: string;
      status?: QAIIndicatorStatus;
      notes?: string;
    }>;
  };
  annexes?: Array<{
    name: string;
    status: AnnexStatus;
    notes?: string;
  }>;
  emergency_plan?: string[]; // recomendações para falhas e emergências
};

type PMOCAnnualReportEnhanced = PMOCAnnualReport & {
  pmoc?: PMOCMonthlyReportEnhanced['pmoc'];
  operation?: PMOCMonthlyReportEnhanced['operation'];
  qai?: {
    criterion?: string;
    annual_status?: 'CONFORME' | 'NAO_CONFORME' | 'NAO_APLICAVEL';
    samples_count?: number;
    indicators?: Array<{
      name: string;
      best?: string | number;
      worst?: string | number;
      unit?: string;
      limit?: string;
      status?: QAIIndicatorStatus;
      notes?: string;
    }>;
  };
  annexes?: PMOCMonthlyReportEnhanced['annexes'];
  emergency_plan?: string[];
};

function formatDate(value?: string) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value; // caso venha "01/01/2026" string
  return d.toLocaleDateString('pt-BR');
}

function formatDateTime(value?: string) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString('pt-BR');
}

function badgeForStatus(status?: QAIIndicatorStatus | AnnexStatus) {
  switch (status) {
    case 'OK':
      return 'bg-green-100 text-green-700';
    case 'ALERTA':
      return 'bg-amber-100 text-amber-700';
    case 'FORA':
      return 'bg-red-100 text-red-700';
    case 'PENDENTE':
      return 'bg-amber-100 text-amber-700';
    case 'N/A':
    default:
      return 'bg-muted text-muted-foreground';
  }
}

function overallQaiBadgeVariant(status?: string) {
  if (status === 'CONFORME') return { variant: 'default' as const, className: 'bg-green-600' };
  if (status === 'NAO_CONFORME') return { variant: 'destructive' as const, className: '' };
  return { variant: 'secondary' as const, className: 'bg-muted text-muted-foreground' };
}

interface PMOCMonthlyPreviewProps {
  report: PMOCMonthlyReport;
  onExportPDF?: () => void;
  isExporting?: boolean;
  manualData?: PMOCManualData;
}

export function PMOCMonthlyPreview({ report, onExportPDF, isExporting, manualData }: PMOCMonthlyPreviewProps) {
  const {
    establishment,
    climate_systems,
    maintenance_summary,
    equipment_list,
    observations,
    responsible_technician,
  } = report;

  const enhanced = report as PMOCMonthlyReportEnhanced;

  const pmoc = enhanced.pmoc;
  const operation = enhanced.operation;
  const qai = enhanced.qai;
  const annexes = enhanced.annexes ?? [];
  const emergencyPlan = enhanced.emergency_plan ?? [];

  const legalBasis =
    pmoc?.legal_basis?.length
      ? pmoc.legal_basis
      : [
          'Lei 13.589/2018 (PMOC)',
          'Portaria MS 3.523/1998 (operações mínimas)',
          'ANVISA RE 09/2003 e normas ABNT aplicáveis (QAI)',
        ];

  const minOA = operation?.minimum_oa_m3h_person ?? 27;
  const minOaFilter = operation?.oa_filter_min_class ?? 'G1 (mínimo na captação de ar externo)';

  return (
    <div className="space-y-6">
      {/* Cabeçalho do Relatório */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
        <CardContent className="p-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <ClipboardCheck className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">RELATÓRIO PMOC MENSAL</h2>
                <p className="text-muted-foreground">
                  Plano de Manutenção, Operação e Controle
                </p>
                <div className="flex flex-wrap items-center gap-3 mt-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">
                      {report.period.month_name} / {report.period.year}
                    </span>
                  </div>
                  {pmoc?.version && (
                    <Badge variant="secondary" className="bg-muted/60">
                      Versão {pmoc.version}
                    </Badge>
                  )}
                  {pmoc?.validity?.start && pmoc?.validity?.end && (
                    <Badge variant="secondary" className="bg-muted/60">
                      Vigência: {formatDate(pmoc.validity.start)} → {formatDate(pmoc.validity.end)}
                    </Badge>
                  )}
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

      {/* 0. Identificação do PMOC (Capa/Base Legal) */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ScrollText className="w-4 h-4" />
            0. Identificação do PMOC e Base Legal
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground">Vigência</p>
              <p className="font-medium">
                {pmoc?.validity?.start && pmoc?.validity?.end
                  ? `${formatDate(pmoc.validity.start)} → ${formatDate(pmoc.validity.end)}`
                  : '-'}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground">ART/RRT/TRT (RT)</p>
              <p className="font-medium">{manualData?.art_rrt_trt || pmoc?.art_rrt_trt || '-'}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground">Disponibilização do PMOC</p>
              <p className="font-medium">{manualData?.disclosure_location || pmoc?.disclosure_location || '-'}</p>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium mb-2">Referências (Base Legal / Normas)</p>
            <div className="flex flex-wrap gap-2">
              {legalBasis.map((item) => (
                <Badge key={item} variant="secondary" className="bg-muted/60">
                  {item}
                </Badge>
              ))}
            </div>
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

      {/* 2. Inventário & Sistemas de Climatização */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Thermometer className="w-4 h-4" />
            2. Inventário e Sistemas de Climatização
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

      {/* 3. Operação e Controle (Setpoints + Renovação) */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <AirVent className="w-4 h-4" />
            3. Operação e Controle (Setpoints e Renovação)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg border bg-gradient-to-br from-primary/5 to-transparent">
              <div className="flex items-center gap-2">
                <Wind className="w-4 h-4 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Renovação mínima (referência)</p>
              </div>
              <p className="text-2xl font-bold">{minOA}</p>
              <p className="text-xs text-muted-foreground">m³/h/pessoa</p>
            </div>

            <div className="p-4 rounded-lg border">
              <div className="flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Filtro mínimo na captação</p>
              </div>
              <p className="font-medium mt-1">{minOaFilter}</p>
            </div>

            <div className="p-4 rounded-lg border">
              <div className="flex items-center gap-2">
                <Droplets className="w-4 h-4 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Setpoints por zona</p>
              </div>
              <p className="font-medium mt-1">
                {operation?.setpoints?.length ? `${operation.setpoints.length} zonas` : '-'}
              </p>
            </div>
          </div>

          {operation?.setpoints?.length ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Área/Zona</TableHead>
                    <TableHead>Horário</TableHead>
                    <TableHead className="text-center">T (°C)</TableHead>
                    <TableHead className="text-center">UR (%)</TableHead>
                    <TableHead className="text-center">Pressão</TableHead>
                    <TableHead className="text-center">Renovação</TableHead>
                    <TableHead>Obs.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {operation.setpoints.map((sp, idx) => (
                    <TableRow key={`${sp.area ?? 'zona'}-${idx}`}>
                      <TableCell className="font-medium">{sp.area || '-'}</TableCell>
                      <TableCell className="text-muted-foreground">{sp.schedule || '-'}</TableCell>
                      <TableCell className="text-center">{sp.temp_c ?? '-'}</TableCell>
                      <TableCell className="text-center">{sp.rh_percent ?? '-'}</TableCell>
                      <TableCell className="text-center">{sp.pressure_pa ?? '-'}</TableCell>
                      <TableCell className="text-center">
                        {sp.oa_m3h_person ?? '-'}
                      </TableCell>
                      <TableCell className="max-w-[220px] truncate">{sp.notes || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Sem setpoints configurados no relatório (opcional). Se você alimentar isso no backend, o preview já renderiza.
            </p>
          )}
        </CardContent>
      </Card>

      {/* 4. Plano/Execução de Manutenção */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Wrench className="w-4 h-4" />
            4. Execução do Plano de Manutenção
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
              <Progress value={maintenance_summary.preventive.compliance_rate} className="mt-2 h-2" />
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

            {/* Conformidade Geral */}
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
              <p className="text-xs text-center text-muted-foreground">Meta: 80%</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 5. Controle de Qualidade do Ar Interior (QAI) */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" />
              5. Controle de Qualidade do Ar Interior (QAI)
            </CardTitle>

            <Badge
              variant={overallQaiBadgeVariant(qai?.status).variant}
              className={overallQaiBadgeVariant(qai?.status).className}
            >
              {qai?.status || 'NÃO INFORMADO'}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground">Critério / Norma</p>
              <p className="font-medium">{qai?.criterion || '-'}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground">Última coleta</p>
              <p className="font-medium">{formatDateTime(qai?.last_sampled_at)}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground">Parâmetros avaliados</p>
              <p className="font-medium">{qai?.indicators?.length ?? '-'}</p>
            </div>
          </div>

          {qai?.indicators?.length ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Parâmetro</TableHead>
                    <TableHead className="text-center">Valor</TableHead>
                    <TableHead className="text-center">Limite/Alvo</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {qai.indicators.map((it, idx) => (
                    <TableRow key={`${it.name}-${idx}`}>
                      <TableCell className="font-medium">{it.name}</TableCell>
                      <TableCell className="text-center">
                        {it.value ?? '-'} {it.unit ?? ''}
                      </TableCell>
                      <TableCell className="text-center">{it.limit ?? '-'}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="secondary" className={cn(badgeForStatus(it.status))}>
                          {it.status || 'N/A'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <p className="text-xs text-muted-foreground mt-2">
                Dica: quando integrar o laudo/lab no backend, adicione também “instrumento/calibração” e “pontos de coleta”.
              </p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Nenhum parâmetro de QAI informado neste relatório (opcional). Se você alimentar `qai.indicators`, o preview monta a tabela.
            </p>
          )}
        </CardContent>
      </Card>

      {/* 6. Registros e Anexos (evidências) */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardList className="w-4 h-4" />
            6. Registros e Anexos (Evidências)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {annexes.length ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Anexo</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {annexes.map((a, idx) => (
                    <TableRow key={`${a.name}-${idx}`}>
                      <TableCell className="font-medium">
                        {a.name}
                        {a.notes ? (
                          <p className="text-xs text-muted-foreground mt-1">{a.notes}</p>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="secondary" className={cn(badgeForStatus(a.status))}>
                          {a.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Sem anexos configurados. Sugestão de anexos padrão: ART/RRT/TRT, inventário, planta/croqui, checklist OS, laudo QAI, histórico de filtros.
            </p>
          )}

          {emergencyPlan.length ? (
            <>
              <Separator />
              <div>
                <p className="text-sm font-medium mb-2">Recomendações para falhas e emergências</p>
                <ul className="space-y-1">
                  {emergencyPlan.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          ) : null}
        </CardContent>
      </Card>

      {/* 7. Observações e Recomendações */}
      {observations.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-4 h-4" />
              7. Observações e Recomendações
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

      {/* 8. Responsável Técnico */}
      {(responsible_technician.name || manualData?.responsible_technician?.name) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="w-4 h-4" />
              8. Responsável Técnico
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Nome</p>
                <p className="font-medium">{manualData?.responsible_technician?.name || responsible_technician.name}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">CREA</p>
                <p className="font-medium">{manualData?.responsible_technician?.crea || responsible_technician.crea || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Telefone</p>
                <p className="font-medium">{manualData?.responsible_technician?.phone || responsible_technician.phone || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">E-mail</p>
                <p className="font-medium">{manualData?.responsible_technician?.email || responsible_technician.email || '-'}</p>
              </div>
            </div>

            {/* Responsável Legal (dados manuais) */}
            {manualData?.responsible_legal?.name && (
              <>
                <Separator className="my-4" />
                <p className="text-sm font-medium mb-3">Responsável Legal</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Nome</p>
                    <p className="font-medium">{manualData.responsible_legal.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Cargo</p>
                    <p className="font-medium">{manualData.responsible_legal.role || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">CPF/CNPJ</p>
                    <p className="font-medium">{manualData.responsible_legal.document || '-'}</p>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* 9. Detalhamento por Equipamento */}
      {equipment_list.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              9. Detalhamento por Equipamento
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
                  Mostrando 10 de {equipment_list.length} equipamentos. Exporte o PDF para ver a lista completa.
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
  manualData?: PMOCManualData;
}

export function PMOCAnnualPreview({ report, onExportPDF, isExporting, manualData }: PMOCAnnualPreviewProps) {
  const {
    establishment,
    climate_systems,
    maintenance_annual,
    monthly_breakdown,
    kpis,
    conclusions,
    responsible_technician,
  } = report;

  const enhanced = report as PMOCAnnualReportEnhanced;
  const pmoc = enhanced.pmoc;
  const operation = enhanced.operation;
  const qai = enhanced.qai;
  const annexes = enhanced.annexes ?? [];
  const emergencyPlan = enhanced.emergency_plan ?? [];

  const legalBasis =
    pmoc?.legal_basis?.length
      ? pmoc.legal_basis
      : [
          'Lei 13.589/2018 (PMOC)',
          'Portaria MS 3.523/1998 (operações mínimas)',
          'ANVISA RE 09/2003 e normas ABNT aplicáveis (QAI)',
        ];

  const minOA = operation?.minimum_oa_m3h_person ?? 27;
  const minOaFilter = operation?.oa_filter_min_class ?? 'G1 (mínimo na captação de ar externo)';

  return (
    <div className="space-y-6">
      {/* Cabeçalho do Relatório */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
        <CardContent className="p-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <ClipboardCheck className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">RELATÓRIO PMOC ANUAL</h2>
                <p className="text-muted-foreground">
                  Consolidado Anual - Plano de Manutenção, Operação e Controle
                </p>
                <div className="flex flex-wrap items-center gap-3 mt-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Ano {report.period.year}</span>
                  </div>
                  {pmoc?.version && (
                    <Badge variant="secondary" className="bg-muted/60">
                      Versão {pmoc.version}
                    </Badge>
                  )}
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

      {/* 0. Base Legal / Identificação do PMOC */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ScrollText className="w-4 h-4" />
            0. Identificação do PMOC e Base Legal
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground">Vigência</p>
              <p className="font-medium">
                {pmoc?.validity?.start && pmoc?.validity?.end
                  ? `${formatDate(pmoc.validity.start)} → ${formatDate(pmoc.validity.end)}`
                  : '-'}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground">ART/RRT/TRT (RT)</p>
              <p className="font-medium">{manualData?.art_rrt_trt || pmoc?.art_rrt_trt || '-'}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground">Disponibilização do PMOC</p>
              <p className="font-medium">{manualData?.disclosure_location || pmoc?.disclosure_location || '-'}</p>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium mb-2">Referências (Base Legal / Normas)</p>
            <div className="flex flex-wrap gap-2">
              {legalBasis.map((item) => (
                <Badge key={item} variant="secondary" className="bg-muted/60">
                  {item}
                </Badge>
              ))}
            </div>
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

      {/* 2. Operação (resumo anual) */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <AirVent className="w-4 h-4" />
            2. Operação e Controle (Referências)
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg border bg-gradient-to-br from-primary/5 to-transparent">
            <div className="flex items-center gap-2">
              <Wind className="w-4 h-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Renovação mínima (referência)</p>
            </div>
            <p className="text-2xl font-bold">{minOA}</p>
            <p className="text-xs text-muted-foreground">m³/h/pessoa</p>
          </div>

          <div className="p-4 rounded-lg border">
            <div className="flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Filtro mínimo na captação</p>
            </div>
            <p className="font-medium mt-1">{minOaFilter}</p>
          </div>

          <div className="p-4 rounded-lg border">
            <p className="text-xs text-muted-foreground">Capacidade Total (TR)</p>
            <p className="text-2xl font-bold">{climate_systems.total_capacity_tr}</p>
            <p className="text-xs text-muted-foreground">Total do inventário</p>
          </div>
        </CardContent>
      </Card>

      {/* 3. KPIs Anuais */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Gauge className="w-4 h-4" />
            3. Indicadores de Desempenho (KPIs)
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

      {/* 4. Consolidado Anual */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Wrench className="w-4 h-4" />
            4. Consolidado de Manutenções
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

      {/* 5. QAI Anual */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" />
              5. Qualidade do Ar Interior (QAI) - Consolidado
            </CardTitle>
            <Badge
              variant={overallQaiBadgeVariant(qai?.annual_status).variant}
              className={overallQaiBadgeVariant(qai?.annual_status).className}
            >
              {qai?.annual_status || 'NÃO INFORMADO'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground">Critério / Norma</p>
              <p className="font-medium">{qai?.criterion || '-'}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground">Amostras no ano</p>
              <p className="font-medium">{qai?.samples_count ?? '-'}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground">Parâmetros</p>
              <p className="font-medium">{qai?.indicators?.length ?? '-'}</p>
            </div>
          </div>

          {qai?.indicators?.length ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Parâmetro</TableHead>
                    <TableHead className="text-center">Melhor</TableHead>
                    <TableHead className="text-center">Pior</TableHead>
                    <TableHead className="text-center">Limite/Alvo</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {qai.indicators.map((it, idx) => (
                    <TableRow key={`${it.name}-${idx}`}>
                      <TableCell className="font-medium">{it.name}</TableCell>
                      <TableCell className="text-center">
                        {it.best ?? '-'} {it.unit ?? ''}
                      </TableCell>
                      <TableCell className="text-center">
                        {it.worst ?? '-'} {it.unit ?? ''}
                      </TableCell>
                      <TableCell className="text-center">{it.limit ?? '-'}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="secondary" className={cn(badgeForStatus(it.status))}>
                          {it.status || 'N/A'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Sem consolidado de QAI no relatório anual (opcional).
            </p>
          )}
        </CardContent>
      </Card>

      {/* 6. Breakdown Mensal */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            6. Evolução Mensal
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

      {/* 7. Conclusões e Recomendações */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-4 h-4" />
              7. Conclusões e Recomendações
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

          {emergencyPlan.length ? (
            <>
              <Separator />
              <div>
                <p className="text-sm font-medium mb-2">Recomendações para falhas e emergências</p>
                <ul className="space-y-1">
                  {emergencyPlan.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          ) : null}
        </CardContent>
      </Card>

      {/* 8. Registros e Anexos (anual) */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardList className="w-4 h-4" />
            8. Registros e Anexos (Evidências)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {annexes.length ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Anexo</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {annexes.map((a, idx) => (
                    <TableRow key={`${a.name}-${idx}`}>
                      <TableCell className="font-medium">
                        {a.name}
                        {a.notes ? (
                          <p className="text-xs text-muted-foreground mt-1">{a.notes}</p>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="secondary" className={cn(badgeForStatus(a.status))}>
                          {a.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Sem anexos configurados no anual (opcional).
            </p>
          )}
        </CardContent>
      </Card>

      {/* 9. Responsável Técnico */}
      {(responsible_technician.name || manualData?.responsible_technician?.name) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="w-4 h-4" />
              9. Responsável Técnico
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Nome</p>
                <p className="font-medium">{manualData?.responsible_technician?.name || responsible_technician.name}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">CREA</p>
                <p className="font-medium">{manualData?.responsible_technician?.crea || responsible_technician.crea || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Telefone</p>
                <p className="font-medium">{manualData?.responsible_technician?.phone || responsible_technician.phone || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">E-mail</p>
                <p className="font-medium">{manualData?.responsible_technician?.email || responsible_technician.email || '-'}</p>
              </div>
            </div>

            {/* Responsável Legal (dados manuais) */}
            {manualData?.responsible_legal?.name && (
              <>
                <Separator className="my-4" />
                <p className="text-sm font-medium mb-3">Responsável Legal</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Nome</p>
                    <p className="font-medium">{manualData.responsible_legal.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Cargo</p>
                    <p className="font-medium">{manualData.responsible_legal.role || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">CPF/CNPJ</p>
                    <p className="font-medium">{manualData.responsible_legal.document || '-'}</p>
                  </div>
                </div>
              </>
            )}
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
