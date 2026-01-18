<template>
  <div class="smart-reports-container">
    <!-- Header -->
    <div class="header">
      <h1>📊 نظام التقارير الذكية</h1>
      <p>توليد تقارير متقدمة مع إمكانية التصدير والمقارنة</p>
    </div>

    <!-- Reports Grid -->
    <div class="reports-section">
      <div class="section-header">
        <h2>التقارير الحديثة</h2>
        <button @click="openNewReportDialog" class="btn-primary">
          + تقرير جديد
        </button>
      </div>

      <div v-if="loading" class="loading">جاري التحميل...</div>

      <div v-else class="reports-grid">
        <div v-for="report in reports" :key="report.id" class="report-card">
          <div class="report-header">
            <div class="report-title">
              <span class="report-icon">
                {{ getReportIcon(report.type) }}
              </span>
              <div>
                <h3>{{ report.title }}</h3>
                <p class="report-type">{{ report.type }}</p>
              </div>
            </div>
            <div class="report-actions">
              <button @click="viewReport(report.id)" class="action-btn" title="عرض">👁️</button>
              <button @click="exportReport(report.id)" class="action-btn" title="تصدير">⬇️</button>
              <button @click="deleteReport(report.id)" class="action-btn" title="حذف">🗑️</button>
            </div>
          </div>

          <div class="report-meta">
            <div class="meta-item">
              <span class="meta-label">التاريخ:</span>
              <span>{{ formatDate(report.created_at) }}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">الحالة:</span>
              <span class="status-badge" :class="`status-${report.status}`">
                {{ report.status }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- New Report Dialog -->
    <div v-if="showDialog" class="dialog-overlay" @click="closeDialog">
      <div class="dialog" @click.stop>
        <div class="dialog-header">
          <h2>إنشاء تقرير جديد</h2>
          <button @click="closeDialog" class="close-btn">✕</button>
        </div>

        <form @submit.prevent="createReport" class="form">
          <div class="form-group">
            <label>عنوان التقرير:</label>
            <input v-model="newReport.title" type="text" required />
          </div>

          <div class="form-group">
            <label>نوع التقرير:</label>
            <select v-model="newReport.type" required>
              <option value="">اختر نوعاً</option>
              <option value="student_progress">تقدم الطلاب</option>
              <option value="sales_performance">أداء المبيعات</option>
              <option value="financial_summary">الملخص المالي</option>
              <option value="attendance">الحضور</option>
            </select>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>من تاريخ:</label>
              <input v-model="newReport.date_from" type="date" required />
            </div>
            <div class="form-group">
              <label>إلى تاريخ:</label>
              <input v-model="newReport.date_to" type="date" required />
            </div>
          </div>

          <div class="form-actions">
            <button type="button" @click="closeDialog" class="btn-secondary">إلغاء</button>
            <button type="submit" class="btn-primary">إنشاء التقرير</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Export Options -->
    <div v-if="showExportDialog" class="dialog-overlay" @click="closeExportDialog">
      <div class="dialog" @click.stop>
        <div class="dialog-header">
          <h2>خيارات التصدير</h2>
          <button @click="closeExportDialog" class="close-btn">✕</button>
        </div>

        <div class="export-options">
          <button @click="doExport('pdf')" class="export-btn">📄 PDF</button>
          <button @click="doExport('excel')" class="export-btn">📊 Excel</button>
          <button @click="doExport('csv')" class="export-btn">📑 CSV</button>
          <button @click="doExport('json')" class="export-btn">📋 JSON</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'

export default {
  name: 'SmartReports',
  setup() {
    const reports = ref([])
    const loading = ref(false)
    const showDialog = ref(false)
    const showExportDialog = ref(false)
    const selectedReportId = ref(null)

    const newReport = ref({
      title: '',
      type: '',
      date_from: '',
      date_to: ''
    })

    const fetchReports = async () => {
      loading.value = true
      try {
        const response = await fetch('/api/reports/list')
        const data = await response.json()
        reports.value = data.reports || []
      } catch (error) {
        console.error('خطأ في جلب التقارير:', error)
      } finally {
        loading.value = false
      }
    }

    const openNewReportDialog = () => {
      newReport.value = {
        title: '',
        type: '',
        date_from: '',
        date_to: ''
      }
      showDialog.value = true
    }

    const closeDialog = () => {
      showDialog.value = false
    }

    const createReport = async () => {
      try {
        const response = await fetch('/api/reports/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newReport.value)
        })

        if (response.ok) {
          await fetchReports()
          closeDialog()
          alert('تم إنشاء التقرير بنجاح')
        }
      } catch (error) {
        console.error('خطأ في إنشاء التقرير:', error)
        alert('حدث خطأ أثناء إنشاء التقرير')
      }
    }

    const viewReport = (reportId) => {
      // Navigate to report details
      window.location.href = `/reports/${reportId}`
    }

    const exportReport = (reportId) => {
      selectedReportId.value = reportId
      showExportDialog.value = true
    }

    const closeExportDialog = () => {
      showExportDialog.value = false
      selectedReportId.value = null
    }

    const doExport = async (format) => {
      try {
        const response = await fetch(
          `/api/reports/${selectedReportId.value}/export?format=${format}`
        )

        if (response.ok) {
          const blob = await response.blob()
          const url = window.URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.href = url
          link.download = `report.${format}`
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
        }
      } catch (error) {
        console.error('خطأ في التصدير:', error)
      } finally {
        closeExportDialog()
      }
    }

    const deleteReport = async (reportId) => {
      if (!confirm('هل تريد حذف هذا التقرير؟')) return

      try {
        const response = await fetch(`/api/reports/${reportId}`, {
          method: 'DELETE'
        })

        if (response.ok) {
          await fetchReports()
          alert('تم حذف التقرير بنجاح')
        }
      } catch (error) {
        console.error('خطأ في الحذف:', error)
      }
    }

    const getReportIcon = (type) => {
      const icons = {
        student_progress: '📚',
        sales_performance: '💹',
        financial_summary: '💰',
        attendance: '📋'
      }
      return icons[type] || '📊'
    }

    const formatDate = (dateString) => {
      return new Date(dateString).toLocaleDateString('ar-SA')
    }

    onMounted(fetchReports)

    return {
      reports,
      loading,
      showDialog,
      showExportDialog,
      newReport,
      fetchReports,
      openNewReportDialog,
      closeDialog,
      createReport,
      viewReport,
      exportReport,
      doExport,
      deleteReport,
      getReportIcon,
      formatDate,
      closeExportDialog
    }
  }
}
</script>

<style scoped>
.smart-reports-container {
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

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.reports-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 1.5rem;
}

.report-card {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  transition: transform 0.2s, box-shadow 0.2s;
}

.report-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

.report-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
}

.report-title {
  display: flex;
  gap: 1rem;
  flex: 1;
}

.report-icon {
  font-size: 2rem;
}

.report-title h3 {
  margin: 0;
  color: #333;
}

.report-type {
  margin: 0.25rem 0 0 0;
  color: #999;
  font-size: 0.85rem;
}

.report-actions {
  display: flex;
  gap: 0.5rem;
}

.action-btn {
  background: none;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
  padding: 0.25rem;
  transition: transform 0.2s;
}

.action-btn:hover {
  transform: scale(1.2);
}

.report-meta {
  display: flex;
  justify-content: space-between;
  font-size: 0.9rem;
  color: #666;
  padding-top: 1rem;
  border-top: 1px solid #eee;
}

.meta-item {
  display: flex;
  gap: 0.5rem;
}

.meta-label {
  font-weight: 500;
}

.status-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 500;
}

.status-completed {
  background-color: #d4edda;
  color: #155724;
}

.status-pending {
  background-color: #fff3cd;
  color: #856404;
}

.status-failed {
  background-color: #f8d7da;
  color: #721c24;
}

/* Dialog */
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.dialog {
  background: white;
  border-radius: 8px;
  padding: 2rem;
  max-width: 500px;
  width: 90%;
  box-shadow: 0 4px 20px rgba(0,0,0,0.3);
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.dialog-header h2 {
  margin: 0;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #666;
}

.form {
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

.form-group input,
.form-group select {
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
}

.form-actions {
  display: flex;
  gap: 1rem;
  margin-top: 1rem;
}

.btn-primary, .btn-secondary {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
}

.btn-primary {
  background-color: #007bff;
  color: white;
  flex: 1;
}

.btn-secondary {
  background-color: #6c757d;
  color: white;
  flex: 1;
}

.btn-primary:hover {
  background-color: #0056b3;
}

.btn-secondary:hover {
  background-color: #545b62;
}

.export-options {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.export-btn {
  padding: 1rem;
  border: 2px solid #007bff;
  background: white;
  color: #007bff;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
}

.export-btn:hover {
  background-color: #007bff;
  color: white;
}

.loading {
  text-align: center;
  padding: 2rem;
  color: #666;
}
</style>
