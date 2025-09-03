import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getUserSessionFromRequest } from '@/lib/auth';

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: { subdomain: string } }
) {
  try {
    const subdomain = params.subdomain;
    const userSession = await getUserSessionFromRequest(request);

    if (!userSession) {
      return NextResponse.json(
        { success: false, hasAccess: false, error: 'Não autenticado' },
        { status: 401 }
      );
    }

    // Super admin tem acesso a todas as associações
    if (userSession.role === 'super_admin') {
      return NextResponse.json({
        success: true,
        hasAccess: true
      });
    }

    // Buscar associação pelo subdomain
    const association = await prisma.association.findUnique({
      where: { subdomain },
      select: {
        id: true,
        name: true,
        isActive: true
      }
    });

    if (!association) {
      return NextResponse.json(
        { success: false, hasAccess: false, error: 'Associação não encontrada' },
        { status: 404 }
      );
    }

    // Verificar se o usuário tem acesso a esta associação
    if (userSession.role === 'manager') {
      const hasAccess = userSession.associationId === association.id;
      return NextResponse.json({
        success: true,
        hasAccess
      });
    }

    return NextResponse.json({
      success: false,
      hasAccess: false,
      error: 'Sem permissão'
    });

  } catch (error) {
    console.error('Erro ao verificar acesso à associação:', error);
    return NextResponse.json(
      { 
        success: false, 
        hasAccess: false,
        error: 'Erro interno do servidor'
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}