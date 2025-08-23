
'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Users, LogOut, ShoppingBasket, ShoppingCart } from 'lucide-react';
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


const AdminNavLink = ({ href, children }: { href: string; children: React.ReactNode }) => {
    const pathname = usePathname();
    const isActive = pathname === href;
    return (
        <Link href={href} passHref>
            <Button variant={isActive ? "secondary" : "ghost"} className="w-full justify-start pl-8">
                {children}
            </Button>
        </Link>
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
            <aside className="hidden w-64 flex-col border-r bg-background sm:flex">
                <div className="flex h-16 items-center border-b px-6">
                     <Link href="/admin/dashboard" className="flex items-center gap-2 font-semibold" prefetch={false}>
                        <Logo className="h-8 w-8 text-primary" />
                        <span>UtópiZap Admin</span>
                    </Link>
                </div>
                <nav className="flex flex-col gap-1 p-4">
                    <Link href="/admin/dashboard" passHref>
                        <Button variant={pathname.startsWith('/admin/dashboard') ? "secondary" : "ghost"} className="w-full justify-start">
                             <Home className="mr-2 h-4 w-4" />
                            Painel de Pedidos
                        </Button>
                    </Link>
                    <Link href="/admin/clients" passHref>
                        <Button variant={pathname.startsWith('/admin/clients') ? "secondary" : "ghost"} className="w-full justify-start">
                            <Users className="mr-2 h-4 w-4" />
                            Clientes
                        </Button>
                    </Link>
                     <Accordion type="single" collapsible defaultValue={isMenuActive ? "item-1" : ""}>
                      <AccordionItem value="item-1" className="border-b-0">
                        <AccordionTrigger className="py-2 px-4 text-sm font-medium rounded-md hover:bg-muted hover:no-underline data-[state=open]:bg-muted">
                           <div className="flex items-center">
                             <ShoppingBasket className="mr-2 h-4 w-4" />
                             Cardápio
                           </div>
                        </AccordionTrigger>
                        <AccordionContent className="pt-1">
                          <AdminNavLink href="/admin/categories">
                            Categorias
                          </AdminNavLink>
                           <AdminNavLink href="/admin/products">
                            Produtos
                          </AdminNavLink>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                </nav>
                <div className="mt-auto p-4">
                    <Button variant="ghost" className="w-full justify-start" onClick={handleLogout}>
                        <LogOut className="mr-2 h-4 w-4" />
                        Sair
                    </Button>
                </div>
            </aside>
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
