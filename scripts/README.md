# Scripts de Verificação de Saúde - SatiZap

Este diretório contém scripts para verificar e manter a saúde do ambiente de desenvolvimento do SatiZap.

## Scripts Disponíveis

### 1. Verificação Completa de Saúde do Ambiente

```bash
npm run env:health
```

**Arquivo:** `verify-environment-health.js`

**O que verifica:**
- ✅ Conectividade com banco de dados
- ✅ Existência e integridade das tabelas principais
- ✅ Dados de teste (associação "sativar")
- ✅ Variáveis de ambiente obrigatórias e opcionais
- ✅ Arquivos e diretórios essenciais do projeto
- ✅ Pacientes de teste associados

**Saída:** Relatório detalhado com recomendações específicas

### 2. Verificação Rápida

```bash
npm run env:quick
```

**Arquivo:** `quick-health-check.js`

**O que verifica:**
- ⚡ Conectividade básica com banco
- ⚡ Existência da associação "sativar"
- ⚡ Status ativo da associação

**Saída:** Resultado rápido (OK/Problemas) com próximos passos

### 3. Seed de Dados de Teste

```bash
npm run seed:test
```

**Arquivo:** `seed-test-association.js`

**O que faz:**
- 🌱 Cria/atualiza associação "sativar"
- 🌱 Cria paciente de teste
- 🌱 Verifica integridade final dos dados

### 4. Verificação de Saúde do Banco (Legacy)

```bash
npm run db:health
```

**Arquivo:** `verify-database-health.js`

**O que verifica:**
- 🗄️ Conectividade com banco
- 🗄️ Associações existentes
- 🗄️ Status da associação "sativar"

## Scripts de Setup Combinados

### Setup Completo para Desenvolvimento

```bash
npm run dev:setup
```

**O que executa:**
1. `npm run seed:test` - Garante dados de teste
2. `npm run env:health` - Verifica saúde completa

### Setup Básico do Banco

```bash
npm run db:setup
```

**O que executa:**
1. `npm run seed:test` - Garante dados de teste
2. `npm run db:health` - Verifica saúde do banco

## Fluxo de Trabalho Recomendado

### Ao Iniciar Desenvolvimento

1. **Verificação rápida:**
   ```bash
   npm run env:quick
   ```

2. **Se houver problemas, executar setup:**
   ```bash
   npm run dev:setup
   ```

3. **Iniciar desenvolvimento:**
   ```bash
   npm run dev
   ```

### Ao Encontrar Problemas

1. **Diagnóstico completo:**
   ```bash
   npm run env:health
   ```

2. **Seguir recomendações do relatório**

3. **Re-executar verificação:**
   ```bash
   npm run env:quick
   ```

## Variáveis de Ambiente

### Obrigatórias
- `DATABASE_URL` - URL de conexão com MySQL

### Opcionais
- `ENCRYPTION_KEY` - Chave de criptografia (32 caracteres)
- `NEXT_PUBLIC_CONTACT_WHATSAPP_NUMBER` - Número do WhatsApp
- `GEMINI_API_KEY` - Chave da API do Gemini

## URLs de Teste

Após verificação bem-sucedida, teste estas URLs:

- **Hero Section:** http://localhost:9002/
- **Página da Associação:** http://localhost:9002/sativar
- **Admin:** http://localhost:9002/admin

## Códigos de Saída

- `0` - Sucesso, ambiente saudável
- `1` - Problemas encontrados, verificar logs

## Estrutura dos Resultados

Os scripts retornam objetos estruturados com:

```javascript
{
  database: { connection: boolean, error: string },
  testData: { sativarExists: boolean, sativarActive: boolean, patientsCount: number },
  environment: { requiredVars: [], missingVars: [], optionalVars: [] },
  files: { essential: [], missing: [] },
  overall: { healthy: boolean, errors: [], warnings: [] }
}
```

## Troubleshooting

### Erro de Conexão com Banco
```bash
# Verificar variável DATABASE_URL
echo $DATABASE_URL

# Testar conectividade
npm run env:health
```

### Associação "sativar" não encontrada
```bash
# Recriar dados de teste
npm run seed:test

# Verificar resultado
npm run env:quick
```

### Variáveis de Ambiente Faltando
```bash
# Copiar exemplo
cp .env.example .env

# Editar com valores corretos
# Verificar novamente
npm run env:health
```

## Integração com CI/CD

Estes scripts podem ser integrados em pipelines:

```yaml
# Exemplo GitHub Actions
- name: Health Check
  run: npm run env:health
  
- name: Setup Test Data
  run: npm run seed:test
```

## Logs e Debugging

Todos os scripts fornecem logs detalhados com:
- ✅ Sucessos em verde
- ❌ Erros em vermelho  
- ⚠️ Avisos em amarelo
- 💡 Recomendações com ícones

Para debugging adicional, verifique:
- Logs do Prisma
- Variáveis de ambiente
- Conectividade de rede
- Permissões de arquivo