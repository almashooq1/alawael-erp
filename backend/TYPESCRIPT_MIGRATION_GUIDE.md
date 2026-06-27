# دليل الترحيل التدريجي إلى TypeScript
# ═══════════════════════════════════════════════════════
# 
# الهدف: تحويل المشروع تدريجياً من JavaScript إلى TypeScript
# بدون تعطيل أي وظيفة موجودة.
#
# المراحل:
#   1. السماح بـ TypeScript (تهيئة tsconfig.json) ✅ مكتمل
#   2. تحويل الـ Models (الأكثر تأثيراً)
#   3. تحويل الـ Services
#   4. تحويل الـ Controllers
#   5. تحويل الـ Routes
#   6. تحويل Middleware
#   7. تحويل الـ Utils
#
# النهج: 
#   - ملف تلو الآخر (File by file)
#   - rename .js → .ts
#   - إضافة الأنواع (types) تدريجياً
#   - `allowJs: true` يبقي JavaScript يعمل
#   - `checkJs: false` يمنع أخطاء في ملفات JS القديمة
#
# ─── المرحلة 1: تهيئة TypeScript (✅ مكتمل) ───────────────────────
# تم إنشاء:
#   • tsconfig.json — إعدادات TypeScript
#   • .nvmrc — يشير إلى Node 20
#
# ─── المرحلة 2: تحويل الـ Models (الأولوية القصوى) ──────────────
# لماذا Models أولاً؟
#   • كل شيء يعتمد عليها (services, controllers, routes)
#   • الأخطاء في الأنواع تظهر هنا أولاً
#   • Mongoose schemas معرفة بوضوح
#
# الخطوات:
#   1. ابدأ بـ Model بسيط (مثل User أو Setting)
#   2. أنشئ ملف .d.ts لـ Mongoose (Declaration file)
#   3. حول الـ Model إلى .ts مع أنواع واضحة
#   4. اختبر أن الـ Model يعمل (npm run test:core)
#   5. انتقل إلى Model التالي
#
# ─── المرحلة 3: تحويل الـ Services ──────────────────────────────
# بعد Models:
#   • Services تعتمد على Models
#   • Functions واضحة المدخلات والمخرجات
#   • سهلة لإضافة أنواع (types)
#
# ─── المرحلة 4: تحويل الـ Controllers ──────────────────────────
# بعد Services:
#   • Controllers تعتمد على Services
#   • (req, res) → Express types معروفة
#
# ─── الأدوات المساعدة ───────────────────────────────────────────
# npm install -D typescript @types/node @types/express @types/mongoose
# npx tsc --init (إذا لم يكن tsconfig.json موجود)
# npx tsc --noEmit (فحص الأنواع بدون إخراج)
#
# ─── التحقق من الترحيل ──────────────────────────────────────────
# npm run typecheck — يشغل tsc --noEmit
# npm run typecheck:watch — يشغل tsc --watch --noEmit
#
# ─── ملاحظات مهمة ──────────────────────────────────────────────
# 1. لا تُحوّل كل شيء دفعة واحدة — استخدم "allowJs: true"
# 2. الـ Type Definitions (d.ts) أهم من التحويل الكامل
# 3. استخدم "any" بشكل مؤقت فقط (TODO: تحويل لاحقاً)
# 4. اختبر بعد كل ملف — "npm run test:core"
# 5. استخدم ESLint + Prettier مع TypeScript
#
# ─── الجدول الزمني المُقترح ──────────────────────────────────────
# الأسبوع 1-2: Models (20-30 ملف)
# الأسبوع 3-4: Services (30-40 ملف)
# الأسبوع 5-6: Controllers (20-30 ملف)
# الأسبوع 7-8: Routes + Middleware (15-20 ملف)
# الأسبوع 9-10: Utils + Config (10-15 ملف)
# الأسبوع 11-12: اختبارات + مراجعة
#
# ─── الهدف النهائي ──────────────────────────────────────────────
# 100% TypeScript coverage
# Zero "any" types (أو أقل من 5%)
# Strict mode enabled
# Type-safe APIs
#
# ═════════════════════════════════════════════════════════════════
