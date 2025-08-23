
import { getAllCategories, createCategory, updateCategory, deleteCategory } from '@/lib/firebase/categories';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import CategoriesDataTable from '@/components/admin/categories/categories-data-table';
import { ProductCategory } from '@/lib/types';
import { revalidatePath } from 'next/cache';

export default async function CategoriesPage() {
  
  const categoriesData = await getAllCategories();
  
  const categories = categoriesData.map(cat => ({
    ...cat,
    createdAt: cat.createdAt ? new Date(cat.createdAt).toISOString() : new Date().toISOString(),
    updatedAt: cat.updatedAt ? new Date(cat.updatedAt).toISOString() : undefined,
  })) as unknown as ProductCategory[]

  const handleSaveCategory = async (formData: FormData) => {
    'use server';
    
    const categoryId = formData.get('id') as string | null;

    try {
        const categoryData: Partial<ProductCategory> = {
            name: formData.get('name') as string,
            description: formData.get('description') as string,
            order: Number(formData.get('order')),
            imageUrl: 'https://placehold.co/600x400.png', // Using placeholder
        };

        let result;
        if (categoryId) {
            // Ensure we don't overwrite the existing image URL if not changed
            const existingCategory = categories.find(c => c.id === categoryId);
            if (existingCategory && !formData.has('imageFile')) {
                categoryData.imageUrl = existingCategory.imageUrl;
            }
            result = await updateCategory(categoryId, categoryData);
        } else {
            result = await createCategory(categoryData);
        }

        if (result.success) {
            revalidatePath('/admin/categories');
        }
        return result;

    } catch (e: any) {
        console.error("Error in handleSaveCategory: ", e);
        return { success: false, error: e.message || "Failed to save category." };
    }
  };

  const handleDeleteCategory = async (id: string, imageUrl?: string) => {
    'use server';

    try {
        // Since we are not using storage, we don't need to delete the image
        const result = await deleteCategory(id);
        if (result.success) {
            revalidatePath('/admin/categories');
        }
        return result;

    } catch (e: any) {
        console.error("Error in handleDeleteCategory: ", e);
        return { success: false, error: e.message || 'Falha ao excluir categoria.' };
    }
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
