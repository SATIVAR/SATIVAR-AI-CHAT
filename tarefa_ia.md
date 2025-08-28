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
A interface de chat será atualizada para incluir um botão ou área de upload, permitindo que o usuário envie uma imagem (receita, lista, etc.).
Refatoração da Server Action Principal:
A lógica da server action (getAiResponse) será orquestradora do novo fluxo:
a. Receber dados do formulário (mensagem de texto e arquivo de imagem).
b. Identificar a associação ativa e buscar sua configuração no Firestore.
c. Se um arquivo de imagem existir, enviá-lo ao serviço de OCR.
d. Combinar o texto do OCR com a mensagem do usuário.
e. Chamar o flow do Genkit, passando a mensagem combinada e a configuração da associação.
f. Receber a resposta JSON estruturada da IA e passá-la para o cliente React para renderização dinâmica dos componentes do orçamento.
Este plano de ação estrutura a migração de forma lógica e escalável, preservando os pontos fortes da arquitetura original (UI dinâmica, stack moderna) enquanto a adapta para um caso de uso mais complexo e de maior impacto.