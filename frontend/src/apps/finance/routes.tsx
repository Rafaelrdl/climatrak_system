/**
 * Rotas do módulo Finance
 * 
 * Baseado em: docs/frontend/finance/02-ia-rotas.md
 */

import { Routes, Route } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { FinanceGuard } from './components';
import { LoadingSpinner } from '@/shared/ui/components/LoadingSpinner';

const FinanceDashboard = lazy(async () => {
  const mod = await import('./pages/FinanceDashboard');
  return { default: mod.FinanceDashboard };
});
const FinanceBudgets = lazy(async () => {
  const mod = await import('./pages/FinanceBudgets');
  return { default: mod.FinanceBudgets };
});
const FinanceLedger = lazy(async () => {
  const mod = await import('./pages/FinanceLedger');
  return { default: mod.FinanceLedger };
});
const FinanceOperations = lazy(async () => {
  const mod = await import('./pages/FinanceOperations');
  return { default: mod.FinanceOperations };
});
const FinanceCommitments = lazy(async () => {
  const mod = await import('./pages/FinanceCommitments');
  return { default: mod.FinanceCommitments };
});
const FinanceSavings = lazy(async () => {
  const mod = await import('./pages/FinanceSavings');
  return { default: mod.FinanceSavings };
});
const FinanceSettings = lazy(async () => {
  const mod = await import('./pages/FinanceSettings');
  return { default: mod.FinanceSettings };
});

/**
 * Rotas do módulo Finance
 * Prefixo: /finance/*
 * 
 * As rotas aqui são relativas ao prefixo /finance/
 * Ex: path="budgets" renderiza em /finance/budgets
 */
export function FinanceRoutes() {
  return (
    <FinanceGuard subject="finance" action="view">
      <Suspense fallback={<LoadingSpinner centered text="Carregando..." />}>
        <Routes>
          {/* Painel do mês */}
          <Route path="/" element={<FinanceDashboard />} />
          
          {/* Orçamentos - requer permissão finance_budget */}
          <Route 
            path="budgets" 
            element={
              <FinanceGuard subject="finance_budget" action="view">
                <FinanceBudgets />
              </FinanceGuard>
            } 
          />
          
          {/* Lançamentos - requer permissão finance_ledger */}
          <Route 
            path="ledger" 
            element={
              <FinanceGuard subject="finance_ledger" action="view">
                <FinanceLedger />
              </FinanceGuard>
            } 
          />
          
          {/* Operação (custos operacionais) - requer permissão finance_ledger */}
          <Route 
            path="operations" 
            element={
              <FinanceGuard subject="finance_ledger" action="view">
                <FinanceOperations />
              </FinanceGuard>
            } 
          />
          
          {/* Compromissos - requer permissão finance_commitment */}
          <Route 
            path="commitments" 
            element={
              <FinanceGuard subject="finance_commitment" action="view">
                <FinanceCommitments />
              </FinanceGuard>
            } 
          />
          
          {/* Economia - requer permissão finance_savings */}
          <Route 
            path="savings" 
            element={
              <FinanceGuard subject="finance_savings" action="view">
                <FinanceSavings />
              </FinanceGuard>
            } 
          />
          
          {/* Cadastros - requer permissão finance (manage) */}
          <Route 
            path="settings" 
            element={
              <FinanceGuard subject="finance" action="manage">
                <FinanceSettings />
              </FinanceGuard>
            } 
          />
        </Routes>
      </Suspense>
    </FinanceGuard>
  );
}

export default FinanceRoutes;
