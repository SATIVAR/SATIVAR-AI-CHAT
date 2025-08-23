
import { db } from './admin';
import { Order } from '../types';
import { Timestamp } from 'firebase-admin/firestore';

export async function createOrder(order: Omit<Order, 'id'>): Promise<string> {
    const { clientInfo } = order;

    const clientQuery = await db.collection('clients').where('phone', '==', clientInfo.phone).limit(1).get();
    
    if (clientQuery.empty) {
        const newClientData = {
             name: clientInfo.name,
             phone: clientInfo.phone,
             address: (clientInfo as any).address || {},
             createdAt: Timestamp.now(),
             lastOrderAt: Timestamp.now(),
             isActive: true,
        }
        await db.collection('clients').add(newClientData);
    } else {
        const clientDoc = clientQuery.docs[0];
        await clientDoc.ref.update({
            lastOrderAt: Timestamp.now(),
            address: (clientInfo as any).address || clientDoc.data().address || {},
            name: clientInfo.name || clientDoc.data().name,
        });
    }

    const orderRef = await db.collection('orders').add(order);
    return orderRef.id;
}


export async function getOrders(): Promise<Order[]> {
    const snapshot = await db.collection('orders').orderBy('createdAt', 'desc').limit(50).get();
    if (snapshot.empty) {
        return [];
    }
    return snapshot.docs.map(doc => {
        const data = doc.data();
        return { 
            id: doc.id, 
            ...data,
            // Convert Timestamps to serializable Date objects
            createdAt: (data.createdAt as Timestamp).toDate(),
            updatedAt: (data.updatedAt as Timestamp).toDate(),
        } as Order
    });
}
