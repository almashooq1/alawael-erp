# 🎨 دليل تصميم الواجهة العربية - Arabic UI Design Guidelines

**نظام ERP مركز تأهيل والطلاب الموهوبين**

**التاريخ:** يناير 2026 | **الإصدار:** 1.0 | **الحالة:** جاهز للتنفيذ

---

## 📋 جدول المحتويات

1. [أسس التصميم العربي RTL](#أسس-التصميم-العربي-rtl)
2. [معايير الخطوط والألوان](#معايير-الخطوط-والألوان)
3. [مكونات الواجهة الأساسية](#مكونات-الواجهة-الأساسية)
4. [هيكل الصفحة الرئيسي](#هيكل-الصفحة-الرئيسي)
5. [مواصفات تفصيلية للشاشات](#مواصفات-تفصيلية-للشاشات)
6. [معايير الوصول والشمول](#معايير-الوصول-والشمول)
7. [التفاعلات والحركات](#التفاعلات-والحركات)
8. [توصيات للمصمم والمطور](#توصيات-للمصمم-والمطور)

---

## 🔄 أسس التصميم العربي RTL

### 1. اتجاه النصوص والعناصر

#### المبادئ الأساسية:

```
┌─────────────────────────────────────────┐
│  أيقونة  |  عنوان الصفحة  | ☰ القائمة │  ← اليمين (البداية)
│                                          │
│ ┌──────────────────────────────────────┐ │
│ │                                      │ │
│ │     منطقة المحتوى الرئيسية          │ │
│ │     (من اليمين لليسار)               │ │
│ │                                      │ │
│ └──────────────────────────────────────┘ │
│                                          │
│  حفظ  |  إلغاء  |  حذف  |  تعديل        │  ← تجميع الأزرار
└─────────────────────────────────────────┘
```

#### قواعد اتجاه العناصر:

| العنصر                  | الاتجاه | الملاحظات                                |
| ----------------------- | ------- | ---------------------------------------- |
| **النصوص والعناوين**    | RTL     | محاذاة لليمين دائماً                     |
| **القائمة الجانبية**    | اليمين  | تبدأ من الحافة اليمنى                    |
| **شريط التنقل العلوي**  | RTL     | الشعار على اليمين، القائمة على اليسار    |
| **الجداول**             | RTL     | رؤوس الأعمدة من اليمين لليسار            |
| **الأيقونات الاتجاهية** | معكوسة  | الأسهم الأمامية تشير لليسار              |
| **الأزرار**             | RTL     | الأيقونة على اليسار من النص              |
| **النماذج**             | RTL     | التسميات على اليمين، الحقول تمتد لليسار  |
| **الكروت والبطاقات**    | RTL     | العنوان على اليمين، المحتوى يتدفق لليسار |

### 2. تدرج المعلومات البصري

#### نموذج التركيز:

```
المستوى الأول (الأهم - الجزء العلوي الأيمن):
  • العنوان الرئيسي
  • الإحصائيات المهمة
  • CTA Buttons (أزرار الإجراء الأساسي)

المستوى الثاني (مهم - الوسط):
  • الجداول والقوائم
  • نماذج الإدخال
  • التقارير

المستوى الثالث (معلومات إضافية - الأسفل/اليسار):
  • روابط إضافية
  • معلومات الفوتر
  • ملاحظات وتعليقات
```

### 3. المسافات والحواشي

| العنصر                  | القيمة | الاستخدام                    |
| ----------------------- | ------ | ---------------------------- |
| **الحاشية الرئيسية**    | 24px   | المسافة من حافة الشاشة       |
| **الحاشية بين العناصر** | 16px   | بين الكروت والأقسام          |
| **الحاشية الداخلية**    | 12px   | داخل الكروت والنماذج         |
| **ارتفاع سطر النص**     | 1.6    | للعربية (أكثر من الإنجليزية) |
| **المسافة بين الأحرف**  | +0.5px | لتحسين القراءة               |

---

## 🎨 معايير الخطوط والألوان

### 1. نظام الخطوط العربية

#### الخطوط الموصى بها:

**الخيار الأول - للاستخدام الاحترافي:**

```css
/* العربية - الخط الأساسي */
font-family: 'GE SS Text', 'Cairo', 'Noto Sans Arabic', sans-serif;

/* الأوزان المستخدمة */
- Regular (400): النصوص العادية والفقرات
- Medium (500): العناوين الفرعية والتسميات
- Bold (700): العناوين الرئيسية والبيانات المهمة

/* الحجوم */
- h1: 32px (العنوان الرئيسي للصفحة)
- h2: 24px (عناوين الأقسام)
- h3: 20px (عناوين فرعية)
- h4: 16px (عناوين البطاقات)
- body: 14px (النصوص العادية)
- small: 12px (النصوص الثانوية)
- xs: 11px (المساعدات والملاحظات)
```

**الخيار الثاني - بديل مجاني:**

```css
font-family: 'Noto Sans Arabic', 'Segoe UI', sans-serif;
```

**الخيار الثالث - للتطبيقات الحكومية:**

```css
font-family: 'Droid Arabic Naskh', 'Cairo', sans-serif;
```

#### مثال CSS كامل:

```css
:root {
  --font-primary: 'GE SS Text', 'Cairo', 'Noto Sans Arabic', sans-serif;
  --font-secondary: 'Segoe UI', sans-serif;

  --text-lg: 16px;
  --text-base: 14px;
  --text-sm: 12px;
  --text-xs: 11px;

  --line-height-base: 1.6;
  --letter-spacing-base: 0.5px;
}

body {
  font-family: var(--font-primary);
  font-size: var(--text-base);
  line-height: var(--line-height-base);
  letter-spacing: var(--letter-spacing-base);
  direction: rtl;
  text-align: right;
}

h1 {
  font-size: 32px;
  font-weight: 700;
  line-height: 1.2;
}
h2 {
  font-size: 24px;
  font-weight: 700;
  line-height: 1.3;
}
h3 {
  font-size: 20px;
  font-weight: 600;
  line-height: 1.4;
}
```

### 2. نظام الألوان

#### الألوان الأساسية:

```
Brand Colors:
┌──────────────────────────────────────┐
│ لون أساسي (Primary):                  │
│ #2563EB - أزرق احترافي               │
│ استخدام: أزرار CTA، الروابط، التحديدات│
│ Hover: #1D4ED8                       │
│ Active: #1E40AF                      │
│ Light: #EFF6FF (للخلفيات)             │
│                                      │
│ لون ثانوي (Secondary):               │
│ #10B981 - أخضر نجاح                  │
│ استخدام: رسائل النجاح، العمليات الموثوقة│
│ Hover: #059669                       │
│ Light: #ECFDF5                       │
│                                      │
│ لون التحذير (Warning):               │
│ #F59E0B - برتقالي                    │
│ استخدام: تحذيرات وتنبيهات              │
│ Light: #FFFBEB                       │
│                                      │
│ لون الخطأ (Error):                    │
│ #EF4444 - أحمر                       │
│ استخدام: رسائل الخطأ والحذف            │
│ Light: #FEE2E2                       │
│                                      │
│ لون غامق (Dark):                     │
│ #1F2937 - رمادي غامق                 │
│ استخدام: النصوص الأساسية والعناصر      │
│ Light: #F3F4F6 - رمادي فاتح           │
│ Border: #E5E7EB - رمادي الحدود        │
└──────────────────────────────────────┘
```

#### استخدام الألوان حسب السياق:

| الحالة                | اللون             | الاستخدام            |
| --------------------- | ----------------- | -------------------- |
| **عملية ناجحة**       | أخضر (#10B981)    | تأكيد، إضافة، حفظ ✓  |
| **عملية متقدمة/نشطة** | أزرق (#2563EB)    | تعديل، فتح، اختيار ← |
| **تحذير مهم**         | برتقالي (#F59E0B) | تحقق، راجع، انتظر ⚠  |
| **عملية خطرة**        | أحمر (#EF4444)    | حذف، إلغاء، رفض ✗    |
| **معطل/غير فعال**     | رمادي (#9CA3AF)   | غير متاح، مغلق ‐     |

### 3. أمثلة الاستخدام:

```html
<!-- مثال 1: زر النجاح -->
<button class="btn btn-success">✓ حفظ التغييرات</button>

<!-- مثال 2: تنبيه تحذير -->
<div class="alert alert-warning">⚠ هذه العملية لا يمكن التراجع عنها</div>

<!-- مثال 3: رسالة خطأ -->
<div class="alert alert-error">✗ فشل التحميل. حاول مجددًا</div>

<!-- مثال 4: معلومة مهمة -->
<div class="alert alert-info">ℹ تم إضافة طالب جديد بنجاح</div>
```

---

## 🧩 مكونات الواجهة الأساسية

### 1. شريط التنقل العلوي (Top Navigation Bar)

```
┌────────────────────────────────────────────────────────┐
│  تسجيل خروج │ محمد أحمد │ 📬 إشعارات │    │ بحث... │   │ شعار     │
│  (5px مسافة بين العناصر)                                 │ (اليمين) │
└────────────────────────────────────────────────────────┘

Specifications:
- الارتفاع: 64px
- خلفية: أبيض (#FFFFFF) مع حد سفلي رمادي فاتح (#E5E7EB)
- الشعار على اليمين (80px عرض)
- مسافة من اليمين: 24px
- البحث في الوسط (300px عرض)
- الأيقونات والقائمة على اليسار
- Sticky (ثابت عند التمرير)
```

**مثال HTML/Vue:**

```vue
<template>
  <header class="navbar" dir="rtl">
    <!-- اليمين: الشعار -->
    <div class="navbar-brand">
      <img src="logo.svg" alt="Alawael" />
    </div>

    <!-- الوسط: البحث -->
    <div class="navbar-search">
      <input type="text" placeholder="ابحث..." />
    </div>

    <!-- اليسار: الأيقونات والمستخدم -->
    <div class="navbar-actions">
      <button class="btn-icon">🔔</button>
      <div class="dropdown">
        <span>{{ userName }}</span>
        <button class="btn-icon">👤</button>
      </div>
      <button class="btn-logout">تسجيل خروج</button>
    </div>
  </header>
</template>

<style scoped>
.navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 64px;
  background: #ffffff;
  border-bottom: 1px solid #e5e7eb;
  padding: 0 24px;
  position: sticky;
  top: 0;
  z-index: 100;
}

.navbar-brand {
  width: 80px;
  display: flex;
  align-items: center;
}

.navbar-search {
  flex: 1;
  max-width: 300px;
  margin: 0 24px;
}

.navbar-actions {
  display: flex;
  gap: 16px;
  align-items: center;
}
</style>
```

### 2. القائمة الجانبية (Sidebar)

```
┌─────────────────────┐
│ لوحة التحكم          │  ← نشطة
│ ━━━━━━━━━━━━━━━━━  │
│ 📊 الإحصائيات       │
│ 👥 الطلاب          │  ← لون أساسي
│ 📚 البرامج          │
│ 📝 الخطط الفردية   │
│ 💬 المراسلات        │
│ 📋 التقارير         │
│ ⚙️ الإعدادات        │
│ ━━━━━━━━━━━━━━━━━  │
│ ? مساعدة            │
│ 🌙 الوضع الليلي     │
└─────────────────────┘

Specifications:
- العرض: 280px
- ارتفاع: 100vh (الارتفاع الكامل)
- خلفية: أبيض (#FFFFFF) أو رمادي فاتح (#F9FAFB)
- حد يميني: 1px رمادي (#E5E7EB)
- Sticky (ثابتة عند التمرير)
- أيقونات معكوسة للـ RTL
- نص مختصر واضح (مثل "الطلاب" بدل "إدارة الطلاب")
```

**مثال HTML/Vue:**

```vue
<template>
  <aside class="sidebar" dir="rtl">
    <nav class="nav-list">
      <div class="nav-group">
        <h3 class="nav-group-title">الرئيسية</h3>
        <router-link to="/dashboard" class="nav-item active">
          <span class="nav-icon">📊</span>
          <span class="nav-text">لوحة التحكم</span>
        </router-link>
        <router-link to="/students" class="nav-item">
          <span class="nav-icon">👥</span>
          <span class="nav-text">الطلاب</span>
        </router-link>
      </div>

      <div class="nav-group">
        <h3 class="nav-group-title">إدارة</h3>
        <router-link to="/programs" class="nav-item">
          <span class="nav-icon">📚</span>
          <span class="nav-text">البرامج</span>
        </router-link>
        <router-link to="/plans" class="nav-item">
          <span class="nav-icon">📝</span>
          <span class="nav-text">الخطط</span>
        </router-link>
      </div>

      <div class="nav-group">
        <h3 class="nav-group-title">أخرى</h3>
        <router-link to="/reports" class="nav-item">
          <span class="nav-icon">📋</span>
          <span class="nav-text">التقارير</span>
        </router-link>
        <router-link to="/settings" class="nav-item">
          <span class="nav-icon">⚙️</span>
          <span class="nav-text">الإعدادات</span>
        </router-link>
      </div>
    </nav>

    <div class="sidebar-footer">
      <button class="nav-item">
        <span class="nav-icon">?</span>
        <span class="nav-text">مساعدة</span>
      </button>
      <button class="nav-item">
        <span class="nav-icon">🌙</span>
        <span class="nav-text">الوضع الليلي</span>
      </button>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  width: 280px;
  height: 100vh;
  background: #ffffff;
  border-left: 1px solid #e5e7eb;
  padding: 24px 0;
  position: sticky;
  top: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.nav-list {
  flex: 1;
}

.nav-group {
  margin-bottom: 24px;
}

.nav-group-title {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  color: #6b7280;
  padding: 8px 16px;
  margin-bottom: 8px;
  letter-spacing: 0.5px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  color: #4b5563;
  text-decoration: none;
  transition: all 0.2s;
  cursor: pointer;
  border-right: 3px solid transparent;
}

.nav-item:hover {
  background: #f3f4f6;
  color: #2563eb;
}

.nav-item.active {
  background: #eff6ff;
  color: #2563eb;
  border-right-color: #2563eb;
}

.nav-icon {
  font-size: 18px;
  width: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.nav-text {
  font-size: 14px;
  font-weight: 500;
}

.sidebar-footer {
  padding-top: 16px;
  border-top: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
</style>
```

### 3. البطاقات (Cards)

```
┌─────────────────────────────────────┐
│ العنوان                    [⋮]      │  ← رأس البطاقة
│ ─────────────────────────────────  │
│ محتوى البطاقة                       │
│ (نص، جداول، رسوم بيانية)             │
│ ─────────────────────────────────  │
│    إلغاء    |    حفظ    |    حذف    │  ← أزرار الإجراء
└─────────────────────────────────────┘

Specifications:
- التقوس: 8px (border-radius)
- الظل: 0 1px 3px rgba(0,0,0,0.1)
- الحد: 1px solid #E5E7EB
- الحاشية: 20px
- الخلفية: #FFFFFF
```

**مثال Vue:**

```vue
<template>
  <div class="card" dir="rtl">
    <div class="card-header">
      <h3 class="card-title">معلومات الطالب</h3>
      <button class="btn-more">⋮</button>
    </div>
    <div class="card-body">
      <!-- محتوى -->
    </div>
    <div class="card-footer">
      <button class="btn btn-secondary">إلغاء</button>
      <button class="btn btn-danger">حذف</button>
      <button class="btn btn-primary">حفظ</button>
    </div>
  </div>
</template>

<style scoped>
.card {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #e5e7eb;
}

.card-title {
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.card-body {
  padding: 20px;
}

.card-footer {
  display: flex;
  gap: 12px;
  justify-content: flex-start;
  padding: 16px 20px;
  border-top: 1px solid #e5e7eb;
  background: #f9fafb;
}
</style>
```

### 4. الجداول (Tables)

```
┌─────────────────────────────────────────────┐
│ الاسم          │ البريد       │ الحالة    │ إجراءات│
├─────────────────────────────────────────────┤
│ محمد أحمد       │ m@email.com  │ نشط      │ ✏️ 🗑️  │
│ فاطمة علي      │ f@email.com  │ نشط      │ ✏️ 🗑️  │
│ أحمد سالم      │ a@email.com  │ معلق    │ ✏️ 🗑️  │
└─────────────────────────────────────────────┘

Specifications:
- رؤوس الأعمدة: غامقة (#1F2937)، خلفية رمادية فاتحة (#F9FAFB)
- صفوف متبادلة: بيضاء وفاتحة جداً (#F9FAFB)
- الارتفاع: 48px لكل صف
- المسافة: 16px بين الخلايا
- الأيقونات في الإجراءات: 24x24px
```

**مثال Vue:**

```vue
<template>
  <div class="table-container" dir="rtl">
    <table class="table">
      <thead>
        <tr>
          <th>الاسم</th>
          <th>البريد الإلكتروني</th>
          <th>الحالة</th>
          <th>الإجراءات</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="student in students" :key="student.id">
          <td>{{ student.name }}</td>
          <td>{{ student.email }}</td>
          <td>
            <span :class="`badge badge-${student.status}`">
              {{ student.statusLabel }}
            </span>
          </td>
          <td class="actions">
            <button class="btn-icon" @click="edit(student)">✏️</button>
            <button class="btn-icon btn-danger" @click="delete student">🗑️</button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.table-container {
  overflow-x: auto;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.table {
  width: 100%;
  border-collapse: collapse;
}

.table thead {
  background: #f9fafb;
  border-bottom: 2px solid #e5e7eb;
}

.table th {
  padding: 16px;
  text-align: right;
  font-weight: 600;
  color: #1f2937;
  font-size: 13px;
}

.table tbody tr {
  border-bottom: 1px solid #e5e7eb;
  transition: background 0.2s;
}

.table tbody tr:hover {
  background: #f9fafb;
}

.table td {
  padding: 16px;
  color: #4b5563;
  font-size: 14px;
}

.table .actions {
  display: flex;
  gap: 8px;
}

.badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
}

.badge-active {
  background: #ecfdf5;
  color: #10b981;
}

.badge-pending {
  background: #fffbeb;
  color: #f59e0b;
}

.badge-inactive {
  background: #f3f4f6;
  color: #6b7280;
}
</style>
```

### 5. النماذج (Forms)

```
┌─────────────────────────────────┐
│ اسم الطالب (مطلوب) *             │
│ [                               ]  ← حقل بعرض كامل
│                                  │
│ البريد الإلكتروني (مطلوب) *       │
│ [                               ]  │
│                                  │
│ العمر              │ النوع        │
│ [    ]             │ [   ▼]       │  ← حقول بعرض نصف
└─────────────────────────────────┘

Specifications:
- عرض كامل الحقل: 100%
- ارتفاع الحقل: 44px
- الحاشية الداخلية: 12px 16px
- الحد: 1px #E5E7EB
- التقوس: 6px
- التسميات: 14px، وزن 500
- الخطأ: أحمر (#EF4444)، 12px
- المساعدة: رمادي (#6B7280)، 12px
```

**مثال Vue:**

```vue
<template>
  <form @submit.prevent="submitForm" dir="rtl">
    <!-- حقل نصي بسيط -->
    <div class="form-group">
      <label for="name" class="form-label">
        اسم الطالب
        <span class="required">*</span>
      </label>
      <input
        id="name"
        v-model="form.name"
        type="text"
        class="form-control"
        :class="{ 'is-invalid': errors.name }"
        placeholder="أدخل الاسم الكامل"
      />
      <div v-if="errors.name" class="form-error">
        {{ errors.name }}
      </div>
    </div>

    <!-- حقل بريد إلكتروني -->
    <div class="form-group">
      <label for="email" class="form-label">
        البريد الإلكتروني
        <span class="required">*</span>
      </label>
      <input
        id="email"
        v-model="form.email"
        type="email"
        class="form-control"
        :class="{ 'is-invalid': errors.email }"
        placeholder="example@email.com"
      />
      <div v-if="errors.email" class="form-error">
        {{ errors.email }}
      </div>
    </div>

    <!-- صف بحقلين -->
    <div class="form-row">
      <div class="form-group">
        <label for="age" class="form-label">العمر</label>
        <input id="age" v-model.number="form.age" type="number" class="form-control" min="5" max="25" />
      </div>
      <div class="form-group">
        <label for="gender" class="form-label">النوع</label>
        <select v-model="form.gender" class="form-control">
          <option value="">اختر...</option>
          <option value="male">ذكر</option>
          <option value="female">أنثى</option>
        </select>
      </div>
    </div>

    <!-- منطقة نصية -->
    <div class="form-group">
      <label for="notes" class="form-label">ملاحظات</label>
      <textarea id="notes" v-model="form.notes" class="form-control" rows="4" placeholder="أدخل أي ملاحظات..."></textarea>
      <div class="form-help">الحد الأقصى: 500 حرف</div>
    </div>

    <!-- أزرار الإجراء -->
    <div class="form-actions">
      <button type="button" class="btn btn-secondary" @click="cancel">إلغاء</button>
      <button type="submit" class="btn btn-primary">حفظ التغييرات</button>
    </div>
  </form>
</template>

<style scoped>
.form-group {
  margin-bottom: 24px;
}

.form-label {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #1f2937;
}

.required {
  color: #ef4444;
  margin-right: 4px;
}

.form-control {
  width: 100%;
  height: 44px;
  padding: 12px 16px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  font-family: inherit;
  font-size: 14px;
  color: #1f2937;
  transition: all 0.2s;
}

.form-control:focus {
  outline: none;
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.form-control:disabled {
  background: #f9fafb;
  color: #9ca3af;
  cursor: not-allowed;
}

.form-control.is-invalid {
  border-color: #ef4444;
}

.form-control.is-invalid:focus {
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
}

textarea.form-control {
  height: auto;
  resize: vertical;
}

.form-error {
  margin-top: 6px;
  font-size: 12px;
  color: #ef4444;
}

.form-help {
  margin-top: 6px;
  font-size: 12px;
  color: #6b7280;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.form-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-start;
  margin-top: 32px;
  padding-top: 24px;
  border-top: 1px solid #e5e7eb;
}
</style>
```

### 6. الأزرار (Buttons)

```
┌──────────────────────────────────────────────┐
│ أزرار النوع الأساسي (Primary):             │
│ [ ✓ حفظ ]   [ ← نقل ]   [ + إضافة ]        │
│                                            │
│ أزرار النوع الثانوي (Secondary):          │
│ [ إلغاء ]   [ تراجع ]                      │
│                                            │
│ أزرار الخطر (Danger):                     │
│ [ ✗ حذف ]   [ ⚠ تنبيه ]                    │
│                                            │
│ أزرار الأيقونة (Icon Buttons):            │
│ [ ✏️ ]   [ 🗑️ ]   [ ➕ ]   [ 🔄 ]          │
│                                            │
│ أزرار معطلة (Disabled):                   │
│ [ حفظ ] (معطل)                            │
└──────────────────────────────────────────────┘

Specifications:
- الارتفاع: 44px
- الحاشية: 12px 24px
- التقوس: 6px
- الخط: 14px، وزن 500
- الانتقال: 200ms
- الحد الأدنى للعرض: 100px
```

**مثال CSS:**

```css
/* أزرار أساسية */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 44px;
  padding: 12px 24px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  min-width: 100px;
  justify-content: center;
}

/* أساسي - أزرق */
.btn-primary {
  background: #2563eb;
  color: white;
}

.btn-primary:hover {
  background: #1d4ed8;
  box-shadow: 0 4px 6px rgba(37, 99, 235, 0.15);
}

.btn-primary:active {
  background: #1e40af;
}

/* ثانوي - رمادي */
.btn-secondary {
  background: #f3f4f6;
  color: #1f2937;
  border: 1px solid #e5e7eb;
}

.btn-secondary:hover {
  background: #e5e7eb;
}

/* خطر - أحمر */
.btn-danger {
  background: #ef4444;
  color: white;
}

.btn-danger:hover {
  background: #dc2626;
  box-shadow: 0 4px 6px rgba(239, 68, 68, 0.15);
}

/* نجاح - أخضر */
.btn-success {
  background: #10b981;
  color: white;
}

.btn-success:hover {
  background: #059669;
}

/* أيقونة */
.btn-icon {
  width: 40px;
  height: 40px;
  padding: 0;
  border-radius: 6px;
  background: transparent;
  border: 1px solid #e5e7eb;
  font-size: 18px;
}

.btn-icon:hover {
  background: #f3f4f6;
}

/* معطل */
.btn:disabled {
  background: #f3f4f6;
  color: #9ca3af;
  cursor: not-allowed;
  opacity: 0.6;
}
```

---

## 🏠 هيكل الصفحة الرئيسي

### التخطيط الكامل:

```
┌────────────────────────────────────────────────────────────┐
│  Navbar (64px)                                             │
└────────────────────────────────────────────────────────────┘
┌─────────────────┬──────────────────────────────────────────┐
│                 │                                          │
│  Sidebar        │  Main Content Area                       │
│  (280px)        │  (Responsive)                            │
│                 │                                          │
│                 │ ┌────────────────────────────────────┐   │
│                 │ │ الصفحة / الاسم                      │   │
│                 │ └────────────────────────────────────┘   │
│                 │                                          │
│                 │ ┌────────────────────────────────────┐   │
│                 │ │  كروت الإحصائيات                   │   │
│                 │ │ ┌──────────┐ ┌──────────┐          │   │
│                 │ │ │ إحصائية 1│ │ إحصائية 2│          │   │
│                 │ │ └──────────┘ └──────────┘          │   │
│                 │ └────────────────────────────────────┘   │
│                 │                                          │
│                 │ ┌────────────────────────────────────┐   │
│                 │ │  جدول البيانات                      │   │
│                 │ │ (مع صفحات)                         │   │
│                 │ └────────────────────────────────────┘   │
│                 │                                          │
│                 │ ┌────────────────────────────────────┐   │
│                 │ │  الفوتر                            │   │
│                 │ └────────────────────────────────────┘   │
└─────────────────┴──────────────────────────────────────────┘
```

### القياسات:

| العنصر                   | القياس |
| ------------------------ | ------ |
| **ارتفاع Navbar**        | 64px   |
| **عرض Sidebar**          | 280px  |
| **الحاشية الرئيسية**     | 24px   |
| **ارتفاع الفوتر**        | 60px   |
| **العرض الأقصى للمحتوى** | 1400px |

**مثال الهيكل الرئيسي:**

```vue
<template>
  <div class="app-container" dir="rtl">
    <!-- الـ Navbar -->
    <Navbar />

    <!-- الحاوية الرئيسية -->
    <div class="app-main">
      <!-- الـ Sidebar -->
      <Sidebar />

      <!-- منطقة المحتوى -->
      <main class="app-content">
        <div class="content-inner">
          <!-- الصفحات الفردية تُدرج هنا -->
          <router-view />
        </div>
      </main>
    </div>

    <!-- الفوتر -->
    <Footer />
  </div>
</template>

<style scoped>
.app-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.app-main {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.app-content {
  flex: 1;
  overflow-y: auto;
  background: #f9fafb;
  padding: 24px;
}

.content-inner {
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
}
</style>
```

---

## 📊 مواصفات تفصيلية للشاشات

### 1. شاشة لوحة التحكم (Dashboard)

سيتم التفصيل في ملف منفصل: `🎨_DASHBOARD_DETAILED_SPECS.md`

### 2. شاشة ملف الطالب (Student Profile)

سيتم التفصيل في ملف منفصل: `🎨_STUDENT_PROFILE_SPECS.md`

### 3. شاشة الخطة الفردية (Individual Plan)

سيتم التفصيل في ملف منفصل: `🎨_INDIVIDUAL_PLAN_SPECS.md`

---

## ♿ معايير الوصول والشمول (Accessibility)

### 1. تباين الألوان (Color Contrast)

**معايير WCAG 2.1:**

- **AA**: نسبة تباين 4.5:1 للنص العادي
- **AAA**: نسبة تباين 7:1 للنص العادي

**أمثلة آمنة:**

```
✓ نص غامق (#1F2937) على خلفية بيضاء (#FFFFFF) = 21:1 (AAA)
✓ نص رمادي (#4B5563) على خلفية بيضاء (#FFFFFF) = 8.5:1 (AAA)
✓ نص أزرق (#2563EB) على خلفية بيضاء (#FFFFFF) = 8.6:1 (AAA)
✗ نص رمادي فاتح (#9CA3AF) على خلفية بيضاء (#FFFFFF) = 4:1 (فشل - لا تستخدم)
```

### 2. حجم الخط والقراءة

| الحد الأدنى | الاستخدام                            |
| ----------- | ------------------------------------ |
| **14px**    | نص أساسي في الفقرات والجداول         |
| **12px**    | ملاحظات وتعليقات (فقط إذا لزم الحال) |
| **11px**    | روابط صغيرة جداً، لا يُنصح بها       |
| **32px+**   | العناوين الرئيسية                    |

### 3. التنقل بلوحة المفاتيح

```
Tab: التنقل للأمام بين العناصر
Shift + Tab: التنقل للخلف
Enter: تفعيل الزر المركز
Spacebar: تفعيل الزر أو تبديل Checkbox
Arrow Keys: التنقل داخل الـ Dropdown أو الجداول
Escape: إغلاق الـ Dialogs والـ Dropdowns
```

**مثال Vue:**

```vue
<template>
  <button
    class="btn btn-primary"
    @click="handleClick"
    @keydown.enter="handleClick"
    @keydown.space="handleClick"
    :aria-label="buttonLabel"
    :disabled="isDisabled"
    tabindex="0"
  >
    {{ buttonText }}
  </button>
</template>

<script>
export default {
  data() {
    return {
      buttonLabel: 'حفظ التغييرات',
      buttonText: 'حفظ',
      isDisabled: false,
    };
  },
  methods: {
    handleClick() {
      // تنفيذ الإجراء
    },
  },
};
</script>
```

### 4. ARIA Labels والعلامات

```html
<!-- أمثلة ARIA الصحيحة للعربية -->

<!-- 1. زر بدون نص -->
<button aria-label="حذف الطالب">🗑️</button>

<!-- 2. أيقونة بتوصيف -->
<span aria-label="نشط" class="badge badge-active">🟢</span>

<!-- 3. نموذج بعنوان -->
<form aria-labelledby="formTitle">
  <h2 id="formTitle">إضافة طالب جديد</h2>
  <!-- حقول النموذج -->
</form>

<!-- 4. جدول معقد -->
<table aria-label="قائمة الطلاب">
  <caption>
    جدول يوضح معلومات الطلاب المسجلين
  </caption>
  <!-- محتوى الجدول -->
</table>

<!-- 5. منطقة ديناميكية تتغير -->
<div aria-live="polite" aria-label="الرسائل">تم حفظ البيانات بنجاح</div>
```

### 5. نسبة التباين العملية

```css
:root {
  /* نصوص آمنة - تباين AAA */
  --color-text-primary: #1f2937; /* على الأبيض: 21:1 ✓ */
  --color-text-secondary: #4b5563; /* على الأبيض: 8.5:1 ✓ */
  --color-text-muted: #6b7280; /* على الأبيض: 6.3:1 ✓ */

  /* ألوان غير آمنة - تجنبها */
  --color-text-light: #9ca3af; /* على الأبيض: 4:1 ✗ */

  /* الخلفيات */
  --color-bg-primary: #ffffff;
  --color-bg-secondary: #f9fafb;
}
```

---

## 🎬 التفاعلات والحركات

### 1. الانتقالات (Transitions)

```css
/* الحركات الموصى بها */
:root {
  --transition-fast: 150ms ease-out;
  --transition-base: 200ms ease-out;
  --transition-slow: 300ms ease-out;
}

/* استخدامات */
.btn {
  transition: all var(--transition-base);
}

.menu-slide {
  transition: transform var(--transition-slow);
}

.tooltip {
  transition: opacity var(--transition-fast);
}
```

### 2. الحركات المتقدمة

```css
/* دخول العنصر (Fade In) */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.card {
  animation: fadeIn 300ms ease-out;
}

/* تحميل (Loading) */
@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.spinner {
  animation: spin 1s linear infinite;
}

/* نبض (Pulse) */
@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.loading-dot {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
```

### 3. الأثر البصري عند التفاعل

```html
<!-- مثال: زر مع تأثير نقر -->
<template>
  <button class="btn btn-primary" @click.prevent="handleClick" @mousedown="onMouseDown" @mouseup="onMouseUp">حفظ التغييرات</button>
</template>

<style scoped>
  .btn {
    position: relative;
    overflow: hidden;
  }

  .btn::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 0;
    height: 0;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.3);
    transform: translate(-50%, -50%);
    transition:
      width 0.6s,
      height 0.6s;
  }

  .btn:active::after {
    width: 300px;
    height: 300px;
  }
</style>
```

---

## 🎯 توصيات للمصمم والمطور

### للمصمم (Designer):

1. **استخدم أدوات التصميم العربية:**
   - Figma مع plugins RTL
   - Adobe XD RTL support
   - Sketch مع RTL extensions

2. **تطبيق المعايير:**
   - استخدم شبكة (Grid) 8px أساسية
   - احفظ جميع المكونات كـ Components قابلة لإعادة الاستخدام
   - حدد نسب العرض والارتفاع (Aspect Ratios) الموصى بها
   - اختبر تباين الألوان باستخدام أدوات مثل Contrast Ratio

3. **الملفات التسليم:**
   - Mockups عالية الدقة (High-Fi)
   - Design System شامل
   - أسماء الألوان والخطوط بالعربية والإنجليزية
   - توثيق النسب الذهبية والمسافات

### للمطور (Developer):

1. **البيئة:**

   ```bash
   # استخدم Vite مع Vue 3 RTL support
   npm create vite@latest . -- --template vue
   npm install -D tailwindcss postcss autoprefixer
   npm install @headlessui/vue
   ```

2. **التكوين:**

   ```javascript
   // tailwind.config.js
   export default {
     content: ['./index.html', './src/**/*.{vue,js}'],
     theme: {
       extend: {
         direction: ['rtl'],
       },
     },
     plugins: [require('@tailwindcss/rtl')],
   };
   ```

3. **مكتبات موصى بها:**
   - **Vue Router**: للملاحة
   - **Pinia**: لإدارة الحالة (State Management)
   - **Axios**: لـ API calls
   - **Day.js**: لمعالجة التواريخ (RTL-friendly)
   - **Vee-Validate**: لـ Form validation
   - **Headless UI**: للمكونات في الأساس

4. **الاختبار:**
   - اختبر على أجهزة مختلفة (Desktop, Tablet, Mobile)
   - تحقق من RTL في جميع الحالات
   - اختبر الوصول باستخدام WAVE أو Axe DevTools

---

## 📋 قائمة التحقق النهائية

- [ ] جميع النصوص تتجه من اليمين لليسار
- [ ] الأيقونات الاتجاهية معكوسة للـ RTL
- [ ] تباين الألوان > 4.5:1 للنص العادي
- [ ] حجم الخط الأدنى 14px للنصوص الأساسية
- [ ] جميع الأزرار والمدخلات قابلة للتفاعل بلوحة المفاتيح
- [ ] ARIA labels موجودة للعناصر المعقدة
- [ ] الحركات سلسة وليست مزعجة (≤300ms)
- [ ] الخطوط العربية تُحمل من خادم موثوق (Google Fonts, etc.)
- [ ] التصميم متجاوب (Responsive) على جميع الأحجام
- [ ] تم اختبار النماذج بالبيانات الحقيقية
- [ ] تم توثيق جميع الحالات الاستثنائية (Errors, Loading, Empty States)

---

**النسخة:** 1.0  
**آخر تحديث:** يناير 2026  
**الحالة:** ✅ جاهز للتنفيذ
