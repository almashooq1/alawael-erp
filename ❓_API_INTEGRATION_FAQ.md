# ❓ الأسئلة الشائعة والحلول

## 🤔 الأسئلة الشائعة

### 1. كيف أربط Frontend مع Backend؟

**السؤال:**  
أنا أملك Frontend في `http://localhost:5173` و Backend في `http://localhost:3001`، كيف أربطهما؟

**الإجابة:**

```javascript
// ملف: frontend/src/utils/api.js

import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3001/api', // ✅ هنا الـ Backend URL
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// إضافة JWT Token لكل طلب
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
```

**الخطوات:**

1. ✅ تشغيل Backend: `cd backend && npm run dev`
2. ✅ تشغيل Frontend: `cd frontend && npm run dev`
3. ✅ التحقق من الاتصال في DevTools Console
4. ✅ جلب البيانات: `await store.fetchStudents()`

---

### 2. خطأ CORS - ماذا أفعل؟

**السؤال:**  
أحصل على خطأ: `Access to XMLHttpRequest blocked by CORS policy`

**الإجابة:**

```javascript
// ملف: backend/server.js

const cors = require('cors');

app.use(
  cors({
    origin: 'http://localhost:5173', // ✅ السماح للـ Frontend
    credentials: true,
    optionsSuccessStatus: 200,
  }),
);
```

**الحل:**

1. تأكد من تثبيت `cors` package: `npm install cors`
2. أضف CORS middleware في البداية
3. أعد تشغيل Backend
4. جرب في Frontend مرة أخرى

---

### 3. كيف أرسل JWT Token مع كل طلب؟

**السؤال:**  
كيف أتأكد أن كل طلب يحتوي على التوكن؟

**الإجابة:**

```javascript
// في useApi.js
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// في Login Page
const handleLogin = async credentials => {
  const response = await api.post('/auth/login', credentials);
  localStorage.setItem('token', response.data.token); // ✅ حفظ التوكن
  await studentStore.fetchStudents(); // ✅ جلب البيانات
};
```

**التحقق:**

1. افتح DevTools → Network
2. شغّل عملية ما
3. انقر على الطلب
4. اذهب لـ Headers وتحقق من وجود: `Authorization: Bearer xxx`

---

### 4. كيف أتعامل مع الأخطاء؟

**السؤال:**  
ماذا أفعل عند فشل الطلب؟

**الإجابة:**

```javascript
// في Store
async fetchStudents() {
  this.loading = true
  this.error = null // ✅ مسح الأخطاء السابقة

  try {
    const response = await api.get('/students')
    this.students = response.data.data
  } catch (error) {
    // ✅ معالجة الأخطاء بشكل صحيح
    if (error.response?.status === 401) {
      this.error = 'انتهت صلاحية جلستك. برجاء تسجيل الدخول مرة أخرى'
      router.push('/login')
    } else if (error.response?.status === 403) {
      this.error = 'ليس لديك صلاحية لهذه العملية'
    } else if (error.response?.data?.message) {
      this.error = error.response.data.message
    } else {
      this.error = 'حدث خطأ في الاتصال. حاول مرة أخرى'
    }
  } finally {
    this.loading = false
  }
}

// في الـ Component
<div v-if="error" class="error">
  {{ error }}
  <button @click="retry">إعادة محاولة</button>
</div>
```

---

### 5. كيف أضيف ميزة التصدير إلى CSV؟

**السؤال:**  
أريد تحميل البيانات كملف Excel

**الإجابة:**

```javascript
// ملف جديد: frontend/src/utils/export.js

export const exportToCSV = (students, filename = 'students') => {
  // 1. إعداد رؤوس الأعمدة
  const headers = ['الاسم', 'البريد', 'الهاتف', 'الحالة']

  // 2. تحويل البيانات
  const rows = students.map(s => [
    s.name,
    s.email,
    s.phone,
    s.status
  ])

  // 3. إنشاء CSV
  const csv = [
    headers.join(','),
    ...rows.map(r => r.map(cell => `"${cell}"`).join(','))
  ].join('\n')

  // 4. تحميل الملف
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.href = url
  link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

// في الـ Component
<button @click="() => exportToCSV(students, 'students')">
  📥 تصدير CSV
</button>
```

---

### 6. كيف أضيف pagination (تقسيم الصفحات)؟

**السؤال:**  
عندي 1000 طالب، كيف أعرضهم بدون أن تبطأ الصفحة؟

**الإجابة:**

```javascript
// في Store
state: () => ({
  students: [],
  currentPage: 1,
  pageSize: 10, // ✅ 10 طلاب لكل صفحة
  totalPages: 0
}),

// في الـ Action
async fetchStudents(page = 1) {
  this.loading = true
  try {
    const response = await api.get(`/students?page=${page}&limit=10`)
    this.students = response.data.data
    this.currentPage = page
    this.totalPages = response.data.totalPages
  } catch (error) {
    this.error = error.message
  } finally {
    this.loading = false
  }
}

// في الـ Component
<template>
  <!-- الجدول -->
  <DataTable :data="students" />

  <!-- أزرار التنقل -->
  <div class="pagination">
    <button
      v-for="page in totalPages"
      :key="page"
      :class="{ active: currentPage === page }"
      @click="fetchStudents(page)"
    >
      {{ page }}
    </button>
  </div>
</template>
```

---

### 7. كيف أضيف البحث المتقدم (Debounce)؟

**السؤال:**  
كل حرف أكتبه يرسل طلب API، هذا بطيء جداً!

**الإجابة:**

```javascript
// ملف جديد: frontend/src/utils/debounce.js

export const debounce = (func, delay) => {
  let timeoutId
  return function (...args) {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => func(...args), delay)
  }
}

// في الـ Component
<script setup>
import { ref } from 'vue'
import { debounce } from '@/utils/debounce'
import { useStudentStore } from '@/stores/useStudentStore'

const studentStore = useStudentStore()
const searchQuery = ref('')

// ✅ الدالة لا ترسل طلب إلا بعد توقف المستخدم 500ms
const handleSearch = debounce(async (query) => {
  if (query.length > 2) { // ابحث عن 3 أحرف فأكثر
    await studentStore.searchStudents(query)
  }
}, 500) // انتظر 500 ميلي ثانية

const onSearchInput = (event) => {
  searchQuery.value = event.target.value
  handleSearch(event.target.value)
}
</script>

<template>
  <input
    v-model="searchQuery"
    @input="onSearchInput"
    placeholder="ابحث..."
  />
</template>
```

**النتيجة:**

```
❌ بدون debounce: 5 طلبات لكل حرف = بطء جداً
✅ مع debounce: 1 طلب بعد انتهاء الكتابة = سريع جداً
```

---

### 8. كيف أتعامل مع البيانات الكبيرة؟

**السؤال:**  
ملف البيانات كبير جداً، كيف أحسّن الأداء؟

**الإجابة:**

```javascript
// 1. استخدم Pagination
async fetchStudents(page = 1, limit = 20) {
  const response = await api.get('/students', {
    params: { page, limit } // ✅ 20 طالب فقط لكل صفحة
  })
  return response.data
}

// 2. استخدم Virtual Scrolling (للقوائم الطويلة)
<template>
  <!-- في Vue 3 -->
  <VirtualList :items="students" :height="600">
    <template #default="{ item }">
      <StudentRow :student="item" />
    </template>
  </VirtualList>
</template>

// 3. استخدم Lazy Loading
const students = ref([])
const loadMore = async () => {
  const moreStudents = await studentStore.fetchMore()
  students.value.push(...moreStudents)
}

// 4. استخدم Caching
const studentCache = new Map()
async function getStudent(id) {
  if (studentCache.has(id)) {
    return studentCache.get(id)
  }
  const data = await api.get(`/students/${id}`)
  studentCache.set(id, data)
  return data
}
```

---

### 9. كيف أضيف ميزة الـ Undo/Redo؟

**السؤال:**  
أريد السماح للمستخدم بالتراجع عن آخر عملية

**الإجابة:**

```javascript
// ملف جديد: frontend/src/composables/useHistory.js

import { ref } from 'vue';

export const useHistory = () => {
  const history = ref([]);
  const historyIndex = ref(-1);

  const pushState = state => {
    // حذف كل الـ history بعد هذه النقطة
    history.value = history.value.slice(0, historyIndex.value + 1);
    // إضافة الحالة الجديدة
    history.value.push(JSON.parse(JSON.stringify(state)));
    historyIndex.value++;
  };

  const undo = () => {
    if (historyIndex.value > 0) {
      historyIndex.value--;
      return history.value[historyIndex.value];
    }
  };

  const redo = () => {
    if (historyIndex.value < history.value.length - 1) {
      historyIndex.value++;
      return history.value[historyIndex.value];
    }
  };

  return { pushState, undo, redo };
};

// استخدام
const { pushState, undo, redo } = useHistory();

const handleUpdate = async student => {
  // حفظ الحالة السابقة
  pushState({ students: [...students.value] });

  // تحديث
  await studentStore.updateStudent(student.id, student);
};

const handleUndo = () => {
  const previousState = undo();
  if (previousState) {
    students.value = previousState.students;
  }
};
```

---

### 10. كيف أختبر الـ API بدون Frontend؟

**السؤال:**  
أريد التأكد من أن Backend يعمل بشكل صحيح

**الإجابة:**

```bash
# استخدم curl أو Postman

# اختبار GET
curl http://localhost:3001/api/students

# اختبار POST
curl -X POST http://localhost:3001/api/students \
  -H "Content-Type: application/json" \
  -d '{"name":"محمد","email":"m@example.com"}'

# اختبار PUT
curl -X PUT http://localhost:3001/api/students/1 \
  -H "Content-Type: application/json" \
  -d '{"name":"أحمد"}'

# اختبار DELETE
curl -X DELETE http://localhost:3001/api/students/1

# مع JWT Token
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3001/api/students
```

**أو استخدم Postman:**

1. تحميل Postman من `https://www.postman.com`
2. إنشاء collection جديد
3. اختبار كل endpoint
4. حفظ requests للاستخدام لاحقاً

---

## 🔧 مشاكل شائعة وحلولها

### مشكلة 1: "undefined is not an object"

**السبب:** البيانات لم تحمّل بعد

**الحل:**

```javascript
// ❌ خطأ
<p>{{ student.name }}</p>

// ✅ صحيح
<p>{{ student?.name }}</p>

// أو
<p v-if="student">{{ student.name }}</p>
```

---

### مشكلة 2: "Cannot POST /api/students"

**السبب:** الـ route غير معرّف في Backend

**الحل:**

```javascript
// في backend/routes/students.js
router.post('/', (req, res) => {
  // معالجة الطلب
});
```

---

### مشكلة 3: البيانات لا تتحدث

**السبب:** عدم استدعاء `fetchStudents` في `onMounted`

**الحل:**

```javascript
onMounted(async () => {
  await studentStore.fetchStudents(); // ✅ يجب استدعاء هذا
});
```

---

### مشكلة 4: الصفحة تحمل بطيء جداً

**السبب:** طلبات API كثيرة أو متكررة

**الحل:**

```javascript
// ❌ خطأ: طلب مع كل render
const students = await api.get('/students');

// ✅ صحيح: طلب مرة واحدة
onMounted(async () => {
  await studentStore.fetchStudents();
});
```

---

## 📚 موارد إضافية

- **Vue 3 Documentation:** https://vuejs.org
- **Pinia Store:** https://pinia.vuejs.org
- **Axios:** https://axios-http.com
- **Express.js:** https://expressjs.com
- **MongoDB:** https://www.mongodb.com

---

## ✅ الخلاصة

| الميزة            | الأداة               | الصعوبة |
| ----------------- | -------------------- | ------- |
| API Connection    | Axios                | سهل     |
| JWT Auth          | Express + Axios      | متوسط   |
| CORS              | Express              | سهل     |
| Error Handling    | Try/Catch            | متوسط   |
| CSV Export        | Native JavaScript    | سهل     |
| Pagination        | API + Frontend       | متوسط   |
| Debounce Search   | Lodash/Custom        | سهل     |
| Virtual Scrolling | vue-virtual-scroller | صعب     |
| Undo/Redo         | Custom Logic         | صعب     |
| Testing           | Jest + Vitest        | صعب     |

---

**آخر تحديث:** 2025-01-20  
**الإصدار:** 1.0.0

تم الإجابة على 10 أسئلة شاملة!  
هل لديك أسئلة إضافية؟ 🤔
