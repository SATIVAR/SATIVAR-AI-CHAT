/**
 * Phase 4: Conversation State Management
 * This service manages conversation states using a finite state machine approach
 * to guide AI decision-making and reduce token usage.
 */

import { HybridConversationState } from '@/lib/types';
import prisma from '@/lib/prisma';

export interface ConversationStateData {
  conversationId: string;
  currentState: HybridConversationState;
  stateData?: Record<string, any>; // Store state-specific data
  lastUpdated: Date;
}

/**
 * Get current state of a conversation
 */
export async function getConversationState(conversationId: string): Promise<ConversationStateData | null> {
  try {
    // For now, we'll store state in conversation metadata
    // In a more robust implementation, we could create a separate ConversationState table
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        Message: {
          take: 1,
          orderBy: { timestamp: 'desc' }
        }
      }
    });
    
    if (!conversation) return null;
    
    // Parse metadata to get state information
    const metadata = conversation.Message[0]?.metadata 
      ? JSON.parse(conversation.Message[0].metadata) 
      : {};
    
    return {
      conversationId,
      currentState: metadata.conversationState || HybridConversationState.GREETING,
      stateData: metadata.stateData || {},
      lastUpdated: conversation.updatedAt
    };
    
  } catch (error) {
    console.error('Error getting conversation state:', error);
    return null;
  }
}

/**
 * Update conversation state
 */
export async function updateConversationState(
  conversationId: string,
  newState: HybridConversationState,
  stateData?: Record<string, any>
): Promise<boolean> {
  try {
    // Get the latest message to update its metadata
    const lastMessage = await prisma.message.findFirst({
      where: { conversationId },
      orderBy: { timestamp: 'desc' }
    });
    
    if (lastMessage) {
      const currentMetadata = lastMessage.metadata ? JSON.parse(lastMessage.metadata) : {};
      const updatedMetadata = {
        ...currentMetadata,
        conversationState: newState,
        stateData: stateData || currentMetadata.stateData || {},
        stateUpdatedAt: new Date().toISOString()
      };
      
      await prisma.message.update({
        where: { id: lastMessage.id },
        data: { metadata: JSON.stringify(updatedMetadata) }
      });
    }
    
    return true;
  } catch (error) {
    console.error('Error updating conversation state:', error);
    return false;
  }
}

/**
 * Determine valid next states based on current state
 */
export function getValidNextStates(currentState: HybridConversationState): HybridConversationState[] {
  const stateTransitions: Record<HybridConversationState, HybridConversationState[]> = {
    [HybridConversationState.GREETING]: [
      HybridConversationState.AWAITING_PRESCRIPTION,
      HybridConversationState.COLLECTING_ORDER_ITEMS,
      HybridConversationState.AWAITING_USER_DETAILS
    ],
    [HybridConversationState.AWAITING_PRESCRIPTION]: [
      HybridConversationState.COLLECTING_ORDER_ITEMS,
      HybridConversationState.GREETING
    ],
    [HybridConversationState.COLLECTING_ORDER_ITEMS]: [
      HybridConversationState.AWAITING_QUOTE_CONFIRMATION,
      HybridConversationState.AWAITING_PRESCRIPTION,
      HybridConversationState.AWAITING_USER_DETAILS
    ],
    [HybridConversationState.AWAITING_QUOTE_CONFIRMATION]: [
      HybridConversationState.AWAITING_PAYMENT,
      HybridConversationState.COLLECTING_ORDER_ITEMS,
      HybridConversationState.AWAITING_USER_DETAILS
    ],
    [HybridConversationState.AWAITING_USER_DETAILS]: [
      HybridConversationState.AWAITING_PAYMENT,
      HybridConversationState.AWAITING_QUOTE_CONFIRMATION
    ],
    [HybridConversationState.AWAITING_PAYMENT]: [
      HybridConversationState.ORDER_CONFIRMED,
      HybridConversationState.AWAITING_QUOTE_CONFIRMATION
    ],
    [HybridConversationState.ORDER_CONFIRMED]: [
      HybridConversationState.GREETING // Start new interaction
    ]
  };
  
  return stateTransitions[currentState] || [];
}

/**
 * Get AI context prompt based on current state
 * FASE 3: Enhanced with patient context awareness
 */
export function getStateContextPrompt(
  state: HybridConversationState, 
  stateData?: Record<string, any>,
  patientStatus?: 'LEAD' | 'MEMBRO'
): string {
  const contextPrompts: Record<HybridConversationState, string> = {
    [HybridConversationState.GREETING]: 
      "The patient is starting a new conversation. Determine if they need prescription guidance, want to place an order, or need other assistance.",
    
    [HybridConversationState.AWAITING_PRESCRIPTION]: 
      "The patient needs to provide a prescription. Guide them to upload a clear photo of their medical prescription.",
    
    [HybridConversationState.COLLECTING_ORDER_ITEMS]: 
      "The patient is building an order. Help them find products and collect quantities. When they have selected items, generate a quote.",
    
    [HybridConversationState.AWAITING_QUOTE_CONFIRMATION]: 
      "A quote has been presented to the patient. Wait for their confirmation (yes/no). If yes, proceed to payment instructions.",
    
    [HybridConversationState.AWAITING_USER_DETAILS]: 
      "Patient details are needed for order processing. Collect name, phone, and delivery address if not already available.",
    
    [HybridConversationState.AWAITING_PAYMENT]: 
      "Payment instructions have been provided. Wait for payment confirmation or questions about payment methods.",
    
    [HybridConversationState.ORDER_CONFIRMED]: 
      "Order has been confirmed and paid. Provide order confirmation message and next steps information."
  };
  
  let prompt = contextPrompts[state] || "Process the patient's message and determine the appropriate response.";
  
  // FASE 3: Adicionar contexto específico baseado no status do paciente
  if (patientStatus === 'LEAD') {
    prompt += "\n\nIMPORTANT: This patient is a LEAD (incomplete profile). Focus on collecting missing information to convert them to a full member. Explain the association process when appropriate.";
  } else if (patientStatus === 'MEMBRO') {
    prompt += "\n\nIMPORTANT: This patient is a full MEMBER with complete profile data. Provide personalized service using their available information.";
  }
  
  // Add state-specific data context
  if (stateData && Object.keys(stateData).length > 0) {
    prompt += `\n\nContext data: ${JSON.stringify(stateData)}`;
  }
  
  return prompt;
}

/**
 * Determine if state transition is valid
 */
export function isValidStateTransition(currentState: HybridConversationState, nextState: HybridConversationState): boolean {
  const validNextStates = getValidNextStates(currentState);
  return validNextStates.includes(nextState);
}

/**
 * Initialize conversation state for new conversation
 */
export async function initializeConversationState(conversationId: string): Promise<boolean> {
  return await updateConversationState(conversationId, HybridConversationState.GREETING);
}

/**
 * Get state-specific actions that AI can take
 */
export function getStateActions(state: HybridConversationState): string[] {
  const stateActions: Record<HybridConversationState, string[]> = {
    [HybridConversationState.GREETING]: [
      'call_function:buildWelcomeMessage',
      'call_tool:findProducts',
      'request_prescription',
      'send_message'
    ],
    [HybridConversationState.AWAITING_PRESCRIPTION]: [
      'request_prescription_upload',
      'send_message'
    ],
    [HybridConversationState.COLLECTING_ORDER_ITEMS]: [
      'call_tool:findProducts',
      'call_function:generateOrderQuote',
      'send_message'
    ],
    [HybridConversationState.AWAITING_QUOTE_CONFIRMATION]: [
      'call_function:getPaymentInstructions',
      'call_function:generateOrderQuote',
      'send_message'
    ],
    [HybridConversationState.AWAITING_USER_DETAILS]: [
      'request_user_details',
      'send_message'
    ],
    [HybridConversationState.AWAITING_PAYMENT]: [
      'call_function:getPaymentInstructions',
      'call_function:getStandardResponse:templatePedidoConfirmado',
      'send_message'
    ],
    [HybridConversationState.ORDER_CONFIRMED]: [
      'call_function:getStandardResponse:templatePedidoConfirmado',
      'call_function:buildWelcomeMessage',
      'send_message'
    ]
  };
  
  return stateActions[state] || ['send_message'];
}