# 📋 دليل العمل الشامل - المرحلة الثانية

**النسخة:** 1.0  
**التاريخ:** 27 فبراير 2026  
**الحالة:** ✅ مُحضّر للتنفيذ  

---

## 🎯 الهدف العام

الوصول بحالة المشروع من **6/10** إلى **9/10** عبر:
- ✅ إصلاح الأخطاء الحرجة (تم)
- ⏳ تنظيم البنية (جاهز للتنفيذ)
- ⏳ معالجة المهام المعلقة (TODO/FIXME)
- ⏳ تحسين الأداء والقابلية للصيانة

---

## 📊 الخطوات الفورية (الـ 24 ساعة القادمة)

### 1️⃣ تشغيل Script التنظيف

**على Windows:**
```powershell
# افتح PowerShell كـ Administrator
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
.\cleanup-structure.ps1
```

**على macOS/Linux:**
```bash
chmod +x cleanup-structure.sh
./cleanup-structure.sh
```

### 2️⃣ المراجعة والاختبار

```bash
# فحص التغييرات
git status
git diff --stat

# تشغيل الاختبارات
npm run lint
npm test

# إذا حدثت أخطاء import
npm run lint -- --fix
```

### 3️⃣ الـ Commit

```bash
git add .
git commit -m "refactor: reorganize project structure - merge duplicate directories"
git push origin main
```

---

## 📝 معالجة TODO/FIXME

### المسح الأول - تحديد الأولويات

```bash
# البحث عن كل TODOs
grep -r "TODO\|FIXME\|HACK" backend/ frontend/ \
  --include="*.js" \
  --include="*.jsx" \
  --include="*.ts" \
  --include="*.tsx" \
  | sort | uniq

# التخزين في ملف
grep -r "TODO\|FIXME\|HACK" backend/ frontend/ \
  --include="*.js" \
  --include="*.jsx" \
  -n > all-todos.txt

echo "✅ TODOs exported to all-todos.txt"
```

### معالجة الأولويات

#### 🔴 Priority 1 - مهم جداً (يجب تنفيذه الأسبوع الأول)

**1. Authentication & Authorization**
```javascript
// backend/routes/auth.routes.js:37
// ❌ TODO: Implement refresh token endpoint
// ✅ الحل المطلوب:
router.post('/refresh-token', validateRefreshToken, async (req, res) => {
  try {
    const { refreshToken } = req.body;
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    
    const newAccessToken = jwt.sign(
      { userId: decoded.userId, role: decoded.role },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );
    
    res.json({ accessToken: newAccessToken });
  } catch (error) {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});

// ✅ الملف المكمل:
// - باقي validation
// - error handling
// - logging
```

**2. OTP Authentication**
```javascript
// backend/routes/otp-auth.routes.js:344
// ❌ TODO: Implement OTP expiration logic
// ✅ الحل المطلوب:
const OTP_EXPIRATION_MINUTES = 5;

function isOTPExpired(createdAt, expirationMinutes = OTP_EXPIRATION_MINUTES) {
  const now = Date.now();
  const created = new Date(createdAt).getTime();
  const diffInMinutes = (now - created) / (1000 * 60);
  return diffInMinutes > expirationMinutes;
}

// في validation
if (isOTPExpired(otpRecord.createdAt)) {
  return res.status(400).json({ error: 'OTP expired' });
}
```

#### 🟠 Priority 2 - مهم (الأسبوع الثاني)

**1. Financial Reporting**
```javascript
// backend/controllers/accounting-invoice.controller.js:329
// ❌ TODO: Implement comprehensive financial reporting
// ✅ الخطوات:
async generateInvoiceReport(filters) {
  const invoices = await Invoice.find(this._buildQuery(filters))
    .lean()
    .exec();
  
  return {
    summary: this._calculateSummary(invoices),
    details: invoices,
    metadata: {
      total: invoices.length,
      currency: 'SAR',
      period: filters.period
    }
  };
}
```

**2. Database Migration**
```javascript
// backend/services/database-migration-service.js:77
// ❌ TODO: Add rollback functionality
// ✅ الخطوات:
async rollback(migrationId) {
  const migration = await Migration.findById(migrationId);
  if (!migration) throw new Error('Migration not found');
  
  try {
    // تنفيذ الـ rollback script
    await runMigrationScript(migration.rollbackScript);
    await Migration.updateOne(
      { _id: migrationId },
      { status: 'rolled_back', rollbackAt: new Date() }
    );
  } catch (error) {
    throw new Error(`Rollback failed: ${error.message}`);
  }
}
```

#### 🟡 Priority 3 - تحسينات (الأسبوع الثالث)

```javascript
// static/js/risk_management.js:689
// ❌ TODO: Implement view risk modal
// ✅ الحل المطلوب:
viewRisk(id) {
  const risk = this.risks.find(r => r.id === id);
  if (!risk) return;
  
  // عرض modal بـ risk details
  const modal = new RiskModal(risk);
  modal.show();
}
```

---

## 🔧 أداة مساعدة - TODO Tracker

### ملف: `scripts/todo-tracker.js`

```javascript
#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function extractTODOs() {
  const root = path.join(__dirname, '..');
  const todos = {};
  
  function scanFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    lines.forEach((line, idx) => {
      const todoMatch = line.match(/\/\/\s*(TODO|FIXME|HACK):\s*(.*)/);
      if (todoMatch) {
        const [, type, text] = todoMatch;
        const relativePath = path.relative(root, filePath);
        
        if (!todos[relativePath]) {
          todos[relativePath] = [];
        }
        
        todos[relativePath].push({
          line: idx + 1,
          type,
          text: text.trim()
        });
      }
    });
  }
  
  // Scan all JS/JSX files
  function walkDir(dir) {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        if (!['node_modules', '.git', 'dist', 'build'].includes(file)) {
          walkDir(fullPath);
        }
      } else if (/\.(js|jsx|ts|tsx)$/.test(file)) {
        scanFile(fullPath);
      }
    });
  }
  
  walkDir(root);
  
  // Generate Report
  const report = {
    timestamp: new Date().toISOString(),
    totalTODOs: Object.values(todos).reduce((sum, arr) => sum + arr.length, 0),
    byType: {
      TODO: 0,
      FIXME: 0,
      HACK: 0
    },
    byPriority: {
      high: [],
      medium: [],
      low: []
    },
    details: todos
  };
  
  // Count by type
  Object.values(todos).forEach(items => {
    items.forEach(item => {
      report.byType[item.type]++;
    });
  });
  
  // Save report
  fs.writeFileSync(
    'todo-report.json',
    JSON.stringify(report, null, 2)
  );
  
  console.log('📊 TODO Report Generated');
  console.log(`   Total TODOs: ${report.totalTODOs}`);
  console.log(`   - TODO: ${report.byType.TODO}`);
  console.log(`   - FIXME: ${report.byType.FIXME}`);
  console.log(`   - HACK: ${report.byType.HACK}`);
  console.log('\n   Saved to: todo-report.json');
}

extractTODOs();
```

### الاستخدام:

```bash
node scripts/todo-tracker.js

# Output:
# 📊 TODO Report Generated
#    Total TODOs: 47
#    - TODO: 40
#    - FIXME: 5
#    - HACK: 2
#
#    Saved to: todo-report.json
```

---

## ✅ Checklist يومي

### كل يوم:

```bash
# 1. تحديث الـ branch
git pull origin main

# 2. فحص الأخطاء الجديدة
npm run lint

# 3. تشغيل الاختبارات
npm test

# 4. متابعة الـ TODOs
node scripts/todo-tracker.js

# 5. تحديث الـ TODO log
git log --all --oneline | head -10
```

---

## 📈 مؤشرات التقدم

### نموذج الـ Tracking:

| الأسبوع | المهام | الإنجاز | الملاحظات |
|--------|--------|---------|---------|
| 1 | تنظيم البنية | 0% | Start cleanup script |
| 2 | Auth & OTP | 0% | Implement refresh tokens |
| 3 | Financial Reporting | 0% | Invoice/Payment reports |
| 4 | Performance | 0% | Optimize dependencies |

### القياس:

```bash
# عدد الأخطاء المتبقية
npm run lint 2>&1 | grep -c "error"

# عدد TODOs المتبقية
grep -r "TODO\|FIXME" backend/ frontend/ | wc -l

# نسبة التغطية بالاختبارات
npm test -- --coverage | grep "Statements"

# حجم البناء
du -sh dist/ || du -sh build/
```

---

## 🚀 أتمتة المراقبة

### GitHub Actions (Optional)

إنشاء `.github/workflows/daily-checks.yml`:

```yaml
name: Daily Checks
on:
  schedule:
    - cron: '0 8 * * *'

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Setup Node
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      
      - name: Install deps
        run: npm ci
      
      - name: Lint
        run: npm run lint
      
      - name: Test
        run: npm test
      
      - name: Count TODOs
        run: |
          TODOS=$(grep -r "TODO\|FIXME" . | wc -l)
          echo "🔍 TODOs Found: $TODOS"
```

---

## 💡 نصائح والتحذيرات

### ✅ افعل:
- ✅ اختبر كل تغيير قبل الـ commit
- ✅ اكتب رسائل commit واضحة
- ✅ احتفظ بـ backup قبل العمليات الكبيرة
- ✅ راجع الـ diffs بعناية
- ✅ وثّق كل إجراء تخذه

### ❌ لا تفعل:
- ❌ لا تحذف ملفات دون backup
- ❌ لا تغيّر imports بدون اختبار
- ❌ لا تترك console.logs في الإنتاج
- ❌ لا تلغي قواعد eslint دون السبب
- ❌ لا تعمل على main branch مباشرة

---

## 📞 طلب المساعدة

إذا واجهت مشكلة:

1. **فحص الأخطاء:**
   ```bash
   npm run lint
   npm test
   ```

2. **البحث عن الحل:**
   - ابحث في `documentation/`
   - راجع `SYSTEM_FIXES_AND_IMPROVEMENTS.md`
   - تفقد `git log` للتغييرات السابقة

3. **الاستعادة:**
   ```bash
   git checkout -- . # استعادة التغييرات المحلية
   git reset --hard HEAD # العودة للـ last commit
   ```

---

## 📅 الجدول الزمني المقترح

```
الأسبوع 1 (27 فب - 3 مارس):
  ل: تنظيم البنية
  ث: اختبار + توثيق
  و: auth endpoints
  خ: OTP improvements
  ج: اختبار شامل
  س: مراجعة + merge

الأسبوع 2 (4 - 10 مارس):
  ل: Financial reporting
  ث: Database migrations
  و: Performance tuning
  خ+: اختبارات إضافية

الأسبوع 3+ (11+ مارس):
  - صيانة تحسينات
  - توثيق نهائي
  - إعداد v2.1.0
```

---

**✨ آخر تحديث: 27/02/2026**  
**المسؤول:** ALAWAEL Development Team  
**الحالة:** 🟢 جاهز للتنفيذ
