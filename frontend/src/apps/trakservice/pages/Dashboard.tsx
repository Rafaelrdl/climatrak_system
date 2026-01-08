/**
 * TrakService Dashboard Page
 * 
 * Main overview page for the TrakService module.
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/PageHeader';
import { 
  Calendar, 
  MapPin, 
  Route, 
  FileText, 
  Users,
  TrendingUp,
} from 'lucide-react';
import { useTrakServiceFeature } from '@/store/useFeaturesStore';

export function TrakServiceDashboard() {
  const hasDispatch = useTrakServiceFeature('dispatch');
  const hasTracking = useTrakServiceFeature('tracking');
  const hasRouting = useTrakServiceFeature('routing');
  const hasQuotes = useTrakServiceFeature('quotes');

  return (
    <div className="space-y-6">
      <PageHeader
        title="TrakService"
        description="Gestão de Field Service"
      />

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {hasDispatch && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Agendamentos Hoje</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">
                Nenhum agendamento para hoje
              </p>
            </CardContent>
          </Card>
        )}

        {hasTracking && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Técnicos em Campo</CardTitle>
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">
                Nenhum técnico em campo
              </p>
            </CardContent>
          </Card>
        )}

        {hasRouting && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Rotas Ativas</CardTitle>
              <Route className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">
                Nenhuma rota ativa
              </p>
            </CardContent>
          </Card>
        )}

        {hasQuotes && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Orçamentos Pendentes</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">
                Nenhum orçamento pendente
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Module Info */}
      <Card>
        <CardHeader>
          <CardTitle>Bem-vindo ao TrakService</CardTitle>
          <CardDescription>
            Módulo de gestão de Field Service para equipes externas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {hasDispatch && (
              <div className="flex items-start gap-3 p-4 rounded-lg border">
                <Calendar className="h-8 w-8 text-orange-500" />
                <div>
                  <h3 className="font-medium">Agenda & Dispatch</h3>
                  <p className="text-sm text-muted-foreground">
                    Agende e distribua trabalhos para sua equipe
                  </p>
                </div>
              </div>
            )}

            {hasTracking && (
              <div className="flex items-start gap-3 p-4 rounded-lg border">
                <MapPin className="h-8 w-8 text-orange-500" />
                <div>
                  <h3 className="font-medium">Rastreamento</h3>
                  <p className="text-sm text-muted-foreground">
                    Acompanhe a localização da equipe em tempo real
                  </p>
                </div>
              </div>
            )}

            {hasRouting && (
              <div className="flex items-start gap-3 p-4 rounded-lg border">
                <Route className="h-8 w-8 text-orange-500" />
                <div>
                  <h3 className="font-medium">Roteirização</h3>
                  <p className="text-sm text-muted-foreground">
                    Otimize rotas e reduza custos de deslocamento
                  </p>
                </div>
              </div>
            )}

            {hasQuotes && (
              <div className="flex items-start gap-3 p-4 rounded-lg border">
                <FileText className="h-8 w-8 text-orange-500" />
                <div>
                  <h3 className="font-medium">Orçamentos</h3>
                  <p className="text-sm text-muted-foreground">
                    Crie e gerencie orçamentos em campo
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3 p-4 rounded-lg border">
              <Users className="h-8 w-8 text-orange-500" />
              <div>
                <h3 className="font-medium">Equipe</h3>
                <p className="text-sm text-muted-foreground">
                  Gerencie sua equipe de campo
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-lg border">
              <TrendingUp className="h-8 w-8 text-orange-500" />
              <div>
                <h3 className="font-medium">Métricas</h3>
                <p className="text-sm text-muted-foreground">
                  Acompanhe performance e KPIs
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
