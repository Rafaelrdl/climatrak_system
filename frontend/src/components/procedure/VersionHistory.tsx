import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { 
  History, 
  Eye, 
  GitCompare, 
  RotateCcw, 
  FileText,
  Download 
} from 'lucide-react';
import { ProcedureVersion } from '@/models/procedure';
import { rollbackToVersion, getFileBlob, getCategoryById } from '@/data/proceduresStore';
import { cn } from '@/lib/utils';

interface VersionHistoryProps {
  versions: ProcedureVersion[];
  currentVersion: number;
  onVersionCompare: (fromVersionId: string, toVersionId: string) => void;
  onProcedureUpdate: () => void;
}

export function VersionHistory({ 
  versions, 
  currentVersion, 
  onVersionCompare,
  onProcedureUpdate 
}: VersionHistoryProps) {
  const [isRollingBack, setIsRollingBack] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState<string | null>(null);

  const handleRollback = async (version: ProcedureVersion) => {
    try {
      setIsRollingBack(version.id);
      const result = await rollbackToVersion(version.procedure_id, version.id);
      
      if (result) {
        toast.success(`Procedimento restaurado para versão ${version.version_number}`);
        onProcedureUpdate();
      } else {
        toast.error('Erro ao restaurar procedimento');
      }
    } catch (error) {
      console.error('Rollback error:', error);
      toast.error('Erro ao restaurar procedimento');
    } finally {
      setIsRollingBack(null);
    }
  };

  const handleDownload = async (version: ProcedureVersion) => {
    try {
      setIsDownloading(version.id);
      const blob = await getFileBlob(version.file.id);
      
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${version.file.name}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        toast.success('Download iniciado');
      } else {
        toast.error('Arquivo não encontrado');
      }
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Erro ao baixar arquivo');
    } finally {
      setIsDownloading(null);
    }
  };

  const handleCompareWithCurrent = (version: ProcedureVersion) => {
    const currentVersionData = versions.find(v => v.version_number === currentVersion);
    if (currentVersionData) {
      onVersionCompare(version.id, currentVersionData.id);
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

  if (versions.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <History className="w-16 h-16 mx-auto mb-4 opacity-50" />
        <h3 className="text-lg font-medium mb-2">Nenhum histórico disponível</h3>
        <p>Este procedimento ainda não possui versões registradas.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <History className="w-5 h-5" />
        <h3 className="text-lg font-semibold">Histórico de Versões</h3>
        <Badge variant="secondary" className="text-xs">
          {versions.length} {versions.length === 1 ? 'versão' : 'versões'}
        </Badge>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-24">Versão</TableHead>
              <TableHead>Tipo de Alteração</TableHead>
              <TableHead className="hidden md:table-cell">Arquivo</TableHead>
              <TableHead className="hidden lg:table-cell">Categoria</TableHead>
              <TableHead className="hidden sm:table-cell">Data</TableHead>
              <TableHead>Resumo</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {versions.map((version) => {
              const isCurrentVersion = version.version_number === currentVersion;
              
              return (
                <TableRow 
                  key={version.id}
                  className={cn(isCurrentVersion && "bg-blue-50")}
                >
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      v{version.version_number}
                      {isCurrentVersion && (
                        <Badge variant="default" size="sm">
                          atual
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <Badge className={cn('text-xs', getChangeTypeColor(version.change_type))}>
                      {getChangeTypeLabel(version.change_type)}
                    </Badge>
                  </TableCell>
                  
                  <TableCell className="hidden md:table-cell">
                    <div className="flex items-center gap-2 max-w-48">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      <span className="truncate" title={version.file.name}>
                        {version.file.name}
                      </span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        ({(version.file.size / 1024).toFixed(1)} KB)
                      </span>
                    </div>
                  </TableCell>
                  
                  <TableCell className="hidden lg:table-cell">
                    {version.category_id ? (
                      <span className="text-sm">
                        {getCategoryById(version.category_id)?.name || 'N/A'}
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-sm">Nenhuma</span>
                    )}
                  </TableCell>
                  
                  <TableCell className="hidden sm:table-cell text-sm">
                    {formatDate(version.created_at)}
                  </TableCell>
                  
                  <TableCell>
                    <div className="max-w-64">
                      <p className="text-sm truncate" title={version.change_summary}>
                        {version.change_summary || 'Sem resumo'}
                      </p>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div className="flex items-center gap-1 justify-end">
                      {/* Compare button */}
                      {!isCurrentVersion && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCompareWithCurrent(version)}
                          title="Comparar com versão atual"
                        >
                          <GitCompare className="w-4 h-4" />
                        </Button>
                      )}
                      
                      {/* Download button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownload(version)}
                        disabled={isDownloading === version.id}
                        title="Baixar arquivo desta versão"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      
                      {/* Rollback button */}
                      {!isCurrentVersion && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRollback(version)}
                          disabled={isRollingBack === version.id}
                          title="Restaurar para esta versão"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {versions.length >= 2 && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={() => {
              if (versions.length >= 2) {
                onVersionCompare(versions[1].id, versions[0].id);
              }
            }}
          >
            <GitCompare className="w-4 h-4 mr-2" />
            Comparar últimas versões
          </Button>
        </div>
      )}
    </div>
  );
}