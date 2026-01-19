/**
 * Quick Repair Dialog - Assistente de Diagnóstico com IA
 *
 * Modal que permite técnicos descreverem um sintoma e receber
 * diagnóstico, passos de reparo e sugestões de peças.
 */

import { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Bot,
  Loader2,
  Lightbulb,
  CheckCircle2,
  Wrench,
  Package,
  AlertTriangle,
  FileText,
  ClipboardList,
  ChevronRight,
  ShieldCheck,
  Phone,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQuickRepair } from '@/hooks/useQuickRepair';
import type { QuickRepairOutput, SuggestedWorkOrder } from '@/services/aiService';

interface QuickRepairDialogProps {
  assetId: number;
  assetTag: string;
  isOpen: boolean;
  onClose: () => void;
  onApplySuggestion?: (suggestion: SuggestedWorkOrder) => void;
}

export function QuickRepairDialog({
  assetId,
  assetTag,
  isOpen,
  onClose,
  onApplySuggestion,
}: QuickRepairDialogProps) {
  const [symptom, setSymptom] = useState('');
  const [observations, setObservations] = useState('');
  const { runDiagnosis, reset, isLoading, isError, isSuccess, status } = useQuickRepair();
  const [result, setResult] = useState<QuickRepairOutput | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(async () => {
    if (symptom.trim().length < 10) return;

    setError(null);
    try {
      const data = await runDiagnosis(assetId, symptom, {
        observations: observations || undefined,
      });
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao executar diagnóstico');
    }
  }, [assetId, symptom, observations, runDiagnosis]);

  const handleClose = useCallback(() => {
    setSymptom('');
    setObservations('');
    setResult(null);
    setError(null);
    reset();
    onClose();
  }, [reset, onClose]);

  const handleApplySuggestion = useCallback(() => {
    if (result?.suggested_work_order && onApplySuggestion) {
      onApplySuggestion(result.suggested_work_order);
      handleClose();
    }
  }, [result, onApplySuggestion, handleClose]);

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.7) return 'text-green-600 bg-green-100';
    if (confidence >= 0.4) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getSeverityColor = (severity?: string) => {
    switch (severity) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            Assistente de Reparo (IA)
          </DialogTitle>
          <DialogDescription>
            Descreva o problema do equipamento <strong>{assetTag}</strong> para receber
            diagnóstico e sugestões de reparo.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-180px)]">
          {!result ? (
            // Formulário de entrada
            <div className="space-y-4 pr-4">
              <div className="space-y-2">
                <Label htmlFor="symptom">
                  Descreva o problema/sintoma <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="symptom"
                  placeholder="Ex: O equipamento está fazendo barulho alto durante a operação e a temperatura não está estabilizando..."
                  value={symptom}
                  onChange={(e) => setSymptom(e.target.value)}
                  rows={4}
                  disabled={isLoading}
                />
                <p className="text-xs text-muted-foreground">
                  Mínimo 10 caracteres ({symptom.length}/10)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="observations">Observações adicionais (opcional)</Label>
                <Textarea
                  id="observations"
                  placeholder="Ex: Já trocamos o filtro na semana passada, o problema começou após a última manutenção..."
                  value={observations}
                  onChange={(e) => setObservations(e.target.value)}
                  rows={2}
                  disabled={isLoading}
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Erro no diagnóstico</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={handleClose} disabled={isLoading}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={symptom.trim().length < 10 || isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Analisando...
                    </>
                  ) : (
                    <>
                      <Bot className="mr-2 h-4 w-4" />
                      Analisar Problema
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            // Resultado do diagnóstico
            <div className="space-y-4 pr-4">
              {result.mode === 'fallback' && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Modo Fallback</AlertTitle>
                  <AlertDescription>
                    O assistente de IA não está disponível no momento. Exibindo diagnóstico básico.
                  </AlertDescription>
                </Alert>
              )}

              {/* Resumo */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-primary" />
                    Resumo
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{result.summary}</p>
                </CardContent>
              </Card>

              <Accordion type="multiple" defaultValue={['hypotheses', 'diagnosis']} className="w-full">
                {/* Hipóteses */}
                <AccordionItem value="hypotheses">
                  <AccordionTrigger className="text-sm font-medium">
                    <span className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      Hipóteses ({result.hypotheses.length})
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2">
                      {result.hypotheses.map((h, idx) => (
                        <div
                          key={h.id || idx}
                          className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
                        >
                          <Badge
                            className={cn('text-xs font-mono', getConfidenceColor(h.confidence))}
                          >
                            {Math.round(h.confidence * 100)}%
                          </Badge>
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">{h.title}</span>
                              {h.severity && (
                                <Badge variant={getSeverityColor(h.severity)} className="text-xs">
                                  {h.severity}
                                </Badge>
                              )}
                            </div>
                            {h.evidence.length > 0 && (
                              <ul className="text-xs text-muted-foreground space-y-0.5">
                                {h.evidence.map((e, i) => (
                                  <li key={i} className="flex items-start gap-1">
                                    <ChevronRight className="h-3 w-3 mt-0.5 shrink-0" />
                                    {e}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Passos de Diagnóstico */}
                <AccordionItem value="diagnosis">
                  <AccordionTrigger className="text-sm font-medium">
                    <span className="flex items-center gap-2">
                      <ClipboardList className="h-4 w-4" />
                      Diagnóstico ({result.diagnosis_steps.length} passos)
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-3">
                      {result.diagnosis_steps.map((step) => (
                        <div key={step.step} className="flex gap-3">
                          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-medium shrink-0">
                            {step.step}
                          </div>
                          <div className="flex-1 space-y-1">
                            <p className="text-sm font-medium">{step.action}</p>
                            <p className="text-xs text-muted-foreground">
                              Esperado: {step.expected_result}
                            </p>
                            {step.tools_required.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {step.tools_required.map((tool, i) => (
                                  <Badge key={i} variant="outline" className="text-xs">
                                    {tool}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Passos de Reparo */}
                {result.repair_steps.length > 0 && (
                  <AccordionItem value="repair">
                    <AccordionTrigger className="text-sm font-medium">
                      <span className="flex items-center gap-2">
                        <Wrench className="h-4 w-4" />
                        Reparo ({result.repair_steps.length} passos)
                      </span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3">
                        {result.repair_steps.map((step) => (
                          <div key={step.step} className="flex gap-3">
                            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-green-600 text-white text-xs font-medium shrink-0">
                              {step.step}
                            </div>
                            <div className="flex-1 space-y-1">
                              <p className="text-sm font-medium">{step.action}</p>
                              {step.precautions && (
                                <p className="text-xs text-yellow-600">⚠ {step.precautions}</p>
                              )}
                              {step.estimated_minutes && (
                                <p className="text-xs text-muted-foreground">
                                  ~{step.estimated_minutes} min
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                )}

                {/* Peças Sugeridas */}
                {result.parts.length > 0 && (
                  <AccordionItem value="parts">
                    <AccordionTrigger className="text-sm font-medium">
                      <span className="flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        Peças ({result.parts.length})
                      </span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-2">
                        {result.parts.map((part, idx) => (
                          <div key={idx} className="p-3 rounded-lg bg-muted/50 space-y-2">
                            <div className="flex justify-between items-start">
                              <span className="font-medium text-sm">{part.name}</span>
                              <Badge variant="secondary">Qtd: {part.quantity}</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">{part.purpose}</p>
                            {part.inventory_matches && part.inventory_matches.length > 0 && (
                              <div className="mt-2 pt-2 border-t">
                                <p className="text-xs font-medium mb-1">Disponível em estoque:</p>
                                {part.inventory_matches.map((match) => (
                                  <div
                                    key={match.inventory_id}
                                    className="flex justify-between text-xs"
                                  >
                                    <span>
                                      {match.code} - {match.name}
                                    </span>
                                    <span className="text-green-600">
                                      {match.available_qty} {match.unit} ({match.location})
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                )}

                {/* Segurança */}
                <AccordionItem value="safety">
                  <AccordionTrigger className="text-sm font-medium">
                    <span className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4" />
                      Segurança
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs font-medium mb-1">EPIs Obrigatórios:</p>
                        <div className="flex flex-wrap gap-1">
                          {result.safety.ppe_required.map((ppe, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {ppe}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-medium mb-1">Avisos:</p>
                        <ul className="space-y-1">
                          {result.safety.warnings.map((warn, i) => (
                            <li key={i} className="text-xs text-yellow-600 flex items-start gap-1">
                              <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                              {warn}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Referências */}
                {(result.references.similar_work_orders.length > 0 ||
                  result.references.procedures.length > 0) && (
                  <AccordionItem value="references">
                    <AccordionTrigger className="text-sm font-medium">
                      <span className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Referências
                      </span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3">
                        {result.references.similar_work_orders.length > 0 && (
                          <div>
                            <p className="text-xs font-medium mb-1">OSs Similares:</p>
                            <ul className="space-y-1">
                              {result.references.similar_work_orders.map((wo) => (
                                <li key={wo.id} className="text-xs text-muted-foreground">
                                  <span className="font-mono">{wo.number}</span> -{' '}
                                  {wo.description?.slice(0, 50)}...
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {result.references.procedures.length > 0 && (
                          <div>
                            <p className="text-xs font-medium mb-1">Procedimentos:</p>
                            <ul className="space-y-1">
                              {result.references.procedures.map((proc) => (
                                <li key={proc.id} className="text-xs text-muted-foreground">
                                  {proc.title} ({proc.file_type})
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                )}

                {/* Escalação */}
                <AccordionItem value="escalation">
                  <AccordionTrigger className="text-sm font-medium">
                    <span className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      Escalação
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-1">
                      <p className="text-sm">
                        <strong>Quando escalar:</strong> {result.escalation.criteria}
                      </p>
                      <p className="text-sm">
                        <strong>Contato:</strong> {result.escalation.contact}
                      </p>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              <Separator />

              {/* Ações */}
              <div className="flex justify-between items-center pt-2">
                <Button variant="outline" onClick={() => setResult(null)}>
                  Nova Consulta
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleClose}>
                    Fechar
                  </Button>
                  {result.suggested_work_order && onApplySuggestion && (
                    <Button onClick={handleApplySuggestion}>
                      Usar Sugestão de OS
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
