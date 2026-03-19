<template>
  <div class="page-container">
    <div class="page-header">
      <div class="header-content">
        <h1>إدارة الجلسات</h1>
        <p class="page-description">جدول الجلسات التدريبية والفعاليات</p>
      </div>
      <div class="header-actions">
        <router-link to="/sessions/new" class="btn btn-primary">
          ➕ جلسة جديدة
        </router-link>
      </div>
    </div>

    <!-- المرشحات -->
    <div class="filters-bar">
      <FormSelect
        v-model="selectedProgram"
        label="البرنامج"
        :options="programOptions"
        placeholder="اختر برنامج..."
      />
      <FormSelect
        v-model="selectedStatus"
        label="الحالة"
        :options="statusOptions"
        placeholder="اختر حالة..."
      />
      <FormInput
        v-model="searchQuery"
        type="text"
        placeholder="ابحث عن جلسة..."
      />
    </div>

    <!-- الجدول -->
    <DataTable
      title="قائمة الجلسات"
      subtitle="جميع الجلسات التدريبية"
      :columns="tableColumns"
      :data="filteredSessions"
      :actions="tableActions"
      @row-click="onRowClick"
    />
  </div>
</template>

<script>
import { useProgramStore } from '../stores/useProgramStore'
import DataTable from '../components/Common/DataTable.vue'
import FormSelect from '../components/Form/FormSelect.vue'
import FormInput from '../components/Form/FormInput.vue'

export default {
  name: 'Sessions',
  components: {
    DataTable,
    FormSelect,
    FormInput,
  },
  data() {
    return {
      programStore: useProgramStore(),
      selectedProgram: '',
      selectedStatus: '',
      searchQuery: '',
      sessions: [
        {
          id: 1,
          title: 'مقدمة إلى البرمجة',
          program: 'البرنامج الأساسي',
          instructor: 'محمد علي',
          date: '2026-01-20',
          startTime: '09:00',
          endTime: '11:00',
          location: 'قاعة A',
          capacity: 30,
          enrolled: 28,
          status: 'scheduled',
        },
        {
          id: 2,
          title: 'أساسيات الويب',
          program: 'تطوير الويب',
          instructor: 'فاطمة محمود',
          date: '2026-01-20',
          startTime: '14:00',
          endTime: '16:00',
          location: 'قاعة B',
          capacity: 25,
          enrolled: 22,
          status: 'scheduled',
        },
        {
          id: 3,
          title: 'JavaScript المتقدم',
          program: 'تطوير الويب',
          instructor: 'أحمد حسن',
          date: '2026-01-19',
          startTime: '10:00',
          endTime: '12:00',
          location: 'قاعة C',
          capacity: 20,
          enrolled: 20,
          status: 'completed',
        },
      ],
      statusOptions: [
        { value: 'scheduled', label: 'مجدولة' },
        { value: 'ongoing', label: 'جارية' },
        { value: 'completed', label: 'مكتملة' },
        { value: 'cancelled', label: 'ملغاة' },
      ],
      tableColumns: [
        { key: 'title', label: 'عنوان الجلسة', sortable: true },
        { key: 'program', label: 'البرنامج', sortable: true },
        { key: 'date', label: 'التاريخ', sortable: true },
        { key: 'startTime', label: 'الوقت' },
        { key: 'instructor', label: 'المدرب' },
        { key: 'enrolled', label: 'الحاضرون' },
        {
          key: 'status',
          label: 'الحالة',
          type: 'badge',
          render: (value) => {
            const labels = { scheduled: 'مجدولة', ongoing: 'جارية', completed: 'مكتملة', cancelled: 'ملغاة' }
            return labels[value] || value
          },
        },
      ],
      tableActions: [
        {
          id: 'edit',
          icon: '✏️',
          label: 'تعديل',
          handler: (row) => this.editSession(row),
        },
        {
          id: 'delete',
          icon: '🗑️',
          label: 'حذف',
          handler: (row) => this.deleteSession(row),
        },
      ],
    }
  },
  computed: {
    programOptions() {
      return [
        { value: '', label: 'جميع البرامج' },
        ...this.programStore.programs.map(p => ({
          value: p.name,
          label: p.name,
        })),
      ]
    },
    filteredSessions() {
      return this.sessions.filter(session => {
        const matchesProgram = !this.selectedProgram || session.program === this.selectedProgram
        const matchesStatus = !this.selectedStatus || session.status === this.selectedStatus
        const matchesSearch = !this.searchQuery || 
          session.title.includes(this.searchQuery) ||
          session.instructor.includes(this.searchQuery)
        return matchesProgram && matchesStatus && matchesSearch
      })
    },
  },
  methods: {
    onRowClick(row) {
      this.$router.push(`/sessions/${row.id}`)
    },
    editSession(row) {
      this.$router.push(`/sessions/${row.id}`)
    },
    deleteSession(row) {
      if (confirm(`هل تريد حذف الجلسة ${row.title}؟`)) {
        this.sessions = this.sessions.filter(s => s.id !== row.id)
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

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--spacing-lg);
  flex-wrap: wrap;
}

.header-content h1 {
  margin: 0 0 var(--spacing-sm) 0;
  font-size: var(--text-2xl);
  color: var(--color-gray-800);
}

.page-description {
  margin: 0;
  font-size: var(--text-base);
  color: var(--color-gray-500);
}

.header-actions {
  display: flex;
  gap: var(--spacing-md);
}

.btn {
  padding: var(--spacing-md) var(--spacing-lg);
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  font-size: var(--text-base);
  font-weight: 500;
  transition: all var(--transition-base);
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
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

.filters-bar {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--spacing-lg);
  background: var(--color-white);
  border: 1px solid var(--color-gray-200);
  border-radius: var(--radius-md);
  padding: var(--spacing-lg);
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: stretch;
  }

  .header-actions {
    width: 100%;
  }

  .btn {
    flex: 1;
  }

  .filters-bar {
    grid-template-columns: 1fr;
  }
}
</style>