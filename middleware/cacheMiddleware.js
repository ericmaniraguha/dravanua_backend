const redis = require("../utils/redis");

/**
 * Middleware to cache HTTP responses using Redis.
 * @param {number} duration - Cache duration in seconds.
 */
const cacheMiddleware = (duration) => {
  return async (req, res, next) => {
    // Only cache GET requests
    if (req.method !== "GET") {
      return next();
    }

    const key = `cache:${req.originalUrl || req.url}`;
    try {
      const cachedResponse = await redis.get(key);

      if (cachedResponse) {
        console.log(`⚡ Serving from cache: ${key}`);
        return res.json(JSON.parse(cachedResponse));
      }

      // Intercept the res.json method to store the response in Redis before sending it
      const originalJson = res.json.bind(res);
      res.json = (body) => {
        // Store in Redis with expiration
        redis.setex(key, duration, JSON.stringify(body)).catch((err) => {
          console.error("Redis cache error:", err);
        });
        
        // Call original method
        return originalJson(body);
      };

      next();
    } catch (err) {
      console.error("Cache middleware error:", err);
      // Fallback to regular processing if Redis fails
      next();
    }
  };
};

module.exports = cacheMiddleware;
