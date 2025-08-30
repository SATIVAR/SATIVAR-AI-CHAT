# Requirements Document

## Introduction

O sistema SatiZap possui um middleware multi-tenant que funciona com subdomínios em produção e path-based routing em desenvolvimento. Atualmente, quando acessamos URLs como `localhost:9002/sativar`, o sistema mostra "Associação não encontrada" porque o middleware não consegue validar o tenant corretamente em ambiente de desenvolvimento. Precisamos corrigir este comportamento mantendo toda a funcionalidade existente.

## Requirements

### Requirement 1

**User Story:** Como desenvolvedor, eu quero acessar URLs de desenvolvimento como `localhost:9002/sativar` sem receber erro de "Associação não encontrada", para que eu possa testar o sistema localmente.

#### Acceptance Criteria

1. WHEN acesso `localhost:9002/sativar` THEN o sistema SHALL carregar a página da associação "sativar" corretamente
2. WHEN acesso `localhost:9002/` THEN o sistema SHALL mostrar a Hero Section sem tentar validar tenant
3. WHEN acesso uma URL com tenant inválido em desenvolvimento THEN o sistema SHALL mostrar página de erro apropriada
4. WHEN o sistema está em produção THEN o comportamento de subdomínios SHALL permanecer inalterado

### Requirement 2

**User Story:** Como desenvolvedor, eu quero que o middleware funcione corretamente tanto para a Hero Section quanto para rotas de tenant, para que não haja conflitos entre as funcionalidades.

#### Acceptance Criteria

1. WHEN acesso a rota raiz `/` THEN o middleware SHALL permitir acesso sem validação de tenant
2. WHEN acesso rotas administrativas como `/admin` THEN o middleware SHALL permitir acesso sem validação de tenant
3. WHEN acesso rotas de API como `/api/admin` THEN o middleware SHALL permitir acesso sem validação de tenant
4. WHEN acesso rotas de tenant válido THEN o middleware SHALL adicionar headers de contexto apropriados

### Requirement 3

**User Story:** Como desenvolvedor, eu quero que o sistema tenha dados de teste adequados para desenvolvimento, para que eu possa testar todas as funcionalidades localmente.

#### Acceptance Criteria

1. WHEN executo o ambiente de desenvolvimento THEN o sistema SHALL ter pelo menos uma associação "sativar" no banco de dados
2. WHEN acesso `localhost:9002/sativar` THEN o sistema SHALL encontrar a associação correspondente
3. WHEN a associação existe no banco THEN ela SHALL estar marcada como ativa (isActive = true)
4. WHEN executo scripts de seed THEN eles SHALL criar dados consistentes para desenvolvimento