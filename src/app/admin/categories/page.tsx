
import { getAllCategories, createCategory, updateCategory, deleteCategory } from '@/lib/firebase/categories';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import CategoriesDataTable from '@/components/admin/categories/categories-data-table';
import { ProductCategory } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import { deleteFile, uploadFile } from '@/lib/firebase/actions';

export default async function CategoriesPage() {
  
  const categoriesData = await getAllCategories();
  
  const categories = categoriesData.map(cat => ({
    ...cat,
    createdAt: cat.createdAt ? new Date(cat.createdAt).toISOString() : new Date().toISOString(),
    updatedAt: cat.updatedAt ? new Date(cat.updatedAt).toISOString() : undefined,
  })) as unknown as ProductCategory[]

  const handleSaveCategory = async (formData: FormData) => {
    'use server';
    
    const imageFile = formData.get('imageFile') as File | null;
    const categoryId = formData.get('id') as string | null;
    let imageUrl = formData.get('imageUrl') as string;

    try {
        if (imageFile && imageFile.size > 0) {
            // 1. If updating and there's a new file, delete the old one first.
            const oldImageUrl = formData.get('imageUrl') as string;
            if (categoryId && oldImageUrl) {
                // Extract file path from URL
                const oldFilePath = new URL(oldImageUrl).pathname.split('/').slice(2).join('/');
                await deleteFile(oldFilePath);
            }
            
            // 2. Upload the new file via server action
            const uploadResult = await uploadFile(formData);
            if (uploadResult.error || !uploadResult.url) {
                 throw new Error(uploadResult.error || 'Falha no upload da imagem.');
            }
            imageUrl = uploadResult.url;
        }

        const categoryData: Partial<ProductCategory> = {
            name: formData.get('name') as string,
            description: formData.get('description') as string,
            order: Number(formData.get('order')),
            imageUrl,
        };

        let result;
        if (categoryId) {
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
        // Delete the image from storage first
        if (imageUrl) {
            const filePath = new URL(imageUrl).pathname.split('/').slice(2).join('/');
            await deleteFile(filePath);
        }
        
        // Then, delete the category document from Firestore
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
