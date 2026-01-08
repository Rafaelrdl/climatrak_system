/**
 * TrakService Pages
 * 
 * Page components for TrakService module.
 * All core pages are fully implemented.
 * 
 * Design System: Platform-first, seguindo docs/design/DESIGN_SYSTEM.md
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/PageHeader';
import { 
  Users, 
  Settings, 
  Target,
} from 'lucide-react';

// Re-export the implemented pages
export { DispatchPage } from './Dispatch';
export { TrackingPage } from './Tracking';
export { RoutesPage } from './Routes';
export { MileagePage } from './Mileage';
export { QuotesPage } from './Quotes';

// =============================================================================
// Shared Components
// =============================================================================

interface PlaceholderCardProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  features?: string[];
}

/**
 * Shared placeholder card for consistent design across TrakService pages.
 * Follows Design System with orange accent color for TrakService module.
 */
function PlaceholderCard({ icon: Icon, title, description, features }: PlaceholderCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-orange-500" />
          {title}
        </CardTitle>
        <CardDescription>
          Funcionalidade em desenvolvimento
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-muted-foreground">{description}</p>
        {features && features.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Funcionalidades planejadas:</h4>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              {features.map((feature, index) => (
                <li key={index}>{feature}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface QuickStatCardProps {
  title: string;
  value: string | number;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

function QuickStatCard({ title, value, description, icon: Icon }: QuickStatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// Page Components
// =============================================================================
// Page Components (Placeholders for Team and Settings)
// =============================================================================

/**
 * Team Page - Gestão de equipe de campo
 * No additional feature required (base trakservice.enabled)
 */
export function TeamPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Equipe"
        description="Gerencie sua equipe de campo"
      />
      
      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <QuickStatCard
          title="Total de Técnicos"
          value={0}
          description="Cadastrados"
          icon={Users}
        />
        <QuickStatCard
          title="Ativos Hoje"
          value={0}
          description="Em horário de trabalho"
          icon={Target}
        />
        <QuickStatCard
          title="Habilidades"
          value={0}
          description="Tipos cadastrados"
          icon={Target}
        />
        <QuickStatCard
          title="Avaliação Média"
          value="-"
          description="Performance"
          icon={Target}
        />
      </div>

      <PlaceholderCard
        icon={Users}
        title="Gestão de Equipe"
        description="O módulo de Equipe permitirá gerenciar técnicos, habilidades, disponibilidade e performance."
        features={[
          "Cadastro de técnicos e habilidades",
          "Gestão de disponibilidade e escalas",
          "Matriz de competências",
          "Avaliação de performance",
          "Histórico de atendimentos",
        ]}
      />
    </div>
  );
}

/**
 * Settings Page - Configurações do TrakService
 * No additional feature required (base trakservice.enabled)
 */
export function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Configurações"
        description="Configure o módulo TrakService"
      />

      <PlaceholderCard
        icon={Settings}
        title="Configurações do TrakService"
        description="As configurações do TrakService permitirão ajustar preferências de rastreamento, notificações, integrações e mais."
        features={[
          "Configurações de privacidade (janela de trabalho)",
          "Notificações e alertas",
          "Integrações (WhatsApp, Email, Maps)",
          "Parâmetros de roteirização",
          "Taxas e valores padrão para orçamentos",
        ]}
      />
    </div>
  );
}
