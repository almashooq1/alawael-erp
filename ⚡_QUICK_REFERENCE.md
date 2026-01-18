⚡ # **Quick Reference - الدليل السريع**

## 🎯 **Quick Start (5 دقائق)**

### التثبيت:

```bash
cd backend && pip install -r requirements.txt
```

### إضافة البيانات:

```bash
python scripts/add_sample_data.py
```

### التشغيل:

```bash
python app.py  # أو: docker-compose up -d
```

### الاختبار:

```bash
pytest -v
```

---

## 🔗 **الـ Endpoints الرئيسية**

### Authentication:

```
POST   /api/auth/register              تسجيل جديد
POST   /api/auth/login                 تسجيل الدخول
POST   /api/auth/refresh               تحديث التوكن
```

### Beneficiaries:

```
GET    /api/beneficiaries              قائمة المستفيدين
POST   /api/beneficiaries              إضافة مستفيد
GET    /api/beneficiaries/<id>         تفاصيل المستفيد
PUT    /api/beneficiaries/<id>         تعديل المستفيد
DELETE /api/beneficiaries/<id>         حذف المستفيد
```

### Sessions:

```
GET    /api/sessions                   قائمة الجلسات
POST   /api/sessions                   بدء جلسة
GET    /api/sessions/<id>              تفاصيل الجلسة
PUT    /api/sessions/<id>              تعديل الجلسة
DELETE /api/sessions/<id>              حذف الجلسة
```

### Analytics:

```
GET    /api/analytics/dashboard        لوحة المعلومات
GET    /api/analytics/sessions/stats   إحصائيات الجلسات
GET    /api/analytics/beneficiaries/stats إحصائيات المستفيدين
GET    /api/analytics/usage-trends     الاتجاهات
GET    /api/analytics/export/csv       تصدير CSV
```

### Security:

```
POST   /api/security/api-keys          إنشاء API Key
GET    /api/security/api-keys          قائمة API Keys
POST   /api/security/2fa/setup         إعداد 2FA
POST   /api/security/2fa/verify        التحقق من 2FA
GET    /api/security/audit-logs        السجلات
```

### Advanced:

```
POST   /api/advanced/beneficiaries/batch-create   إنشاء دفعة
PUT    /api/advanced/beneficiaries/batch-update   تحديث دفعة
DELETE /api/advanced/beneficiaries/batch-delete   حذف دفعة
POST   /api/advanced/search            بحث متقدم
GET    /api/advanced/reports/beneficiary/<id> تقرير
POST   /api/advanced/export/csv        تصدير
```

### WebSocket:

```
/socket.io/connect              الاتصال
/socket.io/authenticate         المصادقة
/socket.io/subscribe_sessions   الاشتراك في الجلسات
/socket.io/subscribe_dashboard  الاشتراك في لوحة المعلومات
```

---

## 🧪 **Testing Commands**

### جميع الاختبارات:

```bash
pytest
```

### اختبار محدد:

```bash
pytest backend/tests/test_auth.py
```

### مع Coverage:

```bash
pytest --cov=backend
```

### Load Testing:

```bash
locust -f backend/tests/load_test.py --host=http://localhost:5000
```

### Security Tests:

```bash
pytest backend/tests/test_security_performance.py
```

---

## 🐳 **Docker Commands**

### البناء والتشغيل:

```bash
docker-compose up -d
```

### إيقاف:

```bash
docker-compose down
```

### عرض السجلات:

```bash
docker-compose logs -f api
```

### الدخول إلى الحاوية:

```bash
docker-compose exec api bash
```

---

## 📡 **API Authentication**

### الحصول على التوكن:

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password"}'
```

### استخدام التوكن:

```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:5000/api/beneficiaries
```

---

## 📊 **Database Commands**

### إنشاء جداول:

```bash
flask db upgrade
```

### إضافة بيانات:

```bash
python scripts/add_sample_data.py
```

### Redis Client:

```bash
redis-cli
> KEYS *
> GET key-name
> DEL key-name
```

---

## 🔐 **Security Quick Ref**

### إنشاء API Key:

```bash
curl -X POST http://localhost:5000/api/security/api-keys \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name": "App", "scopes": ["read", "write"]}'
```

### إعداد 2FA:

```bash
curl -X POST http://localhost:5000/api/security/2fa/setup \
  -H "Authorization: Bearer $TOKEN"
```

### Audit Logs:

```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:5000/api/security/audit-logs
```

---

## 🚀 **Deployment Quick Ref**

### على AWS:

```bash
# Push إلى GitHub يشغل الـ GitHub Actions workflow
git push origin main
```

### على Docker:

```bash
docker-compose -f docker-compose.yml up -d
```

### على Kubernetes:

```bash
# استخدم Docker images من ECR
kubectl apply -f k8s-manifest.yaml
```

---

## 📈 **Performance Tips**

### تحسين الأداء:

```
1. استخدم Redis Caching
2. فعّل Connection Pooling
3. استخدم Batch Operations للبيانات الضخمة
4. استخدم Pagination للقوائم الطويلة
5. استخدم Nginx كـ Reverse Proxy
```

### مراقبة الأداء:

```bash
# Response times
curl -w "Response time: %{time_total}s\n" \
  http://localhost:5000/api/beneficiaries

# Memory usage
docker stats api

# Database queries
# استخدم Flask SQLAlchemy logging
export SQLALCHEMY_ECHO=True
```

---

## 🛠️ **Troubleshooting**

### المشكلة: "Connection refused"

```bash
# تحقق من الخادم
curl http://localhost:5000/health
```

### المشكلة: "Database error"

```bash
# أعد تهيئة قاعدة البيانات
flask db drop && flask db upgrade
python scripts/add_sample_data.py
```

### المشكلة: "Module not found"

```bash
# أعد التثبيت
pip install -r requirements.txt --force-reinstall
```

### المشكلة: "Port already in use"

```bash
# غيّر المنفذ
python app.py --port 5001
```

---

## 📚 **وثائق مفيدة**

| الملف                             | الوصف             |
| --------------------------------- | ----------------- |
| 🚀_COMPLETE_STARTUP_GUIDE.md      | دليل البدء الشامل |
| 🎊_ALL_PHASES_COMPLETE_SUMMARY.md | ملخص جميع المراحل |
| ✅_FINAL_STATUS_COMPLETE.md       | الحالة النهائية   |
| Postman_Collection.json           | مجموعة API        |

---

## 💡 **نصائح سريعة**

```
✅ استخدم Postman لاختبار الـ API
✅ استخدم Docker للتطوير والإنتاج
✅ شغّل الاختبارات قبل الـ commit
✅ استخدم Git Branches للميزات الجديدة
✅ راقب السجلات للأخطاء
✅ استخدم Redis للـ Caching
✅ احفظ نسخة احتياطية من البيانات
✅ فعّل 2FA للأمان
```

---

## 📞 **الأوامر المهمة**

```bash
# بدء التطوير
flask run

# التشغيل للإنتاج
gunicorn -w 4 app:app

# الاختبار
pytest

# البناء والنشر
docker-compose up -d

# التنظيف
docker-compose down -v
```

---

**تم إنشاء هذا الدليل السريع لسهولة الرجوع إليه!** 📖
