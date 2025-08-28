Plano de Ação: Refatoração do UtópiZap para Associações Medicinais, agora se chamará SATIZAP.
Sumário Executivo
O objetivo é transformar o UtópiZap de um assistente de pedidos para restaurantes em uma plataforma de orçamentação multi-inquilino (multi-tenant) para associações de cannabis medicinal. A arquitetura migrará de uma base de conhecimento estática (menu.ts) para um sistema dinâmico que utiliza WordPress/WooCommerce como backend de produtos, processa documentos de usuários via OCR (Reconhecimento Óptico de Caracteres) e emprega o Function Calling do Gemini para interações robustas e escaláveis.
Fase 1: Estabelecimento da Nova Base de Conhecimento (Backend)
O primeiro passo é substituir a fonte de dados estática por um sistema de gerenciamento de conteúdo (CMS) robusto para cada associação.
Adoção do WordPress com WooCommerce:
Para cada associação parceira, será configurada uma instância do WordPress com o plugin WooCommerce. Este servirá como o painel administrativo onde a associação gerenciará seu catálogo de produtos (óleos, pomadas, etc.), incluindo nomes, descrições, preços e imagens.
Justificativa: WooCommerce oferece uma estrutura de produtos pronta e, crucialmente, uma API REST completa e segura para consultas externas.
Configuração da API REST:
Dentro de cada WordPress, será gerado um par de chaves para a API REST (Consumer Key e Consumer Secret) com permissões de apenas leitura (Read-only).
Justificativa: Isso garante que nossa aplicação Next.js tenha um ponto de acesso seguro e padronizado para consultar o catálogo de produtos de cada associação, sem risco de realizar modificações indevidas.
Fase 2: Desenvolvimento do Módulo de Interpretação de Documentos
Precisamos de um serviço desacoplado para extrair texto de imagens, conforme sua especificação de não usar a capacidade multimodal nativa do Gemini para essa tarefa.
Implementação do Serviço de OCR:
Será criado um módulo de serviço dedicado, preferencialmente utilizando a API Google Cloud Vision.
Este serviço terá uma única responsabilidade: receber um buffer de imagem (enviado pelo frontend) e retornar o texto extraído em formato de string.
Justificativa: Desacoplar o OCR do modelo de linguagem principal torna o sistema mais modular e especializado. Google Cloud Vision é altamente preciso para textos em português e se integra bem ao ecossistema Google já em uso.
Fase 3: Reestruturação do Núcleo de Inteligência Artificial (Genkit Flow)
Esta é a fase mais crítica, onde a lógica da IA é completamente reimaginada para o novo fluxo de trabalho.
Migração para Function Calling (Ferramentas de IA):
O conceito de injetar o cardápio no prompt será abandonado. Em seu lugar, definiremos uma "Ferramenta" (Tool) no Genkit, que podemos chamar de findAssociationProducts.
Esta ferramenta será a ponte entre a IA e o WordPress. O modelo Gemini não saberá os produtos, mas saberá como usar esta ferramenta para procurá-los. A ferramenta receberá um termo de busca (ex: "Óleo CBD 2000mg") e as credenciais da API da associação específica para realizar a busca.
Refinamento do Prompt de Engenharia:
O prompt principal do flow será reescrito. As novas instruções para o Gemini serão:
Assumir a persona de um assistente profissional e empático da associação em questão.
Analisar o texto fornecido pelo usuário (que será uma combinação da mensagem digitada e do texto extraído pelo OCR).
Identificar nomes de produtos e possíveis quantidades no texto.
Para cada produto identificado, utilizar a ferramenta findAssociationProducts para obter seus detalhes (preço, nome exato, etc.) da API do WordPress.
Após coletar as informações, sintetizar os dados e estruturar uma resposta em formato JSON para o frontend, representando um orçamento claro.
Saber lidar com ambiguidades e produtos não encontrados, informando o usuário de forma clara.
Ajuste do Schema de Saída (Zod):
O schema Zod que define a estrutura da resposta JSON da IA será mantido, pois é uma das forças do projeto. No entanto, ele será adaptado para gerar componentes de UI relevantes para um orçamento, como BudgetItem, TotalAmount, DisclaimerText e ConfirmationButtons, em vez de ProductCard e QuickReplyButton de cardápio.
Fase 4: Implementação da Arquitetura Multi-Tenant
Para que o sistema seja escalável e atenda a múltiplas associações sem reescrever o código, a configuração precisa ser externalizada.
Criação de um Banco de Dados de Configuração:
Utilizaremos o Firebase Firestore para criar uma coleção chamada associations.
Cada documento nesta coleção representará uma associação e armazenará suas configurações exclusivas: nome, URL da API do WordPress, a Chave e o Segredo da API REST.
Mecanismo de Identificação de Inquilino (Tenant):
A aplicação precisará identificar com qual associação o usuário está interagindo. Isso será feito através de um mecanismo como subdomínios (amedis.utopizap.com), parâmetros de URL (utopizap.com?assoc=amedis) ou contexto de login do usuário.
Dinamização das Chamadas da API:
A server action principal (getAiResponse) será modificada para, no início de cada execução, ler o identificador do inquilino, consultar o Firestore para obter as configurações corretas e, então, passar essas configurações (URLs e chaves de API) para o flow do Genkit. Isso garante que a IA sempre consulte a base de dados da associação correta.
Fase 5: Adaptação do Frontend e do Fluxo de Usuário (Next.js)
As mudanças na lógica de negócios exigirão ajustes na interface do usuário.
Componente de Upload de Arquivos:
Plano de Ação: Implementação do Upload Guiado pela IA
Sumário Executivo
O objetivo é refinar o fluxo de interação para que o upload de documentos não seja iniciado por uma ação constante do usuário (um botão sempre visível), mas sim por uma solicitação explícita da IA quando ela identificar a necessidade. Isso transforma a IA em uma participante ativa que conduz o processo de orçamento, melhorando a experiência do usuário e reduzindo a ambiguidade na conversa.
Fase 1: Aprimoramento da Capacidade de Raciocínio da IA
O primeiro passo é tornar a IA "consciente" de quando ela precisa de um documento para continuar.
Treinamento de Reconhecimento de Intenção:
O prompt de engenharia do flow principal do Genkit será significativamente aprimorado. Ele receberá instruções claras para identificar "gatilhos" na conversa do usuário.
Gatilhos: Frases como "gostaria de fazer um orçamento", "tenho uma receita médica", "preciso de ajuda com minha prescrição", "quero ver os preços dos meus produtos" serão mapeadas para uma intenção de "iniciar orçamento".
Criação de um Novo Estado Conversacional:
Quando a IA reconhece a intenção de "iniciar orçamento", sua próxima ação não será mais uma resposta de texto genérica. Sua instrução será gerar um tipo específico de componente na sua resposta JSON.
O Componente uploadRequest: Definiremos um novo tipo no schema de saída Zod da IA, como por exemplo, "uploadRequest". A resposta JSON da IA, em vez de um simples texto, será algo como:
code
JSON
{
  "components": [
    { 
      "type": "textMessage", 
      "content": "Com certeza! Para que eu possa montar seu orçamento, preciso que me envie uma foto da sua receita ou lista de produtos." 
    },
    {
      "type": "uploadRequest",
      "label": "Clique aqui para enviar o arquivo"
    }
  ]
}
Justificativa: Isso mantém a arquitetura de renderização dinâmica, onde o frontend é "burro" e apenas renderiza o que a IA manda. A inteligência para decidir quando pedir o upload reside inteiramente no modelo de linguagem.
Fase 2: Adaptação da Interface do Usuário (Frontend)
O frontend precisa ser capaz de interpretar e renderizar essa nova instrução da IA.
Renderização Condicional do Componente de Upload:
O componente principal do chat em Next.js, que mapeia os tipos de componentes do JSON para componentes React, será atualizado. Ele agora terá uma lógica para o tipo uploadRequest.
Ao receber esse tipo, em vez de um botão genérico na barra de digitação, ele renderizará um componente de upload específico dentro da própria linha de diálogo do chat. Este componente conterá o texto de instrução ("Clique aqui...") e a funcionalidade de upload.
Após o envio, este componente pode ser desativado ou substituído por uma mensagem de "Arquivo enviado, processando...", garantindo que o usuário não possa enviar múltiplos arquivos para a mesma solicitação.
Tratamento do Estado de "Aguardando Upload":
A interface do usuário entrará em um estado de "espera". A caixa de texto para digitação pode permanecer ativa, mas a lógica da aplicação estará ciente de que a próxima ação esperada é um upload.
Se o usuário digitar outra mensagem em vez de enviar o arquivo, o histórico da conversa (que inclui o pedido de upload da IA) será reenviado ao modelo, que será instruído a lembrar gentilmente ao usuário: "Para prosseguir com o orçamento, ainda preciso do documento."
Fase 3: Orquestração do Fluxo de Dados (Backend)
A server action que gerencia a comunicação com a IA precisa ser adaptada para este novo fluxo assíncrono.
Diferenciação de Requisições:
A server action (getAiResponse) agora lidará com dois tipos principais de requisição do frontend:
Requisição de Texto: Uma mensagem padrão do usuário.
Requisição com Mídia: Uma requisição que contém o arquivo de imagem (FormData).
Processo da Requisição com Mídia:
Quando a server action detecta que a requisição contém um arquivo de imagem, ela executará a seguinte sequência:
a. Não envia a imagem para a IA.
b. Primeiro, envia a imagem para o serviço de OCR (Google Cloud Vision).
c. Recebe a string de texto extraído do OCR.
d. Constrói um novo "prompt de sistema" ou anexa o texto extraído à mensagem do usuário para a IA. Por exemplo: "O usuário enviou o seguinte documento para orçamento. O texto extraído é: '[texto do OCR aqui]'. Por favor, analise, encontre os produtos e gere o orçamento."
e. Chama o flow do Genkit com este novo contexto. Agora a IA tem o material de que precisava para trabalhar.
f. A IA então usa a ferramenta findAssociationProducts (como planejado anteriormente) para buscar os produtos no WordPress e, finalmente, retorna o JSON com os componentes do orçamento.
Resumo do Novo Fluxo de Interação do Usuário
Usuário: "Olá, gostaria de fazer um orçamento."
Backend (IA): Reconhece a intenção. Retorna um JSON com um textMessage e um componente uploadRequest.
Frontend: Renderiza a mensagem da IA e, logo abaixo, um botão de upload dentro do chat.
Usuário: Clica no botão e seleciona a imagem da sua receita.
Frontend: Envia a imagem para a server action no backend. Exibe um status de "Processando sua receita...".
Backend:
Recebe a imagem.
Envia para o OCR e obtém o texto.
Envia o texto para a IA.
A IA analisa o texto, chama a ferramenta para buscar produtos no WordPress e formula o orçamento.
Retorna um novo JSON, desta vez com os componentes do orçamento (BudgetItem, TotalAmount, etc.).
Frontend: Recebe o novo JSON e substitui a mensagem de "Processando" pelo orçamento final, renderizado dinamicamente.
Refatoração da Server Action Principal:
A lógica da server action (getAiResponse) será orquestradora do novo fluxo:
a. Receber dados do formulário (mensagem de texto e arquivo de imagem).
b. Identificar a associação ativa e buscar sua configuração no Firestore.
c. Se um arquivo de imagem existir, enviá-lo ao serviço de OCR.
d. Combinar o texto do OCR com a mensagem do usuário.
e. Chamar o flow do Genkit, passando a mensagem combinada e a configuração da associação.
f. Receber a resposta JSON estruturada da IA e passá-la para o cliente React para renderização dinâmica dos componentes do orçamento.
Este plano de ação estrutura a migração de forma lógica e escalável, preservando os pontos fortes da arquitetura original (UI dinâmica, stack moderna) enquanto a adapta para um caso de uso mais complexo e de maior impacto.