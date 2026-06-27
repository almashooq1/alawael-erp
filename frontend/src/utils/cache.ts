/**
 * Request Cache Utility — TypeScript Version
 * أداة التخزين المؤقت للطلبات API
 */

interface CacheEntry<T = unknown> {
  data: T;
  expiresAt: number;
}

interface RequestConfig {
  method?: string;
  url?: string;
  params?: Record<string, unknown>;
}

class RequestCache {
  private cache: Map<string, CacheEntry<unknown>> = new Map();

  private _getKey(config: RequestConfig): string {
    const method = config.method || 'get';
    const url = config.url || '';
    const params = JSON.stringify(config.params || {});
    return `${method}:${url}:${params}`;
  }

  get<T>(config: RequestConfig): T | null {
    const key = this._getKey(config);
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.data;
  }

  set<T>(config: RequestConfig, data: T, ttl = 300000): void {
    const key = this._getKey(config);
    const expiresAt = Date.now() + ttl;
    this.cache.set(key, { data, expiresAt });
  }

  invalidate(pattern: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  clear(): void {
    this.cache.clear();
  }

  getStats(): { size: number; entries: string[] } {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys()),
    };
  }
}

export const requestCache = new RequestCache();

export async function cachedApiCall<T>(
  apiFn: (config: RequestConfig) => Promise<T>,
  config: RequestConfig,
  options: { ttl?: number; skipCache?: boolean } = {}
): Promise<T> {
  const { ttl = 300000, skipCache = false } = options;

  const method = (config.method || 'get').toLowerCase();
  if (method !== 'get') {
    return apiFn(config);
  }

  if (!skipCache) {
    const cached = requestCache.get<T>(config);
    if (cached) {
      return cached;
    }
  }

  const result = await apiFn(config);
  requestCache.set(config, result, ttl);
  return result;
}

export default requestCache;
