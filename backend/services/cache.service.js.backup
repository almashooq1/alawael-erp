/**
 * Redis Caching Service
 * خدمة التخزين المؤقت
 *
 * Efficient caching for frequently accessed data
 */

const redis = require('redis');
const { promisify } = require('util');

/**
 * Cache Service with Redis
 */
class CacheService {
  constructor() {
    this.client = null;
    this.initialized = false;
    this.ttl = {
      SHORT: 300, // 5 minutes
      MEDIUM: 3600, // 1 hour
      LONG: 86400, // 24 hours
      VERY_LONG: 604800 // 7 days
    };
  }

  /**
   * Initialize Redis connection
   */
  async initialize() {
    if (this.initialized) return;

    try {
      this.client = redis.createClient({
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD,
        db: process.env.REDIS_DB || 0
      });

      this.client.on('error', (err) => {
        console.error('Redis Client Error:', err);
      });

      this.client.on('connect', () => {
        console.log('✓ Redis connected');
        this.initialized = true;
      });

      // Promisify methods
      this.get = promisify(this.client.get).bind(this.client);
      this.set = promisify(this.client.set).bind(this.client);
      this.del = promisify(this.client.del).bind(this.client);
      this.exists = promisify(this.client.exists).bind(this.client);
      this.expire = promisify(this.client.expire).bind(this.client);
      this.lpush = promisify(this.client.lpush).bind(this.client);
      this.rpop = promisify(this.client.rpop).bind(this.client);
      this.hset = promisify(this.client.hset).bind(this.client);
      this.hget = promisify(this.client.hget).bind(this.client);
      this.hdel = promisify(this.client.hdel).bind(this.client);
      this.flushdb = promisify(this.client.flushdb).bind(this.client);
    } catch (error) {
      console.error('Failed to initialize Redis:', error);
      console.log('Continuing without caching...');
      this.initialized = false;
    }
  }

  /**
   * Get cached value
   */
  async getCache(key) {
    if (!this.initialized || !this.client) return null;

    try {
      const value = await this.get(key);
      if (value) {
        console.log(`[CACHE HIT] ${key}`);
        return JSON.parse(value);
      }
      return null;
    } catch (error) {
      console.error(`Cache get error for ${key}:`, error);
      return null;
    }
  }

  /**
   * Set cached value
   */
  async setCache(key, value, ttl = this.ttl.MEDIUM) {
    if (!this.initialized || !this.client) return;

    try {
      await this.set(key, JSON.stringify(value), 'EX', ttl);
      console.log(`[CACHE SET] ${key} (TTL: ${ttl}s)`);
    } catch (error) {
      console.error(`Cache set error for ${key}:`, error);
    }
  }

  /**
   * Delete cached value
   */
  async delCache(key) {
    if (!this.initialized || !this.client) return;

    try {
      await this.del(key);
      console.log(`[CACHE DEL] ${key}`);
    } catch (error) {
      console.error(`Cache delete error for ${key}:`, error);
    }
  }

  /**
   * Clear all cache
   */
  async clearCache() {
    if (!this.initialized || !this.client) return;

    try {
      await this.flushdb();
      console.log('[CACHE CLEARED]');
    } catch (error) {
      console.error('Cache clear error:', error);
    }
  }

  /**
   * Cache Keys (predefined patterns)
   */
  getKey(entity, id, qualifier = '') {
    const parts = [entity, id, qualifier].filter(Boolean);
    return `therapy:${parts.join(':')}`;
  }

  /**
   * Therapy-specific caching methods
   */

  // Therapist Availability
  async getCachedTherapistAvailability(therapistId) {
    return await this.getCache(this.getKey('availability', therapistId));
  }

  async setCachedTherapistAvailability(therapistId, availability) {
    await this.setCache(
      this.getKey('availability', therapistId),
      availability,
      this.ttl.LONG
    );
  }

  // Session Data
  async getCachedSession(sessionId) {
    return await this.getCache(this.getKey('session', sessionId));
  }

  async setCachedSession(sessionId, session) {
    await this.setCache(
      this.getKey('session', sessionId),
      session,
      this.ttl.MEDIUM
    );
  }

  async invalidateSessionCache(sessionId) {
    await this.delCache(this.getKey('session', sessionId));
    // Also invalidate related lists
    await this.delCache(this.getKey('sessions', 'list'));
  }

  // Therapist Sessions List
  async getCachedTherapistSessions(therapistId, dateRange) {
    return await this.getCache(
      this.getKey('therapist-sessions', therapistId, dateRange)
    );
  }

  async setCachedTherapistSessions(therapistId, dateRange, sessions) {
    await this.setCache(
      this.getKey('therapist-sessions', therapistId, dateRange),
      sessions,
      this.ttl.SHORT
    );
  }

  async invalidateTherapistSessionsCache(therapistId) {
    // Invalidate all date ranges for this therapist
    await this.delCache(this.getKey('therapist-sessions', therapistId));
  }

  // Beneficiary Sessions List
  async getCachedBeneficiarySessions(beneficiaryId) {
    return await this.getCache(
      this.getKey('beneficiary-sessions', beneficiaryId)
    );
  }

  async setCachedBeneficiarySessions(beneficiaryId, sessions) {
    await this.setCache(
      this.getKey('beneficiary-sessions', beneficiaryId),
      sessions,
      this.ttl.SHORT
    );
  }

  async invalidateBeneficiarySessionsCache(beneficiaryId) {
    await this.delCache(this.getKey('beneficiary-sessions', beneficiaryId));
  }

  // Session Documentation
  async getCachedSessionDocumentation(sessionId) {
    return await this.getCache(
      this.getKey('documentation', sessionId)
    );
  }

  async setCachedSessionDocumentation(sessionId, documentation) {
    await this.setCache(
      this.getKey('documentation', sessionId),
      documentation,
      this.ttl.MEDIUM
    );
  }

  async invalidateSessionDocumentationCache(sessionId) {
    await this.delCache(this.getKey('documentation', sessionId));
  }

  // Therapist Statistics
  async getCachedTherapistStats(therapistId, period) {
    return await this.getCache(
      this.getKey('stats', therapistId, period)
    );
  }

  async setCachedTherapistStats(therapistId, period, stats) {
    await this.setCache(
      this.getKey('stats', therapistId, period),
      stats,
      this.ttl.LONG
    );
  }

  async invalidateTherapistStatsCache(therapistId) {
    await this.delCache(this.getKey('stats', therapistId));
  }

  // Clinic Statistics
  async getCachedClinicStats(period) {
    return await this.getCache(this.getKey('clinic-stats', period));
  }

  async setCachedClinicStats(period, stats) {
    await this.setCache(
      this.getKey('clinic-stats', period),
      stats,
      this.ttl.LONG
    );
  }

  async invalidateClinicStatsCache() {
    await this.delCache(this.getKey('clinic-stats'));
  }

  // Availability Check
  async getCachedAvailabilityCheck(therapistId, date, time) {
    return await this.getCache(
      this.getKey('availability-check', therapistId, `${date}:${time}`)
    );
  }

  async setCachedAvailabilityCheck(therapistId, date, time, result) {
    await this.setCache(
      this.getKey('availability-check', therapistId, `${date}:${time}`),
      result,
      this.ttl.SHORT
    );
  }

  /**
   * Invalidate related caches when session is updated
   */
  async invalidateSessionUpdateCaches(session) {
    // Invalidate specific session
    await this.invalidateSessionCache(session._id);

    // Invalidate therapist's session list
    if (session.therapist) {
      await this.invalidateTherapistSessionsCache(session.therapist);
      await this.invalidateTherapistStatsCache(session.therapist);
    }

    // Invalidate beneficiary's session list
    if (session.beneficiary) {
      await this.invalidateBeneficiarySessionsCache(session.beneficiary);
    }

    // Invalidate clinic stats
    await this.invalidateClinicStatsCache();
  }

  /**
   * Invalidate documentation-related caches
   */
  async invalidateDocumentationCaches(session) {
    await this.invalidateSessionDocumentationCache(session._id);
    await this.invalidateTherapistStatsCache(session.therapist);
    await this.invalidateClinicStatsCache();
  }
}

// Export as singleton
const cacheService = new CacheService();
cacheService.initialize(); // Initialize on module load

module.exports = cacheService;
