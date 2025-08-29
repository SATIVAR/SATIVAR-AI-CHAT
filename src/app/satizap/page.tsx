'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PatientOnboarding } from '@/components/chat/patient-onboarding';
import { PatientFormData } from '@/lib/types';

export default function SatizapPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [associationName, setAssociationName] = useState<string>();
  const router = useRouter();

  // Get association name from headers if available
  useEffect(() => {
    const getAssociationInfo = async () => {
      try {
        const response = await fetch('/api/tenant-info');
        if (response.ok) {
          const data = await response.json();
          setAssociationName(data.association?.name);
        }
      } catch (error) {
        console.error('Error fetching tenant info:', error);
      }
    };

    getAssociationInfo();
  }, []);

  const handlePatientSubmit = async (data: PatientFormData & { cpf?: string }, isReturning = false) => {
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/patients', {
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
      
      // Redirect to chat interface
      router.push('/satizap/chat');
      
    } catch (error) {
      console.error('Error submitting patient form:', error);
      alert(error instanceof Error ? error.message : 'Erro ao processar dados');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      <PatientOnboarding 
        onSubmit={handlePatientSubmit} 
        isLoading={isLoading}
        associationName={associationName}
      />
    </div>
  );
}