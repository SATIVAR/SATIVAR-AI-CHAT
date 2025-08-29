import { NextRequest, NextResponse } from 'next/server';
import { updateAssociation, deleteAssociation } from '@/lib/services/association.service';
import prisma from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const association = await prisma.association.findUnique({
      where: { id: params.id },
    });

    if (!association) {
      return NextResponse.json(
        { error: 'Associação não encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      association,
    });

  } catch (error) {
    console.error('Error getting association:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { name, wordpressUrl, wordpressAuth, promptContext, aiDirectives, aiRestrictions, patientsList, isActive } = body;

    const result = await updateAssociation(params.id, {
      name,
      wordpressUrl,
      wordpressAuth: wordpressAuth ? (typeof wordpressAuth === 'string' ? JSON.parse(wordpressAuth) : wordpressAuth) : undefined,
      promptContext,
      aiDirectives,
      aiRestrictions,
      patientsList,
      isActive,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      association: result.data,
    });

  } catch (error) {
    console.error('Error updating association:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const result = await deleteAssociation(params.id);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Associação excluída com sucesso',
    });

  } catch (error) {
    console.error('Error deleting association:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}