
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
    const session = localStorage.getItem('utopizap-admin-session');
    
    if (!session && !isPublicPage) {
      router.push('/admin');
    } else {
      setIsVerified(true);
    }
  }, [pathname, router, isPublicPage]);

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
