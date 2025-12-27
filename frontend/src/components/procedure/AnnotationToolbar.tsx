import { useState } from 'react';
import {
  MessageSquare,
  Highlighter,
  FileText,
  HelpCircle,
  Edit3,
  AlertTriangle,
  Eye,
  EyeOff,
  Filter,
  MoreVertical,
  Download,
  Share
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { AnnotationType } from '@/models/procedure';

interface AnnotationToolbarProps {
  isAnnotationMode: boolean;
  onToggleAnnotationMode: () => void;
  selectedAnnotationType: AnnotationType;
  onAnnotationTypeChange: (type: AnnotationType) => void;
  visibleAnnotationTypes: Set<AnnotationType>;
  onToggleAnnotationType: (type: AnnotationType) => void;
  showResolved: boolean;
  onToggleShowResolved: () => void;
  totalAnnotations: number;
  unresolvedAnnotations: number;
  onExportAnnotations: () => void;
  onShareAnnotations: () => void;
}

const annotationTypes: Array<{
  type: AnnotationType;
  label: string;
  icon: React.ComponentType<any>;
  color: string;
  description: string;
}> = [
  {
    type: 'highlight',
    label: 'Destaque',
    icon: Highlighter,
    color: '#fbbf24',
    description: 'Destacar texto importante'
  },
  {
    type: 'note',
    label: 'Nota',
    icon: FileText,
    color: '#3b82f6',
    description: 'Adicionar nota explicativa'
  },
  {
    type: 'question',
    label: 'Pergunta',
    icon: HelpCircle,
    color: '#8b5cf6',
    description: 'Fazer pergunta ou solicitar esclarecimento'
  },
  {
    type: 'correction',
    label: 'Correção',
    icon: Edit3,
    color: '#f59e0b',
    description: 'Sugerir correção ou melhoria'
  },
  {
    type: 'warning',
    label: 'Aviso',
    icon: AlertTriangle,
    color: '#ef4444',
    description: 'Marcar informação importante ou problema'
  },
];

export function AnnotationToolbar({
  isAnnotationMode,
  onToggleAnnotationMode,
  selectedAnnotationType,
  onAnnotationTypeChange,
  visibleAnnotationTypes,
  onToggleAnnotationType,
  showResolved,
  onToggleShowResolved,
  totalAnnotations,
  unresolvedAnnotations,
  onExportAnnotations,
  onShareAnnotations
}: AnnotationToolbarProps) {
  const [showTypeSelector, setShowTypeSelector] = useState(false);

  const selectedType = annotationTypes.find(t => t.type === selectedAnnotationType);
  const SelectedIcon = selectedType?.icon || FileText;

  return (
    <TooltipProvider>
      <div className="flex items-center gap-2 p-2 bg-muted/30 border-b">
        {/* Annotation Mode Toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={isAnnotationMode ? 'default' : 'outline'}
              size="sm"
              onClick={onToggleAnnotationMode}
              className={isAnnotationMode ? 'bg-primary' : ''}
            >
              <MessageSquare className="h-4 w-4 mr-1" />
              {isAnnotationMode ? 'Anotando' : 'Anotar'}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {isAnnotationMode 
              ? 'Sair do modo de anotação' 
              : 'Ativar modo de anotação para selecionar texto'
            }
          </TooltipContent>
        </Tooltip>

        {/* Annotation Type Selector */}
        {isAnnotationMode && (
          <>
            <Separator orientation="vertical" className="h-6" />
            
            <DropdownMenu open={showTypeSelector} onOpenChange={setShowTypeSelector}>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <SelectedIcon 
                    className="h-4 w-4 mr-1" 
                    style={{ color: selectedType?.color }}
                  />
                  {selectedType?.label}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuLabel>Tipo de Anotação</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {annotationTypes.map((type) => {
                  const IconComponent = type.icon;
                  return (
                    <DropdownMenuItem
                      key={type.type}
                      onClick={() => {
                        onAnnotationTypeChange(type.type);
                        setShowTypeSelector(false);
                      }}
                      className="flex flex-col items-start gap-1 p-3"
                    >
                      <div className="flex items-center gap-2 w-full">
                        <IconComponent className="h-4 w-4" style={{ color: type.color }} />
                        <span className="font-medium">{type.label}</span>
                        {selectedAnnotationType === type.type && (
                          <Badge variant="secondary" className="ml-auto text-xs">
                            Selecionado
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {type.description}
                      </p>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}

        <div className="flex-1" />

        {/* Annotation Statistics */}
        {totalAnnotations > 0 && (
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {totalAnnotations} anotações
            </Badge>
            {unresolvedAnnotations > 0 && (
              <Badge variant="destructive" className="text-xs">
                {unresolvedAnnotations} não resolvidas
              </Badge>
            )}
          </div>
        )}

        <Separator orientation="vertical" className="h-6" />

        {/* Visibility Controls */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Filtros de visualização</TooltipContent>
            </Tooltip>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel>Tipos Visíveis</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {annotationTypes.map((type) => {
              const IconComponent = type.icon;
              return (
                <DropdownMenuCheckboxItem
                  key={type.type}
                  checked={visibleAnnotationTypes.has(type.type)}
                  onCheckedChange={() => onToggleAnnotationType(type.type)}
                >
                  <IconComponent className="h-4 w-4 mr-2" style={{ color: type.color }} />
                  {type.label}
                </DropdownMenuCheckboxItem>
              );
            })}
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem
              checked={showResolved}
              onCheckedChange={onToggleShowResolved}
            >
              <Eye className="h-4 w-4 mr-2" />
              Mostrar resolvidas
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Toggle Resolved */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={onToggleShowResolved}
              className={showResolved ? 'bg-muted' : ''}
            >
              {showResolved ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {showResolved ? 'Ocultar resolvidas' : 'Mostrar resolvidas'}
          </TooltipContent>
        </Tooltip>

        {/* Actions Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onExportAnnotations}>
              <Download className="mr-2 h-4 w-4" />
              Exportar Anotações
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onShareAnnotations}>
              <Share className="mr-2 h-4 w-4" />
              Compartilhar Link
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </TooltipProvider>
  );
}