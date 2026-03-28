import { getRedisClient } from '../config/redis.js';

const CACHE_TTL = 60; // seconds

const cacheMiddleware = (keyPrefix = 'cache') => {
  return async (req, res, next) => {
    const client = getRedisClient();

    // Skip cache if Redis is not available
    if (!client || client.status !== 'ready') {
      return next();
    }

    const cacheKey = `${keyPrefix}:${req.originalUrl}`;

    try {
      const cached = await client.get(cacheKey);
      if (cached) {
        console.log(`⚡ Cache HIT: ${cacheKey}`);
        return res.status(200).json({ ...JSON.parse(cached), fromCache: true });
      }

      // Intercept res.json to store response in cache
      const originalJson = res.json.bind(res);
      res.json = async (data) => {
        if (res.statusCode === 200) {
          await client.setex(cacheKey, CACHE_TTL, JSON.stringify(data));
          console.log(`💾 Cache SET: ${cacheKey} (TTL: ${CACHE_TTL}s)`);
        }
        return originalJson(data);
      };

      next();
    } catch (err) {
      console.error('Cache middleware error:', err.message);
      next(); // graceful degradation
    }
  };
};

const invalidateCache = async (keyPattern) => {
  const client = getRedisClient();
  if (!client || client.status !== 'ready') return;

  try {
    const keys = await client.keys(keyPattern);
    if (keys.length > 0) {
      await client.del(...keys);
      console.log(`🗑️  Cache invalidated: ${keys.length} keys matching '${keyPattern}'`);
    }
  } catch (err) {
    console.error('Cache invalidation error:', err.message);
  }
};

export { cacheMiddleware, invalidateCache };
