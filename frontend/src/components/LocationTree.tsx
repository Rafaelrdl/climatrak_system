// Importações dos componentes necessários
import { useState, useRef, useEffect } from 'react';
import { Building2, MapPin, Users, ChevronRight, ChevronDown, Menu, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useLocation as useLocationContext } from '@/contexts/LocationContext';
import type { LocationNode } from '@/types';

/**
 * Componente que renderiza a árvore hierárquica de localizações
 * Mostra empresas > setores > subsetores em formato de árvore
 * Responsivo: versão desktop e mobile
 */
export function LocationTree() {
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
   * Retorna o ícone apropriado para cada tipo de nó da árvore
   * @param type - Tipo do nó (company, sector, subsection)
   */
  const getNodeIcon = (type: LocationNode['type']) => {
    switch (type) {
      case 'company':
        return <Building2 className="h-4 w-4" />; // Ícone de empresa
      case 'sector':
        return <MapPin className="h-4 w-4" />;    // Ícone de setor
      case 'subsection':
        return <Users className="h-4 w-4" />;     // Ícone de subsetor
      default:
        return null;
    }
  };

  /**
   * Renderiza recursivamente cada nó da árvore
   * @param node - Nó atual da árvore
   * @param depth - Profundidade do nó (para indentação)
   */
  const renderTreeNode = (node: LocationNode, depth = 0) => {
    const isExpanded = expandedNodes.has(node.id);               // Verifica se o nó está expandido usando ID único
    const isSelected = selectedNode?.id === node.id;            // Verifica se o nó está selecionado usando ID único
    const hasChildren = node.children && node.children.length > 0; // Verifica se tem filhos

    return (
      <div key={node.id} className="w-full">
        {/* Container principal do nó da árvore */}
        <div
          className={cn(
            "tree-node flex items-center gap-2 px-3 py-2 text-sm cursor-pointer rounded-md transition-colors focus-ring",
            isSelected && "tree-node-selected bg-primary/10 text-primary font-medium", // Estilo quando selecionado
            !isSelected && "hover:bg-muted/50", // Estilo hover quando não selecionado
            depth > 0 && "ml-4" // Margem esquerda para indentação
          )}
          style={{ paddingLeft: `${12 + depth * 16}px` }} // Indentação proporcional à profundidade
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();

            setSelectedNode(node); // Seleciona o nó ao clicar
            // Fecha o menu mobile quando um item é selecionado em tela pequena
            if (window.innerWidth < 1024) {
              setIsMobileOpen(false);
            }
          }}
          role="treeitem"
          aria-expanded={hasChildren ? isExpanded : undefined}
          aria-level={depth + 1}
          aria-selected={isSelected}
          tabIndex={isSelected ? 0 : -1}
        >
          {/* Botão para expandir/recolher (apenas se tiver filhos) */}
          {hasChildren ? (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation(); // Impede que o clique selecione o nó
                console.log('Expandindo/recolhendo nó:', node.id);
                toggleExpanded(node.id); // Usa o ID único para expansão
              }}
              className="flex items-center justify-center p-0.5 hover:bg-muted rounded"
              aria-label={isExpanded ? "Recolher" : "Expandir"}
              tabIndex={-1}
            >
              {isExpanded ? (
                <ChevronDown className="h-3 w-3" />  // Seta para baixo quando expandido
              ) : (
                <ChevronRight className="h-3 w-3" /> // Seta para direita quando recolhido
              )}
            </button>
          ) : (
            <div className="w-4" /> // Espaço vazio para manter alinhamento
          )}
          
          {getNodeIcon(node.type)} {/* Ícone do tipo de nó */}
          <span className="truncate">{node.name}</span> {/* Nome do nó */}
        </div>

        {/* Renderiza filhos recursivamente se o nó estiver expandido */}
        {hasChildren && isExpanded && (
          <div className="ml-2">
            {node.children!.map(child => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  /**
   * Componente da árvore para versão desktop
   * Sempre visível na sidebar em telas grandes
   */
  const DesktopTree = () => (
    <div className="flex flex-col h-full">
      {/* Campo de busca */}
      <div className="p-4 border-b">
        <Input
          placeholder="Buscar localização"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="h-9"
          aria-label="Buscar localização"
        />
      </div>

      {/* Container da árvore com scroll */}
      <div 
        className="flex-1 overflow-auto p-2 space-y-1"
        role="tree"
        aria-label="Hierarquia de localizações"
      >
        {filteredTree.length > 0 ? (
          // Renderiza todos os nós raiz da árvore filtrada
          filteredTree.map(node => renderTreeNode(node))
        ) : (
          // Mensagem quando não há resultados
          <div className="text-center text-muted-foreground py-8">
            {searchTerm ? 'Nenhuma localização encontrada' : 'Nenhuma localização disponível'}
          </div>
        )}
      </div>
    </div>
  );

  /**
   * Componente da árvore para versão mobile
   * Botão que abre modal com a árvore
   */
  const MobileTree = () => (
    <>
      {/* Botão para abrir o seletor mobile */}
      <Button
        variant="outline"
        onClick={() => setIsMobileOpen(true)}
        className="btn-press flex items-center gap-2 w-full justify-start"
        aria-label="Abrir hierarquia de localizações"
      >
        <Menu className="h-4 w-4" />
        <span className="mobile-truncate">
          {selectedNode ? selectedNode.name : 'Selecionar localização'}
        </span>
      </Button>

      {/* Modal sobreposto para versão mobile */}
      {isMobileOpen && (
        <>
          {/* Fundo escuro semitransparente */}
          <div 
            className="fixed inset-0 z-40 modal-backdrop bg-background/80"
            aria-hidden="true"
          />
          
          {/* Painel da árvore mobile */}
          <div 
            ref={mobileTreeRef}
            className="fixed inset-x-4 top-20 z-50 max-h-[70vh] bg-card border rounded-lg shadow-lg animate-in"
            role="dialog"
            aria-modal="true"
            aria-label="Seletor de localização"
            tabIndex={-1}
          >
            <div className="flex flex-col h-full max-h-[70vh]">
              {/* Cabeçalho do modal */}
              <div className="flex items-center justify-between p-4 border-b">
                <h3 className="font-semibold text-lg">Selecionar Localização</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsMobileOpen(false)}
                  aria-label="Fechar seletor"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Campo de busca mobile */}
              <div className="p-4 border-b">
                <Input
                  placeholder="Buscar localização"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-9"
                  aria-label="Buscar localização"
                  autoFocus
                />
              </div>

              {/* Árvore mobile com scroll */}
              <div 
                className="flex-1 overflow-auto p-2 space-y-1"
                role="tree"
                aria-label="Hierarquia de localizações"
              >
                {filteredTree.length > 0 ? (
                  filteredTree.map(node => renderTreeNode(node))
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    {searchTerm ? 'Nenhuma localização encontrada' : 'Nenhuma localização disponível'}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );

  return (
    <>
      {/* Desktop: Sempre mostra a árvore */}
      <div className="hidden lg:contents">
        <DesktopTree />
      </div>
      
      {/* Mobile: Mostra botão e modal */}
      <div className="lg:hidden">
        <MobileTree />
      </div>
    </>
  );
}