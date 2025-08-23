
'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Toaster } from "@/components/ui/toaster"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isVerified, setIsVerified] = useState(false);

  // A página de login/cadastro é a única pública dentro de /admin
  const isPublicPage = pathname === '/admin';

  useEffect(() => {
    const session = localStorage.getItem('utopizap-admin-session');
    
    if (!session && !isPublicPage) {
      // Se NÃO há sessão E o usuário NÃO está na página de login, redirecione
      router.push('/admin');
    } else {
      // Se há sessão ou se é a página pública, permite a renderização
      setIsVerified(true);
    }
  }, [pathname, router, isPublicPage]);

  // Se a página não for pública e a verificação não estiver concluída, mostre um loader/tela em branco.
  if (!isPublicPage && !isVerified) {
    return null; 
  }

  // Renderiza o conteúdo para a página pública ou para páginas protegidas após a verificação.
  return (
    <>
      {children}
      <Toaster />
    </>
  );
}
