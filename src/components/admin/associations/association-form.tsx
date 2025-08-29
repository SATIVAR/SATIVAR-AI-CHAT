'use client';

import React, { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Association } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

// Dynamic import for SimpleMDE to avoid SSR issues
const SimpleMdeReact = dynamic(() => import('react-simplemde-editor'), {
  ssr: false,
});

// Import CSS for SimpleMDE
import 'easymde/dist/easymde.min.css';

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
    aiDirectives: z.string().optional(),
    aiRestrictions: z.string().optional(),
    patientsList: z.string().optional(),
    isActive: z.boolean().default(true),
});

type AssociationFormValues = z.infer<typeof formSchema>;

interface AssociationFormProps {
    initialData?: Association | null;
}

export function AssociationForm({ initialData }: AssociationFormProps) {
    const { toast } = useToast();
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('general');
    
    const form = useForm<AssociationFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: initialData ? {
            ...initialData,
            wordpressAuth: typeof initialData.wordpressAuth === 'string' 
                ? JSON.parse(initialData.wordpressAuth)
                : initialData.wordpressAuth,
            promptContext: initialData.promptContext || '',
            aiDirectives: initialData.aiDirectives || '',
            aiRestrictions: initialData.aiRestrictions || '',
            patientsList: initialData.patientsList || '',
        } : { 
            name: '', 
            subdomain: '', 
            wordpressUrl: '',
            wordpressAuth: { apiKey: '', username: '', password: '' },
            promptContext: '',
            aiDirectives: '',
            aiRestrictions: '',
            patientsList: '',
            isActive: true 
        },
    });

    const simpleMdeOptions = useMemo(() => ({
        spellChecker: false,
        maxHeight: '300px',
        placeholder: 'Digite as instruções em markdown...',
        toolbar: [
            'bold', 'italic', 'heading', '|',
            'quote', 'unordered-list', 'ordered-list', '|',
            'link', 'preview', 'side-by-side', 'fullscreen', '|',
            'guide'
        ] as any
    }), []);

    const handleSubmit = async (values: AssociationFormValues) => {
        setIsLoading(true);
        
        try {
            const url = initialData 
                ? `/api/admin/associations/${initialData.id}`
                : '/api/admin/associations';
            
            const method = initialData ? 'PUT' : 'POST';
            
            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(values),
            });

            const result = await response.json();

            if (result.success) {
                toast({ 
                    title: 'Sucesso!', 
                    description: initialData 
                        ? 'Associação atualizada com sucesso.' 
                        : 'Associação criada com sucesso.' 
                });
                router.push('/admin/associations');
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Erro ao Salvar',
                    description: result.error || 'Ocorreu um erro desconhecido.',
                });
            }
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Erro ao Salvar',
                description: 'Erro de conexão. Tente novamente.',
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card className="w-full max-w-4xl mx-auto">
            <CardHeader>
                <div className="flex items-center gap-4">
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => router.push('/admin/associations')}
                        className="p-2"
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <CardTitle>{initialData ? 'Editar Associação' : 'Nova Associação'}</CardTitle>
                        <CardDescription>
                            {initialData 
                                ? 'Edite as informações e configurações da associação.'
                                : 'Preencha os detalhes da associação. Campos com * são obrigatórios.'
                            }
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                            <TabsList className="grid w-full grid-cols-4">
                                <TabsTrigger value="general">Informações Gerais</TabsTrigger>
                                <TabsTrigger value="credentials">Credenciais da API</TabsTrigger>
                                <TabsTrigger value="api-endpoints">Endpoints API</TabsTrigger>
                                <TabsTrigger value="ai-guidelines">Diretrizes da IA</TabsTrigger>
                            </TabsList>
                            
                            <TabsContent value="general" className="space-y-4">
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
                                                        disabled={!!initialData} // Disable editing subdomain for existing associations
                                                    />
                                                    <div className="bg-muted px-3 py-2 rounded-r-md border border-l-0 text-sm text-muted-foreground">
                                                        .satizap.app
                                                    </div>
                                                </div>
                                            </FormControl>
                                            <div className="text-sm text-muted-foreground mt-1">
                                                Este será o endereço que os pacientes usarão para acessar o chat: <span className="font-medium">{field.value || 'subdominio-escolhido'}.satizap.app</span>
                                                {initialData && <p className="text-amber-600 mt-1">Subdomínio não pode ser alterado após a criação.</p>}
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
                            </TabsContent>
                            
                            <TabsContent value="credentials" className="space-y-4">
                                <div className="space-y-4 border rounded-lg p-6">
                                    <div>
                                        <h4 className="text-lg font-semibold mb-2">Credenciais da API WordPress</h4>
                                        <p className="text-sm text-muted-foreground mb-4">
                                            Configure as credenciais de acesso à API REST do WordPress da associação.
                                        </p>
                                    </div>
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
                            </TabsContent>
                            
                            <TabsContent value="api-endpoints" className="space-y-4">
                                <div className="space-y-4 border rounded-lg p-6">
                                    <div>
                                        <h4 className="text-lg font-semibold mb-2">Endpoints da API</h4>
                                        <p className="text-sm text-muted-foreground mb-4">
                                            Configure os endpoints da API para integração com sistemas externos.
                                        </p>
                                    </div>
                                    <FormField
                                        control={form.control}
                                        name="patientsList"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Lista de Pacientes</FormLabel>
                                                <FormControl>
                                                    <Textarea 
                                                        {...field} 
                                                        placeholder="Endpoint ou configuração para listar todos os pacientes da associação..."
                                                        className="min-h-32"
                                                    />
                                                </FormControl>
                                                <div className="text-sm text-muted-foreground mt-1">
                                                    Configuração ou endpoint para acessar a lista de pacientes cadastrados
                                                </div>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </TabsContent>
                            
                            <TabsContent value="ai-guidelines" className="space-y-6">
                                <div className="space-y-6">
                                    <div>
                                        <h4 className="text-lg font-semibold mb-2">Diretrizes da IA</h4>
                                        <p className="text-sm text-muted-foreground mb-4">
                                            Configure o comportamento da IA para esta associação. Use Markdown para formatar as instruções.
                                        </p>
                                    </div>
                                    
                                    <FormField
                                        control={form.control}
                                        name="aiDirectives"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-base font-medium">Diretrizes de Atendimento (O que fazer)</FormLabel>
                                                <div className="text-sm text-muted-foreground mb-2">
                                                    Instruções sobre como a IA deve se comportar e o que deve fazer durante as interações.
                                                </div>
                                                <FormControl>
                                                    <SimpleMdeReact
                                                        placeholder="Exemplo:\n\n## Diretrizes de Atendimento\n\n- Sempre seja educado e profissional\n- Foque em produtos medicinais\n- Explique benefícios terapêuticos\n- Solicite prescrição médica quando necessário"
                                                        value={field.value || ''}
                                                        onChange={field.onChange}
                                                        options={simpleMdeOptions}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    
                                    <FormField
                                        control={form.control}
                                        name="aiRestrictions"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-base font-medium">Restrições (O que não fazer)</FormLabel>
                                                <div className="text-sm text-muted-foreground mb-2">
                                                    Comportamentos e ações que a IA deve evitar durante as interações.
                                                </div>
                                                <FormControl>
                                                    <SimpleMdeReact
                                                        placeholder="Exemplo:\n\n## Restrições\n\n- Não fornece conselhos médicos\n- Não recomenda dosagens\n- Não discute assuntos políticos\n- Não compartilha informações pessoais de pacientes"
                                                        value={field.value || ''}
                                                        onChange={field.onChange}
                                                        options={simpleMdeOptions}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </TabsContent>
                        </Tabs>
                        
                        <div className="flex justify-end gap-4 pt-6 border-t">
                            <Button 
                                type="button" 
                                variant="secondary"
                                onClick={() => router.push('/admin/associations')}
                                disabled={isLoading}
                            >
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={isLoading}>
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {initialData ? 'Atualizar' : 'Criar'} Associação
                            </Button>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}