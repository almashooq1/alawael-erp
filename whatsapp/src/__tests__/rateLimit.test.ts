import { enforceRateLimit } from '../rateLimit';
import { redis } from '../infra/redis';

jest.mock('../infra/redis');

describe('rateLimit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should allow request if under limit', async () => {
    (redis.multi as jest.Mock).mockReturnValue({
      incr: jest.fn().mockReturnThis(),
      expire: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([[null, 5], [null, 1]]),
    });

    await expect(enforceRateLimit('1234567890')).resolves.not.toThrow();
  });

  it('should reject request if over limit', async () => {
    (redis.multi as jest.Mock).mockReturnValue({
      incr: jest.fn().mockReturnThis(),
      expire: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([[null, 25], [null, 1]]),
    });

    await expect(enforceRateLimit('1234567890')).rejects.toThrow('rate-limit-exceeded');
  });
});
