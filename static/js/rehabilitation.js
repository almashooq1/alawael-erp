// Rehabilitation System JavaScript
let currentUser = null;
let disabilityTypes = [];
let beneficiaries = [];
let programs = [];
let plans = [];
let assessments = [];
let progressRecords = [];

// Initialize the rehabilitation system
$(document).ready(function() {
    initializeRehabilitationSystem();
});

function initializeRehabilitationSystem() {
    // Get current user info
    getCurrentUser();
    
    // Load initial data
    loadDisabilityTypes();
    loadStatistics();
    loadBeneficiaries();
    loadPrograms();
    loadPlans();
    loadAssessments();
    loadProgressRecords();
    
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
    // Tab change events
    $('#rehabilitationTabs button[data-bs-toggle="tab"]').on('shown.bs.tab', function (e) {
        const target = $(e.target).attr('data-bs-target');
        if (target === '#beneficiaries') {
            loadBeneficiaries();
        } else if (target === '#programs') {
            loadPrograms();
        } else if (target === '#plans') {
            loadPlans();
        } else if (target === '#assessments') {
            loadAssessments();
        } else if (target === '#progress') {
            loadProgressRecords();
        }
    });
}

// Statistics Functions
function loadStatistics() {
    const token = localStorage.getItem('token');
    if (!token) return;

    $.ajax({
        url: '/api/rehabilitation/statistics',
        method: 'GET',
        headers: {
            'Authorization': 'Bearer ' + token
        },
        success: function(response) {
            updateStatistics(response);
        },
        error: function() {
            console.log('Error loading statistics');
        }
    });
}

function updateStatistics(stats) {
    $('#beneficiariesCount').text(stats.total_beneficiaries || 0);
    $('#programsCount').text(stats.total_programs || 0);
    $('#plansCount').text(stats.total_plans || 0);
    $('#assessmentsCount').text(stats.total_assessments || 0);
}

// Disability Types Functions
function loadDisabilityTypes() {
    const token = localStorage.getItem('token');
    if (!token) return;

    $.ajax({
        url: '/api/rehabilitation/disability-types',
        method: 'GET',
        headers: {
            'Authorization': 'Bearer ' + token
        },
        success: function(response) {
            disabilityTypes = response.disability_types || [];
            populateDisabilityTypeSelects();
        },
        error: function() {
            console.log('Error loading disability types');
        }
    });
}

function populateDisabilityTypeSelects() {
    const select = $('#beneficiaryDisabilityType');
    select.empty().append('<option value="">اختر نوع الإعاقة</option>');
    
    disabilityTypes.forEach(type => {
        select.append(`<option value="${type.id}">${type.name}</option>`);
    });
}

// Beneficiaries Functions
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
            populateBeneficiariesTable();
            populateBeneficiarySelects();
        },
        error: function() {
            console.log('Error loading beneficiaries');
        }
    });
}

function populateBeneficiariesTable() {
    const tbody = $('#beneficiariesTableBody');
    tbody.empty();

    beneficiaries.forEach(beneficiary => {
        const age = calculateAge(beneficiary.birth_date);
        const disabilityType = disabilityTypes.find(dt => dt.id === beneficiary.disability_type_id);
        const disabilityName = disabilityType ? disabilityType.name : 'غير محدد';
        
        const row = `
            <tr>
                <td>${beneficiary.name}</td>
                <td>${age} سنة</td>
                <td>${disabilityName}</td>
                <td>${formatDate(beneficiary.created_at)}</td>
                <td><span class="badge bg-success">نشط</span></td>
                <td>
                    <button class="btn btn-sm btn-outline-primary" onclick="viewBeneficiaryDetails(${beneficiary.id})">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-warning" onclick="editBeneficiary(${beneficiary.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                </td>
            </tr>
        `;
        tbody.append(row);
    });
}

function populateBeneficiarySelects() {
    const selects = ['#planBeneficiary', '#assessmentBeneficiary', '#progressBeneficiary'];
    
    selects.forEach(selector => {
        const select = $(selector);
        select.empty().append('<option value="">اختر المستفيد</option>');
        
        beneficiaries.forEach(beneficiary => {
            select.append(`<option value="${beneficiary.id}">${beneficiary.name}</option>`);
        });
    });
}

function openBeneficiariesModal() {
    $('#beneficiaryModal').modal('show');
}

function saveBeneficiary() {
    const formData = {
        name: $('#beneficiaryName').val(),
        birth_date: $('#beneficiaryBirthDate').val(),
        gender: $('#beneficiaryGender').val(),
        phone: $('#beneficiaryPhone').val(),
        disability_type_id: parseInt($('#beneficiaryDisabilityType').val()),
        severity_level: $('#beneficiarySeverity').val(),
        address: $('#beneficiaryAddress').val(),
        medical_history: $('#beneficiaryMedicalHistory').val(),
        notes: $('#beneficiaryNotes').val()
    };

    // Validation
    if (!formData.name || !formData.birth_date || !formData.gender || !formData.disability_type_id) {
        showAlert('يرجى ملء جميع الحقول المطلوبة', 'warning');
        return;
    }

    const token = localStorage.getItem('token');
    if (!token) return;

    $.ajax({
        url: '/api/rehabilitation/beneficiaries',
        method: 'POST',
        headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json'
        },
        data: JSON.stringify(formData),
        success: function(response) {
            showAlert('تم حفظ المستفيد بنجاح', 'success');
            $('#beneficiaryModal').modal('hide');
            $('#beneficiaryForm')[0].reset();
            loadBeneficiaries();
            loadStatistics();
        },
        error: function() {
            showAlert('حدث خطأ أثناء حفظ المستفيد', 'danger');
        }
    });
}

// Programs Functions
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
            populateProgramsGrid();
            populateProgramSelects();
        },
        error: function() {
            console.log('Error loading programs');
        }
    });
}

function populateProgramsGrid() {
    const grid = $('#programsGrid');
    grid.empty();

    programs.forEach(program => {
        const card = `
            <div class="col-md-6 col-lg-4 mb-3">
                <div class="card h-100">
                    <div class="card-body">
                        <h6 class="card-title">${program.name}</h6>
                        <p class="card-text text-muted small">${program.description}</p>
                        <div class="mb-2">
                            <span class="badge bg-primary">${getProgramTypeLabel(program.program_type)}</span>
                            ${program.age_group ? `<span class="badge bg-secondary">${program.age_group}</span>` : ''}
                        </div>
                        <div class="d-flex justify-content-between align-items-center">
                            <small class="text-muted">${program.duration_weeks ? program.duration_weeks + ' أسبوع' : ''}</small>
                            <div>
                                <button class="btn btn-sm btn-outline-primary" onclick="viewProgramDetails(${program.id})">
                                    <i class="fas fa-eye"></i>
                                </button>
                                <button class="btn btn-sm btn-outline-warning" onclick="editProgram(${program.id})">
                                    <i class="fas fa-edit"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        grid.append(card);
    });
}

function populateProgramSelects() {
    const select = $('#planProgram');
    select.empty().append('<option value="">اختر البرنامج</option>');
    
    programs.forEach(program => {
        select.append(`<option value="${program.id}">${program.name}</option>`);
    });
}

function openProgramsModal() {
    $('#programModal').modal('show');
}

function saveProgram() {
    const objectives = $('#programObjectives').val().split('\n').filter(obj => obj.trim());
    const resources = $('#programResources').val().split('\n').filter(res => res.trim());

    const formData = {
        name: $('#programName').val(),
        program_type: $('#programType').val(),
        description: $('#programDescription').val(),
        age_group: $('#programAgeGroup').val(),
        duration_weeks: parseInt($('#programDuration').val()) || null,
        objectives: objectives,
        methodology: $('#programMethodology').val(),
        required_resources: resources
    };

    // Validation
    if (!formData.name || !formData.program_type || !formData.description) {
        showAlert('يرجى ملء جميع الحقول المطلوبة', 'warning');
        return;
    }

    const token = localStorage.getItem('token');
    if (!token) return;

    $.ajax({
        url: '/api/rehabilitation/programs',
        method: 'POST',
        headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json'
        },
        data: JSON.stringify(formData),
        success: function(response) {
            showAlert('تم حفظ البرنامج بنجاح', 'success');
            $('#programModal').modal('hide');
            $('#programForm')[0].reset();
            loadPrograms();
            loadStatistics();
        },
        error: function() {
            showAlert('حدث خطأ أثناء حفظ البرنامج', 'danger');
        }
    });
}

// Plans Functions
function loadPlans() {
    const token = localStorage.getItem('token');
    if (!token) return;

    $.ajax({
        url: '/api/rehabilitation/plans',
        method: 'GET',
        headers: {
            'Authorization': 'Bearer ' + token
        },
        success: function(response) {
            plans = response.plans || [];
            populatePlansTable();
        },
        error: function() {
            console.log('Error loading plans');
        }
    });
}

function populatePlansTable() {
    const tbody = $('#plansTableBody');
    tbody.empty();

    plans.forEach(plan => {
        const beneficiary = beneficiaries.find(b => b.id === plan.beneficiary_id);
        const program = programs.find(p => p.id === plan.program_id);
        
        const row = `
            <tr>
                <td>${beneficiary ? beneficiary.name : 'غير محدد'}</td>
                <td>${program ? program.name : 'غير محدد'}</td>
                <td>${formatDate(plan.start_date)}</td>
                <td>${formatDate(plan.review_date)}</td>
                <td><span class="badge bg-info">نشط</span></td>
                <td>
                    <button class="btn btn-sm btn-outline-primary" onclick="viewPlanDetails(${plan.id})">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-warning" onclick="editPlan(${plan.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                </td>
            </tr>
        `;
        tbody.append(row);
    });
}

function openPlansModal() {
    $('#planModal').modal('show');
}

function savePlan() {
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
        notes: $('#planNotes').val()
    };

    // Validation
    if (!formData.beneficiary_id || !formData.program_id || !formData.start_date || !formData.review_date) {
        showAlert('يرجى ملء جميع الحقول المطلوبة', 'warning');
        return;
    }

    const token = localStorage.getItem('token');
    if (!token) return;

    $.ajax({
        url: '/api/rehabilitation/plans',
        method: 'POST',
        headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json'
        },
        data: JSON.stringify(formData),
        success: function(response) {
            showAlert('تم حفظ الخطة بنجاح', 'success');
            $('#planModal').modal('hide');
            $('#planForm')[0].reset();
            loadPlans();
            loadStatistics();
        },
        error: function() {
            showAlert('حدث خطأ أثناء حفظ الخطة', 'danger');
        }
    });
}

// Assessments Functions
function loadAssessments() {
    const token = localStorage.getItem('token');
    if (!token) return;

    $.ajax({
        url: '/api/rehabilitation/assessments',
        method: 'GET',
        headers: {
            'Authorization': 'Bearer ' + token
        },
        success: function(response) {
            assessments = response.assessments || [];
            populateAssessmentsTable();
        },
        error: function() {
            console.log('Error loading assessments');
        }
    });
}

function populateAssessmentsTable() {
    const tbody = $('#assessmentsTableBody');
    tbody.empty();

    assessments.forEach(assessment => {
        const beneficiary = beneficiaries.find(b => b.id === assessment.beneficiary_id);
        const overallScore = calculateOverallScore(assessment.assessment_areas);
        
        const row = `
            <tr>
                <td>${beneficiary ? beneficiary.name : 'غير محدد'}</td>
                <td>${getAssessmentTypeLabel(assessment.assessment_type)}</td>
                <td>${formatDate(assessment.assessment_date)}</td>
                <td><span class="badge bg-${getScoreBadgeClass(overallScore)}">${overallScore}%</span></td>
                <td>${assessment.assessor || 'غير محدد'}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary" onclick="viewAssessmentDetails(${assessment.id})">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-warning" onclick="editAssessment(${assessment.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                </td>
            </tr>
        `;
        tbody.append(row);
    });
}

function openAssessmentModal() {
    $('#assessmentModal').modal('show');
}

function saveAssessment() {
    const assessmentAreas = {
        cognitive: parseInt($('#cognitiveScore').val()) || null,
        motor: parseInt($('#motorScore').val()) || null,
        communication: parseInt($('#communicationScore').val()) || null,
        social: parseInt($('#socialScore').val()) || null,
        self_care: parseInt($('#selfCareScore').val()) || null,
        behavioral: parseInt($('#behavioralScore').val()) || null
    };

    const formData = {
        beneficiary_id: parseInt($('#assessmentBeneficiary').val()),
        assessment_type: $('#assessmentType').val(),
        assessment_date: $('#assessmentDate').val(),
        assessor: $('#assessmentAssessor').val(),
        assessment_areas: assessmentAreas,
        results: $('#assessmentResults').val(),
        recommendations: $('#assessmentRecommendations').val()
    };

    // Validation
    if (!formData.beneficiary_id || !formData.assessment_type || !formData.assessment_date) {
        showAlert('يرجى ملء جميع الحقول المطلوبة', 'warning');
        return;
    }

    const token = localStorage.getItem('token');
    if (!token) return;

    $.ajax({
        url: '/api/rehabilitation/assessments',
        method: 'POST',
        headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json'
        },
        data: JSON.stringify(formData),
        success: function(response) {
            showAlert('تم حفظ التقييم بنجاح', 'success');
            $('#assessmentModal').modal('hide');
            $('#assessmentForm')[0].reset();
            loadAssessments();
            loadStatistics();
        },
        error: function() {
            showAlert('حدث خطأ أثناء حفظ التقييم', 'danger');
        }
    });
}

// Progress Records Functions
function loadProgressRecords() {
    const token = localStorage.getItem('token');
    if (!token) return;

    $.ajax({
        url: '/api/rehabilitation/progress',
        method: 'GET',
        headers: {
            'Authorization': 'Bearer ' + token
        },
        success: function(response) {
            progressRecords = response.progress_records || [];
            populateProgressTable();
        },
        error: function() {
            console.log('Error loading progress records');
        }
    });
}

function populateProgressTable() {
    const tbody = $('#progressTableBody');
    tbody.empty();

    progressRecords.forEach(record => {
        const beneficiary = beneficiaries.find(b => b.id === record.beneficiary_id);
        
        const row = `
            <tr>
                <td>${beneficiary ? beneficiary.name : 'غير محدد'}</td>
                <td>${formatDate(record.record_date)}</td>
                <td>${getProgressAreaLabel(record.progress_area)}</td>
                <td><span class="badge bg-${getProgressLevelBadgeClass(record.progress_level)}">${getProgressLevelLabel(record.progress_level)}</span></td>
                <td>${record.recorded_by || 'غير محدد'}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary" onclick="viewProgressDetails(${record.id})">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-warning" onclick="editProgress(${record.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                </td>
            </tr>
        `;
        tbody.append(row);
    });
}

function openProgressModal() {
    $('#progressModal').modal('show');
}

function saveProgress() {
    const indicators = $('#progressIndicators').val().split('\n').filter(ind => ind.trim());

    const formData = {
        beneficiary_id: parseInt($('#progressBeneficiary').val()),
        record_date: $('#progressDate').val(),
        progress_area: $('#progressArea').val(),
        progress_level: $('#progressLevel').val(),
        description: $('#progressDescription').val(),
        performance_indicators: indicators,
        recommendations: $('#progressRecommendations').val(),
        recorded_by: $('#progressRecordedBy').val()
    };

    // Validation
    if (!formData.beneficiary_id || !formData.record_date || !formData.progress_area || !formData.progress_level || !formData.description) {
        showAlert('يرجى ملء جميع الحقول المطلوبة', 'warning');
        return;
    }

    const token = localStorage.getItem('token');
    if (!token) return;

    $.ajax({
        url: '/api/rehabilitation/progress',
        method: 'POST',
        headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json'
        },
        data: JSON.stringify(formData),
        success: function(response) {
            showAlert('تم حفظ سجل التقدم بنجاح', 'success');
            $('#progressModal').modal('hide');
            $('#progressForm')[0].reset();
            loadProgressRecords();
        },
        error: function() {
            showAlert('حدث خطأ أثناء حفظ سجل التقدم', 'danger');
        }
    });
}

// Helper Functions
function calculateAge(birthDate) {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
    }
    
    return age;
}

function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-SA');
}

function calculateOverallScore(assessmentAreas) {
    if (!assessmentAreas) return 0;
    
    const scores = Object.values(assessmentAreas).filter(score => score !== null && score !== undefined);
    if (scores.length === 0) return 0;
    
    const sum = scores.reduce((total, score) => total + score, 0);
    return Math.round(sum / scores.length);
}

function getProgramTypeLabel(type) {
    const labels = {
        'physical': 'علاج طبيعي',
        'occupational': 'علاج وظيفي',
        'speech': 'علاج النطق',
        'behavioral': 'تعديل السلوك',
        'educational': 'تعليمي',
        'social': 'اجتماعي',
        'vocational': 'مهني'
    };
    return labels[type] || type;
}

function getAssessmentTypeLabel(type) {
    const labels = {
        'initial': 'تقييم أولي',
        'progress': 'تقييم تقدم',
        'final': 'تقييم نهائي',
        'periodic': 'تقييم دوري'
    };
    return labels[type] || type;
}

function getProgressAreaLabel(area) {
    const labels = {
        'cognitive': 'المهارات المعرفية',
        'motor': 'المهارات الحركية',
        'communication': 'مهارات التواصل',
        'social': 'المهارات الاجتماعية',
        'self_care': 'مهارات الرعاية الذاتية',
        'behavioral': 'السلوك التكيفي'
    };
    return labels[area] || area;
}

function getProgressLevelLabel(level) {
    const labels = {
        'excellent': 'ممتاز',
        'good': 'جيد',
        'satisfactory': 'مرضي',
        'needs_improvement': 'يحتاج تحسين',
        'no_progress': 'لا يوجد تقدم'
    };
    return labels[level] || level;
}

function getScoreBadgeClass(score) {
    if (score >= 80) return 'success';
    if (score >= 60) return 'warning';
    return 'danger';
}

function getProgressLevelBadgeClass(level) {
    const classes = {
        'excellent': 'success',
        'good': 'primary',
        'satisfactory': 'info',
        'needs_improvement': 'warning',
        'no_progress': 'danger'
    };
    return classes[level] || 'secondary';
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

// View Details Functions
function viewBeneficiaryDetails(id) {
    // Navigate to assessment details page
    window.location.href = `/rehabilitation/assessment/${id}`;
}

function viewProgramDetails(id) {
    // Implementation for viewing program details
    console.log('View program details:', id);
}

function viewPlanDetails(id) {
    // Implementation for viewing plan details
    console.log('View plan details:', id);
}

function viewAssessmentDetails(id) {
    // Implementation for viewing assessment details
    console.log('View assessment details:', id);
}

function viewProgressDetails(id) {
    // Implementation for viewing progress details
    console.log('View progress details:', id);
}

// Edit Functions (to be implemented)
function editBeneficiary(id) {
    // Implementation for editing beneficiary
    console.log('Edit beneficiary:', id);
}

function editProgram(id) {
    // Implementation for editing program
    console.log('Edit program:', id);
}

function editPlan(id) {
    // Implementation for editing plan
    console.log('Edit plan:', id);
}

function editAssessment(id) {
    // Implementation for editing assessment
    console.log('Edit assessment:', id);
}

function editProgress(id) {
    // Implementation for editing progress
    console.log('Edit progress:', id);
}
