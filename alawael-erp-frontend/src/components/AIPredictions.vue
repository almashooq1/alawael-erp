<template>
  <div class="ai-predictions-container">
    <!-- Header -->
    <div class="header">
      <h1>🤖 نظام التنبؤات الذكية</h1>
      <p>تحليل ذكي للتنبؤ بالمستقبل وتقديم توصيات</p>
    </div>

    <!-- Statistics Cards -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon">📊</div>
        <div class="stat-info">
          <div class="stat-label">إجمالي التنبؤات</div>
          <div class="stat-value">{{ stats.total }}</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">✅</div>
        <div class="stat-info">
          <div class="stat-label">نسبة الدقة</div>
          <div class="stat-value">{{ stats.accuracy }}%</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">⚡</div>
        <div class="stat-info">
          <div class="stat-label">تنبؤات حديثة</div>
          <div class="stat-value">{{ stats.recent }}</div>
        </div>
      </div>
    </div>

    <!-- Predictions List -->
    <div class="predictions-section">
      <h2>آخر التنبؤات</h2>

      <div v-if="loading" class="loading">جاري التحميل...</div>

      <div v-else class="predictions-list">
        <div v-for="prediction in predictions" :key="prediction.id" class="prediction-card">
          <div class="prediction-header">
            <h3>{{ prediction.title }}</h3>
            <span class="confidence-badge" :class="`confidence-${Math.round(prediction.confidence)}`">
              {{ Math.round(prediction.confidence) }}% ثقة
            </span>
          </div>

          <div class="prediction-body">
            <p>{{ prediction.description }}</p>

            <div class="prediction-details">
              <div class="detail">
                <span class="label">النوع:</span>
                <span class="value">{{ prediction.type }}</span>
              </div>
              <div class="detail">
                <span class="label">الحالة:</span>
                <span class="value">{{ prediction.status }}</span>
              </div>
              <div class="detail">
                <span class="label">التاريخ:</span>
                <span class="value">{{ formatDate(prediction.created_at) }}</span>
              </div>
            </div>
          </div>

          <div class="prediction-footer">
            <button class="btn-secondary" @click="viewDetails(prediction.id)">التفاصيل</button>
            <button class="btn-primary" @click="takAction(prediction.id)">اتخاذ إجراء</button>
          </div>
        </div>
      </div>
    </div>

    <!-- New Prediction Form -->
    <div class="new-prediction-section">
      <h2>إنشاء تنبؤ جديد</h2>

      <form @submit.prevent="createPrediction" class="form">
        <div class="form-group">
          <label>نوع الكيان:</label>
          <select v-model="form.entity_type" required>
            <option value="">اختر نوعاً</option>
            <option value="student">طالب</option>
            <option value="deal">صفقة</option>
            <option value="asset">أصل</option>
          </select>
        </div>

        <div class="form-group">
          <label>معرف الكيان:</label>
          <input v-model="form.entity_id" type="text" required />
        </div>

        <button type="submit" class="btn-primary">إنشاء التنبؤ</button>
      </form>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { usePredictionStore } from '@/stores/predictions'

export default {
  name: 'AIPredictions',
  setup() {
    const store = usePredictionStore()
    const predictions = ref([])
    const loading = ref(false)

    const form = ref({
      entity_type: '',
      entity_id: ''
    })

    const stats = computed(() => ({
      total: predictions.value.length,
      accuracy: Math.round(
        predictions.value.reduce((sum, p) => sum + p.confidence, 0) / predictions.value.length
      ) || 0,
      recent: predictions.value.filter(p =>
        new Date(p.created_at) > new Date(Date.now() - 24*60*60*1000)
      ).length
    }))

    const fetchPredictions = async () => {
      loading.value = true
      try {
        const response = await fetch('/api/predictions/dashboard')
        const data = await response.json()
        predictions.value = data.data.recent_predictions || []
      } catch (error) {
        console.error('خطأ في جلب التنبؤات:', error)
      } finally {
        loading.value = false
      }
    }

    const createPrediction = async () => {
      try {
        const response = await fetch(
          `/api/predictions/risk-assessment`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form.value)
          }
        )

        if (response.ok) {
          await fetchPredictions()
          form.value = { entity_type: '', entity_id: '' }
          alert('تم إنشاء التنبؤ بنجاح')
        }
      } catch (error) {
        console.error('خطأ في إنشاء التنبؤ:', error)
      }
    }

    const viewDetails = (predictionId) => {
      // navigate to details page
    }

    const takAction = (predictionId) => {
      alert(`اتخاذ إجراء بشأن التنبؤ: ${predictionId}`)
    }

    const formatDate = (dateString) => {
      return new Date(dateString).toLocaleDateString('ar-SA')
    }

    onMounted(fetchPredictions)

    return {
      predictions,
      loading,
      stats,
      form,
      createPrediction,
      viewDetails,
      takAction,
      formatDate
    }
  }
}
</script>

<style scoped>
.ai-predictions-container {
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

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.stat-card {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.stat-icon {
  font-size: 2rem;
}

.stat-label {
  color: #666;
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: bold;
  color: #333;
}

.predictions-list {
  display: grid;
  gap: 1rem;
}

.prediction-card {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.prediction-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #eee;
}

.prediction-header h3 {
  margin: 0;
  color: #333;
}

.confidence-badge {
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: bold;
}

.confidence-80,
.confidence-90,
.confidence-100 {
  background-color: #d4edda;
  color: #155724;
}

.confidence-60,
.confidence-70 {
  background-color: #fff3cd;
  color: #856404;
}

.confidence-0,
.confidence-50 {
  background-color: #f8d7da;
  color: #721c24;
}

.prediction-details {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
  margin: 1rem 0;
}

.detail {
  display: flex;
  flex-direction: column;
}

.detail .label {
  color: #666;
  font-size: 0.85rem;
  margin-bottom: 0.25rem;
}

.detail .value {
  color: #333;
  font-weight: 500;
}

.prediction-footer {
  display: flex;
  gap: 1rem;
  margin-top: 1rem;
}

.btn-primary, .btn-secondary {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
}

.btn-primary {
  background-color: #007bff;
  color: white;
}

.btn-primary:hover {
  background-color: #0056b3;
}

.btn-secondary {
  background-color: #6c757d;
  color: white;
}

.btn-secondary:hover {
  background-color: #545b62;
}

.form {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #333;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
}

.loading {
  text-align: center;
  padding: 2rem;
  color: #666;
}
</style>
