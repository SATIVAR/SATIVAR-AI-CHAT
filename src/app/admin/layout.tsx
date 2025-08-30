
'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Toaster } from "@/components/ui/toaster";
import AdminPanelLayout from '@/components/admin/admin-layout';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isVerified, setIsVerified] = useState(false);

  // A página de login/cadastro é a única pública dentro de /admin
  const isPublicPage = pathname === '/admin';

  useEffect(() => {
    // Verificar cookie de sessão
    const checkAuth = () => {
      try {
        const authCookie = document.cookie
          .split('; ')
          .find(row => row.startsWith('auth-session='));
        
        if (!authCookie && !isPublicPage) {
          // Só redirecionar se não estiver já na página de login
          if (pathname !== '/login') {
            router.replace('/login');
          }
          return;
        }
        
        setIsVerified(true);
      } catch (error) {
        console.error('Erro ao verificar autenticação:', error);
        if (!isPublicPage && pathname !== '/login') {
          router.replace('/login');
        }
      }
    };

    // Usar setTimeout para evitar problemas de hidratação
    const timeoutId = setTimeout(checkAuth, 100);
    
    return () => clearTimeout(timeoutId);
  }, [pathname, isPublicPage]); // Remover router da dependência

  // Se a página não for pública e a verificação não estiver concluída, mostre um loader/tela em branco.
  if (!isPublicPage && !isVerified) {
    return null; 
  }
  
  if (isPublicPage) {
    return (
        <>
            {children}
            <Toaster />
        </>
    )
  }

  // Renderiza o conteúdo para a página pública ou para páginas protegidas após a verificação.
  return (
    <AdminPanelLayout>
        {children}
        <Toaster />
    </AdminPanelLayout>
  );
}
