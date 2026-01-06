// ============================================================
// ClimaTrak Mobile - Type Definitions
// ============================================================

// ==================== Auth Types ====================
export interface User {
  id: string;
  email: string;
  name: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  avatar?: string;
  phone?: string;
  tenant_id: string;
  tenant_schema: string;
  is_active: boolean;
  created_at: string;
}

export type UserRole = 'owner' | 'admin' | 'manager' | 'technician' | 'viewer';

export interface Tenant {
  id: string;
  slug: string;
  name: string;
  schema_name: string;
  logo_url?: string;
  primary_color?: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  expires_in?: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface DiscoverTenantResponse {
  tenant_slug: string;
  tenant_name: string;
  tenant_id: string;
}

// ==================== Work Order Types ====================
export interface WorkOrder {
  id: string;
  number: string;
  title: string;
  description: string;
  type: WorkOrderType;
  priority: WorkOrderPriority;
  status: WorkOrderStatus;
  asset_id?: string;
  asset?: Asset;
  site_id?: string;
  site?: Site;
  assigned_to_id?: string;
  assigned_to?: User;
  created_by_id: string;
  created_by?: User;
  checklist_template_id?: string;
  checklist_template?: ChecklistTemplate;
  checklist_responses?: ChecklistResponse[];
  due_date?: string;
  started_at?: string;
  completed_at?: string;
  estimated_hours?: number;
  actual_hours?: number;
  photos: WorkOrderPhoto[];
  time_entries: TimeEntry[];
  part_usages: PartUsage[];
  external_costs: ExternalCost[];
  notes?: string;
  created_at: string;
  updated_at: string;
}

export type WorkOrderType = 'CORRECTIVE' | 'PREVENTIVE' | 'PREDICTIVE' | 'INSPECTION';
export type WorkOrderPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type WorkOrderStatus = 
  | 'OPEN' 
  | 'IN_PROGRESS' 
  | 'ON_HOLD' 
  | 'COMPLETED' 
  | 'CANCELLED' 
  | 'PENDING_REVIEW';

export interface WorkOrderPhoto {
  id: string;
  work_order_id: string;
  url: string;
  thumbnail_url?: string;
  caption?: string;
  taken_at?: string;
  created_at: string;
}

export interface TimeEntry {
  id: string;
  work_order_id: string;
  user_id: string;
  user?: User;
  hours: number;
  description?: string;
  date: string;
  hourly_rate?: number;
  created_at: string;
}

export interface PartUsage {
  id: string;
  work_order_id: string;
  inventory_item_id: string;
  inventory_item?: InventoryItem;
  quantity: number;
  unit_cost?: number;
  notes?: string;
  created_at: string;
}

export interface ExternalCost {
  id: string;
  work_order_id: string;
  description: string;
  amount: number;
  vendor?: string;
  invoice_number?: string;
  attachments?: string[];
  created_at: string;
}

export interface WorkOrderFilters {
  status?: WorkOrderStatus[];
  priority?: WorkOrderPriority[];
  type?: WorkOrderType[];
  assigned_to?: string;
  asset_id?: string;
  site_id?: string;
  search?: string;
  due_date_from?: string;
  due_date_to?: string;
}

export interface WorkOrderCostSummary {
  labor_cost: number;
  parts_cost: number;
  external_cost: number;
  total_cost: number;
}

// ==================== Asset Types ====================
export interface Asset {
  id: string;
  tag: string;
  name: string;
  model?: string;
  brand?: string;
  manufacturer?: string;
  serial_number?: string;
  type: string;
  capacity?: number;
  status: AssetStatus;
  criticality: AssetCriticality;
  site_id?: string;
  site?: Site;
  sector_id?: string;
  sector?: Sector;
  subsection_id?: string;
  subsection?: Subsection;
  install_date?: string;
  warranty_expiry?: string;
  qr_code?: string;
  photo_url?: string;
  notes?: string;
  specifications?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export type AssetStatus = 'OK' | 'MAINTENANCE' | 'STOPPED' | 'ALERT';
export type AssetCriticality = 'BAIXA' | 'MEDIA' | 'ALTA' | 'CRITICA';

export interface AssetFilters {
  status?: AssetStatus[];
  criticality?: AssetCriticality[];
  type?: string[];
  site_id?: string;
  sector_id?: string;
  search?: string;
}

// ==================== Site/Location Types ====================
export interface Site {
  id: string;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  timezone?: string;
  is_active: boolean;
  created_at: string;
}

export interface Sector {
  id: string;
  name: string;
  site_id: string;
  parent_id?: string;
}

export interface Subsection {
  id: string;
  name: string;
  sector_id: string;
  area?: number;
  occupants?: number;
  hvac_units?: number;
}

// ==================== Alert Types ====================
export interface Alert {
  id: string;
  rule_id: string;
  rule?: AlertRule;
  asset_id?: string;
  asset?: Asset;
  site_id?: string;
  site?: Site;
  sensor_id?: string;
  severity: AlertSeverity;
  status: AlertStatus;
  title: string;
  message: string;
  value?: number;
  threshold?: number;
  acknowledged_at?: string;
  acknowledged_by_id?: string;
  acknowledged_by?: User;
  resolved_at?: string;
  resolved_by_id?: string;
  resolved_by?: User;
  work_order_id?: string;
  work_order?: WorkOrder;
  created_at: string;
}

export type AlertSeverity = 'INFO' | 'WARNING' | 'CRITICAL';
export type AlertStatus = 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED';

export interface AlertRule {
  id: string;
  name: string;
  description?: string;
  condition: string;
  threshold?: number;
  severity: AlertSeverity;
  is_active: boolean;
}

export interface AlertFilters {
  status?: AlertStatus[];
  severity?: AlertSeverity[];
  asset_id?: string;
  site_id?: string;
  acknowledged?: boolean;
}

// ==================== Inventory Types ====================
export interface InventoryItem {
  id: string;
  name: string;
  sku?: string;
  description?: string;
  category_id?: string;
  category?: InventoryCategory;
  unit: string;
  quantity: number;
  min_quantity?: number;
  max_quantity?: number;
  unit_cost?: number;
  location?: string;
  photo_url?: string;
  is_active: boolean;
  created_at: string;
}

export interface InventoryCategory {
  id: string;
  name: string;
  parent_id?: string;
  description?: string;
}

// ==================== Checklist Types ====================
export interface ChecklistTemplate {
  id: string;
  name: string;
  description?: string;
  category_id?: string;
  category?: ChecklistCategory;
  steps: ChecklistStep[];
  is_active: boolean;
  created_at: string;
}

export interface ChecklistCategory {
  id: string;
  name: string;
  description?: string;
}

export interface ChecklistStep {
  id: string;
  order: number;
  title: string;
  description?: string;
  type: ChecklistStepType;
  required: boolean;
  options?: string[]; // For SELECT type
  unit?: string; // For NUMBER type
  min_value?: number;
  max_value?: number;
}

export type ChecklistStepType = 
  | 'CHECKBOX' 
  | 'TEXT' 
  | 'NUMBER' 
  | 'SELECT' 
  | 'PHOTO' 
  | 'SIGNATURE';

export interface ChecklistResponse {
  step_id: string;
  value: string | number | boolean;
  photo_url?: string;
  notes?: string;
  completed_at: string;
}

// ==================== API Response Types ====================
export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface ApiError {
  error?: string;
  detail?: string;
  message?: string;
  code?: string;
  field_errors?: Record<string, string[]>;
}

// ==================== Sync Types (Offline) ====================
export interface SyncQueueItem {
  id: string;
  entity_type: 'work_order' | 'time_entry' | 'part_usage' | 'photo' | 'checklist_response';
  entity_id?: string;
  action: 'create' | 'update' | 'delete';
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  endpoint: string;
  payload: Record<string, unknown>;
  idempotency_key: string;
  tenant_slug: string;
  created_at: string;
  retry_count: number;
  last_attempt?: string;
  last_error?: string;
  status: 'pending' | 'in_progress' | 'failed' | 'completed';
}

export interface SyncStatus {
  is_syncing: boolean;
  pending_count: number;
  failed_count: number;
  last_sync_at?: string;
  last_error?: string;
}

// ==================== Navigation Types ====================
export type RootStackParamList = {
  '(auth)': undefined;
  '(tabs)': undefined;
  'work-order/[id]': { id: string };
  'asset/[id]': { id: string };
  'alert/[id]': { id: string };
  'scanner': undefined;
  'new-work-order': { asset_id?: string; alert_id?: string };
};

export type TabParamList = {
  home: undefined;
  'work-orders': undefined;
  assets: undefined;
  alerts: undefined;
  settings: undefined;
};
