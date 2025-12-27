import React from 'react';

interface DonutSegment {
  label: string;
  value: number;
  color?: string;
}

interface DonutChartProps {
  data: DonutSegment[];
  srDescriptionId: string;
  title?: string;
  size?: number;
  strokeWidth?: number;
  centerText?: string;
  className?: string;
}

const DEFAULT_COLORS = [
  'oklch(0.65 0.15 45)',   // Accent
  'oklch(0.45 0.15 200)',  // Primary
  'oklch(0.65 0.15 120)',  // Green
  'oklch(0.65 0.15 270)',  // Purple
  'oklch(0.65 0.15 320)',  // Pink
  'oklch(0.65 0.15 20)',   // Orange
  'oklch(0.65 0.15 180)',  // Cyan
  'oklch(0.65 0.15 80)',   // Lime
];

export function DonutChart({ 
  data, 
  srDescriptionId, 
  title,
  size = 200, 
  strokeWidth = 30,
  centerText,
  className = ''
}: DonutChartProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;
  
  // Calculate total and percentages
  const total = data.reduce((sum, item) => sum + item.value, 0);
  
  if (total === 0) {
    return (
      <div className={`flex flex-col items-center justify-center ${className}`}>
        <div 
          className="relative flex items-center justify-center bg-muted rounded-full"
          style={{ width: size, height: size }}
        >
          <span className="text-sm text-muted-foreground">Sem dados</span>
        </div>
        {title && <h3 className="mt-4 text-sm font-medium text-center">{title}</h3>}
      </div>
    );
  }
  
  const segments = data.map((item, index) => ({
    ...item,
    percentage: (item.value / total) * 100,
    color: item.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length]
  }));
  
  let cumulativePercentage = 0;
  
  // Generate description for screen readers
  const description = segments
    .map(segment => `${segment.label}: ${segment.value} (${segment.percentage.toFixed(1)}%)`)
    .join(', ');
  
  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div className="relative">
        <svg
          width={size}
          height={size}
          role="img"
          aria-describedby={srDescriptionId}
          className="donut-chart"
        >
          {segments.map((segment, index) => {
            const strokeDasharray = `${(segment.percentage / 100) * circumference} ${circumference}`;
            const strokeDashoffset = -cumulativePercentage * circumference / 100;
            
            cumulativePercentage += segment.percentage;
            
            return (
              <circle
                key={index}
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke={segment.color}
                strokeWidth={strokeWidth}
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className="donut-segment transition-all duration-300 hover:brightness-110 hover:drop-shadow-lg cursor-pointer"
                style={{ 
                  transformOrigin: `${center}px ${center}px`,
                  transform: 'rotate(-90deg)'
                }}
              >
                <title>{`${segment.label}: ${segment.value} (${segment.percentage.toFixed(1)}%)`}</title>
              </circle>
            );
          })}
        </svg>
        
        {/* Center text */}
        {centerText && (
          <div 
            className="absolute inset-0 flex items-center justify-center"
            style={{ fontSize: size / 12 }}
          >
            <div className="text-center">
              <div className="font-semibold text-foreground">{centerText}</div>
            </div>
          </div>
        )}
      </div>
      
      {title && (
        <h3 className="mt-4 text-sm font-medium text-center">{title}</h3>
      )}
      
      {/* Legend */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-sm">
        {segments.map((segment, index) => (
          <div key={index} className="chart-legend-item flex items-center gap-2 text-sm">
            <div 
              className="chart-legend-dot flex-shrink-0"
              style={{ backgroundColor: segment.color }}
            />
            <span className="truncate" title={segment.label}>
              {segment.label}
            </span>
            <span className="ml-auto font-medium">
              {segment.percentage.toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
      
      {/* Screen reader description */}
      <p id={srDescriptionId} className="sr-only">
        Gráfico de rosca mostrando distribuição: {description}
      </p>
    </div>
  );
}