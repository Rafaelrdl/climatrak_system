/**
 * TrakService Placeholder Pages
 * 
 * Placeholder implementations for TrakService pages.
 * These will be replaced with full implementations.
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/PageHeader';
import { Calendar, MapPin, Route, FileText, Users, Settings } from 'lucide-react';

// Dispatch Page
export function DispatchPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Agenda & Dispatch"
        subtitle="Agende e distribua trabalhos para sua equipe"
      />
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-orange-500" />
            Dispatch
          </CardTitle>
          <CardDescription>
            Funcionalidade em desenvolvimento
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            O módulo de Dispatch permitirá agendar e distribuir ordens de serviço 
            para técnicos em campo, com visualização em calendário e mapa.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// Tracking Page
export function TrackingPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Rastreamento"
        subtitle="Acompanhe a localização da equipe em tempo real"
      />
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-orange-500" />
            Rastreamento
          </CardTitle>
          <CardDescription>
            Funcionalidade em desenvolvimento
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            O módulo de Rastreamento permitirá visualizar a localização dos 
            técnicos em tempo real, respeitando regras de privacidade e 
            janelas de trabalho.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// Routes Page
export function RoutesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Roteirização"
        subtitle="Otimize rotas e reduza custos de deslocamento"
      />
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Route className="h-5 w-5 text-orange-500" />
            Rotas
          </CardTitle>
          <CardDescription>
            Funcionalidade em desenvolvimento
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            O módulo de Roteirização permitirá otimizar rotas de atendimento, 
            reduzindo tempo de deslocamento e custos com combustível.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// Quotes Page
export function QuotesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Orçamentos"
        subtitle="Crie e gerencie orçamentos em campo"
      />
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-orange-500" />
            Orçamentos
          </CardTitle>
          <CardDescription>
            Funcionalidade em desenvolvimento
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            O módulo de Orçamentos permitirá criar, enviar e gerenciar 
            orçamentos diretamente do campo, com integração ao Finance.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// Team Page
export function TeamPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Equipe"
        subtitle="Gerencie sua equipe de campo"
      />
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-orange-500" />
            Equipe
          </CardTitle>
          <CardDescription>
            Funcionalidade em desenvolvimento
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            O módulo de Equipe permitirá gerenciar técnicos, 
            habilidades, disponibilidade e performance.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// Settings Page
export function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Configurações"
        subtitle="Configure o módulo TrakService"
      />
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-orange-500" />
            Configurações
          </CardTitle>
          <CardDescription>
            Funcionalidade em desenvolvimento
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            As configurações do TrakService permitirão ajustar 
            preferências de rastreamento, notificações, integrações e mais.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
