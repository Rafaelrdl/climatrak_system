import { useState } from 'react';
import { X, Copy, CheckCheck, Clock, Mail, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { toast } from 'sonner';
import type { Invite } from '@/models/invite';

interface InvitePreviewDrawerProps {
  invite: Invite | null;
  onClose: () => void;
}

const roleLabels = {
  admin: 'Administrador',
  technician: 'Técnico',
  requester: 'Solicitante',
};

export function InvitePreviewDrawer({ invite, onClose }: InvitePreviewDrawerProps) {
  const [copiedUrl, setCopiedUrl] = useState(false);

  const handleCopyUrl = async () => {
    if (!invite?.url) return;

    try {
      await navigator.clipboard.writeText(invite.url);
      setCopiedUrl(true);
      
      // Remover o estado de copiado após 2 segundos
      setTimeout(() => {
        setCopiedUrl(false);
      }, 2000);
      
      toast.success('Link copiado para a área de transferência');
    } catch (error) {
      toast.error('Erro ao copiar link');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getRemainingDays = (expiresAt: string) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 0) return 'Expirado';
    if (diffDays === 1) return '1 dia restante';
    return `${diffDays} dias restantes`;
  };

  if (!invite) return null;

  return (
    <Sheet open={!!invite} onOpenChange={onClose}>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            Convite Enviado
          </SheetTitle>
          <SheetDescription>
            Compartilhe este link com a pessoa convidada para que ela possa aceitar o convite.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Informações do convite */}
          <div className="space-y-4">
            <div className="p-4 border rounded-lg space-y-3">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Detalhes do Convite</span>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Email:</span>
                  <span className="font-medium">{invite.email}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Papel:</span>
                  <Badge variant="outline">
                    {roleLabels[invite.role]}
                  </Badge>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Enviado em:</span>
                  <span>{formatDate(invite.sent_at)}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <Badge variant="secondary">
                    Pendente
                  </Badge>
                </div>
              </div>
            </div>

            {/* Expiração */}
            <div className="p-3 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-orange-600" />
                <span className="text-sm font-medium text-orange-700 dark:text-orange-300">
                  {getRemainingDays(invite.expires_at)}
                </span>
              </div>
              <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                Expira em {formatDate(invite.expires_at)}
              </p>
            </div>
          </div>

          {/* Link de convite */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">
              Link de Convite
            </Label>
            
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={invite.url}
                  readOnly
                  className="flex-1 px-3 py-2 text-sm bg-muted border rounded-md font-mono"
                  aria-label="Link de convite"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyUrl}
                  className="flex items-center gap-2"
                  aria-label="Copiar link de convite"
                >
                  {copiedUrl ? (
                    <>
                      <CheckCheck className="h-4 w-4 text-green-600" />
                      Copiado
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copiar
                    </>
                  )}
                </Button>
              </div>
              
              <p className="text-xs text-muted-foreground">
                Este link permite que a pessoa convidada se cadastre no sistema com o papel especificado.
              </p>
            </div>
          </div>

          {/* Instruções */}
          <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <h4 className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-2">
              Como Funciona
            </h4>
            <ol className="text-xs text-blue-600 dark:text-blue-400 space-y-1 list-decimal list-inside">
              <li>Compartilhe o link acima com a pessoa convidada</li>
              <li>Ela clicará no link e será direcionada para o cadastro</li>
              <li>Após criar a senha, terá acesso ao sistema com o papel especificado</li>
              <li>O convite expira automaticamente em 7 dias</li>
            </ol>
          </div>

          {/* Botão de fechar */}
          <div className="flex justify-end pt-4">
            <Button onClick={onClose} className="min-w-[100px]">
              Fechar
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// Componente Label local para evitar conflitos de importação
function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <label className={className}>{children}</label>;
}