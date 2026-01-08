/**
 * TrakService Pages
 * 
 * Page components for TrakService module.
 * DispatchPage is fully implemented, others are placeholders.
 * 
 * Design System: Platform-first, seguindo docs/design/DESIGN_SYSTEM.md
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { 
  Calendar, 
  MapPin, 
  Route, 
  FileText, 
  Users, 
  Settings, 
  Gauge,
  ArrowRight,
  Clock,
  Target,
  DollarSign,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTrakServiceFeature } from '@/store/useFeaturesStore';

// Re-export the functional DispatchPage
export { DispatchPage } from './Dispatch';

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

/**
 * Tracking Page - Rastreamento de equipe em tempo real
 * Requires: trakservice.tracking feature
 */
export function TrackingPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Rastreamento"
        description="Acompanhe a localização da equipe em tempo real"
      />
      
      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <QuickStatCard
          title="Técnicos Ativos"
          value={0}
          description="Em horário de trabalho"
          icon={Users}
        />
        <QuickStatCard
          title="Em Campo"
          value={0}
          description="Fora do escritório"
          icon={MapPin}
        />
        <QuickStatCard
          title="Em Atendimento"
          value={0}
          description="Em cliente"
          icon={Target}
        />
        <QuickStatCard
          title="Em Deslocamento"
          value={0}
          description="A caminho"
          icon={Route}
        />
      </div>

      <PlaceholderCard
        icon={MapPin}
        title="Sistema de Rastreamento"
        description="O módulo de Rastreamento permitirá visualizar a localização dos técnicos em tempo real, respeitando regras de privacidade e janelas de trabalho."
        features={[
          "Mapa em tempo real com posição dos técnicos",
          "Histórico de localização (com auditoria)",
          "Geocercas e alertas de entrada/saída",
          "Respeito à janela de trabalho (privacidade)",
          "Integração com app mobile",
        ]}
      />
    </div>
  );
}

/**
 * Routes Page - Otimização de rotas
 * Requires: trakservice.routing feature
 */
export function RoutesPage() {
  const hasKm = useTrakServiceFeature('km');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Roteirização"
        description="Otimize rotas e reduza custos de deslocamento"
      />
      
      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <QuickStatCard
          title="Rotas Ativas"
          value={0}
          description="Em execução"
          icon={Route}
        />
        <QuickStatCard
          title="KM Hoje"
          value="0 km"
          description="Total percorrido"
          icon={Gauge}
        />
        <QuickStatCard
          title="Economia"
          value="0%"
          description="vs. rota não otimizada"
          icon={DollarSign}
        />
        <QuickStatCard
          title="Tempo Médio"
          value="0 min"
          description="Por atendimento"
          icon={Clock}
        />
      </div>

      <PlaceholderCard
        icon={Route}
        title="Sistema de Roteirização"
        description="O módulo de Roteirização permitirá otimizar rotas de atendimento, reduzindo tempo de deslocamento e custos com combustível."
        features={[
          "Otimização automática de rotas",
          "Consideração de janelas de atendimento",
          "Integração com Google Maps/Waze",
          "Relatórios de economia",
          "Replanejamento em tempo real",
        ]}
      />

      {hasKm && (
        <Card className="border-orange-200 bg-orange-50/50">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Gauge className="h-5 w-5 text-orange-500" />
                Controle de Quilometragem
              </span>
              <Link to="/trakservice/mileage">
                <Button variant="outline" size="sm" className="gap-1">
                  Acessar <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardTitle>
            <CardDescription>
              Gerencie e audite a quilometragem da sua frota
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
}

/**
 * Mileage Page - Controle de quilometragem
 * Requires: trakservice.km feature
 */
export function MileagePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Quilometragem"
        description="Controle e auditoria de quilometragem"
      />
      
      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <QuickStatCard
          title="KM Total Mês"
          value="0 km"
          description="Todos os veículos"
          icon={Gauge}
        />
        <QuickStatCard
          title="Custo Estimado"
          value="R$ 0,00"
          description="Combustível + desgaste"
          icon={DollarSign}
        />
        <QuickStatCard
          title="Média por Técnico"
          value="0 km"
          description="Este mês"
          icon={Users}
        />
        <QuickStatCard
          title="Registros Pendentes"
          value={0}
          description="Aguardando validação"
          icon={Clock}
        />
      </div>

      <PlaceholderCard
        icon={Gauge}
        title="Sistema de Quilometragem"
        description="O módulo de Quilometragem permitirá registrar, validar e auditar a quilometragem dos veículos da equipe, com integração ao TrakLedger para controle de custos."
        features={[
          "Registro de KM inicial/final por viagem",
          "Validação automática via GPS",
          "Relatórios por técnico/veículo/período",
          "Alertas de consumo anormal",
          "Integração com TrakLedger (custos)",
        ]}
      />
    </div>
  );
}

/**
 * Quotes Page - Orçamentos em campo
 * Requires: trakservice.quotes feature
 */
export function QuotesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Orçamentos"
        description="Crie e gerencie orçamentos em campo"
      />
      
      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <QuickStatCard
          title="Orçamentos Abertos"
          value={0}
          description="Aguardando aprovação"
          icon={FileText}
        />
        <QuickStatCard
          title="Aprovados Este Mês"
          value={0}
          description="Convertidos em OS"
          icon={Target}
        />
        <QuickStatCard
          title="Valor Total"
          value="R$ 0,00"
          description="Orçamentos aprovados"
          icon={DollarSign}
        />
        <QuickStatCard
          title="Taxa de Conversão"
          value="0%"
          description="Aprovados / Total"
          icon={Target}
        />
      </div>

      <PlaceholderCard
        icon={FileText}
        title="Sistema de Orçamentos"
        description="O módulo de Orçamentos permitirá criar, enviar e gerenciar orçamentos diretamente do campo, com integração ao TrakLedger."
        features={[
          "Criação rápida de orçamentos em campo",
          "Catálogo de serviços e peças",
          "Envio por e-mail/WhatsApp",
          "Assinatura digital do cliente",
          "Conversão automática em Work Order",
          "Integração com TrakLedger (compromissos)",
        ]}
      />
    </div>
  );
}

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
