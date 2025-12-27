import { useState } from 'react';
import { WidgetType, widgetDefinitions, categoryNames, categoryOrder } from '@/types/dashboard';
import { useDashboardStore } from '@/store/useDashboardStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
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

// Mapa de ícones
const iconMap: Record<string, any> = {
  Activity, TrendingUp, BarChart2, LineChart, AreaChart, 
  BarChart3, BarChartHorizontal, PieChart, Circle, Gauge,
  Table, ClipboardList, Server, Calendar, Users, Clock,
  Type, Image, Square, CheckCircle, AlertTriangle, Grid
};

interface WidgetPaletteProps {
  layoutId: string;
  buttonVariant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'destructive';
}

export function WidgetPalette({ layoutId, buttonVariant = 'outline' }: WidgetPaletteProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const addWidget = useDashboardStore(state => state.addWidget);

  const handleAddWidget = (widgetType: WidgetType) => {
    const position = { x: 0, y: 0 };
    addWidget(layoutId, widgetType, position);
    setOpen(false);
    setSearchTerm('');
    setSelectedCategory(null);
  };

  // Filtrar widgets por busca e categoria
  const filteredWidgets = widgetDefinitions.filter(widget => {
    const matchesSearch = searchTerm === '' || 
      widget.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      widget.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = !selectedCategory || widget.category === selectedCategory;
    
    // Filtro específico para o Dashboard: excluir indicadores e tabela de OS
    const isIndicator = widget.id.startsWith('indicator-');
    const isWorkOrdersTable = widget.id === 'table-work-orders';
    
    return matchesSearch && matchesCategory && !isIndicator && !isWorkOrdersTable;
  });

  // Agrupar widgets filtrados por categoria
  const groupedWidgets = filteredWidgets.reduce((acc, widget) => {
    if (!acc[widget.category]) {
      acc[widget.category] = [];
    }
    acc[widget.category].push(widget);
    return acc;
  }, {} as Record<string, typeof widgetDefinitions>);

  // Contar widgets por categoria (para exibição)
  const categoryCounts = widgetDefinitions.reduce((acc, widget) => {
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
        <Button variant={buttonVariant} className="gap-2">
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
              Selecione um widget para adicionar ao seu dashboard
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
                  Todos ({widgetDefinitions.length})
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
                    {groupedWidgets[category].map(widget => (
                      <button
                        key={widget.id}
                        onClick={() => handleAddWidget(widget.id)}
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
