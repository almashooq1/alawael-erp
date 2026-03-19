<template>
  <div class="page-container">
    <div class="page-header">
      <div class="header-content">
        <h1>إدارة الطلاب</h1>
        <p class="page-description">قائمة جميع الطلاب والعمليات الخاصة بهم</p>
      </div>
      <div class="header-actions">
        <router-link to="/students/new" class="btn btn-primary">
          ➕ طالب جديد
        </router-link>
      </div>
    </div>

    <!-- الإحصائيات السريعة -->
    <div class="stats-row">
      <div class="stat-item">
        <div class="stat-value">{{ studentStore.students.length }}</div>
        <div class="stat-label">إجمالي الطلاب</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">{{ studentStore.activeStudentsCount }}</div>
        <div class="stat-label">الطلاب النشطين</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">{{ studentStore.averageProgress }}%</div>
        <div class="stat-label">متوسط التقدم</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">{{ studentStore.averageAttendance }}%</div>
        <div class="stat-label">متوسط الحضور</div>
      </div>
    </div>

    <!-- جدول الطلاب -->
    <DataTable
      title="قائمة الطلاب"
      subtitle="جميع الطلاب المسجلين في النظام"
      :columns="tableColumns"
      :data="studentStore.students"
      :actions="tableActions"
      @row-click="onRowClick"
      @selection-change="onSelectionChange"
    >
      <template #actions>
        <button
          v-if="selectedRows.length > 0"
          class="btn btn-secondary"
          @click="deleteSelected"
        >
          🗑️ حذف ({{ selectedRows.length }})
        </button>
      </template>
    </DataTable>
  </div>
</template>

<script>
import { useStudentStore } from '../stores/useStudentStore'
import DataTable from '../components/Common/DataTable.vue'

export default {
  name: 'Students',
  components: {
    DataTable,
  },
  data() {
    return {
      studentStore: useStudentStore(),
      selectedRows: [],
      tableColumns: [
        { key: 'name', label: 'الاسم', sortable: true },
        { key: 'email', label: 'البريد الإلكتروني', sortable: true },
        { key: 'phone', label: 'الهاتف' },
        { key: 'program', label: 'البرنامج', sortable: true },
        { key: 'progress', label: 'التقدم', type: 'progress' },
        {
          key: 'status',
          label: 'الحالة',
          type: 'badge',
          render: (value) => {
            const labels = { active: 'نشط', completed: 'مكتمل' }
            return labels[value] || value
          },
        },
      ],
      tableActions: [
        {
          id: 'edit',
          icon: '✏️',
          label: 'تعديل',
          type: 'edit',
          handler: (row) => this.editStudent(row),
        },
        {
          id: 'delete',
          icon: '🗑️',
          label: 'حذف',
          type: 'delete',
          handler: (row) => this.confirmDelete(row),
        },
      ],
    }
  },
  methods: {
    onRowClick(row) {
      this.$router.push(`/students/${row.id}`)
    },
    onSelectionChange(selected) {
      this.selectedRows = selected
    },
    editStudent(row) {
      this.$router.push(`/students/${row.id}`)
    },
    confirmDelete(row) {
      if (confirm(`هل تريد حذف الطالب ${row.name}؟`)) {
        this.studentStore.deleteStudent(row.id)
      }
    },
    deleteSelected() {
      if (
        confirm(`هل تريد حذف ${this.selectedRows.length} طالب؟`)
      ) {
        this.selectedRows.forEach(id => this.studentStore.deleteStudent(id))
        this.selectedRows = []
      }
    },
  },
  mounted() {
    this.studentStore.fetchStudents()
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

.btn-secondary {
  background: var(--color-gray-200);
  color: var(--color-gray-800);
}

.btn-secondary:hover {
  background: var(--color-gray-300);
}

.stats-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--spacing-lg);
}

.stat-item {
  background: var(--color-white);
  border: 1px solid var(--color-gray-200);
  border-radius: var(--radius-md);
  padding: var(--spacing-lg);
  text-align: center;
}

.stat-value {
  font-size: var(--text-2xl);
  font-weight: 700;
  color: var(--color-primary-600);
  margin-bottom: var(--spacing-sm);
}

.stat-label {
  font-size: var(--text-sm);
  color: var(--color-gray-500);
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

  .stats-row {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>