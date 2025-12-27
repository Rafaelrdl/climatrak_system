import { useState, useCallback, useEffect } from 'react';
import { Upload, FileText, FileImage, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Procedure, ProcedureCategory, ProcedureStatus } from '@/models/procedure';
import { useCreateProcedure, useUpdateProcedure } from '@/hooks/useProceduresQuery';
import { toast } from 'sonner';

interface ProcedureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  categories: ProcedureCategory[];
  procedure?: Procedure; // For editing
}

export function ProcedureModal({
  isOpen,
  onClose,
  onSuccess,
  categories,
  procedure,
}: ProcedureModalProps) {
  const isEditing = !!procedure;
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category_id: null as string | null,
    status: 'Ativo' as ProcedureStatus,
    tags: [] as string[],
  });
  
  const [file, setFile] = useState<File | null>(null);
  const [newTag, setNewTag] = useState('');
  const [dragActive, setDragActive] = useState(false);

  // Reset form when modal opens/closes or procedure changes
  useEffect(() => {
    if (isOpen) {
      setFormData({
        title: procedure?.title || '',
        description: procedure?.description || '',
        category_id: procedure?.category_id || null,
        status: procedure?.status || 'Ativo',
        tags: procedure?.tags || [],
      });
      setFile(null);
      setNewTag('');
    }
  }, [isOpen, procedure]);

  // API Mutations
  const createProcedureMutation = useCreateProcedure();
  const updateProcedureMutation = useUpdateProcedure();

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      validateAndSetFile(droppedFile);
    }
  }, []);

  const validateAndSetFile = (selectedFile: File) => {
    const maxSize = 20 * 1024 * 1024; // 20MB
    const allowedTypes = ['application/pdf'];
    const allowedExtensions = ['.pdf'];
    
    // Check file size
    if (selectedFile.size > maxSize) {
      toast.error('Arquivo muito grande. Máximo permitido: 20MB');
      return;
    }

    // Check file type
    const isValidType = allowedTypes.includes(selectedFile.type) ||
      allowedExtensions.some(ext => selectedFile.name.toLowerCase().endsWith(ext));
    
    if (!isValidType) {
      toast.error('Tipo de arquivo não suportado. Use apenas arquivos PDF');
      return;
    }

    setFile(selectedFile);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      validateAndSetFile(selectedFile);
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (!formData.title.trim()) {
      toast.error('Título é obrigatório');
      return;
    }

    if (!isEditing && !file) {
      toast.error('Selecione um arquivo PDF');
      return;
    }
    
    try {
      if (isEditing && procedure) {
        // Update existing procedure via API
        const apiStatus = formData.status === 'Ativo' ? 'ACTIVE' : 'INACTIVE';
        
        await updateProcedureMutation.mutateAsync({
          id: Number(procedure.id),
          data: {
            title: formData.title,
            description: formData.description,
            category: formData.category_id ? Number(formData.category_id) : undefined,
            status: apiStatus,
            file: file || undefined,
          },
        });
      } else {
        // Create new procedure via API
        if (!file) throw new Error('Arquivo é obrigatório para novos procedimentos');
        
        const fileType = 'PDF'; // Apenas PDF é suportado
        const apiStatus = formData.status === 'Ativo' ? 'ACTIVE' : 'INACTIVE';
        
        await createProcedureMutation.mutateAsync({
          title: formData.title,
          description: formData.description,
          category: formData.category_id ? Number(formData.category_id) : 0,
          status: apiStatus,
          file_type: fileType,
          file: file,
        });
      }

      onSuccess();
      handleClose();
    } catch (error) {
      console.error('Error saving procedure:', error);
      // Toast is handled by mutation hooks
    }
  };

  const isSubmitting = createProcedureMutation.isPending || updateProcedureMutation.isPending;

  const handleClose = () => {
    setFormData({
      title: '',
      description: '',
      category_id: null,
      status: 'Ativo',
      tags: [],
    });
    setFile(null);
    setNewTag('');
    onClose();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Procedimento' : 'Novo Procedimento Operacional'}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? 'Atualize as informações do procedimento operacional'
              : 'Faça upload do documento PDF (POP) e preencha as informações'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* File Upload (only for new procedures) */}
          {!isEditing && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Arquivo *</Label>
                <div
                  className={`relative border-2 border-dashed rounded-lg p-6 transition-colors ${
                    dragActive 
                      ? 'border-primary bg-primary/5' 
                      : 'border-muted-foreground/25 hover:border-muted-foreground/50'
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleFileSelect}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  
                  {file ? (
                    <div className="text-center space-y-2">
                      <div className="flex items-center justify-center">
                        {file.name.endsWith('.pdf') ? (
                          <FileImage className="h-12 w-12 text-red-500" />
                        ) : (
                          <FileText className="h-12 w-12 text-blue-500" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{file.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatFileSize(file.size)}
                        </p>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFile(null);
                        }}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Remover
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center space-y-2">
                      <Upload className="h-12 w-12 text-muted-foreground mx-auto" />
                      <div>
                        <p className="text-sm font-medium">
                          Clique para selecionar ou arraste o documento
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Arquivo PDF • Máximo 20MB
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <Separator />

          {/* Basic Information */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Título do Documento *</Label>
              <Input
                id="title"
                placeholder="Ex: POP - Limpeza de Filtros HVAC"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                placeholder="Descreva o objetivo e aplicação do procedimento..."
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Categoria</Label>
                <Select
                  value={formData.category_id || 'none'}
                  onValueChange={(value) => 
                    handleInputChange('category_id', value === 'none' ? null : value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem categoria</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        <div className="flex items-center gap-2">
                          {category.color && (
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: category.color }}
                              aria-hidden="true"
                            />
                          )}
                          {category.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => handleInputChange('status', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Ativo">Ativo</SelectItem>
                    <SelectItem value="Inativo">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tags">Tags</Label>
              <div className="flex gap-2">
                <Input
                  id="tags"
                  placeholder="Digite uma tag e pressione Enter"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={handleKeyPress}
                />
                <Button type="button" variant="outline" onClick={handleAddTag}>
                  Adicionar
                </Button>
              </div>
              
              {formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                      {tag}
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() => handleRemoveTag(tag)}
                        aria-label={`Remover tag ${tag}`}
                      />
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting 
                ? (isEditing ? 'Atualizando...' : 'Criando...') 
                : (isEditing ? 'Atualizar' : 'Criar Procedimento')
              }
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}