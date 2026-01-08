/**
 * TrakService Types
 * 
 * TypeScript interfaces for TrakService API entities.
 */

// =============================================================================
// Technician Types
// =============================================================================

export interface TechnicianUser {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
}

export interface TechnicianProfile {
  id: string;
  user: TechnicianUser;
  full_name: string;
  phone: string;
  skills: string[];
  work_start_time: string;
  work_end_time: string;
  is_active: boolean;
  allow_tracking: boolean;
  created_at: string;
  updated_at: string;
}

export interface TechnicianListItem {
  id: string;
  full_name: string;
  email: string;
  is_active: boolean;
}

export interface TechnicianCreateInput {
  user_id: number;
  phone?: string;
  skills?: string[];
  work_start_time?: string;
  work_end_time?: string;
  is_active?: boolean;
  allow_tracking?: boolean;
}

// =============================================================================
// Service Assignment Types (Issue 04 - Dispatch)
// =============================================================================

export type AssignmentStatus = 
  | 'scheduled' 
  | 'en_route' 
  | 'on_site' 
  | 'done' 
  | 'canceled';

export interface ServiceAssignment {
  id: string;
  work_order: number;
  work_order_number: string;
  work_order_description: string;
  work_order_priority: string;
  work_order_status: string;
  asset_name: string;
  asset_location: string | null;
  technician: TechnicianListItem;
  scheduled_date: string;
  scheduled_start: string | null;
  scheduled_end: string | null;
  status: AssignmentStatus;
  status_display: string;
  departed_at: string | null;
  arrived_at: string | null;
  completed_at: string | null;
  canceled_at: string | null;
  notes: string;
  cancellation_reason: string;
  created_by: number | null;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface AssignmentCreateInput {
  work_order: number;
  technician: string;
  scheduled_date: string;
  scheduled_start?: string;
  scheduled_end?: string;
  notes?: string;
}

export interface AssignmentUpdateInput {
  technician?: string;
  scheduled_date?: string;
  scheduled_start?: string;
  scheduled_end?: string;
  notes?: string;
}

export interface AssignmentStatusInput {
  status: AssignmentStatus;
  reason?: string;
}

// =============================================================================
// Location/Tracking Types (Issue 05 - Tracking)
// =============================================================================

export interface LocationPing {
  id: string;
  technician_id: string;
  technician_name: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude?: number;
  speed?: number;
  heading?: number;
  address?: string;
  source: 'gps' | 'network' | 'passive';
  recorded_at: string;
  created_at: string;
}

export type TechnicianStatus = 
  | 'online' 
  | 'offline' 
  | 'moving' 
  | 'stationary' 
  | 'at_site' 
  | 'inactive';

export interface TechnicianLocation {
  technician_id: string;
  technician_name: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  last_seen_at: string;
  last_known_address?: string;
  status: TechnicianStatus;
  is_within_work_window: boolean;
  vehicle_plate?: string;
  battery_level?: number;
}

export interface LocationHistory {
  technician_id: string;
  technician_name: string;
  date: string;
  pings: LocationPing[];
  total_distance_km: number;
}

export interface PaginatedLocationHistory {
  count: number;
  next: string | null;
  previous: string | null;
  results: LocationPing[];
}

export interface TrackingFilters {
  technician_id?: string;
  date?: string;
  date_from?: string;
  date_to?: string;
}

export interface TrackingSummary {
  total_technicians: number;
  active_technicians: number;
  online: number;
  offline: number;
  in_field: number;
  on_site: number;
  en_route: number;
  moving: number;
  at_site: number;
  average_accuracy?: number;
}

// =============================================================================
// Routing Types (Issue 06 - Roteirização)
// =============================================================================

export type RouteStatus = 'pending' | 'optimized' | 'in_progress' | 'completed' | 'cancelled';

export type StopStatus = 'pending' | 'in_progress' | 'arrived' | 'completed' | 'skipped';

export interface RouteStop {
  id: string;
  sequence: number;
  assignment_id: string;
  work_order_number: string;
  location_name: string;
  asset_name: string;
  address: string;
  latitude: number;
  longitude: number;
  estimated_arrival: string | null;
  actual_arrival: string | null;
  estimated_duration: number; // minutes
  estimated_duration_minutes: number;
  distance_from_previous_km: number;
  status: StopStatus;
}

export interface DailyRoute {
  id: string;
  technician_id: string;
  technician_name: string;
  date: string;
  route_date: string;
  vehicle?: string;
  status: RouteStatus;
  stops: RouteStop[];
  total_stops: number;
  completed_stops: number;
  total_distance: number; // km
  total_duration: number; // minutes
  estimated_km: number;
  actual_km: number | null;
  estimated_duration_minutes: number;
  start_time: string | null;
  end_time: string | null;
  created_at: string;
  updated_at: string;
}

export interface RouteOptimizeInput {
  technician_id?: string;
  date?: string;
  start_latitude?: number;
  start_longitude?: number;
  optimize_for?: 'distance' | 'time';
}

export interface RouteFilters {
  technician_id?: string;
  date?: string;
  date_from?: string;
  date_to?: string;
  status?: RouteStatus;
  search?: string;
}

// =============================================================================
// Mileage/KM Types (Issue 06 - KM)
// =============================================================================

export interface KmSummary {
  total_km_reported: number;
  total_km_tracked: number;
  total_cost: number;
  average_per_technician: number;
  total_routes: number;
  variance_percent: number;
}

export interface KmReport {
  technician_id: string;
  technician_name: string;
  vehicle_plate?: string;
  total_routes: number;
  km_reported: number;
  km_tracked: number;
  period_start?: string;
  period_end?: string;
}

export interface PaginatedKmReport {
  count: number;
  next: string | null;
  previous: string | null;
  results: KmReport[];
}

export interface KmFilters {
  technician_id?: string;
  start_date?: string;
  end_date?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
}

// =============================================================================
// Quote Types (Issue 07 - Orçamentos)
// =============================================================================

export type QuoteStatus = 'draft' | 'sent' | 'approved' | 'rejected' | 'expired';
export type QuoteItemType = 'service' | 'material';

export interface QuoteItem {
  id: string;
  type: 'labor' | 'part' | 'service';
  item_type: QuoteItemType;
  catalog_item_id: string | null;
  code: string;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total: number;
  total_price: number;
}

export interface Quote {
  id: string;
  number: string;
  work_order_id: string | null;
  work_order_number: string | null;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  status: QuoteStatus;
  status_display: string;
  valid_until: string;
  items: QuoteItem[];
  subtotal: number;
  subtotal_services: number;
  subtotal_materials: number;
  discount: number;
  discount_percent: number;
  discount_amount: number;
  tax: number;
  total: number;
  notes: string;
  internal_notes: string;
  sent_at: string | null;
  approved_at: string | null;
  approved_by_id: string | null;
  rejected_at: string | null;
  rejection_reason: string;
  created_by_id: string | null;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
  finance_result?: {
    success: boolean;
    transactions_created: number;
  };
}

export interface QuoteCreateInput {
  work_order_id?: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  valid_until: string;
  notes?: string;
  internal_notes?: string;
}

export interface QuoteUpdateInput {
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  valid_until?: string;
  discount_percent?: number;
  notes?: string;
  internal_notes?: string;
}

export interface QuoteItemInput {
  type: 'labor' | 'part' | 'service';
  item_type?: QuoteItemType;
  catalog_item_id?: string;
  code?: string;
  description: string;
  quantity: number;
  unit?: string;
  unit_price: number;
}

export interface QuoteSendInput {
  notify_customer?: boolean;
}

export interface QuoteApproveInput {
  notes?: string;
}

export interface QuoteRejectInput {
  reason: string;
}

export interface QuoteFilters {
  status?: QuoteStatus | QuoteStatus[];
  work_order_id?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
}

export interface QuoteSummary {
  total: number;
  draft: number;
  sent: number;
  approved: number;
  rejected: number;
  expired: number;
  total_value: number;
  total_value_approved: number;
  approved_value: number;
  conversion_rate: number;
}

// =============================================================================
// Service Catalog Types
// =============================================================================

export interface ServiceCatalogItem {
  id: string;
  code: string;
  name: string;
  description: string;
  type: 'labor' | 'part' | 'service';
  item_type: QuoteItemType;
  unit: string;
  default_price: number;
  is_active: boolean;
}

// =============================================================================
// Filter Types
// =============================================================================

export interface AssignmentFilters {
  date?: string;
  date_from?: string;
  date_to?: string;
  technician_id?: string;
  work_order_id?: number;
  status?: AssignmentStatus | AssignmentStatus[];
  search?: string;
}

export interface TechnicianFilters {
  is_active?: boolean;
  search?: string;
}

// =============================================================================
// Summary Types
// =============================================================================

export interface DailySummary {
  total: number;
  scheduled: number;
  en_route: number;
  on_site: number;
  done: number;
  canceled: number;
}
