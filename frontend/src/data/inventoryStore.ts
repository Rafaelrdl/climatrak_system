import type { 
  InventoryItem, 
  InventoryCategory, 
  InventoryMovement, 
  ConsumptionByCategory, 
  AnalysisRange,
  MovementType 
} from '@/models/inventory';
import { appStorage, STORAGE_KEYS, type StorageKey } from '@/lib/storage';

// Seed data
const MOCK_CATEGORIES: InventoryCategory[] = [
  { id: '1', code: 'FLT', name: 'Filtros', color: '#3B82F6', is_active: true, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
  { id: '2', code: 'REF', name: 'Refrigerantes', color: '#10B981', is_active: true, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
  { id: '3', code: 'LUB', name: 'Lubrificantes', color: '#F59E0B', is_active: true, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
  { id: '4', code: 'ELE', name: 'Peças Elétricas', color: '#8B5CF6', is_active: true, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
  { id: '5', code: 'COR', name: 'Correias/Polias', color: '#EF4444', is_active: true, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
  { id: '6', code: 'VED', name: 'Vedações', color: '#06B6D4', is_active: true, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
  { id: '7', code: 'SEN', name: 'Sensores', color: '#84CC16', is_active: true, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
  { id: '8', code: 'FER', name: 'Ferramentas', color: '#F97316', is_active: true, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' }
];

const MOCK_ITEMS: InventoryItem[] = [
  {
    id: '1',
    code: 'FLT-G4-610',
    name: 'Filtro de Ar G4 - 610x610x48mm',
    sku: 'FLT-G4-610',
    category_id: '1',
    unit: 'un',
    photo_url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=150&h=150&fit=crop&crop=center',
    location_name: 'Prateleira A-1',
    qty_on_hand: 25,
    quantity: 25,
    reorder_point: 10,
    min_qty: 5,
    minimum_quantity: 5,
    max_qty: 50,
    unit_cost: 45.00,
    is_active: true,
    is_critical: false,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-20T10:30:00Z',
    last_movement_at: '2024-01-20T10:30:00Z'
  },
  {
    id: '2',
    code: 'REF-R410A',
    name: 'Gás Refrigerante R-410A - Cilindro 13.6kg',
    sku: 'REF-R410A',
    category_id: '2',
    unit: 'cilindro',
    photo_url: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=150&h=150&fit=crop&crop=center',
    location_name: 'Depósito B-3',
    qty_on_hand: 8,
    quantity: 8,
    reorder_point: 5,
    min_qty: 3,
    minimum_quantity: 3,
    max_qty: 20,
    unit_cost: 850.00,
    is_active: true,
    is_critical: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-18T14:15:00Z',
    last_movement_at: '2024-01-18T14:15:00Z'
  },
  {
    id: '3',
    code: 'OIL-POE68',
    name: 'Óleo Lubrificante POE 68 - Galão 5L',
    sku: 'OIL-POE68',
    category_id: '3',
    unit: 'galão',
    photo_url: 'https://images.unsplash.com/photo-1563298723-dcfebaa392e3?w=150&h=150&fit=crop&crop=center',
    location_name: 'Armário C-2',
    qty_on_hand: 12,
    quantity: 12,
    reorder_point: 6,
    min_qty: 4,
    minimum_quantity: 4,
    max_qty: 24,
    unit_cost: 125.00,
    is_active: true,
    is_critical: false,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-15T09:20:00Z',
    last_movement_at: '2024-01-15T09:20:00Z'
  },
  {
    id: '4',
    code: 'BLT-A43',
    name: 'Correia V - A43',
    sku: 'BLT-A43',
    category_id: '5',
    unit: 'un',
    photo_url: 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=150&h=150&fit=crop&crop=center',
    location_name: 'Gaveta D-5',
    qty_on_hand: 15,
    quantity: 15,
    reorder_point: 8,
    min_qty: 5,
    minimum_quantity: 5,
    max_qty: 30,
    unit_cost: 35.50,
    is_active: true,
    is_critical: false,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-19T16:45:00Z'
  },
  {
    id: '5',
    code: 'FUS-15A',
    name: 'Fusível 15A - Cerâmico',
    sku: 'FUS-15A',
    category_id: '4',
    unit: 'un',
    photo_url: 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=150&h=150&fit=crop&crop=center',
    location_name: 'Caixa E-1',
    qty_on_hand: 3,
    quantity: 3,
    reorder_point: 10,
    min_qty: 5,
    minimum_quantity: 5,
    max_qty: 50,
    unit_cost: 8.50,
    is_active: true,
    is_critical: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-22T11:30:00Z'
  },
  {
    id: '6',
    code: 'VED-BR6',
    name: 'Vedante de Borracha - 6mm x 2m',
    sku: 'VED-BR6',
    category_id: '6',
    unit: 'm',
    photo_url: 'https://images.unsplash.com/photo-1590149934962-e3ac5f1c2dbb?w=150&h=150&fit=crop&crop=center',
    location_name: 'Prateleira F-2',
    qty_on_hand: 18,
    quantity: 18,
    reorder_point: 12,
    min_qty: 8,
    minimum_quantity: 8,
    max_qty: 40,
    unit_cost: 15.75,
    is_active: true,
    is_critical: false,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-16T13:10:00Z'
  }
];

const MOCK_MOVEMENTS: InventoryMovement[] = [
  {
    id: '1',
    item_id: '1',
    movement_type: 'entrada',
    qty: 20,
    note: 'Reposição de estoque - pedido 2024-001',
    unit_cost: 45.00,
    created_at: '2024-01-20T10:30:00Z',
    created_by: 'system'
  },
  {
    id: '2',
    item_id: '2',
    movement_type: 'saida',
    qty: 2,
    note: 'Utilizado em OS-2024-003',
    reference_id: '3',
    created_at: '2024-01-18T14:15:00Z',
    created_by: 'system'
  },
  {
    id: '3',
    item_id: '3',
    movement_type: 'entrada',
    qty: 6,
    note: 'Compra emergencial',
    unit_cost: 125.00,
    created_at: '2024-01-15T09:20:00Z',
    created_by: 'system'
  },
  {
    id: '4',
    item_id: '5',
    movement_type: 'saida',
    qty: 7,
    note: 'Manutenção elétrica preventiva',
    reference_id: '1',
    created_at: '2024-01-22T11:30:00Z',
    created_by: 'system'
  },
  {
    id: '5',
    item_id: '6',
    movement_type: 'entrada',
    qty: 10,
    note: 'Estoque inicial',
    unit_cost: 15.75,
    created_at: '2024-01-16T13:10:00Z',
    created_by: 'system'
  }
];

// Storage utilities
export function load<T>(key: string, seed: T): T {
  return appStorage.get<T>(key as StorageKey) ?? seed;
}

export function save<T>(key: string, value: T): void {
  appStorage.set(key as StorageKey, value);
}

// Inventory management functions
export function loadCategories(): InventoryCategory[] {
  return load(STORAGE_KEYS.INVENTORY_CATEGORIES, MOCK_CATEGORIES);
}

export function loadItems(): InventoryItem[] {
  return load(STORAGE_KEYS.INVENTORY_ITEMS, MOCK_ITEMS);
}

export function loadMovements(): InventoryMovement[] {
  return load(STORAGE_KEYS.INVENTORY_MOVEMENTS, MOCK_MOVEMENTS);
}

export function createItem(item: Omit<InventoryItem, 'id' | 'created_at' | 'updated_at'>): InventoryItem {
  const items = loadItems();
  const now = new Date().toISOString();
  
  const newItem: InventoryItem = {
    ...item,
    id: Date.now().toString(),
    created_at: now,
    updated_at: now
  };
  
  items.push(newItem);
  save(STORAGE_KEYS.INVENTORY_ITEMS, items);
  
  return newItem;
}

export function updateItem(updatedItem: InventoryItem): InventoryItem {
  const items = loadItems();
  const index = items.findIndex(item => item.id === updatedItem.id);
  
  if (index === -1) {
    throw new Error(`Item with id ${updatedItem.id} not found`);
  }
  
  const updated = {
    ...updatedItem,
    updated_at: new Date().toISOString()
  };
  
  items[index] = updated;
  save(STORAGE_KEYS.INVENTORY_ITEMS, items);
  
  return updated;
}

export function deleteItem(id: string): void {
  const items = loadItems();
  const filtered = items.filter(item => item.id !== id);
  save(STORAGE_KEYS.INVENTORY_ITEMS, filtered);
}

export function moveItem({
  item_id,
  type,
  qty,
  date,
  note,
  reference_id,
  unit_cost
}: {
  item_id: string;
  type: MovementType;
  qty: number;
  date?: string;
  note?: string;
  reference_id?: string;
  unit_cost?: number;
}): InventoryMovement {
  const items = loadItems();
  const movements = loadMovements();
  
  const item = items.find(i => i.id === item_id);
  if (!item) {
    throw new Error(`Item with id ${item_id} not found`);
  }
  
  if (qty <= 0) {
    throw new Error('Quantity must be greater than 0');
  }
  
  if (type === 'saida' && item.qty_on_hand < qty) {
    throw new Error('Saldo insuficiente');
  }
  
  const now = new Date().toISOString();
  
  // Create movement record
  const movement: InventoryMovement = {
    id: Date.now().toString(),
    item_id,
    movement_type: type,
    qty,
    note,
    reference_id,
    unit_cost,
    created_at: date || now,
    created_by: 'system'
  };
  
  // Update item quantity
  const newQty = type === 'entrada' 
    ? item.qty_on_hand + qty 
    : item.qty_on_hand - qty;
  
  const updatedItem = {
    ...item,
    qty_on_hand: newQty,
    updated_at: now,
    last_movement_at: now
  };
  
  // Save changes
  movements.push(movement);
  const itemIndex = items.findIndex(i => i.id === item_id);
  items[itemIndex] = updatedItem;
  
  save(STORAGE_KEYS.INVENTORY_MOVEMENTS, movements);
  save(STORAGE_KEYS.INVENTORY_ITEMS, items);
  
  return movement;
}

export function searchItems(
  query: string, 
  filters?: { category_id?: string; is_active?: boolean }
): InventoryItem[] {
  const items = loadItems();
  
  return items.filter(item => {
    const matchesQuery = !query || 
      item.name.toLowerCase().includes(query.toLowerCase()) ||
      item.sku?.toLowerCase().includes(query.toLowerCase()) ||
      item.location_name?.toLowerCase().includes(query.toLowerCase());
    
    const matchesCategory = !filters?.category_id || item.category_id === filters.category_id;
    const matchesActive = filters?.is_active === undefined || item.is_active === filters.is_active;
    
    return matchesQuery && matchesCategory && matchesActive;
  });
}

export function computeConsumptionByCategory(range: AnalysisRange): ConsumptionByCategory[] {
  const movements = loadMovements();
  const categories = loadCategories();
  const items = loadItems();
  
  // Calculate date range
  const now = new Date();
  const rangeStart = new Date(now);
  
  switch (range) {
    case '30d':
      rangeStart.setDate(now.getDate() - 30);
      break;
    case '90d':
      rangeStart.setDate(now.getDate() - 90);
      break;
    case '12m':
      rangeStart.setMonth(now.getMonth() - 12);
      break;
  }
  
  // Filter movements in range and only exits
  const relevantMovements = movements.filter(movement => 
    movement.movement_type === 'saida' && 
    new Date(movement.created_at) >= rangeStart
  );
  
  // Group by category
  const consumptionMap = new Map<string, number>();
  
  relevantMovements.forEach(movement => {
    const item = items.find(i => i.id === movement.item_id);
    if (!item?.category_id) return;
    
    const current = consumptionMap.get(item.category_id) || 0;
    consumptionMap.set(item.category_id, current + movement.qty);
  });
  
  // Convert to result format
  return Array.from(consumptionMap.entries()).map(([categoryId, totalConsumed]) => {
    const category = categories.find(c => c.id === categoryId);
    return {
      category_id: categoryId,
      category_name: category?.name || 'Categoria Desconhecida',
      total_consumed: totalConsumed
    };
  }).filter(item => item.total_consumed > 0);
}
