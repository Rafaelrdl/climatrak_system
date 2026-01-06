import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { PageHeader, FilterBar } from '@/shared/ui';
import { Button } from '@/components/ui/button';
import { LocationTree } from '@/components/LocationTree';
import { LocationDetails } from '@/components/LocationDetails';
import { LocationFormModal } from '@/components/LocationFormModal';
import { EquipmentSearch } from '@/components/EquipmentSearch';
import { EquipmentEditModal } from '@/components/EquipmentEditModal';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Building2, MapPin, Users, Search, Activity, Info, Package, LayoutGrid, List, Filter, Plus } from 'lucide-react';
import { useEquipments, useDeleteEquipment, equipmentKeys } from '@/hooks/useEquipmentQuery';
import { useSectors, useSubsections, useCompanies, useUnits } from '@/hooks/useLocationsQuery';
import { useSitesQuery } from '@/apps/monitor/hooks/useSitesQuery';
import { useAssetTypes, useCreateAssetType } from '@/hooks/useAssetTypesQuery';
import { LocationProvider, useLocation as useLocationContext } from '@/contexts/LocationContext';
import { IfCan } from '@/components/auth/IfCan';
import { useRoleBasedData, DataFilterInfo } from '@/components/data/FilteredDataProvider';
import { useAbility } from '@/hooks/useAbility';
import { equipmentService } from '@/services/equipmentService';
import type { Equipment, SubSection } from '@/types';
import { toast } from 'sonner';

const EMPTY_ARRAY: never[] = [];

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
  const equipmentQuery = useEquipments();
  const sectorsQuery = useSectors();
  const subSectionsQuery = useSubsections();
  const companiesQuery = useCompanies();
  const unitsQuery = useUnits();
  const sitesQuery = useSitesQuery();
  const assetTypesQuery = useAssetTypes();
  const createAssetTypeMutation = useCreateAssetType();
  const equipment = equipmentQuery.data ?? EMPTY_ARRAY;
  const sectors = sectorsQuery.data ?? EMPTY_ARRAY;
  const subSections = subSectionsQuery.data ?? EMPTY_ARRAY;
  const companies = companiesQuery.data ?? EMPTY_ARRAY;
  const units = unitsQuery.data ?? EMPTY_ARRAY;
  const sites = sitesQuery.data ?? EMPTY_ARRAY;
  const customAssetTypesFromApi = assetTypesQuery.data ?? [];
  
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
  // Define o tipo de local sendo criado/editado (empresa, unidade, setor ou subsetor)
  const [locationModalType, setLocationModalType] = useState<'company' | 'unit' | 'sector' | 'subsection'>('company');
  // Controla qual aba está ativa (ativos ou locais)
  const [activeTab, setActiveTab] = useState('search');
  // Estados para controles da barra de ferramentas unificada
  const [equipmentSearchTerm, setEquipmentSearchTerm] = useState('');
  const [equipmentViewMode, setEquipmentViewMode] = useState<'grid' | 'list'>('grid');
  const [showEquipmentFilters, setShowEquipmentFilters] = useState(false);
  // Estado dos filtros de equipamentos
  const [equipmentFilters, setEquipmentFilters] = useState<{
    type?: string[];
    status?: string[];
    brand?: string[];
    criticidade?: string[];
    manufacturer?: string[];
    sector?: string[];
    capacityMin?: number;
    capacityMax?: number;
  }>({});
  // Lista de equipamentos filtrados para exibição
  const [filteredEquipment, setFilteredEquipment] = useState<Equipment[]>(filteredEquipmentData);
  // Controla a abertura do modal de edição de equipamento
  const [isEquipmentEditModalOpen, setIsEquipmentEditModalOpen] = useState(false);
  // Equipamento sendo editado
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null);
  // Controla a abertura do dialog de confirmação de exclusão
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  // Equipamento sendo excluído
  const [deletingEquipment, setDeletingEquipment] = useState<Equipment | null>(null);
  // Mutation para excluir equipamento
  const deleteEquipmentMutation = useDeleteEquipment();

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
    const extractOriginalId = (nodeId: string, type: 'unit' | 'sector' | 'subsection'): string | null => {
      if (!nodeId) return null;
      
      if (type === 'unit' && nodeId.includes('unit-')) {
        const match = nodeId.match(/unit-(\d+)(?:-|$)/);
        return match ? match[1] : null;
      }
      
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
        // Para empresas, filtra equipamentos que pertencem a unidades, setores e subsetores desta empresa
        // Extrai o ID original da empresa do formato "company-1"
        const companyId = selectedNode.id.replace('company-', '');
        const companyUnits = units.filter(u => u.companyId === companyId);
        const unitIds = new Set(companyUnits.map(u => u.id));
        const companySectors = sectors.filter(s => s.unitId && unitIds.has(s.unitId));
        const sectorIds = new Set(companySectors.map(s => s.id));
        const subsectionIds = new Set(
          subSections
            .filter((ss) => sectorIds.has(ss.sectorId))
            .map((ss) => ss.id)
        );
        
        filteredByLocation = validEquipmentData.filter(
          (eq: Equipment) =>
            eq.companyId === companyId ||
            (eq.sectorId && sectorIds.has(eq.sectorId)) ||
            (eq.subSectionId && subsectionIds.has(eq.subSectionId))
        );
        break;
      }
      
      case 'unit': {
        // Para unidades, filtra equipamentos de todos os setores e subsetores desta unidade
        const originalUnitId = extractOriginalId(selectedNode.id, 'unit');
        
        const unitSectors = sectors.filter(s => s.unitId === originalUnitId);
        const sectorIds = new Set(unitSectors.map(s => s.id));
        const subsectionIds = new Set(
          subSections
            .filter((ss) => sectorIds.has(ss.sectorId))
            .map((ss) => ss.id)
        );
        
        filteredByLocation = validEquipmentData.filter(
          (eq: Equipment) =>
            (eq.sectorId && sectorIds.has(eq.sectorId)) ||
            (eq.subSectionId && subsectionIds.has(eq.subSectionId))
        );
        break;
      }
      
      case 'sector': {
        // Para setores, filtra equipamentos deste setor específico
        const originalSectorId = extractOriginalId(selectedNode.id, 'sector');
        
        const subsectionIds = new Set(
          subSections
            .filter((ss) => ss.sectorId === originalSectorId)
            .map((ss) => ss.id)
        );
        
        filteredByLocation = validEquipmentData.filter(
          (eq: Equipment) =>
            eq.sectorId === originalSectorId ||
            (eq.subSectionId && subsectionIds.has(eq.subSectionId))
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
  }, [selectedNode, filteredEquipmentData, units, sectors, subSections]);

  // ========== ESTADO DO MODAL DE NOVO TIPO DE ATIVO ==========
  const [isNewAssetTypeDialogOpen, setIsNewAssetTypeDialogOpen] = useState(false);
  const [newAssetTypeName, setNewAssetTypeName] = useState('');
  
  // Todos os tipos de ativo vêm do banco de dados
  const assetTypes = useMemo(() => {
    return customAssetTypesFromApi
      .map(t => ({ value: t.code, label: t.name }));
  }, [customAssetTypesFromApi]);

  // Valores únicos para filtros de equipamentos
  const uniqueEquipmentTypes = useMemo(() => [...new Set(filteredEquipmentData.map(e => e.type))].filter(Boolean).sort(), [filteredEquipmentData]);
  const uniqueEquipmentStatuses = useMemo(() => [...new Set(filteredEquipmentData.map(e => e.status))].filter(Boolean), [filteredEquipmentData]);
  const uniqueEquipmentBrands = useMemo(() => [...new Set(filteredEquipmentData.map(e => e.brand))].filter(Boolean).sort(), [filteredEquipmentData]);
  const uniqueEquipmentCriticidades = useMemo(() => [...new Set(filteredEquipmentData.map(e => e.criticidade))].filter(Boolean), [filteredEquipmentData]);
  const uniqueEquipmentManufacturers = useMemo(() => [...new Set(filteredEquipmentData.map(e => e.manufacturer))].filter(Boolean).sort(), [filteredEquipmentData]);
  const uniqueEquipmentSectors = useMemo(() => [...new Set(filteredEquipmentData.map(e => e.sectorName))].filter(Boolean).sort(), [filteredEquipmentData]);
  
  // Conta total de filtros ativos
  const activeEquipmentFiltersCount = useMemo(() => {
    return (equipmentFilters.type?.length ?? 0) + 
           (equipmentFilters.status?.length ?? 0) + 
           (equipmentFilters.brand?.length ?? 0) +
           (equipmentFilters.criticidade?.length ?? 0) +
           (equipmentFilters.manufacturer?.length ?? 0) +
           (equipmentFilters.sector?.length ?? 0) +
           (equipmentFilters.capacityMin !== undefined ? 1 : 0) +
           (equipmentFilters.capacityMax !== undefined ? 1 : 0);
  }, [equipmentFilters]);
  
  // Função para limpar filtros
  const clearEquipmentFilters = useCallback(() => {
    setEquipmentFilters({});
  }, []);
  
  // Função para obter label de status
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'OK': return 'Operacional';
      case 'MAINTENANCE': return 'Em Manutenção';
      case 'STOPPED': return 'Parado';
      case 'ALERT': return 'Alerta';
      default: return status;
    }
  };
  
  // Função para obter label de criticidade
  const getCriticidadeLabel = (criticidade: string) => {
    switch (criticidade) {
      case 'BAIXA': return 'Baixa';
      case 'MEDIA': return 'Média';
      case 'ALTA': return 'Alta';
      case 'CRITICA': return 'Crítica';
      default: return criticidade;
    }
  };
  
  // Aplica os filtros selecionados aos dados de equipamentos
  const filteredByFiltersEquipmentData = useMemo(() => {
    let result = filteredEquipmentData;
    
    if (equipmentFilters.type?.length) {
      result = result.filter(e => equipmentFilters.type!.includes(e.type));
    }
    if (equipmentFilters.status?.length) {
      result = result.filter(e => equipmentFilters.status!.includes(e.status));
    }
    if (equipmentFilters.brand?.length) {
      result = result.filter(e => equipmentFilters.brand!.includes(e.brand));
    }
    if (equipmentFilters.criticidade?.length) {
      result = result.filter(e => equipmentFilters.criticidade!.includes(e.criticidade));
    }
    if (equipmentFilters.manufacturer?.length) {
      result = result.filter(e => e.manufacturer && equipmentFilters.manufacturer!.includes(e.manufacturer));
    }
    if (equipmentFilters.sector?.length) {
      result = result.filter(e => e.sectorName && equipmentFilters.sector!.includes(e.sectorName));
    }
    if (equipmentFilters.capacityMin !== undefined) {
      result = result.filter(e => e.capacity >= equipmentFilters.capacityMin!);
    }
    if (equipmentFilters.capacityMax !== undefined) {
      result = result.filter(e => e.capacity <= equipmentFilters.capacityMax!);
    }
    
    return result;
  }, [filteredEquipmentData, equipmentFilters]);

  // ========== ESTADO DO FORMULÁRIO DE NOVO EQUIPAMENTO ==========
  // Estado para armazenar os dados do formulário de criação de equipamento
  const [newEquipment, setNewEquipment] = useState({
    // Informações Básicas
    tag: '',           // Identificação única do equipamento (ex: AC-001)
    type: 'SPLIT' as Equipment['type'], // Tipo do equipamento (SPLIT, CENTRAL, VRF, CHILLER)
    brand: '',         // Marca do equipamento
    model: '',         // Modelo do equipamento
    serialNumber: '',  // Número de série
    patrimonio: '',    // Número de patrimônio
    criticidade: 'MEDIA' as Equipment['criticidade'], // Criticidade do equipamento (BAIXA, MEDIA, ALTA, CRITICA)
    status: 'OK' as Equipment['status'], // Status do equipamento (OK, MAINTENANCE, STOPPED)
    installDate: '',   // Data de instalação
    warrantyExpiry: '', // Data de expiração da garantia
    notes: '',         // Observações adicionais
    
    // Localização
    companyId: '',     // ID da empresa
    sectorId: '',      // ID do setor onde o equipamento está localizado
    subSectionId: '',  // ID do subsetor (opcional)
    location: '',      // Localização específica (ex: Sala 101, Teto - Posição A)
    
    // Especificações Técnicas (antigos campos)
    capacity: '',      // Capacidade
    capacityUnit: 'BTU' as 'BTU' | 'TR' | 'KCAL', // Unidade de capacidade
    
    // Especificações Elétricas
    nominalVoltage: undefined as number | undefined,    // Tensão nominal (V)
    phases: 3 as 1 | 2 | 3,                             // Fases (1, 2 ou 3)
    nominalCurrent: undefined as number | undefined,    // Corrente nominal (A)
    powerFactor: undefined as number | undefined,       // Fator de potência (0-1)
    refrigerant: '',                                    // Fluido refrigerante
    
    // Potências (calculadas automaticamente)
    activePower: undefined as number | undefined,       // Potência ativa (kW)
    apparentPower: undefined as number | undefined,     // Potência aparente (kVA)
    reactivePower: undefined as number | undefined,     // Potência reativa (kVAr)
    
    // Campo legado (manter para compatibilidade)
    nextMaintenance: '', // Data da próxima manutenção
  });

  // ========== FUNÇÕES DE MANIPULAÇÃO ==========
  
  /**
   * ADICIONAR NOVO EQUIPAMENTO
   * 
   * Cria um novo equipamento com base nos dados do formulário.
   * Auto-vincula o equipamento ao local selecionado na árvore quando possível.
   */
  const handleAddEquipment = async () => {
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

    // Monta os dados para criação
    const sectorId = selectedNode?.type === 'sector' 
      ? extractOriginalId(selectedNode.id, 'sector') || newEquipment.sectorId 
      : selectedNode?.type === 'subsection' 
        ? (selectedNode.data as SubSection).sectorId 
        : newEquipment.sectorId;

    const subSectionId = selectedNode?.type === 'subsection' 
      ? extractOriginalId(selectedNode.id, 'subsection') || newEquipment.subSectionId 
      : newEquipment.subSectionId;

    // Mapear tipo do frontend para o backend
    // Mapeamentos legados para compatibilidade
    const legacyTypeMapping: Record<string, string> = {
      'CENTRAL': 'AHU', // CENTRAL do frontend vira AHU no backend
    };

    // Usa o mapeamento legado se existir, senão usa o tipo original
    const assetType = legacyTypeMapping[newEquipment.type] || newEquipment.type;

    const fallbackCompanyId = sectorId
      ? sectors.find((sector) => sector.id === sectorId)?.companyId
      : undefined;
    const selectedCompanyId = selectedNode?.type === 'company' ? selectedNode.data.id : undefined;
    const companyId = newEquipment.companyId || selectedCompanyId || fallbackCompanyId;

    if (!companyId) {
      toast.error('Selecione uma empresa para definir o site do ativo');
      return;
    }

    const companyName = companies.find((company) => company.id === companyId)?.name;
    const siteForCompany = companyName
      ? sites.find((site) =>
          (site.company && site.company.toLowerCase() === companyName.toLowerCase()) ||
          site.name.toLowerCase() === companyName.toLowerCase()
        )
      : undefined;

    if (!siteForCompany) {
      toast.error('Nenhum site encontrado para a empresa selecionada');
      return;
    }

    try {
      await equipmentService.create({
        tag: newEquipment.tag,
        name: newEquipment.notes || newEquipment.tag, // Usa tag como nome se não tiver notas
        site: siteForCompany.id,
        assetType: assetType, // Usa o tipo diretamente (já mapeado se necessário)
        assetTypeOther: undefined, // Não mais necessário - todos os tipos estão no banco
        status: newEquipment.status,
        manufacturer: newEquipment.brand,
        model: newEquipment.model,
        serialNumber: newEquipment.serialNumber,
        patrimonio: newEquipment.patrimonio,
        criticidade: newEquipment.criticidade,
        warrantyExpiry: newEquipment.warrantyExpiry || undefined,
        installDate: newEquipment.installDate || undefined,
        sectorId: sectorId || undefined,
        subSectionId: subSectionId || undefined,
        location: newEquipment.location,
        capacity: newEquipment.capacity ? parseInt(newEquipment.capacity) : undefined,
        capacityUnit: newEquipment.capacityUnit,
        nominalVoltage: newEquipment.nominalVoltage,
        phases: newEquipment.phases,
        nominalCurrent: newEquipment.nominalCurrent,
        powerFactor: newEquipment.powerFactor,
        refrigerant: newEquipment.refrigerant,
        activePower: newEquipment.activePower,
        apparentPower: newEquipment.apparentPower,
        reactivePower: newEquipment.reactivePower,
      });

      // Invalida o cache para recarregar a lista de equipamentos
      queryClient.invalidateQueries({ queryKey: equipmentKeys.all });
      
      // Reset do formulário para valores iniciais
      setNewEquipment({
        tag: '',
        type: 'SPLIT',
        brand: '',
        model: '',
        serialNumber: '',
        patrimonio: '',
        criticidade: 'MEDIA',
        status: 'OK',
        installDate: '',
        warrantyExpiry: '',
        notes: '',
        companyId: '',
        sectorId: '',
        subSectionId: '',
        location: '',
        capacity: '',
        capacityUnit: 'BTU',
        nominalVoltage: undefined,
        phases: 3,
        nominalCurrent: undefined,
        powerFactor: undefined,
        refrigerant: '',
        activePower: undefined,
        apparentPower: undefined,
        reactivePower: undefined,
        nextMaintenance: '',
      });
      
      // Fecha o modal de criação
      setIsEquipmentDialogOpen(false);
      toast.success('Ativo criado com sucesso!');
    } catch (error) {
      console.error('Erro ao criar equipamento:', error);
      
      // Extrair mensagem de erro do backend
      let errorMessage = 'Erro ao criar equipamento';
      
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: Record<string, unknown>; status?: number } };
        const responseData = axiosError.response?.data;
        
        if (responseData) {
          // Verifica se é erro de tag duplicada
          if (responseData.tag) {
            const tagError = responseData.tag;
            if (Array.isArray(tagError)) {
              errorMessage = `Tag: ${tagError.join(', ')}`;
            } else {
              errorMessage = `Tag: ${tagError}`;
            }
          } else if (responseData.detail) {
            errorMessage = String(responseData.detail);
          } else if (responseData.non_field_errors) {
            const nonFieldErrors = responseData.non_field_errors;
            errorMessage = Array.isArray(nonFieldErrors) ? nonFieldErrors.join(', ') : String(nonFieldErrors);
          } else {
            // Tenta extrair qualquer mensagem de erro do objeto
            const firstErrorKey = Object.keys(responseData)[0];
            if (firstErrorKey) {
              const firstError = responseData[firstErrorKey];
              errorMessage = `${firstErrorKey}: ${Array.isArray(firstError) ? firstError.join(', ') : firstError}`;
            }
          }
        }
      }
      
      toast.error(errorMessage);
    }
  };

  // ========== CÁLCULO AUTOMÁTICO DE POTÊNCIAS ==========
  // Calcula potências baseado em tensão, corrente, fases e fator de potência
  useEffect(() => {
    const V = newEquipment.nominalVoltage;
    const I = newEquipment.nominalCurrent;
    const numPhases = newEquipment.phases || 3;
    const FP = newEquipment.powerFactor;

    if (V && I && numPhases) {
      let S: number;
      if (numPhases === 3) {
        // Trifásico: S = √3 × V × I
        S = Math.sqrt(3) * V * I;
      } else if (numPhases === 2) {
        // Bifásico: S = 2 × V × I × cos(30°) = √3 × V × I (aproximação para bifásico delta)
        S = Math.sqrt(3) * V * I;
      } else {
        // Monofásico: S = V × I
        S = V * I;
      }

      // Converte W para kVA
      const S_kVA = S / 1000;

      setNewEquipment((prev) => ({
        ...prev,
        apparentPower: parseFloat(S_kVA.toFixed(2)),
      }));

      // Se tem FP, calcula Potência Ativa (P) e Reativa (Q)
      if (FP && FP > 0 && FP <= 1) {
        // P = S × FP (Potência Ativa)
        const P_kW = S_kVA * FP;

        // Q = √(S² - P²) (Potência Reativa)
        const Q_kVAr = Math.sqrt(S_kVA * S_kVA - P_kW * P_kW);

        setNewEquipment((prev) => ({
          ...prev,
          activePower: parseFloat(P_kW.toFixed(2)),
          reactivePower: parseFloat(Q_kVAr.toFixed(2)),
        }));
      }
    }
  }, [newEquipment.nominalVoltage, newEquipment.nominalCurrent, newEquipment.phases, newEquipment.powerFactor]);

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
   * ABRIR DIALOG DE EXCLUSÃO DE EQUIPAMENTO
   * 
   * Abre o dialog de confirmação para excluir um equipamento.
   * 
   * @param equipment - Equipamento a ser excluído
   */
  const handleDeleteEquipment = useCallback((equipment: Equipment) => {
    setDeletingEquipment(equipment);
    setIsDeleteDialogOpen(true);
  }, []);

  /**
   * CONFIRMAR EXCLUSÃO DE EQUIPAMENTO
   * 
   * Executa a exclusão do equipamento após confirmação do usuário.
   */
  const confirmDeleteEquipment = useCallback(async () => {
    if (!deletingEquipment) return;

    try {
      await deleteEquipmentMutation.mutateAsync(deletingEquipment.id);
      toast.success(`Ativo "${deletingEquipment.tag}" excluído com sucesso!`);
      setIsDeleteDialogOpen(false);
      setDeletingEquipment(null);
    } catch (error) {
      console.error('Erro ao excluir equipamento:', error);
      
      // Extrair mensagem de erro do backend
      let errorMessage = 'Erro ao excluir equipamento';
      
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: Record<string, unknown>; status?: number } };
        const responseData = axiosError.response?.data;
        
        if (responseData?.detail) {
          errorMessage = String(responseData.detail);
        } else if (responseData?.non_field_errors) {
          const nonFieldErrors = responseData.non_field_errors;
          errorMessage = Array.isArray(nonFieldErrors) ? nonFieldErrors.join(', ') : String(nonFieldErrors);
        }
      }
      
      toast.error(errorMessage);
    }
  }, [deletingEquipment, deleteEquipmentMutation]);

  /**
   * CRIAR NOVO LOCAL
   * 
   * Abre o modal para criação de um novo local (empresa, unidade, setor ou subsetor).
   * 
   * @param type - Tipo de local a ser criado
   */
  const handleCreateLocation = (type: 'company' | 'unit' | 'sector' | 'subsection') => {
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

  // Hook de navegação
  const navigate = useNavigate();

  /**
   * ADICIONAR NOVO TIPO DE ATIVO
   * 
   * Adiciona um novo tipo customizado à lista de tipos de ativo.
   * O tipo é persistido no banco de dados via API.
   */
  const handleAddAssetType = async () => {
    if (!newAssetTypeName.trim()) {
      toast.error('Digite um nome para o tipo de ativo');
      return;
    }
    
    // Gera o código do tipo
    const typeValue = newAssetTypeName.toUpperCase().replace(/\s+/g, '_');
    
    // Verifica se já existe nos tipos do banco de dados
    const existsInTypes = assetTypes.some(t => t.value === typeValue);
    
    if (existsInTypes) {
      toast.error('Este tipo de ativo já existe');
      return;
    }
    
    try {
      // Persiste o novo tipo no banco de dados
      await createAssetTypeMutation.mutateAsync({
        code: typeValue,
        name: newAssetTypeName.trim(),
      });
      
      // Seleciona automaticamente o novo tipo
      setNewEquipment(prev => ({ ...prev, type: typeValue as Equipment['type'] }));
      
      // Fecha o modal e limpa o campo
      setNewAssetTypeName('');
      setIsNewAssetTypeDialogOpen(false);
      
      toast.success(`Tipo "${newAssetTypeName.trim()}" adicionado com sucesso`);
    } catch (error) {
      console.error('Erro ao criar tipo de ativo:', error);
      toast.error('Erro ao criar tipo de ativo. Tente novamente.');
    }
  };

  /**
   * SELECIONAR EQUIPAMENTO PARA RASTREAMENTO
   * 
   * Navega para a página de detalhes do equipamento.
   * 
   * @param selectedEquipment - Equipamento selecionado
   */
  const handleEquipmentSelect = (selectedEquipment: Equipment) => {
    navigate(`/cmms/ativos/${selectedEquipment.id}`);
  };

  /**
   * ATUALIZAR RESULTADOS FILTRADOS
   * 
   * Callback chamado quando os filtros de busca são aplicados.
   * Atualiza a lista de equipamentos exibidos.
   * 
   * @param filtered - Lista de equipamentos filtrados
   */
  const handleFilteredResults = useCallback((filtered: Equipment[]) => {
    setFilteredEquipment(filtered);
  }, [setFilteredEquipment]);

  return (
    <div className="flex gap-6 h-[calc(100vh-5rem)]">
      {/* ========== SIDEBAR DE LOCAIS - ALTURA TOTAL ========== */}
      <aside className="hidden lg:flex flex-col w-[340px] xl:w-[400px] 2xl:w-[440px] shrink-0">
        <LocationTree 
          onCreateLocation={handleCreateLocation}
          companies={companies}
          units={units}
          sectors={sectors}
        />
      </aside>

      {/* ========== CONTEÚDO PRINCIPAL ========== */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {/* Cabeçalho */}
        <div className="shrink-0 space-y-4 pb-4">
          <PageHeader 
            title="Gestão de Ativos"
            description="Gerencie equipamentos e localizações"
            icon={<Package className="h-6 w-6" />}
          />
          
          {/* Informações sobre filtros de dados aplicados */}
          {equipmentFilterStats.filtered > 0 && (
            <DataFilterInfo
              filterStats={equipmentFilterStats}
              dataType="asset"
              canViewAll={role === 'admin'}
              className="text-xs"
            />
          )}
        </div>
        
        {/* ========== SISTEMA DE ABAS ========== */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          {/* Barra de ferramentas unificada: Abas + Busca + Controles */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-4 shrink-0">
            {/* Abas à esquerda */}
            <TabsList className="shrink-0">
              <TabsTrigger value="search" className="gap-2">
                <Search className="h-4 w-4" />
                Ativos
              </TabsTrigger>
              <TabsTrigger value="locations" className="gap-2">
                <MapPin className="h-4 w-4" />
                Locais
              </TabsTrigger>
            </TabsList>
            
            {/* Busca e controles à direita - visível apenas na aba de Ativos */}
            {activeTab === 'search' && (
              <div className="flex flex-1 items-center gap-2 w-full sm:w-auto">
                {/* Campo de busca */}
                <div className="relative flex-1 min-w-0">
                  <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por tag, modelo, marca ou série..."
                    value={equipmentSearchTerm}
                    onChange={(e) => setEquipmentSearchTerm(e.target.value)}
                    className="pl-8 h-9 text-sm bg-card border shadow-sm"
                  />
                </div>
                
                {/* Toggle View Mode */}
                <div className="flex border rounded-md p-0.5 bg-muted/30 shrink-0">
                  <Button
                    variant={equipmentViewMode === 'grid' ? 'secondary' : 'ghost'}
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => setEquipmentViewMode('grid')}
                  >
                    <LayoutGrid className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant={equipmentViewMode === 'list' ? 'secondary' : 'ghost'}
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => setEquipmentViewMode('list')}
                  >
                    <List className="h-3.5 w-3.5" />
                  </Button>
                </div>
                
                {/* Botão de Filtros */}
                <Popover open={showEquipmentFilters} onOpenChange={setShowEquipmentFilters}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="h-9 gap-1.5 shadow-sm shrink-0">
                      <Filter className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Filtros</span>
                      {activeEquipmentFiltersCount > 0 && (
                        <Badge variant="secondary" className="ml-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center">
                          {activeEquipmentFiltersCount}
                        </Badge>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80" align="end">
                    <FilterBar 
                      title="Filtros" 
                      count={activeEquipmentFiltersCount} 
                      onClear={clearEquipmentFilters}
                    >
                      <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                        {/* Filtro por Tipo */}
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Tipo de Ativo</Label>
                          <Select
                            value={equipmentFilters.type?.[0] || '_all'}
                            onValueChange={(value) => {
                              setEquipmentFilters(prev => ({
                                ...prev,
                                type: value === '_all' ? [] : [value]
                              }));
                            }}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Todos os tipos" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="_all">Todos os tipos</SelectItem>
                              {uniqueEquipmentTypes.map(type => (
                                <SelectItem key={type} value={type}>{type}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Filtro por Status */}
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Status</Label>
                          <Select
                            value={equipmentFilters.status?.[0] || '_all'}
                            onValueChange={(value) => {
                              setEquipmentFilters(prev => ({
                                ...prev,
                                status: value === '_all' ? [] : [value]
                              }));
                            }}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Todos os status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="_all">Todos os status</SelectItem>
                              {uniqueEquipmentStatuses.map(status => (
                                <SelectItem key={status} value={status}>{getStatusLabel(status)}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Filtro por Criticidade */}
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Criticidade</Label>
                          <Select
                            value={equipmentFilters.criticidade?.[0] || '_all'}
                            onValueChange={(value) => {
                              setEquipmentFilters(prev => ({
                                ...prev,
                                criticidade: value === '_all' ? [] : [value]
                              }));
                            }}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Todas as criticidades" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="_all">Todas as criticidades</SelectItem>
                              {uniqueEquipmentCriticidades.map(crit => (
                                <SelectItem key={crit} value={crit}>{getCriticidadeLabel(crit)}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Filtro por Marca */}
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Marca</Label>
                          <Select
                            value={equipmentFilters.brand?.[0] || '_all'}
                            onValueChange={(value) => {
                              setEquipmentFilters(prev => ({
                                ...prev,
                                brand: value === '_all' ? [] : [value]
                              }));
                            }}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Todas as marcas" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="_all">Todas as marcas</SelectItem>
                              {uniqueEquipmentBrands.map(brand => (
                                <SelectItem key={brand} value={brand}>{brand}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Filtro por Fabricante */}
                        {uniqueEquipmentManufacturers.length > 0 && (
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">Fabricante</Label>
                            <Select
                              value={equipmentFilters.manufacturer?.[0] || '_all'}
                              onValueChange={(value) => {
                                setEquipmentFilters(prev => ({
                                  ...prev,
                                  manufacturer: value === '_all' ? [] : [value]
                                }));
                              }}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Todos os fabricantes" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="_all">Todos os fabricantes</SelectItem>
                                {uniqueEquipmentManufacturers.map(mfr => (
                                  <SelectItem key={mfr} value={mfr}>{mfr}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        {/* Filtro por Setor */}
                        {uniqueEquipmentSectors.length > 0 && (
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">Setor</Label>
                            <Select
                              value={equipmentFilters.sector?.[0] || '_all'}
                              onValueChange={(value) => {
                                setEquipmentFilters(prev => ({
                                  ...prev,
                                  sector: value === '_all' ? [] : [value]
                                }));
                              }}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Todos os setores" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="_all">Todos os setores</SelectItem>
                                {uniqueEquipmentSectors.map(sector => (
                                  <SelectItem key={sector} value={sector}>{sector}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        {/* Filtro por Capacidade */}
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Capacidade (TR)</Label>
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              placeholder="Mín"
                              className="w-full"
                              value={equipmentFilters.capacityMin ?? ''}
                              onChange={(e) => {
                                const value = e.target.value;
                                setEquipmentFilters(prev => ({
                                  ...prev,
                                  capacityMin: value ? Number(value) : undefined
                                }));
                              }}
                            />
                            <span className="text-muted-foreground text-sm">até</span>
                            <Input
                              type="number"
                              placeholder="Máx"
                              className="w-full"
                              value={equipmentFilters.capacityMax ?? ''}
                              onChange={(e) => {
                                const value = e.target.value;
                                setEquipmentFilters(prev => ({
                                  ...prev,
                                  capacityMax: value ? Number(value) : undefined
                                }));
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </FilterBar>
                  </PopoverContent>
                </Popover>
                
                {/* Botão Novo Ativo */}
                <IfCan action="create" subject="asset">
                  <Button 
                    size="sm" 
                    className="h-9 gap-1.5 shrink-0"
                    onClick={() => setIsEquipmentDialogOpen(true)}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Novo Ativo</span>
                  </Button>
                </IfCan>
              </div>
            )}
          </div>

          {/* ABA DE ATIVOS */}
          <TabsContent value="search" className="mt-0 flex-1 overflow-auto">
            {/* Árvore de locais no mobile */}
            <div className="lg:hidden mb-4">
              <LocationTree 
                onCreateLocation={handleCreateLocation}
                companies={companies}
                units={units}
                sectors={sectors}
              />
            </div>
            
            <EquipmentSearch
              equipment={filteredByFiltersEquipmentData}
              selectedLocation={selectedNode?.id}
              onFilteredResults={handleFilteredResults}
              onEquipmentSelect={handleEquipmentSelect}
              showCreateButton={false}
              onCreateAsset={() => {
                setIsEquipmentDialogOpen(true);
              }}
              onEditAsset={handleEditEquipment}
              onDeleteAsset={handleDeleteEquipment}
              externalSearchTerm={equipmentSearchTerm}
              externalViewMode={equipmentViewMode}
            />
          </TabsContent>

          {/* ABA DE LOCAIS */}
          <TabsContent value="locations" className="mt-0 flex-1 overflow-auto">
            {/* Árvore de locais no mobile */}
            <div className="lg:hidden mb-4">
              <LocationTree 
                onCreateLocation={handleCreateLocation}
                companies={companies}
                units={units}
                sectors={sectors}
              />
            </div>
            
            <LocationDetails 
              onEdit={handleEditLocation}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* ========== MODAL DE CRIAÇÃO DE EQUIPAMENTO ========== */}
      {/* Formulário completo para adicionar um novo ativo */}
      <Dialog open={isEquipmentDialogOpen} onOpenChange={setIsEquipmentDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-6 md:p-8">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-2xl">Adicionar Ativo</DialogTitle>
            <DialogDescription>
              Preencha os dados do ativo para adicioná-lo ao sistema. Os campos marcados com * são obrigatórios.
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="basic" className="flex items-center gap-2">
                <Info className="w-4 h-4" />
                Informações Básicas
              </TabsTrigger>
              <TabsTrigger value="location" className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Localização
              </TabsTrigger>
              <TabsTrigger value="specs" className="flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Especificações
              </TabsTrigger>
            </TabsList>

            {/* ========== ABA: INFORMAÇÕES BÁSICAS ========== */}
            <TabsContent value="basic" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                {/* Tag do equipamento */}
                <div>
                  <Label htmlFor="tag" className="mb-2 block">
                    Tag do Ativo *
                    <span className="text-xs text-muted-foreground ml-2 font-normal">
                      Identificação única
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
                  <Label htmlFor="type" className="mb-2 block">Tipo do Ativo *</Label>
                  <div className="flex gap-2">
                    <Select 
                      value={newEquipment.type} 
                      onValueChange={(value: Equipment['type']) => 
                        setNewEquipment(prev => ({ ...prev, type: value }))
                      }
                    >
                      <SelectTrigger className="h-10 flex-1">
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        {assetTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-10 w-10 shrink-0"
                      onClick={() => setIsNewAssetTypeDialogOpen(true)}
                      title="Adicionar novo tipo de ativo"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
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
                
                {/* Número de série */}
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
                
                {/* Patrimônio */}
                <div>
                  <Label htmlFor="patrimonio" className="mb-2 block">
                    Patrimônio
                    <span className="text-xs text-muted-foreground ml-2 font-normal">(opcional)</span>
                  </Label>
                  <Input 
                    id="patrimonio"
                    value={newEquipment.patrimonio}
                    onChange={(e) => setNewEquipment(prev => ({ ...prev, patrimonio: e.target.value }))}
                    placeholder="PAT-00001"
                    className="h-10"
                  />
                </div>

                {/* Criticidade do equipamento */}
                <div>
                  <Label htmlFor="criticidade" className="mb-2 block">Criticidade *</Label>
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
                  <Label htmlFor="status" className="mb-2 block">Status *</Label>
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
                      <SelectItem value="OK">✅ Operacional</SelectItem>
                      <SelectItem value="MAINTENANCE">🔧 Em Manutenção</SelectItem>
                      <SelectItem value="STOPPED">⛔ Parado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Data de instalação */}
                <div>
                  <Label htmlFor="installDate" className="mb-2 block">
                    Data de Instalação
                    <span className="text-xs text-muted-foreground ml-2 font-normal">(opcional)</span>
                  </Label>
                  <Input 
                    id="installDate"
                    type="date"
                    value={newEquipment.installDate}
                    onChange={(e) => setNewEquipment(prev => ({ ...prev, installDate: e.target.value }))}
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
                
                {/* Observações */}
                <div className="md:col-span-2">
                  <Label htmlFor="notes" className="mb-2 block">
                    Observações
                    <span className="text-xs text-muted-foreground ml-2 font-normal">(opcional)</span>
                  </Label>
                  <Textarea 
                    id="notes"
                    value={newEquipment.notes}
                    onChange={(e) => setNewEquipment(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Informações adicionais sobre o ativo..."
                    rows={3}
                    className="min-h-[80px] resize-none"
                  />
                </div>
              </div>
            </TabsContent>

            {/* ========== ABA: LOCALIZAÇÃO ========== */}
            <TabsContent value="location" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                {/* Seletor de Empresa */}
                <div>
                  <Label htmlFor="company" className="mb-2 block">Empresa *</Label>
                  <Select 
                    value={newEquipment.companyId} 
                    onValueChange={(value) => setNewEquipment(prev => ({
                      ...prev,
                      companyId: value,
                      sectorId: '',
                      subSectionId: ''
                    }))}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Selecione a empresa" />
                    </SelectTrigger>
                    <SelectContent>
                      {companies.map(company => (
                        <SelectItem key={company.id} value={company.id}>
                          {company.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Seletor de Setor */}
                <div>
                  <Label htmlFor="sector" className="mb-2 block">Setor *</Label>
                  <Select 
                    value={newEquipment.sectorId} 
                    onValueChange={(value) => setNewEquipment(prev => ({
                      ...prev,
                      sectorId: value,
                      subSectionId: ''
                    }))}
                    disabled={!newEquipment.companyId}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Selecione o setor" />
                    </SelectTrigger>
                    <SelectContent>
                      {sectors
                        .filter(s => s.companyId === newEquipment.companyId)
                        .map(sector => (
                          <SelectItem key={sector.id} value={sector.id}>
                            {sector.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Seletor de Subsetor */}
                <div className="md:col-span-2">
                  <Label htmlFor="subsection" className="mb-2 block">
                    Subsetor
                    <span className="text-xs text-muted-foreground ml-2 font-normal">(opcional)</span>
                  </Label>
                  <Select 
                    value={newEquipment.subSectionId} 
                    onValueChange={(value) => setNewEquipment(prev => ({
                      ...prev,
                      subSectionId: value
                    }))}
                    disabled={!newEquipment.sectorId}
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
                  <Label htmlFor="location" className="mb-2 block">
                    Localização Específica
                    <span className="text-xs text-muted-foreground ml-2 font-normal">(opcional)</span>
                  </Label>
                  <Input 
                    id="location"
                    value={newEquipment.location}
                    onChange={(e) => setNewEquipment(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="Sala 101, Corredor principal, etc."
                    className="h-10"
                  />
                </div>
              </div>
            </TabsContent>

            {/* ========== ABA: ESPECIFICAÇÕES ========== */}
            <TabsContent value="specs" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                {/* Tensão Nominal */}
                <div>
                  <Label htmlFor="nominalVoltage" className="mb-2 block">
                    Tensão Nominal (V)
                  </Label>
                  <Input 
                    id="nominalVoltage"
                    type="number"
                    step="0.1"
                    value={newEquipment.nominalVoltage ?? ''}
                    onChange={(e) => setNewEquipment(prev => ({ 
                      ...prev, 
                      nominalVoltage: e.target.value ? parseFloat(e.target.value) : undefined 
                    }))}
                    placeholder="Ex: 380"
                    className="h-10"
                  />
                </div>

                {/* Fases */}
                <div>
                  <Label htmlFor="phases" className="mb-2 block">Fases</Label>
                  <Select 
                    value={newEquipment.phases?.toString()} 
                    onValueChange={(value) => 
                      setNewEquipment(prev => ({ ...prev, phases: parseInt(value) as 1 | 2 | 3 }))
                    }
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Monofásico (1 fase)</SelectItem>
                      <SelectItem value="2">Bifásico (2 fases)</SelectItem>
                      <SelectItem value="3">Trifásico (3 fases)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Corrente Nominal */}
                <div>
                  <Label htmlFor="nominalCurrent" className="mb-2 block">
                    Corrente Nominal (A)
                  </Label>
                  <Input 
                    id="nominalCurrent"
                    type="number"
                    step="0.1"
                    value={newEquipment.nominalCurrent ?? ''}
                    onChange={(e) => setNewEquipment(prev => ({ 
                      ...prev, 
                      nominalCurrent: e.target.value ? parseFloat(e.target.value) : undefined 
                    }))}
                    placeholder="Ex: 150"
                    className="h-10"
                  />
                </div>

                {/* Fator de Potência */}
                <div>
                  <Label htmlFor="powerFactor" className="mb-2 block">
                    Fator de Potência
                    <span className="text-xs text-muted-foreground ml-2 font-normal">(0 a 1)</span>
                  </Label>
                  <Input 
                    id="powerFactor"
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    value={newEquipment.powerFactor ?? ''}
                    onChange={(e) => setNewEquipment(prev => ({ 
                      ...prev, 
                      powerFactor: e.target.value ? parseFloat(e.target.value) : undefined 
                    }))}
                    placeholder="Ex: 0.85"
                    className="h-10"
                  />
                </div>

                {/* Capacidade + Unidade */}
                <div>
                  <Label htmlFor="capacity" className="mb-2 block">Capacidade *</Label>
                  <div className="flex gap-2">
                    <Input 
                      id="capacity"
                      type="number"
                      value={newEquipment.capacity}
                      onChange={(e) => setNewEquipment(prev => ({ ...prev, capacity: e.target.value }))}
                      placeholder="Ex: 300"
                      required
                      className="h-10 flex-1"
                    />
                    <Select 
                      value={newEquipment.capacityUnit} 
                      onValueChange={(value: 'BTU' | 'TR' | 'KCAL') => 
                        setNewEquipment(prev => ({ ...prev, capacityUnit: value }))
                      }
                    >
                      <SelectTrigger className="h-10 w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BTU">BTUs</SelectItem>
                        <SelectItem value="TR">TR</SelectItem>
                        <SelectItem value="KCAL">kcal/h</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Fluido Refrigerante */}
                <div>
                  <Label htmlFor="refrigerant" className="mb-2 block">
                    Fluido Refrigerante
                  </Label>
                  <Select 
                    value={newEquipment.refrigerant} 
                    onValueChange={(value) => setNewEquipment(prev => ({ ...prev, refrigerant: value }))}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Selecione o refrigerante" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="R-11">R-11</SelectItem>
                      <SelectItem value="R-12">R-12</SelectItem>
                      <SelectItem value="R-22">R-22</SelectItem>
                      <SelectItem value="R-23">R-23</SelectItem>
                      <SelectItem value="R-32">R-32</SelectItem>
                      <SelectItem value="R-113">R-113</SelectItem>
                      <SelectItem value="R-114">R-114</SelectItem>
                      <SelectItem value="R-115">R-115</SelectItem>
                      <SelectItem value="R-123">R-123</SelectItem>
                      <SelectItem value="R-1234yf">R-1234yf</SelectItem>
                      <SelectItem value="R-1234ze">R-1234ze</SelectItem>
                      <SelectItem value="R-1233zd">R-1233zd</SelectItem>
                      <SelectItem value="R-134a">R-134a</SelectItem>
                      <SelectItem value="R-141b">R-141b</SelectItem>
                      <SelectItem value="R-142b">R-142b</SelectItem>
                      <SelectItem value="R-143a">R-143a</SelectItem>
                      <SelectItem value="R-152a">R-152a</SelectItem>
                      <SelectItem value="R-404A">R-404A</SelectItem>
                      <SelectItem value="R-407C">R-407C</SelectItem>
                      <SelectItem value="R-407F">R-407F</SelectItem>
                      <SelectItem value="R-410A">R-410A</SelectItem>
                      <SelectItem value="R-448A">R-448A</SelectItem>
                      <SelectItem value="R-449A">R-449A</SelectItem>
                      <SelectItem value="R-452A">R-452A</SelectItem>
                      <SelectItem value="R-454B">R-454B</SelectItem>
                      <SelectItem value="R-507A">R-507A</SelectItem>
                      <SelectItem value="R-513A">R-513A</SelectItem>
                      <SelectItem value="R-717">R-717 (Amônia)</SelectItem>
                      <SelectItem value="R-744">R-744 (CO₂)</SelectItem>
                      <SelectItem value="R-290">R-290 (Propano)</SelectItem>
                      <SelectItem value="R-600a">R-600a (Isobutano)</SelectItem>
                      <SelectItem value="R-1270">R-1270 (Propileno)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Separador visual */}
                <div className="md:col-span-2 border-t pt-4 mt-2">
                  <h4 className="text-sm font-medium text-muted-foreground mb-4">
                    Potências (calculadas automaticamente)
                  </h4>
                </div>

                {/* Potência Ativa */}
                <div>
                  <Label htmlFor="activePower" className="mb-2 block">
                    Potência Ativa (kW)
                    <span className="text-xs text-muted-foreground ml-2 font-normal">P = S × FP</span>
                  </Label>
                  <Input 
                    id="activePower"
                    type="number"
                    value={newEquipment.activePower?.toFixed(2) ?? ''}
                    disabled
                    className="h-10 bg-muted"
                  />
                </div>

                {/* Potência Aparente */}
                <div>
                  <Label htmlFor="apparentPower" className="mb-2 block">
                    Potência Aparente (kVA)
                    <span className="text-xs text-muted-foreground ml-2 font-normal">S = √3×V×I</span>
                  </Label>
                  <Input 
                    id="apparentPower"
                    type="number"
                    value={newEquipment.apparentPower?.toFixed(2) ?? ''}
                    disabled
                    className="h-10 bg-muted"
                  />
                </div>

                {/* Potência Reativa */}
                <div>
                  <Label htmlFor="reactivePower" className="mb-2 block">
                    Potência Reativa (kVAr)
                    <span className="text-xs text-muted-foreground ml-2 font-normal">Q = √(S²-P²)</span>
                  </Label>
                  <Input 
                    id="reactivePower"
                    type="number"
                    value={newEquipment.reactivePower?.toFixed(2) ?? ''}
                    disabled
                    className="h-10 bg-muted"
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* ========== BOTÕES DE AÇÃO DO FORMULÁRIO ========== */}
          <div className="flex justify-end gap-4 mt-8 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsEquipmentDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleAddEquipment} 
              disabled={!newEquipment.tag || !newEquipment.brand || !newEquipment.model || !newEquipment.capacity || !newEquipment.criticidade}
            >
              Adicionar Ativo
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

      {/* ========== MODAL DE NOVO TIPO DE ATIVO ========== */}
      {/* Modal para adicionar um novo tipo de ativo customizado */}
      <Dialog open={isNewAssetTypeDialogOpen} onOpenChange={setIsNewAssetTypeDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar Tipo de Ativo</DialogTitle>
            <DialogDescription>
              Digite o nome do novo tipo de ativo que deseja cadastrar.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="newAssetTypeName" className="mb-2 block">Nome do Tipo *</Label>
              <Input
                id="newAssetTypeName"
                value={newAssetTypeName}
                onChange={(e) => setNewAssetTypeName(e.target.value)}
                placeholder="Ex: Fan Coil, Bomba de Calor..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddAssetType();
                  }
                }}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => {
              setIsNewAssetTypeDialogOpen(false);
              setNewAssetTypeName('');
            }}>
              Cancelar
            </Button>
            <Button onClick={handleAddAssetType} disabled={!newAssetTypeName.trim()}>
              Adicionar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ========== DIALOG DE CONFIRMAÇÃO DE EXCLUSÃO ========== */}
      {/* Dialog para confirmar a exclusão de um equipamento */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Ativo</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o ativo <strong>{deletingEquipment?.tag}</strong>?
              <br /><br />
              Esta ação não pode ser desfeita. Todos os dados relacionados a este ativo serão removidos permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingEquipment(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteEquipment}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteEquipmentMutation.isPending}
            >
              {deleteEquipmentMutation.isPending ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
