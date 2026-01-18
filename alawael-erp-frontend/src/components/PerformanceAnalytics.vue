<template>
  <div class="performance-analytics-container">
    <!-- Header -->
    <div class="header">
      <h1>📈 تحليل الأداء</h1>
      <p>مراقبة الأداء وتحديد الاختناقات</p>
    </div>

    <!-- Performance Metrics -->
    <div class="metrics-grid">
      <div class="metric-card">
        <div class="metric-label">متوسط وقت الاستجابة</div>
        <div class="metric-value">{{ currentPerformance.avg_response_time || 0 }}ms</div>
        <div class="metric-status" :class="{ good: currentPerformance.avg_response_time < 200 }">
          {{ currentPerformance.avg_response_time < 200 ? '✅ ممتاز' : '⚠️ يحتاج تحسين' }}
        </div>
      </div>

      <div class="metric-card">
        <div class="metric-label">استخدام الذاكرة</div>
        <div class="metric-value">{{ currentPerformance.memory_usage || 0 }}%</div>
        <div class="progress-bar">
          <div class="progress" :style="{ width: (currentPerformance.memory_usage || 0) + '%' }"></div>
        </div>
      </div>

      <div class="metric-card">
        <div class="metric-label">استخدام المعالج</div>
        <div class="metric-value">{{ currentPerformance.cpu_usage || 0 }}%</div>
        <div class="progress-bar">
          <div class="progress" :style="{ width: (currentPerformance.cpu_usage || 0) + '%' }"></div>
        </div>
      </div>

      <div class="metric-card">
        <div class="metric-label">معدل الأخطاء</div>
        <div class="metric-value">{{ currentPerformance.error_rate || 0 }}%</div>
        <div class="metric-status" :class="{ good: currentPerformance.error_rate < 1 }">
          {{ currentPerformance.error_rate < 1 ? '✅ آمن' : '❌ عالي' }}
        </div>
      </div>
    </div>

    <!-- Alerts Section -->
    <div class="alerts-section">
      <h2>التنبيهات النشطة</h2>

      <div v-if="alerts.length === 0" class="no-alerts">
        <p>✅ لا توجد تنبيهات نشطة</p>
      </div>

      <div v-else class="alerts-list">
        <div v-for="alert in alerts" :key="alert.id" class="alert-item" :class="`alert-${alert.severity}`">
          <div class="alert-icon">⚠️</div>
          <div class="alert-content">
            <h3>{{ alert.title }}</h3>
            <p>{{ alert.message }}</p>
            <span class="time">{{ formatTime(alert.created_at) }}</span>
          </div>
          <button @click="dismissAlert(alert.id)" class="dismiss-btn">✕</button>
        </div>
      </div>
    </div>

    <!-- Bottlenecks Section -->
    <div class="bottlenecks-section">
      <h2>الاختناقات المكتشفة</h2>

      <div v-if="bottlenecks.length === 0" class="no-data">
        <p>✅ لا توجد اختناقات</p>
      </div>

      <div v-else class="bottlenecks-list">
        <div v-for="bottleneck in bottlenecks" :key="bottleneck.id" class="bottleneck-card">
          <div class="bottleneck-icon">🔴</div>
          <div class="bottleneck-info">
            <h3>{{ bottleneck.name }}</h3>
            <p>{{ bottleneck.description }}</p>
            <div class="bottleneck-meta">
              <span class="impact">{{ bottleneck.impact }}% تأثير</span>
              <span class="status">{{ bottleneck.status }}</span>
            </div>
          </div>
          <button @click="fixBottleneck(bottleneck.id)" class="btn-primary">
            حل
          </button>
        </div>
      </div>
    </div>

    <!-- Performance Chart -->
    <div class="chart-section">
      <h2>رسم بياني للأداء</h2>
      <div class="chart-container">
        <canvas id="performanceChart"></canvas>
      </div>
    </div>

    <!-- Report Section -->
    <div class="report-section">
      <h2>إنشاء التقرير</h2>
      <div class="report-form">
        <div class="form-row">
          <div class="form-group">
            <label>من التاريخ:</label>
            <input v-model="reportParams.dateFrom" type="date" />
          </div>
          <div class="form-group">
            <label>إلى التاريخ:</label>
            <input v-model="reportParams.dateTo" type="date" />
          </div>
        </div>
        <button @click="generateReport" class="btn-primary">
          📊 إنشاء التقرير
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import Chart from 'chart.js/auto'

export default {
  name: 'PerformanceAnalytics',
  setup() {
    const currentPerformance = ref({})
    const alerts = ref([])
    const bottlenecks = ref([])
    const reportParams = ref({
      dateFrom: new Date(Date.now() - 7*24*60*60*1000).toISOString().split('T')[0],
      dateTo: new Date().toISOString().split('T')[0]
    })
    let chart = null

    const fetchPerformanceData = async () => {
      try {
        const response = await fetch('/api/analytics/performance/current')
        const data = await response.json()
        currentPerformance.value = data.performance || {}
      } catch (error) {
        console.error('خطأ في جلب بيانات الأداء:', error)
      }
    }

    const fetchAlerts = async () => {
      try {
        const response = await fetch('/api/analytics/alerts/active')
        const data = await response.json()
        alerts.value = data.alerts || []
      } catch (error) {
        console.error('خطأ في جلب التنبيهات:', error)
      }
    }

    const fetchBottlenecks = async () => {
      try {
        const response = await fetch('/api/analytics/performance/bottlenecks')
        const data = await response.json()
        bottlenecks.value = data.bottlenecks || []
      } catch (error) {
        console.error('خطأ في جلب الاختناقات:', error)
      }
    }

    const dismissAlert = async (alertId) => {
      alerts.value = alerts.value.filter(a => a.id !== alertId)
    }

    const fixBottleneck = (bottleneckId) => {
      alert(`جاري حل الاختناق: ${bottleneckId}`)
    }

    const generateReport = async () => {
      try {
        const response = await fetch(
          `/api/analytics/performance/report?date_from=${reportParams.value.dateFrom}&date_to=${reportParams.value.dateTo}`
        )
        const data = await response.json()
        console.log('التقرير:', data.report)
        alert('تم إنشاء التقرير بنجاح')
      } catch (error) {
        console.error('خطأ في إنشاء التقرير:', error)
      }
    }

    const formatTime = (dateString) => {
      const date = new Date(dateString)
      return date.toLocaleTimeString('ar-SA')
    }

    const initChart = () => {
      const ctx = document.getElementById('performanceChart')
      if (ctx) {
        chart = new Chart(ctx, {
          type: 'line',
          data: {
            labels: ['الساعة 1', 'الساعة 2', 'الساعة 3', 'الساعة 4', 'الساعة 5', 'الساعة 6'],
            datasets: [
              {
                label: 'وقت الاستجابة (ms)',
                data: [150, 180, 160, 200, 170, 190],
                borderColor: '#007bff',
                tension: 0.1
              },
              {
                label: 'معدل الأخطاء (%)',
                data: [0.5, 0.8, 0.3, 1.2, 0.6, 0.4],
                borderColor: '#dc3545',
                tension: 0.1
              }
            ]
          },
          options: {
            responsive: true,
            plugins: {
              legend: {
                labels: { font: { size: 12 } }
              }
            },
            scales: {
              y: {
                beginAtZero: true
              }
            }
          }
        })
      }
    }

    onMounted(() => {
      fetchPerformanceData()
      fetchAlerts()
      fetchBottlenecks()
      initChart()
    })

    return {
      currentPerformance,
      alerts,
      bottlenecks,
      reportParams,
      fetchPerformanceData,
      fetchAlerts,
      fetchBottlenecks,
      dismissAlert,
      fixBottleneck,
      generateReport,
      formatTime
    }
  }
}
</script>

<style scoped>
.performance-analytics-container {
  padding: 2rem;
  direction: rtl;
}

.header {
  margin-bottom: 2rem;
}

.header h1 {
  font-size: 2rem;
  color: #333;
  margin-bottom: 0.5rem;
}

.header p {
  color: #666;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.metric-card {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.metric-label {
  color: #666;
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
}

.metric-value {
  font-size: 2rem;
  font-weight: bold;
  color: #333;
  margin-bottom: 0.5rem;
}

.metric-status {
  padding: 0.5rem;
  border-radius: 4px;
  font-size: 0.85rem;
  background-color: #f8d7da;
  color: #721c24;
}

.metric-status.good {
  background-color: #d4edda;
  color: #155724;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background-color: #eee;
  border-radius: 4px;
  overflow: hidden;
}

.progress {
  height: 100%;
  background: linear-gradient(90deg, #007bff, #0056b3);
  transition: width 0.3s;
}

.alerts-section, .bottlenecks-section, .report-section {
  background: white;
  border-radius: 8px;
  padding: 2rem;
  margin-bottom: 2rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.alerts-section h2, .bottlenecks-section h2, .report-section h2 {
  margin-top: 0;
  margin-bottom: 1.5rem;
}

.no-alerts, .no-data {
  text-align: center;
  padding: 2rem;
  color: #666;
}

.alerts-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.alert-item {
  display: flex;
  gap: 1rem;
  padding: 1.5rem;
  border-radius: 8px;
  background-color: #f8d7da;
  border-right: 4px solid #dc3545;
}

.alert-icon {
  font-size: 1.5rem;
  flex-shrink: 0;
}

.alert-content {
  flex: 1;
}

.alert-content h3 {
  margin: 0 0 0.5rem 0;
  color: #333;
}

.alert-content p {
  margin: 0;
  color: #666;
  font-size: 0.9rem;
}

.time {
  font-size: 0.8rem;
  color: #999;
}

.dismiss-btn {
  background: none;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
  color: #666;
}

.bottlenecks-list {
  display: grid;
  gap: 1rem;
}

.bottleneck-card {
  display: flex;
  gap: 1rem;
  padding: 1.5rem;
  border-radius: 8px;
  background-color: #fff3cd;
  border-right: 4px solid #ffc107;
}

.bottleneck-icon {
  font-size: 1.5rem;
  flex-shrink: 0;
}

.bottleneck-info {
  flex: 1;
}

.bottleneck-info h3 {
  margin: 0 0 0.5rem 0;
  color: #333;
}

.bottleneck-info p {
  margin: 0 0 1rem 0;
  color: #666;
  font-size: 0.9rem;
}

.bottleneck-meta {
  display: flex;
  gap: 1rem;
  font-size: 0.85rem;
}

.impact {
  color: #856404;
  font-weight: 500;
}

.status {
  color: #856404;
}

.btn-primary {
  padding: 0.75rem 1.5rem;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  white-space: nowrap;
}

.btn-primary:hover {
  background-color: #0056b3;
}

.chart-section {
  background: white;
  border-radius: 8px;
  padding: 2rem;
  margin-bottom: 2rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.chart-container {
  position: relative;
  height: 400px;
  margin-top: 1rem;
}

.report-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group label {
  font-weight: 500;
  color: #333;
}

.form-group input {
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
}
</style>
