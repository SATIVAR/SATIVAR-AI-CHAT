
import { getAllCategories } from '@/lib/firebase/categories';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';


export default async function CategoriesPage() {
  
  const categories = await getAllCategories();

  return (
    <div className="w-full space-y-6">
       <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Gerenciamento de Cardápio</CardTitle>
           <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Adicionar Categoria
          </Button>
        </CardHeader>
        <CardContent>
          <p>Em breve: a lista de categorias e produtos aparecerá aqui.</p>
        </CardContent>
      </Card>
    </div>
  );
}
