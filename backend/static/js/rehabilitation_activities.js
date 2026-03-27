// Rehabilitation Activities JavaScript
let currentUser = null;
let activities = [];
let beneficiaries = [];
let currentPage = 1;
let totalPages = 1;
let itemsPerPage = 9;
let currentFilters = {
    search: '',
    type: '',
    difficulty: '',
    sortBy: 'created_at'
};
let currentActivityId = null;

// Initialize the rehabilitation activities system
$(document).ready(function() {
    initializeActivitiesSystem();
});

function initializeActivitiesSystem() {
    // Get current user info
    getCurrentUser();
    
    // Load initial data
    loadBeneficiaries();
    loadActivities();
    
    // Set up event listeners
    setupEventListeners();
}

function getCurrentUser() {
    const token = localStorage.getItem('token');
    if (token) {
        $.ajax({
            url: '/api/user/profile',
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + token
            },
            success: function(response) {
                currentUser = response.user;
            },
            error: function() {
                console.log('Error getting user profile');
            }
        });
    }
}

function setupEventListeners() {
    // Search and filter events
    $('#searchActivities').on('input', function() {
        currentFilters.search = $(this).val();
        currentPage = 1;
        loadActivities();
    });
    
    $('#filterType').on('change', function() {
        currentFilters.type = $(this).val();
        currentPage = 1;
        loadActivities();
    });
    
    $('#filterDifficulty').on('change', function() {
        currentFilters.difficulty = $(this).val();
        currentPage = 1;
        loadActivities();
    });
    
    $('#sortBy').on('change', function() {
        currentFilters.sortBy = $(this).val();
        currentPage = 1;
        loadActivities();
    });
}

// Load beneficiaries
function loadBeneficiaries() {
    const token = localStorage.getItem('token');
    if (!token) return;

    $.ajax({
        url: '/api/rehabilitation/beneficiaries',
        method: 'GET',
        headers: {
            'Authorization': 'Bearer ' + token
        },
        success: function(response) {
            beneficiaries = response.beneficiaries || [];
            populateBeneficiarySelect();
        },
        error: function() {
            console.log('Error loading beneficiaries');
        }
    });
}

function populateBeneficiarySelect() {
    const select = $('#participationBeneficiary');
    select.empty().append('<option value="">اختر المستفيد</option>');
    
    beneficiaries.forEach(beneficiary => {
        select.append(`<option value="${beneficiary.id}">${beneficiary.name}</option>`);
    });
}

// Load activities
function loadActivities() {
    const token = localStorage.getItem('token');
    if (!token) return;

    // Build query parameters
    const params = new URLSearchParams({
        page: currentPage,
        per_page: itemsPerPage,
        sort_by: currentFilters.sortBy
    });
    
    if (currentFilters.search) params.append('search', currentFilters.search);
    if (currentFilters.type) params.append('activity_type', currentFilters.type);
    if (currentFilters.difficulty) params.append('difficulty_level', currentFilters.difficulty);

    $.ajax({
        url: `/api/rehabilitation/activities?${params.toString()}`,
        method: 'GET',
        headers: {
            'Authorization': 'Bearer ' + token
        },
        success: function(response) {
            activities = response.activities || [];
            totalPages = response.pagination ? response.pagination.pages : 1;
            populateActivitiesGrid();
            updatePagination();
        },
        error: function() {
            console.log('Error loading activities');
            showAlert('حدث خطأ في تحميل الأنشطة', 'danger');
        }
    });
}

function populateActivitiesGrid() {
    const container = $('#activitiesContainer');
    container.empty();

    if (activities.length === 0) {
        container.html(`
            <div class="col-12">
                <div class="text-center py-5">
                    <i class="fas fa-puzzle-piece fa-3x text-muted mb-3"></i>
                    <h5 class="text-muted">لا توجد أنشطة تأهيلية</h5>
                    <p class="text-muted">ابدأ بإنشاء نشاط تأهيلي جديد</p>
                    <button class="btn btn-success" onclick="openCreateActivityModal()">
                        <i class="fas fa-plus me-2"></i>إنشاء نشاط جديد
                    </button>
                </div>
            </div>
        `);
        return;
    }

    activities.forEach(activity => {
        const activityCard = createActivityCard(activity);
        container.append(activityCard);
    });
}

function createActivityCard(activity) {
    const typeLabel = getActivityTypeLabel(activity.activity_type);
    const difficultyLabel = getDifficultyLabel(activity.difficulty_level);
    const typeClass = getActivityTypeClass(activity.activity_type);
    const difficultyClass = getDifficultyClass(activity.difficulty_level);
    
    return `
        <div class="col-lg-6 col-xl-4">
            <div class="activity-card">
                <div class="activity-header">
                    <div>
                        <h6 class="mb-1">${activity.name}</h6>
                        <div class="mb-2">
                            <span class="activity-type-badge ${typeClass}">${typeLabel}</span>
                            <span class="difficulty-badge ${difficultyClass}">${difficultyLabel}</span>
                        </div>
                    </div>
                </div>
                
                <p class="text-muted mb-3">${activity.description}</p>
                
                ${activity.target_skills && activity.target_skills.length > 0 ? `
                <div class="mb-3">
                    <h6 class="mb-2">المهارات المستهدفة</h6>
                    <div>
                        ${activity.target_skills.slice(0, 3).map(skill => 
                            `<span class="skill-tag">${skill}</span>`
                        ).join('')}
                        ${activity.target_skills.length > 3 ? 
                            `<span class="skill-tag">+${activity.target_skills.length - 3} أخرى</span>` : ''
                        }
                    </div>
                </div>
                ` : ''}
                
                ${activity.required_materials && activity.required_materials.length > 0 ? `
                <div class="mb-3">
                    <h6 class="mb-2">المواد المطلوبة</h6>
                    ${activity.required_materials.slice(0, 2).map(material => 
                        `<div class="material-item">${material}</div>`
                    ).join('')}
                    ${activity.required_materials.length > 2 ? 
                        `<small class="text-muted">+${activity.required_materials.length - 2} مواد أخرى</small>` : ''
                    }
                </div>
                ` : ''}
                
                ${activity.instructions && activity.instructions.length > 0 ? `
                <div class="mb-3">
                    <h6 class="mb-2">خطوات التنفيذ</h6>
                    ${activity.instructions.slice(0, 2).map((instruction, index) => 
                        `<div class="instruction-step">
                            <div class="step-number">${index + 1}</div>
                            ${instruction}
                        </div>`
                    ).join('')}
                    ${activity.instructions.length > 2 ? 
                        `<small class="text-muted">+${activity.instructions.length - 2} خطوات أخرى</small>` : ''
                    }
                </div>
                ` : ''}
                
                <div class="activity-stats">
                    <div class="stat-item">
                        <div class="stat-number">${activity.duration_minutes || '--'}</div>
                        <div class="stat-label">دقيقة</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-number">--</div>
                        <div class="stat-label">مشاركة</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-number">--</div>
                        <div class="stat-label">متوسط التقييم</div>
                    </div>
                </div>
                
                <div class="activity-actions">
                    <button class="btn btn-outline-primary btn-activity" onclick="viewActivityDetails(${activity.id})">
                        <i class="fas fa-eye me-1"></i>عرض
                    </button>
                    <button class="btn btn-outline-warning btn-activity" onclick="editActivity(${activity.id})">
                        <i class="fas fa-edit me-1"></i>تعديل
                    </button>
                    <button class="btn btn-outline-info btn-activity" onclick="viewParticipations(${activity.id})">
                        <i class="fas fa-users me-1"></i>المشاركات
                    </button>
                    <button class="btn btn-outline-success btn-activity" onclick="duplicateActivity(${activity.id})">
                        <i class="fas fa-copy me-1"></i>نسخ
                    </button>
                </div>
            </div>
        </div>
    `;
}

function updatePagination() {
    const pagination = $('#activitiesPagination');
    pagination.empty();
    
    if (totalPages <= 1) return;
    
    // Previous button
    pagination.append(`
        <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="changePage(${currentPage - 1})">السابق</a>
        </li>
    `);
    
    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
        if (i === currentPage || i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
            pagination.append(`
                <li class="page-item ${i === currentPage ? 'active' : ''}">
                    <a class="page-link" href="#" onclick="changePage(${i})">${i}</a>
                </li>
            `);
        } else if (i === currentPage - 2 || i === currentPage + 2) {
            pagination.append('<li class="page-item disabled"><span class="page-link">...</span></li>');
        }
    }
    
    // Next button
    pagination.append(`
        <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="changePage(${currentPage + 1})">التالي</a>
        </li>
    `);
}

function changePage(page) {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
        currentPage = page;
        loadActivities();
    }
}

// Modal functions
function openCreateActivityModal() {
    $('#activityModalLabel').text('إنشاء نشاط تأهيلي جديد');
    $('#activityForm')[0].reset();
    $('#activityId').val('');
    $('#activityModal').modal('show');
}

function saveActivity() {
    const activityId = $('#activityId').val();
    const isEdit = activityId !== '';
    
    const targetSkills = $('#activitySkills').val().split('\n').filter(skill => skill.trim());
    const materials = $('#activityMaterials').val().split('\n').filter(material => material.trim());
    const instructions = $('#activityInstructions').val().split('\n').filter(instruction => instruction.trim());
    const criteria = $('#activityCriteria').val().split('\n').filter(criterion => criterion.trim());

    const formData = {
        name: $('#activityName').val(),
        activity_type: $('#activityType').val(),
        description: $('#activityDescription').val(),
        target_skills: targetSkills,
        duration_minutes: parseInt($('#activityDuration').val()) || null,
        difficulty_level: $('#activityDifficulty').val(),
        required_materials: materials,
        instructions: instructions,
        assessment_criteria: criteria,
        status: $('#activityStatus').val()
    };

    // Validation
    if (!formData.name || !formData.activity_type || !formData.description) {
        showAlert('يرجى ملء جميع الحقول المطلوبة', 'warning');
        return;
    }

    const token = localStorage.getItem('token');
    if (!token) return;

    const url = isEdit ? `/api/rehabilitation/activities/${activityId}` : '/api/rehabilitation/activities';
    const method = isEdit ? 'PUT' : 'POST';

    $.ajax({
        url: url,
        method: method,
        headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json'
        },
        data: JSON.stringify(formData),
        success: function(response) {
            showAlert(isEdit ? 'تم تحديث النشاط بنجاح' : 'تم حفظ النشاط بنجاح', 'success');
            $('#activityModal').modal('hide');
            loadActivities();
        },
        error: function() {
            showAlert('حدث خطأ أثناء حفظ النشاط', 'danger');
        }
    });
}

function viewActivityDetails(activityId) {
    const activity = activities.find(a => a.id === activityId);
    if (!activity) return;
    
    const typeLabel = getActivityTypeLabel(activity.activity_type);
    const difficultyLabel = getDifficultyLabel(activity.difficulty_level);
    
    const detailsHtml = `
        <div class="row">
            <div class="col-md-6">
                <h6>معلومات النشاط</h6>
                <p><strong>النوع:</strong> ${typeLabel}</p>
                <p><strong>المستوى:</strong> ${difficultyLabel}</p>
                <p><strong>المدة:</strong> ${activity.duration_minutes ? activity.duration_minutes + ' دقيقة' : 'غير محدد'}</p>
                <p><strong>الحالة:</strong> ${getStatusLabel(activity.status)}</p>
            </div>
            <div class="col-md-6">
                <h6>الوصف</h6>
                <p>${activity.description}</p>
            </div>
        </div>
        
        ${activity.target_skills && activity.target_skills.length > 0 ? `
        <div class="mt-3">
            <h6>المهارات المستهدفة</h6>
            <ul>
                ${activity.target_skills.map(skill => `<li>${skill}</li>`).join('')}
            </ul>
        </div>
        ` : ''}
        
        ${activity.required_materials && activity.required_materials.length > 0 ? `
        <div class="mt-3">
            <h6>المواد المطلوبة</h6>
            <ul>
                ${activity.required_materials.map(material => `<li>${material}</li>`).join('')}
            </ul>
        </div>
        ` : ''}
        
        ${activity.instructions && activity.instructions.length > 0 ? `
        <div class="mt-3">
            <h6>تعليمات التنفيذ</h6>
            <ol>
                ${activity.instructions.map(instruction => `<li>${instruction}</li>`).join('')}
            </ol>
        </div>
        ` : ''}
        
        ${activity.assessment_criteria && activity.assessment_criteria.length > 0 ? `
        <div class="mt-3">
            <h6>معايير التقييم</h6>
            <ul>
                ${activity.assessment_criteria.map(criterion => `<li>${criterion}</li>`).join('')}
            </ul>
        </div>
        ` : ''}
    `;
    
    $('#activityDetailsContent').html(detailsHtml);
    $('#editActivityBtn').off('click').on('click', () => {
        $('#activityDetailsModal').modal('hide');
        editActivity(activityId);
    });
    $('#activityDetailsModal').modal('show');
}

function editActivity(activityId) {
    const activity = activities.find(a => a.id === activityId);
    if (!activity) return;
    
    $('#activityModalLabel').text('تعديل النشاط التأهيلي');
    $('#activityId').val(activity.id);
    $('#activityName').val(activity.name);
    $('#activityType').val(activity.activity_type);
    $('#activityDescription').val(activity.description);
    $('#activitySkills').val(activity.target_skills ? activity.target_skills.join('\n') : '');
    $('#activityDuration').val(activity.duration_minutes || '');
    $('#activityDifficulty').val(activity.difficulty_level);
    $('#activityMaterials').val(activity.required_materials ? activity.required_materials.join('\n') : '');
    $('#activityInstructions').val(activity.instructions ? activity.instructions.join('\n') : '');
    $('#activityCriteria').val(activity.assessment_criteria ? activity.assessment_criteria.join('\n') : '');
    $('#activityStatus').val(activity.status);
    
    $('#activityModal').modal('show');
}

function viewParticipations(activityId) {
    currentActivityId = activityId;
    const activity = activities.find(a => a.id === activityId);
    
    if (activity) {
        $('#participationModalLabel').text(`مشاركات النشاط: ${activity.name}`);
    }
    
    loadParticipations(activityId);
    $('#participationModal').modal('show');
}

function loadParticipations(activityId) {
    const token = localStorage.getItem('token');
    if (!token) return;

    $.ajax({
        url: `/api/rehabilitation/activities/${activityId}/participations`,
        method: 'GET',
        headers: {
            'Authorization': 'Bearer ' + token
        },
        success: function(response) {
            const participations = response.participations || [];
            populateParticipations(participations);
        },
        error: function() {
            console.log('Error loading participations');
            $('#participationContent').html('<p class="text-muted text-center">حدث خطأ في تحميل المشاركات</p>');
        }
    });
}

function populateParticipations(participations) {
    const container = $('#participationContent');
    container.empty();

    if (participations.length === 0) {
        container.html('<p class="text-muted text-center">لا توجد مشاركات مسجلة لهذا النشاط</p>');
        return;
    }

    participations.forEach(participation => {
        const participationCard = `
            <div class="participation-card">
                <div class="d-flex justify-content-between align-items-start mb-2">
                    <h6 class="mb-0">${participation.beneficiary_name}</h6>
                    <small class="text-muted">${formatDate(participation.participation_date)}</small>
                </div>
                <div class="mb-2">
                    <span class="attendance-badge attendance-${participation.attendance_status}">
                        ${getAttendanceLabel(participation.attendance_status)}
                    </span>
                    ${participation.performance_rating ? `
                    <span class="rating-stars ms-2">
                        ${'★'.repeat(participation.performance_rating)}${'☆'.repeat(5 - participation.performance_rating)}
                    </span>
                    ` : ''}
                </div>
                ${participation.engagement_level ? `
                <p class="mb-1"><strong>مستوى المشاركة:</strong> ${getEngagementLabel(participation.engagement_level)}</p>
                ` : ''}
                ${participation.goals_achieved && participation.goals_achieved.length > 0 ? `
                <p class="mb-1"><strong>الأهداف المحققة:</strong></p>
                <ul class="mb-2">
                    ${participation.goals_achieved.map(goal => `<li>${goal}</li>`).join('')}
                </ul>
                ` : ''}
                ${participation.notes ? `
                <p class="mb-0"><strong>ملاحظات:</strong> ${participation.notes}</p>
                ` : ''}
            </div>
        `;
        container.append(participationCard);
    });
}

function openAddParticipationModal() {
    $('#participationActivityId').val(currentActivityId);
    $('#participationForm')[0].reset();
    $('#participationDate').val(new Date().toISOString().split('T')[0]);
    $('#addParticipationModal').modal('show');
}

function saveParticipation() {
    const goalsAchieved = $('#goalsAchieved').val().split('\n').filter(goal => goal.trim());

    const formData = {
        activity_id: parseInt($('#participationActivityId').val()),
        beneficiary_id: parseInt($('#participationBeneficiary').val()),
        participation_date: $('#participationDate').val(),
        attendance_status: $('#attendanceStatus').val(),
        performance_rating: parseInt($('#performanceRating').val()) || null,
        engagement_level: $('#engagementLevel').val() || null,
        goals_achieved: goalsAchieved,
        notes: $('#participationNotes').val()
    };

    // Validation
    if (!formData.activity_id || !formData.beneficiary_id || !formData.participation_date) {
        showAlert('يرجى ملء جميع الحقول المطلوبة', 'warning');
        return;
    }

    const token = localStorage.getItem('token');
    if (!token) return;

    $.ajax({
        url: '/api/rehabilitation/activities/participations',
        method: 'POST',
        headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json'
        },
        data: JSON.stringify(formData),
        success: function(response) {
            showAlert('تم تسجيل المشاركة بنجاح', 'success');
            $('#addParticipationModal').modal('hide');
            loadParticipations(currentActivityId);
        },
        error: function() {
            showAlert('حدث خطأ أثناء تسجيل المشاركة', 'danger');
        }
    });
}

function duplicateActivity(activityId) {
    const activity = activities.find(a => a.id === activityId);
    if (!activity) return;
    
    if (confirm('هل تريد إنشاء نسخة من هذا النشاط؟')) {
        $('#activityModalLabel').text('إنشاء نسخة من النشاط التأهيلي');
        $('#activityId').val('');
        $('#activityName').val(activity.name + ' - نسخة');
        $('#activityType').val(activity.activity_type);
        $('#activityDescription').val(activity.description);
        $('#activitySkills').val(activity.target_skills ? activity.target_skills.join('\n') : '');
        $('#activityDuration').val(activity.duration_minutes || '');
        $('#activityDifficulty').val(activity.difficulty_level);
        $('#activityMaterials').val(activity.required_materials ? activity.required_materials.join('\n') : '');
        $('#activityInstructions').val(activity.instructions ? activity.instructions.join('\n') : '');
        $('#activityCriteria').val(activity.assessment_criteria ? activity.assessment_criteria.join('\n') : '');
        $('#activityStatus').val('draft');
        
        $('#activityModal').modal('show');
    }
}

// Helper functions
function getActivityTypeLabel(type) {
    const labels = {
        'physical': 'علاج طبيعي',
        'occupational': 'علاج وظيفي',
        'speech': 'علاج النطق',
        'behavioral': 'تعديل السلوك',
        'educational': 'تعليمي',
        'social': 'اجتماعي',
        'cognitive': 'معرفي'
    };
    return labels[type] || type;
}

function getActivityTypeClass(type) {
    return `type-${type}`;
}

function getDifficultyLabel(difficulty) {
    const labels = {
        'easy': 'سهل',
        'medium': 'متوسط',
        'hard': 'صعب'
    };
    return labels[difficulty] || difficulty;
}

function getDifficultyClass(difficulty) {
    return `difficulty-${difficulty}`;
}

function getStatusLabel(status) {
    const labels = {
        'active': 'نشط',
        'inactive': 'غير نشط',
        'draft': 'مسودة'
    };
    return labels[status] || status;
}

function getAttendanceLabel(status) {
    const labels = {
        'present': 'حاضر',
        'absent': 'غائب',
        'late': 'متأخر'
    };
    return labels[status] || status;
}

function getEngagementLabel(level) {
    const labels = {
        'low': 'منخفض',
        'medium': 'متوسط',
        'high': 'عالي'
    };
    return labels[level] || level;
}

function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-SA');
}

function showAlert(message, type) {
    const alertHtml = `
        <div class="alert alert-${type} alert-dismissible fade show" role="alert">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
    `;
    
    // Remove existing alerts
    $('.alert').remove();
    
    // Add new alert at the top of the page
    $('body').prepend(alertHtml);
    
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
        $('.alert').fadeOut();
    }, 5000);
}
