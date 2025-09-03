'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConnectionStatusProps {
  className?: string;
  showText?: boolean;
}

export function ConnectionStatus({ className, showText = true }: ConnectionStatusProps) {
  const [isOnline, setIsOnline] = useState(true);
  const [connectionQuality, setConnectionQuality] = useState<'good' | 'poor' | 'offline'>('good');

  useEffect(() => {
    const updateOnlineStatus = () => {
      setIsOnline(navigator.onLine);
      setConnectionQuality(navigator.onLine ? 'good' : 'offline');
    };

    // Initial check
    updateOnlineStatus();

    // Listen for online/offline events
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    // Test connection quality periodically
    const testConnection = async () => {
      if (!navigator.onLine) {
        setConnectionQuality('offline');
        return;
      }

      try {
        const start = Date.now();
        const response = await fetch('/api/health', { 
          method: 'HEAD',
          cache: 'no-cache'
        });
        const duration = Date.now() - start;

        if (response.ok) {
          setConnectionQuality(duration > 2000 ? 'poor' : 'good');
        } else {
          setConnectionQuality('poor');
        }
      } catch (error) {
        setConnectionQuality('poor');
      }
    };

    // Test connection every 30 seconds
    const interval = setInterval(testConnection, 30000);

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
      clearInterval(interval);
    };
  }, []);

  const getStatusConfig = () => {
    switch (connectionQuality) {
      case 'good':
        return {
          icon: <Wifi className="h-3 w-3" />,
          text: 'Online',
          variant: 'default' as const,
          color: 'bg-green-500',
        };
      case 'poor':
        return {
          icon: <AlertCircle className="h-3 w-3" />,
          text: 'Conexão lenta',
          variant: 'secondary' as const,
          color: 'bg-yellow-500',
        };
      case 'offline':
        return {
          icon: <WifiOff className="h-3 w-3" />,
          text: 'Offline',
          variant: 'destructive' as const,
          color: 'bg-red-500',
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div className={cn("flex items-center space-x-2", className)}>
      <div className={cn("h-2 w-2 rounded-full", config.color)} />
      
      {showText && (
        <Badge variant={config.variant} className="text-xs">
          {config.icon}
          <span className="ml-1">{config.text}</span>
        </Badge>
      )}
    </div>
  );
}