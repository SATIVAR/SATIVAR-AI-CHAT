import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    // Buscar todas as associações com suas estatísticas
    const associations = await prisma.association.findMany({
      select: {
        id: true,
        name: true,
        subdomain: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        Patient: {
          select: {
            id: true,
            Conversation: {
              select: {
                id: true,
                status: true,
                updatedAt: true,
              }
            }
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    // Processar estatísticas para cada associação
    const associationsStats = associations.map(association => {
      const totalPatients = association.Patient.length;
      
      // Coletar todas as conversas
      const allConversations = association.Patient.flatMap(patient => patient.Conversation);
      
      // Calcular estatísticas das conversas
      const conversationsWithIA = allConversations.filter(c => c.status === 'com_ia').length;
      const conversationsInQueue = allConversations.filter(c => c.status === 'fila_humano').length;
      const conversationsWithHuman = allConversations.filter(c => c.status === 'com_humano').length;
      const resolvedConversations = allConversations.filter(c => c.status === 'resolvida').length;
      
      const activeConversations = conversationsWithIA + conversationsInQueue + conversationsWithHuman;
      
      // Encontrar última atividade
      const lastActivity = allConversations.length > 0 
        ? new Date(Math.max(...allConversations.map(c => new Date(c.updatedAt).getTime())))
        : undefined;

      return {
        id: association.id,
        name: association.name,
        subdomain: association.subdomain,
        isActive: association.isActive,
        totalPatients,
        activeConversations,
        conversationsWithIA,
        conversationsInQueue,
        conversationsWithHuman,
        resolvedConversations,
        lastActivity
      };
    });

    // Calcular resumo geral do sistema
    const systemOverview = {
      totalAssociations: associations.length,
      activeAssociations: associations.filter(a => a.isActive).length,
      totalPatients: associationsStats.reduce((sum, a) => sum + a.totalPatients, 0),
      totalConversations: associationsStats.reduce((sum, a) => sum + a.activeConversations + a.resolvedConversations, 0),
      conversationsNeedingAttention: associationsStats.reduce((sum, a) => sum + a.conversationsInQueue, 0)
    };

    return NextResponse.json({
      success: true,
      associations: associationsStats,
      overview: systemOverview
    });

  } catch (error) {
    console.error('Erro ao buscar estatísticas das associações:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erro interno do servidor',
        associations: [],
        overview: null
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}