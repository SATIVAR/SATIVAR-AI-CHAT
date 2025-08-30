import prisma from '@/lib/prisma';
import { Patient, PatientFormData } from '@/lib/types';

export async function findPatientByWhatsapp(whatsapp: string, associationId: string): Promise<Patient | null> {
  try {
    const patient = await prisma.patient.findFirst({
      where: { 
        whatsapp,
        associationId 
      },
    });
    return patient;
  } catch (error) {
    console.error('Error finding patient by WhatsApp:', error);
    return null;
  }
}

export async function createPatient(data: PatientFormData, associationId: string): Promise<{ success: boolean; data?: Patient; error?: string }> {
  try {
    const generateId = () => {
      return Math.random().toString(36).substring(2) + Date.now().toString(36);
    };

    const patient = await prisma.patient.create({
      data: {
        id: generateId(),
        name: data.name,
        whatsapp: data.whatsapp,
        email: data.email || null,
        cpf: data.cpf || null,
        tipo_associacao: data.tipo_associacao || null,
        nome_responsavel: data.nome_responsavel || null,
        cpf_responsavel: data.cpf_responsavel || null,
        status: data.status || 'LEAD',
        wordpress_id: data.wordpress_id || null,
        associationId,
        updatedAt: new Date(),
      },
    });

    return { success: true, data: patient };
  } catch (error: any) {
    console.error('Error creating patient:', error);
    
    if (error.code === 'P2002' && error.meta?.target?.includes('whatsapp')) {
      return { success: false, error: 'WhatsApp já cadastrado no sistema' };
    }
    
    return { success: false, error: 'Erro ao criar paciente' };
  }
}

export async function updatePatient(id: string, data: Partial<PatientFormData>): Promise<{ success: boolean; data?: Patient; error?: string }> {
  try {
    const patient = await prisma.patient.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.whatsapp && { whatsapp: data.whatsapp }),
        ...(data.email !== undefined && { email: data.email || null }),
        ...(data.cpf !== undefined && { cpf: data.cpf || null }),
        ...(data.tipo_associacao !== undefined && { tipo_associacao: data.tipo_associacao || null }),
        ...(data.nome_responsavel !== undefined && { nome_responsavel: data.nome_responsavel || null }),
        ...(data.cpf_responsavel !== undefined && { cpf_responsavel: data.cpf_responsavel || null }),
        ...(data.status && { status: data.status }),
        ...(data.wordpress_id !== undefined && { wordpress_id: data.wordpress_id || null }),
        updatedAt: new Date(),
      },
    });

    return { success: true, data: patient };
  } catch (error: any) {
    console.error('Error updating patient:', error);
    
    if (error.code === 'P2002' && error.meta?.target?.includes('whatsapp')) {
      return { success: false, error: 'WhatsApp já cadastrado por outro paciente' };
    }
    
    return { success: false, error: 'Erro ao atualizar paciente' };
  }
}

export async function findPatientById(id: string, associationId: string): Promise<Patient | null> {
  try {
    const patient = await prisma.patient.findFirst({
      where: { 
        id,
        associationId 
      },
    });
    return patient;
  } catch (error) {
    console.error('Error finding patient by ID:', error);
    return null;
  }
}

export async function completePatientRegistration(
  patientId: string, 
  data: { name: string; cpf?: string; wordpressId?: string }, 
  associationId: string
): Promise<{ success: boolean; data?: Patient; error?: string }> {
  try {
    // Verify patient belongs to the association
    const existingPatient = await prisma.patient.findFirst({
      where: { 
        id: patientId,
        associationId 
      },
    });
    
    if (!existingPatient) {
      return { success: false, error: 'Paciente não encontrado ou não pertence à associação' };
    }
    
    // Update patient with complete information
    const updatedPatient = await prisma.patient.update({
      where: { id: patientId },
      data: {
        name: data.name,
        // Store CPF and WordPress ID in email field as metadata (temporary solution)
        // In production, you should add proper CPF and wordpressId fields to the schema
        email: [
          data.cpf ? `cpf:${data.cpf}` : null,
          data.wordpressId ? `wp:${data.wordpressId}` : null,
          existingPatient.email?.startsWith('cpf:') || existingPatient.email?.startsWith('wp:') ? null : existingPatient.email
        ].filter(Boolean).join('|') || null,
        updatedAt: new Date(),
      },
    });
    
    return { success: true, data: updatedPatient };
  } catch (error: any) {
    console.error('Error completing patient registration:', error);
    return { success: false, error: 'Erro ao finalizar cadastro do paciente' };
  }
}

export async function findOrCreatePatient(data: PatientFormData, associationId: string): Promise<{ success: boolean; data?: Patient; error?: string; isNew?: boolean }> {
  try {
    // First, try to find existing patient within the association
    const existingPatient = await findPatientByWhatsapp(data.whatsapp, associationId);
    
    if (existingPatient) {
      // Update patient info if provided
      if (data.name !== existingPatient.name || data.email !== existingPatient.email) {
        const updateResult = await updatePatient(existingPatient.id, data);
        if (updateResult.success) {
          return { success: true, data: updateResult.data, isNew: false };
        }
      }
      return { success: true, data: existingPatient, isNew: false };
    }
    
    // Create new patient
    const createResult = await createPatient(data, associationId);
    if (createResult.success) {
      return { success: true, data: createResult.data, isNew: true };
    }
    
    return createResult;
  } catch (error) {
    console.error('Error in findOrCreatePatient:', error);
    return { success: false, error: 'Erro ao processar dados do paciente' };
  }
}

// Fase 2: Função refatorada para sincronização com dados ACF do WordPress
export async function syncPatientWithWordPressACF(
  whatsapp: string, 
  wordpressData: any, 
  associationId: string
): Promise<{ success: boolean; data?: Patient; error?: string }> {
  try {
    console.log('[Patient Service] Fase 2: Syncing patient with WordPress ACF data');
    console.log('[Patient Service] WordPress data received:', {
      id: wordpressData.id,
      name: wordpressData.name,
      email: wordpressData.email,
      acf: wordpressData.acf ? Object.keys(wordpressData.acf) : 'no ACF data'
    });
    
    const acfData = wordpressData.acf || {};
    
    // Fase 2: Analisar o objeto acf completo recebido
    // Preencher todas as colunas correspondentes na tabela Pacientes do SatiZap
    const patientData: PatientFormData = {
      name: acfData.nome_completo || wordpressData.name || `${wordpressData.first_name || ''} ${wordpressData.last_name || ''}`.trim(),
      whatsapp: whatsapp,
      email: wordpressData.email || null,
      cpf: acfData.cpf || null,
      tipo_associacao: acfData.tipo_associacao || null,
      nome_responsavel: acfData.nome_responsavel || null,
      cpf_responsavel: acfData.cpf_responsavel || null,
      status: 'MEMBRO', // Definir o status do paciente como 'MEMBRO' e salvar o wordpress_id
      wordpress_id: wordpressData.id?.toString() || null,
    };

    console.log('[Patient Service] Prepared patient data for sync:', {
      name: patientData.name,
      whatsapp: patientData.whatsapp,
      status: patientData.status,
      wordpress_id: patientData.wordpress_id,
      hasACFData: Object.keys(acfData).length > 0
    });

    // Procurar paciente existente no SatiZap
    const existingPatient = await findPatientByWhatsapp(whatsapp, associationId);
    
    if (existingPatient) {
      console.log('[Patient Service] Existing patient found, updating with WordPress ACF data');
      // Atualizar paciente existente com dados completos do WordPress
      const updateResult = await updatePatient(existingPatient.id, patientData);
      
      if (updateResult.success) {
        console.log('[Patient Service] Patient updated successfully:', updateResult.data?.id);
      } else {
        console.error('[Patient Service] Failed to update patient:', updateResult.error);
      }
      
      return updateResult;
    } else {
      console.log('[Patient Service] No existing patient found, creating new patient with WordPress ACF data');
      // Criar novo paciente com dados completos do WordPress
      const createResult = await createPatient(patientData, associationId);
      
      if (createResult.success) {
        console.log('[Patient Service] New patient created successfully:', createResult.data?.id);
      } else {
        console.error('[Patient Service] Failed to create patient:', createResult.error);
      }
      
      return createResult;
    }
  } catch (error) {
    console.error('[Patient Service] Error syncing patient with WordPress ACF:', error);
    return { success: false, error: 'Erro ao sincronizar dados do paciente com WordPress' };
  }
}

// Nova função para criar LEAD (paciente não encontrado no WordPress)
export async function createPatientLead(
  whatsapp: string, 
  name: string, 
  cpf: string, 
  associationId: string
): Promise<{ success: boolean; data?: Patient; error?: string }> {
  try {
    const leadData: PatientFormData = {
      name: name,
      whatsapp: whatsapp,
      cpf: cpf,
      status: 'LEAD', // Status LEAD para pacientes não encontrados no WordPress
      // Outros campos ACF ficam NULL para LEADs
    };

    const createResult = await createPatient(leadData, associationId);
    return createResult;
  } catch (error) {
    console.error('Error creating patient lead:', error);
    return { success: false, error: 'Erro ao criar lead do paciente' };
  }
}

// Nova função para buscar pacientes com paginação
export async function getPatients(params: {
  associationId: string;
  searchQuery?: string;
  page?: number;
  limit?: number;
  status?: 'LEAD' | 'MEMBRO';
}): Promise<{
  patients: Patient[];
  totalCount: number;
  totalPages: number;
}> {
  try {
    const { associationId, searchQuery = '', page = 1, limit = 10, status } = params;
    const skip = (page - 1) * limit;

    const whereClause: any = {
      associationId,
      isActive: true,
    };

    if (status) {
      whereClause.status = status;
    }

    if (searchQuery) {
      whereClause.OR = [
        { name: { contains: searchQuery, mode: 'insensitive' } },
        { whatsapp: { contains: searchQuery } },
        { cpf: { contains: searchQuery } },
        { email: { contains: searchQuery, mode: 'insensitive' } },
      ];
    }

    const [patients, totalCount] = await Promise.all([
      prisma.patient.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.patient.count({ where: whereClause }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return {
      patients,
      totalCount,
      totalPages,
    };
  } catch (error) {
    console.error('Error getting patients:', error);
    return {
      patients: [],
      totalCount: 0,
      totalPages: 0,
    };
  }
}

// Nova função para excluir lead não convertido
export async function deletePatientLead(
  patientId: string, 
  associationId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Verificar se o paciente existe e é um LEAD da associação correta
    const patient = await prisma.patient.findFirst({
      where: { 
        id: patientId,
        associationId,
        status: 'LEAD' // Só permite excluir LEADs
      },
    });
    
    if (!patient) {
      return { 
        success: false, 
        error: 'Lead não encontrado ou não pode ser excluído (apenas LEADs não convertidos podem ser excluídos)' 
      };
    }
    
    // Soft delete - marcar como inativo
    await prisma.patient.update({
      where: { id: patientId },
      data: { 
        isActive: false,
        updatedAt: new Date()
      },
    });
    
    console.log(`[Patient Service] Lead deleted successfully: ${patientId}`);
    return { success: true };
  } catch (error) {
    console.error('Error deleting patient lead:', error);
    return { success: false, error: 'Erro ao excluir lead' };
  }
}