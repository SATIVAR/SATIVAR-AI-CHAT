import { NextRequest, NextResponse } from 'next/server';
import { addMessage, getConversationById, updateConversationStatus } from '@/lib/services/conversation.service';
import { getAssociationBySubdomain } from '@/lib/services/association.service';
import { guideSatizapConversation } from '@/ai/flows/guide-satizap-conversation';
import { ConversationMessage } from '@/lib/types';
import { Message_senderType } from '@prisma/client';
import { getTenantContext } from '@/lib/middleware/tenant';

interface MessageRequest {
  conversationId: string;
  content: string;
  senderType: Message_senderType;
  senderId?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: MessageRequest = await request.json();
    const { conversationId, content, senderType, senderId } = body;

    // Validate required fields
    if (!conversationId || !content || !senderType) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get tenant context from middleware headers or fallback to direct lookup
    let tenantContext = null;
    
    const tenantId = request.headers.get('X-Tenant-ID');
    const tenantSubdomain = request.headers.get('X-Tenant-Subdomain');
    
    // Also check for slug in query parameters
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');
    
    if (tenantId && tenantSubdomain) {
      // Use headers from middleware
      const { getAssociationById } = await import('@/lib/services/association.service');
      const association = await getAssociationById(tenantId);
      
      if (association && association.isActive) {
        tenantContext = {
          association,
          subdomain: tenantSubdomain
        };
      }
    } else if (slug) {
      // Use slug to get association directly
      const association = await getAssociationBySubdomain(slug);
      
      if (association && association.isActive) {
        tenantContext = {
          association,
          subdomain: slug
        };
      }
    } else {
      // Fallback: try to get tenant context directly
      tenantContext = await getTenantContext(request);
    }

    // Get conversation to check status
    const conversation = await getConversationById(conversationId);
    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    // Add the user/attendant message to database
    const messageResult = await addMessage(
      conversationId,
      content,
      senderType,
      senderId
    );

    if (!messageResult.success) {
      return NextResponse.json(
        { error: messageResult.error },
        { status: 500 }
      );
    }

    let aiResponse: ConversationMessage | null = null;

    // If conversation is with AI and message is from patient, generate AI response
    if (conversation.status === 'com_ia' && senderType === 'paciente') {
      try {
        // Get updated conversation with the new message
        const updatedConversation = await getConversationById(conversationId);
        if (!updatedConversation) {
          throw new Error('Failed to get updated conversation');
        }

        // Use tenant association or fallback to patient's association
        const associationToUse = tenantContext?.association || (updatedConversation.Patient as any).Association;
        
        // Ensure we have the full association data including apiConfig
        let fullAssociation = associationToUse;
        if (fullAssociation && !fullAssociation.apiConfig && tenantContext?.association?.apiConfig) {
          fullAssociation = tenantContext.association;
        }

        // Generate AI response with tenant-specific context
        // Phase 3: Enable hybrid mode for cost optimization
        const useHybridMode = process.env.ENABLE_HYBRID_AI === 'true' || false;
        const tenantId = tenantContext?.subdomain || fullAssociation?.subdomain || 'default';
        
        const aiResponseData = await guideSatizapConversation({
          conversationId,
          patientMessage: content,
          conversationHistory: updatedConversation.Message,
          patient: updatedConversation.Patient,
          association: fullAssociation,
          tenantId,
          useHybridMode
        });

        // Check if AI is requesting handoff
        if (aiResponseData.requestHandoff) {
          await updateConversationStatus(conversationId, 'fila_humano');
          
          // Add handoff message
          const handoffResult = await addMessage(
            conversationId,
            aiResponseData.text,
            'ia',
            undefined,
            { 
              handoffReason: aiResponseData.handoffReason,
              requestHandoff: true 
            }
          );

          if (handoffResult.success) {
            aiResponse = handoffResult.data!;
          }
        } else {
          // Add AI response to database
          const aiMessageResult = await addMessage(
            conversationId,
            aiResponseData.text,
            'ia',
            undefined,
            {
              components: aiResponseData.components,
              confidence: aiResponseData.confidence,
            }
          );

          if (aiMessageResult.success) {
            aiResponse = aiMessageResult.data!;
          }
        }
      } catch (error) {
        console.error('Error generating AI response:', error);
        
        // Add error message from AI
        const errorResult = await addMessage(
          conversationId,
          'Desculpe, ocorreu um erro técnico. Um atendente humano entrará em contato em breve.',
          'ia'
        );

        if (errorResult.success) {
          aiResponse = errorResult.data!;
        }

        // Move to human queue
        await updateConversationStatus(conversationId, 'fila_humano');
      }
    }

    return NextResponse.json({
      success: true,
      userMessage: messageResult.data,
      aiResponse,
      conversationStatus: conversation.status,
      tenantInfo: tenantContext ? {
        associationName: tenantContext.association.name,
        subdomain: tenantContext.subdomain
      } : null,
    });

  } catch (error) {
    console.error('Error in messages API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversationId');

    if (!conversationId) {
      return NextResponse.json(
        { error: 'Conversation ID is required' },
        { status: 400 }
      );
    }

    const conversation = await getConversationById(conversationId);
    
    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      conversation,
    });

  } catch (error) {
    console.error('Error getting conversation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}