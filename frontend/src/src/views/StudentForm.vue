<template>
  <div class="page-container">
    <!-- شريط العودة -->
    <div class="action-bar">
      <router-link to="/students" class="btn-back">← العودة إلى الطلاب</router-link>
    </div>

    <!-- نموذج إضافة طالب جديد -->
    <div class="form-container">
      <div class="form-header">
        <h1>إضافة طالب جديد</h1>
        <p>ملء النموذج التالي لإضافة طالب جديد إلى النظام</p>
      </div>

      <form @submit.prevent="submitForm" class="form">
        <!-- المعلومات الأساسية -->
        <div class="form-section">
          <h2>المعلومات الأساسية</h2>
          <div class="form-grid">
            <FormInput
              v-model="form.name"
              label="الاسم الكامل"
              type="text"
              placeholder="أدخل اسم الطالب"
              required
              @blur="validateField('name')"
            />
            <FormInput
              v-model="form.email"
              label="البريد الإلكتروني"
              type="email"
              placeholder="example@email.com"
              required
              @blur="validateField('email')"
            />
            <FormInput
              v-model="form.phone"
              label="رقم الهاتف"
              type="tel"
              placeholder="+966 50 0000000"
            />
            <FormSelect
              v-model="form.program"
              label="اختر البرنامج"
              :options="programOptions"
              required
            />
          </div>
        </div>

        <!-- التفاصيل الإضافية -->
        <div class="form-section">
          <h2>التفاصيل الإضافية</h2>
          <div class="form-grid">
            <FormSelect
              v-model="form.status"
              label="الحالة الأولية"
              :options="statusOptions"
              required
            />
            <FormInput
              v-model.number="form.progress"
              label="التقدم الأولي (%)"
              type="number"
              min="0"
              max="100"
              placeholder="0"
            />
            <FormInput
              v-model.number="form.attendance"
              label="معدل الحضور الأولي (%)"
              type="number"
              min="0"
              max="100"
              placeholder="0"
            />
          </div>
        </div>

        <!-- ملاحظات -->
        <div class="form-section">
          <h2>ملاحظات إضافية</h2>
          <textarea
            v-model="form.notes"
            class="textarea"
            placeholder="أضف أي ملاحظات عن الطالب..."
          ></textarea>
        </div>

        <!-- الأزرار -->
        <div class="form-actions">
          <button type="submit" class="btn btn-primary" :disabled="loading">
            {{ loading ? 'جاري الحفظ...' : '✅ حفظ الطالب' }}
          </button>
          <router-link to="/students" class="btn btn-secondary">
            إلغاء
          </router-link>
        </div>
      </form>

      <!-- رسالة النجاح -->
      <div v-if="successMessage" class="message success-message">
        ✅ {{ successMessage }}
      </div>

      <!-- رسالة الخطأ -->
      <div v-if="errorMessage" class="message error-message">
        ❌ {{ errorMessage }}
      </div>
    </div>
  </div>
</template>

<script>
import { useStudentStore } from '../stores/useStudentStore'
import { useProgramStore } from '../stores/useProgramStore'
import FormInput from '../components/Form/FormInput.vue'
import FormSelect from '../components/Form/FormSelect.vue'

export default {
  name: 'StudentForm',
  components: {
    FormInput,
    FormSelect,
  },
  data() {
    return {
      studentStore: useStudentStore(),
      programStore: useProgramStore(),
      form: {
        name: '',
        email: '',
        phone: '',
        program: '',
        status: 'active',
        progress: 0,
        attendance: 0,
        notes: '',
      },
      loading: false,
      successMessage: '',
      errorMessage: '',
      statusOptions: [
        { value: 'active', label: 'نشط' },
        { value: 'completed', label: 'مكتمل' },
      ],
      errors: {},
    }
  },
  computed: {
    programOptions() {
      return this.programStore.programs.map(p => ({
        value: p.name,
        label: p.name,
      }))
    },
  },
  methods: {
    validateField(field) {
      // التحقق من البريد الإلكتروني
      if (field === 'email') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(this.form.email)) {
          this.errors.email = 'البريد الإلكتروني غير صحيح'
        } else {
          delete this.errors.email
        }
      }
      // التحقق من الاسم
      if (field === 'name' && this.form.name.length < 3) {
        this.errors.name = 'الاسم يجب أن يكون 3 أحرف على الأقل'
      } else {
        delete this.errors.name
      }
    },
    async submitForm() {
      // التحقق من جميع الحقول المطلوبة
      if (!this.form.name || !this.form.email || !this.form.program) {
        this.errorMessage = 'يرجى ملء جميع الحقول المطلوبة'
        return
      }

      // التحقق من الأخطاء
      Object.keys(this.form).forEach(field => {
        this.validateField(field)
      })

      if (Object.keys(this.errors).length > 0) {
        this.errorMessage = 'يرجى تصحيح الأخطاء أعلاه'
        return
      }

      this.loading = true
      this.successMessage = ''
      this.errorMessage = ''

      try {
        // إضافة الطالب
        const newStudent = this.studentStore.addStudent({
          ...this.form,
          enrollmentDate: new Date().toISOString(),
        })

        this.successMessage = `تم إضافة الطالب ${this.form.name} بنجاح`

        // إعادة تعيين النموذج
        setTimeout(() => {
          this.$router.push('/students')
        }, 1500)
      } catch (error) {
        this.errorMessage = error.message || 'حدث خطأ أثناء إضافة الطالب'
      } finally {
        this.loading = false
      }
    },
  },
}
</script>

<style scoped>
.page-container {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2xl);
}

.action-bar {
  padding: var(--spacing-lg);
  background: var(--color-white);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-gray-200);
}

.btn-back {
  color: var(--color-primary-600);
  text-decoration: none;
  font-weight: 500;
  transition: color var(--transition-base);
}

.btn-back:hover {
  color: var(--color-primary-700);
}

.form-container {
  background: var(--color-white);
  border: 1px solid var(--color-gray-200);
  border-radius: var(--radius-md);
  padding: var(--spacing-2xl);
}

.form-header {
  margin-bottom: var(--spacing-2xl);
  text-align: center;
}

.form-header h1 {
  margin: 0 0 var(--spacing-sm) 0;
  font-size: var(--text-2xl);
  color: var(--color-gray-800);
}

.form-header p {
  margin: 0;
  color: var(--color-gray-500);
}

.form {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xl);
}

.form-section {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.form-section h2 {
  margin: 0;
  font-size: var(--text-lg);
  color: var(--color-gray-800);
  padding-bottom: var(--spacing-md);
  border-bottom: 2px solid var(--color-primary-100);
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: var(--spacing-lg);
}

.textarea {
  width: 100%;
  min-height: 120px;
  padding: var(--spacing-md);
  border: 1px solid var(--color-gray-200);
  border-radius: var(--radius-md);
  font-family: inherit;
  font-size: var(--text-base);
  resize: vertical;
  direction: rtl;
}

.textarea:focus {
  outline: none;
  border-color: var(--color-primary-600);
  box-shadow: 0 0 0 3px var(--color-primary-100);
}

.form-actions {
  display: flex;
  gap: var(--spacing-md);
  padding-top: var(--spacing-lg);
  border-top: 1px solid var(--color-gray-200);
  flex-wrap: wrap;
}

.btn {
  padding: var(--spacing-md) var(--spacing-xl);
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  font-size: var(--text-base);
  font-weight: 600;
  transition: all var(--transition-base);
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm);
}

.btn-primary {
  background: linear-gradient(135deg, var(--color-primary-600), var(--color-primary-700));
  color: white;
  flex: 1;
}

.btn-primary:hover:not(:disabled) {
  background: linear-gradient(135deg, var(--color-primary-700), var(--color-primary-800));
  box-shadow: var(--shadow-lg);
  transform: translateY(-2px);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-secondary {
  background: var(--color-gray-200);
  color: var(--color-gray-800);
  flex: 1;
}

.btn-secondary:hover {
  background: var(--color-gray-300);
}

.message {
  padding: var(--spacing-lg);
  border-radius: var(--radius-md);
  font-weight: 500;
  margin-top: var(--spacing-lg);
}

.success-message {
  background: var(--color-green-100);
  color: var(--color-green-700);
  border: 1px solid var(--color-green-300);
}

.error-message {
  background: var(--color-red-100);
  color: var(--color-red-700);
  border: 1px solid var(--color-red-300);
}

@media (max-width: 768px) {
  .form-container {
    padding: var(--spacing-lg);
  }

  .form-grid {
    grid-template-columns: 1fr;
  }

  .form-actions {
    flex-direction: column;
  }

  .btn {
    width: 100%;
  }
}
</style>
