import { getActiveAssociations } from '@/lib/services/association.service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import PatientsAdminClientWrapper from '@/components/admin/patients/patients-admin-client-wrapper';

export default async function PatientsPage() {
  // Get all active associations for super admin
  const associations = await getActiveAssociations();

  return (
    <div className="w-full space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Gerenciamento de Pacientes</CardTitle>
          <p className="text-sm text-muted-foreground">
            Interface refatorada para visualização completa dos dados ACF sincronizados do WordPress. 
            Selecione uma associação para visualizar seus pacientes e clique no ícone de visualização para acessar o perfil detalhado.
          </p>
        </CardHeader>
        <CardContent>
          <PatientsAdminClientWrapper 
            associations={associations}
          />
        </CardContent>
      </Card>
    </div>
  );
}