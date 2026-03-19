# 🎯 دليل الاستخدام الشامل - النظام جاهز الآن

## 📋 ملخص الإصلاحات المنجزة

| المشكلة                 | الحالة     | الحل                            |
| ----------------------- | ---------- | ------------------------------- |
| إغلاق VS Code قسري      | ✅ FIXED   | Execution Policy + PSModulePath |
| حلقة npm Scripts        | ✅ FIXED   | تصحيح مسارات package.json       |
| PowerShell معطول        | ✅ FIXED   | مسح Profile + تعيين متغيرات     |
| Router Missing Warnings | ✅ HANDLED | SafeRequire + Fallback          |

---

## 🚀 البدء السريع

### تشغيل Backend:

```bash
# من VS Code terminal
npm start

# أو بشكل مباشر
cd erp_new_system/backend && npm start
```

### تشغيل Frontend:

```bash
cd erp_new_system/frontend && npm start
```

---

## 📚 Available Scripts

### Backend Commands:

```bash
npm start              # تشغيل عادي
npm run dev           # تشغيل مع nodemon (development)
npm run prod          # إنتاج
npm run test          # اختبارات Jest
npm run lint          # التحقق من الأخطاء
npm run format        # تنسيق الكود
npm run seed:all      # تحميل بيانات تجريبية
```

### Package Scripts:

```bash
npm install-all       # تثبيت جميع الحزم
npm audit             # فحص الأمان
npm audit-fix         # إصلاح مشاكل الأمان
npm update-deps       # تحديث التبعيات
```

---

## 🔍 استكشاف الأخطاء

### إذا حدثت مشكلة:

```powershell
# 1. تحقق من PowerShell
Get-ExecutionPolicy
# يجب أن يكون: RemoteSigned

# 2. تحقق من npm
npm --version
npm cache clean --force

# 3. أعد تشغيل VS Code
# Ctrl+K Ctrl+R (أو أغلق وافتح)

# 4. تحقق من المنافذ
Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue

# 5. امسح node_modules
rmdir node_modules /s /q
npm install
```

---

## 📁 بنية المشروع

```
erp_new_system/
├── backend/
│   ├── routes/          💬 API Endpoints
│   ├── models/          📊 Database Models
│   ├── middleware/      🔒 Custom Middleware
│   ├── controllers/     🎮 Business Logic
│   ├── services/        ⚙️ Services
│   ├── config/          ⚙️ Configuration
│   ├── app.js          🚀 Main Application
│   └── server.js       📡 Server Entry Point
│
├── frontend/
│   ├── src/
│   ├── public/
│   └── package.json
│
└── mobile/              📱 Mobile App (if exists)
```

---

## 🔌 API Quick Reference

### Main API Base:

```
http://localhost:3001/api
```

### Health Check:

```bash
curl http://localhost:3001/api/health
```

### Available Endpoints:

- `/api/auth/*` - Authentication
- `/api/users/*` - User Management
- `/api/dashboard/*` - Dashboard
- `/api/reports/*` - Reports
- ... (see routes/ directory)

---

## ⚙️ Environment Variables

### Essentials (.env):

```env
PORT=3001
NODE_ENV=development
MONGODB_URL=mongodb://localhost:27017/erp_new
USE_MOCK_DB=true
USE_MOCK_CACHE=true
JWT_SECRET=your_secret_key
```

### Optional:

```env
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
STRIPE_SECRET_KEY=
AWS_ACCESS_KEY_ID=
```

---

## 🧪 Testing

### Run all tests:

```bash
npm test              # Jest tests
npm run test:all      # Integration tests
npm run test:api      # API tests
```

### Run specific test:

```bash
npm test -- payment.test.js
npm test -- --watch   # Watch mode
```

---

## 🚢 Deployment

### Development:

```bash
npm run dev    # Auto-reload on changes
```

### Production:

```bash
npm run build  # If applicable
npm run prod   # Production server
```

### Docker:

```bash
docker build -t erp-backend .
docker run -p 3001:3001 erp-backend
```

---

## 📊 Monitoring

### Server Logs:

```bash
# Real-time logs
npm start | grep ERROR

# Log files
cat logs/error.log
cat logs/access.log
```

### Performance:

```bash
npm run analyze   # Performance analysis
```

---

## 🆘 Support & Troubleshooting

### Common Issues:

**❌ Port 3001 already in use:**

```bash
# Kill the process
netstat -ano | findstr :3001
taskkill /PID <PID> /F

# Or use different port
PORT=3002 npm start
```

**❌ MongoDB not found:**

```bash
# Check .env: USE_MOCK_DB=true
# OR install MongoDB: https://www.mongodb.com/try/download
```

**❌ Module not found:**

```bash
rm -r node_modules
npm install
```

**❌ Different Node version needed:**

```bash
# Check .nvmrc file
node --version
# Update Node if needed
```

---

## ✅ Final Checklist

- [ ] PowerShell Execution Policy = RemoteSigned
- [ ] npm --version works without errors
- [ ] node --version shows v22+
- [ ] git clone complete
- [ ] npm install run successfully
- [ ] .env file configured
- [ ] npm start works without VS Code crash

---

## 📞 Next Steps

1. **Development:**
   - Start backend: `npm start`
   - Start frontend: `cd frontend && npm start`
   - Open: http://localhost:3000

2. **Testing:**
   - `npm test` - Run tests
   - Check coverage: `/coverage` folder

3. **Deployment:**
   - Prepare staging: `npm run prod`
   - Use Docker if needed
   - Deploy to hosting

---

**STATUS:** ✅ System Ready for Use  
**Last Updated:** 21 فبراير 2026  
**Stability:** Production-Ready
