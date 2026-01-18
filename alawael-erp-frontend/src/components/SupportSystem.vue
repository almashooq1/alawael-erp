<template>
  <div class="support-system-container">
    <!-- Header -->
    <div class="header">
      <h1>🎫 نظام الدعم الفني</h1>
      <p>إدارة تذاكر الدعم والإجابة على استفسارات العملاء</p>
    </div>

    <!-- Quick Stats -->
    <div class="stats-row">
      <div class="stat-card">
        <div class="icon">📋</div>
        <div class="stat">
          <span class="label">التذاكر المفتوحة</span>
          <span class="value">{{ ticketStats.open }}</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="icon">⏱️</div>
        <div class="stat">
          <span class="label">قيد التعامل</span>
          <span class="value">{{ ticketStats.pending }}</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="icon">✅</div>
        <div class="stat">
          <span class="label">المغلقة اليوم</span>
          <span class="value">{{ ticketStats.closed }}</span>
        </div>
      </div>
    </div>

    <!-- Tickets Section -->
    <div class="tickets-section">
      <div class="section-header">
        <h2>التذاكر</h2>
        <button @click="openNewTicketDialog" class="btn-primary">
          + تذكرة جديدة
        </button>
      </div>

      <div class="filters">
        <select v-model="filters.status" @change="fetchTickets">
          <option value="">جميع الحالات</option>
          <option value="open">مفتوحة</option>
          <option value="pending">قيد التعامل</option>
          <option value="closed">مغلقة</option>
        </select>
        <select v-model="filters.priority" @change="fetchTickets">
          <option value="">جميع الأولويات</option>
          <option value="high">عالية</option>
          <option value="medium">متوسطة</option>
          <option value="low">منخفضة</option>
        </select>
      </div>

      <div v-if="loading" class="loading">جاري التحميل...</div>

      <div v-else class="tickets-list">
        <div
          v-for="ticket in tickets"
          :key="ticket.id"
          class="ticket-card"
          :class="`priority-${ticket.priority}`"
          @click="selectTicket(ticket.id)"
        >
          <div class="ticket-header">
            <div class="ticket-id">#{ticket.ticket_number}</div>
            <div class="ticket-title">{{ ticket.title }}</div>
            <div class="ticket-status">
              <span class="badge" :class="`status-${ticket.status}`">
                {{ ticket.status }}
              </span>
            </div>
          </div>

          <div class="ticket-body">
            <p>{{ ticket.description.substring(0, 100) }}...</p>
          </div>

          <div class="ticket-footer">
            <span class="priority-badge">
              {{ ticket.priority === 'high' ? '🔴' : ticket.priority === 'medium' ? '🟡' : '🟢' }}
              {{ ticket.priority }}
            </span>
            <span class="time">{{ formatTime(ticket.created_at) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Knowledge Base Section -->
    <div class="kb-section">
      <h2>قاعدة المعرفة</h2>
      <div class="kb-search">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="ابحث في قاعدة المعرفة..."
          @input="searchKnowledge"
        />
      </div>

      <div v-if="knowledgeResults.length > 0" class="knowledge-list">
        <div v-for="article in knowledgeResults" :key="article.id" class="knowledge-card">
          <h3>{{ article.title }}</h3>
          <p>{{ article.content.substring(0, 150) }}...</p>
          <button @click="viewArticle(article.id)" class="btn-secondary">اقرأ المزيد</button>
        </div>
      </div>
    </div>

    <!-- New Ticket Dialog -->
    <div v-if="showNewTicketDialog" class="dialog-overlay" @click="closeNewTicketDialog">
      <div class="dialog" @click.stop>
        <div class="dialog-header">
          <h2>إنشاء تذكرة جديدة</h2>
          <button @click="closeNewTicketDialog" class="close-btn">✕</button>
        </div>

        <form @submit.prevent="createTicket" class="form">
          <div class="form-group">
            <label>العنوان:</label>
            <input v-model="newTicketForm.title" type="text" required />
          </div>

          <div class="form-group">
            <label>الوصف:</label>
            <textarea v-model="newTicketForm.description" rows="4" required></textarea>
          </div>

          <div class="form-group">
            <label>الأولوية:</label>
            <select v-model="newTicketForm.priority" required>
              <option value="low">منخفضة</option>
              <option value="medium">متوسطة</option>
              <option value="high">عالية</option>
            </select>
          </div>

          <div class="form-group">
            <label>الفئة:</label>
            <select v-model="newTicketForm.category" required>
              <option value="general">عام</option>
              <option value="technical">تقني</option>
              <option value="billing">فواتير</option>
            </select>
          </div>

          <div class="form-actions">
            <button type="button" @click="closeNewTicketDialog" class="btn-secondary">إلغاء</button>
            <button type="submit" class="btn-primary">إنشاء التذكرة</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Ticket Details Modal -->
    <div v-if="selectedTicketId && showTicketDetails" class="dialog-overlay" @click="closeTicketDetails">
      <div class="dialog large" @click.stop>
        <div class="dialog-header">
          <h2>تفاصيل التذكرة</h2>
          <button @click="closeTicketDetails" class="close-btn">✕</button>
        </div>

        <div v-if="selectedTicket" class="ticket-details">
          <div class="detail-row">
            <span class="label">الحالة:</span>
            <select v-model="selectedTicket.status" @change="updateTicketStatus">
              <option value="open">مفتوحة</option>
              <option value="pending">قيد التعامل</option>
              <option value="closed">مغلقة</option>
            </select>
          </div>

          <div class="detail-row">
            <span class="label">الموظف المسؤول:</span>
            <select v-model="selectedTicket.assigned_to">
              <option value="">لم يتم التعيين</option>
              <option value="agent1">محمد علي</option>
              <option value="agent2">فاطمة عبدالله</option>
              <option value="agent3">سارة خالد</option>
            </select>
          </div>

          <div class="messages-section">
            <h3>الرسائل</h3>
            <div class="messages-list">
              <div v-for="msg in selectedTicket.messages" :key="msg.id" class="message">
                <div class="message-header">
                  <span class="sender">{{ msg.sender_name }}</span>
                  <span class="time">{{ formatTime(msg.created_at) }}</span>
                </div>
                <div class="message-body">{{ msg.text }}</div>
              </div>
            </div>

            <div class="message-input">
              <textarea
                v-model="replyText"
                placeholder="اكتب ردك هنا..."
                rows="3"
              ></textarea>
              <button @click="sendReply" class="btn-primary">إرسال الرد</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'

export default {
  name: 'SupportSystem',
  setup() {
    const tickets = ref([])
    const selectedTicket = ref(null)
    const selectedTicketId = ref(null)
    const loading = ref(false)
    const showNewTicketDialog = ref(false)
    const showTicketDetails = ref(false)
    const searchQuery = ref('')
    const knowledgeResults = ref([])
    const replyText = ref('')

    const filters = ref({
      status: '',
      priority: ''
    })

    const newTicketForm = ref({
      title: '',
      description: '',
      priority: 'medium',
      category: 'general'
    })

    const ticketStats = ref({
      open: 0,
      pending: 0,
      closed: 0
    })

    const fetchTickets = async () => {
      loading.value = true
      try {
        const params = new URLSearchParams()
        if (filters.value.status) params.append('status', filters.value.status)
        if (filters.value.priority) params.append('priority', filters.value.priority)

        const response = await fetch(`/api/support/tickets?${params}`)
        const data = await response.json()
        tickets.value = data.tickets || []

        // Update stats
        updateStats()
      } catch (error) {
        console.error('خطأ في جلب التذاكر:', error)
      } finally {
        loading.value = false
      }
    }

    const updateStats = () => {
      ticketStats.value = {
        open: tickets.value.filter(t => t.status === 'open').length,
        pending: tickets.value.filter(t => t.status === 'pending').length,
        closed: tickets.value.filter(t => t.status === 'closed').length
      }
    }

    const openNewTicketDialog = () => {
      newTicketForm.value = {
        title: '',
        description: '',
        priority: 'medium',
        category: 'general'
      }
      showNewTicketDialog.value = true
    }

    const closeNewTicketDialog = () => {
      showNewTicketDialog.value = false
    }

    const createTicket = async () => {
      try {
        const response = await fetch('/api/support/tickets/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newTicketForm.value)
        })

        if (response.ok) {
          await fetchTickets()
          closeNewTicketDialog()
          alert('تم إنشاء التذكرة بنجاح')
        }
      } catch (error) {
        console.error('خطأ في الإنشاء:', error)
      }
    }

    const selectTicket = (ticketId) => {
      selectedTicketId.value = ticketId
      selectedTicket.value = tickets.value.find(t => t.id === ticketId)
      showTicketDetails.value = true
    }

    const closeTicketDetails = () => {
      showTicketDetails.value = false
      selectedTicketId.value = null
      selectedTicket.value = null
      replyText.value = ''
    }

    const updateTicketStatus = async () => {
      try {
        await fetch(`/api/support/tickets/${selectedTicket.value.id}/status`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: selectedTicket.value.status })
        })
        alert('تم تحديث الحالة بنجاح')
      } catch (error) {
        console.error('خطأ في التحديث:', error)
      }
    }

    const sendReply = async () => {
      if (!replyText.value.trim()) return

      try {
        await fetch(`/api/support/tickets/${selectedTicket.value.id}/message`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: replyText.value,
            user_id: 'current_user'
          })
        })

        replyText.value = ''
        alert('تم إرسال الرد بنجاح')
      } catch (error) {
        console.error('خطأ في الإرسال:', error)
      }
    }

    const searchKnowledge = async () => {
      if (!searchQuery.value.trim()) {
        knowledgeResults.value = []
        return
      }

      try {
        const response = await fetch(
          `/api/support/knowledge-base/search?q=${encodeURIComponent(searchQuery.value)}`
        )
        const data = await response.json()
        knowledgeResults.value = data.results || []
      } catch (error) {
        console.error('خطأ في البحث:', error)
      }
    }

    const viewArticle = (articleId) => {
      window.open(`/knowledge-base/${articleId}`, '_blank')
    }

    const formatTime = (dateString) => {
      const date = new Date(dateString)
      return date.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })
    }

    onMounted(fetchTickets)

    return {
      tickets,
      selectedTicket,
      selectedTicketId,
      loading,
      showNewTicketDialog,
      showTicketDetails,
      filters,
      newTicketForm,
      ticketStats,
      searchQuery,
      knowledgeResults,
      replyText,
      fetchTickets,
      openNewTicketDialog,
      closeNewTicketDialog,
      createTicket,
      selectTicket,
      closeTicketDetails,
      updateTicketStatus,
      sendReply,
      searchKnowledge,
      viewArticle,
      formatTime
    }
  }
}
</script>

<style scoped>
.support-system-container {
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

.stats-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.stat-card {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  display: flex;
  gap: 1rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.icon {
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

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.filters {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.filters select {
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.9rem;
}

.tickets-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1rem;
}

.ticket-card {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  border-right: 4px solid #007bff;
}

.ticket-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

.ticket-card.priority-high {
  border-right-color: #dc3545;
}

.ticket-card.priority-medium {
  border-right-color: #ffc107;
}

.ticket-card.priority-low {
  border-right-color: #28a745;
}

.ticket-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
  gap: 1rem;
}

.ticket-id {
  background: #f0f0f0;
  padding: 0.25rem 0.75rem;
  border-radius: 4px;
  font-weight: bold;
  color: #666;
}

.ticket-title {
  flex: 1;
  font-weight: 500;
  color: #333;
}

.ticket-status {
  white-space: nowrap;
}

.badge {
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
}

.status-open {
  background: #d1ecf1;
  color: #0c5460;
}

.status-pending {
  background: #fff3cd;
  color: #856404;
}

.status-closed {
  background: #d4edda;
  color: #155724;
}

.ticket-body {
  margin-bottom: 1rem;
  color: #666;
  font-size: 0.9rem;
  line-height: 1.5;
}

.ticket-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.85rem;
  color: #999;
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
  overflow-y: auto;
  max-height: 80vh;
}

.dialog.large {
  max-width: 700px;
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

.form, .ticket-details {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-group, .detail-row {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group label, .detail-row .label {
  font-weight: 500;
  color: #333;
}

.form-group input,
.form-group select,
.form-group textarea {
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

.messages-section {
  margin-top: 2rem;
  padding-top: 2rem;
  border-top: 1px solid #eee;
}

.messages-list {
  max-height: 300px;
  overflow-y: auto;
  margin-bottom: 1rem;
}

.message {
  background: #f9f9f9;
  padding: 1rem;
  border-radius: 4px;
  margin-bottom: 1rem;
}

.message-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
  font-size: 0.85rem;
}

.sender {
  font-weight: 500;
  color: #333;
}

.time {
  color: #999;
}

.message-body {
  color: #666;
}

.message-input textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-family: inherit;
  margin-bottom: 0.5rem;
}

.kb-section {
  background: white;
  border-radius: 8px;
  padding: 2rem;
  margin-top: 2rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.kb-search {
  margin: 1rem 0 1.5rem 0;
}

.kb-search input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
}

.knowledge-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1rem;
}

.knowledge-card {
  background: #f9f9f9;
  padding: 1.5rem;
  border-radius: 4px;
}

.knowledge-card h3 {
  margin: 0 0 0.5rem 0;
  color: #333;
}

.knowledge-card p {
  margin: 0 0 1rem 0;
  color: #666;
  font-size: 0.9rem;
}

.loading {
  text-align: center;
  padding: 2rem;
  color: #666;
}
</style>
