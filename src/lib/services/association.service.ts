import prisma from '@/lib/prisma';
import { Association } from '@/lib/types';

export async function getAssociationBySubdomain(subdomain: string): Promise<Association | null> {
  try {
    const association = await prisma.association.findUnique({
      where: { subdomain },
    });
    
    if (!association) return null;
    
    // Parse wordpressAuth JSON string
    return {
      ...association,
      wordpressAuth: typeof association.wordpressAuth === 'string' 
        ? JSON.parse(association.wordpressAuth)
        : association.wordpressAuth
    } as Association;
  } catch (error) {
    console.error('Error finding association by subdomain:', error);
    return null;
  }
}

export async function createAssociation(data: {
  name: string;
  subdomain: string;
  wordpressUrl: string;
  wordpressAuth: {
    apiKey: string;
    username: string;
    password: string;
    [key: string]: any;
  };
  promptContext?: string;
  aiDirectives?: string;
  aiRestrictions?: string;
  patientsList?: string;
}): Promise<{ success: boolean; data?: Association; error?: string }> {
  try {
    const createData: any = {
      name: data.name,
      subdomain: data.subdomain.toLowerCase(),
      wordpressUrl: data.wordpressUrl,
      wordpressAuth: JSON.stringify(data.wordpressAuth),
    };
    
    // Add optional fields only if provided
    if (data.promptContext) {
      createData.promptContext = data.promptContext;
    }
    if (data.aiDirectives) {
      createData.aiDirectives = data.aiDirectives;
    }
    if (data.aiRestrictions) {
      createData.aiRestrictions = data.aiRestrictions;
    }
    if (data.patientsList) {
      createData.patientsList = data.patientsList;
    }
    
    const association = await prisma.association.create({
      data: createData,
    });

    // Parse back for return
    return { 
      success: true, 
      data: {
        ...association,
        wordpressAuth: data.wordpressAuth
      } as Association 
    };
  } catch (error: any) {
    console.error('Error creating association:', error);
    
    if (error.code === 'P2002' && error.meta?.target?.includes('subdomain')) {
      return { success: false, error: 'Subdomínio já está em uso' };
    }
    
    return { success: false, error: 'Erro ao criar associação' };
  }
}

export async function updateAssociation(
  id: string, 
  data: Partial<{
    name: string;
    wordpressUrl: string;
    wordpressAuth: Record<string, any>;
    promptContext: string;
    aiDirectives: string;
    aiRestrictions: string;
    patientsList: string;
    isActive: boolean;
  }>
): Promise<{ success: boolean; data?: Association; error?: string }> {
  try {
    const updateData: any = { ...data };
    
    // Serialize wordpressAuth if provided
    if (data.wordpressAuth) {
      updateData.wordpressAuth = JSON.stringify(data.wordpressAuth);
    }
    
    const association = await prisma.association.update({
      where: { id },
      data: updateData,
    });

    // Parse back for return
    return { 
      success: true, 
      data: {
        ...association,
        wordpressAuth: data.wordpressAuth || 
          (typeof association.wordpressAuth === 'string' 
            ? JSON.parse(association.wordpressAuth)
            : association.wordpressAuth)
      } as Association 
    };
  } catch (error) {
    console.error('Error updating association:', error);
    return { success: false, error: 'Erro ao atualizar associação' };
  }
}

export async function getActiveAssociations(): Promise<Association[]> {
  try {
    const associations = await prisma.association.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
    
    // Parse wordpressAuth for each association
    return associations.map(association => ({
      ...association,
      wordpressAuth: typeof association.wordpressAuth === 'string' 
        ? JSON.parse(association.wordpressAuth)
        : association.wordpressAuth
    })) as Association[];
  } catch (error) {
    console.error('Error getting active associations:', error);
    return [];
  }
}

export async function deleteAssociation(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    await prisma.association.delete({
      where: { id },
    });

    return { success: true };
  } catch (error) {
    console.error('Error deleting association:', error);
    return { success: false, error: 'Erro ao excluir associação' };
  }
}

export async function getAssociationStats(associationId: string): Promise<{
  totalPatients: number;
  totalConversations: number;
  activeConversations: number;
  totalProducts: number;
}> {
  try {
    const [totalPatients, totalConversations, activeConversations, totalProducts] = await Promise.all([
      prisma.patient.count({ where: { associationId } }),
      prisma.conversation.count({ 
        where: { Patient: { associationId } } 
      }),
      prisma.conversation.count({ 
        where: { 
          Patient: { associationId },
          status: { in: ['com_ia', 'fila_humano', 'com_humano'] }
        } 
      }),
      prisma.product.count({ where: { associationId, isActive: true } }),
    ]);

    return {
      totalPatients,
      totalConversations,
      activeConversations,
      totalProducts,
    };
  } catch (error) {
    console.error('Error getting association stats:', error);
    return {
      totalPatients: 0,
      totalConversations: 0,
      activeConversations: 0,
      totalProducts: 0,
    };
  }
}