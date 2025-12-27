import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DonutChart } from '@/components/charts';
import { TrendingUp, Package2, AlertCircle, Loader2 } from 'lucide-react';
import { useConsumptionByCategory, useTopConsumedItems, useInventoryCategories } from '@/hooks/useInventoryQuery';

interface InventoryAnalysisProps {
  className?: string;
}

type AnalysisRange = '30d' | '90d' | '12m';

const RANGE_OPTIONS = [
  { value: '30d' as const, label: '30 dias', days: 30 },
  { value: '90d' as const, label: '90 dias', days: 90 },
  { value: '12m' as const, label: '12 meses', days: 365 }
];

export function InventoryAnalysis({ className = '' }: InventoryAnalysisProps) {
  const [selectedRange, setSelectedRange] = useState<AnalysisRange>('90d');
  
  // Converter range para dias
  const days = useMemo(() => {
    const option = RANGE_OPTIONS.find(o => o.value === selectedRange);
    return option?.days || 90;
  }, [selectedRange]);

  // Buscar dados da API
  const { data: consumption = [], isLoading: isLoadingConsumption } = useConsumptionByCategory(days);
  const { data: topItems = [], isLoading: isLoadingTopItems } = useTopConsumedItems(days, 5);
  const { data: categoriesData } = useInventoryCategories();
  
  // Garantir que categories é sempre um array
  const categories = Array.isArray(categoriesData) ? categoriesData : [];

  const handleRangeChange = (value: AnalysisRange) => {
    setSelectedRange(value);
  };

  // Preparar dados para o gráfico de donut
  const chartData = useMemo(() => {
    if (!Array.isArray(consumption)) return [];
    return consumption.map(item => ({
      label: item.category_name,
      value: item.total_consumed,
      color: categories.find(c => c.id === item.category_id)?.color
    }));
  }, [consumption, categories]);

  const totalConsumption = useMemo(() => {
    return consumption.reduce((sum, item) => sum + item.total_consumed, 0);
  }, [consumption]);

  const isLoading = isLoadingConsumption || isLoadingTopItems;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Range Selector */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Análise de Consumo</h3>
        <Select value={selectedRange} onValueChange={handleRangeChange}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RANGE_OPTIONS.map(option => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Donut Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-5 w-5" />
              Consumo por Categoria
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : totalConsumption > 0 ? (
              <DonutChart
                data={chartData}
                srDescriptionId="consumption-chart-desc"
                centerText={`${totalConsumption} itens`}
                size={240}
                strokeWidth={40}
              />
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Package2 className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  Sem consumo registrado no período
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Selecione um período diferente ou registre movimentações
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Consumed Items */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertCircle className="h-5 w-5" />
              Itens Mais Consumidos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : topItems.length > 0 ? (
              <div className="space-y-4">
                {topItems.map((item, index) => (
                  <div key={item.item_id} className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0 w-8 h-8 rounded bg-muted flex items-center justify-center">
                          <span className="text-sm font-medium text-muted-foreground">
                            {index + 1}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm truncate" title={item.item_name}>
                            {item.item_name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {item.category_name} • SKU: {item.item_sku}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-medium text-sm">
                        {item.total_consumed}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {item.item_unit}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Package2 className="h-8 w-8 text-muted-foreground mb-3" />
                <p className="text-muted-foreground text-sm">
                  Nenhum item consumido no período
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Summary Stats */}
      {!isLoading && totalConsumption > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {consumption.length}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  Categorias Utilizadas
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {totalConsumption}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  Total de Itens Consumidos
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {consumption.length > 0 ? Math.round(totalConsumption / consumption.length) : 0}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  Média por Categoria
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}