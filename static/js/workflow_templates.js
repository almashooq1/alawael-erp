/**
 * Workflow Templates System JavaScript
 * Ready-to-use workflow templates for Al-Awael Centers
 */

class WorkflowTemplatesManager {
    constructor() {
        this.currentPage = 1;
        this.itemsPerPage = 12;
        this.currentTemplate = null;
        this.workflowSteps = [];
        this.charts = {};
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadInitialData();
    }

    bindEvents() {
        // Tab switching
        document.querySelectorAll('#mainTabs .nav-link').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const targetTab = e.target.getAttribute('href').substring(1);
                this.handleTabSwitch(targetTab);
            });
        });

        // Search and filters
        document.getElementById('templatesSearch')?.addEventListener('input', 
            this.debounce(() => this.loadTemplates(), 300));
        document.getElementById('categoryFilter')?.addEventListener('change', () => this.loadTemplates());
        document.getElementById('statusFilter')?.addEventListener('change', () => this.loadTemplates());

        // Instance filters
        document.getElementById('instancesSearch')?.addEventListener('input', 
            this.debounce(() => this.loadInstances(), 300));
        document.getElementById('instanceStatusFilter')?.addEventListener('change', () => this.loadInstances());
        document.getElementById('priorityFilter')?.addEventListener('change', () => this.loadInstances());

        // Buttons
        document.getElementById('createTemplateBtn')?.addEventListener('click', () => {
            this.showTab('builderTab');
        });

        document.getElementById('saveTemplateBtn')?.addEventListener('click', () => {
            this.saveTemplate();
        });

        document.getElementById('useTemplateBtn')?.addEventListener('click', () => {
            this.showCreateInstanceModal();
        });

        document.getElementById('saveInstanceBtn')?.addEventListener('click', () => {
            this.createInstance();
        });

        // Workflow builder elements
        document.querySelectorAll('[data-step-type]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.addWorkflowStep(e.target.getAttribute('data-step-type'));
            });
        });
    }

    async loadInitialData() {
        try {
            await Promise.all([
                this.loadDashboardData(),
                this.loadTemplates(),
                this.loadInstances()
            ]);
        } catch (error) {
            console.error('Error loading initial data:', error);
            this.showAlert('خطأ في تحميل البيانات', 'error');
        }
    }

    async loadDashboardData() {
        try {
            const response = await fetch('/api/workflows/dashboard', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) throw new Error('Failed to load dashboard data');

            const data = await response.json();
            
            if (data.success) {
                this.updateSummaryCards(data.summary);
                this.updateCategoryChart(data.category_distribution);
            }
        } catch (error) {
            console.error('Error loading dashboard data:', error);
        }
    }

    updateSummaryCards(summary) {
        document.getElementById('totalTemplates').textContent = summary.total_templates || 0;
        document.getElementById('activeTemplates').textContent = summary.active_templates || 0;
        document.getElementById('activeInstances').textContent = summary.active_instances || 0;
        document.getElementById('completionRate').textContent = `${summary.completion_rate || 0}%`;
    }

    async loadTemplates() {
        try {
            const params = new URLSearchParams({
                page: this.currentPage,
                per_page: this.itemsPerPage
            });

            // Add filters
            const search = document.getElementById('templatesSearch')?.value;
            const category = document.getElementById('categoryFilter')?.value;
            const status = document.getElementById('statusFilter')?.value;

            if (search) params.append('search', search);
            if (category) params.append('category', category);
            if (status) params.append('status', status);

            const response = await fetch(`/api/workflows/templates?${params}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) throw new Error('Failed to load templates');

            const data = await response.json();
            
            if (data.success) {
                this.renderTemplatesGrid(data.templates);
                this.renderPagination('templatesPagination', data.pagination, () => this.loadTemplates());
            }
        } catch (error) {
            console.error('Error loading templates:', error);
            this.showAlert('خطأ في تحميل القوالب', 'error');
        }
    }

    renderTemplatesGrid(templates) {
        const grid = document.getElementById('templatesGrid');
        if (!grid) return;

        grid.innerHTML = '';

        if (!templates || templates.length === 0) {
            grid.innerHTML = `
                <div class="col-12 text-center py-5">
                    <i class="fas fa-layer-group fa-3x text-muted mb-3"></i>
                    <h5 class="text-muted">لا توجد قوالب</h5>
                    <p class="text-muted">قم بإنشاء قالب جديد للبدء</p>
                </div>
            `;
            return;
        }

        templates.forEach(template => {
            const card = this.createTemplateCard(template);
            grid.appendChild(card);
        });
    }

    createTemplateCard(template) {
        const div = document.createElement('div');
        div.className = 'col-md-4 mb-4';
        
        const categoryClass = template.category.replace('_', '-');
        const statusBadge = this.getStatusBadge(template.status);
        
        div.innerHTML = `
            <div class="card template-card ${categoryClass}">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <h6 class="card-title mb-0">${template.name_ar}</h6>
                        ${statusBadge}
                    </div>
                    <p class="card-text text-muted small">${template.description || 'لا يوجد وصف'}</p>
                    
                    <div class="row text-center mb-3">
                        <div class="col-4">
                            <small class="text-muted">الخطوات</small>
                            <div class="fw-bold">${template.steps_count}</div>
                        </div>
                        <div class="col-4">
                            <small class="text-muted">الاستخدامات</small>
                            <div class="fw-bold">${template.usage_count}</div>
                        </div>
                        <div class="col-4">
                            <small class="text-muted">النجاح</small>
                            <div class="fw-bold">${Math.round(template.success_rate)}%</div>
                        </div>
                    </div>
                    
                    <div class="d-flex gap-2">
                        <button class="btn btn-primary btn-sm flex-fill" onclick="workflowManager.viewTemplate(${template.id})">
                            <i class="fas fa-eye"></i> عرض
                        </button>
                        <button class="btn btn-success btn-sm flex-fill" onclick="workflowManager.useTemplate(${template.id})">
                            <i class="fas fa-play"></i> استخدام
                        </button>
                        <button class="btn btn-outline-secondary btn-sm" onclick="workflowManager.editTemplate(${template.id})">
                            <i class="fas fa-edit"></i>
                        </button>
                    </div>
                </div>
                <div class="card-footer text-muted small">
                    <i class="fas fa-clock"></i> ${this.formatTimeAgo(template.created_at)}
                    ${template.estimated_duration ? `• ${template.estimated_duration} دقيقة` : ''}
                </div>
            </div>
        `;
        
        return div;
    }

    getStatusBadge(status) {
        const badges = {
            'active': '<span class="badge bg-success">نشط</span>',
            'draft': '<span class="badge bg-warning">مسودة</span>',
            'inactive': '<span class="badge bg-secondary">غير نشط</span>',
            'archived': '<span class="badge bg-dark">مؤرشف</span>'
        };
        return badges[status] || badges['draft'];
    }

    async loadInstances() {
        try {
            const params = new URLSearchParams({
                page: this.currentPage,
                per_page: this.itemsPerPage
            });

            // Add filters
            const search = document.getElementById('instancesSearch')?.value;
            const status = document.getElementById('instanceStatusFilter')?.value;
            const priority = document.getElementById('priorityFilter')?.value;

            if (search) params.append('search', search);
            if (status) params.append('status', status);
            if (priority) params.append('priority', priority);

            const response = await fetch(`/api/workflows/instances?${params}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) throw new Error('Failed to load instances');

            const data = await response.json();
            
            if (data.success) {
                this.renderInstancesTable(data.instances);
                this.renderPagination('instancesPagination', data.pagination, () => this.loadInstances());
            }
        } catch (error) {
            console.error('Error loading instances:', error);
            this.showAlert('خطأ في تحميل سير العمل', 'error');
        }
    }

    renderInstancesTable(instances) {
        const tbody = document.getElementById('instancesTableBody');
        if (!tbody) return;

        tbody.innerHTML = '';

        if (!instances || instances.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center py-4">
                        <i class="fas fa-tasks fa-2x text-muted mb-2"></i>
                        <p class="text-muted">لا توجد سير عمل</p>
                    </td>
                </tr>
            `;
            return;
        }

        instances.forEach(instance => {
            const row = document.createElement('tr');
            
            const statusBadge = this.getInstanceStatusBadge(instance.status);
            const priorityBadge = this.getPriorityBadge(instance.priority);
            const progressBar = this.createProgressBar(instance.progress_percentage);
            
            row.innerHTML = `
                <td>
                    <strong>${instance.name}</strong>
                    ${instance.reference_id ? `<br><small class="text-muted">المرجع: ${instance.reference_id}</small>` : ''}
                </td>
                <td>${instance.template_name}</td>
                <td>${statusBadge}</td>
                <td>${progressBar}</td>
                <td>${priorityBadge}</td>
                <td>${this.formatDateTime(instance.started_at)}</td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary" onclick="workflowManager.viewInstance(${instance.id})">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-outline-success" onclick="workflowManager.continueInstance(${instance.id})">
                            <i class="fas fa-play"></i>
                        </button>
                    </div>
                </td>
            `;
            
            tbody.appendChild(row);
        });
    }

    getInstanceStatusBadge(status) {
        const badges = {
            'active': '<span class="instance-status status-active">نشط</span>',
            'completed': '<span class="instance-status status-completed">مكتمل</span>',
            'cancelled': '<span class="instance-status status-cancelled">ملغي</span>',
            'failed': '<span class="instance-status status-cancelled">فشل</span>'
        };
        return badges[status] || badges['active'];
    }

    getPriorityBadge(priority) {
        const badges = {
            'urgent': '<span class="badge bg-danger">عاجل</span>',
            'high': '<span class="badge bg-warning">عالي</span>',
            'medium': '<span class="badge bg-info">متوسط</span>',
            'low': '<span class="badge bg-secondary">منخفض</span>'
        };
        return badges[priority] || badges['medium'];
    }

    createProgressBar(percentage) {
        return `
            <div class="progress" style="height: 20px;">
                <div class="progress-bar" role="progressbar" style="width: ${percentage}%">
                    ${Math.round(percentage)}%
                </div>
            </div>
        `;
    }

    async viewTemplate(templateId) {
        try {
            const response = await fetch(`/api/workflows/templates/${templateId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) throw new Error('Failed to load template');

            const data = await response.json();
            
            if (data.success) {
                this.currentTemplate = data.template;
                this.showTemplateDetails(data.template);
            }
        } catch (error) {
            console.error('Error loading template:', error);
            this.showAlert('خطأ في تحميل القالب', 'error');
        }
    }

    showTemplateDetails(template) {
        const content = document.getElementById('templateDetailsContent');
        if (!content) return;

        let stepsHtml = '';
        if (template.steps && template.steps.length > 0) {
            stepsHtml = template.steps.map((step, index) => `
                <div class="workflow-step">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <h6 class="mb-1">${step.name_ar}</h6>
                            <small class="text-muted">${this.translateStepType(step.step_type)}</small>
                        </div>
                        <div class="text-end">
                            <small class="text-muted">الخطوة ${step.step_order}</small>
                            ${step.estimated_duration ? `<br><small>${step.estimated_duration} دقيقة</small>` : ''}
                        </div>
                    </div>
                    ${step.description ? `<p class="mt-2 mb-0 small">${step.description}</p>` : ''}
                </div>
                ${index < template.steps.length - 1 ? '<div class="step-connector"><i class="fas fa-arrow-down"></i></div>' : ''}
            `).join('');
        }

        content.innerHTML = `
            <div class="row">
                <div class="col-md-6">
                    <h6>معلومات القالب</h6>
                    <table class="table table-sm">
                        <tr><td><strong>الاسم:</strong></td><td>${template.name_ar}</td></tr>
                        <tr><td><strong>الفئة:</strong></td><td>${this.translateCategory(template.category)}</td></tr>
                        <tr><td><strong>الإصدار:</strong></td><td>${template.version}</td></tr>
                        <tr><td><strong>المدة المقدرة:</strong></td><td>${template.estimated_duration || 'غير محدد'} دقيقة</td></tr>
                        <tr><td><strong>مستوى التعقيد:</strong></td><td>${this.translateComplexity(template.complexity_level)}</td></tr>
                        <tr><td><strong>عدد الاستخدامات:</strong></td><td>${template.usage_count}</td></tr>
                        <tr><td><strong>معدل النجاح:</strong></td><td>${Math.round(template.success_rate)}%</td></tr>
                    </table>
                </div>
                <div class="col-md-6">
                    <h6>الوصف</h6>
                    <p>${template.description || 'لا يوجد وصف'}</p>
                </div>
            </div>
            
            <hr>
            
            <h6>خطوات سير العمل (${template.steps?.length || 0})</h6>
            <div class="workflow-steps">
                ${stepsHtml || '<p class="text-muted">لا توجد خطوات محددة</p>'}
            </div>
        `;

        const modal = new bootstrap.Modal(document.getElementById('templateDetailsModal'));
        modal.show();
    }

    useTemplate(templateId) {
        this.currentTemplate = { id: templateId };
        this.showCreateInstanceModal();
    }

    showCreateInstanceModal() {
        if (!this.currentTemplate) return;

        document.getElementById('instanceTemplateId').value = this.currentTemplate.id;
        const modal = new bootstrap.Modal(document.getElementById('createInstanceModal'));
        modal.show();
    }

    async createInstance() {
        try {
            const form = document.getElementById('createInstanceForm');
            const formData = new FormData(form);
            
            const instanceData = {};
            for (let [key, value] of formData.entries()) {
                if (value) {
                    instanceData[key] = value;
                }
            }

            const response = await fetch('/api/workflows/instances', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(instanceData)
            });

            if (!response.ok) throw new Error('Failed to create instance');

            const data = await response.json();
            
            if (data.success) {
                this.showAlert('تم إنشاء سير العمل بنجاح', 'success');
                bootstrap.Modal.getInstance(document.getElementById('createInstanceModal')).hide();
                form.reset();
                this.loadInstances();
                this.loadDashboardData();
            }
        } catch (error) {
            console.error('Error creating instance:', error);
            this.showAlert('خطأ في إنشاء سير العمل', 'error');
        }
    }

    // Workflow Builder Methods
    addWorkflowStep(stepType) {
        const step = {
            id: Date.now(),
            type: stepType,
            name: this.getDefaultStepName(stepType),
            order: this.workflowSteps.length + 1
        };
        
        this.workflowSteps.push(step);
        this.renderWorkflowCanvas();
    }

    getDefaultStepName(stepType) {
        const names = {
            'task': 'مهمة جديدة',
            'form': 'نموذج بيانات',
            'decision': 'نقطة قرار',
            'approval': 'موافقة مطلوبة',
            'notification': 'إرسال إشعار'
        };
        return names[stepType] || 'خطوة جديدة';
    }

    renderWorkflowCanvas() {
        const canvas = document.getElementById('workflowCanvas');
        if (!canvas) return;

        if (this.workflowSteps.length === 0) {
            canvas.innerHTML = `
                <div class="text-center text-muted mt-5">
                    <i class="fas fa-mouse-pointer fa-3x mb-3"></i>
                    <p>اسحب العناصر من الشريط الجانبي لبناء سير العمل</p>
                </div>
            `;
            return;
        }

        let stepsHtml = this.workflowSteps.map((step, index) => `
            <div class="workflow-step" data-step-id="${step.id}">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <h6 class="mb-1">${step.name}</h6>
                        <small class="text-muted">${this.translateStepType(step.type)}</small>
                    </div>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary" onclick="workflowManager.editStep(${step.id})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-outline-danger" onclick="workflowManager.removeStep(${step.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
            ${index < this.workflowSteps.length - 1 ? '<div class="step-connector"><i class="fas fa-arrow-down"></i></div>' : ''}
        `).join('');

        canvas.innerHTML = stepsHtml;
    }

    removeStep(stepId) {
        this.workflowSteps = this.workflowSteps.filter(step => step.id !== stepId);
        this.renderWorkflowCanvas();
    }

    async saveTemplate() {
        try {
            const form = document.getElementById('templateBuilderForm');
            const formData = new FormData(form);
            
            const templateData = {};
            for (let [key, value] of formData.entries()) {
                if (value) {
                    templateData[key] = value;
                }
            }

            // Add English name (required by API)
            templateData.name = templateData.name_ar;
            templateData.steps = this.workflowSteps.map((step, index) => ({
                name: step.name,
                name_ar: step.name,
                step_type: step.type,
                step_order: index + 1,
                is_required: true
            }));

            const response = await fetch('/api/workflows/templates', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(templateData)
            });

            if (!response.ok) throw new Error('Failed to save template');

            const data = await response.json();
            
            if (data.success) {
                this.showAlert('تم حفظ القالب بنجاح', 'success');
                form.reset();
                this.workflowSteps = [];
                this.renderWorkflowCanvas();
                this.loadTemplates();
                this.loadDashboardData();
            }
        } catch (error) {
            console.error('Error saving template:', error);
            this.showAlert('خطأ في حفظ القالب', 'error');
        }
    }

    updateCategoryChart(categoryData) {
        const ctx = document.getElementById('categoryChart');
        if (!ctx || !categoryData) return;

        if (this.charts.categoryChart) {
            this.charts.categoryChart.destroy();
        }

        this.charts.categoryChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: categoryData.map(item => this.translateCategory(item.category)),
                datasets: [{
                    data: categoryData.map(item => item.count),
                    backgroundColor: [
                        '#007bff', '#28a745', '#17a2b8', '#ffc107',
                        '#6c757d', '#dc3545', '#6f42c1', '#fd7e14'
                    ]
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

    handleTabSwitch(tabName) {
        switch (tabName) {
            case 'templatesTab':
                this.loadTemplates();
                break;
            case 'instancesTab':
                this.loadInstances();
                break;
            case 'analyticsTab':
                this.loadDashboardData();
                break;
        }
    }

    showTab(tabName) {
        const tab = document.querySelector(`[href="#${tabName}"]`);
        if (tab) {
            tab.click();
        }
    }

    // Utility methods
    translateCategory(category) {
        const translations = {
            'therapy_session': 'جلسة علاجية',
            'assessment': 'تقييم',
            'treatment_plan': 'خطة علاجية',
            'family_communication': 'تواصل عائلي',
            'documentation': 'توثيق',
            'administrative': 'إداري',
            'quality_assurance': 'ضمان الجودة',
            'emergency': 'طوارئ'
        };
        return translations[category] || category;
    }

    translateStepType(stepType) {
        const translations = {
            'task': 'مهمة',
            'form': 'نموذج',
            'decision': 'قرار',
            'approval': 'موافقة',
            'notification': 'إشعار',
            'delay': 'انتظار',
            'integration': 'تكامل'
        };
        return translations[stepType] || stepType;
    }

    translateComplexity(complexity) {
        const translations = {
            'low': 'منخفض',
            'medium': 'متوسط',
            'high': 'عالي'
        };
        return translations[complexity] || complexity;
    }

    formatDateTime(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('ar-SA') + ' ' + date.toLocaleTimeString('ar-SA', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    formatTimeAgo(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);
        
        if (diffInSeconds < 60) return 'منذ لحظات';
        if (diffInSeconds < 3600) return `منذ ${Math.floor(diffInSeconds / 60)} دقيقة`;
        if (diffInSeconds < 86400) return `منذ ${Math.floor(diffInSeconds / 3600)} ساعة`;
        return `منذ ${Math.floor(diffInSeconds / 86400)} يوم`;
    }

    renderPagination(containerId, pagination, callback) {
        const container = document.getElementById(containerId);
        if (!container) return;

        if (pagination.pages <= 1) {
            container.innerHTML = '';
            return;
        }

        let paginationHTML = '<ul class="pagination justify-content-center">';
        
        // Previous button
        paginationHTML += `
            <li class="page-item ${pagination.page === 1 ? 'disabled' : ''}">
                <a class="page-link" href="#" data-page="${pagination.page - 1}">السابق</a>
            </li>
        `;
        
        // Page numbers
        for (let i = 1; i <= pagination.pages; i++) {
            if (i === pagination.page || 
                i === 1 || 
                i === pagination.pages || 
                (i >= pagination.page - 2 && i <= pagination.page + 2)) {
                paginationHTML += `
                    <li class="page-item ${i === pagination.page ? 'active' : ''}">
                        <a class="page-link" href="#" data-page="${i}">${i}</a>
                    </li>
                `;
            } else if (i === pagination.page - 3 || i === pagination.page + 3) {
                paginationHTML += '<li class="page-item disabled"><span class="page-link">...</span></li>';
            }
        }
        
        // Next button
        paginationHTML += `
            <li class="page-item ${pagination.page === pagination.pages ? 'disabled' : ''}">
                <a class="page-link" href="#" data-page="${pagination.page + 1}">التالي</a>
            </li>
        `;
        
        paginationHTML += '</ul>';
        container.innerHTML = paginationHTML;
        
        // Bind pagination events
        container.querySelectorAll('.page-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = parseInt(e.target.getAttribute('data-page'));
                if (page && page !== this.currentPage) {
                    this.currentPage = page;
                    callback();
                }
            });
        });
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

    showAlert(message, type = 'info') {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
        alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
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

    // Placeholder methods for future implementation
    editTemplate(templateId) {
        console.log('Edit template:', templateId);
    }

    viewInstance(instanceId) {
        console.log('View instance:', instanceId);
    }

    continueInstance(instanceId) {
        console.log('Continue instance:', instanceId);
    }

    editStep(stepId) {
        console.log('Edit step:', stepId);
    }
}

// Initialize the workflow templates manager when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.workflowManager = new WorkflowTemplatesManager();
});
