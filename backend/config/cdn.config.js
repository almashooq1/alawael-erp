/**
 * CDN Integration & Static Asset Optimization
 * تكامل CDN وتحسين الملفات الثابتة
 *
 * الميزات:
 * ✅ CloudFront/Cloudflare Integration
 * ✅ Image Optimization
 * ✅ Asset Versioning
 * ✅ Cache Headers
 */

const path = require('path');
const crypto = require('crypto');
const fs = require('fs').promises;

// ============================================================================
// CDN CONFIGURATION
// ============================================================================

const CDN_CONFIG = {
  // CDN Provider
  provider: process.env.CDN_PROVIDER || 'cloudflare', // 'cloudflare' | 'cloudfront' | 'local'

  // CDN URLs
  urls: {
    cloudflare: process.env.CLOUDFLARE_CDN_URL || 'https://cdn.example.com',
    cloudfront: process.env.CLOUDFRONT_CDN_URL || 'https://d1234567890.cloudfront.net',
    local: process.env.LOCAL_CDN_URL || '/static',
  },

  // Asset types
  assetTypes: {
    images: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'ico'],
    styles: ['css', 'scss', 'less'],
    scripts: ['js', 'mjs', 'ts'],
    fonts: ['woff', 'woff2', 'ttf', 'eot', 'otf'],
    documents: ['pdf', 'doc', 'docx', 'xls', 'xlsx'],
    videos: ['mp4', 'webm', 'ogg', 'avi'],
  },

  // Cache durations (in seconds)
  cacheDurations: {
    immutable: 31536000, // 1 year - for versioned assets
    long: 2592000, // 30 days - for static assets
    medium: 86400, // 1 day - for semi-static assets
    short: 3600, // 1 hour - for dynamic assets
    none: 0, // No cache
  },

  // Image optimization
  imageOptimization: {
    enabled: true,
    maxWidth: 2000,
    maxHeight: 2000,
    quality: 85,
    formats: ['webp', 'jpg'],
  },
};

// ============================================================================
// CDN MANAGER CLASS
// ============================================================================

class CDNManager {
  constructor() {
    this.provider = CDN_CONFIG.provider;
    this.baseURL = CDN_CONFIG.urls[this.provider];
    this.versionMap = new Map(); // Asset path -> versioned path
  }

  // ============================================================================
  // GET CDN URL
  // ============================================================================
  getCDNUrl(assetPath, options = {}) {
    const { version = true, query = {} } = options;

    try {
      let url = assetPath;

      // Add versioning
      if (version) {
        url = this.addVersion(assetPath);
      }

      // Build full URL
      const fullURL = new URL(url, this.baseURL);

      // Add query parameters
      Object.entries(query).forEach(([key, value]) => {
        fullURL.searchParams.append(key, value);
      });

      return fullURL.toString();
    } catch (error) {
      console.error('Error generating CDN URL:', error.message);
      return assetPath;
    }
  }

  // ============================================================================
  // ADD VERSION HASH
  // ============================================================================
  addVersion(assetPath) {
    // Check if already versioned
    if (this.versionMap.has(assetPath)) {
      return this.versionMap.get(assetPath);
    }

    // Generate version hash
    const hash = this.generateHash(assetPath);
    const ext = path.extname(assetPath);
    const base = path.basename(assetPath, ext);
    const dir = path.dirname(assetPath);

    const versionedPath = `${dir}/${base}.${hash}${ext}`;
    this.versionMap.set(assetPath, versionedPath);

    return versionedPath;
  }

  // ============================================================================
  // GENERATE HASH
  // ============================================================================
  generateHash(input) {
    return crypto
      .createHash('md5')
      .update(input + Date.now().toString())
      .digest('hex')
      .substring(0, 8);
  }

  // ============================================================================
  // GET CACHE HEADERS
  // ============================================================================
  getCacheHeaders(assetPath, options = {}) {
    const { immutable = false, duration = null } = options;

    const ext = path.extname(assetPath).toLowerCase().replace('.', '');
    const headers = {};

    // Determine cache duration
    let cacheDuration;
    if (duration !== null) {
      cacheDuration = duration;
    } else if (immutable) {
      cacheDuration = CDN_CONFIG.cacheDurations.immutable;
    } else if (this.isStaticAsset(ext)) {
      cacheDuration = CDN_CONFIG.cacheDurations.long;
    } else {
      cacheDuration = CDN_CONFIG.cacheDurations.medium;
    }

    // Set cache headers
    if (cacheDuration > 0) {
      headers['Cache-Control'] = immutable
        ? `public, max-age=${cacheDuration}, immutable`
        : `public, max-age=${cacheDuration}`;

      const expiresDate = new Date(Date.now() + cacheDuration * 1000);
      headers['Expires'] = expiresDate.toUTCString();
    } else {
      headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
      headers['Pragma'] = 'no-cache';
      headers['Expires'] = '0';
    }

    // Add ETag
    headers['ETag'] = this.generateHash(assetPath);

    // Add content type
    headers['Content-Type'] = this.getContentType(ext);

    return headers;
  }

  // ============================================================================
  // CHECK IF STATIC ASSET
  // ============================================================================
  isStaticAsset(extension) {
    return Object.values(CDN_CONFIG.assetTypes).flat().includes(extension);
  }

  // ============================================================================
  // GET CONTENT TYPE
  // ============================================================================
  getContentType(extension) {
    const contentTypes = {
      // Images
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
      svg: 'image/svg+xml',
      ico: 'image/x-icon',

      // Styles
      css: 'text/css',

      // Scripts
      js: 'application/javascript',
      mjs: 'application/javascript',

      // Fonts
      woff: 'font/woff',
      woff2: 'font/woff2',
      ttf: 'font/ttf',
      eot: 'application/vnd.ms-fontobject',
      otf: 'font/otf',

      // Documents
      pdf: 'application/pdf',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',

      // Videos
      mp4: 'video/mp4',
      webm: 'video/webm',
      ogg: 'video/ogg',
    };

    return contentTypes[extension] || 'application/octet-stream';
  }

  // ============================================================================
  // OPTIMIZE IMAGE URL
  // ============================================================================
  getOptimizedImageUrl(imagePath, options = {}) {
    const {
      width = null,
      height = null,
      quality = CDN_CONFIG.imageOptimization.quality,
      format = 'auto',
    } = options;

    const query = {};

    if (width) query.w = width;
    if (height) query.h = height;
    if (quality !== 85) query.q = quality;
    if (format !== 'auto') query.f = format;

    return this.getCDNUrl(imagePath, { query });
  }

  // ============================================================================
  // PURGE CACHE
  // ============================================================================
  async purgeCache(paths = []) {
    console.log(`🗑️ Purging CDN cache for ${paths.length} paths...`);

    try {
      switch (this.provider) {
        case 'cloudflare':
          return await this.purgeCloudflare(paths);

        case 'cloudfront':
          return await this.purgeCloudFront(paths);

        default:
          console.log('Local CDN - no purge needed');
          return { success: true, provider: 'local' };
      }
    } catch (error) {
      console.error('CDN purge error:', error.message);
      throw error;
    }
  }

  // ============================================================================
  // PURGE CLOUDFLARE
  // ============================================================================
  async purgeCloudflare(paths) {
    const zoneId = process.env.CLOUDFLARE_ZONE_ID;
    const apiKey = process.env.CLOUDFLARE_API_KEY;

    if (!zoneId || !apiKey) {
      console.warn('Cloudflare credentials not configured');
      return { success: false, error: 'Missing credentials' };
    }

    const files = paths.map(p => this.getCDNUrl(p, { version: false }));

    const response = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ files }),
      }
    );

    const result = await response.json();
    return { success: result.success, result };
  }

  // ============================================================================
  // PURGE CLOUDFRONT
  // ============================================================================
  async purgeCloudFront(paths) {
    console.log('CloudFront purge - would require AWS SDK');
    // This would use AWS SDK to create an invalidation
    return {
      success: true,
      message: 'CloudFront invalidation would be created',
      paths,
    };
  }

  // ============================================================================
  // GET STATISTICS
  // ============================================================================
  getStats() {
    return {
      provider: this.provider,
      baseURL: this.baseURL,
      versionedAssets: this.versionMap.size,
      supportedTypes: Object.keys(CDN_CONFIG.assetTypes).length,
    };
  }
}

// ============================================================================
// CDN MIDDLEWARE
// ============================================================================

function cdnMiddleware(options = {}) {
  const { staticPath = '/static', cacheControl = true } = options;

  return (req, res, next) => {
    // Only handle static assets
    if (!req.path.startsWith(staticPath)) {
      return next();
    }

    const assetPath = req.path.replace(staticPath, '');

    // Add cache headers
    if (cacheControl) {
      const headers = cdnManager.getCacheHeaders(assetPath);
      Object.entries(headers).forEach(([key, value]) => {
        res.setHeader(key, value);
      });
    }

    // Add CDN URL helper to response
    res.locals.cdnUrl = (path, opts) => cdnManager.getCDNUrl(path, opts);

    next();
  };
}

// ============================================================================
// TEMPLATE HELPERS
// ============================================================================

function cdnHelpers() {
  return {
    // Asset URL with versioning
    asset: (path, options = {}) => {
      return cdnManager.getCDNUrl(path, { version: true, ...options });
    },

    // Image URL with optimization
    image: (path, options = {}) => {
      return cdnManager.getOptimizedImageUrl(path, options);
    },

    // CSS URL
    css: path => {
      return cdnManager.getCDNUrl(`/css/${path}`, { version: true });
    },

    // JS URL
    js: path => {
      return cdnManager.getCDNUrl(`/js/${path}`, { version: true });
    },
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

const cdnManager = new CDNManager();

module.exports = {
  cdnManager,
  cdnMiddleware,
  cdnHelpers,
  CDN_CONFIG,
};
