import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, Plus, FileText, AlertCircle, Loader2, ClipboardList, CheckSquare } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProcedureFilters } from '@/components/procedure/ProcedureFilters';
import { ProcedureTable } from '@/components/procedure/ProcedureTable';
import { ProcedureModal } from '@/components/procedure/ProcedureModal';
import { ProcedureViewer } from '@/components/procedure/ProcedureViewer';
import { ChecklistTable, ChecklistModal, ChecklistViewer } from '@/components/checklist';
import { IfCanCreate } from '@/components/auth/IfCan';
import { 
  useProcedures, 
  useProcedureCategories,
  useProcedureStats 
} from '@/hooks/useProceduresQuery';
import {
  useChecklists,
  useChecklistCategories,
  useChecklistStats,
  useCreateChecklist,
  useUpdateChecklist,
  useDeleteChecklist,
  useDuplicateChecklist,
  useToggleChecklistActive,
} from '@/hooks/useChecklistsQuery';
import { Procedure, ProcedureCategory, ProcedureStatus } from '@/models/procedure';
import { ChecklistTemplate, ChecklistCategory } from '@/models/checklist';
import type { ApiProcedureListItem, ApiProcedureCategory } from '@/types/api';
import { toast } from 'sonner';

// Helper para converter do formato API para o formato local (para compatibilidade com componentes existentes)
function apiProcedureToLocal(apiProcedure: ApiProcedureListItem): Procedure {
  return {
    id: String(apiProcedure.id),
    title: apiProcedure.title,
    description: '',
    category_id: apiProcedure.category ? String(apiProcedure.category) : null,
    status: apiProcedure.is_active || apiProcedure.status === 'ACTIVE' ? 'Ativo' : 'Inativo',
    tags: apiProcedure.tags || [],
    version: apiProcedure.version || 1,
    file: {
      id: String(apiProcedure.id),
      name: apiProcedure.title,
      type: apiProcedure.file_type === 'PDF' ? 'pdf' : 'md',
      size: 0,
    },
    created_at: apiProcedure.created_at,
    updated_at: apiProcedure.updated_at,
    // Campos adicionais da API para uso interno
    _apiData: apiProcedure,
  } as Procedure & { _apiData: ApiProcedureListItem };
}

function apiCategoryToLocal(apiCategory: ApiProcedureCategory): ProcedureCategory {
  return {
    id: String(apiCategory.id),
    name: apiCategory.name,
    color: apiCategory.color || '#6b7280',
  };
}

// Helper para converter checklist da API para formato local
function apiChecklistToLocal(api: ApiChecklistTemplate): ChecklistTemplate {
  return {
    id: String(api.id),
    name: api.name,
    description: api.description,
    category_id: api.category ? String(api.category) : null,
    items: (api.items || []).map((item, index) => ({
      id: item.id,
      description: item.label,
      type: item.type,
      required: item.required,
      order: item.order ?? index + 1,
    })),
    is_active: api.is_active,
    usage_count: api.usage_count,
    created_at: api.created_at,
    updated_at: api.updated_at,
  };
}

function apiChecklistCategoryToLocal(api: ApiChecklistCategory): ChecklistCategory {
  return {
    id: String(api.id),
    name: api.name,
    description: api.description,
    color: api.color,
    icon: api.icon,
  };
}

// Helper para converter status local para API
function localStatusToApi(status: ProcedureStatus | 'Todos'): 'ACTIVE' | 'INACTIVE' | 'DRAFT' | 'ARCHIVED' | undefined {
  if (status === 'Todos') return undefined;
  return status === 'Ativo' ? 'ACTIVE' : 'INACTIVE';
}

export function ProceduresPage() {
  const [activeTab, setActiveTab] = useState<'procedures' | 'checklists'>('checklists');
  
  // === PROCEDURES STATE ===
  const [procedureFilters, setProcedureFilters] = useState({
    category_id: null as string | null,
    status: 'Todos' as ProcedureStatus | 'Todos',
    q: '',
  });
  
  const [procedureModals, setProcedureModals] = useState({
    create: false,
    edit: false,
    view: false,
  });
  
  const [selectedProcedure, setSelectedProcedure] = useState<Procedure | undefined>();

  // Fetch procedures data from API
  const { 
    data: apiProcedures = [], 
    isLoading: loadingProcedures, 
    refetch: refetchProcedures 
  } = useProcedures({
    category: procedureFilters.category_id ? Number(procedureFilters.category_id) : undefined,
    status: localStatusToApi(procedureFilters.status),
    search: procedureFilters.q || undefined,
  });

  const { 
    data: apiCategories = [], 
    isLoading: loadingCategories 
  } = useProcedureCategories();

  const { data: procedureStats } = useProcedureStats();

  // Convert API data to local format
  const procedures = useMemo(() => 
    Array.isArray(apiProcedures) ? apiProcedures.map(apiProcedureToLocal) : [], 
    [apiProcedures]
  );
  
  const procedureCategories = useMemo(() => 
    Array.isArray(apiCategories) ? apiCategories.map(apiCategoryToLocal) : [], 
    [apiCategories]
  );

  // === CHECKLISTS STATE ===
  const [checklistModals, setChecklistModals] = useState({
    create: false,
    edit: false,
    view: false,
  });
  
  const [selectedChecklist, setSelectedChecklist] = useState<ChecklistTemplate | null>(null);

  // Fetch checklists data from API
  const { 
    data: apiChecklists = [], 
    isLoading: loadingChecklists,
    refetch: refetchChecklists,
  } = useChecklists();

  const { 
    data: apiChecklistCategories = [], 
    isLoading: loadingChecklistCategories 
  } = useChecklistCategories();

  const { data: checklistStatsData } = useChecklistStats();

  // Mutations
  const createChecklistMutation = useCreateChecklist();
  const updateChecklistMutation = useUpdateChecklist();
  const deleteChecklistMutation = useDeleteChecklist();
  const duplicateChecklistMutation = useDuplicateChecklist();
  const toggleActiveMutation = useToggleChecklistActive();

  // Convert API data to local format
  const checklistsData = useMemo(() => 
    Array.isArray(apiChecklists) ? apiChecklists.map(apiChecklistToLocal) : [], 
    [apiChecklists]
  );

  const checklistCategories = useMemo(() => 
    Array.isArray(apiChecklistCategories) ? apiChecklistCategories.map(apiChecklistCategoryToLocal) : [], 
    [apiChecklistCategories]
  );

  const checklistStats = checklistStatsData || {
    total: checklistsData.length,
    active: checklistsData.filter(c => c.is_active).length,
    total_items: checklistsData.reduce((acc, c) => acc + c.items.length, 0),
    total_usage: checklistsData.reduce((acc, c) => acc + (c.usage_count || 0), 0),
  };

  // === PROCEDURES HANDLERS ===
  const isProceduresLoading = loadingProcedures || loadingCategories;
  const isChecklistsLoading = loadingChecklists || loadingChecklistCategories;

  const handleProcedureFilterChange = (newFilters: Partial<typeof procedureFilters>) => {
    setProcedureFilters(prev => ({ ...prev, ...newFilters }));
  };

  const handleResetProcedureFilters = () => {
    setProcedureFilters({
      category_id: null,
      status: 'Todos',
      q: '',
    });
  };

  const handleViewProcedure = (procedure: Procedure) => {
    setSelectedProcedure(procedure);
    setProcedureModals(prev => ({ ...prev, view: true }));
  };

  const handleEditProcedure = (procedure: Procedure) => {
    setSelectedProcedure(procedure);
    setProcedureModals(prev => ({ ...prev, edit: true }));
  };

  const handleCloseProcedureModal = (type: keyof typeof procedureModals) => {
    setProcedureModals(prev => ({ ...prev, [type]: false }));
    if (type !== 'view') {
      setSelectedProcedure(undefined);
    }
  };

  const handleProcedureModalSuccess = () => {
    refetchProcedures();
    setProcedureModals({ create: false, edit: false, view: false });
    setSelectedProcedure(undefined);
  };

  // === CHECKLISTS HANDLERS ===
  const handleViewChecklist = (checklist: ChecklistTemplate) => {
    setSelectedChecklist(checklist);
    setChecklistModals(prev => ({ ...prev, view: true }));
  };

  const handleEditChecklist = (checklist: ChecklistTemplate) => {
    setSelectedChecklist(checklist);
    setChecklistModals(prev => ({ ...prev, edit: true }));
  };

  const handleDuplicateChecklist = (checklist: ChecklistTemplate) => {
    duplicateChecklistMutation.mutate(Number(checklist.id));
    handleCloseChecklistModal();
  };

  const handleDeleteChecklist = (id: string) => {
    deleteChecklistMutation.mutate(Number(id));
  };

  const handleToggleChecklistActive = (id: string, isActive: boolean) => {
    toggleActiveMutation.mutate({ id: Number(id), isActive });
  };

  const handleSaveChecklist = (data: Omit<ChecklistTemplate, 'id' | 'created_at' | 'updated_at'>) => {
    // Converter para formato da API
    const apiData = {
      name: data.name,
      description: data.description,
      category: data.category_id ? Number(data.category_id) : null,
      items: data.items.map((item, index) => ({
        id: item.id,
        label: item.description,
        type: item.type,
        required: item.required,
        order: index + 1,
        options: item.options,
      })),
      status: data.is_active ? 'ACTIVE' as const : 'INACTIVE' as const,
      is_active: data.is_active,
      estimated_time: null,
    };

    if (selectedChecklist) {
      // Update existing
      updateChecklistMutation.mutate({ 
        id: Number(selectedChecklist.id), 
        data: apiData 
      });
    } else {
      // Create new
      createChecklistMutation.mutate(apiData);
    }
    handleCloseChecklistModal();
  };

  const handleCloseChecklistModal = () => {
    setChecklistModals({ create: false, edit: false, view: false });
    setSelectedChecklist(null);
  };

  // === COMPUTED VALUES ===
  const displayProcedureStats = {
    total: procedureStats?.total ?? procedures.length,
    active: procedureStats?.by_status?.active ?? procedures.filter(p => p.status === 'Ativo').length,
    inactive: (procedureStats?.by_status?.inactive ?? 0) + (procedureStats?.by_status?.draft ?? 0) + (procedureStats?.by_status?.archived ?? 0) 
      || procedures.filter(p => p.status === 'Inativo').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Procedimentos</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie POPs, procedimentos operacionais e checklists de manutenção
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <div className="flex items-center justify-between">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="checklists" className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              Checklists
            </TabsTrigger>
            <TabsTrigger value="procedures" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Procedimentos Operacionais
            </TabsTrigger>
          </TabsList>

          {/* Action Button based on active tab */}
          <IfCanCreate subject="procedure">
            {activeTab === 'procedures' ? (
              <Button onClick={() => setProcedureModals(prev => ({ ...prev, create: true }))}>
                <Plus className="mr-2 h-4 w-4" />
                Novo Documento
              </Button>
            ) : (
              <Button onClick={() => setChecklistModals(prev => ({ ...prev, create: true }))}>
                <Plus className="mr-2 h-4 w-4" />
                Novo Checklist
              </Button>
            )}
          </IfCanCreate>
        </div>

        {/* === PROCEDURES TAB === */}
        <TabsContent value="procedures" className="space-y-6 mt-6">
          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <ProcedureFilters
                categories={procedureCategories}
                selectedCategory={procedureFilters.category_id ?? undefined}
                selectedStatus={procedureFilters.status}
                searchQuery={procedureFilters.q}
                onCategoryChange={(categoryId) => handleProcedureFilterChange({ category_id: categoryId })}
                onStatusChange={(status) => handleProcedureFilterChange({ status })}
                onSearchChange={(q) => handleProcedureFilterChange({ q })}
                onReset={handleResetProcedureFilters}
              />
            </CardContent>
          </Card>

          {/* Statistics */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Documentos</CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{displayProcedureStats.total}</div>
                <p className="text-xs text-muted-foreground">
                  POPs e documentos técnicos
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ativos</CardTitle>
                <div className="w-4 h-4 rounded-full bg-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{displayProcedureStats.active}</div>
                <p className="text-xs text-muted-foreground">
                  {displayProcedureStats.total > 0 ? Math.round((displayProcedureStats.active / displayProcedureStats.total) * 100) : 0}% do total
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Categorias</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{procedureCategories.length}</div>
                <p className="text-xs text-muted-foreground">
                  Para organização
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Loading State */}
          {isProceduresLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Carregando documentos...</span>
            </div>
          )}

          {/* Results Summary */}
          {!isProceduresLoading && procedureFilters.q && (
            <div className="flex items-center gap-2 px-4 py-3 bg-muted/50 rounded-lg">
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                {procedures.length === 0 
                  ? 'Nenhum documento encontrado' 
                  : `Exibindo ${procedures.length} documento${procedures.length !== 1 ? 's' : ''}`}
              </span>
            </div>
          )}

          {/* Procedures Table */}
          {!isProceduresLoading && (
            <ProcedureTable
              procedures={procedures}
              categories={procedureCategories}
              onView={handleViewProcedure}
              onEdit={handleEditProcedure}
              onUpdate={() => refetchProcedures()}
            />
          )}
        </TabsContent>

        {/* === CHECKLISTS TAB === */}
        <TabsContent value="checklists" className="space-y-6 mt-6">
          {/* Loading State */}
          {isChecklistsLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Carregando checklists...</span>
            </div>
          )}

          {!isChecklistsLoading && (
            <>
              {/* Statistics */}
              <div className="grid gap-4 md:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total de Checklists</CardTitle>
                    <ClipboardList className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{checklistStats.total}</div>
                    <p className="text-xs text-muted-foreground">
                      Templates disponíveis
                    </p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Ativos</CardTitle>
                    <div className="w-4 h-4 rounded-full bg-green-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{checklistStats.active}</div>
                    <p className="text-xs text-muted-foreground">
                      Prontos para uso
                    </p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total de Itens</CardTitle>
                    <CheckSquare className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{checklistStats.total_items}</div>
                    <p className="text-xs text-muted-foreground">
                      Tarefas cadastradas
                    </p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Utilizações</CardTitle>
                    <Badge variant="secondary" className="h-4">
                      {checklistStats.total_usage}
                    </Badge>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{checklistStats.total_usage}</div>
                    <p className="text-xs text-muted-foreground">
                      Vinculados a planos
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Checklists Table */}
              <ChecklistTable
                checklists={checklistsData}
                categories={checklistCategories}
                onView={handleViewChecklist}
                onEdit={handleEditChecklist}
                onDuplicate={handleDuplicateChecklist}
                onDelete={handleDeleteChecklist}
                onToggleActive={handleToggleChecklistActive}
              />
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* === PROCEDURE MODALS === */}
      <ProcedureModal
        isOpen={procedureModals.create}
        onClose={() => handleCloseProcedureModal('create')}
        onSuccess={handleProcedureModalSuccess}
        categories={procedureCategories}
      />
      
      <ProcedureModal
        isOpen={procedureModals.edit}
        onClose={() => handleCloseProcedureModal('edit')}
        onSuccess={handleProcedureModalSuccess}
        categories={procedureCategories}
        procedure={selectedProcedure}
      />

      <ProcedureViewer
        isOpen={procedureModals.view}
        onClose={() => {
          setProcedureModals(prev => ({ ...prev, view: false }));
          refetchProcedures();
        }}
        procedure={selectedProcedure}
        categories={procedureCategories}
      />

      {/* === CHECKLIST MODALS === */}
      <ChecklistModal
        isOpen={checklistModals.create}
        onClose={handleCloseChecklistModal}
        onSave={handleSaveChecklist}
        categories={checklistCategories}
      />

      <ChecklistModal
        isOpen={checklistModals.edit}
        onClose={handleCloseChecklistModal}
        onSave={handleSaveChecklist}
        categories={checklistCategories}
        checklist={selectedChecklist || undefined}
      />

      <ChecklistViewer
        isOpen={checklistModals.view}
        onClose={handleCloseChecklistModal}
        checklist={selectedChecklist}
        categories={checklistCategories}
        onEdit={(checklist) => {
          setChecklistModals({ create: false, edit: true, view: false });
          setSelectedChecklist(checklist);
        }}
        onDuplicate={(checklist) => {
          handleDuplicateChecklist(checklist);
          handleCloseChecklistModal();
        }}
      />
    </div>
  );
}