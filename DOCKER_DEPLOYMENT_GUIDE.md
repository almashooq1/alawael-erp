# 🐳 دليل نشر جميع الخدمات — Docker Compose Full Deployment Guide

> **الحالة السابقة:** خدمتان فقط (backend + frontend) عبر PM2 + rsync
> **الحالة الجديدة:** 91 خدمة عبر Docker Compose مع نشر تدريجي

---

## 📋 ما تم تحديثه

| الملف                                         | الوصف                                             |
| --------------------------------------------- | ------------------------------------------------- |
| `docker-compose.production.yml`               | إضافة production overrides لجميع 80+ خدمة         |
| `nginx.conf`                                  | إضافة 40+ upstream و proxy location لجميع الخدمات |
| `.github/workflows/deploy-docker-compose.yml` | workflow جديد للنشر عبر Docker Compose            |
| `ops/deploy-docker-compose.sh`                | سكربت نشر تدريجي (9 مراحل)                        |
| `ops/health-check-all.sh`                     | فحص صحة شامل لجميع الخدمات                        |

---

## 🚀 طريقة النشر

### الطريقة 1: عبر GitHub Actions (مفضل)

1. اذهب إلى **Actions** → **🐳 Deploy All Services (Docker Compose)**
2. اختر وضع النشر:
   - `full` — جميع 91 خدمة
   - `core` — البنية التحتية + التطبيق الأساسي فقط
   - `phase-5` — حتى المرحلة 5 (47 خدمة)
   - `phase-6` — حتى المرحلة 6 (62 خدمة)
   - `monitoring` — الكل + Prometheus + Grafana
3. اكتب `deploy` في حقل التأكيد
4. اضغط **Run workflow**

### الطريقة 2: يدوياً على VPS

```bash
# الاتصال بالسيرفر
ssh root@72.60.84.56

# الانتقال لمجلد المشروع
cd /home/alawael/app

# سحب آخر التحديثات
git pull origin main

# نشر جميع الخدمات
bash ops/deploy-docker-compose.sh

# نشر الخدمات الأساسية فقط
bash ops/deploy-docker-compose.sh --core-only

# نشر حتى مرحلة محددة
bash ops/deploy-docker-compose.sh --phase 5

# نشر مع المراقبة
bash ops/deploy-docker-compose.sh --with-monitoring

# عرض الحالة
bash ops/deploy-docker-compose.sh --status
```

### الطريقة 3: Docker Compose مباشرة

```bash
# نشر الكل
docker compose -f docker-compose.yml -f docker-compose.production.yml up -d

# نشر خدمات محددة
docker compose -f docker-compose.yml -f docker-compose.production.yml up -d backend frontend nginx api-gateway graphql

# مع المراقبة
docker compose -f docker-compose.yml -f docker-compose.production.yml --profile monitoring up -d

# مع أدوات التطوير
docker compose -f docker-compose.yml -f docker-compose.production.yml --profile dev up -d
```

---

## 📊 مراحل النشر التدريجي

| المرحلة | الخدمات                                                                                                                                                                              | المتطلبات |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------- |
| **0**   | MongoDB, Redis                                                                                                                                                                       | 4GB RAM   |
| **1**   | Backend, Frontend, Nginx, Workers                                                                                                                                                    | +2GB RAM  |
| **2**   | API Gateway, GraphQL                                                                                                                                                                 | +1GB RAM  |
| **3**   | WhatsApp, AI Agent, Secretary AI, Notifications                                                                                                                                      | +3GB RAM  |
| **4**   | Finance, SCM, Dashboard                                                                                                                                                              | +2GB RAM  |
| **5**   | Payment, Reports, Audit, Saudi Gov, IoT, NATS, MinIO                                                                                                                                 | +3GB RAM  |
| **6**   | HR, CRM, Attendance, Fleet, DMS, Workflow, Identity, Analytics, E-Learning, Parent Portal, Rehab, Billing, Multi-Tenant, Realtime, Kitchen                                           | +4GB RAM  |
| **7**   | Inventory, Academic, Student Health, Security, Crisis, Compliance, Events, Assets, Training, CMS, Forms, Budget, Student Lifecycle, Integration Hub, Facility                        | +4GB RAM  |
| **8**   | Platform Gateway, Security Auth, Smart Reports, Service Mesh                                                                                                                         | +2GB RAM  |
| **9**   | Notification Center, Backup Recovery, AI Engine, Advanced Audit, Multilingual, Payment Gateway v2, Task/Project, File Storage, Chat, Report Scheduler, System Config, Data Migration | +4GB RAM  |

### متطلبات RAM حسب المرحلة

| مستوى النشر    | RAM المطلوب | عدد الخدمات |
| -------------- | ----------- | ----------- |
| Core فقط       | 8GB         | ~10         |
| حتى المرحلة 5  | 16GB        | ~35         |
| حتى المرحلة 7  | 24GB        | ~65         |
| الكل (91 خدمة) | 32GB+       | ~91         |

---

## 🔗 خريطة مسارات الخدمات (Nginx Proxy)

| المسار                   | الخدمة                     | المنفذ |
| ------------------------ | -------------------------- | ------ |
| `/api/`                  | Backend (Main API)         | 3001   |
| `/gateway/`              | API Gateway                | 8080   |
| `/graphql`               | GraphQL Server             | 4000   |
| `/api/whatsapp/`         | WhatsApp Service           | 3010   |
| `/api/ai-agent/`         | AI Agent                   | 3020   |
| `/api/secretary/`        | Secretary AI               | 3050   |
| `/api/ml/`               | ML Predictions             | 5001   |
| `/api/finance/`          | Finance Module             | 3030   |
| `/api/scm/`              | Supply Chain Backend       | 3040   |
| `/scm/`                  | SCM Frontend               | 3045   |
| `/api/dashboard/`        | Dashboard API              | 3006   |
| `/dashboard/`            | Dashboard UI               | 3007   |
| `/api/notifications/`    | Notification Service       | 3070   |
| `/api/payments/`         | Payment Gateway            | 3200   |
| `/api/communication/`    | Communication Hub          | 3210   |
| `/api/reports/generate/` | Report Worker              | 3220   |
| `/api/smart-reports/`    | Smart Reports              | 3620   |
| `/api/audit/`            | Audit Trail                | 3230   |
| `/api/search/`           | Search Service             | 3240   |
| `/api/saudi-gov/`        | Saudi Gov Gateway          | 3280   |
| `/api/iot/`              | IoT Gateway                | 3290   |
| `/api/hr/`               | HR & Payroll               | 3300   |
| `/api/crm/`              | CRM                        | 3310   |
| `/api/attendance/`       | Attendance & Biometric     | 3320   |
| `/api/fleet/`            | Fleet & Transport          | 3330   |
| `/api/dms/`              | Document Management        | 3340   |
| `/api/workflow/`         | Workflow Engine            | 3350   |
| `/api/identity/`         | Identity Service           | 3360   |
| `/api/analytics/`        | Analytics & BI             | 3370   |
| `/api/e-learning/`       | E-Learning                 | 3380   |
| `/api/parent-portal/`    | Parent Portal              | 3390   |
| `/api/rehab/`            | Rehabilitation Care        | 3400   |
| `/api/billing/`          | Fee & Billing              | 3410   |
| `/api/collab/`           | Realtime Collaboration     | 3430   |
| `/api/inventory/`        | Inventory & Warehouse      | 3450   |
| `/api/student-health/`   | Student Health             | 3470   |
| `/api/compliance/`       | Compliance & Accreditation | 3500   |
| `/api/events/`           | Events & Activities        | 3510   |
| `/api/assets/`           | Asset & Equipment          | 3520   |
| `/api/ai-engine/`        | AI Engine                  | 3660   |
| `/api/chat/`             | Chat & Messaging           | 3720   |
| `/api/files/`            | File Storage               | 3710   |

---

## 🏥 فحص الصحة

```bash
# فحص سريع
bash ops/health-check-all.sh

# فحص بصيغة JSON (للمراقبة الآلية)
bash ops/health-check-all.sh --json

# مراقبة مستمرة (كل 30 ثانية)
bash ops/health-check-all.sh --watch

# فحص حاوية واحدة
docker inspect --format='{{.State.Health.Status}}' alawael-backend
```

---

## 🔧 أوامر الصيانة

```bash
# عرض حالة جميع الحاويات
docker compose -f docker-compose.yml -f docker-compose.production.yml ps

# مشاهدة سجلات خدمة
docker compose logs -f backend
docker compose logs -f --tail=100 api-gateway

# إعادة تشغيل خدمة واحدة
docker compose restart backend

# إيقاف جميع الخدمات
docker compose -f docker-compose.yml -f docker-compose.production.yml down

# تنظيف الصور والحاويات القديمة
docker system prune -f
docker image prune -f

# مساحة القرص المستخدمة
docker system df
```

---

## ⚠️ ملاحظات مهمة

1. **قبل النشر الأول:** تأكد من تثبيت Docker و Docker Compose على VPS
2. **شهادات SSL:** يجب توفر ملفات الشهادات في `./certs/` (cert.pem, key.pem, chain.pem)
3. **ملف .env:** لا يتم نسخه تلقائياً — أنشئه يدوياً على VPS من `.env.production.template`
4. **الـ Workflow القديم** (`deploy-hostinger.yml`) يبقى متاحاً للنشر السريع backend+frontend فقط
5. **الـ Workflow الجديد** (`deploy-docker-compose.yml`) ينشر جميع الخدمات عبر Docker Compose
