import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { LogOut, User, Users, Settings2, HelpCircle, Sparkles } from 'lucide-react';
import { useUsers } from '@/data/usersStore';
import { IfCan } from '@/components/auth/IfCan';
import { useIsMobile } from '@/hooks/use-mobile';
import { MobileNavbar, DesktopNavbar } from '@/components/Navbar';
import { FirstTimeGuide, useFirstTimeGuide } from '@/components/onboarding/FirstTimeGuide';
import { TourHint } from '@/components/tour/TourHint';
import { useTour } from '@/components/tour';
import { ProductSwitcher } from '@/components/ProductSwitcher';
import { logout as logoutService } from '@/services/authService';
import { AlertsNotificationDropdown } from '@/components/AlertsNotificationDropdown';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { getCurrentUser } = useUsers();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const location = useLocation();
  const { shouldShow, handleComplete, handleSkip } = useFirstTimeGuide();
  const { startWelcomeTour } = useTour();
  
  // Detect current module based on URL
  const isMonitorModule = location.pathname.startsWith('/monitor');
  const modulePrefix = isMonitorModule ? '/monitor' : '/cmms';
  
  // NOTE: Geração automática de OS agora é responsabilidade do backend (Celery/cron)
  // O frontend apenas exibe as OSs geradas pela API

  const user = getCurrentUser();

  // If no user is authenticated, don't render layout
  // AuthProvider will handle redirect to login
  if (!user) {
    return null;
  }

  const handleLogout = () => {
    logoutService().finally(() => {
      navigate('/login');
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-16 items-center gap-2 sm:gap-4 px-4 sm:px-6">
          {/* Product Switcher - Always visible, never shrinks */}
          <div className="flex-shrink-0 min-w-fit" data-tour="product-switcher">
            <ProductSwitcher />
          </div>

          {/* Desktop Navigation - Flex grows, can shrink */}
          <DesktopNavbar className="flex-1 min-w-0 mx-2 sm:mx-4 lg:mx-6" data-tour="navigation" />

          {/* Right Side: Mobile Menu + Alerts + User Menu - Always visible, never shrinks */}
          <div className="flex items-center gap-2 flex-shrink-0 min-w-fit">
            {/* Mobile Navigation */}
            {isMobile && (
              <MobileNavbar 
                isOpen={isMobileNavOpen} 
                onOpenChange={setIsMobileNavOpen}
                data-tour="mobile-menu"
              />
            )}

            {/* Alerts Notification Dropdown */}
            <AlertsNotificationDropdown />

            {/* Help Icon */}
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 flex-shrink-0"
              asChild
            >
              <Link to={`${modulePrefix}/help`}>
                <HelpCircle className="h-5 w-5 text-muted-foreground" />
                <span className="sr-only">Ajuda</span>
              </Link>
            </Button>

            {/* User Menu - Always visible */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  className="relative h-8 w-8 rounded-full flex-shrink-0"
                  data-tour="user-menu"
                >
                  <Avatar className="h-8 w-8">
                    {user.avatar_url && (
                      <AvatarImage src={user.avatar_url} alt={user.name} />
                    )}
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {user.name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <div className="flex items-center justify-start gap-2 p-2">
                  <div className="flex flex-col space-y-1 leading-none">
                    <p className="font-medium">{user.name}</p>
                    <p className="w-[200px] truncate text-sm text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to={`${modulePrefix}/profile`} className="w-full">
                    <User className="mr-2 h-4 w-4" />
                    <span>Perfil</span>
                  </Link>
                </DropdownMenuItem>
                <IfCan action="manage" subject="user">
                  <DropdownMenuItem asChild>
                    <Link to={`${modulePrefix}/admin/team`} className="w-full">
                      <Users className="mr-2 h-4 w-4" />
                      <span>Equipe</span>
                    </Link>
                  </DropdownMenuItem>
                </IfCan>
                <DropdownMenuItem asChild>
                  <Link to={`${modulePrefix}/settings`} className="w-full">
                    <Settings2 className="mr-2 h-4 w-4" />
                    <span>Configuração</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={startWelcomeTour}>
                  <Sparkles className="mr-2 h-4 w-4" />
                  <span>Iniciar Tour</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sair</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 sm:p-6">
        {children}
      </main>
      
      {/* First Time Guide */}
      {shouldShow && (
        <FirstTimeGuide onComplete={handleComplete} onSkip={handleSkip} />
      )}
      
      {/* Tour Hint - contextual help */}
      <TourHint />
    </div>
  );
}
