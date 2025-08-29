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