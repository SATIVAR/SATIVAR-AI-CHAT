
import { getAllCategories, createCategory, updateCategory, deleteCategory } from '@/lib/firebase/categories';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import CategoriesDataTable from '@/components/admin/categories/categories-data-table';
import { ProductCategory } from '@/lib/types';
import { revalidatePath } from 'next/cache';

export default async function CategoriesPage() {
  
  const categoriesData = await getAllCategories();
  
  // Garante que os dados sejam serializáveis
  const categories = categoriesData.map(cat => ({
    ...cat,
    createdAt: cat.createdAt ? new Date(cat.createdAt).toISOString() : new Date().toISOString(),
    updatedAt: cat.updatedAt ? new Date(cat.updatedAt).toISOString() : undefined,
  })) as unknown as ProductCategory[]

  const handleSaveCategory = async (data: Partial<ProductCategory>) => {
    'use server';
    let result;
    if (data.id) {
        const { id, ...updateData } = data;
        result = await updateCategory(id, updateData);
    } else {
        result = await createCategory(data);
    }
    if (result.success) {
      revalidatePath('/admin/categories');
    }
    return result;
  };

  const handleDeleteCategory = async (id: string) => {
    'use server';
    const result = await deleteCategory(id);
    if (result.success) {
      revalidatePath('/admin/categories');
    }
    return result;
  };


  return (
    <div className="w-full space-y-6">
       <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Gerenciamento de Categorias</CardTitle>
        </CardHeader>
        <CardContent>
          <CategoriesDataTable 
            data={categories}
            onSave={handleSaveCategory}
            onDelete={handleDeleteCategory}
          />
        </CardContent>
      </Card>
    </div>
  );
}
