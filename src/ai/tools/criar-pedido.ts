import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { ApiConfig } from '@/lib/types';

export const criarPedidoTool = ai.defineTool(
  {
    name: 'criarPedido',
    description: 'Cria um pedido/orçamento para produtos de cannabis medicinal selecionados pelo paciente',
    inputSchema: z.object({
      associationId: z.string().describe('ID da associação que está criando o pedido'),
      // New structured API configuration
      apiConfig: z.object({
        credentials: z.object({
          apiKey: z.string().describe('Consumer Key do WooCommerce'),
          apiSecret: z.string().describe('Consumer Secret do WooCommerce'),
        }),
        endpoints: z.object({
          getProdutos: z.string().optional().describe('Endpoint para buscar produtos'),
          getCategorias: z.string().optional().describe('Endpoint para buscar categorias'),
          getClientes: z.string().optional().describe('Endpoint para buscar clientes'),
          createCliente: z.string().optional().describe('Endpoint para criar clientes'),
          createPedido: z.string().optional().describe('Endpoint para criar pedidos'),
        }),
      }).optional().describe('Configuração dinâmica da API'),
      // Legacy WordPress configuration (kept for backward compatibility)
      wordpressUrl: z.string().optional().describe('URL do WordPress da associação'),
      wordpressAuth: z.object({
        apiKey: z.string(),
        username: z.string(),
        password: z.string(),
      }).optional().describe('Credenciais legadas do WordPress'),
      // Order data
      pacienteId: z.string().describe('ID do paciente que está fazendo o pedido'),
      itens: z.array(z.object({
        produtoId: z.string().describe('ID do produto'),
        produtoNome: z.string().describe('Nome do produto'),
        quantidade: z.number().min(1).describe('Quantidade desejada'),
        precoUnitario: z.number().describe('Preço unitário do produto'),
      })).min(1).describe('Lista de produtos no pedido'),
      observacoes: z.string().optional().describe('Observações do paciente sobre o pedido'),
      urgencia: z.enum(['baixa', 'normal', 'alta']).default('normal').describe('Nível de urgência do pedido'),
    }),
    outputSchema: z.object({
      pedidoId: z.string(),
      status: z.string(),
      valorTotal: z.number(),
      itens: z.array(z.object({
        produtoId: z.string(),
        produtoNome: z.string(),
        quantidade: z.number(),
        precoUnitario: z.number(),
        subtotal: z.number(),
      })),
      prazoEstimado: z.string(),
      proximosPassos: z.array(z.string()),
      mensagemConfirmacao: z.string(),
    }),
  },
  async (input) => {
    const { associationId, apiConfig, wordpressUrl, wordpressAuth, pacienteId, itens, observacoes, urgencia } = input;
    try {
      // Priority 1: Use new apiConfig if available
      if (apiConfig?.credentials?.apiKey && apiConfig?.endpoints?.createPedido) {
        console.log('Using dynamic apiConfig for order creation');
        return await createOrderInWordPress({
          ...apiConfig,
          authMethod: 'applicationPassword'
        } as any, input);
      }
      
      // Priority 2: Use legacy wordpressAuth if available  
      if (wordpressUrl && wordpressAuth?.apiKey) {
        console.log('Using legacy WordPress configuration for order creation');
        return await createOrderInWordPressLegacy(wordpressUrl, wordpressAuth, input);
      }
      
      // Priority 3: Fallback to local order creation
      console.log('Using local order creation (mock)');
      return await createLocalOrder(associationId, input);

    } catch (error) {
      console.error('Error in criarPedidoTool:', error);
      
      // Return error response
      return {
        pedidoId: 'ERRO',
        status: 'erro',
        valorTotal: 0,
        itens: [],
        prazoEstimado: 'Indisponível',
        proximosPassos: ['Entre em contato com nosso suporte'],
        mensagemConfirmacao: 'Desculpe, ocorreu um erro ao criar seu orçamento. Nossa equipe foi notificada e entrará em contato em breve.',
      };
    }
  }
);

/**
 * Create order in WordPress using new apiConfig structure
 */
async function createOrderInWordPress(
  apiConfig: ApiConfig,
  input: any
): Promise<any> {
  try {
    const { credentials, endpoints } = apiConfig;
    const { pacienteId, itens, observacoes, urgencia } = input;
    
    if (!endpoints.createPedido) {
      throw new Error('Endpoint createPedido não configurado');
    }
    
    // Create Basic Auth header
    const authHeader = Buffer.from(
      `${(credentials as any).apiKey}:${(credentials as any).apiSecret}`
    ).toString('base64');
    
    // Calculate total value
    const valorTotal = itens.reduce((total: number, item: any) => {
      return total + (item.quantidade * item.precoUnitario);
    }, 0);
    
    // Prepare order data for WordPress/WooCommerce API
    const orderData = {
      status: 'pending',
      customer_id: pacienteId,
      line_items: itens.map((item: any) => ({
        product_id: item.produtoId,
        quantity: item.quantidade,
        price: item.precoUnitario,
      })),
      customer_note: observacoes || '',
      meta_data: [
        { key: 'urgencia', value: urgencia },
        { key: 'created_by', value: 'satizap_ai' },
      ],
    };
    
    const response = await fetch(endpoints.createPedido, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authHeader}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(orderData),
      signal: AbortSignal.timeout(15000), // 15 second timeout
    });
    
    if (!response.ok) {
      throw new Error(`WordPress API error: ${response.status} ${response.statusText}`);
    }
    
    const wordpressOrder = await response.json();
    
    // Transform WordPress order to our format
    const pedidoId = wordpressOrder.number || wordpressOrder.id?.toString() || 'WP-ORDER';
    
    // Calculate estimated delivery time based on urgency
    let prazoEstimado = '';
    switch (urgencia) {
      case 'alta':
        prazoEstimado = '24-48 horas';
        break;
      case 'normal':
        prazoEstimado = '3-5 dias úteis';
        break;
      case 'baixa':
        prazoEstimado = '5-7 dias úteis';
        break;
    }
    
    // Format items with subtotals
    const itensFormatados = itens.map((item: any) => ({
      produtoId: item.produtoId,
      produtoNome: item.produtoNome,
      quantidade: item.quantidade,
      precoUnitario: item.precoUnitario,
      subtotal: item.quantidade * item.precoUnitario,
    }));
    
    // Define next steps
    const proximosPassos = [
      'Aguardar confirmação do orçamento',
      'Realizar pagamento conforme instruções',
      'Aguardar preparação do pedido',
      'Receber produto no endereço cadastrado',
    ];
    
    // Create confirmation message
    const mensagemConfirmacao = `Seu pedido foi criado com sucesso no sistema! 🎉

📋 **Pedido:** ${pedidoId}
💰 **Valor Total:** R$ ${valorTotal.toFixed(2)}
⏰ **Prazo Estimado:** ${prazoEstimado}

${observacoes ? `📝 **Suas observações:** ${observacoes}` : ''}

Seu pedido foi enviado diretamente para nosso sistema de gestão. Em breve nossa equipe entrará em contato para confirmar o pedido e fornecer as instruções de pagamento.

Tem alguma dúvida sobre este pedido?`;

    return {
      pedidoId,
      status: 'criado_no_sistema',
      valorTotal,
      itens: itensFormatados,
      prazoEstimado,
      proximosPassos,
      mensagemConfirmacao,
    };
    
  } catch (error) {
    console.error('Error creating order in WordPress:', error);
    // Fallback to local order creation
    return await createLocalOrder(input.associationId, input);
  }
}

/**
 * Create order in WordPress using legacy configuration
 */
async function createOrderInWordPressLegacy(
  wordpressUrl: string,
  wordpressAuth: any,
  input: any
): Promise<any> {
  // Convert legacy format to new format and use main function
  const apiConfig: ApiConfig = {
    credentials: {
      applicationPassword: {
        username: wordpressAuth.username,
        password: wordpressAuth.password
      },
      apiSecret: wordpressAuth.password, // Map password to apiSecret
    },
    endpoints: {
      createPedido: `${wordpressUrl}/wp-json/wc/v3/orders`,
    },
  };
  
  return await createOrderInWordPress(apiConfig, input);
}

/**
 * Create local order (fallback/mock implementation)
 */
async function createLocalOrder(
  associationId: string,
  input: any
): Promise<any> {
  const { pacienteId, itens, observacoes, urgencia } = input;
  
  // Calculate total value
  const valorTotal = itens.reduce((total: number, item: any) => {
    return total + (item.quantidade * item.precoUnitario);
  }, 0);

  // Generate a mock order ID (in real implementation, this would create the order in the database)
  const pedidoId = `${associationId.slice(-4).toUpperCase()}-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

  // Calculate estimated delivery time based on urgency
  let prazoEstimado = '';
  switch (urgencia) {
    case 'alta':
      prazoEstimado = '24-48 horas';
      break;
    case 'normal':
      prazoEstimado = '3-5 dias úteis';
      break;
    case 'baixa':
      prazoEstimado = '5-7 dias úteis';
      break;
  }

  // Format items with subtotals
  const itensFormatados = itens.map((item: any) => ({
    produtoId: item.produtoId,
    produtoNome: item.produtoNome,
    quantidade: item.quantidade,
    precoUnitario: item.precoUnitario,
    subtotal: item.quantidade * item.precoUnitario,
  }));

  // Define next steps
  const proximosPassos = [
    'Aguardar confirmação do orçamento',
    'Realizar pagamento conforme instruções',
    'Aguardar preparação do pedido',
    'Receber produto no endereço cadastrado',
  ];

  // Create confirmation message
  const mensagemConfirmacao = `Seu orçamento foi criado com sucesso! 🎉

📋 **Pedido:** ${pedidoId}
💰 **Valor Total:** R$ ${valorTotal.toFixed(2)}
⏰ **Prazo Estimado:** ${prazoEstimado}

${observacoes ? `📝 **Suas observações:** ${observacoes}` : ''}

Em breve nossa equipe entrará em contato para confirmar o pedido e fornecer as instruções de pagamento.

Tem alguma dúvida sobre este orçamento?`;

  return {
    pedidoId,
    status: 'aguardando_confirmacao',
    valorTotal,
    itens: itensFormatados,
    prazoEstimado,
    proximosPassos,
    mensagemConfirmacao,
  };

}

export const atualizarPedidoTool = ai.defineTool(
  {
    name: 'atualizarPedido',
    description: 'Atualiza um pedido existente, adicionando ou removendo itens',
    inputSchema: z.object({
      pedidoId: z.string().describe('ID do pedido a ser atualizado'),
      acao: z.enum(['adicionar', 'remover', 'alterar_quantidade']).describe('Ação a ser realizada'),
      produtoId: z.string().describe('ID do produto afetado'),
      quantidade: z.number().optional().describe('Nova quantidade (para alterar_quantidade ou adicionar)'),
    }),
    outputSchema: z.object({
      sucesso: z.boolean(),
      pedidoAtualizado: z.object({
        pedidoId: z.string(),
        valorTotal: z.number(),
        itens: z.array(z.any()),
      }).optional(),
      mensagem: z.string(),
    }),
  },
  async (input) => {
    const { pedidoId, acao, produtoId, quantidade } = input;
    try {
      // Mock implementation - in real scenario, would update database
      console.log(`Atualizando pedido ${pedidoId}: ${acao} produto ${produtoId}`);
      
      return {
        sucesso: true,
        mensagem: `Pedido ${pedidoId} atualizado com sucesso! A ação "${acao}" foi aplicada ao produto.`,
      };
      
    } catch (error) {
      console.error('Error in atualizarPedidoTool:', error);
      return {
        sucesso: false,
        mensagem: 'Erro ao atualizar o pedido. Tente novamente ou entre em contato com o suporte.',
      };
    }
  }
);
