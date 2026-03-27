// نظام التواصل والإشعارات
class CommunicationsManager {
    constructor() {
        this.notifications = [];
        this.messages = [];
        this.init();
    }

    init() {
        this.loadNotifications();
        this.loadMessages();
        this.setupEventListeners();
    }

    setupEventListeners() {
        // إعداد مستمعي الأحداث
        document.addEventListener('DOMContentLoaded', () => {
            // تحديث تلقائي كل 30 ثانية
            setInterval(() => {
                if (document.getElementById('notifications').style.display !== 'none') {
                    this.loadNotifications();
                }
                if (document.getElementById('messages').style.display !== 'none') {
                    this.loadMessages();
                }
            }, 30000);
        });
    }

    // إدارة الإشعارات
    async loadNotifications() {
        try {
            const response = await fetch('/api/notifications', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                this.notifications = data.notifications;
                this.renderNotifications();
                this.updateNotificationStats();
            }
        } catch (error) {
            console.error('خطأ في تحميل الإشعارات:', error);
        }
    }

    renderNotifications() {
        const tbody = document.getElementById('notificationsTableBody');
        if (!tbody) return;

        tbody.innerHTML = '';

        this.notifications.forEach(notification => {
            const row = document.createElement('tr');
            row.className = notification.is_read ? '' : 'table-warning';
            
            row.innerHTML = `
                <td>
                    <div class="d-flex align-items-center">
                        <i class="fas fa-${this.getNotificationIcon(notification.notification_type)} me-2"></i>
                        <div>
                            <strong>${notification.title}</strong>
                            <br>
                            <small class="text-muted">${notification.message}</small>
                        </div>
                    </div>
                </td>
                <td>
                    <span class="badge bg-${this.getNotificationColor(notification.notification_type)}">
                        ${this.getNotificationTypeText(notification.notification_type)}
                    </span>
                </td>
                <td>
                    ${notification.is_read ? 
                        '<span class="badge bg-success">مقروءة</span>' : 
                        '<span class="badge bg-warning">غير مقروءة</span>'
                    }
                </td>
                <td>${new Date(notification.created_at).toLocaleString('ar-SA')}</td>
                <td>
                    <div class="btn-group btn-group-sm">
                        ${!notification.is_read ? 
                            `<button class="btn btn-outline-primary" onclick="communicationsManager.markAsRead(${notification.id})">
                                <i class="fas fa-check"></i>
                            </button>` : ''
                        }
                        <button class="btn btn-outline-info" onclick="communicationsManager.viewNotification(${notification.id})">
                            <i class="fas fa-eye"></i>
                        </button>
                    </div>
                </td>
            `;
            
            tbody.appendChild(row);
        });
    }

    updateNotificationStats() {
        const total = this.notifications.length;
        const unread = this.notifications.filter(n => !n.is_read).length;
        const read = total - unread;
        const today = this.notifications.filter(n => {
            const notificationDate = new Date(n.created_at).toDateString();
            const todayDate = new Date().toDateString();
            return notificationDate === todayDate;
        }).length;

        document.getElementById('totalNotifications').textContent = total;
        document.getElementById('unreadNotifications').textContent = unread;
        document.getElementById('readNotifications').textContent = read;
        document.getElementById('todayNotifications').textContent = today;
    }

    getNotificationIcon(type) {
        const icons = {
            'info': 'info-circle',
            'warning': 'exclamation-triangle',
            'success': 'check-circle',
            'error': 'times-circle'
        };
        return icons[type] || 'bell';
    }

    getNotificationColor(type) {
        const colors = {
            'info': 'info',
            'warning': 'warning',
            'success': 'success',
            'error': 'danger'
        };
        return colors[type] || 'secondary';
    }

    getNotificationTypeText(type) {
        const texts = {
            'info': 'معلومات',
            'warning': 'تحذير',
            'success': 'نجاح',
            'error': 'خطأ'
        };
        return texts[type] || 'عام';
    }

    async markAsRead(notificationId) {
        try {
            const response = await fetch(`/api/notifications/${notificationId}/read`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (response.ok) {
                this.loadNotifications();
                showAlert('تم تحديد الإشعار كمقروء', 'success');
            }
        } catch (error) {
            console.error('خطأ في تحديث الإشعار:', error);
            showAlert('حدث خطأ في تحديث الإشعار', 'error');
        }
    }

    viewNotification(notificationId) {
        const notification = this.notifications.find(n => n.id === notificationId);
        if (notification) {
            // عرض تفاصيل الإشعار في modal
            this.showNotificationModal(notification);
        }
    }

    showNotificationModal(notification) {
        // إنشاء modal لعرض تفاصيل الإشعار
        const modalHtml = `
            <div class="modal fade" id="notificationModal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">${notification.title}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <p>${notification.message}</p>
                            <hr>
                            <small class="text-muted">
                                النوع: ${this.getNotificationTypeText(notification.notification_type)}<br>
                                التاريخ: ${new Date(notification.created_at).toLocaleString('ar-SA')}
                            </small>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">إغلاق</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // إزالة modal سابق إن وجد
        const existingModal = document.getElementById('notificationModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // إضافة modal جديد
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        const modal = new bootstrap.Modal(document.getElementById('notificationModal'));
        modal.show();
    }

    // إدارة الرسائل
    async loadMessages() {
        try {
            const response = await fetch('/api/messages', {
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
        }
    }

    renderMessages() {
        this.renderInboxMessages();
        this.renderSentMessages();
    }

    renderInboxMessages() {
        const tbody = document.getElementById('inboxTableBody');
        if (!tbody) return;

        const inboxMessages = this.messages.filter(m => !m.is_sent);
        tbody.innerHTML = '';

        inboxMessages.forEach(message => {
            const row = document.createElement('tr');
            row.className = message.is_read ? '' : 'table-info';
            
            row.innerHTML = `
                <td>
                    <div class="d-flex align-items-center">
                        <div class="profile-placeholder me-2">
                            ${message.sender.username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <strong>${message.sender.username}</strong>
                        </div>
                    </div>
                </td>
                <td>
                    <strong>${message.subject}</strong>
                    ${!message.is_read ? '<i class="fas fa-circle text-primary ms-2" style="font-size: 8px;"></i>' : ''}
                </td>
                <td>
                    <span class="badge bg-${this.getPriorityColor(message.priority)}">
                        ${this.getPriorityText(message.priority)}
                    </span>
                </td>
                <td>${new Date(message.created_at).toLocaleString('ar-SA')}</td>
                <td>
                    ${message.is_read ? 
                        '<span class="badge bg-success">مقروءة</span>' : 
                        '<span class="badge bg-warning">غير مقروءة</span>'
                    }
                </td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary" onclick="communicationsManager.viewMessage(${message.id})">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-outline-success" onclick="communicationsManager.replyMessage(${message.id})">
                            <i class="fas fa-reply"></i>
                        </button>
                    </div>
                </td>
            `;
            
            tbody.appendChild(row);
        });
    }

    renderSentMessages() {
        const tbody = document.getElementById('sentTableBody');
        if (!tbody) return;

        const sentMessages = this.messages.filter(m => m.is_sent);
        tbody.innerHTML = '';

        sentMessages.forEach(message => {
            const row = document.createElement('tr');
            
            row.innerHTML = `
                <td>
                    <div class="d-flex align-items-center">
                        <div class="profile-placeholder me-2">
                            ${message.receiver.username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <strong>${message.receiver.username}</strong>
                        </div>
                    </div>
                </td>
                <td><strong>${message.subject}</strong></td>
                <td>
                    <span class="badge bg-${this.getPriorityColor(message.priority)}">
                        ${this.getPriorityText(message.priority)}
                    </span>
                </td>
                <td>${new Date(message.created_at).toLocaleString('ar-SA')}</td>
                <td>
                    ${message.is_read ? 
                        '<span class="badge bg-success">مقروءة</span>' : 
                        '<span class="badge bg-secondary">لم تقرأ بعد</span>'
                    }
                </td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary" onclick="communicationsManager.viewMessage(${message.id})">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-outline-danger" onclick="communicationsManager.deleteMessage(${message.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            
            tbody.appendChild(row);
        });
    }

    getPriorityColor(priority) {
        const colors = {
            'low': 'secondary',
            'normal': 'primary',
            'high': 'warning',
            'urgent': 'danger'
        };
        return colors[priority] || 'primary';
    }

    getPriorityText(priority) {
        const texts = {
            'low': 'منخفضة',
            'normal': 'عادية',
            'high': 'عالية',
            'urgent': 'عاجلة'
        };
        return texts[priority] || 'عادية';
    }

    async viewMessage(messageId) {
        try {
            const response = await fetch(`/api/messages/${messageId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (response.ok) {
                const message = await response.json();
                this.showMessageModal(message);
                // إعادة تحميل الرسائل لتحديث حالة القراءة
                this.loadMessages();
            }
        } catch (error) {
            console.error('خطأ في عرض الرسالة:', error);
        }
    }

    showMessageModal(message) {
        const modalHtml = `
            <div class="modal fade" id="messageModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">${message.subject}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="mb-3">
                                <strong>من:</strong> ${message.sender.username}<br>
                                <strong>إلى:</strong> ${message.receiver.username}<br>
                                <strong>التاريخ:</strong> ${new Date(message.created_at).toLocaleString('ar-SA')}<br>
                                <strong>الأولوية:</strong> 
                                <span class="badge bg-${this.getPriorityColor(message.priority)}">
                                    ${this.getPriorityText(message.priority)}
                                </span>
                            </div>
                            <hr>
                            <div class="message-content">
                                ${message.content.replace(/\n/g, '<br>')}
                            </div>
                            ${message.replies && message.replies.length > 0 ? `
                                <hr>
                                <h6>الردود:</h6>
                                ${message.replies.map(reply => `
                                    <div class="border rounded p-2 mb-2">
                                        <small class="text-muted">
                                            ${reply.sender.username} - ${new Date(reply.created_at).toLocaleString('ar-SA')}
                                        </small>
                                        <div class="mt-1">${reply.content.replace(/\n/g, '<br>')}</div>
                                    </div>
                                `).join('')}
                            ` : ''}
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-success" onclick="communicationsManager.replyMessage(${message.id})">
                                <i class="fas fa-reply me-2"></i>رد
                            </button>
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">إغلاق</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // إزالة modal سابق إن وجد
        const existingModal = document.getElementById('messageModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // إضافة modal جديد
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        const modal = new bootstrap.Modal(document.getElementById('messageModal'));
        modal.show();
    }

    replyMessage(messageId) {
        const message = this.messages.find(m => m.id === messageId);
        if (message) {
            // فتح modal الرد مع البيانات المملوءة مسبقاً
            this.showComposeModal({
                receiverId: message.sender.id,
                subject: `رد: ${message.subject}`,
                parentMessageId: messageId
            });
        }
    }

    showComposeModal(prefillData = {}) {
        // إنشاء modal لكتابة رسالة جديدة
        // سيتم تنفيذه لاحقاً
        console.log('فتح modal كتابة الرسالة', prefillData);
    }

    async deleteMessage(messageId) {
        if (confirm('هل أنت متأكد من حذف هذه الرسالة؟')) {
            try {
                const response = await fetch(`/api/messages/${messageId}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });
                
                if (response.ok) {
                    this.loadMessages();
                    showAlert('تم حذف الرسالة بنجاح', 'success');
                }
            } catch (error) {
                console.error('خطأ في حذف الرسالة:', error);
                showAlert('حدث خطأ في حذف الرسالة', 'error');
            }
        }
    }

    // فلترة الإشعارات
    filterNotifications() {
        const typeFilter = document.getElementById('notificationTypeFilter').value;
        const statusFilter = document.getElementById('notificationStatusFilter').value;
        const searchTerm = document.getElementById('notificationSearch').value.toLowerCase();

        let filteredNotifications = this.notifications;

        if (typeFilter) {
            filteredNotifications = filteredNotifications.filter(n => n.notification_type === typeFilter);
        }

        if (statusFilter !== '') {
            const isRead = statusFilter === 'true';
            filteredNotifications = filteredNotifications.filter(n => n.is_read === isRead);
        }

        if (searchTerm) {
            filteredNotifications = filteredNotifications.filter(n => 
                n.title.toLowerCase().includes(searchTerm) || 
                n.message.toLowerCase().includes(searchTerm)
            );
        }

        // حفظ النتائج المفلترة مؤقتاً
        const originalNotifications = this.notifications;
        this.notifications = filteredNotifications;
        this.renderNotifications();
        this.notifications = originalNotifications;
    }
}

// إنشاء مثيل عام
const communicationsManager = new CommunicationsManager();

// دوال مساعدة للتنقل
function showNotificationsSection() {
    hideAllSections();
    document.getElementById('notifications').style.display = 'block';
    communicationsManager.loadNotifications();
}

function showMessagesSection() {
    hideAllSections();
    document.getElementById('messages').style.display = 'block';
    communicationsManager.loadMessages();
}
