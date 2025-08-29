
'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2, MessageSquareHeart } from 'lucide-react';
import { UserDetails } from '@/lib/types';
import { Logo } from './icons/logo';

const formSchema = z.object({
  name: z.string().min(3, { message: "Por favor, insira seu nome completo." }),
  phone: z.string().min(10, { message: "Por favor, insira um telefone válido com DDD." }),
});

type LoginFormValues = z.infer<typeof formSchema>;

interface WelcomeScreenProps {
  onLogin: (data: UserDetails) => void;
  isLoading: boolean;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onLogin, isLoading }) => {
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      phone: "",
    },
  });

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        staggerChildren: 0.2,
        delayChildren: 0.3,
      } 
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100 } }
  };

  return (
     <div className="relative flex h-[100dvh] w-full flex-col items-center justify-center bg-secondary dark:bg-muted/40 p-4">
        <div className="absolute inset-0 bg-[url('/whatsapp-pattern.png')] bg-repeat opacity-5 dark:opacity-100" />
        <motion.div 
            className="z-10 w-full max-w-md"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            <div className="rounded-2xl border bg-card/80 p-8 text-center shadow-2xl backdrop-blur-sm">
                <motion.div variants={itemVariants} className="mb-6 flex flex-col items-center gap-4">
                    <Logo className="h-20 w-20 text-primary" />
                    <h1 className="text-3xl font-bold text-card-foreground">Bem-vindo(a) ao SatiZap!</h1>
                    <p className="text-muted-foreground">Para começar, precisamos de algumas informações para dar início ao seu atendimento de forma segura e personalizada.</p>
                </motion.div>
                
                <Form {...form}>
                    <motion.form 
                        onSubmit={form.handleSubmit(onLogin)} 
                        className="space-y-6 text-left"
                        variants={containerVariants}
                    >
                        <motion.div variants={itemVariants}>
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Seu nome completo</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Ex: João da Silva" {...field} disabled={isLoading} />
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
                                        <FormLabel>WhatsApp (com DDD)</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Ex: (11) 98765-4321" {...field} disabled={isLoading} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </motion.div>
                        <motion.div variants={itemVariants}>
                            <Button type="submit" className="w-full h-12 text-lg" disabled={isLoading}>
                                {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <MessageSquareHeart className="mr-2 h-5 w-5"/>}
                                Iniciar Atendimento
                            </Button>
                        </motion.div>
                    </motion.form>
                </Form>
            </div>
        </motion.div>
    </div>
  );
};

export default WelcomeScreen;
