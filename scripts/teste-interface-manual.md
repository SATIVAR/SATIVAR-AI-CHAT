# Teste Manual da Interface - Correção Next.js

## Objetivo
Verificar se a correção implementada no Next.js está funcionando corretamente na interface web.

## Pré-requisitos
1. ✅ Servidor SatiZap rodando (`npm run dev`)
2. ✅ Correção implementada no `wordpress-api.service.ts`
3. ✅ Logs detalhados ativados

## Passos do Teste

### 1. Acessar a Interface
```
URL: http://localhost:9002/sativar
```

### 2. Inserir Dados de Teste
```
WhatsApp: 85996201636
```

### 3. Clicar em "Continuar"

## Resultados Esperados

### ✅ SUCESSO (Correção Funcionou)
- **Tela mostrada**: Confirmação de paciente
- **Conteúdo**: 
  - "Bem-vindo(a) de volta, [Nome do Paciente]!"
  - Dados do paciente em modo leitura
  - Botão "Iniciar Atendimento"
- **NÃO deve mostrar**: Campos Nome/CPF

### ❌ FALHA (Ainda há problema)
- **Tela mostrada**: Formulário de captura de lead
- **Conteúdo**:
  - Campos "Nome" e "CPF"
  - Botão "Continuar"
- **Indica**: Sistema não encontrou o paciente

## Logs para Verificar

Durante o teste, observe os logs no terminal do servidor:

```
[FASE 1 - LOG 1] Searching for phone: 85996201636 (cleaned: 85996201636)
[FASE 1 - LOG 3] URL construída para WordPress: https://teste.sativar.com.br/wp-json/wp/v2/clientes?per_page=100
[FASE 1 - LOG 4A] WordPress Response Status: 200
[FASE 1 - LOG 4A] WordPress Response Body - Total clients: [número]
[FASE 1 - LOG 4B] Starting intelligent search in [número] clients
[FASE 1 - LOG 4C] MATCH FOUND! Client ID: [id], Original phone: "[telefone_formatado]", Normalized: "85996201636"
[FASE 1 - LOG 4C] Returning user: [nome_do_paciente]
```

## Troubleshooting

### Problema: Ainda mostra formulário Nome/CPF
**Causa**: Busca não encontrou o paciente
**Verificar**:
1. Logs mostram `Total clients: 0`? → Problema na conexão WordPress
2. Logs mostram clientes mas não encontra match? → Dados em formato não reconhecido
3. Erro na busca? → Problema na implementação

### Problema: Erro 500 ou crash
**Causa**: Erro na implementação
**Verificar**:
1. Logs de erro no terminal
2. Sintaxe do código modificado
3. Dependências faltando

### Problema: Tela branca ou loading infinito
**Causa**: Frontend não consegue processar resposta
**Verificar**:
1. Console do navegador (F12)
2. Network tab para ver requisições
3. Resposta da API

## Teste Adicional: Outros Formatos

Após o teste principal funcionar, teste com outros formatos:

```
Testes adicionais:
- (85) 99620-1636
- 85 99620-1636  
- 85-99620-1636
- +55 85 99620-1636
```

Todos devem encontrar o mesmo paciente.

## Resultado Final

- ✅ **SUCESSO**: Interface mostra confirmação de paciente
- ❌ **FALHA**: Interface ainda mostra formulário de captura

## Próximos Passos

### Se SUCESSO:
1. Remover logs de debug para produção
2. Testar com outros pacientes
3. Implementar testes automatizados

### Se FALHA:
1. Analisar logs detalhados
2. Verificar dados no WordPress
3. Ajustar lógica de busca conforme necessário