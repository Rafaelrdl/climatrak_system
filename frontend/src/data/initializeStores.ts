import { usersStore } from './usersStore';
import { credentialsStore } from './credentialsStore';

/**
 * Inicializa os stores garantindo que os usuários de demonstração existam
 * e estejam sincronizados entre usersStore e credentialsStore
 */
export function initializeStores(): void {
  // Garantir que as credenciais de demonstração sejam sincronizadas com os usuários
  credentialsStore.ensureDemoCredentials(usersStore);
}

// Executar inicialização automaticamente quando o módulo for importado
initializeStores();
