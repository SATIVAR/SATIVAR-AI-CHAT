# 🔔 Sistema de Notificações SatiZap

Sistema completo de alertas para novas conversas e conversas em fila há muito tempo.

## 🚀 Funcionalidades

### ✨ Notificações em Tempo Real
- **Server-Sent Events (SSE)** para comunicação instantânea
- **Reconexão automática** em caso de falha de conexão
- **Heartbeat** para manter conexão ativa

### 📱 Múltiplos Canais
- **Sino de notificações** com contador visual
- **Toasts** temporários na tela
- **Notificações do navegador** (nativas do SO)
- **Alertas sonoros** configuráveis

### ⚡ Monitoramento Inteligente
- **Verificação automática** da fila em intervalos configuráveis
- **Detecção de timeouts** baseada em prioridades
- **Limpeza automática** de notificações antigas

### 📊 Dashboard de Estatísticas
- Total de conversas na fila
- Tempo médio de espera
- Conversas urgentes (60+ min)
- Métricas diárias de atendimento

## 🛠️ Instalação e Configuração

### 1. Dependências
```bash
npm install sonner
```

### 2. Inicialização Automática
O sistema é inicializado automaticamente quando a aplicação inicia. Não requer configuração adicional.

### 3. Teste do Sistema
```bash
# Testar funcionalidades
npm run notifications:test

# Iniciar aplicação
npm run dev

# Acessar painel de atendimento
http://localhost:9002/atendimento
```

## 🎯 Como Usar

### 1. Painel de Atendimento
- Acesse `/atendimento` para ver o dashboard completo
- Observe o **sino de notificações** no header
- Verifique as **estatísticas em tempo real**
- Configure preferências no **ícone de configurações**

### 2. Configurações Disponíveis
- **Intervalo de monitoramento**: 1-30 minutos
- **Filtros de prioridade**: Todas, Média+Alta, Alta+Urgente
- **Canais de notificação**: Toasts, Navegador, Som
- **Limites de timeout**: Personalizáveis por prioridade

### 3. Níveis de Prioridade
- 🟢 **Baixa**: Notificações gerais
- 🟡 **Média**: 15+ minutos na fila
- 🟠 **Alta**: 30+ minutos na fila
- 🔴 **Urgente**: 60+ minutos na fila

## 🔧 APIs Disponíveis

### Notificações
```bash
# Buscar notificações
GET /api/notifications

# Marcar como lida
POST /api/notifications
{
  "action": "mark_read",
  "notificationId": "notification_id"
}

# Server-Sent Events
GET /api/notifications/sse?subscriberId=user_id
```

### Monitoramento
```bash
# Iniciar monitoramento
POST /api/notifications/monitor
{
  "action": "start",
  "intervalMinutes": 5
}

# Verificação manual
POST /api/notifications/monitor
{
  "action": "check_now"
}
```

### Estatísticas
```bash
# Métricas da fila
GET /api/attendant/stats
```

## 🧪 Testes e Validação

### Teste Automático
```bash
npm run notifications:test
```

### Teste Manual
1. Execute `npm run dev`
2. Acesse `http://localhost:9002/atendimento`
3. Observe notificações no sino do header
4. Verifique estatísticas no dashboard
5. Configure preferências
6. Aguarde alertas automáticos de timeout

### Validação de Funcionalidades
- ✅ Conexão SSE estabelecida
- ✅ Notificações de nova conversa
- ✅ Alertas de timeout por prioridade
- ✅ Toasts funcionando
- ✅ Permissões do navegador
- ✅ Estatísticas atualizando
- ✅ Configurações persistindo

## 📈 Monitoramento

### Logs do Sistema
```bash
# Inicialização
🚀 Initializing SatiZap services...
✅ Queue monitoring service started
✅ Old notifications cleaned up

# Operação
Queue monitoring started with 5 minute intervals
Notifications SSE connected
```

### Métricas Disponíveis
- **Total na fila**: Conversas aguardando atendimento
- **Tempo médio**: Tempo médio de espera na fila
- **Maior espera**: Conversa há mais tempo aguardando
- **Urgentes**: Conversas com 60+ minutos
- **Novas hoje**: Conversas iniciadas no dia
- **Resolvidas hoje**: Conversas finalizadas no dia

## 🔍 Troubleshooting

### Problemas Comuns

**Notificações não aparecem**
- Verificar permissões do navegador
- Confirmar conexão SSE ativa (indicador verde)
- Verificar se monitoramento está rodando

**Conexão SSE falha**
- Sistema reconecta automaticamente
- Verificar logs do console do navegador
- Confirmar que servidor está rodando

**Estatísticas não atualizam**
- Verificar endpoint `/api/attendant/stats`
- Confirmar acesso ao banco de dados
- Verificar logs de erro no servidor

### Comandos de Debug
```bash
# Status do monitoramento
curl http://localhost:9002/api/notifications/monitor

# Forçar verificação
curl -X POST http://localhost:9002/api/notifications/monitor \
  -H "Content-Type: application/json" \
  -d '{"action": "check_now"}'

# Estatísticas atuais
curl http://localhost:9002/api/attendant/stats
```

## 📁 Estrutura de Arquivos

```
src/
├── lib/services/
│   └── notification.service.ts     # Serviços principais
├── hooks/
│   └── use-notifications.ts        # Hook React
├── components/notifications/
│   ├── notification-bell.tsx       # Sino de notificações
│   ├── notification-toast.tsx      # Toasts automáticos
│   ├── notification-settings.tsx   # Configurações
│   ├── notification-stats.tsx      # Dashboard estatísticas
│   └── connection-status.tsx       # Status de conexão
├── app/api/notifications/
│   ├── route.ts                    # API principal
│   ├── sse/route.ts               # Server-Sent Events
│   └── monitor/route.ts           # Controle monitoramento
└── app/api/attendant/
    └── stats/route.ts             # Estatísticas da fila

docs/
└── sistema-notificacoes.md        # Documentação completa

scripts/
└── test-notification-system.js    # Script de teste
```

## 🎨 Componentes Visuais

### Sino de Notificações
- Contador de não lidas
- Lista de notificações recentes
- Indicador de conexão
- Ações rápidas (ver conversa)

### Toasts
- Aparecem automaticamente
- Filtráveis por prioridade
- Ações contextuais
- Duração configurável

### Dashboard de Estatísticas
- Cards com métricas principais
- Indicadores visuais de urgência
- Atualização em tempo real
- Cores baseadas em prioridade

### Configurações
- Interface intuitiva
- Sliders para intervalos
- Switches para canais
- Teste de notificações

## 🚀 Próximas Melhorias

- [ ] Persistência de notificações no banco
- [ ] Notificações por email para casos críticos
- [ ] Integração com WhatsApp para alertas
- [ ] Dashboard analítico com histórico
- [ ] Configurações por usuário
- [ ] Alertas de SLA personalizados

## 📚 Documentação Adicional

- [Documentação Completa](docs/sistema-notificacoes.md)
- [Arquitetura do Sistema](docs/blueprint.md)
- [Guia de Desenvolvimento](README.md)

---

**Desenvolvido para SatiZap v2.0** 🌿  
Sistema de automação e atendimento conversacional para cannabis medicinal.