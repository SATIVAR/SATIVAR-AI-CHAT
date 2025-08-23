
import { db } from './admin';
import { Order } from '../types';
import { Timestamp } from 'firebase-admin/firestore';

// Create a new order and a new client if one doesn't exist
export async function createOrder(order: Omit<Order, 'id'>): Promise<string> {
    const { clientInfo } = order;

    // Check if client exists
    const clientQuery = await db.collection('clients').where('phone', '==', clientInfo.phone).limit(1).get();
    
    if (clientQuery.empty) {
        // Create new client
        await db.collection('clients').add({
            ...clientInfo,
            lastOrderAt: Timestamp.now(),
        });
    } else {
        // Update lastOrderAt on existing client
        const clientDoc = clientQuery.docs[0];
        await clientDoc.ref.update({
            lastOrderAt: Timestamp.now(),
        });
    }

    const orderRef = await db.collection('orders').add(order);
    return orderRef.id;
}
