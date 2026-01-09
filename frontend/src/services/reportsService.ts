/**
 * Reports Service - Serviço para geração de relatórios PMOC
 * 
 * Conforme Lei 13.589/2018, Portaria MS 3.523/1998 e ANVISA RE 09/2003
 * 
 * Endpoints:
 * - GET /api/cmms/reports/pmoc-monthly/ - Relatório PMOC mensal
 * - GET /api/cmms/reports/pmoc-annual/ - Relatório PMOC anual
 */

import { api } from '@/lib/api';

// ============================================
// Tipos Base
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

// ============================================
// PMOC Metadata (Capa/Base Legal)
// ============================================

export interface PMOCScope {
  site_name: string;
  site_address: string;
  description: string;
  exclusions: string[];
}

export interface PMOCMetadata {
  version: string;
  validity: {
    start: string;
    end: string;
  };
  art_rrt_trt: string;
  legal_basis: string[];
  disclosure_location: string;
  objective: string;           // Seção 1 - Objetivo
  scope: PMOCScope;            // Seção 2 - Abrangência
}

// ============================================
// Responsabilidades (Seção 3)
// ============================================

export interface ResponsibilityPerson {
  name: string;
  role: string;
  document?: string;
  crea?: string;
  phone?: string;
  email?: string;
  responsibilities: string[];
}

export interface InspectionAuthority {
  authority: string;
  responsibilities: string[];
}

export interface PMOCResponsibilities {
  legal: ResponsibilityPerson;
  technical: ResponsibilityPerson;
  inspection: InspectionAuthority;
}

// ============================================
// Operação e Controle
// ============================================

export interface OperationSetpoint {
  zone?: string;
  area?: string;
  schedule?: string;
  temp_setpoint_c?: number;
  temp_tolerance_c?: number;
  humidity_setpoint_pct?: number;
  humidity_tolerance_pct?: number;
  temp_c?: string | number;
  rh_percent?: string | number;
  pressure_pa?: string | number;
  oa_m3h_person?: string | number;
  notes?: string;
}

export interface FilterClassLevel {
  class: string;
  efficiency: string;
  application: string;
}

export interface FilterClassification {
  description: string;
  levels: FilterClassLevel[];
  minimum_external_air: string;
}

export interface OperationControl {
  minimum_oa_m3h_person: number;
  oa_filter_min_class: string;
  setpoints: OperationSetpoint[];
  filter_classification?: FilterClassification;
}

// ============================================
// Qualidade do Ar Interior (QAI)
// ============================================

export type QAIIndicatorStatus = 'OK' | 'ALERTA' | 'FORA' | 'N/A' | 'PENDENTE';
export type QAIOverallStatus = 'CONFORME' | 'NAO_CONFORME' | 'NAO_APLICAVEL' | 'NÃO INFORMADO' | 'PENDENTE';

export interface QAIIndicator {
  parameter?: string;
  name?: string;
  value?: string | number;
  measured_value?: string | number | null;
  unit?: string;
  limit?: string;
  reference?: string;
  status?: QAIIndicatorStatus;
  notes?: string;
}

export interface QAIMonitoringPlan {
  frequency: string;
  sampling_points: string;
  laboratory: string;
  next_scheduled: string | null;
}

export interface QAIMonthlyData {
  criterion: string;
  status: QAIOverallStatus;
  last_sampled_at: string | null;
  indicators: QAIIndicator[];
  monitoring_plan?: QAIMonitoringPlan;
}

export interface QAISemesterData {
  value: string | number | null;
  status: QAIIndicatorStatus;
}

export interface QAIAnnualIndicator {
  parameter?: string;
  name?: string;
  best?: string | number;
  worst?: string | number;
  unit?: string;
  limit?: string;
  reference?: string;
  status?: QAIIndicatorStatus;
  annual_status?: QAIIndicatorStatus;
  first_semester?: QAISemesterData;
  second_semester?: QAISemesterData;
  notes?: string;
}

export interface QAISummary {
  total_samples: number;
  conforming_samples: number;
  non_conforming_samples: number;
  pending_actions: string[];
}

export interface QAIAnnualData {
  criterion: string;
  annual_status: QAIOverallStatus;
  samples_count: number;
  indicators: QAIAnnualIndicator[];
  summary?: QAISummary;
}

// ============================================
// Anexos e Evidências
// ============================================

export type AnnexStatus = 'OK' | 'PENDENTE' | 'N/A';

export interface Annex {
  name: string;
  status: AnnexStatus;
  notes?: string;
}

// ============================================
// Equipamentos
// ============================================

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

export interface EquipmentItem {
  tag: string;
  name: string;
  type: string;
  manufacturer?: string;
  model?: string;
  serial_number?: string;
  capacity_btu: number | null;
  location: string;
  status: string;
  preventive_count: number;
  corrective_count: number;
  compliance_rate: number;
  mtbf_days?: number | null;
}

// ============================================
// Manutenção
// ============================================

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
  requests: { total: number };
  overall_compliance_rate: number;
}

export interface MaintenanceAnnualSummary {
  total_preventive: number;
  total_corrective: number;
  total_requests: number;
  total_work_orders: number;
  overall_compliance_rate: number;
  average_mttr_hours: number | null;
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

// ============================================
// Rotinas de Manutenção (Seção 6 do PMOC)
// ============================================

export interface MaintenanceRoutineTask {
  task: string;
  frequency: string;
  acceptance_criteria: string;
  evidence: string;
}

export interface MaintenanceRoutineGroup {
  equipment_types: string[];
  routines: MaintenanceRoutineTask[];
}

export interface MaintenanceRoutines {
  split_window: MaintenanceRoutineGroup;
  ahu_fancoil: MaintenanceRoutineGroup;
  cooling_towers: MaintenanceRoutineGroup;
  chillers: MaintenanceRoutineGroup;
}

// ============================================
// Comunicação aos Ocupantes (Seção 10)
// ============================================

export interface DisclosureMethod {
  method: string;
  content: string;
  location: string;
}

export interface EmergencyContacts {
  maintenance: string;
  technical_responsible: string;
  building_manager: string;
  fire_department: string;
  civil_defense: string;
}

export interface CommunicationPlan {
  disclosure_locations: string[];
  disclosure_methods: DisclosureMethod[];
  emergency_contacts: EmergencyContacts;
}

// ============================================
// Status de Conformidade
// ============================================

export interface ComplianceBreakdown {
  maintenance_score: number;
  maintenance_weight: number;
  qai_score: number;
  qai_weight: number;
}

export interface ComplianceStatus {
  overall_score: number;
  status: 'CONFORME' | 'PARCIALMENTE CONFORME' | 'NÃO CONFORME';
  color: 'green' | 'yellow' | 'red';
  breakdown: ComplianceBreakdown;
}

// ============================================
// Work Orders
// ============================================

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

// ============================================
// Responsável Técnico
// ============================================

export interface ResponsibleTechnician {
  name: string;
  crea: string;
  phone: string;
  email: string;
}

// ============================================
// KPIs e Conclusões
// ============================================

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

// ============================================
// Relatório PMOC Mensal
// ============================================

export interface PMOCMonthlyReport {
  report_type: 'PMOC_MENSAL';
  period: PMOCPeriod;
  generated_at: string;
  filters: PMOCReportFilters;
  
  // 0. Capa/Identificação do PMOC e Base Legal
  pmoc: PMOCMetadata;
  
  // 3. Responsabilidades
  responsibilities: PMOCResponsibilities;
  
  // 4. Estabelecimento
  establishment: EstablishmentInfo;
  
  // 5. Sistemas de Climatização
  climate_systems: ClimateSystemsSummary;
  
  // 6. Parâmetros de Operação e Controle
  operation: OperationControl;
  
  // 7. Plano de Manutenção - Rotinas detalhadas
  maintenance_routines: MaintenanceRoutines;
  
  // 8. Execução do Plano de Manutenção
  maintenance_summary: MaintenanceSummary;
  
  // 9. Controle de QAI
  qai: QAIMonthlyData;
  
  // 10. Anexos
  annexes: Annex[];
  
  // 11. Plano de Emergência
  emergency_plan: string[];
  
  // 12. Comunicação aos Ocupantes
  communication: CommunicationPlan;
  
  // 13. Status de Conformidade Geral
  compliance_status: ComplianceStatus;
  
  // Detalhamento
  equipment_list: EquipmentItem[];
  work_orders: WorkOrderItem[];
  responsible_technician: ResponsibleTechnician;
  observations: string[];
}

// ============================================
// Relatório PMOC Anual
// ============================================

export interface PMOCAnnualReport {
  report_type: 'PMOC_ANUAL';
  period: PMOCPeriod;
  generated_at: string;
  filters: PMOCReportFilters;
  
  // 0. Capa/Identificação do PMOC e Base Legal
  pmoc: PMOCMetadata;
  
  // 3. Responsabilidades
  responsibilities: PMOCResponsibilities;
  
  // 4. Estabelecimento
  establishment: EstablishmentInfo;
  
  // 5. Sistemas de Climatização
  climate_systems: ClimateSystemsSummary;
  
  // 6. Parâmetros de Operação e Controle
  operation: OperationControl;
  
  // 7. Plano de Manutenção - Rotinas detalhadas
  maintenance_routines: MaintenanceRoutines;
  
  // 8. Consolidado Anual de Manutenção
  maintenance_annual: MaintenanceAnnualSummary;
  
  // 9. Controle de QAI
  qai: QAIAnnualData;
  
  // 10. Breakdown Mensal
  monthly_breakdown: MonthlyBreakdownItem[];
  
  // 11. Performance por Equipamento
  equipment_performance: EquipmentItem[];
  
  // 12. KPIs
  kpis: PMOCKPIs;
  
  // 13. Planos de Manutenção Ativos
  maintenance_plans: MaintenancePlanItem[];
  
  // 14. Anexos
  annexes: Annex[];
  
  // 15. Plano de Emergência
  emergency_plan: string[];
  
  // 16. Comunicação aos Ocupantes
  communication: CommunicationPlan;
  
  // 17. Status de Conformidade Geral
  compliance_status: ComplianceStatus;
  
  // 18. Responsável Técnico
  responsible_technician: ResponsibleTechnician;
  
  // 19. Conclusões
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
