# خطة التطوير الشاملة — Al-Awael ERP
## النهج الذكي: Quick Wins أولاً، ثم التدرج للأعمال الثقيلة

**الهدف:** تطبيق 7 مجالات تحسين بترتيب يعطي أقصى return على investment  
**الاستراتيجية:** كل Stage يبني على السابق + يعطي قيمة فورية

---

## Stage 0: التأسيس (30 دقيقة)
- [x] إنشاء plan.md
- [x] إعداد بيئة العمل
- [ ] إنشاء `.env.test` للـ backend
- [ ] إنشاء `.env.test` للـ frontend

---

## Stage 1: React Query — Quick Win (2 ساعات) 🔥
**لماذا أولاً:** يعطي فوراً: caching ذكي، background refetch، optimistic updates. يحل مشكلة `cache.js` اليدوي. يُزيل docenas من `useEffect` + `useState`.

- [ ] تثبيت `@tanstack/react-query` + `@tanstack/react-query-devtools`
- [ ] إنشاء `src/providers/QueryProvider.jsx`
- [ ] تحويل `dashboardAPI` (5 دوال) إلى React Query hooks
- [ ] تحويل `modulesAPI` (2 دالتين) إلى React Query hooks
- [ ] تحويل `searchAPI` (3 دوال) إلى React Query hooks
- [ ] تحويل `rbacAPI` (5 دوال) إلى React Query hooks
- [ ] حذف `cache.js` (أو إهماله)
- [ ] التحقق: لا يوجد regression في Dashboard

**القيمة الفورية:**
- Dashboard لا يُعيد جلب البيانات في كل navigation
- Invalidation تلقائي عند mutation
- Background refetch للبيانات القديمة

---

## Stage 2: Testing Foundation (3 ساعات) 🔥
**لماذا ثانياً:** بدون testing foundation، كل تعديل لاحق خطر. نبني الأساس أولاً.

### الجزء أ: Backend API Tests (ساعة ونصف)
- [ ] إنشاء `tests/api/health.test.js` — فحص `/health`, `/api/v1/health`
- [ ] إنشاء `tests/api/auth.test.js` — login, logout, refresh token
- [ ] إنشاء `tests/api/dashboard.test.js` — summary, services, KPIs
- [ ] إنشاء `tests/api/rbac.test.js` — roles, permissions
- [ ] إنشاء `tests/api/crud.test.js` — generic CRUD test helper
- [ ] تحديث `package.json` test script ليستبعد `passWithNoTests`

### الجزء ب: Frontend Unit Tests (ساعة ونصف)
- [ ] اختبار `utils/csrf.js` — getCsrfToken, attachCsrfToken
- [ ] اختبار `utils/sanitizer.js` — sanitizeHtml, sanitizeText, sanitizeUrl
- [ ] اختبار `utils/cache.js` — get, set, invalidate (أو React Query equivalent)
- [ ] اختبار `utils/tokenStorage.js` — getToken, setToken, clearAuthData
- [ ] اختبار `hooks/useNetworkStatus.js` — online/offline toggling
- [ ] اختبار `components/AccessibilityWidget.jsx` — toggle prefs

**القيمة الفورية:**
- Confidence في كل تغيير لاحق
- regression catching تلقائي
- CI/CD يمكنه رفض PRs بـ broken tests

---

## Stage 3: DB Migrations — Quick Win (ساعة) 🟢
**لماذا ثالثاً:** سريع، سهل، ويمنع كوارث المستقبل.

- [ ] تثبيت `migrate-mongo`
- [ ] إنشاء `migrations/` directory
- [ ] إنشاء migration للـ indexes الجديدة (14 index)
- [ ] إنشاء migration لتعيين `default values` للحقول الجديدة
- [ ] إنشاء `migrations.config.js`
- [ ] إضافة `npm run migrate` script
- [ ] إضافة `npm run migrate:down` (rollback)
- [ ] توثيق workflow في `README.md`

**القيمة الفورية:**
- كل بيئة (dev, staging, prod) تبدأ بنفس الـ schema
- Rollback ممكن إذا فشل migration
- onboarding جديد يعرف كيف يُنشئ database

---

## Stage 4: TypeScript — التدرج الذكي (1 أسبوع) 🔥
**لماذا رابعاً:** الآن لدينا tests (Stage 2) لنتحقق من أن التحويل لا يكسر شيئاً.

### Week 1 — Foundation (يومان)
- [ ] تثبيت TypeScript + types (`@types/react`, `@types/react-dom`, etc.)
- [ ] إنشاء `tsconfig.json` (`allowJs: true`, `checkJs: true`)
- [ ] إنشاء `types/` directory — shared types
- [ ] تعريف `User`, `AuthToken`, `ApiResponse` interfaces
- [ ] تحويل `utils/tokenStorage.js` → `tokenStorage.ts`
- [ ] تحويل `utils/csrf.js` → `csrf.ts`
- [ ] تحويل `utils/sanitizer.js` → `sanitizer.ts`

### Week 1 — API Layer (يومان)
- [ ] تعريف `ApiResponse<T>`, `PaginatedResponse<T>` generics
- [ ] تحويل `services/api.js` → `api.ts` (مع types لكل endpoint)
- [ ] تحويل `services/api.client.js` → `api.client.ts`
- [ ] تحويل React Query hooks إلى TypeScript

### Week 1 — Components (يوم)
- [ ] تحويل `components/AccessibilityWidget.jsx` → `.tsx`
- [ ] تحويل `components/RouteErrorBoundary.jsx` → `.tsx`
- [ ] تحويل `components/SafeRouteWrapper.jsx` → `.tsx`
- [ ] تحويل `hooks/useNetworkStatus.js` → `.ts`

**القيمة الفورية:**
- IDE autocomplete لكل props و functions
- Catch bugs في compile time (قبل runtime)
- refactoring آمن بـ confidence

---

## Stage 5: Mobile PWA — تجربة المستخدم (3 أيام) 🟡
**لماذا خامساً:** الآن لدينا foundation قوية (React Query + TypeScript + Tests). نبني على الأساس.

- [ ] Responsive audit: فحص كل صفحة على 375px
- [ ] إنشاء `src/components/MobileLayout/` — mobile-optimized layout
- [ ] تحويل `Sidebar` إلى collapsible (hamburger menu)
- [ ] Touch targets ≥ 44×44px في كل الأزرار
- [ ] Offline queue: تحويل كل الـ mutations (POST/PUT/DELETE) إلى queue
- [ ] Push notifications: إعداد service worker للـ push
- [ ] Add to Home Screen: تحسين manifest.json + installation prompt
- [ ] Lighthouse mobile audit: target > 90

**القيمة الفورية:**
- 60%+ من المستخدمين يمكنهم استخدام النظام على mobile
- Offline mode يعمل فعلاً (ليس فقط GET)
- push notifications للـ alerts الحرجة

---

## Stage 6: Documentation & Storybook (2 أيام) 🟢
**لماذا سادساً:** الآن لدينا components نظيفة (TypeScript) ويمكن توثيقها.

- [ ] تثبيت Storybook
- [ ] إنشاء stories لـ 10 الأكثر استخداماً:
  - `LoadingSkeleton`, `Button`, `Modal`, `Table`, `FormField`, `Card`, `Notification`, `Badge`, `Avatar`, `Tooltip`
- [ ] إنشاء `docs/API.md` — توثيق endpoints (من Swagger)
- [ ] إنشاء `docs/ARCHITECTURE.md` — نظرة عامة على الـ architecture
- [ ] إنشاء `docs/ONBOARDING.md` — دليل المطور الجديد
- [ ] إنشاء `docs/DEPLOYMENT.md` — خطوات النشر
- [ ] إنشاء `docs/adr/` — 5 ADRs (MongoDB, Tailwind, React Query, etc.)

**القيمة الفورية:**
- مطور جديد يُنتج في أسبوع بدلاً من شهر
- designers يمكنهم رؤية components بدون تشغيل التطبيق
- decisions موثقة (لا يعيد أحد اختراع العجلة)

---

## Stage 7: Architecture Refactoring — Domain Splitting (2 أسابيع) 🟡
**لماذا أخيراً:** هذا الأكثر تعقيداً. نحتاج كل ما سبق (Tests, TypeScript, React Query) لنفعله بـ confidence.

- [ ] إنشاء `modules/` directory — كل domain في module مستقل
- [ ] Module 1: `modules/auth/` — كل شيء يتعلق بالمصادقة
- [ ] Module 2: `modules/dashboard/` — KPIs, charts, analytics
- [ ] Module 3: `modules/hr/` — employees, attendance, payroll
- [ ] Module 4: `modules/finance/` — invoices, ZATCA, budgets
- [ ] Module 5: `modules/rehab/` — beneficiaries, sessions, care plans
- [ ] إنشاء barrel files (`modules/*/index.js`) لتبسيط الـ imports
- [ ] تحديث `vite.config.js` manualChunks ليعكس الـ modules
- [ ] Module Federation (اختياري: إذا كان المشروع يتطور إلى micro-frontends)

**القيمة الفورية:**
- build أسرع (فقط module المتغير يُعاد بناؤه)
- teams مختلفة يمكنها العمل على modules مختلفة بدون conflict
- loading أسرع (user يحمّل فقط module الذي يحتاجه)

---

## Timeline المقترح

| الأسبوع | Stage | المخرجات |
|---------|-------|---------|
| اليوم | Stage 0 + 1 | React Query يعمل في Dashboard |
| اليوم 2-3 | Stage 2 | 10+ tests تمر في CI |
| اليوم 4 | Stage 3 | `npm run migrate` يعمل |
| الأسبوع 2 | Stage 4 | 10 ملفات TypeScript تعمل |
| الأسبوع 3 | Stage 5 | Mobile layout يعمل على 375px |
| الأسبوع 4 | Stage 6 | Storybook + docs يعملان |
| الأسبوع 5-6 | Stage 7 | 5 modules منفصلة |

---

## قواعد الذهب للتنفيذ

1. **لا نحذف أبداً:** كل ملف قديم يُبقي copy (`.js.bak`) حتى نتأكد من أن الجديد يعمل
2. **test قبل refactor:** كل تغيير يجب أن يمر بـ tests موجودة (أو جديدة)
3. **commit صغير:** كل stage يكون commit واحد (أو أكثر) بوصف واضح
4. **rollback جاهز:** إذا فشل أي شيء، نسترجع خلال 5 دقائق
5. **merge يومي:** لا نبقي branch مفتوحاً أكثر من يومين

---

## النتيجة النهائية المتوقعة

بعد 6 أسابيع:
- ✅ React Query يدير كل الـ data fetching
- ✅ 50+ test يمر في CI
- ✅ Migrations منظمة وقابلة للـ rollback
- ✅ 20+ ملف TypeScript
- ✅ Mobile layout يعمل على جميع الأجهزة
- ✅ Storybook + docs يعملان
- ✅ 5 modules مستقلة
- ✅ المشروع جاهز للـ team scaling

**الجلسة القادمة:** نبدأ Stage 1 (React Query) مباشرة!
