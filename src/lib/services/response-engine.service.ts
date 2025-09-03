/**
 * Phase 2: Deterministic Response Engine
 * This service contains pure functions that generate standardized responses
 * without AI involvement, reducing token costs and ensuring consistency.
 */

import { Association, ConversationSettings, OrderQuote, OrderQuoteItem, DiscountRules } from '@/lib/types';
import { getAssociationById } from './association.service';
import { Patient } from '@prisma/client';

/**
 * Function 1: Build Welcome Message
 * Triggered: Start of new conversation
 * Process: Fetches greeting template and association name
 * Output: Final greeting string
 * FASE 3: Enhanced with advanced patient and interlocutor context
 */
export async function buildWelcomeMessage(
  associationConfig: Association, 
  patient?: Patient
): Promise<string> {
  const template = associationConfig.templateSaudacaoNovoPaciente || 
    "Bem-vindo à {NOME_ASSOCIACAO}! Agradecemos seu contato. Como podemos ajudar? 😊";
  
  const associationName = associationConfig.publicDisplayName || associationConfig.name;
  let message = template.replace('{NOME_ASSOCIACAO}', associationName);
  
  // FASE 3: Personalização avançada baseada no contexto do interlocutor
  if (patient) {
    const isResponsibleScenario = patient.tipo_associacao === 'assoc_respon' && patient.nome_responsavel;
    const interlocutorName = isResponsibleScenario ? patient.nome_responsavel : patient.name;
    const patientName = patient.name;
    
    if (patient.status === 'MEMBRO') {
      if (isResponsibleScenario) {
        // Responsável falando pelo paciente membro
        message += `\n\nOlá ${interlocutorName}! Vejo que você é responsável pelo paciente ${patientName}, que é membro da nossa associação. Estou aqui para ajudá-lo com qualquer necessidade relacionada ao tratamento de cannabis medicinal do ${patientName}.`;
        message += `\n\nComo posso auxiliá-lo no cuidado do ${patientName} hoje?`;
      } else {
        // Paciente membro falando diretamente
        message += `\n\nOlá ${patientName}! Como membro da nossa associação, estou aqui para ajudá-lo com seus produtos de cannabis medicinal.`;
        message += `\n\nComo posso ajudá-lo hoje?`;
      }
    } else if (patient.status === 'LEAD') {
      if (isResponsibleScenario) {
        // Responsável de um lead
        message += `\n\nOlá ${interlocutorName}! Vejo que você está interessado em nossos serviços para ${patientName}. Ainda não completamos o processo de associação. Posso ajudá-lo a finalizar o cadastro do ${patientName} e encontrar os produtos ideais para as necessidades dele.`;
        message += `\n\nGostaria que eu explicasse como funciona o processo de associação para ${patientName}?`;
      } else {
        // Lead falando diretamente
        message += `\n\nOlá ${patientName}! Vejo que você ainda não completou seu processo de associação. Posso ajudá-lo a finalizar seu cadastro e encontrar os produtos ideais para suas necessidades.`;
        message += `\n\nGostaria que eu explicasse como funciona nosso processo de associação?`;
      }
    }
  }
  
  return message;
}

/**
 * Function 2: Generate Order Quote
 * Triggered: AI identified order intent and extracted products/quantities
 * Process: Calculate subtotal, discount, shipping, format output
 * Output: Structured order quote object
 * FASE 3: Enhanced with patient context
 */
export async function generateOrderQuote(
  patientId: string,
  productList: Array<{ id: string; quantity: number; name: string; price: number }>,
  associationConfig: Association,
  patient?: Patient
): Promise<OrderQuote> {
  // Calculate subtotal
  const subtotal = productList.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  // Calculate discount based on rules
  const discount = calculateDiscount(subtotal, associationConfig.regrasDesconto);
  
  // Get shipping cost
  const shipping = associationConfig.valorFretePadrao || 0;
  
  // Calculate total
  const totalValue = subtotal - discount + shipping;
  
  // Format order items
  const items: OrderQuoteItem[] = productList.map(product => ({
    productId: product.id,
    productName: product.name,
    quantity: product.quantity,
    unitPrice: product.price,
    totalPrice: product.price * product.quantity
  }));
  
  // Generate order text
  const orderNumber = generateOrderNumber();
  const orderText = formatOrderText(orderNumber, items, subtotal, discount, shipping, totalValue, patient);
  
  return {
    orderText,
    totalValue,
    subtotal,
    discount,
    shipping,
    items
  };
}

/**
 * Function 3: Get Payment Instructions
 * Triggered: AI confirms patient accepted quote
 * Process: Fetch PIX key and bank details from configuration
 * Output: Complete payment instructions string
 */
export async function getPaymentInstructions(associationConfig: Association): Promise<string> {
  const chavePix = associationConfig.chavePix;
  const dadosBancarios = associationConfig.dadosBancariosFormatados;
  
  let instructions = "💳 **INSTRUÇÕES DE PAGAMENTO**\n\n";
  
  if (chavePix) {
    instructions += `🔑 **PIX:**\n`;
    instructions += `${chavePix}\n\n`;
  }
  
  if (dadosBancarios) {
    instructions += `🏦 **Dados Bancários:**\n`;
    instructions += `${dadosBancarios}\n\n`;
  }
  
  instructions += "📱 Após o pagamento, envie o comprovante para confirmarmos o pedido.\n";
  instructions += "⏰ O prazo de produção inicia após a confirmação do pagamento.";
  
  return instructions;
}

/**
 * Function 4: Get Standard Response
 * Triggered: AI identifies need for standard response
 * Process: Generic function that fetches appropriate template
 * Output: Template string
 */
export async function getStandardResponse(
  templateName: keyof ConversationSettings,
  associationConfig: Association,
  variables: Record<string, string | number> = {}
): Promise<string> {
  let template: string;
  
  switch (templateName) {
    case 'templatePedidoConfirmado':
      template = associationConfig.templatePedidoConfirmado || 
        "✅ Pedido Confirmado! Qualquer dúvida sobre o andamento do pedido, estamos à disposição 🫡";
      break;
    case 'templateSolicitacaoReceita':
      template = associationConfig.templateSolicitacaoReceita || 
        "📋 Para darmos continuidade, solicitamos que, por gentileza, nos envie uma foto clara da receita médica.";
      break;
    case 'templatePrazoEntrega':
      template = associationConfig.templatePrazoEntrega || 
        "⏰ O prazo de produção/separação é de até {X} dias úteis após a confirmação do pagamento.";
      break;
    default:
      template = "Desculpe, não consegui encontrar uma resposta padrão para esta situação.";
  }
  
  // Replace variables in template
  Object.entries(variables).forEach(([key, value]) => {
    template = template.replace(`{${key}}`, String(value));
  });
  
  // Replace delivery time if needed
  if (template.includes('{X}')) {
    const prazo = associationConfig.diasPrazoProducao || 3;
    template = template.replace('{X}', String(prazo));
  }
  
  return template;
}

/**
 * Helper function to calculate discount based on rules
 */
function calculateDiscount(subtotal: number, regrasDescontoJson?: string | null): number {
  if (!regrasDescontoJson) return 0;
  
  try {
    const regras: DiscountRules = JSON.parse(regrasDescontoJson);
    
    if (regras.acimaDeValor && subtotal >= regras.acimaDeValor && regras.percentual) {
      return subtotal * (regras.percentual / 100);
    }
    
    return 0;
  } catch (error) {
    console.error('Error parsing discount rules:', error);
    return 0;
  }
}

/**
 * Helper function to generate order number
 */
function generateOrderNumber(): string {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `#${timestamp}${random}`;
}

/**
 * Helper function to format order text
 * FASE 3: Enhanced with advanced patient and interlocutor context
 */
function formatOrderText(
  orderNumber: string,
  items: OrderQuoteItem[],
  subtotal: number,
  discount: number,
  shipping: number,
  total: number,
  patient?: Patient
): string {
  let orderText = `📋 **PEDIDO ${orderNumber}**\n\n`;
  
  // FASE 3: Informações contextuais avançadas do paciente e interlocutor
  if (patient) {
    const isResponsibleScenario = patient.tipo_associacao === 'assoc_respon' && patient.nome_responsavel;
    const interlocutorName = isResponsibleScenario ? patient.nome_responsavel : patient.name;
    const patientName = patient.name;
    
    orderText += `👤 **DADOS DO PACIENTE:**\n`;
    orderText += `Nome: ${patientName}\n`;
    
    if (patient.status === 'MEMBRO' && patient.cpf) {
      orderText += `CPF: ${patient.cpf}\n`;
    }
    
    if (isResponsibleScenario) {
      orderText += `Responsável: ${patient.nome_responsavel}\n`;
      if (patient.cpf_responsavel) {
        orderText += `CPF Responsável: ${patient.cpf_responsavel}\n`;
      }
      orderText += `\n📝 **CONTEXTO:** Este pedido está sendo feito por ${interlocutorName} (responsável) para o paciente ${patientName}.\n`;
    }
    
    orderText += `\n`;
  }
  
  // Add items
  orderText += `📦 **PRODUTOS:**\n`;
  items.forEach(item => {
    orderText += `• ${item.productName}\n`;
    orderText += `  Quantidade: ${item.quantity}\n`;
    orderText += `  Preço unitário: R$ ${item.unitPrice.toFixed(2)}\n`;
    orderText += `  Subtotal: R$ ${item.totalPrice.toFixed(2)}\n\n`;
  });
  
  // Add totals
  orderText += `💰 **RESUMO FINANCEIRO:**\n`;
  orderText += `Subtotal: R$ ${subtotal.toFixed(2)}\n`;
  
  if (discount > 0) {
    orderText += `Desconto: -R$ ${discount.toFixed(2)}\n`;
  }
  
  if (shipping > 0) {
    orderText += `Frete: R$ ${shipping.toFixed(2)}\n`;
  }
  
  orderText += `**TOTAL: R$ ${total.toFixed(2)}**\n\n`;
  
  // FASE 3: Confirmação contextualizada baseada no interlocutor
  if (patient) {
    const isResponsibleScenario = patient.tipo_associacao === 'assoc_respon' && patient.nome_responsavel;
    const interlocutorName = isResponsibleScenario ? patient.nome_responsavel : patient.name;
    const patientName = patient.name;
    
    if (patient.status === 'MEMBRO') {
      if (isResponsibleScenario) {
        orderText += `Confirma este pedido para ${patientName}? Como responsável, você tem acesso a todos os nossos produtos para o tratamento dele. 🤔`;
      } else {
        orderText += `Confirma o pedido? Como membro, você tem acesso a todos os nossos produtos. 🤔`;
      }
    } else if (patient.status === 'LEAD') {
      if (isResponsibleScenario) {
        orderText += `Para finalizar este pedido para ${patientName}, precisaremos completar o cadastro dele como membro. Você confirma? 🤔`;
      } else {
        orderText += `Para finalizar o pedido, precisaremos completar seu cadastro como membro. Confirma? 🤔`;
      }
    } else {
      orderText += `Confirma o pedido? 🤔`;
    }
  } else {
    orderText += `Confirma o pedido? 🤔`;
  }
  
  return orderText;
}

/**
 * Function to load association configuration by ID
 */
export async function loadAssociationConfig(associationId: string): Promise<Association | null> {
  return await getAssociationById(associationId);
}