/**
 * ProductSwitcher - Componente para alternar entre produtos (CMMS e Monitor)
 * 
 * Dropdown no header que permite navegar rapidamente entre:
 * - TrakNor CMMS (Gestão de Manutenção)
 * - TrakSense Monitor (Monitoramento IoT)
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
  ChevronDown,
  Check
} from 'lucide-react';
import { cn } from '@/lib/utils';
import TrakNorLogoUrl from '@/assets/images/traknor-logo.svg';

interface Product {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  path: string;
  color: string;
}

const products: Product[] = [
  {
    id: 'cmms',
    name: 'TrakNor CMMS',
    description: 'Gestão de Manutenção',
    icon: <Wrench className="h-5 w-5" />,
    path: '/cmms',
    color: 'text-blue-600',
  },
  {
    id: 'monitor',
    name: 'TrakSense Monitor',
    description: 'Monitoramento IoT',
    icon: <Activity className="h-5 w-5" />,
    path: '/monitor',
    color: 'text-green-600',
  },
];

export function ProductSwitcher() {
  const navigate = useNavigate();
  const location = useLocation();

  // Determina qual produto está ativo baseado na URL
  const currentProduct = products.find(p => 
    location.pathname.startsWith(p.path)
  ) || products[0];

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
            currentProduct.id === 'cmms' 
              ? "border-blue-200 bg-blue-50/50 hover:bg-blue-100/50" 
              : "border-green-200 bg-green-50/50 hover:bg-green-100/50"
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
              currentProduct.id === 'cmms' ? "text-blue-700" : "text-green-700"
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
        
        {products.map((product) => (
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
