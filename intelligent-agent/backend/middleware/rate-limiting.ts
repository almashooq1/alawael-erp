import rateLimit, { RateLimitRequestHandler } from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import Redis from 'ioredis';
import { Request, Response, NextFunction } from 'express';
import { createLogger } from '../utils/logger';

const logger = createLogger('RateLimiting');

// Redis client for rate limiting
const redisClient = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_RATELIMIT_DB || '2')
});

// User tier configuration
export enum UserTier {
  FREE = 'free',
  BASIC = 'basic',
  PREMIUM = 'premium',
  ENTERPRISE = 'enterprise'
}

interface TierLimits {
  requestsPerMinute: number;
  requestsPerHour: number;
  requestsPerDay: number;
  concurrentRequests: number;
}

const tierLimits: Record<UserTier, TierLimits> = {
  [UserTier.FREE]: {
    requestsPerMinute: 10,
    requestsPerHour: 100,
    requestsPerDay: 1000,
    concurrentRequests: 2
  },
  [UserTier.BASIC]: {
    requestsPerMinute: 30,
    requestsPerHour: 500,
    requestsPerDay: 5000,
    concurrentRequests: 5
  },
  [UserTier.PREMIUM]: {
    requestsPerMinute: 100,
    requestsPerHour: 2000,
    requestsPerDay: 20000,
    concurrentRequests: 10
  },
  [UserTier.ENTERPRISE]: {
    requestsPerMinute: 1000,
    requestsPerHour: 10000,
    requestsPerDay: 100000,
    concurrentRequests: 50
  }
};

/**
 * Get user tier from request
 */
function getUserTier(req: Request): UserTier {
  const user = (req as any).user;
  return user?.tier || UserTier.FREE;
}

/**
 * Get rate limit key for user
 */
function getRateLimitKey(req: Request, window: string): string {
  const user = (req as any).user;
  const userId = user?.id || req.ip;
  return `rate_limit:${window}:${userId}`;
}

/**
 * Global rate limiter (applies to all requests)
 */
export const globalRateLimiter: RateLimitRequestHandler = rateLimit({
  store: new RedisStore({
    // @ts-ignore
    client: redisClient,
    prefix: 'rl:global:'
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Max 1000 requests per 15 minutes globally
  message: {
    error: 'Too many requests from this IP, please try again later',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    logger.warn('Global rate limit exceeded', {
      ip: req.ip,
      path: req.path
    });
    
    res.status(429).json({
      error: 'Too many requests',
      message: 'Global rate limit exceeded',
      retryAfter: res.getHeader('Retry-After')
    });
  }
});

/**
 * Per-user rate limiter (sliding window)
 */
export function userRateLimiter(window: 'minute' | 'hour' | 'day') {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tier = getUserTier(req);
      const limits = tierLimits[tier];
      
      let windowMs: number;
      let maxRequests: number;
      
      switch (window) {
        case 'minute':
          windowMs = 60 * 1000;
          maxRequests = limits.requestsPerMinute;
          break;
        case 'hour':
          windowMs = 60 * 60 * 1000;
          maxRequests = limits.requestsPerHour;
          break;
        case 'day':
          windowMs = 24 * 60 * 60 * 1000;
          maxRequests = limits.requestsPerDay;
          break;
      }
      
      const key = getRateLimitKey(req, window);
      const current = await redisClient.incr(key);
      
      if (current === 1) {
        await redisClient.pexpire(key, windowMs);
      }
      
      const ttl = await redisClient.pttl(key);
      const remaining = Math.max(0, maxRequests - current);
      const resetTime = Math.ceil(Date.now() / 1000) + Math.ceil(ttl / 1000);
      
      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', remaining);
      res.setHeader('X-RateLimit-Reset', resetTime);
      res.setHeader('X-RateLimit-Window', window);
      res.setHeader('X-RateLimit-Tier', tier);
      
      if (current > maxRequests) {
        logger.warn('User rate limit exceeded', {
          userId: (req as any).user?.id,
          tier,
          window,
          limit: maxRequests
        });
        
        return res.status(429).json({
          error: 'Rate limit exceeded',
          message: `You have exceeded your ${window}ly rate limit for ${tier} tier`,
          limit: maxRequests,
          remaining: 0,
          resetAt: new Date(resetTime * 1000).toISOString(),
          tier,
          upgradeInfo: tier !== UserTier.ENTERPRISE ? 
            'Upgrade your plan for higher limits' : undefined
        });
      }
      
      next();
    } catch (error: any) {
      logger.error('Rate limiter error', { error: error.message });
      next(); // Continue on error (fail open)
    }
  };
}

/**
 * Endpoint-specific rate limiter
 */
export function endpointRateLimiter(
  endpoint: string,
  maxRequests: number,
  windowMs: number = 60 * 1000
): RateLimitRequestHandler {
  return rateLimit({
    store: new RedisStore({
      // @ts-ignore
      client: redisClient,
      prefix: `rl:endpoint:${endpoint}:`
    }),
    windowMs,
    max: maxRequests,
    message: {
      error: `Too many requests to ${endpoint}`,
      maxRequests,
      window: `${windowMs / 1000} seconds`
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req: Request) => {
      // Skip rate limiting for enterprise users
      const tier = getUserTier(req);
      return tier === UserTier.ENTERPRISE;
    },
    handler: (req: Request, res: Response) => {
      logger.warn('Endpoint rate limit exceeded', {
        endpoint,
        userId: (req as any).user?.id,
        ip: req.ip
      });
      
      res.status(429).json({
        error: 'Endpoint rate limit exceeded',
        endpoint,
        maxRequests,
        windowSeconds: windowMs / 1000,
        retryAfter: res.getHeader('Retry-After')
      });
    }
  });
}

/**
 * Concurrent requests limiter
 */
const activeRequests = new Map<string, number>();

export function concurrentRequestsLimiter(req: Request, res: Response, next: NextFunction) {
  const tier = getUserTier(req);
  const limits = tierLimits[tier];
  const user = (req as any).user;
  const userId = user?.id || req.ip;
  
  const current = activeRequests.get(userId) || 0;
  
  if (current >= limits.concurrentRequests) {
    logger.warn('Concurrent requests limit exceeded', {
      userId,
      tier,
      limit: limits.concurrentRequests
    });
    
    return res.status(429).json({
      error: 'Too many concurrent requests',
      message: `You can only have ${limits.concurrentRequests} concurrent requests with ${tier} tier`,
      limit: limits.concurrentRequests,
      tier
    });
  }
  
  activeRequests.set(userId, current + 1);
  
  res.on('finish', () => {
    const newCount = (activeRequests.get(userId) || 1) - 1;
    if (newCount <= 0) {
      activeRequests.delete(userId);
    } else {
      activeRequests.set(userId, newCount);
    }
  });
  
  next();
}

/**
 * API key rate limiter
 */
export const apiKeyRateLimiter: RateLimitRequestHandler = rateLimit({
  store: new RedisStore({
    // @ts-ignore
    client: redisClient,
    prefix: 'rl:apikey:'
  }),
  windowMs: 60 * 1000,
  max: async (req: Request) => {
    const apiKey = req.headers['x-api-key'] as string;
    // Fetch API key limits from database
    // For now, return default
    return 100;
  },
  keyGenerator: (req: Request) => {
    return req.headers['x-api-key'] as string || req.ip;
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Get rate limit status for user
 */
export async function getRateLimitStatus(userId: string, tier: UserTier) {
  const limits = tierLimits[tier];
  const status: any = {
    tier,
    limits: {
      perMinute: limits.requestsPerMinute,
      perHour: limits.requestsPerHour,
      perDay: limits.requestsPerDay,
      concurrent: limits.concurrentRequests
    },
    current: {}
  };
  
  for (const window of ['minute', 'hour', 'day'] as const) {
    const key = `rate_limit:${window}:${userId}`;
    const count = await redisClient.get(key);
    const ttl = await redisClient.pttl(key);
    
    let maxRequests: number;
    switch (window) {
      case 'minute':
        maxRequests = limits.requestsPerMinute;
        break;
      case 'hour':
        maxRequests = limits.requestsPerHour;
        break;
      case 'day':
        maxRequests = limits.requestsPerDay;
        break;
    }
    
    status.current[window] = {
      used: parseInt(count || '0'),
      remaining: Math.max(0, maxRequests - parseInt(count || '0')),
      resetIn: ttl > 0 ? Math.ceil(ttl / 1000) : 0
    };
  }
  
  return status;
}

// Example usage:
/*
import express from 'express';
import {
  globalRateLimiter,
  userRateLimiter,
  endpointRateLimiter,
  concurrentRequestsLimiter
} from './middleware/rate-limiting';

const app = express();

// Apply global rate limiter
app.use(globalRateLimiter);

// Apply concurrent requests limiter
app.use(concurrentRequestsLimiter);

// Protected routes with user-based rate limiting
app.use('/api', userRateLimiter('minute'));
app.use('/api', userRateLimiter('hour'));
app.use('/api', userRateLimiter('day'));

// Endpoint-specific rate limiting
app.post('/api/auth/login', 
  endpointRateLimiter('login', 5, 15 * 60 * 1000), // 5 attempts per 15 min
  loginHandler
);

app.post('/api/models/train',
  endpointRateLimiter('train-model', 10, 60 * 60 * 1000), // 10 per hour
  trainModelHandler
);
*/
