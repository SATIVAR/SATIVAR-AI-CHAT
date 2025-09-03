import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: { subdomain: string } }
) {
  try {
    const subdomain = params.subdomain;

    // Buscar associação pelo subdomain
    const association = await prisma.association.findUnique({
      where: { subdomain },
      select: {
        id: true,
        name: true,
        subdomain: true,
        publicDisplayName: true,
        logoUrl: true,
        isActive: true
      }
    });

    if (!association) {
      return NextResponse.json(
        { success: false, error: 'Associação não encontrada' },
        { status: 404 }
      );
    }

    if (!association.isActive) {
      return NextResponse.json(
        { success: false, error: 'Associação inativa' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      association
    });

  } catch (error) {
    console.error('Erro ao buscar informações da associação:', error);
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