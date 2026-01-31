import { Request, Response, NextFunction } from 'express';
import { createHash } from 'crypto';
import { Logger } from '../modules/logger';

const logger = Logger.getInstance();

interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number;
}

class CacheManager {
  private static instance: CacheManager;
  private cache: Map<string, CacheEntry>;
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_CACHE_SIZE = 1000;

  private constructor() {
    this.cache = new Map();
    // تنظيف الـ cache كل 10 دقائق
    setInterval(() => this.cleanup(), 10 * 60 * 1000);
  }

  public static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  /**
   * توليد مفتاح فريد للـ cache بناءً على الطلب
   */
  private generateKey(req: Request): string {
    const keyData = {
      method: req.method,
      url: req.originalUrl,
      userId: (req as any).user?.id,
      query: req.query,
    };
    return createHash('md5').update(JSON.stringify(keyData)).digest('hex');
  }

  /**
   * التحقق من صلاحية الـ cache entry
   */
  private isValid(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp < entry.ttl;
  }

  /**
   * الحصول على بيانات من الـ cache
   */
  public get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (!this.isValid(entry)) {
      this.cache.delete(key);
      return null;
    }

    logger.debug('Cache hit', { key });
    return entry.data;
  }

  /**
   * حفظ بيانات في الـ cache
   */
  public set(key: string, data: any, ttl: number = this.DEFAULT_TTL): void {
    // التحقق من حجم الـ cache
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      this.evictOldest();
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });

    logger.debug('Cache set', { key, ttl });
  }

  /**
   * حذف مدخل من الـ cache
   */
  public delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * حذف جميع المدخلات التي تطابق نمط معين
   */
  public invalidatePattern(pattern: RegExp): number {
    let count = 0;
    for (const key of this.cache.keys()) {
      if (pattern.test(key)) {
        this.cache.delete(key);
        count++;
      }
    }
    logger.info('Cache invalidated by pattern', { pattern: pattern.toString(), count });
    return count;
  }

  /**
   * مسح جميع الـ cache
   */
  public clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    logger.info('Cache cleared', { entriesRemoved: size });
  }

  /**
   * تنظيف المدخلات المنتهية الصلاحية
   */
  private cleanup(): void {
    let removed = 0;
    for (const [key, entry] of this.cache.entries()) {
      if (!this.isValid(entry)) {
        this.cache.delete(key);
        removed++;
      }
    }
    if (removed > 0) {
      logger.info('Cache cleanup completed', { removed, remaining: this.cache.size });
    }
  }

  /**
   * حذف أقدم مدخل
   */
  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      logger.debug('Evicted oldest cache entry', { key: oldestKey });
    }
  }

  /**
   * الحصول على إحصائيات الـ cache
   */
  public getStats() {
    return {
      size: this.cache.size,
      maxSize: this.MAX_CACHE_SIZE,
      defaultTTL: this.DEFAULT_TTL,
    };
  }

  /**
   * Middleware لتفعيل الـ cache على routes محددة
   */
  public cacheMiddleware(ttl: number = this.DEFAULT_TTL) {
    return (req: Request, res: Response, next: NextFunction) => {
      // فقط GET requests يتم cache-ها
      if (req.method !== 'GET') {
        return next();
      }

      const key = this.generateKey(req);
      const cachedData = this.get(key);

      if (cachedData) {
        return res.json(cachedData);
      }

      // حفظ الـ response الأصلي
      const originalJson = res.json.bind(res);
      res.json = (body: any) => {
        this.set(key, body, ttl);
        return originalJson(body);
      };

      next();
    };
  }
}

export default CacheManager;
export const cacheManager = CacheManager.getInstance();
