
'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetClose } from '@/components/ui/sheet';
import { Client } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { Textarea } from '../ui/textarea';

const formSchema = z.object({
    id: z.string().optional(),
    name: z.string().min(3, 'O nome deve ter pelo menos 3 caracteres.'),
    phone: z.string().min(10, 'O telefone deve ter pelo menos 10 dígitos.'),
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

type ClientFormValues = z.infer<typeof formSchema>;

interface ClientFormProps {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    client?: Client | null;
    onSave: (client: Partial<Client>) => Promise<{ success: boolean, error?: string }>;
}

export default function ClientForm({ isOpen, setIsOpen, client, onSave }: ClientFormProps) {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    
    const form = useForm<ClientFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: client || { name: '', phone: '' },
    });

    React.useEffect(() => {
        if (client) {
            form.reset(client);
        } else {
            form.reset({ name: '', phone: '', address: { street: '', number: '', neighborhood: '', city: '', state: '', zipCode: '', reference: '' } });
        }
    }, [client, form]);

    const handleSubmit = async (values: ClientFormValues) => {
        setIsLoading(true);
        const result = await onSave(values);
        setIsLoading(false);

        if (result.success) {
            toast({ title: 'Sucesso!', description: 'Cliente salvo com sucesso.' });
            setIsOpen(false);
        } else {
            toast({
                variant: 'destructive',
                title: 'Erro ao Salvar',
                description: result.error || 'Ocorreu um erro desconhecido.',
            });
        }
    };

    return (
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetContent className="sm:max-w-lg overflow-y-auto">
                <SheetHeader>
                    <SheetTitle>{client ? 'Editar Cliente' : 'Adicionar Novo Cliente'}</SheetTitle>
                    <SheetDescription>
                        Preencha os detalhes do cliente. Campos com * são obrigatórios.
                    </SheetDescription>
                </SheetHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nome Completo *</FormLabel>
                                    <FormControl><Input {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="phone"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Telefone *</FormLabel>
                                    <FormControl><Input {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="address.street"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Rua / Logradouro</FormLabel>
                                    <FormControl><Input {...field} value={field.value ?? ''} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="address.number"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Número</FormLabel>
                                    <FormControl><Input {...field} value={field.value ?? ''} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="address.neighborhood"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Bairro</FormLabel>
                                    <FormControl><Input {...field} value={field.value ?? ''} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="address.city"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Cidade</FormLabel>
                                    <FormControl><Input {...field} value={field.value ?? ''} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="address.reference"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Ponto de Referência</FormLabel>
                                    <FormControl><Textarea placeholder="Ex: Próximo à padaria, casa com muro azul..." {...field} value={field.value ?? ''} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <SheetFooter className="pt-6">
                            <SheetClose asChild>
                                <Button type="button" variant="secondary">Cancelar</Button>
                            </SheetClose>
                            <Button type="submit" disabled={isLoading}>
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Salvar
                            </Button>
                        </SheetFooter>
                    </form>
                </Form>
            </SheetContent>
        </Sheet>
    );
}
