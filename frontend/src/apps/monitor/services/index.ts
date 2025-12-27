/**
 * Services do módulo Monitor
 * 
 * Exporta todos os serviços de API do módulo de monitoramento IoT
 * 
 * Todos os serviços utilizam @/lib/api (Axios com autenticação)
 */

export { devicesService } from './devicesService';
export { assetsService } from './assetsService';
export { rulesService } from './rulesService';
export { alertsService } from './alertsService';
export { sitesService } from './sitesService';
export { telemetryService } from './telemetryService';
