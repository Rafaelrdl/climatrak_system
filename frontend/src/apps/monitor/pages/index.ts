/**
 * Monitor Pages - Barrel exports
 * 
 * NOTA: A página de detalhes do ativo foi unificada em /cmms/ativos/:id
 * As rotas /monitor/ativos/:id redirecionam para lá automaticamente.
 * A lista de ativos também foi removida - use /cmms/ativos
 */

export { AlertsList } from './AlertsList';
export { SensorsPage } from './SensorsPage';
export { RulesPage } from './RulesPage';
export { EditableOverviewPage } from './EditableOverviewPage';
export { CustomDashboardPage } from './CustomDashboardPage';
