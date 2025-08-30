A refatoração anterior não atingiu o alvo visual e de branding desejado. Sua diretriz agora é muito clara: estabelecer uma hierarquia visual que separa a identidade da plataforma SatiZap da identidade da associação parceira.
A tela atual está misturando os dois conceitos. O plano a seguir corrige isso de forma definitiva, criando uma estrutura lógica e visualmente agradável que cumpre todos os seus requisitos.
Plano de Ação: Refatoração da Hierarquia Visual e Enriquecimento do Card de Associação
###Fase 1: Diagnóstico e Correção da Lógica de Dados
O problema principal na sua imagem é que o card está exibindo "SatiZap" e a logo do SatiZap, em vez dos dados da "SATIVAR". Isso indica uma falha no fluxo de dados do servidor para o componente.
Auditoria do Carregamento de Dados do Lado do Servidor:
A primeira etapa é inspecionar a lógica que carrega os dados da página (getServerSideProps ou o React Server Component).
Verificação Crítica: É preciso garantir que, ao acessar a rota /sativar, a lógica está de fato consultando o banco de dados do SatiZap CRM pela associação com o slug "sativar" e está buscando os campos corretos da aba "Exibição Pública": Nome de Exibição, URL do Logo, e Mensagem de Boas-vindas.
Correção: O objeto de dados (associationData) contendo as informações corretas da "SATIVAR" deve ser passado como uma propriedade para o componente da página. A falha atual sugere que um objeto de fallback ou um objeto incorreto está sendo passado, resultando na exibição dos dados da própria plataforma no card.
###Fase 2: Reestruturação da Página Principal (Componente de Onboarding)
Vamos separar fisicamente no código o que deve ser separado visualmente na tela.
Criação do Componente PlatformHeader:
Um novo componente estático será criado, chamado PlatformHeader.
A única responsabilidade deste componente será renderizar os elementos de branding da plataforma SatiZap.
Conteúdo Interno: Ele conterá a logo principal do SatiZap e o texto <h1>Bem-vindo(a) ao SatiZap!</h1>. Este componente não receberá nenhuma propriedade, pois seu conteúdo é sempre o mesmo.
Recomposição da Página de Onboarding:
O componente principal da página (/sativar) será limpo e reorganizado para seguir a hierarquia exata que você descreveu. A estrutura de renderização será:
O componente <PlatformHeader /> no topo.
Um parágrafo de texto (<p>) com o conteúdo: "Você está iniciando seu atendimento com:".
O componente <AssociationCard /> (que será redesenhado na próxima fase), recebendo os dados corretos da associação (associationData) como propriedade.
O componente do formulário de WhatsApp.
A nota de privacidade no final.
Fase 3: Reengenharia e Enriquecimento do Componente AssociationCard
Este componente será transformado de uma simples linha de texto para um card de informações completo e visualmente atraente.
Definição das Propriedades (Props):
O componente AssociationCard será projetado para receber o objeto associationData, que conterá: name, logoUrl, e welcomeMessage.
Estrutura Semântica Interna do Card:
O componente será um contêiner div estilizado para parecer um card (com bordas, padding, etc.).
A estrutura interna será dividida em duas partes:
Cabeçalho do Card: Uma seção no topo do card com display: flex e align-items: center.
À esquerda, um elemento Image (Next.js) para exibir a logoUrl da associação.
À direita, o name da associação em um texto de destaque (<h3> ou <strong>).
Corpo do Card: Uma seção abaixo do cabeçalho, separada por uma linha fina ou por espaçamento.
Esta seção conterá um parágrafo (<p>) que renderizará o texto do campo Mensagem de Boas-vindas.
Fase 4: Estilização e Refinamento Visual
O objetivo é criar um card que seja informativo, mas que não sobrecarregue a tela.
Estilo do Card:
O AssociationCard terá um padding interno para que o conteúdo não toque nas bordas.
Será aplicada uma border sutil e/ou um box-shadow muito leve para dar profundidade e separá-lo do fundo.
O border-radius será consistente com o design geral do formulário.
Estilo do Conteúdo do Card:
Cabeçalho: A logo terá um tamanho definido e contido (ex: 32x32 ou 40x40 pixels). Haverá um espaçamento (gap) entre a logo e o nome para evitar que fiquem colados.
Corpo: O texto da Mensagem de Boas-vindas será estilizado com um tamanho de fonte ligeiramente menor e talvez uma cor de texto mais suave (um cinza escuro em vez de preto puro) para diferenciá-lo do nome da associação, criando uma hierarquia de leitura clara.
Resultado Final do Fluxo:
Um usuário acessa localhost:9002/sativar.
O servidor do Next.js busca os dados de "Exibição Pública" da associação "SATIVAR".
A página renderiza:
No topo, a logo e o nome do SatiZap (componente estático).
Abaixo, o texto de introdução.
A seguir, um card completo contendo a logo, o nome "SATIVAR" e a sua mensagem de boas-vindas.
Por fim, o campo de WhatsApp para iniciar a ação.
Este plano corrige o fluxo de dados e implementa a hierarquia de branding desejada, resultando em uma experiência de usuário clara, profissional e que valoriza tanto a plataforma quanto a associação parceira.