import { useState, useMemo, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { LocationTree } from '@/components/LocationTree';
import { LocationDetails } from '@/components/LocationDetails';
import { LocationFormModal } from '@/components/LocationFormModal';
import { EquipmentSearch } from '@/components/EquipmentSearch';
import { EquipmentStatusTracking } from '@/components/EquipmentStatusTracking';
import { EquipmentEditModal } from '@/components/EquipmentEditModal';
import { AssetUtilizationDashboard } from '@/components/AssetUtilizationDashboard';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Building2, MapPin, Users, Search, BarChart3, Activity, Info, Calendar, FileText } from 'lucide-react';
import { useEquipments, equipmentKeys } from '@/hooks/useEquipmentQuery';
import { useSectors, useSubsections, useCompanies } from '@/hooks/useLocationsQuery';
import { LocationProvider, useLocation as useLocationContext } from '@/contexts/LocationContext';
import { IfCan } from '@/components/auth/IfCan';
import { useRoleBasedData, DataFilterInfo } from '@/components/data/FilteredDataProvider';
import { useAbility } from '@/hooks/useAbility';
import { equipmentService } from '@/services/equipmentService';
import type { Equipment, SubSection } from '@/types';

/**
 * PÁGINA DE GESTÃO DE ATIVOS
 * 
 * Esta é a página principal para gestão de ativos/equipamentos do sistema.
 * Combina todos os componentes relacionados a locais (empresas, setores, subsetores)
 * com funcionalidades de busca, análise e criação de equipamentos.
 * 
 * Funcionalidades principais:
 * - Menu hierárquico de locais (LocationTree)
 * - Busca e listagem de equipamentos
 * - Dashboard de análises de utilização
 * - Criação e edição de locais e equipamentos
 * - Controle de acesso baseado em permissões
 */

/**
 * COMPONENTE PRINCIPAL DO CONTEÚDO DE ATIVOS
 * 
 * Este componente contém toda a lógica e interface da página de ativos.
 * Deve ser envolvido pelo LocationProvider para ter acesso ao contexto de locais.
 */
function AssetsContent() {
  // ========== HOOKS PARA DADOS ==========
  // React Query hooks
  const queryClient = useQueryClient();
  const { data: equipment = [], refetch: refetchEquipments, isLoading, isFetching } = useEquipments();
  const { data: sectors = [] } = useSectors();
  const { data: subSections = [] } = useSubsections();
  const { data: companies = [] } = useCompanies();
  
  // Debug: log equipment data to check if location fields are present
  useEffect(() => {
  }, [equipment]);
  
  // Force refetch on mount to get fresh data with location fields
  useEffect(() => {

    queryClient.invalidateQueries({ queryKey: ['equipment'] });
  }, [queryClient]);
  
  // ========== CONTEXTO E PERMISSÕES ==========
  // Obtém o nó/local selecionado na árvore de locais
  const { selectedNode } = useLocationContext();
  // Obtém informações sobre as permissões do usuário atual
  const { role } = useAbility();
  
  // ========== FILTROS BASEADOS EM PERMISSÕES ==========
  // Memoiza as opções de filtro para evitar re-renderizações desnecessárias
  const filterOptions = useMemo(() => ({
    includeInactive: role === 'admin' // Apenas admin pode ver ativos inativos
  }), [role]);

  // Aplica filtros baseados na função do usuário aos dados de equipamentos
  const { data: filteredEquipmentData, stats: equipmentFilterStats } = useRoleBasedData(
    equipment || [], 
    'asset',
    filterOptions
  );
  
  // ========== ESTADOS DO COMPONENTE ==========
  // Controla a abertura do modal de criação/edição de equipamento
  const [isEquipmentDialogOpen, setIsEquipmentDialogOpen] = useState(false);
  // Controla a abertura do modal de locais (empresa/setor/subsetor)
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  // Define se o modal de local está em modo criar ou editar
  const [locationModalMode, setLocationModalMode] = useState<'create' | 'edit'>('create');
  // Define o tipo de local sendo criado/editado (empresa, setor ou subsetor)
  const [locationModalType, setLocationModalType] = useState<'company' | 'sector' | 'subsection'>('company');
  // Controla qual aba está ativa (ativos, análises ou local)
  const [activeTab, setActiveTab] = useState('search');
  // Lista de equipamentos filtrados para exibição
  const [filteredEquipment, setFilteredEquipment] = useState<Equipment[]>(filteredEquipmentData);
  // Equipamento selecionado para rastreamento de status
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
  // Controla a abertura do modal de rastreamento de status
  const [isStatusTrackingOpen, setIsStatusTrackingOpen] = useState(false);
  // Controla a abertura do modal de edição de equipamento
  const [isEquipmentEditModalOpen, setIsEquipmentEditModalOpen] = useState(false);
  // Equipamento sendo editado
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null);

  // ========== EFEITO PARA ATUALIZAR EQUIPAMENTOS FILTRADOS ==========
  // Atualiza os equipamentos filtrados quando os dados baseados em função mudam
  // ou quando a localização selecionada muda
  useEffect(() => {
    // Garante que temos dados de equipamentos válidos
    const validEquipmentData = Array.isArray(filteredEquipmentData) ? filteredEquipmentData as Equipment[] : [];
    
    if (!selectedNode) {
      // Se nenhum nó estiver selecionado, mostra todos os equipamentos filtrados por permissão
      setFilteredEquipment(validEquipmentData);
      return;
    }

    // Filtra equipamentos baseado no tipo e ID do nó selecionado
    let filteredByLocation: Equipment[] = [];
    
    // Helper function to extract original ID from unique node ID
    const extractOriginalId = (nodeId: string, type: 'sector' | 'subsection'): string | null => {
      if (!nodeId) return null;
      
      if (type === 'sector' && nodeId.includes('sector-')) {
        const match = nodeId.match(/sector-(\d+)(?:-|$)/);
        return match ? match[1] : null;
      }
      
      if (type === 'subsection' && nodeId.includes('subsection-')) {
        const match = nodeId.match(/subsection-(\d+)$/);
        return match ? match[1] : null;
      }
      
      return nodeId; // Return as is if no pattern matches
    };
    
    switch (selectedNode.type) {
      case 'company': {
        // Para empresas, filtra equipamentos que pertencem a setores desta empresa
        // Extrai o ID original da empresa do formato "company-1"
        const companyId = selectedNode.id.replace('company-', '');
        const companySectors = sectors.filter(s => s.companyId === companyId);
        const sectorIds = companySectors.map(s => s.id);
        
        filteredByLocation = validEquipmentData.filter(
          (eq: Equipment) => eq.sectorId && sectorIds.includes(eq.sectorId)
        );
        break;
      }
      
      case 'sector': {
        // Para setores, filtra equipamentos deste setor específico
        const originalSectorId = extractOriginalId(selectedNode.id, 'sector');
        
        filteredByLocation = validEquipmentData.filter(
          (eq: Equipment) => eq.sectorId === originalSectorId
        );
        break;
      }
      
      case 'subsection': {
        // Para subsetores, filtra equipamentos deste subsetor específico
        const originalSubsectionId = extractOriginalId(selectedNode.id, 'subsection');
        
        filteredByLocation = validEquipmentData.filter(
          (eq: Equipment) => eq.subSectionId === originalSubsectionId
        );
        break;
      }
      
      default:
        filteredByLocation = validEquipmentData;
    }
    
    setFilteredEquipment(filteredByLocation);
  }, [selectedNode, filteredEquipmentData, sectors]);

  // ========== ESTADO DO FORMULÁRIO DE NOVO EQUIPAMENTO ==========
  // Estado para armazenar os dados do formulário de criação de equipamento
  const [newEquipment, setNewEquipment] = useState({
    tag: '',           // Identificação única do equipamento (ex: AC-001)
    model: '',         // Modelo do equipamento
    brand: '',         // Marca do equipamento
    type: 'SPLIT' as Equipment['type'], // Tipo do equipamento (SPLIT, CENTRAL, VRF, CHILLER)
    status: 'FUNCTIONING' as Equipment['status'], // Status do equipamento (FUNCTIONING, MAINTENANCE, STOPPED)
    capacity: '',      // Capacidade em BTUs
    criticidade: 'MEDIA' as Equipment['criticidade'], // Criticidade do equipamento (BAIXA, MEDIA, ALTA)
    sectorId: '',      // ID do setor onde o equipamento está localizado
    subSectionId: '',  // ID do subsetor (opcional)
    installDate: '',   // Data de instalação
    nextMaintenance: '', // Data da próxima manutenção
    serialNumber: '',  // Número de série
    warrantyExpiry: '', // Data de expiração da garantia
    location: '',      // Localização específica (ex: Sala 101, Teto - Posição A)
    notes: ''          // Observações adicionais
  });

  // ========== FUNÇÕES DE MANIPULAÇÃO ==========
  
  /**
   * ADICIONAR NOVO EQUIPAMENTO
   * 
   * Cria um novo equipamento com base nos dados do formulário.
   * Auto-vincula o equipamento ao local selecionado na árvore quando possível.
   */
  const handleAddEquipment = () => {
    // Helper function to extract original ID from unique node ID
    const extractOriginalId = (nodeId: string, type: 'sector' | 'subsection'): string | null => {
      if (!nodeId) return null;
      
      if (type === 'sector' && nodeId.includes('sector-')) {
        const match = nodeId.match(/sector-(\d+)(?:-|$)/);
        return match ? match[1] : null;
      }
      
      if (type === 'subsection' && nodeId.includes('subsection-')) {
        const match = nodeId.match(/subsection-(\d+)$/);
        return match ? match[1] : null;
      }
      
      return null;
    };
    
    const equipment_data: Equipment = {
      id: Date.now().toString(), // ID único baseado no timestamp
      ...newEquipment,
      capacity: parseInt(newEquipment.capacity), // Converte capacidade para número
      status: newEquipment.status, // Usa o status selecionado no formulário
      totalOperatingHours: 0, // Horas de operação inicial
      energyConsumption: Math.floor(Math.random() * 200) + 150, // Consumo de energia mockado
      // Auto-vinculação ao local selecionado na árvore usando IDs originais
      sectorId: selectedNode?.type === 'sector' ? extractOriginalId(selectedNode.id, 'sector') || newEquipment.sectorId : 
                selectedNode?.type === 'subsection' ? (selectedNode.data as SubSection).sectorId :
                newEquipment.sectorId,
      subSectionId: selectedNode?.type === 'subsection' ? extractOriginalId(selectedNode.id, 'subsection') || newEquipment.subSectionId : newEquipment.subSectionId
    };
    
    // Adiciona o novo equipamento à lista existente
    // TODO: Implementar useCreateEquipment mutation quando API estiver pronta

    // setEquipment((current) => [...(current || []), equipment_data]);
    
    // Reset do formulário para valores iniciais
    setNewEquipment({
      tag: '',
      model: '',
      brand: '',
      type: 'SPLIT',
      status: 'FUNCTIONING',
      capacity: '',
      criticidade: 'MEDIA',
      sectorId: '',
      subSectionId: '',
      installDate: '',
      nextMaintenance: '',
      serialNumber: '',
      warrantyExpiry: '',
      location: '',
      notes: ''
    });
    
    // Fecha o modal de criação
    setIsEquipmentDialogOpen(false);
  };

  /**
   * EDITAR EQUIPAMENTO EXISTENTE
   * 
   * Abre o modal para edição de um equipamento existente.
   * Busca dados frescos da API para garantir informações atualizadas.
   * 
   * @param equipment - Equipamento a ser editado
   */
  const handleEditEquipment = useCallback(async (equipment: Equipment) => {
    try {
      // Buscar dados frescos da API para garantir que temos as informações mais recentes
      const freshEquipment = await equipmentService.getById(equipment.id);
      setEditingEquipment(freshEquipment);
      setIsEquipmentEditModalOpen(true);
    } catch (error) {
      console.error('Erro ao buscar equipamento:', error);
      // Fallback para dados do cache se a busca falhar
      setEditingEquipment(equipment);
      setIsEquipmentEditModalOpen(true);
    }
  }, []);

  /**
   * CRIAR NOVO LOCAL
   * 
   * Abre o modal para criação de um novo local (empresa, setor ou subsetor).
   * 
   * @param type - Tipo de local a ser criado
   */
  const handleCreateLocation = (type: 'company' | 'sector' | 'subsection') => {
    setLocationModalType(type);
    setLocationModalMode('create');
    setIsLocationModalOpen(true);
  };

  /**
   * EDITAR LOCAL SELECIONADO
   * 
   * Abre o modal para edição do local atualmente selecionado na árvore.
   * Só funciona se há um local selecionado.
   */
  const handleEditLocation = () => {
    if (!selectedNode) return;
    setLocationModalType(selectedNode.type);
    setLocationModalMode('edit');
    setIsLocationModalOpen(true);
  };

  /**
   * SELECIONAR EQUIPAMENTO PARA RASTREAMENTO
   * 
   * Define o equipamento selecionado e abre o modal de rastreamento de status.
   * 
   * @param selectedEquipment - Equipamento selecionado
   */
  const handleEquipmentSelect = (selectedEquipment: Equipment) => {
    setSelectedEquipment(selectedEquipment);
    setIsStatusTrackingOpen(true);
  };

  /**
   * ATUALIZAR RESULTADOS FILTRADOS
   * 
   * Callback chamado quando os filtros de busca são aplicados.
   * Atualiza a lista de equipamentos exibidos.
   * 
   * @param filtered - Lista de equipamentos filtrados
   */
  const handleFilteredResults = (filtered: Equipment[]) => {
    setFilteredEquipment(filtered);
  };

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-8rem)]">
      {/* ========== BARRA LATERAL - ÁRVORE DE LOCAIS ========== */}
      {/* Oculta no mobile, visível no desktop */}
      <div className="hidden lg:flex w-80 border-r bg-card">
        <div className="flex flex-col h-full w-full">
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="font-semibold text-lg">Locais</h3>
          </div>
          {/* Componente da árvore hierárquica de locais */}
          <LocationTree />
        </div>
      </div>
      
      {/* ========== CONTEÚDO PRINCIPAL ========== */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* ========== CABEÇALHO COM BOTÕES DE AÇÃO ========== */}
        <div className="p-4 lg:p-6 border-b bg-background">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <h1 className="text-xl lg:text-2xl font-bold">Gestão de Ativos</h1>
            
            {/* Informações sobre filtros de dados aplicados */}
            {equipmentFilterStats.filtered > 0 && (
              <DataFilterInfo
                filterStats={equipmentFilterStats}
                dataType="asset"
                canViewAll={role === 'admin'}
                className="lg:max-w-md"
              />
            )}
            
            {/* Árvore de locais no mobile (componente colapsável) */}
            <div className="lg:hidden">
              <LocationTree />
            </div>
            
            {/* Botões para criar novos locais - com controle de permissões */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Botão para criar empresa - apenas usuários com permissão */}
              <IfCan action="create" subject="asset">
                <Button 
                  onClick={() => handleCreateLocation('company')}
                  className="flex items-center gap-2 text-sm"
                  size="sm"
                  data-testid="company-create"
                >
                  <Building2 className="h-4 w-4" />
                  + Empresa
                </Button>
              </IfCan>
              
              {/* Botão para criar setor - desabilitado se não há empresas */}
              <IfCan action="create" subject="asset">
                <Button 
                  onClick={() => handleCreateLocation('sector')}
                  disabled={companies.length === 0}
                  variant="outline"
                  className="flex items-center gap-2 text-sm"
                  size="sm"
                  data-testid="sector-create"
                >
                  <MapPin className="h-4 w-4" />
                  + Setor
                </Button>
              </IfCan>
              
              {/* Botão para criar subsetor - desabilitado se não há setores */}
              <IfCan action="create" subject="asset">
                <Button 
                  onClick={() => handleCreateLocation('subsection')}
                  disabled={sectors.length === 0}
                  variant="outline"
                  className="flex items-center gap-2 text-sm"
                  size="sm"
                  data-testid="subsection-create"
                >
                  <Users className="h-4 w-4" />
                  + Subsetor
                </Button>
              </IfCan>
            </div>
          </div>
        </div>

        {/* ========== SISTEMA DE ABAS PARA GESTÃO DE EQUIPAMENTOS ========== */}
        <div className="flex-1 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            {/* Navegação das abas */}
            <div className="border-b bg-background px-4 lg:px-6">
              <TabsList className="grid w-full max-w-md grid-cols-3">
                {/* Aba de ativos/equipamentos */}
                <TabsTrigger value="search" className="flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  Ativos
                </TabsTrigger>
                {/* Aba de análises e dashboards */}
                <TabsTrigger value="analytics" className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Análises
                </TabsTrigger>
                {/* Aba de detalhes dos locais */}
                <TabsTrigger value="locations" className="flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Local
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Conteúdo das abas */}
            <div className="flex-1 overflow-auto">
              {/* ABA DE ATIVOS - Componente para buscar e filtrar equipamentos */}
              <TabsContent value="search" className="h-full p-4 lg:p-6 m-0">
                <EquipmentSearch
                  equipment={filteredEquipmentData}
                  selectedLocation={selectedNode?.id}
                  onFilteredResults={handleFilteredResults}
                  onEquipmentSelect={handleEquipmentSelect}
                  showCreateButton={true} // Sempre mostrar para debug
                  onCreateAsset={() => {

                    setIsEquipmentDialogOpen(true);
                  }}
                  onEditAsset={handleEditEquipment}
                />
              </TabsContent>

              {/* ABA DE ANÁLISES - Dashboard de utilização de ativos */}
              <TabsContent value="analytics" className="h-full p-4 lg:p-6 m-0">
                <AssetUtilizationDashboard
                  equipment={filteredEquipment}
                  selectedLocation={selectedNode?.id}
                />
              </TabsContent>

              {/* ABA DE LOCAL - Detalhes do local selecionado */}
              <TabsContent value="locations" className="h-full p-4 lg:p-6 m-0">
                <LocationDetails 
                  onEdit={handleEditLocation}
                />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>

      {/* ========== MODAL DE RASTREAMENTO DE STATUS DO EQUIPAMENTO ========== */}
      {/* Exibe detalhes e permite rastrear o status de um equipamento específico */}
      {selectedEquipment && (
        <EquipmentStatusTracking
          equipment={selectedEquipment}
          isOpen={isStatusTrackingOpen}
          onClose={() => {
            setIsStatusTrackingOpen(false);
            setSelectedEquipment(null);
          }}
        />
      )}

      {/* ========== MODAL DE CRIAÇÃO DE EQUIPAMENTO ========== */}
      {/* Formulário completo para adicionar um novo equipamento */}
      <Dialog open={isEquipmentDialogOpen} onOpenChange={setIsEquipmentDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-6 md:p-8">
          <DialogHeader className="mb-6">
            <DialogTitle className="text-2xl">Adicionar Equipamento</DialogTitle>
            <DialogDescription>
              Preencha os dados do equipamento para adicioná-lo ao sistema. Os campos marcados com * são obrigatórios.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-8">
            {/* ========== SEÇÃO: INFORMAÇÕES BÁSICAS ========== */}
            <div className="bg-muted/30 rounded-lg p-6 border border-border/50">
              <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
                <Info className="w-4 h-4 text-primary" />
                Informações Básicas
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                {/* Tag do equipamento - campo mais importante ocupa coluna inteira */}
                <div className="md:col-span-2">
                  <Label htmlFor="tag" className="mb-2 block">
                    Tag do Equipamento *
                    <span className="text-xs text-muted-foreground ml-2 font-normal">
                      Identificação única do equipamento
                    </span>
                  </Label>
                  <Input 
                    id="tag"
                    value={newEquipment.tag}
                    onChange={(e) => setNewEquipment(prev => ({ ...prev, tag: e.target.value }))}
                    placeholder="CLI-001"
                    required
                    className="h-10"
                  />
                </div>
                
                {/* Tipo do equipamento */}
                <div>
                  <Label htmlFor="type" className="mb-2 block">Tipo do Equipamento *</Label>
                  <Select 
                    value={newEquipment.type} 
                    onValueChange={(value: Equipment['type']) => 
                      setNewEquipment(prev => ({ ...prev, type: value }))
                    }
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SPLIT">Split</SelectItem>
                      <SelectItem value="VRF">VRF</SelectItem>
                      <SelectItem value="CENTRAL">Central</SelectItem>
                      <SelectItem value="CHILLER">Chiller</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Marca do equipamento */}
                <div>
                  <Label htmlFor="brand" className="mb-2 block">Marca *</Label>
                  <Input 
                    id="brand"
                    value={newEquipment.brand}
                    onChange={(e) => setNewEquipment(prev => ({ ...prev, brand: e.target.value }))}
                    placeholder="Daikin, Carrier, etc"
                    required
                    className="h-10"
                  />
                </div>
                
                {/* Modelo */}
                <div>
                  <Label htmlFor="model" className="mb-2 block">Modelo *</Label>
                  <Input 
                    id="model"
                    value={newEquipment.model}
                    onChange={(e) => setNewEquipment(prev => ({ ...prev, model: e.target.value }))}
                    placeholder="Inverter 18000"
                    required
                    className="h-10"
                  />
                </div>
                
                <div>
                  <Label htmlFor="capacity" className="mb-2 block">
                    Capacidade (BTUs) *
                    <span className="text-xs text-muted-foreground ml-2 font-normal">
                      Potência do equipamento
                    </span>
                  </Label>
                  <Input 
                    id="capacity"
                    type="number"
                    value={newEquipment.capacity}
                    onChange={(e) => setNewEquipment(prev => ({ ...prev, capacity: e.target.value }))}
                    placeholder="18000"
                    required
                    className="h-10"
                  />
                </div>
                
                {/* Criticidade do equipamento */}
                <div>
                  <Label htmlFor="criticidade" className="mb-2 block">
                    Criticidade *
                    <span className="text-xs text-muted-foreground ml-2 font-normal">
                      Nível de importância operacional
                    </span>
                  </Label>
                  <Select 
                    value={newEquipment.criticidade} 
                    onValueChange={(value: Equipment['criticidade']) => 
                      setNewEquipment(prev => ({ ...prev, criticidade: value }))
                    }
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Selecione a criticidade" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BAIXA">🔵 Baixa</SelectItem>
                      <SelectItem value="MEDIA">🟢 Média</SelectItem>
                      <SelectItem value="ALTA">🟠 Alta</SelectItem>
                      <SelectItem value="CRITICA">🔴 Crítica</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Status do equipamento */}
                <div>
                  <Label htmlFor="status" className="mb-2 block">
                    Status *
                    <span className="text-xs text-muted-foreground ml-2 font-normal">
                      Estado operacional do equipamento
                    </span>
                  </Label>
                  <Select 
                    value={newEquipment.status} 
                    onValueChange={(value: Equipment['status']) => 
                      setNewEquipment(prev => ({ ...prev, status: value }))
                    }
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Selecione o status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FUNCTIONING">🟢 Ativo</SelectItem>
                      <SelectItem value="MAINTENANCE">🟡 Em Manutenção</SelectItem>
                      <SelectItem value="STOPPED">🔴 Desativado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Número de série (opcional) */}
                <div>
                  <Label htmlFor="serialNumber" className="mb-2 block">
                    Número de Série
                    <span className="text-xs text-muted-foreground ml-2 font-normal">(opcional)</span>
                  </Label>
                  <Input 
                    id="serialNumber"
                    value={newEquipment.serialNumber}
                    onChange={(e) => setNewEquipment(prev => ({ ...prev, serialNumber: e.target.value }))}
                    placeholder="SN123456789"
                    className="h-10"
                  />
                </div>
              </div>
            </div>

            {/* ========== SEÇÃO: INFORMAÇÕES DE LOCALIZAÇÃO ========== */}
            <div className="bg-muted/30 rounded-lg p-6 border border-border/50">
              <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                Informações de Localização
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                {/* Seletor de Setor */}
                <div>
                  <Label htmlFor="sector" className="mb-2 block">Setor *</Label>
                  <Select 
                    value={newEquipment.sectorId} 
                    onValueChange={(value) => setNewEquipment(prev => ({
                      ...prev,
                      sectorId: value,
                      subSectionId: ''  // Resetar subsection ao mudar de setor
                    }))}
                    disabled={selectedNode?.type === 'sector' || selectedNode?.type === 'subsection'}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Selecione o setor" />
                    </SelectTrigger>
                    <SelectContent>
                      {sectors.map(sector => (
                        <SelectItem key={sector.id} value={sector.id}>
                          {sector.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Seletor de Subsetor */}
                <div>
                  <Label htmlFor="subsection" className="mb-2 block">
                    Subsetor
                    <span className="text-xs text-muted-foreground ml-2 font-normal">(se aplicável)</span>
                  </Label>
                  <Select 
                    value={newEquipment.subSectionId} 
                    onValueChange={(value) => setNewEquipment(prev => ({
                      ...prev,
                      subSectionId: value
                    }))}
                    disabled={selectedNode?.type === 'subsection' || !newEquipment.sectorId}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Selecione o subsetor" />
                    </SelectTrigger>
                    <SelectContent>
                      {subSections
                        .filter(ss => ss.sectorId === newEquipment.sectorId)
                        .map(subSection => (
                          <SelectItem key={subSection.id} value={subSection.id}>
                            {subSection.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Localização específica */}
                <div className="md:col-span-2">
                  <Label htmlFor="location" className="mb-2 block">Localização Específica</Label>
                  <Input 
                    id="location"
                    value={newEquipment.location}
                    onChange={(e) => setNewEquipment(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="Sala 101, Corredor principal, etc."
                    className="h-10"
                  />
                </div>
              </div>
            </div>

            {/* ========== SEÇÃO: DATAS E GARANTIA ========== */}
            <div className="bg-muted/30 rounded-lg p-6 border border-border/50">
              <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                Datas e Garantia
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-5">
                {/* Data de instalação */}
                <div>
                  <Label htmlFor="installDate" className="mb-2 block">Data de Instalação *</Label>
                  <Input 
                    id="installDate"
                    type="date"
                    value={newEquipment.installDate}
                    onChange={(e) => setNewEquipment(prev => ({ ...prev, installDate: e.target.value }))}
                    required
                    className="h-10"
                  />
                </div>
                
                {/* Próxima manutenção */}
                <div>
                  <Label htmlFor="nextMaintenance" className="mb-2 block">Próxima Manutenção *</Label>
                  <Input 
                    id="nextMaintenance"
                    type="date"
                    value={newEquipment.nextMaintenance}
                    onChange={(e) => setNewEquipment(prev => ({ ...prev, nextMaintenance: e.target.value }))}
                    required
                    className="h-10"
                  />
                </div>
                
                {/* Fim da garantia */}
                <div>
                  <Label htmlFor="warrantyExpiry" className="mb-2 block">
                    Fim da Garantia
                    <span className="text-xs text-muted-foreground ml-2 font-normal">(opcional)</span>
                  </Label>
                  <Input 
                    id="warrantyExpiry"
                    type="date"
                    value={newEquipment.warrantyExpiry}
                    onChange={(e) => setNewEquipment(prev => ({ ...prev, warrantyExpiry: e.target.value }))}
                    className="h-10"
                  />
                </div>
              </div>
            </div>

            {/* ========== SEÇÃO: OBSERVAÇÕES ========== */}
            <div className="bg-muted/30 rounded-lg p-6 border border-border/50">
              <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                Observações
              </h3>
              
              <div>
                <Label htmlFor="notes" className="mb-2 block">
                  Informações Adicionais
                  <span className="text-xs text-muted-foreground ml-2 font-normal">(opcional)</span>
                </Label>
                <Textarea 
                  id="notes"
                  value={newEquipment.notes}
                  onChange={(e) => setNewEquipment(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Informações adicionais sobre o equipamento..."
                  rows={3}
                  className="min-h-[80px] resize-none"
                />
              </div>
            </div>
          </div>

          {/* ========== BOTÕES DE AÇÃO DO FORMULÁRIO ========== */}
          <div className="flex justify-end gap-4 mt-8 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsEquipmentDialogOpen(false)}>
              Cancelar
            </Button>
            {/* Botão de adicionar - desabilitado se campos obrigatórios não estão preenchidos */}
            <Button 
              onClick={handleAddEquipment} 
              disabled={!newEquipment.tag || !newEquipment.brand || !newEquipment.model || !newEquipment.capacity || !newEquipment.criticidade || !newEquipment.installDate || !newEquipment.nextMaintenance}
            >
              Adicionar Equipamento
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* ========== MODAL DE FORMULÁRIO DE LOCAIS ========== */}
      {/* Modal para criar/editar empresas, setores e subsetores */}
      <LocationFormModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        mode={locationModalMode}
        type={locationModalType}
        initialData={locationModalMode === 'edit' ? selectedNode?.data : undefined}
      />

      {/* ========== MODAL DE EDIÇÃO DE EQUIPAMENTO ========== */}
      {/* Modal para editar um equipamento existente */}
      <EquipmentEditModal
        equipment={editingEquipment}
        open={isEquipmentEditModalOpen}
        onOpenChange={setIsEquipmentEditModalOpen}
      />
    </div>
  );
}

/**
 * PÁGINA DE EQUIPAMENTOS - COMPONENTE PRINCIPAL EXPORTADO
 * 
 * Esta é a página principal de gestão de ativos/equipamentos.
 * Envolvida pelo LocationProvider para fornecer acesso ao contexto
 * de locais hierárquicos (empresas, setores, subsetores) para todos
 * os componentes filhos.
 * 
 * O LocationProvider garante que:
 * - A árvore de locais seja compartilhada entre componentes
 * - O estado de seleção seja consistente
 * - Os filtros e ações baseados em localização funcionem corretamente
 */
export function EquipmentPage() {
  return (
    <LocationProvider>
      <AssetsContent />
    </LocationProvider>
  );
}