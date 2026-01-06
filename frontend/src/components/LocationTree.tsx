// Importações dos componentes necessários
import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { 
  Building2, 
  MapPin, 
  Users, 
  ChevronRight, 
  Menu, 
  X,
  Search,
  FolderTree,
  Layers,
  Plus,
  Factory
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useLocation as useLocationContext } from '@/contexts/LocationContext';
import { IfCan } from '@/components/auth/IfCan';
import type { LocationNode, Company, Unit, Sector } from '@/types';

interface LocationTreeProps {
  /** Callback para criar novo local */
  onCreateLocation?: (type: 'company' | 'unit' | 'sector' | 'subsection') => void;
  /** Lista de empresas (para habilitar/desabilitar botões) */
  companies?: Company[];
  /** Lista de unidades (para habilitar/desabilitar botões) */
  units?: Unit[];
  /** Lista de setores (para habilitar/desabilitar botões) */
  sectors?: Sector[];
}

/**
 * Componente que renderiza a árvore hierárquica de localizações
 * Mostra empresas > unidades > setores > subsetores em formato de árvore
 * Responsivo: versão desktop e mobile
 */
export function LocationTree({ onCreateLocation, companies = [], units = [], sectors = [] }: LocationTreeProps) {
  // Obtém dados e funções do contexto de localização
  const { 
    filteredTree,      // Árvore filtrada pela busca
    selectedNode,      // Nó atualmente selecionado
    expandedNodes,     // Set com IDs dos nós expandidos
    searchTerm,        // Termo de busca atual
    setSelectedNode,   // Função para selecionar um nó
    toggleExpanded,    // Função para expandir/recolher nós
    setSearchTerm      // Função para atualizar termo de busca
  } = useLocationContext();

  // Estados locais para controle da versão mobile
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const mobileTreeRef = useRef<HTMLDivElement>(null);
  
  // Ref para preservar posição do scroll ao expandir/recolher nós
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const scrollPositionRef = useRef<number>(0);

  // Salva a posição do scroll antes de expandir/recolher
  const handleToggleExpanded = useCallback((nodeId: string) => {
    // Salva a posição atual do scroll
    const scrollViewport = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    if (scrollViewport) {
      scrollPositionRef.current = scrollViewport.scrollTop;
    }
    toggleExpanded(nodeId);
  }, [toggleExpanded]);

  // Restaura a posição do scroll após re-render
  useEffect(() => {
    const scrollViewport = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    if (scrollViewport && scrollPositionRef.current > 0) {
      // Usa requestAnimationFrame para garantir que o DOM foi atualizado
      requestAnimationFrame(() => {
        scrollViewport.scrollTop = scrollPositionRef.current;
      });
    }
  }, [expandedNodes]);

  // Efeito para fechar o menu mobile ao pressionar Escape
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isMobileOpen) {
        setIsMobileOpen(false);
      }
    };

    if (isMobileOpen) {
      document.addEventListener('keydown', handleKeyDown);
      // Foca na árvore para acessibilidade
      mobileTreeRef.current?.focus();
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isMobileOpen]);

  // Efeito para fechar o menu mobile ao clicar fora dele
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (mobileTreeRef.current && !mobileTreeRef.current.contains(event.target as Node)) {
        setIsMobileOpen(false);
      }
    };

    if (isMobileOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isMobileOpen]);

  /**
   * Calcula estatísticas da árvore de locais
   */
  const stats = useMemo(() => {
    let companies = 0;
    let units = 0;
    let sectors = 0;
    let subsections = 0;
    
    const countNodes = (nodes: LocationNode[]) => {
      nodes.forEach(node => {
        switch (node.type) {
          case 'company': companies++; break;
          case 'unit': units++; break;
          case 'sector': sectors++; break;
          case 'subsection': subsections++; break;
        }
        if (node.children) countNodes(node.children);
      });
    };
    
    countNodes(filteredTree);
    return { companies, units, sectors, subsections, total: companies + units + sectors + subsections };
  }, [filteredTree]);

  /**
   * Retorna o ícone e cor apropriados para cada tipo de nó da árvore
   * @param type - Tipo do nó (company, unit, sector, subsection)
   * @param isSelected - Se o nó está selecionado
   */
  const getNodeIcon = (type: LocationNode['type'], isSelected = false) => {
    const iconClasses = cn(
      'h-4 w-4 shrink-0 transition-colors',
      isSelected ? 'text-primary' : 'text-muted-foreground'
    );
    
    switch (type) {
      case 'company':
        return (
          <div className={cn(
            'p-1 rounded-md',
            isSelected ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-blue-50 dark:bg-blue-900/20'
          )}>
            <Building2 className={cn(iconClasses, isSelected ? 'text-blue-600' : 'text-blue-500')} />
          </div>
        );
      case 'unit':
        return (
          <div className={cn(
            'p-1 rounded-md',
            isSelected ? 'bg-orange-100 dark:bg-orange-900/30' : 'bg-orange-50 dark:bg-orange-900/20'
          )}>
            <Factory className={cn(iconClasses, isSelected ? 'text-orange-600' : 'text-orange-500')} />
          </div>
        );
      case 'sector':
        return (
          <div className={cn(
            'p-1 rounded-md',
            isSelected ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-emerald-50 dark:bg-emerald-900/20'
          )}>
            <MapPin className={cn(iconClasses, isSelected ? 'text-emerald-600' : 'text-emerald-500')} />
          </div>
        );
      case 'subsection':
        return (
          <div className={cn(
            'p-1 rounded-md',
            isSelected ? 'bg-purple-100 dark:bg-purple-900/30' : 'bg-purple-50 dark:bg-purple-900/20'
          )}>
            <Users className={cn(iconClasses, isSelected ? 'text-purple-600' : 'text-purple-500')} />
          </div>
        );
      default:
        return null;
    }
  };

  /**
   * Retorna a cor do badge baseado no tipo
   */
  const getTypeBadge = (type: LocationNode['type']) => {
    switch (type) {
      case 'company':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'unit':
        return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
      case 'sector':
        return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
      case 'subsection':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
      default:
        return '';
    }
  };

  /**
   * Renderiza recursivamente cada nó da árvore
   * @param node - Nó atual da árvore
   * @param depth - Profundidade do nó (para indentação)
   */
  const renderTreeNode = (node: LocationNode, depth = 0) => {
    const isExpanded = expandedNodes.has(node.id);
    const isSelected = selectedNode?.id === node.id;
    const hasChildren = node.children && node.children.length > 0;
    const childCount = node.children?.length || 0;

    return (
      <div key={node.id} className="w-full">
        {/* Container principal do nó da árvore */}
        <div
          className={cn(
            'group flex items-center gap-2 px-2 py-1.5 text-sm cursor-pointer rounded-lg transition-all duration-200',
            'border border-transparent',
            isSelected && [
              'bg-primary/10 border-primary/30 shadow-sm',
              'ring-1 ring-primary/20'
            ],
            !isSelected && [
              'hover:bg-muted/80 hover:border-border/50',
              'active:scale-[0.99]'
            ]
          )}
          style={{ paddingLeft: `${8 + depth * 16}px` }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setSelectedNode(node);
            if (window.innerWidth < 1024) {
              setIsMobileOpen(false);
            }
          }}
          role="treeitem"
          aria-expanded={hasChildren ? isExpanded : undefined}
          aria-level={depth + 1}
          aria-selected={isSelected}
          tabIndex={isSelected ? 0 : -1}
          title={`${node.name} (${node.type === 'company' ? 'Empresa' : node.type === 'unit' ? 'Unidade' : node.type === 'sector' ? 'Setor' : 'Subsetor'})`}
        >
          {/* Botão para expandir/recolher */}
          {hasChildren ? (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleToggleExpanded(node.id);
              }}
              className={cn(
                'flex items-center justify-center p-1 rounded-md transition-all duration-200',
                'hover:bg-muted-foreground/10',
                isExpanded && 'bg-muted'
              )}
              aria-label={isExpanded ? 'Recolher' : 'Expandir'}
              tabIndex={-1}
            >
              <ChevronRight 
                className={cn(
                  'h-3.5 w-3.5 text-muted-foreground transition-transform duration-200',
                  isExpanded && 'rotate-90'
                )} 
              />
            </button>
          ) : (
            <div className="w-6" />
          )}
          
          {getNodeIcon(node.type, isSelected)}
          
          <span className={cn(
            'flex-1 transition-colors break-words leading-tight',
            isSelected ? 'font-medium text-primary' : 'text-foreground'
          )}>
            {node.name}
          </span>
          
          {/* Badge com contagem de filhos */}
          {hasChildren && (
            <Badge 
              variant="secondary" 
              className={cn(
                'text-[10px] px-1.5 py-0 h-4 font-normal tabular-nums',
                'opacity-60 group-hover:opacity-100 transition-opacity',
                isSelected && 'opacity-100'
              )}
            >
              {childCount}
            </Badge>
          )}
        </div>

        {/* Renderiza filhos recursivamente se o nó estiver expandido */}
        {hasChildren && isExpanded && (
          <div className="ml-3 pl-2 border-l border-border/50">
            {node.children!.map(child => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Desktop: Sempre mostra a árvore */}
      <div className="hidden lg:block h-full">
        <Card className="h-full flex flex-col border shadow-sm">
          {/* Header com título e botão de adicionar */}
          <CardHeader className="px-4 py-3 border-b space-y-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-primary/10">
                  <FolderTree className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Localizações</h3>
                </div>
              </div>
              
              {/* Botão de adicionar com dropdown */}
              {onCreateLocation && (
                <IfCan action="create" subject="asset">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      <DropdownMenuItem 
                        onClick={() => onCreateLocation('company')}
                        className="gap-2"
                      >
                        <Building2 className="h-4 w-4 text-blue-500" />
                        Empresa
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => onCreateLocation('unit')}
                        disabled={companies.length === 0}
                        className="gap-2"
                      >
                        <Factory className="h-4 w-4 text-orange-500" />
                        Unidade
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => onCreateLocation('sector')}
                        disabled={units.length === 0}
                        className="gap-2"
                      >
                        <MapPin className="h-4 w-4 text-emerald-500" />
                        Setor
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => onCreateLocation('subsection')}
                        disabled={sectors.length === 0}
                        className="gap-2"
                      >
                        <Users className="h-4 w-4 text-purple-500" />
                        Subsetor
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </IfCan>
              )}
            </div>
            
            {/* Mini KPIs */}
            <TooltipProvider>
              <div className="flex items-center gap-1.5 mt-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-900/20">
                      <Building2 className="h-3 w-3 text-blue-500" />
                      <span className="text-xs font-medium text-blue-700 dark:text-blue-400">
                        {stats.companies}
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>Empresas</TooltipContent>
                </Tooltip>
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-orange-50 dark:bg-orange-900/20">
                      <Factory className="h-3 w-3 text-orange-500" />
                      <span className="text-xs font-medium text-orange-700 dark:text-orange-400">
                        {stats.units}
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>Unidades</TooltipContent>
                </Tooltip>
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-900/20">
                      <MapPin className="h-3 w-3 text-emerald-500" />
                      <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                        {stats.sectors}
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>Setores</TooltipContent>
                </Tooltip>
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-900/20">
                      <Users className="h-3 w-3 text-purple-500" />
                      <span className="text-xs font-medium text-purple-700 dark:text-purple-400">
                        {stats.subsections}
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>Subsetores</TooltipContent>
                </Tooltip>
              </div>
            </TooltipProvider>
          </CardHeader>
          
          {/* Campo de busca */}
          <div className="px-3 py-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar localização..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-8 pl-8 text-sm bg-muted/50 border-0 focus-visible:ring-1"
                aria-label="Buscar localização"
              />
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                  onClick={() => setSearchTerm('')}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>

          {/* Container da árvore com scroll */}
          <CardContent className="flex-1 p-0 overflow-hidden">
            <ScrollArea className="h-full" ref={scrollAreaRef}>
              <div 
                className="p-2 space-y-0.5"
                role="tree"
                aria-label="Hierarquia de localizações"
              >
                {filteredTree.length > 0 ? (
                  filteredTree.map(node => renderTreeNode(node))
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                    <div className="p-3 rounded-full bg-muted/50 mb-3">
                      <Layers className="h-6 w-6 text-muted-foreground/50" />
                    </div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {searchTerm ? 'Nenhum resultado' : 'Sem localizações'}
                    </p>
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      {searchTerm 
                        ? `Nenhuma localização corresponde a "${searchTerm}"`
                        : 'Cadastre empresas, setores e subsetores'
                      }
                    </p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
      
      {/* Mobile: Mostra card colapsável */}
      <div className="lg:hidden">
        <Card className="border shadow-sm">
          <CardHeader className="px-3 py-2 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderTree className="h-4 w-4 text-primary" />
                <span className="font-medium text-sm">
                  {selectedNode ? selectedNode.name : 'Selecionar localização'}
                </span>
              </div>
              <div className="flex items-center gap-1">
                {/* Botão de adicionar com dropdown */}
                {onCreateLocation && (
                  <IfCan action="create" subject="asset">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                          <Plus className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem onClick={() => onCreateLocation('company')} className="gap-2">
                          <Building2 className="h-4 w-4 text-blue-500" />
                          Empresa
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onCreateLocation('unit')} disabled={companies.length === 0} className="gap-2">
                          <Factory className="h-4 w-4 text-orange-500" />
                          Unidade
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onCreateLocation('sector')} disabled={units.length === 0} className="gap-2">
                          <MapPin className="h-4 w-4 text-emerald-500" />
                          Setor
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onCreateLocation('subsection')} disabled={sectors.length === 0} className="gap-2">
                          <Users className="h-4 w-4 text-purple-500" />
                          Subsetor
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </IfCan>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => setIsMobileOpen(!isMobileOpen)}
                >
                  {isMobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </CardHeader>
          
          {isMobileOpen && (
            <CardContent className="p-0">
              {/* Campo de busca */}
              <div className="p-2 border-b">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Buscar localização..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="h-8 pl-8 text-sm"
                  />
                </div>
              </div>
              
              {/* Árvore com scroll */}
              <ScrollArea className="max-h-64">
                <div className="p-2 space-y-0.5" role="tree">
                  {filteredTree.length > 0 ? (
                    filteredTree.map(node => renderTreeNode(node))
                  ) : (
                    <div className="text-center text-muted-foreground py-6 text-sm">
                      {searchTerm ? 'Nenhuma localização encontrada' : 'Nenhuma localização'}
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          )}
        </Card>
      </div>
    </>
  );
}