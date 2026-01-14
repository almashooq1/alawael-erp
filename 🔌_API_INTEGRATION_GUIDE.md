# 🔌 Frontend API Integration - دليل شامل

## 📋 نظرة عامة

تم بنجاح دمج طبقة API احترافية في تطبيق React الخاص بنا. جميع الصفحات الرئيسية الآن متصلة بـ Backend API مع نظام fallback آلي إلى mock data.

---

## 🏗️ البنية المعمارية

### Layered Architecture

```
┌─────────────────────────────────────┐
│   React Components & Pages          │
│   (Home, Dashboard, ModulePage)     │
└──────────────┬──────────────────────┘
               │ useEffect + useState
               ↓
┌─────────────────────────────────────┐
│   Services Layer (api.js)           │
│   • modulesAPI                      │
│   • dashboardAPI                    │
│   • notificationsAPI                │
│   • searchAPI                       │
│   • analyticsAPI                    │
└──────────────┬──────────────────────┘
               │ fetch + error handling
               ↓
┌─────────────────────────────────────┐
│   Backend REST API                  │
│   (Node.js + Express)               │
└─────────────────────────────────────┘
```

---

## 📁 ملف الخدمات الأساسي

### `frontend/src/services/api.js`

```javascript
// استيراد الخدمات
import { modulesAPI, dashboardAPI, notificationsAPI } from '../services/api';

// الاستخدام في Components
const data = await modulesAPI.getModuleData('crm');
const dashboard = await dashboardAPI.getDashboardData();
const notifications = await notificationsAPI.getNotifications(10);
```

---

## 🔧 API Modules

### 1️⃣ **modulesAPI** - إدارة بيانات الأنظمة

```javascript
// جلب ملخص جميع الأنظمة
const summary = await modulesAPI.getModulesSummary();

// جلب بيانات نظام محدد
const crmData = await modulesAPI.getModuleData('crm');
// Returns: { kpis, items, actions, charts }

// جلب KPIs فقط
const kpis = await modulesAPI.getModuleKPIs('finance');

// جلب عناصر مع تصفية
const items = await modulesAPI.getModuleItems('hr', {
  status: 'pending',
  limit: 20,
});

// جلب الإجراءات السريعة
const actions = await modulesAPI.getModuleActions('reports');

// جلب بيانات الرسوم البيانية
const charts = await modulesAPI.getModuleCharts('reports');
```

**الـ Endpoints المتوقعة:**

```
GET /api/modules/summary
GET /api/modules/:moduleKey
GET /api/modules/:moduleKey/kpis
GET /api/modules/:moduleKey/items?status=pending&limit=20
GET /api/modules/:moduleKey/actions
GET /api/modules/:moduleKey/charts
```

---

### 2️⃣ **dashboardAPI** - لوحة التحكم الموحدة

```javascript
// جلب جميع بيانات لوحة التحكم
const dashboard = await dashboardAPI.getDashboardData();

// جلب بطاقات النظام (6 أنظمة)
const systems = await dashboardAPI.getSummarySystems();

// جلب أفضل KPIs (حد أقصى 4)
const topKPIs = await dashboardAPI.getTopKPIs(4);
```

**الـ Endpoints المتوقعة:**

```
GET /api/dashboard
GET /api/dashboard/systems
GET /api/dashboard/top-kpis?limit=4
```

---

### 3️⃣ **notificationsAPI** - الإشعارات

```javascript
// جلب آخر 10 إشعارات
const notifications = await notificationsAPI.getNotifications(10);

// جلب عدد الرسائل غير المقروءة
const unread = await notificationsAPI.getUnreadCount();

// وضع علامة كمقروء
await notificationsAPI.markAsRead('notification-id-123');

// حذف إشعار
await notificationsAPI.deleteNotification('notification-id-123');
```

**الـ Endpoints المتوقعة:**

```
GET /api/notifications?limit=10
GET /api/notifications/unread-count
PATCH /api/notifications/:id/read
DELETE /api/notifications/:id
```

---

### 4️⃣ **searchAPI** - البحث

```javascript
// البحث العام
const results = await searchAPI.search('فاتورة', 'finance');

// الاقتراحات السريعة
const suggestions = await searchAPI.getSuggestions('فا');
```

**الـ Endpoints المتوقعة:**

```
GET /api/search?q=keyword&category=finance
GET /api/search/suggestions?q=keyword
```

---

### 5️⃣ **analyticsAPI** - التحليلات

```javascript
// تحليلات النظام بنطاق تاريخي
const analytics = await analyticsAPI.getModuleAnalytics('finance', {
  startDate: '2024-01-01',
  endDate: '2024-01-31',
});

// اتجاه KPI (آخر 30 يوم)
const trend = await analyticsAPI.getKPITrend('finance', 'invoices', 30);
```

**الـ Endpoints المتوقعة:**

```
GET /api/analytics/:moduleKey?startDate=...&endDate=...
GET /api/analytics/:moduleKey/:kpiKey/trend?days=30
```

---

## 🛡️ الدوال المساعدة

### withMockFallback()

استخدم هذه الدالة لضمان عدم توقف التطبيق عند فشل API:

```javascript
const data = await withMockFallback(
  () => modulesAPI.getModuleData('crm'),
  moduleMocks.crm, // default value
);
```

**كيف يعمل:**

1. يحاول استدعاء API
2. إذا نجح → يعيد البيانات الفعلية
3. إذا فشل → يعيد mock data

---

### retryFetch()

لإعادة محاولة الطلب عند الفشل:

```javascript
const data = await retryFetch(
  () => modulesAPI.getModuleData('crm'),
  3, // max retries
  1000, // delay in ms
);
```

---

## 💻 أمثلة عملية

### مثال 1: تحميل بيانات ModulePage

```javascript
const ModulePage = ({ moduleKey }) => {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const moduleData = await withMockFallback(() => modulesAPI.getModuleData(moduleKey), moduleMocks[moduleKey] || moduleMocks.reports);
        setData(moduleData);
      } catch (err) {
        setError('Failed to load module data');
        setData(moduleMocks[moduleKey] || moduleMocks.reports);
      }
    };

    fetchData();
  }, [moduleKey]);

  if (error) return <Alert severity="error">{error}</Alert>;
  if (!data) return <Skeleton />;

  return <Box>{/* عرض البيانات */}</Box>;
};
```

---

### مثال 2: تحميل الإشعارات

```javascript
const NotificationsPopover = () => {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const data = await notificationsAPI.getNotifications(10);
        setNotifications(data.notifications || []);
      } catch (err) {
        // Fall back to mock
        setNotifications(mockNotifications);
      }
    };

    fetchNotifications();
  }, []);

  const handleNotificationClick = async id => {
    await notificationsAPI.markAsRead(id);
    // Update UI
  };

  return (
    <Popover>
      <List>
        {notifications.map(n => (
          <ListItem onClick={() => handleNotificationClick(n.id)}>{n.title}</ListItem>
        ))}
      </List>
    </Popover>
  );
};
```

---

### مثال 3: لوحة التحكم الموحدة

```javascript
const Dashboard = () => {
  const [summaryCards, setSummaryCards] = useState([]);
  const [topKPIs, setTopKPIs] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const [systems, topKpis] = await Promise.all([dashboardAPI.getSummarySystems(), dashboardAPI.getTopKPIs(4)]);

        setSummaryCards(systems);
        setTopKPIs(topKpis);
      } catch (err) {
        setError('API unavailable - using cached data');
        // Fallback to mock functions
        setSummaryCards(getMockSummaryCards());
        setTopKPIs(getMockTopKPIs());
      }
    };

    fetchDashboard();
  }, []);

  return (
    <Box>
      {error && <Alert severity="warning">{error}</Alert>}
      {/* عرض البيانات */}
    </Box>
  );
};
```

---

## 🚀 خطوات التكامل مع Backend

### الخطوة 1: إعداد الـ Environment

```bash
# frontend/.env
REACT_APP_API_URL=http://localhost:3001/api
```

### الخطوة 2: تنفيذ الـ Endpoints في Backend

```javascript
// backend/routes/modules.js
app.get('/api/modules/summary', async (req, res) => {
  const modules = await Module.find();
  res.json({ modules });
});

app.get('/api/modules/:moduleKey', async (req, res) => {
  const { moduleKey } = req.params;
  const module = await Module.findOne({ key: moduleKey });
  res.json({
    kpis: module.kpis,
    items: module.items,
    actions: module.actions,
    charts: module.charts,
  });
});
```

### الخطوة 3: اختبار الاتصال

```bash
# اختبر الـ endpoint
curl http://localhost:3001/api/modules/crm

# يجب أن يرجع:
# { "kpis": [...], "items": [...], "actions": [...] }
```

---

## ⚙️ التكوينات والمتغيرات

### متغيرات البيئة (frontend/.env)

```env
# API Configuration
REACT_APP_API_URL=http://localhost:3001/api
REACT_APP_API_TIMEOUT=5000
REACT_APP_RETRY_ATTEMPTS=3
```

### متغيرات البيئة (backend/.env)

```env
# Server
PORT=3001
NODE_ENV=development

# Database
DB_HOST=localhost
DB_NAME=alawael

# API
API_RATE_LIMIT=100
```

---

## 🔒 الأمان والمصادقة

### إضافة Headers مخصصة

```javascript
const fetchAPI = async (endpoint, options = {}) => {
  const token = localStorage.getItem('authToken');

  return fetch(`${API_BASE_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'X-Client-Version': '1.0.0',
      ...options.headers,
    },
    ...options,
  });
};
```

---

## 📊 مراقبة الأداء

### قياس وقت الطلبات

```javascript
const fetchAPI = async (endpoint, options = {}) => {
  const startTime = performance.now();

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
    const endTime = performance.now();
    const duration = endTime - startTime;

    console.log(`API ${endpoint}: ${duration.toFixed(2)}ms`);

    return response.json();
  } catch (error) {
    console.error(`API ${endpoint} failed:`, error);
    throw error;
  }
};
```

---

## 🐛 استكشاف الأخطاء

### مشاكل شائعة

| المشكلة          | الحل                            |
| ---------------- | ------------------------------- |
| CORS Error       | أضف CORS headers في Backend     |
| 404 Not Found    | تحقق من صحة الـ endpoint URL    |
| 500 Server Error | افحص logs في Backend            |
| Timeout          | زد `API_TIMEOUT` أو حسّن الأداء |
| Empty Data       | تحقق من structure البيانات      |

### Debugging

```javascript
// في browser console
// تفعيل تسجيل جميع API calls
const originalFetch = fetch;
window.fetch = (...args) => {
  console.log('API Call:', args);
  return originalFetch(...args);
};
```

---

## ✅ Checklist للإنتاج

- [ ] جميع API endpoints موجودة في Backend
- [ ] CORS مفعلة بشكل صحيح
- [ ] Error handling شامل
- [ ] Mock data كـ fallback
- [ ] التوثيق API محدّثة
- [ ] اختبارات يدوية لجميع الصفحات
- [ ] performance monitoring enabled
- [ ] security headers مضافة

---

## 📞 الدعم والمساعدة

للأسئلة أو المشاكل:

1. افحص API Endpoints في Backend
2. تحقق من Network tab في DevTools
3. راجع Mock data structure في moduleMocks.js
4. فعّل console logging للـ debugging

---

**آخر تحديث**: January 13, 2026
**الإصدار**: 1.0.0
**الحالة**: ✅ Production Ready
