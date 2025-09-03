# Sistema de Notificações - SatiZap

## Visão Geral

O sistema de notificações do SatiZap foi desenvolvido para alertar atendentes sobre novas conversas e conversas que estão há muito tempo na fila de atendimento. O sistema utiliza Server-Sent Events (SSE) para comunicação em tempo real e oferece múltiplas formas de notificação.

## Funcionalidades Implementadas

### 1. Notificações em Tempo Real
- **Server-Sent Events (SSE)**: Conexão persistente para receber notificações instantâneas
- **Reconexão automática**: Sistema robusto que reconecta automaticamente em caso de falha
- **Heartbeat**: Mantém a conexão ativa com pulsos regulares

### 2. Tipos de Notificação
- **Nova conversa**: Quando uma conversa entra na fila de atendimento
- **Timeout da fila**: Quando uma conversa está há muito tempo aguardando
- **Atualização de conversa**: Mudanças de status das conversas

### 3. Níveis de Prioridade
- **Baixa**: Notificações gerais
- **Média**: Conversas aguardando 15+ minutos
- **Alta**: Conversas aguardando 30+ minutos  
- **Urgente**: Conversas aguardando 60+ minutos

### 4. Múltiplos Canais de Notificação
- **Sino de notificações**: Indicador visual no header com contador
- **Toasts**: Notificações temporárias na tela
- **Notificações do navegador**: Alertas nativos do sistema operacional
- **Som**: Alertas sonoros (configurável)

### 5. Monitoramento Automático da Fila
- **Verificação periódica**: Monitora a fila em intervalos configuráveis (padrão: 5 minutos)
- **Detecção de timeouts**: Identifica conversas que excedem os limites de tempo
- **Limpeza automática**: Remove notificações antigas automaticamente

## Componentes Principais

### 1. Serviços Backend

#### `NotificationService`
```typescript
// Singleton para gerenciar notificações
const notificationService = NotificationService.getInstance();

// Enviar notificação de nova conversa
notificationService.notifyNewConversation(conversation);

// Enviar notificação de timeout
notificationService.notifyQueueTimeout(conversation, waitTimeMinutes);
```

#### `QueueMonitorService`
```typescript
// Singleton para monitorar a fila
const queueMonitorService = QueueMonitorService.getInstance();

// Iniciar monitoramento
queueMonitorService.startMonitoring(5); // 5 minutos

// Verificação manual
await queueMonitorService.checkNow();
```

### 2. APIs

#### `/api/notifications/sse`
- **Método**: GET
- **Descrição**: Endpoint SSE para receber notificações em tempo real
- **Parâmetros**: `subscriberId` (opcional)

#### `/api/notifications`
- **Método**: GET - Buscar notificações existentes
- **Método**: POST - Marcar como lida ou limpar antigas

#### `/api/notifications/monitor`
- **Método**: POST - Controlar monitoramento da fila
- **Ações**: `start`, `stop`, `check_now`

#### `/api/attendant/stats`
- **Método**: GET
- **Descrição**: Estatísticas da fila de atendimento

### 3. Componentes Frontend

#### `NotificationBell`
- Sino de notificações no header
- Contador de notificações não lidas
- Popover com lista de notificações
- Indicador de status de conexão

#### `NotificationToast`
- Toasts automáticos para novas notificações
- Filtragem por prioridade
- Ações rápidas (ver conversa)

#### `NotificationSettings`
- Configurações de notificação
- Controle de intervalos de monitoramento
- Configuração de limites de timeout
- Permissões do navegador

#### `NotificationStats`
- Dashboard com estatísticas da fila
- Métricas em tempo real
- Indicadores visuais de urgência

#### `ConnectionStatus`
- Indicador de status de conexão
- Qualidade da conexão
- Status online/offline

### 4. Hook Personalizado

#### `useNotifications`
```typescript
const {
  notifications,
  unreadCount,
  isConnected,
  connect,
  disconnect,
  markAsRead,
  clearAll,
} = useNotifications();
```

## Configuração e Uso

### 1. Inicialização Automática
O sistema é inicializado automaticamente quando a aplicação inicia:

```typescript
// src/lib/startup.ts
initializeServices(); // Inicia monitoramento da fila
```

### 2. Integração na Página de Atendimento
```typescript
// Componentes necessários
<NotificationToast enabled={true} />
<NotificationBell />
<NotificationSettings />
<NotificationStats />
<ConnectionStatus />
```

### 3. Configurações Padrão
- **Intervalo de monitoramento**: 5 minutos
- **Timeout médio**: 15 minutos
- **Timeout alto**: 30 minutos
- **Timeout urgente**: 60 minutos
- **Limpeza automática**: 24 horas

## Fluxo de Funcionamento

### 1. Nova Conversa
1. Conversa muda status para `fila_humano`
2. `ConversationService` chama `notificationService.notifyNewConversation()`
3. Notificação é enviada via SSE para todos os assinantes
4. Frontend exibe toast e atualiza sino de notificações

### 2. Timeout da Fila
1. `QueueMonitorService` verifica fila periodicamente
2. Identifica conversas que excedem limites de tempo
3. Envia notificação com prioridade baseada no tempo de espera
4. Frontend exibe alerta com urgência apropriada

### 3. Atendimento da Conversa
1. Atendente clica em "Assumir conversa"
2. Status muda para `com_humano`
3. Notificação de atualização é enviada
4. Conversa é removida da fila

## Monitoramento e Logs

### Logs do Sistema
```bash
# Inicialização
🚀 Initializing SatiZap services...
✅ Queue monitoring service started
✅ Old notifications cleaned up
🎉 All services initialized successfully

# Monitoramento
Queue monitoring started with 5 minute intervals
```

### Métricas Disponíveis
- Total de conversas na fila
- Tempo médio de espera
- Maior tempo de espera
- Conversas urgentes (60+ min)
- Novas conversas hoje
- Conversas resolvidas hoje

## Personalização

### 1. Intervalos de Timeout
```typescript
const settings = {
  queueTimeoutThresholds: {
    medium: 15,  // minutos
    high: 30,    // minutos
    urgent: 60,  // minutos
  }
};
```

### 2. Filtros de Prioridade
- `all`: Todas as notificações
- `medium_high`: Média e alta prioridade
- `high_urgent`: Apenas alta e urgente

### 3. Canais de Notificação
- Toasts: Ativado/Desativado
- Navegador: Requer permissão
- Som: Ativado/Desativado

## Troubleshooting

### Problemas Comuns

1. **Notificações não aparecem**
   - Verificar permissões do navegador
   - Confirmar conexão SSE ativa
   - Verificar se monitoramento está rodando

2. **Conexão SSE falha**
   - Sistema reconecta automaticamente
   - Verificar logs do console
   - Confirmar endpoint `/api/notifications/sse`

3. **Estatísticas não atualizam**
   - Verificar endpoint `/api/attendant/stats`
   - Confirmar acesso ao banco de dados
   - Verificar logs de erro

### Comandos de Debug
```bash
# Verificar status do monitoramento
curl -X GET http://localhost:9002/api/notifications/monitor

# Forçar verificação da fila
curl -X POST http://localhost:9002/api/notifications/monitor \
  -H "Content-Type: application/json" \
  -d '{"action": "check_now"}'

# Buscar estatísticas
curl -X GET http://localhost:9002/api/attendant/stats
```

## Próximas Melhorias

1. **Persistência de notificações** no banco de dados
2. **Notificações por email** para timeouts críticos
3. **Integração com WhatsApp** para alertas externos
4. **Dashboard analítico** com histórico de métricas
5. **Configurações por usuário** individualizadas
6. **Alertas de SLA** baseados em metas de atendimento

## Dependências

- `sonner`: Biblioteca de toasts
- `@radix-ui/react-*`: Componentes de UI
- `lucide-react`: Ícones
- Server-Sent Events (nativo do navegador)
- Prisma ORM para acesso ao banco

## Conclusão

O sistema de notificações do SatiZap oferece uma solução completa para monitoramento de fila de atendimento, com notificações em tempo real, múltiplos canais de comunicação e configurações flexíveis. O sistema é robusto, escalável e oferece uma excelente experiência para os atendentes.