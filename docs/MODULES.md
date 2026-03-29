# Al-Awael ERP — Module Map v3.1.0
> خريطة الوحدات الكاملة للنظام — 127 وحدة backend + 80+ صفحة frontend

---

## نظرة عامة

| الطبقة | المحتوى | العدد |
|--------|---------|-------|
| Backend Routes | وحدات API مسجّلة في `_registry.js` | 127 وحدة |
| Frontend Pages | صفحات React في `src/pages/` | 80+ صفحة |
| Mongoose Models | نماذج قاعدة البيانات | 350+ نموذج |
| Services | طبقة الأعمال | 60+ خدمة |
| Jest Tests | اختبارات | 9409 اختبار |

---

## Backend — المسارات حسب النطاق

### 🏛️ 1. النواة الأساسية (Core)
| المسار | النقطة الرئيسية | الوصف |
|--------|----------------|-------|
| `/api/auth` | `auth.routes.js` | تسجيل الدخول، تسجيل الخروج، تحديث الـ token |
| `/api/users` | `users.routes.js` | إدارة المستخدمين، صلاحيات RBAC |
| `/api/modules` | `modules.routes.js` | تفعيل/تعطيل وحدات النظام |
| `/api/health` | `health.routes.js` | فحص صحة النظام (liveness/readiness) |
| `/api/cache-stats` | `cache.config.js` | إحصائيات Redis + in-memory cache |
| `/api-docs` | `swagger.js` | توثيق Swagger UI |

### 🏥 2. المستفيدون وإدارة الحالات (Beneficiaries)
| المسار | الوصف |
|--------|-------|
| `/api/beneficiaries` | إدارة المستفيدين — CRUD كامل |
| `/api/students` | بيانات الطلاب وملفاتهم |
| `/api/student-portal/extended` | بوابة الطالب الموسّعة (6 وحدات) |
| `/api/care-plans` | خطط الرعاية الفردية |
| `/api/assessments` | تقييمات CRUD + workflow (10 نقاط نهاية) |
| `/api/early-intervention` | التدخل المبكر للأطفال 0-3 سنوات |
| `/api/discharge-plans` | خطط الخروج والتحويل |

### 🦽 3. نظام التأهيل (Rehabilitation)
| المسار | الوصف |
|--------|-------|
| `/api/rehabilitation-plans` | خطط التأهيل (16 نقطة نهاية — CRUD، أهداف SMART، AI) |
| `/api/rehab/disability-dashboard` | لوحة تأهيل ذوي الإعاقة |
| `/api/rehab/expansion` | توسعات التأهيل (120+ نقطة — 10 أنظمة) |
| `/api/rehab/pro` | تأهيل متخصص (150+ نقطة — 12 نظام) |
| `/api/rehab/center-licenses` | تراخيص مراكز التأهيل (60+ نقطة) |
| `/api/icf-assessments` | تقييمات ICF وفق معايير WHO |
| `/api/post-rehab-followup` | متابعة ما بعد التأهيل (25+ نقطة) |
| `/api/independent-living` | برامج المعيشة المستقلة (30+ نقطة) |
| `/api/mhpss` | الدعم النفسي والاجتماعي (35+ نقطة) |
| `/api/mdt` | تنسيق الفريق متعدد التخصصات (65+ نقطة) |
| `/api/research-evidence` | البحث والممارسة المستندة للأدلة (35+ نقطة) |
| `/api/tele-rehabilitation` | التأهيل عن بعد (telehealth) |
| `/api/disability-cards` | بطاقة الإعاقة والتصنيف — MOHR، أبشر |
| `/api/assistive-devices` | الأجهزة المساعدة |
| `/api/therapy/sessions` | جلسات العلاج |
| `/api/therapy/sessions/analytics` | تحليلات جلسات العلاج (13+ نقطة) |
| `/api/scales/specialized` | مقاييس التأهيل المتخصصة |
| `/api/ar-therapy` | العلاج بالواقع المعزز AR/XR |
| `/api/disability-rights` | حقوق ذوي الإعاقة |

### 👨‍💼 4. الموارد البشرية (HR)
| المسار | الوصف |
|--------|-------|
| `/api/hr/employee-affairs` | شؤون الموظفين (30+ نقطة) |
| `/api/hr/employee-affairs/expanded` | موسّع (60+ نقطة) |
| `/api/hr/employee-affairs/phase2` | المرحلة 2 (80+ نقطة) |
| `/api/hr/employee-affairs/phase3` | المرحلة 3 (50+ نقطة) |
| `/api/hr/smart` | ذكاء اصطناعي HR (35+ نقطة) |
| `/api/hr/attendance` | حضور وانصراف (20+ نقطة) |
| `/api/workforce-analytics` | تحليلات القوى العاملة |
| `/api/learning-development` | التعلم والتطوير |
| `/api/recruitment` | التوظيف والاستقطاب |

### 💰 5. المالية والفواتير (Finance)
| المسار | الوصف |
|--------|-------|
| `/api/finance/operations` | العمليات المالية |
| `/api/saudi-tax` | الضريبة السعودية (ZATCA) |
| `/api/rcm` | إدارة دورة الإيرادات |
| `/api/insurance/claims` | مطالبات التأمين |
| `/api/insurance/treatment-auth` | تفويض العلاج التأميني |
| `/api/billing` | الفواتير والمدفوعات |
| `/api/zakat` | الزكاة |

### 🌿 6. الصحة والعيادة (Clinical)
| المسار | الوصف |
|--------|-------|
| `/api/emr` | السجل الطبي الإلكتروني |
| `/api/pharmacy` | إدارة الصيدلية |
| `/api/appointment-scheduling` | جدولة المواعيد |
| `/api/medical-equipment` | الأجهزة الطبية |
| `/api/medical-referrals` | الإحالات الطبية |
| `/api/nutrition-plans` | خطط التغذية |
| `/api/medication-records` | سجلات الأدوية |

### 🤖 7. الذكاء الاصطناعي (AI/ML)
| المسار | الوصف |
|--------|-------|
| `/api/ai/diagnostic` | التشخيص بالذكاء الاصطناعي |
| `/api/ai/recommendations` | توصيات ذكية للمستخدمين |
| `/api/ai/notifications` | إشعارات ذكية |
| `/api/ml` | نماذج Machine Learning |
| `/api/smart-irp` | خطط التعافي الذكية |
| `/api/smart-notifications` | محرك الإشعارات الذكية |

### 🏢 8. إدارة الفروع (Branch Management)
| المسار | الوصف |
|--------|-------|
| `/api/branches` | إدارة الفروع (25+ نقطة نهاية) |
| `/api/branches/hq` | لوحة تحكم المقر الرئيسي |
| `/api/branches/comparison` | مقارنة أداء الفروع |
| `/api/branches/:id/dashboard` | لوحة الفرع المحددة |
| `/api/branches/:id/staff` | موظفو الفرع |
| `/api/branches/:id/reports` | تقارير الفرع |

### 📊 9. التحليلات والتقارير (Analytics)
| المسار | الوصف |
|--------|-------|
| `/api/analytics/advanced` | تحليلات متقدمة |
| `/api/executive-dashboard` | لوحة القيادة التنفيذية |
| `/api/ceo-dashboard` | لوحة الرئيس التنفيذي |
| `/api/bi-dashboard` | لوحة ذكاء الأعمال (KPIs, trends) |
| `/api/report-builder` | منشئ التقارير المخصصة |
| `/api/import-export` | استيراد/تصدير البيانات |
| `/api/quality-management` | إدارة الجودة والاعتماد |

### 🏗️ 10. الإدارة والعمليات (Operations)
| المسار | الوصف |
|--------|-------|
| `/api/admin/communications` | المراسلات الإدارية (42+ نقطة) |
| `/api/admin/communications/enhanced` | موسّعة (signatures, QR, stamps) |
| `/api/strategic-planning` | التخطيط الاستراتيجي |
| `/api/complaints` | إدارة الشكاوى |
| `/api/facilities` | إدارة المرافق |
| `/api/meetings` | اجتماعات وقرارات |
| `/api/visitors` | نظام الزوار |
| `/api/maintenance/tasks` | صيانة المعدات |
| `/api/maintenance/predictions` | صيانة تنبؤية بالذكاء الاصطناعي |
| `/api/inventory/warehouse` | المستودعات والمخزون |
| `/api/events` | الفعاليات والأنشطة |
| `/api/helpdesk` | خدمة العملاء |
| `/api/hse` | الصحة والسلامة المهنية |

### 🌐 11. التكامل الحكومي (Gov Integration)
| المسار | الوصف |
|--------|-------|
| `/api/noor` | تكامل نظام نور التعليمي |
| `/api/gov/mudad` | حماية الأجور — مدد |
| `/api/gov/taqat` | تكامل منصة طاقات |
| `/api/disability-authority` | هيئة الأشخاص ذوي الإعاقة + CBAHI |
| `/api/gosi` | التأمينات الاجتماعية |
| `/api/qiwa` | منصة قوى |
| `/api/moi-passport` | بيانات الجوازات (وزارة الداخلية) |

### 📱 12. التواصل والإشعارات (Communication)
| المسار | الوصف |
|--------|-------|
| `/api/whatsapp` | تكامل واتساب (24+ نقطة) |
| `/api/whatsapp/enhanced` | موسّع (87+ نقطة) |
| `/api/chat` | نظام المحادثة الداخلي |
| `/api/notifications/portal` | إشعارات بوابة الموظف |
| `/api/family/satisfaction-surveys` | استبيانات رضا الأسر |
| `/api/family-communications` | التواصل مع الأسر |

### 🎮 13. الترفيه التعليمي (Gamification/E-Learning)
| المسار | الوصف |
|--------|-------|
| `/api/gamification` | نقاط، شارات، ألعاب تعليمية |
| `/api/rehab/gamification` | ألعاب التأهيل العلاجية |
| `/api/library` | مكتبة المصادر والكتب |
| `/api/elearning` | التعلم الإلكتروني |

### 🔐 14. الأمان والنظام (Security & System)
| المسار | الوصف |
|--------|-------|
| `/api/otp-auth` | المصادقة بكلمة مرور لمرة واحدة |
| `/api/tenants` | إدارة المستأجرين (Multi-tenant) |
| `/api/api-keys` | إدارة مفاتيح API |
| `/api/subscriptions` | الاشتراكات والتراخيص |
| `/api/audit` | سجل التدقيق |
| `/api/incidents` | إدارة الحوادث الأمنية |
| `/api/policies` | سياسات الوصول |
| `/api/rate-limit-waf` | WAF وتحديد المعدل |
| `/api/cache-management` | إدارة الذاكرة المؤقتة |
| `/api/system-settings` | إعدادات النظام |
| `/api/automated-backup` | النسخ الاحتياطي التلقائي |

### ⚙️ 15. البنية التحتية (Infrastructure)
| المسار | الوصف |
|--------|-------|
| `/api/v2/event-store` | EventStore — نمط Event Sourcing |
| `/api/v2/message-queue` | طابور الرسائل (NATS / in-memory) |
| `/api/v2/migrations` | إدارة هجرات قاعدة البيانات |
| `/api/v2/integration-bus` | حافلة التكامل بين الوحدات |
| `/api/performance` | أداء النظام وتحسينه |
| `/api/database` | إحصائيات قاعدة البيانات |
| `/api/system-optimization` | تحسين النظام تلقائياً |

---

## Frontend — الصفحات حسب النطاق

### المسارات الرئيسية (`App.jsx`)
```
/ → Dashboard (الرئيسية)
/login → صفحة الدخول
/rehab/* → نظام التأهيل (RehabRoutes.jsx)
/beneficiaries → المستفيدون
/sessions/* → الجلسات العلاجية
/hr/* → الموارد البشرية
/finance/* → المالية
/branches/* → الفروع
/reports/* → التقارير
/admin/* → الإدارة
```

### وحدات الصفحات الرئيسية
| المجلد | الصفحات | الوحدة |
|--------|---------|-------|
| `pages/rehab/` | DisabilityRehabDashboard, TherapySessionAdmin, ... | نظام التأهيل |
| `pages/RehabDashboard.jsx` | لوحة التأهيل المتكاملة | التأهيل الشامل |
| `pages/Sessions/` | إدارة الجلسات + Analytics | الجلسات |
| `pages/Beneficiaries/` | قائمة المستفيدين، الملفات | المستفيدون |
| `pages/hr/` | HR modules (10+ صفحات) | الموارد البشرية |
| `pages/enterprise-plus/` | EHS, ITSM, Vendor Management | المؤسسات الكبرى |
| `pages/enterprise-ultra/` | BI, Sustainability, Digital Transform | المستوى المتقدم |
| `pages/SpecializedRehab/` | برامج التأهيل المتخصصة | التأهيل المتخصص |
| `pages/Operations/` | Internal Audit, Rehab Licenses | العمليات |
| `pages/noor/` | NoorDashboard | تكامل نور |
| `pages/gosi/` | GosiDashboard | التأمينات |
| `pages/qiwa/` | QiwaDashboard | منصة قوى |
| `pages/guardian/` | GuardianPortalDashboard | بوابة أولياء الأمور |
| `pages/familySatisfaction/` | FamilySatisfactionDashboard | رضا الأسرة |
| `pages/postRehab/` | PostRehabFollowupDashboard | متابعة ما بعد التأهيل |
| `pages/workflow/` | WorkflowAnalytics | تحليلات سير العمل |
| `pages/quality-management/` | QualityManagement | الجودة |

---

## خريطة التكامل (Integration Map)

```
Frontend (port 3002)
      │
      │  HTTP/REST   (REACT_APP_API_URL = localhost:3001/api)
      │  WebSocket   (REACT_APP_WS_URL  = ws://localhost:3001)
      ▼
Backend API (port 3001)
      │
      ├── MongoDB (port 27017) ──── قاعدة البيانات الرئيسية
      ├── Redis (port 6379)   ──── تخزين مؤقت (معطّل في dev)
      ├── NATS / in-memory    ──── طابور الرسائل
      └── External APIs ──────────  ZATCA, Noor, GOSI, Qiwa, MOI
```

---

## أنماط البنية

### نمط Controller (Backend)
```
Route → Middleware (auth, rbac, validate) → Controller → Service → Model → MongoDB
```

### نمط الصفحة (Frontend)
```
Route (lazy) → ErrorBoundary → Page → API Service (axios) → Backend
```

### نمط المصادقة
```
Login → JWT (15min) + RefreshToken (24h) → Auto-refresh on 401 → Logout
```

---

## ملاحظات المطوّر

| الأمر | الوصف |
|-------|-------|
| `npm run dev:all` | تشغيل Backend + Frontend |
| `npm run routes` | عرض جميع المسارات المسجّلة |
| `npm run stats` | إحصائيات المشروع |
| `npm run lint:all` | فحص جودة الكود |
| `npm test` | تشغيل 9409 اختبار |
| `ENABLE_SWAGGER=true` | Swagger UI على `/api-docs` |

---

*آخر تحديث: v3.1.0 — 2026-03-29*
