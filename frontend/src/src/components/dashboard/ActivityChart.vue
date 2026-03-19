<template>
  <div class="chart-card">
    <div class="chart-header">
      <div class="header-content">
        <h3 class="chart-title">{{ title }}</h3>
        <p v-if="subtitle" class="chart-subtitle">{{ subtitle }}</p>
      </div>
      <div class="header-actions">
        <button
          v-for="period in periods"
          :key="period"
          class="btn-period"
          :class="{ active: selectedPeriod === period }"
          @click="selectedPeriod = period"
        >
          {{ periodLabels[period] }}
        </button>
      </div>
    </div>

    <div class="chart-container">
      <canvas ref="chartCanvas"></canvas>
    </div>

    <div v-if="showStats" class="chart-stats">
      <div v-for="stat in stats" :key="stat.label" class="stat-item">
        <span class="stat-icon">{{ stat.icon }}</span>
        <div class="stat-content">
          <p class="stat-label">{{ stat.label }}</p>
          <p class="stat-value">{{ stat.value }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ActivityChart',
  props: {
    title: {
      type: String,
      required: true,
    },
    subtitle: {
      type: String,
      default: null,
    },
    type: {
      type: String,
      default: 'line',
      validator: (value) => ['line', 'bar', 'area', 'pie', 'doughnut'].includes(value),
    },
    data: {
      type: Object,
      default: () => ({}),
    },
    options: {
      type: Object,
      default: () => ({}),
    },
    showStats: {
      type: Boolean,
      default: true,
    },
  },
  data() {
    return {
      selectedPeriod: 'week',
      periods: ['week', 'month', 'year'],
      periodLabels: {
        week: 'أسبوع',
        month: 'شهر',
        year: 'سنة',
      },
      chart: null,
      stats: [
        {
          icon: '📈',
          label: 'أعلى نقطة',
          value: '95',
        },
        {
          icon: '📉',
          label: 'أدنى نقطة',
          value: '42',
        },
        {
          icon: '📊',
          label: 'المتوسط',
          value: '68.5',
        },
      ],
    }
  },
  watch: {
    selectedPeriod(newValue) {
      this.updateChartData()
      this.$emit('period-changed', newValue)
    },
  },
  methods: {
    async loadChart() {
      // محاكاة تحميل مكتبة Chart.js
      // في الإنتاج، سيتم استخدام: import Chart from 'chart.js/auto'
      if (!window.Chart) {
        console.warn('Chart.js not loaded yet')
        return
      }

      const ctx = this.$refs.chartCanvas.getContext('2d')
      const chartData = this.getChartData()
      const chartOptions = this.getChartOptions()

      if (this.chart) {
        this.chart.destroy()
      }

      this.chart = new window.Chart(ctx, {
        type: this.type,
        data: chartData,
        options: chartOptions,
      })
    },
    getChartData() {
      const dataByPeriod = {
        week: {
          labels: ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'],
          data: [45, 52, 48, 61, 55, 67, 72],
        },
        month: {
          labels: Array.from({ length: 30 }, (_, i) => `${i + 1}`),
          data: Array.from(
            { length: 30 },
            () => Math.floor(Math.random() * 100) + 20
          ),
        },
        year: {
          labels: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'],
          data: [35, 42, 55, 48, 60, 72, 85, 78, 65, 72, 68, 75],
        },
      }

      const period = dataByPeriod[this.selectedPeriod]

      return {
        labels: period.labels,
        datasets: [
          {
            label: 'النشاط',
            data: period.data,
            borderColor: 'var(--color-primary-600)',
            backgroundColor:
              this.type === 'area'
                ? 'rgba(59, 130, 246, 0.1)'
                : 'rgba(59, 130, 246, 0.5)',
            tension: 0.4,
            fill: this.type === 'area',
            pointBackgroundColor: 'var(--color-primary-600)',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6,
          },
          {
            label: 'الهدف',
            data: period.data.map(d => d * 0.8),
            borderColor: 'var(--color-warning-600)',
            backgroundColor:
              this.type === 'area'
                ? 'rgba(245, 158, 11, 0.1)'
                : 'rgba(245, 158, 11, 0.5)',
            tension: 0.4,
            fill: this.type === 'area',
            pointBackgroundColor: 'var(--color-warning-600)',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6,
            borderDash: [5, 5],
          },
        ],
      }
    },
    getChartOptions() {
      return {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            position: 'top',
            labels: {
              usePointStyle: true,
              padding: 16,
              font: {
                size: 14,
                weight: 500,
              },
              color: 'var(--color-gray-600)',
            },
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            padding: 12,
            titleFont: {
              size: 14,
            },
            bodyFont: {
              size: 13,
            },
            cornerRadius: 8,
            displayColors: true,
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
            grid: {
              drawBorder: false,
              color: 'rgba(0, 0, 0, 0.05)',
            },
            ticks: {
              color: 'var(--color-gray-400)',
            },
          },
          x: {
            grid: {
              display: false,
            },
            ticks: {
              color: 'var(--color-gray-400)',
            },
          },
        },
      }
    },
    updateChartData() {
      if (this.chart) {
        this.chart.data = this.getChartData()
        this.chart.update()
      }
    },
  },
  mounted() {
    // في الإنتاج، يتم تحميل Chart.js من CDN أو npm
    const script = document.createElement('script')
    script.src = 'https://cdn.jsdelivr.net/npm/chart.js'
    script.onload = () => {
      this.loadChart()
    }
    document.head.appendChild(script)
  },
  beforeUnmount() {
    if (this.chart) {
      this.chart.destroy()
    }
  },
}
</script>

<style scoped>
.chart-card {
  background: var(--color-white);
  border: 1px solid var(--color-gray-200);
  border-radius: var(--radius-md);
  padding: var(--spacing-lg);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: var(--spacing-lg);
}

.header-content {
  flex: 1;
  min-width: 200px;
}

.chart-title {
  margin: 0;
  font-size: var(--text-lg);
  color: var(--color-gray-800);
  font-weight: 700;
}

.chart-subtitle {
  margin: var(--spacing-xs) 0 0 0;
  font-size: var(--text-sm);
  color: var(--color-gray-500);
}

.header-actions {
  display: flex;
  gap: var(--spacing-sm);
}

.btn-period {
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--color-gray-50);
  border: 1px solid var(--color-gray-200);
  border-radius: var(--radius-sm);
  color: var(--color-gray-600);
  font-size: var(--text-sm);
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-base);
}

.btn-period:hover {
  background: var(--color-gray-100);
  border-color: var(--color-gray-300);
}

.btn-period.active {
  background: var(--color-primary-600);
  border-color: var(--color-primary-600);
  color: white;
}

.chart-container {
  position: relative;
  height: 300px;
  width: 100%;
}

.chart-container canvas {
  max-height: 100%;
}

.chart-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: var(--spacing-md);
  padding-top: var(--spacing-lg);
  border-top: 1px solid var(--color-gray-200);
}

.stat-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.stat-icon {
  font-size: var(--text-xl);
}

.stat-content {
  flex: 1;
}

.stat-label {
  margin: 0;
  font-size: var(--text-xs);
  color: var(--color-gray-500);
  text-transform: uppercase;
}

.stat-value {
  margin: var(--spacing-xs) 0 0 0;
  font-size: var(--text-lg);
  font-weight: 700;
  color: var(--color-gray-800);
}

/* الاستجابة */
@media (max-width: 768px) {
  .chart-card {
    padding: var(--spacing-md);
  }

  .chart-header {
    flex-direction: column;
    gap: var(--spacing-md);
  }

  .header-actions {
    width: 100%;
    justify-content: flex-start;
  }

  .btn-period {
    flex: 1;
    min-width: 80px;
  }

  .chart-container {
    height: 250px;
  }

  .chart-stats {
    grid-template-columns: 1fr;
  }
}
</style>
