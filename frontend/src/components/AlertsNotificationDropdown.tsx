import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bell, AlertTriangle, CheckCircle } from 'lucide-react';
import { alertsService } from '@/apps/monitor/services/alertsService';
import type { Alert } from '@/apps/monitor/types/alert';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useState } from 'react';

export function AlertsNotificationDropdown() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  // Fetch unacknowledged alerts
  const { data: alertsData, isLoading } = useQuery({
    queryKey: ['alerts-notifications'],
    queryFn: () => alertsService.list({ status: 'active' }),
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 10000,
  });

  const allAlerts = alertsData?.results || [];
  const unacknowledgedAlerts = allAlerts.filter((a: Alert) => !a.acknowledged_at);
  const unacknowledgedCount = unacknowledgedAlerts.length;

  // Mutation to acknowledge alert
  const acknowledgeMutation = useMutation({
    mutationFn: (alertId: number) => alertsService.acknowledge(alertId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
  });

  // Mutation to acknowledge all alerts
  const acknowledgeAllMutation = useMutation({
    mutationFn: async () => {
      const promises = unacknowledgedAlerts.map((alert: Alert) => 
        alertsService.acknowledge(alert.id)
      );
      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
  });

  const handleMarkAsRead = (e: React.MouseEvent, alertId: number) => {
    e.stopPropagation();
    acknowledgeMutation.mutate(alertId);
  };

  const handleMarkAllAsRead = () => {
    acknowledgeAllMutation.mutate();
  };

  const handleClear = () => {
    // Clear just closes the popover
    setOpen(false);
  };

  const handleViewAll = () => {
    setOpen(false);
    navigate('/monitor/alertas');
  };

  const formatAlertTime = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { 
        addSuffix: false, 
        locale: ptBR 
      });
    } catch {
      return '';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case 'critical':
      case 'critico':
        return 'text-red-500';
      case 'high':
      case 'alta':
        return 'text-orange-500';
      case 'medium':
      case 'media':
        return 'text-yellow-500';
      default:
        return 'text-blue-500';
    }
  };

  // Format value to 2 decimal places
  const formatValue = (value: number | string | null | undefined): string => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'number') return value.toFixed(2);
    const parsed = parseFloat(value);
    return isNaN(parsed) ? value : parsed.toFixed(2);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-8 w-8 flex-shrink-0"
        >
          <Bell className="h-4 w-4" />
          {unacknowledgedCount > 0 && (
            <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-medium">
              {unacknowledgedCount > 99 ? '99+' : unacknowledgedCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-80 p-0" 
        align="end"
        sideOffset={8}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div>
            <h4 className="font-semibold text-sm">Notificações</h4>
            <p className="text-xs text-muted-foreground">
              {unacknowledgedCount} não lida{unacknowledgedCount !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 text-xs"
              onClick={handleMarkAllAsRead}
              disabled={unacknowledgedCount === 0 || acknowledgeAllMutation.isPending}
            >
              Marcar todas
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 text-xs"
              onClick={handleClear}
            >
              Limpar
            </Button>
          </div>
        </div>

        {/* Alerts List */}
        <ScrollArea className="max-h-[320px]">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : unacknowledgedAlerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <CheckCircle className="h-10 w-10 text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">Sem alertas pendentes</p>
            </div>
          ) : (
            <div className="divide-y">
              {unacknowledgedAlerts.slice(0, 5).map((alert: Alert) => (
                <div 
                  key={alert.id}
                  className="flex gap-3 px-4 py-3 hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => {
                    setOpen(false);
                    navigate('/monitor/alertas');
                  }}
                >
                  {/* Unread indicator */}
                  <div className="flex-shrink-0 mt-1.5">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                  </div>
                  
                  {/* Alert content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className={cn("h-4 w-4 flex-shrink-0 mt-0.5", getSeverityColor(alert.severity))} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {alert.rule_name || 'Alerta'}
                        </p>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                          {alert.message?.replace(/\{[^}]+\}/g, (match) => {
                            // Extract variable name from {variable_name}
                            const varName = match.slice(1, -1);
                            if (varName === 'variavel' && alert.parameter_key) {
                              return alert.parameter_key;
                            }
                            return match;
                          }) || `${alert.parameter_key} - valor: ${formatValue(alert.parameter_value)}, limite: ${formatValue(alert.threshold)}`}
                        </p>
                        <div className="flex items-center justify-between mt-1.5">
                          <span className="text-[10px] text-muted-foreground">
                            há {formatAlertTime(alert.triggered_at)}
                          </span>
                          <Button
                            variant="link"
                            size="sm"
                            className="h-auto p-0 text-[10px] text-primary"
                            onClick={(e) => handleMarkAsRead(e, alert.id)}
                            disabled={acknowledgeMutation.isPending}
                          >
                            Marcar como lida
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        {unacknowledgedAlerts.length > 0 && (
          <div className="border-t p-2">
            <Button 
              variant="ghost" 
              className="w-full h-8 text-xs"
              onClick={handleViewAll}
            >
              Ver todas as notificações
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
