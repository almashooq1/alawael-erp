class PsychologicalAssessmentManager {
    constructor() {
        this.assessments = [];
        this.assessmentTypes = [];
        this.beneficiaries = [];
        this.assessors = [];
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.totalPages = 1;
        this.filters = {
            search: '',
            type: '',
            status: '',
            priority: '',
            assessor: ''
        };
    }

    async init() {
        try {
            await this.loadAssessmentTypes();
            await this.loadBeneficiaries();
            await this.loadAssessors();
            await this.loadAssessments();
            this.setupEventListeners();
            this.updateStatistics();
        } catch (error) {
            console.error('Error initializing assessment manager:', error);
            this.showAlert('خطأ في تحميل البيانات', 'error');
        }
    }

    setupEventListeners() {
        // Search input
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.filters.search = e.target.value;
            this.debounceSearch();
        });

        // Filter selects
        ['typeFilter', 'statusFilter', 'priorityFilter', 'assessorFilter'].forEach(id => {
            document.getElementById(id).addEventListener('change', (e) => {
                const filterType = id.replace('Filter', '');
                this.filters[filterType] = e.target.value;
                this.applyFilters();
            });
        });

        // Set default date
        const today = new Date().toISOString().split('T')[0];
        document.querySelectorAll('input[name="assessment_date"]').forEach(input => {
            input.value = today;
        });
    }

    debounceSearch() {
        clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(() => {
            this.applyFilters();
        }, 500);
    }

    async loadAssessmentTypes() {
        try {
            const response = await fetch('/api/psychological-assessments/types', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                this.assessmentTypes = await response.json();
                this.populateAssessmentTypeSelects();
            }
        } catch (error) {
            console.error('Error loading assessment types:', error);
        }
    }

    async loadBeneficiaries() {
        try {
            const response = await fetch('/api/rehabilitation/beneficiaries', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.beneficiaries = data.data || [];
                this.populateBeneficiarySelects();
            }
        } catch (error) {
            console.error('Error loading beneficiaries:', error);
        }
    }

    async loadAssessors() {
        try {
            const response = await fetch('/api/users?role=therapist,psychologist', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.assessors = data.users || [];
                this.populateAssessorSelects();
            }
        } catch (error) {
            console.error('Error loading assessors:', error);
        }
    }

    async loadAssessments(page = 1) {
        try {
            const params = new URLSearchParams({
                page: page,
                per_page: this.itemsPerPage,
                ...this.filters
            });

            const response = await fetch(`/api/psychological-assessments?${params}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.assessments = data.assessments || [];
                this.currentPage = data.pagination?.page || 1;
                this.totalPages = data.pagination?.pages || 1;
                
                this.renderAssessments();
                this.renderPagination();
                this.updateStatistics();
            }
        } catch (error) {
            console.error('Error loading assessments:', error);
            this.showAlert('خطأ في تحميل التقييمات', 'error');
        }
    }

    populateAssessmentTypeSelects() {
        const selects = document.querySelectorAll('select[name="assessment_type_id"]');
        selects.forEach(select => {
            const firstOption = select.querySelector('option');
            select.innerHTML = '';
            if (firstOption) select.appendChild(firstOption);

            this.assessmentTypes.forEach(type => {
                const option = document.createElement('option');
                option.value = type.id;
                option.textContent = type.name;
                select.appendChild(option);
            });
        });
    }

    populateBeneficiarySelects() {
        const selects = document.querySelectorAll('select[name="beneficiary_id"]');
        selects.forEach(select => {
            const firstOption = select.querySelector('option');
            select.innerHTML = '';
            if (firstOption) select.appendChild(firstOption);

            this.beneficiaries.forEach(beneficiary => {
                const option = document.createElement('option');
                option.value = beneficiary.id;
                option.textContent = `${beneficiary.first_name} ${beneficiary.last_name}`;
                select.appendChild(option);
            });
        });
    }

    populateAssessorSelects() {
        const select = document.getElementById('assessorFilter');
        const firstOption = select.querySelector('option');
        select.innerHTML = '';
        if (firstOption) select.appendChild(firstOption);

        this.assessors.forEach(assessor => {
            const option = document.createElement('option');
            option.value = assessor.id;
            option.textContent = `${assessor.first_name} ${assessor.last_name}`;
            select.appendChild(option);
        });
    }

    renderAssessments() {
        const container = document.getElementById('assessmentsContainer');
        
        if (this.assessments.length === 0) {
            container.innerHTML = `
                <div class="text-center py-5">
                    <i class="fas fa-brain fa-3x text-muted mb-3"></i>
                    <h5 class="text-muted">لا توجد تقييمات</h5>
                    <p class="text-muted">لم يتم العثور على تقييمات مطابقة للمعايير المحددة</p>
                </div>
            `;
            return;
        }

        const assessmentsHtml = this.assessments.map(assessment => `
            <div class="assessment-card position-relative">
                <div class="priority-indicator priority-${assessment.priority}"></div>
                
                <div class="d-flex justify-content-between align-items-start mb-3">
                    <div>
                        <h5 class="mb-1">${assessment.beneficiary_name}</h5>
                        <span class="assessment-type type-${assessment.assessment_type.category}">
                            ${assessment.assessment_type.name}
                        </span>
                    </div>
                    <div class="text-end">
                        <span class="assessment-status status-${assessment.status}">
                            ${this.getStatusText(assessment.status)}
                        </span>
                        <br>
                        <small class="text-muted">${this.formatDate(assessment.assessment_date)}</small>
                    </div>
                </div>
                
                <div class="row mb-3">
                    <div class="col-md-6">
                        <small class="text-muted">المقيم:</small>
                        <span>${assessment.assessor_name || 'غير محدد'}</span>
                    </div>
                    <div class="col-md-6">
                        <small class="text-muted">الأولوية:</small>
                        <span class="priority-${assessment.priority}">
                            ${this.getPriorityText(assessment.priority)}
                        </span>
                    </div>
                </div>
                
                ${assessment.purpose ? `
                    <div class="mb-3">
                        <small class="text-muted">الهدف:</small>
                        <p class="mb-0">${assessment.purpose}</p>
                    </div>
                ` : ''}
                
                ${assessment.results ? `
                    <div class="assessment-details">
                        <h6>النتائج:</h6>
                        <p class="mb-2">${assessment.results}</p>
                        
                        ${assessment.recommendations ? `
                            <h6>التوصيات:</h6>
                            <p class="mb-2">${assessment.recommendations}</p>
                        ` : ''}
                        
                        ${assessment.score ? `
                            <div class="d-flex align-items-center">
                                <span class="me-2">الدرجة:</span>
                                <div class="progress flex-grow-1 me-2" style="height: 20px;">
                                    <div class="progress-bar" style="width: ${assessment.score}%">${assessment.score}%</div>
                                </div>
                            </div>
                        ` : ''}
                        
                        ${assessment.social_barriers ? `
                            <div class="mt-2">
                                <small class="text-muted">العوائق الاجتماعية:</small>
                                <div class="mt-1">
                                    ${this.renderSocialBarriers(assessment.social_barriers)}
                                </div>
                            </div>
                        ` : ''}
                    </div>
                ` : ''}
                
                <div class="d-flex gap-2 mt-3">
                    <button class="btn btn-sm btn-outline-primary" onclick="assessmentManager.viewAssessment(${assessment.id})" title="عرض التفاصيل">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-secondary" onclick="assessmentManager.editAssessment(${assessment.id})" title="تعديل">
                        <i class="fas fa-edit"></i>
                    </button>
                    ${assessment.status !== 'completed' ? `
                        <button class="btn btn-sm btn-outline-success" onclick="assessmentManager.showCompleteModal(${assessment.id})" title="إكمال التقييم">
                            <i class="fas fa-check"></i>
                        </button>
                    ` : ''}
                    ${assessment.status === 'completed' ? `
                        <button class="btn btn-sm btn-outline-info" onclick="assessmentManager.generateReport(${assessment.id})" title="تقرير">
                            <i class="fas fa-file-pdf"></i>
                        </button>
                    ` : ''}
                    <button class="btn btn-sm btn-outline-danger" onclick="assessmentManager.deleteAssessment(${assessment.id})" title="حذف">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');

        container.innerHTML = assessmentsHtml;
    }

    renderSocialBarriers(barriers) {
        if (typeof barriers === 'string') {
            try {
                barriers = JSON.parse(barriers);
            } catch {
                return `<span class="barrier-tag">${barriers}</span>`;
            }
        }

        if (typeof barriers === 'object' && barriers !== null) {
            return Object.entries(barriers).map(([key, value]) => 
                `<span class="barrier-tag">${key}: ${value}</span>`
            ).join(' ');
        }

        return '';
    }

    renderPagination() {
        const pagination = document.getElementById('assessmentsPagination');
        if (this.totalPages <= 1) {
            pagination.innerHTML = '';
            return;
        }

        let paginationHtml = '';
        
        // Previous button
        paginationHtml += `
            <li class="page-item ${this.currentPage === 1 ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="assessmentManager.loadAssessments(${this.currentPage - 1})">السابق</a>
            </li>
        `;

        // Page numbers
        const startPage = Math.max(1, this.currentPage - 2);
        const endPage = Math.min(this.totalPages, this.currentPage + 2);

        for (let i = startPage; i <= endPage; i++) {
            paginationHtml += `
                <li class="page-item ${i === this.currentPage ? 'active' : ''}">
                    <a class="page-link" href="#" onclick="assessmentManager.loadAssessments(${i})">${i}</a>
                </li>
            `;
        }

        // Next button
        paginationHtml += `
            <li class="page-item ${this.currentPage === this.totalPages ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="assessmentManager.loadAssessments(${this.currentPage + 1})">التالي</a>
            </li>
        `;

        pagination.innerHTML = paginationHtml;
    }

    updateStatistics() {
        const stats = {
            total: this.assessments.length,
            completed: this.assessments.filter(a => a.status === 'completed').length,
            pending: this.assessments.filter(a => a.status === 'pending').length,
            followUp: this.assessments.filter(a => a.status === 'follow_up').length
        };

        document.getElementById('totalAssessments').textContent = stats.total;
        document.getElementById('completedAssessments').textContent = stats.completed;
        document.getElementById('pendingAssessments').textContent = stats.pending;
        document.getElementById('followUpAssessments').textContent = stats.followUp;
    }

    getStatusText(status) {
        const statusMap = {
            'pending': 'معلق',
            'in_progress': 'قيد التنفيذ',
            'completed': 'مكتمل',
            'follow_up': 'يحتاج متابعة'
        };
        return statusMap[status] || status;
    }

    getPriorityText(priority) {
        const priorityMap = {
            'high': 'عالية',
            'medium': 'متوسطة',
            'low': 'منخفضة'
        };
        return priorityMap[priority] || priority;
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('ar-SA');
    }

    applyFilters() {
        this.currentPage = 1;
        this.loadAssessments();
    }

    clearFilters() {
        this.filters = {
            search: '',
            type: '',
            status: '',
            priority: '',
            assessor: ''
        };
        
        document.getElementById('searchInput').value = '';
        document.getElementById('typeFilter').value = '';
        document.getElementById('statusFilter').value = '';
        document.getElementById('priorityFilter').value = '';
        document.getElementById('assessorFilter').value = '';
        
        this.loadAssessments();
    }

    showAddAssessmentModal() {
        document.getElementById('addAssessmentForm').reset();
        const today = new Date().toISOString().split('T')[0];
        document.querySelector('#addAssessmentForm input[name="assessment_date"]').value = today;
        
        const modal = new bootstrap.Modal(document.getElementById('addAssessmentModal'));
        modal.show();
    }

    async saveAssessment() {
        const form = document.getElementById('addAssessmentForm');
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        try {
            const response = await fetch('/api/psychological-assessments', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                this.showAlert('تم إضافة التقييم بنجاح', 'success');
                bootstrap.Modal.getInstance(document.getElementById('addAssessmentModal')).hide();
                this.loadAssessments();
            } else {
                const error = await response.json();
                this.showAlert(error.error || 'خطأ في إضافة التقييم', 'error');
            }
        } catch (error) {
            console.error('Error saving assessment:', error);
            this.showAlert('خطأ في الاتصال بالخادم', 'error');
        }
    }

    showCompleteModal(assessmentId) {
        const assessment = this.assessments.find(a => a.id === assessmentId);
        if (!assessment) return;

        document.getElementById('completeAssessmentForm').reset();
        document.querySelector('#completeAssessmentForm input[name="assessment_id"]').value = assessmentId;
        
        const modal = new bootstrap.Modal(document.getElementById('completeAssessmentModal'));
        modal.show();
    }

    async completeAssessment() {
        const form = document.getElementById('completeAssessmentForm');
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        const assessmentId = data.assessment_id;
        delete data.assessment_id;

        // Process social_barriers
        if (data.social_barriers) {
            try {
                data.social_barriers = JSON.parse(data.social_barriers);
            } catch {
                // Keep as string if not valid JSON
            }
        }

        try {
            const response = await fetch(`/api/psychological-assessments/${assessmentId}/complete`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                this.showAlert('تم إكمال التقييم بنجاح', 'success');
                bootstrap.Modal.getInstance(document.getElementById('completeAssessmentModal')).hide();
                this.loadAssessments();
            } else {
                const error = await response.json();
                this.showAlert(error.error || 'خطأ في إكمال التقييم', 'error');
            }
        } catch (error) {
            console.error('Error completing assessment:', error);
            this.showAlert('خطأ في الاتصال بالخادم', 'error');
        }
    }

    async viewAssessment(assessmentId) {
        try {
            const response = await fetch(`/api/psychological-assessments/${assessmentId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const assessment = await response.json();
                this.renderAssessmentDetails(assessment);
                const modal = new bootstrap.Modal(document.getElementById('assessmentDetailsModal'));
                modal.show();
            }
        } catch (error) {
            console.error('Error loading assessment details:', error);
            this.showAlert('خطأ في تحميل تفاصيل التقييم', 'error');
        }
    }

    renderAssessmentDetails(assessment) {
        const content = document.getElementById('assessmentDetailsContent');
        content.innerHTML = `
            <div class="row">
                <div class="col-md-6">
                    <h6>معلومات أساسية</h6>
                    <table class="table table-sm">
                        <tr><td>المستفيد:</td><td>${assessment.beneficiary_name}</td></tr>
                        <tr><td>نوع التقييم:</td><td>${assessment.assessment_type.name}</td></tr>
                        <tr><td>تاريخ التقييم:</td><td>${this.formatDate(assessment.assessment_date)}</td></tr>
                        <tr><td>الحالة:</td><td><span class="assessment-status status-${assessment.status}">${this.getStatusText(assessment.status)}</span></td></tr>
                        <tr><td>الأولوية:</td><td>${this.getPriorityText(assessment.priority)}</td></tr>
                        <tr><td>المقيم:</td><td>${assessment.assessor_name || 'غير محدد'}</td></tr>
                    </table>
                </div>
                <div class="col-md-6">
                    <h6>الهدف</h6>
                    <p>${assessment.purpose || 'غير محدد'}</p>
                    
                    ${assessment.initial_notes ? `
                        <h6>الملاحظات الأولية</h6>
                        <p>${assessment.initial_notes}</p>
                    ` : ''}
                </div>
            </div>
            
            ${assessment.results ? `
                <hr>
                <h6>النتائج</h6>
                <p>${assessment.results}</p>
                
                ${assessment.recommendations ? `
                    <h6>التوصيات</h6>
                    <p>${assessment.recommendations}</p>
                ` : ''}
                
                ${assessment.score ? `
                    <h6>الدرجة</h6>
                    <div class="progress" style="height: 25px;">
                        <div class="progress-bar" style="width: ${assessment.score}%">${assessment.score}%</div>
                    </div>
                ` : ''}
                
                ${assessment.social_barriers ? `
                    <h6>العوائق الاجتماعية</h6>
                    <div>${this.renderSocialBarriers(assessment.social_barriers)}</div>
                ` : ''}
                
                ${assessment.notes ? `
                    <h6>ملاحظات إضافية</h6>
                    <p>${assessment.notes}</p>
                ` : ''}
            ` : ''}
        `;
    }

    editAssessment(assessmentId) {
        // Implement assessment editing
        console.log('Edit assessment:', assessmentId);
    }

    async deleteAssessment(assessmentId) {
        if (!confirm('هل أنت متأكد من حذف هذا التقييم؟')) return;

        try {
            const response = await fetch(`/api/psychological-assessments/${assessmentId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                this.showAlert('تم حذف التقييم بنجاح', 'success');
                this.loadAssessments();
            } else {
                const error = await response.json();
                this.showAlert(error.error || 'خطأ في حذف التقييم', 'error');
            }
        } catch (error) {
            console.error('Error deleting assessment:', error);
            this.showAlert('خطأ في الاتصال بالخادم', 'error');
        }
    }

    generateReport(assessmentId) {
        // Implement report generation
        console.log('Generate report for assessment:', assessmentId);
    }

    exportAssessments() {
        // Implement export functionality
        console.log('Export assessments');
    }

    showAssessmentTypesSection() {
        // Implement assessment types management
        console.log('Show assessment types section');
    }

    showReportsSection() {
        // Implement reports section
        console.log('Show reports section');
    }

    showStatisticsSection() {
        // Implement statistics section
        console.log('Show statistics section');
    }

    saveAssessmentType() {
        // Implement assessment type saving
        console.log('Save assessment type');
    }

    showAlert(message, type = 'info') {
        const alertClass = type === 'error' ? 'alert-danger' : 
                          type === 'success' ? 'alert-success' : 'alert-info';
        
        const alertHtml = `
            <div class="alert ${alertClass} alert-dismissible fade show" role="alert">
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;
        
        const container = document.querySelector('.main-content');
        container.insertAdjacentHTML('afterbegin', alertHtml);
        
        setTimeout(() => {
            const alert = container.querySelector('.alert');
            if (alert) {
                const bsAlert = new bootstrap.Alert(alert);
                bsAlert.close();
            }
        }, 5000);
    }
}

// Initialize the assessment manager
const assessmentManager = new PsychologicalAssessmentManager();
