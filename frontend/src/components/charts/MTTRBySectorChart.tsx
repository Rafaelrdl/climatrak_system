import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3 } from 'lucide-react';
import type { MTTRBySector } from '@/models/metrics';

interface MTTRBySectorChartProps {
  data: MTTRBySector[];
  title?: string;
  srDescriptionId?: string;
}

export function MTTRBySectorChart({ 
  data, 
  title = "MTTR por Setor",
  srDescriptionId = "mttr-chart-description"
}: MTTRBySectorChartProps) {
  const maxValue = data.length > 0 ? Math.max(...data.map(item => item.mttr_hours)) : 0;
  
  // Generate aria-label for accessibility
  const ariaLabel = `Gráfico de barras MTTR por setor. ${data.length > 0 
    ? data.map(item => `${item.sector_name}: ${item.mttr_hours} horas`).join(', ')
    : 'Nenhum dado disponível'
  }.`;

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum dado de MTTR disponível para o período selecionado</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {data.map((item, index) => {
            const widthPercent = maxValue > 0 ? (item.mttr_hours / maxValue) * 100 : 0;
            
            return (
              <div key={item.sector_name} className="group">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-foreground truncate transition-colors group-hover:text-primary">
                    {item.sector_name}
                  </span>
                  <div className="flex items-center gap-2 ml-2">
                    <span className="text-xs text-muted-foreground transition-colors group-hover:text-foreground">
                      {item.mttr_hours}h
                    </span>
                    <span className="text-xs text-muted-foreground/70">
                      ({item.wo_count} OS)
                    </span>
                  </div>
                </div>
                
                <div className="relative h-8 bg-muted/30 rounded-md overflow-hidden">
                  {/* Hover tooltip */}
                  <div className="invisible group-hover:visible absolute -top-20 left-1/2 transform -translate-x-1/2 bg-popover text-popover-foreground px-3 py-2 rounded-lg shadow-lg border text-xs whitespace-nowrap z-20">
                    <div className="font-medium mb-1">{item.sector_name}</div>
                    <div className="space-y-1">
                      <div>MTTR: {item.mttr_hours} horas</div>
                      <div>Ordens de Serviço: {item.wo_count}</div>
                      <div className="text-xs text-muted-foreground">
                        Apenas OS corretivas concluídas
                      </div>
                    </div>
                    {/* Arrow */}
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-popover"></div>
                  </div>
                  
                  <div
                    className="chart-bar h-full rounded-md bg-primary transition-all duration-300 cursor-pointer"
                    style={{ width: `${Math.max(widthPercent, 2)}%` }}
                    role="progressbar"
                    aria-valuenow={item.mttr_hours}
                    aria-valuemax={maxValue}
                    aria-label={`${item.sector_name}: ${item.mttr_hours} horas de MTTR médio`}
                    tabIndex={0}
                  />
                  
                  {/* Accessible text for screen readers */}
                  <span className="sr-only">
                    {item.sector_name}: MTTR de {item.mttr_hours} horas baseado em {item.wo_count} ordens de serviço
                  </span>
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Unit label */}
        <div className="mt-4 pt-4 border-t border-border">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Tempo médio de reparo (horas)</span>
            <span>Ordenado por maior MTTR</span>
          </div>
        </div>
        
        {/* Hidden accessible description */}
        <div 
          id={srDescriptionId}
          role="img" 
          aria-label={ariaLabel}
          className="sr-only"
        />
      </CardContent>
    </Card>
  );
}