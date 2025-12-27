import { useMemo } from 'react';
import { abilities, type Action, type Subject, type Role } from '@/acl/abilities';
import { useCurrentRole } from '@/data/authStore';

export function useAbility() {
  const [role] = useCurrentRole();
  
  return useMemo(() => {
    function can(action: Action, subject: Subject, ctx?: any): boolean {
      const rules = abilities[role as Role] || [];
      return rules.some(rule => {
        const actions = Array.isArray(rule.action) ? rule.action : [rule.action];
        const subjects = Array.isArray(rule.subject) ? rule.subject : [rule.subject];
        
        const okAction = actions.includes(action);
        const okSubject = subjects.includes(subject) || subjects.includes('*' as Subject);
        const okWhen = rule.when ? !!rule.when(ctx) : true;
        
        return okAction && okSubject && okWhen;
      });
    }

    // Helper functions for common checks
    const canEdit = (subject: Subject, ctx?: any) => can('edit', subject, ctx);
    const canDelete = (subject: Subject, ctx?: any) => can('delete', subject, ctx);
    const canCreate = (subject: Subject, ctx?: any) => can('create', subject, ctx);
    const canView = (subject: Subject, ctx?: any) => can('view', subject, ctx);
    const canMove = (subject: Subject, ctx?: any) => can('move', subject, ctx);
    const canConvert = (subject: Subject, ctx?: any) => can('convert', subject, ctx);
    const canManage = (subject: Subject, ctx?: any) => can('manage', subject, ctx);

    return {
      role,
      can,
      canEdit,
      canDelete,
      canCreate,
      canView,
      canMove,
      canConvert,
      canManage,
    };
  }, [role]);
}