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
// Service Assignment Types
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
