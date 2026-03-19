# 🔌 تحليل الإضافات المثبتة

## المشكلة

من سجلات VS Code (exthost.log)، الإضافات التالية تسبب مشاكل:

---

## 1. Git Extension (Built-in) 🔴

**الحالة**: المشكلة الرئيسية

**الأخطاء**:

```
Error: Git error (5360+ مرة في session واحد!)
Error: write EOF (مئات المرات)
```

**السبب**:

- يحاول فحص 2.5 GB من الملفات
- يتعطل عند معالجة node_modules
- رغم تعطيله في الإعدادات، مازال يعمل!

**الحل المطبق**:

```json
"git.enabled": false,
"git.autoRepositoryDetection": false,
"git.decorations.enabled": false,
"scm.decorations.enabled": false
```

**التوصية**: ✅ معطّل في الإعدادات الجديدة

---

## 2. HashiCorp Terraform 🟡

**الحالة**: يسبب overhead

**المشكلة**:

```
discover.go: Scanning node_modules/core-js/actual/error
```

**السبب**:

- يبحث عن ملفات `.tf` في كل المجلدات
- يفحص node_modules (مئات الـ MB)
- يستهلك CPU بدون فائدة

**الحل المطبق**:

```json
"terraform.indexing.enabled": false,
"terraform.search.exclude": [
    "**/node_modules/**",
    "**/dist/**"
]
```

**التوصية**:

- ✅ محسّن في الإعدادات الجديدة
- ❌ **عطّله** إذا لم تستخدم Terraform

---

## 3. ESLint Extension 🟡

**الحالة**: معطّل جزئيًا

**المشكلة**:

```
Error: Cannot find module 'eslint-visitor-keys'
```

**السبب**:

- Dependencies غير مثبتة بشكل صحيح
- يحاول العمل على كامل المشروع

**الحل المطبق**:

```json
"eslint.run": "onSave",
"eslint.workingDirectories": [
    { "pattern": "./backend" },
    { "pattern": "./frontend" }
]
```

**التوصية**: ✅ محسّن في الإعدادات الجديدة

---

## 4. Microsoft Authentication 🟡

**الحالة**: أخطاء غير حرجة

**المشكلة**:

```
Error: @azure/msal-node-extensions@1.5.25
StatusInternal::Unexpected
```

**السبب**: مشكلة في تخزين credentials

**الحل**: لا حاجة لإجراء - أخطاء تسجيل فقط

**التوصية**: ✅ يمكن تجاهلها

---

## 5. GitHub Copilot / Copilot Chat ✅

**الحالة**: يعمل بشكل طبيعي

**الأخطاء**:

```
AbortError: This operation was aborted (عارضة ونادرة)
```

**السبب**: عملية ملغاة (طبيعي)

**التوصية**: ✅ يعمل بشكل جيد - ابقه مفعّلاً

---

## إضافات أخرى

### ✅ آمنة ومُحسّنة:

- **Prettier** - للـ formatting
- **TypeScript** - مُحسّن في الإعدادات
- **JSON/JSONC** - خفيف
- **Markdown** - معطّل validation

### 🟡 ثقيلة - فكّر في تعطيلها:

- **Docker Explorer** (formulahendry.docker-explorer)
  - استخدم Docker extension الأصلي من Microsoft بدلاً منه
  - التوصية: **عطّله**

- **GitHub Actions** (github.vscode-github-actions)
  - إذا لم تعمل على workflows يوميًا
  - التوصية: **عطّله مؤقتًا**

- **Python Extension** (ms-python.python)
  - إذا لم تكتب Python في هذا المشروع
  - التوصية: **عطّله للـ Workspace**

---

## كيف تعطّل إضافة لـ Workspace فقط؟

1. اضغط `Ctrl+Shift+X` (Extensions)
2. ابحث عن الإضافة
3. اضغط زر الترس ⚙️
4. اختر **"Disable (Workspace)"**

هكذا تبقى الإضافة مفعّلة في مشاريع أخرى!

---

## قائمة توصيات نهائية

| الإضافة         | الإجراء                | السبب                             |
| --------------- | ---------------------- | --------------------------------- |
| Git (Built-in)  | ✅ معطّل               | يسبب 5000+ خطأ                    |
| Terraform       | ✅ محسّن / عطّله       | يفحص node_modules                 |
| ESLint          | ✅ محسّن               | مقيّد لمجلدات محددة               |
| Docker Explorer | ⚠️ عطّله               | استخدم Microsoft Docker بدلاً منه |
| GitHub Actions  | ⚠️ عطّله مؤقتًا        | ثقيل إذا لم تستخدمه               |
| Python          | ⚠️ عطّله للـ Workspace | لا Python في هذا المشروع          |
| Copilot         | ✅ أبقه                | يعمل بشكل جيد                     |
| Prettier        | ✅ أبقه                | خفيف ومفيد                        |
| TypeScript      | ✅ أبقه                | محسّن في الإعدادات                |

---

## Extension Bisect - إذا استمرت المشاكل

إذا مازال VS Code يتعطل بعد تطبيق الحل:

### الخطوات:

1. اضغط `Ctrl+Shift+P`
2. ابحث عن: **"Help: Start Extension Bisect"**
3. جرّب المشكلة
4. اختر:
   - **"This is bad"** - إذا المشكلة موجودة
   - **"Good now"** - إذا المشكلة اختفت
5. كرّر حتى يحدد VS Code الإضافة المسببة

---

## الملخص النهائي

**قبل الإصلاح**:

- 5360+ أخطاء Git errors
- Terraform يفحص node_modules
- ESLint معطّل جزئيًا
- VS Code بطيء وثقيل

**بعد الإصلاح**:

- ✅ Git معطّل كليًا
- ✅ Terraform محسّن / معطّل
- ✅ ESLint يعمل على مجلدات محددة
- ✅ VS Code سريع وخفيف

---

**آخر تحديث**: 1 مارس 2026
**المصدر**: تحليل exthost.log من VS Code
**الحالة**: ✅ الحل مطبّق في settings.optimized.json
