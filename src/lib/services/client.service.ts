
'use server';

import prisma from '@/lib/prisma';
import { Client, Address } from '@prisma/client';
import { unstable_cache } from 'next/cache';

// Tipos para garantir a consistência dos dados de entrada
type ClientInput = Omit<Client, 'id' | 'createdAt' | 'updatedAt' | 'isActive'> & {
    address?: Omit<Address, 'id' | 'clientId'>
};
type ClientUpdateInput = Partial<ClientInput>;


export async function findClientByPhone(phone: string): Promise<(Client & { address: Address | null }) | null> {
    if (!phone) return null;
    
    const client = await prisma.client.findUnique({
        where: { phone },
        include: { address: true }
    });
    return client;
}

export async function createClient(clientData: ClientInput): Promise<{ success: boolean, data?: Client, error?: string }> {
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
                address: address ? {
                    create: address
                } : undefined,
            },
            include: {
                address: true,
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
                address: address ? {
                    upsert: { // Cria ou atualiza o endereço
                        create: address,
                        update: address,
                    }
                } : undefined
            }
        });
        return { success: true };
    } catch (error: any) {
        console.error(`Error updating client ${id}:`, error);
        return { success: false, error: 'Falha ao atualizar cliente.' };
    }
}


export const getClients = unstable_cache(
    async ({ searchQuery = '', page = 1, limit = 10 }: { searchQuery?: string; page?: number; limit?: number; }) => {
        
        const whereClause = searchQuery ? {
            isActive: true,
            OR: [
                { name: { contains: searchQuery, mode: 'insensitive' } },
                { phone: { contains: searchQuery } }
            ]
        } : { isActive: true };

        const totalClients = await prisma.client.count({ where: whereClause });
        
        const clients = await prisma.client.findMany({
            where: whereClause,
            include: {
                address: true,
            },
            orderBy: {
                name: 'asc'
            },
            skip: (page - 1) * limit,
            take: limit,
        });
        
        return {
            clients: clients as (Client & { address: Address | null })[],
            total: totalClients,
            page,
            limit,
            totalPages: Math.ceil(totalClients / limit),
        };
    },
    ['clients-list'],
    { revalidate: 1 }
);
