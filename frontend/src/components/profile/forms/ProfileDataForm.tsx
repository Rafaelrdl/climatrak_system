import { useState, useRef, useCallback, useEffect, RefObject } from 'react';
import { User, Upload, X, Camera, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { User as UserType } from '@/models/user';

interface ProfileDataFormProps {
  user: UserType;
  onSave: (data: Partial<UserType>) => void;
  externalFileInputRef?: RefObject<HTMLInputElement>;
}

export function ProfileDataForm({ user, onSave, externalFileInputRef }: ProfileDataFormProps) {
  const [formData, setFormData] = useState({
    name: user.name || '',
    phone: user.phone || '',
    avatar_url: user.avatar_url || '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(user.avatar_url || '');
  const [isDirty, setIsDirty] = useState(false);
  
  const internalFileInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = externalFileInputRef || internalFileInputRef;

  // Check if form has changes
  useEffect(() => {
    const hasChanges = 
      formData.name !== (user.name || '') ||
      formData.phone !== (user.phone || '') ||
      formData.avatar_url !== (user.avatar_url || '');
    setIsDirty(hasChanges);
  }, [formData, user]);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const validateForm = useCallback(() => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Nome é obrigatório';
    } else if (formData.name.trim().length < 3) {
      newErrors.name = 'Nome deve ter pelo menos 3 caracteres';
    }

    if (formData.phone && !/^[+]?[\d\s()-]+$/.test(formData.phone)) {
      newErrors.phone = 'Formato de telefone inválido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Limpar erro do campo quando o usuário começar a digitar
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleAvatarUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione uma imagem válida');
      return;
    }

    // Validar tamanho (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 5MB');
      return;
    }

    // Converter para base64
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setAvatarPreview(dataUrl);
      setFormData(prev => ({ ...prev, avatar_url: dataUrl }));
    };
    reader.readAsDataURL(file);
  }, []);

  const handleRemoveAvatar = useCallback(() => {
    setAvatarPreview('');
    setFormData(prev => ({ ...prev, avatar_url: '' }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [fileInputRef]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      await onSave(formData);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao atualizar dados');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setFormData({
      name: user.name || '',
      phone: user.phone || '',
      avatar_url: user.avatar_url || '',
    });
    setAvatarPreview(user.avatar_url || '');
    setErrors({});
  };

  return (
    <div
      role="tabpanel"
      aria-labelledby="tab-dados"
      id="panel-dados"
      className="space-y-6"
    >
      {/* Avatar Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Camera className="h-4 w-4" />
            Foto do Perfil
          </CardTitle>
          <CardDescription>
            Adicione uma foto para personalizar seu perfil
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="relative group">
              <Avatar className="h-24 w-24 border-2 border-border">
                <AvatarImage src={avatarPreview} alt="Avatar do usuário" className="object-cover" />
                <AvatarFallback className="bg-primary/10 text-primary text-xl font-semibold">
                  {getInitials(formData.name || 'U')}
                </AvatarFallback>
              </Avatar>
              
              {avatarPreview && (
                <Button
                  type="button"
                  size="icon"
                  variant="destructive"
                  className="absolute -top-2 -right-2 h-7 w-7 rounded-full shadow-md"
                  onClick={handleRemoveAvatar}
                  aria-label="Remover foto do perfil"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            
            <div className="flex flex-col gap-3">
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2"
                >
                  <Upload className="h-4 w-4" />
                  {avatarPreview ? 'Alterar Foto' : 'Adicionar Foto'}
                </Button>
                
                {avatarPreview && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleRemoveAvatar}
                    className="text-destructive hover:text-destructive"
                  >
                    Remover
                  </Button>
                )}
              </div>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
                aria-label="Selecionar foto do perfil"
              />
              
              <p className="text-xs text-muted-foreground">
                Formatos aceitos: JPG, PNG, GIF. Tamanho máximo: 5MB
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Personal Information Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4" />
            Informações Pessoais
          </CardTitle>
          <CardDescription>
            Atualize seus dados de contato e identificação
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-6 sm:grid-cols-2">
              {/* Nome */}
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium">
                  Nome Completo <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  aria-invalid={!!errors.name}
                  aria-describedby={errors.name ? 'name-error' : undefined}
                  className={cn(errors.name && 'border-destructive focus-visible:ring-destructive')}
                  placeholder="Digite seu nome completo"
                />
                {errors.name && (
                  <p id="name-error" role="alert" className="text-sm text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.name}
                  </p>
                )}
              </div>

              {/* Telefone */}
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-medium">
                  Telefone
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="(11) 99999-9999"
                  aria-invalid={!!errors.phone}
                  aria-describedby={errors.phone ? 'phone-error' : undefined}
                  className={cn(errors.phone && 'border-destructive focus-visible:ring-destructive')}
                />
                {errors.phone && (
                  <p id="phone-error" role="alert" className="text-sm text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.phone}
                  </p>
                )}
              </div>
            </div>

            <Separator />

            {/* Email (read-only) */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={user.email}
                disabled
                className="bg-muted/50 cursor-not-allowed"
              />
              <p className="text-xs text-muted-foreground">
                Entre em contato com o administrador para alterar o email
              </p>
            </div>

            {/* Botões */}
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                {isDirty && (
                  <span className="flex items-center gap-1.5 text-amber-600">
                    <AlertCircle className="h-3.5 w-3.5" />
                    Alterações não salvas
                  </span>
                )}
              </div>
              
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleReset}
                  disabled={isLoading || !isDirty}
                >
                  Descartar
                </Button>
                
                <Button
                  type="submit"
                  disabled={isLoading || !isDirty}
                  className="min-w-[120px]"
                >
                  {isLoading ? (
                    <>
                      <span className="animate-spin mr-2">⏳</span>
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Salvar
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
