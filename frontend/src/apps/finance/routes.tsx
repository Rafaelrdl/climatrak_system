/**
 * Rotas do módulo Finance
 * 
 * Baseado em: docs/frontend/finance/02-ia-rotas.md
 */

import { Routes, Route } from 'react-router-dom';
import { FinanceGuard } from './components';
import {
  FinanceDashboard,
  FinanceBudgets,
  FinanceLedger,
  FinanceCommitments,
  FinanceSavings,
  FinanceSettings,
} from './pages';

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
        
        {/* Ledger - requer permissão finance_ledger */}
        <Route 
          path="ledger" 
          element={
            <FinanceGuard subject="finance_ledger" action="view">
              <FinanceLedger />
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
    </FinanceGuard>
  );
}

export default FinanceRoutes;
