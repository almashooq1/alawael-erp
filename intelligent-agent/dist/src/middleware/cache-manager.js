"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cacheManager = void 0;
const crypto_1 = require("crypto");
const logger_1 = require("../modules/logger");
const logger = logger_1.Logger.getInstance();
class CacheManager {
    constructor() {
        this.DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
        this.MAX_CACHE_SIZE = 1000;
        this.cache = new Map();
        // تنظيف الـ cache كل 10 دقائق
        setInterval(() => this.cleanup(), 10 * 60 * 1000);
    }
    static getInstance() {
        if (!CacheManager.instance) {
            CacheManager.instance = new CacheManager();
        }
        return CacheManager.instance;
    }
    /**
     * توليد مفتاح فريد للـ cache بناءً على الطلب
     */
    generateKey(req) {
        const keyData = {
            method: req.method,
            url: req.originalUrl,
            userId: req.user?.id,
            query: req.query,
        };
        return (0, crypto_1.createHash)('md5').update(JSON.stringify(keyData)).digest('hex');
    }
    /**
     * التحقق من صلاحية الـ cache entry
     */
    isValid(entry) {
        return Date.now() - entry.timestamp < entry.ttl;
    }
    /**
     * الحصول على بيانات من الـ cache
     */
    get(key) {
        const entry = this.cache.get(key);
        if (!entry)
            return null;
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
    set(key, data, ttl = this.DEFAULT_TTL) {
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
    delete(key) {
        return this.cache.delete(key);
    }
    /**
     * حذف جميع المدخلات التي تطابق نمط معين
     */
    invalidatePattern(pattern) {
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
    clear() {
        const size = this.cache.size;
        this.cache.clear();
        logger.info('Cache cleared', { entriesRemoved: size });
    }
    /**
     * تنظيف المدخلات المنتهية الصلاحية
     */
    cleanup() {
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
    evictOldest() {
        let oldestKey = null;
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
    getStats() {
        return {
            size: this.cache.size,
            maxSize: this.MAX_CACHE_SIZE,
            defaultTTL: this.DEFAULT_TTL,
        };
    }
    /**
     * Middleware لتفعيل الـ cache على routes محددة
     */
    cacheMiddleware(ttl = this.DEFAULT_TTL) {
        return (req, res, next) => {
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
            res.json = (body) => {
                this.set(key, body, ttl);
                return originalJson(body);
            };
            next();
        };
    }
}
exports.default = CacheManager;
exports.cacheManager = CacheManager.getInstance();
