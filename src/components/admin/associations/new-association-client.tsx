'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AssociationFormRedesigned } from './association-form-redesigned';
import { Association } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

export function NewAssociationClient() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (data: Partial<Association>) => {
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/admin/associations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao criar associação');
      }

      const result = await response.json();
      toast({
        title: 'Sucesso',
        description: 'Associação criada com sucesso!',
      });
      router.push(`/admin/associations/${result.association.id}/edit`);
      router.refresh();
    } catch (error) {
      console.error('Error creating association:', error);
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao criar associação',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AssociationFormRedesigned 
      onSubmit={handleSubmit}
      isLoading={isLoading}
    />
  );
}