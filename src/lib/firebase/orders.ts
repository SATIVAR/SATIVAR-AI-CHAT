
'use server';

import { db } from './admin';
import { Order } from '../types';
import { Timestamp } from 'firebase-admin/firestore';
import { getStoreStatus } from './store';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export async function createOrder(order: Omit<Order, 'id'>): Promise<string> {
    const { clientInfo } = order;

    const clientQuery = await db.collection('clients').where('phone', '==', clientInfo.phone).limit(1).get();
    
    if (!clientQuery.empty) {
        const clientDoc = clientQuery.docs[0];
        await clientDoc.ref.update({
            lastOrderAt: Timestamp.now(),
            address: order.clientInfo.address || clientDoc.data().address || {},
            name: clientInfo.name || clientDoc.data().name,
        });
    }

    const orderRef = await db.collection('orders').add(order);
    return orderRef.id;
}


export async function getOrders(): Promise<Order[]> {
    const storeStatus = await getStoreStatus();
    if (!storeStatus.isOpen || !storeStatus.openedAt) {
        return [];
    }

    const startOfDay = new Date(storeStatus.openedAt);

    const snapshot = await db.collection('orders')
        .where('createdAt', '>=', Timestamp.fromDate(startOfDay))
        .orderBy('createdAt', 'asc') // Sort by oldest first within the day
        .get();
        
    if (snapshot.empty) {
        return [];
    }
    
    return snapshot.docs
        .map(doc => {
            const data = doc.data();
            return { 
                id: doc.id, 
                ...data,
                // Convert Timestamps to serializable Date objects
                createdAt: (data.createdAt as Timestamp).toDate(),
                updatedAt: (data.updatedAt as Timestamp).toDate(),
            } as Order
        })
        .filter(order => order.status !== 'Cancelado' && order.status !== 'Finalizado');
}


export async function updateOrderStatus(id: string, status: Order['status']): Promise<{ success: boolean; error?: string }> {
    try {
        await db.collection('orders').doc(id).update({
            status: status,
            updatedAt: Timestamp.now(),
        });
        return { success: true };
    } catch (error) {
        console.error(`Error updating order status for ${id}:`, error);
        return { success: false, error: "Failed to update order status." };
    }
}

export type GroupedOrders = {
    [date: string]: Order[];
};

export async function getClosedOrdersGroupedByDate(): Promise<GroupedOrders> {
    const snapshot = await db.collection('orders')
        .where('status', 'in', ['Finalizado', 'Cancelado'])
        .orderBy('createdAt', 'desc')
        .get();

    if (snapshot.empty) {
        return {};
    }

    const groupedOrders: GroupedOrders = {};

    snapshot.docs.forEach(doc => {
        const data = doc.data();
        const order = {
            id: doc.id,
            ...data,
            createdAt: (data.createdAt as Timestamp).toDate(),
            updatedAt: (data.updatedAt as Timestamp).toDate(),
        } as Order;

        const dateKey = format(order.createdAt, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR });
        
        if (!groupedOrders[dateKey]) {
            groupedOrders[dateKey] = [];
        }
        groupedOrders[dateKey].push(order);
    });

    return groupedOrders;
}
