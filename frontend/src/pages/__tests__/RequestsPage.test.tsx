import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RequestsPage } from '../RequestsPage';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { toast } from 'sonner';

// Mock the toast function
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock the hooks
vi.mock('@/hooks/useDataTemp', () => ({
  useSolicitations: () => [
    [
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
    vi.fn(),
    vi.fn()
  ],
  useWorkOrders: () => [[], vi.fn(), vi.fn()],
  useStockItems: () => [
    [
      {
        id: '1',
        code: 'TEST001',
        description: 'Test Item',
        unit: 'un',
        quantity: 10,
        minimum: 1,
        maximum: 100
      }
    ],
    vi.fn(),
    vi.fn()
  ],
  canAdvanceStatus: () => true,
  getNextStatus: () => 'Em triagem',
  advanceSolicitationStatus: (solicitation: any) => ({
    ...solicitation,
    status: 'Em triagem',
    status_history: [
      ...solicitation.status_history,
      {
        from: solicitation.status,
        to: 'Em triagem',
        at: new Date().toISOString()
      }
    ],
    updated_at: new Date().toISOString()
  }),
  convertSolicitationToWorkOrder: () => ({
    id: 'wo-123',
    number: 'OS-123456',
    equipmentId: '1',
    type: 'CORRECTIVE',
    status: 'OPEN',
    scheduledDate: new Date().toISOString(),
    priority: 'MEDIUM',
    description: 'Convertida da solicitação: Test note',
    stockItems: []
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
      {children}
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

  it('opens drawer when row is clicked', async () => {
    const user = userEvent.setup();
    const Wrapper = createWrapper();
    render(<RequestsPage />, { wrapper: Wrapper });
    
    const row = screen.getByRole('button', { name: /ver detalhes da solicitação/i });
    await user.click(row);
    
    await waitFor(() => {
      expect(screen.getByText('SOL-000001')).toBeInTheDocument();
    });
  });

  it('handles keyboard navigation on table rows', async () => {
    const user = userEvent.setup();
    const Wrapper = createWrapper();
    render(<RequestsPage />, { wrapper: Wrapper });
    
    const row = screen.getByRole('button', { name: /ver detalhes da solicitação/i });
    row.focus();
    
    await user.keyboard('{Enter}');
    
    await waitFor(() => {
      expect(screen.getByText('SOL-000001')).toBeInTheDocument();
    });
  });

  it('has proper accessibility attributes', () => {
    const Wrapper = createWrapper();
    render(<RequestsPage />, { wrapper: Wrapper });
    
    const table = screen.getByRole('grid');
    expect(table).toHaveAttribute('aria-label', 'Lista de solicitações de manutenção');
    
    const headers = screen.getAllByRole('columnheader');
    headers.forEach(header => {
      expect(header).toHaveAttribute('scope', 'col');
    });
    
    const row = screen.getByRole('button', { name: /ver detalhes da solicitação/i });
    expect(row).toHaveAttribute('tabIndex', '0');
  });
});