class IntegrationManager {
    constructor() {
        this.token = localStorage.getItem('token');
        this.currentPage = 1;
        this.pageSize = 10;
        this.init();
    }

    init() {
        this.loadDashboardStats();
        this.loadMessages();
        this.loadTemplates();
        this.loadSystems();
        this.loadPaymentProviders();
        this.loadTransactions();
        this.loadInsuranceProviders();
        this.loadClaims();
        this.loadSyncLogs();
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Send Message Form
        $('#sendMessageForm').on('submit', (e) => {
            e.preventDefault();
            this.sendMessage();
        });

        // Template Form
        $('#templateForm').on('submit', (e) => {
            e.preventDefault();
            this.saveTemplate();
        });

        // System Form
        $('#systemForm').on('submit', (e) => {
            e.preventDefault();
            this.saveSystem();
        });

        // Tab change events
        $('button[data-bs-toggle="tab"]').on('shown.bs.tab', (e) => {
            const target = $(e.target).attr('data-bs-target');
            this.handleTabChange(target);
        });
    }

    async loadDashboardStats() {
        try {
            const response = await fetch('/api/integration/dashboard', {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                $('#totalMessages').text(data.total_messages || 0);
                $('#activeSystems').text(data.active_systems || 0);
                $('#todaySyncs').text(data.today_syncs || 0);
                $('#todayPayments').text(data.today_payments || 0);
            }
        } catch (error) {
            console.error('Error loading dashboard stats:', error);
        }
    }

    async loadMessages() {
        try {
            const response = await fetch(`/api/communication/messages?page=${this.currentPage}&per_page=${this.pageSize}`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.renderMessages(data.messages || []);
            }
        } catch (error) {
            console.error('Error loading messages:', error);
            $('#messagesList').html('<div class="alert alert-danger">خطأ في تحميل الرسائل</div>');
        }
    }

    renderMessages(messages) {
        const container = $('#messagesList');
        container.removeClass('loading');
        
        if (messages.length === 0) {
            container.html('<div class="alert alert-info">لا توجد رسائل</div>');
            return;
        }

        let html = '';
        messages.forEach(message => {
            const statusBadge = this.getStatusBadge(message.status);
            const typeIcon = message.message_type === 'sms' ? 'fa-sms' : 'fa-envelope';
            
            html += `
                <div class="message-item">
                    <div class="d-flex justify-content-between align-items-start">
                        <div>
                            <h6><i class="fas ${typeIcon} me-2"></i>${message.subject || 'بدون موضوع'}</h6>
                            <p class="text-muted mb-1">${message.recipient}</p>
                            <p class="mb-2">${message.content.substring(0, 100)}${message.content.length > 100 ? '...' : ''}</p>
                            <small class="text-muted">
                                <i class="fas fa-clock me-1"></i>${this.formatDate(message.sent_at)}
                            </small>
                        </div>
                        <div>
                            ${statusBadge}
                        </div>
                    </div>
                </div>
            `;
        });

        container.html(html);
    }

    async loadTemplates() {
        try {
            const response = await fetch('/api/communication/templates', {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.renderTemplates(data.templates || []);
            }
        } catch (error) {
            console.error('Error loading templates:', error);
        }
    }

    renderTemplates(templates) {
        const container = $('#templatesList');
        
        if (templates.length === 0) {
            container.html('<div class="alert alert-info">لا توجد قوالب</div>');
            return;
        }

        let html = '';
        templates.forEach(template => {
            const typeIcon = template.message_type === 'sms' ? 'fa-sms' : 'fa-envelope';
            
            html += `
                <div class="template-item">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <h6><i class="fas ${typeIcon} me-2"></i>${template.name}</h6>
                            <small class="text-muted">${template.subject || 'بدون موضوع'}</small>
                        </div>
                        <div>
                            <button class="btn btn-sm btn-outline-primary" onclick="integrationManager.useTemplate(${template.id})">
                                <i class="fas fa-use"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-danger" onclick="integrationManager.deleteTemplate(${template.id})">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });

        container.html(html);
    }

    async loadSystems() {
        try {
            const response = await fetch('/api/integration/external-systems', {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.renderSystems(data.systems || []);
            }
        } catch (error) {
            console.error('Error loading systems:', error);
        }
    }

    renderSystems(systems) {
        const container = $('#systemsList');
        
        if (systems.length === 0) {
            container.html('<div class="alert alert-info">لا توجد أنظمة خارجية</div>');
            return;
        }

        let html = '';
        systems.forEach(system => {
            const statusBadge = system.is_active ? 
                '<span class="badge bg-success">نشط</span>' : 
                '<span class="badge bg-secondary">غير نشط</span>';
            
            const typeIcon = this.getSystemTypeIcon(system.system_type);
            
            html += `
                <div class="system-item">
                    <div class="d-flex justify-content-between align-items-start">
                        <div>
                            <h6><i class="fas ${typeIcon} me-2"></i>${system.name}</h6>
                            <p class="text-muted mb-1">${system.description || 'بدون وصف'}</p>
                            <small class="text-muted">
                                <i class="fas fa-link me-1"></i>${system.api_url || 'لا يوجد رابط'}
                            </small>
                        </div>
                        <div>
                            ${statusBadge}
                            <button class="btn btn-sm btn-outline-info ms-2" onclick="integrationManager.testConnection(${system.id})">
                                <i class="fas fa-plug"></i> اختبار
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });

        container.html(html);
    }

    async loadPaymentProviders() {
        try {
            const response = await fetch('/api/integration/payment-providers', {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.renderPaymentProviders(data.providers || []);
            }
        } catch (error) {
            console.error('Error loading payment providers:', error);
        }
    }

    renderPaymentProviders(providers) {
        const container = $('#paymentProvidersList');
        
        if (providers.length === 0) {
            container.html('<div class="alert alert-info">لا توجد مقدمي خدمة دفع</div>');
            return;
        }

        let html = '';
        providers.forEach(provider => {
            const statusBadge = provider.is_active ? 
                '<span class="badge bg-success">نشط</span>' : 
                '<span class="badge bg-secondary">غير نشط</span>';
            
            html += `
                <div class="card mb-2">
                    <div class="card-body p-3">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <h6 class="mb-1">${provider.name}</h6>
                                <small class="text-muted">${provider.provider_type}</small>
                            </div>
                            <div>
                                ${statusBadge}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });

        container.html(html);
    }

    async loadTransactions() {
        try {
            const response = await fetch('/api/integration/transactions?limit=5', {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.renderTransactions(data.transactions || []);
            }
        } catch (error) {
            console.error('Error loading transactions:', error);
        }
    }

    renderTransactions(transactions) {
        const container = $('#transactionsList');
        
        if (transactions.length === 0) {
            container.html('<div class="alert alert-info">لا توجد معاملات</div>');
            return;
        }

        let html = '';
        transactions.forEach(transaction => {
            const statusBadge = this.getTransactionStatusBadge(transaction.status);
            
            html += `
                <div class="card mb-2">
                    <div class="card-body p-3">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <h6 class="mb-1">${transaction.amount} ريال</h6>
                                <small class="text-muted">${transaction.reference_id}</small>
                            </div>
                            <div>
                                ${statusBadge}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });

        container.html(html);
    }

    async loadInsuranceProviders() {
        try {
            const response = await fetch('/api/integration/insurance-providers', {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.renderInsuranceProviders(data.providers || []);
            }
        } catch (error) {
            console.error('Error loading insurance providers:', error);
        }
    }

    renderInsuranceProviders(providers) {
        const container = $('#insuranceProvidersList');
        
        if (providers.length === 0) {
            container.html('<div class="alert alert-info">لا توجد شركات تأمين</div>');
            return;
        }

        let html = '';
        providers.forEach(provider => {
            const statusBadge = provider.is_active ? 
                '<span class="badge bg-success">نشط</span>' : 
                '<span class="badge bg-secondary">غير نشط</span>';
            
            html += `
                <div class="card mb-2">
                    <div class="card-body p-3">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <h6 class="mb-1">${provider.name}</h6>
                                <small class="text-muted">${provider.contact_email || 'لا يوجد إيميل'}</small>
                            </div>
                            <div>
                                ${statusBadge}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });

        container.html(html);
    }

    async loadClaims() {
        try {
            const response = await fetch('/api/integration/insurance-claims?limit=5', {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.renderClaims(data.claims || []);
            }
        } catch (error) {
            console.error('Error loading claims:', error);
        }
    }

    renderClaims(claims) {
        const container = $('#claimsList');
        
        if (claims.length === 0) {
            container.html('<div class="alert alert-info">لا توجد مطالبات</div>');
            return;
        }

        let html = '';
        claims.forEach(claim => {
            const statusBadge = this.getClaimStatusBadge(claim.status);
            
            html += `
                <div class="card mb-2">
                    <div class="card-body p-3">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <h6 class="mb-1">${claim.claim_number}</h6>
                                <small class="text-muted">${claim.amount} ريال</small>
                            </div>
                            <div>
                                ${statusBadge}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });

        container.html(html);
    }

    async loadSyncLogs() {
        try {
            const response = await fetch('/api/integration/sync-logs?limit=10', {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.renderSyncLogs(data.logs || []);
            }
        } catch (error) {
            console.error('Error loading sync logs:', error);
        }
    }

    renderSyncLogs(logs) {
        const container = $('#syncLogsList');
        
        if (logs.length === 0) {
            container.html('<div class="alert alert-info">لا توجد سجلات مزامنة</div>');
            return;
        }

        let html = '<div class="table-responsive"><table class="table table-striped"><thead><tr><th>النظام</th><th>النوع</th><th>الحالة</th><th>التاريخ</th><th>الرسالة</th></tr></thead><tbody>';
        
        logs.forEach(log => {
            const statusBadge = log.status === 'success' ? 
                '<span class="badge bg-success">نجح</span>' : 
                '<span class="badge bg-danger">فشل</span>';
            
            html += `
                <tr>
                    <td>${log.system_name || 'غير محدد'}</td>
                    <td>${log.sync_type || 'غير محدد'}</td>
                    <td>${statusBadge}</td>
                    <td>${this.formatDate(log.sync_date)}</td>
                    <td>${log.message || 'لا توجد رسالة'}</td>
                </tr>
            `;
        });
        
        html += '</tbody></table></div>';
        container.html(html);
    }

    async sendMessage() {
        const messageData = {
            message_type: $('#messageType').val(),
            recipient: $('#recipient').val(),
            subject: $('#messageSubject').val(),
            content: $('#messageContent').val()
        };

        try {
            const response = await fetch('/api/communication/send-message', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(messageData)
            });

            if (response.ok) {
                $('#sendMessageModal').modal('hide');
                $('#sendMessageForm')[0].reset();
                this.showAlert('تم إرسال الرسالة بنجاح', 'success');
                this.loadMessages();
                this.loadDashboardStats();
            } else {
                const error = await response.json();
                this.showAlert(error.message || 'خطأ في إرسال الرسالة', 'danger');
            }
        } catch (error) {
            console.error('Error sending message:', error);
            this.showAlert('خطأ في إرسال الرسالة', 'danger');
        }
    }

    async saveTemplate() {
        const templateData = {
            name: $('#templateName').val(),
            message_type: $('#templateType').val(),
            subject: $('#templateSubject').val(),
            content: $('#templateContent').val()
        };

        try {
            const response = await fetch('/api/communication/templates', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(templateData)
            });

            if (response.ok) {
                $('#templateModal').modal('hide');
                $('#templateForm')[0].reset();
                this.showAlert('تم حفظ القالب بنجاح', 'success');
                this.loadTemplates();
            } else {
                const error = await response.json();
                this.showAlert(error.message || 'خطأ في حفظ القالب', 'danger');
            }
        } catch (error) {
            console.error('Error saving template:', error);
            this.showAlert('خطأ في حفظ القالب', 'danger');
        }
    }

    async saveSystem() {
        const systemData = {
            name: $('#systemName').val(),
            system_type: $('#systemType').val(),
            api_url: $('#systemApiUrl').val(),
            description: $('#systemDescription').val()
        };

        try {
            const response = await fetch('/api/integration/external-systems', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(systemData)
            });

            if (response.ok) {
                $('#systemModal').modal('hide');
                $('#systemForm')[0].reset();
                this.showAlert('تم حفظ النظام بنجاح', 'success');
                this.loadSystems();
                this.loadDashboardStats();
            } else {
                const error = await response.json();
                this.showAlert(error.message || 'خطأ في حفظ النظام', 'danger');
            }
        } catch (error) {
            console.error('Error saving system:', error);
            this.showAlert('خطأ في حفظ النظام', 'danger');
        }
    }

    async testConnection(systemId) {
        try {
            const response = await fetch(`/api/integration/external-systems/${systemId}/test`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    this.showAlert('تم الاتصال بنجاح', 'success');
                } else {
                    this.showAlert('فشل في الاتصال: ' + result.message, 'warning');
                }
            } else {
                this.showAlert('خطأ في اختبار الاتصال', 'danger');
            }
        } catch (error) {
            console.error('Error testing connection:', error);
            this.showAlert('خطأ في اختبار الاتصال', 'danger');
        }
    }

    async useTemplate(templateId) {
        try {
            const response = await fetch(`/api/communication/templates/${templateId}`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const template = await response.json();
                $('#messageType').val(template.message_type);
                $('#messageSubject').val(template.subject);
                $('#messageContent').val(template.content);
                $('#sendMessageModal').modal('show');
            }
        } catch (error) {
            console.error('Error loading template:', error);
        }
    }

    async deleteTemplate(templateId) {
        if (!confirm('هل أنت متأكد من حذف هذا القالب؟')) return;

        try {
            const response = await fetch(`/api/communication/templates/${templateId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                this.showAlert('تم حذف القالب بنجاح', 'success');
                this.loadTemplates();
            } else {
                this.showAlert('خطأ في حذف القالب', 'danger');
            }
        } catch (error) {
            console.error('Error deleting template:', error);
            this.showAlert('خطأ في حذف القالب', 'danger');
        }
    }

    handleTabChange(target) {
        switch(target) {
            case '#communications':
                this.loadMessages();
                this.loadTemplates();
                break;
            case '#systems':
                this.loadSystems();
                break;
            case '#payments':
                this.loadPaymentProviders();
                this.loadTransactions();
                break;
            case '#insurance':
                this.loadInsuranceProviders();
                this.loadClaims();
                break;
            case '#logs':
                this.loadSyncLogs();
                break;
        }
    }

    getStatusBadge(status) {
        const badges = {
            'sent': '<span class="badge bg-success">مرسل</span>',
            'pending': '<span class="badge bg-warning">معلق</span>',
            'failed': '<span class="badge bg-danger">فشل</span>',
            'delivered': '<span class="badge bg-info">تم التسليم</span>'
        };
        return badges[status] || '<span class="badge bg-secondary">غير محدد</span>';
    }

    getSystemTypeIcon(type) {
        const icons = {
            'hospital': 'fa-hospital',
            'insurance': 'fa-shield-alt',
            'payment': 'fa-credit-card',
            'government': 'fa-building'
        };
        return icons[type] || 'fa-server';
    }

    getTransactionStatusBadge(status) {
        const badges = {
            'completed': '<span class="badge bg-success">مكتمل</span>',
            'pending': '<span class="badge bg-warning">معلق</span>',
            'failed': '<span class="badge bg-danger">فشل</span>',
            'cancelled': '<span class="badge bg-secondary">ملغي</span>'
        };
        return badges[status] || '<span class="badge bg-secondary">غير محدد</span>';
    }

    getClaimStatusBadge(status) {
        const badges = {
            'approved': '<span class="badge bg-success">موافق عليه</span>',
            'pending': '<span class="badge bg-warning">معلق</span>',
            'rejected': '<span class="badge bg-danger">مرفوض</span>',
            'processing': '<span class="badge bg-info">قيد المعالجة</span>'
        };
        return badges[status] || '<span class="badge bg-secondary">غير محدد</span>';
    }

    formatDate(dateString) {
        if (!dateString) return 'غير محدد';
        const date = new Date(dateString);
        return date.toLocaleDateString('ar-SA') + ' ' + date.toLocaleTimeString('ar-SA', {hour: '2-digit', minute: '2-digit'});
    }

    showAlert(message, type = 'info') {
        const alertHtml = `
            <div class="alert alert-${type} alert-dismissible fade show position-fixed" 
                 style="top: 20px; right: 20px; z-index: 9999; min-width: 300px;" role="alert">
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;
        $('body').append(alertHtml);
        
        setTimeout(() => {
            $('.alert').fadeOut();
        }, 5000);
    }
}

// Initialize the integration manager when document is ready
$(document).ready(function() {
    window.integrationManager = new IntegrationManager();
});
