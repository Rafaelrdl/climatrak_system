/**
 * Shared Pages
 * 
 * Páginas compartilhadas entre módulos (CMMS e Monitor):
 * - ProfilePage: Perfil do usuário
 * - TeamPage: Gestão de equipe
 * - SettingsPage: Configurações do sistema
 * 
 * Essas páginas são usadas em ambos os módulos e por isso
 * ficam no diretório shared.
 */

// Re-export de páginas existentes
// TODO: Migrar arquivos físicos para cá em fase futura
export { ProfilePage } from '@/pages/ProfilePage';
export { TeamPage } from '@/pages/TeamPage';
export { SettingsPage } from '@/pages/SettingsPage';
