import { NextRequest, NextResponse } from 'next/server';
import { notificationService } from '@/lib/services/notification.service';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const subscriberId = url.searchParams.get('subscriberId') || 'default';
    
    const notifications = notificationService.getNotifications(subscriberId);
    
    return NextResponse.json({
      success: true,
      notifications,
      count: notifications.length,
    });

  } catch (error) {
    console.error('Error getting notifications:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, notificationId } = body;

    if (action === 'mark_read' && notificationId) {
      notificationService.markAsRead(notificationId);
      
      return NextResponse.json({
        success: true,
        message: 'Notificação marcada como lida',
      });
    }

    if (action === 'clear_old') {
      notificationService.clearOldNotifications();
      
      return NextResponse.json({
        success: true,
        message: 'Notificações antigas removidas',
      });
    }

    return NextResponse.json(
      { error: 'Ação inválida' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Error processing notification action:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}