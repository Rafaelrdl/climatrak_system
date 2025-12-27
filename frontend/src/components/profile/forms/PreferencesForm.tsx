import { useState, useCallback, useEffect } from 'react';
import { Mail, Bell, Clock, Calendar, Globe, Check, AlertCircle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import type { User } from '@/models/user';

interface PreferencesFormProps {
  preferences: User['preferences'];
  onSave: (preferences: NonNullable<User['preferences']>) => void;
}

const defaultPreferences = {
  theme: 'system' as const,
  language: 'pt-BR' as const,
  date_format: 'DD/MM/YYYY' as const,
  time_format: '24h' as const,
  alert_cooldown_minutes: 60,
  notifications: {
    email: true,
    push: true,
  },
};

export function PreferencesForm({ preferences, onSave }: PreferencesFormProps) {
  const [formData, setFormData] = useState({
    ...defaultPreferences,
    ...preferences,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Check if form has changes
  useEffect(() => {
    const original = { ...defaultPreferences, ...preferences };
    const hasChanges = JSON.stringify(formData) !== JSON.stringify(original);
    setIsDirty(hasChanges);
  }, [formData, preferences]);

  const handleSelectChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: field === 'alert_cooldown_minutes' ? parseInt(value) : value,
    }));
  };

  const handleNotificationChange = (type: 'email' | 'push', enabled: boolean) => {
    setFormData(prev => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [type]: enabled,
      },
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    setIsLoading(true);
    try {
      await onSave(formData);
      toast.success('Preferências atualizadas com sucesso');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao atualizar preferências');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setFormData({
      ...defaultPreferences,
      ...preferences,
    });
  };

  const handleRestoreDefaults = () => {
    setFormData(defaultPreferences);
  };

  const dateFormatOptions = [
    { value: 'DD/MM/YYYY', label: 'DD/MM/AAAA', example: '31/12/2024' },
    { value: 'YYYY-MM-DD', label: 'AAAA-MM-DD', example: '2024-12-31' },
  ];

  const timeFormatOptions = [
    { value: '24h', label: '24 horas', example: '14:30' },
    { value: '12h', label: '12 horas', example: '2:30 PM' },
  ];

  const alertCooldownOptions = [
    { value: '15', label: '15 minutos' },
    { value: '30', label: '30 minutos' },
    { value: '60', label: '1 hora' },
    { value: '120', label: '2 horas' },
    { value: '180', label: '3 horas' },
    { value: '360', label: '6 horas' },
    { value: '720', label: '12 horas' },
    { value: '1440', label: '24 horas' },
  ];

  return (
    <div
      role="tabpanel"
      aria-labelledby="tab-preferencias"
      id="panel-preferencias"
      className="space-y-6"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Regionalização */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Regionalização
            </CardTitle>
            <CardDescription>
              Configure os formatos de data e hora para sua região
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 sm:grid-cols-2">
              {/* Formato de Data */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-sm font-medium">Formato de Data</Label>
                </div>
                <Select
                  value={formData.date_format}
                  onValueChange={(value) => handleSelectChange('date_format', value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {dateFormatOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex items-center justify-between gap-4">
                          <span>{option.label}</span>
                          <span className="text-xs text-muted-foreground">({option.example})</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Formato de Hora */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-sm font-medium">Formato de Hora</Label>
                </div>
                <Select
                  value={formData.time_format}
                  onValueChange={(value) => handleSelectChange('time_format', value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {timeFormatOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex items-center justify-between gap-4">
                          <span>{option.label}</span>
                          <span className="text-xs text-muted-foreground">({option.example})</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Alertas */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Intervalo de Alertas
            </CardTitle>
            <CardDescription>
              Configure o tempo mínimo entre alertas repetidos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select
              value={String(formData.alert_cooldown_minutes || 60)}
              onValueChange={(value) => handleSelectChange('alert_cooldown_minutes', value)}
            >
              <SelectTrigger className="w-full sm:w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {alertCooldownOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
              💡 Após um alerta ser gerado, a regra não gerará novos alertas para essa 
              variável durante o período selecionado. Isso evita notificações repetidas.
            </p>
          </CardContent>
        </Card>

        {/* Notificações */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Notificações
            </CardTitle>
            <CardDescription>
              Configure como você deseja receber notificações do sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Notificações por Email */}
            <div className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Mail className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <Label htmlFor="email-notifications" className="text-sm font-medium cursor-pointer">
                    Notificações por Email
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Receba atualizações sobre tarefas e solicitações
                  </p>
                </div>
              </div>
              <Switch
                id="email-notifications"
                checked={formData.notifications.email}
                onCheckedChange={(checked) => handleNotificationChange('email', checked)}
              />
            </div>

            {/* Notificações Push */}
            <div className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <Bell className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <Label htmlFor="push-notifications" className="text-sm font-medium cursor-pointer">
                    Notificações no Navegador
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Receba notificações instantâneas no navegador
                  </p>
                </div>
              </div>
              <Switch
                id="push-notifications"
                checked={formData.notifications.push}
                onCheckedChange={(checked) => handleNotificationChange('push', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Botões */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRestoreDefaults}
              disabled={isLoading}
              className="text-muted-foreground"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Restaurar Padrões
            </Button>
            
            {isDirty && (
              <span className="flex items-center gap-1.5 text-sm text-amber-600">
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
    </div>
  );
}
