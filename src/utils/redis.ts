import Redis from 'ioredis';
import { config } from '../config';
import logger from './logger';

const redis = config.REDIS_URL ? new Redis(config.REDIS_URL) : null;

if (redis) {
  redis.on('error', (err) => logger.error('Redis Client Error', err));
  redis.on('connect', () => logger.info('Redis Client Connected'));
} else {
  logger.warn('Redis URL not found, running without Redis caching');
}

export default redis;
