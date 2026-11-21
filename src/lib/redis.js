// lib/redisClient.js
import Redis from 'ioredis';
import { REDIS_URL } from '../../config/config.js';

const isBuilding =
  process.env.NEXT_PHASE === 'phase-production-build' ||
  process.env.npm_lifecycle_event === 'build' ||
  process.env.NODE_ENV === 'test';

let redisClient = global.redisClient;

  if (!redisClient && REDIS_URL && !isBuilding) {
    try {
      let hasWarned = false;

      redisClient = new Redis(REDIS_URL, {
        maxRetriesPerRequest: null,
        retryDelayOnFailover: 100,
        enableOfflineQueue: false, // Do not hang indefinitely if Redis server is down
        lazyConnect: false,
        connectTimeout: 2000,
        retryStrategy: (times) => {
            if (times > 2) {
              if (!hasWarned) {
                console.warn('⚠️ Redis not available on configured REDIS_URL. Running without Redis.');
                hasWarned = true;
              }
              // Stop retrying if Redis is not available locally
              return null;
            }
            return Math.min(times * 200, 1000);
          },
        });

      redisClient.on('error', (err) => {
        // Suppress spammy connection errors
        if (err.code === 'ECONNREFUSED') {
          if (!hasWarned) {
            console.warn('⚠️ Redis not available on configured REDIS_URL.');
            hasWarned = true;
          }
        } else {
          console.error('Redis connection error:', err.message);
        }
      });

      redisClient.on('connect', () => {
        console.log('✅ Redis connected successfully');
      });

      global.redisClient = redisClient;
    } catch (err) {
      console.warn('⚠️ Failed to initialize Redis client:', err.message);
      redisClient = null;
    }
  }

  export default redisClient || null;
