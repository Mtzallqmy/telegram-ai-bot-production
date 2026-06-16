"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ioredis_1 = __importDefault(require("ioredis"));
const config_1 = require("../config");
const logger_1 = __importDefault(require("./logger"));
const redis = config_1.config.REDIS_URL ? new ioredis_1.default(config_1.config.REDIS_URL) : null;
if (redis) {
    redis.on('error', (err) => logger_1.default.error('Redis Client Error', err));
    redis.on('connect', () => logger_1.default.info('Redis Client Connected'));
}
else {
    logger_1.default.warn('Redis URL not found, running without Redis caching');
}
exports.default = redis;
//# sourceMappingURL=redis.js.map