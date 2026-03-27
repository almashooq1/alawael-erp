/**
 * إدارة واجهة الموافقات متعدد المستويات
 * Multi-Level Approval Management Interface
 */

class ApprovalManager {
    constructor() {
        this.currentPage = 1;
        this.currentFilter = 'all';
        this.currentRequestId = null;
        this.currentAction = null;
        this.charts = {};
        
        this.init();
    }
    
    init() {
        this.bindEvents();
        this.loadDashboard();
        this.loadEntityTypes();
        this.setupCharts();
        
        // تحديث البيانات كل 30 ثانية
        setInterval(() => {
            this.refreshCurrentTab();
        }, 30000);
    }
    
    bindEvents() {
        // أحداث التبويبات
        document.querySelectorAll('#mainTabs button').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const target = e.target.getAttribute('data-bs-target');
                this.handleTabChange(target);
            });
        });
        
        // أحداث فلاتر الطلبات
        document.getElementById('allRequestsBtn').addEventListener('click', () => {
            this.currentFilter = 'all';
            this.loadRequests();
        });
        
        document.getElementById('myRequestsBtn').addEventListener('click', () => {
            this.currentFilter = 'my';
            this.loadRequests();
        });
        
        document.getElementById('pendingForMeBtn').addEventListener('click', () => {
            this.currentFilter = 'pending_for_me';
            this.loadRequests();
        });
        
        // أحداث البحث والفلترة
        document.getElementById('statusFilter').addEventListener('change', () => {
            this.loadRequests();
        });
        
        document.getElementById('entityTypeFilter').addEventListener('change', () => {
            this.loadRequests();
        });
        
        let searchTimeout;
        document.getElementById('searchInput').addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                this.loadRequests();
            }, 500);
        });
        
        // أحداث النماذج
        document.getElementById('submitRequestBtn').addEventListener('click', () => {
            this.submitNewRequest();
        });
        
        document.getElementById('confirmApprovalBtn').addEventListener('click', () => {
            this.confirmApproval();
        });
    }
    
    async loadDashboard() {
        try {
            const response = await fetch('/api/approval/dashboard', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.updateDashboardStats(data.stats);
                this.updateStatusChart(data.status_stats);
            }
        } catch (error) {
            console.error('خطأ في تحميل لوحة التحكم:', error);
        }
    }
    
    updateDashboardStats(stats) {
        document.getElementById('totalRequests').textContent = stats.total_requests || 0;
        document.getElementById('pendingRequests').textContent = stats.pending_requests || 0;
        document.getElementById('approvedRequests').textContent = stats.status_stats?.approved || 0;
        document.getElementById('rejectedRequests').textContent = stats.status_stats?.rejected || 0;
    }
    
    async loadEntityTypes() {
        try {
            const response = await fetch('/api/approval/entity-types', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            const data = await response.json();
            
            if (data.success) {
                const selects = ['entityType', 'entityTypeFilter'];
                selects.forEach(selectId => {
                    const select = document.getElementById(selectId);
                    if (select) {
                        select.innerHTML = selectId === 'entityTypeFilter' ? '<option value="">جميع الأنواع</option>' : '<option value="">اختر النوع</option>';
                        data.entity_types.forEach(type => {
                            const option = document.createElement('option');
                            option.value = type.value;
                            option.textContent = type.label;
                            select.appendChild(option);
                        });
                    }
                });
            }
        } catch (error) {
            console.error('خطأ في تحميل أنواع الكيانات:', error);
        }
    }
    
    async loadRequests(page = 1) {
        try {
            const params = new URLSearchParams({
                page: page,
                per_page: 10
            });
            
            // إضافة الفلاتر
            if (this.currentFilter === 'my') {
                params.append('my_requests', 'true');
            } else if (this.currentFilter === 'pending_for_me') {
                params.append('pending_for_me', 'true');
            }
            
            const status = document.getElementById('statusFilter').value;
            if (status) params.append('status', status);
            
            const entityType = document.getElementById('entityTypeFilter').value;
            if (entityType) params.append('entity_type', entityType);
            
            const response = await fetch(`/api/approval/requests?${params}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.renderRequestsTable(data.requests);
                this.renderPagination(data.pages, data.current_page, 'requestsPagination');
            }
        } catch (error) {
            console.error('خطأ في تحميل الطلبات:', error);
            this.showAlert('خطأ في تحميل الطلبات', 'danger');
        }
    }
    
    renderRequestsTable(requests) {
        const tbody = document.getElementById('requestsTableBody');
        
        if (requests.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center">لا توجد طلبات</td></tr>';
            return;
        }
        
        tbody.innerHTML = requests.map(request => `
            <tr>
                <td>
                    <strong>${request.title}</strong>
                    ${request.description ? `<br><small class="text-muted">${request.description}</small>` : ''}
                </td>
                <td>${this.getEntityTypeLabel(request.entity_type)}</td>
                <td>${request.requester_name || 'غير محدد'}</td>
                <td>
                    <span class="badge status-${request.status}">
                        ${this.getStatusLabel(request.status)}
                    </span>
                </td>
                <td>${request.amount ? request.amount.toLocaleString('ar-SA') + ' ريال' : '-'}</td>
                <td>${new Date(request.created_at).toLocaleDateString('ar-SA')}</td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary" onclick="approvalManager.viewRequest(${request.id})">
                            <i class="fas fa-eye"></i>
                        </button>
                        ${request.status === 'pending' ? this.renderApprovalButtons(request.id) : ''}
                    </div>
                </td>
            </tr>
        `).join('');
    }
    
    renderApprovalButtons(requestId) {
        return `
            <button class="btn btn-outline-success" onclick="approvalManager.showApprovalModal(${requestId}, 'approve')" title="موافقة">
                <i class="fas fa-check"></i>
            </button>
            <button class="btn btn-outline-danger" onclick="approvalManager.showApprovalModal(${requestId}, 'reject')" title="رفض">
                <i class="fas fa-times"></i>
            </button>
            <button class="btn btn-outline-warning" onclick="approvalManager.showApprovalModal(${requestId}, 'delegate')" title="تفويض">
                <i class="fas fa-user-friends"></i>
            </button>
        `;
    }
    
    async viewRequest(requestId) {
        try {
            const response = await fetch(`/api/approval/requests/${requestId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.renderRequestDetails(data.request, data.history);
                new bootstrap.Modal(document.getElementById('requestDetailsModal')).show();
            }
        } catch (error) {
            console.error('خطأ في تحميل تفاصيل الطلب:', error);
        }
    }
    
    renderRequestDetails(request, history) {
        const content = document.getElementById('requestDetailsContent');
        
        content.innerHTML = `
            <div class="row">
                <div class="col-md-8">
                    <h6>معلومات الطلب</h6>
                    <table class="table table-borderless">
                        <tr><td><strong>العنوان:</strong></td><td>${request.title}</td></tr>
                        <tr><td><strong>النوع:</strong></td><td>${this.getEntityTypeLabel(request.entity_type)}</td></tr>
                        <tr><td><strong>الحالة:</strong></td><td><span class="badge status-${request.status}">${this.getStatusLabel(request.status)}</span></td></tr>
                        <tr><td><strong>المبلغ:</strong></td><td>${request.amount ? request.amount.toLocaleString('ar-SA') + ' ريال' : '-'}</td></tr>
                        <tr><td><strong>تاريخ الإنشاء:</strong></td><td>${new Date(request.created_at).toLocaleString('ar-SA')}</td></tr>
                        ${request.expires_at ? `<tr><td><strong>تاريخ انتهاء الصلاحية:</strong></td><td>${new Date(request.expires_at).toLocaleString('ar-SA')}</td></tr>` : ''}
                    </table>
                    
                    ${request.description ? `
                        <h6>الوصف</h6>
                        <p>${request.description}</p>
                    ` : ''}
                </div>
                
                <div class="col-md-4">
                    <h6>تاريخ الموافقات</h6>
                    <div class="timeline">
                        ${history.map(h => `
                            <div class="timeline-item">
                                <div class="timeline-marker bg-${this.getActionColor(h.action)}"></div>
                                <div class="timeline-content">
                                    <h6 class="mb-1">${this.getActionLabel(h.action)}</h6>
                                    <p class="mb-1">${h.approver_name || 'النظام'}</p>
                                    <small class="text-muted">${new Date(h.created_at).toLocaleString('ar-SA')}</small>
                                    ${h.comments ? `<p class="mt-1"><small>${h.comments}</small></p>` : ''}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    }
    
    showApprovalModal(requestId, action) {
        this.currentRequestId = requestId;
        this.currentAction = action;
        
        const modal = document.getElementById('approvalModal');
        const title = document.getElementById('approvalModalTitle');
        const label = document.getElementById('approvalCommentLabel');
        const btn = document.getElementById('confirmApprovalBtn');
        
        switch (action) {
            case 'approve':
                title.textContent = 'الموافقة على الطلب';
                label.textContent = 'تعليقات الموافقة';
                btn.textContent = 'موافقة';
                btn.className = 'btn btn-success';
                break;
            case 'reject':
                title.textContent = 'رفض الطلب';
                label.textContent = 'سبب الرفض *';
                btn.textContent = 'رفض';
                btn.className = 'btn btn-danger';
                break;
            case 'delegate':
                title.textContent = 'تفويض الموافقة';
                label.textContent = 'سبب التفويض *';
                btn.textContent = 'تفويض';
                btn.className = 'btn btn-warning';
                break;
        }
        
        document.getElementById('approvalComment').value = '';
        new bootstrap.Modal(modal).show();
    }
    
    async confirmApproval() {
        const comment = document.getElementById('approvalComment').value;
        
        if (this.currentAction === 'reject' && !comment.trim()) {
            this.showAlert('سبب الرفض مطلوب', 'warning');
            return;
        }
        
        try {
            let url = `/api/approval/requests/${this.currentRequestId}/${this.currentAction}`;
            let body = {};
            
            if (this.currentAction === 'approve') {
                body.comments = comment;
            } else if (this.currentAction === 'reject') {
                body.reason = comment;
            } else if (this.currentAction === 'delegate') {
                // يحتاج تطوير واجهة اختيار المفوض إليه
                body.delegate_id = 1; // مؤقت
                body.reason = comment;
            }
            
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(body)
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.showAlert(data.message, 'success');
                bootstrap.Modal.getInstance(document.getElementById('approvalModal')).hide();
                this.loadRequests();
                this.loadDashboard();
            } else {
                this.showAlert(data.error, 'danger');
            }
        } catch (error) {
            console.error('خطأ في تنفيذ الإجراء:', error);
            this.showAlert('حدث خطأ أثناء تنفيذ الإجراء', 'danger');
        }
    }
    
    async submitNewRequest() {
        const form = document.getElementById('newRequestForm');
        
        const data = {
            entity_type: document.getElementById('entityType').value,
            entity_id: parseInt(document.getElementById('entityId').value),
            title: document.getElementById('requestTitle').value,
            description: document.getElementById('requestDescription').value,
            amount: document.getElementById('requestAmount').value ? parseFloat(document.getElementById('requestAmount').value) : null
        };
        
        if (!data.entity_type || !data.entity_id || !data.title) {
            this.showAlert('يرجى ملء جميع الحقول المطلوبة', 'warning');
            return;
        }
        
        try {
            const response = await fetch('/api/approval/requests', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(data)
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showAlert('تم تقديم الطلب بنجاح', 'success');
                bootstrap.Modal.getInstance(document.getElementById('newRequestModal')).hide();
                form.reset();
                this.loadRequests();
                this.loadDashboard();
            } else {
                this.showAlert(result.error, 'danger');
            }
        } catch (error) {
            console.error('خطأ في تقديم الطلب:', error);
            this.showAlert('حدث خطأ أثناء تقديم الطلب', 'danger');
        }
    }
    
    setupCharts() {
        // رسم بياني لتوزيع الحالات
        const statusCtx = document.getElementById('statusChart');
        if (statusCtx) {
            this.charts.status = new Chart(statusCtx, {
                type: 'doughnut',
                data: {
                    labels: ['معلق', 'موافق عليه', 'مرفوض', 'منتهي الصلاحية'],
                    datasets: [{
                        data: [0, 0, 0, 0],
                        backgroundColor: ['#ffc107', '#28a745', '#dc3545', '#6c757d']
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
    }
    
    updateStatusChart(statusStats) {
        if (this.charts.status) {
            this.charts.status.data.datasets[0].data = [
                statusStats.pending || 0,
                statusStats.approved || 0,
                statusStats.rejected || 0,
                statusStats.expired || 0
            ];
            this.charts.status.update();
        }
    }
    
    handleTabChange(target) {
        switch (target) {
            case '#requests':
                this.loadRequests();
                break;
            case '#workflows':
                this.loadWorkflows();
                break;
            case '#delegates':
                this.loadDelegates();
                break;
            case '#notifications':
                this.loadNotifications();
                break;
            case '#analytics':
                this.loadAnalytics();
                break;
        }
    }
    
    refreshCurrentTab() {
        const activeTab = document.querySelector('#mainTabs .nav-link.active');
        if (activeTab) {
            const target = activeTab.getAttribute('data-bs-target');
            this.handleTabChange(target);
        }
    }
    
    // دوال مساعدة
    getEntityTypeLabel(type) {
        const types = {
            'expense': 'المصروفات',
            'purchase': 'المشتريات',
            'leave_request': 'طلبات الإجازة',
            'budget_allocation': 'تخصيص الميزانية',
            'contract': 'العقود',
            'recruitment': 'التوظيف',
            'training': 'التدريب',
            'maintenance': 'الصيانة',
            'document': 'الوثائق',
            'policy': 'السياسات'
        };
        return types[type] || type;
    }
    
    getStatusLabel(status) {
        const statuses = {
            'pending': 'معلق',
            'approved': 'موافق عليه',
            'rejected': 'مرفوض',
            'expired': 'منتهي الصلاحية'
        };
        return statuses[status] || status;
    }
    
    getActionLabel(action) {
        const actions = {
            'submit': 'تقديم الطلب',
            'approve': 'موافقة',
            'reject': 'رفض',
            'delegate': 'تفويض',
            'expire': 'انتهاء الصلاحية'
        };
        return actions[action] || action;
    }
    
    getActionColor(action) {
        const colors = {
            'submit': 'primary',
            'approve': 'success',
            'reject': 'danger',
            'delegate': 'warning',
            'expire': 'secondary'
        };
        return colors[action] || 'secondary';
    }
    
    renderPagination(totalPages, currentPage, containerId) {
        const container = document.getElementById(containerId);
        if (!container || totalPages <= 1) {
            container.innerHTML = '';
            return;
        }
        
        let pagination = '';
        
        // زر السابق
        if (currentPage > 1) {
            pagination += `<li class="page-item"><a class="page-link" href="#" onclick="approvalManager.loadRequests(${currentPage - 1})">السابق</a></li>`;
        }
        
        // أرقام الصفحات
        for (let i = Math.max(1, currentPage - 2); i <= Math.min(totalPages, currentPage + 2); i++) {
            pagination += `<li class="page-item ${i === currentPage ? 'active' : ''}"><a class="page-link" href="#" onclick="approvalManager.loadRequests(${i})">${i}</a></li>`;
        }
        
        // زر التالي
        if (currentPage < totalPages) {
            pagination += `<li class="page-item"><a class="page-link" href="#" onclick="approvalManager.loadRequests(${currentPage + 1})">التالي</a></li>`;
        }
        
        container.innerHTML = pagination;
    }
    
    showAlert(message, type = 'info') {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        document.body.insertBefore(alertDiv, document.body.firstChild);
        
        setTimeout(() => {
            alertDiv.remove();
        }, 5000);
    }
    
    // دوال مؤقتة للتبويبات الأخرى
    async loadWorkflows() {
        console.log('تحميل سير العمل...');
    }
    
    async loadDelegates() {
        console.log('تحميل التفويضات...');
    }
    
    async loadNotifications() {
        console.log('تحميل الإشعارات...');
    }
    
    async loadAnalytics() {
        console.log('تحميل التحليلات...');
    }
}

// إنشاء مثيل عام
const approvalManager = new ApprovalManager();

// تصدير للاستخدام العام
window.approvalManager = approvalManager;
