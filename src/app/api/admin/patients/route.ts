import { NextRequest, NextResponse } from 'next/server';
import { getPatients, deletePatientLead } from '@/lib/services/patient.service';
import { getUserSessionFromRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getUserSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const associationId = searchParams.get('associationId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const searchQuery = searchParams.get('search') || '';
    const status = searchParams.get('status') as 'LEAD' | 'MEMBRO' | null;

    if (!associationId) {
      return NextResponse.json({ error: 'ID da associação é obrigatório' }, { status: 400 });
    }

    // Check if user has access to this association
    if (session.role === 'manager' && session.associationId !== associationId) {
      return NextResponse.json({ error: 'Acesso negado a esta associação' }, { status: 403 });
    }

    const data = await getPatients({
      associationId,
      searchQuery,
      page,
      limit,
      status: status || undefined,
    });

    // Serialize dates for client components
    const serializablePatients = data.patients.map((patient: any) => ({
      ...patient,
      createdAt: patient.createdAt instanceof Date ? patient.createdAt.toISOString() : patient.createdAt,
      updatedAt: patient.updatedAt instanceof Date ? patient.updatedAt.toISOString() : patient.updatedAt,
    }));

    return NextResponse.json({
      patients: serializablePatients,
      totalCount: data.totalCount,
      totalPages: data.totalPages,
    });

  } catch (error) {
    console.error('Erro ao buscar pacientes:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Check authentication
    const session = await getUserSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('patientId');
    const associationId = searchParams.get('associationId');

    if (!patientId || !associationId) {
      return NextResponse.json({ error: 'ID do paciente e da associação são obrigatórios' }, { status: 400 });
    }

    // Check if user has access to this association
    if (session.role === 'manager' && session.associationId !== associationId) {
      return NextResponse.json({ error: 'Acesso negado a esta associação' }, { status: 403 });
    }

    const result = await deletePatientLead(patientId, associationId);

    if (result.success) {
      return NextResponse.json({ message: 'Lead excluído com sucesso' });
    } else {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

  } catch (error) {
    console.error('Erro ao excluir lead:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}