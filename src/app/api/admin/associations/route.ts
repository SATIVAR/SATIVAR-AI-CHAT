import { NextRequest, NextResponse } from 'next/server';
import { getActiveAssociations, createAssociation, getAssociationStats } from '@/lib/services/association.service';
import { Association } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const associations = await getActiveAssociations();
    
    return NextResponse.json({
      success: true,
      associations,
    });

  } catch (error) {
    console.error('Error getting associations:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, subdomain, wordpressUrl, wordpressAuth, apiConfig, promptContext, aiDirectives, aiRestrictions, patientsList, publicDisplayName, logoUrl, welcomeMessage } = body;

    if (!name || !subdomain || !wordpressUrl || !wordpressAuth) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: name, subdomain, wordpressUrl, wordpressAuth' },
        { status: 400 }
      );
    }

    const result = await createAssociation({
      name,
      subdomain,
      wordpressUrl,
      wordpressAuth: typeof wordpressAuth === 'string' ? JSON.parse(wordpressAuth) : wordpressAuth,
      apiConfig,
      promptContext,
      aiDirectives,
      aiRestrictions,
      patientsList,
      publicDisplayName,
      logoUrl,
      welcomeMessage,
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
    console.error('Error creating association:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}