/**
 * Testes unitários para useWorkOrdersQuery
 * 
 * Testa os hooks de React Query para ordens de serviço
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { 
  useWorkOrders, 
  useWorkOrder, 
  useCreateWorkOrder, 
  useUpdateWorkOrder, 
  useDeleteWorkOrder,
  useStartWorkOrder,
  useCompleteWorkOrder,
  workOrderKeys 
} from '../useWorkOrdersQuery';
import { workOrdersService } from '@/services/workOrdersService';
import * as useAuth from '@/hooks/useAuth';

// Mock dos serviços
vi.mock('@/services/workOrdersService', () => ({
  workOrdersService: {
    getAll: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    start: vi.fn(),
    complete: vi.fn(),
    cancel: vi.fn(),
    getStats: vi.fn(),
    getAllPaginated: vi.fn(),
    getOverdue: vi.fn(),
    getUpcoming: vi.fn(),
    getByAsset: vi.fn(),
  },
}));

vi.mock('@/hooks/useAuth', () => ({
  isUserAuthenticated: vi.fn(() => true),
}));

// Dados de teste
const mockWorkOrders = [
  {
    id: '1',
    number: 'OS2024120001',
    equipmentId: '1',
    type: 'PREVENTIVE' as const,
    status: 'OPEN' as const,
    priority: 'MEDIUM' as const,
    description: 'Manutenção preventiva mensal',
    scheduledDate: '2024-12-15',
    createdAt: '2024-12-01T00:00:00Z',
    maintenancePlanId: '1',
  },
  {
    id: '2',
    number: 'OS2024120002',
    equipmentId: '2',
    type: 'CORRECTIVE' as const,
    status: 'IN_PROGRESS' as const,
    priority: 'HIGH' as const,
    description: 'Reparo de vazamento',
    scheduledDate: '2024-12-10',
    createdAt: '2024-12-05T00:00:00Z',
    assignedTo: '1',
    assignedToName: 'João Silva',
    startedAt: '2024-12-10T08:00:00Z',
  },
  {
    id: '3',
    number: 'OS2024120003',
    equipmentId: '1',
    type: 'CORRECTIVE' as const,
    status: 'OPEN' as const,
    priority: 'LOW' as const,
    description: 'Limpeza de filtros',
    scheduledDate: '2024-12-20',
    createdAt: '2024-12-08T00:00:00Z',
    requestId: '5',
  },
];

// Wrapper para o QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useWorkOrdersQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(useAuth, 'isUserAuthenticated').mockReturnValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('workOrderKeys', () => {
    it('deve gerar query keys corretas', () => {
      expect(workOrderKeys.all).toEqual(['workOrders']);
      expect(workOrderKeys.lists()).toEqual(['workOrders', 'list']);
      expect(workOrderKeys.list({ status: ['OPEN'] })).toEqual(['workOrders', 'list', { status: ['OPEN'] }]);
      expect(workOrderKeys.detail('1')).toEqual(['workOrders', 'detail', '1']);
      expect(workOrderKeys.stats()).toEqual(['workOrders', 'stats']);
      expect(workOrderKeys.byAsset('1')).toEqual(['workOrders', 'byAsset', '1']);
      expect(workOrderKeys.overdue()).toEqual(['workOrders', 'overdue']);
      expect(workOrderKeys.upcoming(7)).toEqual(['workOrders', 'upcoming', 7]);
    });
  });

  describe('useWorkOrders', () => {
    it('deve retornar lista de ordens de serviço', async () => {
      vi.mocked(workOrdersService.getAll).mockResolvedValue(mockWorkOrders);

      const { result } = renderHook(() => useWorkOrders(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockWorkOrders);
      expect(workOrdersService.getAll).toHaveBeenCalledWith(undefined);
    });

    it('deve passar filtros para o serviço', async () => {
      vi.mocked(workOrdersService.getAll).mockResolvedValue([mockWorkOrders[0]]);

      const filters = { status: ['OPEN' as const] };
      const { result } = renderHook(() => useWorkOrders(filters), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(workOrdersService.getAll).toHaveBeenCalledWith(filters);
    });

    it('não deve buscar se usuário não estiver autenticado', () => {
      vi.spyOn(useAuth, 'isUserAuthenticated').mockReturnValue(false);

      const { result } = renderHook(() => useWorkOrders(), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe('idle');
      expect(workOrdersService.getAll).not.toHaveBeenCalled();
    });
  });

  describe('useWorkOrder', () => {
    it('deve retornar detalhes de uma OS específica', async () => {
      vi.mocked(workOrdersService.getById).mockResolvedValue(mockWorkOrders[0]);

      const { result } = renderHook(() => useWorkOrder('1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockWorkOrders[0]);
      expect(workOrdersService.getById).toHaveBeenCalledWith('1');
    });

    it('não deve buscar se ID for null', () => {
      const { result } = renderHook(() => useWorkOrder(null), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe('idle');
      expect(workOrdersService.getById).not.toHaveBeenCalled();
    });
  });

  describe('useCreateWorkOrder', () => {
    it('deve criar OS com sucesso', async () => {
      const newWO = {
        equipmentId: '1',
        type: 'CORRECTIVE' as const,
        priority: 'HIGH' as const,
        description: 'Nova OS',
        scheduledDate: '2024-12-20',
      };
      
      vi.mocked(workOrdersService.create).mockResolvedValue({ id: '4', number: 'OS2024120004', ...newWO } as any);

      const { result } = renderHook(() => useCreateWorkOrder(), {
        wrapper: createWrapper(),
      });

      result.current.mutate(newWO as any);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(workOrdersService.create).toHaveBeenCalledWith(newWO);
    });
  });

  describe('useUpdateWorkOrder', () => {
    it('deve atualizar OS com sucesso', async () => {
      const updates = { description: 'Descrição atualizada' };
      vi.mocked(workOrdersService.update).mockResolvedValue({ ...mockWorkOrders[0], ...updates } as any);

      const { result } = renderHook(() => useUpdateWorkOrder(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ id: '1', data: updates });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(workOrdersService.update).toHaveBeenCalledWith('1', updates);
    });
  });

  describe('useDeleteWorkOrder', () => {
    it('deve deletar OS com sucesso', async () => {
      vi.mocked(workOrdersService.delete).mockResolvedValue(undefined);

      const { result } = renderHook(() => useDeleteWorkOrder(), {
        wrapper: createWrapper(),
      });

      result.current.mutate('1');

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(workOrdersService.delete).toHaveBeenCalledWith('1');
    });
  });

  describe('useStartWorkOrder', () => {
    it('deve iniciar OS com sucesso', async () => {
      vi.mocked(workOrdersService.start).mockResolvedValue({ 
        ...mockWorkOrders[0], 
        status: 'IN_PROGRESS',
        startedAt: '2024-12-15T08:00:00Z' 
      } as any);

      const { result } = renderHook(() => useStartWorkOrder(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ id: '1', technicianId: '1' });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(workOrdersService.start).toHaveBeenCalledWith('1', '1');
    });

    it('deve iniciar OS sem técnico atribuído', async () => {
      vi.mocked(workOrdersService.start).mockResolvedValue({ 
        ...mockWorkOrders[0], 
        status: 'IN_PROGRESS',
        startedAt: '2024-12-15T08:00:00Z' 
      } as any);

      const { result } = renderHook(() => useStartWorkOrder(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ id: '1' });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(workOrdersService.start).toHaveBeenCalledWith('1', undefined);
    });
  });

  describe('useCompleteWorkOrder', () => {
    it('deve concluir OS com sucesso', async () => {
      const completionData = {
        execution_description: 'Trabalho concluído',
        actual_hours: 2,
      };
      
      vi.mocked(workOrdersService.complete).mockResolvedValue({ 
        ...mockWorkOrders[1], 
        status: 'COMPLETED',
        completedAt: '2024-12-15T10:00:00Z',
        executionDescription: 'Trabalho concluído',
      } as any);

      const { result } = renderHook(() => useCompleteWorkOrder(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ id: '2', data: completionData });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(workOrdersService.complete).toHaveBeenCalledWith('2', completionData);
    });
  });

  describe('Filtros por origem', () => {
    it('deve identificar OS de plano de manutenção', () => {
      const planOS = mockWorkOrders[0];
      expect(planOS.maintenancePlanId).toBeDefined();
      expect(planOS.requestId).toBeUndefined();
    });

    it('deve identificar OS de solicitação', () => {
      const requestOS = mockWorkOrders[2];
      expect(requestOS.requestId).toBeDefined();
      expect(requestOS.maintenancePlanId).toBeUndefined();
    });

    it('deve identificar OS manual', () => {
      const manualOS = mockWorkOrders[1];
      expect(manualOS.maintenancePlanId).toBeUndefined();
      expect(manualOS.requestId).toBeUndefined();
    });
  });
});
