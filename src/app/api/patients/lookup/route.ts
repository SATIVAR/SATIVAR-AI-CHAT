import { NextRequest, NextResponse } from 'next/server';
import { findPatientByWhatsapp } from '@/lib/services/patient.service';
import { getTenantContext } from '@/lib/middleware/tenant';

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

    // Look for existing patient within this association
    const existingPatient = await findPatientByWhatsapp(whatsapp, tenantContext.association.id);

    if (existingPatient) {
      return NextResponse.json({
        exists: true,
        patient: {
          id: existingPatient.id,
          name: existingPatient.name,
          whatsapp: existingPatient.whatsapp,
        }
      });
    }

    return NextResponse.json({
      exists: false
    });

  } catch (error) {
    console.error('Error in patient lookup:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}