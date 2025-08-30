'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Home, Bug, Database, Terminal } from 'lucide-react';

interface DebugInfo {
  hostname: string;
  pathname: string;
  requestedTenant: string;
  isDevelopment: boolean;
  hasDevHeaders: boolean;
  middlewareError: string | null;
  fallbackMode: string | null;
}

export default function AssociationNotFoundPage() {
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);

  useEffect(() => {
    // Get debug information from the current request
    const hostname = window.location.hostname;
    const pathname = window.location.pathname;
    const isDevelopment = process.env.NODE_ENV === 'development' || hostname.includes('localhost');
    
    // Extract tenant from path or subdomain
    let requestedTenant = '';
    if (hostname.includes('localhost')) {
      const pathSegments = pathname.split('/').filter(s => s.length > 0);
      requestedTenant = pathSegments[0] || 'none';
    } else {
      requestedTenant = hostname.split('.')[0];
    }
    
    // Check for development headers (these would be set by middleware in development)
    const hasDevHeaders = document.querySelector('meta[name="x-dev-tenant-missing"]') !== null;
    
    const info: DebugInfo = {
      hostname,
      pathname,
      requestedTenant,
      isDevelopment,
      hasDevHeaders,
      middlewareError: null,
      fallbackMode: null
    };
    
    setDebugInfo(info);
    
    // Log the invalid subdomain/tenant attempt
    console.warn(`Invalid tenant attempted:`, info);
  }, []);

  const handleGoToMain = () => {
    // In development, go to localhost root, in production go to main site
    if (debugInfo?.isDevelopment) {
      window.location.href = 'http://localhost:9002/';
    } else {
      window.location.href = 'https://satizap.app';
    }
  };

  const handleRunSeedScript = () => {
    const commands = [
      'npm run seed:test',
      'npm run db:health',
      'npm run db:setup'
    ];
    const commandText = commands.join('\n');
    
    if (navigator.clipboard) {
      navigator.clipboard.writeText('npm run db:setup').then(() => {
        alert(`Comandos disponíveis copiados para clipboard:\n\n${commandText}\n\nExecute no terminal para criar dados de teste e verificar saúde do banco.`);
      });
    } else {
      alert(`Execute um dos comandos no terminal:\n\n${commandText}\n\nRecomendado: npm run db:setup (executa seed + verificação)`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-4">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
            <CardTitle className="text-xl font-semibold text-gray-900">
              Associação Não Encontrada
            </CardTitle>
            <CardDescription className="text-gray-600">
              O endereço que você tentou acessar não corresponde a nenhuma associação ativa no sistema SATIZAP.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-gray-500 text-center">
              <p>Verifique se:</p>
              <ul className="mt-2 text-left list-disc list-inside space-y-1">
                <li>O endereço foi digitado corretamente</li>
                <li>A associação está ativa no sistema</li>
                <li>Você recebeu o link correto da associação</li>
              </ul>
            </div>
            
            <div className="flex flex-col gap-2">
              <Button 
                onClick={handleGoToMain}
                className="w-full"
              >
                <Home className="mr-2 h-4 w-4" />
                {debugInfo?.isDevelopment ? 'Ir para Hero Section' : 'Ir para o Site Principal'}
              </Button>
              
              <Button 
                variant="outline" 
                onClick={() => window.location.reload()}
                className="w-full"
              >
                Tentar Novamente
              </Button>
            </div>
            
            <div className="text-xs text-gray-400 text-center pt-4 border-t">
              Se você é administrador de uma associação, entre em contato com o suporte técnico.
            </div>
          </CardContent>
        </Card>

        {/* Development Debug Information */}
        {debugInfo?.isDevelopment && (
          <Card className="border-orange-200 bg-orange-50">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-orange-800 flex items-center">
                <Bug className="mr-2 h-5 w-5" />
                Informações de Debug (Desenvolvimento)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <strong>Hostname:</strong> {debugInfo.hostname}
                </div>
                <div>
                  <strong>Pathname:</strong> {debugInfo.pathname}
                </div>
                <div>
                  <strong>Tenant Solicitado:</strong> {debugInfo.requestedTenant}
                </div>
                <div>
                  <strong>Ambiente:</strong> {debugInfo.isDevelopment ? 'Desenvolvimento' : 'Produção'}
                </div>
              </div>

              <div className="bg-white p-3 rounded border">
                <h4 className="font-semibold text-orange-800 mb-2 flex items-center">
                  <Database className="mr-2 h-4 w-4" />
                  Possíveis Soluções
                </h4>
                <ul className="text-sm space-y-1 list-disc list-inside">
                  <li>Verificar se a associação "{debugInfo.requestedTenant}" existe no banco de dados</li>
                  <li>Verificar se a associação está marcada como ativa (isActive = true)</li>
                  <li>Executar script de seed para criar dados de teste: <code className="bg-gray-100 px-1 rounded">npm run db:setup</code></li>
                  <li>Verificar logs do middleware no console do navegador (F12)</li>
                  <li>Verificar conectividade com banco: <code className="bg-gray-100 px-1 rounded">npm run db:health</code></li>
                  <li>Testar middleware: <code className="bg-gray-100 px-1 rounded">npm run test:middleware</code></li>
                </ul>
              </div>

              <div className="bg-blue-50 p-3 rounded border border-blue-200">
                <h4 className="font-semibold text-blue-800 mb-2">Scripts Disponíveis</h4>
                <div className="text-sm space-y-1">
                  <div><code className="bg-blue-100 px-2 py-1 rounded text-xs">npm run seed:test</code> - Criar dados de teste</div>
                  <div><code className="bg-blue-100 px-2 py-1 rounded text-xs">npm run db:health</code> - Verificar saúde do banco</div>
                  <div><code className="bg-blue-100 px-2 py-1 rounded text-xs">npm run db:setup</code> - Setup completo (seed + health)</div>
                  <div><code className="bg-blue-100 px-2 py-1 rounded text-xs">npm run test:middleware</code> - Testar middleware</div>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Button 
                  variant="outline" 
                  onClick={handleRunSeedScript}
                  className="w-full text-orange-700 border-orange-300 hover:bg-orange-100"
                >
                  <Terminal className="mr-2 h-4 w-4" />
                  Copiar Comandos de Setup
                </Button>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => window.open('http://localhost:9002/', '_blank')}
                    className="text-orange-700 border-orange-300 hover:bg-orange-100"
                  >
                    <Home className="mr-2 h-4 w-4" />
                    Hero Section
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    onClick={() => window.open('http://localhost:9002/admin', '_blank')}
                    className="text-orange-700 border-orange-300 hover:bg-orange-100"
                  >
                    <Terminal className="mr-2 h-4 w-4" />
                    Admin Panel
                  </Button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      const logMessage = `
Para debugging detalhado:
1. Abra o Console do Navegador (F12)
2. Procure por logs com [MIDDLEWARE DEBUG] ou [MIDDLEWARE FLOW]
3. Verifique se há erros de conexão com banco de dados
4. Execute: npm run verify:middleware no terminal
                      `.trim();
                      alert(logMessage);
                    }}
                    className="text-blue-700 border-blue-300 hover:bg-blue-100"
                  >
                    <Bug className="mr-2 h-4 w-4" />
                    Guia de Debugging
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    onClick={() => window.open('http://localhost:9002/dev-docs', '_blank')}
                    className="text-green-700 border-green-300 hover:bg-green-100"
                  >
                    <Bug className="mr-2 h-4 w-4" />
                    Documentação Dev
                  </Button>
                </div>
              </div>

              <div className="text-xs text-orange-600 bg-orange-100 p-2 rounded">
                <strong>Dica:</strong> Em desenvolvimento, o middleware permite acesso gracioso mesmo quando o tenant não é encontrado. 
                Esta página é mostrada para fins informativos.
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}