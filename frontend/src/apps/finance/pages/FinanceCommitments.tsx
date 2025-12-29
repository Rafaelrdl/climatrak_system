/**
 * Finance Commitments Page (Placeholder)
 * 
 * Tela de compromissos - será implementada em FE-FIN-010.
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Construction } from 'lucide-react';

export function FinanceCommitments() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Compromissos</h1>
        <p className="text-muted-foreground">
          Gerenciamento de compromissos financeiros
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Construction className="h-5 w-5" />
            Em Desenvolvimento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Esta funcionalidade será implementada na issue FE-FIN-010.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default FinanceCommitments;
