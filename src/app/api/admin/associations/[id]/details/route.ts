import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const associationId = params.id;

    // Buscar associação com todos os dados relacionados
    const association = await prisma.association.findUnique({
      where: { id: associationId },
      include: {
        Patient: {
          include: {
            Conversation: {
              select: {
                id: true,
                status: true,
                updatedAt: true,
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 10 // Últimos 10 pacientes
        }
      }
    });

    if (!association) {
      return NextResponse.json(
        { success: false, error: 'Associação não encontrada' },
        { status: 404 }
      );
    }

    // Buscar conversas recentes com dados do paciente
    const recentConversations = await prisma.conversation.findMany({
      where: {
        Patient: {
          associationId: associationId
        }
      },
      include: {
        Patient: {
          select: {
            name: true,
            whatsapp: true
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      },
      take: 10
    });

    // Calcular estatísticas
    const totalPatients = association.Patient.length;
    const allConversations = association.Patient.flatMap(patient => patient.Conversation);
    
    const conversationsWithIA = allConversations.filter(c => c.status === 'com_ia').length;
    const conversationsInQueue = allConversations.filter(c => c.status === 'fila_humano').length;
    const conversationsWithHuman = allConversations.filter(c => c.status === 'com_humano').length;
    const resolvedConversations = allConversations.filter(c => c.status === 'resolvida').length;
    
    const activeConversations = conversationsWithIA + conversationsInQueue + conversationsWithHuman;

    // Preparar dados dos pacientes recentes
    const recentPatients = association.Patient.map(patient => ({
      id: patient.id,
      name: patient.name,
      whatsapp: patient.whatsapp,
      status: patient.status,
      createdAt: patient.createdAt
    }));

    // Preparar dados das conversas recentes
    const conversationsData = recentConversations.map(conversation => ({
      id: conversation.id,
      status: conversation.status,
      patient: {
        name: conversation.Patient.name,
        whatsapp: conversation.Patient.whatsapp
      },
      updatedAt: conversation.updatedAt
    }));

    const associationDetails = {
      id: association.id,
      name: association.name,
      subdomain: association.subdomain,
      wordpressUrl: association.wordpressUrl,
      isActive: association.isActive,
      createdAt: association.createdAt,
      updatedAt: association.updatedAt,
      publicDisplayName: association.publicDisplayName,
      logoUrl: association.logoUrl,
      welcomeMessage: association.welcomeMessage,
      descricaoPublica: association.descricaoPublica,
      totalPatients,
      activeConversations,
      conversationsWithIA,
      conversationsInQueue,
      conversationsWithHuman,
      resolvedConversations,
      recentPatients,
      recentConversations: conversationsData
    };

    return NextResponse.json({
      success: true,
      association: associationDetails
    });

  } catch (error) {
    console.error('Erro ao buscar detalhes da associação:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erro interno do servidor'
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}