import { NextRequest, NextResponse } from 'next/server';
import { queueMonitorService } from '@/lib/services/notification.service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, intervalMinutes } = body;

    if (action === 'start') {
      const interval = intervalMinutes || 5;
      queueMonitorService.startMonitoring(interval);
      
      return NextResponse.json({
        success: true,
        message: `Monitoramento iniciado com intervalo de ${interval} minutos`,
      });
    }

    if (action === 'stop') {
      queueMonitorService.stopMonitoring();
      
      return NextResponse.json({
        success: true,
        message: 'Monitoramento parado',
      });
    }

    if (action === 'check_now') {
      await queueMonitorService.checkNow();
      
      return NextResponse.json({
        success: true,
        message: 'Verificação manual executada',
      });
    }

    return NextResponse.json(
      { error: 'Ação inválida' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Error managing queue monitor:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Return monitor status (this could be enhanced to track actual status)
    return NextResponse.json({
      success: true,
      status: 'Monitor API disponível',
      endpoints: {
        start: 'POST /api/notifications/monitor { "action": "start", "intervalMinutes": 5 }',
        stop: 'POST /api/notifications/monitor { "action": "stop" }',
        check_now: 'POST /api/notifications/monitor { "action": "check_now" }',
      },
    });
  } catch (error) {
    console.error('Error getting monitor status:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}