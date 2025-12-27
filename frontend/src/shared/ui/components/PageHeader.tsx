/**
 * PageHeader - Componente de cabeçalho de página
 * 
 * Uso padrão em todas as páginas do sistema para garantir consistência.
 * 
 * @example
 * ```tsx
 * <PageHeader 
 *   title="Ordens de Serviço" 
 *   description="Gerencie as ordens de serviço da sua equipe"
 * >
 *   <Button>Nova OS</Button>
 * </PageHeader>
 * ```
 */

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { ChevronRight } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface PageHeaderProps {
  /** Título principal da página */
  title: string;
  /** Descrição opcional abaixo do título */
  description?: string;
  /** Ações no lado direito (botões, etc) */
  children?: ReactNode;
  /** Classes CSS adicionais */
  className?: string;
  /** Breadcrumbs de navegação */
  breadcrumbs?: BreadcrumbItem[];
  /** Ícone opcional ao lado do título */
  icon?: ReactNode;
  /** Badge ou tag ao lado do título */
  badge?: ReactNode;
}

export function PageHeader({ 
  title, 
  description, 
  children, 
  className,
  breadcrumbs,
  icon,
  badge
}: PageHeaderProps) {
  return (
    <div className={cn("space-y-2 pb-6", className)}>
      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <Breadcrumb>
          <BreadcrumbList>
            {breadcrumbs.map((item, index) => (
              <div key={item.label} className="flex items-center">
                {index > 0 && <BreadcrumbSeparator><ChevronRight className="h-4 w-4" /></BreadcrumbSeparator>}
                <BreadcrumbItem>
                  {item.href ? (
                    <BreadcrumbLink href={item.href}>{item.label}</BreadcrumbLink>
                  ) : (
                    <BreadcrumbPage>{item.label}</BreadcrumbPage>
                  )}
                </BreadcrumbItem>
              </div>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
      )}
      
      {/* Title Row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {icon && (
            <div className="flex-shrink-0 text-primary">
              {icon}
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-foreground tracking-tight">
                {title}
              </h1>
              {badge}
            </div>
            {description && (
              <p className="text-muted-foreground text-sm mt-1">
                {description}
              </p>
            )}
          </div>
        </div>
        
        {children && (
          <div className="flex items-center gap-3 flex-shrink-0">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
