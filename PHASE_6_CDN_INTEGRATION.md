# 🌐 **Phase 6.3: CDN Integration**

**التاريخ:** 14 يناير 2026  
**المدة:** 1-2 ساعة  
**المستوى:** متقدم

---

## 📋 **جدول المحتويات**

1. [المقدمة](#المقدمة)
2. [CDN Architecture](#cdn-architecture)
3. [Cloudflare Setup](#cloudflare-setup)
4. [Image Optimization](#image-optimization)
5. [Static File Caching](#static-file-caching)
6. [Performance Monitoring](#performance-monitoring)

---

## 🎯 **المقدمة**

### الهدف:

استخدام CDN (Content Delivery Network) لتوزيع المحتوى:

- ✅ Global edge servers
- ✅ Image optimization
- ✅ Gzip/Brotli compression
- ✅ DDoS protection

### الفوائد:

```
Page Load Time:  3s → 500ms      (6x faster)
Bandwidth:       100GB → 20GB    (80% reduction)
Availability:    99.5% → 99.99%
Geographic:      Single region → Global
```

---

## 🏗️ **CDN Architecture**

### Architecture Diagram

```
User Request
     │
     ▼
┌─────────────────────────────────┐
│   Cloudflare Global Network     │
│   (200+ data centers)           │
└──────────────┬──────────────────┘
               │
        ┌──────┴──────┐
        │             │
    ┌───▼───┐     ┌───▼───┐
    │ Cache │     │ Cache │
    │  Hit  │     │ Miss  │
    └───┬───┘     └───┬───┘
        │             │
        │        ┌────▼────────┐
        │        │ Origin Server │
        │        │ (Express.js)  │
        │        └───────┬───────┘
        │                │
        └────────┬───────┘
                 │
           ┌─────▼──────┐
           │   Response │
           └────────────┘
```

### Components

```
CDN:              Cloudflare / AWS CloudFront
Cache Strategy:   Aggressive
Compression:      Gzip + Brotli
Images:           WebP + AVIF
Security:         WAF + Rate Limiting
Performance:      HTTP/3 + Early Hints
```

---

## ⚙️ **Cloudflare Setup**

### Step 1: Create Cloudflare Account

```bash
# Visit https://dash.cloudflare.com
# Sign up → Create account
# Add site → almashooq.com (or your domain)
```

### Step 2: Update DNS

```
Add DNS records:
Type    Name          Value                    Proxy
A       example.com   API_SERVER_IP            Proxied ✓
CNAME   www           example.com              Proxied ✓
CNAME   api           API_SERVER_IP            Proxied ✓
```

### Step 3: Configure Caching Rules

```javascript
// cloudflare-worker.js

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  // Cache static assets aggressively
  const url = new URL(request.url);

  if (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/images/')) {
    const response = await fetch(request);

    // Cache for 1 year
    const newHeaders = new Headers(response.headers);
    newHeaders.set('Cache-Control', 'public, max-age=31536000, immutable');

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders,
    });
  }

  // For API calls, bypass cache
  if (url.pathname.startsWith('/api/')) {
    const response = await fetch(request);
    const newHeaders = new Headers(response.headers);
    newHeaders.set('Cache-Control', 'no-cache, no-store, must-revalidate');

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders,
    });
  }

  return fetch(request);
}
```

### Step 4: Cloudflare Settings

```bash
# Speed Tab
Browser Cache TTL:        30 minutes
Cache Level:              Cache Everything
Minify:                   Enabled (JS, CSS, HTML)
Rocket Loader:            Enabled

# Caching Tab
Cache Rules:              Create specific rules
Purge Cache:              Automatic
Cache TTL by Status:      200 (2 weeks), others (10 min)

# Security Tab
SSL/TLS:                  Full (strict)
Always Use HTTPS:         On
Security Level:           Medium
DDoS Protection:          On
WAF:                      Enabled
```

---

## 🖼️ **Image Optimization**

### Image Optimization Service

```javascript
// backend/services/image-optimizer.js

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

class ImageOptimizer {
  constructor() {
    this.formats = ['webp', 'avif', 'jpeg'];
    this.sizes = [320, 640, 1280, 1920];
  }

  async optimizeImage(inputPath, outputDir) {
    try {
      const image = sharp(inputPath);
      const metadata = await image.metadata();

      const results = {};

      // Generate multiple formats
      for (const format of this.formats) {
        results[format] = [];

        // Generate multiple sizes
        for (const size of this.sizes) {
          if (size > metadata.width) continue;

          const filename = `${path.basename(inputPath, path.extname(inputPath))}-${size}w.${format}`;
          const outputPath = path.join(outputDir, filename);

          await this.resizeAndConvert(inputPath, outputPath, size, format);

          results[format].push({
            size,
            path: filename,
            bytes: fs.statSync(outputPath).size,
          });
        }
      }

      return results;
    } catch (error) {
      console.error('Image optimization error:', error);
      throw error;
    }
  }

  async resizeAndConvert(inputPath, outputPath, width, format) {
    const image = sharp(inputPath).resize(width, null, { withoutEnlargement: true });

    switch (format) {
      case 'webp':
        await image.webp({ quality: 80 }).toFile(outputPath);
        break;
      case 'avif':
        await image.avif({ quality: 75 }).toFile(outputPath);
        break;
      case 'jpeg':
        await image.jpeg({ quality: 80, progressive: true }).toFile(outputPath);
        break;
    }
  }

  generatePicture(filename) {
    const baseName = filename.split('.')[0];

    return {
      webp: {
        mobile: `${baseName}-320w.webp`,
        tablet: `${baseName}-640w.webp`,
        desktop: `${baseName}-1280w.webp`,
        fullhd: `${baseName}-1920w.webp`,
      },
      fallback: {
        mobile: `${baseName}-320w.jpeg`,
        tablet: `${baseName}-640w.jpeg`,
        desktop: `${baseName}-1280w.jpeg`,
        fullhd: `${baseName}-1920w.jpeg`,
      },
    };
  }
}

module.exports = new ImageOptimizer();
```

### Picture Element Template

```html
<!-- Responsive images with CDN URLs -->
<picture>
  <!-- WebP format (smallest) -->
  <source
    srcset="
      https://cdn.almashooq.com/images/profile-320w.webp   320w,
      https://cdn.almashooq.com/images/profile-640w.webp   640w,
      https://cdn.almashooq.com/images/profile-1280w.webp 1280w,
      https://cdn.almashooq.com/images/profile-1920w.webp 1920w
    "
    type="image/webp"
    sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
  />

  <!-- AVIF format (better compression) -->
  <source
    srcset="
      https://cdn.almashooq.com/images/profile-320w.avif   320w,
      https://cdn.almashooq.com/images/profile-640w.avif   640w,
      https://cdn.almashooq.com/images/profile-1280w.avif 1280w,
      https://cdn.almashooq.com/images/profile-1920w.avif 1920w
    "
    type="image/avif"
    sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
  />

  <!-- JPEG fallback -->
  <img src="https://cdn.almashooq.com/images/profile-1280w.jpeg" alt="User Profile" loading="lazy" decoding="async" />
</picture>
```

---

## 📦 **Static File Caching**

### Cache Headers Configuration

```javascript
// backend/middleware/cache-headers.js

const cacheHeaders = (req, res, next) => {
  const url = req.url;

  // Immutable assets (versioned)
  if (url.includes('.min.') || url.match(/\.[a-f0-9]{8}\./)) {
    res.set('Cache-Control', 'public, max-age=31536000, immutable');
  }

  // CSS and JS
  else if (url.endsWith('.css') || url.endsWith('.js')) {
    res.set('Cache-Control', 'public, max-age=604800, must-revalidate'); // 1 week
  }

  // Images
  else if (/\.(png|jpg|jpeg|gif|svg|webp|avif)$/i.test(url)) {
    res.set('Cache-Control', 'public, max-age=2592000, must-revalidate'); // 30 days
  }

  // Fonts
  else if (/\.(woff|woff2|ttf|eot)$/i.test(url)) {
    res.set('Cache-Control', 'public, max-age=31536000, immutable');
  }

  // HTML
  else if (url.endsWith('.html') || !url.includes('.')) {
    res.set('Cache-Control', 'public, max-age=3600, must-revalidate'); // 1 hour
  }

  // Default
  else {
    res.set('Cache-Control', 'public, max-age=600');
  }

  // Add ETAG for validation
  res.set('ETag', `W/"${Math.random().toString(36).slice(2)}"`);

  next();
};

module.exports = cacheHeaders;
```

### Asset Bundling for CDN

```javascript
// webpack.config.js

module.exports = {
  mode: 'production',
  entry: './src/index.js',
  output: {
    filename: '[name].[contenthash:8].js',
    path: path.resolve(__dirname, 'dist'),
    publicPath: 'https://cdn.almashooq.com/assets/',
  },
  module: {
    rules: [
      {
        test: /\.(png|jpg|jpeg|gif|svg)$/,
        type: 'asset',
        parser: {
          dataUrlCondition: { maxSize: 8 * 1024 }, // 8kb
        },
        generator: {
          filename: 'images/[name].[hash:8][ext]',
        },
      },
    ],
  },
  plugins: [
    new CompressionPlugin({
      algorithm: 'gzip',
      test: /\.(js|css|html|svg)$/,
      threshold: 10240,
      minRatio: 0.8,
    }),
  ],
};
```

---

## 📊 **Performance Monitoring**

### Web Vitals Monitoring

```javascript
// frontend/monitoring/web-vitals.js

function initWebVitalsMonitoring() {
  // Largest Contentful Paint (LCP)
  const observer = new PerformanceObserver(entryList => {
    const entries = entryList.getEntries();
    const lastEntry = entries[entries.length - 1];

    console.log('LCP:', lastEntry.renderTime || lastEntry.loadTime);

    // Send to analytics
    sendMetric('lcp', lastEntry.renderTime || lastEntry.loadTime);
  });
  observer.observe({ type: 'largest-contentful-paint', buffered: true });

  // Cumulative Layout Shift (CLS)
  let clsValue = 0;
  const clsObserver = new PerformanceObserver(entryList => {
    for (const entry of entryList.getEntries()) {
      if (!entry.hadRecentInput) {
        const firstSessionEntry = clsValue + entry.value;
        clsValue = firstSessionEntry;

        console.log('CLS:', clsValue);
        sendMetric('cls', clsValue);
      }
    }
  });
  clsObserver.observe({ type: 'layout-shift', buffered: true });

  // First Input Delay (FID)
  const fidObserver = new PerformanceObserver(entryList => {
    const entries = entryList.getEntries();
    entries.forEach(entry => {
      console.log('FID:', entry.processingDuration);
      sendMetric('fid', entry.processingDuration);
    });
  });
  fidObserver.observe({ type: 'first-input', buffered: true });
}

function sendMetric(name, value) {
  navigator.sendBeacon('/api/metrics/web-vitals', JSON.stringify({ name, value, timestamp: Date.now() }));
}

// Initialize on page load
window.addEventListener('load', initWebVitalsMonitoring);
```

### CDN Analytics

```javascript
// backend/routes/cdn-analytics.js

router.get('/cdn/analytics', async (req, res) => {
  try {
    // Get stats from Cloudflare API
    const cloudflareStats = await fetchCloudflareAnalytics();

    res.json({
      cdn: {
        bandwidth: cloudflareStats.bandwidth,
        requests: cloudflareStats.requests,
        cacheRatio: cloudflareStats.cacheHitRatio,
        avgLatency: cloudflareStats.avgLatency,
      },
      webVitals: {
        lcp: calculatePercentile('lcp', 75),
        fid: calculatePercentile('fid', 95),
        cls: calculatePercentile('cls', 75),
      },
      compression: {
        totalSize: calculateTotalSize(),
        compressedSize: calculateCompressedSize(),
        ratio: ((compressedSize / totalSize) * 100).toFixed(2) + '%',
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

---

## 🎯 **Checklist**

- [ ] Cloudflare account created
- [ ] DNS records updated
- [ ] Caching rules configured
- [ ] Image optimization implemented
- [ ] Cache headers set correctly
- [ ] Asset bundling with hashing
- [ ] Web Vitals monitoring active
- [ ] CDN analytics dashboard

---

**تم إنشاء هذا الملف:** 14 يناير 2026  
**الحالة:** ✅ جاهز للتطبيق الفوري
