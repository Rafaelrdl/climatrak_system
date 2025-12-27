import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Home,
  Package,
  ClipboardList,
  MessageSquare,
  Calendar,
  BarChart3,
  Warehouse,
  BookOpen,
  FileText,
  HelpCircle,
  Menu,
  MoreHorizontal,
  Activity,
  Gauge,
  Bell,
  Settings,
  Cpu,
  AlertTriangle,
  Box,
  Wrench,
  LayoutDashboard,
  LayoutGrid
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavbarOverflow } from '@/hooks/useNavbarOverflow';

// Tipos para navegação
interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
}

// Rotas do módulo CMMS (TrakNor)
const cmmsNavigation: NavItem[] = [
  { name: 'Visão Geral', href: '/cmms', icon: Home, exact: true },
  { name: 'Ativos', href: '/cmms/ativos', icon: Package },
  { name: 'Ordens de Serviço', href: '/cmms/work-orders', icon: ClipboardList },
  { name: 'Solicitações', href: '/cmms/requests', icon: MessageSquare },
  { name: 'Planos', href: '/cmms/plans', icon: Calendar },
  { name: 'Métricas', href: '/cmms/metrics', icon: BarChart3 },
  { name: 'Estoque', href: '/cmms/inventory', icon: Warehouse },
  { name: 'Procedimentos', href: '/cmms/procedures', icon: BookOpen },
  { name: 'Relatórios', href: '/cmms/reports', icon: FileText },
];

// Rotas do módulo Monitor (TrakSense)
const monitorNavigation: NavItem[] = [
  { name: 'Visão Geral', href: '/monitor', icon: LayoutDashboard, exact: true },
  { name: 'Dashboards', href: '/monitor/dashboards', icon: LayoutGrid },
  { name: 'Ativos', href: '/monitor/ativos', icon: Box },
  { name: 'Sensores', href: '/monitor/sensores', icon: Cpu },
  { name: 'Alertas', href: '/monitor/alertas', icon: Bell },
  { name: 'Regras', href: '/monitor/regras', icon: AlertTriangle },
];

// Hook para obter a navegação baseada no módulo ativo
function useModuleNavigation(): NavItem[] {
  const location = useLocation();
  
  if (location.pathname.startsWith('/monitor')) {
    return monitorNavigation;
  }
  return cmmsNavigation;
}

// Helper para verificar se uma rota está ativa
function isRouteActive(pathname: string, href: string, exact?: boolean): boolean {
  if (exact) {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(href + '/');
}

interface MobileNavbarProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MobileNavbar({ isOpen, onOpenChange }: MobileNavbarProps) {
  const location = useLocation();
  const navigation = useModuleNavigation();
  const isMonitor = location.pathname.startsWith('/monitor');

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onOpenChange(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when menu is open
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onOpenChange]);

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm"
          className="md:hidden relative p-2"
          aria-label="Abrir menu de navegação"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="top" className="w-full h-screen p-0 border-none">
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="h-full bg-background flex flex-col"
            >
              {/* Header */}
              <div className={cn(
                "flex items-center justify-start p-4 border-b",
                isMonitor ? "border-green-200 bg-green-50" : "border-blue-200 bg-blue-50"
              )}>
                <span className={cn(
                  "font-semibold text-lg",
                  isMonitor ? "text-green-700" : "text-blue-700"
                )}>
                  {isMonitor ? 'TrakSense Monitor' : 'TrakNor CMMS'}
                </span>
              </div>

              {/* Navigation Items */}
              <nav className="flex-1 overflow-y-auto">
                <div className="px-4 py-6 space-y-2">
                  {navigation.map((item, index) => {
                    const isActive = isRouteActive(location.pathname, item.href, item.exact);
                    return (
                      <motion.div
                        key={item.name}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ 
                          duration: 0.3, 
                          delay: index * 0.05,
                          ease: "easeOut"
                        }}
                      >
                        <Link
                          to={item.href}
                          onClick={() => onOpenChange(false)}
                          className={cn(
                            "mobile-nav-item",
                            isActive
                              ? "bg-primary text-primary-foreground shadow-sm"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground"
                          )}
                        >
                          <item.icon className="h-5 w-5 flex-shrink-0" />
                          <span>{item.name}</span>
                        </Link>
                      </motion.div>
                    );
                  })}
                </div>
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </SheetContent>
    </Sheet>
  );
}

interface DesktopNavbarProps extends React.HTMLAttributes<HTMLElement> {
  className?: string;
}

export function DesktopNavbar({ className, ...props }: DesktopNavbarProps) {
  const location = useLocation();
  const navigation = useModuleNavigation();
  const isMonitor = location.pathname.startsWith('/monitor');
  
  // Hook dinâmico Priority+ Nav V2 (medição real do DOM)
  const { 
    containerRef, 
    listRef,
    overflowBtnRef,
    visibleItems, 
    hiddenItems, 
    isCompact, 
    hasOverflow 
  } = useNavbarOverflow(navigation);

  return (
    <TooltipProvider delayDuration={300}>
      <nav 
        ref={containerRef}
        className={cn("hidden md:flex items-center overflow-hidden flex-1", className)}
        data-compact={isCompact ? "true" : "false"}
        {...props}
      >
        {/* Lista de itens com min-width:0 para prevenir overflow */}
        <ul 
          ref={listRef}
          className="flex items-center gap-1 lg:gap-2 flex-1 min-w-0 overflow-hidden"
        >
          {/* Renderizar TODOS os itens (para medição), mas apenas visibleCount serão mostrados */}
          {navigation.map((item, index) => {
            const isActive = isRouteActive(location.pathname, item.href, item.exact);
            const isVisible = index < visibleItems.length;
            
            const navLink = (
              <Link
                to={item.href}
                className={cn(
                  "nav-item flex items-center transition-all duration-200",
                  isCompact ? "gap-0 px-2.5" : "gap-2 px-2 lg:px-3",
                  isActive ? "nav-item-active" : "nav-item-inactive"
                )}
              >
                <item.icon className="h-4 w-4 flex-shrink-0" />
                {/* Label escondido quando compact */}
                <span className={cn(
                  "nav-item-label whitespace-nowrap transition-all duration-200",
                  isCompact && "sr-only"
                )}>
                  {item.name}
                </span>
              </Link>
            );
            
            return (
              <li 
                key={item.name}
                className={cn(
                  "flex-shrink-0",
                  !isVisible && "hidden"
                )}
              >
                {isCompact ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      {navLink}
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="font-medium">
                      {item.name}
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  navLink
                )}
              </li>
            );
          })}
        </ul>
        
        {/* Botão overflow - SEMPRE renderizado (para medição), mas escondido quando não necessário */}
        <div className={cn(
          "flex-shrink-0 ml-1 lg:ml-2",
          !hasOverflow && "invisible pointer-events-none"
        )}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                ref={overflowBtnRef}
                variant="ghost"
                size="sm"
                className="nav-overflow-menu text-muted-foreground hover:bg-muted hover:text-foreground px-2"
                aria-label={`Mais ${hiddenItems.length} opções de navegação`}
                aria-expanded={hasOverflow}
              >
                <MoreHorizontal className="h-4 w-4" />
                {hasOverflow && (
                  <span className="nav-overflow-badge ml-1 text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full min-w-[20px] text-center font-medium">
                    {hiddenItems.length}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            {hasOverflow && (
              <DropdownMenuContent align="end" className="w-56 max-h-[70vh] overflow-y-auto">
                {hiddenItems.map((item) => {
                  const isActive = isRouteActive(location.pathname, item.href, item.exact);
                  return (
                    <DropdownMenuItem key={item.name} asChild>
                      <Link
                        to={item.href}
                        className={cn(
                          "flex items-center gap-2 w-full cursor-pointer",
                          isActive && "bg-accent text-accent-foreground"
                        )}
                      >
                        <item.icon className="h-4 w-4 flex-shrink-0" />
                        {/* Menu de overflow sempre mostra texto completo */}
                        <span>{item.name}</span>
                      </Link>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            )}
          </DropdownMenu>
        </div>
      </nav>
    </TooltipProvider>
  );
}