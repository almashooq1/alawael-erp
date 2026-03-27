// مقياس منذر للتوحد - JavaScript

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
        const response = await fetch('/api/munther/statistics', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const stats = await response.json();
            document.getElementById('totalAssessments').textContent = stats.total || 0;
            document.getElementById('inProgressAssessments').textContent = stats.in_progress || 0;
            document.getElementById('completedAssessments').textContent = stats.completed || 0;
            document.getElementById('highRiskAssessments').textContent = stats.high_risk || 0;
        }
    } catch (error) {
        console.error('خطأ في تحميل الإحصائيات:', error);
    }
}

// تحميل التقييمات
async function loadAssessments() {
    showLoading(true);
    try {
        const response = await fetch('/api/munther/assessments', {
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
                <i class="fas fa-clipboard-list fa-3x text-muted mb-3"></i>
                <h5 class="text-muted">لا توجد تقييمات</h5>
                <p class="text-muted">ابدأ بإنشاء تقييم جديد</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = assessments.map(assessment => `
        <div class="assessment-card">
            <div class="row align-items-center">
                <div class="col-md-3">
                    <h6 class="mb-1">${assessment.student_name}</h6>
                    <small class="text-muted">رقم الهوية: ${assessment.student_id_number}</small>
                </div>
                <div class="col-md-2">
                    <small class="text-muted">المقيم</small>
                    <div>${assessment.assessor_name}</div>
                </div>
                <div class="col-md-2">
                    <small class="text-muted">تاريخ التقييم</small>
                    <div>${formatDate(assessment.assessment_date)}</div>
                </div>
                <div class="col-md-2">
                    <small class="text-muted">النوع</small>
                    <div>${getAssessmentTypeText(assessment.assessment_type)}</div>
                </div>
                <div class="col-md-2">
                    <span class="status-badge status-${assessment.status}">
                        ${getStatusText(assessment.status)}
                    </span>
                    ${assessment.autism_likelihood ? `
                        <div class="mt-1">
                            <span class="severity-indicator severity-${assessment.autism_likelihood}"></span>
                            ${getSeverityText(assessment.autism_likelihood)}
                        </div>
                    ` : ''}
                </div>
                <div class="col-md-1">
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

// تحميل الطلاب
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

// تحميل المقيمين
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

// تحميل المجالات
async function loadDomains() {
    try {
        const response = await fetch('/api/munther/domains', {
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
        assessment_type: document.getElementById('newAssessmentType').value,
        informant_name: document.getElementById('newInformantName').value,
        informant_relationship: document.getElementById('newInformantRelationship').value,
        assessment_setting: document.getElementById('newAssessmentSetting').value,
        developmental_concerns: document.getElementById('newDevelopmentalConcerns').value
    };
    
    showLoading(true);
    try {
        const response = await fetch('/api/munther/assessments', {
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
        const response = await fetch(`/api/munther/assessments/${assessmentId}`, {
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
                    <tr><td><strong>نوع التقييم:</strong></td><td>${getAssessmentTypeText(assessment.assessment_type)}</td></tr>
                    <tr><td><strong>الحالة:</strong></td><td><span class="status-badge status-${assessment.status}">${getStatusText(assessment.status)}</span></td></tr>
                </table>
            </div>
            <div class="col-md-6">
                <h6>معلومات مقدم المعلومات</h6>
                <table class="table table-sm">
                    <tr><td><strong>الاسم:</strong></td><td>${assessment.informant_name || '-'}</td></tr>
                    <tr><td><strong>العلاقة:</strong></td><td>${assessment.informant_relationship || '-'}</td></tr>
                    <tr><td><strong>مكان التقييم:</strong></td><td>${assessment.assessment_setting || '-'}</td></tr>
                </table>
            </div>
        </div>
        
        ${assessment.developmental_concerns ? `
            <div class="mt-3">
                <h6>مخاوف التطور</h6>
                <p class="bg-light p-3 rounded">${assessment.developmental_concerns}</p>
            </div>
        ` : ''}
        
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
                                    ${result.percentile_rank ? `<small class="text-muted">الرتبة المئوية: ${result.percentile_rank}%</small>` : ''}
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
        const response = await fetch(`/api/munther/assessments/${assessmentId}/data`, {
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
    
    // إنشاء التبويبات
    tabsContainer.innerHTML = currentDomains.map((domain, index) => `
        <li class="nav-item">
            <button class="nav-link domain-tab ${index === 0 ? 'active' : ''}" 
                    data-bs-toggle="pill" 
                    data-bs-target="#domain-${domain.id}">
                ${domain.name_arabic}
            </button>
        </li>
    `).join('');
    
    // إنشاء المحتوى
    contentContainer.innerHTML = currentDomains.map((domain, index) => `
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
    if (currentDomains.length > 0) {
        loadDomainItems(currentDomains[0].id);
    }
    
    updateProgress();
}

// تحميل عناصر المجال
async function loadDomainItems(domainId) {
    try {
        const response = await fetch(`/api/munther/domains/${domainId}/items`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const items = await response.json();
            displayDomainItems(domainId, items);
        }
    } catch (error) {
        console.error('خطأ في تحميل عناصر المجال:', error);
    }
}

// عرض عناصر المجال
function displayDomainItems(domainId, items) {
    const container = document.getElementById(`domain-${domainId}-items`);
    
    container.innerHTML = items.map(item => {
        const response = assessmentData.responses ? assessmentData.responses.find(r => r.item_id === item.id) : null;
        const isCompleted = response && response.raw_score !== null;
        
        return `
            <div class="item-card ${isCompleted ? 'completed' : ''}" data-item-id="${item.id}">
                <div class="row align-items-center">
                    <div class="col-md-8">
                        <h6>${item.item_number}. ${item.item_text_arabic}</h6>
                        ${item.examples ? `<small class="text-muted">أمثلة: ${item.examples}</small>` : ''}
                    </div>
                    <div class="col-md-4">
                        <div class="scoring-section">
                            <label class="form-label">النقاط</label>
                            <select class="form-select form-select-sm" onchange="saveItemResponse(${item.id}, this.value)">
                                <option value="">اختر النقاط</option>
                                ${item.scoring_options ? Object.entries(item.scoring_options).map(([value, label]) => 
                                    `<option value="${value}" ${response && response.raw_score == value ? 'selected' : ''}>${value} - ${label}</option>`
                                ).join('') : ''}
                            </select>
                        </div>
                        <div class="mt-2">
                            <textarea class="form-control form-control-sm" 
                                      placeholder="ملاحظات..." 
                                      onchange="saveItemObservations(${item.id}, this.value)">${response ? response.observations || '' : ''}</textarea>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// حفظ استجابة العنصر
async function saveItemResponse(itemId, score) {
    if (!score) return;
    
    try {
        const response = await fetch(`/api/munther/assessments/${currentAssessmentId}/responses`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                item_id: itemId,
                raw_score: parseInt(score)
            })
        });
        
        if (response.ok) {
            // تحديث البيانات المحلية
            if (!assessmentData.responses) assessmentData.responses = [];
            const existingIndex = assessmentData.responses.findIndex(r => r.item_id === itemId);
            const responseData = await response.json();
            
            if (existingIndex >= 0) {
                assessmentData.responses[existingIndex] = responseData;
            } else {
                assessmentData.responses.push(responseData);
            }
            
            // تحديث مظهر العنصر
            const itemCard = document.querySelector(`[data-item-id="${itemId}"]`);
            if (itemCard) {
                itemCard.classList.add('completed');
            }
            
            updateProgress();
        }
    } catch (error) {
        console.error('خطأ في حفظ الاستجابة:', error);
    }
}

// حفظ ملاحظات العنصر
async function saveItemObservations(itemId, observations) {
    try {
        await fetch(`/api/munther/assessments/${currentAssessmentId}/responses`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                item_id: itemId,
                observations: observations
            })
        });
    } catch (error) {
        console.error('خطأ في حفظ الملاحظات:', error);
    }
}

// تحديث شريط التقدم
function updateProgress() {
    const totalItems = currentDomains.reduce((sum, domain) => sum + (domain.items_count || 0), 0);
    const completedItems = assessmentData.responses ? assessmentData.responses.filter(r => r.raw_score !== null).length : 0;
    const progress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
    
    document.getElementById('progressBar').style.width = `${progress}%`;
    document.getElementById('progressText').textContent = `${progress}%`;
    
    // إظهار زر الإكمال إذا كان التقدم 100%
    const completeBtn = document.getElementById('completeAssessmentBtn');
    if (progress === 100) {
        completeBtn.style.display = 'block';
    } else {
        completeBtn.style.display = 'none';
    }
}

// إكمال التقييم
async function completeAssessment() {
    if (!confirm('هل أنت متأكد من إكمال التقييم؟ لن تتمكن من تعديله بعد ذلك.')) {
        return;
    }
    
    showLoading(true);
    try {
        const response = await fetch(`/api/munther/assessments/${currentAssessmentId}/complete`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            showSuccess('تم إكمال التقييم بنجاح');
            bootstrap.Modal.getInstance(document.getElementById('domainAssessmentModal')).hide();
            loadAssessments();
            loadStatistics();
        } else {
            showError('فشل في إكمال التقييم');
        }
    } catch (error) {
        console.error('خطأ في إكمال التقييم:', error);
        showError('خطأ في الاتصال بالخادم');
    } finally {
        showLoading(false);
    }
}

// تطبيق الفلاتر
function applyFilters() {
    const filters = {
        student_id: document.getElementById('studentFilter').value,
        assessor_id: document.getElementById('assessorFilter').value,
        status: document.getElementById('statusFilter').value,
        assessment_type: document.getElementById('typeFilter').value
    };
    
    const queryParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
        if (value) queryParams.append(key, value);
    });
    
    loadAssessmentsWithFilters(queryParams.toString());
}

// تحميل التقييمات مع الفلاتر
async function loadAssessmentsWithFilters(queryString) {
    showLoading(true);
    try {
        const response = await fetch(`/api/munther/assessments?${queryString}`, {
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

// إنشاء تقرير
async function generateReport(assessmentId) {
    showLoading(true);
    try {
        const response = await fetch(`/api/munther/assessments/${assessmentId}/report`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const result = await response.json();
            showSuccess('تم إنشاء التقرير بنجاح');
            // فتح التقرير في نافذة جديدة
            window.open(`/api/munther/reports/${result.report_id}/pdf`, '_blank');
        } else {
            showError('فشل في إنشاء التقرير');
        }
    } catch (error) {
        console.error('خطأ في إنشاء التقرير:', error);
        showError('خطأ في الاتصال بالخادم');
    } finally {
        showLoading(false);
    }
}

// حذف التقييم
async function deleteAssessment(assessmentId) {
    if (!confirm('هل أنت متأكد من حذف هذا التقييم؟ هذا الإجراء لا يمكن التراجع عنه.')) {
        return;
    }
    
    showLoading(true);
    try {
        const response = await fetch(`/api/munther/assessments/${assessmentId}`, {
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

function getAssessmentTypeText(type) {
    const typeMap = {
        'clinical': 'سريري',
        'screening': 'فحص',
        'follow_up': 'متابعة'
    };
    return typeMap[type] || type;
}

function getSeverityText(severity) {
    const severityMap = {
        'minimal': 'طفيف',
        'mild': 'خفيف',
        'moderate': 'متوسط',
        'severe': 'شديد',
        'high': 'عالي',
        'low': 'منخفض'
    };
    return severityMap[severity] || severity;
}

function showLoading(show) {
    const spinner = document.getElementById('loadingSpinner');
    spinner.style.display = show ? 'block' : 'none';
}

function showSuccess(message) {
    // يمكن تحسينها باستخدام مكتبة إشعارات
    alert(message);
}

function showError(message) {
    // يمكن تحسينها باستخدام مكتبة إشعارات
    alert('خطأ: ' + message);
}

// معالج تغيير التبويبات
document.addEventListener('shown.bs.tab', function (event) {
    const targetId = event.target.getAttribute('data-bs-target');
    if (targetId && targetId.startsWith('#domain-')) {
        const domainId = targetId.replace('#domain-', '');
        loadDomainItems(domainId);
    }
});
