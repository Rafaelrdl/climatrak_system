/**
 * AI Recommendations Component for Inventory
 *
 * Exibe recomendações geradas pelo agente de IA:
 * - Itens para reposição (reorder)
 * - Excesso de estoque (overstock)
 * - Estoque parado (dead_stock)
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Sparkles,
  AlertTriangle,
  PackagePlus,
  PackageMinus,
  Archive,
  Loader2,
  RefreshCw,
  CheckCircle,
  XCircle,
  Info,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  InventoryAnalysisOutput,
  ReorderRecommendation,
  OverstockRecommendation,
  DeadStockRecommendation,
  analyzeInventoryAndWait,
} from '@/services/aiService';
import { inventoryItemsService } from '@/services/inventoryService';

interface AIRecommendationsProps {
  className?: string;
  windowDays?: number;
}

type RecommendationTab = 'reorder' | 'overstock' | 'dead_stock';

export function AIRecommendations({
  className = '',
  windowDays = 90,
}: AIRecommendationsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [analysis, setAnalysis] = useState<InventoryAnalysisOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<RecommendationTab>('reorder');
  const [applyingItem, setApplyingItem] = useState<number | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [selectedRecommendation, setSelectedRecommendation] =
    useState<ReorderRecommendation | null>(null);

  const handleAnalyze = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await analyzeInventoryAndWait(
        { window_days: windowDays, top_n: 30 },
        { maxRetries: 120, delayMs: 1000 }
      );
      setAnalysis(result);
      toast.success('Análise concluída com sucesso');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao gerar recomendações';
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyClick = (rec: ReorderRecommendation) => {
    setSelectedRecommendation(rec);
    setConfirmDialogOpen(true);
  };

  const handleConfirmApply = async () => {
    if (!selectedRecommendation) return;

    setApplyingItem(selectedRecommendation.item_id);
    setConfirmDialogOpen(false);

    try {
      await inventoryItemsService.update(selectedRecommendation.item_id, {
        reorder_point: selectedRecommendation.suggested_reorder_point,
        min_quantity: selectedRecommendation.suggested_min_quantity,
        max_quantity: selectedRecommendation.suggested_max_quantity,
      });

      toast.success(`Parâmetros de "${selectedRecommendation.code}" atualizados`);

      // Remover item da lista após aplicar
      if (analysis) {
        setAnalysis({
          ...analysis,
          recommendations: {
            ...analysis.recommendations,
            reorder: analysis.recommendations.reorder.filter(
              (r) => r.item_id !== selectedRecommendation.item_id
            ),
          },
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao aplicar sugestão';
      toast.error(message);
    } finally {
      setApplyingItem(null);
      setSelectedRecommendation(null);
    }
  };

  const getPriorityBadge = (priority?: string) => {
    switch (priority) {
      case 'critical':
        return <Badge variant="destructive">Crítico</Badge>;
      case 'high':
        return <Badge variant="default" className="bg-orange-500">Alto</Badge>;
      case 'medium':
        return <Badge variant="secondary">Médio</Badge>;
      default:
        return null;
    }
  };

  const getConfidenceBadge = (confidence: string) => {
    switch (confidence) {
      case 'high':
        return <Badge variant="outline" className="text-green-600 border-green-600">Alta</Badge>;
      case 'medium':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-600">Média</Badge>;
      case 'low':
        return <Badge variant="outline" className="text-gray-500">Baixa</Badge>;
      default:
        return null;
    }
  };

  const formatNumber = (value: number | null, decimals = 2) => {
    if (value === null || value === undefined) return '-';
    return value.toLocaleString('pt-BR', { 
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals 
    });
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  return (
    <Card className={cn('', className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-500" />
              Recomendações IA
            </CardTitle>
            <CardDescription>
              Análise inteligente de estoque baseada em consumo real
            </CardDescription>
          </div>
          <Button
            onClick={handleAnalyze}
            disabled={isLoading}
            variant={analysis ? 'outline' : 'default'}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Analisando...
              </>
            ) : analysis ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Regerar
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Gerar Recomendações
              </>
            )}
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {error && (
          <div className="flex items-center gap-2 p-4 bg-red-50 text-red-700 rounded-lg mb-4">
            <XCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        )}

        {!analysis && !isLoading && !error && (
          <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
            <Sparkles className="h-12 w-12 mb-4 text-purple-300" />
            <p className="text-lg font-medium mb-2">
              Otimize seu estoque com IA
            </p>
            <p className="text-sm max-w-md">
              Clique em "Gerar Recomendações" para analisar padrões de consumo e
              receber sugestões de reposição, identificar excessos e estoque parado.
            </p>
          </div>
        )}

        {isLoading && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-purple-500 mb-4" />
            <p className="text-muted-foreground">Analisando padrões de consumo...</p>
            <p className="text-sm text-muted-foreground mt-1">
              Isso pode levar alguns segundos
            </p>
          </div>
        )}

        {analysis && !isLoading && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="p-4 bg-muted/50 rounded-lg text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {analysis.summary.total_items}
                </div>
                <div className="text-xs text-muted-foreground">Itens Analisados</div>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {analysis.summary.reorder_count}
                </div>
                <div className="text-xs text-muted-foreground">Para Repor</div>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {analysis.summary.overstock_count}
                </div>
                <div className="text-xs text-muted-foreground">Em Excesso</div>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg text-center">
                <div className="text-2xl font-bold text-gray-600">
                  {analysis.summary.dead_stock_count}
                </div>
                <div className="text-xs text-muted-foreground">Parados</div>
              </div>
            </div>

            {/* LLM Summary */}
            {analysis.llm_summary && (
              <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg mb-6">
                <div className="flex items-start gap-2">
                  <Info className="h-5 w-5 text-purple-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-purple-800 mb-1">Resumo da Análise</p>
                    <p className="text-sm text-purple-700">{analysis.llm_summary}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Recommendations Tabs */}
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as RecommendationTab)}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="reorder" className="gap-2">
                  <PackagePlus className="h-4 w-4" />
                  Repor ({analysis.recommendations.reorder.length})
                </TabsTrigger>
                <TabsTrigger value="overstock" className="gap-2">
                  <PackageMinus className="h-4 w-4" />
                  Excesso ({analysis.recommendations.overstock.length})
                </TabsTrigger>
                <TabsTrigger value="dead_stock" className="gap-2">
                  <Archive className="h-4 w-4" />
                  Parado ({analysis.recommendations.dead_stock.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="reorder" className="mt-4">
                <ReorderTable
                  items={analysis.recommendations.reorder}
                  onApply={handleApplyClick}
                  applyingItem={applyingItem}
                  formatNumber={formatNumber}
                  getPriorityBadge={getPriorityBadge}
                  getConfidenceBadge={getConfidenceBadge}
                />
              </TabsContent>

              <TabsContent value="overstock" className="mt-4">
                <OverstockTable
                  items={analysis.recommendations.overstock}
                  formatNumber={formatNumber}
                  formatCurrency={formatCurrency}
                  getConfidenceBadge={getConfidenceBadge}
                />
              </TabsContent>

              <TabsContent value="dead_stock" className="mt-4">
                <DeadStockTable
                  items={analysis.recommendations.dead_stock}
                  formatNumber={formatNumber}
                  formatCurrency={formatCurrency}
                  getConfidenceBadge={getConfidenceBadge}
                />
              </TabsContent>
            </Tabs>

            {/* Engine Info */}
            <div className="mt-4 text-xs text-muted-foreground flex items-center gap-2">
              <span>Motor: {analysis.engine.type}</span>
              <span>•</span>
              <span>Janela: {analysis.window_days} dias</span>
              <span>•</span>
              <span>Gerado em: {new Date(analysis.generated_at).toLocaleString('pt-BR')}</span>
            </div>
          </>
        )}
      </CardContent>

      {/* Confirm Dialog */}
      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Aplicar Sugestões?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  Atualizar parâmetros de estoque para{' '}
                  <strong>{selectedRecommendation?.code}</strong>?
                </p>
                {selectedRecommendation && (
                  <div className="bg-muted p-3 rounded-lg space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Ponto de Reposição:</span>
                      <span className="font-medium">
                        {formatNumber(selectedRecommendation.suggested_reorder_point)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Estoque Mínimo:</span>
                      <span className="font-medium">
                        {formatNumber(selectedRecommendation.suggested_min_quantity)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Estoque Máximo:</span>
                      <span className="font-medium">
                        {formatNumber(selectedRecommendation.suggested_max_quantity)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmApply}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Aplicar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

// Sub-components for tables

interface ReorderTableProps {
  items: ReorderRecommendation[];
  onApply: (rec: ReorderRecommendation) => void;
  applyingItem: number | null;
  formatNumber: (v: number | null, d?: number) => string;
  getPriorityBadge: (p?: string) => React.ReactNode;
  getConfidenceBadge: (c: string) => React.ReactNode;
}

function ReorderTable({
  items,
  onApply,
  applyingItem,
  formatNumber,
  getPriorityBadge,
  getConfidenceBadge,
}: ReorderTableProps) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center py-8 text-muted-foreground">
        <CheckCircle className="h-12 w-12 text-green-500 mb-3" />
        <p className="font-medium">Nenhum item precisa de reposição</p>
        <p className="text-sm">Seu estoque está bem dimensionado!</p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Item</TableHead>
            <TableHead className="text-right">Atual</TableHead>
            <TableHead className="text-right">Dias Cob.</TableHead>
            <TableHead className="text-right">Sugestão</TableHead>
            <TableHead>Prioridade</TableHead>
            <TableHead>Confiança</TableHead>
            <TableHead className="text-right">Ação</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((rec) => (
            <TableRow key={rec.item_id}>
              <TableCell>
                <div>
                  <div className="font-medium">{rec.code}</div>
                  <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                    {rec.name}
                  </div>
                </div>
              </TableCell>
              <TableCell className="text-right">
                <span className={rec.current_qty <= 0 ? 'text-red-600 font-medium' : ''}>
                  {formatNumber(rec.current_qty)} {rec.unit}
                </span>
              </TableCell>
              <TableCell className="text-right">
                {rec.days_of_cover !== null ? (
                  <span
                    className={cn(
                      rec.stockout_risk ? 'text-red-600 font-medium' : ''
                    )}
                  >
                    {formatNumber(rec.days_of_cover, 1)}d
                  </span>
                ) : (
                  '-'
                )}
              </TableCell>
              <TableCell className="text-right">
                <div className="text-sm">
                  <div>Pedir: <span className="font-medium">{formatNumber(rec.suggested_order_qty)}</span></div>
                  <div className="text-xs text-muted-foreground">
                    Min: {formatNumber(rec.suggested_min_quantity)} | 
                    Max: {formatNumber(rec.suggested_max_quantity)}
                  </div>
                </div>
              </TableCell>
              <TableCell>{getPriorityBadge(rec.priority)}</TableCell>
              <TableCell>{getConfidenceBadge(rec.confidence)}</TableCell>
              <TableCell className="text-right">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onApply(rec)}
                  disabled={applyingItem === rec.item_id}
                >
                  {applyingItem === rec.item_id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Aplicar'
                  )}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

interface OverstockTableProps {
  items: OverstockRecommendation[];
  formatNumber: (v: number | null, d?: number) => string;
  formatCurrency: (v: number) => string;
  getConfidenceBadge: (c: string) => React.ReactNode;
}

function OverstockTable({
  items,
  formatNumber,
  formatCurrency,
  getConfidenceBadge,
}: OverstockTableProps) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center py-8 text-muted-foreground">
        <CheckCircle className="h-12 w-12 text-green-500 mb-3" />
        <p className="font-medium">Nenhum item em excesso</p>
        <p className="text-sm">Níveis de estoque adequados!</p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Item</TableHead>
            <TableHead className="text-right">Atual</TableHead>
            <TableHead className="text-right">Excesso</TableHead>
            <TableHead className="text-right">Valor Excesso</TableHead>
            <TableHead>Confiança</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((rec) => (
            <TableRow key={rec.item_id}>
              <TableCell>
                <div>
                  <div className="font-medium">{rec.code}</div>
                  <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                    {rec.name}
                  </div>
                </div>
              </TableCell>
              <TableCell className="text-right">
                {formatNumber(rec.current_qty)} {rec.unit}
              </TableCell>
              <TableCell className="text-right text-blue-600 font-medium">
                +{formatNumber(rec.excess_qty)} {rec.unit}
              </TableCell>
              <TableCell className="text-right text-blue-600">
                {formatCurrency(rec.excess_value)}
              </TableCell>
              <TableCell>{getConfidenceBadge(rec.confidence)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

interface DeadStockTableProps {
  items: DeadStockRecommendation[];
  formatNumber: (v: number | null, d?: number) => string;
  formatCurrency: (v: number) => string;
  getConfidenceBadge: (c: string) => React.ReactNode;
}

function DeadStockTable({
  items,
  formatNumber,
  formatCurrency,
  getConfidenceBadge,
}: DeadStockTableProps) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center py-8 text-muted-foreground">
        <CheckCircle className="h-12 w-12 text-green-500 mb-3" />
        <p className="font-medium">Nenhum estoque parado</p>
        <p className="text-sm">Todos os itens com movimentação recente!</p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Item</TableHead>
            <TableHead className="text-right">Quantidade</TableHead>
            <TableHead className="text-right">Valor Parado</TableHead>
            <TableHead className="text-right">Dias s/ Saída</TableHead>
            <TableHead>Confiança</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((rec) => (
            <TableRow key={rec.item_id}>
              <TableCell>
                <div>
                  <div className="font-medium">{rec.code}</div>
                  <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                    {rec.name}
                  </div>
                </div>
              </TableCell>
              <TableCell className="text-right">
                {formatNumber(rec.current_qty)} {rec.unit}
              </TableCell>
              <TableCell className="text-right text-gray-600 font-medium">
                {formatCurrency(rec.stock_value)}
              </TableCell>
              <TableCell className="text-right">
                {rec.days_since_last_out ? (
                  <span className="text-orange-600">{rec.days_since_last_out}d</span>
                ) : (
                  <span className="text-gray-500">Nunca</span>
                )}
              </TableCell>
              <TableCell>{getConfidenceBadge(rec.confidence)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export default AIRecommendations;
