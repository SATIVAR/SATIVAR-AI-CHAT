
'use client';

import React, { useState } from 'react';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { User, Edit, LogOut } from 'lucide-react';
import { Client } from '@/lib/types';
import UserProfileForm from './user-profile-form';

interface UserMenuProps {
    client: Client | null;
    onSave: (data: Partial<Client>) => Promise<{ success: boolean; error?: string }>;
}

export function UserMenu({ client, onSave }: UserMenuProps) {
    const [isProfileFormOpen, setProfileFormOpen] = useState(false);

    const handleLogout = () => {
        localStorage.removeItem('utopizap_user_details');
        localStorage.removeItem('utopizap_chat_history');
        localStorage.removeItem('utopizap_order');
        window.location.reload();
    };

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                        <User className="h-6 w-6" />
                        <span className="sr-only">Menu do Usuário</span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel>
                        <p className="font-normal">Olá, <span className="font-bold">{client?.name}</span></p>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={() => setProfileFormOpen(true)}>
                        <Edit className="mr-2 h-4 w-4" />
                        <span>Editar Dados</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={handleLogout}>
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Sair</span>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <UserProfileForm
                isOpen={isProfileFormOpen}
                setIsOpen={setProfileFormOpen}
                client={client}
                onSave={onSave}
            />
        </>
    );
}
