/**
 * Finance Savings Page (Placeholder)
 * 
 * Tela de economia - será implementada em FE-FIN-011.
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Construction } from 'lucide-react';

export function FinanceSavings() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Economia</h1>
        <p className="text-muted-foreground">
          Registro de economia gerada por manutenção preventiva/preditiva
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
            Esta funcionalidade será implementada na issue FE-FIN-011.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default FinanceSavings;
