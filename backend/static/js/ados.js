// ADOS Assessment Management
let currentAssessmentId = null;
let currentActivityIndex = 0;
let activities = [];
let assessmentItems = [];
let currentAssessment = null;

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    loadStatistics();
    loadAssessments();
    loadStudents();
    loadAssessors();
    loadModules();
    
    // Set default date to today
    document.getElementById('assessmentDate').value = new Date().toISOString().split('T')[0];
});

// Load statistics
async function loadStatistics() {
    try {
        const response = await fetch('/api/ados/statistics', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const stats = await response.json();
            document.getElementById('totalAssessments').textContent = stats.total || 0;
            document.getElementById('completedAssessments').textContent = stats.completed || 0;
            document.getElementById('inProgressAssessments').textContent = stats.in_progress || 0;
            document.getElementById('autismDiagnoses').textContent = stats.autism_diagnoses || 0;
        }
    } catch (error) {
        console.error('Error loading statistics:', error);
    }
}

// Load assessments
async function loadAssessments() {
    try {
        showLoading();
        const response = await fetch('/api/ados/assessments', {
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
        console.error('Error loading assessments:', error);
        showError('خطأ في تحميل التقييمات');
    } finally {
        hideLoading();
    }
}

// Display assessments in table
function displayAssessments(assessments) {
    const tbody = document.getElementById('assessmentsTableBody');
    tbody.innerHTML = '';
    
    assessments.forEach(assessment => {
        const row = document.createElement('tr');
        
        // Status badge
        let statusBadge = '';
        switch(assessment.status) {
            case 'completed':
                statusBadge = '<span class="badge bg-success">مكتمل</span>';
                break;
            case 'in_progress':
                statusBadge = '<span class="badge bg-warning">قيد التطبيق</span>';
                break;
            case 'cancelled':
                statusBadge = '<span class="badge bg-danger">ملغي</span>';
                break;
            default:
                statusBadge = '<span class="badge bg-secondary">غير محدد</span>';
        }
        
        // Classification badge
        let classificationBadge = '';
        switch(assessment.autism_classification) {
            case 'autism':
                classificationBadge = '<span class="badge bg-danger">توحد</span>';
                break;
            case 'autism_spectrum':
                classificationBadge = '<span class="badge bg-warning">طيف التوحد</span>';
                break;
            case 'non_spectrum':
                classificationBadge = '<span class="badge bg-success">خارج الطيف</span>';
                break;
            default:
                classificationBadge = '<span class="badge bg-secondary">غير محدد</span>';
        }
        
        row.innerHTML = `
            <td>${assessment.student_name || 'غير محدد'}</td>
            <td>${assessment.assessor_name || 'غير محدد'}</td>
            <td>${formatDate(assessment.assessment_date)}</td>
            <td>الوحدة ${assessment.module_used || 'غير محدد'}</td>
            <td>${statusBadge}</td>
            <td>${assessment.social_affect_total || 0}</td>
            <td>${assessment.restricted_repetitive_total || 0}</td>
            <td>${assessment.overall_total || 0}</td>
            <td>${classificationBadge}</td>
            <td>
                <div class="btn-group btn-group-sm">
                    <button class="btn btn-outline-primary" onclick="viewAssessmentDetails(${assessment.id})" title="عرض التفاصيل">
                        <i class="fas fa-eye"></i>
                    </button>
                    ${assessment.status === 'in_progress' ? 
                        `<button class="btn btn-outline-success" onclick="continueAssessmentDirect(${assessment.id})" title="متابعة التقييم">
                            <i class="fas fa-play"></i>
                        </button>` : ''
                    }
                    ${assessment.status === 'completed' ? 
                        `<button class="btn btn-outline-info" onclick="generateReportDirect(${assessment.id})" title="إنشاء تقرير">
                            <i class="fas fa-file-alt"></i>
                        </button>` : ''
                    }
                    <button class="btn btn-outline-danger" onclick="deleteAssessment(${assessment.id})" title="حذف">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        
        tbody.appendChild(row);
    });
}

// Load students for dropdown
async function loadStudents() {
    try {
        const response = await fetch('/api/students', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const students = await response.json();
            const selects = ['studentId', 'studentFilter'];
            
            selects.forEach(selectId => {
                const select = document.getElementById(selectId);
                if (select) {
                    // Clear existing options except the first one
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
    } catch (error) {
        console.error('Error loading students:', error);
    }
}

// Load assessors for dropdown
async function loadAssessors() {
    try {
        const response = await fetch('/api/employees', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const assessors = await response.json();
            const selects = ['assessorId', 'assessorFilter'];
            
            selects.forEach(selectId => {
                const select = document.getElementById(selectId);
                if (select) {
                    // Clear existing options except the first one
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
    } catch (error) {
        console.error('Error loading assessors:', error);
    }
}

// Load modules
async function loadModules() {
    try {
        const response = await fetch('/api/ados/modules', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const modules = await response.json();
            // Store modules for later use
            window.adosModules = modules;
        }
    } catch (error) {
        console.error('Error loading modules:', error);
    }
}

// Show new assessment modal
function showNewAssessmentModal() {
    const modal = new bootstrap.Modal(document.getElementById('newAssessmentModal'));
    modal.show();
}

// Create new assessment
async function createAssessment() {
    const form = document.getElementById('newAssessmentForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    const formData = {
        student_id: document.getElementById('studentId').value,
        assessor_id: document.getElementById('assessorId').value,
        assessment_date: document.getElementById('assessmentDate').value,
        assessment_type: document.getElementById('assessmentType').value,
        module_used: document.getElementById('moduleUsed').value,
        assessment_setting: document.getElementById('assessmentSetting').value,
        chronological_age_years: document.getElementById('chronologicalAgeYears').value || null,
        chronological_age_months: document.getElementById('chronologicalAgeMonths').value || null,
        session_duration_minutes: document.getElementById('sessionDuration').value || null,
        language_used: document.getElementById('languageUsed').value,
        attention_level: document.getElementById('attentionLevel').value,
        cooperation_level: document.getElementById('cooperationLevel').value,
        anxiety_level: document.getElementById('anxietyLevel').value,
        fatigue_level: document.getElementById('fatigueLevel').value,
        behavioral_observations: document.getElementById('behavioralObservations').value
    };
    
    try {
        const response = await fetch('/api/ados/assessments', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(formData)
        });
        
        if (response.ok) {
            const result = await response.json();
            showSuccess('تم إنشاء التقييم بنجاح');
            
            // Close modal and reset form
            bootstrap.Modal.getInstance(document.getElementById('newAssessmentModal')).hide();
            form.reset();
            document.getElementById('assessmentDate').value = new Date().toISOString().split('T')[0];
            
            // Reload data
            loadStatistics();
            loadAssessments();
            
            // Start assessment immediately
            currentAssessmentId = result.id;
            setTimeout(() => continueAssessmentDirect(result.id), 1000);
        } else {
            const error = await response.json();
            showError(error.message || 'فشل في إنشاء التقييم');
        }
    } catch (error) {
        console.error('Error creating assessment:', error);
        showError('خطأ في إنشاء التقييم');
    }
}

// View assessment details
async function viewAssessmentDetails(assessmentId) {
    try {
        const response = await fetch(`/api/ados/assessments/${assessmentId}`, {
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
        console.error('Error loading assessment details:', error);
        showError('خطأ في تحميل التفاصيل');
    }
}

// Display assessment details
function displayAssessmentDetails(assessment) {
    currentAssessment = assessment;
    currentAssessmentId = assessment.id;
    
    const content = document.getElementById('assessmentDetailsContent');
    
    // Status badge
    let statusBadge = '';
    switch(assessment.status) {
        case 'completed':
            statusBadge = '<span class="badge bg-success">مكتمل</span>';
            break;
        case 'in_progress':
            statusBadge = '<span class="badge bg-warning">قيد التطبيق</span>';
            break;
        case 'cancelled':
            statusBadge = '<span class="badge bg-danger">ملغي</span>';
            break;
        default:
            statusBadge = '<span class="badge bg-secondary">غير محدد</span>';
    }
    
    // Classification badge
    let classificationBadge = '';
    switch(assessment.autism_classification) {
        case 'autism':
            classificationBadge = '<span class="badge bg-danger">توحد</span>';
            break;
        case 'autism_spectrum':
            classificationBadge = '<span class="badge bg-warning">طيف التوحد</span>';
            break;
        case 'non_spectrum':
            classificationBadge = '<span class="badge bg-success">خارج الطيف</span>';
            break;
        default:
            classificationBadge = '<span class="badge bg-secondary">غير محدد</span>';
    }
    
    content.innerHTML = `
        <div class="row">
            <div class="col-md-6">
                <h6>معلومات أساسية</h6>
                <table class="table table-sm">
                    <tr><td><strong>الطالب:</strong></td><td>${assessment.student_name || 'غير محدد'}</td></tr>
                    <tr><td><strong>المقيم:</strong></td><td>${assessment.assessor_name || 'غير محدد'}</td></tr>
                    <tr><td><strong>تاريخ التقييم:</strong></td><td>${formatDate(assessment.assessment_date)}</td></tr>
                    <tr><td><strong>نوع التقييم:</strong></td><td>${getAssessmentTypeText(assessment.assessment_type)}</td></tr>
                    <tr><td><strong>الوحدة المستخدمة:</strong></td><td>الوحدة ${assessment.module_used}</td></tr>
                    <tr><td><strong>الحالة:</strong></td><td>${statusBadge}</td></tr>
                </table>
            </div>
            <div class="col-md-6">
                <h6>معلومات الجلسة</h6>
                <table class="table table-sm">
                    <tr><td><strong>العمر الزمني:</strong></td><td>${assessment.chronological_age_years || 0} سنة ${assessment.chronological_age_months || 0} شهر</td></tr>
                    <tr><td><strong>مدة الجلسة:</strong></td><td>${assessment.session_duration_minutes || 'غير محدد'} دقيقة</td></tr>
                    <tr><td><strong>لغة التقييم:</strong></td><td>${getLanguageText(assessment.language_used)}</td></tr>
                    <tr><td><strong>مكان التقييم:</strong></td><td>${getSettingText(assessment.assessment_setting)}</td></tr>
                    <tr><td><strong>تاريخ الإكمال:</strong></td><td>${assessment.completion_date ? formatDate(assessment.completion_date) : 'لم يكتمل بعد'}</td></tr>
                    <tr><td><strong>التصنيف:</strong></td><td>${classificationBadge}</td></tr>
                </table>
            </div>
        </div>
        
        ${assessment.status === 'completed' ? `
        <div class="row mt-3">
            <div class="col-md-12">
                <h6>نتائج التقييم</h6>
                <div class="row">
                    <div class="col-md-3">
                        <div class="card bg-light">
                            <div class="card-body text-center">
                                <h6>التأثير الاجتماعي</h6>
                                <h4>${assessment.social_affect_total || 0}</h4>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="card bg-light">
                            <div class="card-body text-center">
                                <h6>السلوك المتكرر والمحدود</h6>
                                <h4>${assessment.restricted_repetitive_total || 0}</h4>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="card bg-light">
                            <div class="card-body text-center">
                                <h6>المجموع الكلي</h6>
                                <h4>${assessment.overall_total || 0}</h4>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="card bg-light">
                            <div class="card-body text-center">
                                <h6>درجة الشدة</h6>
                                <h4>${assessment.severity_score || 'غير محدد'}</h4>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        ` : ''}
        
        <div class="row mt-3">
            <div class="col-md-6">
                <h6>العوامل المؤثرة</h6>
                <table class="table table-sm">
                    <tr><td><strong>مستوى الانتباه:</strong></td><td>${getLevelText(assessment.attention_level)}</td></tr>
                    <tr><td><strong>مستوى التعاون:</strong></td><td>${getLevelText(assessment.cooperation_level)}</td></tr>
                    <tr><td><strong>مستوى القلق:</strong></td><td>${getAnxietyLevelText(assessment.anxiety_level)}</td></tr>
                    <tr><td><strong>مستوى التعب:</strong></td><td>${getFatigueLevelText(assessment.fatigue_level)}</td></tr>
                </table>
            </div>
        </div>
        
        ${assessment.behavioral_observations ? `
        <div class="row mt-3">
            <div class="col-12">
                <h6>الملاحظات السلوكية</h6>
                <p class="text-muted">${assessment.behavioral_observations}</p>
            </div>
        </div>
        ` : ''}
        
        ${assessment.diagnostic_impression ? `
        <div class="row mt-3">
            <div class="col-12">
                <h6>الانطباع التشخيصي</h6>
                <p class="text-muted">${assessment.diagnostic_impression}</p>
            </div>
        </div>
        ` : ''}
        
        ${assessment.recommendations ? `
        <div class="row mt-3">
            <div class="col-12">
                <h6>التوصيات</h6>
                <p class="text-muted">${assessment.recommendations}</p>
            </div>
        </div>
        ` : ''}
    `;
    
    // Show/hide action buttons based on status
    const continueBtn = document.getElementById('continueAssessmentBtn');
    const reportBtn = document.getElementById('generateReportBtn');
    
    if (assessment.status === 'in_progress') {
        continueBtn.style.display = 'inline-block';
        reportBtn.style.display = 'none';
    } else if (assessment.status === 'completed') {
        continueBtn.style.display = 'none';
        reportBtn.style.display = 'inline-block';
    } else {
        continueBtn.style.display = 'none';
        reportBtn.style.display = 'none';
    }
}

// Continue assessment
function continueAssessment() {
    bootstrap.Modal.getInstance(document.getElementById('assessmentDetailsModal')).hide();
    setTimeout(() => continueAssessmentDirect(currentAssessmentId), 500);
}

// Continue assessment directly
async function continueAssessmentDirect(assessmentId) {
    currentAssessmentId = assessmentId;
    currentActivityIndex = 0;
    
    try {
        // Load assessment activities
        const response = await fetch(`/api/ados/assessments/${assessmentId}/activities`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            activities = await response.json();
            showActivityAssessmentModal();
        } else {
            showError('فشل في تحميل أنشطة التقييم');
        }
    } catch (error) {
        console.error('Error loading assessment activities:', error);
        showError('خطأ في تحميل أنشطة التقييم');
    }
}

// Show activity assessment modal
function showActivityAssessmentModal() {
    createActivityTabs();
    showActivityContent(0);
    updateProgress();
    updateScoringSummary();
    
    const modal = new bootstrap.Modal(document.getElementById('activityAssessmentModal'));
    modal.show();
}

// Utility functions
function formatDate(dateString) {
    if (!dateString) return 'غير محدد';
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-SA');
}

function getAssessmentTypeText(type) {
    const types = {
        'diagnostic': 'تشخيصي',
        'research': 'بحثي',
        'clinical': 'إكلينيكي'
    };
    return types[type] || type || 'غير محدد';
}

function getLanguageText(language) {
    const languages = {
        'arabic': 'العربية',
        'english': 'الإنجليزية',
        'mixed': 'مختلط'
    };
    return languages[language] || language || 'غير محدد';
}

function getSettingText(setting) {
    const settings = {
        'clinic': 'العيادة',
        'school': 'المدرسة',
        'home': 'المنزل',
        'hospital': 'المستشفى'
    };
    return settings[setting] || setting || 'غير محدد';
}

function getLevelText(level) {
    const levels = {
        'excellent': 'ممتاز',
        'good': 'جيد',
        'fair': 'مقبول',
        'poor': 'ضعيف'
    };
    return levels[level] || level || 'غير محدد';
}

function getAnxietyLevelText(level) {
    const levels = {
        'none': 'لا يوجد',
        'mild': 'خفيف',
        'moderate': 'متوسط',
        'severe': 'شديد'
    };
    return levels[level] || level || 'غير محدد';
}

function getFatigueLevelText(level) {
    const levels = {
        'none': 'لا يوجد',
        'mild': 'خفيف',
        'moderate': 'متوسط',
        'severe': 'شديد'
    };
    return levels[level] || level || 'غير محدد';
}

// Show/hide loading
function showLoading() {
    document.getElementById('loadingSpinner').classList.remove('d-none');
}

function hideLoading() {
    document.getElementById('loadingSpinner').classList.add('d-none');
}

// Show success message
function showSuccess(message) {
    // You can implement a toast notification here
    alert(message);
}

// Show error message
function showError(message) {
    // You can implement a toast notification here
    alert(message);
}

// Apply filters (placeholder)
function applyFilters() {
    loadAssessments();
}

// Clear filters (placeholder)
function clearFilters() {
    document.getElementById('studentFilter').value = '';
    document.getElementById('assessorFilter').value = '';
    document.getElementById('moduleFilter').value = '';
    document.getElementById('statusFilter').value = '';
    document.getElementById('classificationFilter').value = '';
    loadAssessments();
}

// Placeholder functions for activity assessment
function createActivityTabs() {
    // Implementation will be added in next part
}

function showActivityContent(activityIndex) {
    // Implementation will be added in next part
}

function updateProgress() {
    // Implementation will be added in next part
}

function updateScoringSummary() {
    // Implementation will be added in next part
}

function previousActivity() {
    // Implementation will be added in next part
}

function nextActivity() {
    // Implementation will be added in next part
}

function completeAssessment() {
    // Implementation will be added in next part
}

function generateReport() {
    generateReportDirect(currentAssessmentId);
}

function generateReportDirect(assessmentId) {
    // Implementation will be added in next part
}

function deleteAssessment(assessmentId) {
    if (confirm('هل أنت متأكد من حذف هذا التقييم؟')) {
        // Implementation will be added in next part
    }
}
