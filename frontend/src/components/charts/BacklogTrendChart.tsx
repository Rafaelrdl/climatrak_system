import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';
import type { BacklogTrend } from '@/models/metrics';

interface BacklogTrendChartProps {
  data: BacklogTrend[];
  title?: string;
  srDescriptionId?: string;
}

export function BacklogTrendChart({ 
  data, 
  title = "Evolução do Backlog",
  srDescriptionId = "backlog-chart-description"
}: BacklogTrendChartProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum dado de backlog disponível para o período selecionado</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const maxPercent = Math.max(...data.map(item => item.backlog_percent));
  const chartHeight = 200;
  const chartWidth = 400;
  const padding = 40;

  // Calculate SVG coordinates
  const xStep = (chartWidth - padding * 2) / (data.length - 1);
  const yScale = (chartHeight - padding * 2) / (maxPercent || 100);

  const points = data.map((item, index) => ({
    x: padding + index * xStep,
    y: chartHeight - padding - (item.backlog_percent * yScale),
    ...item
  }));

  const pathData = `M ${points.map(p => `${p.x},${p.y}`).join(' L ')}`;

  // Generate aria-label for accessibility
  const ariaLabel = `Gráfico de linha da evolução do backlog. ${
    data.map(item => `${item.month}: ${item.backlog_percent}%`).join(', ')
  }.`;

  // Meta line at 20% (reference)
  const metaY = chartHeight - padding - (20 * yScale);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <svg
            width="100%"
            height={chartHeight}
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className="overflow-visible"
            role="img"
            aria-labelledby={srDescriptionId}
          >
            {/* Grid lines */}
            <defs>
              <pattern id="grid" width="40" height="20" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
            
            {/* Meta line (20% reference) */}
            {maxPercent >= 20 && (
              <g>
                <line 
                  x1={padding} 
                  y1={metaY} 
                  x2={chartWidth - padding} 
                  y2={metaY}
                  stroke="currentColor" 
                  strokeWidth="1" 
                  strokeDasharray="5,5"
                  opacity="0.4"
                />
                <text 
                  x={chartWidth - padding - 5} 
                  y={metaY - 5} 
                  fontSize="10" 
                  fill="currentColor" 
                  opacity="0.6"
                  textAnchor="end"
                >
                  Meta 20%
                </text>
              </g>
            )}
            
            {/* Area under curve */}
            <defs>
              <linearGradient id="backlogGradient" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="oklch(0.45 0.15 200)" stopOpacity="0.2" />
                <stop offset="100%" stopColor="oklch(0.45 0.15 200)" stopOpacity="0.05" />
              </linearGradient>
            </defs>
            
            <path
              d={`${pathData} L ${points[points.length - 1].x},${chartHeight - padding} L ${points[0].x},${chartHeight - padding} Z`}
              fill="url(#backlogGradient)"
            />
            
            {/* Main line */}
            <path
              d={pathData}
              fill="none"
              stroke="oklch(0.45 0.15 200)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="transition-all duration-300"
            />
            
            {/* Data points */}
            {points.map((point, index) => (
              <g key={index}>
                {/* Interactive area */}
                <circle
                  cx={point.x}
                  cy={point.y}
                  r="12"
                  fill="transparent"
                  className="cursor-pointer hover:fill-primary/5"
                  tabIndex={0}
                  role="button"
                  aria-label={`${point.month}: ${point.backlog_percent}% de backlog`}
                />
                
                {/* Visible point */}
                <circle
                  cx={point.x}
                  cy={point.y}
                  r="4"
                  fill="oklch(0.45 0.15 200)"
                  stroke="oklch(0.98 0.01 200)"
                  strokeWidth="2"
                  className="transition-all duration-300 hover:scale-125"
                />
                
                {/* Hover tooltip */}
                <g className="opacity-0 hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                  <rect
                    x={point.x - 35}
                    y={point.y - 45}
                    width="70"
                    height="35"
                    rx="6"
                    fill="oklch(1 0 0)"
                    stroke="oklch(0.9 0.02 200)"
                    strokeWidth="1"
                    filter="drop-shadow(0 2px 8px rgb(0 0 0 / 0.1))"
                  />
                  <text
                    x={point.x}
                    y={point.y - 30}
                    fontSize="10"
                    fontWeight="500"
                    fill="oklch(0.15 0.02 200)"
                    textAnchor="middle"
                  >
                    {point.month}
                  </text>
                  <text
                    x={point.x}
                    y={point.y - 18}
                    fontSize="12"
                    fontWeight="600"
                    fill="oklch(0.45 0.15 200)"
                    textAnchor="middle"
                  >
                    {point.backlog_percent}%
                  </text>
                  <text
                    x={point.x}
                    y={point.y - 8}
                    fontSize="9"
                    fill="oklch(0.5 0.05 200)"
                    textAnchor="middle"
                  >
                    {point.open_os}/{point.total_os} OS
                  </text>
                </g>
              </g>
            ))}
            
            {/* X-axis labels */}
            {points.map((point, index) => (
              <text
                key={index}
                x={point.x}
                y={chartHeight - 10}
                fontSize="11"
                fill="currentColor"
                opacity="0.7"
                textAnchor="middle"
              >
                {point.month}
              </text>
            ))}
            
            {/* Y-axis labels */}
            {[0, 25, 50, 75, 100].map(value => {
              const y = chartHeight - padding - (value * yScale);
              if (y >= padding && y <= chartHeight - padding) {
                return (
                  <text
                    key={value}
                    x={padding - 10}
                    y={y + 3}
                    fontSize="10"
                    fill="currentColor"
                    opacity="0.6"
                    textAnchor="end"
                  >
                    {value}%
                  </text>
                );
              }
              return null;
            })}
          </svg>
        </div>
        
        {/* Legend */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-primary" />
              <span className="text-sm text-foreground">Backlog %</span>
            </div>
            {maxPercent >= 20 && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-0.5 bg-current opacity-40" style={{ borderTop: '1px dashed' }} />
                <span className="text-xs text-muted-foreground">Meta 20%</span>
              </div>
            )}
          </div>
          <span className="text-xs text-muted-foreground">
            Últimos {data.length} períodos
          </span>
        </div>
        
        {/* Hidden accessible description */}
        <div 
          id={srDescriptionId}
          className="sr-only"
        >
          {ariaLabel}
        </div>
      </CardContent>
    </Card>
  );
}