import { queueMonitorService } from './services/notification.service';

let isInitialized = false;

export function initializeServices() {
  if (isInitialized) {
    return;
  }

  console.log('🚀 Initializing SatiZap services...');

  try {
    // Start queue monitoring
    queueMonitorService.startMonitoring(5); // Check every 5 minutes
    console.log('✅ Queue monitoring service started');

    // Clean up old notifications on startup
    setTimeout(() => {
      const { notificationService } = require('./services/notification.service');
      notificationService.clearOldNotifications();
      console.log('✅ Old notifications cleaned up');
    }, 5000);

    isInitialized = true;
    console.log('🎉 All services initialized successfully');

  } catch (error) {
    console.error('❌ Error initializing services:', error);
  }
}

// Auto-initialize in production
if (process.env.NODE_ENV === 'production') {
  initializeServices();
}