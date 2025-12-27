import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, FileSpreadsheet, Printer } from 'lucide-react';
import type { MetricsRange } from '@/models/metrics';

interface MetricsToolbarProps {
  selectedRange: MetricsRange;
  onRangeChange: (range: MetricsRange) => void;
  onExportCSV: () => void;
  onExportPDF: () => void;
  isLoading?: boolean;
}

const rangeOptions = [
  { value: '30d', label: '30 dias' },
  { value: '90d', label: '90 dias' },
  { value: '12m', label: '12 meses' }
] as const;

export function MetricsToolbar({
  selectedRange,
  onRangeChange,
  onExportCSV,
  onExportPDF,
  isLoading = false
}: MetricsToolbarProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <div className="flex items-center gap-2">
        <label htmlFor="range-select" className="text-sm font-medium text-foreground">
          Período:
        </label>
        <Select value={selectedRange} onValueChange={onRangeChange}>
          <SelectTrigger 
            id="range-select"
            className="w-32" 
            disabled={isLoading}
            aria-label="Selecionar período para métricas"
          >
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            {rangeOptions.map(option => (
              <SelectItem 
                key={option.value} 
                value={option.value}
              >
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onExportCSV}
          disabled={isLoading}
          className="btn-press focus-ring"
          aria-label="Exportar dados para CSV"
        >
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Exportar CSV
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={onExportPDF}
          disabled={isLoading}
          className="btn-press focus-ring"
          aria-label="Exportar página para PDF"
        >
          <Printer className="h-4 w-4 mr-2" />
          Exportar PDF
        </Button>
      </div>
    </div>
  );
}