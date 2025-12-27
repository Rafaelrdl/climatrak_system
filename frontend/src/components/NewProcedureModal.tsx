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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { Textarea } from '@/components/ui/textarea';
import { Plus, FloppyDisk, X } from '@phosphor-icons/react';
import { toast } from 'sonner';

interface NewProcedureModalProps {
  onProcedureCreated?: (procedure: any) => void;
}

export function NewProcedureModal({ onProcedureCreated }: NewProcedureModalProps) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    category: '',
    description: '',
    content: '',
    tags: [] as string[],
    priority: 'medium',
    estimatedTime: '',
    requiredTools: '',
    safetyNotes: '',
  });
  const [newTag, setNewTag] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const categories = [
    'Manutenção Preventiva',
    'Manutenção Corretiva',
    'Inspeção',
    'Segurança',
    'Limpeza',
    'Calibração',
    'Instalação',
    'Diagnóstico',
  ];

  const priorities = [
    { value: 'low', label: 'Baixa', color: 'secondary' },
    { value: 'medium', label: 'Média', color: 'default' },
    { value: 'high', label: 'Alta', color: 'destructive' },
    { value: 'critical', label: 'Crítica', color: 'destructive' },
  ];

  const handleInputChange = (field: string, value: string) => {
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

  const handleSubmit = async () => {
    if (!formData.title.trim() || !formData.category || !formData.content.trim()) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Simular API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const newProcedure = {
        id: Date.now(),
        ...formData,
        version: '1.0',
        status: 'Ativo',
        lastUpdated: new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString(),
      };

      toast.success('Procedimento criado com sucesso!');
      
      if (onProcedureCreated) {
        onProcedureCreated(newProcedure);
      }

      // Reset form
      setFormData({
        title: '',
        category: '',
        description: '',
        content: '',
        tags: [],
        priority: 'medium',
        estimatedTime: '',
        requiredTools: '',
        safetyNotes: '',
      });
      
      setOpen(false);
    } catch (error) {
      toast.error('Erro ao criar procedimento');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Novo Procedimento
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Criar Novo Procedimento</DialogTitle>
          <DialogDescription>
            Crie um novo procedimento operacional padronizado com instruções detalhadas.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Informações Básicas</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Título *</Label>
                <Input
                  id="title"
                  placeholder="Ex: Procedimento de Limpeza de Filtros HVAC"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Categoria *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => handleInputChange('category', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                placeholder="Breve descrição do procedimento..."
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="priority">Prioridade</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) => handleInputChange('priority', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {priorities.map((priority) => (
                      <SelectItem key={priority.value} value={priority.value}>
                        {priority.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="estimatedTime">Tempo Estimado</Label>
                <Input
                  id="estimatedTime"
                  placeholder="Ex: 30 minutos"
                  value={formData.estimatedTime}
                  onChange={(e) => handleInputChange('estimatedTime', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Tags</h3>
            
            <div className="space-y-2">
              <Label htmlFor="tags">Adicionar Tags</Label>
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
                      />
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Additional Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Informações Adicionais</h3>
            
            <div className="space-y-2">
              <Label htmlFor="requiredTools">Ferramentas Necessárias</Label>
              <Textarea
                id="requiredTools"
                placeholder="Liste as ferramentas e materiais necessários..."
                value={formData.requiredTools}
                onChange={(e) => handleInputChange('requiredTools', e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="safetyNotes">Notas de Segurança</Label>
              <Textarea
                id="safetyNotes"
                placeholder="Instruções importantes de segurança..."
                value={formData.safetyNotes}
                onChange={(e) => handleInputChange('safetyNotes', e.target.value)}
                rows={3}
              />
            </div>
          </div>

          {/* Content Editor */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Conteúdo do Procedimento *</h3>
            <RichTextEditor
              content={formData.content}
              onChange={(content) => handleInputChange('content', content)}
              placeholder="Digite as instruções detalhadas do procedimento..."
              className="min-h-[400px]"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              <FloppyDisk className="mr-2 h-4 w-4" />
              {isSubmitting ? 'Salvando...' : 'Criar Procedimento'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}