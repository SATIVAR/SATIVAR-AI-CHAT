'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PhoneInput } from '@/components/ui/phone-input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { PatientFormData } from '@/lib/types';
import { sanitizePhone, getPhoneForAPI } from '@/lib/utils/phone';
import { Loader2, MessageCircle, ArrowLeft } from 'lucide-react';
import { PatientConfirmation } from './patient-confirmation';

// Schema for phone validation only - now validates the raw sanitized value
const phoneOnlySchema = z.object({
  whatsapp: z.string()
    .min(10, 'WhatsApp deve ter pelo menos 10 dígitos')
    .max(11, 'WhatsApp deve ter no máximo 11 dígitos')
    .regex(/^\d+$/, 'WhatsApp deve conter apenas números'),
});

// Schema for full patient data - validates sanitized values
const fullPatientSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  whatsapp: z.string()
    .min(10, 'WhatsApp deve ter pelo menos 10 dígitos')
    .max(11, 'WhatsApp deve ter no máximo 11 dígitos')
    .regex(/^\d+$/, 'WhatsApp deve conter apenas números'),
  cpf: z.string()
    .min(11, 'CPF deve ter 11 dígitos')
    .max(11, 'CPF deve ter 11 dígitos')
    .regex(/^\d+$/, 'CPF deve conter apenas números'),
});

interface OnboardingFormProps {
  onSubmit: (data: PatientFormData & { cpf?: string }, isReturning?: boolean) => Promise<void>;
  isLoading?: boolean;
}

type FormStep = 'phone' | 'details' | 'confirmation';

interface PatientData {
  id: string;
  name: string;
  whatsapp: string;
  status?: string;
  cpf?: string;
  tipo_associacao?: string;
  nome_responsavel?: string;
  cpf_responsavel?: string;
  source?: string;
}

export function OnboardingForm({ onSubmit, isLoading = false }: OnboardingFormProps) {
  const [step, setStep] = useState<FormStep>('phone');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rawPhoneValue, setRawPhoneValue] = useState('');
  const [patientData, setPatientData] = useState<PatientData | null>(null);

  const phoneForm = useForm({
    resolver: zodResolver(phoneOnlySchema),
    defaultValues: { whatsapp: '' },
  });

  const fullForm = useForm({
    resolver: zodResolver(fullPatientSchema),
    defaultValues: {
      name: '',
      whatsapp: '',
      cpf: '',
    },
  });

  const handlePhoneSubmit = async (data: { whatsapp: string }) => {
    setIsSubmitting(true);
    try {
      // Fase 1: Sanitização no Backend - usar sempre o valor sanitizado
      const sanitizedPhone = getPhoneForAPI(rawPhoneValue || data.whatsapp);
      
      // Get current path to determine tenant context
      const currentPath = window.location.pathname;
      const pathSegments = currentPath.split('/').filter(segment => segment.length > 0);
      const slug = pathSegments[0];
      
      // Include slug in the API call if we're on a dynamic route (using simplified API for now)
      const apiUrl = slug && slug !== 'satizap' ? `/api/patients/validate-whatsapp-simple?slug=${slug}` : '/api/patients/validate-whatsapp-simple';
      
      // Use new WordPress validation endpoint with sanitized phone
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ whatsapp: sanitizedPhone }),
      });

      if (response.ok) {
        const result = await response.json();
        
        if (result.status === 'patient_found') {
          // Existing patient - show confirmation view
          setPatientData(result.patientData);
          setStep('confirmation');
          return;
        } else if (result.status === 'new_patient_step_2') {
          // New patient - proceed to details form
          fullForm.setValue('whatsapp', sanitizedPhone);
          setStep('details');
          // Store preliminary patient ID for later completion
          sessionStorage.setItem('preliminary_patient_id', result.preliminaryPatientId || '');
          return;
        }
      }
      
      // Fallback: if API call fails, proceed to details form
      console.error('Validation API failed, proceeding to details form');
      fullForm.setValue('whatsapp', sanitizedPhone);
      setStep('details');
      
    } catch (error) {
      console.error('Error validating WhatsApp:', error);
      // On error, proceed to full form as fallback
      const sanitizedPhone = getPhoneForAPI(rawPhoneValue || data.whatsapp);
      fullForm.setValue('whatsapp', sanitizedPhone);
      setStep('details');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFullSubmit = async (data: { name: string; whatsapp: string; cpf: string }) => {
    setIsSubmitting(true);
    try {
      // Fase 1: Sanitização - garantir que todos os dados estão limpos
      const sanitizedPhone = getPhoneForAPI(data.whatsapp);
      const sanitizedCPF = data.cpf.replace(/\D/g, '');
      
      // Get current path to determine tenant context
      const currentPath = window.location.pathname;
      const pathSegments = currentPath.split('/').filter(segment => segment.length > 0);
      const slug = pathSegments[0];
      
      // Fase 2: Use complete-registration endpoint to create LEAD
      const apiUrl = slug && slug !== 'satizap' ? `/api/patients/complete-registration?slug=${slug}` : '/api/patients/complete-registration';
      
      console.log('[Onboarding] Fase 2: Creating patient lead with complete registration');
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          cpf: sanitizedCPF,
          whatsapp: sanitizedPhone,
        }),
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('[Onboarding] Lead created successfully:', result.syncType);
        
        // Clean up any temporary data
        sessionStorage.removeItem('preliminary_patient_id');
        
        // Call onSubmit to transition to chat with lead data
        await onSubmit({
          name: data.name,
          whatsapp: sanitizedPhone,
          cpf: sanitizedCPF,
          status: 'LEAD', // Explicitly set status as LEAD
        });
        return;
      } else {
        const errorResult = await response.json();
        console.error('[Onboarding] Registration failed:', errorResult.error);
        throw new Error(errorResult.error || 'Erro ao finalizar cadastro');
      }
      
    } catch (error) {
      console.error('[Onboarding] Error submitting patient form:', error);
      
      // Fallback: try original onSubmit method
      try {
        const sanitizedPhone = getPhoneForAPI(data.whatsapp);
        const sanitizedCPF = data.cpf.replace(/\D/g, '');
        await onSubmit({
          name: data.name,
          whatsapp: sanitizedPhone,
          cpf: sanitizedCPF,
        });
      } catch (fallbackError) {
        console.error('[Onboarding] Fallback also failed:', fallbackError);
        // You might want to show an error message to the user here
      }
      
      // Clean up on error
      sessionStorage.removeItem('preliminary_patient_id');
    } finally {
      setIsSubmitting(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        staggerChildren: 0.1,
        delayChildren: 0.2,
      } 
    },
    exit: { opacity: 0, transition: { duration: 0.2 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100 } }
  };

  const handleConfirmPatient = async () => {
    if (!patientData) return;
    
    setIsSubmitting(true);
    try {
      await onSubmit({
        whatsapp: patientData.whatsapp,
        name: patientData.name,
        cpf: patientData.cpf,
        tipo_associacao: patientData.tipo_associacao,
        nome_responsavel: patientData.nome_responsavel,
        cpf_responsavel: patientData.cpf_responsavel,
        status: patientData.status as any
      }, true); // isReturning = true
    } catch (error) {
      console.error('Error confirming patient:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence mode="wait">
      {step === 'phone' && (
        <motion.div 
          key="phone-step"
          className="w-full"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          <Form {...phoneForm}>
            <motion.form 
              onSubmit={phoneForm.handleSubmit(handlePhoneSubmit)} 
              className="space-y-6"
              variants={containerVariants}
            >
              <motion.div variants={itemVariants}>
                <FormField
                  control={phoneForm.control}
                  name="whatsapp"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-700 dark:text-gray-300">
                        Seu WhatsApp (com DDD)
                      </FormLabel>
                      <FormControl>
                        <PhoneInput
                          value={field.value}
                          onChange={(formattedValue) => {
                            field.onChange(formattedValue);
                          }}
                          onRawChange={(rawValue) => {
                            setRawPhoneValue(rawValue);
                            // Validate with raw value for form validation
                            phoneForm.setValue('whatsapp', rawValue);
                          }}
                          disabled={isSubmitting || isLoading}
                          className="h-12 text-lg"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </motion.div>

              <motion.div variants={itemVariants}>
                <Button
                  type="submit"
                  className="w-full h-12 text-lg bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg shadow-green-500/25 dark:shadow-green-500/10"
                  disabled={isSubmitting || isLoading}
                >
                  {isSubmitting || isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Verificando...
                    </>
                  ) : (
                    'Continuar'
                  )}
                </Button>
              </motion.div>
            </motion.form>
          </Form>
        </motion.div>
      )}

      {step === 'details' && (
        <motion.div 
          key="details-step"
          className="w-full"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          <Form {...fullForm}>
            <motion.form 
              onSubmit={fullForm.handleSubmit(handleFullSubmit)} 
              className="space-y-4"
              variants={containerVariants}
            >
              {/* Hidden WhatsApp field (disabled and pre-filled) */}
              <motion.div variants={itemVariants}>
                <FormField
                  control={fullForm.control}
                  name="whatsapp"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-700 dark:text-gray-300">
                        WhatsApp
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          disabled={true}
                          className="bg-gray-100 dark:bg-gray-800"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </motion.div>

              <motion.div variants={itemVariants}>
                <FormField
                  control={fullForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-700 dark:text-gray-300">
                        Seu nome completo
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Digite seu nome completo"
                          disabled={isSubmitting || isLoading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </motion.div>

              <motion.div variants={itemVariants}>
                <FormField
                  control={fullForm.control}
                  name="cpf"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-700 dark:text-gray-300">
                        CPF
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="12345678901"
                          disabled={isSubmitting || isLoading}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, '');
                            field.onChange(value);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </motion.div>

              <motion.div variants={itemVariants} className="pt-2">
                <Button
                  type="submit"
                  className="w-full h-12 text-lg bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg shadow-green-500/25 dark:shadow-green-500/10"
                  disabled={isSubmitting || isLoading}
                >
                  {isSubmitting || isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Finalizando cadastro...
                    </>
                  ) : (
                    <>
                      <MessageCircle className="mr-2 h-5 w-5" />
                      Iniciar Atendimento
                    </>
                  )}
                </Button>
              </motion.div>
            </motion.form>
          </Form>

          <motion.div variants={itemVariants} className="mt-4 text-center">
            <Button
              variant="ghost"
              onClick={() => setStep('phone')}
              disabled={isSubmitting || isLoading}
              className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
          </motion.div>
        </motion.div>
      )}

      {step === 'confirmation' && patientData && (
        <motion.div 
          key="confirmation-step"
          className="w-full"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          <PatientConfirmation
            patientData={patientData}
            onConfirm={handleConfirmPatient}
            isLoading={isSubmitting || isLoading}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}