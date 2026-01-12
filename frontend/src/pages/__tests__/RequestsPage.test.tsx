import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RequestsPage } from '../RequestsPage';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

// Mock the toast function
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock the hooks
vi.mock('@/hooks/useRequestsQuery', () => ({
  useSolicitations: () => ({
    data: [
      {
        id: '1',
        location_name: 'Test Location',
        equipment_name: 'Test Equipment',
        requester_user_name: 'Test User',
        note: 'Test note',
        status: 'Nova',
        status_history: [{ to: 'Nova', at: '2024-01-20T08:30:00.000Z' }],
        items: [],
        created_at: '2024-01-20T08:30:00.000Z',
        updated_at: '2024-01-20T08:30:00.000Z'
      }
    ],
    isLoading: false,
    error: null
  }),
  useConvertSolicitationToWorkOrder: () => ({
    mutate: vi.fn(),
    isPending: false
  }),
  useCreateRequest: () => ({
    mutate: vi.fn(),
    mutateAsync: vi.fn(),
    isPending: false
  }),
  useSolicitationStatusCounts: () => ({
    data: { nova: 1, em_triagem: 0, aprovada: 0, total: 1 },
    isLoading: false
  }),
  useUpdateSolicitationStatus: () => ({
    mutate: vi.fn(),
    isPending: false
  }),
  requestKeys: {
    all: ['requests'],
    lists: () => ['requests', 'list'],
    list: (filters: any) => ['requests', 'list', filters],
    details: () => ['requests', 'detail'],
    detail: (id: string) => ['requests', 'detail', id],
  }
}));

// Mock companies hook
vi.mock('@/hooks/useLocationsQuery', () => ({
  useCompanies: () => ({
    data: [{ id: '1', name: 'Test Company' }],
    isLoading: false
  }),
  useLocations: () => ({
    data: [{ id: '1', name: 'Test Location', company_id: '1' }],
    isLoading: false
  }),
  useUnits: () => ({
    data: [{ id: '1', name: 'Test Unit', company_id: '1' }],
    isLoading: false
  }),
  useSectors: () => ({
    data: [{ id: '1', name: 'Test Sector', company_id: '1' }],
    isLoading: false
  }),
  useSubsections: () => ({
    data: [{ id: '1', name: 'Test Subsection', sector_id: '1' }],
    isLoading: false
  })
}));

// Mock equipment hook
vi.mock('@/hooks/useEquipmentQuery', () => ({
  useEquipments: () => ({
    data: [{ id: '1', name: 'Test Equipment', location_id: '1' }],
    isLoading: false
  }),
  useEquipment: () => ({
    data: { id: '1', name: 'Test Equipment', location_id: '1' },
    isLoading: false
  })
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
};

describe('RequestsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    const Wrapper = createWrapper();
    render(<RequestsPage />, { wrapper: Wrapper });
    
    expect(screen.getByText('Solicitações')).toBeInTheDocument();
    expect(screen.getByText('Lista de Solicitações')).toBeInTheDocument();
  });

  it('displays statistics correctly', () => {
    const Wrapper = createWrapper();
    render(<RequestsPage />, { wrapper: Wrapper });
    
    // Should show 1 total solicitation
    expect(screen.getByText('Total')).toBeInTheDocument();
    // Should show 1 nova solicitation
    expect(screen.getByText('Novas')).toBeInTheDocument();
  });

  it('renders table with correct headers', () => {
    const Wrapper = createWrapper();
    render(<RequestsPage />, { wrapper: Wrapper });
    
    expect(screen.getByText('Localização/Equipamento')).toBeInTheDocument();
    expect(screen.getByText('Usuário Solicitante')).toBeInTheDocument();
    expect(screen.getByText('Observação')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Data')).toBeInTheDocument();
  });

  it('renders table data correctly', () => {
    const Wrapper = createWrapper();
    render(<RequestsPage />, { wrapper: Wrapper });
    
    expect(screen.getByText('Test Location')).toBeInTheDocument();
    expect(screen.getByText('Test Equipment')).toBeInTheDocument();
    expect(screen.getByText('Test User')).toBeInTheDocument();
    expect(screen.getByText('Test note')).toBeInTheDocument();
    expect(screen.getByText('Nova')).toBeInTheDocument();
  });

  it('has action buttons in the table', () => {
    const Wrapper = createWrapper();
    render(<RequestsPage />, { wrapper: Wrapper });
    
    // Find buttons in the table (view and convert buttons)
    const allButtons = screen.getAllByRole('button');
    // Filter to find icon buttons in the action column
    const actionButtons = allButtons.filter(btn => {
      const cell = btn.closest('td');
      return cell !== null;
    });
    
    // Should have at least 2 action buttons per row (view + convert)
    expect(actionButtons.length).toBeGreaterThanOrEqual(2);
  });

  it('has proper accessibility attributes on table', () => {
    const Wrapper = createWrapper();
    render(<RequestsPage />, { wrapper: Wrapper });
    
    const table = screen.getByRole('grid');
    expect(table).toHaveAttribute('aria-label', 'Lista de solicitações de manutenção');
    
    const headers = screen.getAllByRole('columnheader');
    headers.forEach(header => {
      expect(header).toHaveAttribute('scope', 'col');
    });
  });
});
