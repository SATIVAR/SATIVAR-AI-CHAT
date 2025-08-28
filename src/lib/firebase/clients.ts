
import { db } from './admin';
import { Client } from '../types';
import { Timestamp } from 'firebase-admin/firestore';
import { unstable_cache } from 'next/cache';

// Helper function to convert Firestore timestamp to a serializable Date object
const toSerializableDate = (timestamp: any): Date => {
    if (!timestamp) return new Date();
    if (timestamp instanceof Timestamp) {
        return timestamp.toDate();
    }
    // Handle cases where it might already be a Date object or a string
    return new Date(timestamp);
};


export async function findClientByPhone(phone: string): Promise<Client | null> {
    if (!phone) return null;
    const clientQuery = await db.collection('clients').where('phone', '==', phone).limit(1).get();
    if (clientQuery.empty) {
        return null;
    }
    const clientDoc = clientQuery.docs[0];
    const clientData = clientDoc.data();
    return { 
        id: clientDoc.id, 
        ...clientData,
        createdAt: toSerializableDate(clientData.createdAt),
        lastOrderAt: toSerializableDate(clientData.lastOrderAt),
    } as Client;
}

export async function createClient(clientData: Partial<Client>): Promise<{success: boolean, id?: string, error?: string}> {
    try {
        if (clientData.phone) {
            const existingClient = await findClientByPhone(clientData.phone);
            if (existingClient) {
                return { success: false, error: 'Já existe um cliente com este telefone.' };
            }
        }
        const docRef = await db.collection('clients').add({
            ...clientData,
            isActive: true, // Garante que novos clientes sejam ativos
            createdAt: Timestamp.now(), // Use Admin Timestamp
            lastOrderAt: Timestamp.now(), // Use Admin Timestamp
        });
        return { success: true, id: docRef.id };
    } catch (error) {
        console.error("Error creating client:", error);
        return { success: false, error: 'Falha ao criar cliente.' };
    }
}

export async function updateClient(id: string, clientData: Partial<Client>): Promise<{success: boolean, error?: string}> {
    try {
        if (clientData.phone) {
             const existingClient = await findClientByPhone(clientData.phone);
             if (existingClient && existingClient.id !== id) {
                return { success: false, error: 'Já existe outro cliente com este telefone.' };
             }
        }
        await db.collection('clients').doc(id).update(clientData);
        return { success: true };
    } catch (error) {
        console.error(`Error updating client ${id}:`, error);
        return { success: false, error: 'Falha ao atualizar cliente.' };
    }
}


export const getClients = unstable_cache(
    async ({ searchQuery = '', page = 1, limit = 10 }: { searchQuery?: string; page?: number; limit?: number; }) => {
        let query: FirebaseFirestore.Query<FirebaseFirestore.DocumentData> = db.collection('clients');

        query = query.where('isActive', '==', true);

        // Para evitar a necessidade de múltiplos índices compostos, a ordenação e busca serão tratadas após a leitura inicial.
        // Para grandes datasets, uma solução com um serviço de busca como Algolia seria mais eficiente.
        const snapshot = await query.orderBy('name').get();
        
        let clients: Client[] = snapshot.docs.map(doc => {
             const data = doc.data();
            return {
                id: doc.id,
                name: data.name,
                phone: data.phone,
                address: data.address || {},
                createdAt: toSerializableDate(data.createdAt),
                lastOrderAt: toSerializableDate(data.lastOrderAt),
                isActive: data.isActive
            } as Client;
        });

        if (searchQuery) {
            const lowercasedQuery = searchQuery.toLowerCase();
            clients = clients.filter(c => 
                c.name.toLowerCase().includes(lowercasedQuery) || 
                c.phone.includes(lowercasedQuery)
            );
        }
        
        const totalClients = clients.length;
        const paginatedClients = clients.slice((page - 1) * limit, page * limit);
        
        return {
            clients: paginatedClients,
            total: totalClients,
            page,
            limit,
            totalPages: Math.ceil(totalClients / limit),
        };
    },
    ['clients-list'],
    { revalidate: 1 } // Revalidate every second
);
