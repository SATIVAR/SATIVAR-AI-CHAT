import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Get conversations in queue
    const queueConversations = await prisma.conversation.findMany({
      where: {
        status: 'fila_humano',
      },
      select: {
        id: true,
        updatedAt: true,
        Patient: {
          select: {
            name: true,
          },
        },
      },
    });

    // Calculate wait times
    const waitTimes = queueConversations.map(conv => {
      const waitTimeMs = now.getTime() - new Date(conv.updatedAt).getTime();
      return Math.floor(waitTimeMs / (1000 * 60)); // Convert to minutes
    });

    const totalInQueue = queueConversations.length;
    const averageWaitTime = waitTimes.length > 0 
      ? waitTimes.reduce((sum, time) => sum + time, 0) / waitTimes.length 
      : 0;
    const longestWaitTime = waitTimes.length > 0 ? Math.max(...waitTimes) : 0;
    const urgentConversations = waitTimes.filter(time => time >= 60).length;

    // Get today's conversations
    const [newConversationsToday, resolvedConversationsToday] = await Promise.all([
      prisma.conversation.count({
        where: {
          createdAt: {
            gte: startOfDay,
          },
        },
      }),
      prisma.conversation.count({
        where: {
          status: 'resolvida',
          endedAt: {
            gte: startOfDay,
          },
        },
      }),
    ]);

    const stats = {
      totalInQueue,
      averageWaitTime: Math.round(averageWaitTime),
      longestWaitTime,
      newConversationsToday,
      resolvedConversationsToday,
      urgentConversations,
    };

    return NextResponse.json({
      success: true,
      stats,
      timestamp: now.toISOString(),
    });

  } catch (error) {
    console.error('Error getting attendant stats:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}