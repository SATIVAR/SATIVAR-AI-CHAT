import { NextRequest, NextResponse } from 'next/server';
import { updateAssociation, deleteAssociation, getAssociationById } from '@/lib/services/association.service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const association = await getAssociationById(id);

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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    console.log('API Route - Received data:', body);
    const { name, subdomain, wordpressUrl, wordpressUrlDev, wordpressAuth, apiConfig, promptContext, aiDirectives, aiRestrictions, patientsList, publicDisplayName, logoUrl, welcomeMessage, isActive } = body;

    const result = await updateAssociation(id, {
      name,
      subdomain,
      wordpressUrl,
      wordpressUrlDev,
      wordpressAuth: wordpressAuth ? (typeof wordpressAuth === 'string' ? JSON.parse(wordpressAuth) : wordpressAuth) : undefined,
      apiConfig,
      promptContext,
      aiDirectives,
      aiRestrictions,
      patientsList,
      publicDisplayName,
      logoUrl,
      welcomeMessage,
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await deleteAssociation(id);

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