import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCurrentRole } from '@/data/authStore';
import type { Role } from '@/acl/abilities';

const roleLabels: Record<Role, string> = {
  admin: 'Administrador',
  technician: 'Técnico',
  requester: 'Solicitante',
};

/**
 * Development-only component for switching user roles
 * Only rendered when import.meta.env.DEV is true
 */
export function RoleSwitcher() {
  const [role, setRole] = useCurrentRole();

  // Only show in development
  if (!import.meta.env.DEV) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-background border rounded-lg p-3 shadow-lg">
      <div className="text-xs text-muted-foreground mb-2">Dev: Papel do Usuário</div>
      <Select value={role} onValueChange={(value: Role) => setRole(value)}>
        <SelectTrigger className="w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(roleLabels).map(([roleKey, label]) => (
            <SelectItem key={roleKey} value={roleKey}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="text-xs text-muted-foreground mt-1">
        Atual: {roleLabels[role]}
      </div>
    </div>
  );
}