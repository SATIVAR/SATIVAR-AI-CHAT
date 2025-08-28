'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Home } from 'lucide-react';

export default function AssociationNotFoundPage() {
  useEffect(() => {
    // Get the current subdomain from the URL
    const hostname = window.location.hostname;
    const subdomain = hostname.split('.')[0];
    
    // Log the invalid subdomain attempt
    console.warn(`Invalid subdomain attempted: ${subdomain}`);
  }, []);

  const handleGoToMain = () => {
    // Redirect to the main SATIZAP site
    window.location.href = 'https://satizap.app';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
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
              Ir para o Site Principal
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
    </div>
  );
}