// Rehabilitation System JavaScript
let currentUser = null;
let disabilityTypes = [];
let beneficiaries = [];
let programs = [];
let plans = [];
let assessments = [];
let progressRecords = [];
let riskAssessments = [];
let medications = [];
let vitalsRecords = [];
let teamMessages = [];
let waitingList = [];
let appointments = [];
let incidents = [];
let behavioralPlans = [];
let documents = [];
let groupActivities = [];
let alerts = [];
let analyticsData = null;
// Phase 4 state
let notesData = [];
let referralsData = [];
let currentProgramForPhase4 = null;

// Initialize the rehabilitation system
$(document).ready(function () {
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
  loadRiskAssessments();
  loadMedications();
  loadVitals();
  loadTeamMessages();
  loadWaitingList();
  loadAppointments();
  loadIncidents();
  loadBehavioralPlans();
  loadDocuments();
  loadGroupActivities();
  loadAlerts();

  // Phase 4 data loading (after programs are loaded)
  setTimeout(loadPhase4TabData, 1500);

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
        Authorization: 'Bearer ' + token,
      },
      success: function (response) {
        currentUser = response.user;
      },
      error: function () {
        console.log('Error getting user profile');
      },
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
    } else if (target === '#riskAssessment') {
      loadRiskAssessments();
    } else if (target === '#medications') {
      loadMedications();
    } else if (target === '#vitals') {
      loadVitals();
    } else if (target === '#teamComm') {
      loadTeamMessages();
    } else if (target === '#waitingList') {
      loadWaitingList();
    } else if (target === '#appointments') {
      loadAppointments();
    } else if (target === '#incidents') {
      loadIncidents();
    } else if (target === '#behavioralPlans') {
      loadBehavioralPlans();
    } else if (target === '#documents') {
      loadDocuments();
    } else if (target === '#groupActivities') {
      loadGroupActivities();
    } else if (target === '#analytics') {
      loadAnalytics();
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
      Authorization: 'Bearer ' + token,
    },
    success: function (response) {
      updateStatistics(response);
    },
    error: function () {
      console.log('Error loading statistics');
    },
  });
}

function updateStatistics(stats) {
  $('#beneficiariesCount').text(stats.total_beneficiaries || 0);
  $('#programsCount').text(stats.total_programs || 0);
  $('#plansCount').text(stats.total_plans || 0);
  $('#assessmentsCount').text(stats.total_assessments || 0);
  $('#waitingListCount').text(stats.waiting_list_count || 0);
  $('#highRiskCount').text(stats.high_risk_count || 0);
  $('#activeMedications').text(stats.active_medications || 0);
  $('#avgQolScore').text(stats.avg_qol_score || 0);
}

// Disability Types Functions
function loadDisabilityTypes() {
  const token = localStorage.getItem('token');
  if (!token) return;

  $.ajax({
    url: '/api/rehabilitation/disability-types',
    method: 'GET',
    headers: {
      Authorization: 'Bearer ' + token,
    },
    success: function (response) {
      disabilityTypes = response.disability_types || [];
      populateDisabilityTypeSelects();
    },
    error: function () {
      console.log('Error loading disability types');
    },
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
      Authorization: 'Bearer ' + token,
    },
    success: function (response) {
      beneficiaries = response.beneficiaries || [];
      populateBeneficiariesTable();
      populateBeneficiarySelects();
    },
    error: function () {
      console.log('Error loading beneficiaries');
    },
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
    notes: $('#beneficiaryNotes').val(),
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
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json',
    },
    data: JSON.stringify(formData),
    success: function (response) {
      showAlert('تم حفظ المستفيد بنجاح', 'success');
      $('#beneficiaryModal').modal('hide');
      $('#beneficiaryForm')[0].reset();
      loadBeneficiaries();
      loadStatistics();
    },
    error: function () {
      showAlert('حدث خطأ أثناء حفظ المستفيد', 'danger');
    },
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
      Authorization: 'Bearer ' + token,
    },
    success: function (response) {
      programs = response.programs || [];
      populateProgramsGrid();
      populateProgramSelects();
    },
    error: function () {
      console.log('Error loading programs');
    },
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
  const objectives = $('#programObjectives')
    .val()
    .split('\n')
    .filter(obj => obj.trim());
  const resources = $('#programResources')
    .val()
    .split('\n')
    .filter(res => res.trim());

  const formData = {
    name: $('#programName').val(),
    program_type: $('#programType').val(),
    description: $('#programDescription').val(),
    age_group: $('#programAgeGroup').val(),
    duration_weeks: parseInt($('#programDuration').val()) || null,
    objectives: objectives,
    methodology: $('#programMethodology').val(),
    required_resources: resources,
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
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json',
    },
    data: JSON.stringify(formData),
    success: function (response) {
      showAlert('تم حفظ البرنامج بنجاح', 'success');
      $('#programModal').modal('hide');
      $('#programForm')[0].reset();
      loadPrograms();
      loadStatistics();
    },
    error: function () {
      showAlert('حدث خطأ أثناء حفظ البرنامج', 'danger');
    },
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
      Authorization: 'Bearer ' + token,
    },
    success: function (response) {
      plans = response.plans || [];
      populatePlansTable();
    },
    error: function () {
      console.log('Error loading plans');
    },
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
  const shortTermGoals = $('#planShortTermGoals')
    .val()
    .split('\n')
    .filter(goal => goal.trim());
  const longTermGoals = $('#planLongTermGoals')
    .val()
    .split('\n')
    .filter(goal => goal.trim());
  const interventions = $('#planInterventions')
    .val()
    .split('\n')
    .filter(int => int.trim());

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
    notes: $('#planNotes').val(),
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
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json',
    },
    data: JSON.stringify(formData),
    success: function (response) {
      showAlert('تم حفظ الخطة بنجاح', 'success');
      $('#planModal').modal('hide');
      $('#planForm')[0].reset();
      loadPlans();
      loadStatistics();
    },
    error: function () {
      showAlert('حدث خطأ أثناء حفظ الخطة', 'danger');
    },
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
      Authorization: 'Bearer ' + token,
    },
    success: function (response) {
      assessments = response.assessments || [];
      populateAssessmentsTable();
    },
    error: function () {
      console.log('Error loading assessments');
    },
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
    behavioral: parseInt($('#behavioralScore').val()) || null,
  };

  const formData = {
    beneficiary_id: parseInt($('#assessmentBeneficiary').val()),
    assessment_type: $('#assessmentType').val(),
    assessment_date: $('#assessmentDate').val(),
    assessor: $('#assessmentAssessor').val(),
    assessment_areas: assessmentAreas,
    results: $('#assessmentResults').val(),
    recommendations: $('#assessmentRecommendations').val(),
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
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json',
    },
    data: JSON.stringify(formData),
    success: function (response) {
      showAlert('تم حفظ التقييم بنجاح', 'success');
      $('#assessmentModal').modal('hide');
      $('#assessmentForm')[0].reset();
      loadAssessments();
      loadStatistics();
    },
    error: function () {
      showAlert('حدث خطأ أثناء حفظ التقييم', 'danger');
    },
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
      Authorization: 'Bearer ' + token,
    },
    success: function (response) {
      progressRecords = response.progress_records || [];
      populateProgressTable();
    },
    error: function () {
      console.log('Error loading progress records');
    },
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
  const indicators = $('#progressIndicators')
    .val()
    .split('\n')
    .filter(ind => ind.trim());

  const formData = {
    beneficiary_id: parseInt($('#progressBeneficiary').val()),
    record_date: $('#progressDate').val(),
    progress_area: $('#progressArea').val(),
    progress_level: $('#progressLevel').val(),
    description: $('#progressDescription').val(),
    performance_indicators: indicators,
    recommendations: $('#progressRecommendations').val(),
    recorded_by: $('#progressRecordedBy').val(),
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
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json',
    },
    data: JSON.stringify(formData),
    success: function (response) {
      showAlert('تم حفظ سجل التقدم بنجاح', 'success');
      $('#progressModal').modal('hide');
      $('#progressForm')[0].reset();
      loadProgressRecords();
    },
    error: function () {
      showAlert('حدث خطأ أثناء حفظ سجل التقدم', 'danger');
    },
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
    physical: 'علاج طبيعي',
    occupational: 'علاج وظيفي',
    speech: 'علاج النطق',
    behavioral: 'تعديل السلوك',
    educational: 'تعليمي',
    social: 'اجتماعي',
    vocational: 'مهني',
    cognitive: 'تأهيل معرفي',
    psychological: 'دعم نفسي',
    sensory_integration: 'تكامل حسي',
    art_therapy: 'علاج بالفن',
    music_therapy: 'علاج بالموسيقى',
    hydrotherapy: 'علاج مائي',
    assistive_technology: 'تقنيات مساعدة',
    family_training: 'تدريب الأسرة',
    life_skills: 'مهارات حياتية',
    early_intervention: 'تدخل مبكر',
  };
  return labels[type] || type;
}

function getAssessmentTypeLabel(type) {
  const labels = {
    initial: 'تقييم أولي',
    progress: 'تقييم تقدم',
    final: 'تقييم نهائي',
    periodic: 'تقييم دوري',
    functional: 'تقييم وظيفي',
    neurological: 'تقييم عصبي',
    psychological: 'تقييم نفسي',
    developmental: 'تقييم تطوري',
    risk: 'تقييم مخاطر',
    discharge: 'تقييم خروج',
  };
  return labels[type] || type;
}

function getProgressAreaLabel(area) {
  const labels = {
    cognitive: 'المهارات المعرفية',
    motor: 'المهارات الحركية',
    communication: 'مهارات التواصل',
    social: 'المهارات الاجتماعية',
    self_care: 'مهارات الرعاية الذاتية',
    behavioral: 'السلوك التكيفي',
    sensory: 'المهارات الحسية',
    emotional: 'التنظيم العاطفي',
    academic: 'المهارات الأكاديمية',
    vocational: 'المهارات المهنية',
    daily_living: 'مهارات الحياة اليومية',
    physical_fitness: 'اللياقة البدنية',
  };
  return labels[area] || area;
}

function getProgressLevelLabel(level) {
  const labels = {
    excellent: 'ممتاز',
    good: 'جيد',
    satisfactory: 'مرضي',
    needs_improvement: 'يحتاج تحسين',
    no_progress: 'لا يوجد تقدم',
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
    excellent: 'success',
    good: 'primary',
    satisfactory: 'info',
    needs_improvement: 'warning',
    no_progress: 'danger',
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
  const beneficiary = beneficiaries.find(b => b.id === id);
  if (!beneficiary) return;

  const content = `
        <div class="row">
            <div class="col-md-6">
                <p><strong>الاسم:</strong> ${beneficiary.name}</p>
                <p><strong>تاريخ الميلاد:</strong> ${formatDate(beneficiary.birth_date)}</p>
                <p><strong>العمر:</strong> ${calculateAge(beneficiary.birth_date)} سنة</p>
                <p><strong>الجنس:</strong> ${beneficiary.gender === 'male' ? 'ذكر' : 'أنثى'}</p>
            </div>
            <div class="col-md-6">
                <p><strong>نوع الإعاقة:</strong> ${getDisabilityLabel(beneficiary.disability_type)}</p>
                <p><strong>درجة الشدة:</strong> ${getSeverityLabel(beneficiary.severity)}</p>
                <p><strong>الهاتف:</strong> ${beneficiary.phone || 'غير محدد'}</p>
                <p><strong>تاريخ التسجيل:</strong> ${formatDate(beneficiary.registration_date)}</p>
            </div>
        </div>
        ${beneficiary.medical_history ? `<p><strong>التاريخ الطبي:</strong> ${beneficiary.medical_history}</p>` : ''}
        ${beneficiary.notes ? `<p><strong>ملاحظات:</strong> ${beneficiary.notes}</p>` : ''}
    `;

  $('#detailsModalLabel').text('تفاصيل المستفيد - ' + beneficiary.name);
  $('#detailsModalBody').html(content);
  $('#detailsModal').modal('show');
}

function viewProgramDetails(id) {
  const program = programs.find(p => p.id === id);
  if (!program) return;

  const content = `
        <h5>${program.name}</h5>
        <p><strong>النوع:</strong> ${getProgramTypeLabel(program.program_type)}</p>
        <p><strong>الوصف:</strong> ${program.description}</p>
        ${program.age_group ? `<p><strong>الفئة العمرية:</strong> ${program.age_group}</p>` : ''}
        ${program.duration_weeks ? `<p><strong>المدة:</strong> ${program.duration_weeks} أسبوع</p>` : ''}
        ${program.objectives && program.objectives.length ? `<p><strong>الأهداف:</strong></p><ul>${program.objectives.map(o => `<li>${o}</li>`).join('')}</ul>` : ''}
        ${program.methodology ? `<p><strong>المنهجية:</strong> ${program.methodology}</p>` : ''}
    `;

  $('#detailsModalLabel').text('تفاصيل البرنامج');
  $('#detailsModalBody').html(content);
  $('#detailsModal').modal('show');
}

function viewPlanDetails(id) {
  const plan = plans.find(p => p.id === id);
  if (!plan) return;
  const beneficiary = beneficiaries.find(b => b.id === plan.beneficiary_id);
  const program = programs.find(p => p.id === plan.program_id);

  const content = `
        <p><strong>المستفيد:</strong> ${beneficiary ? beneficiary.name : 'غير محدد'}</p>
        <p><strong>البرنامج:</strong> ${program ? program.name : 'غير محدد'}</p>
        <p><strong>تاريخ البداية:</strong> ${formatDate(plan.start_date)}</p>
        <p><strong>تاريخ المراجعة:</strong> ${formatDate(plan.review_date)}</p>
        ${plan.short_term_goals && plan.short_term_goals.length ? `<p><strong>أهداف قصيرة المدى:</strong></p><ul>${plan.short_term_goals.map(g => `<li>${g}</li>`).join('')}</ul>` : ''}
        ${plan.long_term_goals && plan.long_term_goals.length ? `<p><strong>أهداف طويلة المدى:</strong></p><ul>${plan.long_term_goals.map(g => `<li>${g}</li>`).join('')}</ul>` : ''}
        ${plan.notes ? `<p><strong>ملاحظات:</strong> ${plan.notes}</p>` : ''}
    `;

  $('#detailsModalLabel').text('تفاصيل الخطة');
  $('#detailsModalBody').html(content);
  $('#detailsModal').modal('show');
}

function viewAssessmentDetails(id) {
  const assessment = assessments.find(a => a.id === id);
  if (!assessment) return;
  const beneficiary = beneficiaries.find(b => b.id === assessment.beneficiary_id);

  const areasHtml = assessment.assessment_areas
    ? Object.entries(assessment.assessment_areas)
        .filter(([k, v]) => v !== null)
        .map(([key, value]) => `<div class="col-md-4 mb-2"><strong>${getProgressAreaLabel(key)}:</strong> ${value}%</div>`)
        .join('')
    : '';

  const content = `
        <p><strong>المستفيد:</strong> ${beneficiary ? beneficiary.name : 'غير محدد'}</p>
        <p><strong>نوع التقييم:</strong> ${getAssessmentTypeLabel(assessment.assessment_type)}</p>
        <p><strong>التاريخ:</strong> ${formatDate(assessment.assessment_date)}</p>
        <p><strong>المقيم:</strong> ${assessment.assessor || 'غير محدد'}</p>
        <p><strong>النتيجة الإجمالية:</strong> ${calculateOverallScore(assessment.assessment_areas)}%</p>
        <h6 class="mt-3">تفاصيل المجالات:</h6>
        <div class="row">${areasHtml}</div>
        ${assessment.results ? `<p class="mt-3"><strong>النتائج:</strong> ${assessment.results}</p>` : ''}
        ${assessment.recommendations ? `<p><strong>التوصيات:</strong> ${assessment.recommendations}</p>` : ''}
    `;

  $('#detailsModalLabel').text('تفاصيل التقييم');
  $('#detailsModalBody').html(content);
  $('#detailsModal').modal('show');
}

function viewProgressDetails(id) {
  const record = progressRecords.find(r => r.id === id);
  if (!record) return;
  const beneficiary = beneficiaries.find(b => b.id === record.beneficiary_id);

  const content = `
        <p><strong>المستفيد:</strong> ${beneficiary ? beneficiary.name : 'غير محدد'}</p>
        <p><strong>التاريخ:</strong> ${formatDate(record.record_date)}</p>
        <p><strong>المجال:</strong> ${getProgressAreaLabel(record.progress_area)}</p>
        <p><strong>المستوى:</strong> <span class="badge bg-${getProgressLevelBadgeClass(record.progress_level)}">${getProgressLevelLabel(record.progress_level)}</span></p>
        <p><strong>الوصف:</strong> ${record.description}</p>
        ${record.performance_indicators && record.performance_indicators.length ? `<p><strong>المؤشرات:</strong></p><ul>${record.performance_indicators.map(i => `<li>${i}</li>`).join('')}</ul>` : ''}
        ${record.recommendations ? `<p><strong>التوصيات:</strong> ${record.recommendations}</p>` : ''}
    `;

  $('#detailsModalLabel').text('تفاصيل سجل التقدم');
  $('#detailsModalBody').html(content);
  $('#detailsModal').modal('show');
}

// Edit Functions
function editBeneficiary(id) {
  const beneficiary = beneficiaries.find(b => b.id === id);
  if (!beneficiary) return;

  $('#beneficiaryName').val(beneficiary.name);
  $('#beneficiaryBirthDate').val(beneficiary.birth_date ? beneficiary.birth_date.split('T')[0] : '');
  $('#beneficiaryGender').val(beneficiary.gender);
  $('#beneficiaryPhone').val(beneficiary.phone);
  $('#beneficiaryDisabilityType').val(beneficiary.disability_type);
  $('#beneficiarySeverity').val(beneficiary.severity);
  $('#beneficiaryAddress').val(beneficiary.address);
  $('#beneficiaryMedicalHistory').val(beneficiary.medical_history);
  $('#beneficiaryNotes').val(beneficiary.notes);

  $('#beneficiaryModalLabel').text('تعديل بيانات المستفيد');
  $('#beneficiaryModal').data('editId', id);
  $('#beneficiaryModal').modal('show');
}

function editProgram(id) {
  const program = programs.find(p => p.id === id);
  if (!program) return;

  $('#programName').val(program.name);
  $('#programType').val(program.program_type);
  $('#programDescription').val(program.description);
  $('#programAgeGroup').val(program.age_group);
  $('#programDuration').val(program.duration_weeks);
  $('#programObjectives').val(program.objectives ? program.objectives.join('\n') : '');
  $('#programMethodology').val(program.methodology);
  $('#programResources').val(program.required_resources ? program.required_resources.join('\n') : '');

  $('#programModalLabel').text('تعديل البرنامج');
  $('#programModal').data('editId', id);
  $('#programModal').modal('show');
}

function editPlan(id) {
  const plan = plans.find(p => p.id === id);
  if (!plan) return;

  $('#planBeneficiary').val(plan.beneficiary_id);
  $('#planProgram').val(plan.program_id);
  $('#planStartDate').val(plan.start_date ? plan.start_date.split('T')[0] : '');
  $('#planEndDate').val(plan.end_date ? plan.end_date.split('T')[0] : '');
  $('#planReviewDate').val(plan.review_date ? plan.review_date.split('T')[0] : '');
  $('#planShortTermGoals').val(plan.short_term_goals ? plan.short_term_goals.join('\n') : '');
  $('#planLongTermGoals').val(plan.long_term_goals ? plan.long_term_goals.join('\n') : '');
  $('#planInterventions').val(plan.intervention_strategies ? plan.intervention_strategies.join('\n') : '');
  $('#planFrequency').val(plan.session_frequency);
  $('#planDuration').val(plan.session_duration);
  $('#planNotes').val(plan.notes);

  $('#planModalLabel').text('تعديل الخطة');
  $('#planModal').data('editId', id);
  $('#planModal').modal('show');
}

function editAssessment(id) {
  const assessment = assessments.find(a => a.id === id);
  if (!assessment) return;

  $('#assessmentBeneficiary').val(assessment.beneficiary_id);
  $('#assessmentType').val(assessment.assessment_type);
  $('#assessmentDate').val(assessment.assessment_date ? assessment.assessment_date.split('T')[0] : '');
  $('#assessmentAssessor').val(assessment.assessor);
  if (assessment.assessment_areas) {
    $('#cognitiveScore').val(assessment.assessment_areas.cognitive);
    $('#motorScore').val(assessment.assessment_areas.motor);
    $('#communicationScore').val(assessment.assessment_areas.communication);
    $('#socialScore').val(assessment.assessment_areas.social);
    $('#selfCareScore').val(assessment.assessment_areas.self_care);
    $('#behavioralScore').val(assessment.assessment_areas.behavioral);
  }
  $('#assessmentResults').val(assessment.results);
  $('#assessmentRecommendations').val(assessment.recommendations);

  $('#assessmentModalLabel').text('تعديل التقييم');
  $('#assessmentModal').data('editId', id);
  $('#assessmentModal').modal('show');
}

function editProgress(id) {
  const record = progressRecords.find(r => r.id === id);
  if (!record) return;

  $('#progressBeneficiary').val(record.beneficiary_id);
  $('#progressDate').val(record.record_date ? record.record_date.split('T')[0] : '');
  $('#progressArea').val(record.progress_area);
  $('#progressLevel').val(record.progress_level);
  $('#progressDescription').val(record.description);
  $('#progressIndicators').val(record.performance_indicators ? record.performance_indicators.join('\n') : '');
  $('#progressRecommendations').val(record.recommendations);
  $('#progressRecordedBy').val(record.recorded_by);

  $('#progressModalLabel').text('تعديل سجل التقدم');
  $('#progressModal').data('editId', id);
  $('#progressModal').modal('show');
}

// ==========================================
// Risk Assessment Functions
// ==========================================
function loadRiskAssessments() {
  const token = localStorage.getItem('token');
  if (!token) return;

  $.ajax({
    url: '/api/rehabilitation/risk-assessments',
    method: 'GET',
    headers: { Authorization: 'Bearer ' + token },
    success: function (response) {
      riskAssessments = response.risk_assessments || [];
      populateRiskAssessmentTable();
      updateRiskSummary();
    },
    error: function () {
      console.log('Error loading risk assessments');
    },
  });
}

function populateRiskAssessmentTable() {
  const tbody = $('#riskAssessmentTableBody');
  tbody.empty();

  riskAssessments.forEach(risk => {
    const beneficiary = beneficiaries.find(b => b.id === risk.beneficiary_id);
    const row = `
            <tr>
                <td>${beneficiary ? beneficiary.name : 'غير محدد'}</td>
                <td><span class="risk-badge ${risk.risk_level}">${getRiskLevelLabel(risk.risk_level)}</span></td>
                <td>${getRiskTypeLabel(risk.risk_type)}</td>
                <td>${formatDate(risk.assessment_date || risk.created_at)}</td>
                <td>${risk.assessor || 'غير محدد'}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary" onclick="viewRiskDetails(${risk.id})">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-warning" onclick="editRiskAssessment(${risk.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                </td>
            </tr>
        `;
    tbody.append(row);
  });
}

function updateRiskSummary() {
  const counts = { low: 0, medium: 0, high: 0, critical: 0 };
  riskAssessments.forEach(r => {
    if (counts[r.risk_level] !== undefined) counts[r.risk_level]++;
  });

  $('#lowRiskCount').text(counts.low);
  $('#mediumRiskCount').text(counts.medium);
  $('#highRiskCountDetail').text(counts.high);
  $('#criticalRiskCount').text(counts.critical);
}

function openRiskAssessmentModal() {
  populateBeneficiarySelect('#riskBeneficiary');
  $('#riskAssessmentForm')[0].reset();
  $('#riskAssessmentModal').removeData('editId');
  $('#riskAssessmentModalLabel').html('<i class="fas fa-shield-alt me-2"></i>تقييم مخاطر جديد');
  $('#riskAssessmentModal').modal('show');
}

function saveRiskAssessment() {
  const mitigations = $('#riskMitigations')
    .val()
    .split('\n')
    .filter(m => m.trim());

  const formData = {
    beneficiary_id: parseInt($('#riskBeneficiary').val()),
    risk_level: $('#riskLevel').val(),
    risk_type: $('#riskType').val(),
    assessor: $('#riskAssessor').val(),
    risk_factors: $('#riskFactors').val(),
    mitigations: mitigations,
    notes: $('#riskNotes').val(),
  };

  if (!formData.beneficiary_id || !formData.risk_level || !formData.risk_type) {
    showAlert('يرجى ملء جميع الحقول المطلوبة', 'warning');
    return;
  }

  const token = localStorage.getItem('token');
  if (!token) return;

  const editId = $('#riskAssessmentModal').data('editId');
  const url = editId ? `/api/rehabilitation/risk-assessments/${editId}` : '/api/rehabilitation/risk-assessments';
  const method = editId ? 'PUT' : 'POST';

  $.ajax({
    url: url,
    method: method,
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    data: JSON.stringify(formData),
    success: function () {
      showAlert('تم حفظ تقييم المخاطر بنجاح', 'success');
      $('#riskAssessmentModal').modal('hide');
      loadRiskAssessments();
      loadStatistics();
    },
    error: function () {
      showAlert('حدث خطأ أثناء حفظ تقييم المخاطر', 'danger');
    },
  });
}

function editRiskAssessment(id) {
  const risk = riskAssessments.find(r => r.id === id);
  if (!risk) return;

  populateBeneficiarySelect('#riskBeneficiary');
  setTimeout(() => {
    $('#riskBeneficiary').val(risk.beneficiary_id);
  }, 100);

  $('#riskLevel').val(risk.risk_level);
  $('#riskType').val(risk.risk_type);
  $('#riskAssessor').val(risk.assessor);
  $('#riskFactors').val(risk.risk_factors);
  $('#riskMitigations').val(risk.mitigations ? risk.mitigations.join('\n') : '');
  $('#riskNotes').val(risk.notes);

  $('#riskAssessmentModalLabel').html('<i class="fas fa-shield-alt me-2"></i>تعديل تقييم المخاطر');
  $('#riskAssessmentModal').data('editId', id);
  $('#riskAssessmentModal').modal('show');
}

function viewRiskDetails(id) {
  const risk = riskAssessments.find(r => r.id === id);
  if (!risk) return;
  const beneficiary = beneficiaries.find(b => b.id === risk.beneficiary_id);

  const content = `
        <p><strong>المستفيد:</strong> ${beneficiary ? beneficiary.name : 'غير محدد'}</p>
        <p><strong>مستوى المخاطر:</strong> <span class="risk-badge ${risk.risk_level}">${getRiskLevelLabel(risk.risk_level)}</span></p>
        <p><strong>نوع المخاطر:</strong> ${getRiskTypeLabel(risk.risk_type)}</p>
        <p><strong>المقيّم:</strong> ${risk.assessor || 'غير محدد'}</p>
        ${risk.risk_factors ? `<p><strong>عوامل الخطر:</strong> ${risk.risk_factors}</p>` : ''}
        ${risk.mitigations && risk.mitigations.length ? `<p><strong>إجراءات التخفيف:</strong></p><ul>${risk.mitigations.map(m => `<li>${m}</li>`).join('')}</ul>` : ''}
        ${risk.notes ? `<p><strong>ملاحظات:</strong> ${risk.notes}</p>` : ''}
    `;

  $('#detailsModalLabel').text('تفاصيل تقييم المخاطر');
  $('#detailsModalBody').html(content);
  $('#detailsModal').modal('show');
}

// ==========================================
// Medications Functions
// ==========================================
function loadMedications() {
  const token = localStorage.getItem('token');
  if (!token) return;

  $.ajax({
    url: '/api/rehabilitation/medications',
    method: 'GET',
    headers: { Authorization: 'Bearer ' + token },
    success: function (response) {
      medications = response.medications || [];
      populateMedicationsTable();
    },
    error: function () {
      console.log('Error loading medications');
    },
  });
}

function populateMedicationsTable(filteredMeds) {
  const tbody = $('#medicationsTableBody');
  tbody.empty();

  const meds = filteredMeds || medications;

  meds.forEach(med => {
    const beneficiary = beneficiaries.find(b => b.id === med.beneficiary_id);
    const statusClass = med.status === 'active' ? 'success' : med.status === 'paused' ? 'warning' : 'secondary';

    const row = `
            <tr>
                <td>${beneficiary ? beneficiary.name : 'غير محدد'}</td>
                <td><strong>${med.name}</strong></td>
                <td>${med.dosage}</td>
                <td>${getFrequencyLabel(med.frequency)}</td>
                <td><span class="badge bg-${statusClass}">${getMedicationStatusLabel(med.status)}</span></td>
                <td>${formatDate(med.start_date)}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary" onclick="viewMedicationDetails(${med.id})">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-warning" onclick="editMedication(${med.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                </td>
            </tr>
        `;
    tbody.append(row);
  });
}

function openMedicationModal() {
  populateBeneficiarySelect('#medBeneficiary');
  $('#medicationForm')[0].reset();
  $('#medicationModal').removeData('editId');
  $('#medicationModalLabel').html('<i class="fas fa-pills me-2"></i>إضافة دواء جديد');
  $('#medicationModal').modal('show');
}

function saveMedication() {
  const sideEffects = $('#medSideEffects')
    .val()
    .split('\n')
    .filter(s => s.trim());

  const formData = {
    beneficiary_id: parseInt($('#medBeneficiary').val()),
    name: $('#medName').val(),
    dosage: $('#medDosage').val(),
    frequency: $('#medFrequency').val(),
    route: $('#medRoute').val(),
    start_date: $('#medStartDate').val(),
    end_date: $('#medEndDate').val() || null,
    prescriber: $('#medPrescriber').val(),
    purpose: $('#medPurpose').val(),
    side_effects: sideEffects,
    notes: $('#medNotes').val(),
  };

  if (!formData.beneficiary_id || !formData.name || !formData.dosage || !formData.frequency || !formData.start_date) {
    showAlert('يرجى ملء جميع الحقول المطلوبة', 'warning');
    return;
  }

  const token = localStorage.getItem('token');
  if (!token) return;

  const editId = $('#medicationModal').data('editId');
  const url = editId ? `/api/rehabilitation/medications/${editId}` : '/api/rehabilitation/medications';
  const method = editId ? 'PUT' : 'POST';

  $.ajax({
    url: url,
    method: method,
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    data: JSON.stringify(formData),
    success: function () {
      showAlert('تم حفظ الدواء بنجاح', 'success');
      $('#medicationModal').modal('hide');
      loadMedications();
      loadStatistics();
    },
    error: function () {
      showAlert('حدث خطأ أثناء حفظ الدواء', 'danger');
    },
  });
}

function filterMedications() {
  const statusFilter = $('#medicationStatusFilter').val();
  if (!statusFilter) {
    populateMedicationsTable(medications);
    return;
  }
  const filtered = medications.filter(m => m.status === statusFilter);
  populateMedicationsTable(filtered);
}

function editMedication(id) {
  const med = medications.find(m => m.id === id);
  if (!med) return;

  populateBeneficiarySelect('#medBeneficiary');
  setTimeout(() => {
    $('#medBeneficiary').val(med.beneficiary_id);
  }, 100);

  $('#medName').val(med.name);
  $('#medDosage').val(med.dosage);
  $('#medFrequency').val(med.frequency);
  $('#medRoute').val(med.route);
  $('#medStartDate').val(med.start_date ? med.start_date.split('T')[0] : '');
  $('#medEndDate').val(med.end_date ? med.end_date.split('T')[0] : '');
  $('#medPrescriber').val(med.prescriber);
  $('#medPurpose').val(med.purpose);
  $('#medSideEffects').val(med.side_effects ? med.side_effects.join('\n') : '');
  $('#medNotes').val(med.notes);

  $('#medicationModalLabel').html('<i class="fas fa-pills me-2"></i>تعديل الدواء');
  $('#medicationModal').data('editId', id);
  $('#medicationModal').modal('show');
}

function viewMedicationDetails(id) {
  const med = medications.find(m => m.id === id);
  if (!med) return;
  const beneficiary = beneficiaries.find(b => b.id === med.beneficiary_id);

  const content = `
        <p><strong>المستفيد:</strong> ${beneficiary ? beneficiary.name : 'غير محدد'}</p>
        <p><strong>اسم الدواء:</strong> ${med.name}</p>
        <p><strong>الجرعة:</strong> ${med.dosage}</p>
        <p><strong>التكرار:</strong> ${getFrequencyLabel(med.frequency)}</p>
        <p><strong>طريقة الإعطاء:</strong> ${getRouteLabel(med.route)}</p>
        <p><strong>الحالة:</strong> ${getMedicationStatusLabel(med.status)}</p>
        <p><strong>تاريخ البدء:</strong> ${formatDate(med.start_date)}</p>
        ${med.end_date ? `<p><strong>تاريخ الانتهاء:</strong> ${formatDate(med.end_date)}</p>` : ''}
        ${med.prescriber ? `<p><strong>الطبيب:</strong> ${med.prescriber}</p>` : ''}
        ${med.purpose ? `<p><strong>الغرض:</strong> ${med.purpose}</p>` : ''}
        ${med.side_effects && med.side_effects.length ? `<p><strong>الأعراض الجانبية:</strong></p><ul>${med.side_effects.map(s => `<li>${s}</li>`).join('')}</ul>` : ''}
    `;

  $('#detailsModalLabel').text('تفاصيل الدواء');
  $('#detailsModalBody').html(content);
  $('#detailsModal').modal('show');
}

// ==========================================
// Vitals Functions
// ==========================================
function loadVitals() {
  const token = localStorage.getItem('token');
  if (!token) return;

  $.ajax({
    url: '/api/rehabilitation/vitals',
    method: 'GET',
    headers: { Authorization: 'Bearer ' + token },
    success: function (response) {
      vitalsRecords = response.vitals || [];
      populateVitalsTable();
      updateVitalsSummary();
    },
    error: function () {
      console.log('Error loading vitals');
    },
  });
}

function populateVitalsTable() {
  const tbody = $('#vitalsTableBody');
  tbody.empty();

  vitalsRecords.forEach(vital => {
    const beneficiary = beneficiaries.find(b => b.id === vital.beneficiary_id);
    const bp = vital.bp_systolic && vital.bp_diastolic ? `${vital.bp_systolic}/${vital.bp_diastolic}` : '--';

    const row = `
            <tr>
                <td>${beneficiary ? beneficiary.name : 'غير محدد'}</td>
                <td>${formatDate(vital.measurement_date || vital.created_at)}</td>
                <td>${bp}</td>
                <td>${vital.heart_rate || '--'}</td>
                <td>${vital.temperature ? vital.temperature + '°' : '--'}</td>
                <td>${vital.o2_saturation ? vital.o2_saturation + '%' : '--'}</td>
                <td>${vital.weight ? vital.weight + ' كغ' : '--'}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary" onclick="viewVitalsDetails(${vital.id})">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            </tr>
        `;
    tbody.append(row);
  });
}

function updateVitalsSummary() {
  if (vitalsRecords.length === 0) return;

  const latest = vitalsRecords[0];
  $('#lastBP').text(latest.bp_systolic && latest.bp_diastolic ? `${latest.bp_systolic}/${latest.bp_diastolic}` : '--');
  $('#lastHR').text(latest.heart_rate || '--');
  $('#lastTemp').text(latest.temperature ? latest.temperature + '°' : '--');
  $('#lastO2').text(latest.o2_saturation ? latest.o2_saturation + '%' : '--');
  $('#lastWeight').text(latest.weight || '--');
  $('#lastHeight').text(latest.height || '--');
}

function openVitalsModal() {
  populateBeneficiarySelect('#vitalsBeneficiary');
  $('#vitalsForm')[0].reset();
  $('#vitalsPainLevel').val(0);
  $('#painLevelValue').text('0');
  $('#vitalsModal').modal('show');
}

function saveVitals() {
  const formData = {
    beneficiary_id: parseInt($('#vitalsBeneficiary').val()),
    measurement_date: $('#vitalsDate').val(),
    bp_systolic: parseInt($('#vitalsBPSystolic').val()) || null,
    bp_diastolic: parseInt($('#vitalsBPDiastolic').val()) || null,
    heart_rate: parseInt($('#vitalsHeartRate').val()) || null,
    temperature: parseFloat($('#vitalsTemperature').val()) || null,
    o2_saturation: parseInt($('#vitalsO2Saturation').val()) || null,
    respiratory_rate: parseInt($('#vitalsRespRate').val()) || null,
    weight: parseFloat($('#vitalsWeight').val()) || null,
    height: parseFloat($('#vitalsHeight').val()) || null,
    pain_level: parseInt($('#vitalsPainLevel').val()) || 0,
    blood_sugar: parseInt($('#vitalsBloodSugar').val()) || null,
    recorded_by: $('#vitalsRecorder').val(),
    notes: $('#vitalsNotes').val(),
  };

  if (!formData.beneficiary_id || !formData.measurement_date) {
    showAlert('يرجى اختيار المستفيد وتاريخ القياس', 'warning');
    return;
  }

  const token = localStorage.getItem('token');
  if (!token) return;

  $.ajax({
    url: '/api/rehabilitation/vitals',
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    data: JSON.stringify(formData),
    success: function () {
      showAlert('تم حفظ العلامات الحيوية بنجاح', 'success');
      $('#vitalsModal').modal('hide');
      loadVitals();
    },
    error: function () {
      showAlert('حدث خطأ أثناء حفظ العلامات الحيوية', 'danger');
    },
  });
}

function viewVitalsDetails(id) {
  const vital = vitalsRecords.find(v => v.id === id);
  if (!vital) return;
  const beneficiary = beneficiaries.find(b => b.id === vital.beneficiary_id);

  const bmi = vital.weight && vital.height ? (vital.weight / (vital.height / 100) ** 2).toFixed(1) : 'غير متاح';

  const content = `
        <p><strong>المستفيد:</strong> ${beneficiary ? beneficiary.name : 'غير محدد'}</p>
        <p><strong>التاريخ:</strong> ${formatDate(vital.measurement_date)}</p>
        <hr>
        <div class="row">
            <div class="col-md-4 mb-2"><strong>ضغط الدم:</strong> ${vital.bp_systolic && vital.bp_diastolic ? `${vital.bp_systolic}/${vital.bp_diastolic} mmHg` : '--'}</div>
            <div class="col-md-4 mb-2"><strong>النبض:</strong> ${vital.heart_rate ? vital.heart_rate + ' bpm' : '--'}</div>
            <div class="col-md-4 mb-2"><strong>الحرارة:</strong> ${vital.temperature ? vital.temperature + '°C' : '--'}</div>
            <div class="col-md-4 mb-2"><strong>الأكسجين:</strong> ${vital.o2_saturation ? vital.o2_saturation + '%' : '--'}</div>
            <div class="col-md-4 mb-2"><strong>التنفس:</strong> ${vital.respiratory_rate ? vital.respiratory_rate + '/min' : '--'}</div>
            <div class="col-md-4 mb-2"><strong>الألم:</strong> ${vital.pain_level !== undefined ? vital.pain_level + '/10' : '--'}</div>
            <div class="col-md-4 mb-2"><strong>الوزن:</strong> ${vital.weight ? vital.weight + ' كغ' : '--'}</div>
            <div class="col-md-4 mb-2"><strong>الطول:</strong> ${vital.height ? vital.height + ' سم' : '--'}</div>
            <div class="col-md-4 mb-2"><strong>BMI:</strong> ${bmi}</div>
            ${vital.blood_sugar ? `<div class="col-md-4 mb-2"><strong>سكر الدم:</strong> ${vital.blood_sugar} mg/dL</div>` : ''}
        </div>
        ${vital.recorded_by ? `<p class="mt-2"><strong>مسجل بواسطة:</strong> ${vital.recorded_by}</p>` : ''}
        ${vital.notes ? `<p><strong>ملاحظات:</strong> ${vital.notes}</p>` : ''}
    `;

  $('#detailsModalLabel').text('تفاصيل العلامات الحيوية');
  $('#detailsModalBody').html(content);
  $('#detailsModal').modal('show');
}

// ==========================================
// Team Communications Functions
// ==========================================
function loadTeamMessages() {
  const token = localStorage.getItem('token');
  if (!token) return;

  $.ajax({
    url: '/api/rehabilitation/team-communications',
    method: 'GET',
    headers: { Authorization: 'Bearer ' + token },
    success: function (response) {
      teamMessages = response.messages || [];
      renderTeamMessages();
    },
    error: function () {
      console.log('Error loading team messages');
    },
  });
}

function renderTeamMessages(filteredMessages) {
  const container = $('#teamMessagesContainer');
  container.empty();

  const msgs = filteredMessages || teamMessages;

  if (msgs.length === 0) {
    container.html('<p class="text-muted text-center py-4">لا توجد رسائل حالياً</p>');
    return;
  }

  msgs.forEach(msg => {
    const beneficiary = beneficiaries.find(b => b.id === msg.beneficiary_id);
    const priorityClass = msg.priority === 'urgent' ? 'urgent' : 'normal';
    const typeIcon =
      msg.message_type === 'alert'
        ? 'exclamation-triangle text-warning'
        : msg.message_type === 'request'
          ? 'hand-paper text-info'
          : msg.message_type === 'consultation'
            ? 'stethoscope text-primary'
            : msg.message_type === 'referral'
              ? 'share text-success'
              : 'info-circle text-secondary';

    const card = `
            <div class="team-message ${priorityClass}">
                <div class="d-flex justify-content-between align-items-start">
                    <div>
                        <h6 class="mb-1">
                            <i class="fas fa-${typeIcon} me-2"></i>
                            ${msg.subject || 'بدون عنوان'}
                            ${msg.priority === 'urgent' ? '<span class="badge bg-danger ms-2">عاجل</span>' : ''}
                        </h6>
                        <p class="mb-1">${msg.content}</p>
                        <small class="text-muted">
                            ${msg.sender || 'مجهول'}
                            ${beneficiary ? ` | المستفيد: ${beneficiary.name}` : ''}
                            ${msg.recipient ? ` | إلى: ${msg.recipient}` : ''}
                        </small>
                    </div>
                    <small class="text-muted">${formatDate(msg.created_at)}</small>
                </div>
            </div>
        `;
    container.append(card);
  });
}

function openTeamMessageModal() {
  populateBeneficiarySelect('#msgBeneficiary', true);
  $('#teamMessageForm')[0].reset();
  $('#teamMessageModal').modal('show');
}

function saveTeamMessage() {
  const formData = {
    beneficiary_id: parseInt($('#msgBeneficiary').val()) || null,
    message_type: $('#msgType').val(),
    priority: $('#msgPriority').val(),
    recipient: $('#msgRecipient').val(),
    subject: $('#msgSubject').val(),
    content: $('#msgContent').val(),
    sender: currentUser ? currentUser.name : 'مستخدم النظام',
  };

  if (!formData.message_type || !formData.subject || !formData.content) {
    showAlert('يرجى ملء جميع الحقول المطلوبة', 'warning');
    return;
  }

  const token = localStorage.getItem('token');
  if (!token) return;

  $.ajax({
    url: '/api/rehabilitation/team-communications',
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    data: JSON.stringify(formData),
    success: function () {
      showAlert('تم إرسال الرسالة بنجاح', 'success');
      $('#teamMessageModal').modal('hide');
      loadTeamMessages();
    },
    error: function () {
      showAlert('حدث خطأ أثناء إرسال الرسالة', 'danger');
    },
  });
}

function filterTeamMessages() {
  const typeFilter = $('#messageTypeFilter').val();
  if (!typeFilter) {
    renderTeamMessages(teamMessages);
    return;
  }
  const filtered = teamMessages.filter(m => m.message_type === typeFilter);
  renderTeamMessages(filtered);
}

// ==========================================
// Waiting List Functions
// ==========================================
function loadWaitingList() {
  const token = localStorage.getItem('token');
  if (!token) return;

  $.ajax({
    url: '/api/rehabilitation/waiting-list',
    method: 'GET',
    headers: { Authorization: 'Bearer ' + token },
    success: function (response) {
      waitingList = response.waiting_list || [];
      populateWaitingListTable();
    },
    error: function () {
      console.log('Error loading waiting list');
    },
  });
}

function populateWaitingListTable(filteredList) {
  const tbody = $('#waitingListTableBody');
  tbody.empty();

  const list = filteredList || waitingList;

  list.forEach((item, index) => {
    const priorityClass = item.priority === 'high' ? 'danger' : item.priority === 'medium' ? 'warning' : 'info';
    const statusLabel = item.status === 'pending' ? 'قيد الانتظار' : item.status === 'approved' ? 'معتمد' : 'تم القبول';
    const statusClass = item.status === 'pending' ? 'pending' : item.status === 'approved' ? 'approved' : 'admitted';

    const row = `
            <tr>
                <td>${index + 1}</td>
                <td>${item.beneficiary_name || 'غير محدد'}</td>
                <td>${getDisabilityLabel(item.disability_type)}</td>
                <td>${item.requested_program || 'غير محدد'}</td>
                <td><span class="badge bg-${priorityClass}">${getPriorityLabel(item.priority)}</span></td>
                <td>${formatDate(item.registration_date || item.created_at)}</td>
                <td><span class="waiting-list-status ${statusClass}">${statusLabel}</span></td>
                <td>
                    ${
                      item.status !== 'admitted'
                        ? `<button class="btn btn-sm btn-outline-success" onclick="admitFromWaitingList(${item.id})" title="قبول">
                        <i class="fas fa-check"></i>
                    </button>`
                        : ''
                    }
                    <button class="btn btn-sm btn-outline-primary" onclick="viewWaitingListDetails(${item.id})" title="تفاصيل">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            </tr>
        `;
    tbody.append(row);
  });
}

function refreshWaitingList() {
  loadWaitingList();
  showAlert('تم تحديث قائمة الانتظار', 'info');
}

function filterWaitingList() {
  const statusFilter = $('#waitingStatusFilter').val();
  if (!statusFilter) {
    populateWaitingListTable(waitingList);
    return;
  }
  const filtered = waitingList.filter(item => item.status === statusFilter);
  populateWaitingListTable(filtered);
}

function admitFromWaitingList(id) {
  if (!confirm('هل تريد قبول هذا المستفيد من قائمة الانتظار؟')) return;

  const token = localStorage.getItem('token');
  if (!token) return;

  $.ajax({
    url: `/api/rehabilitation/waiting-list/${id}/admit`,
    method: 'PUT',
    headers: { Authorization: 'Bearer ' + token },
    success: function () {
      showAlert('تم قبول المستفيد بنجاح', 'success');
      loadWaitingList();
      loadStatistics();
    },
    error: function () {
      showAlert('حدث خطأ أثناء قبول المستفيد', 'danger');
    },
  });
}

function viewWaitingListDetails(id) {
  const item = waitingList.find(i => i.id === id);
  if (!item) return;

  const content = `
        <p><strong>المستفيد:</strong> ${item.beneficiary_name || 'غير محدد'}</p>
        <p><strong>نوع الإعاقة:</strong> ${getDisabilityLabel(item.disability_type)}</p>
        <p><strong>البرنامج المطلوب:</strong> ${item.requested_program || 'غير محدد'}</p>
        <p><strong>الأولوية:</strong> ${getPriorityLabel(item.priority)}</p>
        <p><strong>تاريخ التسجيل:</strong> ${formatDate(item.registration_date || item.created_at)}</p>
        <p><strong>الحالة:</strong> ${item.status === 'pending' ? 'قيد الانتظار' : item.status === 'approved' ? 'معتمد' : 'تم القبول'}</p>
        ${item.notes ? `<p><strong>ملاحظات:</strong> ${item.notes}</p>` : ''}
        ${item.referral_source ? `<p><strong>مصدر الإحالة:</strong> ${item.referral_source}</p>` : ''}
    `;

  $('#detailsModalLabel').text('تفاصيل قائمة الانتظار');
  $('#detailsModalBody').html(content);
  $('#detailsModal').modal('show');
}

// ==========================================
// Additional Helper Functions
// ==========================================
function getDisabilityLabel(type) {
  const labels = {
    physical: 'إعاقة حركية',
    visual: 'إعاقة بصرية',
    hearing: 'إعاقة سمعية',
    intellectual: 'إعاقة ذهنية',
    autism: 'اضطراب طيف التوحد',
    learning: 'صعوبات التعلم',
    speech: 'اضطراب النطق والكلام',
    multiple: 'إعاقات متعددة',
    cerebral_palsy: 'شلل دماغي',
    down_syndrome: 'متلازمة داون',
    adhd: 'اضطراب فرط الحركة',
    epilepsy: 'صرع',
    muscular_dystrophy: 'ضمور عضلي',
    spina_bifida: 'شق العمود الفقري',
    traumatic_brain_injury: 'إصابة دماغية',
    spinal_cord_injury: 'إصابة الحبل الشوكي',
    genetic_disorder: 'اضطراب وراثي',
    developmental_delay: 'تأخر نمائي',
  };
  return labels[type] || type;
}

function getSeverityLabel(severity) {
  const labels = {
    mild: 'خفيفة',
    moderate: 'متوسطة',
    severe: 'شديدة',
  };
  return labels[severity] || severity || 'غير محدد';
}

function getRiskLevelLabel(level) {
  const labels = {
    low: 'منخفض',
    medium: 'متوسط',
    high: 'عالي',
    critical: 'حرج',
  };
  return labels[level] || level;
}

function getRiskTypeLabel(type) {
  const labels = {
    fall: 'خطر السقوط',
    medical: 'خطر طبي',
    behavioral: 'خطر سلوكي',
    self_harm: 'إيذاء النفس',
    elopement: 'خطر الهروب',
    aspiration: 'خطر الاستنشاق',
    seizure: 'خطر النوبات',
    skin_integrity: 'سلامة الجلد',
    nutrition: 'خطر غذائي',
    infection: 'خطر العدوى',
  };
  return labels[type] || type;
}

function getFrequencyLabel(freq) {
  const labels = {
    once_daily: 'مرة يومياً',
    twice_daily: 'مرتين يومياً',
    three_daily: 'ثلاث مرات يومياً',
    four_daily: 'أربع مرات يومياً',
    as_needed: 'عند الحاجة',
    weekly: 'أسبوعياً',
    monthly: 'شهرياً',
  };
  return labels[freq] || freq;
}

function getRouteLabel(route) {
  const labels = {
    oral: 'فموي',
    injection: 'حقن',
    topical: 'موضعي',
    inhalation: 'استنشاق',
    sublingual: 'تحت اللسان',
    rectal: 'شرجي',
  };
  return labels[route] || route || 'غير محدد';
}

function getMedicationStatusLabel(status) {
  const labels = {
    active: 'نشط',
    paused: 'متوقف مؤقتاً',
    completed: 'مكتمل',
    cancelled: 'ملغي',
  };
  return labels[status] || status || 'نشط';
}

function getPriorityLabel(priority) {
  const labels = {
    high: 'عالية',
    medium: 'متوسطة',
    low: 'منخفضة',
    urgent: 'عاجلة',
  };
  return labels[priority] || priority;
}

function getMessageTypeLabel(type) {
  const labels = {
    update: 'تحديث',
    alert: 'تنبيه',
    request: 'طلب',
    note: 'ملاحظة',
    consultation: 'استشارة',
    referral: 'إحالة',
  };
  return labels[type] || type;
}

function populateBeneficiarySelect(selector, allowEmpty) {
  const select = $(selector);
  select.empty();
  if (allowEmpty) {
    select.append('<option value="">عام - بدون مستفيد محدد</option>');
  } else {
    select.append('<option value="">اختر المستفيد</option>');
  }
  beneficiaries.forEach(b => {
    select.append(`<option value="${b.id}">${b.name}</option>`);
  });
}

// =====================================================
// Phase 3: Appointments Management
// =====================================================

function loadAppointments() {
  const token = localStorage.getItem('token');
  if (!token) return;

  $.ajax({
    url: '/api/rehabilitation/upcoming-appointments',
    method: 'GET',
    headers: { Authorization: 'Bearer ' + token },
    data: { days: 365 },
    success: function (response) {
      if (response.success) {
        appointments = response.data || [];
        populateAppointmentsTable();
        updateAppointmentsCount();
      }
    },
    error: function () {
      console.log('Error loading appointments');
    },
  });
}

function populateAppointmentsTable() {
  const tbody = $('#appointmentsTableBody');
  tbody.empty();

  if (appointments.length === 0) {
    tbody.append(
      '<tr><td colspan="8" class="text-center text-muted py-4"><i class="fas fa-calendar-times fa-2x mb-2 d-block"></i>لا توجد مواعيد</td></tr>',
    );
    return;
  }

  appointments.forEach(apt => {
    const statusClass =
      apt.status === 'completed' ? 'success' : apt.status === 'cancelled' ? 'danger' : apt.status === 'confirmed' ? 'primary' : 'warning';
    tbody.append(`
      <tr>
        <td>${apt.beneficiaryName || '--'}</td>
        <td>${getAppointmentTypeLabel(apt.appointment_type)}</td>
        <td>${formatDate(apt.date)}</td>
        <td>${apt.start_time || '--'}</td>
        <td>${apt.provider || '--'}</td>
        <td>${apt.location || '--'}</td>
        <td><span class="badge bg-${statusClass}">${getAppointmentStatusLabel(apt.status)}</span></td>
        <td>
          <button class="btn btn-sm btn-outline-primary me-1" onclick="editAppointment('${apt._id}', '${apt.programId}')"><i class="fas fa-edit"></i></button>
          <button class="btn btn-sm btn-outline-success" onclick="completeAppointment('${apt._id}', '${apt.programId}')"><i class="fas fa-check"></i></button>
        </td>
      </tr>
    `);
  });
}

function updateAppointmentsCount() {
  const upcoming = appointments.filter(a => a.status === 'scheduled' || a.status === 'confirmed').length;
  $('#appointmentsCount').text(upcoming);
}

function openAppointmentModal(id) {
  $('#appointmentForm')[0].reset();
  $('#appointmentId').val('');
  $('#appointmentModalLabel').text(id ? 'تعديل الموعد' : 'إضافة موعد جديد');
  populateBeneficiarySelect('#appointmentBeneficiary', false);
  const modal = new bootstrap.Modal(document.getElementById('appointmentModal'));
  modal.show();
}

function saveAppointment() {
  const token = localStorage.getItem('token');
  if (!token) return;

  const beneficiaryId = $('#appointmentBeneficiary').val();
  if (!beneficiaryId) {
    showToast('يرجى اختيار المستفيد', 'warning');
    return;
  }

  const programId = getProgramIdForBeneficiary(beneficiaryId);
  if (!programId) {
    showToast('لم يتم العثور على برنامج للمستفيد', 'warning');
    return;
  }

  const data = {
    appointment_type: $('#appointmentType').val(),
    date: $('#appointmentDate').val(),
    start_time: $('#appointmentStartTime').val(),
    end_time: $('#appointmentEndTime').val(),
    duration_minutes: parseInt($('#appointmentDuration').val()) || 60,
    provider: $('#appointmentProvider').val(),
    location: $('#appointmentLocation').val(),
    status: $('#appointmentStatus').val(),
    recurring: $('#appointmentRecurring').is(':checked'),
    notes: $('#appointmentNotes').val(),
  };

  const appointmentId = $('#appointmentId').val();
  const url = appointmentId
    ? `/api/rehabilitation/programs/${programId}/appointments/${appointmentId}`
    : `/api/rehabilitation/programs/${programId}/appointments`;
  const method = appointmentId ? 'PUT' : 'POST';

  $.ajax({
    url: url,
    method: method,
    headers: { Authorization: 'Bearer ' + token },
    contentType: 'application/json',
    data: JSON.stringify(data),
    success: function (response) {
      if (response.success) {
        showToast(appointmentId ? 'تم تعديل الموعد بنجاح' : 'تم إضافة الموعد بنجاح', 'success');
        bootstrap.Modal.getInstance(document.getElementById('appointmentModal')).hide();
        loadAppointments();
      }
    },
    error: function (xhr) {
      showToast(xhr.responseJSON?.message || 'حدث خطأ', 'error');
    },
  });
}

function editAppointment(id, programId) {
  const apt = appointments.find(a => a._id === id);
  if (!apt) return;
  $('#appointmentId').val(id);
  $('#appointmentProgramId').val(programId);
  $('#appointmentType').val(apt.appointment_type);
  $('#appointmentDate').val(apt.date ? apt.date.substring(0, 10) : '');
  $('#appointmentStartTime').val(apt.start_time);
  $('#appointmentEndTime').val(apt.end_time);
  $('#appointmentDuration').val(apt.duration_minutes);
  $('#appointmentProvider').val(apt.provider);
  $('#appointmentLocation').val(apt.location);
  $('#appointmentStatus').val(apt.status);
  $('#appointmentRecurring').prop('checked', apt.recurring);
  $('#appointmentNotes').val(apt.notes);
  $('#appointmentModalLabel').text('تعديل الموعد');
  const modal = new bootstrap.Modal(document.getElementById('appointmentModal'));
  modal.show();
}

function completeAppointment(id, programId) {
  const token = localStorage.getItem('token');
  if (!token) return;
  $.ajax({
    url: `/api/rehabilitation/programs/${programId}/appointments/${id}`,
    method: 'PUT',
    headers: { Authorization: 'Bearer ' + token },
    contentType: 'application/json',
    data: JSON.stringify({ status: 'completed' }),
    success: function (response) {
      if (response.success) {
        showToast('تم إكمال الموعد', 'success');
        loadAppointments();
      }
    },
    error: function () {
      showToast('حدث خطأ', 'error');
    },
  });
}

function filterAppointments() {
  const search = $('#appointmentSearch').val().toLowerCase();
  const status = $('#appointmentStatusFilter').val();
  const filtered = appointments.filter(a => {
    if (status && a.status !== status) return false;
    if (search && !(a.beneficiaryName || '').toLowerCase().includes(search) && !(a.provider || '').toLowerCase().includes(search))
      return false;
    return true;
  });
  populateAppointmentsTableFiltered(filtered);
}

function populateAppointmentsTableFiltered(list) {
  const tbody = $('#appointmentsTableBody');
  tbody.empty();
  if (list.length === 0) {
    tbody.append('<tr><td colspan="8" class="text-center text-muted py-4">لا توجد نتائج</td></tr>');
    return;
  }
  list.forEach(apt => {
    const statusClass =
      apt.status === 'completed' ? 'success' : apt.status === 'cancelled' ? 'danger' : apt.status === 'confirmed' ? 'primary' : 'warning';
    tbody.append(`
      <tr>
        <td>${apt.beneficiaryName || '--'}</td>
        <td>${getAppointmentTypeLabel(apt.appointment_type)}</td>
        <td>${formatDate(apt.date)}</td>
        <td>${apt.start_time || '--'}</td>
        <td>${apt.provider || '--'}</td>
        <td>${apt.location || '--'}</td>
        <td><span class="badge bg-${statusClass}">${getAppointmentStatusLabel(apt.status)}</span></td>
        <td>
          <button class="btn btn-sm btn-outline-primary me-1" onclick="editAppointment('${apt._id}', '${apt.programId}')"><i class="fas fa-edit"></i></button>
          <button class="btn btn-sm btn-outline-success" onclick="completeAppointment('${apt._id}', '${apt.programId}')"><i class="fas fa-check"></i></button>
        </td>
      </tr>
    `);
  });
}

function getAppointmentTypeLabel(type) {
  const labels = {
    initial_assessment: 'تقييم أولي',
    follow_up: 'متابعة',
    therapy_session: 'جلسة علاجية',
    medical_consultation: 'استشارة طبية',
    psychological_session: 'جلسة نفسية',
    speech_therapy: 'علاج نطق',
    occupational_therapy: 'علاج وظيفي',
    physical_therapy: 'علاج طبيعي',
    group_session: 'جلسة جماعية',
    family_meeting: 'اجتماع أسري',
    iep_review: 'مراجعة IEP',
    other: 'أخرى',
  };
  return labels[type] || type || '--';
}

function getAppointmentStatusLabel(status) {
  const labels = {
    scheduled: 'مجدول',
    confirmed: 'مؤكد',
    completed: 'مكتمل',
    cancelled: 'ملغي',
    no_show: 'لم يحضر',
    rescheduled: 'معاد جدولة',
  };
  return labels[status] || status || '--';
}

// =====================================================
// Phase 3: Incidents Management
// =====================================================

function loadIncidents() {
  const token = localStorage.getItem('token');
  if (!token) return;

  $.ajax({
    url: '/api/rehabilitation/programs',
    method: 'GET',
    headers: { Authorization: 'Bearer ' + token },
    success: function (response) {
      if (response.success) {
        incidents = [];
        (response.data || []).forEach(p => {
          if (p.incident_reports) {
            p.incident_reports.forEach(inc => {
              incidents.push({ ...inc, programId: p._id || p.id, beneficiaryName: p.beneficiary?.name || '--' });
            });
          }
        });
        populateIncidentsTable();
        updateIncidentsCount();
      }
    },
    error: function () {
      console.log('Error loading incidents');
    },
  });
}

function populateIncidentsTable() {
  const tbody = $('#incidentsTableBody');
  tbody.empty();

  if (incidents.length === 0) {
    tbody.append(
      '<tr><td colspan="7" class="text-center text-muted py-4"><i class="fas fa-check-circle fa-2x mb-2 d-block"></i>لا توجد حوادث مسجلة</td></tr>',
    );
    return;
  }

  incidents.forEach(inc => {
    const sevClass = { minor: 'success', moderate: 'warning', major: 'orange', critical: 'danger' }[inc.severity] || 'secondary';
    tbody.append(`
      <tr>
        <td>${inc.beneficiaryName || '--'}</td>
        <td>${getIncidentTypeLabel(inc.incident_type)}</td>
        <td><span class="badge bg-${sevClass}">${getSeverityLabel(inc.severity)}</span></td>
        <td>${formatDate(inc.incident_date)}</td>
        <td>${inc.location || '--'}</td>
        <td><span class="badge bg-${inc.status === 'closed' ? 'success' : 'warning'}">${getIncidentStatusLabel(inc.status)}</span></td>
        <td>
          <button class="btn btn-sm btn-outline-primary me-1" onclick="viewIncidentDetails('${inc._id}')"><i class="fas fa-eye"></i></button>
          <button class="btn btn-sm btn-outline-warning" onclick="editIncident('${inc._id}', '${inc.programId}')"><i class="fas fa-edit"></i></button>
        </td>
      </tr>
    `);
  });
}

function updateIncidentsCount() {
  $('#incidentsCount').text(incidents.length);
}

function openIncidentModal(id) {
  $('#incidentForm')[0].reset();
  $('#incidentId').val('');
  $('#incidentModalLabel').text(id ? 'تعديل الحادثة' : 'تسجيل حادثة جديدة');
  populateBeneficiarySelect('#incidentBeneficiary', false);
  $('#incidentDate').val(new Date().toISOString().substring(0, 10));
  const modal = new bootstrap.Modal(document.getElementById('incidentModal'));
  modal.show();
}

function saveIncident() {
  const token = localStorage.getItem('token');
  if (!token) return;

  const beneficiaryId = $('#incidentBeneficiary').val();
  if (!beneficiaryId) {
    showToast('يرجى اختيار المستفيد', 'warning');
    return;
  }

  const programId = getProgramIdForBeneficiary(beneficiaryId);
  if (!programId) {
    showToast('لم يتم العثور على برنامج للمستفيد', 'warning');
    return;
  }

  const data = {
    incident_type: $('#incidentType').val(),
    severity: $('#incidentSeverity').val(),
    incident_date: $('#incidentDate').val(),
    incident_time: $('#incidentTime').val(),
    location: $('#incidentLocation').val(),
    description: $('#incidentDescription').val(),
    witnesses: $('#incidentWitnesses').val()
      ? $('#incidentWitnesses')
          .val()
          .split(',')
          .map(w => w.trim())
      : [],
    injuries_sustained: $('#incidentInjuries').val(),
    follow_up_actions: $('#incidentActions').val(),
    preventive_measures: $('#incidentPreventive').val(),
  };

  const incidentId = $('#incidentId').val();
  const url = incidentId
    ? `/api/rehabilitation/programs/${programId}/incidents/${incidentId}`
    : `/api/rehabilitation/programs/${programId}/incidents`;
  const method = incidentId ? 'PUT' : 'POST';

  $.ajax({
    url: url,
    method: method,
    headers: { Authorization: 'Bearer ' + token },
    contentType: 'application/json',
    data: JSON.stringify(data),
    success: function (response) {
      if (response.success) {
        showToast(incidentId ? 'تم تعديل الحادثة' : 'تم تسجيل الحادثة بنجاح', 'success');
        bootstrap.Modal.getInstance(document.getElementById('incidentModal')).hide();
        loadIncidents();
      }
    },
    error: function (xhr) {
      showToast(xhr.responseJSON?.message || 'حدث خطأ', 'error');
    },
  });
}

function editIncident(id, programId) {
  const inc = incidents.find(i => i._id === id);
  if (!inc) return;
  $('#incidentId').val(id);
  $('#incidentProgramId').val(programId);
  $('#incidentType').val(inc.incident_type);
  $('#incidentSeverity').val(inc.severity);
  $('#incidentDate').val(inc.incident_date ? inc.incident_date.substring(0, 10) : '');
  $('#incidentTime').val(inc.incident_time);
  $('#incidentLocation').val(inc.location);
  $('#incidentDescription').val(inc.description);
  $('#incidentWitnesses').val(inc.witnesses ? inc.witnesses.join(', ') : '');
  $('#incidentInjuries').val(inc.injuries_sustained);
  $('#incidentActions').val(inc.follow_up_actions);
  $('#incidentPreventive').val(inc.preventive_measures);
  $('#incidentModalLabel').text('تعديل الحادثة');
  const modal = new bootstrap.Modal(document.getElementById('incidentModal'));
  modal.show();
}

function viewIncidentDetails(id) {
  const inc = incidents.find(i => i._id === id);
  if (!inc) return;
  const html = `
    <div class="incident-card ${inc.severity}">
      <h6><i class="fas fa-exclamation-triangle me-2 text-danger"></i>${getIncidentTypeLabel(inc.incident_type)}</h6>
      <div class="row mt-3">
        <div class="col-6"><strong>الخطورة:</strong> ${getIncidentSeverityLabel(inc.severity)}</div>
        <div class="col-6"><strong>التاريخ:</strong> ${formatDate(inc.incident_date)}</div>
        <div class="col-6"><strong>الموقع:</strong> ${inc.location || '--'}</div>
        <div class="col-6"><strong>الحالة:</strong> ${getIncidentStatusLabel(inc.status)}</div>
      </div>
      <div class="mt-3"><strong>الوصف:</strong><br>${inc.description || '--'}</div>
      ${inc.injuries_sustained ? `<div class="mt-2"><strong>الإصابات:</strong><br>${inc.injuries_sustained}</div>` : ''}
      ${inc.follow_up_actions ? `<div class="mt-2"><strong>الإجراءات:</strong><br>${inc.follow_up_actions}</div>` : ''}
      ${inc.preventive_measures ? `<div class="mt-2"><strong>الوقاية:</strong><br>${inc.preventive_measures}</div>` : ''}
    </div>
  `;
  $('#detailsModalLabel').text('تفاصيل الحادثة');
  $('#detailsModalBody').html(html);
  const modal = new bootstrap.Modal(document.getElementById('detailsModal'));
  modal.show();
}

function filterIncidents() {
  const severity = $('#incidentSeverityFilter').val();
  const type = $('#incidentTypeFilter').val();
  const filtered = incidents.filter(i => {
    if (severity && i.severity !== severity) return false;
    if (type && i.incident_type !== type) return false;
    return true;
  });
  const tbody = $('#incidentsTableBody');
  tbody.empty();
  if (filtered.length === 0) {
    tbody.append('<tr><td colspan="7" class="text-center text-muted py-4">لا توجد نتائج</td></tr>');
    return;
  }
  filtered.forEach(inc => {
    const sevClass = { minor: 'success', moderate: 'warning', major: 'orange', critical: 'danger' }[inc.severity] || 'secondary';
    tbody.append(`
      <tr>
        <td>${inc.beneficiaryName || '--'}</td>
        <td>${getIncidentTypeLabel(inc.incident_type)}</td>
        <td><span class="badge bg-${sevClass}">${getIncidentSeverityLabel(inc.severity)}</span></td>
        <td>${formatDate(inc.incident_date)}</td>
        <td>${inc.location || '--'}</td>
        <td><span class="badge bg-${inc.status === 'closed' ? 'success' : 'warning'}">${getIncidentStatusLabel(inc.status)}</span></td>
        <td>
          <button class="btn btn-sm btn-outline-primary me-1" onclick="viewIncidentDetails('${inc._id}')"><i class="fas fa-eye"></i></button>
          <button class="btn btn-sm btn-outline-warning" onclick="editIncident('${inc._id}', '${inc.programId}')"><i class="fas fa-edit"></i></button>
        </td>
      </tr>
    `);
  });
}

function getIncidentTypeLabel(type) {
  const labels = {
    fall: 'سقوط',
    injury: 'إصابة',
    behavioral: 'سلوكي',
    medication_error: 'خطأ دوائي',
    elopement: 'هروب',
    property_damage: 'تلف ممتلكات',
    verbal_aggression: 'عدوان لفظي',
    physical_aggression: 'عدوان جسدي',
    self_harm: 'إيذاء ذاتي',
    seizure: 'نوبة صرع',
    allergic_reaction: 'ردة فعل تحسسية',
    equipment_malfunction: 'عطل أجهزة',
    environmental: 'بيئي',
    other: 'أخرى',
  };
  return labels[type] || type || '--';
}

function getIncidentSeverityLabel(severity) {
  const labels = { minor: 'بسيط', moderate: 'متوسط', major: 'كبير', critical: 'حرج' };
  return labels[severity] || severity || '--';
}

function getIncidentStatusLabel(status) {
  const labels = { open: 'مفتوح', under_investigation: 'قيد التحقيق', resolved: 'تم الحل', closed: 'مغلق' };
  return labels[status] || status || '--';
}

// =====================================================
// Phase 3: Behavioral Intervention Plans
// =====================================================

function loadBehavioralPlans() {
  const token = localStorage.getItem('token');
  if (!token) return;

  $.ajax({
    url: '/api/rehabilitation/programs',
    method: 'GET',
    headers: { Authorization: 'Bearer ' + token },
    success: function (response) {
      if (response.success) {
        behavioralPlans = [];
        (response.data || []).forEach(p => {
          if (p.behavioral_intervention_plans) {
            p.behavioral_intervention_plans.forEach(bip => {
              behavioralPlans.push({ ...bip, programId: p._id || p.id, beneficiaryName: p.beneficiary?.name || '--' });
            });
          }
        });
        populateBehavioralPlansGrid();
      }
    },
    error: function () {
      console.log('Error loading behavioral plans');
    },
  });
}

function populateBehavioralPlansGrid() {
  const grid = $('#behavioralPlansGrid');
  grid.empty();

  if (behavioralPlans.length === 0) {
    grid.append('<div class="col-12 text-center text-muted py-4"><i class="fas fa-brain fa-2x mb-2 d-block"></i>لا توجد خطط سلوكية</div>');
    return;
  }

  behavioralPlans.forEach(bip => {
    const statusClass =
      { draft: 'secondary', active: 'success', under_review: 'warning', completed: 'primary', discontinued: 'danger' }[bip.status] ||
      'secondary';
    grid.append(`
      <div class="col-md-6 col-lg-4 mb-3">
        <div class="bip-card">
          <div class="d-flex justify-content-between align-items-start mb-2">
            <h6 class="mb-0"><i class="fas fa-brain me-2 text-info"></i>${bip.target_behavior || 'غير محدد'}</h6>
            <span class="badge bg-${statusClass}">${getBipStatusLabel(bip.status)}</span>
          </div>
          <p class="text-muted small mb-1"><strong>المستفيد:</strong> ${bip.beneficiaryName}</p>
          <p class="text-muted small mb-1"><strong>وظيفة السلوك:</strong> ${getBehaviorFunctionLabel(bip.behavior_function)}</p>
          ${bip.effectiveness ? `<p class="text-muted small mb-1"><strong>الفعالية:</strong> ${bip.effectiveness}%</p>` : ''}
          ${bip.intervention_strategies?.length ? `<p class="text-muted small mb-0"><strong>الاستراتيجيات:</strong> ${bip.intervention_strategies.map(s => getStrategyLabel(s)).join(', ')}</p>` : ''}
          <div class="mt-2">
            <button class="btn btn-sm btn-outline-info me-1" onclick="editBehavioralPlan('${bip._id}', '${bip.programId}')"><i class="fas fa-edit"></i></button>
            <button class="btn btn-sm btn-outline-primary" onclick="viewBipDetails('${bip._id}')"><i class="fas fa-eye"></i></button>
          </div>
        </div>
      </div>
    `);
  });
}

function openBehavioralPlanModal(id) {
  $('#behavioralPlanForm')[0].reset();
  $('#bipId').val('');
  $('#behavioralPlanModalLabel').text(id ? 'تعديل خطة التدخل السلوكي' : 'خطة تدخل سلوكي جديدة');
  populateBeneficiarySelect('#bipBeneficiary', false);
  const modal = new bootstrap.Modal(document.getElementById('behavioralPlanModal'));
  modal.show();
}

function saveBehavioralPlan() {
  const token = localStorage.getItem('token');
  if (!token) return;

  const beneficiaryId = $('#bipBeneficiary').val();
  if (!beneficiaryId) {
    showToast('يرجى اختيار المستفيد', 'warning');
    return;
  }

  const programId = getProgramIdForBeneficiary(beneficiaryId);
  if (!programId) {
    showToast('لم يتم العثور على برنامج للمستفيد', 'warning');
    return;
  }

  const data = {
    target_behavior: $('#bipTargetBehavior').val(),
    behavior_function: $('#bipBehaviorFunction').val(),
    antecedents: $('#bipAntecedents').val(),
    consequences: $('#bipConsequences').val(),
    replacement_behaviors: $('#bipReplacementBehaviors').val() ? $('#bipReplacementBehaviors').val().split('\n').filter(Boolean) : [],
    intervention_strategies: [$('#bipStrategy').val()],
    data_collection_method: $('#bipDataCollection').val(),
    baseline_data: $('#bipBaselineData').val(),
    current_data: $('#bipCurrentData').val(),
    effectiveness: parseInt($('#bipEffectiveness').val()) || 0,
    status: $('#bipStatus').val(),
    notes: $('#bipNotes').val(),
  };

  const bipId = $('#bipId').val();
  const url = bipId
    ? `/api/rehabilitation/programs/${programId}/behavioral-plans/${bipId}`
    : `/api/rehabilitation/programs/${programId}/behavioral-plans`;
  const method = bipId ? 'PUT' : 'POST';

  $.ajax({
    url: url,
    method: method,
    headers: { Authorization: 'Bearer ' + token },
    contentType: 'application/json',
    data: JSON.stringify(data),
    success: function (response) {
      if (response.success) {
        showToast(bipId ? 'تم تعديل الخطة' : 'تم إضافة الخطة بنجاح', 'success');
        bootstrap.Modal.getInstance(document.getElementById('behavioralPlanModal')).hide();
        loadBehavioralPlans();
      }
    },
    error: function (xhr) {
      showToast(xhr.responseJSON?.message || 'حدث خطأ', 'error');
    },
  });
}

function editBehavioralPlan(id, programId) {
  const bip = behavioralPlans.find(b => b._id === id);
  if (!bip) return;
  $('#bipId').val(id);
  $('#bipProgramId').val(programId);
  $('#bipTargetBehavior').val(bip.target_behavior);
  $('#bipBehaviorFunction').val(bip.behavior_function);
  $('#bipAntecedents').val(bip.antecedents);
  $('#bipConsequences').val(bip.consequences);
  $('#bipReplacementBehaviors').val(bip.replacement_behaviors ? bip.replacement_behaviors.join('\n') : '');
  $('#bipStrategy').val(bip.intervention_strategies?.[0] || '');
  $('#bipDataCollection').val(bip.data_collection_method);
  $('#bipBaselineData').val(bip.baseline_data);
  $('#bipCurrentData').val(bip.current_data);
  $('#bipEffectiveness').val(bip.effectiveness);
  $('#bipStatus').val(bip.status);
  $('#bipNotes').val(bip.notes);
  $('#behavioralPlanModalLabel').text('تعديل خطة التدخل السلوكي');
  const modal = new bootstrap.Modal(document.getElementById('behavioralPlanModal'));
  modal.show();
}

function viewBipDetails(id) {
  const bip = behavioralPlans.find(b => b._id === id);
  if (!bip) return;
  const html = `
    <div class="bip-card">
      <h6><i class="fas fa-brain me-2 text-info"></i>${bip.target_behavior || '--'}</h6>
      <div class="row mt-3">
        <div class="col-6"><strong>المستفيد:</strong> ${bip.beneficiaryName}</div>
        <div class="col-6"><strong>الحالة:</strong> ${getBipStatusLabel(bip.status)}</div>
        <div class="col-6 mt-2"><strong>وظيفة السلوك:</strong> ${getBehaviorFunctionLabel(bip.behavior_function)}</div>
        <div class="col-6 mt-2"><strong>الفعالية:</strong> ${bip.effectiveness || 0}%</div>
      </div>
      ${bip.antecedents ? `<div class="mt-2"><strong>المثيرات القبلية:</strong><br>${bip.antecedents}</div>` : ''}
      ${bip.consequences ? `<div class="mt-2"><strong>النتائج:</strong><br>${bip.consequences}</div>` : ''}
      ${bip.replacement_behaviors?.length ? `<div class="mt-2"><strong>السلوكيات البديلة:</strong><br>${bip.replacement_behaviors.join('، ')}</div>` : ''}
      <div class="mt-2"><strong>طريقة جمع البيانات:</strong> ${getDataCollectionLabel(bip.data_collection_method)}</div>
      ${bip.baseline_data ? `<div class="mt-1"><strong>خط الأساس:</strong> ${bip.baseline_data}</div>` : ''}
      ${bip.current_data ? `<div class="mt-1"><strong>البيانات الحالية:</strong> ${bip.current_data}</div>` : ''}
    </div>
  `;
  $('#detailsModalLabel').text('تفاصيل الخطة السلوكية');
  $('#detailsModalBody').html(html);
  const modal = new bootstrap.Modal(document.getElementById('detailsModal'));
  modal.show();
}

function filterBehavioralPlans() {
  const status = $('#bipStatusFilter').val();
  const filtered = status ? behavioralPlans.filter(b => b.status === status) : behavioralPlans;
  const grid = $('#behavioralPlansGrid');
  grid.empty();
  if (filtered.length === 0) {
    grid.append('<div class="col-12 text-center text-muted py-4">لا توجد نتائج</div>');
    return;
  }
  filtered.forEach(bip => {
    const statusClass =
      { draft: 'secondary', active: 'success', under_review: 'warning', completed: 'primary', discontinued: 'danger' }[bip.status] ||
      'secondary';
    grid.append(`
      <div class="col-md-6 col-lg-4 mb-3">
        <div class="bip-card">
          <div class="d-flex justify-content-between align-items-start mb-2">
            <h6 class="mb-0"><i class="fas fa-brain me-2 text-info"></i>${bip.target_behavior || 'غير محدد'}</h6>
            <span class="badge bg-${statusClass}">${getBipStatusLabel(bip.status)}</span>
          </div>
          <p class="text-muted small mb-1"><strong>المستفيد:</strong> ${bip.beneficiaryName}</p>
          <p class="text-muted small mb-0"><strong>وظيفة السلوك:</strong> ${getBehaviorFunctionLabel(bip.behavior_function)}</p>
          <div class="mt-2">
            <button class="btn btn-sm btn-outline-info me-1" onclick="editBehavioralPlan('${bip._id}', '${bip.programId}')"><i class="fas fa-edit"></i></button>
            <button class="btn btn-sm btn-outline-primary" onclick="viewBipDetails('${bip._id}')"><i class="fas fa-eye"></i></button>
          </div>
        </div>
      </div>
    `);
  });
}

function getBipStatusLabel(status) {
  const labels = { draft: 'مسودة', active: 'نشط', under_review: 'قيد المراجعة', completed: 'مكتمل', discontinued: 'متوقف' };
  return labels[status] || status || '--';
}

function getBehaviorFunctionLabel(fn) {
  const labels = {
    attention_seeking: 'طلب الانتباه',
    escape_avoidance: 'الهروب/التجنب',
    access_tangible: 'الوصول لشيء ملموس',
    sensory_stimulation: 'تحفيز حسي',
    communication: 'التواصل',
    self_regulation: 'التنظيم الذاتي',
    unknown: 'غير محدد',
  };
  return labels[fn] || fn || '--';
}

function getStrategyLabel(s) {
  const labels = {
    positive_reinforcement: 'التعزيز الإيجابي',
    negative_reinforcement: 'التعزيز السلبي',
    extinction: 'الإطفاء',
    differential_reinforcement: 'التعزيز التفاضلي',
    antecedent_modification: 'تعديل المثيرات',
    functional_communication: 'التواصل الوظيفي',
  };
  return labels[s] || s || '--';
}

function getDataCollectionLabel(m) {
  const labels = {
    frequency: 'التكرار',
    duration: 'المدة',
    interval: 'الفترات الزمنية',
    latency: 'زمن الاستجابة',
    abc_recording: 'تسجيل ABC',
    scatterplot: 'المخطط التشتتي',
  };
  return labels[m] || m || '--';
}

// =====================================================
// Phase 3: Documents Management
// =====================================================

function loadDocuments() {
  const token = localStorage.getItem('token');
  if (!token) return;

  $.ajax({
    url: '/api/rehabilitation/programs',
    method: 'GET',
    headers: { Authorization: 'Bearer ' + token },
    success: function (response) {
      if (response.success) {
        documents = [];
        (response.data || []).forEach(p => {
          if (p.documents) {
            p.documents.forEach(doc => {
              documents.push({ ...doc, programId: p._id || p.id, beneficiaryName: p.beneficiary?.name || '--' });
            });
          }
        });
        populateDocumentsTable();
        updateDocumentsCount();
      }
    },
    error: function () {
      console.log('Error loading documents');
    },
  });
}

function populateDocumentsTable() {
  const tbody = $('#documentsTableBody');
  tbody.empty();

  if (documents.length === 0) {
    tbody.append(
      '<tr><td colspan="7" class="text-center text-muted py-4"><i class="fas fa-folder-open fa-2x mb-2 d-block"></i>لا توجد مستندات</td></tr>',
    );
    return;
  }

  documents.forEach(doc => {
    tbody.append(`
      <tr>
        <td><i class="fas fa-file-alt me-2 text-muted"></i>${doc.title || '--'}</td>
        <td>${getDocumentTypeLabel(doc.document_type)}</td>
        <td>${doc.beneficiaryName || '--'}</td>
        <td>${formatDate(doc.uploaded_at || doc.created_at)}</td>
        <td>${doc.file_size ? formatFileSize(doc.file_size) : '--'}</td>
        <td>${doc.is_confidential ? '<i class="fas fa-lock text-danger"></i>' : '<i class="fas fa-unlock text-success"></i>'}</td>
        <td>
          <button class="btn btn-sm btn-outline-primary me-1" onclick="viewDocumentDetails('${doc._id}')"><i class="fas fa-eye"></i></button>
          <button class="btn btn-sm btn-outline-danger" onclick="deleteDocument('${doc._id}', '${doc.programId}')"><i class="fas fa-trash"></i></button>
        </td>
      </tr>
    `);
  });
}

function updateDocumentsCount() {
  $('#documentsCount').text(documents.length);
}

function openDocumentModal() {
  $('#documentForm')[0].reset();
  $('#documentId').val('');
  populateBeneficiarySelect('#documentBeneficiary', false);
  const modal = new bootstrap.Modal(document.getElementById('documentModal'));
  modal.show();
}

function saveDocument() {
  const token = localStorage.getItem('token');
  if (!token) return;

  const beneficiaryId = $('#documentBeneficiary').val();
  if (!beneficiaryId) {
    showToast('يرجى اختيار المستفيد', 'warning');
    return;
  }

  const programId = getProgramIdForBeneficiary(beneficiaryId);
  if (!programId) {
    showToast('لم يتم العثور على برنامج للمستفيد', 'warning');
    return;
  }

  const data = {
    document_type: $('#documentType').val(),
    title: $('#documentTitle').val(),
    description: $('#documentDescription').val(),
    expiry_date: $('#documentExpiry').val() || undefined,
    is_confidential: $('#documentConfidential').is(':checked'),
    tags: $('#documentTags').val()
      ? $('#documentTags')
          .val()
          .split(',')
          .map(t => t.trim())
      : [],
  };

  $.ajax({
    url: `/api/rehabilitation/programs/${programId}/documents`,
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token },
    contentType: 'application/json',
    data: JSON.stringify(data),
    success: function (response) {
      if (response.success) {
        showToast('تم رفع المستند بنجاح', 'success');
        bootstrap.Modal.getInstance(document.getElementById('documentModal')).hide();
        loadDocuments();
      }
    },
    error: function (xhr) {
      showToast(xhr.responseJSON?.message || 'حدث خطأ', 'error');
    },
  });
}

function deleteDocument(docId, programId) {
  if (!confirm('هل أنت متأكد من حذف هذا المستند؟')) return;
  const token = localStorage.getItem('token');
  $.ajax({
    url: `/api/rehabilitation/programs/${programId}/documents/${docId}`,
    method: 'DELETE',
    headers: { Authorization: 'Bearer ' + token },
    success: function (response) {
      if (response.success) {
        showToast('تم حذف المستند', 'success');
        loadDocuments();
      }
    },
    error: function (xhr) {
      showToast(xhr.responseJSON?.message || 'حدث خطأ', 'error');
    },
  });
}

function viewDocumentDetails(id) {
  const doc = documents.find(d => d._id === id);
  if (!doc) return;
  const html = `
    <div class="document-card">
      <h6><i class="fas fa-file-alt me-2"></i>${doc.title || '--'}</h6>
      <div class="row mt-3">
        <div class="col-6"><strong>النوع:</strong> ${getDocumentTypeLabel(doc.document_type)}</div>
        <div class="col-6"><strong>المستفيد:</strong> ${doc.beneficiaryName}</div>
        <div class="col-6 mt-2"><strong>تاريخ الرفع:</strong> ${formatDate(doc.uploaded_at || doc.created_at)}</div>
        <div class="col-6 mt-2"><strong>الحجم:</strong> ${doc.file_size ? formatFileSize(doc.file_size) : '--'}</div>
        ${doc.expiry_date ? `<div class="col-6 mt-2"><strong>تاريخ الانتهاء:</strong> ${formatDate(doc.expiry_date)}</div>` : ''}
        <div class="col-6 mt-2"><strong>سري:</strong> ${doc.is_confidential ? 'نعم' : 'لا'}</div>
      </div>
      ${doc.description ? `<div class="mt-2"><strong>الوصف:</strong><br>${doc.description}</div>` : ''}
      ${doc.tags?.length ? `<div class="mt-2"><strong>الوسوم:</strong> ${doc.tags.map(t => `<span class="badge bg-light text-dark me-1">${t}</span>`).join('')}</div>` : ''}
    </div>
  `;
  $('#detailsModalLabel').text('تفاصيل المستند');
  $('#detailsModalBody').html(html);
  const modal = new bootstrap.Modal(document.getElementById('detailsModal'));
  modal.show();
}

function filterDocuments() {
  const search = $('#documentSearch').val().toLowerCase();
  const type = $('#documentTypeFilter').val();
  const filtered = documents.filter(d => {
    if (type && d.document_type !== type) return false;
    if (search && !(d.title || '').toLowerCase().includes(search) && !(d.beneficiaryName || '').toLowerCase().includes(search))
      return false;
    return true;
  });
  const tbody = $('#documentsTableBody');
  tbody.empty();
  if (filtered.length === 0) {
    tbody.append('<tr><td colspan="7" class="text-center text-muted py-4">لا توجد نتائج</td></tr>');
    return;
  }
  filtered.forEach(doc => {
    tbody.append(`
      <tr>
        <td><i class="fas fa-file-alt me-2 text-muted"></i>${doc.title || '--'}</td>
        <td>${getDocumentTypeLabel(doc.document_type)}</td>
        <td>${doc.beneficiaryName || '--'}</td>
        <td>${formatDate(doc.uploaded_at || doc.created_at)}</td>
        <td>${doc.file_size ? formatFileSize(doc.file_size) : '--'}</td>
        <td>${doc.is_confidential ? '<i class="fas fa-lock text-danger"></i>' : '<i class="fas fa-unlock text-success"></i>'}</td>
        <td>
          <button class="btn btn-sm btn-outline-primary me-1" onclick="viewDocumentDetails('${doc._id}')"><i class="fas fa-eye"></i></button>
          <button class="btn btn-sm btn-outline-danger" onclick="deleteDocument('${doc._id}', '${doc.programId}')"><i class="fas fa-trash"></i></button>
        </td>
      </tr>
    `);
  });
}

function getDocumentTypeLabel(type) {
  const labels = {
    medical_report: 'تقرير طبي',
    assessment_report: 'تقرير تقييم',
    iep_document: 'وثيقة IEP',
    therapy_note: 'ملاحظة علاجية',
    consent_form: 'نموذج موافقة',
    insurance_document: 'مستند تأمين',
    prescription: 'وصفة طبية',
    lab_result: 'نتيجة مختبر',
    imaging: 'تصوير طبي',
    referral_letter: 'خطاب إحالة',
    discharge_summary: 'ملخص خروج',
    progress_report: 'تقرير تقدم',
    legal_document: 'مستند قانوني',
    identification: 'هوية',
    other: 'أخرى',
  };
  return labels[type] || type || '--';
}

function formatFileSize(bytes) {
  if (!bytes) return '--';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// =====================================================
// Phase 3: Group Activities
// =====================================================

function loadGroupActivities() {
  const token = localStorage.getItem('token');
  if (!token) return;

  $.ajax({
    url: '/api/rehabilitation/programs',
    method: 'GET',
    headers: { Authorization: 'Bearer ' + token },
    success: function (response) {
      if (response.success) {
        groupActivities = [];
        (response.data || []).forEach(p => {
          if (p.group_activities) {
            p.group_activities.forEach(ga => {
              groupActivities.push({ ...ga, programId: p._id || p.id, beneficiaryName: p.beneficiary?.name || '--' });
            });
          }
        });
        populateGroupActivitiesGrid();
      }
    },
    error: function () {
      console.log('Error loading group activities');
    },
  });
}

function populateGroupActivitiesGrid() {
  const grid = $('#groupActivitiesGrid');
  grid.empty();

  if (groupActivities.length === 0) {
    grid.append(
      '<div class="col-12 text-center text-muted py-4"><i class="fas fa-users fa-2x mb-2 d-block"></i>لا توجد أنشطة جماعية</div>',
    );
    return;
  }

  groupActivities.forEach(ga => {
    grid.append(`
      <div class="col-md-6 col-lg-4 mb-3">
        <div class="group-activity-card">
          <div class="d-flex justify-content-between align-items-start mb-2">
            <h6 class="mb-0"><i class="fas fa-users me-2 text-success"></i>${ga.group_name || getActivityTypeLabel(ga.activity_type)}</h6>
            <span class="badge bg-success">${getActivityTypeLabel(ga.activity_type)}</span>
          </div>
          <p class="text-muted small mb-1"><strong>التاريخ:</strong> ${formatDate(ga.date)}</p>
          <p class="text-muted small mb-1"><strong>المشرف:</strong> ${ga.facilitator || '--'}</p>
          <p class="text-muted small mb-1"><strong>المدة:</strong> ${ga.duration_minutes || 60} دقيقة</p>
          ${ga.social_interaction_rating ? `<p class="text-muted small mb-0"><strong>تقييم التفاعل:</strong> ${ga.social_interaction_rating}/10</p>` : ''}
        </div>
      </div>
    `);
  });
}

function openGroupActivityModal() {
  $('#groupActivityForm')[0].reset();
  $('#activityId').val('');
  populateBeneficiarySelect('#activityBeneficiary', true);
  $('#activityDate').val(new Date().toISOString().substring(0, 10));
  const modal = new bootstrap.Modal(document.getElementById('groupActivityModal'));
  modal.show();
}

function saveGroupActivity() {
  const token = localStorage.getItem('token');
  if (!token) return;

  // For group activities, use first program or a specific one
  const programId = programs.length > 0 ? programs[0]._id || programs[0].id : null;
  if (!programId) {
    showToast('لا توجد برامج متاحة', 'warning');
    return;
  }

  const data = {
    activity_type: $('#activityType').val(),
    group_name: $('#activityGroupName').val(),
    date: $('#activityDate').val(),
    duration_minutes: parseInt($('#activityDuration').val()) || 60,
    facilitator: $('#activityFacilitator').val(),
    objectives: $('#activityObjectives').val() ? [$('#activityObjectives').val()] : [],
    beneficiary_participation: $('#activityParticipation').val(),
    social_interaction_rating: parseInt($('#activitySocialRating').val()) || 5,
    notes: $('#activityNotes').val(),
  };

  $.ajax({
    url: `/api/rehabilitation/programs/${programId}/group-activities`,
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token },
    contentType: 'application/json',
    data: JSON.stringify(data),
    success: function (response) {
      if (response.success) {
        showToast('تم إضافة النشاط بنجاح', 'success');
        bootstrap.Modal.getInstance(document.getElementById('groupActivityModal')).hide();
        loadGroupActivities();
      }
    },
    error: function (xhr) {
      showToast(xhr.responseJSON?.message || 'حدث خطأ', 'error');
    },
  });
}

function filterGroupActivities() {
  const type = $('#activityTypeFilter').val();
  const filtered = type ? groupActivities.filter(ga => ga.activity_type === type) : groupActivities;
  const grid = $('#groupActivitiesGrid');
  grid.empty();
  if (filtered.length === 0) {
    grid.append('<div class="col-12 text-center text-muted py-4">لا توجد نتائج</div>');
    return;
  }
  filtered.forEach(ga => {
    grid.append(`
      <div class="col-md-6 col-lg-4 mb-3">
        <div class="group-activity-card">
          <h6><i class="fas fa-users me-2 text-success"></i>${ga.group_name || getActivityTypeLabel(ga.activity_type)}</h6>
          <p class="text-muted small mb-1"><strong>التاريخ:</strong> ${formatDate(ga.date)}</p>
          <p class="text-muted small mb-1"><strong>المشرف:</strong> ${ga.facilitator || '--'}</p>
          <p class="text-muted small mb-0"><strong>المدة:</strong> ${ga.duration_minutes || 60} دقيقة</p>
        </div>
      </div>
    `);
  });
}

function getActivityTypeLabel(type) {
  const labels = {
    social_skills: 'مهارات اجتماعية',
    art_therapy: 'علاج بالفن',
    music_therapy: 'علاج بالموسيقى',
    physical_exercise: 'تمارين بدنية',
    cognitive_training: 'تدريب ذهني',
    life_skills: 'مهارات حياتية',
    recreational: 'ترفيهي',
    educational: 'تعليمي',
    vocational: 'مهني',
    support_group: 'مجموعة دعم',
  };
  return labels[type] || type || '--';
}

// =====================================================
// Phase 3: Alerts Management
// =====================================================

function loadAlerts() {
  const token = localStorage.getItem('token');
  if (!token) return;

  $.ajax({
    url: '/api/rehabilitation/active-alerts',
    method: 'GET',
    headers: { Authorization: 'Bearer ' + token },
    success: function (response) {
      if (response.success) {
        alerts = response.data || [];
        updateAlertsCount();
      }
    },
    error: function () {
      console.log('Error loading alerts');
    },
  });
}

function updateAlertsCount() {
  $('#activeAlertsCount').text(alerts.length);
}

function saveAlert() {
  const token = localStorage.getItem('token');
  if (!token) return;

  const beneficiaryId = $('#alertBeneficiary').val();
  if (!beneficiaryId) {
    showToast('يرجى اختيار المستفيد', 'warning');
    return;
  }

  const programId = getProgramIdForBeneficiary(beneficiaryId);
  if (!programId) {
    showToast('لم يتم العثور على برنامج للمستفيد', 'warning');
    return;
  }

  const data = {
    alert_type: $('#alertType').val(),
    priority: $('#alertPriority').val(),
    title: $('#alertTitle').val(),
    message: $('#alertMessage').val(),
    due_date: $('#alertDueDate').val() || undefined,
  };

  $.ajax({
    url: `/api/rehabilitation/programs/${programId}/alerts`,
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token },
    contentType: 'application/json',
    data: JSON.stringify(data),
    success: function (response) {
      if (response.success) {
        showToast('تم إنشاء التنبيه بنجاح', 'success');
        bootstrap.Modal.getInstance(document.getElementById('alertModal')).hide();
        loadAlerts();
      }
    },
    error: function (xhr) {
      showToast(xhr.responseJSON?.message || 'حدث خطأ', 'error');
    },
  });
}

// =====================================================
// Phase 3: Analytics & Charts
// =====================================================

function loadAnalytics() {
  const token = localStorage.getItem('token');
  if (!token) return;

  $.ajax({
    url: '/api/rehabilitation/analytics',
    method: 'GET',
    headers: { Authorization: 'Bearer ' + token },
    success: function (response) {
      if (response.success) {
        analyticsData = response.data;
        renderAnalytics();
      }
    },
    error: function () {
      console.log('Error loading analytics');
      renderMockAnalytics();
    },
  });
}

function renderAnalytics() {
  if (!analyticsData) {
    renderMockAnalytics();
    return;
  }

  // Update summary cards
  if (analyticsData.goals_by_status) {
    const total = Object.values(analyticsData.goals_by_status).reduce((a, b) => a + b, 0);
    const achieved = analyticsData.goals_by_status.achieved || 0;
    $('#goalAchievementRate').text(total > 0 ? Math.round((achieved / total) * 100) + '%' : '0%');
  }

  if (analyticsData.attendance_trends) {
    const rates = analyticsData.attendance_trends.map(t => t.rate || 0);
    const avg = rates.length > 0 ? Math.round(rates.reduce((a, b) => a + b, 0) / rates.length) : 0;
    $('#overallAttendanceRate').text(avg + '%');
  }

  if (analyticsData.satisfaction_trend) {
    const scores = analyticsData.satisfaction_trend.map(s => s.score || 0);
    const avg = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : '0';
    $('#avgSatisfaction').text(avg);
  }

  if (analyticsData.incident_stats) {
    $('#totalIncidents').text(analyticsData.incident_stats.total || 0);
  }

  renderCharts();
}

function renderMockAnalytics() {
  // Render with mock data for demo
  $('#goalAchievementRate').text('72%');
  $('#overallAttendanceRate').text('85%');
  $('#avgSatisfaction').text('4.2');
  $('#totalIncidents').text('3');
  renderMockCharts();
}

function renderCharts() {
  // Disability Distribution Chart
  if (analyticsData?.disability_distribution) {
    const ctx = document.getElementById('disabilityDistributionChart');
    if (ctx) {
      new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: Object.keys(analyticsData.disability_distribution),
          datasets: [
            {
              data: Object.values(analyticsData.disability_distribution),
              backgroundColor: ['#28a745', '#007bff', '#ffc107', '#dc3545', '#17a2b8', '#6610f2', '#fd7e14', '#e83e8c'],
            },
          ],
        },
        options: { responsive: true, plugins: { legend: { position: 'bottom' } } },
      });
    }
  }

  // Goals Status Chart
  if (analyticsData?.goals_by_status) {
    const ctx = document.getElementById('goalsStatusChart');
    if (ctx) {
      new Chart(ctx, {
        type: 'bar',
        data: {
          labels: Object.keys(analyticsData.goals_by_status).map(k => getGoalStatusLabel(k)),
          datasets: [
            {
              label: 'عدد الأهداف',
              data: Object.values(analyticsData.goals_by_status),
              backgroundColor: ['#ffc107', '#007bff', '#28a745', '#dc3545', '#6c757d'],
            },
          ],
        },
        options: { responsive: true, scales: { y: { beginAtZero: true } } },
      });
    }
  }

  // Service Distribution Chart
  if (analyticsData?.service_distribution) {
    const ctx = document.getElementById('serviceDistributionChart');
    if (ctx) {
      new Chart(ctx, {
        type: 'pie',
        data: {
          labels: Object.keys(analyticsData.service_distribution),
          datasets: [
            {
              data: Object.values(analyticsData.service_distribution),
              backgroundColor: ['#28a745', '#007bff', '#ffc107', '#dc3545', '#17a2b8', '#6610f2', '#fd7e14'],
            },
          ],
        },
        options: { responsive: true, plugins: { legend: { position: 'bottom' } } },
      });
    }
  }

  // Attendance Trend Chart
  if (analyticsData?.attendance_trends) {
    const ctx = document.getElementById('attendanceTrendChart');
    if (ctx) {
      new Chart(ctx, {
        type: 'line',
        data: {
          labels: analyticsData.attendance_trends.map(t => t.month || t.label),
          datasets: [
            {
              label: 'معدل الحضور %',
              data: analyticsData.attendance_trends.map(t => t.rate),
              borderColor: '#007bff',
              backgroundColor: 'rgba(0,123,255,0.1)',
              fill: true,
              tension: 0.3,
            },
          ],
        },
        options: { responsive: true, scales: { y: { beginAtZero: true, max: 100 } } },
      });
    }
  }

  // Satisfaction Trend Chart
  if (analyticsData?.satisfaction_trend) {
    const ctx = document.getElementById('satisfactionTrendChart');
    if (ctx) {
      new Chart(ctx, {
        type: 'line',
        data: {
          labels: analyticsData.satisfaction_trend.map(s => s.month || s.label),
          datasets: [
            {
              label: 'متوسط الرضا',
              data: analyticsData.satisfaction_trend.map(s => s.score),
              borderColor: '#fd7e14',
              backgroundColor: 'rgba(253,126,20,0.1)',
              fill: true,
              tension: 0.3,
            },
          ],
        },
        options: { responsive: true, scales: { y: { beginAtZero: true, max: 5 } } },
      });
    }
  }

  // Incidents Trend Chart
  if (analyticsData?.incident_stats?.monthly) {
    const ctx = document.getElementById('incidentsTrendChart');
    if (ctx) {
      new Chart(ctx, {
        type: 'bar',
        data: {
          labels: analyticsData.incident_stats.monthly.map(m => m.month || m.label),
          datasets: [
            {
              label: 'عدد الحوادث',
              data: analyticsData.incident_stats.monthly.map(m => m.count),
              backgroundColor: '#dc3545',
            },
          ],
        },
        options: { responsive: true, scales: { y: { beginAtZero: true } } },
      });
    }
  }
}

function renderMockCharts() {
  const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو'];

  // Disability Distribution
  const ctx1 = document.getElementById('disabilityDistributionChart');
  if (ctx1) {
    new Chart(ctx1, {
      type: 'doughnut',
      data: {
        labels: ['حركية', 'ذهنية', 'بصرية', 'سمعية', 'توحد', 'أخرى'],
        datasets: [
          {
            data: [30, 25, 15, 10, 12, 8],
            backgroundColor: ['#28a745', '#007bff', '#ffc107', '#dc3545', '#17a2b8', '#6610f2'],
          },
        ],
      },
      options: { responsive: true, plugins: { legend: { position: 'bottom' } } },
    });
  }

  // Goals Status
  const ctx2 = document.getElementById('goalsStatusChart');
  if (ctx2) {
    new Chart(ctx2, {
      type: 'bar',
      data: {
        labels: ['قيد التنفيذ', 'محقق', 'متأخر', 'ملغي'],
        datasets: [{ label: 'عدد الأهداف', data: [45, 32, 8, 3], backgroundColor: ['#007bff', '#28a745', '#ffc107', '#dc3545'] }],
      },
      options: { responsive: true, scales: { y: { beginAtZero: true } } },
    });
  }

  // Service Distribution
  const ctx3 = document.getElementById('serviceDistributionChart');
  if (ctx3) {
    new Chart(ctx3, {
      type: 'pie',
      data: {
        labels: ['علاج طبيعي', 'علاج وظيفي', 'علاج نطق', 'دعم نفسي', 'تعليم خاص'],
        datasets: [{ data: [35, 25, 20, 12, 8], backgroundColor: ['#28a745', '#007bff', '#ffc107', '#dc3545', '#17a2b8'] }],
      },
      options: { responsive: true, plugins: { legend: { position: 'bottom' } } },
    });
  }

  // Attendance Trend
  const ctx4 = document.getElementById('attendanceTrendChart');
  if (ctx4) {
    new Chart(ctx4, {
      type: 'line',
      data: {
        labels: months,
        datasets: [
          {
            label: 'معدل الحضور %',
            data: [78, 82, 85, 80, 88, 91],
            borderColor: '#007bff',
            backgroundColor: 'rgba(0,123,255,0.1)',
            fill: true,
            tension: 0.3,
          },
        ],
      },
      options: { responsive: true, scales: { y: { beginAtZero: true, max: 100 } } },
    });
  }

  // Satisfaction Trend
  const ctx5 = document.getElementById('satisfactionTrendChart');
  if (ctx5) {
    new Chart(ctx5, {
      type: 'line',
      data: {
        labels: months,
        datasets: [
          {
            label: 'متوسط الرضا',
            data: [3.8, 4.0, 4.1, 4.3, 4.2, 4.5],
            borderColor: '#fd7e14',
            backgroundColor: 'rgba(253,126,20,0.1)',
            fill: true,
            tension: 0.3,
          },
        ],
      },
      options: { responsive: true, scales: { y: { beginAtZero: true, max: 5 } } },
    });
  }

  // Incidents Trend
  const ctx6 = document.getElementById('incidentsTrendChart');
  if (ctx6) {
    new Chart(ctx6, {
      type: 'bar',
      data: {
        labels: months,
        datasets: [{ label: 'عدد الحوادث', data: [2, 1, 3, 1, 0, 2], backgroundColor: '#dc3545' }],
      },
      options: { responsive: true, scales: { y: { beginAtZero: true } } },
    });
  }
}

function getGoalStatusLabel(status) {
  const labels = {
    not_started: 'لم يبدأ',
    in_progress: 'قيد التنفيذ',
    achieved: 'محقق',
    partially_achieved: 'محقق جزئياً',
    on_hold: 'معلق',
    discontinued: 'متوقف',
  };
  return labels[status] || status || '--';
}

function exportAnalyticsReport() {
  showToast('جاري تصدير التقرير...', 'info');
  // Build a printable report
  const content = document.getElementById('analytics');
  if (content) {
    const printWindow = window.open('', '_blank');
    printWindow.document.write('<html dir="rtl"><head><title>تقرير التحليلات</title>');
    printWindow.document.write(
      '<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.rtl.min.css">',
    );
    printWindow.document.write('</head><body class="p-4">');
    printWindow.document.write('<h2 class="text-center mb-4">تقرير التحليلات والإحصائيات</h2>');
    printWindow.document.write('<p class="text-center text-muted mb-4">تاريخ التصدير: ' + new Date().toLocaleDateString('ar-SA') + '</p>');
    printWindow.document.write(content.innerHTML);
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.print();
  }
}

// =====================================================
// Helper Functions
// =====================================================

// ═══════════════════════════════════════════════════════════════
// ═══════            Phase 4: Telehealth                 ═══════
// ═══════════════════════════════════════════════════════════════

function openTelehealthModal(programId) {
  currentProgramForPhase4 = programId || getFirstProgramId();
  if (!currentProgramForPhase4) {
    showToast('يرجى إنشاء برنامج أولاً', 'warning');
    return;
  }
  $('#telehealthProgramId').val(currentProgramForPhase4);
  $('#telehealthForm')[0].reset();
  // Load existing data
  const program = programs.find(p => (p._id || p.id) === currentProgramForPhase4);
  if (program && program.telehealth_info) {
    const t = program.telehealth_info;
    $('#telehealthPlatformSelect').val(t.preferred_platform || '');
    $('#telehealthConnectionQuality').val(t.connection_quality || '');
    $('#telehealthEffectivenessRating').val(t.effectiveness_rating || '');
    $('#telehealthHasCamera').prop('checked', t.equipment?.has_camera !== false);
    $('#telehealthHasMic').prop('checked', t.equipment?.has_microphone !== false);
    $('#telehealthHasInternet').prop('checked', t.equipment?.has_stable_internet || false);
    $('#telehealthNotes').val(t.notes || '');
  }
  new bootstrap.Modal(document.getElementById('telehealthModal')).show();
}

function saveTelehealth() {
  const token = localStorage.getItem('token');
  const programId = $('#telehealthProgramId').val();
  if (!programId || !token) return;

  const data = {
    preferred_platform: $('#telehealthPlatformSelect').val(),
    connection_quality: $('#telehealthConnectionQuality').val(),
    effectiveness_rating: $('#telehealthEffectivenessRating').val(),
    equipment: {
      has_camera: $('#telehealthHasCamera').is(':checked'),
      has_microphone: $('#telehealthHasMic').is(':checked'),
      has_stable_internet: $('#telehealthHasInternet').is(':checked'),
    },
    notes: $('#telehealthNotes').val(),
  };

  $.ajax({
    url: `/api/rehabilitation/${programId}/telehealth`,
    method: 'PUT',
    headers: { Authorization: 'Bearer ' + token },
    contentType: 'application/json',
    data: JSON.stringify(data),
    success: function (response) {
      if (response.success) {
        showToast('تم حفظ إعدادات الرعاية عن بعد', 'success');
        bootstrap.Modal.getInstance(document.getElementById('telehealthModal')).hide();
        loadPrograms();
        updateTelehealthDisplay(data);
      }
    },
    error: function (xhr) {
      showToast(xhr.responseJSON?.message || 'حدث خطأ', 'error');
    },
  });
}

function updateTelehealthDisplay(data) {
  const platformLabels = { zoom: 'Zoom', teams: 'Microsoft Teams', google_meet: 'Google Meet', skype: 'Skype', custom: 'مخصص' };
  const qualityLabels = { excellent: 'ممتازة', good: 'جيدة', fair: 'مقبولة', poor: 'ضعيفة' };
  const effectivenessLabels = {
    highly_effective: 'فعال للغاية',
    effective: 'فعال',
    moderately_effective: 'معتدل',
    slightly_effective: 'طفيف',
    not_effective: 'غير فعال',
  };

  $('#telehealthPlatform').text(platformLabels[data.preferred_platform] || '-');
  $('#telehealthConnection').text(qualityLabels[data.connection_quality] || '-');
  $('#telehealthEffectiveness').text(effectivenessLabels[data.effectiveness_rating] || '-');
}

function loadTelehealthData(programId) {
  const program = programs.find(p => (p._id || p.id) === programId);
  if (program && program.telehealth_info) {
    updateTelehealthDisplay(program.telehealth_info);
    const issues = program.telehealth_info.connectivity_issues || [];
    $('#telehealthIssuesCount').text(issues.length);
    populateConnectivityIssuesTable(issues);
  }
}

function populateConnectivityIssuesTable(issues) {
  const tbody = $('#connectivityIssuesTableBody');
  tbody.empty();
  if (!issues || issues.length === 0) {
    tbody.html('<tr><td colspan="4" class="text-center text-muted">لا توجد مشاكل مسجلة</td></tr>');
    return;
  }
  issues.forEach(issue => {
    tbody.append(`
      <tr>
        <td>${formatDate(issue.date)}</td>
        <td>${issue.issue_type || '-'}</td>
        <td>${issue.description || '-'}</td>
        <td>${issue.resolution || '-'}</td>
      </tr>
    `);
  });
}

// ═══════════════════════════════════════════════════════════════
// ═══════         Phase 4: Financial & Insurance         ═══════
// ═══════════════════════════════════════════════════════════════

function openFinancialModal(programId) {
  currentProgramForPhase4 = programId || getFirstProgramId();
  if (!currentProgramForPhase4) {
    showToast('يرجى إنشاء برنامج أولاً', 'warning');
    return;
  }
  $('#financialProgramId').val(currentProgramForPhase4);
  $('#financialForm')[0].reset();
  const program = programs.find(p => (p._id || p.id) === currentProgramForPhase4);
  if (program && program.financial_info) {
    const f = program.financial_info;
    $('#financialFundingSource').val(f.funding_source || '');
    $('#financialPaymentStatus').val(f.payment_status || '');
    $('#financialTotalCostInput').val(f.total_cost || 0);
    $('#financialAmountPaidInput').val(f.amount_paid || 0);
    $('#financialAmountCovered').val(f.amount_covered || 0);
    $('#financialApprovalNumber').val(f.approval_number || '');
  }
  new bootstrap.Modal(document.getElementById('financialModal')).show();
}

function saveFinancialInfo() {
  const token = localStorage.getItem('token');
  const programId = $('#financialProgramId').val();
  if (!programId || !token) return;

  const data = {
    funding_source: $('#financialFundingSource').val(),
    payment_status: $('#financialPaymentStatus').val(),
    total_cost: parseFloat($('#financialTotalCostInput').val()) || 0,
    amount_paid: parseFloat($('#financialAmountPaidInput').val()) || 0,
    amount_covered: parseFloat($('#financialAmountCovered').val()) || 0,
    approval_number: $('#financialApprovalNumber').val(),
  };

  $.ajax({
    url: `/api/rehabilitation/${programId}/financial`,
    method: 'PUT',
    headers: { Authorization: 'Bearer ' + token },
    contentType: 'application/json',
    data: JSON.stringify(data),
    success: function (response) {
      if (response.success) {
        showToast('تم حفظ المعلومات المالية', 'success');
        bootstrap.Modal.getInstance(document.getElementById('financialModal')).hide();
        loadPrograms();
        updateFinancialDisplay(response.data?.financial_info || data);
      }
    },
    error: function (xhr) {
      showToast(xhr.responseJSON?.message || 'حدث خطأ', 'error');
    },
  });
}

function updateFinancialDisplay(fin) {
  $('#financialTotalCost').text((fin.total_cost || 0).toLocaleString('ar-SA') + ' ر.س');
  $('#financialAmountPaid').text((fin.amount_paid || 0).toLocaleString('ar-SA') + ' ر.س');
  const outstanding = fin.outstanding_balance || (fin.total_cost || 0) - (fin.amount_paid || 0) - (fin.amount_covered || 0);
  $('#financialOutstanding').text(outstanding.toLocaleString('ar-SA') + ' ر.س');
  $('#totalFinancialBalance').text(outstanding.toLocaleString('ar-SA'));
}

function openInvoiceModal(programId) {
  currentProgramForPhase4 = programId || getFirstProgramId();
  if (!currentProgramForPhase4) {
    showToast('يرجى إنشاء برنامج أولاً', 'warning');
    return;
  }
  $('#invoiceProgramId').val(currentProgramForPhase4);
  $('#invoiceForm')[0].reset();
  new bootstrap.Modal(document.getElementById('invoiceModal')).show();
}

function saveInvoice() {
  const token = localStorage.getItem('token');
  const programId = $('#invoiceProgramId').val();
  if (!programId || !token) return;

  const data = {
    amount: parseFloat($('#invoiceAmount').val()) || 0,
    description: $('#invoiceDescription').val(),
    due_date: $('#invoiceDueDate').val() || undefined,
    status: $('#invoiceStatus').val(),
  };

  $.ajax({
    url: `/api/rehabilitation/${programId}/invoices`,
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token },
    contentType: 'application/json',
    data: JSON.stringify(data),
    success: function (response) {
      if (response.success) {
        showToast('تم إنشاء الفاتورة بنجاح', 'success');
        bootstrap.Modal.getInstance(document.getElementById('invoiceModal')).hide();
        loadPrograms();
        loadFinancialData(programId);
      }
    },
    error: function (xhr) {
      showToast(xhr.responseJSON?.message || 'حدث خطأ', 'error');
    },
  });
}

function loadFinancialData(programId) {
  const program = programs.find(p => (p._id || p.id) === programId);
  if (!program) return;

  if (program.financial_info) {
    updateFinancialDisplay(program.financial_info);
    const invoices = program.financial_info.invoices || [];
    $('#financialInvoicesCount').text(invoices.length);
    populateInvoicesTable(invoices);
  }

  if (program.insurance_info) {
    updateInsuranceDisplay(program.insurance_info);
  }
}

function populateInvoicesTable(invoices) {
  const tbody = $('#invoicesTableBody');
  tbody.empty();
  if (!invoices || invoices.length === 0) {
    tbody.html('<tr><td colspan="6" class="text-center text-muted">لا توجد فواتير</td></tr>');
    return;
  }
  const statusLabels = { draft: 'مسودة', sent: 'مرسلة', paid: 'مدفوعة', overdue: 'متأخرة', cancelled: 'ملغاة' };
  const fundingLabels = getFundingSourceLabels();
  invoices.forEach(inv => {
    const statusClass = inv.status === 'paid' ? 'success' : inv.status === 'overdue' ? 'danger' : 'secondary';
    tbody.append(`
      <tr>
        <td>${inv.invoice_number || '-'}</td>
        <td>${(inv.amount || 0).toLocaleString('ar-SA')} ر.س</td>
        <td>${fundingLabels[inv.funding_source] || inv.funding_source || '-'}</td>
        <td><span class="badge bg-${statusClass}">${statusLabels[inv.status] || inv.status || '-'}</span></td>
        <td>${formatDate(inv.due_date)}</td>
        <td>
          <button class="btn btn-sm btn-outline-info" onclick="viewInvoiceDetails('${inv._id || inv.invoice_number}')">
            <i class="fas fa-eye"></i>
          </button>
        </td>
      </tr>
    `);
  });
}

function getFundingSourceLabels() {
  return {
    government: 'حكومي',
    insurance: 'تأمين',
    self_pay: 'دفع ذاتي',
    charity: 'خيري',
    scholarship: 'منحة',
    ngo: 'منظمة غير ربحية',
    employer: 'جهة العمل',
    mixed: 'مختلط',
    other: 'أخرى',
  };
}

function viewInvoiceDetails(invoiceId) {
  showToast('تفاصيل الفاتورة: ' + invoiceId, 'info');
}

// Insurance
function openInsuranceModal(programId) {
  currentProgramForPhase4 = programId || getFirstProgramId();
  if (!currentProgramForPhase4) {
    showToast('يرجى إنشاء برنامج أولاً', 'warning');
    return;
  }
  $('#insuranceProgramIdInput').val(currentProgramForPhase4);
  $('#insuranceForm')[0].reset();
  const program = programs.find(p => (p._id || p.id) === currentProgramForPhase4);
  if (program && program.insurance_info) {
    const ins = program.insurance_info;
    $('#insuranceProviderInput').val(ins.provider || '');
    $('#insurancePolicyNumberInput').val(ins.policy_number || '');
    $('#insuranceCoverageTypeInput').val(ins.coverage_type || '');
    $('#insuranceGroupNumber').val(ins.group_number || '');
    $('#insuranceAnnualLimit').val(ins.annual_limit || '');
    $('#insuranceAmountUsed').val(ins.amount_used || 0);
    $('#insuranceExpiryDate').val(ins.expiry_date ? ins.expiry_date.substring(0, 10) : '');
    // Set covered services checkboxes
    (ins.covered_services || []).forEach(svc => {
      $(`.insurance-service[value="${svc}"]`).prop('checked', true);
    });
  }
  new bootstrap.Modal(document.getElementById('insuranceModal')).show();
}

function saveInsuranceInfo() {
  const token = localStorage.getItem('token');
  const programId = $('#insuranceProgramIdInput').val();
  if (!programId || !token) return;

  const coveredServices = [];
  $('.insurance-service:checked').each(function () {
    coveredServices.push($(this).val());
  });

  const data = {
    provider: $('#insuranceProviderInput').val(),
    policy_number: $('#insurancePolicyNumberInput').val(),
    coverage_type: $('#insuranceCoverageTypeInput').val(),
    group_number: $('#insuranceGroupNumber').val(),
    annual_limit: parseFloat($('#insuranceAnnualLimit').val()) || 0,
    amount_used: parseFloat($('#insuranceAmountUsed').val()) || 0,
    expiry_date: $('#insuranceExpiryDate').val() || undefined,
    covered_services: coveredServices,
  };

  $.ajax({
    url: `/api/rehabilitation/${programId}/insurance`,
    method: 'PUT',
    headers: { Authorization: 'Bearer ' + token },
    contentType: 'application/json',
    data: JSON.stringify(data),
    success: function (response) {
      if (response.success) {
        showToast('تم حفظ معلومات التأمين', 'success');
        bootstrap.Modal.getInstance(document.getElementById('insuranceModal')).hide();
        loadPrograms();
        updateInsuranceDisplay(response.data?.insurance_info || data);
      }
    },
    error: function (xhr) {
      showToast(xhr.responseJSON?.message || 'حدث خطأ', 'error');
    },
  });
}

function updateInsuranceDisplay(ins) {
  const coverageLabels = { full: 'كاملة', partial: 'جزئية', therapy_only: 'علاجية فقط', none: 'بدون' };
  $('#insuranceProvider').text(ins.provider || '-');
  $('#insurancePolicyNumber').text(ins.policy_number || '-');
  $('#insuranceCoverageType').text(coverageLabels[ins.coverage_type] || '-');
  const remaining = ins.remaining_balance || (ins.annual_limit || 0) - (ins.amount_used || 0);
  $('#insuranceRemaining').text(remaining.toLocaleString('ar-SA') + ' ر.س');
}

// ═══════════════════════════════════════════════════════════════
// ═══════            Phase 4: Notes CRUD                 ═══════
// ═══════════════════════════════════════════════════════════════

function openNoteModal(programId, noteId) {
  currentProgramForPhase4 = programId || getFirstProgramId();
  if (!currentProgramForPhase4) {
    showToast('يرجى إنشاء برنامج أولاً', 'warning');
    return;
  }
  $('#noteProgramId').val(currentProgramForPhase4);
  $('#noteId').val(noteId || '');
  $('#noteForm')[0].reset();
  $('#noteFollowUpDateGroup').hide();

  if (noteId) {
    // Editing existing note
    $('#noteModalLabel').text('تعديل الملاحظة');
    const program = programs.find(p => (p._id || p.id) === currentProgramForPhase4);
    const note = program?.notes?.find(n => (n._id || n.id) === noteId);
    if (note) {
      $('#noteType').val(note.note_type || '');
      $('#notePriority').val(note.priority || 'medium');
      $('#noteTitle').val(note.title || '');
      $('#noteContent').val(note.content || '');
      $('#noteIsConfidential').prop('checked', note.is_confidential || false);
      $('#noteFollowUpRequired').prop('checked', note.follow_up?.required || false);
      if (note.follow_up?.required) {
        $('#noteFollowUpDateGroup').show();
        $('#noteFollowUpDate').val(note.follow_up?.date ? note.follow_up.date.substring(0, 10) : '');
      }
    }
  } else {
    $('#noteModalLabel').text('إضافة ملاحظة');
  }

  // Toggle follow-up date visibility
  $('#noteFollowUpRequired')
    .off('change')
    .on('change', function () {
      $('#noteFollowUpDateGroup').toggle($(this).is(':checked'));
    });

  new bootstrap.Modal(document.getElementById('noteModal')).show();
}

function saveNote() {
  const token = localStorage.getItem('token');
  const programId = $('#noteProgramId').val();
  const noteId = $('#noteId').val();
  if (!programId || !token) return;

  const data = {
    note_type: $('#noteType').val(),
    priority: $('#notePriority').val(),
    title: $('#noteTitle').val(),
    content: $('#noteContent').val(),
    is_confidential: $('#noteIsConfidential').is(':checked'),
    follow_up: {
      required: $('#noteFollowUpRequired').is(':checked'),
      date: $('#noteFollowUpDate').val() || undefined,
    },
  };

  const isEdit = !!noteId;

  $.ajax({
    url: isEdit ? `/api/rehabilitation/${programId}/notes/${noteId}` : `/api/rehabilitation/${programId}/notes`,
    method: isEdit ? 'PUT' : 'POST',
    headers: { Authorization: 'Bearer ' + token },
    contentType: 'application/json',
    data: JSON.stringify(data),
    success: function (response) {
      if (response.success) {
        showToast(isEdit ? 'تم تحديث الملاحظة' : 'تم إضافة الملاحظة', 'success');
        bootstrap.Modal.getInstance(document.getElementById('noteModal')).hide();
        loadPrograms();
        setTimeout(() => loadNotesData(programId), 500);
      }
    },
    error: function (xhr) {
      showToast(xhr.responseJSON?.message || 'حدث خطأ', 'error');
    },
  });
}

function deleteNote(programId, noteId) {
  if (!confirm('هل أنت متأكد من حذف هذه الملاحظة؟')) return;
  const token = localStorage.getItem('token');
  if (!token) return;

  $.ajax({
    url: `/api/rehabilitation/${programId}/notes/${noteId}`,
    method: 'DELETE',
    headers: { Authorization: 'Bearer ' + token },
    success: function (response) {
      if (response.success) {
        showToast('تم حذف الملاحظة', 'success');
        loadPrograms();
        setTimeout(() => loadNotesData(programId), 500);
      }
    },
    error: function (xhr) {
      showToast(xhr.responseJSON?.message || 'حدث خطأ', 'error');
    },
  });
}

function loadNotesData(programId) {
  const pid = programId || getFirstProgramId();
  const program = programs.find(p => (p._id || p.id) === pid);
  notesData = program?.notes || [];
  $('#notesCount').text(notesData.length);
  populateNotesTable(notesData);
}

function populateNotesTable(notes) {
  const tbody = $('#notesTableBody');
  tbody.empty();
  if (!notes || notes.length === 0) {
    tbody.html('<tr><td colspan="6" class="text-center text-muted">لا توجد ملاحظات</td></tr>');
    return;
  }
  const typeLabels = getNoteTypeLabels();
  const priorityLabels = { high: 'عالية', medium: 'متوسطة', low: 'منخفضة' };
  const priorityColors = { high: 'danger', medium: 'warning', low: 'info' };

  notes.forEach(note => {
    const pid = currentProgramForPhase4 || getFirstProgramId();
    const nid = note._id || note.id;
    tbody.append(`
      <tr>
        <td>${formatDate(note.created_at || note.date)}</td>
        <td>${typeLabels[note.note_type] || note.note_type || '-'}</td>
        <td><span class="badge bg-${priorityColors[note.priority] || 'secondary'}">${priorityLabels[note.priority] || '-'}</span></td>
        <td>${note.title || '-'}</td>
        <td>${note.author?.name || '-'}</td>
        <td>
          <button class="btn btn-sm btn-outline-primary me-1" onclick="openNoteModal('${pid}', '${nid}')"><i class="fas fa-edit"></i></button>
          <button class="btn btn-sm btn-outline-danger" onclick="deleteNote('${pid}', '${nid}')"><i class="fas fa-trash"></i></button>
        </td>
      </tr>
    `);
  });
}

function getNoteTypeLabels() {
  return {
    progress: 'تقدم',
    clinical: 'سريرية',
    behavioral: 'سلوكية',
    family: 'عائلية',
    administrative: 'إدارية',
    therapy: 'علاجية',
    medical: 'طبية',
    educational: 'تعليمية',
    social: 'اجتماعية',
    follow_up: 'متابعة',
    general: 'عامة',
  };
}

function filterNotes() {
  const typeFilter = $('#notesTypeFilter').val();
  const priorityFilter = $('#notesPriorityFilter').val();
  let filtered = notesData;
  if (typeFilter) filtered = filtered.filter(n => n.note_type === typeFilter);
  if (priorityFilter) filtered = filtered.filter(n => n.priority === priorityFilter);
  populateNotesTable(filtered);
}

// ═══════════════════════════════════════════════════════════════
// ═══════           Phase 4: Referrals CRUD              ═══════
// ═══════════════════════════════════════════════════════════════

function openReferralModal(programId, referralId) {
  currentProgramForPhase4 = programId || getFirstProgramId();
  if (!currentProgramForPhase4) {
    showToast('يرجى إنشاء برنامج أولاً', 'warning');
    return;
  }
  $('#referralProgramId').val(currentProgramForPhase4);
  $('#referralId').val(referralId || '');
  $('#referralForm')[0].reset();

  if (referralId) {
    $('#referralModalLabel').text('تعديل الإحالة');
    const program = programs.find(p => (p._id || p.id) === currentProgramForPhase4);
    const ref = program?.referrals?.find(r => (r._id || r.id) === referralId);
    if (ref) {
      $('#referralTo').val(ref.referred_to || '');
      $('#referralFacility').val(ref.facility || '');
      $('#referralReason').val(ref.reason || '');
      $('#referralPriority').val(ref.priority || 'routine');
      $('#referralStatusSelect').val(ref.status || 'pending');
      $('#referralNotes').val(ref.notes || '');
    }
  } else {
    $('#referralModalLabel').text('إحالة جديدة');
  }
  new bootstrap.Modal(document.getElementById('referralModal')).show();
}

function saveReferral() {
  const token = localStorage.getItem('token');
  const programId = $('#referralProgramId').val();
  const referralId = $('#referralId').val();
  if (!programId || !token) return;

  const data = {
    referred_to: $('#referralTo').val(),
    facility: $('#referralFacility').val(),
    reason: $('#referralReason').val(),
    priority: $('#referralPriority').val(),
    status: $('#referralStatusSelect').val(),
    notes: $('#referralNotes').val(),
  };

  const isEdit = !!referralId;

  $.ajax({
    url: isEdit ? `/api/rehabilitation/${programId}/referrals/${referralId}` : `/api/rehabilitation/${programId}/referrals`,
    method: isEdit ? 'PUT' : 'POST',
    headers: { Authorization: 'Bearer ' + token },
    contentType: 'application/json',
    data: JSON.stringify(data),
    success: function (response) {
      if (response.success) {
        showToast(isEdit ? 'تم تحديث الإحالة' : 'تم إنشاء الإحالة بنجاح', 'success');
        bootstrap.Modal.getInstance(document.getElementById('referralModal')).hide();
        loadPrograms();
        setTimeout(() => loadReferralsData(programId), 500);
      }
    },
    error: function (xhr) {
      showToast(xhr.responseJSON?.message || 'حدث خطأ', 'error');
    },
  });
}

function loadReferralsData(programId) {
  const pid = programId || getFirstProgramId();
  const program = programs.find(p => (p._id || p.id) === pid);
  referralsData = program?.referrals || [];
  const activeCount = referralsData.filter(r => r.status === 'pending' || r.status === 'accepted').length;
  $('#referralsCount').text(activeCount);
  populateReferralsTable(referralsData);
}

function populateReferralsTable(referrals) {
  const tbody = $('#referralsTableBody');
  tbody.empty();
  if (!referrals || referrals.length === 0) {
    tbody.html('<tr><td colspan="6" class="text-center text-muted">لا توجد إحالات</td></tr>');
    return;
  }
  const statusLabels = { pending: 'قيد الانتظار', accepted: 'مقبولة', rejected: 'مرفوضة', completed: 'مكتملة' };
  const statusColors = { pending: 'warning', accepted: 'success', rejected: 'danger', completed: 'info' };
  const priorityLabels = { routine: 'عادية', urgent: 'عاجلة', emergency: 'طارئة' };

  referrals.forEach(ref => {
    const pid = currentProgramForPhase4 || getFirstProgramId();
    const rid = ref._id || ref.id;
    tbody.append(`
      <tr>
        <td>${formatDate(ref.referral_date || ref.created_at)}</td>
        <td>${ref.referred_to || '-'}</td>
        <td>${ref.reason || '-'}</td>
        <td>${priorityLabels[ref.priority] || '-'}</td>
        <td><span class="badge bg-${statusColors[ref.status] || 'secondary'}">${statusLabels[ref.status] || ref.status || '-'}</span></td>
        <td>
          <button class="btn btn-sm btn-outline-primary me-1" onclick="openReferralModal('${pid}', '${rid}')"><i class="fas fa-edit"></i></button>
        </td>
      </tr>
    `);
  });
}

function filterReferrals() {
  const statusFilter = $('#referralsStatusFilter').val();
  let filtered = referralsData;
  if (statusFilter) filtered = filtered.filter(r => r.status === statusFilter);
  populateReferralsTable(filtered);
}

// ═══════════════════════════════════════════════════════════════
// ═══════         Phase 4: Transportation                ═══════
// ═══════════════════════════════════════════════════════════════

function openTransportationModal(programId) {
  currentProgramForPhase4 = programId || getFirstProgramId();
  if (!currentProgramForPhase4) {
    showToast('يرجى إنشاء برنامج أولاً', 'warning');
    return;
  }
  $('#transportationProgramId').val(currentProgramForPhase4);
  $('#transportationForm')[0].reset();

  const program = programs.find(p => (p._id || p.id) === currentProgramForPhase4);
  if (program && program.transportation) {
    const t = program.transportation;
    $('#transportationTypeSelect').val(t.type || '');
    $('#transportationProviderInput').val(t.provider || '');
    $('#transportationDistanceInput').val(t.distance_km || '');
    $('#transportationCostCoveredByInput').val(t.cost_covered_by || '');
    $('#transportationWheelchairAccessible').prop('checked', t.wheelchair_accessible || false);
    $('#transportationNeedsEscort').prop('checked', t.needs_escort || false);
    $('#transportationSpecialNeedsInput').val(t.special_needs || '');
    $('#transportationNotesInput').val(t.notes || '');
  }
  new bootstrap.Modal(document.getElementById('transportationModal')).show();
}

function saveTransportation() {
  const token = localStorage.getItem('token');
  const programId = $('#transportationProgramId').val();
  if (!programId || !token) return;

  const data = {
    type: $('#transportationTypeSelect').val(),
    provider: $('#transportationProviderInput').val(),
    distance_km: parseFloat($('#transportationDistanceInput').val()) || 0,
    cost_covered_by: $('#transportationCostCoveredByInput').val(),
    wheelchair_accessible: $('#transportationWheelchairAccessible').is(':checked'),
    needs_escort: $('#transportationNeedsEscort').is(':checked'),
    special_needs: $('#transportationSpecialNeedsInput').val(),
    notes: $('#transportationNotesInput').val(),
  };

  $.ajax({
    url: `/api/rehabilitation/${programId}/transportation`,
    method: 'PUT',
    headers: { Authorization: 'Bearer ' + token },
    contentType: 'application/json',
    data: JSON.stringify(data),
    success: function (response) {
      if (response.success) {
        showToast('تم حفظ بيانات النقل', 'success');
        bootstrap.Modal.getInstance(document.getElementById('transportationModal')).hide();
        loadPrograms();
        updateTransportationDisplay(data);
      }
    },
    error: function (xhr) {
      showToast(xhr.responseJSON?.message || 'حدث خطأ', 'error');
    },
  });
}

function updateTransportationDisplay(t) {
  const typeLabels = { private: 'خاص', public: 'عام', ambulance: 'إسعاف', specialized: 'متخصص', other: 'أخرى' };
  $('#transportationType').text(typeLabels[t.type] || '-');
  $('#transportationAccessibility').text(t.wheelchair_accessible ? 'مهيأ للكراسي المتحركة' : 'غير مهيأ');
  $('#transportationDistance').text(t.distance_km ? t.distance_km + ' كم' : '-');
  $('#transportationProvider').text(t.provider || '-');
  $('#transportationSpecialNeeds').text(t.special_needs || '-');
  $('#transportationCostCoveredBy').text(t.cost_covered_by || '-');
  $('#transportationNotes').text(t.notes || '-');
}

function loadTransportationData(programId) {
  const program = programs.find(p => (p._id || p.id) === programId);
  if (program && program.transportation) {
    updateTransportationDisplay(program.transportation);
  }
}

// ═══════════════════════════════════════════════════════════════
// ═══════         Phase 4: Alerts Full CRUD              ═══════
// ═══════════════════════════════════════════════════════════════

function loadAlertsFullTab() {
  populateAlertsFullTable(alerts);
}

function populateAlertsFullTable(alertsList) {
  const tbody = $('#alertsFullTableBody');
  tbody.empty();
  if (!alertsList || alertsList.length === 0) {
    tbody.html('<tr><td colspan="6" class="text-center text-muted">لا توجد تنبيهات</td></tr>');
    return;
  }
  const typeLabels = { medication: 'دواء', appointment: 'موعد', assessment: 'تقييم', goal: 'هدف', risk: 'خطر', general: 'عام' };
  const priorityLabels = { critical: 'حرج', high: 'عالي', medium: 'متوسط', low: 'منخفض' };
  const priorityColors = { critical: 'danger', high: 'warning', medium: 'info', low: 'secondary' };

  alertsList.forEach(alert => {
    const statusBadge = alert.is_read ? '<span class="badge bg-secondary">مقروء</span>' : '<span class="badge bg-success">جديد</span>';
    tbody.append(`
      <tr class="${alert.is_read ? '' : 'table-warning'}">
        <td>${formatDate(alert.created_at)}</td>
        <td>${typeLabels[alert.alert_type] || alert.alert_type || '-'}</td>
        <td><span class="badge bg-${priorityColors[alert.priority] || 'secondary'}">${priorityLabels[alert.priority] || '-'}</span></td>
        <td>${alert.title || '-'}</td>
        <td>${statusBadge}</td>
        <td>
          <button class="btn btn-sm btn-outline-info me-1" onclick="viewAlertDetails('${alert._id || alert.id}')">
            <i class="fas fa-eye"></i>
          </button>
        </td>
      </tr>
    `);
  });
}

function viewAlertDetails(alertId) {
  const alert = alerts.find(a => (a._id || a.id) === alertId);
  if (alert) {
    showToast(alert.message || alert.title || 'تفاصيل التنبيه', 'info');
  }
}

function markAllAlertsRead() {
  showToast('تم تعليم جميع التنبيهات كمقروءة', 'success');
  alerts.forEach(a => (a.is_read = true));
  populateAlertsFullTable(alerts);
  updateAlertsCount();
}

function filterAlerts() {
  const typeFilter = $('#alertsTypeFilter').val();
  const priorityFilter = $('#alertsPriorityFilter').val();
  let filtered = alerts;
  if (typeFilter) filtered = filtered.filter(a => a.alert_type === typeFilter);
  if (priorityFilter) filtered = filtered.filter(a => a.priority === priorityFilter);
  populateAlertsFullTable(filtered);
}

// ═══════════════════════════════════════════════════════════════
// ═══════     Phase 4: Treatment Team                    ═══════
// ═══════════════════════════════════════════════════════════════

function openTreatmentTeamModal(programId) {
  currentProgramForPhase4 = programId || getFirstProgramId();
  if (!currentProgramForPhase4) {
    showToast('يرجى إنشاء برنامج أولاً', 'warning');
    return;
  }
  $('#treatmentTeamProgramId').val(currentProgramForPhase4);
  $('#teamMembersContainer').empty();

  const program = programs.find(p => (p._id || p.id) === currentProgramForPhase4);
  if (program && program.treatment_team && program.treatment_team.length > 0) {
    program.treatment_team.forEach(member => addTeamMemberRow(member));
  } else {
    addTeamMemberRow();
  }
  new bootstrap.Modal(document.getElementById('treatmentTeamModal')).show();
}

function addTeamMemberRow(member) {
  const idx = $('#teamMembersContainer .team-member-row').length;
  const roleOptions = getTeamRoleOptions();
  const row = `
    <div class="team-member-row border rounded p-3 mb-2">
      <div class="row">
        <div class="col-md-4 mb-2">
          <label class="form-label">الاسم *</label>
          <input type="text" class="form-control form-control-sm team-name" value="${member?.name || ''}" required>
        </div>
        <div class="col-md-4 mb-2">
          <label class="form-label">الدور *</label>
          <select class="form-select form-select-sm team-role">
            ${roleOptions}
          </select>
        </div>
        <div class="col-md-3 mb-2">
          <label class="form-label">التخصص</label>
          <input type="text" class="form-control form-control-sm team-specialty" value="${member?.specialty || ''}">
        </div>
        <div class="col-md-1 mb-2 d-flex align-items-end">
          <button type="button" class="btn btn-sm btn-outline-danger" onclick="$(this).closest('.team-member-row').remove()">
            <i class="fas fa-times"></i>
          </button>
        </div>
      </div>
      <div class="row">
        <div class="col-md-4 mb-2">
          <label class="form-label">الهاتف</label>
          <input type="text" class="form-control form-control-sm team-phone" value="${member?.phone || ''}">
        </div>
        <div class="col-md-4 mb-2">
          <label class="form-label">البريد</label>
          <input type="email" class="form-control form-control-sm team-email" value="${member?.email || ''}">
        </div>
        <div class="col-md-4 mb-2">
          <div class="form-check mt-4">
            <input class="form-check-input team-primary" type="checkbox" ${member?.is_primary ? 'checked' : ''}>
            <label class="form-check-label">مسؤول أساسي</label>
          </div>
        </div>
      </div>
    </div>
  `;
  $('#teamMembersContainer').append(row);
  // Set the role value after appending
  if (member?.role) {
    $('#teamMembersContainer .team-member-row').last().find('.team-role').val(member.role);
  }
}

function getTeamRoleOptions() {
  const roles = {
    physician: 'طبيب',
    psychiatrist: 'طبيب نفسي',
    psychologist: 'أخصائي نفسي',
    physical_therapist: 'معالج طبيعي',
    occupational_therapist: 'معالج وظيفي',
    speech_therapist: 'معالج نطق',
    social_worker: 'أخصائي اجتماعي',
    nurse: 'ممرض/ممرضة',
    nutritionist: 'أخصائي تغذية',
    counselor: 'مرشد',
    special_educator: 'معلم تربية خاصة',
    case_manager: 'مدير حالة',
    behavioral_analyst: 'محلل سلوكي',
    rehabilitation_specialist: 'أخصائي تأهيل',
    assistive_technology: 'أخصائي تقنيات مساعدة',
    family_therapist: 'معالج أسري',
    other: 'أخرى',
  };
  let html = '<option value="">اختر الدور</option>';
  Object.entries(roles).forEach(([key, label]) => {
    html += `<option value="${key}">${label}</option>`;
  });
  return html;
}

function saveTreatmentTeam() {
  const token = localStorage.getItem('token');
  const programId = $('#treatmentTeamProgramId').val();
  if (!programId || !token) return;

  const members = [];
  $('#teamMembersContainer .team-member-row').each(function () {
    const name = $(this).find('.team-name').val();
    const role = $(this).find('.team-role').val();
    if (name && role) {
      members.push({
        name: name,
        role: role,
        specialty: $(this).find('.team-specialty').val(),
        phone: $(this).find('.team-phone').val(),
        email: $(this).find('.team-email').val(),
        is_primary: $(this).find('.team-primary').is(':checked'),
      });
    }
  });

  $.ajax({
    url: `/api/rehabilitation/${programId}/treatment-team`,
    method: 'PUT',
    headers: { Authorization: 'Bearer ' + token },
    contentType: 'application/json',
    data: JSON.stringify({ members: members }),
    success: function (response) {
      if (response.success) {
        showToast('تم حفظ فريق العلاج', 'success');
        bootstrap.Modal.getInstance(document.getElementById('treatmentTeamModal')).hide();
        loadPrograms();
      }
    },
    error: function (xhr) {
      showToast(xhr.responseJSON?.message || 'حدث خطأ', 'error');
    },
  });
}

// ═══════════════════════════════════════════════════════════════
// ═══════     Phase 4: Financial Summary Dashboard       ═══════
// ═══════════════════════════════════════════════════════════════

function loadFinancialSummary() {
  const token = localStorage.getItem('token');
  if (!token) return;

  $.ajax({
    url: '/api/rehabilitation/financial-summary',
    method: 'GET',
    headers: { Authorization: 'Bearer ' + token },
    success: function (response) {
      if (response.success && response.data) {
        const summary = response.data.summary;
        if (summary) {
          $('#totalFinancialBalance').text((summary.totalOutstanding || 0).toLocaleString('ar-SA'));
        }
      }
    },
    error: function () {
      console.log('Error loading financial summary');
    },
  });
}

// ═══════════════════════════════════════════════════════════════
// ═══════     Phase 4: Tab Data Loading Helper           ═══════
// ═══════════════════════════════════════════════════════════════

function loadPhase4TabData() {
  const pid = getFirstProgramId();
  if (pid) {
    currentProgramForPhase4 = pid;
    loadTelehealthData(pid);
    loadFinancialData(pid);
    loadNotesData(pid);
    loadReferralsData(pid);
    loadTransportationData(pid);
    loadAlertsFullTab();
    loadFinancialSummary();
  }
}

function getFirstProgramId() {
  if (programs.length > 0) return programs[0]._id || programs[0].id;
  return null;
}

// ═══════════════════════════════════════════════════════════════
// ═══════     Phase 4: Utility Functions                 ═══════
// ═══════════════════════════════════════════════════════════════

function getProgramIdForBeneficiary(beneficiaryId) {
  const program = programs.find(
    p => p.beneficiary?.id === beneficiaryId || p.beneficiary?._id === beneficiaryId || p.beneficiaryId === beneficiaryId,
  );
  return program ? program._id || program.id : programs.length > 0 ? programs[0]._id || programs[0].id : null;
}

function formatDate(dateStr) {
  if (!dateStr) return '--';
  try {
    return new Date(dateStr).toLocaleDateString('ar-SA');
  } catch (e) {
    return dateStr;
  }
}

function showToast(message, type) {
  // Use existing toast or create a simple notification
  const toastHtml = `
    <div class="position-fixed bottom-0 end-0 p-3" style="z-index: 11">
      <div class="toast show align-items-center text-white bg-${type === 'success' ? 'success' : type === 'error' ? 'danger' : type === 'warning' ? 'warning' : 'info'} border-0" role="alert">
        <div class="d-flex">
          <div class="toast-body">${message}</div>
          <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
        </div>
      </div>
    </div>
  `;
  const $toast = $(toastHtml).appendTo('body');
  setTimeout(
    () =>
      $toast.fadeOut(300, function () {
        $(this).remove();
      }),
    3000,
  );
}
