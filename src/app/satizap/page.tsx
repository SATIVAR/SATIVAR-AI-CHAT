'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PatientForm } from '@/components/chat/patient-form';
import { PatientFormData, Patient } from '@/lib/types';

export default function SatizapPage() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handlePatientSubmit = async (data: PatientFormData) => {
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
        throw new Error(result.error || 'Erro ao cadastrar paciente');
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
      <PatientForm onSubmit={handlePatientSubmit} isLoading={isLoading} />
    </div>
  );
}