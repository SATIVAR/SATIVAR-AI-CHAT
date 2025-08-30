import prisma from '@/lib/prisma';
import { Association, ApiConfig } from '@/lib/types';
import { encryptApiConfig, decryptApiConfig } from '@/lib/crypto';

/**
 * Sanitizes password by removing all whitespace characters
 * This ensures WordPress application passwords work correctly regardless of how they were copied
 */
function sanitizePassword(password: string): string {
  return password.replace(/\s/g, '');
}

/**
 * Sanitizes API configuration credentials before encryption
 */
function sanitizeApiConfig(apiConfig: ApiConfig): ApiConfig {
  const sanitized = { ...apiConfig };
  
  if (sanitized.credentials.applicationPassword?.password) {
    sanitized.credentials.applicationPassword.password = sanitizePassword(
      sanitized.credentials.applicationPassword.password
    );
  }
  
  return sanitized;
}

export async function getAssociationBySubdomain(subdomain: string): Promise<Association | null> {
  try {
    const association = await prisma.association.findUnique({
      where: { subdomain },
    });
    
    if (!association) return null;
    
    return await parseAssociationData(association);
  } catch (error) {
    console.error('Error finding association by subdomain:', error);
    return null;
  }
}

export async function getAssociationById(id: string): Promise<Association | null> {
  try {
    const association = await prisma.association.findUnique({
      where: { id },
    });
    
    if (!association) return null;
    
    return await parseAssociationData(association);
  } catch (error) {
    console.error('Error finding association by ID:', error);
    return null;
  }
}

/**
 * Helper function to parse association data consistently
 */
async function parseAssociationData(association: any): Promise<Association> {
  // Parse wordpressAuth JSON string
  let wordpressAuth = typeof association.wordpressAuth === 'string' 
    ? JSON.parse(association.wordpressAuth)
    : association.wordpressAuth;
  
  // Parse and decrypt apiConfig if present
  let apiConfig: ApiConfig | undefined;
  if (association.apiConfig) {
    try {
      apiConfig = await decryptApiConfig(association.apiConfig);
    } catch (error) {
      console.error('Error decrypting API config:', error);
      // Continue without apiConfig if decryption fails
      apiConfig = undefined;
    }
  }
  
  return {
    ...association,
    wordpressAuth,
    apiConfig
  } as Association;
}

export async function createAssociation(data: {
  name: string;
  subdomain: string;
  wordpressUrl: string;
  wordpressUrlDev?: string | null;
  wordpressAuth: {
    apiKey: string;
    username: string;
    password: string;
    [key: string]: any;
  };
  apiConfig?: ApiConfig; // New field
  promptContext?: string;
  aiDirectives?: string;
  aiRestrictions?: string;
  patientsList?: string;
  // Public display fields for welcome screen personalization
  publicDisplayName?: string;
  logoUrl?: string;
  welcomeMessage?: string;
}): Promise<{ success: boolean; data?: Association; error?: string }> {
  try {
    const createData: any = {
      name: data.name,
      subdomain: data.subdomain.toLowerCase(),
      wordpressUrl: data.wordpressUrl,
      wordpressUrlDev: data.wordpressUrlDev || null,
      wordpressAuth: JSON.stringify(data.wordpressAuth),
    };
    
    // Encrypt and store apiConfig if provided
    if (data.apiConfig) {
      try {
        // Sanitize password before encryption
        const sanitizedApiConfig = sanitizeApiConfig(data.apiConfig);
        createData.apiConfig = await encryptApiConfig(sanitizedApiConfig);
      } catch (error) {
        console.error('Error encrypting API config:', error);
        return { success: false, error: 'Erro ao criptografar configuração da API' };
      }
    }
    
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
    // Add public display fields if provided
    if (data.publicDisplayName) {
      createData.publicDisplayName = data.publicDisplayName;
    }
    if (data.logoUrl) {
      createData.logoUrl = data.logoUrl;
    }
    if (data.welcomeMessage) {
      createData.welcomeMessage = data.welcomeMessage;
    }
    
    const association = await prisma.association.create({
      data: createData,
    });

    // Parse back for return
    return { 
      success: true, 
      data: {
        ...association,
        wordpressAuth: data.wordpressAuth,
        apiConfig: data.apiConfig
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
    subdomain: string;
    wordpressUrl: string;
    wordpressUrlDev?: string | null;
    wordpressAuth: Record<string, any>;
    apiConfig: ApiConfig; // New field
    promptContext: string;
    aiDirectives: string;
    aiRestrictions: string;
    patientsList: string;
    // Public display fields for welcome screen personalization
    publicDisplayName: string;
    logoUrl: string;
    welcomeMessage: string;
    isActive: boolean;
  }>
): Promise<{ success: boolean; data?: Association; error?: string }> {
  try {
    console.log('UpdateAssociation service - Received data:', data);
    const updateData: any = { ...data };
    
    // Handle wordpressUrlDev specifically to ensure null values are properly set
    if ('wordpressUrlDev' in data) {
      updateData.wordpressUrlDev = data.wordpressUrlDev;
    }
    
    // Validate and normalize subdomain if provided
    if (data.subdomain) {
      updateData.subdomain = data.subdomain.toLowerCase();
      
      // Check if subdomain is unique (excluding current association)
      const existingAssociation = await prisma.association.findFirst({
        where: {
          subdomain: updateData.subdomain,
          NOT: { id }
        }
      });
      
      if (existingAssociation) {
        return { success: false, error: 'Subdomínio já está em uso por outra associação' };
      }
    }
    
    // Serialize wordpressAuth if provided
    if (data.wordpressAuth) {
      updateData.wordpressAuth = JSON.stringify(data.wordpressAuth);
    }
    
    // Encrypt and store apiConfig if provided
    if (data.apiConfig) {
      try {
        console.log('Encrypting API config:', data.apiConfig);
        // Sanitize password before encryption
        const sanitizedApiConfig = sanitizeApiConfig(data.apiConfig);
        updateData.apiConfig = await encryptApiConfig(sanitizedApiConfig);
      } catch (error) {
        console.error('Error encrypting API config:', error);
        return { success: false, error: 'Erro ao criptografar configuração da API' };
      }
    }
    
    const association = await prisma.association.update({
      where: { id },
      data: updateData,
    });

    // Parse back for return
    let returnApiConfig: ApiConfig | undefined;
    if (data.apiConfig) {
      returnApiConfig = data.apiConfig;
    } else if ((association as any).apiConfig) {
      try {
        returnApiConfig = await decryptApiConfig((association as any).apiConfig);
      } catch (error) {
        console.error('Error decrypting existing API config:', error);
      }
    }
    
    return { 
      success: true, 
      data: {
        ...association,
        wordpressAuth: data.wordpressAuth || 
          (typeof association.wordpressAuth === 'string' 
            ? JSON.parse(association.wordpressAuth)
            : association.wordpressAuth),
        apiConfig: returnApiConfig
      } as Association 
    };
  } catch (error: any) {
    console.error('Error updating association:', error);
    console.error('Error details:', {
      id,
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined
    });
    
    // Handle unique constraint violations for subdomain
    if (error.code === 'P2002' && error.meta?.target?.includes('subdomain')) {
      return { success: false, error: 'Subdomínio já está em uso por outra associação' };
    }
    
    return { success: false, error: 'Erro ao atualizar associação' };
  }
}

export async function getActiveAssociations(): Promise<Association[]> {
  try {
    const associations = await prisma.association.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
    
    // Parse wordpressAuth and decrypt apiConfig for each association
    const parsedAssociations = await Promise.all(
      associations.map(async association => {
        let apiConfig: ApiConfig | undefined;
        if ((association as any).apiConfig) {
          try {
            apiConfig = await decryptApiConfig((association as any).apiConfig);
          } catch (error) {
            console.error('Error decrypting API config for association:', association.id, error);
          }
        }
        
        return {
          ...association,
          wordpressAuth: typeof association.wordpressAuth === 'string' 
            ? JSON.parse(association.wordpressAuth)
            : association.wordpressAuth,
          apiConfig
        };
      })
    );
    
    return parsedAssociations as Association[];
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

/**
 * Phase 2 Enhancement: Secure credential management functions
 */

/**
 * Update only API configuration for an association
 * This provides a secure way to update credentials without exposing other data
 */
export async function updateAssociationApiConfig(
  id: string, 
  apiConfig: ApiConfig
): Promise<{ success: boolean; error?: string }> {
  try {
    const encryptedConfig = await encryptApiConfig(apiConfig);
    
    await prisma.association.update({
      where: { id },
      data: { 
        apiConfig: encryptedConfig,
        updatedAt: new Date()
      },
    });
    
    console.log(`[Association] API config updated securely for association: ${id}`);
    return { success: true };
  } catch (error) {
    console.error('Error updating API config:', error);
    return { success: false, error: 'Erro ao atualizar configuração da API' };
  }
}

/**
 * Test API configuration without saving
 * This allows testing new configurations before committing them
 */
export async function testApiConfiguration(
  wordpressUrl: string,
  apiConfig: ApiConfig
): Promise<{ success: boolean; error?: string; details?: any }> {
  try {
    // Sanitize password before testing
    const sanitizedApiConfig = sanitizeApiConfig(apiConfig);
    
    // Create a temporary association object for testing
    const testAssociation: Association = {
      id: 'test',
      name: 'Test Association',
      subdomain: 'test',
      wordpressUrl,
      wordpressAuth: { apiKey: '', username: '', password: '' },
      apiConfig: sanitizedApiConfig,
      promptContext: null,
      aiDirectives: null,
      aiRestrictions: null,
      patientsList: null,
      publicDisplayName: null,
      logoUrl: null,
      welcomeMessage: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    // Import and test the WordPress service
    const { WordPressApiService } = await import('@/lib/services/wordpress-api.service');
    const service = new WordPressApiService(testAssociation);
    
    const result = await service.testConnection();
    return result;
    
  } catch (error) {
    console.error('Error testing API configuration:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido ao testar configuração'
    };
  }
}

/**
 * Get association with minimal data (without sensitive credentials)
 * Useful for public endpoints or client-side operations
 */
export async function getAssociationPublicData(subdomain: string): Promise<{
  id: string;
  name: string;
  subdomain: string;
  publicDisplayName?: string;
  logoUrl?: string;
  welcomeMessage?: string;
  isActive: boolean;
} | null> {
  try {
    const association = await prisma.association.findUnique({
      where: { subdomain },
      select: {
        id: true,
        name: true,
        subdomain: true,
        publicDisplayName: true,
        logoUrl: true,
        welcomeMessage: true,
        isActive: true,
      },
    });
    
    return association ? {
      ...association,
      publicDisplayName: association.publicDisplayName || undefined,
      logoUrl: association.logoUrl || undefined,
      welcomeMessage: association.welcomeMessage || undefined,
    } : null;
  } catch (error) {
    console.error('Error getting association public data:', error);
    return null;
  }
}

/**
 * Validate association API configuration health
 * Returns status without exposing sensitive data
 */
export async function validateAssociationApiHealth(id: string): Promise<{
  hasApiConfig: boolean;
  hasLegacyAuth: boolean;
  authMethod?: 'applicationPassword' | 'wooCommerce' | 'legacy';
  lastTestedAt?: Date;
  isHealthy?: boolean;
  error?: string;
}> {
  try {
    const association = await prisma.association.findUnique({
      where: { id },
    });
    
    if (!association) {
      return {
        hasApiConfig: false,
        hasLegacyAuth: false,
        error: 'Associação não encontrada'
      };
    }
    
    const parsedAssociation = await parseAssociationData(association);
    
    // Check API configuration without exposing credentials
    const hasApiConfig = !!parsedAssociation.apiConfig;
    const hasLegacyAuth = !!parsedAssociation.wordpressAuth?.username;
    
    let authMethod: 'applicationPassword' | 'wooCommerce' | 'legacy' | undefined;
    
    if (hasApiConfig && parsedAssociation.apiConfig) {
      authMethod = parsedAssociation.apiConfig.authMethod || 'applicationPassword';
    } else if (hasLegacyAuth) {
      authMethod = 'legacy';
    }
    
    return {
      hasApiConfig,
      hasLegacyAuth,
      authMethod,
      isHealthy: hasApiConfig || hasLegacyAuth
    };
    
  } catch (error) {
    console.error('Error validating association API health:', error);
    return {
      hasApiConfig: false,
      hasLegacyAuth: false,
      error: 'Erro ao validar configuração da API'
    };
  }
}