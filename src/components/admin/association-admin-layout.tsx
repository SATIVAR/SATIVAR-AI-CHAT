'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Users, LogOut, MessageCircle, User, Building2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { Logo } from '../icons/logo';
import { ThemeToggle } from '../theme-toggle';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface UserSession {
  id: string
  email: string
  name: string
  role?: 'super_admin' | 'manager'
  associationId?: string
  associationName?: string
}

interface AssociationInfo {
  id: string;
  name: string;
  subdomain: string;
  publicDisplayName?: string;
  logoUrl?: string;
}

interface AssociationAdminLayoutProps {
  children: React.ReactNode;
  subdomain: string;
}

const AssociationAdminNavLink = ({ href, children, label }: { href: string; children: React.ReactNode, label: string }) => {
  const pathname = usePathname();
  const isActive = pathname === href;
  return (
    <TooltipProvider>
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <Link href={href} passHref>
            <Button variant={isActive ? "secondary" : "ghost"} className="w-10 h-10 p-0">
              {children}
            </Button>
          </Link>
        </TooltipTrigger>
        <TooltipContent side="right">
          <p>{label}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export default function AssociationAdminLayout({ children, subdomain }: AssociationAdminLayoutProps) {
  const router = useRouter();
  const [userSession, setUserSession] = useState<UserSession | null>(null);
  const [associationInfo, setAssociationInfo] = useState<AssociationInfo | null>(null);

  useEffect(() => {
    // Carregar informações do usuário do cookie
    try {
      const authCookie = document.cookie
        .split('; ')
        .find(row => row.startsWith('auth-session='));
      
      if (authCookie) {
        const sessionData = JSON.parse(decodeURIComponent(authCookie.split('=')[1]));
        setUserSession(sessionData);
      }
    } catch (error) {
      console.error('Erro ao carregar sessão:', error);
    }

    // Carregar informações da associação
    loadAssociationInfo();
  }, [subdomain]);

  const loadAssociationInfo = async () => {
    try {
      const response = await fetch(`/api/associations/${subdomain}/info`);
      if (response.ok) {
        const data = await response.json();
        setAssociationInfo(data.association);
      }
    } catch (error) {
      console.error('Erro ao carregar informações da associação:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    } catch (error) {
      console.error('Erro no logout:', error);
      // Forçar logout local mesmo se a API falhar
      document.cookie = 'auth-session=; path=/; max-age=0';
      router.push('/login');
    }
  };

  return (
    <div className="flex min-h-screen w-full bg-muted/40">
      <TooltipProvider>
        <aside className="hidden w-20 flex-col items-center border-r bg-background sm:flex">
          <div className="flex h-16 items-center justify-center border-b px-6">
            <Link href={`/${subdomain}`} className="flex items-center gap-2 font-semibold" prefetch={false}>
              {associationInfo?.logoUrl ? (
                <img 
                  src={associationInfo.logoUrl} 
                  alt={associationInfo.name}
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center">
                  <Logo className="h-5 w-5 text-white" />
                </div>
              )}
              <span className="sr-only">{associationInfo?.name || subdomain}</span>
            </Link>
          </div>
          
          <nav className="flex flex-col items-center gap-4 p-4 flex-1">
            {/* Voltar ao painel geral (apenas para super admin) */}
            {userSession?.role === 'super_admin' && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link href="/admin/inbox">
                    <Button variant="ghost" className="w-10 h-10 p-0">
                      <ArrowLeft className="h-5 w-5" />
                    </Button>
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>Painel Geral</p>
                </TooltipContent>
              </Tooltip>
            )}
            
            {/* Dashboard da associação */}
            <AssociationAdminNavLink href={`/${subdomain}`} label="Página da Associação">
              <Home className="h-5 w-5" />
            </AssociationAdminNavLink>
            
            {/* Inbox da associação */}
            <AssociationAdminNavLink href={`/${subdomain}/admin/inbox`} label="Atendimento WhatsApp">
              <MessageCircle className="h-5 w-5" />
            </AssociationAdminNavLink>
          </nav>
          
          <div className="mt-auto p-4 flex flex-col items-center gap-4">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" className="w-10 h-10 p-0" onClick={handleLogout}>
                  <LogOut className="h-5 w-5" />
                  <span className="sr-only">Sair</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Sair</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </aside>
      </TooltipProvider>
      
      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between gap-4 border-b bg-background px-6">
          <Link href="#" className="sm:hidden" prefetch={false}>
            {associationInfo?.logoUrl ? (
              <img 
                src={associationInfo.logoUrl} 
                alt={associationInfo.name}
                className="w-6 h-6 rounded-full object-cover"
              />
            ) : (
              <div className="w-6 h-6 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center">
                <Logo className="h-3 w-3 text-white" />
              </div>
            )}
            <span className="sr-only">Home</span>
          </Link>
          
          <div className="flex items-center gap-4">
            {/* Informações da associação */}
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium">
                {associationInfo?.publicDisplayName || associationInfo?.name || subdomain}
              </span>
            </div>
            
            {/* Informações do usuário */}
            {userSession && (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium">{userSession.name}</span>
                </div>
                <Badge variant={userSession.role === 'super_admin' ? 'default' : 'secondary'}>
                  {userSession.role === 'super_admin' ? 'Super Admin' : 'Gerente'}
                </Badge>
              </div>
            )}
            
            <ThemeToggle />
          </div>
        </header>
        
        <main className="flex-1 p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}