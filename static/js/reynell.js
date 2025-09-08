// مقياس ريبيل لتقييم اللغة - JavaScript

// متغيرات عامة
let currentAssessmentId = null;
let assessmentData = {};
let subtestItems = {};

// تحميل الإحصائيات
async function loadStatistics() {
    try {
        showLoading();
        const response = await fetch('/api/reynell/statistics', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        
        if (response.ok) {
            const stats = await response.json();
            document.getElementById('totalAssessments').textContent = stats.total || 0;
            document.getElementById('completedAssessments').textContent = stats.completed || 0;
            document.getElementById('inProgressAssessments').textContent = stats.in_progress || 0;
            document.getElementById('delayedAssessments').textContent = stats.delayed || 0;
        }
    } catch (error) {
        console.error('خطأ في تحميل الإحصائيات:', error);
        showNotification('خطأ في تحميل الإحصائيات', 'error');
    } finally {
        hideLoading();
    }
}

// تحميل قائمة التقييمات
async function loadAssessments() {
    try {
        showLoading();
        const response = await fetch('/api/reynell/assessments', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        
        if (response.ok) {
            const assessments = await response.json();
            displayAssessments(assessments);
        }
    } catch (error) {
        console.error('خطأ في تحميل التقييمات:', error);
        showNotification('خطأ في تحميل التقييمات', 'error');
    } finally {
        hideLoading();
    }
}

// عرض التقييمات في الجدول
function displayAssessments(assessments) {
    const tbody = document.getElementById('assessmentsTableBody');
    tbody.innerHTML = '';
    
    assessments.forEach(assessment => {
        const row = document.createElement('tr');
        
        let statusBadge = '';
        switch (assessment.status) {
            case 'completed': statusBadge = '<span class="badge bg-success">مكتمل</span>'; break;
            case 'in_progress': statusBadge = '<span class="badge bg-warning">قيد التنفيذ</span>'; break;
            case 'draft': statusBadge = '<span class="badge bg-secondary">مسودة</span>'; break;
            default: statusBadge = '<span class="badge bg-light text-dark">غير محدد</span>';
        }
        
        let developmentLevel = '';
        if (assessment.comprehension_language_age && assessment.expression_language_age) {
            const avgAge = (assessment.comprehension_language_age + assessment.expression_language_age) / 2;
            if (avgAge >= assessment.chronological_age) {
                developmentLevel = '<span class="badge bg-success">طبيعي</span>';
            } else if (avgAge >= assessment.chronological_age * 0.8) {
                developmentLevel = '<span class="badge bg-warning">تأخر بسيط</span>';
            } else {
                developmentLevel = '<span class="badge bg-danger">تأخر واضح</span>';
            }
        } else {
            developmentLevel = '<span class="badge bg-light text-dark">غير محدد</span>';
        }
        
        let languageAge = '';
        if (assessment.comprehension_language_age && assessment.expression_language_age) {
            languageAge = `فهم: ${formatAge(assessment.comprehension_language_age)}<br>تعبير: ${formatAge(assessment.expression_language_age)}`;
        } else {
            languageAge = '-';
        }
        
        row.innerHTML = `
            <td>${assessment.student_name || 'غير محدد'}</td>
            <td>${assessment.assessor_name || 'غير محدد'}</td>
            <td>${formatDate(assessment.assessment_date)}</td>
            <td>${statusBadge}</td>
            <td>${languageAge}</td>
            <td>${developmentLevel}</td>
            <td>
                <div class="btn-group" role="group">
                    <button class="btn btn-sm btn-outline-primary" onclick="viewAssessmentDetails(${assessment.id})" title="عرض التفاصيل">
                        <i class="fas fa-eye"></i>
                    </button>
                    ${assessment.status !== 'completed' ? `
                        <button class="btn btn-sm btn-outline-success" onclick="continueAssessment(${assessment.id})" title="متابعة التقييم">
                            <i class="fas fa-play"></i>
                        </button>
                    ` : ''}
                    <button class="btn btn-sm btn-outline-info" onclick="generateReport(${assessment.id})" title="تقرير">
                        <i class="fas fa-file-alt"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteAssessment(${assessment.id})" title="حذف">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        
        tbody.appendChild(row);
    });
}

// تحميل قائمة الطلاب
async function loadStudents() {
    try {
        const response = await fetch('/api/students', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        
        if (response.ok) {
            const students = await response.json();
            const selects = ['studentFilter', 'newStudentId'];
            
            selects.forEach(selectId => {
                const select = document.getElementById(selectId);
                select.innerHTML = selectId === 'studentFilter' ? '<option value="">جميع الطلاب</option>' : '<option value="">اختر الطالب</option>';
                
                students.forEach(student => {
                    const option = document.createElement('option');
                    option.value = student.id;
                    option.textContent = student.name;
                    select.appendChild(option);
                });
            });
        }
    } catch (error) {
        console.error('خطأ في تحميل الطلاب:', error);
    }
}

// تحميل قائمة المقيمين
async function loadAssessors() {
    try {
        const response = await fetch('/api/teachers', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        
        if (response.ok) {
            const assessors = await response.json();
            const selects = ['assessorFilter', 'newAssessorId'];
            
            selects.forEach(selectId => {
                const select = document.getElementById(selectId);
                select.innerHTML = selectId === 'assessorFilter' ? '<option value="">جميع المقيمين</option>' : '<option value="">اختر المقيم</option>';
                
                assessors.forEach(assessor => {
                    const option = document.createElement('option');
                    option.value = assessor.id;
                    option.textContent = assessor.name;
                    select.appendChild(option);
                });
            });
        }
    } catch (error) {
        console.error('خطأ في تحميل المقيمين:', error);
    }
}

// عرض نافذة التقييم الجديد
function showNewAssessmentModal() {
    const modal = new bootstrap.Modal(document.getElementById('newAssessmentModal'));
    modal.show();
}

// إنشاء تقييم جديد
async function createNewAssessment() {
    try {
        const formData = {
            student_id: document.getElementById('newStudentId').value,
            assessor_id: document.getElementById('newAssessorId').value,
            assessment_date: document.getElementById('newAssessmentDate').value,
            scale_version: document.getElementById('newScaleVersion').value,
            age_years: parseInt(document.getElementById('newAgeYears').value) || 0,
            age_months: parseInt(document.getElementById('newAgeMonths').value) || 0,
            age_days: parseInt(document.getElementById('newAgeDays').value) || 0,
            primary_language: document.getElementById('newPrimaryLanguage').value,
            assessment_environment: document.getElementById('newAssessmentEnvironment').value,
            session_duration: parseInt(document.getElementById('newSessionDuration').value) || 45,
            number_of_sessions: parseInt(document.getElementById('newNumberOfSessions').value) || 1,
            behavioral_observations: document.getElementById('newBehavioralObservations').value,
            notes: document.getElementById('newNotes').value
        };
        
        if (!formData.student_id || !formData.assessor_id) {
            showNotification('يرجى اختيار الطالب والمقيم', 'error');
            return;
        }
        
        showLoading();
        const response = await fetch('/api/reynell/assessments', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(formData)
        });
        
        if (response.ok) {
            const result = await response.json();
            showNotification('تم إنشاء التقييم بنجاح', 'success');
            
            bootstrap.Modal.getInstance(document.getElementById('newAssessmentModal')).hide();
            document.getElementById('newAssessmentForm').reset();
            loadAssessments();
            loadStatistics();
            
            continueAssessment(result.assessment_id);
        } else {
            const error = await response.json();
            showNotification(error.message || 'خطأ في إنشاء التقييم', 'error');
        }
    } catch (error) {
        console.error('خطأ في إنشاء التقييم:', error);
        showNotification('خطأ في إنشاء التقييم', 'error');
    } finally {
        hideLoading();
    }
}

// وظائف مساعدة
function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-SA');
}

function formatAge(ageInMonths) {
    if (!ageInMonths) return '-';
    const years = Math.floor(ageInMonths / 12);
    const months = ageInMonths % 12;
    return `${years} سنة ${months} شهر`;
}

function showLoading() {
    document.querySelector('.loading-spinner').style.display = 'block';
}

function hideLoading() {
    document.querySelector('.loading-spinner').style.display = 'none';
}

function showNotification(message, type = 'info') {
    const alertClass = type === 'error' ? 'alert-danger' : type === 'success' ? 'alert-success' : 'alert-info';
    const alertHtml = `
        <div class="alert ${alertClass} alert-dismissible fade show position-fixed" style="top: 20px; right: 20px; z-index: 9999;">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', alertHtml);
    
    setTimeout(() => {
        const alert = document.querySelector('.alert');
        if (alert) alert.remove();
    }, 5000);
}

// متابعة التقييم
async function continueAssessment(assessmentId) {
    showNotification('سيتم تطوير واجهة التقييم قريباً', 'info');
}

// عرض تفاصيل التقييم
async function viewAssessmentDetails(assessmentId) {
    showNotification('سيتم تطوير عرض التفاصيل قريباً', 'info');
}

// حذف التقييم
async function deleteAssessment(assessmentId) {
    if (confirm('هل أنت متأكد من حذف هذا التقييم؟')) {
        showNotification('سيتم تطوير وظيفة الحذف قريباً', 'info');
    }
}

// تطبيق الفلاتر
function applyFilters() {
    loadAssessments();
}

// مسح الفلاتر
function clearFilters() {
    document.getElementById('studentFilter').value = '';
    document.getElementById('assessorFilter').value = '';
    document.getElementById('statusFilter').value = '';
    document.getElementById('versionFilter').value = '';
    document.getElementById('dateFromFilter').value = '';
    document.getElementById('dateToFilter').value = '';
    loadAssessments();
}

// إنشاء التقرير
async function generateReport(assessmentId) {
    showNotification('سيتم تطوير إنشاء التقارير قريباً', 'info');
}
