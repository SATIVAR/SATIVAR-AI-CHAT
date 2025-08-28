Plano de Ação Técnico para Ajuste e Integração
Fase 1: Clarificação na Interface de Cadastro de Associação
Para evitar confusão futura, vamos deixar a finalidade de cada campo explícita no formulário.
Ajuste de Rótulos e Textos de Ajuda:
Altere o rótulo "Subdomínio" para "Subdomínio de Acesso (no SATIZAP)".
Adicione um texto de ajuda abaixo do campo que mostre o resultado final, por exemplo: "subdominio-escolhido.satizap.app". Isso deixa claro que este é o endereço que será usado pelo paciente para acessar o chat.
Mantenha o campo "URL do WordPress" como está, pois ele já representa corretamente o endereço do sistema de gestão da associação.
Fase 2: Implementação da Lógica Multi-Tenant no Backend
Esta é a fase mais crítica. Vamos fazer o sistema identificar qual associação está sendo acessada e carregar as configurações corretas dinamicamente.
Criação de um Middleware de Roteamento:
Implemente um middleware no Next.js. Este é um código que roda no servidor antes de a página ser carregada.
Lógica do Middleware:
a. A cada requisição, ele irá extrair o hostname (ex: iracema.localhost:9002 ou iracema.satizap.app).
b. Ele isolará o subdomínio (iracema).
c. Fará uma consulta na tabela Associacao do banco de dados, buscando um registro onde o campo subdomain seja igual ao subdomínio extraído.
d. Se encontrar a associação: Ele permite que a requisição continue, "injetando" o ID ou os dados da associação encontrada no contexto da requisição, para que a página ou API saiba com quem está lidando.
e. Se não encontrar: Ele redireciona o usuário para uma página de "associação não encontrada" ou para a página principal.
Fase 3: Contextualização Dinâmica do Agente de IA
Agora que o sistema sabe qual associação está ativa em cada requisição, vamos usar essa informação para dar o contexto correto à IA.
Modificação da API de Mensagens:
A sua API que processa as mensagens do chat (provavelmente em /api/messages) deve ser adaptada.
Ela utilizará a informação da associação (fornecida pelo middleware) para buscar no banco de dados os dados completos da associação ativa, incluindo a wpApiUrl, as wpApiCredentials e o campo promptContext.
Injeção Dinâmica de Contexto no Genkit:
Antes de chamar o flow do Genkit para processar a mensagem do usuário, sua API irá construir o prompt de sistema dinamicamente.
Ela pegará o prompt base e concatenará o conteúdo do campo promptContext da associação ativa. Exemplo: "Você é um assistente da Sativar. [Conteúdo do campo promptContext aqui]".
Ela passará a wpApiUrl e as wpApiCredentials corretas como parâmetros para as tools (funções) do Genkit.
Parametrização das Funções da IA (Tools):
Suas funções buscarProdutos e criarPedido (as tools do Genkit) não devem mais ter URLs ou credenciais fixas ("hardcoded").
Elas devem ser modificadas para receber a url e as credenciais como argumentos. Desta forma, a API de mensagens poderá fornecer as informações corretas da associação ativa a cada chamada, tornando as funções reutilizáveis para qualquer associação.
Ao final deste plano, seu sistema terá uma lógica coesa: o subdomínio na URL do chat determinará qual registro de associação será carregado do banco, e os dados desse registro (URL do WordPress, credenciais e contexto de IA) serão usados dinamicamente para personalizar toda a interação do agente com o paciente.