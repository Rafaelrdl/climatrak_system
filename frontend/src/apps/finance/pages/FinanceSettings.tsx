/**
 * Finance Settings Page
 * 
 * Tela de cadastros base do módulo Finance.
 * Baseado em: docs/frontend/finance/05-telas-fluxos.md
 * 
 * Funcionalidades:
 * - Centros de custo (CRUD)
 * - Rate Cards (taxas de mão de obra)
 * - Categorias (visualização - são fixas no MVP)
 */

import { useState, useEffect } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  Building2,
  Clock,
  Tag,
  Loader2,
  AlertCircle,
  Briefcase,
  DollarSign,
  Calendar,
  FolderTree,
  Settings,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { MoneyCell } from '@/components/finance';
import { 
  useCostCenters, 
  useCreateCostCenter,
  useUpdateCostCenter,
  useDeleteCostCenter,
  useRateCards,
  useCreateRateCard,
  useUpdateRateCard,
  useDeleteRateCard,
} from '@/hooks/finance';
import { useAbility } from '@/hooks/useAbility';
import type { CostCenter, RateCard } from '@/types/finance';

// ==================== Constants ====================

const CATEGORIES = [
  { id: 'preventive', name: 'Preventiva', description: 'Manutenções planejadas e programadas' },
  { id: 'corrective', name: 'Corretiva', description: 'Reparos após falhas ou quebras' },
  { id: 'predictive', name: 'Preditiva', description: 'Baseada em monitoramento e predições' },
  { id: 'other', name: 'Outros', description: 'Custos gerais de manutenção' },
];

// ==================== Cost Center Dialog ====================

interface CostCenterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  costCenter?: CostCenter | null;
  costCenters: CostCenter[];
}

function CostCenterDialog({ open, onOpenChange, costCenter, costCenters }: CostCenterDialogProps) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [parentId, setParentId] = useState<string>('__none__');

  const createCostCenter = useCreateCostCenter();
  const updateCostCenter = useUpdateCostCenter();
  
  const isEditing = !!costCenter;
  const isPending = createCostCenter.isPending || updateCostCenter.isPending;

  // Reset form when dialog opens or costCenter changes
  useEffect(() => {
    if (open) {
      setName(costCenter?.name ?? '');
      setCode(costCenter?.code ?? '');
      setParentId(costCenter?.parent_id ?? '__none__');
    }
  }, [open, costCenter]);

  const handleSubmit = async () => {
    try {
      const parentValue = parentId === '__none__' ? null : parentId;
      
      if (isEditing && costCenter) {
        await updateCostCenter.mutateAsync({
          id: costCenter.id,
          input: { name, code, parent_id: parentValue },
        });
      } else {
        await createCostCenter.mutateAsync({
          name,
          code,
          parent_id: parentValue,
        });
      }
      onOpenChange(false);
      // Reset form
      setName('');
      setCode('');
      setParentId('__none__');
    } catch (error) {
      console.error('Erro ao salvar centro de custo:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle>
                {isEditing ? 'Editar Centro de Custo' : 'Novo Centro de Custo'}
              </DialogTitle>
              <DialogDescription>
                {isEditing 
                  ? 'Atualize as informações do centro de custo.'
                  : 'Crie um novo centro de custo para organizar os gastos.'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        
        <div className="grid gap-5 py-4">
          <div className="grid gap-2">
            <Label htmlFor="cc-name" className="flex items-center gap-2 text-sm font-medium">
              <Briefcase className="h-4 w-4 text-muted-foreground" />
              Nome <span className="text-red-500">*</span>
            </Label>
            <Input
              id="cc-name"
              placeholder="Ex: Central de Água Gelada"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="transition-all hover:border-primary focus-visible:ring-primary"
            />
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="cc-code" className="flex items-center gap-2 text-sm font-medium">
              <Tag className="h-4 w-4 text-muted-foreground" />
              Código <span className="text-red-500">*</span>
            </Label>
            <Input
              id="cc-code"
              placeholder="Ex: CAG-01"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="transition-all hover:border-primary focus-visible:ring-primary font-mono"
            />
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="cc-parent" className="flex items-center gap-2 text-sm font-medium">
              <FolderTree className="h-4 w-4 text-muted-foreground" />
              Centro de Custo Pai
            </Label>
            <Select value={parentId} onValueChange={setParentId}>
              <SelectTrigger 
                id="cc-parent"
                className="transition-all hover:border-primary focus:ring-primary"
              >
                <SelectValue placeholder="Nenhum (raiz)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Nenhum (raiz)</SelectItem>
                {costCenters
                  .filter(cc => cc.id !== costCenter?.id)
                  .map((cc) => (
                    <SelectItem key={cc.id} value={cc.id}>
                      {cc.code} - {cc.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!name || !code || isPending}
            className="bg-primary hover:bg-primary/90"
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? 'Salvar' : 'Criar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ==================== Rate Card Dialog ====================

interface RateCardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingRateCard?: RateCard | null;
}

function RateCardDialog({ open, onOpenChange, editingRateCard }: RateCardDialogProps) {
  const [role, setRole] = useState('');
  const [costPerHour, setCostPerHour] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState(
    new Date().toISOString().split('T')[0]
  );

  const createRateCard = useCreateRateCard();
  const updateRateCard = useUpdateRateCard();

  useEffect(() => {
    if (editingRateCard) {
      setRole(editingRateCard.role);
      setCostPerHour(editingRateCard.cost_per_hour.toString());
      setEffectiveFrom(editingRateCard.effective_from);
    } else {
      setRole('');
      setCostPerHour('');
      setEffectiveFrom(new Date().toISOString().split('T')[0]);
    }
  }, [editingRateCard, open]);

  const handleSubmit = async () => {
    try {
      if (editingRateCard) {
        await updateRateCard.mutateAsync({
          id: editingRateCard.id,
          input: {
            role,
            cost_per_hour: Number(costPerHour),
            effective_from: effectiveFrom,
          },
        });
      } else {
        await createRateCard.mutateAsync({
          role,
          cost_per_hour: Number(costPerHour),
          effective_from: effectiveFrom,
        });
      }
      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao salvar rate card:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle>
                {editingRateCard ? 'Editar Taxa de Mão de Obra' : 'Nova Taxa de Mão de Obra'}
              </DialogTitle>
              <DialogDescription>
                Defina o custo por hora para uma função/cargo.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        
        <div className="grid gap-5 py-4">
          <div className="grid gap-2">
            <Label htmlFor="rc-role" className="flex items-center gap-2 text-sm font-medium">
              <Briefcase className="h-4 w-4 text-muted-foreground" />
              Função/Cargo <span className="text-red-500">*</span>
            </Label>
            <Input
              id="rc-role"
              placeholder="Ex: Técnico de Refrigeração"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="transition-all hover:border-primary focus-visible:ring-primary"
            />
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="rc-cost" className="flex items-center gap-2 text-sm font-medium">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              Custo por Hora (R$) <span className="text-red-500">*</span>
            </Label>
            <Input
              id="rc-cost"
              type="number"
              min={0}
              step={0.01}
              placeholder="Ex: 110.00"
              value={costPerHour}
              onChange={(e) => setCostPerHour(e.target.value)}
              className="transition-all hover:border-primary focus-visible:ring-primary font-mono"
            />
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="rc-effective" className="flex items-center gap-2 text-sm font-medium">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              Vigência a partir de <span className="text-red-500">*</span>
            </Label>
            <Input
              id="rc-effective"
              type="date"
              value={effectiveFrom}
              onChange={(e) => setEffectiveFrom(e.target.value)}
              className="transition-all hover:border-primary focus-visible:ring-primary"
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!role || !costPerHour || createRateCard.isPending}
            className="bg-primary hover:bg-primary/90"
          >
            {createRateCard.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {editingRateCard ? 'Salvar' : 'Criar Taxa'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ==================== Cost Centers Tab ====================

function CostCentersTab() {
  const ability = useAbility();
  const canCreate = ability.can('create', 'finance');
  const canEdit = ability.can('edit', 'finance');
  const canDelete = ability.can('delete', 'finance');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCostCenter, setEditingCostCenter] = useState<CostCenter | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const { data: costCenters, isLoading, error } = useCostCenters();
  const deleteCostCenter = useDeleteCostCenter();

  const handleEdit = (cc: CostCenter) => {
    setEditingCostCenter(cc);
    setDialogOpen(true);
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault(); // Evita fechar o dialog automaticamente
    
    if (deleteId) {
      try {
        await deleteCostCenter.mutateAsync(deleteId);
        setDeleteId(null);
        setDeleteError(null);
      } catch (error: any) {
        console.error('Erro ao excluir centro de custo:', error);
        
        // Extrair mensagem do backend
        const errorMessage = error?.response?.data?.detail 
          || error?.response?.data?.error
          || 'Não foi possível excluir o centro de custo.';
        
        setDeleteError(errorMessage);
        // Não fecha o dialog para mostrar o erro
        return;
      }
    }
  };

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setEditingCostCenter(null);
    }
  };

  // Build hierarchy
  const getParentName = (parentId: string | null): string => {
    if (!parentId || !costCenters) return '-';
    const parent = costCenters.find(cc => cc.id === parentId);
    return parent ? `${parent.code} - ${parent.name}` : '-';
  };

  if (error) {
    return (
      <Alert variant="destructive" className="border-red-200 bg-red-50">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Erro ao carregar centros de custo. Tente novamente.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" />
          <div>
            <p className="text-sm font-medium">Centros de Custo</p>
            <p className="text-xs text-muted-foreground">
              Organize os custos por área, unidade ou sistema
            </p>
          </div>
        </div>
        {canCreate && (
          <Button 
            onClick={() => setDialogOpen(true)}
            className="bg-primary hover:bg-primary/90 transition-colors"
          >
            <Plus className="mr-2 h-4 w-4" />
            Novo Centro
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : costCenters && costCenters.length > 0 ? (
        <div className="border rounded-lg bg-card shadow-sm">
          <ScrollArea className="h-[calc(100vh-380px)]">
            <Table>
              <TableHeader className="sticky top-0 bg-muted/50 backdrop-blur-sm">
                <TableRow>
                  <TableHead className="w-[180px]">Código</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead className="w-[280px]">Centro Pai</TableHead>
                  <TableHead className="w-[100px] text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {costCenters.map((cc) => (
                  <TableRow 
                    key={cc.id}
                    className="transition-colors hover:bg-primary/10"
                  >
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-xs border-primary/30 text-primary">
                        {cc.code}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{cc.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {getParentName(cc.parent_id)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 justify-end">
                        {canEdit && (
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleEdit(cc)}
                            title="Editar"
                            className="h-8 w-8 hover:bg-primary/10 hover:text-primary transition-colors"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        )}
                        {canDelete && (
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => setDeleteId(cc.id)}
                            title="Excluir"
                            className="h-8 w-8 hover:bg-red-100 hover:text-red-700 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>
      ) : (
        <Card className="border-dashed border-2">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="p-4 rounded-full bg-primary/10 mb-4">
              <Building2 className="h-8 w-8 text-primary" />
            </div>
            <h3 className="font-semibold text-lg mb-1">Nenhum centro de custo</h3>
            <p className="text-sm text-muted-foreground text-center mb-6 max-w-sm">
              Crie centros de custo para organizar seus gastos por área, unidade ou sistema.
            </p>
            {canCreate && (
              <Button 
                onClick={() => setDialogOpen(true)}
                className="bg-primary hover:bg-primary/90"
              >
                <Plus className="mr-2 h-4 w-4" />
                Criar Primeiro Centro
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Dialog */}
      <CostCenterDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        costCenter={editingCostCenter}
        costCenters={costCenters ?? []}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => {
        if (!open) {
          setDeleteId(null);
          setDeleteError(null);
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir centro de custo?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Certifique-se de que não há transações 
              vinculadas a este centro de custo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          {deleteError && (
            <Alert variant="destructive" className="border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{deleteError}</AlertDescription>
            </Alert>
          )}
          
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <Button 
              onClick={handleDelete}
              variant="destructive"
              disabled={deleteCostCenter.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteCostCenter.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Excluindo...
                </>
              ) : (
                'Excluir'
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ==================== Rate Cards Tab ====================

function RateCardsTab() {
  const ability = useAbility();
  const canCreate = ability.can('create', 'finance');
  const canEdit = ability.can('edit', 'finance');
  const canDelete = ability.can('delete', 'finance');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRateCard, setEditingRateCard] = useState<RateCard | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const { data: rateCards, isLoading, error } = useRateCards();
  const deleteRateCard = useDeleteRateCard();

  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  const handleEdit = (rc: RateCard) => {
    setEditingRateCard(rc);
    setDialogOpen(true);
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    
    if (deleteId) {
      try {
        await deleteRateCard.mutateAsync(deleteId);
        setDeleteId(null);
        setDeleteError(null);
      } catch (error: any) {
        console.error('Erro ao excluir taxa:', error);
        
        const errorMessage = error?.response?.data?.detail 
          || error?.response?.data?.error
          || 'Não foi possível excluir a taxa.';
        
        setDeleteError(errorMessage);
        return;
      }
    }
  };

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setEditingRateCard(null);
    }
  };

  if (error) {
    return (
      <Alert variant="destructive" className="border-red-200 bg-red-50">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Erro ao carregar taxas de mão de obra. Tente novamente.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          <div>
            <p className="text-sm font-medium">Taxas de Mão de Obra</p>
            <p className="text-xs text-muted-foreground">
              Defina o custo por hora para cada função ou cargo
            </p>
          </div>
        </div>
        {canCreate && (
          <Button 
            onClick={() => setDialogOpen(true)}
            className="bg-primary hover:bg-primary/90 transition-colors"
          >
            <Plus className="mr-2 h-4 w-4" />
            Nova Taxa
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : rateCards && rateCards.length > 0 ? (
        <div className="border rounded-lg bg-card shadow-sm">
          <ScrollArea className="h-[calc(100vh-380px)]">
            <Table>
              <TableHeader className="sticky top-0 bg-muted/50 backdrop-blur-sm">
                <TableRow>
                  <TableHead className="w-[35%]">Função/Cargo</TableHead>
                  <TableHead className="w-[20%] text-right">Custo/Hora</TableHead>
                  <TableHead className="w-[30%]">Vigência</TableHead>
                  <TableHead className="w-[15%] text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rateCards.map((rc) => (
                  <TableRow 
                    key={rc.id}
                    className="transition-colors hover:bg-primary/10"
                  >
                    <TableCell className="font-medium">{rc.role}</TableCell>
                    <TableCell className="text-right">
                      <MoneyCell value={rc.cost_per_hour} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5" />
                        A partir de {formatDate(rc.effective_from)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {canEdit && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(rc)}
                            title="Editar"
                            className="h-8 w-8 hover:bg-primary/10 hover:text-primary transition-colors"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        )}
                        {canDelete && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteId(rc.id)}
                            title="Excluir"
                            className="h-8 w-8 hover:bg-red-100 hover:text-red-700 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>
      ) : (
        <Card className="border-dashed border-2">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="p-4 rounded-full bg-primary/10 mb-4">
              <Clock className="h-8 w-8 text-primary" />
            </div>
            <h3 className="font-semibold text-lg mb-1">Nenhuma taxa cadastrada</h3>
            <p className="text-sm text-muted-foreground text-center mb-6 max-w-sm">
              Defina taxas de mão de obra para calcular custos de labor automaticamente.
            </p>
            {canCreate && (
              <Button 
                onClick={() => setDialogOpen(true)}
                className="bg-primary hover:bg-primary/90"
              >
                <Plus className="mr-2 h-4 w-4" />
                Criar Primeira Taxa
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Dialog */}
      <RateCardDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        editingRateCard={editingRateCard}
      />

      {/* Delete AlertDialog */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => {
        if (!open) {
          setDeleteId(null);
          setDeleteError(null);
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir taxa de mão de obra?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Certifique-se de que não há registros 
              vinculados a esta taxa.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          {deleteError && (
            <Alert variant="destructive" className="border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{deleteError}</AlertDescription>
            </Alert>
          )}
          
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <Button 
              onClick={handleDelete}
              variant="destructive"
              disabled={deleteRateCard.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteRateCard.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Excluindo...
                </>
              ) : (
                'Excluir'
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ==================== Categories Tab ====================

function CategoriesTab() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Tag className="h-5 w-5 text-primary" />
          <div>
            <p className="text-sm font-medium">Categorias de Manutenção</p>
            <p className="text-xs text-muted-foreground">
              Categorias utilizadas para classificar custos (fixas no MVP)
            </p>
          </div>
        </div>
        <Badge variant="outline" className="border-primary/30 text-primary">
          Somente leitura
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {CATEGORIES.map((cat) => (
          <Card 
            key={cat.id} 
            className="transition-all hover:shadow-md hover:border-primary"
          >
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-lg bg-primary/10">
                  <Tag className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-base mb-1">{cat.name}</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    {cat.description}
                  </p>
                  <Badge 
                    variant="outline" 
                    className="text-xs font-mono border-primary/30 text-primary"
                  >
                    {cat.id}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ==================== Main Component ====================

export function FinanceSettings() {
  return (
    <div className="h-[calc(100vh-140px)] flex flex-col">
      {/* Header - Fixo */}
      <div className="flex-none pb-4 border-b bg-background">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Settings className="h-7 w-7 text-primary" />
          Cadastros Finance
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configuração de centros de custo, taxas e categorias
        </p>
      </div>

      {/* Tabs - Viewport fixo com scroll interno */}
      <div className="flex-1 overflow-hidden pt-4">
        <Tabs defaultValue="cost-centers" className="h-full flex flex-col">
          <TabsList className="flex-none">
            <TabsTrigger value="cost-centers" className="gap-2">
              <Building2 className="h-4 w-4" />
              Centros de Custo
            </TabsTrigger>
            <TabsTrigger value="rate-cards" className="gap-2">
              <Clock className="h-4 w-4" />
              Taxas de Mão de Obra
            </TabsTrigger>
            <TabsTrigger value="categories" className="gap-2">
              <Tag className="h-4 w-4" />
              Categorias
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-hidden pt-4">
            <TabsContent value="cost-centers" className="h-full m-0">
              <CostCentersTab />
            </TabsContent>

            <TabsContent value="rate-cards" className="h-full m-0">
              <RateCardsTab />
            </TabsContent>

            <TabsContent value="categories" className="h-full m-0">
              <CategoriesTab />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}

export default FinanceSettings;
