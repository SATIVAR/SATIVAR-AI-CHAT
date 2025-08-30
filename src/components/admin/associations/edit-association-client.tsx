'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AssociationForm } from './association-form';
import { Association } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, ArrowLeft, List, Eye, Monitor } from 'lucide-react';

interface EditAssociationClientProps {
  association: Association;
}

export function EditAssociationClient({ association }: EditAssociationClientProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (data: Partial<Association>) => {
    setIsLoading(true);
    setSaveSuccess(false);
    
    try {
      const response = await fetch(`/api/admin/associations/${association.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || error.message || 'Erro ao atualizar associação');
      }

      // Show success state instead of redirecting
      setSaveSuccess(true);
      toast({
        title: 'Sucesso',
        description: 'Associação atualizada com sucesso!',
      });
      
      // Refresh router without redirecting to maintain current page
      router.refresh();
    } catch (error) {
      console.error('Error updating association:', error);
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao atualizar associação',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const navigateToList = () => {
    router.push('/admin/associations');
  };

  const viewAssociation = () => {
    // Navigate to association view page (if implemented) or stay on edit
    window.open(`https://${association.subdomain}.satizap.com`, '_blank');
  };

  const viewAssociationDev = () => {
    // Phase 3: Open development URL for testing
    window.open(`http://localhost:9002/${association.subdomain}`, '_blank');
  };

  return (
    <div className="h-full">
      {/* Success Message with Navigation Options */}
      {saveSuccess && (
        <div className="absolute top-4 right-4 z-50">
          <Card className="border-green-200 bg-green-50 w-96">
            <CardHeader>
              <CardTitle className="flex items-center text-green-800">
                <CheckCircle className="mr-2 h-5 w-5" />
                Associação Atualizada!
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <Button onClick={navigateToList} variant="default" size="sm">
                  <List className="mr-2 h-4 w-4" />
                  Ver Todas
                </Button>
                <Button onClick={viewAssociation} variant="outline" size="sm">
                  <Eye className="mr-2 h-4 w-4" />
                  Visualizar
                </Button>
                <Button onClick={viewAssociationDev} variant="outline" size="sm">
                  <Monitor className="mr-2 h-4 w-4" />
                  Testar
                </Button>
                <Button 
                  onClick={() => setSaveSuccess(false)} 
                  variant="outline"
                  size="sm"
                >
                  Continuar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      
      <AssociationForm 
        association={association} 
        onSubmit={handleSubmit}
        isLoading={isLoading}
      />
    </div>
  );
}