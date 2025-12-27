import React, { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { useCurrentBreakpoint } from '@/hooks/useBreakpoint';

interface PanelLayoutProps {
  detailsSlot: ReactNode;
  listSlot: ReactNode;
  className?: string;
}

export function PanelLayout({ detailsSlot, listSlot, className }: PanelLayoutProps) {
  const currentBreakpoint = useCurrentBreakpoint();
  const isMobile = currentBreakpoint === 'sm';
  
  // On mobile, we'll show only the list by default
  // The details view will be handled by navigation in the parent component
  if (isMobile) {
    return (
      <div className={cn("h-[600px] border rounded-lg overflow-hidden bg-card", className)}>
        {listSlot}
      </div>
    );
  }

  return (
    <div className={cn("flex h-[600px] border rounded-lg overflow-hidden bg-card", className)}>
      {/* List Panel - Left side (Gmail style: narrower list) */}
      <div className="w-full lg:w-[32%] md:w-[38%] xl:w-[28%] flex-shrink-0 overflow-hidden border-r bg-muted/20">
        {listSlot}
      </div>
      
      {/* Details Panel - Right side (Gmail style: wider details) */}
      <div className="flex-1 overflow-hidden bg-background">
        {detailsSlot}
      </div>
    </div>
  );
}