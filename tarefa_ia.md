Perfeito! Agora vamos construir o cérebro administrativo do UtópiZap. Criar os CRUDs é a fundação que permitirá ao dono do restaurante ter total controle sobre o negócio, além de ser a fonte de dados que a nossa IA irá consumir de forma otimizada.

Vamos projetar a estrutura de dados no Firestore de forma limpa e escalável, seguindo as melhores práticas para performance e baixo custo. Depois, traçaremos o plano de ação para implementar as funções.

1. Modelagem da Base de Dados no Firestore

Esta é a etapa mais crítica. Uma boa modelagem economiza dinheiro e dor de cabeça no futuro. Usaremos coleções de nível superior para cada entidade.

A. Coleção: clients

Objetivo: Armazenar informações básicas de clientes que já fizeram um pedido para facilitar contatos futuros e personalizar a experiência.

Estrutura do Documento:

code
JSON
download
content_copy
expand_less

{
  "name": "Ana Silva",
  "phone": "+5511999998888", // Padrão E.164 para ser universal
  "lastOrderAt": "2024-10-26T18:30:00Z" // Timestamp
}

ID do Documento: Podemos usar o número de telefone como ID para garantir unicidade e fácil busca, ou um ID automático do Firestore. O ID automático é mais flexível.

B. Coleção: categories

Objetivo: Agrupar os produtos. Essencial para que a IA possa guiar o cliente de forma organizada ("Que tal ver nossos espetinhos?").

Estrutura do Documento:

code
JSON
download
content_copy
expand_less
IGNORE_WHEN_COPYING_START
IGNORE_WHEN_COPYING_END
{
  "name": "Espetinhos", // Título
  "imageUrl": "https://storage.googleapis.com/...",
  "order": 1, // Número para ordenar a exibição (ex: Espetinhos primeiro, depois Bebidas)
  "isActive": true // Permite desativar uma categoria inteira sem deletar
}

ID do Documento: ID automático do Firestore.

C. Coleção: products

Objetivo: O coração do cardápio. Contém todos os detalhes de cada item disponível para venda.

Estrutura do Documento:

code
JSON
download
content_copy
expand_less
IGNORE_WHEN_COPYING_START
IGNORE_WHEN_COPYING_END
{
  "name": "Espetinho de Alcatra", // Título
  "description": "200g de alcatra suculenta no espeto, temperada com sal grosso.",
  "price": 18.50, // Valor (usar tipo 'number')
  "imageUrl": "https://storage.googleapis.com/...",
  "categoryId": "zK2f...pQ9x", // Referência ao ID do documento na coleção 'categories'
  "isActive": true, // Permite "pausar" a venda de um item
  "isFeatured": false // Destaque para a IA sugerir proativamente
}

ID do Documento: ID automático do Firestore.

D. Coleção: orders

Objetivo: Registrar cada pedido finalizado. A estrutura aqui é crucial e se baseia no conceito de "snapshot": os dados do cliente e dos produtos são copiados para dentro do pedido. Isso garante que, mesmo que o preço de um produto mude amanhã, o registro do pedido de hoje permaneça historicamente correto.

Estrutura do Documento:

code
JSON
download
content_copy
expand_less
IGNORE_WHEN_COPYING_START
IGNORE_WHEN_COPYING_END
{
  "clientInfo": {
    "name": "Ana Silva",
    "phone": "+5511999998888"
  },
  "items": [
    {
      "productId": "aB1c...dE2f",
      "productName": "Espetinho de Alcatra", // Cópia do nome no momento da compra
      "quantity": 2,
      "unitPrice": 18.50 // Cópia do preço no momento da compra
    },
    {
      "productId": "gH3i...jK4l",
      "productName": "Coca-Cola Lata",
      "quantity": 1,
      "unitPrice": 6.00
    }
  ],
  "totalAmount": 43.00,
  "status": "Recebido", // Valores possíveis: "Recebido", "Em Preparo", "Pronto para Entrega", "Finalizado", "Cancelado"
  "createdAt": "2024-10-26T20:05:10Z", // Timestamp
  "updatedAt": "2024-10-26T20:05:10Z" // Timestamp
}

ID do Documento: ID automático do Firestore.

2. Plano de Ação para Implementação do CRUD

Agora, vamos transformar esses modelos em funcionalidades reais.

Passo 1: Estrutura dos Arquivos (Backend Logic)

Crie um local central para suas interações com o Firebase para manter o código organizado.

Crie um diretório: src/lib/firebase/

Dentro dele, crie arquivos de serviço por entidade:

src/lib/firebase/categories.ts

src/lib/firebase/products.ts

src/lib/firebase/orders.ts

(Clientes podem ser gerenciados dentro de orders.ts inicialmente, pois só são criados/atualizados com um pedido).

Passo 2: Implementação das Funções CRUD (Server-Side)

Em cada arquivo de serviço, você implementará as funções de CRUD usando o SDK do Firebase Admin (para segurança em Server Actions).

Em categories.ts:

createCategory(data): Adiciona um novo documento à coleção categories.

getAllCategories(): Lê e retorna todos os documentos da coleção, ordenados pelo campo order.

updateCategory(id, data): Atualiza um documento existente.

deleteCategory(id): Deleta um documento.

Em products.ts:

createProduct(data): Adiciona um novo produto.

getProductsByCategoryId(categoryId): Retorna todos os produtos que pertencem a uma categoria.

getAllProducts(): Retorna todos os produtos (usado pela IA).

updateProduct(id, data): Atualiza um produto.

deleteProduct(id): Deleta um produto.

Em orders.ts:

createOrder(data): Cria um novo pedido. Essa é a função que a IA chamará ao final da conversa. Ela também pode verificar se o cliente já existe e, se não, criá-lo em clients.

getOrdersByStatus(status): Retorna pedidos filtrando pelo status (para o painel KDS).

updateOrderStatus(id, newStatus): A função mais usada no painel de gerenciamento, para mover o card do pedido entre as colunas.

Passo 3: Construção da Interface do Admin

Crie uma nova área no seu app (ex: /admin) protegida por autenticação do Firebase. Dentro dela, crie as páginas de gerenciamento.

Página /admin/produtos:

Uma tabela (usando o componente Table do ShadCN/UI) que lista todos os produtos.

Um botão "Adicionar Produto" que abre um modal ou leva a uma nova página (/admin/produtos/novo) com um formulário (usando Form do ShadCN/UI) para inserir nome, preço, etc., e um seletor para escolher a categoria (populado pela função getAllCategories()).

Botões de "Editar" e "Excluir" em cada linha da tabela.

Página /admin/categorias:

Mesma lógica da página de produtos, mas para gerenciar as categorias.

Inclua um campo para o número de order e a funcionalidade de upload de imagem para o Firebase Storage.

Página Principal do Admin (/admin ou /admin/pedidos):

O Dashboard / KDS (Kitchen Display System).

Use as funções getOrdersByStatus() para buscar os pedidos e exibi-los em colunas ("Recebidos", "Em Preparo", etc.).

Implemente uma funcionalidade de arrastar e soltar (drag-and-drop) para que o gerente possa mover um card de pedido de uma coluna para outra, o que chamará a função updateOrderStatus(id, novoStatus) no backend.

Seguindo estes passos, você terá um sistema de gerenciamento robusto e desacoplado da lógica da IA. A UtópiZap simplesmente consumirá os dados via getAllProducts() e getAllCategories() (com cache, como planejado anteriormente) e registrará o resultado final com createOrder().