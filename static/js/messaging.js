// نظام إدارة المراسلة
const messagingManager = {
    currentThread: null,
    threads: [],
    messages: [],
    users: [],

    // تهيئة النظام
    init() {
        this.loadUsers();
        this.loadThreads();
        this.updateStats();
        this.setupEventListeners();
    },

    // إعداد مستمعي الأحداث
    setupEventListeners() {
        // البحث في المحادثات
        document.getElementById('search-threads').addEventListener('input', (e) => {
            this.searchThreads(e.target.value);
        });

        // فلاتر المحادثات
        document.getElementById('thread-type-filter').addEventListener('change', () => {
            this.filterThreads();
        });

        document.getElementById('priority-filter').addEventListener('change', () => {
            this.filterThreads();
        });
    },

    // تحميل المستخدمين
    async loadUsers() {
        try {
            const response = await fetch('/api/users', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                this.users = await response.json();
                this.populateUserSelects();
            }
        } catch (error) {
            console.error('خطأ في تحميل المستخدمين:', error);
        }
    },

    // ملء قوائم المستخدمين
    populateUserSelects() {
        const participantsSelect = document.getElementById('thread-participants');
        participantsSelect.innerHTML = '';

        this.users.forEach(user => {
            const option = document.createElement('option');
            option.value = user.id;
            option.textContent = `${user.full_name} (${user.username})`;
            participantsSelect.appendChild(option);
        });
    },

    // تحميل المحادثات
    async loadThreads(type = 'active') {
        try {
            const params = new URLSearchParams({
                archived: type === 'archived' ? 'true' : 'false'
            });

            const response = await fetch(`/api/message-threads?${params}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                this.threads = await response.json();
                this.renderThreads();
                this.updateStats();
            }
        } catch (error) {
            console.error('خطأ في تحميل المحادثات:', error);
            this.showError('فشل في تحميل المحادثات');
        }
    },

    // عرض المحادثات
    renderThreads() {
        const container = document.getElementById('threads-list');
        container.innerHTML = '';

        if (this.threads.length === 0) {
            container.innerHTML = `
                <div class="text-center p-4 text-muted">
                    <i class="fas fa-comments fa-2x mb-2"></i>
                    <p>لا توجد محادثات</p>
                </div>
            `;
            return;
        }

        this.threads.forEach(thread => {
            const threadElement = this.createThreadElement(thread);
            container.appendChild(threadElement);
        });
    },

    // إنشاء عنصر المحادثة
    createThreadElement(thread) {
        const div = document.createElement('div');
        div.className = `list-group-item list-group-item-action ${thread.unread_count > 0 ? 'border-start border-primary border-3' : ''}`;
        div.onclick = () => this.selectThread(thread.id);

        const priorityColor = {
            'urgent': 'danger',
            'high': 'warning',
            'normal': 'secondary',
            'low': 'info'
        }[thread.priority] || 'secondary';

        const lastMessageTime = thread.last_message ? 
            new Date(thread.last_message.sent_at).toLocaleString('ar-SA') : '';

        div.innerHTML = `
            <div class="d-flex w-100 justify-content-between">
                <div class="flex-grow-1">
                    <div class="d-flex align-items-center mb-1">
                        <h6 class="mb-0 me-2">${thread.subject}</h6>
                        <span class="badge bg-${priorityColor} badge-sm">${this.getPriorityText(thread.priority)}</span>
                        ${thread.is_group ? '<i class="fas fa-users ms-2 text-muted"></i>' : ''}
                    </div>
                    <p class="mb-1 text-muted small">${thread.last_message ? thread.last_message.content : 'لا توجد رسائل'}</p>
                    <small class="text-muted">
                        ${thread.participants.map(p => p.full_name).join(', ')}
                    </small>
                </div>
                <div class="text-end">
                    ${thread.unread_count > 0 ? `<span class="badge bg-primary rounded-pill">${thread.unread_count}</span>` : ''}
                    <small class="text-muted d-block">${lastMessageTime}</small>
                </div>
            </div>
        `;

        return div;
    },

    // اختيار محادثة
    async selectThread(threadId) {
        this.currentThread = this.threads.find(t => t.id === threadId);
        if (!this.currentThread) return;

        // تحديث واجهة المحادثة
        document.getElementById('chat-title').textContent = this.currentThread.subject;
        document.getElementById('chat-participants').textContent = 
            this.currentThread.participants.map(p => p.full_name).join(', ');
        
        document.getElementById('chat-header').style.display = 'flex';
        document.getElementById('message-input-area').style.display = 'block';
        document.getElementById('no-chat-selected').style.display = 'none';
        document.getElementById('messages-list').style.display = 'block';

        // تحميل الرسائل
        await this.loadMessages(threadId);

        // تحديث حالة المحادثة في القائمة
        document.querySelectorAll('#threads-list .list-group-item').forEach(item => {
            item.classList.remove('active');
        });
        event.target.closest('.list-group-item').classList.add('active');
    },

    // تحميل الرسائل
    async loadMessages(threadId) {
        try {
            const response = await fetch(`/api/message-threads/${threadId}/messages`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.messages = data.messages;
                this.renderMessages();
            }
        } catch (error) {
            console.error('خطأ في تحميل الرسائل:', error);
            this.showError('فشل في تحميل الرسائل');
        }
    },

    // عرض الرسائل
    renderMessages() {
        const container = document.getElementById('messages-list');
        container.innerHTML = '';

        if (this.messages.length === 0) {
            container.innerHTML = `
                <div class="text-center p-4 text-muted">
                    <p>لا توجد رسائل في هذه المحادثة</p>
                </div>
            `;
            return;
        }

        // عرض الرسائل من الأحدث للأقدم
        this.messages.reverse().forEach(message => {
            const messageElement = this.createMessageElement(message);
            container.appendChild(messageElement);
        });

        // التمرير للأسفل
        container.scrollTop = container.scrollHeight;
    },

    // إنشاء عنصر الرسالة
    createMessageElement(message) {
        const div = document.createElement('div');
        const isOwnMessage = message.sender.id === parseInt(localStorage.getItem('user_id'));
        
        div.className = `d-flex mb-3 ${isOwnMessage ? 'justify-content-end' : 'justify-content-start'}`;

        const messageTime = new Date(message.sent_at).toLocaleString('ar-SA');
        const editedText = message.is_edited ? ' (معدلة)' : '';

        div.innerHTML = `
            <div class="message-bubble ${isOwnMessage ? 'bg-primary text-white' : 'bg-light'}" style="max-width: 70%; padding: 10px; border-radius: 15px;">
                ${!isOwnMessage ? `<small class="fw-bold text-primary">${message.sender.full_name}</small><br>` : ''}
                <div class="message-content">${this.formatMessageContent(message.content)}</div>
                ${message.attachments && message.attachments.length > 0 ? this.renderAttachments(message.attachments) : ''}
                <small class="text-muted d-block mt-1">
                    ${messageTime}${editedText}
                    ${isOwnMessage ? (message.is_read ? '<i class="fas fa-check-double ms-1"></i>' : '<i class="fas fa-check ms-1"></i>') : ''}
                </small>
                ${isOwnMessage ? `
                    <div class="message-actions mt-1">
                        <button class="btn btn-sm btn-outline-light" onclick="messagingManager.editMessage(${message.id})" title="تعديل">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-light" onclick="messagingManager.deleteMessage(${message.id})" title="حذف">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                ` : ''}
            </div>
        `;

        return div;
    },

    // تنسيق محتوى الرسالة
    formatMessageContent(content) {
        // تحويل الروابط إلى روابط قابلة للنقر
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        return content.replace(urlRegex, '<a href="$1" target="_blank" class="text-decoration-underline">$1</a>');
    },

    // عرض المرفقات
    renderAttachments(attachments) {
        if (!attachments || attachments.length === 0) return '';

        let html = '<div class="attachments mt-2">';
        attachments.forEach(attachment => {
            html += `
                <div class="attachment-item d-inline-block me-2 mb-1">
                    <a href="${attachment.url}" target="_blank" class="btn btn-sm btn-outline-secondary">
                        <i class="fas fa-paperclip"></i> ${attachment.name}
                    </a>
                </div>
            `;
        });
        html += '</div>';
        return html;
    },

    // إرسال رسالة
    async sendMessage() {
        const input = document.getElementById('message-input');
        const content = input.value.trim();

        if (!content || !this.currentThread) return;

        try {
            const response = await fetch(`/api/message-threads/${this.currentThread.id}/messages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    content: content,
                    message_type: 'text'
                })
            });

            if (response.ok) {
                input.value = '';
                await this.loadMessages(this.currentThread.id);
                await this.loadThreads(); // تحديث قائمة المحادثات
            } else {
                this.showError('فشل في إرسال الرسالة');
            }
        } catch (error) {
            console.error('خطأ في إرسال الرسالة:', error);
            this.showError('فشل في إرسال الرسالة');
        }
    },

    // التعامل مع ضغط المفاتيح
    handleKeyPress(event) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            this.sendMessage();
        }
    },

    // عرض نافذة إنشاء محادثة جديدة
    showNewThreadModal() {
        const modal = new bootstrap.Modal(document.getElementById('newThreadModal'));
        modal.show();
    },

    // إنشاء محادثة جديدة
    async createThread() {
        const form = document.getElementById('newThreadForm');
        const formData = new FormData(form);

        const participants = Array.from(document.getElementById('thread-participants').selectedOptions)
            .map(option => parseInt(option.value));

        if (participants.length === 0) {
            this.showError('يجب اختيار مشارك واحد على الأقل');
            return;
        }

        try {
            const response = await fetch('/api/message-threads', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    subject: document.getElementById('thread-subject').value,
                    thread_type: document.getElementById('thread-type').value,
                    priority: document.getElementById('thread-priority').value,
                    participants: participants,
                    initial_message: document.getElementById('initial-message').value
                })
            });

            if (response.ok) {
                const modal = bootstrap.Modal.getInstance(document.getElementById('newThreadModal'));
                modal.hide();
                form.reset();
                await this.loadThreads();
                this.showSuccess('تم إنشاء المحادثة بنجاح');
            } else {
                this.showError('فشل في إنشاء المحادثة');
            }
        } catch (error) {
            console.error('خطأ في إنشاء المحادثة:', error);
            this.showError('فشل في إنشاء المحادثة');
        }
    },

    // فلترة المحادثات
    filterThreads() {
        const typeFilter = document.getElementById('thread-type-filter').value;
        const priorityFilter = document.getElementById('priority-filter').value;
        const searchTerm = document.getElementById('search-threads').value.toLowerCase();

        let filteredThreads = this.threads.filter(thread => {
            const matchesType = !typeFilter || thread.thread_type === typeFilter;
            const matchesPriority = !priorityFilter || thread.priority === priorityFilter;
            const matchesSearch = !searchTerm || 
                thread.subject.toLowerCase().includes(searchTerm) ||
                thread.participants.some(p => p.full_name.toLowerCase().includes(searchTerm));

            return matchesType && matchesPriority && matchesSearch;
        });

        this.renderFilteredThreads(filteredThreads);
    },

    // عرض المحادثات المفلترة
    renderFilteredThreads(threads) {
        const container = document.getElementById('threads-list');
        container.innerHTML = '';

        threads.forEach(thread => {
            const threadElement = this.createThreadElement(thread);
            container.appendChild(threadElement);
        });
    },

    // البحث في المحادثات
    searchThreads(searchTerm) {
        if (!searchTerm) {
            this.renderThreads();
            return;
        }

        const filteredThreads = this.threads.filter(thread =>
            thread.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
            thread.participants.some(p => p.full_name.toLowerCase().includes(searchTerm.toLowerCase()))
        );

        this.renderFilteredThreads(filteredThreads);
    },

    // تحديث الإحصائيات
    updateStats() {
        const totalThreads = this.threads.length;
        const unreadMessages = this.threads.reduce((sum, thread) => sum + thread.unread_count, 0);
        const groupThreads = this.threads.filter(thread => thread.is_group).length;
        const sentToday = 0; // يحتاج إلى API منفصل

        document.getElementById('total-threads').textContent = totalThreads;
        document.getElementById('unread-messages').textContent = unreadMessages;
        document.getElementById('group-threads').textContent = groupThreads;
        document.getElementById('sent-today').textContent = sentToday;
    },

    // الحصول على نص الأولوية
    getPriorityText(priority) {
        const priorities = {
            'urgent': 'عاجل',
            'high': 'عالية',
            'normal': 'عادية',
            'low': 'منخفضة'
        };
        return priorities[priority] || 'عادية';
    },

    // عرض رسالة نجاح
    showSuccess(message) {
        // يمكن استخدام مكتبة toast أو alert
        alert(message);
    },

    // عرض رسالة خطأ
    showError(message) {
        alert('خطأ: ' + message);
    },

    // تعديل رسالة
    async editMessage(messageId) {
        const newContent = prompt('أدخل النص الجديد:');
        if (!newContent) return;

        try {
            const response = await fetch(`/api/messages/${messageId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    content: newContent
                })
            });

            if (response.ok) {
                await this.loadMessages(this.currentThread.id);
                this.showSuccess('تم تعديل الرسالة بنجاح');
            } else {
                this.showError('فشل في تعديل الرسالة');
            }
        } catch (error) {
            console.error('خطأ في تعديل الرسالة:', error);
            this.showError('فشل في تعديل الرسالة');
        }
    },

    // حذف رسالة
    async deleteMessage(messageId) {
        if (!confirm('هل أنت متأكد من حذف هذه الرسالة؟')) return;

        try {
            const response = await fetch(`/api/messages/${messageId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                await this.loadMessages(this.currentThread.id);
                this.showSuccess('تم حذف الرسالة بنجاح');
            } else {
                this.showError('فشل في حذف الرسالة');
            }
        } catch (error) {
            console.error('خطأ في حذف الرسالة:', error);
            this.showError('فشل في حذف الرسالة');
        }
    },

    // عرض خيارات المرفقات
    showAttachmentOptions() {
        // يمكن تطوير هذه الوظيفة لاحقاً لدعم رفع الملفات
        alert('سيتم إضافة دعم المرفقات قريباً');
    },

    // عرض معلومات المحادثة
    showThreadInfo() {
        if (!this.currentThread) return;
        
        const modal = new bootstrap.Modal(document.getElementById('threadInfoModal'));
        const content = document.getElementById('thread-info-content');
        
        content.innerHTML = `
            <div class="mb-3">
                <strong>الموضوع:</strong> ${this.currentThread.subject}
            </div>
            <div class="mb-3">
                <strong>النوع:</strong> ${this.currentThread.is_group ? 'جماعية' : 'فردية'}
            </div>
            <div class="mb-3">
                <strong>الأولوية:</strong> ${this.getPriorityText(this.currentThread.priority)}
            </div>
            <div class="mb-3">
                <strong>المشاركون:</strong>
                <ul class="list-unstyled">
                    ${this.currentThread.participants.map(p => `<li>${p.full_name}</li>`).join('')}
                </ul>
            </div>
            <div class="mb-3">
                <strong>تاريخ الإنشاء:</strong> ${new Date(this.currentThread.created_at).toLocaleString('ar-SA')}
            </div>
        `;
        
        modal.show();
    },

    // أرشفة المحادثة
    async archiveThread() {
        if (!this.currentThread) return;
        
        if (!confirm('هل أنت متأكد من أرشفة هذه المحادثة؟')) return;

        // سيتم تطوير هذه الوظيفة لاحقاً
        alert('سيتم إضافة وظيفة الأرشفة قريباً');
    }
};

// تهيئة النظام عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('messaging-section')) {
        messagingManager.init();
    }
});

// CSS للرسائل
const messagingStyles = `
<style>
.message-bubble {
    position: relative;
    word-wrap: break-word;
}

.message-bubble .message-actions {
    opacity: 0;
    transition: opacity 0.2s;
}

.message-bubble:hover .message-actions {
    opacity: 1;
}

.message-bubble a {
    color: inherit;
}

.attachment-item a {
    text-decoration: none;
}

#threads-list .list-group-item {
    border-left: none;
    border-right: none;
    border-top: none;
}

#threads-list .list-group-item:last-child {
    border-bottom: none;
}

#threads-list .list-group-item.active {
    background-color: #e3f2fd;
    border-color: #2196f3;
}

#messages-container {
    background-color: #f8f9fa;
}

.message-bubble {
    box-shadow: 0 1px 2px rgba(0,0,0,0.1);
}
</style>
`;

// إضافة الأنماط إلى الصفحة
document.head.insertAdjacentHTML('beforeend', messagingStyles);
