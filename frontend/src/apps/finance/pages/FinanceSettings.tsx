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

import { useState } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  Building2,
  Clock,
  Tag,
  Loader2,
  AlertCircle,
  MoreHorizontal,
  Check,
  X,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { MoneyCell } from '@/components/finance';
import { 
  useCostCenters, 
  useCreateCostCenter,
  useUpdateCostCenter,
  useDeleteCostCenter,
  useRateCards,
  useCreateRateCard,
} from '@/hooks/finance';
import { useAbility } from '@/hooks/useAbility';
import { cn } from '@/lib/utils';
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
  const [name, setName] = useState(costCenter?.name ?? '');
  const [code, setCode] = useState(costCenter?.code ?? '');
  const [parentId, setParentId] = useState<string>(costCenter?.parent_id ?? '');

  const createCostCenter = useCreateCostCenter();
  const updateCostCenter = useUpdateCostCenter();
  
  const isEditing = !!costCenter;
  const isPending = createCostCenter.isPending || updateCostCenter.isPending;

  // Reset form when dialog opens with new data
  useState(() => {
    setName(costCenter?.name ?? '');
    setCode(costCenter?.code ?? '');
    setParentId(costCenter?.parent_id ?? '');
  });

  const handleSubmit = async () => {
    try {
      if (isEditing && costCenter) {
        await updateCostCenter.mutateAsync({
          id: costCenter.id,
          input: { name, code, parent_id: parentId || null },
        });
      } else {
        await createCostCenter.mutateAsync({
          name,
          code,
          parent_id: parentId || null,
        });
      }
      onOpenChange(false);
      // Reset form
      setName('');
      setCode('');
      setParentId('');
    } catch (error) {
      console.error('Erro ao salvar centro de custo:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Centro de Custo' : 'Novo Centro de Custo'}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? 'Atualize as informações do centro de custo.'
              : 'Crie um novo centro de custo para organizar os gastos.'}
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="cc-name">Nome *</Label>
            <Input
              id="cc-name"
              placeholder="Ex: Central de Água Gelada"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="cc-code">Código *</Label>
            <Input
              id="cc-code"
              placeholder="Ex: CAG-01"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
            />
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="cc-parent">Centro de Custo Pai</Label>
            <Select value={parentId} onValueChange={setParentId}>
              <SelectTrigger id="cc-parent">
                <SelectValue placeholder="Nenhum (raiz)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Nenhum (raiz)</SelectItem>
                {costCenters
                  .filter(cc => cc.id !== costCenter?.id) // Can't be parent of itself
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
          <Button onClick={handleSubmit} disabled={!name || !code || isPending}>
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
}

function RateCardDialog({ open, onOpenChange }: RateCardDialogProps) {
  const [role, setRole] = useState('');
  const [costPerHour, setCostPerHour] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState(
    new Date().toISOString().split('T')[0]
  );

  const createRateCard = useCreateRateCard();

  const handleSubmit = async () => {
    try {
      await createRateCard.mutateAsync({
        role,
        cost_per_hour: Number(costPerHour),
        effective_from: effectiveFrom,
      });
      onOpenChange(false);
      // Reset form
      setRole('');
      setCostPerHour('');
      setEffectiveFrom(new Date().toISOString().split('T')[0]);
    } catch (error) {
      console.error('Erro ao criar rate card:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Nova Taxa de Mão de Obra</DialogTitle>
          <DialogDescription>
            Defina o custo por hora para uma função/cargo.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="rc-role">Função/Cargo *</Label>
            <Input
              id="rc-role"
              placeholder="Ex: Técnico de Refrigeração"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            />
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="rc-cost">Custo por Hora (R$) *</Label>
            <Input
              id="rc-cost"
              type="number"
              min={0}
              step={0.01}
              placeholder="Ex: 110.00"
              value={costPerHour}
              onChange={(e) => setCostPerHour(e.target.value)}
            />
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="rc-effective">Vigência a partir de *</Label>
            <Input
              id="rc-effective"
              type="date"
              value={effectiveFrom}
              onChange={(e) => setEffectiveFrom(e.target.value)}
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
          >
            {createRateCard.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Criar Taxa
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
  const canUpdate = ability.can('update', 'finance');
  const canDelete = ability.can('delete', 'finance');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCostCenter, setEditingCostCenter] = useState<CostCenter | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: costCenters, isLoading, error } = useCostCenters();
  const deleteCostCenter = useDeleteCostCenter();

  const handleEdit = (cc: CostCenter) => {
    setEditingCostCenter(cc);
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (deleteId) {
      try {
        await deleteCostCenter.mutateAsync(deleteId);
        setDeleteId(null);
      } catch (error) {
        console.error('Erro ao excluir centro de custo:', error);
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
      <Alert variant="destructive">
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
        <p className="text-sm text-muted-foreground">
          Organize os custos por área, unidade ou sistema.
        </p>
        {canCreate && (
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Centro
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : costCenters && costCenters.length > 0 ? (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Centro Pai</TableHead>
                <TableHead className="w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {costCenters.map((cc) => (
                <TableRow key={cc.id}>
                  <TableCell>
                    <Badge variant="outline">{cc.code}</Badge>
                  </TableCell>
                  <TableCell className="font-medium">{cc.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {getParentName(cc.parent_id)}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {canUpdate && (
                          <DropdownMenuItem onClick={() => handleEdit(cc)}>
                            <Edit2 className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                        )}
                        {canDelete && (
                          <DropdownMenuItem 
                            className="text-red-600"
                            onClick={() => setDeleteId(cc.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Excluir
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-medium text-lg mb-2">Nenhum centro de custo</h3>
            <p className="text-muted-foreground text-center mb-4">
              Crie centros de custo para organizar seus gastos por área.
            </p>
            {canCreate && (
              <Button onClick={() => setDialogOpen(true)}>
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
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir centro de custo?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Certifique-se de que não há transações 
              vinculadas a este centro de custo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Excluir
            </AlertDialogAction>
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

  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: rateCards, isLoading, error } = useRateCards();

  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  if (error) {
    return (
      <Alert variant="destructive">
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
        <p className="text-sm text-muted-foreground">
          Defina o custo por hora para cada função ou cargo.
        </p>
        {canCreate && (
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Taxa
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : rateCards && rateCards.length > 0 ? (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Função/Cargo</TableHead>
                <TableHead className="text-right">Custo/Hora</TableHead>
                <TableHead>Vigência</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rateCards.map((rc) => (
                <TableRow key={rc.id}>
                  <TableCell className="font-medium">{rc.role}</TableCell>
                  <TableCell className="text-right">
                    <MoneyCell value={rc.cost_per_hour} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    A partir de {formatDate(rc.effective_from)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Clock className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-medium text-lg mb-2">Nenhuma taxa cadastrada</h3>
            <p className="text-muted-foreground text-center mb-4">
              Defina taxas de mão de obra para calcular custos de labor.
            </p>
            {canCreate && (
              <Button onClick={() => setDialogOpen(true)}>
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
        onOpenChange={setDialogOpen}
      />
    </div>
  );
}

// ==================== Categories Tab ====================

function CategoriesTab() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Categorias de manutenção utilizadas para classificar custos.
        </p>
        <Badge variant="outline">Somente leitura</Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {CATEGORIES.map((cat) => (
          <Card key={cat.id}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Tag className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium">{cat.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {cat.description}
                  </p>
                  <Badge variant="outline" className="mt-2 text-xs">
                    {cat.id}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          As categorias são pré-definidas pelo sistema e não podem ser alteradas no MVP.
          Caso precise de categorias adicionais, entre em contato com o suporte.
        </AlertDescription>
      </Alert>
    </div>
  );
}

// ==================== Main Component ====================

export function FinanceSettings() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Cadastros</h1>
        <p className="text-muted-foreground">
          Configuração de centros de custo, taxas e categorias
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="cost-centers" className="space-y-4">
        <TabsList>
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

        <TabsContent value="cost-centers">
          <CostCentersTab />
        </TabsContent>

        <TabsContent value="rate-cards">
          <RateCardsTab />
        </TabsContent>

        <TabsContent value="categories">
          <CategoriesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default FinanceSettings;
