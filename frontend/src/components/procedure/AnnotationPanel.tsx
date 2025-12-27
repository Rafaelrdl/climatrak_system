import { useState, useRef, useEffect } from 'react';
import {
  MessageSquare,
  Plus,
  Filter,
  Search,
  Check,
  Archive,
  AlertTriangle,
  HelpCircle,
  Highlighter,
  FileText,
  Edit3,
  MoreVertical,
  Reply,
  Trash2,
  Eye,
  EyeOff
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  DocumentAnnotation, 
  Comment, 
  AnnotationThread, 
  AnnotationType,
  CommentStatus 
} from '@/models/procedure';

interface AnnotationPanelProps {
  procedureId: string;
  versionNumber: number;
  annotations: DocumentAnnotation[];
  comments: Comment[];
  onCreateAnnotation: (annotation: Omit<DocumentAnnotation, 'id' | 'created_at' | 'updated_at'>) => void;
  onUpdateAnnotation: (id: string, updates: Partial<DocumentAnnotation>) => void;
  onDeleteAnnotation: (id: string) => void;
  onCreateComment: (comment: Omit<Comment, 'id' | 'created_at' | 'updated_at'>) => void;
  onUpdateComment: (id: string, updates: Partial<Comment>) => void;
  onDeleteComment: (id: string) => void;
  onAnnotationClick: (annotation: DocumentAnnotation) => void;
  className?: string;
}

const annotationTypeIcons = {
  highlight: Highlighter,
  note: FileText,
  question: HelpCircle,
  correction: Edit3,
  warning: AlertTriangle,
};

const annotationTypeLabels = {
  highlight: 'Destaque',
  note: 'Nota',
  question: 'Pergunta',
  correction: 'Correção',
  warning: 'Aviso',
};

const annotationTypeColors = {
  highlight: '#fbbf24',
  note: '#3b82f6',
  question: '#8b5cf6',
  correction: '#f59e0b',
  warning: '#ef4444',
};

export function AnnotationPanel({
  procedureId,
  versionNumber,
  annotations,
  comments,
  onCreateAnnotation,
  onUpdateAnnotation,
  onDeleteAnnotation,
  onCreateComment,
  onUpdateComment,
  onDeleteComment,
  onAnnotationClick,
  className = ''
}: AnnotationPanelProps) {
  const [filter, setFilter] = useState<{
    type: AnnotationType | 'all';
    status: 'all' | 'resolved' | 'unresolved';
    author: string;
  }>({
    type: 'all',
    status: 'all',
    author: ''
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [newCommentContent, setNewCommentContent] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [expandedThreads, setExpandedThreads] = useState<Set<string>>(new Set());
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    type: 'annotation' | 'comment';
    id: string;
  }>({ open: false, type: 'annotation', id: '' });

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Group comments by annotation
  const annotationThreads: AnnotationThread[] = annotations.map(annotation => {
    const annotationComments = comments.filter(
      comment => comment.annotation_id === annotation.id
    );
    
    return {
      annotation,
      comments: annotationComments.sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      ),
      unread_count: 0 // TODO: Implement read tracking
    };
  });

  // Standalone comments (not linked to annotations)
  const standaloneComments = comments.filter(comment => !comment.annotation_id);

  // Filter threads based on current filters
  const filteredThreads = annotationThreads.filter(thread => {
    const matchesType = filter.type === 'all' || thread.annotation.type === filter.type;
    const matchesStatus = 
      filter.status === 'all' ||
      (filter.status === 'resolved' && thread.annotation.is_resolved) ||
      (filter.status === 'unresolved' && !thread.annotation.is_resolved);
    const matchesAuthor = !filter.author || thread.annotation.author.toLowerCase().includes(filter.author.toLowerCase());
    const matchesSearch = !searchQuery || 
      thread.annotation.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      thread.comments.some(comment => comment.content.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesType && matchesStatus && matchesAuthor && matchesSearch;
  });

  const handleToggleThread = (annotationId: string) => {
    setExpandedThreads(prev => {
      const newSet = new Set(prev);
      if (newSet.has(annotationId)) {
        newSet.delete(annotationId);
      } else {
        newSet.add(annotationId);
      }
      return newSet;
    });
  };

  const handleResolveAnnotation = (annotationId: string, resolved: boolean) => {
    onUpdateAnnotation(annotationId, { is_resolved: resolved });
    toast.success(resolved ? 'Anotação resolvida' : 'Anotação reaberta');
  };

  const handleDeleteAnnotation = (annotationId: string) => {
    onDeleteAnnotation(annotationId);
    setDeleteDialog({ open: false, type: 'annotation', id: '' });
    toast.success('Anotação excluída');
  };

  const handleAddComment = (annotationId: string, content: string, parentId?: string) => {
    if (!content.trim()) return;

    onCreateComment({
      annotation_id: annotationId,
      procedure_id: procedureId,
      version_number: versionNumber,
      parent_id: parentId,
      content: content.trim(),
      author: 'Usuário Atual', // TODO: Get from auth context
      status: 'open',
      mentions: extractMentions(content)
    });

    setNewCommentContent('');
    setReplyingTo(null);
    toast.success('Comentário adicionado');
  };

  const extractMentions = (content: string): string[] => {
    const mentionRegex = /@(\w+)/g;
    const mentions: string[] = [];
    let match;
    while ((match = mentionRegex.exec(content)) !== null) {
      mentions.push(match[1]);
    }
    return mentions;
  };

  const resetFilters = () => {
    setFilter({ type: 'all', status: 'all', author: '' });
    setSearchQuery('');
  };

  const totalAnnotations = annotations.length;
  const resolvedAnnotations = annotations.filter(a => a.is_resolved).length;
  const unresolvedAnnotations = totalAnnotations - resolvedAnnotations;

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="p-4 border-b bg-muted/30">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-lg">Anotações</h3>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {totalAnnotations} total
            </Badge>
            {unresolvedAnnotations > 0 && (
              <Badge variant="destructive" className="text-xs">
                {unresolvedAnnotations} não resolvidas
              </Badge>
            )}
          </div>
        </div>

        {/* Search and Filters */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Buscar anotações e comentários..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="flex gap-2">
            <Select value={filter.type} onValueChange={(value) => setFilter(prev => ({ ...prev, type: value as any }))}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {Object.entries(annotationTypeLabels).map(([type, label]) => (
                  <SelectItem key={type} value={type}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filter.status} onValueChange={(value) => setFilter(prev => ({ ...prev, status: value as any }))}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="unresolved">Não resolvidas</SelectItem>
                <SelectItem value="resolved">Resolvidas</SelectItem>
              </SelectContent>
            </Select>

            {(filter.type !== 'all' || filter.status !== 'all' || searchQuery) && (
              <Button variant="ghost" size="sm" onClick={resetFilters}>
                Limpar
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Annotation Threads */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {filteredThreads.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="mx-auto h-12 w-12 mb-3" />
              <p>Nenhuma anotação encontrada</p>
              <p className="text-sm">Selecione texto no documento para criar uma anotação</p>
            </div>
          ) : (
            filteredThreads.map((thread) => {
              const IconComponent = annotationTypeIcons[thread.annotation.type];
              const isExpanded = expandedThreads.has(thread.annotation.id);
              
              return (
                <Card 
                  key={thread.annotation.id} 
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    thread.annotation.is_resolved ? 'opacity-60' : ''
                  }`}
                  onClick={() => onAnnotationClick(thread.annotation)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <IconComponent 
                          className="h-4 w-4" 
                          style={{ color: annotationTypeColors[thread.annotation.type] }}
                        />
                        <Badge variant="outline" className="text-xs">
                          {annotationTypeLabels[thread.annotation.type]}
                        </Badge>
                        {thread.annotation.is_resolved && (
                          <Badge variant="secondary" className="text-xs">
                            <Check className="h-3 w-3 mr-1" />
                            Resolvida
                          </Badge>
                        )}
                      </div>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              handleResolveAnnotation(thread.annotation.id, !thread.annotation.is_resolved);
                            }}
                          >
                            {thread.annotation.is_resolved ? (
                              <>
                                <EyeOff className="mr-2 h-4 w-4" />
                                Reabrir
                              </>
                            ) : (
                              <>
                                <Check className="mr-2 h-4 w-4" />
                                Resolver
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteDialog({ open: true, type: 'annotation', id: thread.annotation.id });
                            }}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {thread.annotation.selected_text && (
                      <div className="mt-2 p-2 bg-muted/30 rounded text-sm italic border-l-2"
                           style={{ borderLeftColor: annotationTypeColors[thread.annotation.type] }}>
                        "{thread.annotation.selected_text}"
                      </div>
                    )}

                    <p className="text-sm mt-2">{thread.annotation.content}</p>
                    
                    <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
                      <span>{thread.annotation.author}</span>
                      <span>{formatDistanceToNow(new Date(thread.annotation.created_at), { 
                        addSuffix: true, 
                        locale: ptBR 
                      })}</span>
                    </div>
                  </CardHeader>

                  {thread.comments.length > 0 && (
                    <CardContent className="pt-0">
                      <Separator className="mb-3" />
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleThread(thread.annotation.id);
                        }}
                        className="mb-2"
                      >
                        <MessageSquare className="mr-2 h-4 w-4" />
                        {thread.comments.length} comentário{thread.comments.length !== 1 ? 's' : ''}
                      </Button>

                      {isExpanded && (
                        <div className="space-y-3">
                          {thread.comments.map((comment) => (
                            <div key={comment.id} className="border rounded p-3">
                              <p className="text-sm">{comment.content}</p>
                              <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
                                <span>{comment.author}</span>
                                <span>{formatDistanceToNow(new Date(comment.created_at), { 
                                  addSuffix: true, 
                                  locale: ptBR 
                                })}</span>
                              </div>
                            </div>
                          ))}

                          {/* Add Comment */}
                          <div className="pt-2">
                            <Textarea
                              ref={textareaRef}
                              placeholder="Adicionar comentário..."
                              value={newCommentContent}
                              onChange={(e) => setNewCommentContent(e.target.value)}
                              className="min-h-[80px]"
                              onClick={(e) => e.stopPropagation()}
                            />
                            <div className="flex gap-2 mt-2">
                              <Button
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAddComment(thread.annotation.id, newCommentContent);
                                }}
                                disabled={!newCommentContent.trim()}
                              >
                                Comentar
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setNewCommentContent('');
                                }}
                              >
                                Cancelar
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  )}
                </Card>
              );
            })
          )}
        </div>
      </ScrollArea>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog(prev => ({ ...prev, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente a {deleteDialog.type === 'annotation' ? 'anotação' : 'comentário'} e todos os dados associados.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialog({ open: false, type: 'annotation', id: '' })}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteDialog.type === 'annotation') {
                  handleDeleteAnnotation(deleteDialog.id);
                } else {
                  onDeleteComment(deleteDialog.id);
                }
              }}
            >
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}