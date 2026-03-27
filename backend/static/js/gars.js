// مقياس جيليام للتوحد - JavaScript

// متغيرات عامة
let currentAssessmentId = null;
let currentDomainIndex = 0;
let assessmentData = {};
let domainItems = {};

// تحميل الإحصائيات
async function loadStatistics() {
    try {
        showLoading();
        const response = await fetch('/api/gars/statistics', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const stats = await response.json();
            document.getElementById('totalAssessments').textContent = stats.total || 0;
            document.getElementById('completedAssessments').textContent = stats.completed || 0;
            document.getElementById('inProgressAssessments').textContent = stats.in_progress || 0;
            document.getElementById('highRiskAssessments').textContent = stats.high_risk || 0;
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
        const response = await fetch('/api/gars/assessments', {
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
        
        // تحديد لون الحالة
        let statusBadge = '';
        switch (assessment.status) {
            case 'completed':
                statusBadge = '<span class="badge bg-success">مكتمل</span>';
                break;
            case 'in_progress':
                statusBadge = '<span class="badge bg-warning">قيد التنفيذ</span>';
                break;
            case 'draft':
                statusBadge = '<span class="badge bg-secondary">مسودة</span>';
                break;
            default:
                statusBadge = '<span class="badge bg-light text-dark">غير محدد</span>';
        }
        
        // تحديد مستوى الخطورة
        let riskLevel = '';
        if (assessment.autism_index) {
            if (assessment.autism_index >= 85) {
                riskLevel = '<span class="badge bg-danger">عالي</span>';
            } else if (assessment.autism_index >= 70) {
                riskLevel = '<span class="badge bg-warning">متوسط</span>';
            } else {
                riskLevel = '<span class="badge bg-success">منخفض</span>';
            }
        } else {
            riskLevel = '<span class="badge bg-light text-dark">غير محدد</span>';
        }
        
        row.innerHTML = `
            <td>${assessment.student_name || 'غير محدد'}</td>
            <td>${assessment.assessor_name || 'غير محدد'}</td>
            <td>${formatDate(assessment.assessment_date)}</td>
            <td>${statusBadge}</td>
            <td>${assessment.autism_index || '-'}</td>
            <td>${riskLevel}</td>
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
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
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
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
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
            respondent_name: document.getElementById('newRespondentName').value,
            respondent_relationship: document.getElementById('newRespondentRelationship').value,
            years_known: parseInt(document.getElementById('newYearsKnown').value) || 0,
            contact_hours: document.getElementById('newContactHours').value,
            assessment_setting: document.getElementById('newAssessmentSetting').value,
            notes: document.getElementById('newNotes').value
        };
        
        if (!formData.student_id || !formData.assessor_id) {
            showNotification('يرجى اختيار الطالب والمقيم', 'error');
            return;
        }
        
        showLoading();
        const response = await fetch('/api/gars/assessments', {
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
            
            // إغلاق النافذة وإعادة تحميل البيانات
            bootstrap.Modal.getInstance(document.getElementById('newAssessmentModal')).hide();
            document.getElementById('newAssessmentForm').reset();
            loadAssessments();
            loadStatistics();
            
            // بدء التقييم مباشرة
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

// متابعة التقييم
async function continueAssessment(assessmentId) {
    try {
        currentAssessmentId = assessmentId;
        showLoading();
        
        // تحميل بيانات التقييم
        const response = await fetch(`/api/gars/assessments/${assessmentId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            assessmentData = await response.json();
            await loadDomainItems();
            setupAssessmentInterface();
            
            const modal = new bootstrap.Modal(document.getElementById('assessmentExecutionModal'));
            modal.show();
        }
    } catch (error) {
        console.error('خطأ في تحميل التقييم:', error);
        showNotification('خطأ في تحميل التقييم', 'error');
    } finally {
        hideLoading();
    }
}

// تحميل عناصر المجالات
async function loadDomainItems() {
    try {
        const response = await fetch('/api/gars/domain-items', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            domainItems = await response.json();
        }
    } catch (error) {
        console.error('خطأ في تحميل عناصر المجالات:', error);
    }
}

// إعداد واجهة التقييم
function setupAssessmentInterface() {
    const domains = [
        { id: 'stereotypedBehaviors', name: 'السلوكيات النمطية', key: 'stereotyped_behaviors' },
        { id: 'communication', name: 'التواصل', key: 'communication' },
        { id: 'socialInteraction', name: 'التفاعل الاجتماعي', key: 'social_interaction' },
        { id: 'developmentalDisturbances', name: 'الاضطرابات النمائية', key: 'developmental_disturbances' }
    ];
    
    const tabContent = document.getElementById('domainTabContent');
    tabContent.innerHTML = '';
    
    domains.forEach((domain, index) => {
        const tabPane = document.createElement('div');
        tabPane.className = `tab-pane fade ${index === 0 ? 'show active' : ''}`;
        tabPane.id = domain.id;
        
        const items = domainItems[domain.key] || [];
        
        tabPane.innerHTML = `
            <div class="domain-section">
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <h5>${domain.name}</h5>
                    <div class="domain-progress">
                        <div class="domain-progress-bar" id="${domain.id}Progress" style="width: 0%"></div>
                    </div>
                </div>
                
                <div class="items-container">
                    ${items.map((item, itemIndex) => `
                        <div class="item-card" data-item-id="${item.id}">
                            <div class="row align-items-center">
                                <div class="col-md-8">
                                    <h6>${item.item_number}. ${item.item_text}</h6>
                                    ${item.description ? `<p class="text-muted small">${item.description}</p>` : ''}
                                </div>
                                <div class="col-md-4">
                                    <div class="score-buttons">
                                        <button class="score-btn" data-score="0" onclick="selectScore('${domain.id}', ${item.id}, 0)">0</button>
                                        <button class="score-btn" data-score="1" onclick="selectScore('${domain.id}', ${item.id}, 1)">1</button>
                                        <button class="score-btn" data-score="2" onclick="selectScore('${domain.id}', ${item.id}, 2)">2</button>
                                        <button class="score-btn" data-score="3" onclick="selectScore('${domain.id}', ${item.id}, 3)">3</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        
        tabContent.appendChild(tabPane);
    });
    
    updateProgress();
}

// اختيار النقاط
function selectScore(domainId, itemId, score) {
    // إزالة التحديد السابق
    const itemCard = document.querySelector(`[data-item-id="${itemId}"]`);
    const buttons = itemCard.querySelectorAll('.score-btn');
    buttons.forEach(btn => btn.classList.remove('active'));
    
    // تحديد الزر الجديد
    const selectedButton = itemCard.querySelector(`[data-score="${score}"]`);
    selectedButton.classList.add('active');
    
    // حفظ النقاط
    if (!assessmentData.responses) {
        assessmentData.responses = {};
    }
    assessmentData.responses[itemId] = score;
    
    updateProgress();
}

// تحديث التقدم
function updateProgress() {
    const domains = ['stereotypedBehaviors', 'communication', 'socialInteraction', 'developmentalDisturbances'];
    let totalItems = 0;
    let completedItems = 0;
    
    domains.forEach(domainId => {
        const domainItems = document.querySelectorAll(`#${domainId} .item-card`);
        const domainCompleted = document.querySelectorAll(`#${domainId} .score-btn.active`).length;
        
        totalItems += domainItems.length;
        completedItems += domainCompleted;
        
        // تحديث تقدم المجال
        const domainProgress = (domainCompleted / domainItems.length) * 100;
        const progressBar = document.getElementById(`${domainId}Progress`);
        if (progressBar) {
            progressBar.style.width = `${domainProgress}%`;
        }
    });
    
    // تحديث التقدم الإجمالي
    const overallProgress = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;
    document.getElementById('overallProgress').textContent = `${Math.round(overallProgress)}%`;
    document.getElementById('overallProgressBar').style.width = `${overallProgress}%`;
    
    // إظهار زر الإكمال إذا تم الانتهاء
    if (overallProgress === 100) {
        document.getElementById('completeAssessmentBtn').style.display = 'inline-block';
        calculateResults();
    }
}

// حساب النتائج
function calculateResults() {
    const domains = {
        stereotypedBehaviors: 'stereotyped_behaviors',
        communication: 'communication', 
        socialInteraction: 'social_interaction',
        developmentalDisturbances: 'developmental_disturbances'
    };
    
    let totalScore = 0;
    const domainScores = {};
    
    Object.keys(domains).forEach(domainId => {
        const domainKey = domains[domainId];
        const items = domainItems[domainKey] || [];
        let domainScore = 0;
        
        items.forEach(item => {
            if (assessmentData.responses && assessmentData.responses[item.id] !== undefined) {
                domainScore += assessmentData.responses[item.id];
            }
        });
        
        domainScores[domainKey] = domainScore;
        totalScore += domainScore;
    });
    
    // حساب مؤشر التوحد (مبسط)
    const autismIndex = Math.min(totalScore * 2, 160); // تحويل تقريبي
    
    // تحديث العرض
    document.getElementById('stereotypedScore').textContent = domainScores.stereotyped_behaviors || 0;
    document.getElementById('communicationScore').textContent = domainScores.communication || 0;
    document.getElementById('socialScore').textContent = domainScores.social_interaction || 0;
    document.getElementById('developmentalScore').textContent = domainScores.developmental_disturbances || 0;
    document.getElementById('autismIndex').textContent = autismIndex;
    
    // تحديد احتمالية التوحد
    let probability = '';
    if (autismIndex >= 85) {
        probability = 'احتمالية عالية جداً';
    } else if (autismIndex >= 70) {
        probability = 'احتمالية عالية';
    } else if (autismIndex >= 55) {
        probability = 'احتمالية متوسطة';
    } else {
        probability = 'احتمالية منخفضة';
    }
    
    document.getElementById('autismProbability').textContent = probability;
    document.getElementById('assessmentSummary').style.display = 'block';
}

// حفظ تقدم التقييم
async function saveAssessmentProgress() {
    try {
        showLoading();
        
        const response = await fetch(`/api/gars/assessments/${currentAssessmentId}/progress`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                responses: assessmentData.responses || {}
            })
        });
        
        if (response.ok) {
            showNotification('تم حفظ التقدم بنجاح', 'success');
        } else {
            showNotification('خطأ في حفظ التقدم', 'error');
        }
    } catch (error) {
        console.error('خطأ في حفظ التقدم:', error);
        showNotification('خطأ في حفظ التقدم', 'error');
    } finally {
        hideLoading();
    }
}

// إكمال التقييم
async function completeAssessment() {
    try {
        showLoading();
        
        const response = await fetch(`/api/gars/assessments/${currentAssessmentId}/complete`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                responses: assessmentData.responses || {}
            })
        });
        
        if (response.ok) {
            showNotification('تم إكمال التقييم بنجاح', 'success');
            bootstrap.Modal.getInstance(document.getElementById('assessmentExecutionModal')).hide();
            loadAssessments();
            loadStatistics();
        } else {
            showNotification('خطأ في إكمال التقييم', 'error');
        }
    } catch (error) {
        console.error('خطأ في إكمال التقييم:', error);
        showNotification('خطأ في إكمال التقييم', 'error');
    } finally {
        hideLoading();
    }
}

// عرض تفاصيل التقييم
async function viewAssessmentDetails(assessmentId) {
    try {
        showLoading();
        
        const response = await fetch(`/api/gars/assessments/${assessmentId}/details`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const details = await response.json();
            displayAssessmentDetails(details);
            
            const modal = new bootstrap.Modal(document.getElementById('assessmentDetailsModal'));
            modal.show();
        }
    } catch (error) {
        console.error('خطأ في تحميل تفاصيل التقييم:', error);
        showNotification('خطأ في تحميل التفاصيل', 'error');
    } finally {
        hideLoading();
    }
}

// عرض تفاصيل التقييم
function displayAssessmentDetails(details) {
    const content = document.getElementById('assessmentDetailsContent');
    content.innerHTML = `
        <div class="row">
            <div class="col-md-6">
                <h6>معلومات التقييم</h6>
                <table class="table table-sm">
                    <tr><td>الطالب:</td><td>${details.student_name}</td></tr>
                    <tr><td>المقيم:</td><td>${details.assessor_name}</td></tr>
                    <tr><td>تاريخ التقييم:</td><td>${formatDate(details.assessment_date)}</td></tr>
                    <tr><td>إصدار المقياس:</td><td>${details.scale_version}</td></tr>
                    <tr><td>العمر:</td><td>${details.age_years} سنة ${details.age_months} شهر</td></tr>
                </table>
            </div>
            <div class="col-md-6">
                <h6>النتائج</h6>
                <table class="table table-sm">
                    <tr><td>السلوكيات النمطية:</td><td>${details.stereotyped_behaviors_score || '-'}</td></tr>
                    <tr><td>التواصل:</td><td>${details.communication_score || '-'}</td></tr>
                    <tr><td>التفاعل الاجتماعي:</td><td>${details.social_interaction_score || '-'}</td></tr>
                    <tr><td>الاضطرابات النمائية:</td><td>${details.developmental_disturbances_score || '-'}</td></tr>
                    <tr><td><strong>مؤشر التوحد:</strong></td><td><strong>${details.autism_index || '-'}</strong></td></tr>
                </table>
            </div>
        </div>
        
        ${details.notes ? `
            <div class="mt-3">
                <h6>الملاحظات</h6>
                <p>${details.notes}</p>
            </div>
        ` : ''}
    `;
}

// حذف التقييم
async function deleteAssessment(assessmentId) {
    if (!confirm('هل أنت متأكد من حذف هذا التقييم؟')) {
        return;
    }
    
    try {
        showLoading();
        
        const response = await fetch(`/api/gars/assessments/${assessmentId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            showNotification('تم حذف التقييم بنجاح', 'success');
            loadAssessments();
            loadStatistics();
        } else {
            showNotification('خطأ في حذف التقييم', 'error');
        }
    } catch (error) {
        console.error('خطأ في حذف التقييم:', error);
        showNotification('خطأ في حذف التقييم', 'error');
    } finally {
        hideLoading();
    }
}

// تطبيق الفلاتر
function applyFilters() {
    // سيتم تنفيذها لاحقاً
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
    try {
        showLoading();
        
        const response = await fetch(`/api/gars/assessments/${assessmentId}/report`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `gars_report_${assessmentId}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } else {
            showNotification('خطأ في إنشاء التقرير', 'error');
        }
    } catch (error) {
        console.error('خطأ في إنشاء التقرير:', error);
        showNotification('خطأ في إنشاء التقرير', 'error');
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

function showLoading() {
    document.querySelector('.loading-spinner').style.display = 'block';
}

function hideLoading() {
    document.querySelector('.loading-spinner').style.display = 'none';
}

function showNotification(message, type = 'info') {
    // تنفيذ بسيط للإشعارات
    const alertClass = type === 'error' ? 'alert-danger' : type === 'success' ? 'alert-success' : 'alert-info';
    const alertHtml = `
        <div class="alert ${alertClass} alert-dismissible fade show position-fixed" style="top: 20px; right: 20px; z-index: 9999;">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', alertHtml);
    
    // إزالة الإشعار بعد 5 ثوان
    setTimeout(() => {
        const alert = document.querySelector('.alert');
        if (alert) {
            alert.remove();
        }
    }, 5000);
}
