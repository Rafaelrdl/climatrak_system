export type MovementType = 'entrada' | 'saida';

export interface InventoryCategory {
  id: string;
  code: string;
  name: string;
  description?: string;
  parent_id?: string | null;
  color?: string;
  icon?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface InventoryItem {
  id: string;
  code: string;
  name: string;
  manufacturer?: string;
  description?: string;
  sku?: string;
  barcode?: string;
  category_id: string | null;
  category_name?: string | null;
  unit: string;
  photo_url?: string | null;
  image_url?: string | null;
  location_name?: string;
  location?: string;
  shelf?: string;
  bin?: string;
  qty_on_hand: number;
  quantity: number;
  min_qty: number;
  minimum_quantity: number;
  max_qty?: number;
  maximum_quantity?: number;
  reorder_point: number;
  unit_cost: number;
  supplier?: string;
  supplier_code?: string;
  is_active: boolean;
  is_critical: boolean;
  is_low_stock?: boolean;
  stock_status?: 'OK' | 'LOW' | 'OUT_OF_STOCK' | 'OVERSTOCKED';
  last_movement_at?: string;
  created_at: string;
  updated_at: string;
}

export interface InventoryMovement {
  id: string;
  item_id: string;
  movement_type: MovementType;
  qty: number;
  note?: string;
  reference_id?: string;
  unit_cost?: number;
  created_at: string;
  created_by: string;
}

export interface ConsumptionByCategory {
  category_id: string;
  category_name: string;
  total_consumed: number;
}

export type AnalysisRange = '30d' | '90d' | '12m';