import { useState, useRef, useEffect } from 'react';
import { DocumentAnnotation, AnnotationType, AnnotationPosition } from '@/models/procedure';
import {
  HelpCircle,
  AlertTriangle,
  FileText,
  Edit3,
  Highlighter,
  MessageSquare,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

interface AnnotationOverlayProps {
  annotations: DocumentAnnotation[];
  onAnnotationClick: (annotation: DocumentAnnotation) => void;
  onCreateAnnotation: (annotation: Omit<DocumentAnnotation, 'id' | 'created_at' | 'updated_at'>) => void;
  procedureId: string;
  versionNumber: number;
  containerRef: React.RefObject<HTMLElement>;
  isCreatingAnnotation: boolean;
  onCancelCreate: () => void;
  fileType: 'pdf' | 'md';
  currentPage?: number; // For PDF
}

const annotationTypeIcons = {
  highlight: Highlighter,
  note: FileText,
  question: HelpCircle,
  correction: Edit3,
  warning: AlertTriangle,
};

const annotationTypeColors = {
  highlight: '#fbbf24',
  note: '#3b82f6',
  question: '#8b5cf6',
  correction: '#f59e0b',
  warning: '#ef4444',
};

const annotationTypeLabels = {
  highlight: 'Destaque',
  note: 'Nota',
  question: 'Pergunta',
  correction: 'Correção',
  warning: 'Aviso',
};

export function AnnotationOverlay({
  annotations,
  onAnnotationClick,
  onCreateAnnotation,
  procedureId,
  versionNumber,
  containerRef,
  isCreatingAnnotation,
  onCancelCreate,
  fileType,
  currentPage = 1
}: AnnotationOverlayProps) {
  const [selection, setSelection] = useState<{
    text: string;
    position: AnnotationPosition;
  } | null>(null);
  
  const [newAnnotation, setNewAnnotation] = useState<{
    type: AnnotationType;
    content: string;
    position: AnnotationPosition;
    selectedText: string;
  } | null>(null);

  const overlayRef = useRef<HTMLDivElement>(null);

  // Filter annotations for current page (PDF) or show all (Markdown)
  const visibleAnnotations = fileType === 'pdf' 
    ? annotations.filter(a => a.position.pageNumber === currentPage)
    : annotations;

  useEffect(() => {
    const handleSelection = () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || !containerRef.current) return;

      const selectedText = selection.toString().trim();
      if (!selectedText) return;

      const range = selection.getRangeAt(0);
      const containerRect = containerRef.current.getBoundingClientRect();
      const rangeRect = range.getBoundingClientRect();

      let position: AnnotationPosition;

      if (fileType === 'pdf') {
        // For PDF, calculate position relative to the page
        const pageElement = range.commonAncestorContainer.nodeType === Node.TEXT_NODE 
          ? range.commonAncestorContainer.parentElement?.closest('.react-pdf__Page')
          : (range.commonAncestorContainer as Element).closest('.react-pdf__Page');

        if (pageElement) {
          const pageRect = pageElement.getBoundingClientRect();
          position = {
            pageNumber: currentPage,
            x: (rangeRect.left - pageRect.left) / pageRect.width,
            y: (rangeRect.top - pageRect.top) / pageRect.height,
            width: rangeRect.width / pageRect.width,
            height: rangeRect.height / pageRect.height,
          };
        } else {
          // Fallback to container-relative positioning
          position = {
            pageNumber: currentPage,
            x: (rangeRect.left - containerRect.left) / containerRect.width,
            y: (rangeRect.top - containerRect.top) / containerRect.height,
            width: rangeRect.width / containerRect.width,
            height: rangeRect.height / containerRect.height,
          };
        }
      } else {
        // For Markdown, we need to find line and character positions
        // This is more complex and would require walking the DOM
        // For now, use simple positioning
        position = {
          x: (rangeRect.left - containerRect.left) / containerRect.width,
          y: (rangeRect.top - containerRect.top) / containerRect.height,
          width: rangeRect.width / containerRect.width,
          height: rangeRect.height / containerRect.height,
        };
      }

      setSelection({
        text: selectedText,
        position
      });
    };

    const handleClickOutside = (event: MouseEvent) => {
      if (selection && 
          overlayRef.current && 
          !overlayRef.current.contains(event.target as Node) &&
          !isCreatingAnnotation) {
        setSelection(null);
      }
    };

    document.addEventListener('mouseup', handleSelection);
    document.addEventListener('click', handleClickOutside);

    return () => {
      document.removeEventListener('mouseup', handleSelection);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [selection, isCreatingAnnotation, containerRef, fileType, currentPage]);

  const handleStartAnnotation = () => {
    if (!selection) return;

    setNewAnnotation({
      type: 'note',
      content: '',
      position: selection.position,
      selectedText: selection.text
    });
    setSelection(null);
  };

  const handleCreateAnnotation = () => {
    if (!newAnnotation || !newAnnotation.content.trim()) return;

    onCreateAnnotation({
      procedure_id: procedureId,
      version_number: versionNumber,
      type: newAnnotation.type,
      position: newAnnotation.position,
      content: newAnnotation.content.trim(),
      selected_text: newAnnotation.selectedText,
      color: annotationTypeColors[newAnnotation.type],
      author: 'Usuário Atual', // TODO: Get from auth context
      is_resolved: false
    });

    setNewAnnotation(null);
    onCancelCreate();
    toast.success('Anotação criada com sucesso');
  };

  const handleCancelAnnotation = () => {
    setNewAnnotation(null);
    setSelection(null);
    onCancelCreate();
  };

  const getAnnotationStyle = (position: AnnotationPosition, color: string) => {
    if (fileType === 'pdf' && position.pageNumber !== currentPage) {
      return { display: 'none' };
    }

    return {
      position: 'absolute' as const,
      left: `${position.x * 100}%`,
      top: `${position.y * 100}%`,
      width: position.width ? `${position.width * 100}%` : 'auto',
      height: position.height ? `${position.height * 100}%` : 'auto',
      backgroundColor: `${color}40`, // 25% opacity
      border: `2px solid ${color}`,
      borderRadius: '3px',
      cursor: 'pointer',
      zIndex: 10,
      minWidth: '20px',
      minHeight: '20px',
    };
  };

  const getTooltipPosition = (position: AnnotationPosition) => {
    const containerRect = containerRef.current?.getBoundingClientRect();
    if (!containerRect) return {};

    const x = position.x * containerRect.width;
    const y = position.y * containerRect.height;

    // Position tooltip to avoid edges
    const tooltipWidth = 300;
    const tooltipHeight = 150;

    let left = x;
    let top = y - tooltipHeight - 10;

    // Adjust if too close to edges
    if (left + tooltipWidth > containerRect.width) {
      left = containerRect.width - tooltipWidth - 10;
    }
    if (left < 10) {
      left = 10;
    }
    if (top < 10) {
      top = y + (position.height ? position.height * containerRect.height : 20) + 10;
    }

    return {
      left: `${left}px`,
      top: `${top}px`,
    };
  };

  return (
    <div ref={overlayRef} className="absolute inset-0 pointer-events-none" style={{ zIndex: 5 }}>
      {/* Existing Annotations */}
      {visibleAnnotations.map((annotation) => {
        const IconComponent = annotationTypeIcons[annotation.type];
        
        return (
          <div key={annotation.id} className="pointer-events-auto">
            <div
              style={getAnnotationStyle(annotation.position, annotation.color)}
              onClick={() => onAnnotationClick(annotation)}
              title={`${annotationTypeLabels[annotation.type]}: ${annotation.content}`}
            >
              {/* Annotation marker */}
              <div 
                className="absolute -top-2 -right-2 w-6 h-6 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-white text-xs"
                style={{ backgroundColor: annotation.color }}
              >
                <IconComponent className="w-3 h-3" />
              </div>
            </div>
          </div>
        );
      })}

      {/* Selection Tooltip */}
      {selection && !newAnnotation && (
        <div
          className="pointer-events-auto absolute z-20"
          style={getTooltipPosition(selection.position)}
        >
          <Card className="w-80 shadow-lg">
            <CardContent className="p-3">
              <div className="text-sm mb-3 p-2 bg-muted/30 rounded italic border-l-2 border-primary">
                "{selection.text}"
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleStartAnnotation}>
                  <MessageSquare className="w-4 h-4 mr-1" />
                  Anotar
                </Button>
                <Button size="sm" variant="outline" onClick={() => setSelection(null)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* New Annotation Form */}
      {newAnnotation && (
        <div
          className="pointer-events-auto absolute z-30"
          style={getTooltipPosition(newAnnotation.position)}
        >
          <Card className="w-96 shadow-xl">
            <CardContent className="p-4">
              <div className="space-y-3">
                <div className="text-sm p-2 bg-muted/30 rounded italic border-l-2 border-primary">
                  "{newAnnotation.selectedText}"
                </div>

                <Select
                  value={newAnnotation.type}
                  onValueChange={(value: AnnotationType) =>
                    setNewAnnotation(prev => prev ? { ...prev, type: value } : null)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(annotationTypeLabels).map(([type, label]) => {
                      const IconComponent = annotationTypeIcons[type as AnnotationType];
                      return (
                        <SelectItem key={type} value={type}>
                          <div className="flex items-center gap-2">
                            <IconComponent className="w-4 h-4" style={{ color: annotationTypeColors[type as AnnotationType] }} />
                            {label}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>

                <Textarea
                  placeholder={`Adicione uma ${annotationTypeLabels[newAnnotation.type].toLowerCase()}...`}
                  value={newAnnotation.content}
                  onChange={(e) =>
                    setNewAnnotation(prev => prev ? { ...prev, content: e.target.value } : null)
                  }
                  className="min-h-[80px]"
                  autoFocus
                />

                <div className="flex gap-2 justify-end">
                  <Button size="sm" variant="outline" onClick={handleCancelAnnotation}>
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleCreateAnnotation}
                    disabled={!newAnnotation.content.trim()}
                  >
                    Criar Anotação
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}