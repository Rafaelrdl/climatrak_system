import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { ArrowLeft, ArrowRight, FileText, History, RotateCcw, Eye } from 'lucide-react';
import { 
  ProcedureVersion, 
  VersionComparison as VersionComparisonType,
  ProcedureDiff 
} from '@/models/procedure';
import { 
  listVersions, 
  compareVersions, 
  rollbackToVersion, 
  getCategoryById 
} from '@/data/proceduresStore';
import { cn } from '@/lib/utils';

interface VersionComparisonProps {
  procedureId: string;
  isOpen: boolean;
  onClose: () => void;
  onProcedureUpdate?: () => void;
}

export function VersionComparison({ 
  procedureId, 
  isOpen, 
  onClose, 
  onProcedureUpdate 
}: VersionComparisonProps) {
  const [versions, setVersions] = useState<ProcedureVersion[]>([]);
  const [fromVersionId, setFromVersionId] = useState<string>('');
  const [toVersionId, setToVersionId] = useState<string>('');
  const [comparison, setComparison] = useState<VersionComparisonType | null>(null);
  const [isRollingBack, setIsRollingBack] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadVersions();
    }
  }, [isOpen, procedureId]);

  useEffect(() => {
    if (fromVersionId && toVersionId && fromVersionId !== toVersionId) {
      const comp = compareVersions(fromVersionId, toVersionId);
      setComparison(comp);
    } else {
      setComparison(null);
    }
  }, [fromVersionId, toVersionId]);

  const loadVersions = () => {
    const versionList = listVersions(procedureId);
    setVersions(versionList);
    
    // Auto-select latest two versions if available
    if (versionList.length >= 2) {
      setToVersionId(versionList[0].id); // Latest version
      setFromVersionId(versionList[1].id); // Previous version
    } else if (versionList.length === 1) {
      setToVersionId(versionList[0].id);
      setFromVersionId('');
    }
  };

  const handleRollback = async (versionId: string) => {
    try {
      setIsRollingBack(true);
      const result = await rollbackToVersion(procedureId, versionId);
      
      if (result) {
        toast.success('Procedimento restaurado com sucesso');
        onProcedureUpdate?.();
        loadVersions();
      } else {
        toast.error('Erro ao restaurar procedimento');
      }
    } catch (error) {
      console.error('Rollback error:', error);
      toast.error('Erro ao restaurar procedimento');
    } finally {
      setIsRollingBack(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getChangeTypeLabel = (changeType: string) => {
    const labels: Record<string, string> = {
      created: 'Criação',
      updated: 'Atualização',
      file_updated: 'Arquivo atualizado',
      status_changed: 'Status alterado',
      category_changed: 'Categoria alterada'
    };
    return labels[changeType] || changeType;
  };

  const getChangeTypeColor = (changeType: string) => {
    const colors: Record<string, string> = {
      created: 'bg-green-100 text-green-800',
      updated: 'bg-blue-100 text-blue-800',
      file_updated: 'bg-orange-100 text-orange-800',
      status_changed: 'bg-purple-100 text-purple-800',
      category_changed: 'bg-yellow-100 text-yellow-800'
    };
    return colors[changeType] || 'bg-gray-100 text-gray-800';
  };

  const getDiffIcon = (changeType: ProcedureDiff['changeType']) => {
    switch (changeType) {
      case 'added':
        return '+ ';
      case 'removed':
        return '- ';
      case 'modified':
        return '± ';
      default:
        return '';
    }
  };

  const getDiffColor = (changeType: ProcedureDiff['changeType']) => {
    switch (changeType) {
      case 'added':
        return 'text-green-600';
      case 'removed':
        return 'text-red-600';
      case 'modified':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Histórico de Versões
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col space-y-4">
          {/* Version Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Versão base (anterior)</label>
              <Select value={fromVersionId} onValueChange={setFromVersionId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar versão base" />
                </SelectTrigger>
                <SelectContent>
                  {versions.map((version) => (
                    <SelectItem key={version.id} value={version.id}>
                      <div className="flex items-center justify-between w-full">
                        <span>v{version.version_number}</span>
                        <span className="text-xs text-muted-foreground ml-2">
                          {formatDate(version.created_at)}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Versão comparada (posterior)</label>
              <Select value={toVersionId} onValueChange={setToVersionId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar versão para comparar" />
                </SelectTrigger>
                <SelectContent>
                  {versions.map((version) => (
                    <SelectItem key={version.id} value={version.id}>
                      <div className="flex items-center justify-between w-full">
                        <span>v{version.version_number}</span>
                        <span className="text-xs text-muted-foreground ml-2">
                          {formatDate(version.created_at)}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Comparison Result */}
          {comparison && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Side - From Version */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">
                    Versão {comparison.fromVersion.version_number}
                  </h3>
                  <Badge className={cn('text-xs', getChangeTypeColor(comparison.fromVersion.change_type))}>
                    {getChangeTypeLabel(comparison.fromVersion.change_type)}
                  </Badge>
                </div>
                
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="font-medium text-muted-foreground">Título:</span>
                    <p className="mt-1">{comparison.fromVersion.title}</p>
                  </div>
                  
                  {comparison.fromVersion.description && (
                    <div>
                      <span className="font-medium text-muted-foreground">Descrição:</span>
                      <p className="mt-1">{comparison.fromVersion.description}</p>
                    </div>
                  )}
                  
                  <div>
                    <span className="font-medium text-muted-foreground">Categoria:</span>
                    <p className="mt-1">
                      {comparison.fromVersion.category_id 
                        ? getCategoryById(comparison.fromVersion.category_id)?.name || 'N/A'
                        : 'Nenhuma'
                      }
                    </p>
                  </div>
                  
                  <div>
                    <span className="font-medium text-muted-foreground">Status:</span>
                    <p className="mt-1">{comparison.fromVersion.status}</p>
                  </div>
                  
                  <div>
                    <span className="font-medium text-muted-foreground">Tags:</span>
                    <p className="mt-1">{comparison.fromVersion.tags?.join(', ') || 'Nenhuma'}</p>
                  </div>
                  
                  <div>
                    <span className="font-medium text-muted-foreground">Arquivo:</span>
                    <p className="mt-1 flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      {comparison.fromVersion.file.name}
                      <span className="text-xs text-muted-foreground">
                        ({(comparison.fromVersion.file.size / 1024).toFixed(1)} KB)
                      </span>
                    </p>
                  </div>

                  <div>
                    <span className="font-medium text-muted-foreground">Data:</span>
                    <p className="mt-1">{formatDate(comparison.fromVersion.created_at)}</p>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRollback(comparison.fromVersion.id)}
                  disabled={isRollingBack}
                  className="w-full"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Restaurar esta versão
                </Button>
              </div>

              {/* Center - Changes */}
              <div className="lg:border-l lg:pl-6">
                <div className="flex items-center gap-2 mb-4">
                  <ArrowRight className="w-4 h-4" />
                  <h3 className="text-lg font-semibold">
                    Versão {comparison.toVersion.version_number}
                  </h3>
                  <Badge className={cn('text-xs', getChangeTypeColor(comparison.toVersion.change_type))}>
                    {getChangeTypeLabel(comparison.toVersion.change_type)}
                  </Badge>
                </div>

                {comparison.diffs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Eye className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Nenhuma diferença encontrada</p>
                  </div>
                ) : (
                  <ScrollArea className="h-96">
                    <div className="space-y-4">
                      <h4 className="font-medium text-sm text-muted-foreground mb-3">
                        Alterações ({comparison.diffs.length})
                      </h4>
                      
                      {comparison.diffs.map((diff, index) => (
                        <div key={index} className="border rounded-lg p-3 space-y-2">
                          <div className="flex items-center gap-2">
                            <span className={cn('font-mono text-sm', getDiffColor(diff.changeType))}>
                              {getDiffIcon(diff.changeType)}
                            </span>
                            <span className="font-medium">{diff.label}</span>
                          </div>
                          
                          {diff.changeType === 'modified' && (
                            <div className="grid grid-cols-1 gap-2 text-sm">
                              <div className="bg-red-50 border-l-4 border-red-200 p-2 rounded">
                                <div className="text-red-700 font-medium mb-1">Anterior:</div>
                                <div className="text-red-600 break-words">
                                  {String(diff.oldValue)}
                                </div>
                              </div>
                              <div className="bg-green-50 border-l-4 border-green-200 p-2 rounded">
                                <div className="text-green-700 font-medium mb-1">Atual:</div>
                                <div className="text-green-600 break-words">
                                  {String(diff.newValue)}
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {diff.changeType === 'added' && (
                            <div className="bg-green-50 border-l-4 border-green-200 p-2 rounded text-sm">
                              <div className="text-green-700 font-medium mb-1">Adicionado:</div>
                              <div className="text-green-600 break-words">
                                {String(diff.newValue)}
                              </div>
                            </div>
                          )}
                          
                          {diff.changeType === 'removed' && (
                            <div className="bg-red-50 border-l-4 border-red-200 p-2 rounded text-sm">
                              <div className="text-red-700 font-medium mb-1">Removido:</div>
                              <div className="text-red-600 break-words">
                                {String(diff.oldValue)}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}

                {comparison.toVersion.change_summary && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <div className="text-blue-700 font-medium mb-1">Resumo das alterações:</div>
                    <div className="text-blue-600 text-sm">
                      {comparison.toVersion.change_summary}
                    </div>
                  </div>
                )}

                <div className="mt-4">
                  <span className="font-medium text-muted-foreground text-sm">Data:</span>
                  <p className="mt-1 text-sm">{formatDate(comparison.toVersion.created_at)}</p>
                </div>
              </div>
            </div>
          )}

          {/* No versions message */}
          {versions.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <History className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">Nenhum histórico disponível</h3>
              <p>Este procedimento ainda não possui versões registradas.</p>
            </div>
          )}

          {/* Single version message */}
          {versions.length === 1 && (
            <div className="text-center py-8 text-muted-foreground">
              <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <h3 className="font-medium mb-2">Apenas uma versão disponível</h3>
              <p>É necessário ter pelo menos duas versões para fazer comparações.</p>
            </div>
          )}
        </div>

        <Separator className="my-4" />

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}