"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.enforceRateLimit = enforceRateLimit;
const redis_1 = require("./infra/redis");
const logger_1 = require("./infra/logger");
const RATE_LIMIT_PER_MINUTE = Number(process.env.RATE_LIMIT_PER_MINUTE || 20);
async function enforceRateLimit(to) {
    const now = new Date();
    const minuteKey = `rate:${to}:${now.getUTCFullYear()}${now.getUTCMonth()}${now.getUTCDate()}${now.getUTCHours()}${now.getUTCMinutes()}`;
    const results = await redis_1.redis.multi().incr(minuteKey).expire(minuteKey, 60, 'NX').exec();
    if (!results) {
        throw new Error('Redis error');
    }
    const [[, count]] = results;
    if (typeof count === 'number' && count > RATE_LIMIT_PER_MINUTE) {
        logger_1.logger.warn({ to, count, limit: RATE_LIMIT_PER_MINUTE }, 'Rate limit exceeded');
        throw new Error('rate-limit-exceeded');
    }
}
