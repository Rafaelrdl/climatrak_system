/**
 * WidgetPalette - Paleta para adicionar novos widgets na Visão Geral
 * Cópia independente da biblioteca de dashboards
 */

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Plus, 
  Search, 
  Activity,
  TrendingUp,
  BarChart2,
  LineChart,
  AreaChart,
  BarChart3,
  BarChartHorizontal,
  PieChart,
  Circle,
  Gauge,
  Table,
  ClipboardList,
  Server,
  Calendar,
  Users,
  Clock,
  Type,
  Image,
  Square,
  CheckCircle,
  AlertTriangle,
  Grid
} from 'lucide-react';
import { WidgetType } from '../types/dashboard';

// Definição de widgets disponíveis na Visão Geral
interface OverviewWidgetDefinition {
  id: WidgetType;
  name: string;
  description: string;
  category: string;
  icon: string;
  defaultSize: string;
}

// Categorias de widgets com nomes em português
const categoryNames: Record<string, string> = {
  'cards-simples': 'Cards Simples',
  'cards-acao': 'Cards de Ação',
  'graficos-linha': 'Gráficos de Linha',
  'graficos-barra': 'Gráficos de Barra',
  'graficos-circulares': 'Gráficos Circulares',
  'medidores': 'Medidores',
  'indicadores': 'Indicadores',
  'tabelas': 'Tabelas',
  'mapas-calor': 'Mapas de Calor',
  'outros': 'Outros',
};

// Ordem das categorias para exibição
const categoryOrder = [
  'cards-simples',
  'cards-acao',
  'graficos-linha',
  'graficos-barra',
  'graficos-circulares',
  'medidores',
  'indicadores',
  'tabelas',
  'mapas-calor',
  'outros',
];

// Lista de widgets disponíveis para a Visão Geral
const overviewWidgetDefinitions: OverviewWidgetDefinition[] = [
  // CARDS SIMPLES (4)
  { id: 'card-kpi', name: 'Card KPI', description: 'Card com valor, ícone e tendência', category: 'cards-simples', icon: 'Activity', defaultSize: 'col-2' },
  { id: 'card-value', name: 'Card Valor', description: 'Exibe um valor único', category: 'cards-simples', icon: 'Square', defaultSize: 'col-2' },
  { id: 'card-stat', name: 'Card Estatística', description: 'Valor com tendência e comparação', category: 'cards-simples', icon: 'TrendingUp', defaultSize: 'col-2' },
  { id: 'card-progress', name: 'Card Progresso', description: 'Barra de progresso com percentual', category: 'cards-simples', icon: 'BarChart2', defaultSize: 'col-2' },

  // CARDS DE AÇÃO (3)
  { id: 'work-orders-summary', name: 'Resumo de OS', description: 'Resumo de ordens de serviço', category: 'cards-acao', icon: 'ClipboardList', defaultSize: 'col-3' },
  { id: 'equipment-status', name: 'Status de Equipamentos', description: 'Visão geral dos equipamentos', category: 'cards-acao', icon: 'Server', defaultSize: 'col-3' },
  { id: 'maintenance-schedule', name: 'Agenda de Manutenções', description: 'Próximas manutenções programadas', category: 'cards-acao', icon: 'Calendar', defaultSize: 'col-4' },

  // GRÁFICOS DE LINHA (2)
  { id: 'chart-line', name: 'Gráfico de Linha', description: 'Linha temporal de dados', category: 'graficos-linha', icon: 'LineChart', defaultSize: 'col-4' },
  { id: 'chart-area', name: 'Gráfico de Área', description: 'Área preenchida temporal', category: 'graficos-linha', icon: 'AreaChart', defaultSize: 'col-4' },

  // GRÁFICOS DE BARRA (2)
  { id: 'chart-bar', name: 'Gráfico de Barras', description: 'Barras verticais', category: 'graficos-barra', icon: 'BarChart3', defaultSize: 'col-4' },
  { id: 'chart-bar-horizontal', name: 'Barras Horizontais', description: 'Barras na horizontal', category: 'graficos-barra', icon: 'BarChartHorizontal', defaultSize: 'col-4' },

  // GRÁFICOS CIRCULARES (3)
  { id: 'chart-pie', name: 'Gráfico de Pizza', description: 'Pizza com percentuais', category: 'graficos-circulares', icon: 'PieChart', defaultSize: 'col-3' },
  { id: 'chart-donut', name: 'Gráfico Donut', description: 'Rosca com centro vazio', category: 'graficos-circulares', icon: 'Circle', defaultSize: 'col-3' },
  { id: 'gauge-circular', name: 'Medidor Circular', description: 'Medidor circular como gráfico', category: 'graficos-circulares', icon: 'Gauge', defaultSize: 'col-2' },

  // MEDIDORES (3)
  { id: 'gauge-progress', name: 'Barra de Progresso', description: 'Barra de progresso horizontal', category: 'medidores', icon: 'BarChart3', defaultSize: 'col-3' },
  { id: 'technician-performance', name: 'Performance Técnicos', description: 'Métricas de desempenho', category: 'medidores', icon: 'Users', defaultSize: 'col-4' },
  { id: 'sla-overview', name: 'Visão Geral SLA', description: 'Métricas de SLA', category: 'medidores', icon: 'Clock', defaultSize: 'col-3' },

  // INDICADORES (3)
  { id: 'indicator-status', name: 'Indicador de Status', description: 'LED de status online/offline', category: 'indicadores', icon: 'CheckCircle', defaultSize: 'col-1' },
  { id: 'indicator-trend', name: 'Indicador de Tendência', description: 'Seta de tendência up/down', category: 'indicadores', icon: 'TrendingUp', defaultSize: 'col-1' },
  { id: 'indicator-alert', name: 'Indicador de Alerta', description: 'Alerta visual de limites', category: 'indicadores', icon: 'AlertTriangle', defaultSize: 'col-1' },

  // TABELAS (2)
  { id: 'table-simple', name: 'Tabela Simples', description: 'Tabela de dados genérica', category: 'tabelas', icon: 'Table', defaultSize: 'col-6' },
  { id: 'table-work-orders', name: 'Tabela de OS', description: 'Lista de ordens de serviço', category: 'tabelas', icon: 'ClipboardList', defaultSize: 'col-6' },

  // MAPAS DE CALOR (2)
  { id: 'heatmap-equipment', name: 'Mapa de Calor Equipamentos', description: 'Mapa de calor por equipamento', category: 'mapas-calor', icon: 'Grid', defaultSize: 'col-4' },
  { id: 'heatmap-time', name: 'Mapa de Calor Temporal', description: 'Mapa de calor por período', category: 'mapas-calor', icon: 'Calendar', defaultSize: 'col-4' },

  // OUTROS (2)
  { id: 'text-display', name: 'Exibição de Texto', description: 'Texto formatado', category: 'outros', icon: 'Type', defaultSize: 'col-2' },
  { id: 'photo-display', name: 'Exibição de Imagem', description: 'Imagem personalizada', category: 'outros', icon: 'Image', defaultSize: 'col-3' },
];

// Mapa de ícones
const iconMap: Record<string, any> = {
  Activity, TrendingUp, BarChart2, LineChart, AreaChart, 
  BarChart3, BarChartHorizontal, PieChart, Circle, Gauge,
  Table, ClipboardList, Server, Calendar, Users, Clock,
  Type, Image, Square, CheckCircle, AlertTriangle, Grid
};

interface WidgetPaletteProps {
  onAddWidget: (type: WidgetType, title: string) => void;
}

export function WidgetPalette({ onAddWidget }: WidgetPaletteProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const handleAddWidget = (widget: OverviewWidgetDefinition) => {
    onAddWidget(widget.id, widget.name);
    setOpen(false);
    setSearchTerm('');
    setSelectedCategory(null);
  };

  // Filtrar widgets por busca e categoria
  const filteredWidgets = overviewWidgetDefinitions.filter(widget => {
    const matchesSearch = searchTerm === '' || 
      widget.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      widget.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = !selectedCategory || widget.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  // Agrupar widgets filtrados por categoria
  const groupedWidgets = filteredWidgets.reduce((acc, widget) => {
    if (!acc[widget.category]) {
      acc[widget.category] = [];
    }
    acc[widget.category].push(widget);
    return acc;
  }, {} as Record<string, typeof overviewWidgetDefinitions>);

  // Contar widgets por categoria (para exibição)
  const categoryCounts = overviewWidgetDefinitions.reduce((acc, widget) => {
    acc[widget.category] = (acc[widget.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Ordenar categorias conforme definido
  const sortedCategories = categoryOrder.filter(cat => groupedWidgets[cat]);

  // Função para obter o ícone
  const getIcon = (iconName: string) => {
    const Icon = iconMap[iconName] || Activity;
    return <Icon className="w-5 h-5" />;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Plus className="w-4 h-4" />
          Adicionar Widget
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0">
        <div className="flex flex-col h-full overflow-hidden">
          {/* Header fixo */}
          <DialogHeader className="flex-shrink-0 px-6 py-5 border-b bg-background">
            <DialogTitle className="text-xl font-bold">Biblioteca de Widgets</DialogTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Selecione um widget para adicionar à sua visão geral
            </p>
          </DialogHeader>

          {/* Barra de busca e filtros */}
          <div className="flex-shrink-0 px-6 py-4 border-b bg-muted/30">
            <div className="flex flex-col gap-4">
              {/* Campo de busca */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar widgets..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              
              {/* Filtros de categoria com contagem */}
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={selectedCategory === null ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(null)}
                  className="text-xs"
                >
                  Todos ({overviewWidgetDefinitions.length})
                </Button>
                {categoryOrder.map(category => (
                  <Button
                    key={category}
                    variant={selectedCategory === category ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCategory(selectedCategory === category ? null : category)}
                    className="text-xs"
                  >
                    {categoryNames[category]} ({categoryCounts[category] || 0})
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* Lista de widgets com scroll */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <div className="space-y-6">
              {sortedCategories.map(category => (
                <div key={category}>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
                    {categoryNames[category]} ({groupedWidgets[category].length})
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {groupedWidgets[category].map((widget, index) => (
                      <button
                        key={`${widget.id}-${index}`}
                        onClick={() => handleAddWidget(widget)}
                        className="group flex flex-col items-center gap-3 p-4 rounded-lg border border-border bg-card hover:bg-accent hover:border-primary/50 transition-all text-left"
                      >
                        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                          {getIcon(widget.icon)}
                        </div>
                        <div className="text-center">
                          <div className="text-sm font-medium group-hover:text-foreground transition-colors">
                            {widget.name}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {widget.description}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              {filteredWidgets.length === 0 && (
                <div className="text-center py-12">
                  <Search className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-medium mb-2">Nenhum widget encontrado</h3>
                  <p className="text-sm text-muted-foreground">
                    Tente ajustar seus filtros ou termos de busca
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
