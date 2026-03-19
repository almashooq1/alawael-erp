<template>
  <div class="page-container">
    <div class="page-header">
      <div class="header-content">
        <h1>التقارير والإحصائيات</h1>
        <p class="page-description">تحليلات شاملة عن الأداء والتقدم</p>
      </div>
      <div class="header-actions">
        <button class="btn btn-secondary" @click="downloadReport">
          📥 تحميل
        </button>
        <button class="btn btn-primary" @click="generateReport">
          📊 توليد تقرير
        </button>
      </div>
    </div>

    <!-- المرشحات -->
    <div class="filters-row">
      <FormSelect
        v-model="selectedReport"
        label="نوع التقرير"
        :options="reportTypes"
      />
      <FormSelect
        v-model="selectedPeriod"
        label="الفترة"
        :options="periodOptions"
      />
    </div>

    <!-- الرسوم البيانية -->
    <div class="charts-grid">
      <div class="chart-card">
        <h3>نسبة الحضور</h3>
        <div class="chart-placeholder">
          <div class="percentage-display">94%</div>
          <p>متوسط الحضور هذا الشهر</p>
        </div>
      </div>

      <div class="chart-card">
        <h3>تقدم الطلاب</h3>
        <div class="chart-placeholder">
          <div class="progress-display">
            <div class="progress-bar">
              <div class="progress-fill" style="width: 68%"></div>
            </div>
            <p>68% متوسط التقدم</p>
          </div>
        </div>
      </div>

      <div class="chart-card">
        <h3>رضا الطلاب</h3>
        <div class="chart-placeholder">
          <div class="rating-display">★★★★☆ 4.2</div>
          <p>تقييم من 1000 طالب</p>
        </div>
      </div>

      <div class="chart-card">
        <h3>إكمال البرامج</h3>
        <div class="chart-placeholder">
          <div class="percentage-display">87%</div>
          <p>نسبة الطلاب المكملين</p>
        </div>
      </div>
    </div>

    <!-- الجدول -->
    <DataTable
      title="ملخص الأداء"
      subtitle="إحصائيات الطلاب والبرامج"
      :columns="tableColumns"
      :data="reportData"
    />
  </div>
</template>

<script>
import DataTable from '../components/Common/DataTable.vue'
import FormSelect from '../components/Form/FormSelect.vue'

export default {
  name: 'Reports',
  components: {
    DataTable,
    FormSelect,
  },
  data() {
    return {
      selectedReport: 'performance',
      selectedPeriod: 'month',
      reportTypes: [
        { value: 'performance', label: 'تقرير الأداء' },
        { value: 'attendance', label: 'تقرير الحضور' },
        { value: 'progress', label: 'تقرير التقدم' },
        { value: 'completion', label: 'تقرير الإكمال' },
      ],
      periodOptions: [
        { value: 'week', label: 'هذا الأسبوع' },
        { value: 'month', label: 'هذا الشهر' },
        { value: 'quarter', label: 'هذا الربع' },
        { value: 'year', label: 'هذه السنة' },
        { value: 'custom', label: 'نطاق مخصص' },
      ],
      tableColumns: [
        { key: 'name', label: 'البرنامج', sortable: true },
        { key: 'totalStudents', label: 'إجمالي الطلاب' },
        { key: 'enrolled', label: 'الملتحقين' },
        { key: 'completionRate', label: 'نسبة الإكمال' },
        { key: 'averageScore', label: 'المتوسط' },
        { key: 'attendanceRate', label: 'الحضور' },
      ],
      reportData: [
        {
          id: 1,
          name: 'البرنامج الأساسي',
          totalStudents: 150,
          enrolled: 140,
          completionRate: 85,
          averageScore: 78,
          attendanceRate: 92,
        },
        {
          id: 2,
          name: 'تطوير الويب',
          totalStudents: 120,
          enrolled: 110,
          completionRate: 88,
          averageScore: 82,
          attendanceRate: 94,
        },
        {
          id: 3,
          name: 'البرمجة المتقدمة',
          totalStudents: 80,
          enrolled: 70,
          completionRate: 92,
          averageScore: 86,
          attendanceRate: 96,
        },
      ],
    }
  },
  methods: {
    generateReport() {
      alert(`جاري توليد تقرير ${this.selectedReport} للفترة: ${this.selectedPeriod}`)
    },
    downloadReport() {
      alert('جاري تحميل التقرير...')
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

.filters-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: var(--spacing-lg);
  background: var(--color-white);
  border: 1px solid var(--color-gray-200);
  border-radius: var(--radius-md);
  padding: var(--spacing-lg);
}

.charts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: var(--spacing-lg);
}

.chart-card {
  background: var(--color-white);
  border: 1px solid var(--color-gray-200);
  border-radius: var(--radius-md);
  padding: var(--spacing-lg);
}

.chart-card h3 {
  margin: 0 0 var(--spacing-lg) 0;
  font-size: var(--text-base);
  color: var(--color-gray-800);
}

.chart-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-md);
  min-height: 150px;
  color: var(--color-gray-500);
}

.percentage-display {
  font-size: var(--text-3xl);
  font-weight: 700;
  color: var(--color-primary-600);
  margin-bottom: var(--spacing-md);
}

.percentage-display + p {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--color-gray-500);
}

.progress-display {
  width: 100%;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: var(--color-gray-200);
  border-radius: var(--radius-full);
  overflow: hidden;
  margin-bottom: var(--spacing-md);
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-primary-400), var(--color-primary-600));
}

.progress-display p {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--color-gray-500);
  text-align: center;
}

.rating-display {
  font-size: var(--text-2xl);
  color: var(--color-warning-500);
  font-weight: 700;
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

  .filters-row {
    grid-template-columns: 1fr;
  }

  .charts-grid {
    grid-template-columns: 1fr;
  }
}
</style>