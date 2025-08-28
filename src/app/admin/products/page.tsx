import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import ProductsClientWrapper from '@/components/admin/products/products-client-wrapper';

// Force dynamic rendering to avoid build-time Firebase calls
export const dynamic = 'force-dynamic';

export default async function ProductsPage() {
  return (
    <div className="w-full space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Gerenciamento de Produtos</CardTitle>
        </CardHeader>
        <CardContent>
          <ProductsClientWrapper />
        </CardContent>
      </Card>
    </div>
  );
}
