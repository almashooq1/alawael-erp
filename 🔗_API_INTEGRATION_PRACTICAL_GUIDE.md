# 🔗 دليل ربط API مع Database + 🎨 إضافة ميزات جديدة

---

## 🎯 الهدف

تحويل البيانات من **وهمية (Mock)** إلى **حقيقية من Database** + إضافة ميزات جديدة

---

## 📋 المرحلة 1: ربط Frontend مع Backend API

### الخطوة 1: تحديث useStudentStore.js

**الملف:** `frontend/src/stores/useStudentStore.js`

```javascript
import { defineStore } from 'pinia';
import api from '@/utils/api';
import { useNotification } from '@/composables/useNotification';

export const useStudentStore = defineStore('student', {
  state: () => ({
    students: [], // ← فارغ بدلاً من البيانات المحلية
    currentStudent: null,
    loading: false,
    error: null,
    filters: {
      search: '',
      status: null,
    },
  }),

  getters: {
    activeStudentsCount: state => state.students.filter(s => s.status === 'active').length,
    completedStudentsCount: state => state.students.filter(s => s.status === 'completed').length,
    averageProgress: state => {
      if (state.students.length === 0) return 0;
      const total = state.students.reduce((sum, s) => sum + s.progress, 0);
      return Math.round(total / state.students.length);
    },
    averageAttendance: state => {
      if (state.students.length === 0) return 0;
      const total = state.students.reduce((sum, s) => sum + s.attendance, 0);
      return Math.round(total / state.students.length);
    },
    sortedStudents: state => [...state.students].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    filteredStudents: state => {
      let filtered = state.students;
      if (state.filters.search) {
        filtered = filtered.filter(s => s.name.includes(state.filters.search) || s.email.includes(state.filters.search));
      }
      if (state.filters.status) {
        filtered = filtered.filter(s => s.status === state.filters.status);
      }
      return filtered;
    },
  },

  actions: {
    // ✅ جلب جميع الطلاب من API
    async fetchStudents() {
      this.loading = true;
      this.error = null;
      try {
        const response = await api.get('/students');
        this.students = response.data.data || response.data;
        console.log('✅ Students loaded from API:', this.students.length);
      } catch (error) {
        this.error = error.response?.data?.message || 'خطأ في جلب البيانات';
        useNotification().showError(this.error);
        console.error('❌ Error fetching students:', error);
      } finally {
        this.loading = false;
      }
    },

    // ✅ جلب طالب محدد
    async getStudent(id) {
      try {
        const response = await api.get(`/students/${id}`);
        this.currentStudent = response.data.data;
        return response.data.data;
      } catch (error) {
        this.error = error.response?.data?.message || 'خطأ في جلب البيانات';
        useNotification().showError(this.error);
      }
    },

    // ✅ إضافة طالب جديد إلى API
    async addStudent(studentData) {
      this.loading = true;
      this.error = null;
      try {
        const response = await api.post('/students', studentData);
        const newStudent = response.data.data;
        this.students.push(newStudent);
        useNotification().showSuccess('تم إضافة الطالب بنجاح');
        console.log('✅ Student added:', newStudent);
        return newStudent;
      } catch (error) {
        this.error = error.response?.data?.message || 'خطأ في إضافة الطالب';
        useNotification().showError(this.error);
        console.error('❌ Error adding student:', error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    // ✅ تحديث طالب في API
    async updateStudent(id, studentData) {
      this.loading = true;
      this.error = null;
      try {
        const response = await api.put(`/students/${id}`, studentData);
        const updatedStudent = response.data.data;
        const index = this.students.findIndex(s => s._id === id || s.id === id);
        if (index !== -1) {
          this.students[index] = updatedStudent;
        }
        if (this.currentStudent && (this.currentStudent._id === id || this.currentStudent.id === id)) {
          this.currentStudent = updatedStudent;
        }
        useNotification().showSuccess('تم تحديث الطالب بنجاح');
        console.log('✅ Student updated:', updatedStudent);
        return updatedStudent;
      } catch (error) {
        this.error = error.response?.data?.message || 'خطأ في التحديث';
        useNotification().showError(this.error);
        console.error('❌ Error updating student:', error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    // ✅ حذف طالب من API
    async deleteStudent(id) {
      this.loading = true;
      this.error = null;
      try {
        await api.delete(`/students/${id}`);
        this.students = this.students.filter(s => s._id !== id && s.id !== id);
        useNotification().showSuccess('تم حذف الطالب بنجاح');
        console.log('✅ Student deleted:', id);
      } catch (error) {
        this.error = error.response?.data?.message || 'خطأ في الحذف';
        useNotification().showError(this.error);
        console.error('❌ Error deleting student:', error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    // ✅ البحث عن طلاب
    async searchStudents(query) {
      this.filters.search = query;
      try {
        const response = await api.get(`/students/search?q=${query}`);
        this.students = response.data.data || response.data;
      } catch (error) {
        console.error('❌ Error searching:', error);
      }
    },

    // ✅ فلترة الطلاب
    filterStudents(status) {
      this.filters.status = status;
    },

    // ✅ تعيين الطالب الحالي
    setCurrentStudent(student) {
      this.currentStudent = student;
    },

    // ✅ مسح الطالب الحالي
    clearCurrentStudent() {
      this.currentStudent = null;
    },
  },
});
```

---

### الخطوة 2: تحديث Students.vue

**الملف:** `frontend/src/pages/Students.vue`

```vue
<script setup>
import { computed, onMounted } from 'vue';
import { useStudentStore } from '@/stores/useStudentStore';
import DataTable from '@/components/DataTable.vue';
import StatCard from '@/components/StatCard.vue';
import LoadingSpinner from '@/components/LoadingSpinner.vue';
import { useRouter } from 'vue-router';

const studentStore = useStudentStore();
const router = useRouter();

// ✅ جلب البيانات عند تحميل الصفحة
onMounted(async () => {
  await studentStore.fetchStudents();
});

// Computed
const columns = computed(() => [
  { title: 'الاسم', key: 'name', sortable: true },
  { title: 'البريد الإلكتروني', key: 'email', sortable: true },
  { title: 'الهاتف', key: 'phone' },
  { title: 'البرنامج', key: 'program', sortable: true },
  { title: 'الحالة', key: 'status', type: 'badge' },
  { title: 'التقدم', key: 'progress', type: 'progress' },
  { title: 'الحضور', key: 'attendance', type: 'progress' },
]);

const students = computed(() => studentStore.filteredStudents);
const loading = computed(() => studentStore.loading);
const error = computed(() => studentStore.error);

// Methods
const handleEdit = student => {
  studentStore.setCurrentStudent(student);
  router.push(`/students/${student._id || student.id}`);
};

const handleDelete = async student => {
  if (confirm(`هل تريد حذف ${student.name}؟`)) {
    await studentStore.deleteStudent(student._id || student.id);
  }
};

const handleSearch = query => {
  studentStore.filters.search = query;
};

const handleAddNew = () => {
  studentStore.clearCurrentStudent();
  router.push('/students/new');
};
</script>

<template>
  <div class="page">
    <div class="page-header">
      <h1>الطلاب</h1>
      <button @click="handleAddNew" class="btn btn-primary">➕ إضافة طالب جديد</button>
    </div>

    <!-- الإحصائيات -->
    <div class="stats-grid">
      <StatCard title="إجمالي الطلاب" :value="students.length" icon="👥" color="blue" />
      <StatCard title="النشطين" :value="studentStore.activeStudentsCount" icon="✅" color="green" />
      <StatCard title="متوسط التقدم" :value="studentStore.averageProgress + '%'" icon="📈" color="purple" />
      <StatCard title="متوسط الحضور" :value="studentStore.averageAttendance + '%'" icon="📊" color="orange" />
    </div>

    <!-- البحث -->
    <div class="search-box">
      <input type="text" placeholder="ابحث عن طالب..." @input="handleSearch($event.target.value)" class="input" />
    </div>

    <!-- رسالة التحميل -->
    <LoadingSpinner v-if="loading" />

    <!-- رسالة الخطأ -->
    <div v-if="error" class="error-message">
      ⚠️ {{ error }}
      <button @click="studentStore.fetchStudents()">إعادة محاولة</button>
    </div>

    <!-- جدول البيانات -->
    <DataTable v-if="!loading && students.length" :columns="columns" :data="students" @row-click="handleEdit" />

    <!-- لا توجد بيانات -->
    <div v-if="!loading && !students.length" class="empty">
      <p>لا توجد بيانات</p>
      <button @click="handleAddNew" class="btn btn-secondary">أضف الطالب الأول</button>
    </div>
  </div>
</template>

<style scoped>
.page {
  padding: 2rem;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.search-box {
  margin-bottom: 1.5rem;
}

.input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 0.5rem;
  font-size: 1rem;
}

.error-message {
  padding: 1rem;
  background: #fee;
  color: #c33;
  border-radius: 0.5rem;
  margin-bottom: 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.empty {
  text-align: center;
  padding: 3rem;
  color: #666;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 0.5rem;
  cursor: pointer;
  font-size: 1rem;
}

.btn-primary {
  background: #007bff;
  color: white;
}

.btn-secondary {
  background: #6c757d;
  color: white;
}
</style>
```

---

### الخطوة 3: تحديث StudentForm.vue

**الملف:** `frontend/src/pages/StudentForm.vue`

```vue
<script setup>
import { ref, computed, onMounted } from 'vue';
import { useStudentStore } from '@/stores/useStudentStore';
import { useRoute, useRouter } from 'vue-router';
import FormInput from '@/components/FormInput.vue';
import FormSelect from '@/components/FormSelect.vue';
import LoadingSpinner from '@/components/LoadingSpinner.vue';

const studentStore = useStudentStore();
const route = useRoute();
const router = useRouter();

const isEditing = computed(() => route.params.id && route.params.id !== 'new');
const loading = ref(false);
const success = ref(false);
const error = ref(null);

const formData = ref({
  name: '',
  email: '',
  phone: '',
  program: '',
  status: 'active',
  progress: 0,
  attendance: 0,
  registrationDate: new Date().toISOString().split('T')[0],
});

const programOptions = [
  { value: 'البرنامج الأساسي', label: 'البرنامج الأساسي' },
  { value: 'البرنامج المتقدم', label: 'البرنامج المتقدم' },
  { value: 'برنامج متخصص', label: 'برنامج متخصص' },
];

const statusOptions = [
  { value: 'active', label: 'نشط' },
  { value: 'completed', label: 'مكتمل' },
  { value: 'suspended', label: 'معلق' },
];

// تحميل البيانات إذا كان التعديل
onMounted(async () => {
  if (isEditing.value) {
    try {
      const student = await studentStore.getStudent(route.params.id);
      if (student) {
        formData.value = { ...student };
      }
    } catch (err) {
      error.value = 'خطأ في جلب بيانات الطالب';
    }
  }
});

// حفظ البيانات
const handleSubmit = async () => {
  loading.value = true;
  error.value = null;
  success.value = false;

  try {
    if (isEditing.value) {
      // تحديث
      await studentStore.updateStudent(route.params.id, formData.value);
    } else {
      // إضافة جديد
      await studentStore.addStudent(formData.value);
    }
    success.value = true;
    setTimeout(() => router.push('/students'), 2000);
  } catch (err) {
    error.value = err.message || 'خطأ في الحفظ';
  } finally {
    loading.value = false;
  }
};

// إلغاء
const handleCancel = () => {
  router.push('/students');
};
</script>

<template>
  <div class="page">
    <h1>{{ isEditing ? 'تعديل الطالب' : 'إضافة طالب جديد' }}</h1>

    <LoadingSpinner v-if="loading" />

    <div v-if="success" class="success-message">✅ تم الحفظ بنجاح! سيتم الانتقال إلى قائمة الطلاب...</div>

    <div v-if="error" class="error-message">❌ {{ error }}</div>

    <form @submit.prevent="handleSubmit" class="form">
      <div class="form-section">
        <h2>المعلومات الأساسية</h2>
        <FormInput v-model="formData.name" label="الاسم الكامل" type="text" required />
        <FormInput v-model="formData.email" label="البريد الإلكتروني" type="email" required />
        <FormInput v-model="formData.phone" label="رقم الهاتف" type="tel" required />
      </div>

      <div class="form-section">
        <h2>البرنامج والحالة</h2>
        <FormSelect v-model="formData.program" label="البرنامج" :options="programOptions" required />
        <FormSelect v-model="formData.status" label="الحالة" :options="statusOptions" required />
        <FormInput v-model="formData.registrationDate" label="تاريخ التسجيل" type="date" required />
      </div>

      <div class="form-section">
        <h2>التقدم والحضور</h2>
        <FormInput v-model.number="formData.progress" label="التقدم (%)" type="number" min="0" max="100" />
        <FormInput v-model.number="formData.attendance" label="الحضور (%)" type="number" min="0" max="100" />
      </div>

      <div class="form-actions">
        <button type="submit" class="btn btn-primary">
          {{ isEditing ? 'تحديث' : 'إضافة' }}
        </button>
        <button type="button" @click="handleCancel" class="btn btn-secondary">إلغاء</button>
      </div>
    </form>
  </div>
</template>

<style scoped>
.page {
  padding: 2rem;
  max-width: 800px;
  margin: 0 auto;
}

.form {
  background: white;
  padding: 2rem;
  border-radius: 0.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.form-section {
  margin-bottom: 2rem;
}

.form-section h2 {
  color: #333;
  margin-bottom: 1rem;
  font-size: 1.2rem;
}

.form-section > div {
  margin-bottom: 1rem;
}

.form-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 2rem;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 0.5rem;
  cursor: pointer;
  font-size: 1rem;
}

.btn-primary {
  background: #007bff;
  color: white;
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.success-message {
  padding: 1rem;
  background: #d4edda;
  color: #155724;
  border-radius: 0.5rem;
  margin-bottom: 1rem;
}

.error-message {
  padding: 1rem;
  background: #f8d7da;
  color: #721c24;
  border-radius: 0.5rem;
  margin-bottom: 1rem;
}
</style>
```

---

## 🧪 اختبار الاتصال

### Test 1: فتح Browser Console (F12)

```javascript
// سترى رسائل مثل:
✅ Students loaded from API: 3
✅ Student added: {_id: ..., name: ...}
✅ Student updated: {_id: ..., name: ...}
✅ Student deleted: 123
```

### Test 2: النتائج المتوقعة

```
1. الصفحة تحمل البيانات من Backend
2. الإحصائيات تُحدّث تلقائياً
3. الإضافة/التحديث/الحذف يعمل
4. الرسائل واضحة
5. لا توجد أخطاء في Console
```

---

## 🎨 Phase 2: إضافة ميزات جديدة

### ميزة جديدة 1: تصدير البيانات إلى CSV

**إنشاء ملف:** `frontend/src/utils/export.js`

```javascript
// تصدير الطلاب إلى CSV
export const exportStudentsToCSV = students => {
  if (!students.length) {
    alert('لا توجد بيانات للتصدير');
    return;
  }

  // رؤوس الأعمدة
  const headers = ['الاسم', 'البريد', 'الهاتف', 'البرنامج', 'الحالة', 'التقدم', 'الحضور'];

  // البيانات
  const rows = students.map(s => [s.name, s.email, s.phone, s.program, s.status, s.progress, s.attendance]);

  // إنشاء CSV
  const csv = [headers.join(','), ...rows.map(row => row.map(cell => `"${cell}"`).join(','))].join('\n');

  // تحميل الملف
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `students_${new Date().toISOString().split('T')[0]}.csv`);
  link.click();
};
```

### ميزة جديدة 2: إضافة فلاتر متقدمة

**تحديث:** `frontend/src/pages/Students.vue`

```vue
<template>
  <!-- أضف هذا في الـ template -->
  <div class="filters">
    <select v-model="selectedStatus" class="filter-select">
      <option value="">جميع الحالات</option>
      <option value="active">نشط</option>
      <option value="completed">مكتمل</option>
      <option value="suspended">معلق</option>
    </select>

    <input type="range" min="0" max="100" v-model="minProgress" placeholder="التقدم الأدنى" class="filter-slider" />
    <span>التقدم: {{ minProgress }}%</span>
  </div>
</template>

<script setup>
const selectedStatus = ref('');
const minProgress = ref(0);

// تحديث الفلاتر
const filteredStudents = computed(() => {
  let filtered = studentStore.students;

  if (selectedStatus.value) {
    filtered = filtered.filter(s => s.status === selectedStatus.value);
  }

  if (minProgress.value > 0) {
    filtered = filtered.filter(s => s.progress >= minProgress.value);
  }

  return filtered;
});
</script>
```

### ميزة جديدة 3: إحصائيات متقدمة

**ملف جديد:** `frontend/src/composables/useStatistics.js`

```javascript
export const useStatistics = () => {
  const calculateStatistics = students => {
    if (!students.length) return null;

    const stats = {
      // المجاميع
      totalStudents: students.length,
      activeStudents: students.filter(s => s.status === 'active').length,
      completedStudents: students.filter(s => s.status === 'completed').length,

      // المتوسطات
      avgProgress: Math.round(students.reduce((sum, s) => sum + s.progress, 0) / students.length),
      avgAttendance: Math.round(students.reduce((sum, s) => sum + s.attendance, 0) / students.length),

      // الحد الأقصى والأدنى
      maxProgress: Math.max(...students.map(s => s.progress)),
      minProgress: Math.min(...students.map(s => s.progress)),
      maxAttendance: Math.max(...students.map(s => s.attendance)),
      minAttendance: Math.min(...students.map(s => s.attendance)),

      // التصنيفات
      highPerformers: students.filter(s => s.progress >= 80).length,
      mediumPerformers: students.filter(s => s.progress >= 50 && s.progress < 80).length,
      lowPerformers: students.filter(s => s.progress < 50).length,

      // النسب المئوية
      completionRate: Math.round((students.filter(s => s.status === 'completed').length / students.length) * 100),
    };

    return stats;
  };

  return { calculateStatistics };
};
```

---

## ✅ قائمة التحقق

```
Phase 1: ربط API
[ ] تحديث useStudentStore.js
[ ] تحديث Students.vue
[ ] تحديث StudentForm.vue
[ ] اختبار جلب البيانات
[ ] اختبار الإضافة/التحديث/الحذف
[ ] التحقق من رسائل الخطأ

Phase 2: ميزات جديدة
[ ] ميزة تصدير CSV
[ ] فلاتر متقدمة
[ ] إحصائيات متقدمة
[ ] ... (ميزات إضافية حسب الحاجة)

Phase 3: الاختبار
[ ] تشغيل التطبيق
[ ] اختبار جميع الميزات
[ ] التحقق من الأداء
[ ] توثيق النتائج
```

---

## 🚀 التشغيل والاختبار

```bash
# 1. تشغيل Backend
cd backend
npm run dev

# 2. تشغيل Frontend (Terminal جديد)
cd frontend
npm run dev

# 3. افتح Browser
http://localhost:5173

# 4. اختبر الميزات
# - جلب الطلاب
# - إضافة طالب جديد
# - تعديل البيانات
# - حذف طالب
# - تصدير CSV
# - الفلاتر المتقدمة
```

---

## 📊 النتائج المتوقعة

```
✅ البيانات تُحمّل من API
✅ الإضافة/التحديث/الحذف يعمل بدون مشاكل
✅ الفلاتر والبحث يعملان بكفاءة
✅ التصدير يعمل بشكل صحيح
✅ رسائل الخطأ واضحة
✅ الأداء ممتاز
✅ لا توجد أخطاء في Console
```

---

## 🎯 الخطوات التالية

1. **نسخ الأكواس** من هذا الدليل
2. **تطبيق التغييرات** على ملفاتك
3. **اختبار الاتصال** مع Backend
4. **إضافة ميزات جديدة** حسب احتياجاتك
5. **التوثيق** للمزيد من الميزات

---

## 💡 نصائح مفيدة

```javascript
// استخدم DevTools للتشخيص
1. F12 → Console لرؤية الأخطاء
2. F12 → Network لرؤية الـ requests
3. F12 → Sources للـ debugging

// جرّب الأوامر في Console
studentStore.fetchStudents()
console.log(studentStore.students)
```

---

**تم الإنجاز!** 🎉 الآن أنت جاهز لـ:

- ✅ ربط Frontend مع Backend
- ✅ إضافة ميزات جديدة
- ✅ توسيع النظام
