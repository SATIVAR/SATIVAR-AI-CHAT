'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, XCircle, Loader2, AlertTriangle, Info, Eye, EyeOff, 
         Settings, Globe, Brain, Users, ArrowRight, ArrowLeft, Save, Home } from 'lucide-react';
import { 
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Association, ApiConfig } from '@/lib/types';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { UserManagementTab } from './user-management-tab';

// Schema de validação simplificado por seção
const generalSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  subdomain: z.string()
    .min(3, 'Subdomínio deve ter pelo menos 3 caracteres')
    .regex(/^[a-z0-9-]+$/, 'Subdomínio deve conter apenas letras minúsculas, números e hífens'),
});

const publicSchema = z.object({
  publicDisplayName: z.string().optional(),
  logoUrl: z.string().url('URL do logo deve ser válida').optional().or(z.literal('')),
  welcomeMessage: z.string().optional(),
});

const apiSchema = z.object({
  wordpressUrl: z.string().url('URL deve ser válida').optional().or(z.literal('')),
  wordpressUrlDev: z.string().url('URL de desenvolvimento deve ser válida').optional().or(z.literal('')),
  authMethod: z.enum(['applicationPassword', 'wooCommerce']).optional(),
  appPasswordUsername: z.string().optional(),
  appPasswordPassword: z.string().optional(),
  wooCommerceKey: z.string().optional(),
  wooCommerceSecret: z.string().optional(),
});

const aiSchema = z.object({
  promptContext: z.string().optional(),
  aiDirectives: z.string().optional(),
  aiRestrictions: z.string().optional(),
});

type AssociationFormData = z.infer<typeof generalSchema> & 
                          z.infer<typeof publicSchema> & 
                          z.infer<typeof apiSchema> & 
                          z.infer<typeof aiSchema>;

interface AssociationFormProps {
  association?: Association;
  onSubmit: (data: Partial<Association>) => Promise<void>;
  isLoading?: boolean;
}

interface FormSection {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  required: boolean;
}

const formSections: FormSection[] = [
  {
    id: 'general',
    title: 'Informações Gerais',
    description: 'Dados básicos da associação',
    icon: Settings,
    required: true
  },
  {
    id: 'public',
    title: 'Exibição Pública',
    description: 'Como aparece para os pacientes',
    icon: Globe,
    required: false
  },
  {
    id: 'api',
    title: 'Integração WordPress',
    description: 'Configuração da API (opcional)',
    icon: Settings,
    required: false
  },
  {
    id: 'ai',
    title: 'Diretrizes de IA',
    description: 'Comportamento da inteligência artificial',
    icon: Brain,
    required: false
  },
  {
    id: 'users',
    title: 'Gerenciamento de Usuários',
    description: 'Gerentes da associação',
    icon: Users,
    required: false
  }
];

export function AssociationFormRedesigned({ association, onSubmit, isLoading = false }: AssociationFormProps) {
  const [currentSection, setCurrentSection] = useState('general');
  const [completedSections, setCompletedSections] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAppPassword, setShowAppPassword] = useState(false);
  const [showWooCommerceSecret, setShowWooCommerceSecret] = useState(false);
  const { toast } = useToast();

  // Parse existing API configuration
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
    resolver: zodResolver(z.object({
      ...generalSchema.shape,
      ...publicSchema.shape,
      ...apiSchema.shape,
      ...aiSchema.shape,
    })),
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

  // Validar seção atual
  const validateCurrentSection = async () => {
    const values = form.getValues();
    let isValid = false;

    try {
      switch (currentSection) {
        case 'general':
          // Validação básica para campos obrigatórios
          isValid = !!(values.name && values.subdomain);
          break;
        case 'public':
        case 'api':
        case 'ai':
        case 'users':
          isValid = true; // Seções opcionais sempre válidas
          break;
      }
    } catch (error) {
      isValid = false;
    }

    // Atualizar seções completadas sem causar re-renders
    setCompletedSections(prev => {
      const newSet = new Set(prev);
      if (isValid) {
        newSet.add(currentSection);
      } else {
        newSet.delete(currentSection);
      }
      return newSet;
    });

    return isValid;
  };

  // Navegar para próxima seção
  const goToNextSection = async () => {
    const isValid = await validateCurrentSection();
    if (!isValid && formSections.find(s => s.id === currentSection)?.required) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha todos os campos obrigatórios antes de continuar',
        variant: 'destructive'
      });
      return;
    }

    const currentIndex = formSections.findIndex(s => s.id === currentSection);
    if (currentIndex < formSections.length - 1) {
      setCurrentSection(formSections[currentIndex + 1].id);
    }
  };

  // Navegar para seção anterior
  const goToPreviousSection = () => {
    const currentIndex = formSections.findIndex(s => s.id === currentSection);
    if (currentIndex > 0) {
      setCurrentSection(formSections[currentIndex - 1].id);
    }
  };

  // Calcular progresso
  const progress = (completedSections.size / formSections.length) * 100;

  // Submit do formulário
  const handleSubmit = async (data: AssociationFormData) => {
    setIsSubmitting(true);
    
    try {
      let apiConfig: ApiConfig | undefined = undefined;
      
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
      }

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
        apiConfig: apiConfig,
        wordpressAuth: undefined,
      };

      await onSubmit(associationData);
    } catch (error) {
      console.error('Error submitting form:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Validar seção quando mudar
  useEffect(() => {
    validateCurrentSection();
  }, [currentSection]); // Remover form.watch() para evitar loops

  const currentSectionData = formSections.find(s => s.id === currentSection);
  const currentIndex = formSections.findIndex(s => s.id === currentSection);

  return (
    <div className="flex h-full min-h-[600px]">
      {/* Sidebar de Navegação */}
      <div className="w-80 border-r bg-muted/30 p-6">
        <div className="space-y-6">
          {/* Header com Progresso */}
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold">
                {association ? 'Editar Associação' : 'Nova Associação'}
              </h2>
              <p className="text-sm text-muted-foreground">
                Configure sua associação passo a passo
              </p>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Progresso</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          </div>

          {/* Lista de Seções */}
          <nav className="space-y-2">
            {formSections.map((section, index) => {
              const Icon = section.icon;
              const isActive = currentSection === section.id;
              const isCompleted = completedSections.has(section.id);
              const isAccessible = index === 0 || completedSections.has(formSections[index - 1].id) || !formSections[index - 1].required;

              return (
                <button
                  key={section.id}
                  onClick={() => isAccessible && setCurrentSection(section.id)}
                  disabled={!isAccessible}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${
                    isActive 
                      ? 'bg-primary text-primary-foreground' 
                      : isAccessible
                        ? 'hover:bg-muted'
                        : 'opacity-50 cursor-not-allowed'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {isCompleted ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <Icon className={`h-5 w-5 ${isActive ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{section.title}</span>
                        {section.required && (
                          <Badge variant="secondary" className="text-xs">Obrigatório</Badge>
                        )}
                      </div>
                      <p className={`text-xs mt-1 ${isActive ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                        {section.description}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Conteúdo Principal */}
      <div className="flex-1 flex flex-col">
        <form onSubmit={form.handleSubmit(handleSubmit)} className="flex-1 flex flex-col">
          {/* Header da Seção */}
          <div className="border-b p-6 space-y-4">
            {/* Breadcrumb */}
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="/admin/associations">
                    <Home className="h-4 w-4" />
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink href="/admin/associations">Associações</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>
                    {association ? association.name : 'Nova Associação'}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>

            {/* Título da Seção */}
            <div className="flex items-center gap-3">
              {currentSectionData && (
                <>
                  <currentSectionData.icon className="h-6 w-6 text-primary" />
                  <div>
                    <h1 className="text-xl font-semibold">{currentSectionData.title}</h1>
                    <p className="text-muted-foreground">{currentSectionData.description}</p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Conteúdo da Seção */}
          <div className="flex-1 p-6 overflow-auto">
            {currentSection === 'general' && (
              <GeneralSection form={form} />
            )}
            
            {currentSection === 'public' && (
              <PublicSection form={form} />
            )}
            
            {currentSection === 'api' && (
              <ApiSection 
                form={form} 
                showAppPassword={showAppPassword}
                setShowAppPassword={setShowAppPassword}
                showWooCommerceSecret={showWooCommerceSecret}
                setShowWooCommerceSecret={setShowWooCommerceSecret}
              />
            )}
            
            {currentSection === 'ai' && (
              <AiSection form={form} />
            )}
            
            {currentSection === 'users' && association && (
              <div className="max-w-4xl">
                <UserManagementTab associationId={association.id} />
              </div>
            )}

            {currentSection === 'users' && !association && (
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
          </div>

          {/* Footer com Navegação */}
          <div className="border-t p-6">
            <div className="flex items-center justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={goToPreviousSection}
                disabled={currentIndex === 0}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Anterior
              </Button>

              <div className="flex items-center gap-3">
                {currentIndex === formSections.length - 1 ? (
                  <Button
                    type="submit"
                    disabled={isSubmitting || isLoading}
                    className="min-w-[120px]"
                  >
                    {(isSubmitting || isLoading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Save className="h-4 w-4 mr-2" />
                    {association ? 'Atualizar' : 'Criar'} Associação
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={goToNextSection}
                  >
                    Próximo
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// Componentes das seções
function GeneralSection({ form }: { form: any }) {
  return (
    <div className="max-w-2xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Informações Básicas</CardTitle>
          <CardDescription>
            Dados fundamentais da associação
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
            </div>
          </div>

          <div className="space-y-2">
            <Label>URLs de Acesso</Label>
            <div className="space-y-1 text-sm bg-muted p-3 rounded-md">
              <p><strong>Produção:</strong> {form.watch('subdomain') || 'subdomain'}.satizap.com</p>
              <p><strong>Desenvolvimento:</strong> localhost:9002/{form.watch('subdomain') || 'subdomain'}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function PublicSection({ form }: { form: any }) {
  return (
    <div className="max-w-2xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Aparência Pública</CardTitle>
          <CardDescription>
            Como sua associação aparece para os pacientes
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
            <p className="text-xs text-muted-foreground">
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
    </div>
  );
}

function ApiSection({ form, showAppPassword, setShowAppPassword, showWooCommerceSecret, setShowWooCommerceSecret }: any) {
  const watchedWordPressUrl = form.watch('wordpressUrl');
  const watchedAuthMethod = form.watch('authMethod');
  const hasWordPressIntegration = watchedWordPressUrl && watchedWordPressUrl.trim() !== '';

  return (
    <div className="max-w-2xl space-y-6">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Integração WordPress é opcional.</strong> Você pode criar uma associação básica sem WordPress e configurar a integração mais tarde.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Configuração WordPress</CardTitle>
          <CardDescription>
            Configure a integração com seu sistema WordPress (opcional)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="wordpressUrl">URL do WordPress (Produção)</Label>
            <Input
              id="wordpressUrl"
              {...form.register('wordpressUrl')}
              placeholder="https://sistema.associacao.com.br (opcional)"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="wordpressUrlDev">URL do WordPress (Desenvolvimento)</Label>
            <Input
              id="wordpressUrlDev"
              {...form.register('wordpressUrlDev')}
              placeholder="https://sistema.local (opcional)"
            />
          </div>

          {hasWordPressIntegration && (
            <div className="space-y-4 pt-4 border-t">
              <Label>Método de Autenticação *</Label>
              <RadioGroup 
                value={watchedAuthMethod || ''} 
                onValueChange={(value) => form.setValue('authMethod', value as 'applicationPassword' | 'wooCommerce')}
              >
                <div className="space-y-3">
                  <div className="flex items-center space-x-2 p-3 border rounded-lg">
                    <RadioGroupItem value="applicationPassword" id="applicationPassword" />
                    <div className="flex-1">
                      <Label htmlFor="applicationPassword" className="font-medium">
                        Application Password (Recomendado)
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Método mais seguro usando Application Passwords do WordPress
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 p-3 border rounded-lg">
                    <RadioGroupItem value="wooCommerce" id="wooCommerce" />
                    <div className="flex-1">
                      <Label htmlFor="wooCommerce" className="font-medium">
                        WooCommerce REST API
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Para lojas que usam WooCommerce
                      </p>
                    </div>
                  </div>
                </div>
              </RadioGroup>

              {watchedAuthMethod === 'applicationPassword' && (
                <div className="space-y-3 p-4 bg-muted rounded-lg">
                  <div className="space-y-2">
                    <Label htmlFor="appPasswordUsername">Nome de Usuário</Label>
                    <Input
                      id="appPasswordUsername"
                      {...form.register('appPasswordUsername')}
                      placeholder="admin"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="appPasswordPassword">Application Password</Label>
                    <div className="relative">
                      <Input
                        id="appPasswordPassword"
                        type={showAppPassword ? 'text' : 'password'}
                        {...form.register('appPasswordPassword')}
                        placeholder="xxxx xxxx xxxx xxxx"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowAppPassword(!showAppPassword)}
                      >
                        {showAppPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {watchedAuthMethod === 'wooCommerce' && (
                <div className="space-y-3 p-4 bg-muted rounded-lg">
                  <div className="space-y-2">
                    <Label htmlFor="wooCommerceKey">Consumer Key</Label>
                    <Input
                      id="wooCommerceKey"
                      {...form.register('wooCommerceKey')}
                      placeholder="ck_xxxxxxxxxxxxxxxx"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="wooCommerceSecret">Consumer Secret</Label>
                    <div className="relative">
                      <Input
                        id="wooCommerceSecret"
                        type={showWooCommerceSecret ? 'text' : 'password'}
                        {...form.register('wooCommerceSecret')}
                        placeholder="cs_xxxxxxxxxxxxxxxx"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowWooCommerceSecret(!showWooCommerceSecret)}
                      >
                        {showWooCommerceSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function AiSection({ form }: { form: any }) {
  return (
    <div className="max-w-2xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Configuração da IA</CardTitle>
          <CardDescription>
            Configure como a inteligência artificial deve se comportar
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
            <p className="text-xs text-muted-foreground">
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
            <p className="text-xs text-muted-foreground">
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
            <p className="text-xs text-muted-foreground">
              Limitações e comportamentos que devem ser evitados
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}