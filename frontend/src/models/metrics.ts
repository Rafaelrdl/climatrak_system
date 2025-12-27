export interface MetricKPI {
  id: string;
  title: string;
  value: number;
  unit: string;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: number;
  description: string;
}

export interface MTTRBySector {
  sector_name: string;
  mttr_hours: number;
  wo_count: number;
}

export interface BacklogTrend {
  month: string;
  backlog_percent: number;
  total_os: number;
  open_os: number;
}

export interface TopAssetByWO {
  asset_id: string;
  asset_name: string;
  count: number;
  sector_name: string;
}

export interface MetricsSummary {
  range: '30d' | '90d' | '12m';
  period: string;
  kpis: {
    mttr_hours: number;
    backlog_percent: number;
    top_asset_by_os: TopAssetByWO | null;
    preventive_on_time_percent: number;
  };
  charts: {
    mttr_by_sector: MTTRBySector[];
    backlog_percent_monthly: BacklogTrend[];
  };
  generated_at: string;
}

export type MetricsRange = '30d' | '90d' | '12m';

export interface MetricsExportData {
  summary: MetricsSummary;
  raw_data: {
    work_orders: any[];
    equipment: any[];
    sectors: any[];
  };
}