import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/middleware/tenant';

/**
 * @deprecated This endpoint is being replaced by /api/patients/validate-whatsapp
 * Keeping for backward compatibility during transition
 */
export async function POST(request: NextRequest) {
  try {
    // Get tenant context from middleware
    const tenantContext = await getTenantContext(request);
    if (!tenantContext) {
      return NextResponse.json(
        { error: 'Associação não encontrada' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { whatsapp } = body;

    if (!whatsapp) {
      return NextResponse.json(
        { error: 'WhatsApp é obrigatório' },
        { status: 400 }
      );
    }

    // Redirect to new validation endpoint
    const validateUrl = new URL('/api/patients/validate-whatsapp', request.url);
    
    const validateResponse = await fetch(validateUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Forward tenant headers
        'host': request.headers.get('host') || ''
      },
      body: JSON.stringify({ whatsapp })
    });
    
    const validateResult = await validateResponse.json();
    
    if (validateResult.status === 'patient_found') {
      return NextResponse.json({
        exists: true,
        patient: validateResult.patient
      });
    }
    
    return NextResponse.json({
      exists: false
    });

  } catch (error) {
    console.error('Error in patient lookup (legacy):', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}