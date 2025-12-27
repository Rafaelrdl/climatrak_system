/**
 * AssetDetailPage - Página de detalhe de um ativo específico no CMMS
 * 
 * Exibe informações detalhadas do ativo com navegação cruzada para Monitor
 */

import { useParams, useNavigate, Link } from 'react-router-dom';
import { PageHeader, StatCard, Card, CardContent, CardHeader, CardTitle } from '@/shared/ui';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft,
  Package,
  Activity,
  ClipboardList,
  Calendar,
  MapPin,
  Wrench,
  AlertTriangle,
  ExternalLink,
  Clock,
  CheckCircle2,
  FileText
} from 'lucide-react';

// Dados mockados para demonstração
const mockAsset = {
  id: 'asset-001',
  name: 'Chiller Principal',
  tag: 'HVAC-CH-001',
  type: 'Chiller',
  model: 'Carrier 30XA-282',
  manufacturer: 'Carrier',
  location: 'Casa de Máquinas - Subsolo',
  status: 'operational',
  criticality: 'high',
  installDate: '2020-03-15',
  lastMaintenance: '2024-01-10',
  nextMaintenance: '2024-04-10',
  hasMonitoring: true, // Indica se tem sensores IoT
  workOrders: [
    { id: 'WO-001', title: 'Manutenção preventiva trimestral', status: 'completed', date: '2024-01-10' },
    { id: 'WO-002', title: 'Troca de filtros', status: 'in_progress', date: '2024-01-20' },
    { id: 'WO-003', title: 'Inspeção de vazamentos', status: 'open', date: '2024-01-25' },
  ],
};

export function AssetDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  // Em produção, buscar dados reais do ativo
  const asset = mockAsset;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'operational':
        return <Badge className="bg-green-100 text-green-800">Operacional</Badge>;
      case 'maintenance':
        return <Badge className="bg-amber-100 text-amber-800">Em Manutenção</Badge>;
      case 'offline':
        return <Badge className="bg-gray-100 text-gray-800">Offline</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getCriticalityBadge = (criticality: string) => {
    switch (criticality) {
      case 'high':
        return <Badge variant="destructive">Alta Criticidade</Badge>;
      case 'medium':
        return <Badge className="bg-amber-100 text-amber-800">Média Criticidade</Badge>;
      case 'low':
        return <Badge variant="secondary">Baixa Criticidade</Badge>;
      default:
        return <Badge variant="outline">{criticality}</Badge>;
    }
  };

  const getWOStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">Concluída</Badge>;
      case 'in_progress':
        return <Badge className="bg-blue-100 text-blue-800">Em Execução</Badge>;
      case 'open':
        return <Badge className="bg-amber-100 text-amber-800">Aberta</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Navegação de volta */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/cmms/ativos')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar para Ativos
        </Button>
      </div>

      {/* Header com ações */}
      <PageHeader
        title={asset.name}
        description={`${asset.tag} • ${asset.type} • ${asset.model}`}
        icon={<Package className="h-6 w-6" />}
      >
        <div className="flex items-center gap-2 flex-wrap">
          {getStatusBadge(asset.status)}
          {getCriticalityBadge(asset.criticality)}
          
          {/* Botão de navegação cruzada para Monitor */}
          {asset.hasMonitoring && (
            <Button 
              variant="outline" 
              className="border-green-300 text-green-700 hover:bg-green-50"
              onClick={() => navigate(`/monitor/equipamentos/${id}`)}
            >
              <Activity className="h-4 w-4 mr-2" />
              Ver Monitoramento
              <ExternalLink className="h-3 w-3 ml-2" />
            </Button>
          )}
          
          <Button>
            <Wrench className="h-4 w-4 mr-2" />
            Criar OS
          </Button>
        </div>
      </PageHeader>

      {/* Info Bar */}
      <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground flex-wrap">
        <span className="flex items-center gap-1">
          <MapPin className="h-4 w-4" />
          {asset.location}
        </span>
        <span>|</span>
        <span className="flex items-center gap-1">
          <Calendar className="h-4 w-4" />
          Instalado em: {new Date(asset.installDate).toLocaleDateString('pt-BR')}
        </span>
        <span>|</span>
        <span>Fabricante: {asset.manufacturer}</span>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Ordens de Serviço"
          value={asset.workOrders.length}
          description="Total do ativo"
          icon={<ClipboardList className="h-5 w-5" />}
        />
        <StatCard
          title="OS Abertas"
          value={asset.workOrders.filter(wo => wo.status === 'open').length}
          description="Aguardando execução"
          icon={<AlertTriangle className="h-5 w-5" />}
        />
        <StatCard
          title="Última Manutenção"
          value={new Date(asset.lastMaintenance).toLocaleDateString('pt-BR')}
          description="Preventiva"
          icon={<CheckCircle2 className="h-5 w-5" />}
        />
        <StatCard
          title="Próxima Manutenção"
          value={new Date(asset.nextMaintenance).toLocaleDateString('pt-BR')}
          description="Programada"
          icon={<Calendar className="h-5 w-5" />}
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="workorders" className="space-y-4">
        <TabsList>
          <TabsTrigger value="workorders">Ordens de Serviço</TabsTrigger>
          <TabsTrigger value="history">Histórico</TabsTrigger>
          <TabsTrigger value="documents">Documentos</TabsTrigger>
          <TabsTrigger value="details">Detalhes Técnicos</TabsTrigger>
        </TabsList>

        <TabsContent value="workorders">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5" />
                Ordens de Serviço
              </CardTitle>
              <Button size="sm">
                <Wrench className="h-4 w-4 mr-2" />
                Nova OS
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {asset.workOrders.map((wo) => (
                  <div 
                    key={wo.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div>
                        <Link 
                          to={`/cmms/work-orders/${wo.id}`}
                          className="font-medium hover:underline text-primary"
                        >
                          {wo.id}
                        </Link>
                        <p className="text-sm text-muted-foreground">{wo.title}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(wo.date).toLocaleDateString('pt-BR')}
                      </span>
                      {getWOStatusBadge(wo.status)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Histórico de manutenções será exibido aqui</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Manuais e documentos técnicos</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="details">
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Fabricante</p>
                  <p className="font-medium">{asset.manufacturer}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Modelo</p>
                  <p className="font-medium">{asset.model}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tag</p>
                  <p className="font-medium">{asset.tag}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tipo</p>
                  <p className="font-medium">{asset.type}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Banner de Monitoramento IoT */}
      {asset.hasMonitoring && (
        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 rounded-lg">
                  <Activity className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-green-800">Monitoramento IoT Ativo</h3>
                  <p className="text-sm text-green-600">
                    Este ativo possui sensores conectados ao TrakSense Monitor
                  </p>
                </div>
              </div>
              <Button 
                className="bg-green-600 hover:bg-green-700"
                onClick={() => navigate(`/monitor/equipamentos/${id}`)}
              >
                <Activity className="h-4 w-4 mr-2" />
                Abrir TrakSense
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
