'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { PatientOnboarding } from '@/components/chat/patient-onboarding';
import { PatientFormData } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

interface AssociationDisplayInfo {
  id: string;
  name: string;
  publicDisplayName?: string;
  logoUrl?: string;
  welcomeMessage?: string;
  descricaoPublica?: string;
  isActive: boolean;
}

export default function DynamicTenantPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [tenantContext, setTenantContext] = useState<AssociationDisplayInfo | null>(null);
  const [isLoadingTenant, setIsLoadingTenant] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;

  // Fetch tenant context on component mount
  useEffect(() => {
    const fetchTenantContext = async () => {
      try {
        const response = await fetch(`/api/tenant-info?slug=${slug}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            setError('Associação não encontrada');
          } else {
            setError('Erro ao carregar informações da associação');
          }
          return;
        }

        const data = await response.json();
        
        if (!data.association || !data.association.isActive) {
          setError('Associação não encontrada ou inativa');
          return;
        }

        setTenantContext(data.association);
      } catch (error) {
        console.error('Error fetching tenant context:', error);
        setError('Erro ao conectar com o servidor');
      } finally {
        setIsLoadingTenant(false);
      }
    };

    fetchTenantContext();
  }, [slug]);

  const handlePatientSubmit = async (data: PatientFormData & { cpf?: string }, isReturning = false) => {
    setIsLoading(true);
    
    try {
      // Include slug in the API call
      const apiUrl = `/api/patients?slug=${slug}`;
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao processar dados do paciente');
      }

      // Store patient data in sessionStorage for the chat
      sessionStorage.setItem('satizap_patient', JSON.stringify(result.patient));
      sessionStorage.setItem('satizap_conversation_id', result.conversationId);
      
      // Redirect to chat interface using the same slug
      router.push(`/${slug}/chat`);
      
    } catch (error) {
      console.error('Error submitting patient form:', error);
      alert(error instanceof Error ? error.message : 'Erro ao processar dados');
    } finally {
      setIsLoading(false);
    }
  };

  // Loading state
  if (isLoadingTenant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-950/20 dark:to-blue-950/20">
        <div className="animate-pulse">
          <div className="w-16 h-16 bg-green-200 dark:bg-green-800 rounded-full mx-auto mb-4"></div>
          <div className="h-4 bg-green-200 dark:bg-green-800 rounded w-48 mx-auto mb-2"></div>
          <div className="h-4 bg-green-200 dark:bg-green-800 rounded w-32 mx-auto"></div>
        </div>
      </div>
    );
  }

  // Error state - redirect to appropriate error page in development
  if (error || !tenantContext) {
    // In development, redirect to our enhanced error page
    if (process.env.NODE_ENV === 'development') {
      const errorType = error?.includes('não encontrada') ? 'tenant-not-found' : 'tenant-inactive';
      const errorUrl = `/dev-error?type=${errorType}&message=${encodeURIComponent(error || 'Associação não encontrada')}&tenant=${slug}`;
      window.location.href = errorUrl;
      return null;
    }

    // In production, show the inline error
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950/20 dark:to-orange-950/20 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                {error || 'Associação não encontrada'}
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                A associação "{slug}" não foi encontrada ou não está ativa no momento.
              </p>
              <button
                onClick={() => window.location.href = '/'}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Ir para página principal
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <PatientOnboarding 
        onSubmit={handlePatientSubmit} 
        isLoading={isLoading}
        associationData={tenantContext}
      />
    </div>
  );
}