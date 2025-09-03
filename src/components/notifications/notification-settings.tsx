'use client';

import { useState } from 'react';
import { Settings, Bell, Clock, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';

interface NotificationSettingsProps {
  onSettingsChange?: (settings: NotificationSettings) => void;
}

export interface NotificationSettings {
  enabled: boolean;
  browserNotifications: boolean;
  soundEnabled: boolean;
  toastEnabled: boolean;
  monitoringInterval: number;
  priorityFilter: 'all' | 'medium_high' | 'high_urgent';
  queueTimeoutThresholds: {
    medium: number;
    high: number;
    urgent: number;
  };
}

const defaultSettings: NotificationSettings = {
  enabled: true,
  browserNotifications: true,
  soundEnabled: true,
  toastEnabled: true,
  monitoringInterval: 5,
  priorityFilter: 'all',
  queueTimeoutThresholds: {
    medium: 15,
    high: 30,
    urgent: 60,
  },
};

export function NotificationSettings({ onSettingsChange }: NotificationSettingsProps) {
  const [settings, setSettings] = useState<NotificationSettings>(defaultSettings);
  const [isOpen, setIsOpen] = useState(false);

  const updateSettings = (newSettings: Partial<NotificationSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    onSettingsChange?.(updated);
  };

  const handleMonitoringIntervalChange = async (interval: number) => {
    updateSettings({ monitoringInterval: interval });
    
    // Update server-side monitoring
    try {
      await fetch('/api/notifications/monitor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'start', 
          intervalMinutes: interval 
        }),
      });
    } catch (error) {
      console.error('Error updating monitoring interval:', error);
    }
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      updateSettings({ browserNotifications: permission === 'granted' });
    }
  };

  const testNotification = () => {
    if (settings.browserNotifications && Notification.permission === 'granted') {
      new Notification('Teste de Notificação', {
        body: 'Esta é uma notificação de teste do SatiZap',
        icon: '/favicon.ico',
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Bell className="h-5 w-5 mr-2" />
            Configurações de Notificação
          </DialogTitle>
          <DialogDescription>
            Configure como você deseja receber alertas sobre conversas
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Notificações Gerais */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Notificações Gerais</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="enabled" className="text-sm">
                  Ativar notificações
                </Label>
                <Switch
                  id="enabled"
                  checked={settings.enabled}
                  onCheckedChange={(checked) => updateSettings({ enabled: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="toast" className="text-sm">
                  Mostrar toasts
                </Label>
                <Switch
                  id="toast"
                  checked={settings.toastEnabled}
                  onCheckedChange={(checked) => updateSettings({ toastEnabled: checked })}
                  disabled={!settings.enabled}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Label htmlFor="browser" className="text-sm">
                    Notificações do navegador
                  </Label>
                  {Notification.permission === 'denied' && (
                    <span className="text-xs text-red-500">(Bloqueado)</span>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="browser"
                    checked={settings.browserNotifications && Notification.permission === 'granted'}
                    onCheckedChange={requestNotificationPermission}
                    disabled={!settings.enabled}
                  />
                  {settings.browserNotifications && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={testNotification}
                      className="h-6 px-2 text-xs"
                    >
                      Testar
                    </Button>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="sound" className="text-sm flex items-center">
                  {settings.soundEnabled ? (
                    <Volume2 className="h-3 w-3 mr-1" />
                  ) : (
                    <VolumeX className="h-3 w-3 mr-1" />
                  )}
                  Som
                </Label>
                <Switch
                  id="sound"
                  checked={settings.soundEnabled}
                  onCheckedChange={(checked) => updateSettings({ soundEnabled: checked })}
                  disabled={!settings.enabled}
                />
              </div>
            </CardContent>
          </Card>

          {/* Filtros */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Filtros</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm">Mostrar apenas</Label>
                <Select
                  value={settings.priorityFilter}
                  onValueChange={(value: any) => updateSettings({ priorityFilter: value })}
                  disabled={!settings.enabled}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as notificações</SelectItem>
                    <SelectItem value="medium_high">Média e alta prioridade</SelectItem>
                    <SelectItem value="high_urgent">Apenas alta e urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Monitoramento */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center">
                <Clock className="h-4 w-4 mr-2" />
                Monitoramento da Fila
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm">
                  Intervalo de verificação: {settings.monitoringInterval} min
                </Label>
                <Slider
                  value={[settings.monitoringInterval]}
                  onValueChange={([value]) => handleMonitoringIntervalChange(value)}
                  min={1}
                  max={30}
                  step={1}
                  disabled={!settings.enabled}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>1 min</span>
                  <span>30 min</span>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <Label className="text-sm font-medium">Alertas de tempo na fila</Label>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-yellow-600">Média prioridade</span>
                    <span className="text-xs">{settings.queueTimeoutThresholds.medium} min</span>
                  </div>
                  <Slider
                    value={[settings.queueTimeoutThresholds.medium]}
                    onValueChange={([value]) => 
                      updateSettings({
                        queueTimeoutThresholds: {
                          ...settings.queueTimeoutThresholds,
                          medium: value
                        }
                      })
                    }
                    min={5}
                    max={60}
                    step={5}
                    disabled={!settings.enabled}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-orange-600">Alta prioridade</span>
                    <span className="text-xs">{settings.queueTimeoutThresholds.high} min</span>
                  </div>
                  <Slider
                    value={[settings.queueTimeoutThresholds.high]}
                    onValueChange={([value]) => 
                      updateSettings({
                        queueTimeoutThresholds: {
                          ...settings.queueTimeoutThresholds,
                          high: value
                        }
                      })
                    }
                    min={15}
                    max={120}
                    step={5}
                    disabled={!settings.enabled}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-red-600">Urgente</span>
                    <span className="text-xs">{settings.queueTimeoutThresholds.urgent} min</span>
                  </div>
                  <Slider
                    value={[settings.queueTimeoutThresholds.urgent]}
                    onValueChange={([value]) => 
                      updateSettings({
                        queueTimeoutThresholds: {
                          ...settings.queueTimeoutThresholds,
                          urgent: value
                        }
                      })
                    }
                    min={30}
                    max={240}
                    step={10}
                    disabled={!settings.enabled}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}