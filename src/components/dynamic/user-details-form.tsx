
'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2 } from 'lucide-react';
import { UserDetails } from '@/lib/types';
import { Textarea } from '../ui/textarea';

const formSchema = z.object({
  name: z.string().min(2, { message: "Por favor, insira um nome válido." }),
  phone: z.string().min(10, { message: "Por favor, insira um telefone válido com DDD." }),
  address: z.object({
        street: z.string().optional(),
        number: z.string().optional(),
        neighborhood: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        zipCode: z.string().optional(),
        reference: z.string().optional(),
    }).optional(),
});

type UserDetailsFormValues = z.infer<typeof formSchema>;

interface UserDetailsFormProps {
  onSubmit: (data: UserDetailsFormValues) => void;
  isLoading: boolean;
  defaultValues?: UserDetails | null;
}

const UserDetailsForm: React.FC<UserDetailsFormProps> = ({ onSubmit, isLoading, defaultValues }) => {
  const form = useForm<UserDetailsFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: defaultValues?.name || "",
      phone: defaultValues?.phone || "",
      address: defaultValues?.address || { street: '', number: '', reference: '' }
    },
  });

  const formVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { staggerChildren: 0.1, duration: 0.5, ease: 'easeOut' } }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } }
  }

  return (
    <Form {...form}>
      <motion.form 
        onSubmit={form.handleSubmit(onSubmit)} 
        className="space-y-4"
        variants={formVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={itemVariants}>
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Seu Nome</FormLabel>
                  <FormControl>
                    <Input placeholder="Fulano de Tal" {...field} disabled={isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
        </motion.div>
        <motion.div variants={itemVariants}>
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefone (com DDD)</FormLabel>
                  <FormControl>
                    <Input placeholder="(11) 98765-4321" {...field} disabled={isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
        </motion.div>
         <motion.div variants={itemVariants}>
            <FormField
              control={form.control}
              name="address.street"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Endereço de Entrega</FormLabel>
                  <FormControl>
                    <Input placeholder="Rua, Número, Bairro" {...field} value={field.value ?? ''} disabled={isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
        </motion.div>
         <motion.div variants={itemVariants}>
            <FormField
              control={form.control}
              name="address.reference"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ponto de Referência</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Ex: Próximo à padaria, casa com muro azul..." {...field} value={field.value ?? ''} disabled={isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
        </motion.div>
        <motion.div variants={itemVariants}>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Confirmar e Enviar Orçamento
            </Button>
        </motion.div>
      </motion.form>
    </Form>
  );
};

export default UserDetailsForm;
