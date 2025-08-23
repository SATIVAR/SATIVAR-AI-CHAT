
import { db } from './admin';
import { Client } from '../types';

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
        createdAt: (clientData.createdAt.toDate()),
        lastOrderAt: (clientData.lastOrderAt.toDate()),
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
            createdAt: new Date(),
            lastOrderAt: new Date(),
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


export async function getClients({ searchQuery = '', page = 1, limit = 10 }: { searchQuery?: string; page?: number; limit?: number; }) {
    let query: FirebaseFirestore.Query<FirebaseFirestore.DocumentData> = db.collection('clients');

    query = query.where('isActive', '==', true);

    // A busca por nome exato é complexa e cara no Firestore.
    // Uma abordagem mais simples é filtrar no lado do cliente ou usar um serviço de busca como Algolia.
    // Por simplicidade, vamos buscar todos e filtrar depois se houver uma query.
    // Para paginação real, você precisaria de cursores (startAfter).

    const snapshot = await query.orderBy('name').get();
    
    let clients = snapshot.docs.map(doc => {
         const data = doc.data();
        return {
            id: doc.id,
            name: data.name,
            phone: data.phone,
            address: data.address || {},
            createdAt: data.createdAt.toDate().toISOString(),
        } as unknown as Client;
    });

    if (searchQuery) {
        clients = clients.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.phone.includes(searchQuery));
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
}
