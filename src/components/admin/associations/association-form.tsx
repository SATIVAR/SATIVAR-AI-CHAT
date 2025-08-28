'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetClose } from '@/components/ui/sheet';
import { Association } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';

const formSchema = z.object({
    id: z.string().optional(),
    name: z.string().min(3, 'O nome deve ter pelo menos 3 caracteres.'),
    subdomain: z.string().min(3, 'O subdomínio deve ter pelo menos 3 caracteres.')
        .regex(/^[a-z0-9-]+$/, 'O subdomínio deve conter apenas letras minúsculas, números e hífens.'),
    wordpressUrl: z.string().url('Digite uma URL válida.'),
    wordpressAuth: z.object({
        apiKey: z.string().min(1, 'A chave API é obrigatória.'),
        username: z.string().min(1, 'O usuário é obrigatório.'),
        password: z.string().min(1, 'A senha é obrigatória.'),
    }),
    promptContext: z.string().optional(),
    isActive: z.boolean().default(true),
});

type AssociationFormValues = z.infer<typeof formSchema>;

interface AssociationFormProps {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    association?: Association | null;
    onSave: (association: Partial<Association>) => Promise<{ success: boolean, error?: string }>;
}

export default function AssociationForm({ isOpen, setIsOpen, association, onSave }: AssociationFormProps) {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    
    const form = useForm<AssociationFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: association ? {
            ...association,
            wordpressAuth: typeof association.wordpressAuth === 'string' 
                ? JSON.parse(association.wordpressAuth)
                : association.wordpressAuth,
            promptContext: association.promptContext || '' // Convert null to empty string
        } : { 
            name: '', 
            subdomain: '', 
            wordpressUrl: '',
            wordpressAuth: { apiKey: '', username: '', password: '' },
            promptContext: '',
            isActive: true 
        },
    });

    React.useEffect(() => {
        if (association) {
            form.reset({
                ...association,
                wordpressAuth: typeof association.wordpressAuth === 'string' 
                    ? JSON.parse(association.wordpressAuth)
                    : association.wordpressAuth,
                promptContext: association.promptContext || '' // Convert null to empty string
            });
        } else {
            form.reset({ 
                name: '', 
                subdomain: '', 
                wordpressUrl: '',
                wordpressAuth: { apiKey: '', username: '', password: '' },
                promptContext: '',
                isActive: true 
            });
        }
    }, [association, form]);

    const handleSubmit = async (values: AssociationFormValues) => {
        setIsLoading(true);
        
        // Convert for API call but keep object for type compatibility
        const dataToSave = {
            ...values,
            // The API endpoint will handle the JSON.stringify conversion
        } as any;
        
        const result = await onSave(dataToSave);
        setIsLoading(false);

        if (result.success) {
            toast({ title: 'Sucesso!', description: 'Associação salva com sucesso.' });
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
                    <SheetTitle>{association ? 'Editar Associação' : 'Adicionar Nova Associação'}</SheetTitle>
                    <SheetDescription>
                        Preencha os detalhes da associação. Campos com * são obrigatórios.
                    </SheetDescription>
                </SheetHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nome da Associação *</FormLabel>
                                    <FormControl><Input {...field} placeholder="Ex: Sativar Cannabis" /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="subdomain"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Subdomínio de Acesso (no SATIZAP) *</FormLabel>
                                    <FormControl>
                                        <div className="flex">
                                            <Input 
                                                {...field} 
                                                placeholder="sativar" 
                                                className="rounded-r-none"
                                                onChange={(e) => field.onChange(e.target.value.toLowerCase())}
                                            />
                                            <div className="bg-muted px-3 py-2 rounded-r-md border border-l-0 text-sm text-muted-foreground">
                                                .satizap.app
                                            </div>
                                        </div>
                                    </FormControl>
                                    <div className="text-sm text-muted-foreground mt-1">
                                        Este será o endereço que os pacientes usarão para acessar o chat: <span className="font-medium">{field.value || 'subdominio-escolhido'}.satizap.app</span>
                                    </div>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="wordpressUrl"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>URL do WordPress *</FormLabel>
                                    <FormControl><Input {...field} placeholder="https://exemplo.com.br" /></FormControl>
                                    <div className="text-sm text-muted-foreground mt-1">
                                        Endereço do sistema de gestão WordPress da associação
                                    </div>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        
                        <div className="space-y-3 border rounded-lg p-4">
                            <h4 className="text-sm font-semibold">Credenciais da API WordPress</h4>
                            <FormField
                                control={form.control}
                                name="wordpressAuth.apiKey"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Chave da API *</FormLabel>
                                        <FormControl><Input {...field} type="password" placeholder="Chave da API REST" /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="wordpressAuth.username"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Usuário *</FormLabel>
                                        <FormControl><Input {...field} placeholder="Nome de usuário" /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="wordpressAuth.password"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Senha da Aplicação *</FormLabel>
                                        <FormControl><Input {...field} type="password" placeholder="Senha da aplicação" /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="promptContext"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Contexto para IA</FormLabel>
                                    <FormControl>
                                        <Textarea 
                                            {...field} 
                                            placeholder="Instruções específicas ou contexto sobre a associação que será incluído no prompt da IA. Ex: 'Nossos produtos mais vendidos são X e Y', 'Sempre ofereça o frete Z'..."
                                            className="min-h-20"
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="isActive"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                    <div className="space-y-0.5">
                                        <FormLabel className="text-base">Associação Ativa</FormLabel>
                                        <div className="text-sm text-muted-foreground">
                                            Permite que a associação seja utilizada no sistema
                                        </div>
                                    </div>
                                    <FormControl>
                                        <Switch
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                        />
                                    </FormControl>
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