/**
 * مدير المساعد الذكي المتقدم
 * نظام ERP مراكز الأوائل للتأهيل الشامل لذوي الاحتياجات الخاصة
 */

class IntelligentAssistantManager {
    constructor() {
        this.currentSessionId = null;
        this.currentConversationType = 'general';
        this.isTyping = false;
        this.currentRating = 0;
        this.charts = {};
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadDashboardStats();
        this.loadUserPreferences();
        this.setupCharts();
        this.showTab('chat');
    }

    setupEventListeners() {
        // تبديل التبويبات
        document.querySelectorAll('.nav-link[data-tab]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const tab = e.target.getAttribute('data-tab');
                this.showTab(tab);
            });
        });

        // أنواع المحادثة
        document.querySelectorAll('.conversation-type').forEach(type => {
            type.addEventListener('click', (e) => {
                this.selectConversationType(e.target.getAttribute('data-type'));
            });
        });

        // إرسال الرسالة
        document.getElementById('sendButton').addEventListener('click', () => {
            this.sendMessage();
        });

        document.getElementById('messageInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendMessage();
            }
        });

        // البحث في قاعدة المعرفة
        document.getElementById('knowledgeSearch').addEventListener('input', 
            this.debounce(() => this.searchKnowledge(), 500)
        );

        document.getElementById('knowledgeCategory').addEventListener('change', () => {
            this.searchKnowledge();
        });

        // إضافة معرفة جديدة
        document.getElementById('addKnowledgeBtn').addEventListener('click', () => {
            new bootstrap.Modal(document.getElementById('addKnowledgeModal')).show();
        });

        document.getElementById('saveKnowledgeBtn').addEventListener('click', () => {
            this.saveKnowledge();
        });

        // حفظ التفضيلات
        document.getElementById('preferencesForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.savePreferences();
        });

        // نظام التقييم
        document.querySelectorAll('.rating-star').forEach(star => {
            star.addEventListener('click', (e) => {
                this.setRating(parseInt(e.target.getAttribute('data-rating')));
            });
        });

        document.getElementById('submitFeedback').addEventListener('click', () => {
            this.submitFeedback();
        });
    }

    showTab(tabName) {
        // إخفاء جميع التبويبات
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
        });

        // إزالة الفئة النشطة من جميع الروابط
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });

        // إظهار التبويب المحدد
        document.getElementById(tabName + 'Tab').classList.add('active');
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // تحميل البيانات حسب التبويب
        switch(tabName) {
            case 'knowledge':
                this.loadKnowledgeBase();
                break;
            case 'analytics':
                this.loadAnalytics();
                break;
            case 'preferences':
                this.loadUserPreferences();
                break;
        }
    }

    selectConversationType(type) {
        // تحديث الواجهة
        document.querySelectorAll('.conversation-type').forEach(t => {
            t.classList.remove('active');
        });
        document.querySelector(`[data-type="${type}"]`).classList.add('active');

        this.currentConversationType = type;
        
        // بدء محادثة جديدة
        this.startNewConversation();
    }

    async startNewConversation() {
        try {
            const response = await this.makeRequest('/api/ai-assistant/start-conversation', {
                method: 'POST',
                body: JSON.stringify({
                    conversation_type: this.currentConversationType,
                    context_data: this.getContextData()
                })
            });

            if (response.success) {
                this.currentSessionId = response.session_id;
                this.clearChat();
                this.enableChat();
                this.loadQuickResponses();
            } else {
                this.showAlert('خطأ في بدء المحادثة: ' + response.message, 'error');
            }
        } catch (error) {
            this.showAlert('حدث خطأ في الاتصال', 'error');
        }
    }

    async sendMessage() {
        const messageInput = document.getElementById('messageInput');
        const message = messageInput.value.trim();

        if (!message || !this.currentSessionId) return;

        // إضافة رسالة المستخدم
        this.addMessage('user', message);
        messageInput.value = '';

        // إظهار مؤشر الكتابة
        this.showTypingIndicator();

        try {
            const response = await this.makeRequest('/api/ai-assistant/send-message', {
                method: 'POST',
                body: JSON.stringify({
                    session_id: this.currentSessionId,
                    message: message
                })
            });

            this.hideTypingIndicator();

            if (response.success) {
                this.addMessage('assistant', response.response.content, {
                    intent: response.response.intent,
                    confidence: response.response.confidence,
                    messageId: response.response.message_id
                });

                // إظهار الاقتراحات إن وجدت
                if (response.response.suggestions && response.response.suggestions.length > 0) {
                    this.showQuickResponses(response.response.suggestions);
                }
            } else {
                this.addMessage('assistant', 'عذراً، حدث خطأ في معالجة رسالتك. يرجى المحاولة مرة أخرى.');
            }
        } catch (error) {
            this.hideTypingIndicator();
            this.addMessage('assistant', 'عذراً، حدث خطأ في الاتصال. يرجى التحقق من الاتصال والمحاولة مرة أخرى.');
        }
    }

    addMessage(type, content, metadata = {}) {
        const chatContainer = document.getElementById('chatContainer');
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;

        const bubbleDiv = document.createElement('div');
        bubbleDiv.className = 'message-bubble';
        bubbleDiv.textContent = content;

        // إضافة معلومات إضافية للرسائل من المساعد
        if (type === 'assistant' && metadata.confidence !== undefined) {
            const metadataDiv = document.createElement('div');
            metadataDiv.className = 'message-metadata';
            
            const confidenceBadge = document.createElement('span');
            confidenceBadge.className = `confidence-badge ${this.getConfidenceClass(metadata.confidence)}`;
            confidenceBadge.textContent = `ثقة: ${Math.round(metadata.confidence * 100)}%`;
            
            metadataDiv.appendChild(confidenceBadge);
            
            if (metadata.intent) {
                metadataDiv.appendChild(document.createTextNode(`النية: ${this.translateIntent(metadata.intent)}`));
            }
            
            bubbleDiv.appendChild(metadataDiv);
        }

        messageDiv.appendChild(bubbleDiv);
        chatContainer.appendChild(messageDiv);

        // التمرير للأسفل
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    getConfidenceClass(confidence) {
        if (confidence >= 0.8) return 'confidence-high';
        if (confidence >= 0.5) return 'confidence-medium';
        return 'confidence-low';
    }

    translateIntent(intent) {
        const translations = {
            'greeting': 'تحية',
            'program_inquiry': 'استفسار عن البرامج',
            'progress_inquiry': 'استفسار عن التقدم',
            'appointment_inquiry': 'استفسار عن المواعيد',
            'general_info': 'معلومات عامة',
            'general': 'عام'
        };
        return translations[intent] || intent;
    }

    showTypingIndicator() {
        document.getElementById('typingIndicator').style.display = 'block';
        this.isTyping = true;
    }

    hideTypingIndicator() {
        document.getElementById('typingIndicator').style.display = 'none';
        this.isTyping = false;
    }

    clearChat() {
        const chatContainer = document.getElementById('chatContainer');
        chatContainer.innerHTML = '';
    }

    enableChat() {
        document.getElementById('messageInput').disabled = false;
        document.getElementById('sendButton').disabled = false;
        document.getElementById('messageInput').focus();
    }

    getContextData() {
        // يمكن إضافة بيانات السياق هنا حسب الحاجة
        return {
            page: 'intelligent_assistant',
            timestamp: new Date().toISOString()
        };
    }

    async loadQuickResponses() {
        try {
            const response = await this.makeRequest(`/api/ai-assistant/quick-responses?category=${this.currentConversationType}`);
            
            if (response.success) {
                this.showQuickResponses(response.responses);
            }
        } catch (error) {
            console.error('خطأ في تحميل الردود السريعة:', error);
        }
    }

    showQuickResponses(responses) {
        const container = document.getElementById('quickResponses');
        container.innerHTML = '';

        responses.forEach(response => {
            const btn = document.createElement('button');
            btn.className = 'quick-response-btn';
            btn.textContent = response;
            btn.addEventListener('click', () => {
                document.getElementById('messageInput').value = response;
                this.sendMessage();
            });
            container.appendChild(btn);
        });
    }

    async loadKnowledgeBase() {
        try {
            const search = document.getElementById('knowledgeSearch').value;
            const category = document.getElementById('knowledgeCategory').value;
            
            let url = '/api/ai-assistant/knowledge-base?';
            if (search) url += `search=${encodeURIComponent(search)}&`;
            if (category) url += `category=${category}&`;

            const response = await this.makeRequest(url);
            
            if (response.success) {
                this.displayKnowledgeBase(response.knowledge);
            }
        } catch (error) {
            this.showAlert('خطأ في تحميل قاعدة المعرفة', 'error');
        }
    }

    displayKnowledgeBase(knowledge) {
        const container = document.getElementById('knowledgeList');
        container.innerHTML = '';

        if (knowledge.length === 0) {
            container.innerHTML = '<div class="text-center text-muted">لا توجد نتائج</div>';
            return;
        }

        knowledge.forEach(item => {
            const card = document.createElement('div');
            card.className = 'knowledge-card';
            card.innerHTML = `
                <h6>${item.title}</h6>
                <p class="text-muted mb-2">${item.category} ${item.subcategory ? '- ' + item.subcategory : ''}</p>
                <p>${item.content.substring(0, 200)}${item.content.length > 200 ? '...' : ''}</p>
                <small class="text-muted">
                    <i class="fas fa-eye"></i> ${item.usage_count} مرة
                    ${item.keywords && item.keywords.length > 0 ? 
                        `<span class="ms-3"><i class="fas fa-tags"></i> ${item.keywords.join(', ')}</span>` : ''}
                </small>
            `;
            container.appendChild(card);
        });
    }

    searchKnowledge() {
        this.loadKnowledgeBase();
    }

    async saveKnowledge() {
        const form = document.getElementById('addKnowledgeForm');
        const formData = new FormData(form);
        
        const data = {
            category: formData.get('category'),
            subcategory: formData.get('subcategory'),
            title: formData.get('title'),
            content: formData.get('content'),
            keywords: formData.get('keywords') ? formData.get('keywords').split(',').map(k => k.trim()) : [],
            source_reference: formData.get('source_reference')
        };

        try {
            const response = await this.makeRequest('/api/ai-assistant/knowledge-base', {
                method: 'POST',
                body: JSON.stringify(data)
            });

            if (response.success) {
                this.showAlert('تم إضافة المعرفة بنجاح', 'success');
                bootstrap.Modal.getInstance(document.getElementById('addKnowledgeModal')).hide();
                form.reset();
                this.loadKnowledgeBase();
            } else {
                this.showAlert('خطأ في إضافة المعرفة: ' + response.message, 'error');
            }
        } catch (error) {
            this.showAlert('حدث خطأ في الحفظ', 'error');
        }
    }

    async loadUserPreferences() {
        try {
            const response = await this.makeRequest('/api/ai-assistant/user-preferences');
            
            if (response.success && response.preferences) {
                this.populatePreferencesForm(response.preferences);
            }
        } catch (error) {
            console.error('خطأ في تحميل التفضيلات:', error);
        }
    }

    populatePreferencesForm(preferences) {
        const form = document.getElementById('preferencesForm');
        
        // ملء الحقول
        form.querySelector('[name="preferred_language"]').value = preferences.preferred_language || 'ar';
        form.querySelector('[name="communication_style"]').value = preferences.communication_style || 'formal';
        form.querySelector('[name="response_length"]').value = preferences.response_length || 'medium';
        form.querySelector('[name="privacy_level"]').value = preferences.privacy_level || 'standard';
        form.querySelector('[name="learning_mode"]').checked = preferences.learning_mode !== false;

        // ملء المواضيع المفضلة
        const topics = preferences.topics_of_interest || [];
        form.querySelectorAll('[name="topics"]').forEach(checkbox => {
            checkbox.checked = topics.includes(checkbox.value);
        });
    }

    async savePreferences() {
        const form = document.getElementById('preferencesForm');
        const formData = new FormData(form);
        
        const topics = [];
        form.querySelectorAll('[name="topics"]:checked').forEach(checkbox => {
            topics.push(checkbox.value);
        });

        const data = {
            preferred_language: formData.get('preferred_language'),
            communication_style: formData.get('communication_style'),
            response_length: formData.get('response_length'),
            privacy_level: formData.get('privacy_level'),
            learning_mode: formData.get('learning_mode') === 'on',
            topics_of_interest: topics,
            notification_preferences: {},
            accessibility_settings: {}
        };

        try {
            const response = await this.makeRequest('/api/ai-assistant/user-preferences', {
                method: 'POST',
                body: JSON.stringify(data)
            });

            if (response.success) {
                this.showAlert('تم حفظ التفضيلات بنجاح', 'success');
            } else {
                this.showAlert('خطأ في حفظ التفضيلات: ' + response.message, 'error');
            }
        } catch (error) {
            this.showAlert('حدث خطأ في الحفظ', 'error');
        }
    }

    async loadDashboardStats() {
        try {
            const response = await this.makeRequest('/api/ai-assistant/dashboard');
            
            if (response.success) {
                this.updateDashboardStats(response.dashboard);
            }
        } catch (error) {
            console.error('خطأ في تحميل الإحصائيات:', error);
        }
    }

    updateDashboardStats(dashboard) {
        document.getElementById('totalConversations').textContent = dashboard.stats.total_conversations;
        document.getElementById('totalMessages').textContent = dashboard.stats.total_messages;
        document.getElementById('avgSatisfaction').textContent = dashboard.stats.avg_satisfaction.toFixed(1);
        document.getElementById('totalKnowledge').textContent = dashboard.stats.total_knowledge;
    }

    async loadAnalytics() {
        try {
            const response = await this.makeRequest('/api/ai-assistant/analytics?days=30');
            
            if (response.success) {
                this.updateAnalyticsCharts(response.analytics);
            }
        } catch (error) {
            console.error('خطأ في تحميل التحليلات:', error);
        }
    }

    setupCharts() {
        // رسم بياني للنوايا
        const intentCtx = document.getElementById('intentChart').getContext('2d');
        this.charts.intent = new Chart(intentCtx, {
            type: 'doughnut',
            data: {
                labels: [],
                datasets: [{
                    data: [],
                    backgroundColor: [
                        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF'
                    ]
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'توزيع النوايا'
                    }
                }
            }
        });

        // رسم بياني للاستخدام اليومي
        const usageCtx = document.getElementById('usageChart').getContext('2d');
        this.charts.usage = new Chart(usageCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'الرسائل اليومية',
                    data: [],
                    borderColor: '#36A2EB',
                    backgroundColor: 'rgba(54, 162, 235, 0.1)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'الاستخدام اليومي'
                    }
                }
            }
        });
    }

    updateAnalyticsCharts(analytics) {
        // تحديث رسم النوايا
        if (analytics.top_intents) {
            const intents = Object.keys(analytics.top_intents);
            const counts = Object.values(analytics.top_intents);
            
            this.charts.intent.data.labels = intents.map(intent => this.translateIntent(intent));
            this.charts.intent.data.datasets[0].data = counts;
            this.charts.intent.update();
        }

        // تحديث رسم الاستخدام اليومي
        if (analytics.daily_usage) {
            const dates = Object.keys(analytics.daily_usage).sort();
            const usage = dates.map(date => analytics.daily_usage[date]);
            
            this.charts.usage.data.labels = dates;
            this.charts.usage.data.datasets[0].data = usage;
            this.charts.usage.update();
        }

        // تحديث قائمة أكثر النوايا استخداماً
        this.updateTopIntentsList(analytics.top_intents);
    }

    updateTopIntentsList(topIntents) {
        const container = document.getElementById('topIntentsList');
        container.innerHTML = '';

        if (!topIntents) return;

        const sortedIntents = Object.entries(topIntents)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5);

        sortedIntents.forEach(([intent, count]) => {
            const item = document.createElement('div');
            item.className = 'd-flex justify-content-between align-items-center mb-2';
            item.innerHTML = `
                <span>${this.translateIntent(intent)}</span>
                <span class="badge bg-primary">${count}</span>
            `;
            container.appendChild(item);
        });
    }

    setRating(rating) {
        this.currentRating = rating;
        
        document.querySelectorAll('.rating-star').forEach((star, index) => {
            if (index < rating) {
                star.classList.add('active');
            } else {
                star.classList.remove('active');
            }
        });
    }

    async submitFeedback() {
        if (this.currentRating === 0) {
            this.showAlert('يرجى اختيار تقييم أولاً', 'warning');
            return;
        }

        const comment = document.getElementById('feedbackComment').value;

        try {
            const response = await this.makeRequest('/api/ai-assistant/feedback', {
                method: 'POST',
                body: JSON.stringify({
                    feedback_type: 'rating',
                    rating: this.currentRating,
                    comment: comment,
                    category: 'overall'
                })
            });

            if (response.success) {
                this.showAlert('تم إرسال التقييم بنجاح. شكراً لك!', 'success');
                document.getElementById('feedbackComment').value = '';
                this.setRating(0);
            } else {
                this.showAlert('خطأ في إرسال التقييم: ' + response.message, 'error');
            }
        } catch (error) {
            this.showAlert('حدث خطأ في الإرسال', 'error');
        }
    }

    // دوال مساعدة
    async makeRequest(url, options = {}) {
        const token = localStorage.getItem('access_token');
        
        const defaultOptions = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        };

        const response = await fetch(url, { ...defaultOptions, ...options });
        return await response.json();
    }

    showAlert(message, type = 'info') {
        // إنشاء تنبيه Bootstrap
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type === 'error' ? 'danger' : type} alert-dismissible fade show position-fixed`;
        alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        document.body.appendChild(alertDiv);
        
        // إزالة التنبيه تلقائياً بعد 5 ثوان
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.parentNode.removeChild(alertDiv);
            }
        }, 5000);
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
}

// تهيئة المدير عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    window.intelligentAssistantManager = new IntelligentAssistantManager();
});
