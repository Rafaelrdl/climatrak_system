import type { WorkOrder } from '@/types';

/**
 * Dados expandidos de ordens de serviço para cálculos de métricas
 * Inclui 12+ meses de dados históricos para análise de tendências
 */
export const MOCK_METRICS_WORK_ORDERS: WorkOrder[] = [
  // Janeiro 2024
  {
    id: 'wo-2024-001',
    number: 'OS-2024-001',
    equipmentId: '1',
    type: 'CORRECTIVE',
    priority: 'HIGH',
    status: 'COMPLETED',
    scheduledDate: '2024-01-05',
    assignedTo: 'José Silva',
    description: 'Vazamento no sistema de refrigeração',
    completedAt: '2024-01-07'
  },
  {
    id: 'wo-2024-002',
    number: 'OS-2024-002',
    equipmentId: '2',
    type: 'PREVENTIVE',
    priority: 'MEDIUM',
    status: 'COMPLETED',
    scheduledDate: '2024-01-10',
    assignedTo: 'Carlos Pereira',
    description: 'Manutenção preventiva mensal',
    completedAt: '2024-01-10'
  },
  {
    id: 'wo-2024-003',
    number: 'OS-2024-003',
    equipmentId: '3',
    type: 'CORRECTIVE',
    priority: 'CRITICAL',
    status: 'COMPLETED',
    scheduledDate: '2024-01-15',
    assignedTo: 'Roberto Oliveira',
    description: 'Falha no compressor principal',
    completedAt: '2024-01-18'
  },
  {
    id: 'wo-2024-004',
    number: 'OS-2024-004',
    equipmentId: '4',
    type: 'PREVENTIVE',
    priority: 'LOW',
    status: 'COMPLETED',
    scheduledDate: '2024-01-20',
    assignedTo: 'Ana Costa',
    description: 'Limpeza de filtros programada',
    completedAt: '2024-01-19'
  },
  
  // Fevereiro 2024
  {
    id: 'wo-2024-005',
    number: 'OS-2024-005',
    equipmentId: '5',
    type: 'CORRECTIVE',
    priority: 'HIGH',
    status: 'COMPLETED',
    scheduledDate: '2024-02-02',
    assignedTo: 'José Silva',
    description: 'Problema elétrico na unidade',
    completedAt: '2024-02-04'
  },
  {
    id: 'wo-2024-006',
    number: 'OS-2024-006',
    equipmentId: '1',
    type: 'PREVENTIVE',
    priority: 'MEDIUM',
    status: 'COMPLETED',
    scheduledDate: '2024-02-10',
    assignedTo: 'Carlos Pereira',
    description: 'Inspeção trimestral',
    completedAt: '2024-02-12'
  },
  {
    id: 'wo-2024-007',
    number: 'OS-2024-007',
    equipmentId: '6',
    type: 'CORRECTIVE',
    priority: 'MEDIUM',
    status: 'COMPLETED',
    scheduledDate: '2024-02-18',
    assignedTo: 'Roberto Oliveira',
    description: 'Ruído excessivo no ventilador',
    completedAt: '2024-02-19'
  },
  {
    id: 'wo-2024-008',
    number: 'OS-2024-008',
    equipmentId: '2',
    type: 'PREVENTIVE',
    priority: 'MEDIUM',
    status: 'OPEN',
    scheduledDate: '2024-02-25',
    assignedTo: 'Ana Costa',
    description: 'Manutenção preventiva mensal'
  },
  
  // Março 2024
  {
    id: 'wo-2024-009',
    number: 'OS-2024-009',
    equipmentId: '3',
    type: 'PREVENTIVE',
    priority: 'MEDIUM',
    status: 'COMPLETED',
    scheduledDate: '2024-03-05',
    assignedTo: 'José Silva',
    description: 'Análise de óleo semestral',
    completedAt: '2024-03-05'
  },
  {
    id: 'wo-2024-010',
    number: 'OS-2024-010',
    equipmentId: '4',
    type: 'CORRECTIVE',
    priority: 'HIGH',
    status: 'COMPLETED',
    scheduledDate: '2024-03-12',
    assignedTo: 'Carlos Pereira',
    description: 'Falha no sistema de controle',
    completedAt: '2024-03-15'
  },
  {
    id: 'wo-2024-011',
    number: 'OS-2024-011',
    equipmentId: '5',
    type: 'PREVENTIVE',
    priority: 'LOW',
    status: 'COMPLETED',
    scheduledDate: '2024-03-20',
    assignedTo: 'Roberto Oliveira',
    description: 'Substituição de filtros',
    completedAt: '2024-03-20'
  },
  {
    id: 'wo-2024-012',
    number: 'OS-2024-012',
    equipmentId: '1',
    type: 'CORRECTIVE',
    priority: 'CRITICAL',
    status: 'IN_PROGRESS',
    scheduledDate: '2024-03-28',
    assignedTo: 'Ana Costa',
    description: 'Sistema não resfria adequadamente'
  },
  
  // Abril 2024
  {
    id: 'wo-2024-013',
    number: 'OS-2024-013',
    equipmentId: '6',
    type: 'PREVENTIVE',
    priority: 'MEDIUM',
    status: 'OPEN',
    scheduledDate: '2024-04-03',
    assignedTo: 'José Silva',
    description: 'Manutenção preventiva trimestral'
  },
  {
    id: 'wo-2024-014',
    number: 'OS-2024-014',
    equipmentId: '2',
    type: 'CORRECTIVE',
    priority: 'HIGH',
    status: 'OPEN',
    scheduledDate: '2024-04-08',
    assignedTo: 'Carlos Pereira',
    description: 'Vazamento de refrigerante detectado'
  },
  {
    id: 'wo-2024-015',
    number: 'OS-2024-015',
    equipmentId: '3',
    type: 'PREVENTIVE',
    priority: 'MEDIUM',
    status: 'OPEN',
    scheduledDate: '2024-04-15',
    assignedTo: 'Roberto Oliveira',
    description: 'Inspeção anual PMOC'
  },
  
  // Dados históricos (2023) para tendências
  // Dezembro 2023
  {
    id: 'wo-2023-050',
    number: 'OS-2023-050',
    equipmentId: '1',
    type: 'CORRECTIVE',
    priority: 'HIGH',
    status: 'COMPLETED',
    scheduledDate: '2023-12-05',
    assignedTo: 'José Silva',
    description: 'Reparo emergencial no compressor',
    completedAt: '2023-12-08'
  },
  {
    id: 'wo-2023-051',
    number: 'OS-2023-051',
    equipmentId: '2',
    type: 'PREVENTIVE',
    priority: 'MEDIUM',
    status: 'COMPLETED',
    scheduledDate: '2023-12-10',
    assignedTo: 'Carlos Pereira',
    description: 'Manutenção preventiva anual',
    completedAt: '2023-12-10'
  },
  {
    id: 'wo-2023-052',
    number: 'OS-2023-052',
    equipmentId: '3',
    type: 'CORRECTIVE',
    priority: 'MEDIUM',
    status: 'COMPLETED',
    scheduledDate: '2023-12-18',
    assignedTo: 'Roberto Oliveira',
    description: 'Substituição de peça danificada',
    completedAt: '2023-12-20'
  },
  
  // Novembro 2023
  {
    id: 'wo-2023-045',
    number: 'OS-2023-045',
    equipmentId: '4',
    type: 'PREVENTIVE',
    priority: 'LOW',
    status: 'COMPLETED',
    scheduledDate: '2023-11-08',
    assignedTo: 'Ana Costa',
    description: 'Limpeza e calibração',
    completedAt: '2023-11-09'
  },
  {
    id: 'wo-2023-046',
    number: 'OS-2023-046',
    equipmentId: '5',
    type: 'CORRECTIVE',
    priority: 'HIGH',
    status: 'COMPLETED',
    scheduledDate: '2023-11-15',
    assignedTo: 'José Silva',
    description: 'Falha no sistema eletrônico',
    completedAt: '2023-11-17'
  },
  
  // Outubro 2023
  {
    id: 'wo-2023-040',
    number: 'OS-2023-040',
    equipmentId: '6',
    type: 'PREVENTIVE',
    priority: 'MEDIUM',
    status: 'COMPLETED',
    scheduledDate: '2023-10-12',
    assignedTo: 'Carlos Pereira',
    description: 'Manutenção preventiva semestral',
    completedAt: '2023-10-13'
  },
  {
    id: 'wo-2023-041',
    number: 'OS-2023-041',
    equipmentId: '1',
    type: 'CORRECTIVE',
    priority: 'CRITICAL',
    status: 'COMPLETED',
    scheduledDate: '2023-10-20',
    assignedTo: 'Roberto Oliveira',
    description: 'Parada não programada - urgente',
    completedAt: '2023-10-25'
  },
  
  // Setembro 2023
  {
    id: 'wo-2023-035',
    number: 'OS-2023-035',
    equipmentId: '2',
    type: 'PREVENTIVE',
    priority: 'MEDIUM',
    status: 'COMPLETED',
    scheduledDate: '2023-09-05',
    assignedTo: 'Ana Costa',
    description: 'Inspeção trimestral programada',
    completedAt: '2023-09-05'
  },
  {
    id: 'wo-2023-036',
    number: 'OS-2023-036',
    equipmentId: '3',
    type: 'CORRECTIVE',
    priority: 'HIGH',
    status: 'COMPLETED',
    scheduledDate: '2023-09-18',
    assignedTo: 'José Silva',
    description: 'Problema no sistema de resfriamento',
    completedAt: '2023-09-20'
  },
  
  // Agosto 2023
  {
    id: 'wo-2023-030',
    number: 'OS-2023-030',
    equipmentId: '4',
    type: 'CORRECTIVE',
    priority: 'MEDIUM',
    status: 'COMPLETED',
    scheduledDate: '2023-08-10',
    assignedTo: 'Carlos Pereira',
    description: 'Ruído anômalo no equipamento',
    completedAt: '2023-08-12'
  },
  {
    id: 'wo-2023-031',
    number: 'OS-2023-031',
    equipmentId: '5',
    type: 'PREVENTIVE',
    priority: 'LOW',
    status: 'COMPLETED',
    scheduledDate: '2023-08-25',
    assignedTo: 'Roberto Oliveira',
    description: 'Troca de filtros e limpeza geral',
    completedAt: '2023-08-25'
  },
  
  // Julho 2023
  {
    id: 'wo-2023-025',
    number: 'OS-2023-025',
    equipmentId: '6',
    type: 'CORRECTIVE',
    priority: 'HIGH',
    status: 'COMPLETED',
    scheduledDate: '2023-07-08',
    assignedTo: 'Ana Costa',
    description: 'Vazamento na tubulação principal',
    completedAt: '2023-07-10'
  },
  {
    id: 'wo-2023-026',
    number: 'OS-2023-026',
    equipmentId: '1',
    type: 'PREVENTIVE',
    priority: 'MEDIUM',
    status: 'COMPLETED',
    scheduledDate: '2023-07-20',
    assignedTo: 'José Silva',
    description: 'Manutenção preventiva mensal',
    completedAt: '2023-07-21'
  }
];

// Merge com os dados originais
export const EXPANDED_WORK_ORDERS = [
  ...MOCK_METRICS_WORK_ORDERS,
  // Pode incluir os dados originais do mockData.ts se necessário
];