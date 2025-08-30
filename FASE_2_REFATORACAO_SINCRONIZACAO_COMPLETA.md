# Fase 2: Refatoração da Lógica de Sincronização no Onboarding - IMPLEMENTAÇÃO COMPLETA

## Resumo da Implementação

A Fase 2 foi implementada com sucesso, refatorando completamente a lógica de sincronização no onboarding para utilizar o endpoint ACF específico do WordPress e implementar os dois caminhos distintos conforme especificado na tarefa.

## Principais Mudanças Implementadas

### 1. WordPress API Service - Endpoint ACF Específico

**Arquivo:** `src/lib/services/wordpress-api.service.ts`

- **Refatoração da função `findUserByPhone`:**
  - Agora usa prioritariamente o endpoint ACF: `GET .../clientes?acf_filters[telefone]={whatsapp}`
  - Implementa fallbacks para endpoints legados
  - Retorna dados ACF completos para sincronização

### 2. Patient Service - Sincronização ACF Aprimorada

**Arquivo:** `src/lib/services/patient.service.ts`

- **Função `syncPatientWithWordPressACF` refatorada:**
  - Analisa o objeto ACF completo recebido
  - Preenche todas as colunas correspondentes na tabela Pacientes
  - Define status como 'MEMBRO' e salva wordpress_id
  - Logging detalhado para debugging

- **Função `createPatientLead` mantida:**
  - Cria registros com status 'LEAD'
  - Campos ACF permanecem NULL conforme especificado
  - wordpress_id permanece NULL

### 3. Endpoints de API Refatorados

#### A. `validate-whatsapp` (Principal)
**Arquivo:** `src/app/api/patients/validate-whatsapp/route.ts`

- **Caminho A - Paciente Encontrado:**
  - Usa endpoint ACF específico
  - Sincronização completa com dados ACF
  - Retorna paciente como 'MEMBRO'

- **Caminho B - Paciente NÃO Encontrado:**
  - Mantém fluxo simples para evitar atrito
  - Instrui frontend para coleta de dados básicos

#### B. `validate-whatsapp-simple` (Frontend)
**Arquivo:** `src/app/api/patients/validate-whatsapp-simple/route.ts`

- Implementa mesma lógica da Fase 2
- Compatível com componente de onboarding existente
- Suporte completo aos dois caminhos

#### C. `complete-registration` (Finalização)
**Arquivo:** `src/app/api/patients/complete-registration/route.ts`

- Refatorado para criar LEADs diretamente
- Remove dependência de registros preliminares
- Implementa Caminho B da Fase 2

#### D. `sync-wordpress` (Sincronização)
**Arquivo:** `src/app/api/patients/sync-wordpress/route.ts`

- Atualizado para trabalhar com dados ACF
- Logging aprimorado
- Suporte aos dois tipos de sincronização

### 4. Frontend - Componente de Onboarding

**Arquivo:** `src/components/chat/onboarding-form.tsx`

- **Atualizado para Fase 2:**
  - Usa nova lógica de complete-registration
  - Remove dependência de preliminary_patient_id
  - Suporte a status 'LEAD' explícito

## Fluxo Implementado

### Caminho A: Paciente Encontrado no WordPress (Sincronização Completa)

1. **Trigger:** Envio do WhatsApp pelo formulário de onboarding
2. **API Call:** `GET .../clientes?acf_filters[telefone]={whatsapp}`
3. **Resposta:** WordPress retorna status 200 com objeto ACF completo
4. **Ação:** Upsert enriquecido no SatiZap:
   - Analisa objeto ACF completo
   - Preenche todas as colunas: nome, telefone, cpf, tipo_associacao, nome_responsavel, etc.
   - Define status como 'MEMBRO'
   - Salva wordpress_id
5. **Resultado:** Registro espelhado completo, transição para chat

### Caminho B: Paciente NÃO Encontrado (Captura de Lead)

1. **Trigger:** WordPress retorna 404 ou não encontra paciente
2. **Ação:** Frontend avança para coleta de Nome Completo e CPF
3. **Envio:** Após coleta, cria registro no SatiZap:
   - Status: 'LEAD'
   - wordpress_id: NULL
   - Preenche apenas nome e cpf coletados
   - Outros campos ACF permanecem NULL
4. **Resultado:** Lead capturado com mínimo atrito

## Estrutura de Dados

### Campos ACF Suportados

- `nome_completo` → `name`
- `cpf` → `cpf`
- `tipo_associacao` → `tipo_associacao`
- `nome_responsavel` → `nome_responsavel`
- `cpf_responsavel` → `cpf_responsavel`
- `telefone` → `whatsapp` (campo de busca)

### Status de Pacientes

- **MEMBRO:** Paciente encontrado no WordPress com dados ACF
- **LEAD:** Paciente não encontrado, dados básicos coletados

## Benefícios da Implementação

1. **Sincronização Rica:** Dados completos do WordPress são espelhados no SatiZap
2. **Captura Eficiente:** LEADs são capturados com mínimo atrito
3. **Flexibilidade:** Sistema funciona com ou sem WordPress disponível
4. **Rastreabilidade:** Logging detalhado para debugging
5. **Compatibilidade:** Mantém compatibilidade com fluxos existentes

## Próximos Passos (Fase 3)

A implementação está pronta para a Fase 3, que incluirá:

1. **Ajuste da IA:** Uso de dados contextuais completos
2. **Prompts Aprimorados:** Diferenciação entre MEMBROs e LEADs
3. **Coleta Inteligente:** IA coletará dados faltantes de LEADs
4. **Verificação Secundária:** Uso de CPF/responsável para verificação

## Testes Recomendados

1. **Teste Caminho A:**
   - WhatsApp existente no WordPress com ACF
   - Verificar sincronização completa
   - Confirmar status 'MEMBRO'

2. **Teste Caminho B:**
   - WhatsApp não existente no WordPress
   - Verificar coleta de dados básicos
   - Confirmar status 'LEAD'

3. **Teste Fallbacks:**
   - WordPress indisponível
   - Endpoints ACF não funcionando
   - Verificar graceful degradation

## Arquivos Modificados

- `src/lib/services/wordpress-api.service.ts`
- `src/lib/services/patient.service.ts`
- `src/app/api/patients/validate-whatsapp/route.ts`
- `src/app/api/patients/validate-whatsapp-simple/route.ts`
- `src/app/api/patients/complete-registration/route.ts`
- `src/app/api/patients/sync-wordpress/route.ts`
- `src/components/chat/onboarding-form.tsx`

## Status

✅ **IMPLEMENTAÇÃO COMPLETA** - Fase 2 totalmente funcional e testável