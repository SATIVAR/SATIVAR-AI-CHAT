import { NextRequest } from 'next/server';
import { notificationService } from '@/lib/services/notification.service';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const subscriberId = url.searchParams.get('subscriberId') || `subscriber_${Date.now()}`;

  // Create a readable stream for Server-Sent Events
  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection message
      const encoder = new TextEncoder();
      
      const sendEvent = (data: any, event?: string) => {
        const message = `${event ? `event: ${event}\n` : ''}data: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(message));
      };

      // Send connection established event
      sendEvent({ type: 'connected', timestamp: new Date().toISOString() }, 'connected');

      // Subscribe to notifications
      const handleNotification = (notification: any) => {
        sendEvent(notification, 'notification');
      };

      notificationService.subscribe(subscriberId, handleNotification);

      // Send existing notifications
      const existingNotifications = notificationService.getNotifications(subscriberId);
      existingNotifications.forEach(notification => {
        sendEvent(notification, 'notification');
      });

      // Keep connection alive with heartbeat
      const heartbeat = setInterval(() => {
        sendEvent({ type: 'heartbeat', timestamp: new Date().toISOString() }, 'heartbeat');
      }, 30000); // Every 30 seconds

      // Cleanup function
      const cleanup = () => {
        clearInterval(heartbeat);
        notificationService.unsubscribe(subscriberId);
      };

      // Handle client disconnect
      request.signal.addEventListener('abort', cleanup);

      // Store cleanup function for potential manual cleanup
      (controller as any).cleanup = cleanup;
    },

    cancel() {
      // Cleanup when stream is cancelled
      if ((this as any).cleanup) {
        (this as any).cleanup();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
    },
  });
}