import prisma from '@/lib/prisma';
import { Patient, PatientFormData } from '@/lib/types';
import { sanitizePhone } from '@/lib/utils/phone';

export async function findPatientByWhatsapp(whatsapp: string, associationId: string): Promise<Patient | null> {
  try {
    // Fase 1: Sanitizar o WhatsApp antes da busca
    const cleanWhatsapp = sanitizePhone(whatsapp);

    const patient = await prisma.patient.findFirst({
      where: {
        whatsapp: cleanWhatsapp,
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

    // Fase 1: Sanitizar dados antes de salvar
    const cleanWhatsapp = sanitizePhone(data.whatsapp);
    const cleanCpf = data.cpf ? data.cpf.replace(/\D/g, '') : null;

    const patient = await prisma.patient.create({
      data: {
        id: generateId(),
        name: data.name,
        whatsapp: cleanWhatsapp,
        email: data.email || null,
        cpf: cleanCpf,
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
    // Fase 1: Sanitizar dados antes de atualizar
    const updateData: any = {
      ...(data.name && { name: data.name }),
      ...(data.whatsapp && { whatsapp: sanitizePhone(data.whatsapp) }),
      ...(data.email !== undefined && { email: data.email || null }),
      ...(data.cpf !== undefined && { cpf: data.cpf ? data.cpf.replace(/\D/g, '') : null }),
      ...(data.tipo_associacao !== undefined && { tipo_associacao: data.tipo_associacao || null }),
      ...(data.nome_responsavel !== undefined && { nome_responsavel: data.nome_responsavel || null }),
      ...(data.cpf_responsavel !== undefined && { cpf_responsavel: data.cpf_responsavel || null }),
      ...(data.status && { status: data.status }),
      ...(data.wordpress_id !== undefined && { wordpress_id: data.wordpress_id || null }),
      updatedAt: new Date(),
    };

    const patient = await prisma.patient.update({
      where: { id },
      data: updateData,
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

// Enhanced Patient Service with ACF data preservation - Task 2 Implementation
export async function syncPatientWithWordPressACF(
  whatsapp: string,
  wordpressData: any,
  associationId: string
): Promise<{ success: boolean; data?: Patient; error?: string; syncMetadata?: any }> {
  try {
    console.log('[Patient Service] Enhanced ACF Sync: Starting WordPress data synchronization');
    
    // Task 2.1: Validate ACF data integrity before processing
    const acfValidationResult = validateACFDataIntegrity(wordpressData);
    if (!acfValidationResult.isValid) {
      logSyncDiscrepancy('ACF_VALIDATION_FAILED', {
        expected: 'Valid ACF data structure',
        received: wordpressData,
        validationErrors: acfValidationResult.errors
      });
      
      // Continue with fallback but log the issue
      console.warn('[Patient Service] ACF validation failed, proceeding with available data:', acfValidationResult.errors);
    }

    // Task 2.2: Preserve ACF fields properly during WordPress sync
    const acfData = preserveACFFields(wordpressData);
    
    console.log('[Patient Service] ACF Data Preservation Result:', {
      originalFieldCount: wordpressData.acf ? Object.keys(wordpressData.acf).length : 0,
      preservedFieldCount: Object.keys(acfData).length,
      preservedFields: Object.keys(acfData),
      criticalFields: {
        telefone: acfData.telefone,
        nome_completo: acfData.nome_completo,
        tipo_associacao: acfData.tipo_associacao,
        nome_responsavel: acfData.nome_responsavel || acfData.nome_completo_responc,
        cpf: acfData.cpf,
        cpf_responsavel: acfData.cpf_responsavel
      }
    });

    // Task 2.3: Enhanced data mapping with comprehensive field handling
    const patientData: PatientFormData = mapWordPressDataToPatient(wordpressData, acfData, whatsapp);
    
    // Task 2.4: Log detailed sync information for monitoring
    const syncMetadata = {
      wordpressId: wordpressData.id,
      syncTimestamp: new Date().toISOString(),
      acfFieldsCount: Object.keys(acfData).length,
      dataSource: 'wordpress_acf',
      validationPassed: acfValidationResult.isValid,
      mappedFields: Object.keys(patientData).filter(key => patientData[key as keyof PatientFormData] !== null && patientData[key as keyof PatientFormData] !== undefined)
    };

    console.log('[Patient Service] Enhanced Sync Metadata:', syncMetadata);

    // Find existing patient
    const existingPatient = await findPatientByWhatsapp(sanitizePhone(whatsapp), associationId);

    if (existingPatient) {
      console.log('[Patient Service] Updating existing patient with enhanced ACF data');
      
      // Task 2.5: Compare existing data with new data for discrepancy detection
      const discrepancies = detectDataDiscrepancies(existingPatient, patientData);
      if (discrepancies.length > 0) {
        logSyncDiscrepancy('DATA_DISCREPANCY_DETECTED', {
          patientId: existingPatient.id,
          discrepancies: discrepancies,
          existingData: existingPatient,
          newData: patientData
        });
      }

      const updateResult = await updatePatient(existingPatient.id, patientData);

      if (updateResult.success) {
        console.log('[Patient Service] Patient updated successfully with enhanced ACF data:', updateResult.data?.id);
        return { 
          ...updateResult, 
          syncMetadata: { 
            ...syncMetadata, 
            operation: 'update',
            discrepanciesFound: discrepancies.length,
            previousData: existingPatient
          } 
        };
      } else {
        logSyncDiscrepancy('UPDATE_FAILED', {
          patientId: existingPatient.id,
          error: updateResult.error,
          attemptedData: patientData
        });
        return updateResult;
      }
    } else {
      console.log('[Patient Service] Creating new patient with enhanced ACF data');
      const createResult = await createPatient(patientData, associationId);

      if (createResult.success) {
        console.log('[Patient Service] New patient created successfully with enhanced ACF data:', createResult.data?.id);
        return { 
          ...createResult, 
          syncMetadata: { 
            ...syncMetadata, 
            operation: 'create' 
          } 
        };
      } else {
        logSyncDiscrepancy('CREATE_FAILED', {
          error: createResult.error,
          attemptedData: patientData
        });
        return createResult;
      }
    }
  } catch (error) {
    console.error('[Patient Service] Enhanced ACF Sync Error:', error);
    logSyncDiscrepancy('SYNC_EXCEPTION', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      wordpressData: wordpressData,
      whatsapp: whatsapp,
      associationId: associationId
    });
    
    return { 
      success: false, 
      error: 'Erro ao sincronizar dados do paciente com WordPress - Enhanced ACF Sync',
      syncMetadata: {
        operation: 'failed',
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      }
    };
  }
}

// Task 2.1: ACF Data Integrity Validation
interface ACFValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

function validateACFDataIntegrity(wordpressData: any): ACFValidationResult {
  const result: ACFValidationResult = {
    isValid: true,
    errors: [],
    warnings: []
  };

  // Check if ACF data exists
  if (!wordpressData.acf) {
    result.errors.push('ACF data is missing from WordPress response');
    result.isValid = false;
    return result;
  }

  // Check if ACF is an object (not an array)
  if (Array.isArray(wordpressData.acf)) {
    result.errors.push('ACF data is an array instead of object - data mapping issue detected');
    result.isValid = false;
  }

  // Check for required fields
  const requiredFields = ['telefone', 'nome_completo'];
  const acfData = wordpressData.acf;

  requiredFields.forEach(field => {
    if (!acfData[field]) {
      result.errors.push(`Required ACF field '${field}' is missing or empty`);
      result.isValid = false;
    }
  });

  // Check for interlocutor-specific fields
  if (acfData.tipo_associacao === 'assoc_respon') {
    if (!acfData.nome_responsavel && !acfData.nome_completo_responc) {
      result.warnings.push('Responsible person name is missing for responsible association type');
    }
    if (!acfData.cpf_responsavel) {
      result.warnings.push('Responsible person CPF is missing for responsible association type');
    }
  }

  // Validate phone format
  if (acfData.telefone && typeof acfData.telefone === 'string') {
    const cleanPhone = acfData.telefone.replace(/\D/g, '');
    if (cleanPhone.length < 10 || cleanPhone.length > 11) {
      result.warnings.push('Phone number format may be invalid');
    }
  }

  // Validate CPF format if present
  if (acfData.cpf && typeof acfData.cpf === 'string') {
    const cleanCpf = acfData.cpf.replace(/\D/g, '');
    if (cleanCpf.length !== 11) {
      result.warnings.push('CPF format may be invalid');
    }
  }

  return result;
}

// Task 2.2: ACF Fields Preservation
function preserveACFFields(wordpressData: any): Record<string, any> {
  // Ensure we preserve all ACF data without modification
  const acfData = wordpressData.acf || {};
  
  // Create a deep copy to avoid reference issues
  const preservedData = JSON.parse(JSON.stringify(acfData));
  
  // Log preservation details
  console.log('[Patient Service] ACF Fields Preservation:', {
    originalType: typeof wordpressData.acf,
    originalIsArray: Array.isArray(wordpressData.acf),
    preservedType: typeof preservedData,
    preservedIsArray: Array.isArray(preservedData),
    fieldCount: Object.keys(preservedData).length,
    fields: Object.keys(preservedData)
  });

  return preservedData;
}

// Task 2.3: Enhanced WordPress Data Mapping
function mapWordPressDataToPatient(wordpressData: any, acfData: Record<string, any>, whatsapp: string): PatientFormData {
  // Enhanced name resolution with multiple fallbacks
  let patientName = acfData.nome_completo || 
                   wordpressData.name || 
                   wordpressData.display_name ||
                   `${wordpressData.first_name || ''} ${wordpressData.last_name || ''}`.trim() ||
                   `Cliente ${wordpressData.id}`;

  // Enhanced responsible name resolution
  let responsibleName = acfData.nome_responsavel || 
                       acfData.nome_completo_responc || 
                       acfData.nome_completo_responsavel ||
                       null;

  // Enhanced CPF handling with validation
  let patientCpf = null;
  if (acfData.cpf && typeof acfData.cpf === 'string') {
    patientCpf = acfData.cpf.replace(/\D/g, '');
    if (patientCpf.length !== 11) {
      console.warn('[Patient Service] Invalid CPF format detected:', acfData.cpf);
      patientCpf = null;
    }
  }

  let responsibleCpf = null;
  if (acfData.cpf_responsavel && typeof acfData.cpf_responsavel === 'string') {
    responsibleCpf = acfData.cpf_responsavel.replace(/\D/g, '');
    if (responsibleCpf.length !== 11) {
      console.warn('[Patient Service] Invalid responsible CPF format detected:', acfData.cpf_responsavel);
      responsibleCpf = null;
    }
  }

  const mappedData: PatientFormData = {
    name: patientName,
    whatsapp: sanitizePhone(whatsapp),
    email: wordpressData.email || wordpressData.user_email || null,
    cpf: patientCpf,
    tipo_associacao: acfData.tipo_associacao || null,
    nome_responsavel: responsibleName,
    cpf_responsavel: responsibleCpf,
    status: 'MEMBRO',
    wordpress_id: wordpressData.id?.toString() || null,
  };

  console.log('[Patient Service] Enhanced Data Mapping Result:', {
    inputFields: Object.keys(acfData).length,
    mappedFields: Object.keys(mappedData).filter(key => mappedData[key as keyof PatientFormData] !== null).length,
    mapping: {
      name: `${acfData.nome_completo ? 'ACF' : 'WordPress'} -> ${patientName}`,
      tipo_associacao: acfData.tipo_associacao || 'null',
      responsible: responsibleName ? 'mapped' : 'null',
      cpf: patientCpf ? 'valid' : 'null',
      responsible_cpf: responsibleCpf ? 'valid' : 'null'
    }
  });

  return mappedData;
}

// Task 2.4: Sync Discrepancy Logging
interface SyncDiscrepancy {
  type: string;
  timestamp: string;
  details: any;
}

function logSyncDiscrepancy(type: string, details: any): void {
  const discrepancy: SyncDiscrepancy = {
    type,
    timestamp: new Date().toISOString(),
    details
  };

  console.error(`[Patient Service] SYNC DISCREPANCY [${type}]:`, discrepancy);
  
  // In production, this could be sent to a monitoring service
  // For now, we'll use detailed console logging
  if (type === 'DATA_DISCREPANCY_DETECTED') {
    console.table(details.discrepancies);
  }
}

// Task 2.5: Data Discrepancy Detection
interface DataDiscrepancy {
  field: string;
  existingValue: any;
  newValue: any;
  severity: 'low' | 'medium' | 'high';
}

function detectDataDiscrepancies(existingPatient: Patient, newPatientData: PatientFormData): DataDiscrepancy[] {
  const discrepancies: DataDiscrepancy[] = [];
  
  // Define field importance for severity assessment
  const highImportanceFields = ['name', 'cpf', 'tipo_associacao'];
  const mediumImportanceFields = ['nome_responsavel', 'cpf_responsavel', 'email'];
  
  // Check each field for discrepancies
  const fieldsToCheck: (keyof PatientFormData)[] = [
    'name', 'email', 'cpf', 'tipo_associacao', 'nome_responsavel', 'cpf_responsavel'
  ];

  fieldsToCheck.forEach(field => {
    const existingValue = existingPatient[field as keyof Patient];
    const newValue = newPatientData[field];
    
    if (existingValue !== newValue && newValue !== null && newValue !== undefined) {
      let severity: 'low' | 'medium' | 'high' = 'low';
      
      if (highImportanceFields.includes(field)) {
        severity = 'high';
      } else if (mediumImportanceFields.includes(field)) {
        severity = 'medium';
      }
      
      discrepancies.push({
        field,
        existingValue,
        newValue,
        severity
      });
    }
  });

  return discrepancies;
}

// Nova função para criar LEAD (paciente não encontrado no WordPress)
export async function createPatientLead(
  whatsapp: string,
  name: string,
  cpf: string,
  associationId: string
): Promise<{ success: boolean; data?: Patient; error?: string }> {
  try {
    // Fase 1: Sanitizar dados antes de criar o lead
    const leadData: PatientFormData = {
      name: name.trim(),
      whatsapp: sanitizePhone(whatsapp),
      cpf: cpf.replace(/\D/g, ''),
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

// Nova função para excluir qualquer paciente (apenas no CRM, não afeta WordPress)
export async function deletePatient(
  patientId: string,
  associationId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Verificar se o paciente existe na associação correta
    const patient = await prisma.patient.findFirst({
      where: {
        id: patientId,
        associationId,
        isActive: true
      },
    });

    if (!patient) {
      return {
        success: false,
        error: 'Paciente não encontrado ou já foi excluído'
      };
    }

    // Soft delete - marcar como inativo (não afeta WordPress)
    await prisma.patient.update({
      where: { id: patientId },
      data: {
        isActive: false,
        updatedAt: new Date()
      },
    });

    console.log(`[Patient Service] Patient deleted successfully from CRM: ${patientId} (Status: ${patient.status})`);
    console.log(`[Patient Service] WordPress data remains unchanged for patient with WordPress ID: ${patient.wordpress_id || 'N/A'}`);

    return { success: true };
  } catch (error) {
    console.error('Error deleting patient:', error);
    return { success: false, error: 'Erro ao excluir paciente' };
  }
}