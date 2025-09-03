# Requirements Document

## Introduction

O sistema SatiZap precisa implementar uma lógica inteligente de identificação de interlocutor para diferenciar quando quem está conversando é o próprio paciente ou um responsável (tutor, familiar, etc.). O telefone é a chave de entrada única, mas o sistema deve adaptar a interface, mensagens e contexto da IA baseado no tipo de associação identificado nos dados ACF do WordPress. Esta funcionalidade é crucial para proporcionar uma experiência de atendimento contextual e personalizada.

## Requirements

### Requirement 1

**User Story:** Como sistema, eu quero identificar automaticamente se quem está conversando é o paciente ou um responsável através dos dados ACF, para que a experiência seja contextualizada adequadamente.

#### Acceptance Criteria

1. WHEN o sistema recebe um telefone para validação THEN ele SHALL consultar os dados ACF completos do WordPress
2. WHEN os dados ACF contêm `tipo_associacao: 'assoc_paciente'` THEN o sistema SHALL identificar o interlocutor como o próprio paciente
3. WHEN os dados ACF contêm `tipo_associacao: 'assoc_respon'` THEN o sistema SHALL identificar o interlocutor como responsável
4. WHEN os dados ACF são recebidos THEN o sistema SHALL preservar todos os campos incluindo `nome_completo`, `nome_completo_responc`, `cpf`, `cpf_responsavel`
5. WHEN há falha na sincronização de dados ACF THEN o sistema SHALL registrar logs detalhados para diagnóstico

### Requirement 2

**User Story:** Como usuário (paciente), eu quero ver mensagens personalizadas que me reconheçam diretamente, para que me sinta acolhido pelo sistema.

#### Acceptance Criteria

1. WHEN sou identificado como paciente direto THEN a tela SHALL exibir "Bem-vindo(a) de volta, [Nome do Paciente]!"
2. WHEN sou identificado como paciente direto THEN o sistema SHALL usar pronomes diretos como "você" nas conversas
3. WHEN sou identificado como paciente direto THEN a IA SHALL se dirigir diretamente a mim durante o atendimento
4. WHEN inicio um atendimento como paciente THEN o contexto da conversa SHALL ser configurado para comunicação direta

### Requirement 3

**User Story:** Como responsável, eu quero ver mensagens que reconheçam meu papel como intermediário no atendimento do paciente, para que o contexto seja claro e apropriado.

#### Acceptance Criteria

1. WHEN sou identificado como responsável THEN a tela SHALL exibir "Olá, [Nome do Responsável]! Você está iniciando o atendimento para [Nome do Paciente]."
2. WHEN sou identificado como responsável THEN a IA SHALL se dirigir a mim mas referenciar o paciente em terceira pessoa
3. WHEN sou identificado como responsável THEN perguntas sobre sintomas SHALL ser formuladas como "Como o(a) [Nome do Paciente] está se sentindo?"
4. WHEN inicio um atendimento como responsável THEN o contexto SHALL incluir ambas as identidades (responsável e paciente)

### Requirement 4

**User Story:** Como sistema, eu quero manter o contexto de interlocutor durante toda a sessão de chat, para que a experiência seja consistente do início ao fim.

#### Acceptance Criteria

1. WHEN uma sessão de chat é iniciada THEN o sistema SHALL armazenar `patient_name` e `interlocutor_name`
2. WHEN o interlocutor é o próprio paciente THEN `patient_name` e `interlocutor_name` SHALL ser o mesmo valor
3. WHEN o interlocutor é um responsável THEN `patient_name` e `interlocutor_name` SHALL ser valores diferentes
4. WHEN a IA gera respostas THEN ela SHALL usar o contexto correto baseado no tipo de interlocutor
5. WHEN há mudança de contexto durante a conversa THEN o sistema SHALL manter a consistência das referências

### Requirement 5

**User Story:** Como desenvolvedor, eu quero que os dados ACF sejam sincronizados corretamente do WordPress para o banco SatiZap, para que todas as funcionalidades de interlocutor funcionem adequadamente.

#### Acceptance Criteria

1. WHEN a API `/api/patients/validate-whatsapp-simple` recebe dados do WordPress THEN ela SHALL preservar o objeto `acf_fields` completo
2. WHEN os dados são passados para o Patient Service THEN o campo `acf` SHALL conter todos os dados originais, não um array vazio
3. WHEN um paciente é salvo no banco SatiZap THEN os campos `tipo_associacao`, `nome_responsavel`, `cpf_responsavel` SHALL ser populados corretamente
4. WHEN há erro na sincronização THEN o sistema SHALL registrar logs detalhados identificando o ponto exato da falha
5. WHEN os dados são atualizados no WordPress THEN o SatiZap SHALL refletir as mudanças na próxima consulta

### Requirement 6

**User Story:** Como administrador, eu quero visualizar claramente o tipo de associação e dados do responsável na interface administrativa, para que possa gerenciar os pacientes adequadamente.

#### Acceptance Criteria

1. WHEN visualizo um paciente na interface administrativa THEN o sistema SHALL exibir o `tipo_associacao` claramente
2. WHEN o paciente tem um responsável THEN os dados do responsável SHALL ser visíveis na interface
3. WHEN há discrepância entre dados do WordPress e SatiZap THEN o sistema SHALL destacar as diferenças
4. WHEN atualizo dados de um paciente THEN o sistema SHALL sincronizar com o WordPress mantendo a integridade
5. WHEN filtro pacientes por tipo de associação THEN o sistema SHALL retornar resultados precisos