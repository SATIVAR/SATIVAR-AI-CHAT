import prisma from '@/lib/prisma';
import { ConversationData } from '@/lib/types';

export interface NotificationData {
  id: string;
  type: 'new_conversation' | 'queue_timeout' | 'conversation_update';
  title: string;
  message: string;
  conversationId?: string;
  patientName?: string;
  timestamp: Date;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  read: boolean;
}

export class NotificationService {
  private static instance: NotificationService;
  private subscribers: Map<string, (notification: NotificationData) => void> = new Map();
  private notifications: Map<string, NotificationData> = new Map();

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  // Subscribe to notifications
  subscribe(subscriberId: string, callback: (notification: NotificationData) => void): void {
    this.subscribers.set(subscriberId, callback);
  }

  // Unsubscribe from notifications
  unsubscribe(subscriberId: string): void {
    this.subscribers.delete(subscriberId);
  }

  // Send notification to all subscribers
  private broadcast(notification: NotificationData): void {
    this.notifications.set(notification.id, notification);
    this.subscribers.forEach(callback => {
      try {
        callback(notification);
      } catch (error) {
        console.error('Error broadcasting notification:', error);
      }
    });
  }

  // Create and send a new conversation notification
  notifyNewConversation(conversation: ConversationData): void {
    const notification: NotificationData = {
      id: `new_conv_${conversation.id}_${Date.now()}`,
      type: 'new_conversation',
      title: 'Nova conversa na fila',
      message: `${conversation.Patient.name} iniciou uma nova conversa`,
      conversationId: conversation.id,
      patientName: conversation.Patient.name,
      timestamp: new Date(),
      priority: 'medium',
      read: false,
    };

    this.broadcast(notification);
  }

  // Create and send a queue timeout notification
  notifyQueueTimeout(conversation: ConversationData, waitTimeMinutes: number): void {
    const priority = this.getTimeoutPriority(waitTimeMinutes);
    
    const notification: NotificationData = {
      id: `timeout_${conversation.id}_${Date.now()}`,
      type: 'queue_timeout',
      title: 'Conversa há muito tempo na fila',
      message: `${conversation.Patient.name} está aguardando há ${waitTimeMinutes} minutos`,
      conversationId: conversation.id,
      patientName: conversation.Patient.name,
      timestamp: new Date(),
      priority,
      read: false,
    };

    this.broadcast(notification);
  }

  // Create and send a conversation update notification
  notifyConversationUpdate(conversation: ConversationData, updateType: string): void {
    const notification: NotificationData = {
      id: `update_${conversation.id}_${Date.now()}`,
      type: 'conversation_update',
      title: 'Atualização de conversa',
      message: `Conversa com ${conversation.Patient.name}: ${updateType}`,
      conversationId: conversation.id,
      patientName: conversation.Patient.name,
      timestamp: new Date(),
      priority: 'low',
      read: false,
    };

    this.broadcast(notification);
  }

  // Get priority based on wait time
  private getTimeoutPriority(waitTimeMinutes: number): 'low' | 'medium' | 'high' | 'urgent' {
    if (waitTimeMinutes >= 60) return 'urgent';
    if (waitTimeMinutes >= 30) return 'high';
    if (waitTimeMinutes >= 15) return 'medium';
    return 'low';
  }

  // Get all notifications for a subscriber
  getNotifications(subscriberId: string): NotificationData[] {
    return Array.from(this.notifications.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  // Mark notification as read
  markAsRead(notificationId: string): void {
    const notification = this.notifications.get(notificationId);
    if (notification) {
      notification.read = true;
      this.notifications.set(notificationId, notification);
    }
  }

  // Clear old notifications (older than 24 hours)
  clearOldNotifications(): void {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    for (const [id, notification] of this.notifications.entries()) {
      if (notification.timestamp < oneDayAgo) {
        this.notifications.delete(id);
      }
    }
  }
}

// Queue monitoring service
export class QueueMonitorService {
  private static instance: QueueMonitorService;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private notificationService: NotificationService;
  private notifiedConversations: Set<string> = new Set();

  constructor() {
    this.notificationService = NotificationService.getInstance();
  }

  static getInstance(): QueueMonitorService {
    if (!QueueMonitorService.instance) {
      QueueMonitorService.instance = new QueueMonitorService();
    }
    return QueueMonitorService.instance;
  }

  // Start monitoring queue for timeout conversations
  startMonitoring(intervalMinutes: number = 5): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    this.monitoringInterval = setInterval(async () => {
      await this.checkQueueTimeouts();
    }, intervalMinutes * 60 * 1000);

    console.log(`Queue monitoring started with ${intervalMinutes} minute intervals`);
  }

  // Stop monitoring
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  // Check for conversations that have been in queue too long
  private async checkQueueTimeouts(): Promise<void> {
    try {
      const conversations = await prisma.conversation.findMany({
        where: {
          status: 'fila_humano',
        },
        include: {
          Patient: true,
          Message: {
            orderBy: { timestamp: 'desc' },
            take: 1,
          },
        },
      });

      const now = new Date();
      const timeoutThresholds = [15, 30, 60]; // minutes

      for (const conversation of conversations) {
        const waitTimeMs = now.getTime() - new Date(conversation.updatedAt).getTime();
        const waitTimeMinutes = Math.floor(waitTimeMs / (1000 * 60));

        // Check if we should notify for this conversation
        for (const threshold of timeoutThresholds) {
          const notificationKey = `${conversation.id}_${threshold}`;
          
          if (waitTimeMinutes >= threshold && !this.notifiedConversations.has(notificationKey)) {
            this.notificationService.notifyQueueTimeout(
              conversation as ConversationData,
              waitTimeMinutes
            );
            this.notifiedConversations.add(notificationKey);
          }
        }
      }

      // Clean up old notification keys
      this.cleanupNotificationKeys();
    } catch (error) {
      console.error('Error checking queue timeouts:', error);
    }
  }

  // Clean up notification keys for resolved conversations
  private cleanupNotificationKeys(): void {
    // This could be enhanced to check against actual conversation statuses
    // For now, we'll just clear keys older than 2 hours
    const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
    
    for (const key of this.notifiedConversations) {
      // Extract timestamp from key if it contains one, or use a simple cleanup strategy
      // For simplicity, we'll clear all keys periodically
      if (Math.random() < 0.1) { // 10% chance to clear on each check
        this.notifiedConversations.clear();
        break;
      }
    }
  }

  // Manually trigger a queue check
  async checkNow(): Promise<void> {
    await this.checkQueueTimeouts();
  }
}

// Export singleton instances
export const notificationService = NotificationService.getInstance();
export const queueMonitorService = QueueMonitorService.getInstance();