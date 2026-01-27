# نظام إدارة العمليات الذكي (Process Automation System)

نظام متكامل لإدارة وأتمتة العمليات والمهام مع دعم الذكاء الاصطناعي، الترجمة،
التكامل، ولوحات تحكم تفاعلية.

## المزايا الرئيسية

- إدارة عمليات وسير عمل مرنة (إضافة/تعديل/تتبع)
- أتمتة الخطوات (تنفيذ تلقائي، إشعارات، تكامل API)
- دعم الذكاء الاصطناعي (اقتراحات، تحليل أداء، كشف أعطال)
- واجهات تفاعلية متعددة اللغات (RTL/LTR، مظلم/فاتح)
- تكامل RESTful API
- قابلية التخصيص والتوسعة

## وحدات التوسع الذكي

- **إشعارات متعددة القنوات**: notifications.ts (Email, SMS, Push)
- **تحليلات وتوصيات ذكية**: process.analytics.ts
- **دعم BPMN/JSON**: process.bpmn.ts (تصدير/استيراد العمليات)
- **لوحة تحكم تحليلات متقدمة**: ProcessAnalytics.tsx (frontend)

### مثال استخدام التحليلات:

```ts
import {
  getProcessStats,
  recommendImprovements,
} from './backend/models/process.analytics';
const stats = getProcessStats(processes);
const recommendations = recommendImprovements(processes);
```

### مثال إرسال إشعار:

```ts
import { sendEmail, sendSMS, sendPush } from './backend/models/notifications';
await sendEmail('user@email.com', 'تنبيه', 'تمت معالجة العملية بنجاح');
```

### مثال تصدير BPMN:

```ts
import { exportToBPMN } from './backend/models/process.bpmn';
const xml = exportToBPMN(process);
```

### مثال عرض التحليلات في الواجهة:

```tsx
<ProcessAnalytics
  stats={stats}
  delays={delays}
  recommendations={recommendations}
/>
```

## التشغيل السريع

1. **تشغيل الخادم**
   - backend: Express + TypeScript
   - المسار: `intelligent-agent/backend/models/`
   - مثال تشغيل:
     ```bash
     npm install
     npx ts-node ./server.ts
     ```
2. **تشغيل الواجهة**
   - frontend: React (dashboard)
   - المسار: `intelligent-agent/dashboard/`
   - مثال تشغيل:
     ```bash
     npm install
     npm start
     ```

## نقاط التكامل (API)

- `GET    /processes` : جلب جميع العمليات
- `POST   /processes` : إضافة عملية جديدة
- `PUT    /processes/:id` : تحديث عملية
- `DELETE /processes/:id` : حذف عملية

## نماذج البيانات

- **Process**: تعريف العملية، الخطوات، الحالة
- **Task**: المهام المرتبطة بالخطوات

## الذكاء الاصطناعي

- اقتراح الخطوة التالية
- تحليل الأداء والكفاءة
- كشف الأعطال والتأخير

## الترجمة والاتجاهات

- دعم كامل للعربية/الإنجليزية/الفرنسية
- دعم RTL/LTR وتبديل السمات (مظلم/فاتح)

## الاختبار

- اختبارات تكامل وذكاء اصطناعي (راجع ملفات test في backend/models)
- يوصى بتفعيل بيئة Jest/Vitest للنتائج الكاملة

## التوثيق

- جميع الأكواد مشروحة ومقسمة بوضوح
- يمكن التوسع بسهولة لإضافة عمليات أو تكاملات جديدة

---

لأي استفسار أو تطوير إضافي: تواصل مع فريق التطوير أو راجع ملفات الكود والتوثيق
المرفقة.

## Frontend Integration

### CORS

The API supports CORS for all origins by default. You can adjust the `origin`
option in `src/server.ts` for production.

### ERP/CRM API Endpoints

RESTful endpoints for ERP/CRM integration:

- `GET /v1/erp/records/:entity` — List records (query params supported)
- `POST /v1/erp/records/:entity` — Create a record
- `PUT /v1/erp/records/:entity/:id` — Update a record
- `DELETE /v1/erp/records/:entity/:id` — Delete a record

All endpoints return JSON. Example usage:

```sh
curl http://localhost:3000/v1/erp/records/customer
```

## Advanced Analytics & Monitoring

### Prometheus Metrics

Expose metrics at `/metrics` endpoint (already enabled in Express app via
`setupMonitoring`).

### Running Monitoring Stack

1. Ensure `monitoring/prometheus.yml` contains your agent service:
   ```yaml
   scrape_configs:
     - job_name: 'intelligent-agent'
   	 static_configs:
   		- targets: ['agent:3000']
   ```
2. Start monitoring stack:
   ```sh
   docker-compose -f ../monitoring/docker-compose-monitoring.yml up -d
   ```
3. Access Prometheus at [http://localhost:9090](http://localhost:9090) and
   Grafana at [http://localhost:3005](http://localhost:3005) (default
   admin/admin).

### Grafana Dashboards

Add Prometheus as a data source in Grafana and import Node.js/Prometheus
dashboards for real-time analytics.

# Intelligent Agent System

نظام Agent ذكي احترافي وقابل للتوسع، يدعم جميع الخدمات الذكية والتكاملات
المؤسسية.

## المميزات الرئيسية

- معالجة اللغة الطبيعية (NLP)
- تكامل API خارجي
- تكامل قواعد بيانات (MongoDB)
- مراقبة الأحداث
- تسجيل الأحداث (Logger)
- إعدادات ديناميكية (Config)
- جدولة المهام
- إشعارات (Notifier)
- مصادقة (Auth)
- قياس الأداء (Metrics)
- تخزين مؤقت (Cache)
- طوابير (Queue)
- إدارة الملفات
- إرسال بريد إلكتروني
- إرسال رسائل SMS
- دعم Webhooks
- دردشة ذكية (AI Chat)
- توليد تقارير
- إدارة المستخدمين

## بنية المشروع

- `src/core/agent-core.ts`: الكلاس الرئيسي الذي يدمج جميع الخدمات.
- `src/modules/`: جميع الوحدات الذكية والخدمات.
- `tests/`: اختبارات تلقائية لكل وحدة.
- `.github/workflows/ci.yml`: نظام CI لبناء واختبار المشروع تلقائيًا.

## التشغيل

```bash
npm install
npm run build
npm test
```

## التخصيص والتوسعة

- أضف وحدات جديدة في `src/modules/` وادمجها في `AgentCore`.
- عدل الإعدادات البيئية عبر متغيرات البيئة أو ملف `.env`.

## المساهمة

مرحبًا بأي مساهمة أو تطوير إضافي.
