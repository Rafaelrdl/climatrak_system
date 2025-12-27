/**
 * Módulos da Plataforma TrakSense
 * 
 * A plataforma é composta por dois módulos principais:
 * 
 * 1. CMMS (TrakNor) - Sistema de Gestão de Manutenção
 *    Rotas: /cmms/*
 *    Funcionalidades: Ativos, Ordens de Serviço, Planos, Inventário, etc.
 * 
 * 2. Monitor (TrakSense) - Sistema de Monitoramento IoT
 *    Rotas: /monitor/*
 *    Funcionalidades: Dashboard tempo real, Sensores, Alertas, etc.
 */

export { CmmsRoutes } from './cmms/routes';
export { MonitorRoutes } from './monitor/routes';
