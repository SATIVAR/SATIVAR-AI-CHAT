
'use server';

import prisma from '@/lib/prisma';
import { Order, Order_status } from '@prisma/client';
import { getStoreStatus } from './store.service';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Order as AppOrder, UserDetails } from '../types'; // Usando tipos da App

// Tipo para criação de pedido, derivado dos tipos do Prisma
type OrderCreateInput = Omit<AppOrder, 'id' | 'createdAt' | 'updatedAt'>;


export async function createOrder(orderData: OrderCreateInput): Promise<string> {
    const generateId = () => {
        return Math.random().toString(36).substring(2) + Date.now().toString(36);
    };

    try {
        // Ensure the client exists and update their info
        const client = await prisma.client.upsert({
            where: { phone: orderData.clientInfo.phone },
            create: {
                id: orderData.clientId,
                name: orderData.clientInfo.name,
                phone: orderData.clientInfo.phone,
                address: orderData.clientInfo.address ? JSON.stringify(orderData.clientInfo.address) : null,
                associationId: 'cmevpxdbf0000tmmw9106u0s2' // Default for now
            },
            update: {
                name: orderData.clientInfo.name,
                address: orderData.clientInfo.address ? JSON.stringify(orderData.clientInfo.address) : null,
                lastOrderAt: new Date()
            }
        });

        const order = await prisma.order.create({
            data: {
                id: generateId(),
                clientId: client.id,
                clientInfo: JSON.stringify(orderData.clientInfo),
                totalAmount: orderData.totalAmount,
                status: orderData.status as Order_status,
                OrderItem: {
                    create: orderData.items.map(item => ({
                        id: generateId(),
                        productId: item.productId,
                        productName: item.productName,
                        quantity: item.quantity,
                        unitPrice: item.unitPrice
                    }))
                }
            }
        });
        
        return order.id;
    } catch (error) {
        console.error('Error creating order:', error);
        throw new Error('Failed to create order');
    }
}


export async function getOrders(): Promise<Order[]> {
    const storeStatus = await getStoreStatus();
    if (!storeStatus.isOpen || !storeStatus.openedAt) {
        return [];
    }

    const startOfDay = new Date(storeStatus.openedAt);

    const orders = await prisma.order.findMany({
        where: {
            createdAt: { gte: startOfDay },
            NOT: {
                status: { in: ['Finalizado', 'Cancelado'] }
            }
        },
        include: {
            OrderItem: true // Inclui os itens do pedido
        },
        orderBy: {
            createdAt: 'asc'
        }
    });
    
    return orders;
}


export async function updateOrderStatus(id: string, status: Order_status): Promise<{ success: boolean; error?: string }> {
    try {
        await prisma.order.update({
            where: { id },
            data: { status }
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
    const closedOrders = await prisma.order.findMany({
        where: {
            status: { in: ['Finalizado', 'Cancelado'] }
        },
        include: {
            OrderItem: true
        },
        orderBy: {
            createdAt: 'desc'
        }
    });

    if (!closedOrders.length) {
        return {};
    }

    const groupedOrders: GroupedOrders = {};

    closedOrders.forEach(order => {
        const dateKey = format(order.createdAt, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR });
        
        if (!groupedOrders[dateKey]) {
            groupedOrders[dateKey] = [];
        }
        groupedOrders[dateKey].push(order);
    });

    return groupedOrders;
}
