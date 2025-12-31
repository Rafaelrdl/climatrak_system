/**
 * WorkOrderCostsTab Component
 * 
 * Aba de custos para a tela de detalhes da Work Order.
 * Exibe breakdown por tipo (labor, parts, third_party) e ações.
 * 
 * Baseado em: docs/frontend/finance/05-telas-fluxos.md (FE-FIN-009)
 */

import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { MoneyCell } from '@/components/finance/MoneyCell';
import { useWorkOrderCosts } from '@/hooks/finance/useWorkOrderCosts';
import { useAbility } from '@/hooks/useAbility';
import { EmptyState } from '@/shared/ui';
import { 
  DollarSign, 
  Clock, 
  Package, 
  Truck, 
  ExternalLink,
  PlusCircle,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { CostTransaction } from '@/types/finance';

interface WorkOrderCostsTabProps {
  workOrderId: string;
  workOrderNumber: string;
  onPostCosts?: () => void;
}

const typeConfig = {
  labor: {
    label: 'Mão de Obra',
    icon: Clock,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
  },
  parts: {
    label: 'Peças e Materiais',
    icon: Package,
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
  },
  third_party: {
    label: 'Terceiros',
    icon: Truck,
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
  },
  adjustment: {
    label: 'Ajustes',
    icon: FileText,
    color: 'text-gray-600 dark:text-gray-400',
    bgColor: 'bg-gray-100 dark:bg-gray-900/30',
  },
};

function CostTypeCard({ 
  type, 
  amount, 
  transactions 
}: { 
  type: keyof typeof typeConfig; 
  amount: number;
  transactions: CostTransaction[];
}) {
  const config = typeConfig[type];
  const Icon = config.icon;
  const count = transactions.filter(t => t.transaction_type === type).length;

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${config.bgColor}`}>
              <Icon className={`h-5 w-5 ${config.color}`} />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">{config.label}</p>
              <MoneyCell value={amount} size="lg" className="mt-0.5" />
            </div>
          </div>
          {count > 0 && (
            <Badge variant="secondary" className="text-xs">
              {count} {count === 1 ? 'lançamento' : 'lançamentos'}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function TransactionItem({ transaction }: { transaction: CostTransaction }) {
  const config = typeConfig[transaction.transaction_type];
  const Icon = config.icon;

  return (
    <div className="flex items-center justify-between py-3 border-b last:border-0">
      <div className="flex items-center gap-3">
        <div className={`p-1.5 rounded ${config.bgColor}`}>
          <Icon className={`h-4 w-4 ${config.color}`} />
        </div>
        <div>
          <p className="text-sm font-medium">{config.label}</p>
          <p className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(transaction.occurred_at), { 
              addSuffix: true,
              locale: ptBR 
            })}
          </p>
        </div>
      </div>
      <MoneyCell value={transaction.amount} size="sm" />
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3].map(i => (
          <Card key={i}>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-9 w-9 rounded-lg" />
                <div className="space-y-2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-5 w-24" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function WorkOrderCostsTab({
  workOrderId,
  workOrderNumber,
  onPostCosts,
}: WorkOrderCostsTabProps) {
  const { transactions, summary, isLoading, isError, error } = useWorkOrderCosts(workOrderId);
  const { can } = useAbility();
  
  const canCreateCosts = can('create', 'finance_ledger');
  const canViewLedger = can('view', 'finance_ledger');

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (isError) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-3" />
          <p className="text-sm text-destructive">
            Erro ao carregar custos: {error?.message || 'Erro desconhecido'}
          </p>
        </CardContent>
      </Card>
    );
  }

  const hasCosts = transactions.length > 0;

  if (!hasCosts) {
    return (
      <Card>
        <CardContent className="p-0">
          <EmptyState
            icon={<DollarSign className="h-6 w-6 text-muted-foreground" />}
            title="Nenhum custo registrado"
            description="Esta ordem de servico ainda nao possui custos lancados no ledger."
            action={canCreateCosts && onPostCosts ? (
              <Button onClick={onPostCosts}>
                <PlusCircle className="h-4 w-4 mr-2" />
                Postar Custos
              </Button>
            ) : undefined}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <CostTypeCard type="labor" amount={summary.labor} transactions={transactions} />
        <CostTypeCard type="parts" amount={summary.parts} transactions={transactions} />
        <CostTypeCard type="third_party" amount={summary.third_party} transactions={transactions} />
      </div>

      {/* Total Card */}
      <Card className="bg-muted/50">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Custo Total da OS</p>
                <MoneyCell value={summary.total} size="lg" className="mt-0.5" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              {canViewLedger && (
                <Button variant="outline" size="sm" asChild>
                  <Link to={`/finance/ledger?work_order_id=${workOrderId}`}>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Ver no Ledger
                  </Link>
                </Button>
              )}
              {canCreateCosts && onPostCosts && (
                <Button size="sm" onClick={onPostCosts}>
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Postar Custos
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Adjustment Card (if any) */}
      {summary.adjustment !== 0 && (
        <Card>
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileText className="h-4 w-4" />
                <span>Ajustes aplicados</span>
              </div>
              <MoneyCell value={summary.adjustment} colorize showSign size="sm" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transaction History */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Histórico de Lançamentos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-y">
            {transactions.slice(0, 10).map((tx) => (
              <TransactionItem key={tx.id} transaction={tx} />
            ))}
          </div>
          {transactions.length > 10 && (
            <>
              <Separator className="my-3" />
              <div className="text-center">
                {canViewLedger ? (
                  <Button variant="link" size="sm" asChild>
                    <Link to={`/finance/ledger?work_order_id=${workOrderId}`}>
                      Ver todos os {transactions.length} lançamentos
                      <ExternalLink className="h-3 w-3 ml-1" />
                    </Link>
                  </Button>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    +{transactions.length - 10} lançamentos adicionais
                  </p>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
