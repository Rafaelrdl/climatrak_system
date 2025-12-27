import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KPICardProps {
  title: string;
  value: string | number;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  icon?: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger';
}

const variantStyles = {
  default: 'border-border',
  success: 'border-green-200 bg-green-50',
  warning: 'border-yellow-200 bg-yellow-50', 
  danger: 'border-red-200 bg-red-50'
};

const trendIcons = {
  up: <TrendingUp className="h-4 w-4 text-green-600" />,
  down: <TrendingDown className="h-4 w-4 text-red-600" />,
  neutral: <Minus className="h-4 w-4 text-gray-600" />
};

export function KPICard({ 
  title, 
  value, 
  trend, 
  trendValue, 
  icon,
  variant = 'default' 
}: KPICardProps) {
  return (
    <Card className={cn("transition-shadow hover:shadow-md", variantStyles[variant])}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {icon && (
          <div className="text-muted-foreground">
            {icon}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-foreground mb-1">
          {value}
        </div>
        {trend && trendValue && (
          <div className="flex items-center text-xs text-muted-foreground">
            {trendIcons[trend]}
            <span className="ml-1">{trendValue}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}