/**
 * WidgetCard - Componente de widget para dashboard customizável
 */

import { DashboardWidget } from '../types/dashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { 
  Activity, 
  AlertTriangle, 
  Zap, 
  Heart, 
  Clock, 
  Wrench,
  TrendingUp,
  TrendingDown,
  BarChart3,
  LineChart,
  Table,
  X,
  GripVertical
} from 'lucide-react';

interface WidgetCardProps {
  widget: DashboardWidget;
  editMode: boolean;
  onRemove?: (id: string) => void;
  data?: any;
}

// Mapa de ícones
const iconMap: Record<string, any> = {
  activity: Activity,
  alert: AlertTriangle,
  energy: Zap,
  health: Heart,
  clock: Clock,
  wrench: Wrench,
  trend: TrendingUp,
  bar: BarChart3,
  line: LineChart,
  table: Table
};

// Função para obter span baseado no tamanho
function getColSpan(size: string): string {
  switch (size) {
    case 'col-1': return 'lg:col-span-1';
    case 'col-2': return 'lg:col-span-2';
    case 'col-3': return 'lg:col-span-3';
    case 'col-4': return 'lg:col-span-4';
    case 'col-5': return 'lg:col-span-5';
    case 'col-6': return 'lg:col-span-6';
    case 'small': return 'lg:col-span-1';
    case 'medium': return 'lg:col-span-2';
    case 'large': return 'lg:col-span-3';
    default: return 'lg:col-span-2';
  }
}

export function WidgetCard({ widget, editMode, onRemove, data }: WidgetCardProps) {
  const IconComponent = iconMap[widget.config?.icon || 'activity'] || Activity;
  const iconColor = widget.config?.iconColor || widget.config?.color || '#6b7280';

  const renderContent = () => {
    switch (widget.type) {
      case 'card-kpi':
        return renderKPICard();
      case 'chart-bar':
        return renderChartPlaceholder('bar');
      case 'chart-line':
        return renderChartPlaceholder('line');
      case 'table-alerts':
        return renderAlertsTable();
      default:
        return renderDefaultCard();
    }
  };

  const renderKPICard = () => {
    // Obter valor dos dados baseado no widget
    let value = '—';
    let trend: 'up' | 'down' | null = null;
    let trendValue = '';

    if (data?.kpis) {
      switch (widget.id) {
        case 'overview-uptime':
          value = `${data.kpis.uptime}%`;
          trend = 'up';
          trendValue = '+2.3%';
          break;
        case 'overview-active-alerts':
          value = String(data.kpis.activeAlerts);
          trend = data.kpis.activeAlerts > 0 ? 'up' : null;
          break;
        case 'overview-consumption':
          value = `${data.kpis.consumption}`;
          trend = 'down';
          trendValue = '-5%';
          break;
        case 'overview-health-score':
          value = `${data.kpis.avgHealth}%`;
          trend = 'up';
          trendValue = '+1.2%';
          break;
        case 'overview-mtbf':
          value = data.kpis.mtbf;
          trend = 'up';
          trendValue = '+12h';
          break;
        case 'overview-mttr':
          value = data.kpis.mttr;
          trend = 'down';
          trendValue = '-0.5h';
          break;
      }
    }

    return (
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-1">
            {widget.config?.label || widget.title}
          </p>
          <p className="text-2xl font-bold">{value}</p>
          {trend && (
            <div className={cn(
              "flex items-center gap-1 text-xs mt-1",
              trend === 'up' && widget.id !== 'overview-active-alerts' ? "text-green-600" : "",
              trend === 'down' ? "text-green-600" : "",
              widget.id === 'overview-active-alerts' && trend === 'up' ? "text-red-600" : ""
            )}>
              {trend === 'up' ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              <span>{trendValue}</span>
            </div>
          )}
        </div>
        <div 
          className="p-3 rounded-full"
          style={{ backgroundColor: `${iconColor}20` }}
        >
          <IconComponent 
            className="w-6 h-6" 
            style={{ color: iconColor }}
          />
        </div>
      </div>
    );
  };

  const renderChartPlaceholder = (type: 'bar' | 'line') => {
    return (
      <div className="h-48 flex flex-col items-center justify-center text-muted-foreground">
        {type === 'bar' ? (
          <BarChart3 className="w-12 h-12 mb-2 opacity-50" />
        ) : (
          <LineChart className="w-12 h-12 mb-2 opacity-50" />
        )}
        <p className="text-sm">
          Gráfico de {type === 'bar' ? 'barras' : 'linha'}
        </p>
        <p className="text-xs mt-1">
          Configure um sensor para visualizar dados
        </p>
      </div>
    );
  };

  const renderAlertsTable = () => {
    const alerts = data?.topAlerts || [];
    
    if (alerts.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
          <AlertTriangle className="w-12 h-12 mb-2 opacity-50" />
          <p className="text-sm">Nenhum alerta ativo</p>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {alerts.slice(0, 5).map((alert: any, index: number) => (
          <div 
            key={alert.id || index}
            className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className={cn(
                "w-4 h-4",
                alert.severity === 'Critical' && "text-red-500",
                alert.severity === 'High' && "text-orange-500",
                alert.severity === 'Medium' && "text-yellow-500",
                alert.severity === 'Low' && "text-blue-500"
              )} />
              <span className="text-sm font-medium">{alert.message}</span>
            </div>
            <span className="text-xs text-muted-foreground">
              {alert.assetTag}
            </span>
          </div>
        ))}
      </div>
    );
  };

  const renderDefaultCard = () => {
    return (
      <div className="flex items-center justify-center h-24 text-muted-foreground">
        <p className="text-sm">Widget: {widget.type}</p>
      </div>
    );
  };

  return (
    <Card className={cn(
      "col-span-1 relative transition-all",
      getColSpan(widget.size),
      editMode && "ring-2 ring-blue-200 ring-offset-2"
    )}>
      {editMode && (
        <div className="absolute top-2 right-2 flex items-center gap-1 z-10">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 cursor-grab active:cursor-grabbing"
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 hover:bg-red-100 hover:text-red-600"
            onClick={() => onRemove?.(widget.id)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
      
      {widget.type !== 'card-kpi' && (
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">{widget.title}</CardTitle>
        </CardHeader>
      )}
      
      <CardContent className={widget.type === 'card-kpi' ? 'pt-4' : ''}>
        {renderContent()}
      </CardContent>
    </Card>
  );
}
