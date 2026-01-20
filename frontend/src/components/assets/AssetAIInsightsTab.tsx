/**
 * AssetAIInsightsTab - Tab de Insights de IA para o Ativo
 *
 * Exibe insights dos agentes de IA:
 * - Predictive: Score de risco e sugestão de OS preditiva
 * - Preventive: Recomendações preventivas
 * - Patterns: Padrões de manutenção e consumo de peças
 */

import { useState } from 'react';
import {
  Brain,
  RefreshCw,
  TrendingUp,
  Calendar,
  BarChart3,
  AlertCircle,
  CheckCircle2,
  Clock,
  Wrench,
  Package,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  getAssetAIInsights,
  getAIJob,
  runPredictiveAnalysis,
  runPreventiveAnalysis,
  runPatternsAnalysis,
  pollAIJob,
  JobStatus,
  type PredictiveOutput,
  type PreventiveOutput,
  type PatternsOutput,
  type AIJob,
} from '@/services/aiService';

// ============================================================================
// Types
// ============================================================================

interface AssetAIInsightsTabProps {
  assetId: number;
  assetTag: string;
}

// ============================================================================
// Risk Level Badge Component
// ============================================================================

function RiskLevelBadge({ level, score }: { level: string; score: number }) {
  const config = {
    minimal: { variant: 'secondary' as const, label: 'Mínimo', color: 'text-muted-foreground' },
    low: { variant: 'secondary' as const, label: 'Baixo', color: 'text-green-600' },
    medium: { variant: 'default' as const, label: 'Médio', color: 'text-amber-600' },
    high: { variant: 'destructive' as const, label: 'Alto', color: 'text-red-600' },
  };

  const cfg = config[level as keyof typeof config] || config.low;

  return (
    <div className="flex items-center gap-2">
      <Badge variant={cfg.variant} className="font-medium">
        {cfg.label}
      </Badge>
      <span className={cn('text-sm font-semibold', cfg.color)}>{score}/100</span>
    </div>
  );
}

// ============================================================================
// Priority Badge Component
// ============================================================================

function PriorityBadge({ priority }: { priority: string }) {
  const config = {
    critical: { variant: 'destructive' as const, label: 'Crítica' },
    high: { variant: 'destructive' as const, label: 'Alta' },
    medium: { variant: 'default' as const, label: 'Média' },
    low: { variant: 'secondary' as const, label: 'Baixa' },
  };

  const cfg = config[priority.toLowerCase() as keyof typeof config] || config.medium;

  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}

// ============================================================================
// Card Components
// ============================================================================

function PredictiveCard({
  job,
  isGenerating,
  onGenerate,
}: {
  job: AIJob | null;
  isGenerating: boolean;
  onGenerate: () => void;
}) {
  const [isOpen, setIsOpen] = useState(true);
  const output = job?.output_data as PredictiveOutput | undefined;

  const riskColors = {
    minimal: 'bg-muted',
    low: 'bg-green-500',
    medium: 'bg-amber-500',
    high: 'bg-red-500',
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="p-1.5 rounded-md bg-blue-500/10">
              <TrendingUp className="w-4 h-4 text-blue-500" />
            </div>
            Risco Preditivo
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={onGenerate}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-1.5" />
            )}
            {isGenerating ? 'Analisando...' : 'Gerar Agora'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!job && !isGenerating && (
          <div className="text-center py-6 text-muted-foreground">
            <Brain className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nenhuma análise preditiva disponível</p>
            <p className="text-xs mt-1">Clique em "Gerar Agora" para analisar</p>
          </div>
        )}

        {isGenerating && (
          <div className="text-center py-6">
            <Loader2 className="h-8 w-8 mx-auto mb-2 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Calculando risco preditivo...</p>
          </div>
        )}

        {output && (
          <div className="space-y-4">
            {/* Risk Score */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Score de Risco</span>
              <RiskLevelBadge level={output.risk.level} score={output.risk.score} />
            </div>

            {/* Progress Bar */}
            <Progress
              value={output.risk.score}
              className={cn(
                'h-2',
                riskColors[output.risk.level as keyof typeof riskColors]
              )}
            />

            {/* Drivers */}
            {output.risk.drivers.length > 0 && (
              <Collapsible open={isOpen} onOpenChange={setIsOpen}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-full justify-between">
                    <span className="text-sm">Drivers ({output.risk.drivers.length})</span>
                    {isOpen ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2">
                  <ul className="space-y-1.5">
                    {output.risk.drivers.map((driver, idx) => (
                      <li key={idx} className="text-xs text-muted-foreground flex items-start gap-2">
                        <AlertCircle className="h-3 w-3 mt-0.5 shrink-0 text-amber-500" />
                        {driver}
                      </li>
                    ))}
                  </ul>
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Recommended WO */}
            {output.recommended_work_order?.should_create && (
              <Alert className="bg-amber-50 border-amber-200">
                <Wrench className="h-4 w-4 text-amber-600" />
                <AlertTitle className="text-amber-800">Ação Recomendada</AlertTitle>
                <AlertDescription className="text-amber-700 text-xs mt-1">
                  {output.recommended_work_order.title}
                  <div className="mt-2">
                    <PriorityBadge priority={output.recommended_work_order.priority} />
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Timestamp */}
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-2 border-t">
              <Clock className="h-3 w-3" />
              Atualizado em {new Date(output.as_of).toLocaleString('pt-BR')}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PreventiveCard({
  job,
  isGenerating,
  onGenerate,
}: {
  job: AIJob | null;
  isGenerating: boolean;
  onGenerate: () => void;
}) {
  const [isOpen, setIsOpen] = useState(true);
  const output = job?.output_data as PreventiveOutput | undefined;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="p-1.5 rounded-md bg-emerald-500/10">
              <Calendar className="w-4 h-4 text-emerald-500" />
            </div>
            Manutenção Preventiva
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={onGenerate}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-1.5" />
            )}
            {isGenerating ? 'Analisando...' : 'Gerar Agora'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!job && !isGenerating && (
          <div className="text-center py-6 text-muted-foreground">
            <Calendar className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nenhuma análise preventiva disponível</p>
            <p className="text-xs mt-1">Clique em "Gerar Agora" para analisar</p>
          </div>
        )}

        {isGenerating && (
          <div className="text-center py-6">
            <Loader2 className="h-8 w-8 mx-auto mb-2 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Analisando planos preventivos...</p>
          </div>
        )}

        {output && (
          <div className="space-y-4">
            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-2 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold">{output.summary.total_open_work_orders}</p>
                <p className="text-xs text-muted-foreground">OS Abertas</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-red-50">
                <p className="text-2xl font-bold text-red-600">{output.summary.total_overdue_plans}</p>
                <p className="text-xs text-muted-foreground">Planos Vencidos</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-amber-50">
                <p className="text-2xl font-bold text-amber-600">{output.summary.total_due_soon_plans}</p>
                <p className="text-xs text-muted-foreground">Próximos 7d</p>
              </div>
            </div>

            {/* Recommendations */}
            {output.recommendations.length > 0 && (
              <Collapsible open={isOpen} onOpenChange={setIsOpen}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-full justify-between">
                    <span className="text-sm">Recomendações ({output.recommendations.length})</span>
                    {isOpen ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 space-y-2">
                  {output.recommendations.slice(0, 5).map((rec, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg border bg-card text-card-foreground"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-sm font-medium">{rec.title}</span>
                        <PriorityBadge priority={rec.priority} />
                      </div>
                      {rec.rationale && rec.rationale.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {rec.rationale[0]}
                        </p>
                      )}
                    </div>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            )}

            {output.recommendations.length === 0 && (
              <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-3 rounded-lg">
                <CheckCircle2 className="h-4 w-4" />
                Nenhuma ação preventiva necessária
              </div>
            )}

            {/* Timestamp */}
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-2 border-t">
              <Clock className="h-3 w-3" />
              Atualizado em {new Date(output.as_of).toLocaleString('pt-BR')}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PatternsCard({
  job,
  isGenerating,
  onGenerate,
}: {
  job: AIJob | null;
  isGenerating: boolean;
  onGenerate: () => void;
}) {
  const [isOpen, setIsOpen] = useState(true);
  const output = job?.output_data as PatternsOutput | undefined;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="p-1.5 rounded-md bg-purple-500/10">
              <BarChart3 className="w-4 h-4 text-purple-500" />
            </div>
            Padrões de Manutenção
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={onGenerate}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-1.5" />
            )}
            {isGenerating ? 'Analisando...' : 'Gerar Agora'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!job && !isGenerating && (
          <div className="text-center py-6 text-muted-foreground">
            <BarChart3 className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nenhuma análise de padrões disponível</p>
            <p className="text-xs mt-1">Clique em "Gerar Agora" para analisar</p>
          </div>
        )}

        {isGenerating && (
          <div className="text-center py-6">
            <Loader2 className="h-8 w-8 mx-auto mb-2 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Identificando padrões...</p>
          </div>
        )}

        {output && (
          <div className="space-y-4">
            {/* KPIs */}
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-2 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold">{output.kpis.work_orders_total}</p>
                <p className="text-xs text-muted-foreground">Total OS</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-red-50">
                <p className="text-2xl font-bold text-red-600">{output.kpis.corrective}</p>
                <p className="text-xs text-muted-foreground">Corretivas</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-emerald-50">
                <p className="text-2xl font-bold text-emerald-600">{output.kpis.preventive}</p>
                <p className="text-xs text-muted-foreground">Preventivas</p>
              </div>
            </div>

            {/* Top Parts */}
            {output.top_parts && output.top_parts.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium flex items-center gap-1.5">
                  <Package className="h-4 w-4" />
                  Peças Mais Consumidas
                </p>
                <div className="space-y-1.5">
                  {output.top_parts.slice(0, 3).map((part, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between text-sm p-2 rounded bg-muted/30"
                    >
                      <span className="text-muted-foreground truncate max-w-[60%]">
                        {part.name}
                      </span>
                      <span className="font-medium">{part.total_qty} un</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Patterns */}
            {output.patterns && output.patterns.length > 0 && (
              <Collapsible open={isOpen} onOpenChange={setIsOpen}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-full justify-between">
                    <span className="text-sm">Padrões Identificados ({output.patterns.length})</span>
                    {isOpen ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 space-y-2">
                  {output.patterns.slice(0, 5).map((pattern, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg border bg-card text-card-foreground"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-sm font-medium">{pattern.title}</span>
                        <PriorityBadge priority={pattern.priority} />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {pattern.recommendation}
                      </p>
                    </div>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Timestamp */}
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-2 border-t">
              <Clock className="h-3 w-3" />
              Período: últimos {output.window_days} dias
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function AssetAIInsightsTab({ assetId, assetTag }: AssetAIInsightsTabProps) {
  const queryClient = useQueryClient();
  const [generatingAgent, setGeneratingAgent] = useState<string | null>(null);

  // Fetch existing insights
  const { data: insights, isLoading, refetch } = useQuery({
    queryKey: ['asset-ai-insights', assetId],
    queryFn: () => getAssetAIInsights(assetId),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Generic handler for running agents
  const handleGenerate = async (agentKey: 'predictive' | 'preventive' | 'patterns') => {
    setGeneratingAgent(agentKey);

    try {
      let jobResponse;

      if (agentKey === 'predictive') {
        jobResponse = await runPredictiveAnalysis(assetId);
      } else if (agentKey === 'preventive') {
        jobResponse = await runPreventiveAnalysis(assetId);
      } else {
        jobResponse = await runPatternsAnalysis(assetId);
      }

      // Poll for completion (300 tentativas x 2s = 10 min para modelos locais lentos)
      const completedJob = await pollAIJob(jobResponse.job_id, 300, 2000);

      if (completedJob?.status === JobStatus.SUCCEEDED) {
        toast.success(`Análise ${agentKey} concluída`);
        refetch();
      } else if (completedJob?.status === JobStatus.FAILED) {
        toast.error(`Análise falhou: ${completedJob.error_message}`);
      } else {
        toast.warning('Análise em processamento, tente novamente em alguns segundos');
      }
    } catch (error) {
      console.error(`Error running ${agentKey}:`, error);
      toast.error(`Erro ao executar análise ${agentKey}`);
    } finally {
      setGeneratingAgent(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Brain className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Insights de IA</h3>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <Card>
            <CardHeader className="pb-3">
              <Skeleton className="h-6 w-40" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-32 w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <Skeleton className="h-6 w-40" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-32 w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <Skeleton className="h-6 w-40" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-32 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-primary/10">
            <Brain className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Insights de IA</h3>
            <p className="text-xs text-muted-foreground">
              Análises automáticas para {assetTag}
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-1.5" />
          Atualizar
        </Button>
      </div>

      {/* Cards Grid */}
      <div className="grid gap-4 lg:grid-cols-3">
        <PredictiveCard
          job={insights?.predictive || null}
          isGenerating={generatingAgent === 'predictive'}
          onGenerate={() => handleGenerate('predictive')}
        />
        <PreventiveCard
          job={insights?.preventive || null}
          isGenerating={generatingAgent === 'preventive'}
          onGenerate={() => handleGenerate('preventive')}
        />
        <PatternsCard
          job={insights?.patterns || null}
          isGenerating={generatingAgent === 'patterns'}
          onGenerate={() => handleGenerate('patterns')}
        />
      </div>

      {/* LLM Summary (if any has it) */}
      {(insights?.predictive?.output_data as unknown as PredictiveOutput)?.llm_summary && (
        <Alert className="bg-gradient-to-r from-primary/5 to-blue-500/5 border-primary/20">
          <Sparkles className="h-4 w-4 text-primary" />
          <AlertTitle className="text-primary">Resumo IA</AlertTitle>
          <AlertDescription className="text-sm mt-1">
            {(insights?.predictive?.output_data as unknown as PredictiveOutput)?.llm_summary}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

export default AssetAIInsightsTab;
