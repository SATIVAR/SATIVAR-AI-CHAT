'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, XCircle, Loader2, AlertTriangle, Info, Eye, EyeOff } from 'lucide-react';
import { Association, ApiConfig } from '@/lib/types';
import { encryptApiConfig } from '@/lib/crypto';
import { Checkbox } from '@/components/ui/checkbox';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Copy, Clock, Globe, Shield, Database } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { UserManagementTab } from './user-management-tab';
import { EndpointDiagnostics } from './endpoint-diagnostics';

// Phase 2: Enhanced form validation schema with optional WordPress integration
const associationSchema = z.object({
  // General Information
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  subdomain: z.string()
    .min(3, 'Subdomínio deve ter pelo menos 3 caracteres')
    .regex(/^[a-z0-9-]+$/, 'Subdomínio deve conter apenas letras minúsculas, números e hífens'),
  wordpressUrl: z.string().url('URL deve ser válida').optional().or(z.literal('')),
  wordpressUrlDev: z.string().url('URL de desenvolvimento deve ser válida').optional().or(z.literal('')),
  
  // Public Display (optional)
  publicDisplayName: z.string().optional(),
  logoUrl: z.string().url('URL do logo deve ser válida').optional().or(z.literal('')),
  welcomeMessage: z.string().optional(),
  
  // API Configuration - Now optional
  authMethod: z.enum(['applicationPassword', 'wooCommerce']).optional(),
  
  // Application Password fields (optional)
  appPasswordUsername: z.string().optional(),
  appPasswordPassword: z.string().optional(),
  
  // WooCommerce fields (optional)
  wooCommerceKey: z.string().optional(),
  wooCommerceSecret: z.string().optional(),
  
  // AI Configuration
  promptContext: z.string().optional(),
  aiDirectives: z.string().optional(),
  aiRestrictions: z.string().optional(),
}).refine((data) => {
  // Check if any WordPress integration fields are filled
  const hasWordPressUrl = data.wordpressUrl && data.wordpressUrl.trim() !== '';
  const hasAuthMethod = data.authMethod;
  const hasAppPassword = data.appPasswordUsername || data.appPasswordPassword;
  const hasWooCommerce = data.wooCommerceKey || data.wooCommerceSecret;
  
  // If no WordPress fields are filled, skip validation (allow basic associations)
  if (!hasWordPressUrl && !hasAuthMethod && !hasAppPassword && !hasWooCommerce) {
    return true;
  }
  
  // If WordPress integration is being configured, enforce complete setup
  if (hasWordPressUrl || hasAuthMethod || hasAppPassword || hasWooCommerce) {
    // WordPress URL is required if any integration field is filled
    if (!hasWordPressUrl) {
      return false;
    }
    
    // Auth method is required if WordPress URL is provided
    if (!hasAuthMethod) {
      return false;
    }
    
    // Validate credentials based on selected auth method
    if (data.authMethod === 'applicationPassword') {
      return data.appPasswordUsername && data.appPasswordPassword;
    }
    
    if (data.authMethod === 'wooCommerce') {
      return data.wooCommerceKey && data.wooCommerceSecret;
    }
  }
  
  return true;
}, {
  message: 'Para integração WordPress: preencha URL, método de autenticação e credenciais correspondentes. Ou deixe todos os campos vazios para associação básica.',
  path: ['wordpressUrl']
});

type AssociationFormData = z.infer<typeof associationSchema>;

interface AssociationFormProps {
  association?: Association;
  onSubmit: (data: Partial<Association>) => Promise<void>;
  isLoading?: boolean;
}

export function AssociationForm({ association, onSubmit, isLoading = false }: AssociationFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState('');
  const [testDetails, setTestDetails] = useState<any>(null); // Store detailed test results
  // Separate test states for production and development
  const [testStatusProd, setTestStatusProd] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessageProd, setTestMessageProd] = useState('');
  const [testDetailsProd, setTestDetailsProd] = useState<any>(null);
  const [testStatusDev, setTestStatusDev] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessageDev, setTestMessageDev] = useState('');
  const [testDetailsDev, setTestDetailsDev] = useState<any>(null);
  const [preSaveValidation, setPreSaveValidation] = useState(true); // Auto-enable pre-save validation
  const [validationInProgress, setValidationInProgress] = useState(false);
  const [showAppPassword, setShowAppPassword] = useState(false);
  const [showWooCommerceSecret, setShowWooCommerceSecret] = useState(false);
  const { toast } = useToast();
  
  // Parse existing API configuration with backward compatibility
  const getInitialAuthData = () => {
    if (!association?.apiConfig) {
      return {
        authMethod: undefined,
        appPasswordUsername: '',
        appPasswordPassword: '',
        wooCommerceKey: '',
        wooCommerceSecret: '',
      };
    }
    
    const config = association.apiConfig as ApiConfig;
    
    // Ensure credentials object exists and has proper structure
    const credentials = config?.credentials || {};
    const applicationPassword = credentials?.applicationPassword || {};
    const wooCommerce = credentials?.wooCommerce || {};
    
    return {
      authMethod: config?.authMethod || undefined,
      appPasswordUsername: (applicationPassword as any)?.username || '',
      appPasswordPassword: (applicationPassword as any)?.password || '',
      wooCommerceKey: (wooCommerce as any)?.consumerKey || '',
      wooCommerceSecret: (wooCommerce as any)?.consumerSecret || '',
    };
  };

  const form = useForm<AssociationFormData>({
    resolver: zodResolver(associationSchema),
    defaultValues: {
      name: association?.name || '',
      subdomain: association?.subdomain || '',
      wordpressUrl: association?.wordpressUrl || '',
      wordpressUrlDev: association?.wordpressUrlDev || '',
      publicDisplayName: association?.publicDisplayName || '',
      logoUrl: association?.logoUrl || '',
      welcomeMessage: association?.welcomeMessage || '',
      promptContext: association?.promptContext || '',
      aiDirectives: association?.aiDirectives || '',
      aiRestrictions: association?.aiRestrictions || '',
      ...getInitialAuthData(),
    },
  });

  const watchedAuthMethod = form.watch('authMethod');
  const watchedWordPressUrl = form.watch('wordpressUrl');
  const watchedWordPressUrlDev = form.watch('wordpressUrlDev');
  
  // Determine if WordPress integration is being configured
  const hasWordPressIntegration = watchedWordPressUrl && watchedWordPressUrl.trim() !== '';
  const hasWordPressDevIntegration = watchedWordPressUrlDev && watchedWordPressUrlDev.trim() !== '';
  
  // Auto-set default auth method when WordPress URL is provided
  useEffect(() => {
    if (hasWordPressIntegration && !watchedAuthMethod) {
      form.setValue('authMethod', 'applicationPassword');
    }
  }, [hasWordPressIntegration, watchedAuthMethod, form]);
  
  // Copy to clipboard functionality
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: 'Copiado!',
        description: 'Informações copiadas para a área de transferência',
      });
    } catch (error) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      toast({
        title: 'Copiado!',
        description: 'Informações copiadas para a área de transferência',
      });
    }
  };

  // Enhanced test API configuration with validation for specific environment
  const testApiConfiguration = async (environment: 'production' | 'development' = 'production') => {
    const isDevTest = environment === 'development';
    
    // Set appropriate test states
    if (isDevTest) {
      setTestStatusDev('testing');
      setTestMessageDev('Testando conexão de desenvolvimento...');
    } else {
      setTestStatusProd('testing');
      setTestMessageProd('Testando conexão de produção...');
    }
    
    try {
      const formData = form.getValues();
      
      // Select URL based on environment
      const targetUrl = isDevTest ? formData.wordpressUrlDev : formData.wordpressUrl;
      
      // Validate required fields for testing
      if (!targetUrl || targetUrl.trim() === '') {
        const errorMsg = `URL do WordPress (${isDevTest ? 'desenvolvimento' : 'produção'}) é obrigatória para teste de conexão`;
        if (isDevTest) {
          setTestStatusDev('error');
          setTestMessageDev(errorMsg);
        } else {
          setTestStatusProd('error');
          setTestMessageProd(errorMsg);
        }
        return;
      }
      
      if (!formData.authMethod) {
        const errorMsg = 'Selecione um método de autenticação';
        if (isDevTest) {
          setTestStatusDev('error');
          setTestMessageDev(errorMsg);
        } else {
          setTestStatusProd('error');
          setTestMessageProd(errorMsg);
        }
        return;
      }
      
      // Build API config for testing
      const apiConfig: ApiConfig = {
        authMethod: formData.authMethod,
        credentials: {
          applicationPassword: formData.authMethod === 'applicationPassword' ? {
            username: formData.appPasswordUsername!,
            password: formData.appPasswordPassword!,
          } : undefined,
          wooCommerce: formData.authMethod === 'wooCommerce' ? {
            consumerKey: formData.wooCommerceKey!,
            consumerSecret: formData.wooCommerceSecret!,
          } : undefined,
        },
        endpoints: {
          getUsers: '/wp-json/wp/v2/users',
          createUsers: '/wp-json/wp/v2/users',
          getProdutos: '/wp-json/wc/v3/products',
          getCategorias: '/wp-json/wc/v3/products/categories',
          getClientes: '/wp-json/wc/v3/customers',
          createCliente: '/wp-json/wc/v3/customers',
          createPedido: '/wp-json/wc/v3/orders',
        },
      };

      // Call test endpoint with environment parameter
      const response = await fetch('/api/admin/associations/test-wordpress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wordpressUrl: targetUrl,
          apiConfig: apiConfig,
          environment: environment, // Include environment info
        }),
      });

      const result = await response.json();

      // Store full test result details in appropriate state
      if (isDevTest) {
        setTestDetailsDev(result);
      } else {
        setTestDetailsProd(result);
      }
      
      if (result.success) {
        const duration = result.connectionTiming?.duration ? `${result.connectionTiming.duration}ms` : '';
        const version = result.details?.wpVersion ? `WordPress: ${result.details.wpVersion}` : 'API conectada';
        const successMsg = `Conexão ${isDevTest ? 'de desenvolvimento' : 'de produção'} bem-sucedida! ${version} ${duration ? `(${duration})` : ''}`;
        
        if (isDevTest) {
          setTestStatusDev('success');
          setTestMessageDev(successMsg);
        } else {
          setTestStatusProd('success');
          setTestMessageProd(successMsg);
        }
      } else {
        const errorMsg = `Erro no teste ${isDevTest ? 'de desenvolvimento' : 'de produção'}: ${result.error || 'Erro ao testar configuração'}`;
        if (isDevTest) {
          setTestStatusDev('error');
          setTestMessageDev(errorMsg);
        } else {
          setTestStatusProd('error');
          setTestMessageProd(errorMsg);
        }
      }
    } catch (error) {
      const errorMsg = `Erro de conexão ${isDevTest ? 'de desenvolvimento' : 'de produção'}. Verifique a URL e as credenciais.`;
      if (isDevTest) {
        setTestStatusDev('error');
        setTestMessageDev(errorMsg);
      } else {
        setTestStatusProd('error');
        setTestMessageProd(errorMsg);
      }
    }
  };

  // Enhanced form submission handler with optional pre-save validation
  const handleSubmit = async (data: AssociationFormData) => {
    setIsSubmitting(true);
    
    try {
      let apiConfig: ApiConfig | undefined = undefined;
      
      // Only build API config if WordPress integration is configured
      if (data.wordpressUrl && data.wordpressUrl.trim() !== '' && data.authMethod) {
        apiConfig = {
          authMethod: data.authMethod,
          credentials: {
            applicationPassword: data.authMethod === 'applicationPassword' ? {
              username: data.appPasswordUsername!,
              password: data.appPasswordPassword!,
            } : undefined,
            wooCommerce: data.authMethod === 'wooCommerce' ? {
              consumerKey: data.wooCommerceKey!,
              consumerSecret: data.wooCommerceSecret!,
            } : undefined,
          },
          endpoints: {
            getUsers: '/wp-json/wp/v2/users',
            createUsers: '/wp-json/wp/v2/users',
            getProdutos: '/wp-json/wc/v3/products',
            getCategorias: '/wp-json/wc/v3/products/categories',
            getClientes: '/wp-json/wc/v3/customers',
            createCliente: '/wp-json/wc/v3/customers',
            createPedido: '/wp-json/wc/v3/orders',
          },
        };
        
        // Pre-save validation: Test WordPress connection if enabled and WordPress integration is configured
        if (preSaveValidation && apiConfig) {
          console.log('Running pre-save validation...');
          setValidationInProgress(true);
          
          try {
            const response = await fetch('/api/admin/associations/test-wordpress', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                wordpressUrl: data.wordpressUrl,
                apiConfig: apiConfig,
              }),
            });
            
            const result = await response.json();
            
            if (!result.success) {
              // Show validation failed dialog and ask user to proceed
              const proceed = window.confirm(
                `Falha na validação da conexão WordPress:\n\n${result.error}\n\nDeseja salvar mesmo assim? (Você poderá corrigir as configurações posteriormente)`
              );
              
              if (!proceed) {
                setValidationInProgress(false);
                setIsSubmitting(false);
                return;
              }
            } else {
              console.log('Pre-save validation successful:', result.details?.wpVersion);
            }
          } catch (error) {
            console.error('Pre-save validation error:', error);
            const proceed = window.confirm(
              `Erro durante validação da conexão:\n\nNão foi possível testar a conexão com o WordPress.\n\nDeseja salvar mesmo assim?`
            );
            
            if (!proceed) {
              setValidationInProgress(false);
              setIsSubmitting(false);
              return;
            }
          } finally {
            setValidationInProgress(false);
          }
        }
      }

      // Prepare association data
      const associationData = {
        name: data.name,
        subdomain: data.subdomain,
        wordpressUrl: data.wordpressUrl && data.wordpressUrl.trim() !== '' ? data.wordpressUrl : undefined,
        wordpressUrlDev: data.wordpressUrlDev && data.wordpressUrlDev.trim() !== '' ? data.wordpressUrlDev : null,
        publicDisplayName: data.publicDisplayName || null,
        logoUrl: data.logoUrl || null,
        welcomeMessage: data.welcomeMessage || null,
        promptContext: data.promptContext || null,
        aiDirectives: data.aiDirectives || null,
        aiRestrictions: data.aiRestrictions || null,
        // Only include API config if WordPress integration is configured
        apiConfig: apiConfig,
        // Clear legacy auth when using new API config or when not using WordPress
        wordpressAuth: undefined,
      };

      await onSubmit(associationData);
    } catch (error) {
      console.error('Error submitting form:', error);
      // Show toast error message to user
      if (error instanceof Error) {
        // If there's a toast available, show the error
        console.error('Form submission error:', error.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset test status when auth method or credentials change
  useEffect(() => {
    setTestStatus('idle');
    setTestMessage('');
    setTestStatusProd('idle');
    setTestMessageProd('');
    setTestStatusDev('idle');
    setTestMessageDev('');
  }, [watchedAuthMethod, form.watch('appPasswordUsername'), form.watch('appPasswordPassword'), form.watch('wooCommerceKey'), form.watch('wooCommerceSecret')]);

  return (
    <div className="max-w-4xl mx-auto">
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="general">Geral</TabsTrigger>
            <TabsTrigger value="public">Exibição Pública</TabsTrigger>
            <TabsTrigger value="api">Configuração da API</TabsTrigger>
            <TabsTrigger value="ai">Diretrizes de IA</TabsTrigger>
            <TabsTrigger value="users">Usuários</TabsTrigger>
          </TabsList>

          {/* General Tab */}
          <TabsContent value="general" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Informações Gerais</CardTitle>
                <CardDescription>
                  Configurações básicas da associação
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome da Associação *</Label>
                    <Input
                      id="name"
                      {...form.register('name')}
                      placeholder="Ex: Associação Médica ABC"
                    />
                    {form.formState.errors.name && (
                      <p className="text-sm text-red-600">{form.formState.errors.name.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="subdomain">Subdomínio *</Label>
                    <Input
                      id="subdomain"
                      {...form.register('subdomain')}
                      placeholder="Ex: medica-abc"
                    />
                    {form.formState.errors.subdomain && (
                      <p className="text-sm text-red-600">{form.formState.errors.subdomain.message}</p>
                    )}
                    <div className="space-y-1 text-xs">
                      <p className="text-gray-500">
                        URL final: {form.watch('subdomain') || 'subdomain'}.satizap.com
                      </p>
                      {/* Phase 3: Development URL display */}
                      <p className="text-gray-500">
                        URL de Testes: 
                        <a 
                          href={form.watch('subdomain') ? `http://localhost:9002/${form.watch('subdomain')}` : '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`ml-1 ${form.watch('subdomain') ? 'text-blue-600 hover:text-blue-800 underline' : 'text-gray-400 cursor-not-allowed'}`}
                          onClick={!form.watch('subdomain') ? (e) => e.preventDefault() : undefined}
                        >
                          {form.watch('subdomain') ? `localhost:9002/${form.watch('subdomain')}` : 'localhost:9002/subdomain'}
                        </a>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="wordpressUrl">URL do WordPress (Produção)</Label>
                  <Input
                    id="wordpressUrl"
                    {...form.register('wordpressUrl')}
                    placeholder="https://sistema.associacao.com.br (opcional)"
                  />
                  {form.formState.errors.wordpressUrl && (
                    <p className="text-sm text-red-600">{form.formState.errors.wordpressUrl.message}</p>
                  )}
                  <p className="text-xs text-gray-500">
                    Esta URL é utilizada quando o SatiZap está em produção
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="wordpressUrlDev">URL do WordPress (Desenvolvimento)</Label>
                  <Input
                    id="wordpressUrlDev"
                    {...form.register('wordpressUrlDev')}
                    placeholder="https://sistema.local ou http://localhost:8080 (opcional)"
                  />
                  {form.formState.errors.wordpressUrlDev && (
                    <p className="text-sm text-red-600">{form.formState.errors.wordpressUrlDev.message}</p>
                  )}
                  <p className="text-xs text-gray-500">
                    Esta URL é utilizada para testes quando o SatiZap está rodando em desenvolvimento
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Public Display Tab */}
          <TabsContent value="public" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Exibição Pública</CardTitle>
                <CardDescription>
                  Como a associação aparece para os pacientes
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="publicDisplayName">Nome de Exibição</Label>
                  <Input
                    id="publicDisplayName"
                    {...form.register('publicDisplayName')}
                    placeholder="Nome que aparece para os pacientes"
                  />
                  <p className="text-xs text-gray-500">
                    Se não preenchido, será usado o nome da associação
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="logoUrl">URL do Logo</Label>
                  <Input
                    id="logoUrl"
                    {...form.register('logoUrl')}
                    placeholder="https://exemplo.com/logo.png"
                  />
                  {form.formState.errors.logoUrl && (
                    <p className="text-sm text-red-600">{form.formState.errors.logoUrl.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="welcomeMessage">Mensagem de Boas-vindas</Label>
                  <Textarea
                    id="welcomeMessage"
                    {...form.register('welcomeMessage')}
                    placeholder="Mensagem personalizada de boas-vindas para novos pacientes"
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* API Configuration Tab - Enhanced with Optional Integration */}
          <TabsContent value="api" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Integração WordPress</CardTitle>
                <CardDescription>
                  Configure a integração com WordPress (opcional). Deixe vazio para criar uma associação básica.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* WordPress Integration Status */}
                {!hasWordPressIntegration ? (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Integração WordPress é opcional.</strong> Você pode criar uma associação básica sem WordPress e configurar a integração mais tarde.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Integração WordPress ativada.</strong> Configure as credenciais de autenticação abaixo.
                    </AlertDescription>
                  </Alert>
                )}
                
                {/* WordPress URL Field */}
                <div className="space-y-2">
                  <Label htmlFor="wordpressUrl">URL do WordPress</Label>
                  <Input
                    id="wordpressUrl"
                    {...form.register('wordpressUrl')}
                    placeholder="https://exemplo.com.br (opcional para integração)"
                  />
                  {form.formState.errors.wordpressUrl && (
                    <p className="text-sm text-red-600">{form.formState.errors.wordpressUrl.message}</p>
                  )}
                  <p className="text-xs text-gray-500">
                    Preencha apenas se desejar integração com WordPress
                  </p>
                </div>

                {/* WordPress Integration Configuration - Only show if URL is provided */}
                {hasWordPressIntegration && (
                  <>
                    {/* Authentication Method Selection */}
                    <div className="space-y-4">
                      <Label>Método de Autenticação *</Label>
                      <RadioGroup 
                        value={watchedAuthMethod || ''} 
                        onValueChange={(value) => form.setValue('authMethod', value as 'applicationPassword' | 'wooCommerce')}
                      >
                        <div className="space-y-4">
                          {/* Application Password Option - Primary */}
                          <div className="flex items-start space-x-3 p-4 border rounded-lg">
                            <RadioGroupItem value="applicationPassword" id="applicationPassword" className="mt-1" />
                            <div className="flex-1">
                              <Label htmlFor="applicationPassword" className="text-base font-medium">
                                Application Password (Recomendado)
                              </Label>
                              <p className="text-sm text-gray-600 mt-1">
                                Método mais seguro usando Application Passwords do WordPress.
                                Funciona com qualquer plugin que use a API REST do WordPress.
                              </p>
                              <Badge variant="secondary" className="mt-2">
                                Método Primário
                              </Badge>
                            </div>
                          </div>

                          {/* WooCommerce Option - Fallback */}
                          <div className="flex items-start space-x-3 p-4 border rounded-lg">
                            <RadioGroupItem value="wooCommerce" id="wooCommerce" className="mt-1" />
                            <div className="flex-1">
                              <Label htmlFor="wooCommerce" className="text-base font-medium">
                                WooCommerce REST API
                              </Label>
                              <p className="text-sm text-gray-600 mt-1">
                                Para lojas que usam WooCommerce. Requer chaves de Consumer Key/Secret.
                              </p>
                              <Badge variant="outline" className="mt-2">
                                Método Alternativo
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </RadioGroup>
                      {form.formState.errors.authMethod && (
                        <p className="text-sm text-red-600">{form.formState.errors.authMethod.message}</p>
                      )}
                    </div>

                    <Separator />

                    {/* Application Password Fields */}
                    {watchedAuthMethod === 'applicationPassword' && (
                      <div className="space-y-4">
                        <div className="bg-blue-50 p-4 rounded-lg">
                          <h4 className="font-medium text-blue-900 mb-2">Como obter as credenciais:</h4>
                          <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                            <li>No WordPress, vá em <strong>Usuários → Perfil</strong></li>
                            <li>Role até <strong>"Application Passwords"</strong></li>
                            <li>Digite um nome (ex: "SatiZap API") e clique <strong>"Add New Application Password"</strong></li>
                            <li>Copie o nome de usuário e a senha gerada</li>
                          </ol>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="appPasswordUsername">Nome de Usuário *</Label>
                            <Input
                              id="appPasswordUsername"
                              {...form.register('appPasswordUsername')}
                              placeholder="usuario"
                              type="text"
                            />
                            {form.formState.errors.appPasswordUsername && (
                              <p className="text-sm text-red-600">{form.formState.errors.appPasswordUsername.message}</p>
                            )}
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="appPasswordPassword">Application Password *</Label>
                            <div className="relative">
                              <Input
                                id="appPasswordPassword"
                                {...form.register('appPasswordPassword', {
                                  onChange: (e) => {
                                    // Sanitize password - remove all whitespace
                                    const sanitized = e.target.value.replace(/\s/g, '');
                                    form.setValue('appPasswordPassword', sanitized);
                                  }
                                })}
                                placeholder="xxxx xxxx xxxx xxxx"
                                type={showAppPassword ? "text" : "password"}
                                className="pr-10"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                onClick={() => setShowAppPassword(!showAppPassword)}
                              >
                                {showAppPassword ? (
                                  <EyeOff className="h-4 w-4" />
                                ) : (
                                  <Eye className="h-4 w-4" />
                                )}
                                <span className="sr-only">
                                  {showAppPassword ? "Ocultar senha" : "Mostrar senha"}
                                </span>
                              </Button>
                            </div>
                            <p className="text-xs text-yellow-600 flex items-center gap-1">
                              <Info className="h-3 w-3" />
                              Cole a senha exatamente como gerada pelo WordPress. Os espaços serão removidos automaticamente.
                            </p>
                            {form.formState.errors.appPasswordPassword && (
                              <p className="text-sm text-red-600">{form.formState.errors.appPasswordPassword.message}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* WooCommerce Fields */}
                    {watchedAuthMethod === 'wooCommerce' && (
                      <div className="space-y-4">
                        <div className="bg-orange-50 p-4 rounded-lg">
                          <h4 className="font-medium text-orange-900 mb-2">Como obter as chaves WooCommerce:</h4>
                          <ol className="text-sm text-orange-800 space-y-1 list-decimal list-inside">
                            <li>No WordPress, vá em <strong>WooCommerce → Configurações → Avançado → REST API</strong></li>
                            <li>Clique <strong>"Adicionar chave"</strong></li>
                            <li>Escolha <strong>Permissões: "Leitura/Escrita"</strong></li>
                            <li>Copie a Consumer Key e Consumer Secret</li>
                          </ol>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="wooCommerceKey">Consumer Key *</Label>
                            <Input
                              id="wooCommerceKey"
                              {...form.register('wooCommerceKey')}
                              placeholder="ck_xxxxxxxxxx"
                              type="text"
                            />
                            {form.formState.errors.wooCommerceKey && (
                              <p className="text-sm text-red-600">{form.formState.errors.wooCommerceKey.message}</p>
                            )}
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="wooCommerceSecret">Consumer Secret *</Label>
                            <div className="relative">
                              <Input
                                id="wooCommerceSecret"
                                {...form.register('wooCommerceSecret')}
                                placeholder="cs_xxxxxxxxxx"
                                type={showWooCommerceSecret ? "text" : "password"}
                                className="pr-10"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                onClick={() => setShowWooCommerceSecret(!showWooCommerceSecret)}
                              >
                                {showWooCommerceSecret ? (
                                  <EyeOff className="h-4 w-4" />
                                ) : (
                                  <Eye className="h-4 w-4" />
                                )}
                                <span className="sr-only">
                                  {showWooCommerceSecret ? "Ocultar senha" : "Mostrar senha"}
                                </span>
                              </Button>
                            </div>
                            {form.formState.errors.wooCommerceSecret && (
                              <p className="text-sm text-red-600">{form.formState.errors.wooCommerceSecret.message}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Endpoint Diagnostics - Only show for existing associations with WordPress integration */}
                {association && (hasWordPressIntegration || hasWordPressDevIntegration) && (
                  <div className="space-y-4">
                    <Separator />
                    
                    <EndpointDiagnostics associationId={association.id} />
                    
                    <Separator />
                  </div>
                )}

                {/* Test Connection - Only show if WordPress integration is configured */}
                {(hasWordPressIntegration || hasWordPressDevIntegration) && (
                  <div className="space-y-4">
                    <Separator />
                    
                    {/* Pre-save validation option */}
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="preSaveValidation"
                        checked={preSaveValidation}
                        onCheckedChange={(checked) => setPreSaveValidation(checked as boolean)}
                      />
                      <Label htmlFor="preSaveValidation" className="text-sm font-normal">
                        Testar conexão antes de salvar (recomendado)
                      </Label>
                    </div>
                    <p className="text-xs text-gray-500 ml-6">
                      Quando habilitado, a conexão WordPress será testada automaticamente antes de salvar
                    </p>
                    
                    {/* Environment-specific test buttons */}
                    <div className="space-y-6">
                      <h4 className="font-medium">Testar Conexões Por Ambiente</h4>
                      <p className="text-sm text-gray-600">
                        Teste as configurações de cada ambiente para verificar se estão funcionando
                      </p>
                      
                      {/* Production Test Section */}
                      {hasWordPressIntegration && (
                        <div className="border rounded-lg p-4 bg-blue-50">
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <h5 className="font-medium text-blue-900">Ambiente de Produção</h5>
                              <p className="text-sm text-blue-700">
                                URL: {watchedWordPressUrl}
                              </p>
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => testApiConfiguration('production')}
                              disabled={testStatusProd === 'testing' || !hasWordPressIntegration || !watchedAuthMethod}
                              className="bg-white"
                            >
                              {testStatusProd === 'testing' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                              Testar Produção
                            </Button>
                          </div>
                          
                          {/* Production Test Results */}
                          {testStatusProd !== 'idle' && (
                            <Alert className={testStatusProd === 'success' ? 'border-green-200 bg-green-50' : testStatusProd === 'error' ? 'border-red-200 bg-red-50' : 'border-blue-200 bg-blue-50'}>
                              {testStatusProd === 'success' && <CheckCircle className="h-4 w-4 text-green-600" />}
                              {testStatusProd === 'error' && <XCircle className="h-4 w-4 text-red-600" />}
                              {testStatusProd === 'testing' && <Loader2 className="h-4 w-4 animate-spin text-blue-600" />}
                              <AlertDescription className="flex items-center justify-between">
                                <span>{testMessageProd}</span>
                                {testDetailsProd && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => copyToClipboard(JSON.stringify(testDetailsProd, null, 2))}
                                    className="h-6 px-2 text-xs"
                                  >
                                    <Copy className="h-3 w-3 mr-1" />
                                    Copiar Detalhes
                                  </Button>
                                )}
                              </AlertDescription>
                            </Alert>
                          )}
                        </div>
                      )}
                      
                      {/* Development Test Section */}
                      {hasWordPressDevIntegration && (
                        <div className="border rounded-lg p-4 bg-orange-50">
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <h5 className="font-medium text-orange-900">Ambiente de Desenvolvimento</h5>
                              <p className="text-sm text-orange-700">
                                URL: {watchedWordPressUrlDev}
                              </p>
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => testApiConfiguration('development')}
                              disabled={testStatusDev === 'testing' || !hasWordPressDevIntegration || !watchedAuthMethod}
                              className="bg-white"
                            >
                              {testStatusDev === 'testing' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                              Testar Desenvolvimento
                            </Button>
                          </div>
                          
                          {/* Development Test Results */}
                          {testStatusDev !== 'idle' && (
                            <Alert className={testStatusDev === 'success' ? 'border-green-200 bg-green-50' : testStatusDev === 'error' ? 'border-red-200 bg-red-50' : 'border-blue-200 bg-blue-50'}>
                              {testStatusDev === 'success' && <CheckCircle className="h-4 w-4 text-green-600" />}
                              {testStatusDev === 'error' && <XCircle className="h-4 w-4 text-red-600" />}
                              {testStatusDev === 'testing' && <Loader2 className="h-4 w-4 animate-spin text-blue-600" />}
                              <AlertDescription className="flex items-center justify-between">
                                <span>{testMessageDev}</span>
                                {testDetailsDev && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => copyToClipboard(JSON.stringify(testDetailsDev, null, 2))}
                                    className="h-6 px-2 text-xs"
                                  >
                                    <Copy className="h-3 w-3 mr-1" />
                                    Copiar Detalhes
                                  </Button>
                                )}
                              </AlertDescription>
                            </Alert>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* AI Guidelines Tab */}
          <TabsContent value="ai" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Diretrizes de IA</CardTitle>
                <CardDescription>
                  Configure como a IA deve se comportar para esta associação
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="promptContext">Contexto da Associação</Label>
                  <Textarea
                    id="promptContext"
                    {...form.register('promptContext')}
                    placeholder="Descreva a associação, especialidades, valores, etc."
                    rows={3}
                  />
                  <p className="text-xs text-gray-500">
                    Informações sobre a associação que a IA deve conhecer
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="aiDirectives">Diretrizes da IA</Label>
                  <Textarea
                    id="aiDirectives"
                    {...form.register('aiDirectives')}
                    placeholder="Como a IA deve se comportar, tom de voz, abordagem, etc."
                    rows={4}
                  />
                  <p className="text-xs text-gray-500">
                    Instruções sobre como a IA deve interagir com os pacientes
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="aiRestrictions">Restrições da IA</Label>
                  <Textarea
                    id="aiRestrictions"
                    {...form.register('aiRestrictions')}
                    placeholder="O que a IA NÃO deve fazer ou falar"
                    rows={3}
                  />
                  <p className="text-xs text-gray-500">
                    Limitações e comportamentos que devem ser evitados
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users Management Tab */}
          <TabsContent value="users" className="space-y-6">
            {association && <UserManagementTab associationId={association.id} />}
            {!association && (
              <Card>
                <CardHeader>
                  <CardTitle>Gerenciamento de Usuários</CardTitle>
                  <CardDescription>
                    Salve a associação primeiro para gerenciar usuários
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      O gerenciamento de usuários estará disponível após criar a associação.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Form Actions */}
        <div className="flex items-center justify-end space-x-4 pt-6 border-t">
          {validationInProgress && (
            <div className="flex items-center text-sm text-blue-600">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Validando conexão...
            </div>
          )}
          <Button
            type="submit"
            disabled={isSubmitting || isLoading || validationInProgress}
            className="min-w-[120px]"
          >
            {(isSubmitting || isLoading || validationInProgress) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {validationInProgress ? 'Validando...' : (association ? 'Atualizar' : 'Criar') + ' Associação'}
          </Button>
        </div>
      </form>
    </div>
  );
}