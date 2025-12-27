import { useMemo } from 'react';
import { useBreakpoint } from './useBreakpoint';

interface NavItem {
  name: string;
  href: string;
  icon: any;
  priority?: number;
}

/**
 * Hook simplificado para responsividade da navbar baseado em breakpoints fixos
 * Mais previsível e confiável do que medição dinâmica
 */
export function useResponsiveNavItems(items: NavItem[]) {
  const isMd = useBreakpoint('md');     // 768px
  const isLg = useBreakpoint('lg');     // 1024px
  const isXl = useBreakpoint('xl');     // 1280px
  const is2xl = useBreakpoint('2xl');   // 1536px
  
  const visibleCount = useMemo(() => {
    // Definir quantos itens mostrar baseado no breakpoint
    if (!isMd) return 0;      // < 768px: nenhum (usa mobile menu)
    if (!isLg) return 3;      // 768-1023px: 3 itens
    if (!isXl) return 6;      // 1024-1279px: 6 itens
    if (!is2xl) return 8;     // 1280-1535px: 8 itens
    return items.length;      // >= 1536px: todos os 10 itens
  }, [isMd, isLg, isXl, is2xl, items.length]);
  
  const visibleItems = items.slice(0, visibleCount);
  const hiddenItems = items.slice(visibleCount);
  
  return { 
    visibleItems, 
    hiddenItems, 
    visibleCount,
    hasOverflow: hiddenItems.length > 0
  };
}
