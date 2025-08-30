'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import ProductsDataTable from './products-data-table';
import { Product, ProductCategory } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

export default function ProductsClientWrapper() {
  const searchParams = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Extract search parameters
  const page = Number(searchParams.get('page')) || 1;
  const limit = Number(searchParams.get('limit')) || 10;
  const categoryId = searchParams.get('category') || undefined;

  // Fetch data on component mount and when search params change
  useEffect(() => {
    fetchData();
  }, [page, limit, categoryId]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch categories and products in parallel
      const [categoriesResponse, productsResponse] = await Promise.all([
        fetch('/api/admin/categories'),
        fetch(`/api/admin/products?page=${page}&limit=${limit}${categoryId ? `&category=${categoryId}` : ''}`)
      ]);

      if (!categoriesResponse.ok || !productsResponse.ok) {
        throw new Error('Failed to fetch data');
      }

      const categoriesData = await categoriesResponse.json();
      const productsData = await productsResponse.json();

      setCategories(categoriesData.categories || []);
      setProducts(productsData.products || []);
      setTotalPages(productsData.totalPages || 1);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load products data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveProduct = async (formData: FormData) => {
    try {
      const response = await fetch('/api/admin/products', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      
      if (result.success) {
        // Refresh data after successful save
        await fetchData();
      }
      
      return result;
    } catch (error) {
      console.error('Error saving product:', error);
      return { success: false, error: 'Failed to save product' };
    }
  };

  const handleDeleteProduct = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/products/${id}`, {
        method: 'DELETE',
      });

      const result = await response.json();
      
      if (result.success) {
        // Refresh data after successful deletion
        await fetchData();
      }
      
      return result;
    } catch (error) {
      console.error('Error deleting product:', error);
      return { success: false, error: 'Failed to delete product' };
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500 mb-4">{error}</p>
        <button 
          onClick={fetchData}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <ProductsDataTable
      data={products}
      pageCount={totalPages}
      categories={categories}
      onSave={handleSaveProduct}
      onDelete={handleDeleteProduct}
    />
  );
}