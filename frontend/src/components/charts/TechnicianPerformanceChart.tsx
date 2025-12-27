// Importações dos componentes de UI e ícones
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users } from 'lucide-react';
import { useMemo } from 'react';
import { useWorkOrders } from '@/hooks/useWorkOrdersQuery';
import type { TechnicianPerformance } from '@/types';

/**
 * Componente que exibe um gráfico de barras horizontais empilhadas
 * mostrando o desempenho dos técnicos por tipo de ordem de serviço
 */
export function TechnicianPerformanceChart() {
  // Busca ordens de serviço da API
  const { data: workOrders = [], isLoading } = useWorkOrders();

  // Calcula dados de desempenho por técnico com dados reais
  const technicianData = useMemo<TechnicianPerformance[]>(() => {
    const performanceMap = new Map<string, TechnicianPerformance>();

    // Processa ordens de serviço completadas
    workOrders
      .filter(wo => wo.status === 'COMPLETED' && wo.assignedToName)
      .forEach(wo => {
        const name = wo.assignedToName!;
        const existing = performanceMap.get(name) || {
          name,
          preventive: 0,
          corrective: 0,
          request: 0
        };

        if (wo.type === 'PREVENTIVE') {
          existing.preventive++;
        } else if (wo.type === 'CORRECTIVE') {
          existing.corrective++;
        } else if (wo.type === 'REQUEST') {
          existing.request++;
        }

        performanceMap.set(name, existing);
      });

    // Converte para array e ordena por total de OS (maior primeiro)
    return Array.from(performanceMap.values())
      .sort((a, b) => {
        const totalA = a.preventive + a.corrective + a.request;
        const totalB = b.preventive + b.corrective + b.request;
        return totalB - totalA;
      })
      .slice(0, 5); // Limita a 5 técnicos
  }, [workOrders]);

  // Calcula o valor máximo para dimensionar as barras proporcionalmente
  const maxValue = technicianData.reduce((max, tech) => {
    const total = tech.preventive + tech.corrective + tech.request;
    return Math.max(max, total);
  }, 0);

  // Gera label descritivo para acessibilidade (leitores de tela)
  const totalWorkOrders = technicianData.reduce((sum, tech) => 
    sum + tech.preventive + tech.corrective + tech.request, 0
  );
  
  const ariaLabel = `Gráfico de desempenho dos técnicos. Total de ${totalWorkOrders} ordens de serviço. 
    ${technicianData.map(tech => 
      `${tech.name}: ${tech.preventive + tech.corrective + tech.request} ordens`
    ).join(', ')}.`;

  // Renderiza estado de carregamento
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Desempenho por Técnico
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2 animate-pulse">
                <div className="h-4 bg-muted rounded w-1/3"></div>
                <div className="h-6 bg-muted rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Renderiza estado vazio quando não há dados
  if (technicianData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Desempenho por Técnico
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Nenhum dado de desempenho disponível
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Desempenho por Técnico
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Seção das barras do gráfico */}
          <div className="space-y-4">
            {technicianData.map((tech) => {
              // Calcula total de ordens para o técnico atual
              const total = tech.preventive + tech.corrective + tech.request;
              // Calcula porcentagens para cada tipo de ordem (largura das barras)
              const preventiveWidth = maxValue > 0 ? (tech.preventive / maxValue) * 100 : 0;
              const correctiveWidth = maxValue > 0 ? (tech.corrective / maxValue) * 100 : 0;
              const requestWidth = maxValue > 0 ? (tech.request / maxValue) * 100 : 0;
              
              return (
                <div key={tech.name} className="space-y-2 performance-chart-row">
                  {/* Nome do técnico e total de ordens */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground truncate transition-colors hover:text-primary">
                      {tech.name}
                    </span>
                    <span className="text-xs text-muted-foreground font-medium ml-2 transition-colors hover:text-foreground">
                      {total}
                    </span>
                  </div>
                  
                  {/* Barra horizontal empilhada */}
                  <div 
                    className="relative h-6 bg-muted/30 rounded-md overflow-visible cursor-pointer"
                    role="progressbar" 
                    aria-label={`${tech.name}: ${total} ordens de serviço total`}
                    tabIndex={0}
                  >
                    {/* Tooltip que aparece no hover */}
                    <div 
                      className="chart-tooltip absolute -top-24 left-1/2 transform -translate-x-1/2 text-gray-900 px-4 py-3 rounded-lg shadow-xl border border-gray-200 text-xs whitespace-nowrap z-50 min-w-max pointer-events-none"
                      style={{ backgroundColor: '#ffffff' }}
                    >
                      <div className="font-semibold mb-2 text-center border-b border-gray-200 pb-1 text-sm text-gray-900">{tech.name}</div>
                      <div className="space-y-1.5">
                        {/* Linha para ordens preventivas */}
                        <div className="flex items-center justify-between gap-4 min-w-0">
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: '#00968f' }}></div>
                            <span className="text-xs text-gray-700">Preventiva:</span>
                          </div>
                          <span className="font-semibold text-xs text-gray-900">{tech.preventive}</span>
                        </div>
                        {/* Linha para ordens corretivas */}
                        <div className="flex items-center justify-between gap-4 min-w-0">
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: '#ffbe0b' }}></div>
                            <span className="text-xs text-gray-700">Corretiva:</span>
                          </div>
                          <span className="font-semibold text-xs text-gray-900">{tech.corrective}</span>
                        </div>
                        {/* Linha para solicitações */}
                        <div className="flex items-center justify-between gap-4 min-w-0">
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: '#715aff' }}></div>
                            <span className="text-xs text-gray-700">Solicitação:</span>
                          </div>
                          <span className="font-semibold text-xs text-gray-900">{tech.request}</span>
                        </div>
                        {/* Linha do total */}
                        <div className="border-t border-gray-200 pt-1.5 mt-2">
                          <div className="flex items-center justify-between gap-4 font-semibold">
                            <span className="text-xs text-gray-600">Total:</span>
                            <span className="text-xs text-gray-900">{total}</span>
                          </div>
                        </div>
                      </div>
                      {/* Seta do tooltip */}
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-6 border-transparent border-t-white drop-shadow-sm"></div>
                    </div>

                    {/* Segmento da barra para ordens preventivas */}
                    {tech.preventive > 0 && (
                      <div
                        className="absolute left-0 top-0 h-full rounded-l-md performance-bar"
                        style={{
                          width: `${preventiveWidth}%`,
                          backgroundColor: '#00968f'
                        }}
                        title={`Preventiva: ${tech.preventive}`}
                      />
                    )}
                    
                    {/* Segmento da barra para ordens corretivas */}
                    {tech.corrective > 0 && (
                      <div
                        className="absolute top-0 h-full performance-bar"
                        style={{
                          left: `${preventiveWidth}%`,
                          width: `${correctiveWidth}%`,
                          backgroundColor: '#ffbe0b'
                        }}
                        title={`Corretiva: ${tech.corrective}`}
                      />
                    )}
                    
                    {/* Segmento da barra para solicitações */}
                    {tech.request > 0 && (
                      <div
                        className="absolute top-0 h-full rounded-r-md performance-bar"
                        style={{
                          left: `${preventiveWidth + correctiveWidth}%`,
                          width: `${requestWidth}%`,
                          backgroundColor: '#715aff'
                        }}
                        title={`Solicitação: ${tech.request}`}
                      />
                    )}
                    
                    {/* Texto acessível para leitores de tela */}
                    <span className="sr-only">
                      {tech.name}: {tech.preventive} preventivas, {tech.corrective} corretivas, {tech.request} solicitações
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Legenda do gráfico */}
          <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-border">
            {/* Item da legenda - Preventiva */}
            <div className="flex items-center gap-2 hover:bg-muted/50 rounded-lg px-2 py-1 transition-colors cursor-pointer group">
              <div 
                className="w-3 h-3 rounded transition-transform group-hover:scale-110"
                style={{ backgroundColor: '#00968f' }}
              />
              <span className="text-sm text-foreground transition-colors group-hover:text-primary">Preventiva</span>
            </div>
            {/* Item da legenda - Corretiva */}
            <div className="flex items-center gap-2 hover:bg-muted/50 rounded-lg px-2 py-1 transition-colors cursor-pointer group">
              <div 
                className="w-3 h-3 rounded transition-transform group-hover:scale-110"
                style={{ backgroundColor: '#ffbe0b' }}
              />
              <span className="text-sm text-foreground transition-colors group-hover:text-primary">Corretiva</span>
            </div>
            {/* Item da legenda - Solicitação */}
            <div className="flex items-center gap-2 hover:bg-muted/50 rounded-lg px-2 py-1 transition-colors cursor-pointer group">
              <div 
                className="w-3 h-3 rounded transition-transform group-hover:scale-110"
                style={{ backgroundColor: '#715aff' }}
              />
              <span className="text-sm text-foreground transition-colors group-hover:text-primary">Solicitação</span>
            </div>
          </div>
        </div>
        
        {/* Descrição acessível oculta para leitores de tela */}
        <div 
          role="img" 
          aria-label={ariaLabel}
          className="sr-only"
        />
      </CardContent>
    </Card>
  );
}