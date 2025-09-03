PRD: SatiZap v2.0 - Integração Nativa com WhatsApp
Versão: 2.0
Autor: Projeto UtópiZap/SatiZap
Data: 31 de Agosto de 2025
Status: Análise Concluída, Pronto para Desenvolvimento
1. Visão Geral e Objetivo Estratégico
1.1. Resumo do Produto:
SatiZap v2.0 evolui de uma plataforma de web chat para uma central de automação e atendimento conversacional que opera diretamente no WhatsApp. A plataforma utilizará a WAHA (WhatsApp HTTP API) como uma ponte para receber mensagens de pacientes, processá-las com o motor de IA do SatiZap e permitir que atendentes humanos assumam e continuem as conversas através de um CRM integrado, sem que o paciente precise sair do WhatsApp.
1.2. Problema a Ser Resolvido:
O acesso via web, mesmo que otimizado, representa uma barreira e um ponto de atrito para o paciente. A comunicação mais natural e de menor fricção ocorre no ambiente que o paciente já usa diariamente: o WhatsApp. Atualmente, o SatiZap não opera neste canal.
1.3. Objetivo Estratégico:
Tornar o SatiZap a plataforma de escolha para associações que desejam automatizar seu atendimento inicial via WhatsApp. O objetivo é capturar, qualificar e preparar orçamentos através da IA, entregando conversas prontas para a finalização por um atendente humano, centralizando toda a operação em um único painel de controle (CRM SatiZap).
2. Escopo do Projeto (Fase Atual)
2.1. Funcionalidades Incluídas (In Scope):
Infraestrutura de Comunicação (WAHA): Configuração de uma instância WAHA em Docker no ambiente de desenvolvimento para servir como a ponte de comunicação com um número de WhatsApp.
Canal de Entrada (Webhook SatiZap): Criação de um endpoint de API seguro no SatiZap (/api/webhooks/whatsapp) para receber mensagens, imagens e eventos vindos da WAHA.
Reutilização da Lógica de Validação: A nova rota de webhook irá reutilizar a lógica já existente para validar o número de telefone do paciente contra a API do sistema de gestão (WordPress), determinando se é um "Lead" ou "Membro".
Canal de Saída (Serviço de Mensageria): Criação de um serviço no backend do SatiZap que se comunica com a API da WAHA para enviar mensagens de texto para o paciente.
Adaptação do Fluxo da IA: O motor de IA (Genkit) será mantido, mas sua saída (as respostas) será redirecionada para o novo Serviço de Mensageria em vez de para a interface web.
Fluxo de "Handoff" (Transbordo para Humano): Implementação de um estado final no fluxo da IA onde, após a confirmação do orçamento, a conversa é marcada como "Aguardando Atendimento Humano" e a IA envia uma mensagem final de transição.
CRM de Atendimento (Painel do Admin): Criação de uma nova seção no painel SatiZap chamada "Caixa de Entrada" ou "Atendimento", onde os admins de associação podem:
Visualizar uma lista de conversas ativas e aguardando atendimento.
Ler o histórico completo da interação do paciente com a IA.
Enviar mensagens para o paciente no WhatsApp digitando em uma caixa de texto dentro do CRM.
2.2. Funcionalidades Excluídas (Out of Scope para v2.0):
Interface de chat para o paciente via web (será descontinuada ou mantida como legado).
Envio de notificações proativas (ex: "Seu pedido foi enviado"). O foco é no atendimento reativo.
Recursos avançados de CRM de chat (indicadores de "digitando...", status de "lido", etc.).
Processamento de pagamentos diretamente via WhatsApp.
3. Arquitetura da Solução e Fluxo de Dados
A arquitetura desacoplada é mantida, mas um novo componente central é adicionado.
Componente A: WhatsApp do Paciente - A interface do usuário final.
Componente B: WAHA (Ponte/Tradutor) - Roda em Docker, recebe eventos do WhatsApp e os envia para o SatiZap; recebe comandos do SatiZap e os envia para o WhatsApp.
Componente C: SatiZap (Cérebro da Lógica) - Roda no Next.js. Contém o webhook, o motor de IA, o CRM de atendimento e a lógica de negócios.
Componente D: Sistema de Gestão (WordPress) - A fonte da verdade para dados de pacientes e produtos, acessada via API.
Fluxo de Execução Típico:
Entrada: Paciente envia "Quero uma cotação" para o WhatsApp da Associação.
Tradução: WAHA captura a mensagem e a envia via POST para o webhook do SatiZap.
Processamento: O webhook do SatiZap identifica a associação e o paciente. Ele aciona o fluxo da IA com o conteúdo da mensagem.
Inteligência: A IA processa a solicitação, talvez pedindo uma foto da receita (usando OCR) e consultando a API do WordPress para validar produtos.
Resposta: A IA gera uma resposta (o orçamento). O SatiZap usa seu Serviço de Mensageria para enviar essa resposta para a API da WAHA.
Entrega: WAHA envia a mensagem de orçamento para o WhatsApp do paciente.
Handoff: O paciente confirma. A IA atualiza o status da conversa para "Aguardando Humano" e notifica o painel do SatiZap.
Atendimento Humano: O admin da associação vê a conversa em sua "Caixa de Entrada" no SatiZap, revisa o histórico e envia a mensagem final para fechar o pedido.
4. Próximos Passos: Requisitos para Implementação
Esta seção detalha as tarefas de desenvolvimento necessárias.
4.1. Configuração do Ambiente de Desenvolvimento:
Criar um arquivo docker-compose.yml para rodar a instância da WAHA localmente.
Mapear a porta da WAHA para que a aplicação Next.js local possa se comunicar com ela.
Conectar um número de WhatsApp de teste à instância da WAHA via QR Code.
4.2. Desenvolvimento do Webhook de Entrada no SatiZap:
Criar a nova rota de API (/api/webhooks/whatsapp).
Implementar a lógica para analisar o corpo da requisição (payload) da WAHA para extrair o número do remetente, a mensagem de texto ou os dados da imagem.
Integrar a chamada ao serviço de validação de paciente existente, passando o número do remetente.
Implementar a lógica para encontrar ou criar uma sessão de chat e passar a mensagem para o motor de IA.
4.3. Desenvolvimento do Serviço de Saída no SatiZap:
Modificar a configuração da associação no CRM para incluir os campos waha_api_url e waha_api_key.
Criar um módulo de serviço (whatsapp.service.ts) com uma função sendMessage que constrói e executa uma requisição POST para a API da WAHA, usando os dados dinâmicos da associação.
4.4. Adaptação do Fluxo da IA e Implementação do "Handoff":
Modificar a função principal do Genkit. Onde ela antes retornava uma resposta para a web, ela agora deve chamar o whatsapp.service.ts para enviar a mensagem.
Criar a lógica de estado final. Quando a IA atinge o objetivo (orçamento aprovado), ela deve atualizar um campo status na tabela de Conversations do SatiZap e parar a execução.
4.5. Construção da Interface de Atendimento (CRM):
Desenvolver a nova página "Caixa de Entrada" no SatiZap.
A página deve fazer uma consulta ao banco de dados para buscar as conversas com status "Aguardando Atendimento" ou "Ativas".
Criar um componente de visualização de chat que renderiza o histórico de mensagens.
Implementar um formulário de envio de mensagem que, ao ser submetido, chama o whatsapp.service.ts para enviar a mensagem do atendente para o paciente.

🚀 Next Steps:
The WAHA infrastructure is now ready. You can:

Generate API keys: node scripts/waha-setup.js generate-keys
Update your .env file with the generated keys
Start WAHA: node scripts/waha-setup.js start
Check health: node scripts/waha-setup.js health