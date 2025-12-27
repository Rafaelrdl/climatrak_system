/**
 * MonitorAssetsPage - Página de Ativos do Monitor
 * 
 * Lista de ativos HVAC com integração de telemetria IoT.
 * Permite visualizar status, saúde e consumo dos equipamentos.
 */

import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  Search, 
  ExternalLink, 
  Heart, 
  Zap, 
  AlertCircle,
  RefreshCw,
  Filter,
  Box,
  Pencil
} from 'lucide-react';
import { PageHeader } from '@/shared/ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAssetsQuery } from '../hooks/useAssetsQuery';
import { AssetEditModal } from '../components/AssetEditModal';
import type { Asset, AssetStatus, AssetType } from '../types/asset';

// Helper para cor do status
const getStatusColor = (status: AssetStatus) => {
  switch (status) {
    case 'OK':
    case 'ACTIVE':
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
    case 'Maintenance':
    case 'MAINTENANCE':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
    case 'Stopped':
    case 'INACTIVE':
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
    case 'Alert':
    case 'WARNING':
    case 'ERROR':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400';
  }
};

// Helper para cor da saúde
const getHealthColor = (healthScore: number) => {
  if (healthScore >= 80) return 'text-green-600 dark:text-green-400';
  if (healthScore >= 60) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-red-600 dark:text-red-400';
};

// Helper para ícone do tipo
const getTypeIcon = (type: AssetType) => {
  const icons: Record<string, string> = {
    'Chiller': '❄️',
    'AHU': '🌀',
    'Boiler': '🔥',
    'Pump': '💧',
    'Fan Coil': '🌬️',
    'VRF': '🔄',
    'Split': '❄️',
    'Condensadora': '🏭',
    'Torre de Resfriamento': '🗼',
  };
  return icons[type] || '🏭';
};

export function MonitorAssetsPage() {
  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Modal de edição
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);

  // Construir filtros para a API
  const filters = {
    asset_type: filterType !== 'all' ? filterType : undefined,
    status: filterStatus !== 'all' ? filterStatus : undefined,
    search: searchTerm || undefined,
  };

  const { data: assets = [], isLoading, error, refetch } = useAssetsQuery(filters);

  // Filtro local para busca em tempo real
  const filteredAssets = useMemo(() => {
    return assets.filter(asset => {
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        return asset.tag?.toLowerCase().includes(term) ||
               asset.name?.toLowerCase().includes(term) ||
               asset.location?.toLowerCase().includes(term);
      }
      return true;
    });
  }, [assets, searchTerm]);

  // Contadores por status
  const statusCounts = useMemo(() => ({
    normal: assets.filter(a => a.status === 'OK' || a.status === 'ACTIVE').length,
    maintenance: assets.filter(a => a.status === 'Maintenance' || a.status === 'MAINTENANCE').length,
    alert: assets.filter(a => a.status === 'Alert' || a.status === 'WARNING').length,
    stopped: assets.filter(a => a.status === 'Stopped' || a.status === 'INACTIVE' || a.status === 'ERROR').length,
  }), [assets]);

  // Função para abrir modal de edição
  const handleEditAsset = (asset: Asset) => {
    setSelectedAsset(asset);
    setEditModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ativos Monitorados"
        description="Gerenciamento e monitoramento de equipamentos HVAC"
        icon={<Box className="h-6 w-6" />}
      >
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => refetch()}
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </PageHeader>

      {/* Loading State */}
      {isLoading && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 flex items-center gap-3">
          <RefreshCw className="h-5 w-5 animate-spin text-blue-600" />
          <span className="text-blue-700 dark:text-blue-400 font-medium">Carregando ativos...</span>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <div>
            <div className="text-red-700 dark:text-red-400 font-medium">Erro ao carregar dados</div>
            <div className="text-red-600 dark:text-red-500 text-sm">{(error as Error).message}</div>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-4 p-4 bg-card rounded-lg shadow-sm border border-border">
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por tag, nome ou localização..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-xs"
          />
        </div>

        <div className="flex items-center gap-3">
          <Filter className="h-4 w-4 text-muted-foreground" />
          
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Tipos</SelectItem>
              <SelectItem value="Chiller">Chiller</SelectItem>
              <SelectItem value="AHU">AHU</SelectItem>
              <SelectItem value="Boiler">Boiler</SelectItem>
              <SelectItem value="Fan Coil">Fan Coil</SelectItem>
              <SelectItem value="VRF">VRF</SelectItem>
              <SelectItem value="Split">Split</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Status</SelectItem>
              <SelectItem value="OK">Normal</SelectItem>
              <SelectItem value="Maintenance">Manutenção</SelectItem>
              <SelectItem value="Alert">Alerta</SelectItem>
              <SelectItem value="Stopped">Parado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="text-sm text-muted-foreground">
          {filteredAssets.length} de {assets.length} ativos
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card rounded-lg p-4 border border-border">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {statusCounts.normal}
          </div>
          <div className="text-sm text-muted-foreground">Ativos Normais</div>
        </div>
        
        <div className="bg-card rounded-lg p-4 border border-border">
          <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
            {statusCounts.maintenance}
          </div>
          <div className="text-sm text-muted-foreground">Em Manutenção</div>
        </div>
        
        <div className="bg-card rounded-lg p-4 border border-border">
          <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
            {statusCounts.alert}
          </div>
          <div className="text-sm text-muted-foreground">Com Alertas</div>
        </div>
        
        <div className="bg-card rounded-lg p-4 border border-border">
          <div className="text-2xl font-bold text-red-600 dark:text-red-400">
            {statusCounts.stopped}
          </div>
          <div className="text-sm text-muted-foreground">Parados</div>
        </div>
      </div>

      {/* Assets Table */}
      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left py-4 px-6 font-medium text-muted-foreground">Ativo</th>
                <th className="text-left py-4 px-6 font-medium text-muted-foreground">Tipo</th>
                <th className="text-left py-4 px-6 font-medium text-muted-foreground">Localização</th>
                <th className="text-left py-4 px-6 font-medium text-muted-foreground">Saúde (%)</th>
                <th className="text-left py-4 px-6 font-medium text-muted-foreground">kWh/dia</th>
                <th className="text-left py-4 px-6 font-medium text-muted-foreground">Status</th>
                <th className="text-left py-4 px-6 font-medium text-muted-foreground">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredAssets.map((asset) => (
                <tr key={asset.id} className="border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors">
                  <td className="py-4 px-6">
                    <div className="flex items-center space-x-3">
                      <div className="text-2xl">{getTypeIcon(asset.type)}</div>
                      <div>
                        <Link
                          to={`/monitor/ativos/${asset.id}`}
                          className="font-semibold text-primary hover:text-primary/80"
                        >
                          {asset.tag}
                        </Link>
                        {asset.specifications?.capacity && (
                          <div className="text-xs text-muted-foreground">
                            {asset.specifications.capacity} {asset.type === 'Chiller' ? 'tons' : 'kW'}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  
                  <td className="py-4 px-6">
                    <span className="text-sm font-medium">{asset.type}</span>
                  </td>
                  
                  <td className="py-4 px-6">
                    <span className="text-sm">{asset.location}</span>
                  </td>
                  
                  <td className="py-4 px-6">
                    <div className="flex items-center space-x-2">
                      <Heart className={`w-4 h-4 ${getHealthColor(asset.healthScore || 0)}`} />
                      <span className={`font-medium ${getHealthColor(asset.healthScore || 0)}`}>
                        {asset.healthScore ? asset.healthScore.toFixed(0) : '0'}%
                      </span>
                    </div>
                  </td>
                  
                  <td className="py-4 px-6">
                    <div className="flex items-center space-x-2">
                      <Zap className="w-4 h-4 text-yellow-600" />
                      <span className="text-sm">
                        {asset.powerConsumption ? asset.powerConsumption.toLocaleString('pt-BR') : '0'}
                      </span>
                    </div>
                  </td>
                  
                  <td className="py-4 px-6">
                    <div className="flex items-center space-x-2">
                      {(asset.status === 'Alert' || asset.status === 'WARNING') && (
                        <AlertCircle className="w-4 h-4 text-orange-500" />
                      )}
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(asset.status)}`}>
                        {asset.status}
                      </span>
                    </div>
                  </td>
                  
                  <td className="py-4 px-6">
                    <div className="flex items-center space-x-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditAsset(asset)}
                        className="h-8 px-2"
                        title="Editar ativo"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Link
                        to={`/monitor/ativos/${asset.id}`}
                        className="text-primary hover:text-primary/80 text-sm font-medium"
                      >
                        Detalhes
                      </Link>
                      <span className="text-muted-foreground">•</span>
                      <Link
                        to={`/cmms/ativos/${asset.id}`}
                        className="text-muted-foreground hover:text-foreground text-sm flex items-center space-x-1"
                        title="Abrir no CMMS"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>CMMS</span>
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredAssets.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <div className="text-muted-foreground mb-4">
              <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum ativo encontrado</p>
              <p className="text-sm">Tente ajustar os filtros ou termo de busca</p>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Edição */}
      <AssetEditModal
        asset={selectedAsset}
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
      />
    </div>
  );
}
