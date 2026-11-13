import { Queue } from 'bullmq';
import redisClient from './redis.js';

export const connection = redisClient;

    const isBuilding =
      process.env.NEXT_PHASE === 'phase-production-build' ||
      process.env.npm_lifecycle_event === 'build' ||
      process.env.NODE_ENV === 'test';

    class SafeQueue {
    constructor(name) {
      this.name = name;
    }
  async add(jobName, data, opts) {
      console.warn(`⚠️ [${this.name}] Job '${jobName}' skipped: Redis offline.`);
      return { id: `offline-${Date.now()}` };
    }
  on() {
      return this;
    }
  }

let notifQueue = null;
let mailQueue = null;

if (redisClient && !isBuilding) {
  try {
    notifQueue = new Queue('notification-queue', {
      connection: redisClient,
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 50,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    });

    let notifWarned = false;
    notifQueue.on('error', (error) => {
      if (!notifWarned) {
        if (error?.code !== 'ECONNREFUSED' && !error?.message?.includes('ECONNREFUSED')) {
          console.error('Notification queue error:', error.message || error);
        }
        notifWarned = true;
      }
  });
} catch (e) {
  notifQueue = null;
}

    try {
      mailQueue = new Queue('email-queue', {
        connection: redisClient,
        defaultJobOptions: {
          removeOnComplete: 100,
          removeOnFail: 50,
          attempts: 3,
          backoff: {
            type: 'exponential',
          delay: 2000,
          },
        },
      });

      let mailWarned = false;
      mailQueue.on('error', (error) => {
        if (!mailWarned) {
          if (error?.code !== 'ECONNREFUSED' && !error?.message?.includes('ECONNREFUSED')) {
            console.error('Email queue error:', error.message || error);
          }
          mailWarned = true;
        }
});
  } catch (e) {
  mailQueue = null;
}
}

export const notificationQueue = notifQueue || new SafeQueue('notification-queue');
export const emailQueue = mailQueue || new SafeQueue('email-queue');
