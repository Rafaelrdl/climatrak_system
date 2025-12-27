/**
 * Tipos de resposta da API Django REST Framework
 * 
 * Este arquivo contém as interfaces TypeScript que correspondem
 * aos modelos Django e respostas da API REST.
 */

/**
 * Resposta paginada padrão do Django REST Framework
 */
export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

/**
 * Site (localização física dos equipamentos)
 * Corresponde ao model Site em apps/assets/models.py
 */
export interface ApiSite {
  id: number;
  name: string;
  full_name: string;
  company: string;
  sector: string;
  subsector: string;
  address: string;
  latitude: string | null;
  longitude: string | null;
  timezone: string;
  asset_count: number;
  created_at: string;
  updated_at: string;
}

/**
 * Asset (equipamento HVAC)
 * Corresponde ao model Asset em apps/assets/models.py
 */
export interface ApiAsset {
  id: number;
  tag: string;
  name: string;
  site: number;
  site_name: string;
  full_location: string;
  asset_type: 
    | 'AHU' 
    | 'CHILLER' 
    | 'VRF' 
    | 'RTU' 
    | 'BOILER' 
    | 'COOLING_TOWER'
    | 'FAN_COIL'
    | 'PUMP'
    | 'AHU_COMPACTO'
    | 'SPLIT'
    | 'VAV'
    | 'HEAT_EXCHANGER'
    | 'DAMPER'
    | 'HUMIDIFIER'
    | 'DEHUMIDIFIER';
  asset_type_other: string | null;
  manufacturer: string;
  model: string;
  serial_number: string;
  location_description: string;
  installation_date: string | null;
  last_maintenance: string | null;
  status: 'OK' | 'MAINTENANCE' | 'STOPPED' | 'ALERT';
  health_score: number;
  specifications: Record<string, any>;
  device_count: number;
  sensor_count: number;
  created_at: string;
  updated_at: string;
}

/**
 * Device (dispositivo IoT/sensor físico)
 */
export interface ApiDevice {
  id: number;
  device_id: string;
  name: string;
  asset: number;
  asset_name: string;
  device_type: 'KHOMP' | 'MODBUSRTU' | 'MODBUSTCP' | 'MQTT' | 'API' | 'OTHER';
  protocol: string;
  firmware_version: string;
  hardware_version: string;
  is_online: boolean;
  last_seen: string | null;
  configuration: Record<string, any>;
  sensor_count: number;
  created_at: string;
  updated_at: string;
}

/**
 * Sensor (ponto de telemetria)
 */
export interface ApiSensor {
  id: number;
  sensor_id: string;
  name: string;
  device: number;
  device_name: string;
  sensor_type: 'TEMPERATURE' | 'HUMIDITY' | 'PRESSURE' | 'VIBRATION' | 'CURRENT' | 'VOLTAGE' | 'POWER' | 'FLOW' | 'LEVEL' | 'SPEED' | 'STATE' | 'OTHER';
  unit: string;
  min_value: number | null;
  max_value: number | null;
  alert_threshold_low: number | null;
  alert_threshold_high: number | null;
  description: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Telemetry (leitura de sensor)
 */
export interface ApiTelemetry {
  id: number;
  sensor: number;
  sensor_name: string;
  value: number;
  unit: string;
  quality: 'GOOD' | 'UNCERTAIN' | 'BAD';
  timestamp: string;
  raw_data: Record<string, any> | null;
}

/**
 * Alert (alerta gerado pelo sistema)
 */
export interface ApiAlert {
  id: number;
  sensor: number;
  sensor_name: string;
  asset_name: string;
  site_name: string;
  alert_type: 'HIGH_VALUE' | 'LOW_VALUE' | 'OFFLINE' | 'MAINTENANCE_DUE' | 'SYSTEM';
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  message: string;
  value: number | null;
  threshold: number | null;
  acknowledged: boolean;
  acknowledged_by: string | null;
  acknowledged_at: string | null;
  resolved: boolean;
  resolved_at: string | null;
  created_at: string;
}

/**
 * Rule (regra de alerta)
 */
export interface ApiRule {
  id: number;
  name: string;
  description: string;
  sensor: number | null;
  sensor_name: string | null;
  asset: number | null;
  asset_name: string | null;
  condition_type: 'GT' | 'GTE' | 'LT' | 'LTE' | 'EQ' | 'NEQ' | 'BETWEEN' | 'OUTSIDE';
  threshold_value: number;
  threshold_value_2: number | null;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  is_active: boolean;
  cooldown_minutes: number;
  notification_channels: string[];
  created_at: string;
  updated_at: string;
}

/**
 * User (usuário do sistema)
 */
export interface ApiUser {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  role: 'OWNER' | 'ADMIN' | 'MANAGER' | 'TECHNICIAN' | 'VIEWER';
  avatar_url: string | null;
  avatar?: string | null;
  phone: string | null;
  is_active: boolean;
  last_login: string | null;
  updated_at?: string | null;
  created_at: string;
}

/**
 * Auth Response
 */
export interface AuthResponse {
  user: ApiUser;
  tenant: {
    id: string;
    slug: string;
    name: string;
    api_base_url?: string;
    domain?: string;
  };
  message?: string;
  access_token?: string; // Only if not using HttpOnly cookies
  refresh_token?: string; // Only if not using HttpOnly cookies
}

/**
 * Login Request
 */
export interface LoginRequest {
  email: string;
  password: string;
}

/**
 * Error Response
 */
export interface ApiError {
  detail: string;
  code?: string;
  errors?: Record<string, string[]>;
}

// ============================================
// CMMS Types (Work Orders, Requests, Plans)
// ============================================

/**
 * Checklist Item (parte de um template)
 */
export interface ApiChecklistItem {
  id: string;
  question: string;
  type: 'TEXT' | 'NUMBER' | 'BOOLEAN' | 'MULTIPLE_CHOICE';
  options?: string[];
  required: boolean;
}

/**
 * Checklist Response (resposta a um item)
 */
export interface ApiChecklistResponse {
  item_id: string;
  question: string;
  response: string | number | boolean;
  observations?: string;
}

/**
 * Photo attached to Work Order
 */
export interface ApiPhoto {
  id: number;
  file: string;
  caption: string;
  uploaded_by: number | null;
  uploaded_by_name: string | null;
  created_at: string;
}

/**
 * Stock item used in Work Order
 */
export interface ApiWorkOrderItem {
  id: number;
  item: number;
  item_name: string;
  item_sku: string;
  quantity: number;
  unit: string;
}

/**
 * Work Order (Ordem de Serviço)
 */
export interface ApiWorkOrder {
  id: number;
  number: string;
  asset: number;
  asset_tag: string;
  asset_name: string;
  site_name: string;
  type: 'PREVENTIVE' | 'CORRECTIVE' | 'EMERGENCY' | 'REQUEST';
  status: 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  scheduled_date: string;
  started_at: string | null;
  completed_at: string | null;
  assigned_to: number | null;
  assigned_to_name: string | null;
  execution_description: string | null;
  estimated_hours: number | null;
  actual_hours: number | null;
  checklist_template: number | null;
  checklist_responses: ApiChecklistResponse[];
  photos: ApiPhoto[];
  items: ApiWorkOrderItem[];
  created_by: number | null;
  created_by_name: string | null;
  maintenance_plan: number | null;
  request: number | null;
  created_at: string;
  updated_at: string;
}

/**
 * Request Item (item de estoque na solicitação)
 */
export interface ApiRequestItem {
  id: number;
  item: number;
  item_name: string;
  item_sku: string;
  quantity: number;
  unit: string;
}

/**
 * Status change history
 */
export interface ApiStatusChange {
  from_status: string | null;
  to_status: string;
  changed_at: string;
  changed_by: number | null;
  changed_by_name: string | null;
}

/**
 * Request (Solicitação de Manutenção)
 */
export interface ApiRequest {
  id: number;
  number: string;
  sector: number;
  sector_name: string;
  subsection: number | null;
  subsection_name: string | null;
  asset: number | null;
  asset_tag: string | null;
  asset_name: string | null;
  requester: number;
  requester_name: string;
  status: 'NEW' | 'TRIAGING' | 'CONVERTED' | 'REJECTED';
  note: string;
  items: ApiRequestItem[];
  status_history: ApiStatusChange[];
  work_order: number | null;
  work_order_number: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Maintenance Plan (Plano de Manutenção)
 */
export interface ApiMaintenancePlan {
  id: number;
  name: string;
  description: string;
  frequency: 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'SEMI_ANNUAL' | 'ANNUAL';
  is_active: boolean;
  assets: number[];
  asset_tags: string[];
  asset_names: string[];
  checklist_template: number | null;
  checklist_template_name: string | null;
  next_execution: string | null;
  last_execution: string | null;
  auto_generate: boolean;
  work_orders_generated: number;
  created_at: string;
  updated_at: string;
}

// ============================================
// Inventory Types
// ============================================

/**
 * Inventory Category
 */
export interface ApiInventoryCategory {
  id: number;
  name: string;
  code: string;
  description: string;
  parent: number | null;
  parent_name: string | null;
  full_path: string;
  icon: string;
  color: string;
  is_active: boolean;
  item_count: number;
  children?: ApiInventoryCategory[];
  created_at: string;
  updated_at: string;
}

/**
 * Inventory Item
 */
export interface ApiInventoryItem {
  id: number;
  code: string;
  name: string;
  manufacturer: string;
  description: string;
  barcode: string;
  category: number | null;
  category_name: string | null;
  unit: 'UN' | 'PC' | 'KG' | 'L' | 'M' | 'CX' | 'PCT' | 'JG';
  unit_display: string;
  quantity: number;
  min_quantity: number;
  max_quantity: number | null;
  reorder_point: number | null;
  unit_cost: number;
  last_purchase_cost: number | null;
  total_value: number;
  location: string;
  shelf: string;
  bin: string;
  supplier: string;
  supplier_code: string;
  lead_time_days: number | null;
  image: string | null;
  image_url: string | null;
  is_active: boolean;
  is_critical: boolean;
  is_low_stock: boolean;
  is_out_of_stock: boolean;
  needs_reorder: boolean;
  stock_status: 'OK' | 'LOW' | 'OUT_OF_STOCK' | 'OVERSTOCKED';
  notes: string;
  created_at: string;
  updated_at: string;
}

/**
 * Inventory Movement
 */
export interface ApiInventoryMovement {
  id: number;
  item: number;
  item_code: string;
  item_name: string;
  type: 'IN' | 'OUT' | 'ADJUSTMENT' | 'TRANSFER' | 'RETURN';
  type_display: string;
  reason: 'PURCHASE' | 'WORK_ORDER' | 'ADJUSTMENT' | 'DAMAGE' | 'EXPIRY' | 'RETURN_SUPPLIER' | 'RETURN_STOCK' | 'TRANSFER' | 'OTHER';
  reason_display: string;
  quantity: number;
  quantity_before: number;
  quantity_after: number;
  unit_cost: number | null;
  total_value: number | null;
  work_order: number | null;
  work_order_number: string | null;
  reference: string;
  invoice_number: string;
  note: string;
  performed_by: number;
  performed_by_name: string;
  created_at: string;
}

// ============================================
// Location Types (Companies, Sectors, Subsections)
// ============================================

/**
 * Company (Empresa)
 */
export interface ApiCompany {
  id: number;
  name: string;
  code?: string;
  description?: string;
  is_active?: boolean;
  // Campos de localização
  cnpj?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  phone?: string;
  email?: string;
  // Campos de responsável (podem vir de diferentes fontes)
  manager?: number;
  manager_name?: string;
  responsible_name?: string;
  responsible_role?: string;
  // Campos operacionais (podem não existir no backend)
  segment?: string;
  total_area?: number;
  occupants?: number;
  hvac_units?: number;
  notes?: string;
  // Contadores
  sector_count?: number;
  asset_count?: number;
  // Timestamps
  created_at?: string;
  updated_at?: string;
}

/**
 * Sector (Setor)
 */
export interface ApiSector {
  id: number;
  name: string;
  code?: string;
  description?: string;
  is_active?: boolean;
  company: number;
  company_name?: string;
  // Campos de responsável
  supervisor?: number;
  supervisor_name?: string;
  responsible_name?: string;
  responsible_phone?: string;
  responsible_email?: string;
  // Localização física
  floor?: string;
  building?: string;
  area?: number | string;
  occupants?: number;
  hvac_units?: number;
  notes?: string;
  // Contadores
  subsection_count?: number;
  asset_count?: number;
  // Timestamps
  created_at?: string;
  updated_at?: string;
}

/**
 * Subsection (Subsetor)
 */
export interface ApiSubsection {
  id: number;
  name: string;
  code?: string;
  description?: string;
  is_active?: boolean;
  sector: number;
  sector_name?: string;
  company_name?: string;
  company_id?: number;
  // Campos de responsável
  responsible_name?: string;
  phone?: string;
  email?: string;
  // Localização física
  position?: string;
  reference?: string;
  area?: number | string;
  occupants?: number;
  hvac_units?: number;
  notes?: string;
  // Contadores
  asset_count?: number;
  // Timestamps
  created_at?: string;
  updated_at?: string;
}

/**
 * Location Tree Node
 */
export interface ApiLocationNode {
  id: number;
  name: string;
  type: 'company' | 'sector' | 'subsection';
  parent_id: number | null;
  children: ApiLocationNode[];
  asset_count: number;
}

// ============================================
// Metrics & Reports Types
// ============================================

/**
 * Dashboard KPIs
 */
export interface ApiDashboardKPIs {
  open_work_orders: number;
  overdue_work_orders: number;
  in_progress_work_orders: number;
  completed_this_month: number;
  critical_assets: number;
  maintenance_due_count: number;
  mttr_hours: number;
  mtbf_hours: number;
  preventive_compliance: number; // percentage
  backlog_rate: number; // percentage
}

/**
 * Time series data point
 */
export interface ApiTimeSeriesPoint {
  date: string;
  value: number;
}

/**
 * Metrics response
 */
export interface ApiMetricsResponse {
  kpis: ApiDashboardKPIs;
  work_orders_by_day: ApiTimeSeriesPoint[];
  work_orders_by_type: {
    preventive: number;
    corrective: number;
    emergency: number;
  };
  mttr_by_sector: {
    sector_name: string;
    mttr_hours: number;
  }[];
  backlog_trend: ApiTimeSeriesPoint[];
  top_assets_by_work_orders: {
    asset_id: number;
    asset_tag: string;
    work_order_count: number;
  }[];
}

/**
 * Technician Performance
 */
export interface ApiTechnicianPerformance {
  user_id: number;
  user_name: string;
  preventive_count: number;
  corrective_count: number;
  emergency_count: number;
  total_hours: number;
  avg_completion_time: number;
}

// ============================================
// Procedures Types
// ============================================

/**
 * Procedure Category
 */
export interface ApiProcedureCategory {
  id: number;
  name: string;
  description: string;
  color: string;
  procedures_count: number;
  created_at: string;
  updated_at: string;
}

/**
 * Procedure Version
 */
export interface ApiProcedureVersion {
  id: number;
  version_number: number;
  changelog: string;
  file: string | null;
  file_type: 'PDF' | 'MARKDOWN' | 'DOCX';
  created_by: number;
  created_by_name: string;
  created_at: string;
}

/**
 * Procedure List Item (listagem simplificada)
 */
export interface ApiProcedureListItem {
  id: number;
  title: string;
  category: number | null;
  category_name: string | null;
  category_color: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'DRAFT' | 'ARCHIVED';
  file_type: 'PDF' | 'MARKDOWN' | 'DOCX';
  file: string;
  version: number;
  versions_count: number;
  is_active: boolean;
  view_count: number;
  tags: string[];
  created_by: number;
  created_by_name: string;
  created_at: string;
  updated_at: string;
}

/**
 * Procedure Detail (detalhes completos)
 */
export interface ApiProcedure {
  id: number;
  title: string;
  description: string;
  category: number | null;
  category_name: string | null;
  category_color: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'DRAFT' | 'ARCHIVED';
  file_type: 'PDF' | 'MARKDOWN' | 'DOCX';
  file: string;
  version: number;
  versions: ApiProcedureVersion[];
  tags: string[];
  view_count: number;
  is_active: boolean;
  created_by: number;
  created_by_name: string;
  created_at: string;
  updated_at: string;
}

/**
 * Procedure Stats
 */
export interface ApiProcedureStats {
  total: number;
  by_status: {
    active: number;
    inactive: number;
    draft: number;
    archived: number;
  };
  by_type: {
    pdf: number;
    markdown: number;
    docx: number;
  };
  by_category: Record<string, number>;
}

// ============================================
// Help Center Types
// ============================================

/**
 * Help Category
 */
export interface ApiHelpCategory {
  id: number;
  name: string;
  description: string;
  icon: string;
  content_count: number;
  order: number;
}

/**
 * Help Content
 */
export interface ApiHelpContent {
  id: number;
  title: string;
  slug: string;
  category: number;
  category_name: string;
  content_type: 'ARTICLE' | 'VIDEO' | 'FAQ' | 'TUTORIAL';
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  content: string; // Markdown or HTML
  video_url: string | null;
  duration_minutes: number | null;
  tags: string[];
  is_featured: boolean;
  is_popular: boolean;
  view_count: number;
  like_count: number;
  created_at: string;
  updated_at: string;
}

/**
 * User Progress on Help Content
 */
export interface ApiHelpProgress {
  content_id: number;
  completed: boolean;
  completed_at: string | null;
  bookmarked: boolean;
  liked: boolean;
}

// ============================================================================
// INVENTORY TYPES
// ============================================================================

/**
 * Inventory Category
 * Corresponde ao model InventoryCategory em apps/inventory/models.py
 */
export interface ApiInventoryCategory {
  id: number;
  name: string;
  code: string | null;
  description: string;
  parent: number | null;
  parent_name: string | null;
  is_active: boolean;
  children: ApiInventoryCategory[];
  items_count: number;
  created_at: string;
  updated_at: string;
}

/**
 * Inventory Item
 * Corresponde ao model InventoryItem em apps/inventory/models.py
 */
export interface ApiInventoryItem {
  id: number;
  code: string;
  name: string;
  description: string;
  category: number;
  category_name: string;
  unit: string;
  quantity: number;
  minimum_quantity: number;
  unit_cost: number;
  total_cost: number;
  is_active: boolean;
  location: string;
  supplier: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

/**
 * Inventory Movement
 * Corresponde ao model InventoryMovement em apps/inventory/models.py
 */
export interface ApiInventoryMovement {
  id: number;
  type: 'IN' | 'OUT' | 'ADJUSTMENT' | 'TRANSFER' | 'RETURN';
  type_display: string;
  reason: string;
  reason_display: string;
  item: number;
  item_name: string;
  item_code: string;
  quantity: number;
  quantity_before: number;
  quantity_after: number;
  unit_cost: number | null;
  total_cost: number | null;
  total_value: number | null;
  work_order: number | null;
  work_order_number: string | null;
  reference: string;
  invoice_number: string;
  note: string;
  performed_by: number;
  performed_by_name: string;
  created_at: string;
}
