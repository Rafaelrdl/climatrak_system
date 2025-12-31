import { StatCard } from '@/shared/ui';

interface KPICardProps {
  title: string;
  value: string | number;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  icon?: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger';
}

export function KPICard({
  title,
  value,
  trend,
  trendValue,
  icon,
  variant = 'default',
}: KPICardProps) {
  return (
    <StatCard
      title={title}
      value={value}
      icon={icon}
      trend={trend}
      trendValue={trendValue}
      variant={variant}
    />
  );
}
