'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { PatientFormData } from '@/lib/types';
import { Loader2, Heart, MessageCircle } from 'lucide-react';
import { Logo } from '@/components/icons/logo';

// Schema for phone validation only
const phoneOnlySchema = z.object({
  whatsapp: z.string()
    .min(10, 'WhatsApp deve ter pelo menos 10 dígitos')
    .regex(/^\d+$/, 'WhatsApp deve conter apenas números'),
});

// Schema for full patient data
const fullPatientSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  whatsapp: z.string()
    .min(10, 'WhatsApp deve ter pelo menos 10 dígitos')
    .regex(/^\d+$/, 'WhatsApp deve conter apenas números'),
  cpf: z.string()
    .min(11, 'CPF deve ter 11 dígitos')
    .max(11, 'CPF deve ter 11 dígitos')
    .regex(/^\d+$/, 'CPF deve conter apenas números'),
});

interface PatientOnboardingProps {
  onSubmit: (data: PatientFormData & { cpf?: string }, isReturning?: boolean) => Promise<void>;
  isLoading?: boolean;
  associationName?: string;
}

type FormStep = 'phone' | 'details';

export function PatientOnboarding({ onSubmit, isLoading = false, associationName }: PatientOnboardingProps) {
  const [step, setStep] = useState<FormStep>('phone');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [patientExists, setPatientExists] = useState(false);

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
      // Check if patient exists (simulated for now - will implement real lookup)
      const response = await fetch('/api/patients/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ whatsapp: data.whatsapp }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.exists) {
          // Patient exists, proceed directly to chat
          setPatientExists(true);
          await onSubmit({ whatsapp: data.whatsapp, name: result.patient.name }, true);
          return;
        }
      }

      // Patient doesn't exist, move to next step
      fullForm.setValue('whatsapp', data.whatsapp);
      setStep('details');
    } catch (error) {
      console.error('Error checking patient:', error);
      // On error, proceed to full form
      fullForm.setValue('whatsapp', data.whatsapp);
      setStep('details');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFullSubmit = async (data: { name: string; whatsapp: string; cpf: string }) => {
    setIsSubmitting(true);
    try {
      await onSubmit({
        name: data.name,
        whatsapp: data.whatsapp,
        cpf: data.cpf,
      });
    } catch (error) {
      console.error('Error submitting patient form:', error);
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

  return (
    <div className="relative flex h-[100dvh] w-full flex-col items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-950/20 dark:to-blue-950/20 p-4">
      <div className="absolute inset-0 bg-[url('/medical-pattern.png')] bg-repeat opacity-5 dark:opacity-10" />
      
      <AnimatePresence mode="wait">
        {step === 'phone' && (
          <motion.div 
            key="phone-step"
            className="z-10 w-full max-w-md"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <Card className="shadow-xl border-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm">
              <CardHeader className="text-center space-y-4 pb-4">
                <motion.div variants={itemVariants} className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                  <Logo className="w-8 h-8 text-green-600 dark:text-green-400" />
                </motion.div>
                
                <motion.div variants={itemVariants}>
                  <CardTitle className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    Bem-vindo(a) ao SatiZap!
                  </CardTitle>
                  {associationName && (
                    <p className="text-lg font-medium text-green-600 dark:text-green-400 mt-2">
                      Você está iniciando seu atendimento com a {associationName}
                    </p>
                  )}
                  <CardDescription className="text-gray-600 dark:text-gray-400 mt-3">
                    Para começar, precisamos de algumas informações para dar início ao seu atendimento de forma segura e personalizada.
                  </CardDescription>
                </motion.div>
              </CardHeader>
              
              <CardContent>
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
                              WhatsApp (com DDD)
                            </FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="11987654321"
                                disabled={isSubmitting || isLoading}
                                className="h-12 text-lg"
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

                    <motion.div variants={itemVariants}>
                      <Button
                        type="submit"
                        className="w-full h-12 text-lg bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700"
                        disabled={isSubmitting || isLoading}
                      >
                        {isSubmitting || isLoading ? (
                          <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Verificando...
                          </>
                        ) : (
                          <>
                            <Heart className="mr-2 h-5 w-5" />
                            Iniciar Atendimento
                          </>
                        )}
                      </Button>
                    </motion.div>
                  </motion.form>
                </Form>

                <motion.div variants={itemVariants} className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
                  <p>
                    Seus dados são protegidos e utilizados apenas para melhorar sua experiência de cuidado.
                  </p>
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {step === 'details' && (
          <motion.div 
            key="details-step"
            className="z-10 w-full max-w-md"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <Card className="shadow-xl border-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm">
              <CardHeader className="text-center space-y-4 pb-4">
                <motion.div variants={itemVariants} className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                  <MessageCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                </motion.div>
                
                <motion.div variants={itemVariants}>
                  <CardTitle className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    Quase pronto!
                  </CardTitle>
                  <CardDescription className="text-gray-600 dark:text-gray-400 mt-3">
                    Para completar seu cadastro, precisamos de mais algumas informações.
                  </CardDescription>
                </motion.div>
              </CardHeader>
              
              <CardContent>
                <Form {...fullForm}>
                  <motion.form 
                    onSubmit={fullForm.handleSubmit(handleFullSubmit)} 
                    className="space-y-4"
                    variants={containerVariants}
                  >
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
                        className="w-full h-12 text-lg bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700"
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
                    Voltar
                  </Button>
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}