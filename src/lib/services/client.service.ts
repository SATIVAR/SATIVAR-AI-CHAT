
'use server';

import prisma from '@/lib/prisma';
import { Client } from '@prisma/client';
import { unstable_cache } from 'next/cache';
import { AddressDetails } from '@/lib/types';

// Temporary default association ID - should be replaced with proper tenant resolution
const DEFAULT_ASSOCIATION_ID = 'cmevpxdbf0000tmmw9106u0s2';

// Tipos para garantir a consistência dos dados de entrada
type ClientCreateInput = {
    name: string;
    phone: string;
    address?: AddressDetails | null;
    associationId?: string;  // Made optional with default
    lastOrderAt?: Date;      // Made optional with default
};
type ClientInput = Omit<Client, 'id' | 'createdAt' | 'updatedAt' | 'isActive'>;
type ClientUpdateInput = Partial<ClientInput>;


export async function findClientByPhone(phone: string): Promise<Client | null> {
    if (!phone) return null;
    
    const client = await prisma.client.findUnique({
        where: { phone }
    });
    return client;
}

export async function createClient(clientData: ClientCreateInput): Promise<{ success: boolean, data?: Client, error?: string }> {
    try {
        const { address, ...clientInfo } = clientData;
        
        if (clientInfo.phone) {
            const existingClient = await findClientByPhone(clientInfo.phone);
            if (existingClient) {
                return { success: false, error: 'Já existe um cliente com este telefone.' };
            }
        }

        const newClient = await prisma.client.create({
            data: {
                ...clientInfo,
                associationId: clientInfo.associationId || DEFAULT_ASSOCIATION_ID,
                lastOrderAt: clientInfo.lastOrderAt || new Date(),
                address: address || undefined,
            }
        });
        
        return { success: true, data: newClient };
    } catch (error: any) {
        console.error("Error creating client:", error);
         if (error.code === 'P2002') {
            return { success: false, error: 'Já existe um cliente com este telefone.' };
        }
        return { success: false, error: 'Falha ao criar cliente.' };
    }
}

export async function updateClient(id: string, clientData: ClientUpdateInput): Promise<{ success: boolean, error?: string }> {
    try {
        const { address, ...clientInfo } = clientData;

        if (clientInfo.phone) {
             const existingClient = await findClientByPhone(clientInfo.phone);
             if (existingClient && existingClient.id !== id) {
                return { success: false, error: 'Já existe outro cliente com este telefone.' };
             }
        }
        
        await prisma.client.update({
            where: { id },
            data: {
                ...clientInfo,
                address: address || undefined
            }
        });
        return { success: true };
    } catch (error: any) {
        console.error(`Error updating client ${id}:`, error);
        return { success: false, error: 'Falha ao atualizar cliente.' };
    }
}


export const getClients = unstable_cache(
    async ({ searchQuery = '', page = 1, limit = 10, associationId }: { searchQuery?: string; page?: number; limit?: number; associationId?: string; }) => {
        const targetAssociationId = associationId || DEFAULT_ASSOCIATION_ID;
        
        const whereClause = {
            isActive: true,
            associationId: targetAssociationId,
            ...(searchQuery ? {
                OR: [
                    { name: { contains: searchQuery, mode: 'insensitive' } },
                    { phone: { contains: searchQuery } }
                ]
            } : {})
        };

        const totalClients = await prisma.client.count({ where: whereClause });
        
        const clients = await prisma.client.findMany({
            where: whereClause,
            orderBy: {
                name: 'asc'
            },
            skip: (page - 1) * limit,
            take: limit,
        });
        
        return {
            clients,
            total: totalClients,
            page,
            limit,
            totalPages: Math.ceil(totalClients / limit),
        };
    },
    ['clients-list'],
    { revalidate: 1 }
);
