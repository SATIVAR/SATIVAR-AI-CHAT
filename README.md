# UtópiZap - Assistente de Pedidos com IA

Bem-vindo ao repositório do UtópiZap, um assistente de chat inteligente projetado para revolucionar a experiência de pedidos no restaurante UTÓPICOS. Este projeto utiliza o poder da IA Generativa do Google (Gemini) para criar uma interação fluida, humana e eficiente, guiando os clientes desde a saudação inicial até a finalização do pedido.

## Visão Geral Técnica

O UtópiZap é construído sobre uma stack moderna e robusta, focada em performance, escalabilidade e uma experiência de usuário premium.

- **Frontend:** [Next.js](https://nextjs.org/) (com App Router)
- **Linguagem:** [TypeScript](https://www.typescriptlang.org/)
- **Estilização:** [Tailwind CSS](https://tailwindcss.com/)
- **Componentes UI:** [ShadCN/UI](https://ui.shadcn.com/)
- **Animações:** [Framer Motion](https://www.framer.com/motion/)
- **Inteligência Artificial:** [Genkit (Google AI)](https://firebase.google.com/docs/genkit) com o modelo Gemini

## Como a IA Interage com o Cliente?

A interação é o coração do projeto e foi desenhada para ser mais do que um simples chatbot. A IA, chamada **UtópiZap**, atua como uma vendedora e assistente pessoal. O fluxo de interação funciona da seguinte forma:

1.  **Persona e Saudação Inicial (`src/ai/flows/generate-ai-persona.ts`):**
    - Ao carregar a aplicação, o primeiro passo é chamar o flow `generateAIPersona`.
    - Este flow possui um _prompt_ específico que instrui o Gemini a criar uma mensagem de boas-vindas carismática, definindo a personalidade da UtópiZap.

2.  **Processamento de Mensagens (`src/app/actions.ts` e `src/ai/flows/render-dynamic-components.ts`):**
    - Cada mensagem enviada pelo usuário é processada pela server action `getAiResponse`.
    - Esta ação constrói um _prompt_ detalhado para o Gemini, que inclui:
        - O histórico da conversa atual.
        - O cardápio completo do restaurante.
        - A mensagem específica do usuário.
    - O _prompt_ instrui a IA a analisar a intenção do usuário (ver o cardápio, adicionar um item, finalizar o pedido) e a responder em um formato **JSON estruturado**.

3.  **Renderização Dinâmica da UI:**
    - A grande inovação aqui é que a IA não retorna apenas texto. Ela retorna um JSON que especifica quais componentes de UI devem ser renderizados na tela.
    - O flow `renderDynamicComponents` tem um _schema de saída_ (usando Zod) que força a IA a gerar uma estrutura previsível, como:
      ```json
      {
        "components": [
          { "type": "productCard", "name": "Espetinho de Alcatra", ... },
          { "type": "quickReplyButton", "label": "Ver bebidas", ... }
        ]
      }
      ```
    - O frontend (`actions.ts`) recebe este JSON, mapeia cada objeto para um componente React correspondente (`ProductCard`, `QuickReplyButton`, etc.) e os renderiza dinamicamente na interface de chat. Isso torna o sistema flexível, permitindo que a IA controle a interface do usuário.

## Base de Conhecimento: O Cardápio

Atualmente, toda a base de conhecimento da IA sobre os produtos do restaurante reside em um arquivo estático:

- **Localização:** `src/lib/menu.ts`

Este arquivo exporta um objeto `menu` contendo arrays de categorias e itens. Cada item possui:
- `id`: Identificador único.
- `name`: Nome do produto.
- `description`: Descrição detalhada.
- `price`: Preço.
- `imageUrl`: URL da imagem do produto.
- `category`: Categoria à qual pertence.

**Como a IA utiliza essa base?**
A cada nova mensagem do usuário, o conteúdo completo do `menu.ts` é serializado para JSON e injetado diretamente no _prompt_ enviado ao modelo Gemini. Isso garante que a IA sempre tenha informações atualizadas e precisas sobre os produtos disponíveis, preços e descrições para responder às perguntas dos clientes.

---

## Sugestões de Implementação Futura

Para levar o projeto a um nível ainda mais profissional e escalável, aqui estão algumas sugestões de implementação:

### 1. Cardápio Dinâmico com Banco de Dados

Atualmente, o cardápio é estático. Para permitir que o dono do restaurante o atualize facilmente sem precisar de alterações no código, o ideal é movê-lo para um banco de dados.

- **Como implementar:**
    1. **Escolha um Banco de Dados:** O [Firebase Firestore](https://firebase.google.com/docs/firestore) é uma excelente escolha, pois se integra perfeitamente com o ecossistema e é escalável.
    2. **Crie a Estrutura:** Crie coleções no Firestore para `categories` e `menuItems`.
    3. **Refatore o Acesso aos Dados:** Em vez de importar `menu` de `src/lib/menu.ts`, crie uma função em `src/app/actions.ts` (ou um novo arquivo de serviço, ex: `src/lib/firebase.ts`) que busca os itens e categorias diretamente do Firestore.
    4. **Atualize o Prompt da IA:** A função `getAiResponse` passaria a buscar os dados do Firestore antes de montar o prompt para o Gemini.

### 2. "Function Calling" para Ações Explícitas

Para tornar a interação ainda mais robusta, podemos usar o recurso de _Function Calling_ do Gemini. Em vez de a IA sugerir componentes, ela pode explicitamente "chamar uma função" que o frontend executa.

- **Como implementar:**
    1. **Definir Ferramentas (Tools):** No flow `guideOrderingWithAI`, defina `ai.defineTool` para ações como `addToOrder` ou `showCategory`.
    2. **Instruir a IA:** No prompt, instrua a IA a usar essas ferramentas quando apropriado.
    3. **Processar a Resposta:** A resposta da IA conterá uma `tool_code` que o seu backend pode executar, atualizando o estado do pedido e decidindo qual feedback dar ao usuário. Isso desacopla ainda mais a lógica de negócio do frontend.

### 3. Autenticação e Histórico de Pedidos do Cliente

Para personalizar a experiência, podemos adicionar autenticação de usuários.

- **Como implementar:**
    1. **Adicionar Firebase Authentication:** Use o Firebase Auth para permitir que os usuários façam login (por exemplo, com número de telefone).
    2. **Salvar Pedidos no Firestore:** Ao finalizar um pedido, salve-o no Firestore em uma subcoleção atrelada ao `uid` do usuário.
    3. **Personalizar a Saudação:** Ao fazer login, a UtópiZap pode buscar o histórico de pedidos do usuário e oferecer uma experiência personalizada, como: "Olá, João! Vi que seu último pedido foi um Espetinho de Alcatra. Gostaria de pedir o mesmo hoje?".
