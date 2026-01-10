// Social Maturity Scale JavaScript
let currentAssessmentId = null;
let currentDomainIndex = 0;
let domains = [];
let assessments = [];
let students = [];
let assessors = [];

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    loadStatistics();
    loadAssessments();
    loadStudents();
    loadAssessors();
    loadDomains();
    
    // Set default date to today
    document.getElementById('assessmentDate').value = new Date().toISOString().split('T')[0];
});

// Load statistics
async function loadStatistics() {
    try {
        const response = await fetch('/api/social-maturity/statistics', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const stats = await response.json();
            document.getElementById('totalAssessments').textContent = stats.total || 0;
            document.getElementById('completedAssessments').textContent = stats.completed || 0;
            document.getElementById('inProgressAssessments').textContent = stats.in_progress || 0;
            document.getElementById('averageSocialQuotient').textContent = (stats.average_social_quotient || 0).toFixed(1);
        }
    } catch (error) {
        console.error('Error loading statistics:', error);
    }
}

// Load assessments
async function loadAssessments() {
    try {
        showLoading();
        const response = await fetch('/api/social-maturity/assessments', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            assessments = await response.json();
            displayAssessments(assessments);
        } else {
            showError('فشل في تحميل التقييمات');
        }
    } catch (error) {
        console.error('Error loading assessments:', error);
        showError('حدث خطأ في تحميل التقييمات');
    } finally {
        hideLoading();
    }
}

// Display assessments in table
function displayAssessments(assessmentList) {
    const tbody = document.getElementById('assessmentsTableBody');
    tbody.innerHTML = '';
    
    assessmentList.forEach(assessment => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${assessment.student_name || 'غير محدد'}</td>
            <td>${assessment.assessor_name || 'غير محدد'}</td>
            <td>${formatDate(assessment.assessment_date)}</td>
            <td>${getAssessmentTypeText(assessment.assessment_type)}</td>
            <td>${getStatusBadge(assessment.status)}</td>
            <td>${assessment.social_quotient ? assessment.social_quotient.toFixed(1) : '-'}</td>
            <td>${getMaturityLevelText(assessment.maturity_level)}</td>
            <td>
                <div class="btn-group" role="group">
                    <button class="btn btn-sm btn-outline-primary" onclick="viewAssessmentDetails(${assessment.id})" title="عرض التفاصيل">
                        <i class="fas fa-eye"></i>
                    </button>
                    ${assessment.status === 'in_progress' ? `
                        <button class="btn btn-sm btn-outline-success" onclick="continueAssessmentById(${assessment.id})" title="متابعة التقييم">
                            <i class="fas fa-play"></i>
                        </button>
                    ` : ''}
                    ${assessment.status === 'completed' ? `
                        <button class="btn btn-sm btn-outline-info" onclick="generateReportById(${assessment.id})" title="إنشاء تقرير">
                            <i class="fas fa-file-alt"></i>
                        </button>
                    ` : ''}
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteAssessment(${assessment.id})" title="حذف">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Load students and assessors
async function loadStudents() {
    try {
        const response = await fetch('/api/students', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (response.ok) {
            students = await response.json();
            populateStudentSelects();
        }
    } catch (error) {
        console.error('Error loading students:', error);
    }
}

async function loadAssessors() {
    try {
        const response = await fetch('/api/employees', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (response.ok) {
            assessors = await response.json();
            populateAssessorSelects();
        }
    } catch (error) {
        console.error('Error loading assessors:', error);
    }
}

async function loadDomains() {
    try {
        const response = await fetch('/api/social-maturity/domains', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (response.ok) {
            domains = await response.json();
        }
    } catch (error) {
        console.error('Error loading domains:', error);
    }
}

// Populate select elements
function populateStudentSelects() {
    const selects = ['studentId', 'studentFilter'];
    selects.forEach(selectId => {
        const select = document.getElementById(selectId);
        if (select) {
            while (select.children.length > 1) {
                select.removeChild(select.lastChild);
            }
            students.forEach(student => {
                const option = document.createElement('option');
                option.value = student.id;
                option.textContent = student.name;
                select.appendChild(option);
            });
        }
    });
}

function populateAssessorSelects() {
    const selects = ['assessorId', 'assessorFilter'];
    selects.forEach(selectId => {
        const select = document.getElementById(selectId);
        if (select) {
            while (select.children.length > 1) {
                select.removeChild(select.lastChild);
            }
            assessors.forEach(assessor => {
                const option = document.createElement('option');
                option.value = assessor.id;
                option.textContent = assessor.name;
                select.appendChild(option);
            });
        }
    });
}

// Modal and assessment functions
function showNewAssessmentModal() {
    const modal = new bootstrap.Modal(document.getElementById('newAssessmentModal'));
    modal.show();
}

async function createAssessment() {
    const form = document.getElementById('newAssessmentForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    const assessmentData = {
        student_id: document.getElementById('studentId').value,
        assessor_id: document.getElementById('assessorId').value,
        assessment_date: document.getElementById('assessmentDate').value,
        assessment_type: document.getElementById('assessmentType').value,
        assessment_method: document.getElementById('assessmentMethod').value,
        assessment_setting: document.getElementById('assessmentSetting').value,
        chronological_age_years: document.getElementById('chronologicalAgeYears').value || null,
        chronological_age_months: document.getElementById('chronologicalAgeMonths').value || null,
        cultural_background: document.getElementById('culturalBackground').value,
        informant_name: document.getElementById('informantName').value,
        informant_relationship: document.getElementById('informantRelationship').value,
        additional_notes: document.getElementById('additionalNotes').value
    };
    
    try {
        const response = await fetch('/api/social-maturity/assessments', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(assessmentData)
        });
        
        if (response.ok) {
            const result = await response.json();
            showSuccess('تم إنشاء التقييم بنجاح');
            bootstrap.Modal.getInstance(document.getElementById('newAssessmentModal')).hide();
            form.reset();
            loadAssessments();
            loadStatistics();
            
            if (confirm('هل تريد بدء التقييم الآن؟')) {
                continueAssessmentById(result.id);
            }
        } else {
            const error = await response.json();
            showError(error.message || 'فشل في إنشاء التقييم');
        }
    } catch (error) {
        console.error('Error creating assessment:', error);
        showError('حدث خطأ في إنشاء التقييم');
    }
}

// Helper functions for text conversion
function getAssessmentTypeText(type) {
    const types = {
        'comprehensive': 'شامل',
        'screening': 'فحص',
        'follow_up': 'متابعة'
    };
    return types[type] || type;
}

function getAssessmentMethodText(method) {
    const methods = {
        'interview': 'مقابلة',
        'observation': 'ملاحظة',
        'questionnaire': 'استبيان'
    };
    return methods[method] || method;
}

function getStatusBadge(status) {
    const badges = {
        'in_progress': '<span class="badge bg-warning">قيد التطبيق</span>',
        'completed': '<span class="badge bg-success">مكتمل</span>',
        'cancelled': '<span class="badge bg-danger">ملغي</span>'
    };
    return badges[status] || status;
}

function getMaturityLevelText(level) {
    const levels = {
        'superior': 'متفوق',
        'above_average': 'فوق المتوسط',
        'average': 'متوسط',
        'below_average': 'دون المتوسط',
        'significantly_delayed': 'متأخر بشكل كبير'
    };
    return levels[level] || level || '-';
}

function getDevelopmentalStatusText(status) {
    const statuses = {
        'advanced': 'متقدم',
        'typical': 'طبيعي',
        'delayed': 'متأخر',
        'significantly_delayed': 'متأخر بشكل كبير'
    };
    return statuses[status] || status || '-';
}

function getAgeText(years, months) {
    if (!years && !months) return '-';
    let text = '';
    if (years) text += `${years} سنة`;
    if (months) text += `${text ? ' و ' : ''}${months} شهر`;
    return text;
}

function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-SA');
}

// Utility functions
function showLoading() {
    document.getElementById('loadingSpinner').classList.remove('d-none');
}

function hideLoading() {
    document.getElementById('loadingSpinner').classList.add('d-none');
}

function showSuccess(message) {
    // Implementation depends on your notification system
    alert(message);
}

function showError(message) {
    // Implementation depends on your notification system
    alert(message);
}

function showInfo(message) {
    // Implementation depends on your notification system
    alert(message);
}

// Filter functions
function applyFilters() {
    const studentFilter = document.getElementById('studentFilter').value;
    const assessorFilter = document.getElementById('assessorFilter').value;
    const statusFilter = document.getElementById('statusFilter').value;
    const typeFilter = document.getElementById('typeFilter').value;
    
    let filteredAssessments = assessments.filter(assessment => {
        return (!studentFilter || assessment.student_id == studentFilter) &&
               (!assessorFilter || assessment.assessor_id == assessorFilter) &&
               (!statusFilter || assessment.status === statusFilter) &&
               (!typeFilter || assessment.assessment_type === typeFilter);
    });
    
    displayAssessments(filteredAssessments);
}

function clearFilters() {
    document.getElementById('studentFilter').value = '';
    document.getElementById('assessorFilter').value = '';
    document.getElementById('statusFilter').value = '';
    document.getElementById('typeFilter').value = '';
    displayAssessments(assessments);
}

// Placeholder functions for future implementation
function viewAssessmentDetails(assessmentId) {
    showInfo('سيتم إضافة عرض التفاصيل قريباً');
}

function continueAssessmentById(assessmentId) {
    showInfo('سيتم إضافة متابعة التقييم قريباً');
}

function generateReportById(assessmentId) {
    showInfo('سيتم إضافة نظام التقارير قريباً');
}

async function deleteAssessment(assessmentId) {
    if (!confirm('هل أنت متأكد من حذف هذا التقييم؟')) return;
    
    try {
        const response = await fetch(`/api/social-maturity/assessments/${assessmentId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        
        if (response.ok) {
            showSuccess('تم حذف التقييم بنجاح');
            loadAssessments();
            loadStatistics();
        } else {
            showError('فشل في حذف التقييم');
        }
    } catch (error) {
        console.error('Error deleting assessment:', error);
        showError('حدث خطأ في حذف التقييم');
    }
}
