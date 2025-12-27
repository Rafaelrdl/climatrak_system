// Importações dos componentes de UI e hooks necessários
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  useCompanies, 
  useSectors, 
  useSubsections,
  useCreateCompany,
  useUpdateCompany,
  useCreateSector,
  useUpdateSector,
  useCreateSubsection,
  useUpdateSubsection
} from '@/hooks/useLocationsQuery';
import { useLocation as useLocationContext } from '@/contexts/LocationContext';
import { Building2, MapPin, Users, Phone, Mail, Calendar, FileText, LayoutGrid } from 'lucide-react';
import type { Company, Sector, SubSection } from '@/types';

// Interface para as props do modal
interface LocationFormModalProps {
  isOpen: boolean;                                    // Controla se o modal está aberto
  onClose: () => void;                               // Função para fechar o modal
  mode: 'create' | 'edit';                          // Modo: criar ou editar
  type: 'company' | 'sector' | 'subsection';        // Tipo de localização
  initialData?: Company | Sector | SubSection;       // Dados iniciais para edição
}

/**
 * Modal para criar ou editar localizações (empresas, setores, subsetores)
 * Apresenta formulários diferentes baseados no tipo de localização
 */
export function LocationFormModal({ 
  isOpen, 
  onClose, 
  mode, 
  type, 
  initialData 
}: LocationFormModalProps) {
  // React Query hooks para dados
  const { data: companies = [] } = useCompanies();
  const { data: sectors = [] } = useSectors();
  const { data: subSections = [] } = useSubsections();
  const { selectedNode, setSelectedNode } = useLocationContext();
  
  // Mutations para criar/atualizar localizações
  const createCompanyMutation = useCreateCompany();
  const updateCompanyMutation = useUpdateCompany();
  const createSectorMutation = useCreateSector();
  const updateSectorMutation = useUpdateSector();
  const createSubsectionMutation = useCreateSubsection();
  const updateSubsectionMutation = useUpdateSubsection();

  // Estado do formulário para empresas
  const [companyForm, setCompanyForm] = useState<Partial<Company>>({
    name: '',
    segment: '',
    cnpj: '',
    address: {
      zip: '',         // CEP
      city: '',        // Cidade
      state: '',       // Estado
      fullAddress: ''  // Endereço completo
    },
    totalArea: 0,     // Área total em m²
    occupants: 0,     // Número de ocupantes
    hvacUnits: 0,     // Unidades HVAC
    notes: ''         // Observações
  });

  // Estado do formulário para setores
  const [sectorForm, setSectorForm] = useState<Partial<Sector>>({
    name: '',                    // Nome do setor
    companyId: 'no-company',     // ID da empresa (inicialmente vazio)
    responsible: '',             // Responsável
    phone: '',                   // Telefone do responsável
    email: '',                   // Email do responsável
    area: 0,                     // Área em m²
    occupants: 0,               // Número de ocupantes
    hvacUnits: 0,               // Unidades HVAC
    notes: ''                   // Observações
  });

  // Estado do formulário para subseções
  const [subSectionForm, setSubSectionForm] = useState<Partial<SubSection>>({
    name: '',                   // Nome da subseção
    sectorId: 'no-sector',      // ID do setor (inicialmente vazio)
    notes: ''                   // Observações
  });

  /**
   * Efeito para inicializar os dados do formulário quando o modal abre
   * Carrega dados para edição ou limpa para criação
   */
  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && initialData) {
        // Modo edição: carrega dados existentes com valores padrão para evitar undefined
        if (type === 'company') {
          const company = initialData as Company;
          setCompanyForm({
            ...company,
            name: company.name || '',
            segment: company.segment || '',
            cnpj: company.cnpj || '',
            address: company.address || { zip: '', city: '', state: '', fullAddress: '' },
            totalArea: company.totalArea || 0,
            occupants: company.occupants || 0,
            hvacUnits: company.hvacUnits || 0,
            notes: company.notes || ''
          });
        } else if (type === 'sector') {
          const sector = initialData as Sector;
          setSectorForm({
            ...sector,
            name: sector.name || '',
            companyId: sector.companyId || 'no-company',
            responsible: sector.responsible || '',
            phone: sector.phone || '',
            email: sector.email || '',
            area: sector.area || 0,
            occupants: sector.occupants || 0,
            hvacUnits: sector.hvacUnits || 0,
            notes: sector.notes || ''
          });
        } else if (type === 'subsection') {
          const subsection = initialData as SubSection;
          setSubSectionForm({
            ...subsection,
            name: subsection.name || '',
            sectorId: subsection.sectorId || 'no-sector',
            notes: subsection.notes || ''
          });
        }
      } else {
        // Modo criação: reseta formulários
        setCompanyForm({
          name: '',
          segment: '',
          cnpj: '',
          address: { zip: '', city: '', state: '', fullAddress: '' },
          totalArea: 0,
          occupants: 0,
          hvacUnits: 0,
          notes: ''
        });
        setSectorForm({
          name: '',
          companyId: 'no-company',
          responsible: '',
          phone: '',
          email: '',
          area: 0,
          occupants: 0,
          hvacUnits: 0,
          notes: ''
        });
        setSubSectionForm({
          name: '',
          sectorId: 'no-sector',
          notes: ''
        });
      }
    }
  }, [isOpen, mode, type, initialData]);

  /**
   * Função para processar o envio do formulário
   * Valida os dados e salva/atualiza a localização conforme o tipo e modo
   */
  const handleSubmit = () => {
    if (type === 'company') {
      if (mode === 'edit') {
        // Atualiza empresa existente via API
        const companyId = (initialData as Company).id;
        updateCompanyMutation.mutate(
          { id: companyId, data: companyForm },
          {
            onSuccess: (updatedCompany) => {
              // Atualiza nó selecionado se for o mesmo
              if (selectedNode?.id === companyId) {
                setSelectedNode({ ...selectedNode, data: updatedCompany });
              }
              onClose();
            }
          }
        );
      } else {
        // Cria nova empresa via API
        createCompanyMutation.mutate(
          companyForm as Omit<Company, 'id' | 'createdAt'>,
          {
            onSuccess: () => {
              onClose();
            }
          }
        );
      }
      return;
    } else if (type === 'sector') {
      // Validação: não permite salvar sem empresa selecionada
      if (!sectorForm.companyId || sectorForm.companyId === 'no-company') {
        return;
      }
      
      if (mode === 'edit') {
        // Atualiza setor existente via API
        const sectorId = (initialData as Sector).id;
        updateSectorMutation.mutate(
          { id: sectorId, data: sectorForm },
          {
            onSuccess: (updatedSector) => {
              // Atualiza nó selecionado se for o mesmo
              if (selectedNode?.id === sectorId) {
                setSelectedNode({ ...selectedNode, data: updatedSector });
              }
              onClose();
            }
          }
        );
      } else {
        // Cria novo setor via API
        createSectorMutation.mutate(
          sectorForm as Omit<Sector, 'id'>,
          {
            onSuccess: () => {
              onClose();
            }
          }
        );
      }
      return;
    } else if (type === 'subsection') {
      // Validação: não permite salvar sem setor selecionado
      if (!subSectionForm.sectorId || subSectionForm.sectorId === 'no-sector') {
        return;
      }
      
      if (mode === 'edit') {
        // Atualiza subseção existente via API
        const subsectionId = (initialData as SubSection).id;
        updateSubsectionMutation.mutate(
          { id: subsectionId, data: subSectionForm },
          {
            onSuccess: (updatedSubsection) => {
              // Atualiza nó selecionado se for o mesmo
              if (selectedNode?.id === subsectionId) {
                setSelectedNode({ ...selectedNode, data: updatedSubsection });
              }
              onClose();
            }
          }
        );
      } else {
        // Cria nova subseção via API
        createSubsectionMutation.mutate(
          subSectionForm as Omit<SubSection, 'id'>,
          {
            onSuccess: () => {
              onClose();
            }
          }
        );
      }
      return;
    }
  };

  /**
   * Renderiza o formulário específico para empresas
   * Inclui campos para dados gerais, contato, endereço e informações operacionais
   */
  const renderCompanyForm = () => (
    <div className="bg-muted/30 rounded-lg p-6 border border-border/50">
      <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
        <Building2 className="w-4 h-4 text-primary" />
        Dados da Empresa
      </h3>
      
      <div className="space-y-5">
        {/* Nome e Segmento */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="name" className="mb-2 block">
              Nome da Empresa *
              <span className="text-xs text-muted-foreground ml-2 font-normal">
                Nome oficial da organização
              </span>
            </Label>
            <Input
              id="name"
              value={companyForm.name}
              onChange={(e) => setCompanyForm(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Ex: TechCorp Industrial"
              className="h-10"
              required
            />
          </div>
          <div>
            <Label htmlFor="segment" className="mb-2 block">
              Segmento *
              <span className="text-xs text-muted-foreground ml-2 font-normal">
                Área de atuação
              </span>
            </Label>
            <Input
              id="segment"
              value={companyForm.segment}
              onChange={(e) => setCompanyForm(prev => ({ ...prev, segment: e.target.value }))}
              placeholder="Ex: Varejo, Corporativo"
              className="h-10"
              required
            />
          </div>
        </div>

        {/* CNPJ */}
        <div>
          <Label htmlFor="cnpj" className="mb-2 block">
            CNPJ *
            <span className="text-xs text-muted-foreground ml-2 font-normal">
              Cadastro Nacional da Pessoa Jurídica
            </span>
          </Label>
          <Input
            id="cnpj"
            value={companyForm.cnpj}
            onChange={(e) => setCompanyForm(prev => ({ ...prev, cnpj: e.target.value }))}
            placeholder="00.000.000/0000-00"
            className="h-10"
            required
          />
        </div>

        {/* Endereço */}
        <div className="space-y-3">
          <Label className="mb-2 block">Endereço *</Label>
          <div>
            <Input
              value={companyForm.address?.fullAddress || ''}
              onChange={(e) => setCompanyForm(prev => ({ 
                ...prev, 
                address: { ...prev.address!, fullAddress: e.target.value }
              }))}
              placeholder="Ex: Av. Industrial, 1000 - Centro"
              className="h-10 mb-3"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input
              value={companyForm.address?.zip || ''}
              onChange={(e) => setCompanyForm(prev => ({ 
                ...prev, 
                address: { ...prev.address!, zip: e.target.value }
              }))}
              placeholder="CEP"
              className="h-10"
            />
            <Input
              value={companyForm.address?.city || ''}
              onChange={(e) => setCompanyForm(prev => ({ 
                ...prev, 
                address: { ...prev.address!, city: e.target.value }
              }))}
              placeholder="Cidade"
              className="h-10"
            />
            <Input
              value={companyForm.address?.state || ''}
              onChange={(e) => setCompanyForm(prev => ({ 
                ...prev, 
                address: { ...prev.address!, state: e.target.value }
              }))}
              placeholder="Estado"
              className="h-10"
            />
          </div>
        </div>

        {/* Área Total, Ocupantes e Unidades HVAC */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="totalArea" className="mb-2 block">
              Área Total (m²) *
              <span className="text-xs text-muted-foreground ml-2 font-normal">
                Metragem total
              </span>
            </Label>
            <Input
              id="totalArea"
              type="number"
              value={companyForm.totalArea}
              onChange={(e) => setCompanyForm(prev => ({ ...prev, totalArea: Number(e.target.value) }))}
              placeholder="0"
              className="h-10"
              min="0"
              required
            />
          </div>
          <div>
            <Label htmlFor="occupants" className="mb-2 block">
              Ocupantes *
              <span className="text-xs text-muted-foreground ml-2 font-normal">
                Número de pessoas
              </span>
            </Label>
            <Input
              id="occupants"
              type="number"
              value={companyForm.occupants}
              onChange={(e) => setCompanyForm(prev => ({ ...prev, occupants: Number(e.target.value) }))}
              placeholder="0"
              className="h-10"
              min="0"
              required
            />
          </div>
          <div>
            <Label htmlFor="hvacUnits" className="mb-2 block">
              Unidades HVAC *
              <span className="text-xs text-muted-foreground ml-2 font-normal">
                Quantidade total
              </span>
            </Label>
            <Input
              id="hvacUnits"
              type="number"
              value={companyForm.hvacUnits}
              onChange={(e) => setCompanyForm(prev => ({ ...prev, hvacUnits: Number(e.target.value) }))}
              placeholder="0"
              className="h-10"
              min="0"
              required
            />
          </div>
        </div>

        {/* Observações */}
        <div>
          <Label htmlFor="notes" className="mb-2 block">
            Observações Adicionais
            <span className="text-xs text-muted-foreground ml-2 font-normal">
              (opcional)
            </span>
          </Label>
          <Textarea
            id="notes"
            value={companyForm.notes}
            onChange={(e) => setCompanyForm(prev => ({ ...prev, notes: e.target.value }))}
            placeholder="Informações adicionais sobre a empresa..."
            className="min-h-[80px] resize-none"
            rows={3}
          />
        </div>
      </div>
    </div>
  );

  /**
   * Renderiza o formulário específico para setores
   * Inclui seleção de empresa, dados de contato e informações operacionais
   */
  const renderSectorForm = () => (
    <div className="bg-muted/30 rounded-lg p-6 border border-border/50">
      <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
        <MapPin className="w-4 h-4 text-primary" />
        Dados do Setor
      </h3>
      
      <div className="space-y-5">
        {/* Nome do Setor */}
        <div>
          <Label htmlFor="sectorName" className="mb-2 block">
            Nome do Setor *
          </Label>
          <Input
            id="sectorName"
            value={sectorForm.name}
            onChange={(e) => setSectorForm(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Ex: Departamento de TI"
            className="h-10"
            required
          />
        </div>

        {/* Empresa */}
        <div>
          <Label htmlFor="companySelect" className="mb-2 block">Empresa *</Label>
          <Select 
            value={sectorForm.companyId} 
            onValueChange={(value) => setSectorForm(prev => ({ ...prev, companyId: value }))}
          >
            <SelectTrigger className="h-10">
              <SelectValue placeholder="Selecione uma empresa" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="no-company">Selecione uma empresa</SelectItem>
              {(companies || []).map(company => (
                <SelectItem key={company.id} value={company.id}>
                  {company.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Responsável */}
        <div>
          <Label htmlFor="sectorResponsible" className="mb-2 block">
            Responsável
          </Label>
          <Input
            id="sectorResponsible"
            value={sectorForm.responsible || ''}
            onChange={(e) => setSectorForm(prev => ({ ...prev, responsible: e.target.value }))}
            placeholder="Ex: Maria Santos"
            className="h-10"
          />
        </div>

        {/* Telefone e Email do Responsável */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="sectorPhone" className="mb-2 block">
              Telefone
            </Label>
            <Input
              id="sectorPhone"
              value={sectorForm.phone || ''}
              onChange={(e) => setSectorForm(prev => ({ ...prev, phone: e.target.value }))}
              placeholder="(11) 99999-9999"
              className="h-10"
            />
          </div>
          <div>
            <Label htmlFor="sectorEmail" className="mb-2 block">
              E-mail
            </Label>
            <Input
              id="sectorEmail"
              type="email"
              value={sectorForm.email || ''}
              onChange={(e) => setSectorForm(prev => ({ ...prev, email: e.target.value }))}
              placeholder="responsavel@empresa.com"
              className="h-10"
            />
          </div>
        </div>

        {/* Área, Ocupantes e Unidades HVAC */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="sectorArea" className="mb-2 block">
              Área (m²)
            </Label>
            <Input
              id="sectorArea"
              type="number"
              value={sectorForm.area ?? 0}
              onChange={(e) => setSectorForm(prev => ({ ...prev, area: Number(e.target.value) }))}
              placeholder="0"
              className="h-10"
              min="0"
            />
          </div>
          <div>
            <Label htmlFor="sectorOccupants" className="mb-2 block">
              Ocupantes
            </Label>
            <Input
              id="sectorOccupants"
              type="number"
              value={sectorForm.occupants ?? 0}
              onChange={(e) => setSectorForm(prev => ({ ...prev, occupants: Number(e.target.value) }))}
              placeholder="0"
              className="h-10"
              min="0"
            />
          </div>
          <div>
            <Label htmlFor="sectorHvacUnits" className="mb-2 block">
              Unidades HVAC
            </Label>
            <Input
              id="sectorHvacUnits"
              type="number"
              value={sectorForm.hvacUnits ?? 0}
              onChange={(e) => setSectorForm(prev => ({ ...prev, hvacUnits: Number(e.target.value) }))}
              placeholder="0"
              className="h-10"
              min="0"
            />
          </div>
        </div>

        {/* Observações */}
        <div>
          <Label htmlFor="sectorNotes" className="mb-2 block">
            Observações Adicionais (opcional)
          </Label>
          <Textarea
            id="sectorNotes"
            value={sectorForm.notes || ''}
            onChange={(e) => setSectorForm(prev => ({ ...prev, notes: e.target.value }))}
            placeholder="Informações adicionais sobre o setor..."
            className="min-h-[80px] resize-none"
            rows={3}
          />
        </div>
      </div>
    </div>
  );

  /**
   * Renderiza o formulário específico para subseções
   * Inclui seleção de empresa e setor, além de dados de contato e operacionais
   */
  const renderSubSectionForm = () => {
    // Filtra setores pela empresa selecionada
    const availableSectors = sectorForm.companyId 
      ? sectors.filter(s => s.companyId === sectorForm.companyId)
      : sectors;

    return (
      <div className="bg-muted/30 rounded-lg p-6 border border-border/50">
        <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
          <LayoutGrid className="w-4 h-4 text-primary" />
          Dados do Subsetor
        </h3>
        
        <div className="space-y-5">
          {/* Nome do Subsetor */}
          <div>
            <Label htmlFor="subSectionName" className="mb-2 block">
              Nome do Subsetor *
            </Label>
            <Input
              id="subSectionName"
              value={subSectionForm.name}
              onChange={(e) => setSubSectionForm(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Ex: Sala de Reuniões"
              className="h-10"
              required
            />
          </div>

          {/* Empresa */}
          <div>
            <Label htmlFor="companySelectSub" className="mb-2 block">Empresa *</Label>
            <Select 
              value={
                subSectionForm.sectorId 
                  ? sectors.find(s => s.id === subSectionForm.sectorId)?.companyId || 'no-company-sub'
                  : 'no-company-sub'
              }
              onValueChange={(companyId) => {
                // Reset sector when company changes
                setSubSectionForm(prev => ({ ...prev, sectorId: 'no-sector' }));
                // Store company in temporary state for filtering
                setSectorForm(prev => ({ ...prev, companyId }));
              }}
            >
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Selecione uma empresa" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="no-company-sub">Selecione uma empresa</SelectItem>
                {companies.map(company => (
                  <SelectItem key={company.id} value={company.id}>
                    {company.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Setor */}
          <div>
            <Label htmlFor="sectorSelectSub" className="mb-2 block">Setor *</Label>
            <Select 
              value={subSectionForm.sectorId} 
              onValueChange={(value) => setSubSectionForm(prev => ({ ...prev, sectorId: value }))}
              disabled={!sectorForm.companyId || sectorForm.companyId === 'no-company'}
            >
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Selecione um setor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="no-sector">Selecione um setor</SelectItem>
                {availableSectors.map(sector => (
                  <SelectItem key={sector.id} value={sector.id}>
                    {sector.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Observações */}
          <div>
            <Label htmlFor="subSectionNotes" className="mb-2 block">
              Observações Adicionais (opcional)
            </Label>
            <Textarea
              id="subSectionNotes"
              value={subSectionForm.notes || ''}
              onChange={(e) => setSubSectionForm(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Informações adicionais sobre o subsetor..."
              className="min-h-[80px] resize-none"
              rows={3}
            />
          </div>
        </div>
      </div>
    );
  };

  /**
   * Gera o título do modal baseado no modo e tipo de localização
   */
  const getModalTitle = () => {
    const action = mode === 'create' ? 'Adicionar' : 'Editar';
    switch (type) {
      case 'company': return `${action} Empresa`;
      case 'sector': return `${action} Setor`;
      case 'subsection': return `${action} Subsetor`;
      default: return '';
    }
  };

  const getModalDescription = () => {
    switch (type) {
      case 'company': 
        return mode === 'create' 
          ? 'Cadastre uma nova empresa no sistema. Empresas são o nível mais alto na hierarquia de locais.'
          : 'Edite os dados da empresa. Altere as informações conforme necessário.';
      case 'sector': 
        return mode === 'create'
          ? 'Adicione um novo setor vinculado a uma empresa. Setores são áreas ou departamentos dentro de uma empresa.'
          : 'Edite os dados do setor. Modifique as informações conforme necessário.';
      case 'subsection': 
        return mode === 'create'
          ? 'Crie um novo subsetor vinculado a um setor. Subsetores são espaços específicos dentro de um setor.'
          : 'Edite os dados do subsetor. Ajuste as informações conforme necessário.';
      default: return '';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-6 md:p-8">
        <DialogHeader className="mb-6">
          <DialogTitle className="text-xl font-semibold">{getModalTitle()}</DialogTitle>
          <DialogDescription>
            {getModalDescription()}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Renderiza o formulário baseado no tipo de localização */}
          {type === 'company' && renderCompanyForm()}
          {type === 'sector' && renderSectorForm()}
          {type === 'subsection' && renderSubSectionForm()}
        </div>

        {/* Botões de ação */}
        <div className="flex justify-end gap-3 mt-8 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit}>
            {mode === 'create' ? 'Criar' : 'Salvar Alterações'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}