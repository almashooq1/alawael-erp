<template>
  <div class="dashboard-page">
    <!-- رأس الصفحة -->
    <div class="page-header">
      <div class="header-content">
        <h1>لوحة التحكم</h1>
        <p class="header-subtitle">مرحباً {{ userGreeting }}، إليك ملخص الأداء</p>
      </div>
      <script>
      import { touchButtonStyle } from '../common/touchStyles.js'
      <div class="header-actions">
        <button
          class="btn btn-secondary"
          @click="refreshData"
          title="تحديث البيانات"
        >
          🔄 تحديث
        </button>
        <button
          class="btn btn-primary"
          @click="exportData"
          title="تصدير التقرير"
        >
          📥 تصدير
        </button>
      </div>
    </div>

    <!-- بطاقات الإحصائيات الرئيسية -->
    <section class="stats-section">
      <h2 class="section-title">الإحصائيات الرئيسية</h2>
      <div class="stats-grid">
        <StatCard
          label="إجمالي الطلاب"
          :value="stats.totalStudents"
          icon="👥"
          variant="primary"
          format="number"
          :trend="{ type: 'up', value: 12, period: 'من الشهر الماضي' }"
          description="الطلاب النشطين حالياً"
          @action="navigateTo('/students')"
          </script>
          :action="{ label: 'عرض الطلاب' }"
        />

        <StatCard
          label="البرامج النشطة"
          :value="stats.activePrograms"
          icon="📚"
          variant="success"
          format="number"
          :trend="{ type: 'up', value: 3, period: 'هذا الشهر' }"
          description="برامج التدريب الحالية"
          @action="navigateTo('/programs')"
          :action="{ label: 'عرض البرامج' }"
        />

        <StatCard
          label="الجلسات هذا الأسبوع"
          :value="stats.weekSessions"
          icon="⏰"
          variant="warning"
          format="number"
          description="الجلسات المجدولة"
          @action="navigateTo('/sessions')"
          :action="{ label: 'عرض الجدول' }"
        />

        <StatCard
          label="معدل الحضور"
          :value="stats.attendanceRate"
          icon="✅"
          variant="success"
          format="percentage"
          :trend="{ type: 'up', value: 5, period: 'هذا الشهر' }"
          description="متوسط حضور الطلاب"
        />
      </div>
    </section>

    <!-- الرسوم البيانية -->
    <section class="charts-section">
      <div class="charts-grid">
        <ActivityChart
          class="chart-container"
          title="نشاط الطلاب"
          subtitle="نسبة الحضور والمشاركة"
          type="line"
          show-stats
          @period-changed="onChartPeriodChanged"
        />

        <ActivityChart
          class="chart-container"
          title="أداء البرامج"
          subtitle="متوسط درجات الطلاب"
          type="bar"
          show-stats
        />
      </div>
    </section>

    <!-- الأنشطة الأخيرة -->
    <section class="activity-section">
      <div class="section-header">
        <h2 class="section-title">الأنشطة الأخيرة</h2>
        <router-link to="/audit" class="btn btn-link">
          عرض الكل →
        </router-link>
      </div>

      <div class="activity-list">
        <div
          v-for="activity in recentActivities"
          :key="activity.id"
          class="activity-item"
          :class="`activity-${activity.type}`"
        >
          <div class="activity-icon">{{ activity.icon }}</div>
          <div class="activity-content">
            <p class="activity-title">{{ activity.title }}</p>
            <p class="activity-description">{{ activity.description }}</p>
            <p class="activity-time">{{ formatTime(activity.timestamp) }}</p>
          </div>
          <div class="activity-user">
            <span class="user-avatar">{{ activity.user.initials }}</span>
            <span class="user-name">{{ activity.user.name }}</span>
          </div>
        </div>
      </div>
    </section>

    <!-- الإجراءات السريعة -->
    <section class="quick-actions-section">
      <h2 class="section-title">إجراءات سريعة</h2>
      <div class="quick-actions-grid">
        <button
          class="quick-action-btn"
          @click="navigateTo('/students/new')"
        >
          <span class="action-icon">➕</span>
          <span class="action-label">طالب جديد</span>
        </button>

        <button
          class="quick-action-btn"
          @click="navigateTo('/programs/new')"
        >
          <span class="action-icon">📘</span>
          <span class="action-label">برنامج جديد</span>
        </button>

        <button
          class="quick-action-btn"
          @click="navigateTo('/sessions/new')"
        >
          <span class="action-icon">⏱️</span>
          <span class="action-label">جلسة جديدة</span>
        </button>

        <button
          class="quick-action-btn"
          @click="navigateTo('/reports/progress')"
        >
          <span class="action-icon">📊</span>
          <span class="action-label">تقرير التقدم</span>
        </button>

        <button
          class="quick-action-btn"
          @click="navigateTo('/settings')"
        >
          <span class="action-icon">⚙️</span>
          <span class="action-label">الإعدادات</span>
        </button>

        <button
          class="quick-action-btn"
          @click="openHelp"
        >
          <span class="action-icon">❓</span>
          <span class="action-label">مساعدة</span>
        </button>
      </div>
    </section>
  </div>
</template>

<script>
import StatCard from '../components/Dashboard/StatCard.vue'
import ActivityChart from '../components/Dashboard/ActivityChart.vue'

export default {
  name: 'Dashboard',
  components: {
    StatCard,
    ActivityChart,
  },
  data() {
    return {
      userGreeting: 'محمد',
      stats: {
        totalStudents: 1234,
        activePrograms: 8,
        weekSessions: 24,
        attendanceRate: 94,
      },
      recentActivities: [
        {
          id: 1,
          type: 'success',
          icon: '✅',
          title: 'تم قبول طالب جديد',
          description: 'تم إضافة أحمد محمود للبرنامج المتقدم',
          timestamp: new Date(Date.now() - 5 * 60000),
          user: {
            name: 'فاطمة أحمد',
            initials: 'ف',
          },
        },
        {
          id: 2,
          type: 'info',
          icon: '📝',
          title: 'تم إنشاء خطة تدريب',
          description: 'خطة تدريب لمنال محمود (30 ساعة)',
          timestamp: new Date(Date.now() - 30 * 60000),
          user: {
            name: 'محمد علي',
            initials: 'م',
          },
        },
        {
          id: 3,
          type: 'warning',
          icon: '⚠️',
          title: 'جلسة قريبة الغياب',
          description: 'جلسة حضور شامل 2 ساعة فقط',
          timestamp: new Date(Date.now() - 2 * 60 * 60000),
          user: {
            name: 'سارة خالد',
            initials: 'س',
          },
        },
        {
          id: 4,
          type: 'info',
          icon: '🎓',
          title: 'تم إصدار شهادة',
          description: 'شهادة إكمال البرنامج الأساسي لعلي محمود',
          timestamp: new Date(Date.now() - 4 * 60 * 60000),
          user: {
            name: 'منى حسن',
            initials: 'م',
          },
        },
      ],
    }
  },
  methods: {
    navigateTo(path) {
      this.$router.push(path)
    },
    refreshData() {
      console.log('تحديث البيانات...')
      // سيتم استدعاء API لتحديث البيانات
    },
    exportData() {
      console.log('تصدير البيانات...')
      // سيتم تصدير التقرير إلى PDF أو Excel
    },
    onChartPeriodChanged(period) {
      console.log('تغيير الفترة الزمنية:', period)
    },
    formatTime(date) {
      const now = new Date()
      const diff = now - date
      const minutes = Math.floor(diff / 60000)
      const hours = Math.floor(diff / 3600000)
      const days = Math.floor(diff / 86400000)

      if (minutes < 1) return 'الآن'
      if (minutes < 60) return `${minutes} دقيقة`
      if (hours < 24) return `${hours} ساعة`
      if (days < 7) return `${days} أيام`

      return new Intl.DateTimeFormat('ar-EG').format(date)
    },
    openHelp() {
      // سيتم فتح صفحة المساعدة
      alert('سيتم فتح صفحة المساعدة قريباً')
    },
  },
  mounted() {
    // يمكن استدعاء API هنا لتحميل البيانات من الخادم
    console.log('تم تحميل صفحة لوحة التحكم')
  },
}
</script>

<style scoped>
.dashboard-page {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2xl);
}

/* رأس الصفحة */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-xl);
  flex-wrap: wrap;
  gap: var(--spacing-lg);
}

.header-content h1 {
  margin: 0 0 var(--spacing-sm) 0;
  font-size: var(--text-3xl);
  color: var(--color-gray-800);
}

.header-subtitle {
  margin: 0;
  font-size: var(--text-base);
  color: var(--color-gray-500);
}

.header-actions {
  display: flex;
  gap: var(--spacing-md);
}

.btn {
  padding: var(--spacing-sm) var(--spacing-lg);
  border-radius: var(--radius-base);
  border: none;
  font-size: var(--text-base);
  cursor: pointer;
  transition: all var(--transition-base);
  font-weight: 500;
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

.btn-link {
  background: transparent;
  color: var(--color-primary-600);
  padding: 0;
}

.btn-link:hover {
  text-decoration: underline;
}

/* الأقسام */
.stats-section,
.charts-section,
.activity-section,
.quick-actions-section {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.section-title {
  margin: 0;
  font-size: var(--text-xl);
  color: var(--color-gray-800);
  font-weight: 700;
}

/* شبكة الإحصائيات */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: var(--spacing-lg);
}

/* شبكة الرسوم البيانية */
.charts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: var(--spacing-lg);
}

.chart-container {
  min-height: 400px;
}

/* قائمة الأنشطة */
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.activity-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.activity-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-lg);
  padding: var(--spacing-lg);
  background: var(--color-white);
  border: 1px solid var(--color-gray-200);
  border-radius: var(--radius-md);
  border-right: 4px solid var(--color-gray-300);
  transition: all var(--transition-base);
}

.activity-item:hover {
  box-shadow: var(--shadow-md);
  border-color: var(--color-gray-300);
}

.activity-item.activity-success {
  border-right-color: var(--color-success-500);
}

.activity-item.activity-warning {
  border-right-color: var(--color-warning-500);
}

.activity-item.activity-error {
  border-right-color: var(--color-error-500);
}

.activity-icon {
  font-size: var(--text-2xl);
  flex-shrink: 0;
}

.activity-content {
  flex: 1;
}

.activity-title {
  margin: 0 0 var(--spacing-xs) 0;
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--color-gray-800);
}

.activity-description {
  margin: 0 0 var(--spacing-xs) 0;
  font-size: var(--text-sm);
  color: var(--color-gray-600);
}

.activity-time {
  margin: 0;
  font-size: var(--text-xs);
  color: var(--color-gray-400);
}

.activity-user {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  flex-shrink: 0;
}

.user-avatar {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-primary-100);
  color: var(--color-primary-600);
  border-radius: 50%;
  font-weight: 700;
  font-size: var(--text-sm);
}

.user-name {
  font-size: var(--text-sm);
  color: var(--color-gray-600);
  white-space: nowrap;
}

/* الإجراءات السريعة */
.quick-actions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: var(--spacing-lg);
}

.quick-action-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-md);
  padding: var(--spacing-xl);
  background: var(--color-white);
  border: 2px solid var(--color-gray-200);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-base);
}

.quick-action-btn:hover {
  background: var(--color-primary-50);
  border-color: var(--color-primary-600);
  box-shadow: var(--shadow-md);
}

.action-icon {
  font-size: var(--text-2xl);
}

.action-label {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-gray-800);
  text-align: center;
}

/* الاستجابة */
@media (max-width: 1024px) {
  .charts-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .header-actions {
    width: 100%;
  }

  .header-actions .btn {
    flex: 1;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }

  .activity-item {
    flex-direction: column;
    align-items: flex-start;
  }

  .quick-actions-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 480px) {
  .header-content h1 {
    font-size: var(--text-2xl);
  }

  .stats-grid {
    gap: var(--spacing-md);
  }

  .quick-actions-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: var(--spacing-md);
  }

  .quick-action-btn {
    padding: var(--spacing-lg);
  }

  .action-icon {
    font-size: var(--text-xl);
  }
}
</style>
