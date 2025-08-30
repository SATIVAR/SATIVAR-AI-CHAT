
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
        
        // Query patients table instead of clients for synchronized data
        const whereClause = {
            associationId: targetAssociationId,
            ...(searchQuery ? {
                OR: [
                    { name: { contains: searchQuery, mode: 'insensitive' } },
                    { whatsapp: { contains: searchQuery } }
                ]
            } : {})
        };

        const totalPatients = await prisma.patient.count({ where: whereClause });
        
        const patients = await prisma.patient.findMany({
            where: whereClause,
            orderBy: {
                name: 'asc'
            },
            skip: (page - 1) * limit,
            take: limit,
        });
        
        // Convert patients to client format for compatibility
        const clients = patients.map(patient => {
            const createdAt = patient.createdAt instanceof Date ? patient.createdAt : new Date(patient.createdAt);
            const updatedAt = patient.updatedAt instanceof Date ? patient.updatedAt : new Date(patient.updatedAt);
            
            return {
                id: patient.id,
                name: patient.name,
                phone: patient.whatsapp, // Map whatsapp to phone for compatibility
                email: patient.email,
                associationId: patient.associationId,
                isActive: true, // Patients are always active in this context
                createdAt: createdAt,
                lastOrderAt: updatedAt || createdAt,
                address: null, // Address not stored in patient table yet
            };
        });
        
        return {
            clients,
            total: totalPatients,
            page,
            limit,
            totalPages: Math.ceil(totalPatients / limit),
        };
    },
    ['clients-list'],
    { revalidate: 1 }
);
