// مقياس فاندربلت - JavaScript

let currentAssessmentId = null;
let currentDomains = [];
let assessmentData = {};

// تحميل الصفحة
document.addEventListener('DOMContentLoaded', function() {
    loadStatistics();
    loadAssessments();
    loadStudents();
    loadAssessors();
    loadDomains();
    
    // تعيين التاريخ الحالي
    document.getElementById('newAssessmentDate').value = new Date().toISOString().split('T')[0];
});

// تحميل الإحصائيات
async function loadStatistics() {
    try {
        const response = await fetch('/api/vanderbilt/statistics', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const stats = await response.json();
            document.getElementById('totalAssessments').textContent = stats.total || 0;
            document.getElementById('inProgressAssessments').textContent = stats.in_progress || 0;
            document.getElementById('completedAssessments').textContent = stats.completed || 0;
            document.getElementById('severeAssessments').textContent = stats.severe || 0;
        }
    } catch (error) {
        console.error('خطأ في تحميل الإحصائيات:', error);
    }
}

// تحميل التقييمات
async function loadAssessments() {
    showLoading(true);
    try {
        const response = await fetch('/api/vanderbilt/assessments', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const assessments = await response.json();
            displayAssessments(assessments);
        } else {
            showError('فشل في تحميل التقييمات');
        }
    } catch (error) {
        console.error('خطأ في تحميل التقييمات:', error);
        showError('خطأ في الاتصال بالخادم');
    } finally {
        showLoading(false);
    }
}

// عرض التقييمات
function displayAssessments(assessments) {
    const container = document.getElementById('assessmentsList');
    
    if (assessments.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-clipboard-check fa-3x text-muted mb-3"></i>
                <h5 class="text-muted">لا توجد تقييمات</h5>
                <p class="text-muted">ابدأ بإنشاء تقييم جديد باستخدام مقياس فاندربلت</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = assessments.map(assessment => `
        <div class="assessment-card">
            <div class="row align-items-center">
                <div class="col-md-2">
                    <h6 class="mb-1">${assessment.student_name}</h6>
                    <small class="text-muted">رقم الهوية: ${assessment.student_id_number}</small>
                </div>
                <div class="col-md-2">
                    <small class="text-muted">المقيم</small>
                    <div>${assessment.assessor_name}</div>
                    <small class="text-muted">${assessment.rater_name || ''}</small>
                </div>
                <div class="col-md-1">
                    <small class="text-muted">التاريخ</small>
                    <div>${formatDate(assessment.assessment_date)}</div>
                </div>
                <div class="col-md-1">
                    <span class="form-type-badge form-${assessment.form_type}">
                        ${getFormTypeText(assessment.form_type)}
                    </span>
                    <div><small class="text-muted">${getAssessmentTypeText(assessment.assessment_type)}</small></div>
                </div>
                <div class="col-md-2">
                    <span class="status-badge status-${assessment.status}">
                        ${getStatusText(assessment.status)}
                    </span>
                    ${assessment.severity_level ? `
                        <div class="mt-1">
                            <span class="severity-indicator severity-${assessment.severity_level}"></span>
                            ${getSeverityText(assessment.severity_level)}
                        </div>
                    ` : ''}
                </div>
                <div class="col-md-2">
                    ${assessment.adhd_likelihood ? `
                        <small class="text-muted">احتمالية ADHD</small>
                        <div class="fw-bold text-${getLikelihoodColor(assessment.adhd_likelihood)}">${getLikelihoodText(assessment.adhd_likelihood)}</div>
                    ` : '<small class="text-muted">غير مكتمل</small>'}
                </div>
                <div class="col-md-2">
                    <div class="dropdown">
                        <button class="btn btn-sm btn-outline-secondary dropdown-toggle" data-bs-toggle="dropdown">
                            <i class="fas fa-ellipsis-v"></i>
                        </button>
                        <ul class="dropdown-menu">
                            <li><a class="dropdown-item" href="#" onclick="viewAssessmentDetails(${assessment.id})">
                                <i class="fas fa-eye me-2"></i>عرض التفاصيل
                            </a></li>
                            ${assessment.status === 'in_progress' ? `
                                <li><a class="dropdown-item" href="#" onclick="continueAssessment(${assessment.id})">
                                    <i class="fas fa-play me-2"></i>متابعة التقييم
                                </a></li>
                            ` : ''}
                            ${assessment.status === 'completed' ? `
                                <li><a class="dropdown-item" href="#" onclick="generateReport(${assessment.id})">
                                    <i class="fas fa-file-pdf me-2"></i>تقرير
                                </a></li>
                            ` : ''}
                            <li><hr class="dropdown-divider"></li>
                            <li><a class="dropdown-item text-danger" href="#" onclick="deleteAssessment(${assessment.id})">
                                <i class="fas fa-trash me-2"></i>حذف
                            </a></li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

// تحميل الطلاب والمقيمين
async function loadStudents() {
    try {
        const response = await fetch('/api/students', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const students = await response.json();
            const selects = ['studentFilter', 'newStudentId'];
            
            selects.forEach(selectId => {
                const select = document.getElementById(selectId);
                if (select) {
                    const currentValue = select.value;
                    select.innerHTML = selectId.includes('Filter') ? '<option value="">جميع الطلاب</option>' : '<option value="">اختر الطالب</option>';
                    
                    students.forEach(student => {
                        select.innerHTML += `<option value="${student.id}">${student.name} - ${student.id_number}</option>`;
                    });
                    
                    if (currentValue) select.value = currentValue;
                }
            });
        }
    } catch (error) {
        console.error('خطأ في تحميل الطلاب:', error);
    }
}

async function loadAssessors() {
    try {
        const response = await fetch('/api/employees', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const assessors = await response.json();
            const selects = ['assessorFilter', 'newAssessorId'];
            
            selects.forEach(selectId => {
                const select = document.getElementById(selectId);
                if (select) {
                    const currentValue = select.value;
                    select.innerHTML = selectId.includes('Filter') ? '<option value="">جميع المقيمين</option>' : '<option value="">اختر المقيم</option>';
                    
                    assessors.forEach(assessor => {
                        select.innerHTML += `<option value="${assessor.id}">${assessor.name}</option>`;
                    });
                    
                    if (currentValue) select.value = currentValue;
                }
            });
        }
    } catch (error) {
        console.error('خطأ في تحميل المقيمين:', error);
    }
}

async function loadDomains() {
    try {
        const response = await fetch('/api/vanderbilt/domains', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            currentDomains = await response.json();
        }
    } catch (error) {
        console.error('خطأ في تحميل المجالات:', error);
    }
}

// عرض نافذة التقييم الجديد
function showNewAssessmentModal() {
    const modal = new bootstrap.Modal(document.getElementById('newAssessmentModal'));
    modal.show();
}

// إنشاء تقييم جديد
async function createAssessment() {
    const form = document.getElementById('newAssessmentForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    const data = {
        student_id: document.getElementById('newStudentId').value,
        assessor_id: document.getElementById('newAssessorId').value,
        assessment_date: document.getElementById('newAssessmentDate').value,
        form_type: document.getElementById('newFormType').value,
        assessment_type: document.getElementById('newAssessmentType').value,
        grade_level: document.getElementById('newGradeLevel').value,
        rater_name: document.getElementById('newRaterName').value,
        rater_type: document.getElementById('newRaterType').value,
        rater_relationship: document.getElementById('newRaterRelationship').value,
        school_name: document.getElementById('newSchoolName').value,
        teacher_name: document.getElementById('newTeacherName').value,
        assessment_setting: document.getElementById('newAssessmentSetting').value,
        additional_notes: document.getElementById('newAdditionalNotes').value
    };
    
    showLoading(true);
    try {
        const response = await fetch('/api/vanderbilt/assessments', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            const result = await response.json();
            showSuccess('تم إنشاء التقييم بنجاح');
            bootstrap.Modal.getInstance(document.getElementById('newAssessmentModal')).hide();
            form.reset();
            loadAssessments();
            loadStatistics();
        } else {
            const error = await response.json();
            showError(error.message || 'فشل في إنشاء التقييم');
        }
    } catch (error) {
        console.error('خطأ في إنشاء التقييم:', error);
        showError('خطأ في الاتصال بالخادم');
    } finally {
        showLoading(false);
    }
}

// عرض تفاصيل التقييم
async function viewAssessmentDetails(assessmentId) {
    showLoading(true);
    try {
        const response = await fetch(`/api/vanderbilt/assessments/${assessmentId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const assessment = await response.json();
            displayAssessmentDetails(assessment);
            const modal = new bootstrap.Modal(document.getElementById('assessmentDetailsModal'));
            modal.show();
        } else {
            showError('فشل في تحميل تفاصيل التقييم');
        }
    } catch (error) {
        console.error('خطأ في تحميل التفاصيل:', error);
        showError('خطأ في الاتصال بالخادم');
    } finally {
        showLoading(false);
    }
}

// عرض تفاصيل التقييم
function displayAssessmentDetails(assessment) {
    const content = document.getElementById('assessmentDetailsContent');
    content.innerHTML = `
        <div class="row">
            <div class="col-md-6">
                <h6>معلومات أساسية</h6>
                <table class="table table-sm">
                    <tr><td><strong>الطالب:</strong></td><td>${assessment.student_name}</td></tr>
                    <tr><td><strong>المقيم:</strong></td><td>${assessment.assessor_name}</td></tr>
                    <tr><td><strong>تاريخ التقييم:</strong></td><td>${formatDate(assessment.assessment_date)}</td></tr>
                    <tr><td><strong>نوع النموذج:</strong></td><td><span class="form-type-badge form-${assessment.form_type}">${getFormTypeText(assessment.form_type)}</span></td></tr>
                    <tr><td><strong>نوع التقييم:</strong></td><td>${getAssessmentTypeText(assessment.assessment_type)}</td></tr>
                    <tr><td><strong>الحالة:</strong></td><td><span class="status-badge status-${assessment.status}">${getStatusText(assessment.status)}</span></td></tr>
                </table>
            </div>
            <div class="col-md-6">
                <h6>معلومات المقيم</h6>
                <table class="table table-sm">
                    <tr><td><strong>اسم المقيم:</strong></td><td>${assessment.rater_name || '-'}</td></tr>
                    <tr><td><strong>نوع المقيم:</strong></td><td>${getRaterTypeText(assessment.rater_type)}</td></tr>
                    <tr><td><strong>العلاقة:</strong></td><td>${assessment.rater_relationship || '-'}</td></tr>
                    <tr><td><strong>الصف الدراسي:</strong></td><td>${assessment.grade_level || '-'}</td></tr>
                    <tr><td><strong>اسم المدرسة:</strong></td><td>${assessment.school_name || '-'}</td></tr>
                    <tr><td><strong>اسم المعلم:</strong></td><td>${assessment.teacher_name || '-'}</td></tr>
                </table>
            </div>
        </div>
        
        ${assessment.domain_results && assessment.domain_results.length > 0 ? `
            <div class="mt-3">
                <h6>نتائج المجالات</h6>
                <div class="row">
                    ${assessment.domain_results.map(result => `
                        <div class="col-md-6 mb-3">
                            <div class="card">
                                <div class="card-body">
                                    <h6 class="card-title">${result.domain_name}</h6>
                                    <div class="d-flex justify-content-between">
                                        <span>النقاط: ${result.raw_score}/${result.max_possible_score}</span>
                                        <span class="severity-indicator severity-${result.severity_level}"></span>
                                    </div>
                                    ${result.percentage_score ? `<div><small class="text-muted">النسبة المئوية: ${result.percentage_score}%</small></div>` : ''}
                                    <div><small class="text-${getSeverityColor(result.severity_level)}">${result.clinical_range}</small></div>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        ` : ''}
        
        ${assessment.behavioral_observations ? `
            <div class="mt-3">
                <h6>الملاحظات السلوكية</h6>
                <p class="bg-light p-3 rounded">${assessment.behavioral_observations}</p>
            </div>
        ` : ''}
        
        ${assessment.recommendations ? `
            <div class="mt-3">
                <h6>التوصيات</h6>
                <p class="bg-light p-3 rounded">${assessment.recommendations}</p>
            </div>
        ` : ''}
        
        ${assessment.adhd_likelihood ? `
            <div class="mt-3">
                <div class="row">
                    <div class="col-md-4">
                        <div class="card bg-primary text-white">
                            <div class="card-body text-center">
                                <h6>احتمالية ADHD</h6>
                                <h5>${getLikelihoodText(assessment.adhd_likelihood)}</h5>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="card bg-info text-white">
                            <div class="card-body text-center">
                                <h6>مستوى الشدة</h6>
                                <h5>${getSeverityText(assessment.severity_level) || 'N/A'}</h5>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="card bg-warning text-white">
                            <div class="card-body text-center">
                                <h6>مستوى الإعاقة</h6>
                                <h5>${getImpairmentText(assessment.impairment_level) || 'N/A'}</h5>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        ` : ''}
    `;
}

// متابعة التقييم
async function continueAssessment(assessmentId) {
    currentAssessmentId = assessmentId;
    await loadAssessmentData(assessmentId);
    setupDomainAssessment();
    const modal = new bootstrap.Modal(document.getElementById('domainAssessmentModal'));
    modal.show();
}

// تحميل بيانات التقييم
async function loadAssessmentData(assessmentId) {
    try {
        const response = await fetch(`/api/vanderbilt/assessments/${assessmentId}/data`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            assessmentData = await response.json();
        }
    } catch (error) {
        console.error('خطأ في تحميل بيانات التقييم:', error);
    }
}

// إعداد تقييم المجالات
function setupDomainAssessment() {
    const tabsContainer = document.getElementById('domainTabs');
    const contentContainer = document.getElementById('domainTabsContent');
    
    // فلترة المجالات حسب نوع النموذج
    const formType = assessmentData.form_type || 'parent';
    const filteredDomains = currentDomains.filter(domain => 
        !domain.form_type || domain.form_type === formType || domain.form_type === 'both'
    );
    
    // إنشاء التبويبات
    tabsContainer.innerHTML = filteredDomains.map((domain, index) => `
        <li class="nav-item">
            <button class="nav-link domain-tab ${index === 0 ? 'active' : ''}" 
                    data-bs-toggle="pill" 
                    data-bs-target="#domain-${domain.id}">
                ${domain.abbreviation || domain.name_arabic}
            </button>
        </li>
    `).join('');
    
    // إنشاء المحتوى
    contentContainer.innerHTML = filteredDomains.map((domain, index) => `
        <div class="tab-pane fade ${index === 0 ? 'show active' : ''}" id="domain-${domain.id}">
            <div class="domain-content" data-domain-id="${domain.id}">
                <div class="mb-3">
                    <h6>${domain.name_arabic}</h6>
                    <p class="text-muted">${domain.description || ''}</p>
                </div>
                <div id="domain-${domain.id}-items">
                    <!-- سيتم تحميل العناصر هنا -->
                </div>
            </div>
        </div>
    `).join('');
    
    // تحميل عناصر المجال الأول
    if (filteredDomains.length > 0) {
        loadDomainItems(filteredDomains[0].id);
    }
    
    updateProgress();
}

// دوال مساعدة
function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-SA');
}

function getStatusText(status) {
    const statusMap = {
        'in_progress': 'قيد التقييم',
        'completed': 'مكتمل',
        'cancelled': 'ملغي'
    };
    return statusMap[status] || status;
}

function getFormTypeText(type) {
    const typeMap = {
        'parent': 'والدين',
        'teacher': 'معلم',
        'self': 'ذاتي'
    };
    return typeMap[type] || type;
}

function getAssessmentTypeText(type) {
    const typeMap = {
        'diagnostic': 'تشخيصي',
        'follow_up': 'متابعة',
        'treatment_monitoring': 'مراقبة العلاج'
    };
    return typeMap[type] || type;
}

function getRaterTypeText(type) {
    const typeMap = {
        'parent': 'والد/والدة',
        'teacher': 'معلم',
        'guardian': 'ولي أمر',
        'other': 'أخرى'
    };
    return typeMap[type] || type;
}

function getSeverityText(severity) {
    const severityMap = {
        'normal': 'طبيعي',
        'borderline': 'حدي',
        'clinical': 'إكلينيكي',
        'severe': 'شديد'
    };
    return severityMap[severity] || severity;
}

function getLikelihoodText(likelihood) {
    const likelihoodMap = {
        'unlikely': 'غير محتمل',
        'possible': 'محتمل',
        'probable': 'مرجح',
        'highly_probable': 'مرجح بقوة'
    };
    return likelihoodMap[likelihood] || likelihood;
}

function getImpairmentText(impairment) {
    const impairmentMap = {
        'minimal': 'طفيف',
        'moderate': 'متوسط',
        'severe': 'شديد'
    };
    return impairmentMap[impairment] || impairment;
}

function getLikelihoodColor(likelihood) {
    const colorMap = {
        'unlikely': 'success',
        'possible': 'warning',
        'probable': 'warning',
        'highly_probable': 'danger'
    };
    return colorMap[likelihood] || 'muted';
}

function getSeverityColor(severity) {
    const colorMap = {
        'normal': 'success',
        'borderline': 'warning',
        'clinical': 'warning',
        'severe': 'danger'
    };
    return colorMap[severity] || 'muted';
}

function showLoading(show) {
    const spinner = document.getElementById('loadingSpinner');
    spinner.style.display = show ? 'block' : 'none';
}

function showSuccess(message) {
    alert(message);
}

function showError(message) {
    alert('خطأ: ' + message);
}

function updateProgress() {
    // تنفيذ تحديث شريط التقدم
}

// دوال إضافية للتقييم
async function loadDomainItems(domainId) {
    // تنفيذ تحميل عناصر المجال
}

async function generateReport(assessmentId) {
    // تنفيذ إنشاء التقرير
}

async function deleteAssessment(assessmentId) {
    if (!confirm('هل أنت متأكد من حذف هذا التقييم؟')) return;
    
    try {
        const response = await fetch(`/api/vanderbilt/assessments/${assessmentId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            showSuccess('تم حذف التقييم بنجاح');
            loadAssessments();
            loadStatistics();
        } else {
            showError('فشل في حذف التقييم');
        }
    } catch (error) {
        console.error('خطأ في حذف التقييم:', error);
        showError('خطأ في الاتصال بالخادم');
    }
}

function applyFilters() {
    const filters = {
        student_id: document.getElementById('studentFilter').value,
        assessor_id: document.getElementById('assessorFilter').value,
        status: document.getElementById('statusFilter').value,
        form_type: document.getElementById('formTypeFilter').value,
        assessment_type: document.getElementById('assessmentTypeFilter').value
    };
    
    const queryParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
        if (value) queryParams.append(key, value);
    });
    
    loadAssessmentsWithFilters(queryParams.toString());
}

async function loadAssessmentsWithFilters(queryString) {
    showLoading(true);
    try {
        const response = await fetch(`/api/vanderbilt/assessments?${queryString}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const assessments = await response.json();
            displayAssessments(assessments);
        }
    } catch (error) {
        console.error('خطأ في تحميل التقييمات:', error);
    } finally {
        showLoading(false);
    }
}
