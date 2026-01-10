// مقياس كونرز - JavaScript

let currentAssessmentId = null;
let currentSubscales = [];
let assessmentData = {};

// تحميل الصفحة
document.addEventListener('DOMContentLoaded', function() {
    loadStatistics();
    loadAssessments();
    loadStudents();
    loadAssessors();
    loadSubscales();
    
    // تعيين التاريخ الحالي
    document.getElementById('newAssessmentDate').value = new Date().toISOString().split('T')[0];
});

// تحميل الإحصائيات
async function loadStatistics() {
    try {
        const response = await fetch('/api/conners/statistics', {
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
        const response = await fetch('/api/conners/assessments', {
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
            <div class="text-center py-5">
                <i class="fas fa-user-clock fa-3x text-muted mb-3"></i>
                <h5 class="text-muted">لا توجد تقييمات</h5>
                <p class="text-muted">ابدأ بإنشاء تقييم جديد</p>
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
                    <span class="form-version-badge form-${assessment.form_version.toLowerCase()}">
                        ${assessment.form_version}
                    </span>
                    <div><small class="text-muted">${getRaterTypeText(assessment.rater_type)}</small></div>
                </div>
                <div class="col-md-2">
                    <span class="status-badge status-${assessment.status}">
                        ${getStatusText(assessment.status)}
                    </span>
                    ${assessment.overall_severity ? `
                        <div class="mt-1">
                            <span class="severity-indicator severity-${assessment.overall_severity}"></span>
                            ${getSeverityText(assessment.overall_severity)}
                        </div>
                    ` : ''}
                </div>
                <div class="col-md-2">
                    ${assessment.adhd_index ? `
                        <small class="text-muted">مؤشر ADHD</small>
                        <div class="fw-bold text-${getScoreColor(assessment.adhd_index)}">${assessment.adhd_index}</div>
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

async function loadSubscales() {
    try {
        const response = await fetch('/api/conners/subscales', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            currentSubscales = await response.json();
        }
    } catch (error) {
        console.error('خطأ في تحميل المقاييس الفرعية:', error);
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
        form_version: document.getElementById('newFormVersion').value,
        assessment_type: document.getElementById('newAssessmentType').value,
        rater_name: document.getElementById('newRaterName').value,
        rater_type: document.getElementById('newRaterType').value,
        rater_relationship: document.getElementById('newRaterRelationship').value,
        school_grade: document.getElementById('newSchoolGrade').value,
        assessment_setting: document.getElementById('newAssessmentSetting').value,
        additional_notes: document.getElementById('newAdditionalNotes').value
    };
    
    showLoading(true);
    try {
        const response = await fetch('/api/conners/assessments', {
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

function getRaterTypeText(type) {
    const typeMap = {
        'parent': 'والدين',
        'teacher': 'معلم',
        'self': 'ذاتي',
        'other': 'أخرى'
    };
    return typeMap[type] || type;
}

function getSeverityText(severity) {
    const severityMap = {
        'mild': 'خفيف',
        'moderate': 'متوسط',
        'severe': 'شديد'
    };
    return severityMap[severity] || severity;
}

function getScoreColor(score) {
    if (!score) return 'muted';
    if (score >= 70) return 'danger';
    if (score >= 65) return 'warning';
    return 'success';
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

// دوال إضافية للتقييم
async function viewAssessmentDetails(assessmentId) {
    // تنفيذ عرض التفاصيل
}

async function continueAssessment(assessmentId) {
    // تنفيذ متابعة التقييم
}

async function generateReport(assessmentId) {
    // تنفيذ إنشاء التقرير
}

async function deleteAssessment(assessmentId) {
    if (!confirm('هل أنت متأكد من حذف هذا التقييم؟')) return;
    
    try {
        const response = await fetch(`/api/conners/assessments/${assessmentId}`, {
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
        form_version: document.getElementById('formVersionFilter').value,
        rater_type: document.getElementById('raterTypeFilter').value
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
        const response = await fetch(`/api/conners/assessments?${queryString}`, {
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
