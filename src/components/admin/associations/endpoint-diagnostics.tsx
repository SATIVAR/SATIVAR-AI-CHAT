'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { 
  CheckCircle, 
  XCircle, 
  Loader2, 
  Phone, 
  ShoppingCart, 
  Package, 
  Users, 
  FileText,
  Copy,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface DiagnosticResult {
  testName: string;
  success: boolean;
  statusCode?: number;
  responseTime: number;
  url: string;
  response?: any;
  error?: string;
  details?: any;
}

interface DiagnosticResponse {
  success: boolean;
  associationName: string;
  wordpressUrl: string;
  testsRun: number;
  results: DiagnosticResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    averageResponseTime: number;
  };
}

interface EndpointDiagnosticsProps {
  associationId: string;
}

export function EndpointDiagnostics({ associationId }: EndpointDiagnosticsProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<DiagnosticResponse | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('85996201636');
  const { toast } = useToast();

  const runDiagnostic = async (testType: string, testData?: any) => {
    setIsRunning(true);
    
    try {
      const response = await fetch(`/api/admin/associations/${associationId}/endpoint-diagnostics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          testType,
          testData
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        setResults(result);
        toast({
          title: 'Diagnóstico Concluído',
          description: `${result.summary.passed}/${result.summary.total} testes passaram`,
        });
      } else {
        toast({
          title: 'Erro no Diagnóstico',
          description: result.error || 'Erro desconhecido',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Erro de Conexão',
        description: 'Não foi possível executar o diagnóstico',
        variant: 'destructive',
      });
    } finally {
      setIsRunning(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: 'Copiado!',
        description: 'Dados copiados para a área de transferência',
      });
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const formatResponseTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const getStatusIcon = (success: boolean) => {
    return success ? (
      <CheckCircle className="h-4 w-4 text-green-600" />
    ) : (
      <XCircle className="h-4 w-4 text-red-600" />
    );
  };

  const getStatusBadge = (success: boolean, statusCode?: number) => {
    if (success) {
      return <Badge variant="secondary" className="bg-green-100 text-green-800">Sucesso</Badge>;
    }
    return (
      <Badge variant="destructive">
        {statusCode ? `Erro ${statusCode}` : 'Falha'}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Diagnóstico de Endpoints
        </CardTitle>
        <CardDescription>
          Teste funcionalidades específicas da integração WordPress para identificar problemas
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Test Controls */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Phone Search Test */}
            <div className="space-y-3">
              <Label htmlFor="phoneTest">Teste de Busca por Telefone</Label>
              <div className="flex gap-2">
                <Input
                  id="phoneTest"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="85996201636"
                  className="flex-1"
                />
                <Button
                  onClick={() => runDiagnostic('searchPatientByPhone', { phone: phoneNumber })}
                  disabled={isRunning}
                  size="sm"
                >
                  {isRunning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Phone className="mr-2 h-4 w-4" />
                  Testar
                </Button>
              </div>
              <p className="text-xs text-gray-500">
                Testa o endpoint customizado /wp-json/sativar/v1/clientes
              </p>
            </div>

            {/* Quick Tests */}
            <div className="space-y-3">
              <Label>Testes Rápidos</Label>
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => runDiagnostic('listProducts')}
                  disabled={isRunning}
                  variant="outline"
                  size="sm"
                >
                  <Package className="mr-2 h-4 w-4" />
                  Produtos
                </Button>
                <Button
                  onClick={() => runDiagnostic('listOrders')}
                  disabled={isRunning}
                  variant="outline"
                  size="sm"
                >
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  Pedidos
                </Button>
                <Button
                  onClick={() => runDiagnostic('listUsers')}
                  disabled={isRunning}
                  variant="outline"
                  size="sm"
                >
                  <Users className="mr-2 h-4 w-4" />
                  Usuários
                </Button>
              </div>
            </div>
          </div>

          <Separator />

          {/* Run All Tests */}
          <div className="flex justify-center">
            <Button
              onClick={() => runDiagnostic('all')}
              disabled={isRunning}
              className="min-w-[200px]"
            >
              {isRunning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <FileText className="mr-2 h-4 w-4" />
              Executar Todos os Testes
            </Button>
          </div>
        </div>

        {/* Results */}
        {results && (
          <div className="space-y-4">
            <Separator />
            
            {/* Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-green-600">{results.summary.passed}</div>
                  <div className="text-sm text-gray-500">Testes Passaram</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-red-600">{results.summary.failed}</div>
                  <div className="text-sm text-gray-500">Testes Falharam</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold">{results.summary.total}</div>
                  <div className="text-sm text-gray-500">Total de Testes</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold flex items-center">
                    <Clock className="mr-1 h-4 w-4" />
                    {formatResponseTime(results.summary.averageResponseTime)}
                  </div>
                  <div className="text-sm text-gray-500">Tempo Médio</div>
                </CardContent>
              </Card>
            </div>

            {/* Detailed Results */}
            <Accordion type="single" collapsible className="w-full">
              {results.results.map((result, index) => (
                <AccordionItem key={index} value={`test-${index}`}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center justify-between w-full mr-4">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(result.success)}
                        <span className="font-medium">{result.testName}</span>
                        {getStatusBadge(result.success, result.statusCode)}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Clock className="h-3 w-3" />
                        {formatResponseTime(result.responseTime)}
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4 pt-2">
                      {/* Test Details */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <Label className="text-xs font-medium text-gray-500">URL TESTADA</Label>
                          <div className="font-mono text-xs bg-gray-100 p-2 rounded break-all">
                            {result.url}
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs font-medium text-gray-500">MÉTODO</Label>
                          <div className="font-mono text-xs bg-gray-100 p-2 rounded">
                            {result.details?.method || 'GET'}
                          </div>
                        </div>
                      </div>

                      {/* Error Details */}
                      {result.error && (
                        <Alert variant="destructive">
                          <XCircle className="h-4 w-4" />
                          <AlertDescription>
                            <strong>Erro:</strong> {result.error}
                          </AlertDescription>
                        </Alert>
                      )}

                      {/* Response Data */}
                      {result.response && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs font-medium text-gray-500">RESPOSTA</Label>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(JSON.stringify(result.response, null, 2))}
                              className="h-6 px-2 text-xs"
                            >
                              <Copy className="h-3 w-3 mr-1" />
                              Copiar
                            </Button>
                          </div>
                          <div className="font-mono text-xs bg-gray-100 p-3 rounded max-h-40 overflow-auto">
                            <pre>{JSON.stringify(result.response, null, 2)}</pre>
                          </div>
                        </div>
                      )}

                      {/* Description */}
                      {result.details?.description && (
                        <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded">
                          <strong>Descrição:</strong> {result.details.description}
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        )}
      </CardContent>
    </Card>
  );
}