'use client';

import { useEffect, useState } from 'react';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { Toaster } from "@/components/ui/toaster";
import AssociationAdminLayout from '@/components/admin/association-admin-layout';

export default function AssociationAdminLayoutWrapper({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const subdomain = params.slug as string;
  const [isVerified, setIsVerified] = useState(false);

  useEffect(() => {
    // Verificar cookie de sessão
    const checkAuth = () => {
      try {
        const authCookie = document.cookie
          .split('; ')
          .find(row => row.startsWith('auth-session='));
        
        if (!authCookie) {
          // Redirecionar para login se não estiver autenticado
          router.replace('/login');
          return;
        }
        
        const sessionData = JSON.parse(decodeURIComponent(authCookie.split('=')[1]));
        
        // Verificar se o usuário tem permissão para acessar esta associação
        if (sessionData.role === 'super_admin') {
          // Super admin pode acessar qualquer associação
          setIsVerified(true);
        } else if (sessionData.role === 'manager' && sessionData.associationId) {
          // Manager só pode acessar sua própria associação
          // Verificar se o subdomain corresponde à associação do usuário
          fetch(`/api/associations/${subdomain}/verify-access`, {
            headers: {
              'Cookie': document.cookie
            }
          })
          .then(response => response.json())
          .then(data => {
            if (data.hasAccess) {
              setIsVerified(true);
            } else {
              router.replace('/login');
            }
          })
          .catch(() => {
            router.replace('/login');
          });
        } else {
          router.replace('/login');
        }
      } catch (error) {
        console.error('Erro ao verificar autenticação:', error);
        router.replace('/login');
      }
    };

    // Usar setTimeout para evitar problemas de hidratação
    const timeoutId = setTimeout(checkAuth, 100);
    
    return () => clearTimeout(timeoutId);
  }, [pathname, subdomain, router]);

  // Se a verificação não estiver concluída, mostre um loader
  if (!isVerified) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Verificando permissões...</p>
        </div>
      </div>
    );
  }

  return (
    <AssociationAdminLayout subdomain={subdomain}>
      {children}
      <Toaster />
    </AssociationAdminLayout>
  );
}