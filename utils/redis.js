const Redis = require("ioredis");

const redisHost = process.env.REDIS_HOST || "localhost";
const redisPort = process.env.REDIS_PORT || 6379;

const redis = new Redis({
  host: redisHost,
  port: redisPort,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

redis.on("connect", () => {
  console.log(`✅ Redis connected to ${redisHost}:${redisPort}`);
});

redis.on("error", (err) => {
  console.error("❌ Redis connection error:", err.message);
});

module.exports = redis;
