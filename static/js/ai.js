/**
 * مدير الذكاء الاصطناعي
 */
class AIManager {
    constructor() {
        this.currentConversationId = null;
        this.conversations = [];
        this.recommendations = [];
        this.isTyping = false;
    }

    init() {
        console.log('تهيئة مدير الذكاء الاصطناعي...');
        this.loadStatistics();
        this.loadConversations();
        this.loadRecommendations();
        this.setupEventListeners();
    }

    setupEventListeners() {
        const recommendationsFilter = document.getElementById('recommendations-filter');
        if (recommendationsFilter) {
            recommendationsFilter.addEventListener('change', () => this.filterRecommendations());
        }

        const conversationType = document.getElementById('ai-conversation-type');
        if (conversationType) {
            conversationType.addEventListener('change', () => this.switchConversationType());
        }
    }

    async loadStatistics() {
        try {
            const response = await fetch('/api/ai/statistics', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            if (response.ok) {
                const stats = await response.json();
                this.updateStatistics(stats);
            }
        } catch (error) {
            console.error('خطأ في تحميل الإحصائيات:', error);
        }
    }

    updateStatistics(stats) {
        document.getElementById('ai-conversations-count').textContent = stats.conversations || 0;
        document.getElementById('ai-recommendations-count').textContent = stats.recommendations || 0;
        document.getElementById('ai-content-generated').textContent = stats.content_generated || 0;
        document.getElementById('ai-predictions-count').textContent = stats.predictions || 0;
    }

    async loadConversations() {
        try {
            const response = await fetch('/api/ai/conversations', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            if (response.ok) {
                this.conversations = await response.json();
                this.displayConversationHistory();
            }
        } catch (error) {
            console.error('خطأ في تحميل المحادثات:', error);
        }
    }

    displayConversationHistory() {
        const historyContainer = document.getElementById('ai-conversation-history');
        if (!historyContainer) return;

        if (this.conversations.length === 0) {
            historyContainer.innerHTML = `
                <div class="text-center text-muted p-3">
                    <i class="fas fa-history fa-2x mb-2"></i>
                    <p>لا توجد محادثات سابقة</p>
                </div>
            `;
            return;
        }

        const conversationsHTML = this.conversations.map(conv => `
            <div class="conversation-item p-2 mb-2 border rounded cursor-pointer ${conv.id === this.currentConversationId ? 'bg-primary text-white' : 'bg-light'}" 
                 onclick="aiManager.loadConversation(${conv.id})">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <h6 class="mb-1">${conv.title || 'محادثة جديدة'}</h6>
                        <small class="text-muted">${this.formatDate(conv.created_at)}</small>
                    </div>
                    <div>
                        <span class="badge ${conv.status === 'active' ? 'bg-success' : 'bg-secondary'}">${conv.status === 'active' ? 'نشط' : 'مكتمل'}</span>
                    </div>
                </div>
            </div>
        `).join('');

        historyContainer.innerHTML = conversationsHTML;
    }

    async sendMessage() {
        const messageInput = document.getElementById('ai-message-input');
        const conversationType = document.getElementById('ai-conversation-type').value;
        
        if (!messageInput || !messageInput.value.trim()) return;

        const message = messageInput.value.trim();
        messageInput.value = '';

        this.addMessageToChat(message, 'user');
        this.showTypingIndicator();

        try {
            if (!this.currentConversationId) {
                await this.createNewConversation(conversationType);
            }

            const response = await fetch('/api/ai/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    message: message,
                    conversation_id: this.currentConversationId,
                    conversation_type: conversationType
                })
            });

            if (response.ok) {
                const result = await response.json();
                this.hideTypingIndicator();
                this.addMessageToChat(result.response, 'ai');
                this.loadStatistics();
            } else {
                throw new Error('فشل في إرسال الرسالة');
            }
        } catch (error) {
            console.error('خطأ في إرسال الرسالة:', error);
            this.hideTypingIndicator();
            this.addMessageToChat('عذراً، حدث خطأ في إرسال الرسالة.', 'ai', true);
        }
    }

    async createNewConversation(type) {
        try {
            const response = await fetch('/api/ai/conversations', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    conversation_type: type,
                    title: `محادثة ${type === 'assistant' ? 'مساعد' : type} جديدة`
                })
            });

            if (response.ok) {
                const conversation = await response.json();
                this.currentConversationId = conversation.id;
                this.loadConversations();
            }
        } catch (error) {
            console.error('خطأ في إنشاء المحادثة:', error);
        }
    }

    addMessageToChat(message, senderType, isError = false) {
        const messagesContainer = document.getElementById('ai-chat-messages');
        if (!messagesContainer) return;

        const welcomeMessage = messagesContainer.querySelector('.text-center.text-muted');
        if (welcomeMessage) {
            welcomeMessage.remove();
        }

        const messageElement = document.createElement('div');
        messageElement.className = `message mb-3 ${senderType === 'user' ? 'text-end' : 'text-start'}`;
        
        const bgClass = isError ? 'bg-danger text-white' : 
                       senderType === 'user' ? 'bg-primary text-white' : 'bg-light';

        messageElement.innerHTML = `
            <div class="d-inline-block p-3 rounded ${bgClass}" style="max-width: 70%;">
                <div class="message-content">${message}</div>
                <small class="text-muted d-block mt-1">${this.formatTime(new Date())}</small>
            </div>
        `;

        messagesContainer.appendChild(messageElement);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    showTypingIndicator() {
        if (this.isTyping) return;
        
        this.isTyping = true;
        const messagesContainer = document.getElementById('ai-chat-messages');
        
        const typingElement = document.createElement('div');
        typingElement.id = 'typing-indicator';
        typingElement.className = 'message mb-3 text-start';
        typingElement.innerHTML = `
            <div class="d-inline-block p-3 rounded bg-light">
                <div class="typing-dots">جاري الكتابة...</div>
            </div>
        `;

        messagesContainer.appendChild(typingElement);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    hideTypingIndicator() {
        this.isTyping = false;
        const typingIndicator = document.getElementById('typing-indicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }

    async generateContent() {
        const contentType = document.getElementById('content-type').value;
        const subject = document.getElementById('content-subject').value;
        const grade = document.getElementById('content-grade').value;
        const prompt = document.getElementById('content-prompt').value;

        if (!contentType || !prompt) {
            showAlert('يرجى ملء جميع الحقول المطلوبة', 'warning');
            return;
        }

        const container = document.getElementById('generated-content');
        container.innerHTML = `
            <div class="text-center p-4">
                <div class="spinner-border text-primary"></div>
                <p class="mt-2">جاري توليد المحتوى...</p>
            </div>
        `;

        try {
            const response = await fetch('/api/ai/content/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    content_type: contentType,
                    subject: subject,
                    grade_level: grade,
                    prompt: prompt
                })
            });

            if (response.ok) {
                const result = await response.json();
                this.displayGeneratedContent(result);
                this.loadStatistics();
            }
        } catch (error) {
            console.error('خطأ في توليد المحتوى:', error);
            container.innerHTML = `
                <div class="text-center text-danger p-4">
                    <i class="fas fa-exclamation-triangle fa-3x mb-3"></i>
                    <p>حدث خطأ في توليد المحتوى</p>
                </div>
            `;
        }
    }

    displayGeneratedContent(content) {
        const container = document.getElementById('generated-content');
        container.innerHTML = `
            <div class="generated-content-item">
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <h6>${content.title}</h6>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary" onclick="aiManager.copyContent()">
                            <i class="fas fa-copy"></i> نسخ
                        </button>
                        <button class="btn btn-outline-success" onclick="aiManager.saveContent('${content.id}')">
                            <i class="fas fa-save"></i> حفظ
                        </button>
                    </div>
                </div>
                <div class="content-body border rounded p-3" style="white-space: pre-wrap;">${content.content}</div>
                <div class="mt-2">
                    <small class="text-muted">الجودة: ${content.quality_score}%</small>
                </div>
            </div>
        `;
    }

    async translateText() {
        const sourceText = document.getElementById('source-text').value;
        const sourceLang = document.getElementById('source-language').value;
        const targetLang = document.getElementById('target-language').value;

        if (!sourceText.trim()) {
            showAlert('يرجى إدخال النص المراد ترجمته', 'warning');
            return;
        }

        const translatedTextArea = document.getElementById('translated-text');
        translatedTextArea.value = 'جاري الترجمة...';

        try {
            const response = await fetch('/api/ai/translate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    text: sourceText,
                    source_language: sourceLang,
                    target_language: targetLang
                })
            });

            if (response.ok) {
                const result = await response.json();
                translatedTextArea.value = result.translated_text;
                
                const confidenceDiv = document.getElementById('translation-confidence');
                const confidenceScore = document.getElementById('confidence-score');
                confidenceScore.textContent = result.confidence;
                confidenceDiv.style.display = 'block';
            }
        } catch (error) {
            console.error('خطأ في الترجمة:', error);
            translatedTextArea.value = 'حدث خطأ في الترجمة';
        }
    }

    async copyTranslation() {
        const translatedText = document.getElementById('translated-text').value;
        if (translatedText) {
            try {
                await navigator.clipboard.writeText(translatedText);
                showAlert('تم نسخ الترجمة بنجاح', 'success');
            } catch (error) {
                showAlert('فشل في نسخ الترجمة', 'error');
            }
        }
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('ar-SA');
    }

    formatTime(date) {
        return date.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
    }

    getRecommendationTypeColor(type) {
        const colors = {
            'learning_path': 'primary',
            'intervention': 'warning',
            'activity': 'info',
            'skill': 'success'
        };
        return colors[type] || 'secondary';
    }

    getRecommendationTypeLabel(type) {
        const labels = {
            'learning_path': 'مسار تعليمي',
            'intervention': 'تدخل',
            'activity': 'نشاط',
            'skill': 'مهارة'
        };
        return labels[type] || type;
    }
}

// إنشاء مثيل مدير الذكاء الاصطناعي
const aiManager = new AIManager();
