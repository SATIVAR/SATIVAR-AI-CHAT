import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import CategoriesClientWrapper from '@/components/admin/categories/categories-client-wrapper';

// Force dynamic rendering to avoid build-time Firebase calls
export const dynamic = 'force-dynamic';

export default async function CategoriesPage() {
  return (
    <div className="w-full space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Gerenciamento de Categorias</CardTitle>
        </CardHeader>
        <CardContent>
          <CategoriesClientWrapper />
        </CardContent>
      </Card>
    </div>
  );
}
