import { useState, useEffect, useCallback, useRef } from 'react';
import { NotificationData } from '@/lib/services/notification.service';

interface UseNotificationsOptions {
  subscriberId?: string;
  autoConnect?: boolean;
  maxNotifications?: number;
}

interface UseNotificationsReturn {
  notifications: NotificationData[];
  unreadCount: number;
  isConnected: boolean;
  connect: () => void;
  disconnect: () => void;
  markAsRead: (notificationId: string) => void;
  clearAll: () => void;
  clearOld: () => void;
}

export function useNotifications(options: UseNotificationsOptions = {}): UseNotificationsReturn {
  const {
    subscriberId = `subscriber_${Date.now()}`,
    autoConnect = true,
    maxNotifications = 50,
  } = options;

  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      return; // Already connected
    }

    try {
      const eventSource = new EventSource(
        `/api/notifications/sse?subscriberId=${encodeURIComponent(subscriberId)}`
      );

      eventSource.onopen = () => {
        console.log('Notifications SSE connected');
        setIsConnected(true);
        reconnectAttempts.current = 0;
      };

      eventSource.addEventListener('connected', (event) => {
        console.log('Notifications connection established');
      });

      eventSource.addEventListener('notification', (event) => {
        try {
          const notification: NotificationData = JSON.parse(event.data);
          
          setNotifications(prev => {
            const updated = [notification, ...prev];
            return updated.slice(0, maxNotifications);
          });

          // Show browser notification if permission granted
          if (Notification.permission === 'granted') {
            new Notification(notification.title, {
              body: notification.message,
              icon: '/favicon.ico',
              tag: notification.id,
            });
          }
        } catch (error) {
          console.error('Error parsing notification:', error);
        }
      });

      eventSource.addEventListener('heartbeat', (event) => {
        // Keep connection alive
      });

      eventSource.onerror = (error) => {
        console.error('Notifications SSE error:', error);
        setIsConnected(false);
        
        eventSource.close();
        eventSourceRef.current = null;

        // Attempt to reconnect with exponential backoff
        if (reconnectAttempts.current < maxReconnectAttempts) {
          const delay = Math.pow(2, reconnectAttempts.current) * 1000; // 1s, 2s, 4s, 8s, 16s
          reconnectAttempts.current++;
          
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log(`Attempting to reconnect (${reconnectAttempts.current}/${maxReconnectAttempts})`);
            connect();
          }, delay);
        }
      };

      eventSourceRef.current = eventSource;
    } catch (error) {
      console.error('Error creating EventSource:', error);
      setIsConnected(false);
    }
  }, [subscriberId, maxNotifications]);

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    setIsConnected(false);
    reconnectAttempts.current = 0;
  }, []);

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'mark_read',
          notificationId,
        }),
      });

      setNotifications(prev =>
        prev.map(notification =>
          notification.id === notificationId
            ? { ...notification, read: true }
            : notification
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const clearOld = useCallback(async () => {
    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'clear_old',
        }),
      });

      // Remove notifications older than 24 hours
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      setNotifications(prev =>
        prev.filter(notification => new Date(notification.timestamp) > oneDayAgo)
      );
    } catch (error) {
      console.error('Error clearing old notifications:', error);
    }
  }, []);

  // Load existing notifications on mount
  useEffect(() => {
    const loadExistingNotifications = async () => {
      try {
        const response = await fetch(`/api/notifications?subscriberId=${encodeURIComponent(subscriberId)}`);
        if (response.ok) {
          const data = await response.json();
          setNotifications(data.notifications || []);
        }
      } catch (error) {
        console.error('Error loading existing notifications:', error);
      }
    };

    loadExistingNotifications();
  }, [subscriberId]);

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  // Request notification permission
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  return {
    notifications,
    unreadCount,
    isConnected,
    connect,
    disconnect,
    markAsRead,
    clearAll,
    clearOld,
  };
}