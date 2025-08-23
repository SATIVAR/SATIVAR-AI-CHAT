
'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Users, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { Logo } from '../icons/logo';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '../theme-toggle';


const AdminNavLink = ({ href, children }: { href: string; children: React.ReactNode }) => {
    const pathname = usePathname();
    const isActive = pathname.startsWith(href);
    return (
        <Link href={href} passHref>
            <Button variant={isActive ? "secondary" : "ghost"} className="w-full justify-start">
                {children}
            </Button>
        </Link>
    )
}

export default function AdminPanelLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();

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
                <nav className="flex flex-col gap-2 p-4">
                    <AdminNavLink href="/admin/dashboard">
                        <Home className="mr-2 h-4 w-4" />
                        Painel de Pedidos
                    </AdminNavLink>
                    <AdminNavLink href="/admin/clients">
                        <Users className="mr-2 h-4 w-4" />
                        Clientes
                    </AdminNavLink>
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
