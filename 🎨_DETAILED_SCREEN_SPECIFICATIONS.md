# 🎨 مواصفات الشاشات التفصيلية

**نظام ERP مركز تأهيل والطلاب الموهوبين**

---

## 1️⃣ شاشة لوحة التحكم (Dashboard)

### الهدف:

عرض ملخص شامل للأنظمة والإحصائيات الرئيسية في لمحة واحدة.

### الهيكل الكامل:

```
┌─────────────────────────────────────────────────────────────────┐
│ لوحة التحكم > الرئيسية                         البحث... │ 👤 │
└─────────────────────────────────────────────────────────────────┘

┌────────────────┬─────────────────────────────────────────────────┐
│                │                                                 │
│ لوحة التحكم    │ ┌────────────────────────────────────────────┐ │
│ الإحصائيات     │ │ الإحصائيات الرئيسية                          │ │
│ الطلاب         │ │ ┌─────────┬─────────┬─────────┬──────────┐ │ │
│ البرامج        │ │ │ إجمالي  │ نشطون   │ برامج   │ جلسات    │ │ │
│ الخطط          │ │ │ الطلاب   │ اليوم   │ جديدة   │ مجدولة   │ │ │
│ المراسلات      │ │ │  245    │   18    │   3     │   12    │ │ │
│ التقارير       │ │ └─────────┴─────────┴─────────┴──────────┘ │ │
│ الإعدادات      │ │                                             │ │
│                │ ├────────────────────────────────────────────┤ │
│                │ │ النشاط الأخير                              │ │
│                │ │ [رسم بياني شريطي - برامج البطلاب الأخيرة]  │ │
│                │ │                                             │ │
│                │ └────────────────────────────────────────────┘ │
│                │                                                 │
│                │ ┌─────────────────────────┬─────────────────┐ │
│                │ │ الطلاب الجدد             │ القادمة        │ │
│                │ │ [قائمة 5 طلاب]           │ [التقويم]       │ │
│                │ │                          │                 │ │
│                │ │ 1. أحمد محمود             │ 15 يناير      │ │
│                │ │ 2. فاطمة علي             │ إجتماع هيئة    │ │
│                │ │ 3. سارة حسن              │                 │ │
│                │ │ ...                     │ 17 يناير      │ │
│                │ │                          │ تقييم جماعي    │ │
│                │ └─────────────────────────┴─────────────────┘ │
│                │                                                 │
│                │ ┌────────────────────────────────────────────┐ │
│                │ │ الإجراءات السريعة                          │ │
│                │ │ [ + إضافة طالب ] [ + برنامج ] [ تقرير ]   │ │
│                │ └────────────────────────────────────────────┘ │
└────────────────┴─────────────────────────────────────────────────┘
```

### التفاصيل الدقيقة:

#### 1. كروت الإحصائيات (Stats Cards)

```
┌─────────────────────────────────┐
│ إجمالي الطلاب         📊        │
│ ─────────────────────────────  │
│              245                │
│ ↑ 12%  مقارنة بالشهر الماضي   │
└─────────────────────────────────┘

Specifications:
- العرض: 25% من عرض المحتوى (4 أعمدة)
- الارتفاع: 140px
- الخلفية: بيضاء (#FFFFFF)
- الحد: 1px #E5E7EB
- الظل: 0 1px 2px rgba(0,0,0,0.05)
- الحاشية: 20px
- الأيقونة على اليسار: 36x36px
- الرقم: حجم 32px، وزن 700
- الوصف الثانوي: 12px، رمادي (#6B7280)
```

**كود Vue:**

```vue
<template>
  <div class="stat-card" dir="rtl">
    <div class="stat-content">
      <p class="stat-label">{{ label }}</p>
      <p class="stat-value">{{ value }}</p>
      <p class="stat-change" :class="{ positive: isPositive }">{{ changeIcon }} {{ changePercent }} {{ changeText }}</p>
    </div>
    <div class="stat-icon">{{ icon }}</div>
  </div>
</template>

<style scoped>
.stat-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 20px;
  min-height: 140px;
}

.stat-content {
  flex: 1;
}

.stat-label {
  font-size: 14px;
  color: #6b7280;
  margin: 0 0 8px 0;
  font-weight: 500;
}

.stat-value {
  font-size: 32px;
  font-weight: 700;
  color: #1f2937;
  margin: 0 0 8px 0;
}

.stat-change {
  font-size: 12px;
  color: #10b981;
  margin: 0;
}

.stat-change.positive {
  color: #10b981;
}

.stat-change.negative {
  color: #ef4444;
}

.stat-icon {
  font-size: 36px;
  margin-right: 16px;
}
</style>
```

#### 2. الرسم البياني (Chart Section)

```
┌────────────────────────────────────┐
│ النشاط الأخير (آخر 7 أيام)          │
│ ─────────────────────────────────  │
│ │                                  │
│ │    ╱╲        ╱╲                  │
│ │   ╱  ╲  ╱╲  ╱  ╲                │
│ │  ╱    ╲╱  ╲╱    ╲               │
│ │────────────────────────          │
│ الأحد الاثنين ... الجمعة           │
└────────────────────────────────────┘

مكتبة مقترحة: Chart.js مع دعم RTL
```

**مثال Vue with Chart.js:**

```vue
<template>
  <div class="chart-card" dir="rtl">
    <div class="chart-header">
      <h3>النشاط الأخير (آخر 7 أيام)</h3>
      <select class="chart-filter">
        <option>الطلاب</option>
        <option>الجلسات</option>
        <option>البرامج</option>
      </select>
    </div>
    <canvas id="activityChart"></canvas>
  </div>
</template>

<script>
import { Chart } from 'chart.js';

export default {
  mounted() {
    const ctx = document.getElementById('activityChart');
    new Chart(ctx, {
      type: 'line',
      data: {
        labels: ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'],
        datasets: [
          {
            label: 'الطلاب الجدد',
            data: [12, 19, 8, 5, 14, 10, 16],
            borderColor: '#2563EB',
            backgroundColor: 'rgba(37, 99, 235, 0.05)',
            tension: 0.4,
            fill: true,
          },
        ],
      },
      options: {
        direction: 'rtl',
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            position: 'bottom',
          },
        },
        scales: {
          y: {
            beginAtZero: true,
          },
        },
      },
    });
  },
};
</script>

<style scoped>
.chart-card {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 20px;
  margin-top: 24px;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.chart-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.chart-filter {
  padding: 8px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  font-size: 14px;
}
</style>
```

#### 3. قائمة الطلاب الجدد (New Students List)

```
┌─────────────────────────────────┐
│ الطلاب الجدد                      │
│ ─────────────────────────────── │
│ 1. أحمد محمود      📧ا      ✏️ 🗑️│
│ 2. فاطمة علي      📧ف      ✏️ 🗑️│
│ 3. سارة حسن       📧س      ✏️ 🗑️│
│ 4. علي محمد       📧ع      ✏️ 🗑️│
│ 5. هيا أحمد       📧ه      ✏️ 🗑️│
│ ─────────────────────────────── │
│ [ عرض الكل → ]                  │
└─────────────────────────────────┘
```

**مثال Vue:**

```vue
<template>
  <div class="students-list-card" dir="rtl">
    <h3 class="card-title">الطلاب الجدد</h3>
    <div class="list">
      <div v-for="(student, index) in newStudents" :key="student.id" class="list-item">
        <span class="item-index">{{ index + 1 }}</span>
        <span class="item-name">{{ student.name }}</span>
        <a :href="`mailto:${student.email}`" class="item-email">📧</a>
        <div class="item-actions">
          <button @click="editStudent(student)" class="btn-icon">✏️</button>
          <button @click="deleteStudent(student)" class="btn-icon btn-danger">🗑️</button>
        </div>
      </div>
    </div>
    <router-link to="/students" class="view-all">عرض الكل ←</router-link>
  </div>
</template>

<style scoped>
.students-list-card {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 20px;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 16px 0;
}

.list {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.list-item {
  display: flex;
  align-items: center;
  padding: 12px;
  border-bottom: 1px solid #e5e7eb;
  gap: 12px;
}

.list-item:last-child {
  border-bottom: none;
}

.item-index {
  width: 24px;
  text-align: center;
  color: #9ca3af;
  font-weight: 600;
}

.item-name {
  flex: 1;
  color: #1f2937;
  font-weight: 500;
}

.item-email {
  cursor: pointer;
  font-size: 16px;
}

.item-actions {
  display: flex;
  gap: 8px;
}

.view-all {
  display: block;
  margin-top: 12px;
  color: #2563eb;
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  text-align: center;
  padding: 8px;
  border-top: 1px solid #e5e7eb;
}

.view-all:hover {
  background: #f9fafb;
  border-radius: 6px;
}
</style>
```

---

## 2️⃣ شاشة ملف الطالب (Student Profile)

### الهدف:

عرض ملف شامل للطالب مع كل المعلومات والتاريخ الأكاديمي.

### الهيكل:

```
┌─────────────────────────────────────────────────────────────────┐
│ ملف الطالب / أحمد محمود                          [ تعديل ] [ حذف]│
└─────────────────────────────────────────────────────────────────┘

┌────────────────┬─────────────────────────────────────────────────┐
│                │                                                 │
│ القائمة         │ ┌───────────────────────────────────────────┐  │
│                │ │ معلومات الطالب الأساسية                    │  │
│                │ │ ─────────────────────────────────────────  │  │
│                │ │ [صورة الطالب]                              │  │
│                │ │ الاسم:        أحمد محمود                  │  │
│                │ │ الرقم الجامعي: 12345                       │  │
│                │ │ البريد:        ahmed@example.com           │  │
│                │ │ الهاتف:        +966 50 123 4567           │  │
│                │ │ الحالة:        🟢 نشط                     │  │
│                │ └───────────────────────────────────────────┘  │
│                │                                                 │
│                │ ┌───────────────────────────────────────────┐  │
│                │ │ البرنامج الحالي                            │  │
│                │ │ ─────────────────────────────────────────  │  │
│                │ │ اسم البرنامج:    الذكاء الاصطناعي          │  │
│                │ │ تاريخ الالتحاق:  15 سبتمبر 2024           │  │
│                │ │ المدة:           6 أشهر                    │  │
│                │ │ التقدم:         [████████░░] 80%         │  │
│                │ └───────────────────────────────────────────┘  │
│                │                                                 │
│                │ ┌───────────────────────────────────────────┐  │
│                │ │ الجلسات                                   │  │
│                │ │ ─────────────────────────────────────────  │  │
│                │ │ [جدول الجلسات مع التقييمات]               │  │
│                │ └───────────────────────────────────────────┘  │
│                │                                                 │
│                │ ┌───────────────────────────────────────────┐  │
│                │ │ الملاحظات والتقارير                       │  │
│                │ │ ─────────────────────────────────────────  │  │
│                │ │ [نصوص الملاحظات]                           │  │
│                │ └───────────────────────────────────────────┘  │
└────────────────┴─────────────────────────────────────────────────┘
```

### العناصر التفصيلية:

#### 1. قسم المعلومات الأساسية

```
┌─────────────────────────────────────┐
│ معلومات الطالب الأساسية              │
│ ─────────────────────────────────  │
│                                     │
│ ┌───────────────┐                  │
│ │               │ أحمد محمود         │
│ │    صورة       │ رقم: 12345       │
│ │    الطالب     │ بريد:...         │
│ │               │ الهاتف: ...      │
│ │               │ الحالة: 🟢 نشط   │
│ └───────────────┘                  │
│                                     │
│ ─────────────────────────────────  │
│ [ تعديل البيانات ] [ أيقونات أخرى ]  │
└─────────────────────────────────────┘
```

**كود Vue:**

```vue
<template>
  <div class="student-info-card" dir="rtl">
    <h3 class="card-title">معلومات الطالب الأساسية</h3>

    <div class="info-content">
      <div class="student-avatar">
        <img :src="student.avatar" :alt="student.name" />
      </div>

      <div class="info-details">
        <p class="name-display">{{ student.name }}</p>

        <div class="info-row">
          <span class="info-label">رقم الطالب:</span>
          <span class="info-value">{{ student.studentId }}</span>
        </div>

        <div class="info-row">
          <span class="info-label">البريد الإلكتروني:</span>
          <a :href="`mailto:${student.email}`" class="info-value link">
            {{ student.email }}
          </a>
        </div>

        <div class="info-row">
          <span class="info-label">رقم الهاتف:</span>
          <a :href="`tel:${student.phone}`" class="info-value link">
            {{ student.phone }}
          </a>
        </div>

        <div class="info-row">
          <span class="info-label">الحالة:</span>
          <span :class="`status status-${student.status}`">
            {{ student.statusLabel }}
          </span>
        </div>
      </div>
    </div>

    <div class="card-actions">
      <button class="btn btn-primary" @click="editStudentInfo">تعديل البيانات</button>
      <button class="btn btn-secondary">خيارات أخرى</button>
    </div>
  </div>
</template>

<style scoped>
.student-info-card {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 24px;
}

.card-title {
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 24px 0;
  border-bottom: 1px solid #e5e7eb;
  padding-bottom: 12px;
}

.info-content {
  display: flex;
  gap: 24px;
  margin-bottom: 24px;
}

.student-avatar {
  flex-shrink: 0;
}

.student-avatar img {
  width: 120px;
  height: 120px;
  border-radius: 8px;
  object-fit: cover;
  border: 2px solid #e5e7eb;
}

.info-details {
  flex: 1;
}

.name-display {
  font-size: 20px;
  font-weight: 700;
  color: #1f2937;
  margin: 0 0 16px 0;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid #f3f4f6;
}

.info-row:last-child {
  border-bottom: none;
}

.info-label {
  color: #6b7280;
  font-weight: 500;
  font-size: 14px;
}

.info-value {
  color: #1f2937;
  font-weight: 500;
}

.info-value.link {
  color: #2563eb;
  text-decoration: none;
}

.info-value.link:hover {
  text-decoration: underline;
}

.status {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
}

.status-active {
  background: #ecfdf5;
  color: #10b981;
}

.status-pending {
  background: #fffbeb;
  color: #f59e0b;
}

.status-inactive {
  background: #f3f4f6;
  color: #6b7280;
}

.card-actions {
  display: flex;
  gap: 12px;
  padding-top: 24px;
  border-top: 1px solid #e5e7eb;
}
</style>
```

#### 2. قسم الخطة الفردية الحالية

```
┌─────────────────────────────────────────────────┐
│ الخطة الفردية الحالية                             │
│ ─────────────────────────────────────────────── │
│ البرنامج:       الذكاء الاصطناعي    [ تغيير ]    │
│ تاريخ البدء:    15 سبتمبر 2024                  │
│ المدة الكلية:   6 أشهر                         │
│ المتبقي:        2 شهر                          │
│                                               │
│ التقدم الأكاديمي:                              │
│ [████████░░░] 70% (21 من 30 ساعة)             │
│                                               │
│ الأهداف:                                     │
│ ☑ اتقان Python        ☑ أساسيات ML            │
│ ☑ التعلم الآلي         ☐ المشروع النهائي       │
│                                               │
│ [ عرض كامل الخطة ]                            │
└─────────────────────────────────────────────────┘
```

**كود Vue:**

```vue
<template>
  <div class="plan-card" dir="rtl">
    <h3 class="card-title">الخطة الفردية الحالية</h3>

    <div class="plan-header">
      <div class="plan-item">
        <span class="label">البرنامج:</span>
        <span class="value">{{ plan.program }}</span>
        <button class="btn-change">تغيير</button>
      </div>
    </div>

    <div class="plan-details">
      <div class="detail-row">
        <span class="label">تاريخ البدء:</span>
        <span class="value">{{ formatDate(plan.startDate) }}</span>
      </div>
      <div class="detail-row">
        <span class="label">المدة الكلية:</span>
        <span class="value">{{ plan.duration }}</span>
      </div>
      <div class="detail-row">
        <span class="label">المتبقي:</span>
        <span class="value">{{ plan.remaining }}</span>
      </div>
    </div>

    <div class="progress-section">
      <p class="section-title">التقدم الأكاديمي:</p>
      <div class="progress-bar">
        <div class="progress-fill" :style="{ width: plan.progress + '%' }"></div>
      </div>
      <p class="progress-text">{{ plan.progress }}% ({{ plan.completed }} من {{ plan.total }} ساعة)</p>
    </div>

    <div class="goals-section">
      <p class="section-title">الأهداف:</p>
      <div class="goals-grid">
        <div v-for="goal in plan.goals" :key="goal.id" class="goal-item">
          <input type="checkbox" :checked="goal.completed" :disabled="true" class="goal-checkbox" />
          <span :class="{ completed: goal.completed }">{{ goal.name }}</span>
        </div>
      </div>
    </div>

    <button class="btn btn-primary btn-block">عرض كامل الخطة</button>
  </div>
</template>

<style scoped>
.plan-card {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 24px;
  margin-top: 24px;
}

.card-title {
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 20px 0;
  border-bottom: 1px solid #e5e7eb;
  padding-bottom: 12px;
}

.plan-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.plan-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.label {
  color: #6b7280;
  font-weight: 500;
  font-size: 14px;
}

.value {
  color: #1f2937;
  font-weight: 600;
}

.btn-change {
  padding: 6px 12px;
  background: #eff6ff;
  color: #2563eb;
  border: 1px solid #2563eb;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-change:hover {
  background: #2563eb;
  color: white;
}

.plan-details {
  margin-bottom: 20px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #f3f4f6;
}

.progress-section {
  margin: 20px 0;
}

.section-title {
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 8px 0;
  font-size: 14px;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: #e5e7eb;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 8px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #10b981, #059669);
  transition: width 0.3s;
}

.progress-text {
  font-size: 12px;
  color: #6b7280;
  margin: 0;
}

.goals-section {
  margin: 20px 0;
}

.goals-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 20px;
}

.goal-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  background: #f9fafb;
  border-radius: 6px;
  font-size: 13px;
}

.goal-checkbox {
  cursor: not-allowed;
  width: 18px;
  height: 18px;
}

.goal-item span.completed {
  text-decoration: line-through;
  color: #9ca3af;
}

.btn-block {
  width: 100%;
}
</style>
```

---

## 3️⃣ شاشة الخطة الفردية التفصيلية (Individual Plan)

### الهدف:

عرض وإدارة الخطة الفردية بالتفصيل مع الأهداف والجلسات والتقييمات.

### الهيكل:

```
┌─────────────────────────────────────────────────────────────────┐
│ الخطة الفردية / أحمد محمود - الذكاء الاصطناعي              [ تعديل] │
└─────────────────────────────────────────────────────────────────┘

┌────────────────┬─────────────────────────────────────────────────┐
│                │ ┌─────────────────────────────────────────────┐│
│ القائمة         │ │ معلومات الخطة                                ││
│ - نظرة عامة     │ │ البرنامج: الذكاء الاصطناعي                  ││
│ - الأهداف      │ │ المدة: 6 أشهر | البدء: 15 سبتمبر 2024       ││
│ - الجلسات      │ │ التقدم: [████████░░] 70%                  ││
│ - التقييمات    │ └─────────────────────────────────────────────┘│
│ - الملاحظات    │                                                 │
│                │ ┌─────────────────────────────────────────────┐│
│                │ │ الأهداف الرئيسية                            ││
│                │ │ ─────────────────────────────────────────  ││
│                │ │ # 1 اتقان لغة Python (80% مكتمل)           ││
│                │ │    - أساسيات البرمجة ✓                    ││
│                │ │    - البرمجة الموجهة للكائنات ✓            ││
│                │ │    - مكتبات إضافية (في التقدم)            ││
│                │ │                                             ││
│                │ │ # 2 أساسيات التعلم الآلي (60% مكتمل)      ││
│                │ │    - الرياضيات والإحصائيات ✓             ││
│                │ │    - scikit-learn (في التقدم)            ││
│                │ │    - المشاريع التطبيقية                    ││
│                │ │                                             ││
│                │ │ [ إضافة هدف ] [ تعديل ] [ حذف ]           ││
│                │ └─────────────────────────────────────────────┘│
│                │                                                 │
│                │ ┌─────────────────────────────────────────────┐│
│                │ │ الجلسات المجدولة                            ││
│                │ │ ─────────────────────────────────────────  ││
│                │ │ الجلسة 1: مقدمة في Python                  ││
│                │ │ التاريخ: 20 يناير 2026 | الحالة: ✓ مكتملة  ││
│                │ │ الملاحظات: أداء جيد                        ││
│                │ │                                             ││
│                │ │ الجلسة 2: OOP والكلاسات                    ││
│                │ │ التاريخ: 25 يناير 2026 | الحالة: ⏳ قادمة  ││
│                │ │                                             ││
│                │ │ [ إضافة جلسة ] [ إعادة جدولة ]            ││
│                │ └─────────────────────────────────────────────┘│
└────────────────┴─────────────────────────────────────────────────┘
```

### العناصر التفصيلية:

#### 1. قسم الأهداف

```vue
<template>
  <div class="objectives-card" dir="rtl">
    <div class="card-header">
      <h3>الأهداف الرئيسية</h3>
      <button class="btn btn-sm btn-primary" @click="showAddObjective">+ إضافة هدف</button>
    </div>

    <div class="objectives-list">
      <div
        v-for="(objective, index) in objectives"
        :key="objective.id"
        class="objective-item"
        :class="{ expanded: expandedId === objective.id }"
      >
        <div class="objective-header" @click="toggleExpand(objective.id)">
          <div class="objective-number">{{ index + 1 }}</div>

          <div class="objective-content">
            <h4 class="objective-title">{{ objective.title }}</h4>
            <div class="objective-progress">
              <div class="progress-bar">
                <div class="progress-fill" :style="{ width: objective.progress + '%' }"></div>
              </div>
              <span class="progress-text">{{ objective.progress }}%</span>
            </div>
          </div>

          <span class="expand-icon">{{ expandedId === objective.id ? '▼' : '▶' }}</span>
        </div>

        <div v-if="expandedId === objective.id" class="objective-details">
          <div class="subtasks">
            <div v-for="subtask in objective.subtasks" :key="subtask.id" class="subtask-item">
              <input
                type="checkbox"
                :checked="subtask.completed"
                @change="toggleSubtask(objective.id, subtask.id)"
                class="subtask-checkbox"
              />
              <span :class="{ completed: subtask.completed }">
                {{ subtask.name }}
              </span>
              <span v-if="subtask.dueDate" class="due-date">
                {{ formatDate(subtask.dueDate) }}
              </span>
            </div>
          </div>

          <div class="objective-actions">
            <button class="btn btn-sm btn-secondary">تعديل</button>
            <button class="btn btn-sm btn-danger">حذف</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.objectives-card {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 24px;
  margin-top: 24px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  border-bottom: 1px solid #e5e7eb;
  padding-bottom: 12px;
}

.card-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.objectives-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.objective-item {
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  overflow: hidden;
  background: #ffffff;
}

.objective-item.expanded {
  border-color: #2563eb;
  background: #eff6ff;
}

.objective-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  cursor: pointer;
  transition: background 0.2s;
}

.objective-header:hover {
  background: #f9fafb;
}

.objective-number {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: #2563eb;
  color: white;
  border-radius: 50%;
  font-weight: 700;
  font-size: 14px;
  flex-shrink: 0;
}

.objective-content {
  flex: 1;
}

.objective-title {
  margin: 0 0 8px 0;
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
}

.objective-progress {
  display: flex;
  align-items: center;
  gap: 8px;
}

.progress-bar {
  flex: 1;
  height: 6px;
  background: #e5e7eb;
  border-radius: 3px;
  overflow: hidden;
  max-width: 200px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #10b981, #059669);
  transition: width 0.3s;
}

.progress-text {
  font-size: 12px;
  color: #6b7280;
  white-space: nowrap;
}

.expand-icon {
  font-size: 12px;
  color: #9ca3af;
  transition: transform 0.2s;
}

.objective-details {
  border-top: 1px solid #e5e7eb;
  padding: 16px;
  background: #f9fafb;
}

.subtasks {
  margin-bottom: 16px;
}

.subtask-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
  border-bottom: 1px solid #e5e7eb;
}

.subtask-item:last-child {
  border-bottom: none;
}

.subtask-checkbox {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.subtask-item span.completed {
  text-decoration: line-through;
  color: #9ca3af;
}

.due-date {
  margin-left: auto;
  font-size: 12px;
  color: #6b7280;
}

.objective-actions {
  display: flex;
  gap: 8px;
}

.btn.btn-sm {
  padding: 6px 12px;
  font-size: 12px;
}
</style>
```

---

## 📐 ملاحظات التنفيذ العام

### 1. المسافات والتوزيع

- استخدم Grid System بـ 12 عمود
- الحاشية الرئيسية: 24px
- الحاشية بين العناصر: 16px
- المسافات العمودية: 24px

### 2. الألوان حسب الحالة

```
نشط / مكتمل: أخضر #10B981 (✓)
قيد التقدم: أزرق #2563EB (→)
معلق / غير مكتمل: برتقالي #F59E0B (!)
حذف / خطر: أحمر #EF4444 (✗)
معطل / غير متاح: رمادي #9CA3AF (‐)
```

### 3. التفاعلات

- Hover: تغيير اللون أو الخلفية
- Focus: حد أزرق 2px بـ box-shadow
- Active: لون أغمق
- Disabled: opacity 0.6، cursor not-allowed

### 4. الأداء

- استخدم Lazy Loading للصور
- Cache البيانات المتكررة
- استخدم Virtualization للقوائم الطويلة

---

**النسخة:** 1.0  
**الحالة:** ✅ جاهز للتنفيذ  
**آخر تحديث:** يناير 2026
