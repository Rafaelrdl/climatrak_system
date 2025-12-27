import { User, Settings, Shield, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

type TabValue = 'dados' | 'preferencias' | 'seguranca';

interface Tab {
  id: TabValue;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const tabs: Tab[] = [
  {
    id: 'dados',
    label: 'Dados Pessoais',
    description: 'Nome, foto e informações de contato',
    icon: User,
  },
  {
    id: 'preferencias',
    label: 'Preferências',
    description: 'Tema, idioma e notificações',
    icon: Settings,
  },
  {
    id: 'seguranca',
    label: 'Segurança',
    description: 'Senha e autenticação',
    icon: Shield,
  },
];

interface ProfileTabsProps {
  activeTab: TabValue;
  onTabChange: (tab: TabValue) => void;
  variant?: 'horizontal' | 'vertical';
}

export function ProfileTabs({ activeTab, onTabChange, variant = 'vertical' }: ProfileTabsProps) {
  const handleKeyDown = (event: React.KeyboardEvent, tabId: TabValue) => {
    const currentIndex = tabs.findIndex(tab => tab.id === tabId);
    const isVertical = variant === 'vertical';
    const prevKey = isVertical ? 'ArrowUp' : 'ArrowLeft';
    const nextKey = isVertical ? 'ArrowDown' : 'ArrowRight';
    
    if (event.key === prevKey) {
      event.preventDefault();
      const prevIndex = currentIndex > 0 ? currentIndex - 1 : tabs.length - 1;
      onTabChange(tabs[prevIndex].id);
    } else if (event.key === nextKey) {
      event.preventDefault();
      const nextIndex = currentIndex < tabs.length - 1 ? currentIndex + 1 : 0;
      onTabChange(tabs[nextIndex].id);
    } else if (event.key === 'Home') {
      event.preventDefault();
      onTabChange(tabs[0].id);
    } else if (event.key === 'End') {
      event.preventDefault();
      onTabChange(tabs[tabs.length - 1].id);
    }
  };

  // Horizontal tabs for mobile
  if (variant === 'horizontal') {
    return (
      <div className="border-b border-border overflow-x-auto scrollbar-none">
        <nav 
          className="flex min-w-max"
          role="tablist"
          aria-label="Configurações do perfil"
        >
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            
            return (
              <button
                key={tab.id}
                className={cn(
                  "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all duration-200",
                  "hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isActive 
                    ? "border-primary text-primary bg-primary/5" 
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
                onClick={() => onTabChange(tab.id)}
                onKeyDown={(e) => handleKeyDown(e, tab.id)}
                role="tab"
                aria-selected={isActive}
                aria-controls={`panel-${tab.id}`}
                tabIndex={isActive ? 0 : -1}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>
    );
  }

  // Vertical sidebar navigation for desktop
  return (
    <nav 
      className="space-y-1"
      role="tablist"
      aria-label="Configurações do perfil"
      aria-orientation="vertical"
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const Icon = tab.icon;
        
        return (
          <button
            key={tab.id}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all duration-200",
              "hover:bg-muted/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
              isActive 
                ? "bg-primary/10 text-primary shadow-sm border border-primary/20" 
                : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => onTabChange(tab.id)}
            onKeyDown={(e) => handleKeyDown(e, tab.id)}
            role="tab"
            aria-selected={isActive}
            aria-controls={`panel-${tab.id}`}
            tabIndex={isActive ? 0 : -1}
          >
            <div className={cn(
              "flex items-center justify-center h-10 w-10 rounded-lg shrink-0 transition-colors",
              isActive ? "bg-primary text-primary-foreground" : "bg-muted"
            )}>
              <Icon className="h-5 w-5" />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm">{tab.label}</div>
              <div className={cn(
                "text-xs truncate transition-colors",
                isActive ? "text-primary/70" : "text-muted-foreground"
              )}>
                {tab.description}
              </div>
            </div>
            
            <ChevronRight className={cn(
              "h-4 w-4 shrink-0 transition-transform",
              isActive ? "text-primary" : "text-muted-foreground/50",
              isActive && "translate-x-0.5"
            )} />
          </button>
        );
      })}
    </nav>
  );
}