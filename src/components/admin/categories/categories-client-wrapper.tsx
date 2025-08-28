'use client';

import { useState, useEffect } from 'react';
import CategoriesDataTable from './categories-data-table';
import { ProductCategory } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

export default function CategoriesClientWrapper() {
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch data on component mount
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/admin/categories');
      
      if (!response.ok) {
        throw new Error('Failed to fetch categories');
      }

      const data = await response.json();
      
      // Format the categories data similar to the original server component
      const formattedCategories = data.categories.map((cat: any) => ({
        ...cat,
        id: cat.id,
        createdAt: cat.createdAt ? new Date(cat.createdAt).toISOString() : new Date().toISOString(),
        updatedAt: cat.updatedAt ? new Date(cat.updatedAt).toISOString() : undefined,
      })) as ProductCategory[];

      setCategories(formattedCategories);
    } catch (err) {
      console.error('Error fetching categories:', err);
      setError('Failed to load categories data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveCategory = async (formData: FormData) => {
    try {
      const categoryId = formData.get('id') as string | null;
      const method = categoryId ? 'PUT' : 'POST';

      const response = await fetch('/api/admin/categories', {
        method,
        body: formData,
      });

      const result = await response.json();
      
      if (result.success) {
        // Refresh data after successful save
        await fetchData();
      }
      
      return result;
    } catch (error) {
      console.error('Error saving category:', error);
      return { success: false, error: 'Failed to save category' };
    }
  };

  const handleDeleteCategory = async (id: string, imageUrl?: string) => {
    try {
      const response = await fetch(`/api/admin/categories/${id}`, {
        method: 'DELETE',
      });

      const result = await response.json();
      
      if (result.success) {
        // Refresh data after successful deletion
        await fetchData();
      }
      
      return result;
    } catch (error) {
      console.error('Error deleting category:', error);
      return { success: false, error: 'Failed to delete category' };
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
    <CategoriesDataTable 
      data={categories}
      allCategories={categories}
      onSave={handleSaveCategory}
      onDelete={handleDeleteCategory}
    />
  );
}