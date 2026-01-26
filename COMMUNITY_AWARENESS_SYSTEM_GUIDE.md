# 📚 نظام التوعية المجتمعية - وثائق شاملة

## 🎯 نظرة عامة

نظام التوعية المجتمعية المتكامل يوفر منصة شاملة لإدارة المحتوى التعليمي والندوات والورش الافتراضية والمكتبة الرقمية مع نظام اشتراكات متقدم.

---

## 📋 جدول المحتويات

1. [المميزات الرئيسية](#المميزات-الرئيسية)
2. [نماذج قاعدة البيانات](#نماذج-قاعدة-البيانات)
3. [API Endpoints](#api-endpoints)
4. [مكونات React](#مكونات-react)
5. [أمثلة الاستخدام](#أمثلة-الاستخدام)
6. [الإحصائيات والتقارير](#الإحصائيات-والتقارير)

---

## 🌟 المميزات الرئيسية

### 1. 📖 إدارة المحتوى التعليمي
- **أنواع محتوى متعددة**: مقالات، فيديوهات، صوتيات، ملفات PDF، رسومات توضيحية
- **فئات إعاقة**: تصنيف حسب الإعاقة البصرية، السمعية، الحركية، الذهنية، والنفسية
- **مميزات إمكانية الوصول**: ترجمة نصية، وصف صوتي، نص كبير، مترجم لغة إشارة
- **نظام التقييم**: تقييمات المستخدمين وحساب المتوسط
- **إحصائيات المحتوى**: عدد المشاهدات والتنزيلات والمشاركات

### 2. 🎥 الندوات والورش الافتراضية
- **أنواع جلسات**: ندوات، ورش عمل، تدريب، استشارات، مجموعات نقاش
- **إدارة التسجيلات**: تسجيل المشاركين، إلغاء التسجيل، معالجة الحد الأقصى للمشاركين
- **معلومات المتحدثين**: بيانات المحاضر والمساعدين والمتحدثين الضيوف
- **جدول أعمال تفصيلي**: تقسيم الجلسة إلى موضوعات بأوقات محددة
- **خدمات إمكانية الوصول**: مترجم لغة إشارة، ترجمة فورية، وصف صوتي
- **التقييم والتعليقات**: جمع ردود الفعل والتقييمات من المشاركين
- **التسجيل والأرشفة**: حفظ الجلسات للعودة إليها لاحقاً

### 3. 📚 المكتبة الرقمية
- **أنواع موارد متعددة**: كتب، أدلة، مقالات، أوراق بحثية، دراسات حالة
- **البحث المتقدم**: بحث نصي كامل والبحث الغامض (fuzzy search)
- **الفلترة حسب الفئات**: تصفية حسب نوع المورد، لغة، فئة الإعاقة
- **مقاييس الاستخدام**: عدد المشاهدات والتنزيلات والمشاركات والتقييمات
- **الموارد ذات الصلة**: اقتراحات موارد ذات علاقة
- **إدارة التعليقات**: تقييمات وتعليقات المستخدمين مع حساب المتوسط

### 4. 💳 نظام الاشتراكات
- **خطط اشتراك متدرجة**: مجاني، أساسي، متقدم، مؤسسي
- **مميزات مخصصة**: تحكم كامل على المميزات لكل خطة
- **إدارة الفترات التجريبية**: خطط تجريبية مجانية محددة المدة
- **إدارة التجديد التلقائي**: تجديد سهل وآمن للاشتراكات
- **برنامج الإحالة**: كود إحالة ومكافآت للعملاء الجدد
- **سجل الدفع**: تتبع كامل للمدفوعات والرسوم
- **إدارة الترقيات**: ترقية سهلة بين الخطط

---

## 📊 نماذج قاعدة البيانات

### 1. EducationalContent (المحتوى التعليمي)

```javascript
{
  title: String,              // عنوان المحتوى
  description: String,        // وصف تفصيلي
  contentType: String,        // article, video, audio, pdf, infographic, interactive
  disabilityCategory: String, // visual, hearing, mobility, intellectual, psychosocial, multiple, general
  contentUrl: String,         // رابط المحتوى
  thumbnailUrl: String,       // صورة مصغرة
  duration: Number,           // المدة بالدقائق
  level: String,              // beginner, intermediate, advanced
  author: ObjectId,           // المؤلف (مرجع للمستخدم)
  tags: [String],             // كلمات مفتاحية
  views: Number,              // عدد المشاهدات
  rating: {
    average: Number,          // متوسط التقييم
    count: Number             // عدد التقييمات
  },
  isPublished: Boolean,       // منشور أم لا
  publishedAt: Date,          // تاريخ النشر
  accessibilityFeatures: {
    subtitles: Boolean,
    signLanguageInterpreter: Boolean,
    audioDescription: Boolean,
    captions: Boolean,
    easyLanguage: Boolean,
    largeText: Boolean
  },
  status: String,             // draft, pending_review, approved, rejected
  createdAt: Date,
  updatedAt: Date
}
```

### 2. VirtualSession (الجلسات الافتراضية)

```javascript
{
  title: String,
  description: String,
  sessionType: String,        // workshop, webinar, training, consultation, discussion_group
  targetDisabilityCategory: String,
  instructor: ObjectId,       // المحاضر
  coInstructors: [ObjectId],  // المساعدون
  scheduledDate: Date,        // موعد الجلسة
  duration: Number,           // المدة بالدقائق
  maxParticipants: Number,
  currentParticipants: Number,
  meetingLink: String,        // رابط الاجتماع
  platform: String,           // zoom, teams, jitsi, google_meet, youtube_live
  language: String,           // ar, en, fr
  accessibilityServices: {
    arabicSignLanguageInterpreter: Boolean,
    liveSubtitles: Boolean,
    arabicSubtitles: Boolean,
    audioDescription: Boolean,
    recordingAvailable: Boolean
  },
  agenda: [{
    time: String,
    topic: String,
    duration: Number
  }],
  registrations: [{
    userId: ObjectId,
    registrationDate: Date,
    status: String            // registered, attended, no_show, cancelled
  }],
  status: String,             // draft, scheduled, ongoing, completed, cancelled
  recordingUrl: String,
  feedback: [{
    userId: ObjectId,
    rating: Number,           // 1-5
    comment: String,
    date: Date
  }],
  statistics: {
    registeredCount: Number,
    attendedCount: Number,
    averageRating: Number
  }
}
```

### 3. DigitalLibrary (المكتبة الرقمية)

```javascript
{
  title: String,
  description: String,
  resourceType: String,       // book, guide, article, research_paper, case_study, toolkit, template, tool
  disabilityCategories: [String],
  author: Object,             // { name, organization, email }
  uploader: ObjectId,
  fileUrl: String,
  fileType: String,           // pdf, doc, xlsx, video, audio, image, link
  fileSize: Number,
  language: String,           // ar, en, fr, multilingual
  publicationDate: Date,
  publisher: String,
  categories: [String],
  tags: [String],
  keywords: [String],
  accessibilityFormat: {
    hasBraille: Boolean,
    hasLargeText: Boolean,
    hasArabicSignLanguageInterpretation: Boolean,
    hasAudioVersion: Boolean,
    isScreenReaderFriendly: Boolean
  },
  isPublic: Boolean,
  views: Number,
  downloads: Number,
  rating: {
    average: Number,
    count: Number
  },
  reviews: [{
    userId: ObjectId,
    rating: Number,
    comment: String,
    date: Date
  }],
  status: String,             // draft, pending_review, approved, archived
  license: String             // cc_by, cc_by_sa, cc_by_nc, cc0, proprietary
}
```

### 4. SubscriptionPlan (خطط الاشتراك)

```javascript
{
  name: String,               // free, basic, premium, enterprise
  description: String,
  price: {
    currency: String,         // SAR
    monthly: Number,
    annual: Number
  },
  features: {
    contentAccess: [String],
    sessionAccess: String,    // unlimited, limited, none
    libraryAccess: String,    // unlimited, limited, none
    storageGB: Number,
    supportLevel: String,     // none, email, priority, 24/7
    customReports: Boolean,
    apiAccess: Boolean,
    downloadLimit: Number
  },
  limitations: {
    sessionLimitPerMonth: Number,
    resourcesPerDay: Number,
    maxSavedItems: Number,
    concurrent_users: Number
  },
  trialPeriod: {
    enabled: Boolean,
    days: Number
  },
  autoRenewal: Boolean,
  isActive: Boolean
}
```

### 5. UserSubscription (اشتراكات المستخدمين)

```javascript
{
  userId: ObjectId,
  planId: ObjectId,
  status: String,             // active, inactive, suspended, cancelled, expired
  subscriptionType: String,   // monthly, annual, lifetime
  startDate: Date,
  endDate: Date,
  renewalDate: Date,
  autoRenew: Boolean,
  price: {
    original: Number,
    discountedPrice: Number,
    currency: String
  },
  paymentHistory: [{
    date: Date,
    amount: Number,
    status: String,           // pending, completed, failed, refunded
    transactionId: String
  }],
  usageStatistics: {
    sessionsAttended: Number,
    resourcesDownloaded: Number,
    hoursWatched: Number,
    lastAccessDate: Date
  },
  customizations: {
    notificationPreferences: Object,
    contentPreferences: Object
  },
  referralCode: String,
  referredBy: ObjectId,
  referralBonuses: {
    referralsCount: Number,
    bonusCredits: Number
  }
}
```

---

## 🔌 API Endpoints

### المحتوى التعليمي

| الطريقة | المسار | الوصف |
|--------|--------|--------|
| GET | `/api/community/content` | جلب جميع المحتوى (مع الفلترة والبحث) |
| GET | `/api/community/content/:id` | جلب محتوى معين |
| GET | `/api/community/content/category/:category` | جلب محتوى حسب الفئة |
| GET | `/api/community/content/popular` | جلب المحتوى الشهير |
| POST | `/api/community/content` | إنشاء محتوى جديد (مصرح) |
| PUT | `/api/community/content/:id` | تحديث محتوى (مصرح) |
| DELETE | `/api/community/content/:id` | حذف محتوى (مصرح) |
| POST | `/api/community/content/:id/rate` | تقييم المحتوى (مصرح) |
| POST | `/api/community/content/:id/publish` | نشر المحتوى (مصرح) |

### الجلسات الافتراضية

| الطريقة | المسار | الوصف |
|--------|--------|--------|
| GET | `/api/community/sessions` | جلب جميع الجلسات |
| GET | `/api/community/sessions/:id` | جلب جلسة معينة |
| GET | `/api/community/sessions/upcoming` | جلب الجلسات القادمة |
| GET | `/api/community/sessions/category/:category` | جلب الجلسات حسب الفئة |
| POST | `/api/community/sessions` | إنشاء جلسة جديدة (مصرح) |
| PUT | `/api/community/sessions/:id` | تحديث جلسة (مصرح) |
| POST | `/api/community/sessions/:id/register` | التسجيل في جلسة (مصرح) |
| POST | `/api/community/sessions/:id/cancel-registration` | إلغاء التسجيل (مصرح) |
| POST | `/api/community/sessions/:id/complete` | إكمال الجلسة (مصرح) |
| POST | `/api/community/sessions/:id/feedback` | إضافة تقييم (مصرح) |

### المكتبة الرقمية

| الطريقة | المسار | الوصف |
|--------|--------|--------|
| GET | `/api/community/library` | جلب جميع الموارد |
| GET | `/api/community/library/:id` | جلب مورد معين |
| GET | `/api/community/library/search?q=...` | البحث في الموارد |
| GET | `/api/community/library/category/:category` | جلب حسب الفئة |
| POST | `/api/community/library/upload` | تحميل مورد جديد (مصرح) |
| POST | `/api/community/library/:id/download` | تنزيل مورد (مصرح) |
| POST | `/api/community/library/:id/review` | إضافة تقييم (مصرح) |
| PUT | `/api/community/library/:id` | تحديث مورد (مصرح) |
| DELETE | `/api/community/library/:id` | حذف مورد (مصرح) |

### الاشتراكات

| الطريقة | المسار | الوصف |
|--------|--------|--------|
| GET | `/api/community/subscriptions/plans` | جلب جميع الخطط |
| GET | `/api/community/subscriptions/plans/:id` | جلب خطة معينة |
| GET | `/api/community/subscriptions/user` | جلب اشتراك المستخدم الحالي (مصرح) |
| POST | `/api/community/subscriptions/subscribe` | الاشتراك في خطة (مصرح) |
| POST | `/api/community/subscriptions/upgrade` | ترقية الاشتراك (مصرح) |
| POST | `/api/community/subscriptions/renew` | تجديد الاشتراك (مصرح) |
| POST | `/api/community/subscriptions/cancel` | إلغاء الاشتراك (مصرح) |
| GET | `/api/community/subscriptions/expiring` | جلب الاشتراكات المنتهية (إداري) |
| GET | `/api/community/subscriptions/stats` | جلب إحصائيات الاشتراكات (إداري) |

---

## 💻 مكونات React

### EducationalContent Component
يعرض المحتوى التعليمي مع:
- فلترة حسب فئة الإعاقة ونوع المحتوى
- محرك بحث متقدم
- عرض التقييمات والمراجعات
- نافذة حوار لعرض التفاصيل الكاملة
- تحميل الملفات

### VirtualSessions Component
يعرض الندوات والورش مع:
- قائمة الجلسات القادمة
- معلومات المحاضر
- مميزات إمكانية الوصول
- نموذج التسجيل
- نموذج التقييم

### DigitalLibrary Component
يعرض المكتبة الرقمية مع:
- بحث متقدم
- فلترة حسب نوع المورد والفئة
- عرض المقييمات
- تحميل الملفات

### SubscriptionPlans Component
يعرض خطط الاشتراك مع:
- مقارنة الخطط
- معلومات المميزات
- زر الاشتراك
- معلومات التسعير

---

## 📖 أمثلة الاستخدام

### مثال 1: إنشاء محتوى تعليمي

```bash
curl -X POST http://localhost:3001/api/community/content \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "مقدمة إلى الإعاقة البصرية",
    "description": "محتوى تعليمي شامل عن الإعاقة البصرية وطرق التعامل معها",
    "contentType": "article",
    "disabilityCategory": "visual",
    "contentUrl": "https://example.com/content/visual-intro",
    "level": "beginner",
    "tags": ["visual", "awareness", "education"],
    "accessibilityFeatures": {
      "largeText": true,
      "audioDescription": true
    }
  }'
```

### مثال 2: التسجيل في جلسة

```bash
curl -X POST http://localhost:3001/api/community/sessions/SESSION_ID/register \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

### مثال 3: البحث في المكتبة

```bash
curl "http://localhost:3001/api/community/library/search?q=دليل&type=guide&language=ar"
```

### مثال 4: الاشتراك في خطة

```bash
curl -X POST http://localhost:3001/api/community/subscriptions/subscribe \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "planId": "PLAN_ID",
    "subscriptionType": "monthly"
  }'
```

---

## 📊 الإحصائيات والتقارير

### إحصائيات المحتوى
- إجمالي عدد المحتوى المنشور
- توزيع حسب نوع المحتوى
- توزيع حسب فئة الإعاقة
- إجمالي المشاهدات والتنزيلات

### إحصائيات الجلسات
- عدد الجلسات المجدولة والمكتملة
- إجمالي المشاركين والحاضرين
- متوسط التقييم
- معدل الحضور

### إحصائيات الاشتراكات
- عدد المشتركين النشطين
- توزيع حسب الخطة
- معدل الإلغاء
- الإيرادات الإجمالية

### إحصائيات المكتبة
- عدد الموارد المنشورة
- توزيع حسب نوع المورد
- الموارد الأكثر تنزيلاً
- التقييم المتوسط

---

## 🔒 الأمان والأذونات

### مستويات الوصول
- **عام**: يمكن للجميع عرض المحتوى المنشور
- **مسجل**: يجب تسجيل الدخول للاشتراك والتقييم
- **إداري**: إدارة المحتوى والخطط والإحصائيات

### التحقق من الهوية
- JWT Token للمستخدمين المصرح لهم
- Refresh Token لتجديد الجلسات

---

## 📱 التوافق مع الأجهزة المختلفة

- ✅ تطبيق الويب (React)
- ✅ تطبيق الهاتف المحمول (React Native)
- ✅ واجهات برمجية (API)

---

## 🎓 الخلاصة

نظام التوعية المجتمعية يوفر حلاً متكاملاً لإدارة المحتوى التعليمي والندوات الافتراضية والموارد الرقمية مع نظام اشتراكات مرن يدعم جميع فئات المعاقين بمميزات إمكانية وصول عالية.

---

**آخر تحديث**: يناير 2026
**الإصدار**: 1.0.0
