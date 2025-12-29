/**
 * ProductSwitcher - Componente para alternar entre produtos (CMMS, Monitor e Finance)
 * 
 * Dropdown no header que permite navegar rapidamente entre:
 * - TrakNor CMMS (Gestão de Manutenção)
 * - TrakSense Monitor (Monitoramento IoT)
 * - Finance (Gestão Financeira)
 */

import { useNavigate, useLocation } from 'react-router-dom';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { 
  Wrench, 
  Activity, 
  Wallet,
  ChevronDown,
  Check
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAbility } from '@/hooks/useAbility';
import TrakNorLogoUrl from '@/assets/images/traknor-logo.svg';

interface Product {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  path: string;
  color: string;
  bgColor: string;
  borderColor: string;
  requiresPermission?: { action: 'view'; subject: 'finance' | '*' };
}

const products: Product[] = [
  {
    id: 'cmms',
    name: 'TrakNor CMMS',
    description: 'Gestão de Manutenção',
    icon: <Wrench className="h-5 w-5" />,
    path: '/cmms',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50/50',
    borderColor: 'border-blue-200',
  },
  {
    id: 'monitor',
    name: 'TrakSense Monitor',
    description: 'Monitoramento IoT',
    icon: <Activity className="h-5 w-5" />,
    path: '/monitor',
    color: 'text-green-600',
    bgColor: 'bg-green-50/50',
    borderColor: 'border-green-200',
  },
  {
    id: 'finance',
    name: 'Finance',
    description: 'Gestão Financeira',
    icon: <Wallet className="h-5 w-5" />,
    path: '/finance',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50/50',
    borderColor: 'border-emerald-200',
    requiresPermission: { action: 'view', subject: 'finance' },
  },
];

export function ProductSwitcher() {
  const navigate = useNavigate();
  const location = useLocation();
  const { can } = useAbility();

  // Filtra produtos baseado em permissões
  const availableProducts = products.filter(product => {
    if (product.requiresPermission) {
      return can(product.requiresPermission.action, product.requiresPermission.subject);
    }
    return true;
  });

  // Determina qual produto está ativo baseado na URL
  const currentProduct = availableProducts.find(p => 
    location.pathname.startsWith(p.path)
  ) || availableProducts[0];

  const handleProductChange = (product: Product) => {
    if (product.id !== currentProduct.id) {
      navigate(product.path);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          className={cn(
            "h-auto py-2 px-3 gap-2 hover:bg-accent border-2 transition-colors",
            currentProduct.borderColor,
            currentProduct.bgColor
          )}
        >
          {/* Logo */}
          <img 
            src={TrakNorLogoUrl} 
            alt="Logo TrakNor" 
            className="h-8 w-8 md:h-10 md:w-10"
          />
          <div className="flex flex-col items-start">
            <span className={cn(
              "text-sm font-semibold leading-none",
              currentProduct.color
            )}>
              {currentProduct.name}
            </span>
            <span className="text-xs text-muted-foreground leading-none mt-0.5">
              {currentProduct.description}
            </span>
          </div>
          <ChevronDown className="h-4 w-4 text-muted-foreground ml-1" />
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
          Alternar Produto
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {availableProducts.map((product) => (
          <DropdownMenuItem
            key={product.id}
            onClick={() => handleProductChange(product)}
            className="flex items-center gap-3 py-3 cursor-pointer"
          >
            <div className={`${product.color} p-2 rounded-lg bg-muted`}>
              {product.icon}
            </div>
            <div className="flex-1">
              <p className="font-medium text-sm">{product.name}</p>
              <p className="text-xs text-muted-foreground">{product.description}</p>
            </div>
            {currentProduct.id === product.id && (
              <Check className="h-4 w-4 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
        
        <DropdownMenuSeparator />
        <div className="px-2 py-2">
          <p className="text-xs text-muted-foreground text-center">
            Climatrak Suite v1.0
          </p>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
