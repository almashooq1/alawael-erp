class CommunicationsManager {
    constructor() {
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.currentTab = 'sms';
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadDashboardData();
        this.loadSMSMessages();
        this.setupCharacterCounter();
        this.setupTemplateChannelChange();
    }

    setupEventListeners() {
        // Form submissions
        document.getElementById('smsForm').addEventListener('submit', (e) => this.handleSMSSubmit(e));
        document.getElementById('emailForm').addEventListener('submit', (e) => this.handleEmailSubmit(e));
        document.getElementById('notificationForm').addEventListener('submit', (e) => this.handleNotificationSubmit(e));
        document.getElementById('callForm').addEventListener('submit', (e) => this.handleCallSubmit(e));
        document.getElementById('conferenceForm').addEventListener('submit', (e) => this.handleConferenceSubmit(e));
        document.getElementById('templateForm').addEventListener('submit', (e) => this.handleTemplateSubmit(e));

        // Tab changes
        document.querySelectorAll('[data-bs-toggle="tab"]').forEach(tab => {
            tab.addEventListener('shown.bs.tab', (e) => {
                this.currentTab = e.target.getAttribute('data-bs-target').replace('#', '');
                this.loadTabData(this.currentTab);
            });
        });

        // Filters
        document.getElementById('smsStatusFilter').addEventListener('change', () => this.loadSMSMessages());
    }

    setupCharacterCounter() {
        const smsMessage = document.getElementById('smsMessage');
        const charCount = document.getElementById('smsCharCount');
        
        smsMessage.addEventListener('input', () => {
            const count = smsMessage.value.length;
            charCount.textContent = count;
            charCount.className = count > 160 ? 'text-danger' : 'text-muted';
        });
    }

    setupTemplateChannelChange() {
        const channelType = document.getElementById('templateChannelType');
        const subjectDiv = document.getElementById('templateSubjectDiv');
        
        channelType.addEventListener('change', () => {
            if (channelType.value === 'email') {
                subjectDiv.style.display = 'block';
                document.getElementById('templateSubject').required = true;
            } else {
                subjectDiv.style.display = 'none';
                document.getElementById('templateSubject').required = false;
            }
        });
    }

    async loadDashboardData() {
        try {
            const response = await fetch('/api/communications/dashboard', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.updateStatistics(data.statistics);
            }
        } catch (error) {
            console.error('خطأ في تحميل بيانات لوحة التحكم:', error);
        }
    }

    updateStatistics(stats) {
        document.getElementById('totalMessages').textContent = stats.messages.total || 0;
        document.getElementById('totalCalls').textContent = stats.calls.total || 0;
        document.getElementById('totalConferences').textContent = stats.conferences.total || 0;
        document.getElementById('totalNotifications').textContent = stats.notifications.total || 0;
    }

    async loadTabData(tab) {
        switch (tab) {
            case 'sms':
                await this.loadSMSMessages();
                break;
            case 'email':
                await this.loadEmailMessages();
                break;
            case 'notifications':
                await this.loadNotifications();
                break;
            case 'calls':
                await this.loadCalls();
                break;
            case 'conferences':
                await this.loadConferences();
                break;
            case 'templates':
                await this.loadTemplates();
                break;
        }
    }

    async handleSMSSubmit(e) {
        e.preventDefault();
        this.showLoading(true);

        const formData = {
            recipient_phone: document.getElementById('smsPhone').value,
            recipient_name: document.getElementById('smsRecipientName').value,
            message: document.getElementById('smsMessage').value,
            priority: document.getElementById('smsPriority').value
        };

        try {
            const response = await fetch('/api/sms/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(formData)
            });

            const result = await response.json();
            
            if (result.success) {
                this.showAlert('تم إرسال الرسالة النصية بنجاح', 'success');
                document.getElementById('smsForm').reset();
                document.getElementById('smsCharCount').textContent = '0';
                await this.loadSMSMessages();
                await this.loadDashboardData();
            } else {
                this.showAlert(result.message || 'فشل في إرسال الرسالة', 'danger');
            }
        } catch (error) {
            this.showAlert('حدث خطأ في الإرسال', 'danger');
        } finally {
            this.showLoading(false);
        }
    }

    async handleEmailSubmit(e) {
        e.preventDefault();
        this.showLoading(true);

        const formData = {
            recipient_email: document.getElementById('emailAddress').value,
            recipient_name: document.getElementById('emailRecipientName').value,
            subject: document.getElementById('emailSubject').value,
            content: document.getElementById('emailContent').value,
            priority: document.getElementById('emailPriority').value
        };

        try {
            const response = await fetch('/api/email/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(formData)
            });

            const result = await response.json();
            
            if (result.success) {
                this.showAlert('تم إرسال البريد الإلكتروني بنجاح', 'success');
                document.getElementById('emailForm').reset();
                await this.loadEmailMessages();
                await this.loadDashboardData();
            } else {
                this.showAlert(result.message || 'فشل في إرسال البريد الإلكتروني', 'danger');
            }
        } catch (error) {
            this.showAlert('حدث خطأ في الإرسال', 'danger');
        } finally {
            this.showLoading(false);
        }
    }

    async handleNotificationSubmit(e) {
        e.preventDefault();
        this.showLoading(true);

        const formData = {
            title: document.getElementById('notificationTitle').value,
            body: document.getElementById('notificationBody').value,
            recipient_type: document.getElementById('notificationRecipientType').value,
            category: document.getElementById('notificationCategory').value
        };

        try {
            const response = await fetch('/api/notifications/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(formData)
            });

            const result = await response.json();
            
            if (result.success) {
                this.showAlert('تم إرسال الإشعار بنجاح', 'success');
                document.getElementById('notificationForm').reset();
                await this.loadNotifications();
                await this.loadDashboardData();
            } else {
                this.showAlert(result.message || 'فشل في إرسال الإشعار', 'danger');
            }
        } catch (error) {
            this.showAlert('حدث خطأ في الإرسال', 'danger');
        } finally {
            this.showLoading(false);
        }
    }

    async handleCallSubmit(e) {
        e.preventDefault();
        this.showLoading(true);

        const formData = {
            recipient_number: document.getElementById('callNumber').value,
            recipient_name: document.getElementById('callRecipientName').value,
            call_purpose: document.getElementById('callPurpose').value,
            is_recorded: document.getElementById('recordCall').checked
        };

        try {
            const response = await fetch('/api/calls/initiate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(formData)
            });

            const result = await response.json();
            
            if (result.success) {
                this.showAlert('تم بدء المكالمة بنجاح', 'success');
                document.getElementById('callForm').reset();
                await this.loadCalls();
                await this.loadDashboardData();
            } else {
                this.showAlert(result.message || 'فشل في بدء المكالمة', 'danger');
            }
        } catch (error) {
            this.showAlert('حدث خطأ في بدء المكالمة', 'danger');
        } finally {
            this.showLoading(false);
        }
    }

    async handleConferenceSubmit(e) {
        e.preventDefault();
        this.showLoading(true);

        const formData = {
            title: document.getElementById('conferenceTitle').value,
            description: document.getElementById('conferenceDescription').value,
            scheduled_start: document.getElementById('conferenceStart').value,
            scheduled_end: document.getElementById('conferenceEnd').value,
            max_participants: parseInt(document.getElementById('maxParticipants').value),
            is_recording_enabled: document.getElementById('enableRecording').checked
        };

        try {
            const response = await fetch('/api/conferences/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(formData)
            });

            const result = await response.json();
            
            if (result.success) {
                this.showAlert('تم إنشاء المؤتمر بنجاح', 'success');
                document.getElementById('conferenceForm').reset();
                await this.loadConferences();
                await this.loadDashboardData();
            } else {
                this.showAlert(result.message || 'فشل في إنشاء المؤتمر', 'danger');
            }
        } catch (error) {
            this.showAlert('حدث خطأ في إنشاء المؤتمر', 'danger');
        } finally {
            this.showLoading(false);
        }
    }

    async handleTemplateSubmit(e) {
        e.preventDefault();
        this.showLoading(true);

        const formData = {
            template_name: document.getElementById('templateName').value,
            channel_type: document.getElementById('templateChannelType').value,
            category: document.getElementById('templateCategory').value,
            subject: document.getElementById('templateSubject').value,
            content: document.getElementById('templateContent').value
        };

        try {
            const response = await fetch('/api/templates', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(formData)
            });

            const result = await response.json();
            
            if (result.success) {
                this.showAlert('تم إنشاء القالب بنجاح', 'success');
                document.getElementById('templateForm').reset();
                document.getElementById('templateSubjectDiv').style.display = 'none';
                await this.loadTemplates();
            } else {
                this.showAlert(result.message || 'فشل في إنشاء القالب', 'danger');
            }
        } catch (error) {
            this.showAlert('حدث خطأ في إنشاء القالب', 'danger');
        } finally {
            this.showLoading(false);
        }
    }

    async loadSMSMessages() {
        try {
            const status = document.getElementById('smsStatusFilter').value;
            const url = `/api/sms/messages?page=${this.currentPage}&per_page=${this.itemsPerPage}${status ? `&status=${status}` : ''}`;
            
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.renderSMSMessages(data.messages);
                this.renderPagination(data.pagination, 'smsPagination');
            }
        } catch (error) {
            console.error('خطأ في تحميل الرسائل النصية:', error);
        }
    }

    renderSMSMessages(messages) {
        const tbody = document.getElementById('smsMessagesTable');
        
        if (messages.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center">لا توجد رسائل</td></tr>';
            return;
        }

        tbody.innerHTML = messages.map(message => `
            <tr>
                <td>
                    <div>
                        <strong>${message.recipient_name || 'غير محدد'}</strong><br>
                        <small class="text-muted">${message.recipient_contact}</small>
                    </div>
                </td>
                <td>
                    <div class="text-truncate" style="max-width: 200px;" title="${message.content}">
                        ${message.content}
                    </div>
                </td>
                <td>
                    <span class="status-badge ${this.getStatusClass(message.status)}">
                        ${this.translateStatus(message.status)}
                    </span>
                </td>
                <td>
                    ${message.sent_at ? new Date(message.sent_at).toLocaleString('ar-SA') : 'لم يتم الإرسال'}
                </td>
                <td>
                    <button class="btn btn-sm btn-outline-primary btn-action" onclick="communicationsManager.viewMessage('${message.message_id}')">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    async loadEmailMessages() {
        // Similar implementation for email messages
        const tbody = document.getElementById('emailMessagesTable');
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">جاري تحميل رسائل البريد الإلكتروني...</td></tr>';
    }

    async loadNotifications() {
        // Similar implementation for notifications
        const tbody = document.getElementById('notificationsTable');
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">جاري تحميل الإشعارات...</td></tr>';
    }

    async loadCalls() {
        // Similar implementation for calls
        const tbody = document.getElementById('callsTable');
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">جاري تحميل المكالمات...</td></tr>';
    }

    async loadConferences() {
        // Similar implementation for conferences
        const tbody = document.getElementById('conferencesTable');
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">جاري تحميل المؤتمرات...</td></tr>';
    }

    async loadTemplates() {
        try {
            const response = await fetch('/api/templates', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.renderTemplates(data.templates);
            }
        } catch (error) {
            console.error('خطأ في تحميل القوالب:', error);
        }
    }

    renderTemplates(templates) {
        const tbody = document.getElementById('templatesTable');
        
        if (templates.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center">لا توجد قوالب</td></tr>';
            return;
        }

        tbody.innerHTML = templates.map(template => `
            <tr>
                <td>${template.template_name}</td>
                <td>
                    <span class="badge bg-primary">
                        ${this.translateChannelType(template.channel_type)}
                    </span>
                </td>
                <td>${this.translateCategory(template.category)}</td>
                <td>${template.usage_count || 0}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary btn-action" onclick="communicationsManager.editTemplate(${template.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger btn-action" onclick="communicationsManager.deleteTemplate(${template.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    renderPagination(pagination, containerId) {
        const container = document.getElementById(containerId);
        
        if (pagination.pages <= 1) {
            container.innerHTML = '';
            return;
        }

        let paginationHTML = '<ul class="pagination justify-content-center">';
        
        // Previous button
        paginationHTML += `
            <li class="page-item ${pagination.page === 1 ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="communicationsManager.changePage(${pagination.page - 1})">السابق</a>
            </li>
        `;
        
        // Page numbers
        for (let i = 1; i <= pagination.pages; i++) {
            paginationHTML += `
                <li class="page-item ${i === pagination.page ? 'active' : ''}">
                    <a class="page-link" href="#" onclick="communicationsManager.changePage(${i})">${i}</a>
                </li>
            `;
        }
        
        // Next button
        paginationHTML += `
            <li class="page-item ${pagination.page === pagination.pages ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="communicationsManager.changePage(${pagination.page + 1})">التالي</a>
            </li>
        `;
        
        paginationHTML += '</ul>';
        container.innerHTML = paginationHTML;
    }

    changePage(page) {
        this.currentPage = page;
        this.loadTabData(this.currentTab);
    }

    getStatusClass(status) {
        const statusClasses = {
            'sent': 'bg-success',
            'delivered': 'bg-success',
            'failed': 'bg-danger',
            'pending': 'bg-warning',
            'active': 'bg-primary',
            'completed': 'bg-success',
            'cancelled': 'bg-secondary'
        };
        return statusClasses[status] || 'bg-secondary';
    }

    translateStatus(status) {
        const translations = {
            'sent': 'مرسلة',
            'delivered': 'مستلمة',
            'failed': 'فاشلة',
            'pending': 'معلقة',
            'active': 'نشطة',
            'completed': 'مكتملة',
            'cancelled': 'ملغية',
            'ringing': 'يرن',
            'answered': 'مجابة'
        };
        return translations[status] || status;
    }

    translateChannelType(type) {
        const translations = {
            'text': 'رسائل نصية',
            'email': 'بريد إلكتروني',
            'push': 'إشعارات',
            'voice': 'مكالمات صوتية',
            'video': 'مؤتمرات فيديو'
        };
        return translations[type] || type;
    }

    translateCategory(category) {
        const translations = {
            'general': 'عام',
            'appointment': 'مواعيد',
            'reminder': 'تذكيرات',
            'welcome': 'ترحيب',
            'alert': 'تنبيه'
        };
        return translations[category] || category;
    }

    viewMessage(messageId) {
        // Implementation for viewing message details
        this.showAlert('عرض تفاصيل الرسالة: ' + messageId, 'info');
    }

    editTemplate(templateId) {
        // Implementation for editing template
        this.showAlert('تحرير القالب: ' + templateId, 'info');
    }

    deleteTemplate(templateId) {
        if (confirm('هل أنت متأكد من حذف هذا القالب؟')) {
            // Implementation for deleting template
            this.showAlert('تم حذف القالب', 'success');
        }
    }

    showLoading(show) {
        const spinner = document.getElementById('loadingSpinner');
        spinner.style.display = show ? 'block' : 'none';
    }

    showAlert(message, type = 'info') {
        // Create alert element
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
        alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        document.body.appendChild(alertDiv);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 5000);
    }

    refreshDashboard() {
        this.loadDashboardData();
        this.loadTabData(this.currentTab);
        this.showAlert('تم تحديث البيانات', 'success');
    }
}

// Initialize the communications manager when the page loads
let communicationsManager;
document.addEventListener('DOMContentLoaded', function() {
    communicationsManager = new CommunicationsManager();
});

// Global function for refresh button
function refreshDashboard() {
    if (communicationsManager) {
        communicationsManager.refreshDashboard();
    }
}
