/**
 * Testes unitários para usePlansQuery
 * 
 * Testa os hooks de React Query para planos de manutenção
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { usePlans, useCreatePlan, useUpdatePlan, useDeletePlan, useGenerateWorkOrders, planKeys } from '../usePlansQuery';
import { plansService } from '@/services/plansService';
import * as useAuth from '@/hooks/useAuth';

// Mock dos serviços
vi.mock('@/services/plansService', () => ({
  plansService: {
    getAll: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    generateWorkOrders: vi.fn(),
    toggleActive: vi.fn(),
    getStats: vi.fn(),
    addAsset: vi.fn(),
    removeAsset: vi.fn(),
  },
}));

vi.mock('@/hooks/useAuth', () => ({
  isUserAuthenticated: vi.fn(() => true),
}));

// Dados de teste usando tipos da API (snake_case)
const mockPlans = [
  {
    id: '1',
    name: 'Plano Mensal',
    description: 'Manutenção preventiva mensal',
    frequency: 'MONTHLY',
    isActive: true,
  },
  {
    id: '2',
    name: 'Plano Trimestral',
    description: 'Manutenção preventiva trimestral',
    frequency: 'QUARTERLY',
    isActive: false,
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

describe('usePlansQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(useAuth, 'isUserAuthenticated').mockReturnValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('planKeys', () => {
    it('deve gerar query keys corretas', () => {
      expect(planKeys.all).toEqual(['maintenancePlans']);
      expect(planKeys.lists()).toEqual(['maintenancePlans', 'list']);
      expect(planKeys.list({ is_active: true })).toEqual(['maintenancePlans', 'list', { is_active: true }]);
      expect(planKeys.detail('1')).toEqual(['maintenancePlans', 'detail', '1']);
      expect(planKeys.stats()).toEqual(['maintenancePlans', 'stats']);
    });
  });

  describe('usePlans', () => {
    it('deve retornar lista de planos', async () => {
      vi.mocked(plansService.getAll).mockResolvedValue(mockPlans);

      const { result } = renderHook(() => usePlans(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockPlans);
      expect(plansService.getAll).toHaveBeenCalledWith(undefined);
    });

    it('deve passar filtros para o serviço', async () => {
      vi.mocked(plansService.getAll).mockResolvedValue([mockPlans[0]]);

      const filters = { is_active: true };
      const { result } = renderHook(() => usePlans(filters), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(plansService.getAll).toHaveBeenCalledWith(filters);
    });

    it('não deve buscar se usuário não estiver autenticado', () => {
      vi.spyOn(useAuth, 'isUserAuthenticated').mockReturnValue(false);

      const { result } = renderHook(() => usePlans(), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe('idle');
      expect(plansService.getAll).not.toHaveBeenCalled();
    });
  });

  describe('useCreatePlan', () => {
    it('deve criar plano com sucesso', async () => {
      const newPlan = {
        name: 'Novo Plano',
        description: 'Descrição',
        frequency: 'MONTHLY' as const,
        frequency_value: 1,
        is_active: true,
        asset_ids: ['1'],
      };
      
      vi.mocked(plansService.create).mockResolvedValue({ id: '3', ...newPlan } as any);

      const { result } = renderHook(() => useCreatePlan(), {
        wrapper: createWrapper(),
      });

      result.current.mutate(newPlan as any);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(plansService.create).toHaveBeenCalledWith(newPlan);
    });
  });

  describe('useUpdatePlan', () => {
    it('deve atualizar plano com sucesso', async () => {
      const updates = { name: 'Plano Atualizado' };
      vi.mocked(plansService.update).mockResolvedValue({ ...mockPlans[0], ...updates } as any);

      const { result } = renderHook(() => useUpdatePlan(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ id: '1', data: updates });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(plansService.update).toHaveBeenCalledWith('1', updates);
    });
  });

  describe('useDeletePlan', () => {
    it('deve deletar plano com sucesso', async () => {
      vi.mocked(plansService.delete).mockResolvedValue(undefined);

      const { result } = renderHook(() => useDeletePlan(), {
        wrapper: createWrapper(),
      });

      result.current.mutate('1');

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(plansService.delete).toHaveBeenCalledWith('1');
    });
  });

  describe('useGenerateWorkOrders', () => {
    it('deve gerar OSs com sucesso', async () => {
      const generateResult = {
        work_orders_created: 2,
        work_order_ids: ['OS2024120001', 'OS2024120002'],
        next_execution: '2025-01-01',
      };
      
      vi.mocked(plansService.generateWorkOrders).mockResolvedValue(generateResult);

      const { result } = renderHook(() => useGenerateWorkOrders(), {
        wrapper: createWrapper(),
      });

      result.current.mutate('1');

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(plansService.generateWorkOrders).toHaveBeenCalledWith('1');
      expect(result.current.data).toEqual({
        work_orders_created: 2,
        work_order_ids: ['OS2024120001', 'OS2024120002'],
        next_execution_date: '2025-01-01',
      });
    });

    it('deve lidar com erro na geração', async () => {
      const error = new Error('Erro ao gerar OSs');
      vi.mocked(plansService.generateWorkOrders).mockRejectedValue(error);

      const { result } = renderHook(() => useGenerateWorkOrders(), {
        wrapper: createWrapper(),
      });

      result.current.mutate('1');

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBe(error);
    });
  });
});
