/**
 * Phase 2 Implementation: findOrCreatePatient Genkit Tool
 * 
 * This is the first AI tool to be called after patient form submission.
 * It implements the core Phase 2 functionality:
 * - Dynamic API configuration loading
 * - WordPress API integration with Application Password support
 * - Fallback to legacy authentication
 * - Secure patient lookup and creation
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getContext, TenantContext } from '@/lib/services/context-loader.service';
import { WordPressApiService } from '@/lib/services/wordpress-api.service';
import { Association } from '@/lib/types';

export const findOrCreatePatientTool = ai.defineTool(
  {
    name: 'findOrCreatePatient',
    description: 'Verifica se um paciente já existe pelo nome, WhatsApp ou email. Se não existir, cria um novo registro no WordPress da associação.',
    inputSchema: z.object({
      // Patient data
      fullName: z.string().describe('Nome completo do paciente'),
      whatsapp: z.string().describe('Número do WhatsApp do paciente (com DDD)'),
      email: z.string().email().optional().describe('Email do paciente (opcional)'),
      
      // Tenant context (automatically provided by conversation flow)
      tenantId: z.string().describe('ID da associação (subdomain ou ID direto)'),
    }),
    outputSchema: z.object({
      status: z.enum(['found', 'created', 'error']).describe('Status da operação'),
      patientId: z.string().optional().describe('ID do paciente no WordPress'),
      message: z.string().describe('Mensagem descritiva do resultado'),
      nextStep: z.string().optional().describe('Próximo passo sugerido para a conversa'),
      patientData: z.object({
        id: z.string(),
        name: z.string(),
        email: z.string(),
        whatsapp: z.string(),
        isExistingPatient: z.boolean(),
      }).optional().describe('Dados completos do paciente'),
    }),
  },
  async (input: { fullName: string; whatsapp: string; email?: string; tenantId: string }) => {
    const { fullName, whatsapp, email, tenantId } = input;
    
    try {
      console.log(`[findOrCreatePatient] Starting for tenant: ${tenantId}, patient: ${fullName}`);
      
      // Step 1: Load dynamic context (Phase 2 core feature)
      const context = await getContext(tenantId);
      
      if (!context) {
        console.error(`[findOrCreatePatient] Tenant context not found: ${tenantId}`);
        return {
          status: 'error' as const,
          message: 'Erro interno: Configuração da associação não encontrada. Entre em contato com o suporte.',
        };
      }
      
      console.log(`[findOrCreatePatient] Loaded context for: ${context.associationName}`);
      
      // Step 2: Validate API configuration
      if (!context.apiConfig && !context.wordpressAuth) {
        console.error(`[findOrCreatePatient] No API configuration found for: ${context.associationName}`);
        return {
          status: 'error' as const,
          message: 'Erro interno: Configuração da API não encontrada. Entre em contato com o suporte.',
        };
      }
      
      // Step 3: Create WordPress API service with dynamic configuration
      let wordpressService: WordPressApiService;
      
      try {
        // Build association object for the service
        const associationForService: Association = {
          id: context.associationId,
          name: context.associationName,
          subdomain: context.subdomain,
          wordpressUrl: context.wordpressUrl,
          wordpressAuth: context.wordpressAuth || { apiKey: '', username: '', password: '' },
          apiConfig: context.apiConfig || undefined,
          // Default values for required fields
          promptContext: context.promptContext || null,
          aiDirectives: context.aiDirectives || null,
          aiRestrictions: context.aiRestrictions || null,
          patientsList: null,
          publicDisplayName: context.publicDisplayName || null,
          logoUrl: context.logoUrl || null,
          welcomeMessage: context.welcomeMessage || null,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        
        wordpressService = new WordPressApiService(associationForService);
        console.log(`[findOrCreatePatient] WordPress service initialized for: ${context.associationName}`);
        
      } catch (error) {
        console.error(`[findOrCreatePatient] Failed to initialize WordPress service:`, error);
        return {
          status: 'error' as const,
          message: 'Erro interno: Falha na conexão com o sistema. Tente novamente em alguns minutos.',
        };
      }
      
      // Step 4: Find or create patient
      try {
        const result = await wordpressService.findOrCreatePatient({
          name: fullName,
          whatsapp: whatsapp,
          email: email
        });
        
        console.log(`[findOrCreatePatient] Operation completed:`, {
          patientId: result.user.id,
          created: result.created,
          name: result.user.name
        });
        
        // Prepare success response
        const patientData = {
          id: result.user.id.toString(),
          name: result.user.name || fullName,
          email: result.user.email,
          whatsapp: whatsapp,
          isExistingPatient: !result.created,
        };
        
        if (result.created) {
          return {
            status: 'created' as const,
            patientId: result.user.id.toString(),
            message: `Olá, ${result.user.first_name || fullName}! Que bom te ver por aqui pela primeira vez. Seu cadastro foi criado com sucesso.`,
            nextStep: 'request_prescription_image',
            patientData,
          };
        } else {
          return {
            status: 'found' as const,
            patientId: result.user.id.toString(),
            message: `Olá, ${result.user.first_name || fullName}! Bem-vindo de volta. Como posso te ajudar hoje?`,
            nextStep: 'show_options_or_new_order',
            patientData,
          };
        }
        
      } catch (wpError) {
        console.error(`[findOrCreatePatient] WordPress API error:`, wpError);
        
        // Provide user-friendly error message
        const errorMessage = wpError instanceof Error ? wpError.message : 'Erro desconhecido';
        
        if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
          return {
            status: 'error' as const,
            message: 'Erro interno: Falha na autenticação. Entre em contato com o suporte.',
          };
        } else if (errorMessage.includes('timeout') || errorMessage.includes('ECONNREFUSED')) {
          return {
            status: 'error' as const,
            message: 'Erro temporário de conexão. Tente novamente em alguns minutos.',
          };
        } else {
          return {
            status: 'error' as const,
            message: 'Erro ao processar seu cadastro. Tente novamente ou entre em contato com o suporte.',
          };
        }
      }
      
    } catch (error) {
      console.error(`[findOrCreatePatient] Unexpected error:`, error);
      return {
        status: 'error' as const,
        message: 'Erro interno do sistema. Tente novamente em alguns minutos ou entre em contato com o suporte.',
      };
    }
  }
);

export default findOrCreatePatientTool;