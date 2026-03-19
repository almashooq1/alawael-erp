# ALAWAEL Quality Dashboard

لوحة تحكم في الوقت الفعلي لمراقبة جودة الخدمات في نظام ALAWAEL ERP.

## 📋 المميزات

- ✅ مراقبة حالة 10 خدمات في الوقت الفعلي
- 📊 عرض نتائج الاختبارات والتغطية
- 📈 تحليل اتجاهات الجودة
- 🔄 تحديثات تلقائية عبر WebSocket
- ▶️ تشغيل الاختبارات مباشرة من الواجهة
- 📱 تصميم متجاوب (Responsive)
- 🌐 دعم اللغة العربية (RTL)

## 🚀 البدء السريع

### 1. متطلبات التشغيل

- Node.js 20.x أو أحدث
- npm 9.x أو أحدث

### 2. تثبيت التبعيات

#### الخادم (Backend)
```powershell
cd dashboard/server
npm install
```

#### العميل (Frontend)
```powershell
cd dashboard/client
npm install
```

### 3. الإعدادات

#### إعداد الخادم
```powershell
cd dashboard/server
cp .env.example .env
```

تحرير `.env` حسب الحاجة:
```env
PORT=3001
DB_PATH=./data/quality.db
QUALITY_CLI_PATH=../../quality
WS_HEARTBEAT_INTERVAL=30000
```

### 4. تشغيل التطبيق

#### تشغيل الخادم (في نافذة منفصلة)
```powershell
cd dashboard/server
npm start
```

الخادم سيعمل على: `http://localhost:3001`

#### تشغيل العميل (في نافذة منفصلة)
```powershell
cd dashboard/client
npm start
```

الواجهة ستفتح تلقائياً على: `http://localhost:3000`

## 📁 هيكل المشروع

```
dashboard/
├── server/                 # تطبيق الخادم (Express + WebSocket)
│   ├── index.js           # نقطة الدخول الرئيسية
│   ├── routes/
│   │   ├── api.js         # REST API endpoints
│   │   └── websocket.js   # WebSocket handling
│   ├── services/
│   │   ├── quality.js     # منطق تنفيذ الاختبارات
│   │   └── database.js    # SQLite database wrapper
│   ├── data/              # قاعدة البيانات
│   │   └── quality.db
│   └── package.json
│
└── client/                # تطبيق React
    ├── public/
    │   └── index.html
    ├── src/
    │   ├── components/    # React components
    │   │   ├── StatusGrid.jsx
    │   │   ├── TestResults.jsx
    │   │   ├── TrendsChart.jsx
    │   │   └── QuickActions.jsx
    │   ├── hooks/         # Custom React hooks
    │   │   ├── useWebSocket.js
    │   │   └── useQuality.js
    │   ├── utils/         # Utilities
    │   │   └── api.js     # API client
    │   ├── App.jsx        # المكون الرئيسي
    │   └── index.js       # نقطة الدخول
    └── package.json
```

## 🔌 API Endpoints

### REST API

- `GET /api/status` - حالة جميع الخدمات
- `GET /api/service/:name` - تفاصيل خدمة محددة
- `POST /api/run/:service` - تشغيل اختبارات خدمة
- `GET /api/job/:jobId` - حالة مهمة محددة
- `GET /api/trends?service=X&days=7` - اتجاهات الجودة
- `GET /api/recent?limit=20` - آخر عمليات التشغيل

### WebSocket Messages

#### من العميل للخادم:
```json
{
  "type": "subscribe",
  "service": "backend"
}
```

#### من الخادم للعميل:
```json
{
  "type": "test_complete",
  "service": "backend",
  "data": { ... }
}
```

## 🧪 الاختبار

### اختبار الخادم
```powershell
cd dashboard/server
npm test
```

### اختبار العميل
```powershell
cd dashboard/client
npm test
```

## 🛠️ التطوير

### وضع التطوير

#### الخادم (مع hot reload)
```powershell
cd dashboard/server
npm run dev
```

#### العميل (مع hot reload)
```powershell
cd dashboard/client
npm start
```

## 📦 البناء للإنتاج

### بناء العميل
```powershell
cd dashboard/client
npm run build
```

الملفات المبنية ستكون في: `dashboard/client/build/`

### تشغيل الإنتاج
```powershell
cd dashboard/server
NODE_ENV=production npm start
```

الخادم سيقدم ملفات React المبنية تلقائياً.

## 🔧 استكشاف الأخطاء

### الخادم لا يبدأ
- تأكد من أن المنفذ 3001 غير مستخدم
- تحقق من ملف `.env`
- راجع سجلات الأخطاء في console

### العميل لا يتصل بالخادم
- تأكد من تشغيل الخادم أولاً
- تحقق من إعدادات proxy في `client/package.json`
- افتح DevTools وراجع سجل console

### WebSocket لا يعمل
- تأكد من دعم المتصفح لـ WebSocket
- تحقق من إعدادات الجدار الناري
- راجع console للرؤية حالة الاتصال

## 📊 الخدمات المدعومة

1. **backend** - الخادم الرئيسي (Node.js/Express)
2. **graphql** - خادم GraphQL
3. **mobile** - تطبيق الموبايل
4. **gateway** - بوابة API
5. **whatsapp** - خدمة WhatsApp
6. **backend-1** - خادم ثانوي
7. **frontend** - واجهة المستخدم
8. **supply-chain-management** - إدارة سلسلة التوريد
9. **finance-management** - إدارة الشؤون المالية
10. **react** - تطبيقات React

## 📝 الملاحظات

- يتم حفظ نتائج الاختبارات في قاعدة بيانات SQLite
- التحديثات في الوقت الفعلي عبر WebSocket
- دعم كامل للغة العربية مع RTL
- تصميم متجاوب لجميع الأجهزة

## 🤝 المساهمة

لتحسين لوحة التحكم:
1. Fork المشروع
2. أنشئ feature branch
3. نفذ التغييرات
4. اختبر بشكل شامل
5. أرسل Pull Request

## 📄 الترخيص

© 2026 ALAWAEL ERP - جميع الحقوق محفوظة

---

**للدعم التقني:** تواصل مع فريق التطوير
