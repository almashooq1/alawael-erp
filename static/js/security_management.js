class SecurityManager {
    constructor() {
        this.currentPage = 1;
        this.itemsPerPage = 20;
        this.init();
    }

    init() {
        this.loadDashboard();
        this.setupEventListeners();
        this.setupTabHandlers();
    }

    setupEventListeners() {
        // تحديث البيانات كل 5 دقائق
        setInterval(() => {
            this.loadDashboard();
        }, 300000);
    }

    setupTabHandlers() {
        const tabs = document.querySelectorAll('#securityTabs button[data-bs-toggle="pill"]');
        tabs.forEach(tab => {
            tab.addEventListener('shown.bs.tab', (event) => {
                const targetTab = event.target.getAttribute('data-bs-target');
                this.handleTabChange(targetTab);
            });
        });
    }

    handleTabChange(targetTab) {
        switch(targetTab) {
            case '#audit':
                this.loadAuditLogs();
                break;
            case '#incidents':
                this.loadSecurityIncidents();
                break;
            case '#alerts':
                this.loadSecurityAlerts();
                break;
            case '#backups':
                this.loadBackupData();
                break;
        }
    }

    showLoading() {
        document.querySelector('.loading-spinner').style.display = 'block';
    }

    hideLoading() {
        document.querySelector('.loading-spinner').style.display = 'none';
    }

    showAlert(message, type = 'info') {
        const alertHtml = `
            <div class="alert alert-${type} alert-dismissible fade show" role="alert">
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;
        
        const container = document.querySelector('.main-content');
        container.insertAdjacentHTML('afterbegin', alertHtml);
        
        setTimeout(() => {
            const alert = container.querySelector('.alert');
            if (alert) alert.remove();
        }, 5000);
    }

    async makeRequest(url, options = {}) {
        try {
            const token = localStorage.getItem('access_token');
            const defaultOptions = {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            };

            const response = await fetch(url, { ...defaultOptions, ...options });
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'حدث خطأ في الطلب');
            }

            return data;
        } catch (error) {
            console.error('Request error:', error);
            this.showAlert(error.message, 'danger');
            throw error;
        }
    }

    // ==================== Dashboard Functions ====================

    async loadDashboard() {
        try {
            this.showLoading();
            const data = await this.makeRequest('/api/security-dashboard');
            
            if (data.success) {
                this.updateStatistics(data.statistics);
            }
        } catch (error) {
            console.error('Error loading dashboard:', error);
        } finally {
            this.hideLoading();
        }
    }

    updateStatistics(stats) {
        // تحديث إحصائيات المستخدمين
        document.getElementById('activeUsers').textContent = stats.users.total;
        document.getElementById('mfaUsers').textContent = `${stats.users.mfa_enabled} (${stats.users.mfa_percentage}%)`;
        
        // تحديث إحصائيات الحوادث
        document.getElementById('openIncidents').textContent = stats.incidents.open;
        
        // تحديث إحصائيات التنبيهات
        document.getElementById('unacknowledgedAlerts').textContent = stats.alerts.unacknowledged;
    }

    // ==================== MFA Functions ====================

    async setupMFA() {
        try {
            const selectedMethod = document.querySelector('input[name="mfaMethod"]:checked').value;
            const requestData = { method_type: selectedMethod };
            
            // إضافة بيانات إضافية حسب نوع المصادقة
            if (selectedMethod === 'sms') {
                const phoneNumber = prompt('أدخل رقم الهاتف:');
                if (!phoneNumber) return;
                requestData.phone_number = phoneNumber;
            } else if (selectedMethod === 'email') {
                const email = prompt('أدخل البريد الإلكتروني:');
                if (!email) return;
                requestData.email = email;
            }

            this.showLoading();
            const data = await this.makeRequest('/api/mfa/setup', {
                method: 'POST',
                body: JSON.stringify(requestData)
            });

            if (data.success) {
                this.showMFASetupResult(data, selectedMethod);
                this.showAlert('تم إعداد المصادقة متعددة العوامل بنجاح', 'success');
            }
        } catch (error) {
            console.error('Error setting up MFA:', error);
        } finally {
            this.hideLoading();
        }
    }

    showMFASetupResult(data, method) {
        const resultContainer = document.getElementById('mfaSetupResult');
        
        if (method === 'totp' && data.qr_code) {
            const qrContainer = document.getElementById('qrCodeContainer');
            qrContainer.innerHTML = `<img src="${data.qr_code}" alt="QR Code" class="img-fluid">`;
            
            if (data.backup_codes) {
                const backupCodesContainer = document.getElementById('backupCodes');
                const codesList = document.getElementById('backupCodesList');
                
                codesList.innerHTML = data.backup_codes.map(code => 
                    `<code class="d-block mb-1">${code}</code>`
                ).join('');
                
                backupCodesContainer.style.display = 'block';
            }
        }
        
        resultContainer.style.display = 'block';
    }

    // ==================== Audit Logs Functions ====================

    async loadAuditLogs(page = 1) {
        try {
            this.showLoading();
            
            const dateFrom = document.getElementById('auditDateFrom')?.value || '';
            const dateTo = document.getElementById('auditDateTo')?.value || '';
            
            let url = `/api/audit-logs?page=${page}&per_page=${this.itemsPerPage}`;
            if (dateFrom) url += `&date_from=${dateFrom}`;
            if (dateTo) url += `&date_to=${dateTo}`;
            
            const data = await this.makeRequest(url);
            
            if (data.success) {
                this.renderAuditLogs(data.logs);
                this.renderPagination(data.pagination, 'auditPagination', 'loadAuditLogs');
            }
        } catch (error) {
            console.error('Error loading audit logs:', error);
        } finally {
            this.hideLoading();
        }
    }

    renderAuditLogs(logs) {
        const tbody = document.getElementById('auditLogsTable');
        
        if (logs.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center">لا توجد سجلات</td></tr>';
            return;
        }

        tbody.innerHTML = logs.map(log => `
            <tr class="${log.is_suspicious ? 'table-warning' : ''}">
                <td>${log.user_name}</td>
                <td>
                    <span class="badge bg-primary">${this.translateActionType(log.action_type)}</span>
                </td>
                <td>${log.resource_type || '-'}</td>
                <td>${log.action_description}</td>
                <td>
                    <small class="text-muted">${log.ip_address}</small>
                </td>
                <td>
                    <span class="badge bg-${this.getRiskLevelColor(log.risk_level)}">${this.translateRiskLevel(log.risk_level)}</span>
                </td>
                <td>
                    <small>${this.formatDateTime(log.created_at)}</small>
                </td>
            </tr>
        `).join('');
    }

    // ==================== Security Incidents Functions ====================

    async loadSecurityIncidents(page = 1) {
        try {
            this.showLoading();
            
            const data = await this.makeRequest(`/api/security-incidents?page=${page}&per_page=${this.itemsPerPage}`);
            
            if (data.success) {
                this.renderSecurityIncidents(data.incidents);
                this.renderPagination(data.pagination, 'incidentsPagination', 'loadSecurityIncidents');
            }
        } catch (error) {
            console.error('Error loading security incidents:', error);
        } finally {
            this.hideLoading();
        }
    }

    renderSecurityIncidents(incidents) {
        const tbody = document.getElementById('incidentsTable');
        
        if (incidents.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">لا توجد حوادث</td></tr>';
            return;
        }

        tbody.innerHTML = incidents.map(incident => `
            <tr>
                <td>
                    <span class="badge bg-info">${this.translateIncidentType(incident.incident_type)}</span>
                </td>
                <td>${incident.title}</td>
                <td>
                    <span class="badge bg-${this.getSeverityColor(incident.severity)}">${this.translateSeverity(incident.severity)}</span>
                </td>
                <td>
                    <span class="badge bg-${this.getStatusColor(incident.status)}">${this.translateStatus(incident.status)}</span>
                </td>
                <td>
                    <small>${this.formatDateTime(incident.detected_at)}</small>
                </td>
                <td>
                    <button class="btn btn-sm btn-outline-primary" onclick="securityManager.viewIncident(${incident.id})">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    async createIncident() {
        try {
            const form = document.getElementById('newIncidentForm');
            const formData = new FormData(form);
            const incidentData = Object.fromEntries(formData.entries());

            this.showLoading();
            const data = await this.makeRequest('/api/security-incidents', {
                method: 'POST',
                body: JSON.stringify(incidentData)
            });

            if (data.success) {
                this.showAlert('تم إنشاء حادث الأمان بنجاح', 'success');
                form.reset();
                const modal = bootstrap.Modal.getInstance(document.getElementById('newIncidentModal'));
                modal.hide();
                this.loadSecurityIncidents();
            }
        } catch (error) {
            console.error('Error creating incident:', error);
        } finally {
            this.hideLoading();
        }
    }

    // ==================== Security Alerts Functions ====================

    async loadSecurityAlerts(page = 1) {
        try {
            this.showLoading();
            
            const data = await this.makeRequest(`/api/security-alerts?page=${page}&per_page=${this.itemsPerPage}`);
            
            if (data.success) {
                this.renderSecurityAlerts(data.alerts);
                this.renderPagination(data.pagination, 'alertsPagination', 'loadSecurityAlerts');
            }
        } catch (error) {
            console.error('Error loading security alerts:', error);
        } finally {
            this.hideLoading();
        }
    }

    renderSecurityAlerts(alerts) {
        const container = document.getElementById('alertsList');
        
        if (alerts.length === 0) {
            container.innerHTML = '<div class="text-center text-muted">لا توجد تنبيهات</div>';
            return;
        }

        container.innerHTML = alerts.map(alert => `
            <div class="alert-item alert alert-${this.getSeverityColor(alert.severity)} ${alert.is_acknowledged ? 'opacity-50' : ''}">
                <div class="d-flex justify-content-between align-items-start">
                    <div>
                        <h6 class="mb-1">
                            <i class="fas fa-${this.getAlertIcon(alert.alert_type)}"></i>
                            ${alert.title}
                        </h6>
                        <p class="mb-1">${alert.message}</p>
                        <small class="text-muted">${this.formatDateTime(alert.created_at)}</small>
                    </div>
                    <div>
                        ${!alert.is_acknowledged ? `
                            <button class="btn btn-sm btn-outline-secondary" onclick="securityManager.acknowledgeAlert(${alert.id})">
                                <i class="fas fa-check"></i> تأكيد
                            </button>
                        ` : ''}
                        <span class="badge bg-${this.getSeverityColor(alert.severity)}">${this.translateSeverity(alert.severity)}</span>
                    </div>
                </div>
            </div>
        `).join('');
    }

    // ==================== Backup Functions ====================

    async loadBackupData() {
        try {
            this.showLoading();
            
            const [schedulesData, historyData] = await Promise.all([
                this.makeRequest('/api/backup-schedules'),
                this.makeRequest('/api/backup-history')
            ]);
            
            if (schedulesData.success) {
                this.renderBackupSchedules(schedulesData.schedules);
            }
            
            if (historyData.success) {
                this.renderBackupHistory(historyData.history);
            }
        } catch (error) {
            console.error('Error loading backup data:', error);
        } finally {
            this.hideLoading();
        }
    }

    renderBackupSchedules(schedules) {
        const container = document.getElementById('backupSchedules');
        
        if (schedules.length === 0) {
            container.innerHTML = '<div class="text-center text-muted">لا توجد جداول نسخ احتياطي</div>';
            return;
        }

        container.innerHTML = schedules.map(schedule => `
            <div class="card mb-3">
                <div class="card-body">
                    <h6 class="card-title">${schedule.name}</h6>
                    <p class="card-text">
                        <small class="text-muted">
                            النوع: ${this.translateBackupType(schedule.backup_type)} | 
                            التكرار: ${this.translateFrequency(schedule.frequency)} |
                            الوقت: ${schedule.schedule_time || 'غير محدد'}
                        </small>
                    </p>
                    <div class="d-flex justify-content-between align-items-center">
                        <small class="text-muted">
                            آخر تشغيل: ${schedule.last_run ? this.formatDateTime(schedule.last_run) : 'لم يتم التشغيل'}
                        </small>
                        <small class="text-success">
                            التشغيل التالي: ${schedule.next_run ? this.formatDateTime(schedule.next_run) : 'غير محدد'}
                        </small>
                    </div>
                </div>
            </div>
        `).join('');
    }

    renderBackupHistory(history) {
        const tbody = document.getElementById('backupHistoryTable');
        
        if (history.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" class="text-center">لا يوجد تاريخ</td></tr>';
            return;
        }

        tbody.innerHTML = history.map(backup => `
            <tr>
                <td>${backup.backup_name}</td>
                <td>
                    <span class="badge bg-${backup.status === 'completed' ? 'success' : backup.status === 'failed' ? 'danger' : 'warning'}">
                        ${this.translateBackupStatus(backup.status)}
                    </span>
                </td>
                <td>
                    <small>${this.formatDateTime(backup.start_time)}</small>
                </td>
            </tr>
        `).join('');
    }

    // ==================== Utility Functions ====================

    renderPagination(pagination, containerId, functionName) {
        const container = document.getElementById(containerId);
        
        if (pagination.pages <= 1) {
            container.innerHTML = '';
            return;
        }

        let paginationHtml = '<ul class="pagination justify-content-center">';
        
        // Previous button
        if (pagination.page > 1) {
            paginationHtml += `
                <li class="page-item">
                    <a class="page-link" href="#" onclick="securityManager.${functionName}(${pagination.page - 1})">السابق</a>
                </li>
            `;
        }
        
        // Page numbers
        for (let i = Math.max(1, pagination.page - 2); i <= Math.min(pagination.pages, pagination.page + 2); i++) {
            paginationHtml += `
                <li class="page-item ${i === pagination.page ? 'active' : ''}">
                    <a class="page-link" href="#" onclick="securityManager.${functionName}(${i})">${i}</a>
                </li>
            `;
        }
        
        // Next button
        if (pagination.page < pagination.pages) {
            paginationHtml += `
                <li class="page-item">
                    <a class="page-link" href="#" onclick="securityManager.${functionName}(${pagination.page + 1})">التالي</a>
                </li>
            `;
        }
        
        paginationHtml += '</ul>';
        container.innerHTML = paginationHtml;
    }

    formatDateTime(dateString) {
        const date = new Date(dateString);
        return date.toLocaleString('ar-SA', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    // Translation functions
    translateActionType(type) {
        const translations = {
            'login': 'تسجيل دخول',
            'logout': 'تسجيل خروج',
            'create': 'إنشاء',
            'update': 'تحديث',
            'delete': 'حذف',
            'view': 'عرض',
            'mfa_setup': 'إعداد MFA',
            'mfa_verify': 'تحقق MFA'
        };
        return translations[type] || type;
    }

    translateRiskLevel(level) {
        const translations = {
            'low': 'منخفض',
            'medium': 'متوسط',
            'high': 'عالي',
            'critical': 'حرج'
        };
        return translations[level] || level;
    }

    translateSeverity(severity) {
        return this.translateRiskLevel(severity);
    }

    translateStatus(status) {
        const translations = {
            'open': 'مفتوح',
            'investigating': 'قيد التحقيق',
            'resolved': 'محلول',
            'closed': 'مغلق'
        };
        return translations[status] || status;
    }

    translateIncidentType(type) {
        const translations = {
            'unauthorized_access': 'وصول غير مصرح',
            'data_breach': 'تسريب بيانات',
            'malware': 'برمجيات خبيثة',
            'phishing': 'تصيد إلكتروني',
            'ddos': 'هجوم حجب الخدمة',
            'other': 'أخرى'
        };
        return translations[type] || type;
    }

    translateBackupType(type) {
        const translations = {
            'full': 'كامل',
            'incremental': 'تزايدي',
            'differential': 'تفاضلي'
        };
        return translations[type] || type;
    }

    translateFrequency(frequency) {
        const translations = {
            'daily': 'يومي',
            'weekly': 'أسبوعي',
            'monthly': 'شهري'
        };
        return translations[frequency] || frequency;
    }

    translateBackupStatus(status) {
        const translations = {
            'completed': 'مكتمل',
            'failed': 'فشل',
            'running': 'قيد التشغيل'
        };
        return translations[status] || status;
    }

    getRiskLevelColor(level) {
        const colors = {
            'low': 'success',
            'medium': 'warning',
            'high': 'danger',
            'critical': 'dark'
        };
        return colors[level] || 'secondary';
    }

    getSeverityColor(severity) {
        return this.getRiskLevelColor(severity);
    }

    getStatusColor(status) {
        const colors = {
            'open': 'danger',
            'investigating': 'warning',
            'resolved': 'success',
            'closed': 'secondary'
        };
        return colors[status] || 'secondary';
    }

    getAlertIcon(type) {
        const icons = {
            'security_incident': 'exclamation-triangle',
            'login_failure': 'user-times',
            'suspicious_activity': 'eye',
            'system_alert': 'server'
        };
        return icons[type] || 'bell';
    }

    // Filter functions
    filterAuditLogs() {
        this.loadAuditLogs(1);
    }

    // Placeholder functions for future implementation
    viewIncident(id) {
        this.showAlert('عرض تفاصيل الحادث قيد التطوير', 'info');
    }

    acknowledgeAlert(id) {
        this.showAlert('تم تأكيد التنبيه', 'success');
        // Reload alerts to reflect the change
        this.loadSecurityAlerts();
    }
}

// Global functions
function refreshDashboard() {
    securityManager.loadDashboard();
}

function setupMFA() {
    securityManager.setupMFA();
}

function createIncident() {
    securityManager.createIncident();
}

// Initialize the security manager when the page loads
let securityManager;
document.addEventListener('DOMContentLoaded', function() {
    securityManager = new SecurityManager();
});
