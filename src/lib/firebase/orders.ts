
import { db } from './admin';
import { Order } from '../types';
import { Timestamp } from 'firebase-admin/firestore';

export async function createOrder(order: Omit<Order, 'id'>): Promise<string> {
    const { clientInfo } = order;

    const clientQuery = await db().collection('clients').where('phone', '==', clientInfo.phone).limit(1).get();
    
    if (clientQuery.empty) {
        await db().collection('clients').add({
            ...clientInfo,
            createdAt: Timestamp.now(),
            lastOrderAt: Timestamp.now(),
        });
    } else {
        const clientDoc = clientQuery.docs[0];
        await clientDoc.ref.update({
            lastOrderAt: Timestamp.now(),
        });
    }

    const orderRef = await db().collection('orders').add(order);
    return orderRef.id;
}


export async function getOrders(): Promise<Order[]> {
    const snapshot = await db().collection('orders').orderBy('createdAt', 'desc').limit(50).get();
    if (snapshot.empty) {
        return [];
    }
    return snapshot.docs.map(doc => {
        const data = doc.data();
        return { 
            id: doc.id, 
            ...data,
            createdAt: (data.createdAt as Timestamp).toDate(),
            updatedAt: (data.updatedAt as Timestamp).toDate(),
        } as Order
    });
}
