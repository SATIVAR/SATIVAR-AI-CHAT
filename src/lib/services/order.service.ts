
'use server';

import prisma from '@/lib/prisma';
import { Order, OrderStatus } from '@prisma/client';
import { getStoreStatus } from './store.service';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Order as AppOrder, UserDetails } from '../types'; // Usando tipos da App

// Tipo para criação de pedido, derivado dos tipos do Prisma
type OrderCreateInput = Omit<AppOrder, 'id' | 'createdAt' | 'updatedAt'>;


export async function createOrder(order: OrderCreateInput): Promise<string> {
    const { clientId, clientInfo, items, totalAmount } = order;

    // Garante que o cliente seja atualizado
    await prisma.client.update({
        where: { id: clientId },
        data: {
            lastOrderAt: new Date(),
            address: clientInfo.address ? {
                upsert: {
                    create: clientInfo.address,
                    update: clientInfo.address,
                }
            } : undefined,
            name: clientInfo.name,
        }
    });

    const newOrder = await prisma.order.create({
        data: {
            clientId,
            clientName: clientInfo.name,
            clientPhone: clientInfo.phone,
            clientAddress: clientInfo.address ? `${clientInfo.address.street || ''}, ${clientInfo.address.number || ''}` : 'Retirada no local',
            totalAmount,
            status: 'Recebido', // Status inicial
            OrderItem: {
                create: items.map(item => ({
                    productId: item.productId,
                    productName: item.productName,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                }))
            }
        }
    });
    
    return newOrder.id;
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


export async function updateOrderStatus(id: string, status: OrderStatus): Promise<{ success: boolean; error?: string }> {
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
