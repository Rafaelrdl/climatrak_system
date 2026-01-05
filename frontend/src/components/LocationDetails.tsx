// Importações dos componentes de UI e ícones
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  Building2, 
  MapPin, 
  Users, 
  Edit, 
  Trash2,
  Phone,
  Mail,
  MapPinned,
  FileText,
  Ruler,
  UsersRound,
  Wind,
  Hash,
  Briefcase,
  Factory
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLocation as useLocationContext } from '@/contexts/LocationContext';
import { IfCanEdit } from '@/components/auth/IfCan';
import { useDeleteCompany, useDeleteUnit, useDeleteSector, useDeleteSubsection } from '@/hooks/useLocationsQuery';
import { toast } from 'sonner';
import type { Company, Unit, Sector, SubSection } from '@/types';

// Interface para as props do componente
interface LocationDetailsProps {
  onEdit: () => void;        // Função para editar a localização selecionada
}

/**
 * Componente que exibe os detalhes da localização selecionada no menu
 * Mostra informações diferentes dependendo do tipo (empresa, setor, subsetor)
 */
export function LocationDetails({ onEdit }: LocationDetailsProps) {
  // Obtém o nó selecionado do contexto de localização
  const { selectedNode, setSelectedNode } = useLocationContext();
  
  // Estado para controlar o dialog de confirmação de exclusão
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Mutations para deletar localizações
  const deleteCompanyMutation = useDeleteCompany();
  const deleteUnitMutation = useDeleteUnit();
  const deleteSectorMutation = useDeleteSector();
  const deleteSubsectionMutation = useDeleteSubsection();

  /**
   * Função para excluir a localização selecionada
   */
  const handleDelete = async () => {
    if (!selectedNode) return;
    
    // O ID real está no objeto data, não no nó da árvore
    const realId = selectedNode.data.id;
    
    setIsDeleting(true);
    try {
      switch (selectedNode.type) {
        case 'company':
          await deleteCompanyMutation.mutateAsync(realId);
          break;
        case 'unit':
          await deleteUnitMutation.mutateAsync(realId);
          break;
        case 'sector':
          await deleteSectorMutation.mutateAsync(realId);
          break;
        case 'subsection':
          await deleteSubsectionMutation.mutateAsync(realId);
          break;
      }
      
      toast.success(`${getTypeLabel()} "${selectedNode.name}" foi excluído.`);
      
      // Limpa a seleção após excluir
      setSelectedNode(null);
    } catch (error) {
      console.error('Erro ao excluir:', error);
      toast.error('Não foi possível excluir. Verifique se não há itens vinculados.');
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  // Estado vazio: quando nenhuma localização foi selecionada
  if (!selectedNode) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-4 max-w-sm px-4">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <Building2 className="h-8 w-8 text-primary/60" />
          </div>
          <div className="space-y-2">
            <p className="text-lg font-semibold text-foreground">Selecione uma localização</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Escolha uma empresa, setor ou subsetor na árvore lateral para visualizar e gerenciar seus detalhes
            </p>
          </div>
        </div>
      </div>
    );
  }

  /**
   * Retorna o ícone apropriado para o tipo de localização com container colorido
   */
  const getIcon = () => {
    switch (selectedNode.type) {
      case 'company':
        return (
          <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
            <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
        );
      case 'sector':
        return (
          <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
            <MapPin className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </div>
        );
      case 'subsection':
        return (
          <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
            <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          </div>
        );
    }
  };

  /**
   * Retorna o rótulo em português para o tipo de localização
   */
  const getTypeLabel = () => {
    switch (selectedNode.type) {
      case 'company':
        return 'Empresa';
      case 'unit':
        return 'Unidade';
      case 'sector':
        return 'Setor';
      case 'subsection':
        return 'Subsetor';
      default:
        return 'Localização';
    }
  };

  /**
   * Retorna a cor do badge baseado no tipo
   */
  const getTypeBadgeColor = () => {
    switch (selectedNode.type) {
      case 'company':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800';
      case 'unit':
        return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800';
      case 'sector':
        return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800';
      case 'subsection':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400 border-gray-200 dark:border-gray-800';
    }
  };

  /**
   * Renderiza os detalhes específicos para uma empresa
   * Exibe informações em 4 cartões: Gerais, Contato, Endereço e Dados Operacionais
   * @param company - Dados da empresa
   */
  const renderCompanyDetails = (company: Company) => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        {/* Cartão 1: Informações Gerais */}
        <Card className="border-0 shadow-sm bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-blue-100 dark:bg-blue-900/30">
                <Building2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <CardTitle className="text-base">Informações Gerais</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <Building2 className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Nome da Empresa</label>
                <p className="font-medium truncate">{company.name || '-'}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Briefcase className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Segmento</label>
                <p className="truncate">{company.segment || '-'}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Hash className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">CNPJ</label>
                <p className="font-mono text-sm">{company.cnpj || '-'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-emerald-100 dark:bg-emerald-900/30">
                <MapPinned className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <CardTitle className="text-base">Endereço</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Endereço Completo</label>
                <p className="break-words text-sm">{company.address?.fullAddress || '-'}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Cidade</label>
                  <p>{company.address?.city || '-'}</p>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Estado</label>
                <p>{company.address?.state || '-'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-card/50 backdrop-blur-sm lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-amber-100 dark:bg-amber-900/30">
                <Ruler className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
              <CardTitle className="text-base">Dados Operacionais</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <div className="p-2 rounded-md bg-blue-100 dark:bg-blue-900/30">
                  <Ruler className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Área Total</label>
                  <p className="text-lg font-semibold">{company.totalArea?.toLocaleString() || '0'} <span className="text-sm font-normal text-muted-foreground">m²</span></p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <div className="p-2 rounded-md bg-emerald-100 dark:bg-emerald-900/30">
                  <UsersRound className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Ocupantes</label>
                  <p className="text-lg font-semibold">{company.occupants || '0'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <div className="p-2 rounded-md bg-cyan-100 dark:bg-cyan-900/30">
                  <Wind className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Unidades HVAC</label>
                  <p className="text-lg font-semibold">{company.hvacUnits || '0'}</p>
                </div>
              </div>
            </div>
            {company.notes && (
              <div className="mt-4 pt-4 border-t">
                <div className="flex items-start gap-3">
                  <FileText className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Observações</label>
                    <p className="text-sm text-muted-foreground break-words mt-1">{company.notes}</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );

  /**
   * Renderiza os detalhes específicos para uma unidade
   * Exibe informações básicas da unidade
   * @param unit - Dados da unidade
   */
  const renderUnitDetails = (unit: Unit) => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        {/* Cartão 1: Informações Gerais */}
        <Card className="border-0 shadow-sm bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-orange-100 dark:bg-orange-900/30">
                <Factory className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              </div>
              <CardTitle className="text-base">Informações Gerais</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <Factory className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Nome da Unidade</label>
                <p className="text-sm font-medium">{unit.name}</p>
              </div>
            </div>
            {unit.cnpj && (
              <div className="flex items-start gap-3">
                <Hash className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">CNPJ</label>
                  <p className="text-sm font-medium">{unit.cnpj}</p>
                </div>
              </div>
            )}
            {unit.responsible && (
              <div className="flex items-start gap-3">
                <Briefcase className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Responsável</label>
                  <p className="text-sm font-medium">{unit.responsible}{unit.role ? ` - ${unit.role}` : ''}</p>
                </div>
              </div>
            )}
            {unit.notes && (
              <div className="flex items-start gap-3">
                <FileText className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Observações</label>
                  <p className="text-sm text-muted-foreground break-words mt-1">{unit.notes}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Cartão 2: Localização e Dados Operacionais */}
        <Card className="border-0 shadow-sm bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-emerald-100 dark:bg-emerald-900/30">
                <MapPinned className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <CardTitle className="text-base">Localização e Dados</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {unit.address?.fullAddress && (
              <div className="flex items-start gap-3">
                <MapPinned className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Endereço</label>
                  <p className="text-sm">{unit.address.fullAddress}</p>
                </div>
              </div>
            )}
            {unit.address?.city && (
              <div className="flex items-start gap-3">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Cidade</label>
                  <p className="text-sm">{unit.address.city}{unit.address.state ? ` - ${unit.address.state}` : ''}</p>
                </div>
              </div>
            )}
            {unit.totalArea && (
              <div className="flex items-start gap-3">
                <Ruler className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Área Total</label>
                  <p className="text-sm">{unit.totalArea} m²</p>
                </div>
              </div>
            )}
            {unit.occupants && (
              <div className="flex items-start gap-3">
                <UsersRound className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Ocupantes</label>
                  <p className="text-sm">{unit.occupants}</p>
                </div>
              </div>
            )}
            {unit.hvacUnits && (
              <div className="flex items-start gap-3">
                <Wind className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Unidades HVAC</label>
                  <p className="text-sm">{unit.hvacUnits}</p>
                </div>
              </div>
            )}
            {!unit.address && !unit.totalArea && !unit.occupants && !unit.hvacUnits && (
              <p className="text-sm text-muted-foreground">Nenhuma informação adicional cadastrada.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );

  /**
   * Renderiza os detalhes específicos para um setor
   * Exibe informações em 2 cartões: Contato e Dados Operacionais
   * @param sector - Dados do setor
   */
  const renderSectorDetails = (sector: Sector) => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        {/* Cartão 1: Responsável */}
        <Card className="border-0 shadow-sm bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-emerald-100 dark:bg-emerald-900/30">
                <Users className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <CardTitle className="text-base">Responsável</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <Users className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Nome</label>
                <p className="font-medium">{sector.responsible || '-'}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Phone className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Telefone</label>
                <p>{sector.phone || '-'}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Mail className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">E-mail</label>
                <p className="break-all text-sm">{sector.email || '-'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-amber-100 dark:bg-amber-900/30">
                <Ruler className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
              <CardTitle className="text-base">Dados Operacionais</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <div className="p-2 rounded-md bg-blue-100 dark:bg-blue-900/30">
                  <Ruler className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Área</label>
                  <p className="text-base font-semibold">{sector.area?.toLocaleString() || '0'} <span className="text-xs font-normal text-muted-foreground">m²</span></p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <div className="p-2 rounded-md bg-emerald-100 dark:bg-emerald-900/30">
                  <UsersRound className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Ocupantes</label>
                  <p className="text-base font-semibold">{sector.occupants || '0'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <div className="p-2 rounded-md bg-cyan-100 dark:bg-cyan-900/30">
                  <Wind className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Unidades HVAC</label>
                  <p className="text-base font-semibold">{sector.hvacUnits || '0'}</p>
                </div>
              </div>
            </div>
            {sector.notes && (
              <div className="mt-4 pt-4 border-t">
                <div className="flex items-start gap-3">
                  <FileText className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Observações</label>
                    <p className="text-sm text-muted-foreground break-words mt-1">{sector.notes}</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );

  /**
   * Renderiza os detalhes específicos para uma subseção
   * Exibe informações em 1 cartão com observações
   * @param subSection - Dados da subseção
   */
  const renderSubSectionDetails = (subSection: SubSection) => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 lg:gap-6">
        {/* Cartão: Informações */}
        <Card className="border-0 shadow-sm bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-purple-100 dark:bg-purple-900/30">
                <FileText className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              </div>
              <CardTitle className="text-base">Informações</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {subSection.notes ? (
              <div className="flex items-start gap-3">
                <FileText className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Observações</label>
                  <p className="text-sm text-muted-foreground break-words mt-1">{subSection.notes}</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <div className="p-3 rounded-full bg-muted/50 mb-3">
                  <FileText className="h-5 w-5 text-muted-foreground/50" />
                </div>
                <p className="text-sm text-muted-foreground">Nenhuma observação cadastrada</p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  Clique em editar para adicionar informações
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Cabeçalho com título e botões de ação */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between pb-4 border-b">
        <div className="flex items-start gap-4">
          {getIcon()}
          <div className="space-y-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-xl lg:text-2xl font-bold tracking-tight">{selectedNode.name}</h2>
              <Badge 
                variant="outline" 
                className={cn('text-xs font-medium border', getTypeBadgeColor())}
              >
                {getTypeLabel()}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Gerencie as informações e configurações desta localização
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Botão Editar localização */}
          <IfCanEdit subject="asset">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  onClick={onEdit} 
                  className="gap-2 transition-all hover:border-primary hover:text-primary"
                  aria-label="Editar localização"
                  data-testid="asset-edit"
                >
                  <Edit className="h-4 w-4" />
                  <span className="hidden sm:inline">Editar</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Editar localização</TooltipContent>
            </Tooltip>
          </IfCanEdit>
          
          {/* Botão Excluir localização */}
          <IfCanEdit subject="asset">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  onClick={() => setDeleteDialogOpen(true)}
                  className="gap-2 text-destructive border-destructive/30 hover:text-destructive hover:bg-destructive/10 hover:border-destructive"
                  aria-label="Excluir localização"
                  data-testid="asset-delete"
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Excluir</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Excluir localização</TooltipContent>
            </Tooltip>
          </IfCanEdit>
        </div>
      </div>

      {/* Conteúdo específico baseado no tipo de localização selecionada */}
      {selectedNode.type === 'company' && renderCompanyDetails(selectedNode.data as Company)}
      {selectedNode.type === 'unit' && renderUnitDetails(selectedNode.data as Unit)}
      {selectedNode.type === 'sector' && renderSectorDetails(selectedNode.data as Sector)}
      {selectedNode.type === 'subsection' && renderSubSectionDetails(selectedNode.data as SubSection)}

      {/* Dialog de confirmação de exclusão */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <div className="p-2 rounded-full bg-destructive/10">
                <Trash2 className="h-4 w-4 text-destructive" />
              </div>
              Confirmar exclusão
            </AlertDialogTitle>
            <AlertDialogDescription className="text-left">
              Tem certeza que deseja excluir {getTypeLabel().toLowerCase()} <strong>"{selectedNode.name}"</strong>?
              {selectedNode.type === 'company' && (
                <span className="block mt-2 text-destructive">
                  Atenção: Todas as unidades, setores e subsetores vinculados também serão excluídos.
                </span>
              )}
              {selectedNode.type === 'unit' && (
                <span className="block mt-2 text-destructive">
                  Atenção: Todos os setores e subsetores vinculados também serão excluídos.
                </span>
              )}
              {selectedNode.type === 'sector' && (
                <span className="block mt-2 text-destructive">
                  Atenção: Todos os subsetores vinculados também serão excluídos.
                </span>
              )}
              <span className="block mt-2">Esta ação não pode ser desfeita.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}