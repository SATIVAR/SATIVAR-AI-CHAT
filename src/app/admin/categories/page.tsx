
import { getAllCategories, createCategory, updateCategory, deleteCategory } from '@/lib/firebase/categories';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import CategoriesDataTable from '@/components/admin/categories/categories-data-table';
import { ProductCategory } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import { getSignedUrl, deleteFile } from '@/lib/firebase/actions';

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
            // 1. Get a signed URL for upload
            const { url, fileName, error } = await getSignedUrl(imageFile.type, imageFile.size, 'categories');
            if (error || !url) throw new Error(error || "Failed to get signed URL.");

            // 2. Upload the file directly to Google Cloud Storage
            await fetch(url, {
                method: 'PUT',
                body: imageFile,
                headers: { 'Content-Type': imageFile.type },
            });
            
            // 3. Construct the public URL
            imageUrl = `https://storage.googleapis.com/${process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET}/${fileName}`;

            // 4. If updating, delete the old image
            const oldImageUrl = formData.get('imageUrl') as string;
            if (categoryId && oldImageUrl) {
                const oldFileName = oldImageUrl.split('/').pop();
                if (oldFileName) await deleteFile(`categories/${oldFileName}`);
            }
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
