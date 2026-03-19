<template>
  <div class="page-container">
    <div class="page-header">
      <div class="header-content">
        <h1>إدارة البرامج</h1>
        <p class="page-description">البرامج التدريبية المتاحة والتفاصيل الخاصة بها</p>
      </div>
      <div class="header-actions">
        <router-link to="/programs/new" class="btn btn-primary">
          ➕ برنامج جديد
        </router-link>
      </div>
    </div>

    <!-- الإحصائيات السريعة -->
    <div class="stats-row">
      <div class="stat-item">
        <div class="stat-value">{{ programStore.programs.length }}</div>
        <div class="stat-label">البرامج الكلية</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">{{ programStore.activeProgramsCount }}</div>
        <div class="stat-label">البرامج النشطة</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">{{ programStore.totalEnrolled }}</div>
        <div class="stat-label">إجمالي الملتحقين</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">{{ programStore.averageFillRate }}%</div>
        <div class="stat-label">متوسط معدل الملء</div>
      </div>
    </div>

    <!-- جدول البرامج -->
    <DataTable
      title="قائمة البرامج"
      subtitle="جميع البرامج التدريبية في النظام"
      :columns="tableColumns"
      :data="programStore.programs"
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
import { useProgramStore } from '../stores/useProgramStore'
import DataTable from '../components/Common/DataTable.vue'

export default {
  name: 'Programs',
  components: {
    DataTable,
  },
  data() {
    return {
      programStore: useProgramStore(),
      selectedRows: [],
      tableColumns: [
        { key: 'name', label: 'اسم البرنامج', sortable: true },
        { key: 'duration', label: 'المدة (ساعات)', sortable: true },
        { key: 'sessions', label: 'الجلسات', sortable: true },
        {
          key: 'enrolled',
          label: 'الملتحقين',
          render: (value, row) => `${value} من ${row.capacity}`,
        },
        { key: 'level', label: 'المستوى', sortable: true },
        {
          key: 'status',
          label: 'الحالة',
          type: 'badge',
          render: (value) => {
            const labels = { active: 'نشط', inactive: 'غير نشط' }
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
          handler: (row) => this.editProgram(row),
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
      this.$router.push(`/programs/${row.id}`)
    },
    onSelectionChange(selected) {
      this.selectedRows = selected
    },
    editProgram(row) {
      this.$router.push(`/programs/${row.id}`)
    },
    confirmDelete(row) {
      if (confirm(`هل تريد حذف البرنامج ${row.name}؟`)) {
        this.programStore.deleteProgram(row.id)
      }
    },
    deleteSelected() {
      if (
        confirm(`هل تريد حذف ${this.selectedRows.length} برنامج؟`)
      ) {
        this.selectedRows.forEach(id => this.programStore.deleteProgram(id))
        this.selectedRows = []
      }
    },
  },
  mounted() {
    // جلب البيانات عند تحميل الصفحة
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