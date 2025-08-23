
'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Users, LogOut, ShoppingBasket, Layers, UtensilsCrossed } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { Logo } from '../icons/logo';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '../theme-toggle';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';


const AdminNavLink = ({ href, children, label }: { href: string; children: React.ReactNode, label: string }) => {
    const pathname = usePathname();
    const isActive = pathname.startsWith(href);
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

export default function AdminPanelLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const isMenuActive = pathname.startsWith('/admin/categories') || pathname.startsWith('/admin/products');

    const handleLogout = () => {
        localStorage.removeItem('utopizap-admin-session');
        router.push('/admin');
    };

    return (
        <div className="flex min-h-screen w-full bg-muted/40">
             <TooltipProvider>
                <aside className="hidden w-20 flex-col items-center border-r bg-background sm:flex">
                    <div className="flex h-16 items-center justify-center border-b px-6">
                         <Link href="/admin/dashboard" className="flex items-center gap-2 font-semibold" prefetch={false}>
                            <Logo className="h-8 w-8 text-primary" />
                            <span className="sr-only">UtópiZap Admin</span>
                        </Link>
                    </div>
                    <nav className="flex flex-col items-center gap-4 p-4 flex-1">
                        <AdminNavLink href="/admin/dashboard" label="Painel de Pedidos">
                            <Home className="h-5 w-5" />
                        </AdminNavLink>
                        <AdminNavLink href="/admin/clients" label="Clientes">
                            <Users className="h-5 w-5" />
                        </AdminNavLink>
                        <Accordion type="single" collapsible defaultValue={isMenuActive ? "item-1" : ""} className="w-full">
                          <AccordionItem value="item-1" className="border-b-0">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <AccordionTrigger className="w-10 h-10 p-0 flex justify-center hover:no-underline rounded-md data-[state=open]:bg-muted">
                                        <ShoppingBasket className="h-5 w-5" />
                                    </AccordionTrigger>
                                </TooltipTrigger>
                                <TooltipContent side="right">
                                    <p>Cardápio</p>
                                </TooltipContent>
                            </Tooltip>
                            <AccordionContent className="pt-4 flex flex-col items-center gap-4">
                              <AdminNavLink href="/admin/categories" label="Categorias">
                                <Layers className="h-5 w-5" />
                              </AdminNavLink>
                               <AdminNavLink href="/admin/products" label="Produtos">
                                <UtensilsCrossed className="h-5 w-5" />
                              </AdminNavLink>
                            </AccordionContent>
                          </AccordionItem>
                        </Accordion>
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
                <header className="sticky top-0 z-10 flex h-16 items-center justify-between gap-4 border-b bg-background px-6 sm:justify-end">
                    <Link href="#" className="sm:hidden" prefetch={false}>
                        <Logo className="h-6 w-6" />
                        <span className="sr-only">Home</span>
                    </Link>
                    <ThemeToggle />
                </header>
                <main className="flex-1 p-4 sm:p-6">
                    {children}
                </main>
            </div>
        </div>
    );
}
