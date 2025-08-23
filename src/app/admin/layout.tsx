
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
    
    if (!session && pathname !== '/admin') {
      router.push('/admin');
    } else {
      setIsVerified(true);
    }
  }, [pathname, router]);

  if (!isVerified && pathname !== '/admin') {
    return null; // ou um loader global para a área admin
  }

  return (
    <>
      {children}
      <Toaster />
    </>
  );
}
