
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getAllCategories } from '@/lib/firebase/categories';

export default async function ProductsPage() {
  const categoriesData = await getAllCategories();

  return (
    <div className="w-full space-y-6">
       <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Gerenciamento de Produtos</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Em breve: tabela de produtos, filtros e formulário de criação/edição.</p>
        </CardContent>
      </Card>
    </div>
  );
}
