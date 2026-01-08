/**
 * Módulos da Plataforma TrakSense
 * 
 * A plataforma é composta por quatro módulos principais:
 * 
 * 1. CMMS (TrakNor) - Sistema de Gestão de Manutenção
 *    Rotas: /cmms/*
 *    Funcionalidades: Ativos, Ordens de Serviço, Planos, Inventário, etc.
 * 
 * 2. Monitor (TrakSense) - Sistema de Monitoramento IoT
 *    Rotas: /monitor/*
 *    Funcionalidades: Dashboard tempo real, Sensores, Alertas, etc.
 * 
 * 3. TrakLedger - Orçamento Vivo
 *    Rotas: /finance/*
 *    Funcionalidades: Orçamentos, Ledger, Compromissos, Economia
 * 
 * 4. TrakService - Field Service (Feature-gated)
 *    Rotas: /trakservice/*
 *    Funcionalidades: Dispatch, Rastreamento, Roteirização, Orçamentos
 *    Requer: trakservice.enabled feature flag
 */

// Routes
export { CmmsRoutes } from './cmms/routes';
export { MonitorRoutes } from './monitor/routes';
export { FinanceRoutes } from './finance/routes';
export { TrakServiceRoutes } from './trakservice/routes';

// Módulos completos
export * as cmms from './cmms';
export * as monitor from './monitor';
export * as finance from './finance';
export * as trakservice from './trakservice';
