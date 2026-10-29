// lib/server/workerInit.js
import { autoInitializeWorker } from '../../lib/notificationWorker.js';

let isInitialized = false;

export function initWorkerIfNeeded() {
  if (!isInitialized && typeof window === 'undefined') {
    isInitialized = true;
    if (!process.env.REDIS_URL) {
      console.log('ℹ️ REDIS_URL not configured; skipping notification worker initialization');
      return;
    }
    autoInitializeWorker()
      .then(() => {
        console.log('🚀 Notification Worker started automatically');
      })
      .catch((err) => {
        console.error('❌ Failed to start worker:', err.message);
      });
  }
}
