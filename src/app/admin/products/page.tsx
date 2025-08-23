
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getAllCategories } from '@/lib/firebase/categories';
import { getProducts, createProduct, updateProduct, deleteProduct } from '@/lib/firebase/products';
import { ProductCategory, Product } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import ProductsDataTable from '@/components/admin/products/products-data-table';


export default async function ProductsPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {

  const page = typeof searchParams.page === 'string' ? Number(searchParams.page) : 1;
  const limit = typeof searchParams.limit === 'string' ? Number(searchParams.limit) : 10;
  const categoryId = typeof searchParams.category === 'string' ? searchParams.category : undefined;

  const categoriesData = await getAllCategories();
  const productsData = await getProducts({ categoryId, page, limit });

  const handleSaveProduct = async (formData: FormData) => {
    'use server';

    const productId = formData.get('id') as string | null;

    try {
        const productData: Partial<Product> = {
            name: formData.get('name') as string,
            description: formData.get('description') as string,
            price: Number(formData.get('price')),
            imageUrl: (formData.get('imageUrl') as string) || 'https://placehold.co/600x400.png',
            categoryId: formData.get('categoryId') as string,
            isActive: formData.get('isActive') === 'true',
            isFeatured: formData.get('isFeatured') === 'true',
        };

        let result;
        if (productId) {
            result = await updateProduct(productId, productData);
        } else {
            result = await createProduct(productData);
        }
        
        revalidatePath('/admin/products');
        return result;

    } catch (e: any) {
        console.error("Error in handleSaveProduct: ", e);
        return { success: false, error: e.message || "Failed to save product." };
    }
  };

  const handleDeleteProduct = async (id: string) => {
    'use server';
    try {
        const result = await deleteProduct(id);
        revalidatePath('/admin/products');
        return result;
    } catch (e: any) {
        console.error("Error in handleDeleteProduct: ", e);
        return { success: false, error: e.message || 'Falha ao excluir produto.' };
    }
  };


  return (
    <div className="w-full space-y-6">
       <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Gerenciamento de Produtos</CardTitle>
        </CardHeader>
        <CardContent>
           <ProductsDataTable
                data={productsData.products as unknown as Product[]}
                pageCount={productsData.totalPages}
                categories={categoriesData as unknown as ProductCategory[]}
                onSave={handleSaveProduct}
                onDelete={handleDeleteProduct}
            />
        </CardContent>
      </Card>
    </div>
  );
}
