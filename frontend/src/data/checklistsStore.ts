/**
 * Store local para Checklists
 * TODO: Substituir por chamadas à API quando o backend estiver pronto
 */

import { ChecklistTemplate, ChecklistCategory } from '@/models/checklist';
import { v4 as uuidv4 } from 'uuid';

// Dados mockados para desenvolvimento
const mockCategories: ChecklistCategory[] = [
  { id: '1', name: 'HVAC', color: '#3b82f6', description: 'Climatização' },
  { id: '2', name: 'Elétrico', color: '#f59e0b', description: 'Sistemas elétricos' },
  { id: '3', name: 'Hidráulico', color: '#10b981', description: 'Sistemas hidráulicos' },
  { id: '4', name: 'Segurança', color: '#ef4444', description: 'Equipamentos de segurança' },
];

const mockChecklists: ChecklistTemplate[] = [
  {
    id: '1',
    name: 'Preventiva Split - Limpeza Completa',
    description: 'Checklist para manutenção preventiva completa de splits',
    category_id: '1',
    equipment_type: 'Split',
    items: [
      { id: '1-1', order: 1, description: 'Desligar o equipamento e aguardar 5 minutos', type: 'checkbox', required: true },
      { id: '1-2', order: 2, description: 'Remover e limpar filtros de ar', type: 'checkbox', required: true },
      { id: '1-3', order: 3, description: 'Limpar serpentina da evaporadora com produto apropriado', type: 'checkbox', required: true },
      { id: '1-4', order: 4, description: 'Verificar e limpar bandeja de condensado', type: 'checkbox', required: true },
      { id: '1-5', order: 5, description: 'Limpar serpentina da condensadora', type: 'checkbox', required: true },
      { id: '1-6', order: 6, description: 'Verificar fixação do suporte externo', type: 'checkbox', required: true },
      { id: '1-7', order: 7, description: 'Medir temperatura de insuflamento', type: 'number', required: true, unit: '°C' },
      { id: '1-8', order: 8, description: 'Medir corrente do compressor', type: 'number', required: true, unit: 'A' },
      { id: '1-9', order: 9, description: 'Registrar foto do equipamento após manutenção', type: 'photo', required: false },
    ],
    is_active: true,
    created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    created_by: 'admin',
    usage_count: 12,
  },
  {
    id: '2',
    name: 'Preventiva Chiller - Verificação Mensal',
    description: 'Checklist mensal para chillers de grande porte',
    category_id: '1',
    equipment_type: 'Chiller',
    items: [
      { id: '2-1', order: 1, description: 'Verificar nível de óleo do compressor', type: 'checkbox', required: true },
      { id: '2-2', order: 2, description: 'Medir pressão de alta', type: 'number', required: true, unit: 'bar' },
      { id: '2-3', order: 3, description: 'Medir pressão de baixa', type: 'number', required: true, unit: 'bar' },
      { id: '2-4', order: 4, description: 'Verificar temperatura de entrada da água', type: 'number', required: true, unit: '°C' },
      { id: '2-5', order: 5, description: 'Verificar temperatura de saída da água', type: 'number', required: true, unit: '°C' },
      { id: '2-6', order: 6, description: 'Inspecionar tubulações quanto a vazamentos', type: 'checkbox', required: true },
      { id: '2-7', order: 7, description: 'Limpar filtros do circuito de água', type: 'checkbox', required: true },
      { id: '2-8', order: 8, description: 'Observações adicionais', type: 'text', required: false },
    ],
    is_active: true,
    created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    created_by: 'admin',
    usage_count: 8,
  },
  {
    id: '3',
    name: 'Inspeção Quadro Elétrico',
    description: 'Checklist para inspeção de quadros de distribuição',
    category_id: '2',
    equipment_type: 'Quadro Elétrico',
    items: [
      { id: '3-1', order: 1, description: 'Verificar temperatura dos barramentos com termovisor', type: 'checkbox', required: true },
      { id: '3-2', order: 2, description: 'Inspecionar conexões quanto a aquecimento', type: 'checkbox', required: true },
      { id: '3-3', order: 3, description: 'Verificar funcionamento dos disjuntores', type: 'checkbox', required: true },
      { id: '3-4', order: 4, description: 'Medir tensão fase R-S', type: 'number', required: true, unit: 'V' },
      { id: '3-5', order: 5, description: 'Medir tensão fase S-T', type: 'number', required: true, unit: 'V' },
      { id: '3-6', order: 6, description: 'Medir tensão fase T-R', type: 'number', required: true, unit: 'V' },
      { id: '3-7', order: 7, description: 'Registrar foto termográfica', type: 'photo', required: true },
    ],
    is_active: true,
    created_at: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    created_by: 'admin',
    usage_count: 5,
  },
];

// State local
let checklists: ChecklistTemplate[] = [...mockChecklists];

// API-like functions
export function listChecklists(): ChecklistTemplate[] {
  return [...checklists].sort((a, b) => 
    new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  );
}

export function getChecklist(id: string): ChecklistTemplate | undefined {
  return checklists.find(c => c.id === id);
}

export function createChecklist(
  data: Omit<ChecklistTemplate, 'id' | 'created_at' | 'updated_at'>
): ChecklistTemplate {
  const now = new Date().toISOString();
  const newChecklist: ChecklistTemplate = {
    ...data,
    id: uuidv4(),
    created_at: now,
    updated_at: now,
    usage_count: 0,
  };
  checklists.push(newChecklist);
  return newChecklist;
}

export function updateChecklist(
  id: string, 
  data: Partial<Omit<ChecklistTemplate, 'id' | 'created_at'>>
): ChecklistTemplate | undefined {
  const index = checklists.findIndex(c => c.id === id);
  if (index === -1) return undefined;
  
  checklists[index] = {
    ...checklists[index],
    ...data,
    updated_at: new Date().toISOString(),
  };
  return checklists[index];
}

export function deleteChecklist(id: string): boolean {
  const index = checklists.findIndex(c => c.id === id);
  if (index === -1) return false;
  
  checklists.splice(index, 1);
  return true;
}

export function duplicateChecklist(id: string): ChecklistTemplate | undefined {
  const original = checklists.find(c => c.id === id);
  if (!original) return undefined;
  
  const now = new Date().toISOString();
  const duplicate: ChecklistTemplate = {
    ...original,
    id: uuidv4(),
    name: `${original.name} (Cópia)`,
    items: original.items.map(item => ({
      ...item,
      id: uuidv4(),
    })),
    created_at: now,
    updated_at: now,
    usage_count: 0,
  };
  checklists.push(duplicate);
  return duplicate;
}

export function toggleChecklistActive(id: string, isActive: boolean): ChecklistTemplate | undefined {
  return updateChecklist(id, { is_active: isActive });
}

// Categories (usando as mesmas do procedimento por enquanto)
export function listChecklistCategories(): ChecklistCategory[] {
  return mockCategories;
}

export function getChecklistStats() {
  const active = checklists.filter(c => c.is_active).length;
  const inactive = checklists.filter(c => !c.is_active).length;
  const totalItems = checklists.reduce((sum, c) => sum + c.items.length, 0);
  const totalUsage = checklists.reduce((sum, c) => sum + (c.usage_count || 0), 0);
  
  return {
    total: checklists.length,
    active,
    inactive,
    totalItems,
    totalUsage,
  };
}
