
import { db } from './admin';
import { Client } from '../types';
import { Timestamp } from 'firebase-admin/firestore';


export async function findClientByPhone(phone: string): Promise<Client | null> {
    const clientQuery = await db.collection('clients').where('phone', '==', phone).limit(1).get();
    if (clientQuery.empty) {
        return null;
    }
    const clientDoc = clientQuery.docs[0];
    return { id: clientDoc.id, ...clientDoc.data() } as Client;
}

export async function createClient(clientData: Omit<Client, 'id'>): Promise<string> {
    const docRef = await db.collection('clients').add(clientData);
    return docRef.id;
}


// This file will contain the CRUD operations for clients.
// Example functions:
// - getClients(page, limit)
// - getClientById(id)
// - updateClient(id, data)
// - deleteClient(id)

export {};
