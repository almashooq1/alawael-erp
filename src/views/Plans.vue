<template>
  <div class="page-container">
    <div class="page-header">
      <div class="header-content">
        <h1>خطط التدريب</h1>
        <p class="page-description">الخطط الفردية والمجموعية للطلاب</p>
      </div>
      <div class="header-actions">
        <router-link to="/plans/new" class="btn btn-primary">
          ➕ خطة جديدة
        </router-link>
      </div>
    </div>

    <!-- الإحصائيات -->
    <div class="stats-row">
      <div class="stat-item">
        <div class="stat-value">{{ plans.length }}</div>
        <div class="stat-label">إجمالي الخطط</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">{{ activePlans }}</div>
        <div class="stat-label">الخطط النشطة</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">{{ completedPlans }}</div>
        <div class="stat-label">الخطط المكتملة</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">{{ averageProgress }}%</div>
        <div class="stat-label">متوسط التقدم</div>
      </div>
    </div>

    <!-- الجدول -->
    <DataTable
      title="قائمة الخطط"
      subtitle="خطط التدريب الخاصة بالطلاب"
      :columns="tableColumns"
      :data="plans"
      :actions="tableActions"
      @row-click="onRowClick"
    />
  </div>
</template>

<script>
import DataTable from '../components/Common/DataTable.vue'

export default {
  name: 'Plans',
  components: {
    DataTable,
  },
  data() {
    return {
      plans: [
        {
          id: 1,
          title: 'خطة البرمجة الأساسية - أحمد',
          student: 'أحمد محمود',
          program: 'البرنامج الأساسي',
          duration: 60,
          startDate: '2026-01-01',
          endDate: '2026-03-15',
          progress: 75,
          status: 'active',
        },
        {
          id: 2,
          title: 'خطة تطوير الويب - فاطمة',
          student: 'فاطمة أحمد',
          program: 'تطوير الويب',
          duration: 80,
          startDate: '2026-01-05',
          endDate: '2026-04-10',
          progress: 45,
          status: 'active',
        },
        {
          id: 3,
          title: 'خطة البرمجة - علي',
          student: 'علي حسن',
          program: 'البرنامج الأساسي',
          duration: 60,
          startDate: '2025-10-01',
          endDate: '2025-12-20',
          progress: 100,
          status: 'completed',
        },
      ],
      tableColumns: [
        { key: 'title', label: 'الخطة', sortable: true },
        { key: 'student', label: 'الطالب', sortable: true },
        { key: 'program', label: 'البرنامج', sortable: true },
        { key: 'duration', label: 'المدة (ساعات)' },
        { key: 'progress', label: 'التقدم', type: 'progress' },
        {
          key: 'status',
          label: 'الحالة',
          type: 'badge',
          render: (value) => {
            const labels = { active: 'نشطة', completed: 'مكتملة', paused: 'مؤجلة' }
            return labels[value] || value
          },
        },
      ],
      tableActions: [
        {
          id: 'edit',
          icon: '✏️',
          label: 'تعديل',
          handler: (row) => this.editPlan(row),
        },
        {
          id: 'delete',
          icon: '🗑️',
          label: 'حذف',
          handler: (row) => this.deletePlan(row),
        },
      ],
    }
  },
  computed: {
    activePlans() {
      return this.plans.filter(p => p.status === 'active').length
    },
    completedPlans() {
      return this.plans.filter(p => p.status === 'completed').length
    },
    averageProgress() {
      const total = this.plans.reduce((sum, p) => sum + p.progress, 0)
      return Math.round(total / this.plans.length)
    },
  },
  methods: {
    onRowClick(row) {
      this.$router.push(`/plans/${row.id}`)
    },
    editPlan(row) {
      this.$router.push(`/plans/${row.id}`)
    },
    deletePlan(row) {
      if (confirm(`هل تريد حذف الخطة ${row.title}؟`)) {
        this.plans = this.plans.filter(p => p.id !== row.id)
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