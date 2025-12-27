import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { MetricsSummary, MetricsRange } from '@/models/metrics';
import { getMetricsSummary, exportMetricsToCSV, exportPageToPDF } from '@/data/metricsStore';
import { toast } from 'sonner';

export function useMetrics(initialRange: MetricsRange = '90d') {
  const [selectedRange, setSelectedRange] = useState<MetricsRange>(initialRange);

  // Query para buscar métricas
  const metricsQuery = useQuery({
    queryKey: ['metrics', selectedRange],
    queryFn: () => getMetricsSummary(selectedRange),
    staleTime: 5 * 60 * 1000, // 5 minutos
    retry: 2
  });

  // Handlers para exportação
  const handleExportCSV = async () => {
    try {
      if (!metricsQuery.data) {
        toast.error('Dados não disponíveis para exportação');
        return;
      }

      const blob = exportMetricsToCSV(metricsQuery.data);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      
      link.href = url;
      link.download = `metricas-cmms-${selectedRange}-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
      toast.success('Arquivo CSV exportado com sucesso');
    } catch (error) {
      console.error('Erro ao exportar CSV:', error);
      toast.error('Erro ao exportar arquivo CSV');
    }
  };

  const handleExportPDF = () => {
    try {
      exportPageToPDF();
      toast.success('Abrindo diálogo de impressão para PDF');
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
      toast.error('Erro ao preparar arquivo PDF');
    }
  };

  // Atualizar range e revalidar query
  const changeRange = (newRange: MetricsRange) => {
    setSelectedRange(newRange);
  };

  return {
    // Estado das métricas
    metrics: metricsQuery.data,
    isLoading: metricsQuery.isLoading,
    isError: metricsQuery.isError,
    error: metricsQuery.error,
    
    // Controle de range
    selectedRange,
    changeRange,
    
    // Exportação
    exportCSV: handleExportCSV,
    exportPDF: handleExportPDF,
    
    // Revalidação manual
    refetch: metricsQuery.refetch
  };
}