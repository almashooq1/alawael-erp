/**
 * مدير واجهة إدارة الوثائق والرخص
 * Documents and Licenses Management Interface Manager
 */

class DocumentsManager {
    constructor() {
        this.currentPage = 1;
        this.perPage = 20;
        this.filters = {};
        this.documents = [];
        this.categories = [];
        this.charts = {};
        this.token = localStorage.getItem('token');
        this.apiBase = '/api/documents';
    }

    /**
     * تهيئة النظام
     */
    async init() {
        try {
            this.setupEventListeners();
            await this.loadDashboardData();
            await this.loadCategories();
            await this.loadDocuments();
            this.setupCharts();
        } catch (error) {
            console.error('خطأ في تهيئة النظام:', error);
            this.showAlert('خطأ في تحميل البيانات', 'danger');
        }
    }

    /**
     * إعداد مستمعي الأحداث
     */
    setupEventListeners() {
        // البحث بالكتابة
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            let searchTimeout;
            searchInput.addEventListener('input', () => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => this.searchDocuments(), 500);
            });
        }

        // تغيير التبويبات
        document.querySelectorAll('#mainTabs .nav-link').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabId = e.target.getAttribute('href').substring(1);
                this.onTabChange(tabId);
            });
        });

        // مفاتيح الاختصار
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'n') {
                e.preventDefault();
                this.showCreateModal();
            }
        });
    }

    /**
     * تحميل بيانات لوحة التحكم
     */
    async loadDashboardData() {
        try {
            const response = await fetch(`${this.apiBase}/dashboard`, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });

            if (!response.ok) throw new Error('فشل في تحميل البيانات');

            const data = await response.json();
            if (data.success) {
                this.updateDashboardStats(data.dashboard);
            }
        } catch (error) {
            console.error('خطأ في تحميل لوحة التحكم:', error);
        }
    }

    /**
     * تحديث إحصائيات لوحة التحكم
     */
    updateDashboardStats(dashboard) {
        const stats = dashboard.summary;
        
        document.getElementById('totalDocuments').textContent = stats.total_documents || 0;
        document.getElementById('activeDocuments').textContent = stats.active_documents || 0;
        document.getElementById('expiringSoon').textContent = stats.expiring_soon || 0;
        document.getElementById('expiredDocuments').textContent = stats.expired_documents || 0;

        // تحديث الرسوم البيانية
        this.updateChartsData(dashboard);
    }

    /**
     * تحميل الفئات
     */
    async loadCategories() {
        try {
            const response = await fetch(`${this.apiBase}/categories`, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });

            if (!response.ok) throw new Error('فشل في تحميل الفئات');

            const data = await response.json();
            if (data.success) {
                this.categories = data.categories;
                this.populateCategoryFilters();
                this.renderCategories();
            }
        } catch (error) {
            console.error('خطأ في تحميل الفئات:', error);
        }
    }

    /**
     * تحميل الوثائق
     */
    async loadDocuments() {
        try {
            this.showLoading('documentsLoading');
            
            const params = new URLSearchParams({
                page: this.currentPage,
                per_page: this.perPage,
                ...this.filters
            });

            const response = await fetch(`${this.apiBase}/?${params}`, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });

            if (!response.ok) throw new Error('فشل في تحميل الوثائق');

            const data = await response.json();
            if (data.success) {
                this.documents = data.documents;
                this.renderDocuments();
                this.renderPagination(data.pagination);
            }
        } catch (error) {
            console.error('خطأ في تحميل الوثائق:', error);
            this.showAlert('خطأ في تحميل الوثائق', 'danger');
        } finally {
            this.hideLoading('documentsLoading');
        }
    }

    /**
     * عرض الوثائق
     */
    renderDocuments() {
        const container = document.getElementById('documentsList');
        if (!container) return;

        if (this.documents.length === 0) {
            container.innerHTML = `
                <div class="text-center py-5">
                    <i class="fas fa-file-alt fa-3x text-muted mb-3"></i>
                    <h5 class="text-muted">لا توجد وثائق</h5>
                    <p class="text-muted">لم يتم العثور على وثائق تطابق معايير البحث</p>
                </div>
            `;
            return;
        }

        const html = this.documents.map(doc => this.createDocumentCard(doc)).join('');
        container.innerHTML = html;
    }

    /**
     * إنشاء بطاقة وثيقة
     */
    createDocumentCard(doc) {
        const statusClass = this.getStatusClass(doc);
        const priorityClass = `priority-${doc.priority}`;
        const daysRemaining = doc.days_until_expiry;
        const daysClass = daysRemaining <= 7 ? 'critical' : daysRemaining <= 30 ? 'warning' : 'normal';

        return `
            <div class="document-card ${statusClass}" data-id="${doc.id}">
                <div class="row align-items-center">
                    <div class="col-md-8">
                        <div class="d-flex align-items-center mb-2">
                            <h6 class="mb-0 me-2">${doc.title}</h6>
                            <span class="priority-badge ${priorityClass}"></span>
                            <span class="status-badge ${this.getStatusBadgeClass(doc.status)} me-2">
                                ${doc.status_display}
                            </span>
                        </div>
                        <div class="document-meta">
                            <span><i class="fas fa-hashtag me-1"></i>${doc.document_number}</span>
                            <span class="me-3"><i class="fas fa-tag me-1"></i>${doc.document_type_display}</span>
                            <span class="me-3"><i class="fas fa-user me-1"></i>${doc.entity_name || 'غير محدد'}</span>
                            ${doc.issuing_authority ? `<span><i class="fas fa-building me-1"></i>${doc.issuing_authority}</span>` : ''}
                        </div>
                    </div>
                    <div class="col-md-4 text-end">
                        <div class="mb-2">
                            <small class="text-muted">تاريخ الانتهاء:</small><br>
                            <strong>${this.formatDate(doc.expiry_date)}</strong>
                        </div>
                        ${daysRemaining !== null ? `
                            <div class="days-remaining ${daysClass} mb-2">
                                ${daysRemaining > 0 ? `${daysRemaining} يوم متبقي` : 'منتهية الصلاحية'}
                            </div>
                        ` : ''}
                        <div class="btn-group" role="group">
                            <button class="btn btn-sm btn-outline-primary" onclick="documentsManager.viewDocument(${doc.id})" title="عرض التفاصيل">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-secondary" onclick="documentsManager.editDocument(${doc.id})" title="تعديل">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-info" onclick="documentsManager.uploadDocumentFile(${doc.id})" title="رفع ملف">
                                <i class="fas fa-upload"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-warning" onclick="documentsManager.viewDocumentAttachments(${doc.id})" title="عرض المرفقات">
                                <i class="fas fa-paperclip"></i>
                            </button>
                            ${doc.has_file ? `
                                <button class="btn btn-sm btn-outline-success" onclick="documentsManager.downloadDocument(${doc.id})" title="تحميل الملف الأساسي">
                                    <i class="fas fa-download"></i>
                                </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * تطبيق الفلاتر
     */
    applyFilters() {
        this.filters = {
            search: document.getElementById('searchInput')?.value || '',
            document_type: document.getElementById('documentTypeFilter')?.value || '',
            status: document.getElementById('statusFilter')?.value || '',
            entity_type: document.getElementById('entityTypeFilter')?.value || '',
            category_id: document.getElementById('categoryFilter')?.value || ''
        };

        // إضافة فلاتر خاصة للحالة
        if (this.filters.status === 'expiring_soon') {
            this.filters.expiring_soon = true;
            delete this.filters.status;
        } else if (this.filters.status === 'expired') {
            this.filters.expired = true;
            delete this.filters.status;
        }

        this.currentPage = 1;
        this.loadDocuments();
    }

    /**
     * البحث في الوثائق
     */
    searchDocuments() {
        this.applyFilters();
    }

    /**
     * عرض نموذج إنشاء وثيقة
     */
    showCreateModal() {
        document.getElementById('documentModalTitle').textContent = 'إضافة وثيقة جديدة';
        document.getElementById('documentForm').reset();
        this.populateDocumentTypeOptions();
        
        const modal = new bootstrap.Modal(document.getElementById('documentModal'));
        modal.show();
    }

    /**
     * حفظ الوثيقة
     */
    async saveDocument() {
        try {
            const formData = this.getDocumentFormData();
            
            const response = await fetch(this.apiBase, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();
            
            if (data.success) {
                this.showAlert('تم حفظ الوثيقة بنجاح', 'success');
                bootstrap.Modal.getInstance(document.getElementById('documentModal')).hide();
                await this.loadDocuments();
                await this.loadDashboardData();
            } else {
                this.showAlert(data.message || 'خطأ في حفظ الوثيقة', 'danger');
            }
        } catch (error) {
            console.error('خطأ في حفظ الوثيقة:', error);
            this.showAlert('خطأ في حفظ الوثيقة', 'danger');
        }
    }

    /**
     * الحصول على بيانات النموذج
     */
    getDocumentFormData() {
        return {
            document_number: document.getElementById('documentNumber').value,
            document_type: document.getElementById('documentType').value,
            title: document.getElementById('documentTitle').value,
            description: document.getElementById('documentDescription').value,
            entity_type: document.getElementById('entityType').value,
            entity_id: parseInt(document.getElementById('entityId').value),
            entity_name: document.getElementById('entityName').value,
            issue_date: document.getElementById('issueDate').value,
            expiry_date: document.getElementById('expiryDate').value,
            issuing_authority: document.getElementById('issuingAuthority').value,
            priority: parseInt(document.getElementById('priority').value),
            cost: parseFloat(document.getElementById('cost').value) || null,
            currency: document.getElementById('currency').value,
            notes: document.getElementById('notes').value,
            reminder_enabled: document.getElementById('reminderEnabled').checked
        };
    }

    /**
     * ملء خيارات أنواع الوثائق
     */
    populateDocumentTypeOptions() {
        const select = document.getElementById('documentType');
        if (!select) return;

        const types = [
            { value: 'business_registration', text: 'السجل التجاري' },
            { value: 'commercial_license', text: 'الرخصة التجارية' },
            { value: 'municipal_license', text: 'رخصة البلدية' },
            { value: 'residence_permit', text: 'الإقامة' },
            { value: 'national_id', text: 'بطاقة الأحوال المدنية' },
            { value: 'driving_license', text: 'رخصة القيادة' },
            { value: 'vehicle_registration', text: 'استمارة المركبة' },
            { value: 'vehicle_insurance', text: 'تأمين المركبة' }
        ];

        select.innerHTML = '<option value="">اختر نوع الوثيقة</option>';
        types.forEach(type => {
            select.innerHTML += `<option value="${type.value}">${type.text}</option>`;
        });
    }

    /**
     * ملء فلاتر الفئات
     */
    populateCategoryFilters() {
        const select = document.getElementById('categoryFilter');
        if (!select) return;

        select.innerHTML = '<option value="">جميع الفئات</option>';
        this.categories.forEach(category => {
            select.innerHTML += `<option value="${category.id}">${category.name}</option>`;
        });
    }

    /**
     * عرض التنبيه
     */
    showAlert(message, type = 'info') {
        const alertContainer = document.getElementById('alertContainer');
        if (!alertContainer) return;

        const alertId = 'alert_' + Date.now();
        const alertHtml = `
            <div class="alert alert-${type} alert-dismissible fade show" id="${alertId}" role="alert">
                <i class="fas fa-${this.getAlertIcon(type)} me-2"></i>
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;

        alertContainer.innerHTML = alertHtml;

        // إخفاء التنبيه تلقائياً بعد 5 ثوان
        setTimeout(() => {
            const alert = document.getElementById(alertId);
            if (alert) {
                bootstrap.Alert.getOrCreateInstance(alert).close();
            }
        }, 5000);
    }

    /**
     * إظهار/إخفاء مؤشر التحميل
     */
    showLoading(elementId) {
        const element = document.getElementById(elementId);
        if (element) element.style.display = 'block';
    }

    hideLoading(elementId) {
        const element = document.getElementById(elementId);
        if (element) element.style.display = 'none';
    }

    /**
     * دوال مساعدة
     */
    getStatusClass(doc) {
        if (doc.is_expired) return 'expired';
        if (doc.is_expiring_soon) return 'expiring-soon';
        return '';
    }

    getStatusBadgeClass(status) {
        const classes = {
            'active': 'status-active',
            'expired': 'status-expired',
            'pending': 'status-pending'
        };
        return classes[status] || 'status-active';
    }

    getAlertIcon(type) {
        const icons = {
            'success': 'check-circle',
            'danger': 'exclamation-triangle',
            'warning': 'exclamation-circle',
            'info': 'info-circle'
        };
        return icons[type] || 'info-circle';
    }

    formatDate(dateString) {
        if (!dateString) return 'غير محدد';
        const date = new Date(dateString);
        return date.toLocaleDateString('ar-SA');
    }

    /**
     * تغيير التبويب
     */
    onTabChange(tabId) {
        switch (tabId) {
            case 'remindersTab':
                this.loadReminders();
                break;
            case 'renewalsTab':
                this.loadRenewals();
                break;
            case 'reportsTab':
                this.loadReports();
                break;
            case 'categoriesTab':
                this.renderCategories();
                break;
        }
    }

    /**
     * تحميل التذكيرات
     */
    async loadReminders() {
        // تنفيذ تحميل التذكيرات
    }

    /**
     * تحميل التجديدات
     */
    async loadRenewals() {
        // تنفيذ تحميل التجديدات
    }

    /**
     * تحميل التقارير
     */
    async loadReports() {
        // تنفيذ تحميل التقارير
    }

    /**
     * عرض الفئات
     */
    renderCategories() {
        // تنفيذ عرض الفئات
    }

    /**
     * إعداد الرسوم البيانية
     */
    setupCharts() {
        // تنفيذ إعداد الرسوم البيانية
    }

    /**
     * تحديث بيانات الرسوم البيانية
     */
    updateChartsData(dashboard) {
        // تنفيذ تحديث الرسوم البيانية
    }

    /**
     * عرض الترقيم
     */
    renderPagination(pagination) {
        const container = document.getElementById('documentsPagination');
        if (!container || !pagination) return;

        let html = '';
        
        // زر السابق
        if (pagination.has_prev) {
            html += `<li class="page-item">
                <a class="page-link" href="#" onclick="documentsManager.goToPage(${pagination.page - 1})">السابق</a>
            </li>`;
        }

        // أرقام الصفحات
        for (let i = 1; i <= pagination.pages; i++) {
            const active = i === pagination.page ? 'active' : '';
            html += `<li class="page-item ${active}">
                <a class="page-link" href="#" onclick="documentsManager.goToPage(${i})">${i}</a>
            </li>`;
        }

        // زر التالي
        if (pagination.has_next) {
            html += `<li class="page-item">
                <a class="page-link" href="#" onclick="documentsManager.goToPage(${pagination.page + 1})">التالي</a>
            </li>`;
        }

        container.innerHTML = html;
    }

    /**
     * الانتقال لصفحة معينة
     */
    goToPage(page) {
        this.currentPage = page;
        this.loadDocuments();
    }

    /**
     * تحميل محتوى تبويب التقارير
     */
    loadReportsTab() {
        const content = `
            <div class="row mb-4">
                <div class="col-12">
                    <div class="card">
                        <div class="card-header">
                            <h5 class="card-title mb-0">
                                <i class="fas fa-chart-bar me-2"></i>
                                التقارير والإحصائيات
                            </h5>
                        </div>
                        <div class="card-body">
                            <div class="row">
                                <div class="col-md-4 mb-3">
                                    <button class="btn btn-outline-danger w-100" onclick="documentsManager.generateReport('expired')">
                                        <i class="fas fa-exclamation-triangle me-2"></i>
                                        الوثائق المنتهية الصلاحية
                                    </button>
                                </div>
                                <div class="col-md-4 mb-3">
                                    <button class="btn btn-outline-warning w-100" onclick="documentsManager.generateReport('expiring_soon')">
                                        <i class="fas fa-clock me-2"></i>
                                        الوثائق التي تنتهي قريباً
                                    </button>
                                </div>
                                <div class="col-md-4 mb-3">
                                    <button class="btn btn-outline-info w-100" onclick="documentsManager.generateReport('statistics')">
                                        <i class="fas fa-chart-pie me-2"></i>
                                        الإحصائيات الشاملة
                                    </button>
                                </div>
                            </div>
                            
                            <hr>
                            
                            <div class="row">
                                <div class="col-md-6">
                                    <h6>تصدير التقارير</h6>
                                    <div class="mb-3">
                                        <label class="form-label">نوع التقرير</label>
                                        <select class="form-select" id="export-report-type">
                                            <option value="all">جميع الوثائق</option>
                                            <option value="expired">الوثائق المنتهية</option>
                                            <option value="expiring_soon">التي تنتهي قريباً</option>
                                        </select>
                                    </div>
                                    <button class="btn btn-success" onclick="documentsManager.exportReport()">
                                        <i class="fas fa-file-excel me-2"></i>
                                        تصدير إلى Excel
                                    </button>
                                </div>
                                <div class="col-md-6">
                                    <h6>فلاتر التصدير</h6>
                                    <div class="mb-2">
                                        <label class="form-label">نوع الوثيقة</label>
                                        <select class="form-select form-select-sm" id="export-document-type">
                                            <option value="">جميع الأنواع</option>
                                        </select>
                                    </div>
                                    <div class="mb-2">
                                        <label class="form-label">الحالة</label>
                                        <select class="form-select form-select-sm" id="export-status">
                                            <option value="">جميع الحالات</option>
                                            <option value="active">نشط</option>
                                            <option value="expired">منتهي الصلاحية</option>
                                            <option value="suspended">معلق</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="row">
                <div class="col-12">
                    <div class="card">
                        <div class="card-header">
                            <h6 class="card-title mb-0">نتائج التقرير</h6>
                        </div>
                        <div class="card-body">
                            <div id="report-results">
                                <div class="text-center text-muted">
                                    <i class="fas fa-chart-line fa-3x mb-3"></i>
                                    <p>اختر نوع التقرير لعرض النتائج</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.getElementById('reports-content').innerHTML = content;
    }

    /**
     * إنشاء تقرير
     */
    async generateReport(reportType) {
        try {
            this.showLoading();
            
            let endpoint = '';
            switch(reportType) {
                case 'expired':
                    endpoint = '/api/documents/reports/expired';
                    break;
                case 'expiring_soon':
                    endpoint = '/api/documents/reports/expiring-soon';
                    break;
                case 'statistics':
                    endpoint = '/api/documents/reports/statistics';
                    break;
                default:
                    throw new Error('نوع تقرير غير صحيح');
            }
            
            const response = await fetch(endpoint, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                }
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.displayReportResults(result.report, reportType);
                this.showAlert('تم إنشاء التقرير بنجاح', 'success');
            } else {
                throw new Error(result.message);
            }
            
        } catch (error) {
            console.error('خطأ في إنشاء التقرير:', error);
            this.showAlert('خطأ في إنشاء التقرير: ' + error.message, 'danger');
        } finally {
            this.hideLoading();
        }
    }

    /**
     * عرض نتائج التقرير
     */
    displayReportResults(report, reportType) {
        const resultsContainer = document.getElementById('report-results');
        
        if (reportType === 'statistics') {
            // عرض الإحصائيات
            resultsContainer.innerHTML = `
                <div class="row mb-4">
                    <div class="col-md-3">
                        <div class="card bg-primary text-white">
                            <div class="card-body text-center">
                                <h3>${report.summary.total_documents}</h3>
                                <p class="mb-0">إجمالي الوثائق</p>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="card bg-success text-white">
                            <div class="card-body text-center">
                                <h3>${report.summary.total_cost.toLocaleString()} ريال</h3>
                                <p class="mb-0">إجمالي التكاليف</p>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="card bg-info text-white">
                            <div class="card-body text-center">
                                <h3>${report.summary.average_cost.toFixed(2)} ريال</h3>
                                <p class="mb-0">متوسط التكلفة</p>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="card bg-warning text-white">
                            <div class="card-body text-center">
                                <h3>${report.summary.total_categories}</h3>
                                <p class="mb-0">عدد الفئات</p>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="row">
                    <div class="col-md-6">
                        <h6>الإحصائيات حسب النوع</h6>
                        <div class="table-responsive">
                            <table class="table table-sm">
                                <thead>
                                    <tr>
                                        <th>نوع الوثيقة</th>
                                        <th>العدد</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${Object.entries(report.by_type).map(([key, value]) => `
                                        <tr>
                                            <td>${value.name}</td>
                                            <td><span class="badge bg-primary">${value.count}</span></td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <h6>الإحصائيات حسب الحالة</h6>
                        <div class="table-responsive">
                            <table class="table table-sm">
                                <thead>
                                    <tr>
                                        <th>الحالة</th>
                                        <th>العدد</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${Object.entries(report.by_status).map(([key, value]) => `
                                        <tr>
                                            <td>${value.name}</td>
                                            <td><span class="badge bg-secondary">${value.count}</span></td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            `;
        } else {
            // عرض قائمة الوثائق
            resultsContainer.innerHTML = `
                <div class="mb-3">
                    <h6>${report.title}</h6>
                    <p class="text-muted">تم الإنشاء في: ${new Date(report.generated_at).toLocaleString('ar-SA')}</p>
                    <p><strong>إجمالي الوثائق:</strong> ${report.total_count}</p>
                </div>
                
                <div class="table-responsive">
                    <table class="table table-hover">
                        <thead>
                            <tr>
                                <th>رقم الوثيقة</th>
                                <th>العنوان</th>
                                <th>النوع</th>
                                <th>الكيان</th>
                                <th>تاريخ الانتهاء</th>
                                <th>الحالة</th>
                                ${reportType === 'expired' ? '<th>أيام التأخير</th>' : ''}
                                ${reportType === 'expiring_soon' ? '<th>أيام متبقية</th>' : ''}
                            </tr>
                        </thead>
                        <tbody>
                            ${report.documents.map(doc => `
                                <tr>
                                    <td><code>${doc.document_number}</code></td>
                                    <td>${doc.title}</td>
                                    <td>${doc.document_type}</td>
                                    <td>${doc.entity_name}</td>
                                    <td>${new Date(doc.expiry_date).toLocaleDateString('ar-SA')}</td>
                                    <td><span class="badge bg-secondary">${doc.status}</span></td>
                                    ${reportType === 'expired' ? `<td><span class="badge bg-danger">${doc.days_expired}</span></td>` : ''}
                                    ${reportType === 'expiring_soon' ? `<td><span class="badge bg-warning">${doc.days_remaining}</span></td>` : ''}
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        }
    }

    /**
     * تصدير تقرير
     */
    async exportReport() {
        try {
            this.showLoading();
            
            const reportType = document.getElementById('export-report-type').value;
            const documentType = document.getElementById('export-document-type').value;
            const status = document.getElementById('export-status').value;
            
            const response = await fetch('/api/documents/reports/export', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    report_type: reportType,
                    filters: {
                        document_type: documentType,
                        status: status
                    }
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                // تحويل البيانات إلى CSV وتحميلها
                this.downloadCSV(result.data, `تقرير_الوثائق_${new Date().toISOString().split('T')[0]}.csv`);
                this.showAlert(`تم تصدير ${result.total_records} سجل بنجاح`, 'success');
            } else {
                throw new Error(result.message);
            }
            
        } catch (error) {
            console.error('خطأ في تصدير التقرير:', error);
            this.showAlert('خطأ في تصدير التقرير: ' + error.message, 'danger');
        } finally {
            this.hideLoading();
        }
    }

    /**
     * تحميل ملف CSV
     */
    downloadCSV(data, filename) {
        if (!data || data.length === 0) {
            this.showAlert('لا توجد بيانات للتصدير', 'warning');
            return;
        }
        
        // إنشاء رؤوس الأعمدة
        const headers = Object.keys(data[0]);
        let csvContent = headers.join(',') + '\n';
        
        // إضافة البيانات
        data.forEach(row => {
            const values = headers.map(header => {
                const value = row[header] || '';
                return `"${value.toString().replace(/"/g, '""')}"`;
            });
            csvContent += values.join(',') + '\n';
        });
        
        // تحميل الملف
        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    /**
     * رفع ملف للوثيقة
     */
    async uploadDocumentFile(documentId) {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx';
        fileInput.multiple = false;
        
        fileInput.onchange = async (event) => {
            const file = event.target.files[0];
            if (!file) return;
            
            try {
                this.showLoading();
                
                const formData = new FormData();
                formData.append('file', file);
                formData.append('description', 'ملف الوثيقة الأساسي');
                formData.append('is_primary', 'true');
                
                const response = await fetch(`/api/documents/${documentId}/upload`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: formData
                });
                
                const result = await response.json();
                
                if (result.success) {
                    this.showAlert('تم رفع الملف بنجاح', 'success');
                    // إعادة تحميل قائمة الوثائق لإظهار التحديث
                    this.loadDocuments();
                } else {
                    throw new Error(result.message);
                }
                
            } catch (error) {
                console.error('خطأ في رفع الملف:', error);
                this.showAlert('خطأ في رفع الملف: ' + error.message, 'danger');
            } finally {
                this.hideLoading();
            }
        };
        
        fileInput.click();
    }

    /**
     * عرض مرفقات الوثيقة
     */
    async viewDocumentAttachments(documentId) {
        try {
            this.showLoading();
            
            const response = await fetch(`/api/documents/${documentId}/attachments`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                }
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.displayAttachmentsModal(documentId, result.attachments);
            } else {
                throw new Error(result.message);
            }
            
        } catch (error) {
            console.error('خطأ في جلب المرفقات:', error);
            this.showAlert('خطأ في جلب المرفقات: ' + error.message, 'danger');
        } finally {
            this.hideLoading();
        }
    }

    /**
     * عرض نافذة المرفقات
     */
    displayAttachmentsModal(documentId, attachments) {
        const modalContent = `
            <div class="modal fade" id="attachmentsModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">مرفقات الوثيقة</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="mb-3">
                                <button class="btn btn-primary btn-sm" onclick="documentsManager.uploadDocumentFile(${documentId})">
                                    <i class="fas fa-upload me-2"></i>
                                    رفع ملف جديد
                                </button>
                            </div>
                            
                            ${attachments.length === 0 ? 
                                '<div class="text-center text-muted"><p>لا توجد مرفقات</p></div>' :
                                `<div class="table-responsive">
                                    <table class="table table-hover">
                                        <thead>
                                            <tr>
                                                <th>اسم الملف</th>
                                                <th>الحجم</th>
                                                <th>تاريخ الرفع</th>
                                                <th>الإجراءات</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${attachments.map(attachment => `
                                                <tr>
                                                    <td>
                                                        <i class="fas fa-file me-2"></i>
                                                        ${attachment.filename}
                                                        ${attachment.is_primary ? '<span class="badge bg-primary ms-2">أساسي</span>' : ''}
                                                    </td>
                                                    <td>${this.formatFileSize(attachment.file_size)}</td>
                                                    <td>${new Date(attachment.upload_date).toLocaleDateString('ar-SA')}</td>
                                                    <td>
                                                        <button class="btn btn-sm btn-outline-primary me-1" 
                                                                onclick="documentsManager.downloadAttachment(${attachment.id})">
                                                            <i class="fas fa-download"></i>
                                                        </button>
                                                        <button class="btn btn-sm btn-outline-danger" 
                                                                onclick="documentsManager.deleteAttachment(${attachment.id})">
                                                            <i class="fas fa-trash"></i>
                                                        </button>
                                                    </td>
                                                </tr>
                                            `).join('')}
                                        </tbody>
                                    </table>
                                </div>`
                            }
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">إغلاق</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // إزالة النافذة السابقة إن وجدت
        const existingModal = document.getElementById('attachmentsModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // إضافة النافذة الجديدة
        document.body.insertAdjacentHTML('beforeend', modalContent);
        
        // عرض النافذة
        const modal = new bootstrap.Modal(document.getElementById('attachmentsModal'));
        modal.show();
    }

    /**
     * تنسيق حجم الملف
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * تحميل مرفق
     */
    async downloadAttachment(attachmentId) {
        try {
            const response = await fetch(`/api/documents/attachments/${attachmentId}/download`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = 'document_file';
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            } else {
                throw new Error('خطأ في تحميل الملف');
            }
            
        } catch (error) {
            console.error('خطأ في تحميل الملف:', error);
            this.showAlert('خطأ في تحميل الملف: ' + error.message, 'danger');
        }
    }

    /**
     * حذف مرفق
     */
    async deleteAttachment(attachmentId) {
        if (!confirm('هل أنت متأكد من حذف هذا المرفق؟')) {
            return;
        }
        
        try {
            this.showLoading();
            
            const response = await fetch(`/api/documents/attachments/${attachmentId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showAlert('تم حذف المرفق بنجاح', 'success');
                // إغلاق النافذة وإعادة فتحها لإظهار التحديث
                const modal = bootstrap.Modal.getInstance(document.getElementById('attachmentsModal'));
                if (modal) {
                    modal.hide();
                }
            } else {
                throw new Error(result.message);
            }
            
        } catch (error) {
            console.error('خطأ في حذف المرفق:', error);
            this.showAlert('خطأ في حذف المرفق: ' + error.message, 'danger');
        } finally {
            this.hideLoading();
        }
    }
}

// إنشاء مثيل عام
const documentsManager = new DocumentsManager();
