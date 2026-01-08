/**
 * Reports Service - Serviço para geração de relatórios
 * 
 * Endpoints:
 * - GET /api/cmms/reports/pmoc-monthly/ - Relatório PMOC mensal
 * - GET /api/cmms/reports/pmoc-annual/ - Relatório PMOC anual
 */

import { api } from '@/lib/api';

// ============================================
// Tipos
// ============================================

export interface PMOCReportFilters {
  month?: number;
  year?: number;
  site_id?: string;
  company?: string;
}

export interface PMOCPeriod {
  month?: number;
  year: number;
  start_date: string;
  end_date: string;
  month_name?: string;
}

export interface EstablishmentInfo {
  name: string;
  company: string;
  address: string;
  sector: string;
  subsector: string;
}

export interface EquipmentByType {
  type: string;
  count: number;
  total_capacity_btu: number;
}

export interface ClimateSystemsSummary {
  total_equipment: number;
  total_capacity_btu: number;
  total_capacity_tr: number;
  equipment_by_type: EquipmentByType[];
  equipment_by_status: Record<string, number>;
  equipment_by_age?: Record<string, number>;
}

export interface MaintenanceCategorySummary {
  scheduled?: number;
  completed: number;
  pending?: number;
  compliance_rate?: number;
  opened?: number;
  average_response_hours?: number | null;
  total?: number;
}

export interface MaintenanceSummary {
  preventive: MaintenanceCategorySummary;
  corrective: MaintenanceCategorySummary;
  inspections: MaintenanceCategorySummary;
  overall_compliance_rate: number;
}

export interface EquipmentItem {
  tag: string;
  name: string;
  type: string;
  manufacturer: string;
  model: string;
  serial_number: string;
  capacity_btu: number | null;
  location: string;
  status: string;
  preventive_count: number;
  corrective_count: number;
  compliance_rate: number;
  mtbf_days?: number | null;
}

export interface WorkOrderItem {
  number: string;
  type: string;
  type_display: string;
  priority: string;
  priority_display: string;
  status: string;
  status_display: string;
  asset_tag: string;
  asset_name: string;
  description: string;
  created_at: string | null;
  completed_at: string | null;
}

export interface ResponsibleTechnician {
  name: string;
  crea: string;
  phone: string;
  email: string;
}

export interface MonthlyBreakdownItem {
  month: number;
  month_name: string;
  preventive_scheduled: number;
  preventive_completed: number;
  corrective_opened: number;
  corrective_completed: number;
  compliance_rate: number;
}

export interface MaintenancePlanItem {
  name: string;
  frequency: string;
  frequency_display: string;
  asset_count: number;
  work_orders_generated: number;
  next_execution: string | null;
  last_execution: string | null;
}

export interface PMOCKPIs {
  preventive_compliance: number;
  corrective_ratio: number;
  average_response_time: number | null;
  equipment_availability: number;
  backlog_aging_days: number;
}

export interface PMOCConclusions {
  summary: string[];
  recommendations: string[];
  overall_status: 'CONFORME' | 'ATENÇÃO';
}

// Relatório PMOC Mensal
export interface PMOCMonthlyReport {
  report_type: 'PMOC_MENSAL';
  period: PMOCPeriod;
  generated_at: string;
  filters: PMOCReportFilters;
  establishment: EstablishmentInfo;
  climate_systems: ClimateSystemsSummary;
  maintenance_summary: MaintenanceSummary;
  equipment_list: EquipmentItem[];
  work_orders: WorkOrderItem[];
  responsible_technician: ResponsibleTechnician;
  observations: string[];
}

// Relatório PMOC Anual
export interface PMOCAnnualReport {
  report_type: 'PMOC_ANUAL';
  period: PMOCPeriod;
  generated_at: string;
  filters: PMOCReportFilters;
  establishment: EstablishmentInfo;
  climate_systems: ClimateSystemsSummary;
  maintenance_annual: {
    total_preventive: number;
    total_corrective: number;
    total_inspections: number;
    total_work_orders: number;
    overall_compliance_rate: number;
    average_mttr_hours: number | null;
  };
  monthly_breakdown: MonthlyBreakdownItem[];
  equipment_performance: EquipmentItem[];
  kpis: PMOCKPIs;
  maintenance_plans: MaintenancePlanItem[];
  responsible_technician: ResponsibleTechnician;
  conclusions: PMOCConclusions;
}

// ============================================
// Service
// ============================================

export const reportsService = {
  /**
   * Gera relatório PMOC mensal
   */
  async generatePMOCMonthly(filters: PMOCReportFilters = {}): Promise<PMOCMonthlyReport> {
    const params = new URLSearchParams();
    
    if (filters.month) params.append('month', String(filters.month));
    if (filters.year) params.append('year', String(filters.year));
    if (filters.site_id) params.append('site_id', filters.site_id);
    if (filters.company) params.append('company', filters.company);
    
    const queryString = params.toString();
    const url = `/cmms/reports/pmoc-monthly/${queryString ? `?${queryString}` : ''}`;
    
    const response = await api.get<PMOCMonthlyReport>(url);
    return response.data;
  },

  /**
   * Gera relatório PMOC anual
   */
  async generatePMOCAnnual(filters: Omit<PMOCReportFilters, 'month'> = {}): Promise<PMOCAnnualReport> {
    const params = new URLSearchParams();
    
    if (filters.year) params.append('year', String(filters.year));
    if (filters.site_id) params.append('site_id', filters.site_id);
    if (filters.company) params.append('company', filters.company);
    
    const queryString = params.toString();
    const url = `/cmms/reports/pmoc-annual/${queryString ? `?${queryString}` : ''}`;
    
    const response = await api.get<PMOCAnnualReport>(url);
    return response.data;
  },
};

export default reportsService;
