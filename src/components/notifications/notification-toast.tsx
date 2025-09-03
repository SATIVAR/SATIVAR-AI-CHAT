'use client';

import { useEffect } from 'react';
import { toast } from 'sonner';
import { Bell, Clock, MessageCircle, AlertTriangle } from 'lucide-react';
import { useNotifications } from '@/hooks/use-notifications';
import { NotificationData } from '@/lib/services/notification.service';

interface NotificationToastProps {
  enabled?: boolean;
  showOnlyHighPriority?: boolean;
}

export function NotificationToast({ 
  enabled = true, 
  showOnlyHighPriority = false 
}: NotificationToastProps) {
  const { notifications } = useNotifications();

  useEffect(() => {
    if (!enabled) return;

    // Get the latest notification
    const latestNotification = notifications[0];
    if (!latestNotification) return;

    // Filter by priority if needed
    if (showOnlyHighPriority && !['high', 'urgent'].includes(latestNotification.priority)) {
      return;
    }

    // Show toast for new notifications
    const showToast = (notification: NotificationData) => {
      const getIcon = () => {
        switch (notification.type) {
          case 'new_conversation':
            return <MessageCircle className="h-4 w-4" />;
          case 'queue_timeout':
            return <Clock className="h-4 w-4" />;
          case 'conversation_update':
            return <AlertTriangle className="h-4 w-4" />;
          default:
            return <Bell className="h-4 w-4" />;
        }
      };

      const getToastFunction = () => {
        switch (notification.priority) {
          case 'urgent':
            return toast.error;
          case 'high':
            return toast.warning;
          case 'medium':
            return toast.info;
          case 'low':
          default:
            return toast;
        }
      };

      const toastFn = getToastFunction();
      
      toastFn(notification.title, {
        description: notification.message,
        icon: getIcon(),
        action: notification.conversationId ? {
          label: 'Ver conversa',
          onClick: () => {
            window.location.href = `/atendimento/conversa/${notification.conversationId}`;
          },
        } : undefined,
        duration: notification.priority === 'urgent' ? 10000 : 5000,
      });
    };

    // Check if this is a new notification (not shown before)
    const notificationAge = Date.now() - new Date(latestNotification.timestamp).getTime();
    if (notificationAge < 5000) { // Only show if less than 5 seconds old
      showToast(latestNotification);
    }
  }, [notifications, enabled, showOnlyHighPriority]);

  return null; // This component doesn't render anything
}