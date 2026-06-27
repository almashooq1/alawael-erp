# Frontend Development Plan — Al-Awael ERP
## المرحلة 5: تطوير الواجهة الأمامية (React, Components, Pages)

**التاريخ:** 2026-06-27  
**الهدف:** حل المشاكل الحرجة + تحسين الأداء + إضافة ميزات أساسية

---

## المشاكل الحرجة (Critical)

| # | المشكلة | الملف | الحل |
|---|---------|-------|------|
| 1 | AuthenticatedShell يستورد كل المسارات بشكل فوري | `AuthenticatedShell.js` | تحويل كل المسارات إلى `React.lazy()` |
| 2 | CSP غير موجود | `index.html`, `nginx.conf` | إضافة `<meta http-equiv="Content-Security-Policy">` + `add_header` في nginx |
| 3 | التوكن في `localStorage` (XSS) | `src/utils/tokenStorage.js` | الانتقال إلى `httpOnly` cookies مع SameSite=Strict |
| 4 | لا حماية CSRF | `src/services/api.client.js` | إضافة `X-CSRF-Token` header |

## المشاكل المتوسطة (Medium)

| # | المشكلة | الملف | الحل |
|---|---------|-------|------|
| 5 | لا يوجد Service Worker / PWA | `src/`, `public/` | إضافة Vite PWA plugin |
| 6 | لا يوجد offline request queue | `api.client.js` | إضافة queue + replay عند استعادة الاتصال |
| 7 | ErrorBoundary واحد فقط | `App.js` | إضافة ErrorBoundary لكل مسار |
| 8 | لا يوجد caching / SWR | `api.client.js` | إضافة `react-query` أو `swr` |
| 9 | لا يوجد input sanitization | `api.js` / forms | إضافة DOMPurify |
| 10 | `X-XSS-Protection` deprecated | `nginx.conf` | إزالة الهيدر |
| 11 | `process.env` كامل في bundle | `vite.config.js` | تعديل `define` لتضمين فقط المتغيرات المطلوبة |
| 12 | لا يوجد Healthcheck في Dockerfile | `Dockerfile` | إضافة `HEALTHCHECK` |

## المهام التفصيلية

### Stage 1: أمان الواجهة الأمامية
- [ ] إضافة CSP headers في `index.html` + `nginx.conf`
- [ ] إزالة `X-XSS-Protection` من `nginx.conf`
- [ ] تعديل `tokenStorage.js` لاستخدام `httpOnly` cookies
- [ ] إضافة CSRF protection في `api.client.js`
- [ ] إضافة input sanitization (DOMPurify)
- [ ] تعديل `vite.config.js` `define` لحماية secrets

### Stage 2: أداء الواجهة الأمامية
- [ ] تحويل `AuthenticatedShell.js` إلى `React.lazy()`
- [ ] إضافة `prefetch` / `preload` في `index.html`
- [ ] تعديل `img { content-visibility: auto }` إلى scoped
- [ ] إضافة `@fontsource/cairo/variable.css` بدلاً من 5 ملفات منفصلة
- [ ] إضافة `react-query` أو `swr` للتخزين المؤقت

### Stage 3: قابلية الوصول والتجربة
- [ ] إضافة `skip-to-content` link
- [ ] إضافة `aria-live` للـ notifications
- [ ] إضافة `role` و `aria-label` على landmarks
- [ ] دعم `prefers-color-scheme` (dark/light)
- [ ] إضافة `prefers-reduced-motion` guard
- [ ] تعديل `ErrorBoundary` لإخفاء التفاصيل في الإنتاج

### Stage 4: البنية والتطوير
- [ ] إضافة `.dockerignore`
- [ ] إزالة `build/` من git
- [ ] إضافة `HEALTHCHECK` في `Dockerfile`
- [ ] إضافة Service Worker (PWA)
- [ ] إضافة offline request queue
- [ ] إضافة per-route Error Boundaries
- [ ] إضافة request caching (SWR/React Query)
- [ ] إضافة input sanitization layer

### Stage 5: البناء والنشر
- [ ] تعديل `nginx.conf` (cache headers, Brotli, HTTP/2)
- [ ] تعديل `Dockerfile` (pin Node version, .dockerignore)
- [ ] إضافة `manifest.json` corrections
- [ ] إضافة OG image (PNG/JPG بدلاً من SVG)

---

## الملفات التي سيتم إنشاؤها/تعديلها

### جديدة
- `src/utils/csrf.js` — CSRF token manager
- `src/utils/sanitizer.js` — DOMPurify wrapper
- `src/utils/cache.js` — Request caching layer
- `src/utils/offlineQueue.js` — Offline request queue
- `src/components/RouteErrorBoundary.jsx` — Per-route error boundary
- `src/components/SkipToContent.jsx` — Accessibility skip link
- `src/hooks/useNetworkStatus.js` — Network status hook
- `public/service-worker.js` — PWA service worker
- `.dockerignore` — Docker ignore rules

### تعديلات
- `index.html` — CSP, skip link, prefetch, OG image
- `vite.config.js` — define fix, build optimization
- `src/index.js` — global styles to CSS, font variable
- `src/index.css` — prefers-color-scheme, prefers-reduced-motion
- `src/App.js` — aria-live, landmarks, route error boundaries
- `src/AuthenticatedShell.js` — React.lazy conversion
- `nginx.conf` — CSP, remove X-XSS-Protection, cache, Brotli, HTTP/2
- `Dockerfile` — HEALTHCHECK, pin Node, .dockerignore
- `public/manifest.json` — theme color fix

---

## التحقق (Verification)
- [ ] `npm run lint` pasa بدون أخطاء
- [ ] `npm run build` ينجح
- [ ] `npm run test` يجتاز
- [ ] Lighthouse score > 90 (Performance, Accessibility, Best Practices, SEO)
- [ ] CSP validator يقبل الإعدادات
- [ ] No secrets in bundle (source-map-explorer)
