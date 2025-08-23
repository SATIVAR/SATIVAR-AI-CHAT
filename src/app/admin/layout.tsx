
'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Toaster } from "@/components/ui/toaster"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isVerified, setIsVerified] = useState(false);

  useEffect(() => {
    const session = localStorage.getItem('utopizap-admin-session');
    
    // A página de login/cadastro é a única pública dentro de /admin
    const isPublicPage = pathname === '/admin';

    if (!session && !isPublicPage) {
      // Se NÃO há sessão E o usuário NÃO está na página de login, redirecione
      router.push('/admin');
    } else {
      // Se há sessão ou se é a página pública, permite a renderização
      setIsVerified(true);
    }
  }, [pathname, router]);

  // Não renderiza nada até que a verificação seja concluída,
  // exceto se for a página pública (para evitar um flash de conteúdo).
  if (!isVerified && !isPublicPage) {
    return null; // ou um loader global
  }

  return (
    <>
      {children}
      <Toaster />
    </>
  );
}
