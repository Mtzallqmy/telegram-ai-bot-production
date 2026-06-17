import { createClient } from "redis";
import { logger } from "./pino";

let redisClient: any = null;
let isConnected = false;

// InMemory fallback cache for sessions and rate limits in case Redis is not set up
const inMemoryCache = new Map<string, string>();

export async function getRedisClient() {
  if (redisClient) {
    return redisClient;
  }

  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    logger.warn("REDIS_URL is not set. Falling back to simple in-memory session and rate-limiting store.");
    redisClient = createInMemoryFallback();
    return redisClient;
  }

  try {
    const client = createClient({ url: redisUrl });
    client.on("error", (err) => {
      logger.error(`Redis Error: ${err.message || err}`);
    });
    client.on("connect", () => {
      logger.info("Connecting to Redis...");
    });
    client.on("ready", () => {
      isConnected = true;
      logger.info("Redis client connected and ready.");
    });

    await client.connect();
    redisClient = client;
  } catch (error: any) {
    logger.error(`Failed to connect to Redis: ${error?.message || error}. Falling back to in-memory.`);
    redisClient = createInMemoryFallback();
  }

  return redisClient;
}

function createInMemoryFallback() {
  return {
    get: async (key: string) => inMemoryCache.get(key) || null,
    set: async (key: string, value: string, options?: { EX?: number }) => {
      inMemoryCache.set(key, value);
      if (options?.EX) {
        setTimeout(() => inMemoryCache.delete(key), options.EX * 1000);
      }
      return "OK";
    },
    del: async (key: string) => {
      const existed = inMemoryCache.has(key);
      inMemoryCache.delete(key);
      return existed ? 1 : 0;
    },
    isMock: true,
  };
}
