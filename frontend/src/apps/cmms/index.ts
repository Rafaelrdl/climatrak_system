/**
 * CMMS Module (TrakNor)
 * 
 * Módulo de Gerenciamento de Manutenção Computadorizado (CMMS).
 * TrakNor é o nome comercial do produto CMMS da ClimaTrak.
 * 
 * Funcionalidades:
 * - Ordens de Serviço (Work Orders)
 * - Equipamentos (Equipment)
 * - Planos de Manutenção (Maintenance Plans)
 * - Inventário (Inventory)
 * - Procedimentos (Procedures)
 * - Solicitações (Requests)
 * - Métricas e Relatórios
 * - Checklists
 * - SLA (Service Level Agreement)
 * 
 * @module apps/cmms
 */

// Configuração do módulo
export * from './navigation';

// Componentes
export * from './components';

// Hooks (React Query)
export * from './hooks';

// Serviços (API)
export * from './services';

// Store (Zustand)
export * from './store';

// Tipos
export * from './types';
