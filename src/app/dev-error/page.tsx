'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Home, Bug, Database, Terminal, RefreshCw, ExternalLink } from 'lucide-react';

interface DevErrorInfo {
  type: string;
  message: string;
  tenant: string;
  timestamp: string;
  url: string;
  suggestions: string[];
}

function DevErrorContent() {
  const searchParams = useSearchParams();
  const [errorInfo, setErrorInfo] = useState<DevErrorInfo | null>(null);

  useEffect(() => {
    const type = searchParams.get('type') || 'unknown';
    const message = searchParams.get('message') || 'Erro desconhecido em desenvolvimento';
    const tenant = searchParams.get('tenant') || 'none';
    
    const errorMap: Record<string, DevErrorInfo> = {
      'tenant-not-found': {
        type: 'tenant-not-found',
        message: 'Associação não encontrada no banco de dados',
        tenant,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        suggestions: [
          'Executar npm run seed:test para criar dados de teste',
          'Verificar se o banco de dados está rodando',
          'Confirmar se a associação existe com npm run db:health',
          'Verificar logs do middleware no console (F12)'
        ]
      },
      'tenant-inactive': {
        type: 'tenant-inactive',
        message: 'Associação encontrada mas está inativa',
        tenant,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        suggestions: [
          'Verificar campo isActive da associação no banco',
          'Executar script de ativação da associação',
          'Confirmar configuração da associação no admin panel',
          'Verificar se há problemas de migração do banco'
        ]
      },
      'middleware-error': {
        type: 'middleware-error',
        message: 'Erro interno do middleware',
        tenant,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        suggestions: [
          'Verificar logs detalhados no console do navegador',
          'Executar npm run test:middleware para diagnosticar',
          'Verificar conectividade com banco: npm run db:health',
          'Reiniciar servidor de desenvolvimento'
        ]
      },
      'database-error': {
        type: 'database-error',
        message: 'Erro de conexão com banco de dados',
        tenant,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        suggestions: [
          'Verificar se o banco de dados está rodando',
          'Confirmar variáveis de ambiente (.env)',
          'Executar npm run db:health para diagnóstico',
          'Verificar logs do Prisma no terminal'
        ]
      }
    };

    const info = errorMap[type] || {
      type: 'unknown',
      message: decodeURIComponent(message),
      tenant,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      suggestions: [
        'Verificar logs do console do navegador (F12)',
        'Executar npm run db:setup para reset completo',
        'Verificar se todos os serviços estão rodando',
        'Consultar documentação de desenvolvimento'
      ]
    };

    setErrorInfo(info);
  }, [searchParams]);

  const handleCopyCommands = () => {
    const commands = [
      'npm run db:setup',
      'npm run test:middleware',
      'npm run verify:middleware'
    ].join('\n');
    
    if (navigator.clipboard) {
      navigator.clipboard.writeText(commands).then(() => {
        alert('Comandos de diagnóstico copiados para clipboard!');
      });
    } else {
      alert(`Comandos de diagnóstico:\n\n${commands}`);
    }
  };

  const handleOpenLogs = () => {
    alert(`
Para acessar logs detalhados:

1. Abra o Console do Navegador (F12)
2. Procure por mensagens com:
   - [MIDDLEWARE DEBUG]
   - [MIDDLEWARE FLOW] 
   - [MIDDLEWARE ERROR]
3. Verifique a aba Network para erros de API
4. Execute 'npm run verify:middleware' no terminal

Informações do erro:
- Tipo: ${errorInfo?.type}
- Tenant: ${errorInfo?.tenant}
- Timestamp: ${errorInfo?.timestamp}
    `.trim());
  };

  if (!errorInfo) {
    return <div>Carregando informações do erro...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex items-center justify-center p-4">
      <div className="w-full max-w-3xl space-y-4">
        <Card className="border-red-200">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
            <CardTitle className="text-xl font-semibold text-red-900">
              Erro de Desenvolvimento
            </CardTitle>
            <CardDescription className="text-red-700">
              {errorInfo.message}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
              <h3 className="font-semibold text-red-800 mb-2">Detalhes do Erro</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                <div><strong>Tipo:</strong> {errorInfo.type}</div>
                <div><strong>Tenant:</strong> {errorInfo.tenant}</div>
                <div><strong>Timestamp:</strong> {new Date(errorInfo.timestamp).toLocaleString()}</div>
                <div className="md:col-span-2"><strong>URL:</strong> {errorInfo.url}</div>
              </div>
            </div>

            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              <h3 className="font-semibold text-yellow-800 mb-2 flex items-center">
                <Bug className="mr-2 h-4 w-4" />
                Sugestões de Solução
              </h3>
              <ul className="text-sm space-y-1 list-disc list-inside text-yellow-700">
                {errorInfo.suggestions.map((suggestion, index) => (
                  <li key={index}>{suggestion}</li>
                ))}
              </ul>
            </div>

            <div className="flex flex-col gap-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <Button 
                  onClick={() => window.location.href = 'http://localhost:9002/'}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Home className="mr-2 h-4 w-4" />
                  Voltar ao Início
                </Button>
                
                <Button 
                  variant="outline"
                  onClick={() => window.location.reload()}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Tentar Novamente
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <Button 
                  variant="outline" 
                  onClick={handleCopyCommands}
                  className="text-orange-700 border-orange-300 hover:bg-orange-100"
                >
                  <Terminal className="mr-2 h-4 w-4" />
                  Copiar Comandos
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={handleOpenLogs}
                  className="text-purple-700 border-purple-300 hover:bg-purple-100"
                >
                  <Bug className="mr-2 h-4 w-4" />
                  Ver Logs
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={() => window.open('http://localhost:9002/dev-docs', '_blank')}
                  className="text-green-700 border-green-300 hover:bg-green-100"
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Documentação
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions Card */}
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-blue-800 flex items-center">
              <Terminal className="mr-2 h-5 w-5" />
              Ações Rápidas de Desenvolvimento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <h4 className="font-semibold text-blue-800">Scripts de Diagnóstico</h4>
                <div className="space-y-1">
                  <div><code className="bg-blue-100 px-2 py-1 rounded text-xs">npm run db:health</code> - Verificar banco</div>
                  <div><code className="bg-blue-100 px-2 py-1 rounded text-xs">npm run seed:test</code> - Criar dados teste</div>
                  <div><code className="bg-blue-100 px-2 py-1 rounded text-xs">npm run test:middleware</code> - Testar middleware</div>
                </div>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-semibold text-blue-800">Links Úteis</h4>
                <div className="space-y-1">
                  <div><a href="http://localhost:9002/" className="text-blue-600 hover:underline">Hero Section</a></div>
                  <div><a href="http://localhost:9002/admin" className="text-blue-600 hover:underline">Admin Panel</a></div>
                  <div><a href="http://localhost:9002/sativar" className="text-blue-600 hover:underline">Teste Sativar</a></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function DevErrorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex items-center justify-center p-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">Carregando informações do erro...</div>
          </CardContent>
        </Card>
      </div>
    }>
      <DevErrorContent />
    </Suspense>
  );
}