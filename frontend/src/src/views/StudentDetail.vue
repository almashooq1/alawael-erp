<template>
  <div class="page-container">
    <!-- شريط العودة والإجراءات -->
    <div class="action-bar">
      <router-link to="/students" class="btn-back">← العودة إلى الطلاب</router-link>
      <div class="actions">
        <button
          v-if="!isEditing"
          class="btn btn-primary"
          @click="isEditing = true"
        >
          ✏️ تعديل
        </button>
        <button
          v-if="isEditing"
          class="btn btn-primary"
          @click="saveStudent"
        >
          💾 حفظ
        </button>
        <button
          v-if="isEditing"
          class="btn btn-secondary"
          @click="cancelEdit"
        >
          ❌ إلغاء
        </button>
        <button class="btn btn-danger" @click="deleteStudent">
          🗑️ حذف
        </button>
      </div>
    </div>

    <!-- معلومات الطالب -->
    <div v-if="student" class="detail-container">
      <!-- بطاقة المعلومات الأساسية -->
      <div class="info-card">
        <h2>المعلومات الأساسية</h2>
        <div class="form-grid">
          <FormInput
            v-model="formData.name"
            label="الاسم"
            type="text"
            :disabled="!isEditing"
            required
          />
          <FormInput
            v-model="formData.email"
            label="البريد الإلكتروني"
            type="email"
            :disabled="!isEditing"
            required
          />
          <FormInput
            v-model="formData.phone"
            label="رقم الهاتف"
            type="tel"
            :disabled="!isEditing"
          />
          <FormSelect
            v-model="formData.program"
            label="البرنامج"
            :options="programOptions"
            :disabled="!isEditing"
            required
          />
        </div>
      </div>

      <!-- بطاقة التقدم والحضور -->
      <div class="info-card">
        <h2>التقدم والحضور</h2>
        <div class="progress-section">
          <div class="progress-item">
            <label>تقدم الدراسة: {{ formData.progress }}%</label>
            <div class="progress-bar">
              <div
                class="progress-fill"
                :style="{ width: formData.progress + '%' }"
              ></div>
            </div>
            <input
              v-if="isEditing"
              v-model.number="formData.progress"
              type="range"
              min="0"
              max="100"
              class="slider"
            />
          </div>
          <div class="progress-item">
            <label>معدل الحضور: {{ formData.attendance }}%</label>
            <div class="progress-bar">
              <div
                class="progress-fill attendance"
                :style="{ width: formData.attendance + '%' }"
              ></div>
            </div>
            <input
              v-if="isEditing"
              v-model.number="formData.attendance"
              type="range"
              min="0"
              max="100"
              class="slider"
            />
          </div>
        </div>
      </div>

      <!-- بطاقة الحالة والمعلومات الإضافية -->
      <div class="info-card">
        <h2>الحالة والمعلومات الإضافية</h2>
        <div class="form-grid">
          <FormSelect
            v-model="formData.status"
            label="الحالة"
            :options="statusOptions"
            :disabled="!isEditing"
            required
          />
          <div class="enrollment-date">
            <label>تاريخ التسجيل</label>
            <div class="date-value">{{ formatDate(student.enrollmentDate) }}</div>
          </div>
        </div>
      </div>

      <!-- ملخص الإحصائيات -->
      <div class="stats-grid">
        <div class="stat-box">
          <div class="stat-label">ساعات الدراسة</div>
          <div class="stat-value">{{ student.studyHours || 0 }}</div>
        </div>
        <div class="stat-box">
          <div class="stat-label">عدد الجلسات</div>
          <div class="stat-value">{{ student.sessions || 0 }}</div>
        </div>
        <div class="stat-box">
          <div class="stat-label">الواجبات المكملة</div>
          <div class="stat-value">{{ student.completedAssignments || 0 }}</div>
        </div>
        <div class="stat-box">
          <div class="stat-label">الامتحانات</div>
          <div class="stat-value">{{ student.exams || 0 }}</div>
        </div>
      </div>

      <!-- الملاحظات -->
      <div class="info-card">
        <h2>الملاحظات</h2>
        <textarea
          v-model="formData.notes"
          :disabled="!isEditing"
          class="notes-area"
          placeholder="أضف ملاحظات عن الطالب..."
        ></textarea>
      </div>
    </div>

    <!-- حالة التحميل -->
    <div v-else class="loading">
      جاري تحميل البيانات...
    </div>
  </div>
</template>

<script>
import { useStudentStore } from '../stores/useStudentStore'
import { useProgramStore } from '../stores/useProgramStore'
import FormInput from '../components/Form/FormInput.vue'
import FormSelect from '../components/Form/FormSelect.vue'
import { touchButtonStyle } from '../common/touchStyles.js'

export default {
  name: 'StudentDetail',
  components: {
    FormInput,
    FormSelect,
  },
  data() {
    return {
      touchButtonStyle,
      studentStore: useStudentStore(),
      programStore: useProgramStore(),
      student: null,
      isEditing: false,
      formData: {
        name: '',
        email: '',
        phone: '',
        program: '',
        progress: 0,
        attendance: 0,
        status: 'active',
        notes: '',
      },
      statusOptions: [
        { value: 'active', label: 'نشط' },
        { value: 'completed', label: 'مكتمل' },
        { value: 'suspended', label: 'معلق' },
      ],
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
    loadStudent() {
      const id = parseInt(this.$route.params.id)
      this.student = this.studentStore.getStudent(id)
      if (this.student) {
        this.formData = { ...this.student }
      }
    },
    saveStudent() {
      this.studentStore.updateStudent(this.student.id, this.formData)
      this.isEditing = false
      this.$router.push('/students')
    },
    cancelEdit() {
      this.isEditing = false
      this.loadStudent()
    },
    deleteStudent() {
      if (confirm(`هل تريد حذف الطالب ${this.student.name}؟`)) {
        this.studentStore.deleteStudent(this.student.id)
        this.$router.push('/students')
      }
    },
    formatDate(date) {
      if (!date) return '-'
      return new Date(date).toLocaleDateString('ar-SA')
    },
  },
  mounted() {
    this.loadStudent()
  },
        <button
          v-if="!isEditing"
          class="btn btn-primary"
          @click="isEditing = true"
          :style="touchButtonStyle"
        >
          ✏️ تعديل
        </button>
        <button
          v-if="isEditing"
          class="btn btn-primary"
          @click="saveStudent"
          :style="touchButtonStyle"
        >
          💾 حفظ
        </button>
        <button
          v-if="isEditing"
          class="btn btn-secondary"
          @click="cancelEdit"
          :style="touchButtonStyle"
        >
          ❌ إلغاء
        </button>
        <button class="btn btn-danger" @click="deleteStudent" :style="touchButtonStyle">
          🗑️ حذف
        </button>
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

.actions {
  display: flex;
  gap: var(--spacing-md);
  flex-wrap: wrap;
}

.btn {
  padding: var(--spacing-md) var(--spacing-lg);
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  font-size: var(--text-base);
  font-weight: 500;
  transition: all var(--transition-base);
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.btn-primary {
  background: var(--color-primary-600);
  color: white;
}

.btn-primary:hover {
  background: var(--color-primary-700);
  box-shadow: var(--shadow-md);
}

.btn-secondary {
  background: var(--color-gray-200);
  color: var(--color-gray-800);
}

.btn-secondary:hover {
  background: var(--color-gray-300);
}

.btn-danger {
  background: var(--color-red-100);
  color: var(--color-red-600);
}

.btn-danger:hover {
  background: var(--color-red-200);
}

.detail-container {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xl);
}

.info-card {
  background: var(--color-white);
  border: 1px solid var(--color-gray-200);
  border-radius: var(--radius-md);
  padding: var(--spacing-lg);
}

.info-card h2 {
  margin: 0 0 var(--spacing-lg) 0;
  font-size: var(--text-lg);
  color: var(--color-gray-800);
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: var(--spacing-lg);
}

.progress-section {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xl);
}

.progress-item {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.progress-item label {
  font-weight: 600;
  color: var(--color-gray-700);
}

.progress-bar {
  height: 8px;
  background: var(--color-gray-200);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-primary-400), var(--color-primary-600));
  border-radius: var(--radius-full);
  transition: width var(--transition-base);
}

.progress-fill.attendance {
  background: linear-gradient(90deg, var(--color-green-400), var(--color-green-600));
}

.slider {
  width: 100%;
  cursor: pointer;
}

.enrollment-date {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.enrollment-date label {
  font-weight: 600;
  color: var(--color-gray-700);
}

.date-value {
  padding: var(--spacing-md);
  background: var(--color-gray-100);
  border-radius: var(--radius-md);
  color: var(--color-gray-700);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: var(--spacing-lg);
}

.stat-box {
  background: var(--color-white);
  border: 1px solid var(--color-gray-200);
  border-radius: var(--radius-md);
  padding: var(--spacing-lg);
  text-align: center;
}

.stat-label {
  font-size: var(--text-sm);
  color: var(--color-gray-500);
  margin-bottom: var(--spacing-md);
}

.stat-value {
  font-size: var(--text-2xl);
  font-weight: 700;
  color: var(--color-primary-600);
}

.notes-area {
  width: 100%;
  min-height: 150px;
  padding: var(--spacing-md);
  border: 1px solid var(--color-gray-200);
  border-radius: var(--radius-md);
  font-family: inherit;
  font-size: var(--text-base);
  resize: vertical;
  direction: rtl;
}

.notes-area:disabled {
  background: var(--color-gray-100);
  color: var(--color-gray-500);
}

.loading {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 300px;
  color: var(--color-gray-500);
  font-size: var(--text-lg);
}

@media (max-width: 768px) {
  .action-bar {
    flex-direction: column;
    align-items: stretch;
  }

  .actions {
    width: 100%;
  }

  .btn {
    flex: 1;
    justify-content: center;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }

  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
