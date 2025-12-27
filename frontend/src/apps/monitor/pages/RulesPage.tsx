/**
 * RulesPage - Página de Regras de Monitoramento
 * 
 * Configuração de regras automáticas para geração de alertas
 * baseados em condições de equipamentos IoT.
 */

import { useState, useMemo } from 'react';
import { 
  Plus,
  Trash2,
  Edit,
  Activity,
  Zap,
  Clock,
  MoreVertical,
  Filter,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/shared/ui';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import { 
  useRulesQuery, 
  useToggleRuleMutation, 
  useDeleteRuleMutation 
} from '../hooks/useRulesQuery';
import { useAssetsQuery } from '../hooks/useAssetsQuery';
import { RuleFormModal } from '../components';
import type { Rule, Severity } from '../types/rule';

// Helper para cores de severidade
const getSeverityColor = (severity?: Severity | string) => {
  if (!severity) return 'bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-800 dark:text-gray-400';
  const severityKey = severity.toUpperCase();
  const colors: Record<string, string> = {
    'CRITICAL': 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-400',
    'HIGH': 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/30 dark:text-orange-400',
    'MEDIUM': 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400',
    'LOW': 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400',
  };
  return colors[severityKey] || colors['MEDIUM'];
};

// Helper para labels de operadores
const getOperatorLabel = (op: string) => {
  const labels: Record<string, string> = {
    '>': 'Maior que',
    '>=': 'Maior ou igual',
    '<': 'Menor que',
    '<=': 'Menor ou igual',
    '==': 'Igual',
    '!=': 'Diferente',
  };
  return labels[op] || op;
};

export function RulesPage() {
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<Rule | null>(null);
  
  // Queries
  const { data: rules = [], isLoading, refetch } = useRulesQuery();
  const { data: assets = [] } = useAssetsQuery();
  
  // Mutations
  const toggleMutation = useToggleRuleMutation();
  const deleteMutation = useDeleteRuleMutation();
  
  // Filtrar regras por equipamento selecionado
  const filteredRules = useMemo(() => {
    if (selectedEquipmentId === 'all') {
      return rules;
    }
    return rules.filter(rule => String(rule.equipment) === selectedEquipmentId);
  }, [rules, selectedEquipmentId]);

  // Handlers
  const handleCreateRule = () => {
    setEditingRule(null);
    setIsModalOpen(true);
  };

  const handleEditRule = (rule: Rule) => {
    setEditingRule(rule);
    setIsModalOpen(true);
  };

  const handleDeleteRule = async (ruleId: number) => {
    deleteMutation.mutate(ruleId, {
      onSuccess: () => {
        toast.success('Regra removida com sucesso');
      },
      onError: () => {
        toast.error('Erro ao remover regra');
      }
    });
  };

  const handleToggleRule = async (ruleId: number) => {
    toggleMutation.mutate(ruleId, {
      onError: () => {
        toast.error('Erro ao alterar status da regra');
      }
    });
  };

  // Helper para obter nome do equipamento
  const getEquipmentName = (equipmentId: number, equipmentName?: string) => {
    const asset = assets.find(a => String(a.id) === String(equipmentId));
    return asset?.tag || equipmentName || 'Equipamento não encontrado';
  };

  // Helper para formatar resumo da regra
  const formatRuleSummary = (rule: Rule) => {
    const paramLabel = rule.parameter_key || 'parâmetro';
    const variableLabel = rule.variable_key ? ` (${rule.variable_key})` : '';
    return `${paramLabel}${variableLabel} ${rule.operator} ${rule.threshold} por ${rule.duration} min`;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Regras de Monitoramento"
        description="Configure regras automáticas para geração de alertas baseados em condições de equipamentos"
        icon={<Zap className="h-6 w-6" />}
      >
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Button onClick={handleCreateRule} className="gap-2">
            <Plus className="w-4 h-4" />
            Nova Regra
          </Button>
        </div>
      </PageHeader>

      {/* Filtros */}
      <div className="flex items-center gap-4 p-4 bg-card rounded-lg border border-border shadow-sm">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">Filtrar por equipamento:</span>
        </div>
        <Select value={selectedEquipmentId} onValueChange={setSelectedEquipmentId}>
          <SelectTrigger className="w-[300px]">
            <SelectValue placeholder="Todos os equipamentos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os equipamentos</SelectItem>
            {assets.map(asset => (
              <SelectItem key={asset.id} value={String(asset.id)}>
                <div className="flex items-center gap-2">
                  <span>{asset.tag}</span>
                  <span className="text-muted-foreground">({asset.type})</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="text-sm text-muted-foreground">
          {filteredRules.length} regra{filteredRules.length !== 1 ? 's' : ''} encontrada{filteredRules.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center h-32">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {/* Rules List */}
      <div className="space-y-3">
        {!isLoading && filteredRules.length === 0 ? (
          <div className="text-center py-12 bg-muted/30 rounded-lg border-2 border-dashed">
            <Activity className="w-12 h-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
            <p className="text-muted-foreground font-medium">
              {selectedEquipmentId === 'all' 
                ? 'Nenhuma regra configurada' 
                : 'Nenhuma regra encontrada para este equipamento'
              }
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Clique em "Nova Regra" para começar
            </p>
          </div>
        ) : (
          filteredRules.map((rule) => (
            <div
              key={rule.id}
              className={`bg-card rounded-lg p-4 border border-border shadow-sm transition-all ${
                rule.enabled ? 'border-l-4 border-l-primary' : 'opacity-60'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="font-semibold text-base">{rule.name}</h4>
                    <Badge variant={rule.enabled ? 'default' : 'secondary'} className="text-xs">
                      {rule.enabled ? 'Ativa' : 'Inativa'}
                    </Badge>
                    <Badge className={`text-xs border ${getSeverityColor(rule.severity)}`}>
                      {rule.severity}
                    </Badge>
                  </div>

                  <p className="text-sm text-muted-foreground mb-3">{rule.description}</p>

                  <div className="flex items-center gap-2 flex-wrap text-sm">
                    <div className="flex items-center gap-1 px-2 py-1 bg-muted rounded">
                      <Activity className="w-3 h-3" />
                      <span className="font-medium">{getEquipmentName(rule.equipment, rule.equipment_name)}</span>
                    </div>
                    <span className="text-muted-foreground">→</span>
                    <div className="flex items-center gap-1 px-2 py-1 bg-primary/10 rounded">
                      <span className="font-mono text-xs">{formatRuleSummary(rule)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Criada: {new Date(rule.created_at).toLocaleDateString('pt-BR')}
                    </div>
                    <div className="flex items-center gap-1">
                      Ações: {rule.actions.join(', ')}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <Switch
                    checked={rule.enabled}
                    onCheckedChange={() => handleToggleRule(rule.id)}
                  />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEditRule(rule)} className="gap-2">
                        <Edit className="w-4 h-4" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDeleteRule(rule.id)}
                        className="gap-2 text-destructive focus:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Rule Form Modal */}
      <RuleFormModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        editingRule={editingRule}
      />
    </div>
  );
}
