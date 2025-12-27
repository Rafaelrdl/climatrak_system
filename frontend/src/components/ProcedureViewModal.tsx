import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Eye, 
  Download, 
  PencilSimple, 
  Clock, 
  Warning, 
  Wrench,
  CalendarBlank,
  User,
  FileText
} from '@phosphor-icons/react';

interface Procedure {
  id: number;
  title: string;
  category: string;
  version: string;
  status: string;
  lastUpdated: string;
  description: string;
  content?: string;
  tags?: string[];
  priority?: string;
  estimatedTime?: string;
  requiredTools?: string;
  safetyNotes?: string;
  createdBy?: string;
  approvedBy?: string;
}

interface ProcedureViewModalProps {
  procedure: Procedure;
  trigger?: React.ReactNode;
}

const sampleContent = `
<h1>Procedimento de Limpeza de Filtros HVAC</h1>

<h2>Objetivo</h2>
<p>Este procedimento descreve o processo padronizado para limpeza e substituição de filtros em sistemas de ar condicionado HVAC, garantindo a eficiência energética e qualidade do ar interno.</p>

<h2>Frequência</h2>
<p>Mensal para filtros básicos, trimestral para filtros HEPA.</p>

<h2>Instruções Passo a Passo</h2>

<h3>1. Preparação</h3>
<ul>
  <li>Desligue o sistema HVAC completamente</li>
  <li>Aguarde 15 minutos para estabilização</li>
  <li>Prepare os EPIs necessários</li>
  <li>Organize as ferramentas e materiais</li>
</ul>

<h3>2. Remoção do Filtro</h3>
<ul>
  <li>Localize o compartimento do filtro</li>
  <li>Remova cuidadosamente o filtro usado</li>
  <li>Inspect the filter housing for debris</li>
  <li>Fotografe o estado do filtro para registro</li>
</ul>

<h3>3. Inspeção e Limpeza</h3>
<ul>
  <li>Verifique o estado do filtro</li>
  <li>Se reutilizável, proceda com a limpeza</li>
  <li>Use aspirador ou água morna conforme tipo</li>
  <li>Deixe secar completamente antes da reinstalação</li>
</ul>

<h3>4. Instalação</h3>
<ul>
  <li>Instale o filtro limpo ou novo</li>
  <li>Verifique a direção do fluxo de ar</li>
  <li>Certifique-se do encaixe correto</li>
  <li>Feche o compartimento adequadamente</li>
</ul>

<h3>5. Finalização</h3>
<ul>
  <li>Ligue o sistema novamente</li>
  <li>Verifique o funcionamento por 5 minutos</li>
  <li>Registre a manutenção no sistema</li>
  <li>Descarte o filtro usado adequadamente</li>
</ul>

<blockquote>
  <p><strong>Importante:</strong> Sempre use EPIs adequados e siga as normas de segurança da empresa.</p>
</blockquote>
`;

export function ProcedureViewModal({ procedure, trigger }: ProcedureViewModalProps) {
  const [open, setOpen] = useState(false);

  const defaultTrigger = (
    <Button variant="outline" size="sm">
      <Eye className="mr-2 h-4 w-4" />
      Visualizar
    </Button>
  );

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'default';
    }
  };

  const getPriorityLabel = (priority?: string) => {
    switch (priority) {
      case 'critical': return 'Crítica';
      case 'high': return 'Alta';
      case 'medium': return 'Média';
      case 'low': return 'Baixa';
      default: return 'Média';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Ativo': return 'default';
      case 'Em Revisão': return 'secondary';
      case 'Obsoleto': return 'destructive';
      default: return 'default';
    }
  };

  const handleDownload = () => {
    // Implementar download do procedimento em PDF

  };

  const handleEdit = () => {
    // Implementar edição do procedimento

    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <DialogTitle className="text-xl">{procedure.title}</DialogTitle>
              <DialogDescription>
                {procedure.description}
              </DialogDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleEdit}>
                <PencilSimple className="mr-2 h-4 w-4" />
                Editar
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="space-y-6 pr-4">
              {/* Metadata Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Status</CardTitle>
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <Badge variant={getStatusColor(procedure.status)}>
                        {procedure.status}
                      </Badge>
                      <span className="text-sm text-muted-foreground">v{procedure.version}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Prioridade</CardTitle>
                    <Warning className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <Badge variant={getPriorityColor(procedure.priority)}>
                      {getPriorityLabel(procedure.priority)}
                    </Badge>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Última Atualização</CardTitle>
                    <CalendarBlank className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm">{procedure.lastUpdated}</div>
                  </CardContent>
                </Card>
              </div>

              {/* Additional Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {procedure.estimatedTime && (
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Tempo Estimado</CardTitle>
                      <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm">{procedure.estimatedTime}</div>
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Categoria</CardTitle>
                    <User className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm">{procedure.category}</div>
                  </CardContent>
                </Card>
              </div>

              {/* Tags */}
              {procedure.tags && procedure.tags.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Tags</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {procedure.tags.map((tag) => (
                        <Badge key={tag} variant="outline">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Required Tools */}
              {procedure.requiredTools && (
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Ferramentas Necessárias</CardTitle>
                    <Wrench className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm whitespace-pre-wrap">{procedure.requiredTools}</div>
                  </CardContent>
                </Card>
              )}

              {/* Safety Notes */}
              {procedure.safetyNotes && (
                <Card className="border-[var(--warning)] bg-[var(--warning)]/10">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-[var(--warning-foreground)]">
                      Notas de Segurança
                    </CardTitle>
                    <Warning className="h-4 w-4 text-[var(--warning)]" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-[var(--warning-foreground)] whitespace-pre-wrap">
                      {procedure.safetyNotes}
                    </div>
                  </CardContent>
                </Card>
              )}

              <Separator />

              {/* Main Content */}
              <Card>
                <CardHeader>
                  <CardTitle>Conteúdo do Procedimento</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <RichTextEditor
                    content={procedure.content || sampleContent}
                    editable={false}
                    className="border-0"
                  />
                </CardContent>
              </Card>
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}