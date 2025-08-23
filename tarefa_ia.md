O Problema Central de Custo na Arquitetura Atual
Seu README revela a maior fonte de custo:
"A cada nova mensagem do usuário, o conteúdo completo do menu.ts é serializado para JSON e injetado diretamente no prompt enviado ao modelo Gemini."
Isso significa que, para uma conversa de 10 trocas de mensagens, você está enviando o cardápio inteiro para a API 10 vezes, multiplicando o custo de tokens desnecessariamente. No Firestore, isso se traduziria em ler toda a base de dados a cada mensagem, o que é igualmente ineficiente.
A Regra de Ouro para Otimização de Custos
Para este projeto, nossa regra será:
"A base de conhecimento (cardápio e informações do restaurante) deve ser lida UMA ÚNICA VEZ por sessão de usuário e reutilizada em todas as interações subsequentes."
Com base nisso, aqui está o plano de ação:
Plano de Ação: Refatoração para Performance e Baixo Custo
Fase 1: Criar a Base de Conhecimento Dinâmica e Gerenciável
O objetivo aqui é tirar a lógica de negócio do código e colocá-la nas mãos do dono do restaurante, via Firestore.
Ação 1.1: Modelagem de Dados no Firestore
Crie duas coleções principais:
categories: Para armazenar as categorias dos produtos.
Documento: { name: "Espetinhos", order: 1 }
products: Para armazenar os itens do cardápio.
Documento: { name: "Espetinho de Alcatra", description: "...", price: 15.90, imageUrl: "...", categoryId: "id_da_categoria_espetinhos", isFeatured: true }
Crie uma terceira coleção com um único documento para informações gerais:
3. restaurantInfo:
* Documento Único (com ID "config"): { openingHours: "Seg-Sex: 18h-23h, Sab: 12h-00h", address: "...", phone: "...", commonQuestions: [{ "question": "Quais os mais pedidos?", "answer": "Nossos campeões de venda são o Espetinho de Alcatra e a Feijoada!" }] }
Ação 1.2: Construir o Painel de Admin (CRUD)
Crie uma nova rota protegida em seu app Next.js (ex: /admin).
Utilize Firebase Authentication para proteger essa rota, permitindo o login apenas do dono/gerente.
Nesta tela, desenvolva interfaces simples (usando ShadCN/UI) para:
Gerenciar Categorias: Criar, editar e deletar categorias.
Gerenciar Produtos: Criar, editar (incluindo upload de imagem para o Firebase Storage) e deletar produtos.
Configurações Gerais: Editar os campos do documento restaurantInfo (horários, perguntas frequentes, etc.).
Fase 2: Refatorar a Lógica da IA para Consumo Otimizado
Aqui aplicaremos a "Regra de Ouro" para cortar custos drasticamente.
Ação 2.1: Implementar a Leitura Única da Base de Conhecimento
Na sua Server Action getAiResponse (em src/app/actions.ts), NÃO busque os dados do Firestore a cada chamada.
Estratégia: Crie uma nova função, por exemplo, getKnowledgeBase(). Esta função será responsável por buscar TUDO (categorias, produtos, infos) do Firestore.
Cache Server-Side: Utilize o cache instável do Next.js (unstable_cache) ou uma biblioteca simples de cache em memória para armazenar o resultado de getKnowledgeBase().
code
TypeScript
// Exemplo em um arquivo de serviço (ex: src/lib/menu-service.ts)
import { unstable_cache } from 'next/cache';

export const getKnowledgeBase = unstable_cache(
  async () => {
    // Sua lógica para buscar tudo do Firestore aqui
    const products = await db.collection('products').get();
    const categories = await db.collection('categories').get();
    const info = await db.collection('restaurantInfo').doc('config').get();
    return JSON.stringify({ products, categories, info }); // Retorna como string JSON
  },
  ['knowledge-base'], // Chave do cache
  { revalidate: 300 } // Revalida o cache a cada 5 minutos
);
Agora, na sua action getAiResponse, você simplesmente chama await getKnowledgeBase() a cada vez. O Next.js garantirá que o Firestore só seja acessado a cada 5 minutos (ou o tempo que você definir), não a cada mensagem.
Ação 2.2: Otimizar a Injeção de Dados no Prompt da IA
Com a base de conhecimento já carregada e em cache (knowledgeBaseJSON), você continuará a injetá-la no prompt do Gemini, como faz hoje.
A diferença crucial: O custo de leitura no Firestore agora é quase zero (apenas 1 leitura a cada 5 minutos, independente de quantos usuários ou mensagens).
Ação 2.3: Evoluir o Prompt Mestre da UtópiZap
Instrua a IA a usar a nova base de conhecimento de forma proativa. Modifique o prompt do sistema para incluir regras como:
"Você é a UtópiZap. Sua base de conhecimento contém products, categories e restaurantInfo. Use restaurantInfo para responder a perguntas sobre horários, endereço, etc."
"Ao iniciar uma conversa, cumprimente o usuário e apresente 2-3 botões de ação rápida baseados nos produtos marcados como isFeatured ou nas commonQuestions."
"Sempre que um usuário perguntar 'o que tem?', sugira primeiro as categorias (categories) antes de listar todos os produtos (products)."
Tabela de Impacto nos Custos (Antes vs. Depois)
Métrica	Arquitetura Atual (menu.ts)	Proposta (Firestore + Cache)	Resultado
Leituras Firestore	0 (mas escalabilidade 0)	~1 leitura / 5 minutos	Custo de DB quase nulo e escalável
Tokens de IA (Prompt)	(Tamanho do Cardápio) x (Nº de Mensagens)	(Tamanho da Base de Conhecimento) x (Nº de Mensagens)	Custo similar por mensagem, mas a base agora é dinâmica
Flexibilidade	Nenhuma (requer deploy)	Total (dono gerencia tudo em tempo real)	Agilidade máxima para o negócio