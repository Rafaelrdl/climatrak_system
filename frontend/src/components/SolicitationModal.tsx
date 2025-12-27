import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ArrowRight, 
  PlayCircle, 
  CheckCircle,
  MapPin,
  Package,
  User,
  FileText,
  Clock,
  ArrowRightCircle
} from 'lucide-react';
import { StatusBadge } from '@/components/StatusBadge';
import type { Solicitation } from '@/types';

interface SolicitationModalProps {
  solicitation: Solicitation | null;
  isOpen: boolean;
  onClose: () => void;
  onConvert: (solicitation: Solicitation) => void;
}

export function SolicitationModal({
  solicitation,
  isOpen,
  onClose,
  onConvert
}: SolicitationModalProps) {
  if (!solicitation) {
    return null;
  }

  const isConverted = solicitation.status === 'Convertida em OS';

  const getStatusIcon = (status: Solicitation['status']) => {
    switch (status) {
      case 'Nova':
        return <PlayCircle className="h-4 w-4" />;
      case 'Em triagem':
        return <ArrowRight className="h-4 w-4" />;
      case 'Convertida em OS':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleConvert = () => {
    onConvert(solicitation);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl">
                Solicitação {solicitation.id ? `SOL-${solicitation.id.slice(-6).toUpperCase()}` : ''}
              </DialogTitle>
              <DialogDescription>
                Detalhes da solicitação de manutenção
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              {getStatusIcon(solicitation.status)}
              <StatusBadge status={solicitation.status} />
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6 py-4">
            {/* Informações Principais */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-muted-foreground flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Localização
                </Label>
                <p className="font-medium">{solicitation.location_name || '-'}</p>
              </div>

              <div className="space-y-1">
                <Label className="text-muted-foreground flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Equipamento
                </Label>
                <p className="font-medium">{solicitation.equipment_name || '-'}</p>
              </div>

              <div className="space-y-1">
                <Label className="text-muted-foreground flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Solicitante
                </Label>
                <p className="font-medium">{solicitation.requester_user_name || '-'}</p>
              </div>

              <div className="space-y-1">
                <Label className="text-muted-foreground flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Data da Solicitação
                </Label>
                <p className="font-medium">{formatDate(solicitation.created_at)}</p>
              </div>
            </div>

            {/* Observação */}
            {solicitation.note && (
              <div className="space-y-2">
                <Label className="text-muted-foreground flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Descrição / Observação
                </Label>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm whitespace-pre-wrap">{solicitation.note}</p>
                </div>
              </div>
            )}

            {/* Histórico de Status */}
            {solicitation.status_history.length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Histórico de Status</Label>
                  <div className="space-y-1 text-sm">
                    {solicitation.status_history.map((history, index) => (
                      <div key={index} className="flex items-center gap-2 text-muted-foreground">
                        <span>{history.from || 'Criada'}</span>
                        <ArrowRight className="h-3 w-3" />
                        <span>{history.to}</span>
                        <span className="ml-auto text-xs">
                          {new Date(history.at).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="gap-4 border-t pt-4">
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
          {!isConverted && (
            <Button onClick={handleConvert} className="gap-2">
              <ArrowRightCircle className="h-4 w-4" />
              Converter em OS
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
