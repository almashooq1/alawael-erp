/**
 * مدير نظام الأتمتة والرسائل المجدولة
 * Automation and Scheduled Messages Manager
 */

class AutomationManager {
    constructor() {
        this.currentPage = 1;
        this.perPage = 10;
        this.searchTimeout = null;
        this.token = localStorage.getItem('token');
    }

    /**
     * تهيئة المدير
     */
    init() {
        this.setupEventListeners();
        this.loadDashboardStats();
        this.loadWorkflows();
    }

    /**
     * إعداد مستمعي الأحداث
     */
    setupEventListeners() {
        // البحث في سير العمل
        document.getElementById('workflowSearch')?.addEventListener('input', (e) => {
            clearTimeout(this.searchTimeout);
            this.searchTimeout = setTimeout(() => {
                this.loadWorkflows();
            }, 500);
        });

        // فلاتر سير العمل
        document.getElementById('workflowStatusFilter')?.addEventListener('change', () => {
            this.loadWorkflows();
        });

        document.getElementById('workflowTriggerFilter')?.addEventListener('change', () => {
            this.loadWorkflows();
        });

        // فلاتر الرسائل
        document.getElementById('messageTypeFilter')?.addEventListener('change', () => {
            this.loadMessages();
        });

        document.getElementById('messageStatusFilter')?.addEventListener('change', () => {
            this.loadMessages();
        });

        // التبويبات
        document.querySelectorAll('#mainTabs button').forEach(tab => {
            tab.addEventListener('shown.bs.tab', (e) => {
                const target = e.target.getAttribute('data-bs-target');
                this.handleTabChange(target);
            });
        });
    }

    /**
     * التعامل مع تغيير التبويبات
     */
    handleTabChange(target) {
        switch(target) {
            case '#workflows':
                this.loadWorkflows();
                break;
            case '#messages':
                this.loadMessages();
                break;
            case '#templates':
                this.loadTemplates();
                break;
            case '#rules':
                this.loadRules();
                break;
            case '#logs':
                this.loadLogs();
                break;
        }
    }

    /**
     * تحميل إحصائيات لوحة التحكم
     */
    async loadDashboardStats() {
        try {
            this.showLoading();
            const response = await fetch('/api/automation/dashboard', {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) throw new Error('فشل في تحميل الإحصائيات');

            const data = await response.json();
            this.renderStats(data.stats);
            this.renderUpcomingMessages(data.upcoming_messages);
            this.renderRecentExecutions(data.recent_executions);

        } catch (error) {
            this.showAlert('خطأ في تحميل الإحصائيات: ' + error.message, 'danger');
        } finally {
            this.hideLoading();
        }
    }

    /**
     * عرض الإحصائيات
     */
    renderStats(stats) {
        const statsHtml = `
            <div class="col-md-3">
                <div class="stats-card">
                    <div class="d-flex align-items-center">
                        <div class="flex-shrink-0">
                            <i class="fas fa-project-diagram fa-2x text-primary"></i>
                        </div>
                        <div class="flex-grow-1 ms-3">
                            <h3 class="mb-0">${stats.workflows.total}</h3>
                            <p class="text-muted mb-0">سير العمل الإجمالي</p>
                            <small class="text-success">${stats.workflows.active} نشط</small>
                        </div>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="stats-card">
                    <div class="d-flex align-items-center">
                        <div class="flex-shrink-0">
                            <i class="fas fa-envelope fa-2x text-info"></i>
                        </div>
                        <div class="flex-grow-1 ms-3">
                            <h3 class="mb-0">${stats.messages.total}</h3>
                            <p class="text-muted mb-0">الرسائل الإجمالية</p>
                            <small class="text-warning">${stats.messages.pending} في الانتظار</small>
                        </div>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="stats-card">
                    <div class="d-flex align-items-center">
                        <div class="flex-shrink-0">
                            <i class="fas fa-play-circle fa-2x text-success"></i>
                        </div>
                        <div class="flex-grow-1 ms-3">
                            <h3 class="mb-0">${stats.executions.total}</h3>
                            <p class="text-muted mb-0">التنفيذات الإجمالية</p>
                            <small class="text-success">${stats.executions.success_rate}% نجح</small>
                        </div>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="stats-card">
                    <div class="d-flex align-items-center">
                        <div class="flex-shrink-0">
                            <i class="fas fa-paper-plane fa-2x text-warning"></i>
                        </div>
                        <div class="flex-grow-1 ms-3">
                            <h3 class="mb-0">${stats.messages.sent_today}</h3>
                            <p class="text-muted mb-0">رسائل اليوم</p>
                            <small class="text-info">مرسلة بنجاح</small>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.getElementById('statsCards').innerHTML = statsHtml;
    }

    /**
     * تحميل سير العمل
     */
    async loadWorkflows() {
        try {
            const search = document.getElementById('workflowSearch')?.value || '';
            const status = document.getElementById('workflowStatusFilter')?.value || '';
            const triggerType = document.getElementById('workflowTriggerFilter')?.value || '';

            const params = new URLSearchParams({
                page: this.currentPage,
                per_page: this.perPage,
                search,
                status,
                trigger_type: triggerType
            });

            const response = await fetch(`/api/automation/workflows?${params}`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) throw new Error('فشل في تحميل سير العمل');

            const data = await response.json();
            this.renderWorkflows(data.workflows);
            this.renderPagination(data.pagination, 'workflowsPagination');

        } catch (error) {
            this.showAlert('خطأ في تحميل سير العمل: ' + error.message, 'danger');
        }
    }

    /**
     * عرض سير العمل
     */
    renderWorkflows(workflows) {
        if (!workflows.length) {
            document.getElementById('workflowsList').innerHTML = `
                <div class="text-center py-4">
                    <i class="fas fa-robot fa-3x text-muted mb-3"></i>
                    <p class="text-muted">لا توجد سير عمل متاحة</p>
                </div>
            `;
            return;
        }

        const workflowsHtml = workflows.map(workflow => `
            <div class="workflow-card card mb-3">
                <div class="card-body">
                    <div class="row align-items-center">
                        <div class="col-md-8">
                            <h5 class="card-title mb-1">${workflow.name}</h5>
                            <p class="card-text text-muted mb-2">${workflow.description || 'لا يوجد وصف'}</p>
                            <div class="d-flex gap-2 flex-wrap">
                                <span class="badge bg-primary">${this.getTriggerTypeText(workflow.trigger_type)}</span>
                                <span class="status-badge ${this.getStatusClass(workflow.status)}">${this.getStatusText(workflow.status)}</span>
                                <span class="badge bg-secondary">الأولوية: ${workflow.priority}</span>
                            </div>
                        </div>
                        <div class="col-md-4 text-end">
                            <div class="mb-2">
                                <small class="text-muted">عدد التنفيذات: ${workflow.execution_count}</small>
                            </div>
                            <div class="btn-group" role="group">
                                <button class="btn btn-sm btn-outline-primary" onclick="automationManager.viewWorkflow(${workflow.id})">
                                    <i class="fas fa-eye"></i>
                                </button>
                                <button class="btn btn-sm btn-outline-success" onclick="automationManager.executeWorkflow(${workflow.id})" ${!workflow.is_active ? 'disabled' : ''}>
                                    <i class="fas fa-play"></i>
                                </button>
                                <button class="btn btn-sm btn-outline-secondary" onclick="automationManager.editWorkflow(${workflow.id})">
                                    <i class="fas fa-edit"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');

        document.getElementById('workflowsList').innerHTML = workflowsHtml;
    }

    /**
     * تحميل الرسائل المجدولة
     */
    async loadMessages() {
        try {
            const messageType = document.getElementById('messageTypeFilter')?.value || '';
            const status = document.getElementById('messageStatusFilter')?.value || '';

            const params = new URLSearchParams({
                page: this.currentPage,
                per_page: this.perPage,
                message_type: messageType,
                status
            });

            const response = await fetch(`/api/automation/messages?${params}`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) throw new Error('فشل في تحميل الرسائل');

            const data = await response.json();
            this.renderMessages(data.messages);

        } catch (error) {
            this.showAlert('خطأ في تحميل الرسائل: ' + error.message, 'danger');
        }
    }

    /**
     * عرض الرسائل
     */
    renderMessages(messages) {
        if (!messages.length) {
            document.getElementById('messagesList').innerHTML = `
                <div class="text-center py-4">
                    <i class="fas fa-envelope fa-3x text-muted mb-3"></i>
                    <p class="text-muted">لا توجد رسائل مجدولة</p>
                </div>
            `;
            return;
        }

        const messagesHtml = `
            <div class="table-responsive">
                <table class="table table-hover">
                    <thead>
                        <tr>
                            <th>الموضوع</th>
                            <th>النوع</th>
                            <th>نوع الجدولة</th>
                            <th>الوقت المجدول</th>
                            <th>الحالة</th>
                            <th>الإجراءات</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${messages.map(message => `
                            <tr>
                                <td>${message.subject || 'بدون موضوع'}</td>
                                <td><span class="badge bg-info">${message.message_type}</span></td>
                                <td><span class="badge bg-secondary">${this.getScheduleTypeText(message.schedule_type)}</span></td>
                                <td>${message.scheduled_time ? new Date(message.scheduled_time).toLocaleString('ar-SA') : '-'}</td>
                                <td><span class="status-badge ${this.getStatusClass(message.status)}">${message.status}</span></td>
                                <td>
                                    <button class="btn btn-sm btn-outline-primary" onclick="automationManager.viewMessage(${message.id})">
                                        <i class="fas fa-eye"></i>
                                    </button>
                                    <button class="btn btn-sm btn-outline-success" onclick="automationManager.sendMessage(${message.id})">
                                        <i class="fas fa-paper-plane"></i>
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;

        document.getElementById('messagesList').innerHTML = messagesHtml;
    }

    /**
     * تحميل القوالب
     */
    async loadTemplates() {
        try {
            const response = await fetch('/api/automation/templates', {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) throw new Error('فشل في تحميل القوالب');

            const data = await response.json();
            this.renderTemplates(data.templates);

        } catch (error) {
            this.showAlert('خطأ في تحميل القوالب: ' + error.message, 'danger');
        }
    }

    /**
     * عرض القوالب
     */
    renderTemplates(templates) {
        if (!templates.length) {
            document.getElementById('templatesList').innerHTML = `
                <div class="text-center py-4">
                    <i class="fas fa-file-alt fa-3x text-muted mb-3"></i>
                    <p class="text-muted">لا توجد قوالب متاحة</p>
                </div>
            `;
            return;
        }

        const templatesHtml = `
            <div class="row">
                ${templates.map(template => `
                    <div class="col-md-6 mb-3">
                        <div class="card">
                            <div class="card-body">
                                <h5 class="card-title">${template.name}</h5>
                                <p class="card-text">${template.description || 'لا يوجد وصف'}</p>
                                <div class="d-flex justify-content-between align-items-center">
                                    <div>
                                        <span class="badge bg-primary">${template.message_type}</span>
                                        <span class="badge bg-secondary">${template.category || 'عام'}</span>
                                    </div>
                                    <div>
                                        <button class="btn btn-sm btn-outline-primary" onclick="automationManager.viewTemplate(${template.id})">
                                            <i class="fas fa-eye"></i>
                                        </button>
                                        <button class="btn btn-sm btn-outline-secondary" onclick="automationManager.editTemplate(${template.id})">
                                            <i class="fas fa-edit"></i>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;

        document.getElementById('templatesList').innerHTML = templatesHtml;
    }

    /**
     * تحميل القواعد
     */
    async loadRules() {
        try {
            const response = await fetch('/api/automation/rules', {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) throw new Error('فشل في تحميل القواعد');

            const data = await response.json();
            this.renderRules(data.rules);

        } catch (error) {
            this.showAlert('خطأ في تحميل القواعد: ' + error.message, 'danger');
        }
    }

    /**
     * عرض القواعد
     */
    renderRules(rules) {
        if (!rules.length) {
            document.getElementById('rulesList').innerHTML = `
                <div class="text-center py-4">
                    <i class="fas fa-cogs fa-3x text-muted mb-3"></i>
                    <p class="text-muted">لا توجد قواعد متاحة</p>
                </div>
            `;
            return;
        }

        const rulesHtml = `
            <div class="table-responsive">
                <table class="table table-hover">
                    <thead>
                        <tr>
                            <th>اسم القاعدة</th>
                            <th>الوصف</th>
                            <th>الأولوية</th>
                            <th>عدد التنفيذات</th>
                            <th>آخر تحفيز</th>
                            <th>الإجراءات</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rules.map(rule => `
                            <tr>
                                <td>${rule.name}</td>
                                <td>${rule.description || 'لا يوجد وصف'}</td>
                                <td><span class="badge bg-info">${rule.priority}</span></td>
                                <td>${rule.execution_count}</td>
                                <td>${rule.last_triggered ? new Date(rule.last_triggered).toLocaleString('ar-SA') : 'لم يتم التحفيز'}</td>
                                <td>
                                    <button class="btn btn-sm btn-outline-primary" onclick="automationManager.viewRule(${rule.id})">
                                        <i class="fas fa-eye"></i>
                                    </button>
                                    <button class="btn btn-sm btn-outline-secondary" onclick="automationManager.editRule(${rule.id})">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;

        document.getElementById('rulesList').innerHTML = rulesHtml;
    }

    /**
     * عرض الرسائل القادمة والتنفيذات الأخيرة
     */
    renderUpcomingMessages(messages) {
        const html = messages.length ? messages.map(msg => `
            <div class="d-flex justify-content-between align-items-center mb-2">
                <div>
                    <strong>${msg.subject}</strong>
                    <br>
                    <small class="text-muted">${new Date(msg.next_send).toLocaleString('ar-SA')}</small>
                </div>
                <span class="badge bg-primary">${msg.message_type}</span>
            </div>
        `).join('') : '<p class="text-muted">لا توجد رسائل قادمة</p>';

        document.getElementById('upcomingMessages').innerHTML = html;
    }

    renderRecentExecutions(executions) {
        const html = executions.length ? executions.map(exec => `
            <div class="d-flex justify-content-between align-items-center mb-2">
                <div>
                    <strong>${exec.workflow_name}</strong>
                    <br>
                    <small class="text-muted">${new Date(exec.started_at).toLocaleString('ar-SA')}</small>
                </div>
                <span class="status-badge ${this.getStatusClass(exec.status)}">${exec.status}</span>
            </div>
        `).join('') : '<p class="text-muted">لا توجد تنفيذات حديثة</p>';

        document.getElementById('recentExecutions').innerHTML = html;
    }

    /**
     * الدوال المساعدة
     */
    getTriggerTypeText(type) {
        const types = {
            'time_based': 'مبني على الوقت',
            'event_based': 'مبني على الأحداث',
            'condition_based': 'مبني على الشروط',
            'user_action': 'إجراء المستخدم',
            'system_event': 'حدث النظام'
        };
        return types[type] || type;
    }

    getStatusText(status) {
        const statuses = {
            'active': 'نشط',
            'inactive': 'غير نشط',
            'paused': 'متوقف مؤقتاً',
            'completed': 'مكتمل',
            'failed': 'فشل',
            'draft': 'مسودة'
        };
        return statuses[status] || status;
    }

    getStatusClass(status) {
        const classes = {
            'active': 'bg-success',
            'inactive': 'bg-secondary',
            'paused': 'bg-warning',
            'completed': 'bg-info',
            'failed': 'bg-danger',
            'draft': 'bg-light text-dark'
        };
        return classes[status] || 'bg-secondary';
    }

    getScheduleTypeText(type) {
        const types = {
            'immediate': 'فوري',
            'scheduled': 'مجدول',
            'recurring': 'متكرر',
            'conditional': 'شرطي',
            'triggered': 'مُحفز'
        };
        return types[type] || type;
    }

    /**
     * عرض التحميل
     */
    showLoading() {
        document.querySelector('.loading-spinner').style.display = 'block';
    }

    hideLoading() {
        document.querySelector('.loading-spinner').style.display = 'none';
    }

    /**
     * عرض التنبيهات
     */
    showAlert(message, type = 'info') {
        const alertHtml = `
            <div class="alert alert-${type} alert-dismissible fade show" role="alert">
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;
        
        const container = document.getElementById('alertContainer');
        container.insertAdjacentHTML('beforeend', alertHtml);
        
        setTimeout(() => {
            const alert = container.querySelector('.alert');
            if (alert) {
                alert.remove();
            }
        }, 5000);
    }

    /**
     * عرض ترقيم الصفحات
     */
    renderPagination(pagination, containerId) {
        if (pagination.pages <= 1) {
            document.getElementById(containerId).innerHTML = '';
            return;
        }

        let paginationHtml = '<nav><ul class="pagination justify-content-center">';
        
        // الصفحة السابقة
        if (pagination.page > 1) {
            paginationHtml += `<li class="page-item"><a class="page-link" href="#" onclick="automationManager.changePage(${pagination.page - 1})">السابق</a></li>`;
        }
        
        // أرقام الصفحات
        for (let i = 1; i <= pagination.pages; i++) {
            if (i === pagination.page) {
                paginationHtml += `<li class="page-item active"><span class="page-link">${i}</span></li>`;
            } else {
                paginationHtml += `<li class="page-item"><a class="page-link" href="#" onclick="automationManager.changePage(${i})">${i}</a></li>`;
            }
        }
        
        // الصفحة التالية
        if (pagination.page < pagination.pages) {
            paginationHtml += `<li class="page-item"><a class="page-link" href="#" onclick="automationManager.changePage(${pagination.page + 1})">التالي</a></li>`;
        }
        
        paginationHtml += '</ul></nav>';
        document.getElementById(containerId).innerHTML = paginationHtml;
    }

    changePage(page) {
        this.currentPage = page;
        this.loadWorkflows();
    }

    // دوال النماذج والإجراءات (ستتم إضافتها لاحقاً)
    showCreateWorkflowModal() {
        this.showAlert('سيتم إضافة نموذج إنشاء سير العمل قريباً', 'info');
    }

    showCreateMessageModal() {
        this.showAlert('سيتم إضافة نموذج إنشاء الرسالة قريباً', 'info');
    }

    showCreateTemplateModal() {
        this.showAlert('سيتم إضافة نموذج إنشاء القالب قريباً', 'info');
    }

    showCreateRuleModal() {
        this.showAlert('سيتم إضافة نموذج إنشاء القاعدة قريباً', 'info');
    }

    viewWorkflow(id) {
        this.showAlert(`عرض سير العمل رقم ${id}`, 'info');
    }

    executeWorkflow(id) {
        this.showAlert(`تنفيذ سير العمل رقم ${id}`, 'success');
    }

    editWorkflow(id) {
        this.showAlert(`تعديل سير العمل رقم ${id}`, 'info');
    }

    viewMessage(id) {
        this.showAlert(`عرض الرسالة رقم ${id}`, 'info');
    }

    sendMessage(id) {
        this.showAlert(`إرسال الرسالة رقم ${id}`, 'success');
    }

    viewTemplate(id) {
        this.showAlert(`عرض القالب رقم ${id}`, 'info');
    }

    editTemplate(id) {
        this.showAlert(`تعديل القالب رقم ${id}`, 'info');
    }

    viewRule(id) {
        this.showAlert(`عرض القاعدة رقم ${id}`, 'info');
    }

    editRule(id) {
        this.showAlert(`تعديل القاعدة رقم ${id}`, 'info');
    }

    loadLogs() {
        // سيتم تنفيذها لاحقاً
        this.showAlert('سيتم إضافة عرض السجلات قريباً', 'info');
    }
}
