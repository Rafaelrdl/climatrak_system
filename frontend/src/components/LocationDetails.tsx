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
import { Building2, MapPin, Users, Edit, Trash2 } from 'lucide-react';
import { useLocation as useLocationContext } from '@/contexts/LocationContext';
import { IfCanEdit } from '@/components/auth/IfCan';
import { useDeleteCompany, useDeleteSector, useDeleteSubsection } from '@/hooks/useLocationsQuery';
import { toast } from 'sonner';
import type { Company, Sector, SubSection } from '@/types';

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
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <div className="text-center space-y-2">
          <Building2 className="h-12 w-12 mx-auto opacity-50" />
          <p className="text-lg font-medium">Selecione uma localização</p>
          <p className="text-sm">Escolha uma empresa, setor ou subsetor para ver os detalhes</p>
        </div>
      </div>
    );
  }

  /**
   * Retorna o ícone apropriado para o tipo de localização
   */
  const getIcon = () => {
    switch (selectedNode.type) {
      case 'company':
        return <Building2 className="h-5 w-5" />; // Ícone de empresa
      case 'sector':
        return <MapPin className="h-5 w-5" />;    // Ícone de setor
      case 'subsection':
        return <Users className="h-5 w-5" />;     // Ícone de subsetor
    }
  };

  /**
   * Retorna o rótulo em português para o tipo de localização
   */
  const getTypeLabel = () => {
    switch (selectedNode.type) {
      case 'company':
        return 'Empresa';
      case 'sector':
        return 'Setor';
      case 'subsection':
        return 'Subsetor';
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
        <Card className="location-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Informações Gerais</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Nome da Empresa</label>
              <p className="font-medium">{company.name || '-'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Segmento</label>
              <p>{company.segment || '-'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">CNPJ</label>
              <p>{company.cnpj || '-'}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="location-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Endereço</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Endereço Completo</label>
              <p className="break-words">{company.address?.fullAddress || '-'}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Cidade</label>
                <p>{company.address?.city || '-'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Estado</label>
                <p>{company.address?.state || '-'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="location-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Dados Operacionais</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Área Total</label>
                <p className="font-medium">{company.totalArea?.toLocaleString() || '0'} m²</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Ocupantes</label>
                <p className="font-medium">{company.occupants || '0'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Unidades HVAC</label>
                <p className="font-medium">{company.hvacUnits || '0'}</p>
              </div>
            </div>
            {company.notes && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Observações Adicionais</label>
                <p className="break-words">{company.notes}</p>
              </div>
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
        <Card className="location-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Responsável</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Nome</label>
              <p className="font-medium">{sector.responsible || '-'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Telefone</label>
              <p>{sector.phone || '-'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">E-mail</label>
              <p className="break-all">{sector.email || '-'}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="location-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Dados Operacionais</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Área</label>
                <p className="font-medium">{sector.area?.toLocaleString() || '0'} m²</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Ocupantes</label>
                <p className="font-medium">{sector.occupants || '0'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Unidades HVAC</label>
                <p className="font-medium">{sector.hvacUnits || '0'}</p>
              </div>
            </div>
            {sector.notes && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Observações Adicionais</label>
                <p className="break-words">{sector.notes}</p>
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
        <Card className="location-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Informações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {subSection.notes ? (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Observações</label>
                <p className="break-words">{subSection.notes}</p>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">Nenhuma observação cadastrada.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Cabeçalho com título e botões de ação */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          {getIcon()}
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl lg:text-2xl font-bold">{selectedNode.name}</h2>
              <Badge variant="secondary">{getTypeLabel()}</Badge>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Botão Editar localização */}
          <IfCanEdit subject="asset">
            <Button 
              variant="outline" 
              onClick={onEdit} 
              className="btn-press flex items-center gap-2"
              aria-label="Editar localização"
              data-testid="asset-edit"
            >
              <Edit className="h-4 w-4" />
              Editar
            </Button>
          </IfCanEdit>
          
          {/* Botão Excluir localização */}
          <IfCanEdit subject="asset">
            <Button 
              variant="outline" 
              onClick={() => setDeleteDialogOpen(true)}
              className="btn-press flex items-center gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
              aria-label="Excluir localização"
              data-testid="asset-delete"
            >
              <Trash2 className="h-4 w-4" />
              Excluir
            </Button>
          </IfCanEdit>
        </div>
      </div>

      {/* Conteúdo específico baseado no tipo de localização selecionada */}
      {selectedNode.type === 'company' && renderCompanyDetails(selectedNode.data as Company)}
      {selectedNode.type === 'sector' && renderSectorDetails(selectedNode.data as Sector)}
      {selectedNode.type === 'subsection' && renderSubSectionDetails(selectedNode.data as SubSection)}

      {/* Dialog de confirmação de exclusão */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir {getTypeLabel().toLowerCase()} <strong>"{selectedNode.name}"</strong>?
              {selectedNode.type === 'company' && (
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