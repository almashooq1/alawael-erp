// Case Tracking JavaScript
let casesData = [];
let clinicsData = [];
let specialistsData = [];
let studentsData = [];
let currentCaseId = null;

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    loadInitialData();
    setupEventListeners();
});

// Load initial data
async function loadInitialData() {
    try {
        await Promise.all([
            loadCases(),
            loadClinics(),
            loadStudents(),
            loadCaseStats()
        ]);
    } catch (error) {
        console.error('Error loading initial data:', error);
        showAlert('حدث خطأ في تحميل البيانات', 'error');
    }
}

// Load cases (treatment plans)
async function loadCases() {
    try {
        const response = await fetch('/api/treatment-plans', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            casesData = await response.json();
            displayCases();
        }
    } catch (error) {
        console.error('Error loading cases:', error);
    }
}

// Load clinics
async function loadClinics() {
    try {
        const response = await fetch('/api/clinic-types', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            clinicsData = await response.json();
            populateClinicSelects();
        }
    } catch (error) {
        console.error('Error loading clinics:', error);
    }
}

// Load students
async function loadStudents() {
    try {
        const response = await fetch('/api/students', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            studentsData = await response.json();
            populateStudentSelect();
        }
    } catch (error) {
        console.error('Error loading students:', error);
    }
}

// Load case statistics
async function loadCaseStats() {
    try {
        const response = await fetch('/api/clinics/stats', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const stats = await response.json();
            updateStatsDisplay(stats);
        }
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// Update statistics display
function updateStatsDisplay(stats) {
    document.getElementById('activeCases').textContent = stats.active_cases || 0;
    document.getElementById('completedSessions').textContent = stats.completed_sessions || 0;
    document.getElementById('upcomingSessions').textContent = stats.upcoming_sessions || 0;
    document.getElementById('treatmentPlans').textContent = stats.treatment_plans || 0;
}

// Display cases
function displayCases() {
    const container = document.getElementById('casesContainer');
    container.innerHTML = '';
    
    if (casesData.length === 0) {
        container.innerHTML = `
            <div class="col-12">
                <div class="case-card text-center">
                    <div class="card-body">
                        <i class="fas fa-notes-medical fa-3x text-muted mb-3"></i>
                        <h5 class="text-muted">لا توجد حالات</h5>
                        <p class="text-muted">ابدأ بإنشاء حالة جديدة لمتابعة تقدم الطلاب</p>
                        <button class="btn btn-case" onclick="showNewCaseModal()">
                            <i class="fas fa-plus"></i> إنشاء حالة جديدة
                        </button>
                    </div>
                </div>
            </div>
        `;
        return;
    }
    
    casesData.forEach(caseItem => {
        const caseCard = createCaseCard(caseItem);
        container.appendChild(caseCard);
    });
}

// Create case card
function createCaseCard(caseItem) {
    const col = document.createElement('div');
    col.className = 'col-lg-6 col-xl-4';
    
    const statusClass = getStatusClass(caseItem.status);
    const priorityColor = getPriorityColor(caseItem.priority);
    
    col.innerHTML = `
        <div class="case-card">
            <div class="card-header d-flex justify-content-between align-items-center" style="background-color: ${priorityColor}; color: white;">
                <div>
                    <h6 class="mb-0">${caseItem.student_name}</h6>
                    <small>${caseItem.clinic_name}</small>
                </div>
                <span class="case-status ${statusClass}">
                    ${getStatusText(caseItem.status)}
                </span>
            </div>
            <div class="card-body">
                <div class="mb-3">
                    <strong>الأخصائي:</strong> ${caseItem.specialist_name}<br>
                    <strong>تاريخ البدء:</strong> ${formatDate(caseItem.start_date)}<br>
                    <strong>آخر جلسة:</strong> ${caseItem.last_session_date ? formatDate(caseItem.last_session_date) : 'لا توجد'}
                </div>
                
                <div class="mb-3">
                    <div class="d-flex justify-content-between">
                        <span>التقدم العام</span>
                        <span>${caseItem.overall_progress || 0}%</span>
                    </div>
                    <div class="progress-bar-custom">
                        <div class="progress-fill progress-${getProgressLevel(caseItem.overall_progress)}" 
                             style="width: ${caseItem.overall_progress || 0}%"></div>
                    </div>
                </div>
                
                <div class="row text-center mb-3">
                    <div class="col-4">
                        <div class="fw-bold text-primary">${caseItem.total_sessions || 0}</div>
                        <small class="text-muted">جلسة</small>
                    </div>
                    <div class="col-4">
                        <div class="fw-bold text-success">${caseItem.completed_goals || 0}</div>
                        <small class="text-muted">هدف مكتمل</small>
                    </div>
                    <div class="col-4">
                        <div class="fw-bold text-warning">${caseItem.pending_goals || 0}</div>
                        <small class="text-muted">هدف معلق</small>
                    </div>
                </div>
                
                <div class="text-center">
                    <button class="btn btn-sm btn-outline-primary mx-1" onclick="viewCaseDetails(${caseItem.id})">
                        <i class="fas fa-eye"></i> عرض التفاصيل
                    </button>
                    <button class="btn btn-sm btn-outline-success mx-1" onclick="addSession(${caseItem.id})">
                        <i class="fas fa-plus"></i> جلسة جديدة
                    </button>
                    <button class="btn btn-sm btn-outline-info mx-1" onclick="generateCaseReport(${caseItem.id})">
                        <i class="fas fa-file-alt"></i> تقرير
                    </button>
                </div>
            </div>
        </div>
    `;
    
    return col;
}

// View case details
async function viewCaseDetails(caseId) {
    currentCaseId = caseId;
    
    try {
        // Load case details
        const caseResponse = await fetch(`/api/treatment-plans/${caseId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (caseResponse.ok) {
            const caseDetails = await caseResponse.json();
            displayCaseDetails(caseDetails);
            
            // Load sessions for this case
            await loadCaseSessions(caseId);
            
            // Show modal
            const modal = new bootstrap.Modal(document.getElementById('caseDetailsModal'));
            modal.show();
        }
    } catch (error) {
        console.error('Error loading case details:', error);
        showAlert('حدث خطأ في تحميل تفاصيل الحالة', 'error');
    }
}

// Display case details
function displayCaseDetails(caseDetails) {
    document.getElementById('caseInfo').innerHTML = `
        <div class="mb-3">
            <strong>الطالب:</strong> ${caseDetails.student_name}<br>
            <strong>العيادة:</strong> ${caseDetails.clinic_name}<br>
            <strong>الأخصائي:</strong> ${caseDetails.specialist_name}<br>
            <strong>تاريخ البدء:</strong> ${formatDate(caseDetails.start_date)}<br>
            <strong>الحالة:</strong> <span class="case-status ${getStatusClass(caseDetails.status)}">${getStatusText(caseDetails.status)}</span>
        </div>
        <div class="mb-3">
            <strong>الوصف:</strong><br>
            <p class="text-muted">${caseDetails.description || 'لا يوجد وصف'}</p>
        </div>
        <div class="mb-3">
            <strong>الملاحظات:</strong><br>
            <p class="text-muted">${caseDetails.notes || 'لا توجد ملاحظات'}</p>
        </div>
    `;
    
    // Display treatment goals
    displayTreatmentGoals(caseDetails.goals || []);
}

// Display treatment goals
function displayTreatmentGoals(goals) {
    const container = document.getElementById('treatmentGoals');
    
    if (goals.length === 0) {
        container.innerHTML = '<p class="text-muted">لا توجد أهداف محددة</p>';
        return;
    }
    
    container.innerHTML = goals.map(goal => `
        <div class="treatment-goal goal-${goal.status}">
            <div class="d-flex justify-content-between align-items-center mb-2">
                <strong>${goal.goal_description}</strong>
                <span class="badge bg-${getGoalStatusColor(goal.status)}">${getGoalStatusText(goal.status)}</span>
            </div>
            <div class="small text-muted">
                <strong>الهدف:</strong> ${goal.target_value || 'غير محدد'}<br>
                <strong>التقدم:</strong> ${goal.current_progress || 0}%
            </div>
            <div class="progress-bar-custom mt-2">
                <div class="progress-fill progress-${getProgressLevel(goal.current_progress)}" 
                     style="width: ${goal.current_progress || 0}%"></div>
            </div>
        </div>
    `).join('');
}

// Load case sessions
async function loadCaseSessions(caseId) {
    try {
        const response = await fetch(`/api/therapy-sessions?treatment_plan_id=${caseId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const sessions = await response.json();
            displaySessionsTimeline(sessions);
        }
    } catch (error) {
        console.error('Error loading sessions:', error);
    }
}

// Display sessions timeline
function displaySessionsTimeline(sessions) {
    const container = document.getElementById('sessionsTimeline');
    
    if (sessions.length === 0) {
        container.innerHTML = '<p class="text-muted">لا توجد جلسات مسجلة</p>';
        return;
    }
    
    // Sort sessions by date (newest first)
    sessions.sort((a, b) => new Date(b.session_date) - new Date(a.session_date));
    
    container.innerHTML = sessions.map(session => `
        <div class="session-item ${getSessionStatus(session)}">
            <div class="d-flex justify-content-between align-items-center mb-2">
                <div>
                    <strong>${formatDateTime(session.session_date)}</strong>
                    <span class="badge bg-info ms-2">${getSessionTypeText(session.session_type)}</span>
                </div>
                <div class="text-muted">
                    ${session.session_duration || 30} دقيقة
                </div>
            </div>
            
            ${session.chief_complaint ? `
                <div class="mb-2">
                    <strong>الشكوى الرئيسية:</strong>
                    <p class="text-muted mb-1">${session.chief_complaint}</p>
                </div>
            ` : ''}
            
            ${session.assessment ? `
                <div class="mb-2">
                    <strong>التقييم:</strong>
                    <p class="text-muted mb-1">${session.assessment}</p>
                </div>
            ` : ''}
            
            ${session.progress_notes ? `
                <div class="mb-2">
                    <strong>ملاحظات التقدم:</strong>
                    <p class="text-muted mb-1">${session.progress_notes}</p>
                </div>
            ` : ''}
            
            <div class="d-flex justify-content-between align-items-center">
                <span class="badge bg-${getAttendanceColor(session.attendance_status)}">
                    ${getAttendanceText(session.attendance_status)}
                </span>
                <div>
                    <button class="btn btn-sm btn-outline-primary" onclick="viewSessionDetails(${session.id})">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-warning" onclick="editSession(${session.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// Setup event listeners
function setupEventListeners() {
    // Search input
    document.getElementById('searchStudent')?.addEventListener('keyup', debounce(filterCases, 300));
    
    // Filter dropdowns
    document.getElementById('filterClinic')?.addEventListener('change', filterCases);
    document.getElementById('filterSpecialist')?.addEventListener('change', filterCases);
    document.getElementById('filterStatus')?.addEventListener('change', filterCases);
}

// Populate select dropdowns
function populateClinicSelects() {
    const selects = ['filterClinic', 'caseClinic'];
    
    selects.forEach(selectId => {
        const select = document.getElementById(selectId);
        if (select) {
            const currentValue = select.value;
            select.innerHTML = selectId === 'filterClinic' ? '<option value="">جميع العيادات</option>' : '<option value="">اختر العيادة</option>';
            
            clinicsData.forEach(clinic => {
                const option = document.createElement('option');
                option.value = clinic.id;
                option.textContent = clinic.clinic_name;
                select.appendChild(option);
            });
            
            select.value = currentValue;
        }
    });
}

function populateStudentSelect() {
    const select = document.getElementById('caseStudent');
    if (select) {
        select.innerHTML = '<option value="">اختر الطالب</option>';
        
        studentsData.forEach(student => {
            const option = document.createElement('option');
            option.value = student.id;
            option.textContent = student.full_name;
            select.appendChild(option);
        });
    }
}

// Modal functions
function showNewCaseModal() {
    const modal = new bootstrap.Modal(document.getElementById('newCaseModal'));
    modal.show();
}

function showNewSessionModal() {
    if (!currentCaseId) {
        showAlert('يرجى اختيار حالة أولاً', 'warning');
        return;
    }
    
    const modal = new bootstrap.Modal(document.getElementById('newSessionModal'));
    modal.show();
}

// Create new case
async function createCase() {
    const caseData = {
        student_id: parseInt(document.getElementById('caseStudent').value),
        clinic_type_id: parseInt(document.getElementById('caseClinic').value),
        specialist_id: parseInt(document.getElementById('caseSpecialist').value),
        priority: document.getElementById('casePriority').value,
        description: document.getElementById('caseDescription').value,
        goals: document.getElementById('initialGoals').value
    };
    
    if (!caseData.student_id || !caseData.clinic_type_id || !caseData.specialist_id) {
        showAlert('يرجى ملء جميع الحقول المطلوبة', 'warning');
        return;
    }
    
    try {
        const response = await fetch('/api/treatment-plans', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(caseData)
        });
        
        if (response.ok) {
            showAlert('تم إنشاء الحالة بنجاح', 'success');
            bootstrap.Modal.getInstance(document.getElementById('newCaseModal')).hide();
            document.getElementById('newCaseForm').reset();
            loadCases();
            loadCaseStats();
        } else {
            const error = await response.json();
            showAlert(error.message || 'حدث خطأ في إنشاء الحالة', 'error');
        }
    } catch (error) {
        console.error('Error creating case:', error);
        showAlert('حدث خطأ في إنشاء الحالة', 'error');
    }
}

// Save new session
async function saveSession() {
    const sessionData = {
        treatment_plan_id: currentCaseId,
        session_date: document.getElementById('sessionDate').value,
        session_duration: parseInt(document.getElementById('sessionDuration').value),
        session_type: document.getElementById('sessionType').value,
        chief_complaint: document.getElementById('chiefComplaint').value,
        assessment: document.getElementById('assessment').value,
        diagnosis: document.getElementById('diagnosis').value,
        treatment_plan: document.getElementById('treatmentPlan').value,
        interventions: document.getElementById('interventions').value,
        progress_notes: document.getElementById('progressNotes').value,
        attendance_status: document.getElementById('attendanceStatus').value,
        parent_involvement: document.getElementById('parentInvolvement').value,
        homework: document.getElementById('homework').value,
        recommendations: document.getElementById('recommendations').value,
        follow_up_required: document.getElementById('followUpRequired').checked,
        follow_up_date: document.getElementById('followUpDate').value || null
    };
    
    if (!sessionData.session_date) {
        showAlert('يرجى تحديد تاريخ الجلسة', 'warning');
        return;
    }
    
    try {
        const response = await fetch('/api/therapy-sessions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(sessionData)
        });
        
        if (response.ok) {
            showAlert('تم حفظ الجلسة بنجاح', 'success');
            bootstrap.Modal.getInstance(document.getElementById('newSessionModal')).hide();
            document.getElementById('newSessionForm').reset();
            
            // Reload sessions if case details modal is open
            if (currentCaseId) {
                loadCaseSessions(currentCaseId);
            }
            
            loadCases();
            loadCaseStats();
        } else {
            const error = await response.json();
            showAlert(error.message || 'حدث خطأ في حفظ الجلسة', 'error');
        }
    } catch (error) {
        console.error('Error saving session:', error);
        showAlert('حدث خطأ في حفظ الجلسة', 'error');
    }
}

// Filter cases
function filterCases() {
    const clinicFilter = document.getElementById('filterClinic').value;
    const specialistFilter = document.getElementById('filterSpecialist').value;
    const statusFilter = document.getElementById('filterStatus').value;
    const searchTerm = document.getElementById('searchStudent').value.toLowerCase();
    
    let filteredCases = casesData;
    
    if (clinicFilter) {
        filteredCases = filteredCases.filter(c => c.clinic_type_id == clinicFilter);
    }
    
    if (specialistFilter) {
        filteredCases = filteredCases.filter(c => c.specialist_id == specialistFilter);
    }
    
    if (statusFilter) {
        filteredCases = filteredCases.filter(c => c.status === statusFilter);
    }
    
    if (searchTerm) {
        filteredCases = filteredCases.filter(c => 
            c.student_name.toLowerCase().includes(searchTerm)
        );
    }
    
    // Update display with filtered cases
    const container = document.getElementById('casesContainer');
    container.innerHTML = '';
    
    filteredCases.forEach(caseItem => {
        const caseCard = createCaseCard(caseItem);
        container.appendChild(caseCard);
    });
}

// Utility functions
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-SA');
}

function formatDateTime(dateTimeString) {
    const date = new Date(dateTimeString);
    return date.toLocaleDateString('ar-SA') + ' ' + date.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
}

function getStatusClass(status) {
    const statusMap = {
        'active': 'status-active',
        'on-hold': 'status-on-hold',
        'completed': 'status-completed',
        'discontinued': 'status-discontinued'
    };
    return statusMap[status] || 'status-active';
}

function getStatusText(status) {
    const statusMap = {
        'active': 'نشط',
        'on-hold': 'معلق',
        'completed': 'مكتمل',
        'discontinued': 'متوقف'
    };
    return statusMap[status] || status;
}

function getPriorityColor(priority) {
    const colorMap = {
        'normal': '#28a745',
        'medium': '#ffc107',
        'high': '#fd7e14',
        'urgent': '#dc3545'
    };
    return colorMap[priority] || '#6c757d';
}

function getProgressLevel(progress) {
    if (progress >= 90) return 'excellent';
    if (progress >= 70) return 'good';
    if (progress >= 50) return 'fair';
    if (progress >= 30) return 'poor';
    return 'critical';
}

function getGoalStatusColor(status) {
    const colorMap = {
        'achieved': 'success',
        'in-progress': 'warning',
        'not-started': 'secondary'
    };
    return colorMap[status] || 'secondary';
}

function getGoalStatusText(status) {
    const statusMap = {
        'achieved': 'محقق',
        'in-progress': 'قيد التنفيذ',
        'not-started': 'لم يبدأ'
    };
    return statusMap[status] || status;
}

function getSessionStatus(session) {
    const now = new Date();
    const sessionDate = new Date(session.session_date);
    
    if (sessionDate > now) return 'upcoming';
    if (session.attendance_status === 'absent') return 'cancelled';
    return 'completed';
}

function getSessionTypeText(type) {
    const typeMap = {
        'assessment': 'تقييم',
        'therapy': 'علاج',
        'consultation': 'استشارة',
        'follow-up': 'متابعة'
    };
    return typeMap[type] || type;
}

function getAttendanceColor(status) {
    const colorMap = {
        'present': 'success',
        'absent': 'danger',
        'late': 'warning'
    };
    return colorMap[status] || 'secondary';
}

function getAttendanceText(status) {
    const statusMap = {
        'present': 'حاضر',
        'absent': 'غائب',
        'late': 'متأخر'
    };
    return statusMap[status] || status;
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function showAlert(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type === 'error' ? 'danger' : type} alert-dismissible fade show position-fixed`;
    alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(alertDiv);
    
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.remove();
        }
    }, 5000);
}

// Placeholder functions for future implementation
function addSession(caseId) {
    currentCaseId = caseId;
    showNewSessionModal();
}

function generateCaseReport(caseId) {
    showAlert('سيتم تنفيذ هذه الميزة قريباً', 'info');
}

function viewSessionDetails(sessionId) {
    showAlert('سيتم تنفيذ هذه الميزة قريباً', 'info');
}

function editSession(sessionId) {
    showAlert('سيتم تنفيذ هذه الميزة قريباً', 'info');
}

function editCase() {
    showAlert('سيتم تنفيذ هذه الميزة قريباً', 'info');
}

function generateReport() {
    showAlert('سيتم تنفيذ هذه الميزة قريباً', 'info');
}
