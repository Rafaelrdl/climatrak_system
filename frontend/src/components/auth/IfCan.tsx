import { ReactNode } from 'react';
import { useAbility } from '@/hooks/useAbility';
import type { Action, Subject } from '@/acl/abilities';

interface IfCanProps {
  action: Action;
  subject: Subject;
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Conditional rendering component based on user abilities
 * Only renders children if the current user has the required permission
 */
export function IfCan({ action, subject, children, fallback }: IfCanProps) {
  const { can } = useAbility();
  
  if (can(action, subject)) {
    return <>{children}</>;
  }
  
  return fallback ? <>{fallback}</> : null;
}

// Convenience components for common use cases
export function IfCanEdit({ subject, children, fallback }: { subject: Subject; children: ReactNode; fallback?: ReactNode }) {
  return <IfCan action="edit" subject={subject} fallback={fallback}>{children}</IfCan>;
}

export function IfCanDelete({ subject, children, fallback }: { subject: Subject; children: ReactNode; fallback?: ReactNode }) {
  return <IfCan action="delete" subject={subject} fallback={fallback}>{children}</IfCan>;
}

export function IfCanCreate({ subject, children, fallback }: { subject: Subject; children: ReactNode; fallback?: ReactNode }) {
  return <IfCan action="create" subject={subject} fallback={fallback}>{children}</IfCan>;
}

export function IfCanMove({ subject, children, fallback }: { subject: Subject; children: ReactNode; fallback?: ReactNode }) {
  return <IfCan action="move" subject={subject} fallback={fallback}>{children}</IfCan>;
}