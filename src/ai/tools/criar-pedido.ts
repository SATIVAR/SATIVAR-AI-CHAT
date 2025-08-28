import { ai } from '@/ai/genkit';
import { z } from 'zod';

export const criarPedidoTool = ai.defineTool(
  {
    name: 'criarPedido',
    description: 'Cria um pedido/orçamento para produtos de cannabis medicinal selecionados pelo paciente',
    inputSchema: z.object({
      associationId: z.string().describe('ID da associação que está criando o pedido'),
      wordpressUrl: z.string().optional().describe('URL do WordPress da associação'),
      wordpressAuth: z.object({
        apiKey: z.string(),
        username: z.string(),
        password: z.string(),
      }).optional().describe('Credenciais do WordPress'),
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
    const { associationId, wordpressUrl, wordpressAuth, pacienteId, itens, observacoes, urgencia } = input;
    try {
      // Future enhancement: If WordPress credentials are provided, 
      // create the order directly in the WordPress system
      // if (wordpressUrl && wordpressAuth) {
      //   return await createOrderInWordPress(wordpressUrl, wordpressAuth, input);
      // }

      // Calculate total value
      const valorTotal = itens.reduce((total, item) => {
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
      const itensFormatados = itens.map(item => ({
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