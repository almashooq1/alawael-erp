class AICommunicationsManager {
    constructor() {
        this.currentChatbotId = 1;
        this.confidenceThreshold = 0.7;
        this.charts = {};
        this.init();
    }

    init() {
        this.loadDashboardData();
        this.setupEventListeners();
        this.initializeCharts();
        this.loadKnowledgeBase();
    }

    setupEventListeners() {
        // Chat input enter key
        document.getElementById('chatInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendMessage();
            }
        });

        // Confidence threshold slider
        document.getElementById('confidenceThreshold').addEventListener('input', (e) => {
            this.confidenceThreshold = parseFloat(e.target.value);
            document.getElementById('confidenceValue').textContent = e.target.value;
        });

        // Chatbot selection
        document.getElementById('chatbotSelect').addEventListener('change', (e) => {
            this.currentChatbotId = parseInt(e.target.value);
            this.clearChat();
        });

        // Knowledge base search
        document.getElementById('knowledgeSearch').addEventListener('input', (e) => {
            this.searchKnowledgeBase(e.target.value);
        });

        // Analytics period change
        document.getElementById('analyticsPeriod').addEventListener('change', (e) => {
            this.loadAnalytics(parseInt(e.target.value));
        });
    }

    async loadDashboardData() {
        try {
            const response = await fetch('/api/ai/communications/dashboard', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.updateMetrics(data);
            }
        } catch (error) {
            console.error('Error loading dashboard data:', error);
            this.showAlert('خطأ في تحميل بيانات لوحة التحكم', 'danger');
        }
    }

    updateMetrics(data) {
        document.getElementById('totalConversations').textContent = data.total_conversations || 0;
        document.getElementById('avgResponseTime').textContent = (data.avg_response_time || 0).toFixed(1);
        document.getElementById('avgConfidence').textContent = Math.round((data.avg_confidence || 0) * 100) + '%';
        document.getElementById('humanIntervention').textContent = Math.round((data.human_intervention_rate || 0) * 100) + '%';
    }

    async sendMessage() {
        const input = document.getElementById('chatInput');
        const message = input.value.trim();
        
        if (!message) return;

        // Add user message to chat
        this.addMessageToChat(message, 'user');
        input.value = '';

        // Show typing indicator
        this.showTypingIndicator();

        try {
            const response = await fetch('/api/ai/communications/chatbot/message', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    chatbot_id: this.currentChatbotId,
                    message: message,
                    confidence_threshold: this.confidenceThreshold
                })
            });

            const data = await response.json();
            
            // Remove typing indicator
            this.hideTypingIndicator();

            if (response.ok) {
                this.addMessageToChat(data.response, 'bot', data.confidence);
                
                // Show confidence if below threshold
                if (data.confidence < this.confidenceThreshold) {
                    this.showLowConfidenceWarning(data.confidence);
                }
            } else {
                this.addMessageToChat('عذراً، حدث خطأ في معالجة رسالتك. يرجى المحاولة مرة أخرى.', 'bot');
            }
        } catch (error) {
            this.hideTypingIndicator();
            this.addMessageToChat('عذراً، لا يمكنني الاتصال بالخادم حالياً.', 'bot');
            console.error('Error sending message:', error);
        }
    }

    addMessageToChat(message, sender, confidence = null) {
        const chatMessages = document.getElementById('chatMessages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}`;

        const bubble = document.createElement('div');
        bubble.className = 'message-bubble';
        bubble.textContent = message;

        if (confidence !== null && sender === 'bot') {
            const confidenceSpan = document.createElement('small');
            confidenceSpan.className = 'text-muted d-block mt-1';
            confidenceSpan.textContent = `الثقة: ${Math.round(confidence * 100)}%`;
            bubble.appendChild(confidenceSpan);
        }

        messageDiv.appendChild(bubble);
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    showTypingIndicator() {
        const chatMessages = document.getElementById('chatMessages');
        const typingDiv = document.createElement('div');
        typingDiv.className = 'message bot typing-indicator';
        typingDiv.innerHTML = `
            <div class="message-bubble">
                <i class="fas fa-circle"></i>
                <i class="fas fa-circle"></i>
                <i class="fas fa-circle"></i>
                جاري الكتابة...
            </div>
        `;
        chatMessages.appendChild(typingDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    hideTypingIndicator() {
        const typingIndicator = document.querySelector('.typing-indicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }

    showLowConfidenceWarning(confidence) {
        this.showAlert(`تحذير: مستوى الثقة منخفض (${Math.round(confidence * 100)}%). قد تحتاج لتدخل بشري.`, 'warning');
    }

    clearChat() {
        const chatMessages = document.getElementById('chatMessages');
        chatMessages.innerHTML = `
            <div class="message bot">
                <div class="message-bubble">
                    مرحباً! أنا المساعد الذكي لمراكز الأوائل. كيف يمكنني مساعدتك اليوم؟
                </div>
            </div>
        `;
    }

    async analyzeSentiment() {
        const text = document.getElementById('sentimentText').value.trim();
        if (!text) {
            this.showAlert('يرجى إدخال نص لتحليل المشاعر', 'warning');
            return;
        }

        try {
            const response = await fetch('/api/ai/communications/sentiment/analyze', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ text: text })
            });

            const data = await response.json();

            if (response.ok) {
                this.displaySentimentResult(data);
                this.updateSentimentChart(data);
            } else {
                this.showAlert('خطأ في تحليل المشاعر', 'danger');
            }
        } catch (error) {
            console.error('Error analyzing sentiment:', error);
            this.showAlert('خطأ في الاتصال بالخادم', 'danger');
        }
    }

    displaySentimentResult(data) {
        const resultDiv = document.getElementById('sentimentResult');
        const sentimentClass = `sentiment-${data.sentiment}`;
        
        resultDiv.innerHTML = `
            <div class="alert alert-info">
                <h6>نتيجة التحليل:</h6>
                <p><strong>المشاعر:</strong> <span class="${sentimentClass} sentiment-indicator">${this.getSentimentLabel(data.sentiment)}</span></p>
                <p><strong>الثقة:</strong> ${Math.round(data.confidence * 100)}%</p>
                <p><strong>المشاعر:</strong> ${data.emotions.join(', ')}</p>
                ${data.keywords.length > 0 ? `<p><strong>الكلمات المفتاحية:</strong> ${data.keywords.join(', ')}</p>` : ''}
            </div>
        `;
    }

    getSentimentLabel(sentiment) {
        const labels = {
            'positive': 'إيجابي',
            'negative': 'سلبي',
            'neutral': 'محايد'
        };
        return labels[sentiment] || sentiment;
    }

    async suggestResponses() {
        const text = document.getElementById('responseText').value.trim();
        if (!text) {
            this.showAlert('يرجى إدخال رسالة للحصول على ردود مقترحة', 'warning');
            return;
        }

        try {
            const response = await fetch('/api/ai/communications/auto-response/suggest', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ message: text })
            });

            const data = await response.json();

            if (response.ok) {
                this.displaySuggestedResponses(data.suggestions);
            } else {
                this.showAlert('خطأ في اقتراح الردود', 'danger');
            }
        } catch (error) {
            console.error('Error suggesting responses:', error);
            this.showAlert('خطأ في الاتصال بالخادم', 'danger');
        }
    }

    displaySuggestedResponses(suggestions) {
        const container = document.getElementById('suggestedResponses');
        
        if (suggestions.length === 0) {
            container.innerHTML = '<p class="text-muted">لا توجد ردود مقترحة</p>';
            return;
        }

        container.innerHTML = suggestions.map(suggestion => `
            <div class="suggestion-card" onclick="this.selectResponse('${suggestion.response}')">
                <div class="d-flex justify-content-between align-items-start">
                    <div class="flex-grow-1">
                        <p class="mb-1">${suggestion.response}</p>
                        <small class="text-muted">الثقة: ${Math.round(suggestion.confidence * 100)}%</small>
                    </div>
                    <button class="btn btn-sm btn-outline-primary" onclick="event.stopPropagation(); this.copyResponse('${suggestion.response}')">
                        <i class="fas fa-copy"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }

    selectResponse(response) {
        navigator.clipboard.writeText(response).then(() => {
            this.showAlert('تم نسخ الرد إلى الحافظة', 'success');
        });
    }

    copyResponse(response) {
        navigator.clipboard.writeText(response).then(() => {
            this.showAlert('تم نسخ الرد إلى الحافظة', 'success');
        });
    }

    async classifyMessage() {
        const text = document.getElementById('classificationText').value.trim();
        if (!text) {
            this.showAlert('يرجى إدخال رسالة للتصنيف', 'warning');
            return;
        }

        try {
            const response = await fetch('/api/ai/communications/message/classify', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ message: text })
            });

            const data = await response.json();

            if (response.ok) {
                this.displayClassificationResult(data);
            } else {
                this.showAlert('خطأ في تصنيف الرسالة', 'danger');
            }
        } catch (error) {
            console.error('Error classifying message:', error);
            this.showAlert('خطأ في الاتصال بالخادم', 'danger');
        }
    }

    displayClassificationResult(data) {
        const resultDiv = document.getElementById('classificationResult');
        const priorityClass = `priority-${data.priority}`;
        
        resultDiv.innerHTML = `
            <div class="alert alert-info">
                <h6>نتيجة التصنيف:</h6>
                <p><strong>الفئة:</strong> ${data.category}</p>
                <p><strong>الأولوية:</strong> <span class="${priorityClass} priority-badge">${this.getPriorityLabel(data.priority)}</span></p>
                <p><strong>الثقة:</strong> ${Math.round(data.confidence * 100)}%</p>
                ${data.keywords.length > 0 ? `<p><strong>الكلمات المفتاحية:</strong> ${data.keywords.join(', ')}</p>` : ''}
                ${data.entities.length > 0 ? `<p><strong>الكيانات:</strong> ${data.entities.join(', ')}</p>` : ''}
            </div>
        `;
    }

    getPriorityLabel(priority) {
        const labels = {
            'urgent': 'عاجل',
            'high': 'عالي',
            'medium': 'متوسط',
            'low': 'منخفض'
        };
        return labels[priority] || priority;
    }

    async loadKnowledgeBase() {
        try {
            const response = await fetch('/api/ai/communications/knowledge-base', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            const data = await response.json();

            if (response.ok) {
                this.displayKnowledgeBase(data.knowledge_base);
            }
        } catch (error) {
            console.error('Error loading knowledge base:', error);
        }
    }

    displayKnowledgeBase(knowledgeBase) {
        const container = document.getElementById('knowledgeBase');
        
        container.innerHTML = knowledgeBase.map(item => `
            <div class="card mb-2">
                <div class="card-body p-3">
                    <h6 class="card-title">${item.question}</h6>
                    <p class="card-text small">${item.answer}</p>
                    <div class="d-flex justify-content-between align-items-center">
                        <small class="text-muted">الفئة: ${item.category}</small>
                        <small class="text-muted">الثقة: ${Math.round(item.confidence * 100)}%</small>
                    </div>
                </div>
            </div>
        `).join('');
    }

    searchKnowledgeBase(query) {
        if (!query.trim()) {
            this.loadKnowledgeBase();
            return;
        }

        // Simple client-side search - in production, this should be server-side
        const cards = document.querySelectorAll('#knowledgeBase .card');
        cards.forEach(card => {
            const text = card.textContent.toLowerCase();
            const visible = text.includes(query.toLowerCase());
            card.style.display = visible ? 'block' : 'none';
        });
    }

    async generateInsights() {
        const period = parseInt(document.getElementById('analyticsPeriod').value);
        
        try {
            const response = await fetch(`/api/ai/communications/analytics/insights?period=${period}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            const data = await response.json();

            if (response.ok) {
                this.displayInsights(data);
            } else {
                this.showAlert('خطأ في توليد الرؤى', 'danger');
            }
        } catch (error) {
            console.error('Error generating insights:', error);
            this.showAlert('خطأ في الاتصال بالخادم', 'danger');
        }
    }

    displayInsights(data) {
        const container = document.getElementById('analyticsInsights');
        
        container.innerHTML = `
            <div class="row">
                <div class="col-md-6">
                    <div class="card">
                        <div class="card-header">
                            <h6><i class="fas fa-chart-line"></i> الاتجاهات</h6>
                        </div>
                        <div class="card-body">
                            ${data.trends.map(trend => `
                                <div class="d-flex justify-content-between align-items-center mb-2">
                                    <span>${trend.metric}</span>
                                    <span class="badge ${trend.change > 0 ? 'bg-success' : 'bg-danger'}">
                                        ${trend.change > 0 ? '+' : ''}${trend.change}%
                                    </span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="card">
                        <div class="card-header">
                            <h6><i class="fas fa-lightbulb"></i> التوصيات</h6>
                        </div>
                        <div class="card-body">
                            ${data.recommendations.map(rec => `
                                <div class="alert alert-info py-2 mb-2">
                                    <small>${rec}</small>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    initializeCharts() {
        this.initSentimentChart();
        this.initPriorityChart();
        this.initMessagesChart();
        this.initPerformanceChart();
    }

    initSentimentChart() {
        const ctx = document.getElementById('sentimentChart').getContext('2d');
        this.charts.sentiment = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['إيجابي', 'محايد', 'سلبي'],
                datasets: [{
                    data: [45, 35, 20],
                    backgroundColor: ['#28a745', '#ffc107', '#dc3545']
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    initPriorityChart() {
        const ctx = document.getElementById('priorityChart').getContext('2d');
        this.charts.priority = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['عاجل', 'عالي', 'متوسط', 'منخفض'],
                datasets: [{
                    label: 'عدد الرسائل',
                    data: [12, 25, 45, 18],
                    backgroundColor: ['#dc3545', '#fd7e14', '#ffc107', '#28a745']
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    initMessagesChart() {
        const ctx = document.getElementById('messagesChart').getContext('2d');
        this.charts.messages = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'],
                datasets: [{
                    label: 'الرسائل الواردة',
                    data: [65, 59, 80, 81, 56, 55, 40],
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    fill: true
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    initPerformanceChart() {
        const ctx = document.getElementById('performanceChart').getContext('2d');
        this.charts.performance = new Chart(ctx, {
            type: 'radar',
            data: {
                labels: ['الدقة', 'السرعة', 'الثقة', 'رضا المستخدم', 'التغطية'],
                datasets: [{
                    label: 'الأداء الحالي',
                    data: [85, 92, 78, 88, 75],
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.2)',
                    pointBackgroundColor: '#667eea'
                }]
            },
            options: {
                responsive: true,
                scales: {
                    r: {
                        beginAtZero: true,
                        max: 100
                    }
                }
            }
        });
    }

    updateSentimentChart(data) {
        // Update sentiment chart with new data
        if (this.charts.sentiment) {
            // This would be implemented based on the actual data structure
            this.charts.sentiment.update();
        }
    }

    async loadAnalytics(period) {
        try {
            const response = await fetch(`/api/ai/communications/analytics/dashboard?period=${period}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            const data = await response.json();

            if (response.ok) {
                this.updateCharts(data);
            }
        } catch (error) {
            console.error('Error loading analytics:', error);
        }
    }

    updateCharts(data) {
        // Update all charts with new data
        // Implementation would depend on the actual data structure
    }

    showAlert(message, type = 'info') {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
        alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; max-width: 400px;';
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        document.body.appendChild(alertDiv);
        
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 5000);
    }
}

// Global functions
function refreshDashboard() {
    if (window.aiManager) {
        window.aiManager.loadDashboardData();
    }
}

function sendMessage() {
    if (window.aiManager) {
        window.aiManager.sendMessage();
    }
}

function analyzeSentiment() {
    if (window.aiManager) {
        window.aiManager.analyzeSentiment();
    }
}

function suggestResponses() {
    if (window.aiManager) {
        window.aiManager.suggestResponses();
    }
}

function classifyMessage() {
    if (window.aiManager) {
        window.aiManager.classifyMessage();
    }
}

function generateInsights() {
    if (window.aiManager) {
        window.aiManager.generateInsights();
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.aiManager = new AICommunicationsManager();
});
