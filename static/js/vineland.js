/**
 * Vineland Adaptive Behavior Scales Management System
 * نظام إدارة مقياس فاين لاند للسلوك التكيفي
 */

class VinelandManager {
    constructor() {
        this.currentAssessmentId = null;
        this.currentDomainId = null;
        this.assessments = [];
        this.students = [];
        this.assessors = [];
        this.domains = [];
        this.init();
    }

    init() {
        this.loadStatistics();
        this.loadAssessments();
        this.loadStudents();
        this.loadAssessors();
        this.loadDomains();
        this.setupEventListeners();
        this.setDefaultDate();
    }

    setupEventListeners() {
        // تحديث الإحصائيات عند تغيير الفلاتر
        document.getElementById('studentFilter').addEventListener('change', () => this.applyFilters());
        document.getElementById('assessorFilter').addEventListener('change', () => this.applyFilters());
        document.getElementById('statusFilter').addEventListener('change', () => this.applyFilters());
        document.getElementById('formTypeFilter').addEventListener('change', () => this.applyFilters());
    }

    setDefaultDate() {
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('assessmentDate').value = today;
    }

    async loadStatistics() {
        try {
            const response = await fetch('/api/vineland/statistics', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const stats = await response.json();
                document.getElementById('totalAssessments').textContent = stats.total_assessments || 0;
                document.getElementById('completedAssessments').textContent = stats.completed_assessments || 0;
                document.getElementById('inProgressAssessments').textContent = stats.in_progress_assessments || 0;
                document.getElementById('activeStudents').textContent = stats.active_students || 0;
            }
        } catch (error) {
            console.error('خطأ في تحميل الإحصائيات:', error);
        }
    }

    async loadAssessments() {
        try {
            this.showLoading();
            const response = await fetch('/api/vineland/assessments', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                this.assessments = await response.json();
                this.displayAssessments(this.assessments);
            } else {
                this.showError('فشل في تحميل التقييمات');
            }
        } catch (error) {
            console.error('خطأ في تحميل التقييمات:', error);
            this.showError('حدث خطأ في تحميل التقييمات');
        } finally {
            this.hideLoading();
        }
    }

    async loadStudents() {
        try {
            const response = await fetch('/api/students', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                this.students = await response.json();
                this.populateStudentSelects();
            }
        } catch (error) {
            console.error('خطأ في تحميل الطلاب:', error);
        }
    }

    async loadAssessors() {
        try {
            const response = await fetch('/api/employees', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                this.assessors = await response.json();
                this.populateAssessorSelects();
            }
        } catch (error) {
            console.error('خطأ في تحميل المقيمين:', error);
        }
    }

    async loadDomains() {
        try {
            const response = await fetch('/api/vineland/domains', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                this.domains = await response.json();
            }
        } catch (error) {
            console.error('خطأ في تحميل المجالات:', error);
        }
    }

    populateStudentSelects() {
        const selects = ['studentSelect', 'studentFilter'];
        selects.forEach(selectId => {
            const select = document.getElementById(selectId);
            if (select) {
                // الاحتفاظ بالخيار الافتراضي
                const defaultOption = select.querySelector('option[value=""]');
                select.innerHTML = '';
                if (defaultOption) {
                    select.appendChild(defaultOption);
                }

                this.students.forEach(student => {
                    const option = document.createElement('option');
                    option.value = student.id;
                    option.textContent = `${student.first_name} ${student.last_name}`;
                    select.appendChild(option);
                });
            }
        });
    }

    populateAssessorSelects() {
        const selects = ['assessorSelect', 'assessorFilter'];
        selects.forEach(selectId => {
            const select = document.getElementById(selectId);
            if (select) {
                // الاحتفاظ بالخيار الافتراضي
                const defaultOption = select.querySelector('option[value=""]');
                select.innerHTML = '';
                if (defaultOption) {
                    select.appendChild(defaultOption);
                }

                this.assessors.forEach(assessor => {
                    const option = document.createElement('option');
                    option.value = assessor.id;
                    option.textContent = `${assessor.first_name} ${assessor.last_name}`;
                    select.appendChild(option);
                });
            }
        });
    }

    displayAssessments(assessments) {
        const tbody = document.getElementById('assessmentsTableBody');
        tbody.innerHTML = '';

        if (assessments.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center text-muted">
                        <i class="fas fa-inbox fa-2x mb-2"></i>
                        <br>لا توجد تقييمات متاحة
                    </td>
                </tr>
            `;
            return;
        }

        assessments.forEach(assessment => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>#${assessment.id}</td>
                <td>${assessment.student_name || 'غير محدد'}</td>
                <td>${assessment.assessor_name || 'غير محدد'}</td>
                <td>${this.formatDate(assessment.assessment_date)}</td>
                <td>${this.getFormTypeLabel(assessment.form_type)}</td>
                <td>${assessment.respondent_name || 'غير محدد'}</td>
                <td>${this.getStatusBadge(assessment.status)}</td>
                <td>
                    <div class="btn-group" role="group">
                        <button class="btn btn-sm btn-outline-primary" onclick="vinelandManager.viewAssessment(${assessment.id})" title="عرض التفاصيل">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-success" onclick="vinelandManager.continueAssessment(${assessment.id})" title="متابعة التقييم">
                            <i class="fas fa-play"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-info" onclick="vinelandManager.generateReport(${assessment.id})" title="إنشاء تقرير">
                            <i class="fas fa-file-alt"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="vinelandManager.deleteAssessment(${assessment.id})" title="حذف">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    getFormTypeLabel(formType) {
        const labels = {
            'comprehensive': 'شامل',
            'survey': 'مسح',
            'teacher': 'معلم'
        };
        return labels[formType] || formType;
    }

    getStatusBadge(status) {
        const badges = {
            'in_progress': '<span class="badge bg-warning">قيد التنفيذ</span>',
            'completed': '<span class="badge bg-success">مكتمل</span>',
            'cancelled': '<span class="badge bg-danger">ملغي</span>'
        };
        return badges[status] || `<span class="badge bg-secondary">${status}</span>`;
    }

    formatDate(dateString) {
        if (!dateString) return 'غير محدد';
        const date = new Date(dateString);
        return date.toLocaleDateString('ar-SA');
    }

    async createAssessment() {
        const form = document.getElementById('newAssessmentForm');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const assessmentData = {
            student_id: document.getElementById('studentSelect').value,
            assessor_id: document.getElementById('assessorSelect').value,
            assessment_date: document.getElementById('assessmentDate').value,
            assessment_type: document.getElementById('assessmentType').value,
            form_type: document.getElementById('formType').value,
            assessment_setting: document.getElementById('assessmentSetting').value,
            respondent_name: document.getElementById('respondentName').value,
            respondent_relationship: document.getElementById('respondentRelationship').value,
            notes: document.getElementById('assessmentNotes').value
        };

        try {
            this.showLoading();
            const response = await fetch('/api/vineland/assessments', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(assessmentData)
            });

            if (response.ok) {
                const result = await response.json();
                this.showSuccess('تم إنشاء التقييم بنجاح');
                
                // إغلاق النموذج وإعادة تحميل البيانات
                const modal = bootstrap.Modal.getInstance(document.getElementById('newAssessmentModal'));
                modal.hide();
                form.reset();
                this.setDefaultDate();
                
                await this.loadAssessments();
                await this.loadStatistics();
            } else {
                const error = await response.json();
                this.showError(error.message || 'فشل في إنشاء التقييم');
            }
        } catch (error) {
            console.error('خطأ في إنشاء التقييم:', error);
            this.showError('حدث خطأ في إنشاء التقييم');
        } finally {
            this.hideLoading();
        }
    }

    async viewAssessment(assessmentId) {
        try {
            this.showLoading();
            const response = await fetch(`/api/vineland/assessments/${assessmentId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const assessment = await response.json();
                this.displayAssessmentDetails(assessment);
                
                const modal = new bootstrap.Modal(document.getElementById('assessmentDetailsModal'));
                modal.show();
            } else {
                this.showError('فشل في تحميل تفاصيل التقييم');
            }
        } catch (error) {
            console.error('خطأ في عرض التقييم:', error);
            this.showError('حدث خطأ في عرض التقييم');
        } finally {
            this.hideLoading();
        }
    }

    displayAssessmentDetails(assessment) {
        const content = document.getElementById('assessmentDetailsContent');
        content.innerHTML = `
            <div class="row">
                <div class="col-md-6">
                    <h6 class="text-primary">معلومات أساسية</h6>
                    <table class="table table-sm">
                        <tr><td><strong>رقم التقييم:</strong></td><td>#${assessment.id}</td></tr>
                        <tr><td><strong>الطالب:</strong></td><td>${assessment.student_name}</td></tr>
                        <tr><td><strong>المقيم:</strong></td><td>${assessment.assessor_name}</td></tr>
                        <tr><td><strong>تاريخ التقييم:</strong></td><td>${this.formatDate(assessment.assessment_date)}</td></tr>
                        <tr><td><strong>نوع التقييم:</strong></td><td>${assessment.assessment_type}</td></tr>
                        <tr><td><strong>نوع النموذج:</strong></td><td>${this.getFormTypeLabel(assessment.form_type)}</td></tr>
                    </table>
                </div>
                <div class="col-md-6">
                    <h6 class="text-primary">معلومات المجيب</h6>
                    <table class="table table-sm">
                        <tr><td><strong>اسم المجيب:</strong></td><td>${assessment.respondent_name || 'غير محدد'}</td></tr>
                        <tr><td><strong>العلاقة:</strong></td><td>${assessment.respondent_relationship || 'غير محدد'}</td></tr>
                        <tr><td><strong>مكان التقييم:</strong></td><td>${assessment.assessment_setting || 'غير محدد'}</td></tr>
                        <tr><td><strong>الحالة:</strong></td><td>${this.getStatusBadge(assessment.status)}</td></tr>
                        <tr><td><strong>تاريخ الإنشاء:</strong></td><td>${this.formatDate(assessment.created_at)}</td></tr>
                    </table>
                </div>
            </div>
            
            ${assessment.notes ? `
                <div class="mt-3">
                    <h6 class="text-primary">الملاحظات</h6>
                    <p class="text-muted">${assessment.notes}</p>
                </div>
            ` : ''}
            
            ${assessment.domain_results && assessment.domain_results.length > 0 ? `
                <div class="mt-3">
                    <h6 class="text-primary">نتائج المجالات</h6>
                    <div class="row">
                        ${assessment.domain_results.map(result => `
                            <div class="col-md-6 mb-2">
                                <div class="card">
                                    <div class="card-body">
                                        <h6 class="card-title">${result.domain_name}</h6>
                                        <p class="card-text">
                                            <strong>الدرجة الخام:</strong> ${result.raw_score}/${result.max_possible_score}<br>
                                            <strong>V-Scale:</strong> ${result.v_scale_score}<br>
                                            <strong>المئيني:</strong> ${result.percentile_rank}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
        `;

        // إعداد الأزرار
        this.currentAssessmentId = assessment.id;
        const continueBtn = document.getElementById('continueAssessmentBtn');
        const reportBtn = document.getElementById('generateReportBtn');
        
        continueBtn.style.display = assessment.status === 'completed' ? 'none' : 'inline-block';
        reportBtn.style.display = assessment.status === 'completed' ? 'inline-block' : 'none';
    }

    async continueAssessment(assessmentId = null) {
        const id = assessmentId || this.currentAssessmentId;
        if (!id) return;

        try {
            // إغلاق نموذج التفاصيل إذا كان مفتوحاً
            const detailsModal = bootstrap.Modal.getInstance(document.getElementById('assessmentDetailsModal'));
            if (detailsModal) {
                detailsModal.hide();
            }

            // فتح نموذج تقييم المجالات
            this.currentAssessmentId = id;
            await this.loadDomainAssessment(id);
            
            const modal = new bootstrap.Modal(document.getElementById('domainAssessmentModal'));
            modal.show();
        } catch (error) {
            console.error('خطأ في متابعة التقييم:', error);
            this.showError('حدث خطأ في متابعة التقييم');
        }
    }

    async loadDomainAssessment(assessmentId) {
        // تحميل عناصر كل مجال
        const domains = ['communication', 'daily-living', 'socialization', 'motor-skills'];
        
        for (const domain of domains) {
            await this.loadDomainItems(assessmentId, domain);
        }
    }

    async loadDomainItems(assessmentId, domainCode) {
        try {
            const response = await fetch(`/api/vineland/assessments/${assessmentId}/domains/${domainCode}/items`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const items = await response.json();
                this.displayDomainItems(domainCode, items);
            }
        } catch (error) {
            console.error(`خطأ في تحميل عناصر ${domainCode}:`, error);
        }
    }

    displayDomainItems(domainCode, items) {
        const containerId = domainCode === 'daily-living' ? 'dailyLivingItems' : 
                          domainCode === 'motor-skills' ? 'motorSkillsItems' :
                          domainCode + 'Items';
        
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = items.map(item => `
            <div class="card mb-2">
                <div class="card-body">
                    <div class="row align-items-center">
                        <div class="col-md-8">
                            <h6 class="card-title">${item.item_number}. ${item.item_text_ar}</h6>
                        </div>
                        <div class="col-md-4">
                            <div class="btn-group" role="group">
                                <input type="radio" class="btn-check" name="item_${item.id}" id="item_${item.id}_0" value="0" ${item.response === 0 ? 'checked' : ''}>
                                <label class="btn btn-outline-danger" for="item_${item.id}_0">لا يفعل (0)</label>
                                
                                <input type="radio" class="btn-check" name="item_${item.id}" id="item_${item.id}_1" value="1" ${item.response === 1 ? 'checked' : ''}>
                                <label class="btn btn-outline-warning" for="item_${item.id}_1">أحياناً (1)</label>
                                
                                <input type="radio" class="btn-check" name="item_${item.id}" id="item_${item.id}_2" value="2" ${item.response === 2 ? 'checked' : ''}>
                                <label class="btn btn-outline-success" for="item_${item.id}_2">عادة (2)</label>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    async saveDomainProgress() {
        if (!this.currentAssessmentId) return;

        const responses = [];
        const radioGroups = document.querySelectorAll('input[type="radio"]:checked');
        
        radioGroups.forEach(radio => {
            const itemId = radio.name.split('_')[1];
            const score = parseInt(radio.value);
            responses.push({ item_id: itemId, raw_score: score });
        });

        try {
            this.showLoading();
            const response = await fetch(`/api/vineland/assessments/${this.currentAssessmentId}/responses`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ responses })
            });

            if (response.ok) {
                this.showSuccess('تم حفظ التقدم بنجاح');
            } else {
                this.showError('فشل في حفظ التقدم');
            }
        } catch (error) {
            console.error('خطأ في حفظ التقدم:', error);
            this.showError('حدث خطأ في حفظ التقدم');
        } finally {
            this.hideLoading();
        }
    }

    async completeDomainAssessment() {
        if (!this.currentAssessmentId) return;

        // حفظ التقدم أولاً
        await this.saveDomainProgress();

        try {
            const response = await fetch(`/api/vineland/assessments/${this.currentAssessmentId}/complete`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                this.showSuccess('تم إكمال التقييم بنجاح');
                
                // إغلاق النموذج وإعادة تحميل البيانات
                const modal = bootstrap.Modal.getInstance(document.getElementById('domainAssessmentModal'));
                modal.hide();
                
                await this.loadAssessments();
                await this.loadStatistics();
            } else {
                this.showError('فشل في إكمال التقييم');
            }
        } catch (error) {
            console.error('خطأ في إكمال التقييم:', error);
            this.showError('حدث خطأ في إكمال التقييم');
        }
    }

    async generateReport(assessmentId = null) {
        const id = assessmentId || this.currentAssessmentId;
        if (!id) return;

        try {
            this.showLoading();
            const response = await fetch(`/api/vineland/assessments/${id}/report`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const result = await response.json();
                this.showSuccess('تم إنشاء التقرير بنجاح');
                
                // فتح التقرير في نافذة جديدة
                window.open(`/api/vineland/reports/${result.report_id}/download`, '_blank');
            } else {
                this.showError('فشل في إنشاء التقرير');
            }
        } catch (error) {
            console.error('خطأ في إنشاء التقرير:', error);
            this.showError('حدث خطأ في إنشاء التقرير');
        } finally {
            this.hideLoading();
        }
    }

    async deleteAssessment(assessmentId) {
        if (!confirm('هل أنت متأكد من حذف هذا التقييم؟ لا يمكن التراجع عن هذا الإجراء.')) {
            return;
        }

        try {
            this.showLoading();
            const response = await fetch(`/api/vineland/assessments/${assessmentId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                this.showSuccess('تم حذف التقييم بنجاح');
                await this.loadAssessments();
                await this.loadStatistics();
            } else {
                this.showError('فشل في حذف التقييم');
            }
        } catch (error) {
            console.error('خطأ في حذف التقييم:', error);
            this.showError('حدث خطأ في حذف التقييم');
        } finally {
            this.hideLoading();
        }
    }

    applyFilters() {
        const studentId = document.getElementById('studentFilter').value;
        const assessorId = document.getElementById('assessorFilter').value;
        const status = document.getElementById('statusFilter').value;
        const formType = document.getElementById('formTypeFilter').value;

        let filteredAssessments = [...this.assessments];

        if (studentId) {
            filteredAssessments = filteredAssessments.filter(a => a.student_id == studentId);
        }
        if (assessorId) {
            filteredAssessments = filteredAssessments.filter(a => a.assessor_id == assessorId);
        }
        if (status) {
            filteredAssessments = filteredAssessments.filter(a => a.status === status);
        }
        if (formType) {
            filteredAssessments = filteredAssessments.filter(a => a.form_type === formType);
        }

        this.displayAssessments(filteredAssessments);
    }

    clearFilters() {
        document.getElementById('studentFilter').value = '';
        document.getElementById('assessorFilter').value = '';
        document.getElementById('statusFilter').value = '';
        document.getElementById('formTypeFilter').value = '';
        this.displayAssessments(this.assessments);
    }

    showLoading() {
        const modal = new bootstrap.Modal(document.getElementById('loadingModal'));
        modal.show();
    }

    hideLoading() {
        const modal = bootstrap.Modal.getInstance(document.getElementById('loadingModal'));
        if (modal) {
            modal.hide();
        }
    }

    showSuccess(message) {
        // يمكن استخدام مكتبة للإشعارات مثل Toastr
        alert(message);
    }

    showError(message) {
        // يمكن استخدام مكتبة للإشعارات مثل Toastr
        alert(message);
    }
}

// إنشاء مثيل عام للمدير
let vinelandManager;

// تهيئة النظام عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', function() {
    vinelandManager = new VinelandManager();
});

// دوال عامة للاستخدام من HTML
function createAssessment() {
    vinelandManager.createAssessment();
}

function applyFilters() {
    vinelandManager.applyFilters();
}

function clearFilters() {
    vinelandManager.clearFilters();
}

function saveDomainProgress() {
    vinelandManager.saveDomainProgress();
}

function completeDomainAssessment() {
    vinelandManager.completeDomainAssessment();
}

function continueAssessment() {
    vinelandManager.continueAssessment();
}

function generateReport() {
    vinelandManager.generateReport();
}
