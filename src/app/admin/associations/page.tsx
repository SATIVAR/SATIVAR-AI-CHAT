import { getActiveAssociations } from '@/lib/services/association.service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import AssociationsClientWrapper from '@/components/admin/associations/associations-client-wrapper';

export default async function AssociationsPage() {
  const associations = await getActiveAssociations();

  return (
    <div className="w-full space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Gerenciamento de Associações</CardTitle>
        </CardHeader>
        <CardContent>
          <AssociationsClientWrapper 
            initialData={associations}
          />
        </CardContent>
      </Card>
    </div>
  );
}
