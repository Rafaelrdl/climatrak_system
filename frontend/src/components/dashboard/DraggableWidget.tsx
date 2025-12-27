import { useState, useMemo, useRef, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { DashboardWidget } from '@/types/dashboard';
import { useDashboardStore } from '@/store/useDashboardStore';
import { WidgetConfig } from './WidgetConfig';
import { ConfirmDialog } from '@/shared/ui/components/ConfirmDialog';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { KPICard } from '@/components/KPICard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import * as echarts from 'echarts';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  GripVertical, 
  X, 
  Settings,
  Activity, 
  AlertTriangle, 
  TrendingUp,
  TrendingDown,
  Minus,
  Clock,
  ClipboardList,
  Server,
  BarChart3,
  PieChart,
  LineChart as LineChartIcon,
  Gauge,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';

// Importar mapa de ícones do arquivo separado
import { kpiIconMap } from './kpiIcons';

// Hooks para dados reais
import { useWorkOrders, useWorkOrderStats } from '@/hooks/useWorkOrdersQuery';
import { useEquipments } from '@/hooks/useEquipmentQuery';
import { useSensorData, evaluateFormula, useMultiSensorHistory } from '@/hooks/useSensorData';

interface DraggableWidgetProps {
  widget: DashboardWidget;
  layoutId: string;
}

export function DraggableWidget({ widget, layoutId }: DraggableWidgetProps) {
  const editMode = useDashboardStore(state => state.editMode);
  const removeWidget = useDashboardStore(state => state.removeWidget);
  const [configOpen, setConfigOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [chartPeriod, setChartPeriod] = useState<string>('24h'); // Período do gráfico
  const [hiddenSeries, setHiddenSeries] = useState<Set<string>>(new Set()); // Séries ocultas no gráfico

  // Refs para ECharts - um para cada tipo de gráfico
  const echartsContainerRef = useRef<HTMLDivElement>(null);
  const echartsInstanceRef = useRef<echarts.ECharts | null>(null);
  const barChartContainerRef = useRef<HTMLDivElement>(null);
  const barChartInstanceRef = useRef<echarts.ECharts | null>(null);

  // Dados reais do sistema
  const { data: workOrders = [] } = useWorkOrders();
  const { data: workOrderStats } = useWorkOrderStats();
  const { data: equipment = [] } = useEquipments();
  
  // Dados do sensor configurado
  const sensorTag = widget.config?.sensorTag;
  const sensorTags = widget.config?.sensorTags; // Array de tags para gráficos multi-série
  const assetId = widget.config?.assetId;
  const assetTag = widget.config?.assetTag; // Tag do asset para telemetria
  const sensorData = useSensorData(sensorTag, assetId, 30000);
  
  // Histórico de múltiplas variáveis para gráficos
  const chartTimeRange = chartPeriod === '1h' ? 1 
    : chartPeriod === '12h' ? 12 
    : chartPeriod === '24h' ? 24 
    : chartPeriod === '7d' ? 168 
    : chartPeriod === '30d' ? 720 
    : 24;
  
  // Para heatmap-time, usar 7 dias de dados com a única variável configurada
  const heatmapTimeRange = widget.type === 'heatmap-time' ? 168 : chartTimeRange; // 7 dias = 168 horas
  const heatmapSensorTags = widget.type === 'heatmap-time' && sensorTag ? [sensorTag] : sensorTags;
  
  const multiSensorHistory = useMultiSensorHistory(heatmapSensorTags || sensorTags, assetTag, heatmapTimeRange, 60000);
  
  // Dados do heatmap temporal (moved to component level)
  const heatmapData = useMemo(() => {
    // Só calcular para widgets heatmap-time
    if (widget.type !== 'heatmap-time') return null;
    
    if (!multiSensorHistory.series.length || !multiSensorHistory.series[0]?.data.length) {
      return null;
    }

    const data = multiSensorHistory.series[0].data;
    const grid: { [day: string]: { [hour: string]: number | null } } = {};
    let min = Infinity;
    let max = -Infinity;

    // Processar os últimos 7 dias de dados
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Mapeamento padrão dos dias da semana
    const dayMapping = {
      0: 'Dom', // Domingo
      1: 'Seg', // Segunda
      2: 'Ter', // Terça
      3: 'Qua', // Quarta
      4: 'Qui', // Quinta
      5: 'Sex', // Sexta
      6: 'Sáb'  // Sábado
    };

    let processedPoints = 0;
    data.forEach(point => {
      const timestamp = new Date(point.timestamp);
      if (timestamp >= sevenDaysAgo && timestamp <= now) {
        const dayOfWeek = timestamp.getDay(); // 0 = domingo, 1 = segunda, etc.
        const dayKey = dayMapping[dayOfWeek as keyof typeof dayMapping];
        const hourKey = timestamp.getHours().toString().padStart(2, '0');
        
        if (!grid[dayKey]) {
          grid[dayKey] = {};
        }
        
        grid[dayKey][hourKey] = point.value;
        
        if (point.value < min) min = point.value;
        if (point.value > max) max = point.value;
        
        processedPoints++;
      }
    });

    // Verificar se temos dados válidos
    if (processedPoints === 0 || min === Infinity || max === -Infinity) {
      return null;
    }

    return { grid, min, max };
  }, [widget.type, multiSensorHistory.series, sensorTag, assetTag]);
  

  //   seriesCount: multiSensorHistory.series.length,
  //   loading: multiSensorHistory.loading,
  //   error: multiSensorHistory.error,
  //   widgetId: widget.id,
  //   series: multiSensorHistory.series.map(s => ({
  //     label: s.label,
  //     sensorTag: s.sensorTag,
  //     dataPoints: s.data.length,
  //     firstPoint: s.data[0],
  //     lastPoint: s.data[s.data.length - 1]
  //   }))
  // });
  
  // Função para remover MAC address do nome da variável
  // Exemplo: "F80332010002C873_temperatura_retorno" -> "temperatura_retorno"
  const formatSensorLabel = (tag: string | undefined): string => {
    if (!tag) return '';
    // Se contém underscore, pegar tudo depois do primeiro underscore (remove o MAC)
    if (tag.includes('_')) {
      return tag.split('_').slice(1).join('_');
    }
    return tag;
  };

  // Preparar dados para Recharts - DEVE estar no nível superior (regras dos hooks)
  const chartData = useMemo(() => {

    //   seriesLength: multiSensorHistory.series?.length || 0,
    //   series: multiSensorHistory.series
    // });
    
    if (!multiSensorHistory.series || multiSensorHistory.series.length === 0) {

      return [];
    }

    // Coletar todos os timestamps únicos
    const allTimestamps = new Set<number>();
    multiSensorHistory.series.forEach(serie => {
      serie.data.forEach(point => {
        allTimestamps.add(point.timestamp.getTime());
      });
    });



    // Ordenar timestamps
    const sortedTimestamps = Array.from(allTimestamps).sort((a, b) => a - b);

    // Criar objetos com todos os valores
    const data = sortedTimestamps.map(ts => {
      const point: Record<string, any> = { 
        timestamp: ts,
        timeLabel: new Date(ts).toLocaleString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        })
      };
      
      multiSensorHistory.series.forEach(serie => {
        const dataPoint = serie.data.find(d => d.timestamp.getTime() === ts);
        point[serie.label] = dataPoint?.value ?? null;
      });
      
      return point;
    });
    

    //   pointsCount: data.length,
    //   firstPoint: data[0],
    //   lastPoint: data[data.length - 1]
    // });
    
    return data;
  }, [multiSensorHistory.series]);
  
  // Effect para gerenciar ECharts (apenas para chart-line-echarts)
  useEffect(() => {

    //   widgetType: widget.type,
    //   hasContainer: !!echartsContainerRef.current,
    //   sensorTags,
    //   assetTag,
    //   seriesLength: multiSensorHistory.series.length,
    //   chartDataLength: chartData.length
    // });

    // Só executar para widgets ECharts
    if (widget.type !== 'chart-line-echarts' && widget.type !== 'chart-area') {
      // console.log('📊 ECharts: Tipo de widget não é chart-line-echarts ou chart-area');
      return;
    }
    
    if (!echartsContainerRef.current) {
      // console.log('📊 ECharts: Container ref não está disponível ainda');
      return;
    }

    // Inicializar instância do ECharts
    if (!echartsInstanceRef.current) {
      // console.log('📊 ECharts: Inicializando instância do ECharts');
      echartsInstanceRef.current = echarts.init(echartsContainerRef.current);
    }

    // Se tem sensores configurados e dados disponíveis
    if (sensorTags && sensorTags.length > 0 && assetTag && multiSensorHistory.series.length > 0 && chartData.length > 0) {
      // console.log('📊 ECharts: Preparando dados para renderizar gráfico', {
      //   hiddenSeriesCount: hiddenSeries.size,
      //   hiddenSeries: Array.from(hiddenSeries)
      // });
      
      // Preparar dados para ECharts
      const timestamps = chartData.map(point => 
        new Date(point.timestamp).toLocaleString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
          day: '2-digit',
          month: '2-digit'
        })
      );

      // Mapear TODAS as séries, mas controlar visibilidade através da propriedade 'show'
      const seriesData = multiSensorHistory.series.map(serie => {
        const isHidden = hiddenSeries.has(serie.label);
        // console.log(`📊 Série "${serie.label}":`, { isHidden });
        
        // Configuração base da série
        const serieConfig: any = {
          name: serie.label,
          type: 'line' as const,
          smooth: true,
          symbol: 'circle',
          symbolSize: 6,
          lineStyle: {
            width: 2.5,
            opacity: isHidden ? 0 : 1,
          },
          itemStyle: {
            color: serie.color,
            opacity: isHidden ? 0 : 1,
          },
          data: chartData.map(point => point[serie.label]),
          silent: isHidden,
        };

        // Se for gráfico de área, adicionar preenchimento
        if (widget.type === 'chart-area') {
          serieConfig.areaStyle = {
            opacity: isHidden ? 0 : 0.3, // Área com 30% de opacidade quando visível
            color: serie.color,
          };
        }

        return serieConfig;
      });

      const option: echarts.EChartsOption = {
        tooltip: {
          trigger: 'axis',
          axisPointer: {
            type: 'cross',
            label: {
              backgroundColor: '#6a7985'
            }
          },
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          borderColor: '#ddd',
          borderWidth: 1,
          textStyle: {
            color: '#333',
            fontSize: 12
          },
          formatter: (params: any) => {
            if (!Array.isArray(params)) return '';
            let tooltip = `<strong>${params[0].axisValue}</strong><br/>`;
            params.forEach((param: any) => {
              // Pular séries ocultas no tooltip
              const serieLabel = param.seriesName;
              if (hiddenSeries.has(serieLabel)) return;
              
              const value = typeof param.value === 'number' ? param.value.toFixed(2) : param.value;
              tooltip += `<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${param.color};margin-right:5px;"></span>${param.seriesName}: <strong>${value}</strong><br/>`;
            });
            return tooltip;
          }
        },
        legend: {
          show: false // Esconder legenda do ECharts, usar no header
        },
        grid: {
          left: '60px',
          right: '30px',
          bottom: '40px',
          top: '20px',
          containLabel: false
        },
        xAxis: {
          type: 'category',
          boundaryGap: false,
          data: timestamps,
          axisLabel: {
            fontSize: 11,
            color: '#666',
            rotate: 45
          },
          axisLine: {
            lineStyle: {
              color: '#ddd'
            }
          }
        },
        yAxis: {
          type: 'value',
          axisLabel: {
            fontSize: 11,
            color: '#666'
          },
          splitLine: {
            lineStyle: {
              color: '#eee',
              type: 'dashed'
            }
          },
          axisLine: {
            lineStyle: {
              color: '#ddd'
            }
          }
        },
        series: seriesData
      };

      // console.log('📊 ECharts: Setando opções do gráfico:', {
      //   timestamps: timestamps.length,
      //   seriesData: seriesData.length,
      //   visibleSeries: seriesData.filter((s: any) => !s.silent).length,
      //   hiddenSeriesCount: hiddenSeries.size
      // });

      // Usar setOption com notMerge: true para forçar re-renderização completa
      echartsInstanceRef.current.setOption(option, {
        notMerge: true, // Não fazer merge, substituir completamente
        replaceMerge: ['series'], // Substituir array de séries
      });
      
      // console.log('📊 ECharts: Gráfico renderizado com sucesso');
    }

    // Cleanup e resize
    const handleResize = () => {
      echartsInstanceRef.current?.resize();
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [widget.type, chartData, multiSensorHistory.series, hiddenSeries, sensorTags, assetTag]);

  // Cleanup da instância ECharts ao desmontar
  useEffect(() => {
    return () => {
      if (widget.type === 'chart-line-echarts' || widget.type === 'chart-area') {
        echartsInstanceRef.current?.dispose();
        echartsInstanceRef.current = null;
      }
    };
  }, [widget.type]);

  // Effect para gerenciar gráfico de barras ECharts
  useEffect(() => {
    // console.log('📊 Bar Chart useEffect executando:', {
    //   widgetType: widget.type,
    //   hasContainer: !!barChartContainerRef.current,
    //   sensorTags,
    //   assetTag,
    //   seriesLength: multiSensorHistory.series.length
    // });

    // Só executar para widgets de barra
    if (widget.type !== 'chart-bar' && widget.type !== 'chart-bar-horizontal') {
      // console.log('📊 Bar Chart: Tipo de widget não é chart-bar ou chart-bar-horizontal');
      return;
    }
    
    if (!barChartContainerRef.current) {
      // console.log('📊 Bar Chart: Container ref não está disponível ainda');
      return;
    }

    // Inicializar instância do ECharts para barras
    if (!barChartInstanceRef.current) {
      // console.log('📊 Bar Chart: Inicializando instância do ECharts');
      barChartInstanceRef.current = echarts.init(barChartContainerRef.current);
    }

    // Se tem sensores configurados e dados disponíveis
    if (sensorTags && sensorTags.length > 0 && assetTag && multiSensorHistory.series.length > 0) {
      // console.log('📊 Bar Chart: Preparando dados para renderizar gráfico');
      
      // Pegar o último valor de cada série para exibir
      const barData = multiSensorHistory.series.map(serie => {
        const lastValue = serie.data.length > 0 
          ? serie.data[serie.data.length - 1].value 
          : 0;
        
        return {
          name: serie.label,
          value: lastValue,
          color: serie.color,
          unit: serie.unit || ''
        };
      });

      // console.log('📊 Bar Chart: Dados preparados:', barData);

      // Determinar se é horizontal ou vertical
      const isHorizontal = widget.type === 'chart-bar-horizontal';

      const option: echarts.EChartsOption = {
        tooltip: {
          trigger: 'axis',
          axisPointer: {
            type: 'shadow'
          },
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          borderColor: '#ddd',
          borderWidth: 1,
          textStyle: {
            color: '#333',
            fontSize: 12
          },
          formatter: (params: any) => {
            if (!Array.isArray(params) || params.length === 0) return '';
            const param = params[0];
            const dataItem = barData.find(d => d.name === param.name);
            const value = typeof param.value === 'number' ? param.value.toFixed(2) : param.value;
            const unit = dataItem?.unit || '';
            return `<strong>${param.name}</strong><br/>Valor: <strong>${value}${unit ? ' ' + unit : ''}</strong>`;
          }
        },
        grid: {
          left: isHorizontal ? '15%' : '3%',
          right: '3%',
          bottom: isHorizontal ? '3%' : '0%',
          top: isHorizontal ? '5%' : '12%',
          containLabel: true
        },
        xAxis: {
          type: isHorizontal ? 'value' : 'category',
          data: isHorizontal ? undefined : barData.map(d => d.name),
          axisLabel: {
            fontSize: isHorizontal ? 11 : 10,
            color: '#666',
            rotate: isHorizontal ? 0 : 20,
            interval: 0
          },
          splitLine: isHorizontal ? {
            lineStyle: {
              color: '#eee',
              type: 'dashed'
            }
          } : undefined,
          axisLine: {
            lineStyle: {
              color: '#ddd'
            }
          },
          axisTick: {
            show: false
          }
        },
        yAxis: {
          type: isHorizontal ? 'category' : 'value',
          data: isHorizontal ? barData.map(d => d.name) : undefined,
          axisLabel: {
            fontSize: 11,
            color: '#666'
          },
          splitLine: !isHorizontal ? {
            lineStyle: {
              color: '#eee',
              type: 'dashed'
            }
          } : undefined,
          axisLine: {
            lineStyle: {
              color: '#ddd'
            }
          },
          axisTick: {
            show: false
          }
        },
        series: [{
          type: 'bar',
          data: barData.map(d => ({
            value: d.value,
            itemStyle: {
              color: d.color
            }
          })),
          barWidth: '80%',
          label: {
            show: true,
            position: isHorizontal ? 'right' : 'top',
            formatter: (params: any) => {
              const dataItem = barData[params.dataIndex];
              const value = typeof params.value === 'number' ? params.value.toFixed(1) : params.value;
              const unit = dataItem?.unit || '';
              return `{bold|${value}}{unit|${unit ? ' ' + unit : ''}}`;
            },
            fontSize: 10,
            color: '#333',
            fontWeight: 600,
            rich: {
              bold: {
                fontWeight: 600,
                color: '#333',
                fontSize: 11
              },
              unit: {
                fontWeight: 400,
                color: '#666',
                fontSize: 9
              }
            }
          }
        }]
      };

      // console.log('📊 Bar Chart: Setando opções do gráfico');

      barChartInstanceRef.current.setOption(option, {
        notMerge: true,
      });
      
      // console.log('📊 Bar Chart: Gráfico renderizado com sucesso');
    }

    // Cleanup e resize
    const handleResize = () => {
      barChartInstanceRef.current?.resize();
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [widget.type, multiSensorHistory.series, sensorTags, assetTag]);

  // Cleanup da instância de gráfico de barras ao desmontar
  useEffect(() => {
    return () => {
      if (widget.type === 'chart-bar' || widget.type === 'chart-bar-horizontal') {
        barChartInstanceRef.current?.dispose();
        barChartInstanceRef.current = null;
      }
    };
  }, [widget.type]);
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: widget.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const getSizeClasses = (size: string) => {
    switch (size) {
      case 'col-1': return 'col-span-1 lg:col-span-1';
      case 'col-2': return 'col-span-1 lg:col-span-2';
      case 'col-3': return 'col-span-1 lg:col-span-3';
      case 'col-4': return 'col-span-1 lg:col-span-4';
      case 'col-5': return 'col-span-1 lg:col-span-5';
      case 'col-6': return 'col-span-1 lg:col-span-6';
      default: return 'col-span-1 lg:col-span-2';
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmDeleteOpen(true);
  };

  const handleConfirmDelete = () => {
    removeWidget(layoutId, widget.id);
  };

  const handleConfig = (e: React.MouseEvent) => {
    e.stopPropagation();
    setConfigOpen(true);
  };

  // Renderizar conteúdo baseado no tipo de widget
  const renderWidgetContent = () => {
    switch (widget.type) {
      // CARDS KPI
      case 'card-kpi':
        return renderKPICard();
      case 'card-value':
        return renderValueCard();
      case 'card-stat':
        return renderStatCard();

      // GRÁFICOS
      case 'chart-line-echarts':
        return renderLineChartECharts();
      case 'chart-area':
        return renderAreaChartECharts();
      case 'chart-bar':
      case 'chart-bar-horizontal':
        return renderBarChart();
      case 'chart-pie':
        return renderPieChart();
      case 'chart-donut':
        return renderDonutChart();

      // MEDIDORES
      case 'gauge-circular':
        return renderGauge();
      case 'gauge-progress':
        return renderProgressGauge();

      // INDICADORES
      case 'indicator-status':
        return renderStatusIndicator();
      case 'indicator-trend':
        return renderTrendIndicator();

      // CARDS DE AÇÃO
      case 'card-button':
        return renderButtonCard();
      case 'card-toggle':
        return renderToggleCard();
      case 'card-status':
        return renderStatusCard();

      // TABELAS
      case 'table-simple':
        return renderSimpleTable();
      case 'table-work-orders':
        return renderWorkOrdersTable();
      case 'table-equipment':
        return renderEquipmentTable();

      // MAPAS DE CALOR
      case 'heatmap-time':
        return renderTemporalHeatmap();

      // OUTROS
      case 'text-display':
        return renderTextDisplay();
      case 'photo-display':
        return renderPhotoDisplay();

      default:
        return renderPlaceholder();
    }
  };

  // === RENDERIZADORES DE WIDGETS ===

  // KPI Card com dados reais do sensor
  function renderKPICard() {
    // Verificar se o widget é pequeno (1 coluna)
    const isCompact = widget.size === 'col-1';

    // Se tiver um sensor configurado, usar dados do sensor
    if (sensorTag && assetId) {
      if (sensorData.isLoading) {
        return (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="text-sm text-muted-foreground">Carregando...</div>
          </div>
        );
      }

      if (sensorData.error) {
        return (
          <div className="flex flex-col items-center justify-center h-full">
            <AlertTriangle className="w-6 h-6 text-destructive mb-2" />
            <div className="text-sm text-destructive">Erro ao carregar</div>
          </div>
        );
      }

      // Aplicar fórmula de transformação se houver
      let displayValue: string | number | null = sensorData.value;
      const formula = widget.config?.transform?.formula;
      if (formula && displayValue !== null && displayValue !== undefined) {
        const numericResult = evaluateFormula(formula, Number(displayValue));
        displayValue = numericResult;
      }

      // Formatar o valor
      const formattedValue = displayValue !== null && displayValue !== undefined
        ? typeof displayValue === 'number' 
          ? displayValue.toFixed(2)
          : String(displayValue)
        : '--';

      // Usar unidade configurada ou do sensor
      const unit = widget.config?.unit || sensorData.unit || '';
      const label = widget.config?.label || formatSensorLabel(sensorTag);

      // Determinar cor e ícone da tendência
      const getTrendDisplay = () => {
        if (!sensorData.trend) {
          // Sem dados de tendência, mostrar status online
          return {
            icon: sensorData.isOnline ? CheckCircle : XCircle,
            text: sensorData.isOnline ? 'Online' : 'Offline',
            colorClass: sensorData.isOnline ? 'text-green-600' : 'text-red-600',
          };
        }

        const { direction, percentage } = sensorData.trend;
        const formattedPercent = percentage.toFixed(1);

        switch (direction) {
          case 'up':
            return {
              icon: TrendingUp,
              text: `+${formattedPercent}% vs última hora`,
              colorClass: 'text-green-600',
            };
          case 'down':
            return {
              icon: TrendingDown,
              text: `-${formattedPercent}% vs última hora`,
              colorClass: 'text-red-600',
            };
          default:
            return {
              icon: Minus,
              text: 'Estável',
              colorClass: 'text-muted-foreground',
            };
        }
      };

      const trendDisplay = getTrendDisplay();
      const TrendIcon = trendDisplay.icon;

      // Obter o ícone configurado ou usar Activity como padrão
      const iconKey = widget.config?.iconName || 'activity';
      const SelectedIcon = kpiIconMap[iconKey] || Activity;

      return (
        <div className="flex flex-col items-center justify-center h-full p-2">
          {/* Layout horizontal: Ícone + Valor */}
          <div className="flex items-center gap-4">
            {/* Ícone */}
            <div className={cn(
              "rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0",
              isCompact ? "w-12 h-12" : "w-16 h-16"
            )}>
              <SelectedIcon className={cn(
                "text-primary",
                isCompact ? "w-6 h-6" : "w-9 h-9"
              )} />
            </div>

            {/* Valor e Unidade na mesma linha */}
            <div className="flex items-baseline gap-1">
              <span className={cn(
                "font-bold text-foreground leading-none",
                isCompact ? "text-3xl" : "text-4xl"
              )}>
                {formattedValue}
              </span>
              {unit && (
                <span className={cn(
                  "font-medium text-muted-foreground",
                  isCompact ? "text-base" : "text-lg"
                )}>
                  {unit}
                </span>
              )}
            </div>
          </div>
          
          {/* Label */}
          <div className={cn(
            "text-muted-foreground text-center leading-tight",
            isCompact ? "text-xs mt-2" : "text-sm mt-3"
          )}>
            {label}
          </div>
          
          {/* Indicador de tendência */}
          <div className={cn(
            "flex items-center gap-1",
            isCompact ? "mt-1 text-xs" : "mt-2 text-sm",
            trendDisplay.colorClass
          )}>
            <TrendIcon className={cn(isCompact ? "w-3 h-3" : "w-4 h-4")} />
            <span className="font-medium">
              {isCompact && sensorData.trend 
                ? `${sensorData.trend.direction === 'up' ? '+' : sensorData.trend.direction === 'down' ? '-' : ''}${sensorData.trend.percentage.toFixed(1)}%` 
                : trendDisplay.text}
            </span>
          </div>
        </div>
      );
    }

    // Widget não configurado - mostrar mensagem para configurar
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 text-center">
        <div className={cn(
          "rounded-xl bg-muted/50 flex items-center justify-center mb-3",
          isCompact ? "w-10 h-10" : "w-14 h-14"
        )}>
          <Settings className={cn(
            "text-muted-foreground",
            isCompact ? "w-5 h-5" : "w-7 h-7"
          )} />
        </div>
        <div className={cn(
          "text-muted-foreground font-medium",
          isCompact ? "text-xs" : "text-sm"
        )}>
          {isCompact ? "Configure" : "Configure a variável"}
        </div>
        <div className={cn(
          "text-muted-foreground/70 mt-1",
          isCompact ? "text-[10px]" : "text-xs"
        )}>
          {isCompact ? "para exibir" : "para exibir os valores"}
        </div>
      </div>
    );
  }

  function renderValueCard() {
    // Se tiver sensor configurado, usar dados do sensor
    if (sensorTag && assetId && sensorData.value !== null) {
      let displayValue: string | number | null = sensorData.value;
      const formula = widget.config?.transform?.formula;
      if (formula && displayValue !== null) {
        displayValue = evaluateFormula(formula, Number(displayValue));
      }

      const formattedValue = typeof displayValue === 'number' 
        ? displayValue.toFixed(2) 
        : String(displayValue ?? '0');

      const unit = widget.config?.unit || sensorData.unit || '';
      const label = widget.config?.label || formatSensorLabel(sensorTag);

      return (
        <div className="flex flex-col items-center justify-center h-full">
          <div className="text-3xl font-bold text-foreground">
            {formattedValue}
            {unit && <span className="text-lg ml-1 font-normal text-muted-foreground">{unit}</span>}
          </div>
          <div className="text-sm text-muted-foreground mt-2">
            {label}
          </div>
        </div>
      );
    }

    // Widget não configurado - mostrar mensagem para configurar
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <div className="rounded-lg bg-muted/50 flex items-center justify-center w-10 h-10 mb-2">
          <Settings className="w-5 h-5 text-muted-foreground" />
        </div>
        <div className="text-sm text-muted-foreground font-medium">
          Configure a variável
        </div>
        <div className="text-xs text-muted-foreground/70 mt-1">
          para exibir os valores
        </div>
      </div>
    );
  }

  function renderStatCard() {
    // Verificar se o widget é pequeno (1 coluna)
    const isCompact = widget.size === 'col-1';

    // Se tiver um sensor configurado, usar dados do sensor
    if (sensorTag && assetId) {
      if (sensorData.isLoading) {
        return (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="text-sm text-muted-foreground">Carregando...</div>
          </div>
        );
      }

      if (sensorData.error) {
        return (
          <div className="flex flex-col items-center justify-center h-full">
            <AlertTriangle className="w-6 h-6 text-destructive mb-2" />
            <div className="text-sm text-destructive">Erro ao carregar</div>
          </div>
        );
      }

      // Aplicar fórmula de transformação se houver
      let displayValue: string | number | null = sensorData.value;
      const formula = widget.config?.transform?.formula;
      if (formula && displayValue !== null && displayValue !== undefined) {
        const numericResult = evaluateFormula(formula, Number(displayValue));
        displayValue = numericResult;
      }

      // Formatar o valor
      const formattedValue = displayValue !== null && displayValue !== undefined
        ? typeof displayValue === 'number' 
          ? displayValue.toFixed(2)
          : String(displayValue)
        : '--';

      // Usar unidade configurada ou do sensor
      const unit = widget.config?.unit || sensorData.unit || '';
      const label = widget.config?.label || formatSensorLabel(sensorTag);

      // Determinar cor e ícone da tendência
      const getTrendDisplay = () => {
        if (!sensorData.trend) {
          return {
            icon: sensorData.isOnline ? CheckCircle : XCircle,
            text: sensorData.isOnline ? 'Online' : 'Offline',
            colorClass: sensorData.isOnline ? 'text-green-600' : 'text-red-600',
          };
        }

        const { direction, percentage } = sensorData.trend;
        const formattedPercent = percentage.toFixed(1);

        switch (direction) {
          case 'up':
            return {
              icon: TrendingUp,
              text: `+${formattedPercent}% vs última hora`,
              colorClass: 'text-green-600',
            };
          case 'down':
            return {
              icon: TrendingDown,
              text: `-${formattedPercent}% vs última hora`,
              colorClass: 'text-red-600',
            };
          default:
            return {
              icon: Minus,
              text: 'Estável',
              colorClass: 'text-muted-foreground',
            };
        }
      };

      const trendDisplay = getTrendDisplay();
      const TrendIcon = trendDisplay.icon;

      return (
        <div className="flex flex-col items-center justify-center h-full py-2">
          {/* Valor principal */}
          <div className={cn(
            "font-bold text-foreground flex items-baseline justify-center flex-wrap gap-1",
            isCompact ? "text-2xl" : "text-3xl"
          )}>
            <span>{formattedValue}</span>
            {unit && (
              <span className={cn(
                "font-normal text-muted-foreground",
                isCompact ? "text-sm" : "text-base"
              )}>
                {unit}
              </span>
            )}
          </div>
          
          {/* Label */}
          <div className={cn(
            "text-muted-foreground text-center leading-tight",
            isCompact ? "text-xs mt-1" : "text-sm mt-1"
          )}>
            {label}
          </div>
          
          {/* Indicador de tendência */}
          <div className={cn(
            "flex items-center gap-1 text-xs",
            isCompact ? "mt-1" : "mt-2",
            trendDisplay.colorClass
          )}>
            <TrendIcon className="w-3 h-3 flex-shrink-0" />
            <span>{isCompact && sensorData.trend ? `${sensorData.trend.direction === 'up' ? '+' : sensorData.trend.direction === 'down' ? '-' : ''}${sensorData.trend.percentage.toFixed(1)}%` : trendDisplay.text}</span>
          </div>
        </div>
      );
    }

    // Widget não configurado - mostrar mensagem para configurar
    return (
      <div className="flex flex-col items-center justify-center h-full py-2 text-center">
        <div className={cn(
          "rounded-lg bg-muted/50 flex items-center justify-center mb-2",
          isCompact ? "w-8 h-8" : "w-10 h-10"
        )}>
          <Settings className={cn(
            "text-muted-foreground",
            isCompact ? "w-4 h-4" : "w-5 h-5"
          )} />
        </div>
        <div className={cn(
          "text-muted-foreground font-medium",
          isCompact ? "text-xs" : "text-sm"
        )}>
          {isCompact ? "Configure" : "Configure a variável"}
        </div>
        <div className={cn(
          "text-muted-foreground/70 mt-1",
          isCompact ? "text-[10px]" : "text-xs"
        )}>
          {isCompact ? "para exibir" : "para exibir os valores"}
        </div>
      </div>
    );
  }

  // Estado para o toggle
  const [toggleState, setToggleState] = useState(false);

  function renderButtonCard() {
    const label = widget.config?.label || formatSensorLabel(sensorTag) || widget.title;
    const buttonColor = widget.config?.color || '#3b82f6';
    
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3 p-3">
        <h3 className="text-xs font-medium text-muted-foreground text-center">{label}</h3>
        <button 
          className="px-6 py-3 rounded-lg font-semibold text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all text-sm"
          style={{ backgroundColor: buttonColor }}
          onClick={() => {
            // Aqui pode ser implementada a ação do botão
            console.log('Botão clicado:', widget.id);
          }}
        >
          Executar
        </button>
      </div>
    );
  }

  function renderToggleCard() {
    const label = widget.config?.label || formatSensorLabel(sensorTag) || widget.title;
    
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3 p-3">
        <h3 className="text-xs font-medium text-muted-foreground text-center">{label}</h3>
        <button
          onClick={() => setToggleState(!toggleState)}
          className={cn(
            "relative w-14 h-7 rounded-full transition-colors",
            toggleState ? "bg-green-500" : "bg-gray-300"
          )}
        >
          <div 
            className={cn(
              "absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full transition-transform shadow-sm",
              toggleState && "translate-x-7"
            )}
          />
        </button>
        <span className={cn(
          "text-sm font-medium",
          toggleState ? "text-green-600" : "text-muted-foreground"
        )}>
          {toggleState ? 'Ligado' : 'Desligado'}
        </span>
      </div>
    );
  }

  function renderStatusCard() {
    const label = widget.config?.label || formatSensorLabel(sensorTag) || widget.title;
    
    // Usar valor do sensor se disponível
    let statusValue = 50;
    if (sensorTag && assetId && sensorData.value !== null) {
      statusValue = Number(sensorData.value);
    }
    
    // Determinar status baseado nos thresholds ou valor padrão
    let status: string;
    let statusColor: string;
    let statusBgClass: string;
    
    const warningThreshold = widget.config?.warningThreshold;
    const criticalThreshold = widget.config?.criticalThreshold;
    
    if (criticalThreshold !== undefined || warningThreshold !== undefined) {
      // Usar thresholds configurados
      if (criticalThreshold !== undefined && statusValue >= criticalThreshold) {
        status = 'Crítico';
        statusColor = '#ef4444';
        statusBgClass = 'bg-red-50';
      } else if (warningThreshold !== undefined && statusValue >= warningThreshold) {
        status = 'Aviso';
        statusColor = '#f59e0b';
        statusBgClass = 'bg-yellow-50';
      } else {
        status = 'OK';
        statusColor = '#10b981';
        statusBgClass = 'bg-green-50';
      }
    } else {
      // Lógica padrão: porcentagem 0-100
      const normalizedValue = statusValue / 100;
      if (normalizedValue > 0.7) {
        status = 'OK';
        statusColor = '#10b981';
        statusBgClass = 'bg-green-50';
      } else if (normalizedValue > 0.4) {
        status = 'Aviso';
        statusColor = '#f59e0b';
        statusBgClass = 'bg-yellow-50';
      } else {
        status = 'Crítico';
        statusColor = '#ef4444';
        statusBgClass = 'bg-red-50';
      }
    }
    
    return (
      <div className={cn("h-full flex flex-col items-center justify-center gap-3 p-3 rounded-lg", statusBgClass)}>
        <h3 className="text-xs font-medium text-muted-foreground text-center">{label}</h3>
        <div 
          className="w-16 h-16 rounded-full flex items-center justify-center"
          style={{ backgroundColor: `${statusColor}20` }}
        >
          <span className="text-lg font-bold" style={{ color: statusColor }}>
            {sensorData.isLoading ? '...' : status}
          </span>
        </div>
      </div>
    );
  }

  function renderLineChartECharts() {
    console.log('📊 renderLineChartECharts executando:', {
      hasSensorTags: !!sensorTags,
      sensorTagsLength: sensorTags?.length || 0,
      hasAssetTag: !!assetTag,
      assetTag,
      loading: multiSensorHistory.loading,
      error: multiSensorHistory.error,
      seriesLength: multiSensorHistory.series.length
    });

    // Se tem sensores configurados, usar dados reais
    if (sensorTags && sensorTags.length > 0 && assetTag) {
      console.log('📊 ECharts: Condição principal atendida (tem sensorTags e assetTag)');
      
      if (multiSensorHistory.loading) {
        console.log('📊 ECharts: Estado = loading');
        return (
          <div className="h-full flex flex-col items-center justify-center">
            <div className="animate-pulse text-muted-foreground">Carregando dados...</div>
          </div>
        );
      }

      if (multiSensorHistory.error) {
        console.log('📊 ECharts: Estado = erro:', multiSensorHistory.error);
        return (
          <div className="h-full flex flex-col items-center justify-center">
            <div className="text-destructive text-sm">{multiSensorHistory.error}</div>
          </div>
        );
      }

      if (multiSensorHistory.series.length === 0 || multiSensorHistory.series.every(s => s.data.length === 0)) {
        console.log('📊 ECharts: Estado = sem dados no período');
        return (
          <div className="h-full flex flex-col items-center justify-center">
            <LineChartIcon className="w-8 h-8 text-muted-foreground mb-2" />
            <div className="text-muted-foreground text-sm">Sem dados no período</div>
          </div>
        );
      }

      console.log('📊 ECharts: Renderizando container do gráfico');

      return (
        <div 
          ref={echartsContainerRef} 
          className="h-full w-full" 
          style={{ minHeight: '200px' }}
        />
      );
    }

    // Fallback: dados mockados
    console.log('📊 ECharts: Caindo no fallback - Configure as variáveis');
    return (
      <div className="h-full flex flex-col items-center justify-center">
        <LineChartIcon className="w-8 h-8 text-muted-foreground mb-2" />
        <div className="text-muted-foreground text-sm">Configure as variáveis</div>
      </div>
    );
  }

  function renderAreaChartECharts() {
    console.log('📊 renderAreaChartECharts executando:', {
      hasSensorTags: !!sensorTags,
      sensorTagsLength: sensorTags?.length || 0,
      hasAssetTag: !!assetTag,
      assetTag,
      loading: multiSensorHistory.loading,
      error: multiSensorHistory.error,
      seriesLength: multiSensorHistory.series.length
    });

    // Se tem sensores configurados, usar dados reais
    if (sensorTags && sensorTags.length > 0 && assetTag) {
      console.log('📊 Area ECharts: Condição principal atendida (tem sensorTags e assetTag)');
      
      if (multiSensorHistory.loading) {
        console.log('📊 Area ECharts: Estado = loading');
        return (
          <div className="h-full flex flex-col items-center justify-center">
            <div className="animate-pulse text-muted-foreground">Carregando dados...</div>
          </div>
        );
      }

      if (multiSensorHistory.error) {
        console.log('📊 Area ECharts: Estado = erro:', multiSensorHistory.error);
        return (
          <div className="h-full flex flex-col items-center justify-center">
            <div className="text-destructive text-sm">{multiSensorHistory.error}</div>
          </div>
        );
      }

      if (multiSensorHistory.series.length === 0 || multiSensorHistory.series.every(s => s.data.length === 0)) {
        console.log('📊 Area ECharts: Estado = sem dados no período');
        return (
          <div className="h-full flex flex-col items-center justify-center">
            <LineChartIcon className="w-8 h-8 text-muted-foreground mb-2" />
            <div className="text-muted-foreground text-sm">Sem dados no período</div>
          </div>
        );
      }

      console.log('📊 Area ECharts: Renderizando container do gráfico');

      return (
        <div 
          ref={echartsContainerRef} 
          className="h-full w-full" 
          style={{ minHeight: '200px' }}
        />
      );
    }

    // Fallback: dados mockados
    console.log('📊 Area ECharts: Caindo no fallback - Configure as variáveis');
    return (
      <div className="h-full flex flex-col items-center justify-center">
        <LineChartIcon className="w-8 h-8 text-muted-foreground mb-2" />
        <div className="text-muted-foreground text-sm">Configure as variáveis</div>
      </div>
    );
  }

  function renderBarChart() {
    console.log('📊 renderBarChart executando:', {
      hasSensorTags: !!sensorTags,
      sensorTagsLength: sensorTags?.length || 0,
      hasAssetTag: !!assetTag,
      loading: multiSensorHistory.loading,
      error: multiSensorHistory.error,
      seriesLength: multiSensorHistory.series.length
    });

    // Se tem sensores configurados, usar dados reais
    if (sensorTags && sensorTags.length > 0 && assetTag) {
      console.log('📊 Bar Chart: Condição principal atendida (tem sensorTags e assetTag)');
      
      if (multiSensorHistory.loading) {
        return (
          <div className="h-full flex flex-col items-center justify-center">
            <div className="animate-pulse text-muted-foreground">Carregando dados...</div>
          </div>
        );
      }

      if (multiSensorHistory.error) {
        return (
          <div className="h-full flex flex-col items-center justify-center">
            <div className="text-destructive text-sm">{multiSensorHistory.error}</div>
          </div>
        );
      }

      if (multiSensorHistory.series.length === 0 || multiSensorHistory.series.every(s => s.data.length === 0)) {
        return (
          <div className="h-full flex flex-col items-center justify-center">
            <BarChart3 className="w-8 h-8 text-muted-foreground mb-2" />
            <div className="text-muted-foreground text-sm">Sem dados no período</div>
          </div>
        );
      }

      console.log('📊 Bar Chart: Renderizando container do gráfico');

      return (
        <div 
          ref={barChartContainerRef} 
          className="h-full w-full" 
          style={{ minHeight: '200px' }}
        />
      );
    }

    // Fallback: dados mockados
    console.log('📊 Bar Chart: Caindo no fallback - Configure as variáveis');
    return (
      <div className="h-full flex flex-col items-center justify-center">
        <BarChart3 className="w-8 h-8 text-muted-foreground mb-2" />
        <div className="text-muted-foreground text-sm">Configure as variáveis</div>
      </div>
    );
  }

  // Componente interno para gráfico de pizza com tooltip
  function PieChartWithTooltip({ 
    slices, 
    pieData, 
    describeArc 
  }: { 
    slices: Array<{ name: string; value: number; color: string; unit: string; startAngle: number; endAngle: number; percentage: string }>;
    pieData: Array<{ name: string; value: number; color: string; unit: string }>;
    describeArc: (x: number, y: number, radius: number, startAngle: number, endAngle: number) => string;
  }) {
    const [tooltip, setTooltip] = useState<{ visible: boolean; x: number; y: number; content: string; color: string }>({
      visible: false,
      x: 0,
      y: 0,
      content: '',
      color: ''
    });

    const handleMouseEnter = (e: React.MouseEvent<SVGPathElement>, slice: typeof slices[0]) => {
      const rect = e.currentTarget.closest('svg')?.getBoundingClientRect();
      if (rect) {
        setTooltip({
          visible: true,
          x: e.clientX - rect.left,
          y: e.clientY - rect.top - 40,
          content: `${slice.name}: ${slice.value.toFixed(2)}${slice.unit} (${slice.percentage}%)`,
          color: slice.color
        });
      }
    };

    const handleMouseMove = (e: React.MouseEvent<SVGPathElement>, slice: typeof slices[0]) => {
      const rect = e.currentTarget.closest('svg')?.getBoundingClientRect();
      if (rect) {
        setTooltip(prev => ({
          ...prev,
          x: e.clientX - rect.left,
          y: e.clientY - rect.top - 40,
          content: `${slice.name}: ${slice.value.toFixed(2)}${slice.unit} (${slice.percentage}%)`,
          color: slice.color
        }));
      }
    };

    const handleMouseLeave = () => {
      setTooltip(prev => ({ ...prev, visible: false }));
    };

    return (
      <div className="h-full flex flex-col items-center justify-center">
        <div className="relative w-40 h-40">
          <svg className="w-40 h-40" viewBox="0 0 100 100">
            {slices.map((slice, index) => (
              <path
                key={index}
                d={describeArc(50, 50, 48, slice.startAngle, slice.endAngle)}
                fill={slice.color}
                stroke="white"
                strokeWidth="1.5"
                className="cursor-pointer transition-opacity duration-200 hover:opacity-75"
                onMouseEnter={(e) => handleMouseEnter(e, slice)}
                onMouseMove={(e) => handleMouseMove(e, slice)}
                onMouseLeave={handleMouseLeave}
              />
            ))}
          </svg>
          {/* Tooltip customizado */}
          {tooltip.visible && (
            <div
              className="absolute pointer-events-none z-50 px-2 py-1 text-xs font-medium text-white bg-gray-900 rounded shadow-lg whitespace-nowrap"
              style={{
                left: `${tooltip.x}px`,
                top: `${tooltip.y}px`,
                transform: 'translateX(-50%)'
              }}
            >
              <div className="flex items-center gap-1.5">
                <div 
                  className="w-2 h-2 rounded-full flex-shrink-0" 
                  style={{ backgroundColor: tooltip.color }}
                />
                <span>{tooltip.content}</span>
              </div>
              {/* Seta do tooltip */}
              <div 
                className="absolute left-1/2 -translate-x-1/2 -bottom-1 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-900"
              />
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2 mt-4 text-xs max-w-[90%] justify-center">
          {pieData.map((item, index) => (
            <div key={index} className="flex items-center gap-1">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span>
                {item.name}: {item.value.toFixed(1)}{item.unit}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Componente interno para gráfico de donut com tooltip
  function DonutChartWithTooltip({ 
    segments, 
    donutData,
    total,
    circumference
  }: { 
    segments: Array<{ name: string; value: number; color: string; unit: string; segmentLength: number; offset: number; percentage: string }>;
    donutData: Array<{ name: string; value: number; color: string; unit: string }>;
    total: number;
    circumference: number;
  }) {
    const [tooltip, setTooltip] = useState<{ 
      visible: boolean; 
      x: number; 
      y: number; 
      content: string; 
      color: string 
    }>({
      visible: false,
      x: 0,
      y: 0,
      content: '',
      color: ''
    });

    const handleMouseEnter = (e: React.MouseEvent<SVGCircleElement>, segment: typeof segments[0]) => {
      setTooltip({
        visible: true,
        x: e.clientX,
        y: e.clientY - 50,
        content: `${segment.name}: ${segment.value.toFixed(2)}${segment.unit} (${segment.percentage}%)`,
        color: segment.color
      });
    };

    const handleMouseMove = (e: React.MouseEvent<SVGCircleElement>, segment: typeof segments[0]) => {
      setTooltip(prev => ({
        ...prev,
        x: e.clientX,
        y: e.clientY - 50,
        content: `${segment.name}: ${segment.value.toFixed(2)}${segment.unit} (${segment.percentage}%)`,
        color: segment.color
      }));
    };

    const handleMouseLeave = () => {
      setTooltip(prev => ({ ...prev, visible: false }));
    };

    return (
      <div className="h-full flex flex-col items-center justify-center">
        <div className="relative w-40 h-40">
          <svg className="w-40 h-40 transform -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="40" fill="transparent" stroke="#e5e7eb" strokeWidth="12" />
            {segments.map((segment, index) => (
              <circle
                key={index}
                cx="50"
                cy="50"
                r="40"
                fill="transparent"
                stroke={segment.color}
                strokeWidth="12"
                strokeDasharray={`${segment.segmentLength} ${circumference}`}
                strokeDashoffset={segment.offset}
                className="cursor-pointer hover:opacity-75 transition-opacity duration-200"
                onMouseEnter={(e) => handleMouseEnter(e, segment)}
                onMouseMove={(e) => handleMouseMove(e, segment)}
                onMouseLeave={handleMouseLeave}
              />
            ))}
          </svg>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-xl font-bold">{total.toFixed(1)}</span>
          </div>
        </div>
        
        {/* Legenda */}
        <div className="flex flex-wrap gap-2 mt-4 text-xs max-w-[90%] justify-center">
          {donutData.map((item, index) => (
            <div key={index} className="flex items-center gap-1">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span>
                {item.name}: {item.value.toFixed(1)}{item.unit}
              </span>
            </div>
          ))}
        </div>

        {/* Tooltip que segue o mouse */}
        {tooltip.visible && (
          <div
            className="fixed pointer-events-none z-[9999] px-3 py-2 text-xs font-medium text-white bg-gray-900 rounded-lg shadow-lg whitespace-nowrap"
            style={{
              left: `${tooltip.x}px`,
              top: `${tooltip.y}px`,
              transform: 'translateX(-50%)'
            }}
          >
            <div className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full flex-shrink-0" 
                style={{ backgroundColor: tooltip.color }}
              />
              <span>{tooltip.content}</span>
            </div>
            {/* Seta do tooltip */}
            <div 
              className="absolute left-1/2 -translate-x-1/2 -bottom-1.5 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-gray-900"
            />
          </div>
        )}
      </div>
    );
  }
  function renderPieChart() {
    console.log('🥧 renderPieChart - Debug:', {
      widgetId: widget.id,
      sensorTags: widget.config?.sensorTags,
      hasSensorTags: Array.isArray(widget.config?.sensorTags),
      sensorTagsLength: widget.config?.sensorTags?.length,
      seriesLength: multiSensorHistory.series.length,
      series: multiSensorHistory.series
    });

    // Se houver sensor tags configurados, exibe dados dos sensores
    if (Array.isArray(widget.config?.sensorTags) && widget.config.sensorTags.length > 0 && multiSensorHistory.series.length > 0) {
      // Pegar o último valor de cada série configurada
      const pieData = multiSensorHistory.series
        .map((series) => {
          const lastDataPoint = series.data.length > 0 ? series.data[series.data.length - 1] : null;
          const lastValue = lastDataPoint ? lastDataPoint.value : 0;
          
          return {
            name: series.label || series.name,
            value: Math.abs(lastValue), // Usar valor absoluto para o gráfico de pizza
            color: series.color,
            unit: series.unit || ''
          };
        })
        .filter(item => item.value > 0); // Apenas valores positivos

      console.log('🥧 renderPieChart - pieData:', pieData);

      if (pieData.length === 0) {
        return (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            Sem dados disponíveis
          </div>
        );
      }

      const total = pieData.reduce((sum, item) => sum + item.value, 0);
      
      // Função para calcular coordenadas de um ponto no círculo
      const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
        const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
        return {
          x: centerX + (radius * Math.cos(angleInRadians)),
          y: centerY + (radius * Math.sin(angleInRadians))
        };
      };

      // Função para criar o caminho de uma fatia de pizza
      const describeArc = (x: number, y: number, radius: number, startAngle: number, endAngle: number) => {
        const start = polarToCartesian(x, y, radius, endAngle);
        const end = polarToCartesian(x, y, radius, startAngle);
        const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
        
        return [
          "M", x, y,
          "L", start.x, start.y,
          "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y,
          "Z"
        ].join(" ");
      };

      // Calcular ângulos para cada fatia
      let currentAngle = 0;
      const slices = pieData.map(item => {
        const sliceAngle = (item.value / total) * 360;
        const slice = {
          ...item,
          startAngle: currentAngle,
          endAngle: currentAngle + sliceAngle,
          percentage: ((item.value / total) * 100).toFixed(1)
        };
        currentAngle += sliceAngle;
        return slice;
      });

      return (
        <PieChartWithTooltip slices={slices} pieData={pieData} describeArc={describeArc} />
      );
    }

    // Widget não configurado - mostrar mensagem para configurar
    return (
      <div className="h-full flex flex-col items-center justify-center text-center">
        <div className="rounded-xl bg-muted/50 flex items-center justify-center w-14 h-14 mb-3">
          <Settings className="w-7 h-7 text-muted-foreground" />
        </div>
        <div className="text-sm text-muted-foreground font-medium">
          Configure as variáveis
        </div>
        <div className="text-xs text-muted-foreground/70 mt-1">
          para exibir o gráfico de pizza
        </div>
      </div>
    );
  }

  function renderDonutChart() {
    console.log('🍩 renderDonutChart - Debug:', {
      widgetId: widget.id,
      sensorTags: widget.config?.sensorTags,
      hasSensorTags: Array.isArray(widget.config?.sensorTags),
      sensorTagsLength: widget.config?.sensorTags?.length,
      seriesLength: multiSensorHistory.series.length,
      series: multiSensorHistory.series
    });

    // Se houver sensor tags configurados, exibe dados dos sensores
    if (Array.isArray(widget.config?.sensorTags) && widget.config.sensorTags.length > 0 && multiSensorHistory.series.length > 0) {
      // Pegar o último valor de cada série configurada
      const donutData = multiSensorHistory.series
        .map((series) => {
          const lastDataPoint = series.data.length > 0 ? series.data[series.data.length - 1] : null;
          const lastValue = lastDataPoint ? lastDataPoint.value : 0;
          
          return {
            name: series.label || series.name,
            value: Math.abs(lastValue),
            color: series.color,
            unit: series.unit || ''
          };
        })
        .filter(item => item.value > 0);

      console.log('🍩 renderDonutChart - donutData:', donutData);

      if (donutData.length === 0) {
        return (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            Sem dados disponíveis
          </div>
        );
      }

      const total = donutData.reduce((sum, item) => sum + item.value, 0);
      const circumference = 251.2; // 2 * PI * 40 (raio)

      // Calcular os segmentos com offset
      let currentOffset = 0;
      const segments = donutData.map(item => {
        const segmentLength = (item.value / total) * circumference;
        const segment = {
          ...item,
          segmentLength,
          offset: currentOffset,
          percentage: ((item.value / total) * 100).toFixed(1)
        };
        currentOffset -= segmentLength;
        return segment;
      });

      return (
        <DonutChartWithTooltip segments={segments} donutData={donutData} total={total} circumference={circumference} />
      );
    }

    // Widget não configurado - mostrar mensagem para configurar
    return (
      <div className="h-full flex flex-col items-center justify-center text-center">
        <div className="rounded-xl bg-muted/50 flex items-center justify-center w-14 h-14 mb-3">
          <Settings className="w-7 h-7 text-muted-foreground" />
        </div>
        <div className="text-sm text-muted-foreground font-medium">
          Configure as variáveis
        </div>
        <div className="text-xs text-muted-foreground/70 mt-1">
          para exibir o gráfico donut
        </div>
      </div>
    );
  }

  function renderGauge() {
    // Se tiver sensor configurado, usar dados do sensor
    if (sensorTag && assetId && sensorData.value !== null) {
      let displayValue: number = Number(sensorData.value);
      const formula = widget.config?.transform?.formula;
      if (formula) {
        const result = evaluateFormula(formula, displayValue);
        if (result !== null && typeof result === 'number') displayValue = result;
      }
      
      // Calcular porcentagem usando os valores mínimo e máximo configurados
      const min = widget.config?.minValue ?? 0;
      const max = widget.config?.maxValue ?? 100;
      
      // Calcular porcentagem - se o valor está fora do range, limitar entre 0 e 100%
      const range = max - min;
      const normalizedValue = displayValue - min;
      const rawPercent = range > 0 ? (normalizedValue / range) * 100 : 0;
      const percent = Math.min(100, Math.max(0, rawPercent));
      
      const label = widget.config?.label || formatSensorLabel(sensorTag);
      const unit = widget.config?.unit || sensorData.unit || '';

      // Determinar cor baseada no valor em relação ao range
      let gaugeColor = 'border-primary';
      if (displayValue > max) {
        gaugeColor = 'border-red-500'; // Vermelho se acima do máximo
      } else if (displayValue < min) {
        gaugeColor = 'border-blue-500'; // Azul se abaixo do mínimo
      }

      return (
        <div className="h-full flex flex-col items-center justify-center px-4 py-2">
          <div className="relative w-full max-w-40">
            {/* SVG Gauge */}
            <div className="relative">
              <svg className="w-full h-20" viewBox="0 0 120 60" style={{ overflow: 'visible' }}>
                {/* Background arc */}
                <path
                  d="M 20 45 A 25 25 0 0 1 100 45"
                  stroke="rgb(229, 231, 235)"
                  strokeWidth="6"
                  fill="none"
                  strokeLinecap="round"
                />
                {/* Progress arc */}
                <path
                  d="M 20 45 A 25 25 0 0 1 100 45"
                  stroke={displayValue > max ? 'rgb(239, 68, 68)' : displayValue < min ? 'rgb(59, 130, 246)' : 'rgb(59, 130, 246)'}
                  strokeWidth="6"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray="125.66" // Comprimento do arco semicircular (π * 25 * 2)
                  strokeDashoffset={125.66 - (125.66 * percent / 100)}
                  className="transition-all duration-500"
                />
              </svg>
              
              {/* Valores mínimo e máximo próximos à base do gauge */}
              <div className="absolute bottom-0 left-0 text-xs text-muted-foreground" 
                   style={{ left: '16.67%', transform: 'translateX(-50%)' }}>
                {min}
              </div>
              <div className="absolute bottom-0 right-0 text-xs text-muted-foreground" 
                   style={{ left: '83.33%', transform: 'translateX(-50%)' }}>
                {max}
              </div>
            </div>
          </div>
          
          <div className="text-2xl font-bold mt-3">
            {Number(sensorData.value).toFixed(1)}
          </div>
          <div className="text-xs text-muted-foreground">
            {label}
          </div>
          
          {/* Mostrar indicadores quando valor está fora do range */}
          {(displayValue > max || displayValue < min) && (
            <div className="text-xs mt-2 px-2 py-1 rounded text-white" 
                 style={{ backgroundColor: displayValue > max ? '#ef4444' : '#3b82f6' }}>
              {displayValue > max ? 'Acima do máximo' : 'Abaixo do mínimo'}
            </div>
          )}
        </div>
      );
    }

    // Widget não configurado - mostrar mensagem para configurar
    return (
      <div className="h-full flex flex-col items-center justify-center text-center">
        <div className="rounded-xl bg-muted/50 flex items-center justify-center w-12 h-12 mb-3">
          <Settings className="w-6 h-6 text-muted-foreground" />
        </div>
        <div className="text-sm text-muted-foreground font-medium">
          Configure a variável
        </div>
        <div className="text-xs text-muted-foreground/70 mt-1">
          para exibir os valores
        </div>
      </div>
    );
  }

  function renderProgressGauge() {
    // Se tiver sensor configurado, usar dados do sensor
    if (sensorTag && assetId && sensorData.value !== null) {
      let displayValue: number = Number(sensorData.value);
      const formula = widget.config?.transform?.formula;
      if (formula) {
        const result = evaluateFormula(formula, displayValue);
        if (result !== null && typeof result === 'number') displayValue = result;
      }
      
      // Calcular porcentagem se tiver min/max configurados
      const min = widget.config?.minValue ?? 0;
      const max = widget.config?.maxValue ?? 100;
      const percent = Math.min(100, Math.max(0, ((displayValue - min) / (max - min)) * 100));
      const label = widget.config?.label || formatSensorLabel(sensorTag);

      return (
        <div className="h-full flex flex-col justify-center">
          <div className="text-sm font-medium mb-2">
            {label}
          </div>
          <Progress value={percent} className="h-4" />
          <div className="flex justify-between mt-2 text-xs text-muted-foreground">
            <span>{min}</span>
            <span className="font-medium text-foreground">{displayValue.toFixed(1)}</span>
            <span>{max}</span>
          </div>
        </div>
      );
    }

    // Widget não configurado - mostrar mensagem para configurar
    return (
      <div className="h-full flex flex-col items-center justify-center text-center">
        <div className="rounded-lg bg-muted/50 flex items-center justify-center w-10 h-10 mb-2">
          <Settings className="w-5 h-5 text-muted-foreground" />
        </div>
        <div className="text-sm text-muted-foreground font-medium">
          Configure a variável
        </div>
        <div className="text-xs text-muted-foreground/70 mt-1">
          para exibir os valores
        </div>
      </div>
    );
  }

  function renderStatusIndicator() {
    const status = widget.config?.status || 'ok';
    const statusConfig = {
      ok: { color: 'bg-green-500', label: 'Operacional', icon: CheckCircle },
      warning: { color: 'bg-yellow-500', label: 'Atenção', icon: AlertCircle },
      error: { color: 'bg-red-500', label: 'Erro', icon: XCircle },
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.ok;
    const Icon = config.icon;

    return (
      <div className="h-full flex flex-col items-center justify-center">
        <div className={cn("w-16 h-16 rounded-full flex items-center justify-center", config.color)}>
          <Icon className="w-8 h-8 text-white" />
        </div>
        <div className="text-lg font-medium mt-3">{config.label}</div>
        <div className="text-xs text-muted-foreground">
          {widget.config?.label || 'Sistema'}
        </div>
      </div>
    );
  }

  function renderTrendIndicator() {
    const trend = widget.config?.trend || 'up';
    const value = widget.config?.value || '+12%';
    const isUp = trend === 'up';

    return (
      <div className="h-full flex flex-col items-center justify-center">
        <div className={cn(
          "w-12 h-12 rounded-full flex items-center justify-center",
          isUp ? "bg-green-100" : "bg-red-100"
        )}>
          {isUp ? (
            <TrendingUp className="w-6 h-6 text-green-600" />
          ) : (
            <TrendingDown className="w-6 h-6 text-red-600" />
          )}
        </div>
        <div className={cn(
          "text-2xl font-bold mt-2",
          isUp ? "text-green-600" : "text-red-600"
        )}>
          {value}
        </div>
        <div className="text-xs text-muted-foreground">
          {widget.config?.label || 'vs período anterior'}
        </div>
      </div>
    );
  }

  function renderSimpleTable() {
    // Se houver variáveis configuradas, usar dados dos sensores
    if (Array.isArray(widget.config?.sensorTags) && widget.config.sensorTags.length > 0 && multiSensorHistory.series.length > 0) {
      // Pegar os últimos valores de cada série
      const tableData = multiSensorHistory.series.map(serie => {
        const lastDataPoint = serie.data[serie.data.length - 1];
        const formattedValue = lastDataPoint ? lastDataPoint.value.toFixed(2) : 'N/A';
        
        return {
          variable: formatSensorLabel(serie.sensorTag),
          value: formattedValue,
          timestamp: lastDataPoint ? new Date(lastDataPoint.timestamp).toLocaleTimeString() : '-'
        };
      });

      return (
        <div className="h-full overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Variável</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="text-right">Última Atualização</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tableData.map((item, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{item.variable}</TableCell>
                  <TableCell className="text-right font-mono">{item.value}</TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground">{item.timestamp}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      );
    }

    // Widget não configurado - mostrar mensagem para configurar
    return (
      <div className="flex flex-col items-center justify-center h-full p-2 text-center">
        <div className="rounded-lg bg-muted/50 flex items-center justify-center w-10 h-10 mb-2">
          <Settings className="w-5 h-5 text-muted-foreground" />
        </div>
        <div className="text-sm text-muted-foreground font-medium">
          Configure as variáveis
        </div>
        <div className="text-xs text-muted-foreground/70 mt-1">
          para exibir os valores
        </div>
      </div>
    );
  }

  function renderTemporalHeatmap() {
    // Se não há sensor configurado, mostrar mensagem de configuração
    if (!sensorTag || !assetTag) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-4 text-center">
          <div className="rounded-lg bg-muted/50 flex items-center justify-center w-12 h-12 mb-3">
            <Settings className="w-6 h-6 text-muted-foreground" />
          </div>
          <div className="text-sm text-muted-foreground font-medium">
            Widget: heatmap-time
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Configure para visualizar dados
          </div>
        </div>
      );
    }

    const getHeatmapColor = (value: number | null, min: number, max: number) => {
      if (value === null || value === undefined || min === Infinity || max === -Infinity || min === max) {
        return 'rgb(243, 244, 246)'; // gray-100
      }
      
      const normalized = (value - min) / (max - min);
      const intensity = Math.round(255 * (1 - normalized));
      return `rgb(${255}, ${intensity}, ${intensity})`; // Red scale
    };

    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));

    if (multiSensorHistory.loading) {
      return (
        <div className="flex flex-col items-center justify-center h-full">
          <div className="text-sm text-muted-foreground">Carregando dados...</div>
        </div>
      );
    }

    if (!heatmapData || !heatmapData.grid || heatmapData.min === Infinity || heatmapData.max === -Infinity) {
      return (
        <div className="flex flex-col items-center justify-center h-full">
          <div className="text-sm text-muted-foreground">Sem dados disponíveis</div>
        </div>
      );
    }

    return (
      <div className="h-full p-2">
        <div className="h-full overflow-auto">
          {/* Cabeçalho com escala */}
          <div className="mb-2 text-xs text-muted-foreground text-center">
            {(heatmapData.min !== Infinity && heatmapData.max !== -Infinity) 
              ? `${heatmapData.min.toFixed(1)} - ${heatmapData.max.toFixed(1)} ${widget.config?.unit || ''}` 
              : 'Sem dados de escala'
            }
          </div>
          
          {/* Grid do heatmap */}
          <div className="grid gap-1" style={{ gridTemplateColumns: `auto repeat(24, 1fr)` }}>
            {/* Header com horas */}
            <div></div>
            {hours.map(hour => (
              <div key={hour} className="text-xs text-center text-muted-foreground font-mono">
                {hour}
              </div>
            ))}
            
            {/* Rows com dias */}
            {days.map(day => (
              <>
                <div key={`${day}-label`} className="text-xs text-right pr-2 text-muted-foreground">
                  {day}
                </div>
                {hours.map(hour => {
                  const value = heatmapData.grid[day]?.[hour];
                  const color = getHeatmapColor(value, heatmapData.min, heatmapData.max);
                  
                  return (
                    <div
                      key={`${day}-${hour}`}
                      className="aspect-square rounded-sm border border-gray-200 text-xs flex items-center justify-center cursor-pointer hover:opacity-80"
                      style={{ backgroundColor: color }}
                      title={value !== null && value !== undefined && typeof value === 'number' ? `${day} ${hour}:00 - ${value.toFixed(2)} ${widget.config?.unit || ''}` : 'Sem dados'}
                    >
                      {value !== null && value !== undefined && typeof value === 'number' && (
                        <span className="text-xs font-mono" style={{ 
                          color: (heatmapData.min !== Infinity && heatmapData.max !== -Infinity && value > (heatmapData.min + heatmapData.max) / 2) ? 'white' : 'black' 
                        }}>
                          {value.toFixed(0)}
                        </span>
                      )}
                    </div>
                  );
                })}
              </>
            ))}
          </div>
        </div>
      </div>
    );
  }

  function renderWorkOrdersTable() {
    const recentWO = workOrders.slice(0, 5);
    return (
      <div className="h-full overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nº OS</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Prioridade</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recentWO.map(wo => (
              <TableRow key={wo.id}>
                <TableCell className="font-medium">{wo.number}</TableCell>
                <TableCell>
                  <Badge variant={
                    wo.status === 'COMPLETED' ? 'default' :
                    wo.status === 'IN_PROGRESS' ? 'secondary' : 'outline'
                  }>
                    {wo.status === 'COMPLETED' ? 'Concluída' :
                     wo.status === 'IN_PROGRESS' ? 'Em Andamento' : 'Aberta'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={
                    wo.priority === 'CRITICAL' ? 'destructive' :
                    wo.priority === 'HIGH' ? 'outline' : 'secondary'
                  }>
                    {wo.priority === 'CRITICAL' ? 'Crítica' :
                     wo.priority === 'HIGH' ? 'Alta' :
                     wo.priority === 'MEDIUM' ? 'Média' : 'Baixa'}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
            {recentWO.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground">
                  Nenhuma OS encontrada
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    );
  }

  function renderEquipmentTable() {
    const recentEquip = equipment.slice(0, 5);
    return (
      <div className="h-full overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tag</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recentEquip.map(eq => (
              <TableRow key={eq.id}>
                <TableCell className="font-medium">{eq.tag}</TableCell>
                <TableCell>{eq.type}</TableCell>
                <TableCell>
                  <Badge variant={
                    eq.status === 'FUNCTIONING' ? 'default' :
                    eq.status === 'MAINTENANCE' ? 'secondary' : 'destructive'
                  }>
                    {eq.status === 'FUNCTIONING' ? 'Funcionando' :
                     eq.status === 'MAINTENANCE' ? 'Manutenção' : 'Parado'}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
            {recentEquip.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground">
                  Nenhum equipamento encontrado
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    );
  }

  function renderWorkOrdersSummary() {
    const stats = {
      open: workOrderStats?.open ?? workOrders.filter(wo => wo.status === 'OPEN').length,
      inProgress: workOrderStats?.in_progress ?? workOrders.filter(wo => wo.status === 'IN_PROGRESS').length,
      completed: workOrderStats?.completed ?? workOrders.filter(wo => wo.status === 'COMPLETED').length,
    };

    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center gap-2 mb-4">
          <ClipboardList className="w-5 h-5 text-primary" />
          <span className="font-medium">Resumo de OS</span>
        </div>
        <div className="flex-1 grid grid-cols-3 gap-2">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-yellow-700">{stats.open}</div>
            <div className="text-xs text-yellow-600">Abertas</div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-blue-700">{stats.inProgress}</div>
            <div className="text-xs text-blue-600">Em Andamento</div>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-green-700">{stats.completed}</div>
            <div className="text-xs text-green-600">Concluídas</div>
          </div>
        </div>
      </div>
    );
  }

  function renderEquipmentStatus() {
    const stats = {
      functioning: equipment.filter(eq => eq.status === 'FUNCTIONING').length,
      maintenance: equipment.filter(eq => eq.status === 'MAINTENANCE').length,
      stopped: equipment.filter(eq => eq.status === 'STOPPED').length,
    };
    const total = stats.functioning + stats.maintenance + stats.stopped;

    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center gap-2 mb-4">
          <Server className="w-5 h-5 text-primary" />
          <span className="font-medium">Status dos Equipamentos</span>
        </div>
        <div className="flex-1 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-sm">Funcionando</span>
            </div>
            <span className="font-medium">{stats.functioning}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-yellow-500" />
              <span className="text-sm">Em Manutenção</span>
            </div>
            <span className="font-medium">{stats.maintenance}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <XCircle className="w-4 h-4 text-red-500" />
              <span className="text-sm">Parado</span>
            </div>
            <span className="font-medium">{stats.stopped}</span>
          </div>
          <div className="pt-2 border-t">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Total</span>
              <span className="font-bold">{total}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  function renderMaintenanceSchedule() {
    const upcomingWO = workOrders
      .filter(wo => wo.status === 'OPEN' || wo.status === 'IN_PROGRESS')
      .slice(0, 4);

    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-5 h-5 text-primary" />
          <span className="font-medium">Próximas Manutenções</span>
        </div>
        <div className="flex-1 space-y-2 overflow-auto">
          {upcomingWO.map(wo => (
            <div key={wo.id} className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{wo.number}</div>
                <div className="text-xs text-muted-foreground">
                  {new Date(wo.scheduledDate).toLocaleDateString('pt-BR')}
                </div>
              </div>
              <Badge variant="outline" className="text-xs">
                {wo.priority === 'CRITICAL' ? 'Crítica' :
                 wo.priority === 'HIGH' ? 'Alta' : 'Normal'}
              </Badge>
            </div>
          ))}
          {upcomingWO.length === 0 && (
            <div className="text-center text-sm text-muted-foreground py-4">
              Nenhuma manutenção agendada
            </div>
          )}
        </div>
      </div>
    );
  }

  function renderTextDisplay() {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-center text-muted-foreground">
          {widget.config?.text || 'Clique em configurar para adicionar texto'}
        </p>
      </div>
    );
  }

  function renderPhotoDisplay() {
    const imageUrl = widget.config?.imageUrl;
    return (
      <div className="h-full flex items-center justify-center bg-muted/50 rounded-lg">
        {imageUrl ? (
          <img src={imageUrl} alt="Widget" className="max-h-full max-w-full object-contain" />
        ) : (
          <div className="text-center text-muted-foreground">
            <Server className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Clique em configurar para adicionar imagem</p>
          </div>
        )}
      </div>
    );
  }

  function renderPlaceholder() {
    return (
      <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
        <Activity className="w-12 h-12 mb-2 opacity-50" />
        <p className="text-sm">Widget: {widget.type}</p>
        <p className="text-xs">Configure para visualizar dados</p>
      </div>
    );
  }

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          getSizeClasses(widget.size),
          isDragging && 'opacity-50 z-50'
        )}
      >
        <Card className={cn(
          "h-full transition-all",
          editMode && "ring-2 ring-dashed ring-primary/30 hover:ring-primary/50"
        )}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 py-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              {editMode && (
                <div
                  {...attributes}
                  {...listeners}
                  className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded"
                >
                  <GripVertical className="w-4 h-4 text-muted-foreground" />
                </div>
              )}
              {widget.title}
              {/* Legenda das variáveis para gráficos */}
              {(widget.type === 'chart-line-echarts' || widget.type === 'chart-area' || widget.type === 'chart-bar' || widget.type === 'chart-bar-horizontal') && multiSensorHistory.series.length > 0 && (
                <div className="flex items-center gap-2 ml-3 flex-wrap max-w-[70%]">
                  {multiSensorHistory.series.map((serie) => (
                    <button
                      key={serie.label}
                      onClick={() => {
                        const newHidden = new Set(hiddenSeries);
                        if (newHidden.has(serie.label)) {
                          newHidden.delete(serie.label);
                        } else {
                          newHidden.add(serie.label);
                        }
                        setHiddenSeries(newHidden);
                      }}
                      className={cn(
                        "flex items-center gap-1 px-2 py-0.5 text-xs rounded transition-all",
                        hiddenSeries.has(serie.label) 
                          ? "opacity-40 line-through" 
                          : "opacity-100"
                      )}
                      style={{ 
                        borderLeft: `3px solid ${serie.color}`,
                        paddingLeft: '6px'
                      }}
                    >
                      {serie.label}
                    </button>
                  ))}
                </div>
              )}
            </CardTitle>
            <div className="flex items-center gap-2">
              {/* Filtro de tempo para gráficos ECharts */}
              {(widget.type === 'chart-line-echarts' || widget.type === 'chart-area' || widget.type === 'chart-bar' || widget.type === 'chart-bar-horizontal') && widget.config?.sensorTags && (
                <div className="flex gap-0.5">
                  {[{ value: '1h', label: '1h' }, { value: '12h', label: '12h' }, { value: '24h', label: '24h' }, { value: '7d', label: '7d' }, { value: '30d', label: '30d' }].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setChartPeriod(opt.value)}
                      className={cn(
                        "px-2 py-0.5 text-xs rounded transition-colors",
                        chartPeriod === opt.value
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
              {editMode && (
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={handleConfig}
                  >
                    <Settings className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={handleRemove}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-0 pb-2 h-[calc(100%-3rem)]">
            <div className="h-full">
              {renderWidgetContent()}
            </div>
          </CardContent>
        </Card>
      </div>

      <WidgetConfig
        widget={widget}
        layoutId={layoutId}
        open={configOpen}
        onClose={() => setConfigOpen(false)}
      />

      <ConfirmDialog
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        title="Remover Widget"
        description={`Tem certeza que deseja remover o widget "${widget.title}"? Esta ação não pode ser desfeita.`}
        confirmText="Remover"
        cancelText="Cancelar"
        variant="destructive"
        onConfirm={handleConfirmDelete}
      />
    </>
  );
}
