'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Home, Terminal, Database, Bug, ExternalLink, Copy } from 'lucide-react';

export default function DevDocsPage() {
  const copyToClipboard = (text: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        alert('Comando copiado para clipboard!');
      });
    } else {
      alert(`Comando: ${text}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-gray-900">
              Documentação de Desenvolvimento - SatiZap
            </CardTitle>
            <CardDescription>
              Guia completo para desenvolvimento e debugging do sistema multi-tenant
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Terminal className="mr-2 h-5 w-5" />
              Ações Rápidas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button 
                onClick={() => window.open('http://localhost:9002/', '_blank')}
                className="h-auto p-4 flex flex-col items-center"
              >
                <Home className="h-6 w-6 mb-2" />
                <span>Hero Section</span>
              </Button>
              <Button 
                onClick={() => window.open('http://localhost:9002/admin', '_blank')}
                variant="outline"
                className="h-auto p-4 flex flex-col items-center"
              >
                <Database className="h-6 w-6 mb-2" />
                <span>Admin Panel</span>
              </Button>
              <Button 
                onClick={() => window.open('http://localhost:9002/sativar', '_blank')}
                variant="outline"
                className="h-auto p-4 flex flex-col items-center"
              >
                <ExternalLink className="h-6 w-6 mb-2" />
                <span>Teste Sativar</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Setup Commands */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Terminal className="mr-2 h-5 w-5" />
              Comandos de Setup
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h3 className="font-semibold">Setup Inicial</h3>
                <div className="space-y-1">
                  <div className="flex items-center justify-between bg-gray-100 p-2 rounded">
                    <code className="text-sm">npm run db:setup</code>
                    <Button size="sm" variant="ghost" onClick={() => copyToClipboard('npm run db:setup')}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-gray-600">Setup completo: seed + verificação de saúde</p>
                </div>
              </div>
              
              <div className="space-y-2">
                <h3 className="font-semibold">Verificação</h3>
                <div className="space-y-1">
                  <div className="flex items-center justify-between bg-gray-100 p-2 rounded">
                    <code className="text-sm">npm run db:health</code>
                    <Button size="sm" variant="ghost" onClick={() => copyToClipboard('npm run db:health')}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-gray-600">Verificar saúde do banco de dados</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Debugging Guide */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Bug className="mr-2 h-5 w-5" />
              Guia de Debugging
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div>
                <h3 className="font-semibold mb-2">1. Verificar Logs do Middleware</h3>
                <ul className="text-sm space-y-1 list-disc list-inside ml-4">
                  <li>Abra o Console do Navegador (F12)</li>
                  <li>Procure por mensagens com <code>[MIDDLEWARE DEBUG]</code></li>
                  <li>Verifique logs de <code>[MIDDLEWARE FLOW]</code> para rastrear o fluxo</li>
                  <li>Erros aparecem como <code>[MIDDLEWARE ERROR]</code></li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-semibold mb-2">2. Testar Middleware</h3>
                <div className="flex items-center justify-between bg-gray-100 p-2 rounded">
                  <code className="text-sm">npm run test:middleware</code>
                  <Button size="sm" variant="ghost" onClick={() => copyToClipboard('npm run test:middleware')}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div>
                <h3 className="font-semibold mb-2">3. Verificar Implementação</h3>
                <div className="flex items-center justify-between bg-gray-100 p-2 rounded">
                  <code className="text-sm">npm run verify:middleware</code>
                  <Button size="sm" variant="ghost" onClick={() => copyToClipboard('npm run verify:middleware')}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* URL Structure */}
        <Card>
          <CardHeader>
            <CardTitle>Estrutura de URLs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <h3 className="font-semibold mb-2">Desenvolvimento (localhost:9002)</h3>
                <ul className="text-sm space-y-1 list-disc list-inside ml-4">
                  <li><code>/</code> - Hero Section (público)</li>
                  <li><code>/sativar</code> - Página da associação Sativar</li>
                  <li><code>/admin</code> - Painel administrativo</li>
                  <li><code>/association-not-found</code> - Erro de associação não encontrada</li>
                  <li><code>/dev-error</code> - Página de erro de desenvolvimento</li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-semibold mb-2">Produção</h3>
                <ul className="text-sm space-y-1 list-disc list-inside ml-4">
                  <li><code>sativar.satizap.app</code> - Subdomínio da associação</li>
                  <li><code>admin.satizap.app</code> - Painel administrativo</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Common Issues */}
        <Card>
          <CardHeader>
            <CardTitle>Problemas Comuns</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="border-l-4 border-yellow-400 pl-4">
                <h3 className="font-semibold text-yellow-800">Associação não encontrada</h3>
                <p className="text-sm text-yellow-700">Execute <code>npm run seed:test</code> para criar dados de teste</p>
              </div>
              
              <div className="border-l-4 border-red-400 pl-4">
                <h3 className="font-semibold text-red-800">Erro de banco de dados</h3>
                <p className="text-sm text-red-700">Verifique se o banco está rodando e execute <code>npm run db:health</code></p>
              </div>
              
              <div className="border-l-4 border-blue-400 pl-4">
                <h3 className="font-semibold text-blue-800">Middleware não funciona</h3>
                <p className="text-sm text-blue-700">Execute <code>npm run test:middleware</code> e verifique logs no console</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Back Button */}
        <div className="text-center">
          <Button onClick={() => window.location.href = 'http://localhost:9002/'}>
            <Home className="mr-2 h-4 w-4" />
            Voltar ao Início
          </Button>
        </div>
      </div>
    </div>
  );
}