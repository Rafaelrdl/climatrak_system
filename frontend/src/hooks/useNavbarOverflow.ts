import { useState, useLayoutEffect, useRef, useCallback, useEffect } from 'react';

interface NavItem {
  name: string;
  href: string;
  icon: any;
  exact?: boolean;
}

// Constantes de largura para cálculo
const ITEM_WIDTH = {
  FULL: 110,           // Item com ícone + texto (estimativa média)
  COMPACT: 40,         // Item apenas com ícone + padding
  OVERFLOW_BUTTON: 52, // Botão "Mais (...)"
  GAP: 8,              // Espaçamento entre itens
};

/**
 * Hook para navegação responsiva com algoritmo Priority+ Nav
 * 
 * Estratégia PRIORIZA TEXTO:
 * 1. Sempre tenta manter o máximo de itens COM TEXTO visíveis
 * 2. Itens excedentes vão para o menu "Mais" (overflow)
 * 3. Modo compacto (apenas ícones) só ativa em telas MUITO pequenas
 *    onde mesmo com overflow, poucos itens caberiam com texto
 * 
 * Regra: Só usar modo compacto se isso permitir mostrar 
 * SIGNIFICATIVAMENTE mais itens (pelo menos 3+ a mais)
 */
export function useNavbarOverflow(items: NavItem[]) {
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const overflowBtnRef = useRef<HTMLButtonElement>(null);
  
  const [visibleCount, setVisibleCount] = useState(items.length);
  const [isCompact, setIsCompact] = useState(false);

  const measure = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const containerWidth = container.clientWidth;
    const totalItems = items.length;
    
    // FASE 1: Calcular se todos cabem com ícone + texto
    const fullWidth = (totalItems * ITEM_WIDTH.FULL) + ((totalItems - 1) * ITEM_WIDTH.GAP);
    
    if (fullWidth <= containerWidth) {
      // Tudo cabe no modo completo!
      setIsCompact(false);
      setVisibleCount(totalItems);
      return;
    }

    // FASE 2: Precisa do botão overflow - reservar espaço
    const availableWidth = containerWidth - ITEM_WIDTH.OVERFLOW_BUTTON - ITEM_WIDTH.GAP;
    
    // Quantos cabem no modo completo (com texto)?
    let countWithLabels = 0;
    let accWidth = 0;
    for (let i = 0; i < totalItems; i++) {
      const itemWidth = ITEM_WIDTH.FULL + (i > 0 ? ITEM_WIDTH.GAP : 0);
      if (accWidth + itemWidth <= availableWidth) {
        accWidth += itemWidth;
        countWithLabels++;
      } else {
        break;
      }
    }

    // PRIORIZAR TEXTO: Se consegue mostrar pelo menos 4 itens com texto, usar texto
    // Só considerar modo compacto se tela for MUITO pequena
    if (countWithLabels >= 4) {
      setIsCompact(false);
      setVisibleCount(countWithLabels);
      return;
    }

    // FASE 3: Tela muito pequena - avaliar se compacto ajudaria MUITO
    let countWithIcons = 0;
    accWidth = 0;
    for (let i = 0; i < totalItems; i++) {
      const itemWidth = ITEM_WIDTH.COMPACT + (i > 0 ? ITEM_WIDTH.GAP : 0);
      if (accWidth + itemWidth <= availableWidth) {
        accWidth += itemWidth;
        countWithIcons++;
      } else {
        break;
      }
    }

    // Só usar modo compacto se mostrar pelo menos 4 itens A MAIS que modo com texto
    // E se conseguir mostrar pelo menos 6 itens no modo compacto
    const shouldUseCompact = (countWithIcons >= countWithLabels + 4) && (countWithIcons >= 6);
    
    if (shouldUseCompact) {
      setIsCompact(true);
      setVisibleCount(countWithIcons);
    } else {
      // Preferir texto mesmo que mostre menos itens
      setIsCompact(false);
      setVisibleCount(Math.max(countWithLabels, 3)); // Mínimo 3 itens visíveis
    }
  }, [items.length]);

  // Medição inicial após montagem
  useEffect(() => {
    // Pequeno delay para garantir que o layout está estável
    const timer = setTimeout(measure, 50);
    return () => clearTimeout(timer);
  }, [measure]);

  // Observar mudanças de tamanho do container
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(measure);
    });
    
    resizeObserver.observe(container);

    return () => resizeObserver.disconnect();
  }, [measure]);

  const visibleItems = items.slice(0, visibleCount);
  const hiddenItems = items.slice(visibleCount);

  return {
    containerRef,
    listRef,
    overflowBtnRef,
    visibleItems,
    hiddenItems,
    isCompact,
    hasOverflow: hiddenItems.length > 0,
  };
}