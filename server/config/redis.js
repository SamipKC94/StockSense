import Redis from 'ioredis';

let redisClient = null;

const connectRedis = () => {
  try {
    redisClient = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      retryStrategy: (times) => {
        if (times > 3) {
          console.warn('⚠️  Redis unavailable — caching disabled');
          return null; // stop retrying
        }
        return Math.min(times * 200, 2000);
      },
      lazyConnect: true,
    });

    redisClient.on('connect', () => console.log('✅ Redis Connected'));
    redisClient.on('error', (err) => {
      if (err.code !== 'ECONNREFUSED') console.error('Redis Error:', err.message);
    });

    redisClient.connect().catch(() => {});
  } catch {
    console.warn('⚠️  Redis init failed — caching disabled');
  }
};

const getRedisClient = () => redisClient;

export { connectRedis, getRedisClient };
