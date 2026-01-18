"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const rateLimit_1 = require("../rateLimit");
const redis_1 = require("../infra/redis");
jest.mock('../infra/redis');
describe('rateLimit', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    it('should allow request if under limit', async () => {
        redis_1.redis.multi.mockReturnValue({
            incr: jest.fn().mockReturnThis(),
            expire: jest.fn().mockReturnThis(),
            exec: jest.fn().mockResolvedValue([[null, 5], [null, 1]]),
        });
        await expect((0, rateLimit_1.enforceRateLimit)('1234567890')).resolves.not.toThrow();
    });
    it('should reject request if over limit', async () => {
        redis_1.redis.multi.mockReturnValue({
            incr: jest.fn().mockReturnThis(),
            expire: jest.fn().mockReturnThis(),
            exec: jest.fn().mockResolvedValue([[null, 25], [null, 1]]),
        });
        await expect((0, rateLimit_1.enforceRateLimit)('1234567890')).rejects.toThrow('rate-limit-exceeded');
    });
});
