// Rehabilitation Plans JavaScript
let currentUser = null;
let plans = [];
let beneficiaries = [];
let programs = [];
let currentPage = 1;
let totalPages = 1;
let itemsPerPage = 6;
let currentFilters = {
    search: '',
    status: '',
    program: '',
    sortBy: 'created_at'
};

// Initialize the rehabilitation plans system
$(document).ready(function() {
    initializePlansSystem();
});

function initializePlansSystem() {
    // Get current user info
    getCurrentUser();
    
    // Load initial data
    loadBeneficiaries();
    loadPrograms();
    loadPlans();
    
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
    $('#searchPlans').on('input', function() {
        currentFilters.search = $(this).val();
        currentPage = 1;
        loadPlans();
    });
    
    $('#filterStatus').on('change', function() {
        currentFilters.status = $(this).val();
        currentPage = 1;
        loadPlans();
    });
    
    $('#filterProgram').on('change', function() {
        currentFilters.program = $(this).val();
        currentPage = 1;
        loadPlans();
    });
    
    $('#sortBy').on('change', function() {
        currentFilters.sortBy = $(this).val();
        currentPage = 1;
        loadPlans();
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
    const select = $('#planBeneficiary');
    select.empty().append('<option value="">اختر المستفيد</option>');
    
    beneficiaries.forEach(beneficiary => {
        select.append(`<option value="${beneficiary.id}">${beneficiary.name}</option>`);
    });
}

// Load programs
function loadPrograms() {
    const token = localStorage.getItem('token');
    if (!token) return;

    $.ajax({
        url: '/api/rehabilitation/programs',
        method: 'GET',
        headers: {
            'Authorization': 'Bearer ' + token
        },
        success: function(response) {
            programs = response.programs || [];
            populateProgramSelects();
        },
        error: function() {
            console.log('Error loading programs');
        }
    });
}

function populateProgramSelects() {
    const selects = ['#planProgram', '#filterProgram'];
    
    selects.forEach(selector => {
        const select = $(selector);
        const isFilter = selector === '#filterProgram';
        
        select.empty();
        if (isFilter) {
            select.append('<option value="">جميع البرامج</option>');
        } else {
            select.append('<option value="">اختر البرنامج</option>');
        }
        
        programs.forEach(program => {
            select.append(`<option value="${program.id}">${program.name}</option>`);
        });
    });
}

// Load plans
function loadPlans() {
    const token = localStorage.getItem('token');
    if (!token) return;

    // Build query parameters
    const params = new URLSearchParams({
        page: currentPage,
        per_page: itemsPerPage,
        sort_by: currentFilters.sortBy
    });
    
    if (currentFilters.search) params.append('search', currentFilters.search);
    if (currentFilters.status) params.append('status', currentFilters.status);
    if (currentFilters.program) params.append('program_id', currentFilters.program);

    $.ajax({
        url: `/api/rehabilitation/plans?${params.toString()}`,
        method: 'GET',
        headers: {
            'Authorization': 'Bearer ' + token
        },
        success: function(response) {
            plans = response.plans || [];
            totalPages = response.total_pages || 1;
            populatePlansGrid();
            updatePagination();
        },
        error: function() {
            console.log('Error loading plans');
            showAlert('حدث خطأ في تحميل الخطط', 'danger');
        }
    });
}

function populatePlansGrid() {
    const container = $('#plansContainer');
    container.empty();

    if (plans.length === 0) {
        container.html(`
            <div class="col-12">
                <div class="text-center py-5">
                    <i class="fas fa-route fa-3x text-muted mb-3"></i>
                    <h5 class="text-muted">لا توجد خطط تأهيلية</h5>
                    <p class="text-muted">ابدأ بإنشاء خطة تأهيلية جديدة</p>
                    <button class="btn btn-primary" onclick="openCreatePlanModal()">
                        <i class="fas fa-plus me-2"></i>إنشاء خطة جديدة
                    </button>
                </div>
            </div>
        `);
        return;
    }

    plans.forEach(plan => {
        const beneficiary = beneficiaries.find(b => b.id === plan.beneficiary_id);
        const program = programs.find(p => p.id === plan.program_id);
        
        const planCard = createPlanCard(plan, beneficiary, program);
        container.append(planCard);
    });
}

function createPlanCard(plan, beneficiary, program) {
    const beneficiaryName = beneficiary ? beneficiary.name : 'غير محدد';
    const programName = program ? program.name : 'غير محدد';
    const status = getPlanStatus(plan);
    const progress = calculatePlanProgress(plan);
    
    return `
        <div class="col-lg-6 col-xl-4">
            <div class="plan-card">
                <div class="plan-header">
                    <div>
                        <h6 class="mb-1">${beneficiaryName}</h6>
                        <small class="text-muted">${programName}</small>
                    </div>
                    <span class="plan-status ${status.class}">${status.label}</span>
                </div>
                
                <div class="goal-section">
                    <h6 class="mb-2">الأهداف قصيرة المدى</h6>
                    ${renderGoals(plan.short_term_goals, 3)}
                </div>
                
                <div class="goal-section">
                    <h6 class="mb-2">الأهداف طويلة المدى</h6>
                    ${renderGoals(plan.long_term_goals, 2, 'long-term')}
                </div>
                
                ${plan.intervention_strategies ? `
                <div class="mb-3">
                    <h6 class="mb-2">استراتيجيات التدخل</h6>
                    <div>
                        ${plan.intervention_strategies.slice(0, 3).map(strategy => 
                            `<span class="intervention-tag">${strategy}</span>`
                        ).join('')}
                        ${plan.intervention_strategies.length > 3 ? 
                            `<span class="intervention-tag">+${plan.intervention_strategies.length - 3} أخرى</span>` : ''
                        }
                    </div>
                </div>
                ` : ''}
                
                <div class="plan-timeline">
                    <div class="timeline-item">
                        <span class="timeline-icon start"><i class="fas fa-play"></i></span>
                        <div>
                            <small class="text-muted">تاريخ البداية</small>
                            <div>${formatDate(plan.start_date)}</div>
                        </div>
                    </div>
                    <div class="timeline-item">
                        <span class="timeline-icon review"><i class="fas fa-calendar-check"></i></span>
                        <div>
                            <small class="text-muted">تاريخ المراجعة</small>
                            <div>${formatDate(plan.review_date)}</div>
                        </div>
                    </div>
                    ${plan.end_date ? `
                    <div class="timeline-item">
                        <span class="timeline-icon end"><i class="fas fa-flag-checkered"></i></span>
                        <div>
                            <small class="text-muted">تاريخ النهاية</small>
                            <div>${formatDate(plan.end_date)}</div>
                        </div>
                    </div>
                    ` : ''}
                </div>
                
                <div class="plan-progress">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <small class="text-muted">التقدم العام</small>
                        <small class="fw-bold">${progress}%</small>
                    </div>
                    <div class="progress-bar-custom">
                        <div class="progress-fill" style="width: ${progress}%">
                            <div class="progress-text">${progress}%</div>
                        </div>
                    </div>
                </div>
                
                ${(plan.session_frequency || plan.session_duration) ? `
                <div class="session-info">
                    ${plan.session_frequency ? `
                    <div class="session-detail">
                        <div class="session-number">${plan.session_frequency}</div>
                        <div class="session-label">التكرار</div>
                    </div>
                    ` : ''}
                    ${plan.session_duration ? `
                    <div class="session-detail">
                        <div class="session-number">${plan.session_duration}</div>
                        <div class="session-label">دقيقة</div>
                    </div>
                    ` : ''}
                </div>
                ` : ''}
                
                <div class="plan-actions">
                    <button class="btn btn-outline-primary btn-plan" onclick="viewPlanDetails(${plan.id})">
                        <i class="fas fa-eye me-1"></i>عرض
                    </button>
                    <button class="btn btn-outline-warning btn-plan" onclick="editPlan(${plan.id})">
                        <i class="fas fa-edit me-1"></i>تعديل
                    </button>
                    <button class="btn btn-outline-info btn-plan" onclick="viewPlanProgress(${plan.id})">
                        <i class="fas fa-chart-line me-1"></i>التقدم
                    </button>
                    <button class="btn btn-outline-success btn-plan" onclick="duplicatePlan(${plan.id})">
                        <i class="fas fa-copy me-1"></i>نسخ
                    </button>
                </div>
            </div>
        </div>
    `;
}

function renderGoals(goals, maxDisplay = 3, type = 'short-term') {
    if (!goals || goals.length === 0) {
        return '<p class="text-muted small">لا توجد أهداف محددة</p>';
    }
    
    let html = '';
    const displayGoals = goals.slice(0, maxDisplay);
    
    displayGoals.forEach(goal => {
        html += `<div class="goal-item ${type}">${goal}</div>`;
    });
    
    if (goals.length > maxDisplay) {
        html += `<small class="text-muted">+${goals.length - maxDisplay} أهداف أخرى</small>`;
    }
    
    return html;
}

function getPlanStatus(plan) {
    const now = new Date();
    const startDate = new Date(plan.start_date);
    const reviewDate = new Date(plan.review_date);
    const endDate = plan.end_date ? new Date(plan.end_date) : null;
    
    if (endDate && now > endDate) {
        return { class: 'status-completed', label: 'مكتمل' };
    } else if (now > reviewDate) {
        return { class: 'status-review', label: 'قيد المراجعة' };
    } else if (now >= startDate) {
        return { class: 'status-active', label: 'نشط' };
    } else {
        return { class: 'status-paused', label: 'لم يبدأ' };
    }
}

function calculatePlanProgress(plan) {
    // This is a simplified calculation
    // In a real system, this would be based on completed goals and assessments
    const now = new Date();
    const startDate = new Date(plan.start_date);
    const endDate = plan.end_date ? new Date(plan.end_date) : new Date(plan.review_date);
    
    if (now < startDate) return 0;
    if (now > endDate) return 100;
    
    const totalDuration = endDate - startDate;
    const elapsed = now - startDate;
    
    return Math.min(100, Math.max(0, Math.round((elapsed / totalDuration) * 100)));
}

function updatePagination() {
    const pagination = $('#plansPagination');
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
        loadPlans();
    }
}

// Modal functions
function openCreatePlanModal() {
    $('#planModalLabel').text('إنشاء خطة تأهيلية فردية');
    $('#planForm')[0].reset();
    $('#planId').val('');
    $('#planModal').modal('show');
}

function savePlan() {
    const planId = $('#planId').val();
    const isEdit = planId !== '';
    
    const shortTermGoals = $('#planShortTermGoals').val().split('\n').filter(goal => goal.trim());
    const longTermGoals = $('#planLongTermGoals').val().split('\n').filter(goal => goal.trim());
    const interventions = $('#planInterventions').val().split('\n').filter(int => int.trim());

    const formData = {
        beneficiary_id: parseInt($('#planBeneficiary').val()),
        program_id: parseInt($('#planProgram').val()),
        start_date: $('#planStartDate').val(),
        end_date: $('#planEndDate').val() || null,
        review_date: $('#planReviewDate').val(),
        short_term_goals: shortTermGoals,
        long_term_goals: longTermGoals,
        intervention_strategies: interventions,
        session_frequency: $('#planFrequency').val(),
        session_duration: parseInt($('#planDuration').val()) || null,
        location: $('#planLocation').val(),
        notes: $('#planNotes').val()
    };

    // Validation
    if (!formData.beneficiary_id || !formData.program_id || !formData.start_date || !formData.review_date) {
        showAlert('يرجى ملء جميع الحقول المطلوبة', 'warning');
        return;
    }

    const token = localStorage.getItem('token');
    if (!token) return;

    const url = isEdit ? `/api/rehabilitation/plans/${planId}` : '/api/rehabilitation/plans';
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
            showAlert(isEdit ? 'تم تحديث الخطة بنجاح' : 'تم حفظ الخطة بنجاح', 'success');
            $('#planModal').modal('hide');
            loadPlans();
        },
        error: function() {
            showAlert('حدث خطأ أثناء حفظ الخطة', 'danger');
        }
    });
}

function viewPlanDetails(planId) {
    const plan = plans.find(p => p.id === planId);
    if (!plan) return;
    
    const beneficiary = beneficiaries.find(b => b.id === plan.beneficiary_id);
    const program = programs.find(p => p.id === plan.program_id);
    
    const detailsHtml = `
        <div class="row">
            <div class="col-md-6">
                <h6>معلومات المستفيد</h6>
                <p><strong>الاسم:</strong> ${beneficiary ? beneficiary.name : 'غير محدد'}</p>
                <p><strong>البرنامج:</strong> ${program ? program.name : 'غير محدد'}</p>
            </div>
            <div class="col-md-6">
                <h6>الجدول الزمني</h6>
                <p><strong>تاريخ البداية:</strong> ${formatDate(plan.start_date)}</p>
                <p><strong>تاريخ المراجعة:</strong> ${formatDate(plan.review_date)}</p>
                ${plan.end_date ? `<p><strong>تاريخ النهاية:</strong> ${formatDate(plan.end_date)}</p>` : ''}
            </div>
        </div>
        
        ${plan.short_term_goals && plan.short_term_goals.length > 0 ? `
        <div class="mt-3">
            <h6>الأهداف قصيرة المدى</h6>
            <ul>
                ${plan.short_term_goals.map(goal => `<li>${goal}</li>`).join('')}
            </ul>
        </div>
        ` : ''}
        
        ${plan.long_term_goals && plan.long_term_goals.length > 0 ? `
        <div class="mt-3">
            <h6>الأهداف طويلة المدى</h6>
            <ul>
                ${plan.long_term_goals.map(goal => `<li>${goal}</li>`).join('')}
            </ul>
        </div>
        ` : ''}
        
        ${plan.intervention_strategies && plan.intervention_strategies.length > 0 ? `
        <div class="mt-3">
            <h6>استراتيجيات التدخل</h6>
            <ul>
                ${plan.intervention_strategies.map(strategy => `<li>${strategy}</li>`).join('')}
            </ul>
        </div>
        ` : ''}
        
        ${plan.session_frequency || plan.session_duration ? `
        <div class="mt-3">
            <h6>تفاصيل الجلسات</h6>
            ${plan.session_frequency ? `<p><strong>التكرار:</strong> ${plan.session_frequency}</p>` : ''}
            ${plan.session_duration ? `<p><strong>المدة:</strong> ${plan.session_duration} دقيقة</p>` : ''}
            ${plan.location ? `<p><strong>المكان:</strong> ${plan.location}</p>` : ''}
        </div>
        ` : ''}
        
        ${plan.notes ? `
        <div class="mt-3">
            <h6>ملاحظات</h6>
            <p>${plan.notes}</p>
        </div>
        ` : ''}
    `;
    
    $('#planDetailsContent').html(detailsHtml);
    $('#editPlanBtn').off('click').on('click', () => {
        $('#planDetailsModal').modal('hide');
        editPlan(planId);
    });
    $('#planDetailsModal').modal('show');
}

function editPlan(planId) {
    const plan = plans.find(p => p.id === planId);
    if (!plan) return;
    
    $('#planModalLabel').text('تعديل الخطة التأهيلية');
    $('#planId').val(plan.id);
    $('#planBeneficiary').val(plan.beneficiary_id);
    $('#planProgram').val(plan.program_id);
    $('#planStartDate').val(plan.start_date);
    $('#planEndDate').val(plan.end_date || '');
    $('#planReviewDate').val(plan.review_date);
    $('#planShortTermGoals').val(plan.short_term_goals ? plan.short_term_goals.join('\n') : '');
    $('#planLongTermGoals').val(plan.long_term_goals ? plan.long_term_goals.join('\n') : '');
    $('#planInterventions').val(plan.intervention_strategies ? plan.intervention_strategies.join('\n') : '');
    $('#planFrequency').val(plan.session_frequency || '');
    $('#planDuration').val(plan.session_duration || '');
    $('#planLocation').val(plan.location || '');
    $('#planNotes').val(plan.notes || '');
    
    $('#planModal').modal('show');
}

function viewPlanProgress(planId) {
    // Navigate to assessment details page for this plan's beneficiary
    const plan = plans.find(p => p.id === planId);
    if (plan) {
        window.location.href = `/rehabilitation/assessment/${plan.beneficiary_id}`;
    }
}

function duplicatePlan(planId) {
    const plan = plans.find(p => p.id === planId);
    if (!plan) return;
    
    if (confirm('هل تريد إنشاء نسخة من هذه الخطة؟')) {
        $('#planModalLabel').text('إنشاء نسخة من الخطة التأهيلية');
        $('#planId').val('');
        $('#planBeneficiary').val('');
        $('#planProgram').val(plan.program_id);
        $('#planStartDate').val('');
        $('#planEndDate').val('');
        $('#planReviewDate').val('');
        $('#planShortTermGoals').val(plan.short_term_goals ? plan.short_term_goals.join('\n') : '');
        $('#planLongTermGoals').val(plan.long_term_goals ? plan.long_term_goals.join('\n') : '');
        $('#planInterventions').val(plan.intervention_strategies ? plan.intervention_strategies.join('\n') : '');
        $('#planFrequency').val(plan.session_frequency || '');
        $('#planDuration').val(plan.session_duration || '');
        $('#planLocation').val(plan.location || '');
        $('#planNotes').val(plan.notes || '');
        
        $('#planModal').modal('show');
    }
}

// Helper functions
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
