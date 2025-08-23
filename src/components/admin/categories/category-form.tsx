
'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetClose } from '@/components/ui/sheet';
import { ProductCategory } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const formSchema = z.object({
    id: z.string().optional(),
    name: z.string().min(3, 'O nome deve ter pelo menos 3 caracteres.'),
    description: z.string().min(10, 'A descrição deve ter pelo menos 10 caracteres.'),
    order: z.coerce.number().min(0, 'A ordem deve ser um número positivo.'),
    imageUrl: z.string().url({ message: "Por favor, insira uma URL válida." }).or(z.literal('')),
    nextStepSuggestion: z.string().optional(),
});

type CategoryFormValues = z.infer<typeof formSchema>;

interface CategoryFormProps {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    category?: Partial<ProductCategory> | null;
    allCategories: ProductCategory[];
    onSave: (data: FormData) => Promise<{ success: boolean, error?: string }>;
}

export default function CategoryForm({ isOpen, setIsOpen, category, allCategories, onSave }: CategoryFormProps) {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    
    const form = useForm<CategoryFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: '',
            description: '',
            order: 0,
            imageUrl: '',
            nextStepSuggestion: '',
            ...category,
        },
    });

    useEffect(() => {
        if (isOpen) {
            form.reset({
                name: '',
                description: '',
                order: 0,
                imageUrl: '',
                nextStepSuggestion: '',
                ...category
            });
        }
    }, [isOpen, category, form]);

    const handleSubmit = async (values: CategoryFormValues) => {
        setIsLoading(true);

        const formData = new FormData();
        Object.entries(values).forEach(([key, value]) => {
            if (value === 'none') {
                formData.append(key, '');
            } else if (value !== null && value !== undefined) {
                 formData.append(key, String(value));
            }
        });

        const result = await onSave(formData);
        setIsLoading(false);

        if (result.success) {
            toast({ title: 'Sucesso!', description: 'Categoria salva com sucesso.' });
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
                    <SheetTitle>{category?.id ? 'Editar Categoria' : 'Adicionar Nova Categoria'}</SheetTitle>
                    <SheetDescription>
                        Preencha os detalhes da categoria. Campos com * são obrigatórios.
                    </SheetDescription>
                </SheetHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nome da Categoria *</FormLabel>
                                    <FormControl><Input placeholder="Ex: Espetinhos" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Descrição *</FormLabel>
                                    <FormControl><Textarea placeholder="Uma breve descrição da categoria" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="order"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Ordem de Exibição *</FormLabel>
                                    <FormControl><Input type="number" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="imageUrl"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>URL da Imagem</FormLabel>
                                    <FormControl><Input placeholder="https://exemplo.com/imagem.png" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="nextStepSuggestion"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Sugestão de Próximo Passo</FormLabel>
                                     <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecione a próxima categoria a sugerir" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="none">Nenhuma</SelectItem>
                                            {allCategories.filter(c => c.id !== category?.id).map(cat => (
                                                <SelectItem key={cat.id} value={cat.id!}>{cat.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormDescription>
                                        Quando o cliente terminar de adicionar itens desta categoria, qual será a próxima sugestão?
                                    </FormDescription>
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
