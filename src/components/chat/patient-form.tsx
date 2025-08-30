'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { PatientFormData } from '@/lib/types';
import { Loader2, MessageCircle } from 'lucide-react';

const patientFormSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  whatsapp: z.string()
    .min(10, 'WhatsApp deve ter pelo menos 10 dígitos')
    .regex(/^\d+$/, 'WhatsApp deve conter apenas números'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
});

interface PatientFormProps {
  onSubmit: (data: PatientFormData) => Promise<void>;
  isLoading?: boolean;
}

export function PatientForm({ onSubmit, isLoading = false }: PatientFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<PatientFormData>({
    resolver: zodResolver(patientFormSchema),
    defaultValues: {
      name: '',
      whatsapp: '',
      email: '',
    },
  });

  const handleSubmit = async (data: PatientFormData) => {
    setIsSubmitting(true);
    try {
      // Remove empty email
      const cleanData = {
        ...data,
        email: data.email?.trim() || undefined,
      };
      await onSubmit(cleanData);
    } catch (error) {
      console.error('Error submitting patient form:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md mx-auto shadow-xl">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <MessageCircle className="w-8 h-8 text-green-600" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold text-gray-900">
              Bem-vindo ao SATIZAP
            </CardTitle>
            <CardDescription className="text-gray-600 mt-2">
              Seu assistente especializado em cannabis medicinal. Para começar, precisamos de algumas informações básicas.
            </CardDescription>
          </div>
        </CardHeader>
        
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome Completo *</FormLabel>
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

              <FormField
                control={form.control}
                name="whatsapp"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>WhatsApp *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="11987654321"
                        disabled={isSubmitting || isLoading}
                        onChange={(e) => {
                          // Remove non-digits
                          const value = e.target.value.replace(/\D/g, '');
                          field.onChange(value);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email (opcional)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="email"
                        placeholder="seu@email.com"
                        disabled={isSubmitting || isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full bg-green-600 hover:bg-green-700"
                disabled={isSubmitting || isLoading}
              >
                {isSubmitting || isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Iniciando conversa...
                  </>
                ) : (
                  'Iniciar Conversa'
                )}
              </Button>
            </form>
          </Form>

          <div className="mt-6 text-center text-sm text-gray-500">
            <p>
              Seus dados são protegidos e utilizados apenas para melhorar sua experiência.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}