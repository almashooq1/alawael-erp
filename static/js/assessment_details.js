// Assessment Details JavaScript
let currentBeneficiary = null;
let assessmentData = [];
let progressData = [];
let radarChart = null;
let progressChart = null;

// Initialize assessment details page
$(document).ready(function() {
    initializeAssessmentDetails();
});

function initializeAssessmentDetails() {
    // Get beneficiary ID from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const beneficiaryId = urlParams.get('beneficiary_id');
    
    if (beneficiaryId) {
        loadBeneficiaryData(beneficiaryId);
        loadAssessmentData(beneficiaryId);
        loadProgressData(beneficiaryId);
        loadGoalsData(beneficiaryId);
    }
    
    setupEventListeners();
}

function setupEventListeners() {
    // Tab change events
    $('#assessmentTabs button[data-bs-toggle="tab"]').on('shown.bs.tab', function (e) {
        const target = $(e.target).attr('data-bs-target');
        if (target === '#progress' && progressChart) {
            progressChart.resize();
        }
    });
}

// Load beneficiary data
function loadBeneficiaryData(beneficiaryId) {
    const token = localStorage.getItem('token');
    if (!token) return;

    $.ajax({
        url: `/api/rehabilitation/beneficiaries/${beneficiaryId}`,
        method: 'GET',
        headers: {
            'Authorization': 'Bearer ' + token
        },
        success: function(response) {
            currentBeneficiary = response.beneficiary;
            updateBeneficiaryInfo();
        },
        error: function() {
            console.log('Error loading beneficiary data');
        }
    });
}

function updateBeneficiaryInfo() {
    if (currentBeneficiary) {
        $('#beneficiaryName').text(`تقييم وتتبع التقدم - ${currentBeneficiary.name}`);
    }
}

// Load assessment data
function loadAssessmentData(beneficiaryId) {
    const token = localStorage.getItem('token');
    if (!token) return;

    $.ajax({
        url: `/api/rehabilitation/beneficiaries/${beneficiaryId}/assessments`,
        method: 'GET',
        headers: {
            'Authorization': 'Bearer ' + token
        },
        success: function(response) {
            assessmentData = response.assessments || [];
            updateOverviewTab();
            createRadarChart();
        },
        error: function() {
            console.log('Error loading assessment data');
        }
    });
}

// Load progress data
function loadProgressData(beneficiaryId) {
    const token = localStorage.getItem('token');
    if (!token) return;

    $.ajax({
        url: `/api/rehabilitation/beneficiaries/${beneficiaryId}/progress`,
        method: 'GET',
        headers: {
            'Authorization': 'Bearer ' + token
        },
        success: function(response) {
            progressData = response.progress_records || [];
            updateProgressTab();
            createProgressChart();
        },
        error: function() {
            console.log('Error loading progress data');
        }
    });
}

// Load goals data
function loadGoalsData(beneficiaryId) {
    const token = localStorage.getItem('token');
    if (!token) return;

    $.ajax({
        url: `/api/rehabilitation/beneficiaries/${beneficiaryId}/plans`,
        method: 'GET',
        headers: {
            'Authorization': 'Bearer ' + token
        },
        success: function(response) {
            const plans = response.plans || [];
            updateGoalsTab(plans);
            updateRecommendationsTab();
        },
        error: function() {
            console.log('Error loading goals data');
        }
    });
}

// Update overview tab
function updateOverviewTab() {
    if (assessmentData.length === 0) {
        $('#skillsProgress').html('<p class="text-muted text-center">لا توجد تقييمات متاحة</p>');
        return;
    }

    // Get latest assessment
    const latestAssessment = assessmentData[assessmentData.length - 1];
    const areas = latestAssessment.assessment_areas || {};

    // Update skills progress bars
    updateSkillsProgress(areas);
    
    // Update overall score
    updateOverallScore(areas);
}

function updateSkillsProgress(areas) {
    const skillsContainer = $('#skillsProgress');
    skillsContainer.empty();

    const skillLabels = {
        cognitive: 'المهارات المعرفية',
        motor: 'المهارات الحركية',
        communication: 'مهارات التواصل',
        social: 'المهارات الاجتماعية',
        self_care: 'مهارات الرعاية الذاتية',
        behavioral: 'السلوك التكيفي'
    };

    const skillColors = {
        cognitive: '#007bff',
        motor: '#28a745',
        communication: '#ffc107',
        social: '#17a2b8',
        self_care: '#fd7e14',
        behavioral: '#6f42c1'
    };

    Object.keys(skillLabels).forEach(skill => {
        const score = areas[skill] || 0;
        const color = skillColors[skill];
        
        const progressHtml = `
            <div class="skill-progress">
                <div class="skill-label">
                    <span>${skillLabels[skill]}</span>
                    <span>${score}%</span>
                </div>
                <div class="progress-bar-custom">
                    <div class="progress-bar" style="width: ${score}%; background-color: ${color};">
                        <div class="progress-value">${score}%</div>
                    </div>
                </div>
            </div>
        `;
        
        skillsContainer.append(progressHtml);
    });
}

function updateOverallScore(areas) {
    const scores = Object.values(areas).filter(score => score !== null && score !== undefined);
    if (scores.length === 0) {
        $('#overallScore').text('--');
        $('#overallProgressBar').css('width', '0%');
        $('#scoreDescription').text('لا توجد نتائج متاحة');
        return;
    }

    const overallScore = Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
    
    $('#overallScore').text(overallScore + '%');
    $('#overallProgressBar').css('width', overallScore + '%');
    
    // Update score class and description
    let scoreClass, description;
    if (overallScore >= 80) {
        scoreClass = 'score-excellent';
        description = 'أداء ممتاز';
        $('#overallProgressBar').css('background-color', '#28a745');
    } else if (overallScore >= 60) {
        scoreClass = 'score-good';
        description = 'أداء جيد';
        $('#overallProgressBar').css('background-color', '#17a2b8');
    } else if (overallScore >= 40) {
        scoreClass = 'score-average';
        description = 'أداء متوسط';
        $('#overallProgressBar').css('background-color', '#ffc107');
    } else {
        scoreClass = 'score-poor';
        description = 'يحتاج تحسين';
        $('#overallProgressBar').css('background-color', '#dc3545');
    }
    
    $('#overallScore').removeClass().addClass(`assessment-score ${scoreClass}`);
    $('#scoreDescription').text(description);
}

// Create radar chart
function createRadarChart() {
    if (assessmentData.length === 0) return;

    const ctx = document.getElementById('radarChart').getContext('2d');
    const latestAssessment = assessmentData[assessmentData.length - 1];
    const areas = latestAssessment.assessment_areas || {};

    const data = {
        labels: [
            'المهارات المعرفية',
            'المهارات الحركية',
            'مهارات التواصل',
            'المهارات الاجتماعية',
            'مهارات الرعاية الذاتية',
            'السلوك التكيفي'
        ],
        datasets: [{
            label: 'النتيجة الحالية',
            data: [
                areas.cognitive || 0,
                areas.motor || 0,
                areas.communication || 0,
                areas.social || 0,
                areas.self_care || 0,
                areas.behavioral || 0
            ],
            backgroundColor: 'rgba(102, 126, 234, 0.2)',
            borderColor: 'rgba(102, 126, 234, 1)',
            borderWidth: 2,
            pointBackgroundColor: 'rgba(102, 126, 234, 1)',
            pointBorderColor: '#fff',
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: 'rgba(102, 126, 234, 1)'
        }]
    };

    // Add comparison with previous assessment if available
    if (assessmentData.length > 1) {
        const previousAssessment = assessmentData[assessmentData.length - 2];
        const previousAreas = previousAssessment.assessment_areas || {};
        
        data.datasets.push({
            label: 'التقييم السابق',
            data: [
                previousAreas.cognitive || 0,
                previousAreas.motor || 0,
                previousAreas.communication || 0,
                previousAreas.social || 0,
                previousAreas.self_care || 0,
                previousAreas.behavioral || 0
            ],
            backgroundColor: 'rgba(255, 193, 7, 0.2)',
            borderColor: 'rgba(255, 193, 7, 1)',
            borderWidth: 2,
            pointBackgroundColor: 'rgba(255, 193, 7, 1)',
            pointBorderColor: '#fff',
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: 'rgba(255, 193, 7, 1)'
        });
    }

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            r: {
                angleLines: {
                    display: true
                },
                suggestedMin: 0,
                suggestedMax: 100,
                ticks: {
                    stepSize: 20
                }
            }
        },
        plugins: {
            legend: {
                position: 'bottom'
            }
        }
    };

    if (radarChart) {
        radarChart.destroy();
    }

    radarChart = new Chart(ctx, {
        type: 'radar',
        data: data,
        options: options
    });
}

// Update progress tab
function updateProgressTab() {
    updateProgressTimeline();
}

function updateProgressTimeline() {
    const timeline = $('#progressTimeline');
    timeline.empty();

    if (progressData.length === 0) {
        timeline.html('<p class="text-muted text-center">لا توجد سجلات تقدم متاحة</p>');
        return;
    }

    // Sort progress data by date (newest first)
    const sortedProgress = progressData.sort((a, b) => new Date(b.record_date) - new Date(a.record_date));

    sortedProgress.forEach((record, index) => {
        const timelineItem = `
            <div class="timeline-item">
                <div class="timeline-marker"></div>
                <div class="timeline-content">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <h6 class="mb-0">${getProgressAreaLabel(record.progress_area)}</h6>
                        <small class="text-muted">${formatDate(record.record_date)}</small>
                    </div>
                    <div class="mb-2">
                        <span class="badge bg-${getProgressLevelBadgeClass(record.progress_level)}">
                            ${getProgressLevelLabel(record.progress_level)}
                        </span>
                    </div>
                    <p class="mb-2">${record.description}</p>
                    ${record.recorded_by ? `<small class="text-muted">بواسطة: ${record.recorded_by}</small>` : ''}
                </div>
            </div>
        `;
        timeline.append(timelineItem);
    });
}

// Create progress comparison chart
function createProgressChart() {
    if (progressData.length === 0) return;

    const ctx = document.getElementById('progressComparisonChart').getContext('2d');
    
    // Group progress data by area and calculate average scores over time
    const progressByArea = {};
    const areas = ['cognitive', 'motor', 'communication', 'social', 'self_care', 'behavioral'];
    
    areas.forEach(area => {
        progressByArea[area] = progressData
            .filter(record => record.progress_area === area)
            .map(record => ({
                date: record.record_date,
                level: getProgressLevelScore(record.progress_level)
            }))
            .sort((a, b) => new Date(a.date) - new Date(b.date));
    });

    // Create datasets for each area
    const datasets = [];
    const colors = ['#007bff', '#28a745', '#ffc107', '#17a2b8', '#fd7e14', '#6f42c1'];
    
    areas.forEach((area, index) => {
        if (progressByArea[area].length > 0) {
            datasets.push({
                label: getProgressAreaLabel(area),
                data: progressByArea[area].map(item => ({
                    x: item.date,
                    y: item.level
                })),
                borderColor: colors[index],
                backgroundColor: colors[index] + '20',
                tension: 0.4
            });
        }
    });

    const data = {
        datasets: datasets
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            x: {
                type: 'time',
                time: {
                    unit: 'month'
                }
            },
            y: {
                min: 0,
                max: 5,
                ticks: {
                    stepSize: 1,
                    callback: function(value) {
                        const labels = ['لا يوجد تقدم', 'يحتاج تحسين', 'مرضي', 'جيد', 'ممتاز'];
                        return labels[value] || '';
                    }
                }
            }
        },
        plugins: {
            legend: {
                position: 'bottom'
            }
        }
    };

    if (progressChart) {
        progressChart.destroy();
    }

    progressChart = new Chart(ctx, {
        type: 'line',
        data: data,
        options: options
    });
}

// Update goals tab
function updateGoalsTab(plans) {
    updateShortTermGoals(plans);
    updateLongTermGoals(plans);
}

function updateShortTermGoals(plans) {
    const container = $('#shortTermGoals');
    container.empty();

    if (plans.length === 0) {
        container.html('<p class="text-muted text-center">لا توجد خطط متاحة</p>');
        return;
    }

    const latestPlan = plans[plans.length - 1];
    const shortTermGoals = latestPlan.short_term_goals || [];

    if (shortTermGoals.length === 0) {
        container.html('<p class="text-muted text-center">لا توجد أهداف قصيرة المدى محددة</p>');
        return;
    }

    shortTermGoals.forEach((goal, index) => {
        const status = getRandomGoalStatus(); // In real implementation, this would come from data
        const goalHtml = `
            <div class="goal-progress">
                <div class="d-flex justify-content-between align-items-start mb-2">
                    <span class="fw-bold">الهدف ${index + 1}</span>
                    <span class="goal-status ${status.class}">${status.label}</span>
                </div>
                <p class="mb-0">${goal}</p>
            </div>
        `;
        container.append(goalHtml);
    });
}

function updateLongTermGoals(plans) {
    const container = $('#longTermGoals');
    container.empty();

    if (plans.length === 0) {
        container.html('<p class="text-muted text-center">لا توجد خطط متاحة</p>');
        return;
    }

    const latestPlan = plans[plans.length - 1];
    const longTermGoals = latestPlan.long_term_goals || [];

    if (longTermGoals.length === 0) {
        container.html('<p class="text-muted text-center">لا توجد أهداف طويلة المدى محددة</p>');
        return;
    }

    longTermGoals.forEach((goal, index) => {
        const status = getRandomGoalStatus(); // In real implementation, this would come from data
        const goalHtml = `
            <div class="goal-progress">
                <div class="d-flex justify-content-between align-items-start mb-2">
                    <span class="fw-bold">الهدف ${index + 1}</span>
                    <span class="goal-status ${status.class}">${status.label}</span>
                </div>
                <p class="mb-0">${goal}</p>
            </div>
        `;
        container.append(goalHtml);
    });
}

// Update recommendations tab
function updateRecommendationsTab() {
    const container = $('#recommendationsList');
    container.empty();

    // Generate recommendations based on assessment data
    const recommendations = generateRecommendations();

    if (recommendations.length === 0) {
        container.html('<p class="text-muted text-center">لا توجد توصيات متاحة</p>');
        return;
    }

    recommendations.forEach(recommendation => {
        const recommendationHtml = `
            <div class="recommendation-card">
                <h6 class="mb-2"><i class="fas fa-lightbulb me-2"></i>${recommendation.title}</h6>
                <p class="mb-0">${recommendation.description}</p>
            </div>
        `;
        container.append(recommendationHtml);
    });
}

// Helper functions
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

function getProgressLevelScore(level) {
    const scores = {
        'no_progress': 0,
        'needs_improvement': 1,
        'satisfactory': 2,
        'good': 3,
        'excellent': 4
    };
    return scores[level] || 0;
}

function getRandomGoalStatus() {
    const statuses = [
        { class: 'status-achieved', label: 'تم تحقيقه' },
        { class: 'status-in-progress', label: 'قيد التنفيذ' },
        { class: 'status-not-started', label: 'لم يبدأ' }
    ];
    return statuses[Math.floor(Math.random() * statuses.length)];
}

function generateRecommendations() {
    const recommendations = [];

    if (assessmentData.length === 0) return recommendations;

    const latestAssessment = assessmentData[assessmentData.length - 1];
    const areas = latestAssessment.assessment_areas || {};

    // Generate recommendations based on scores
    Object.keys(areas).forEach(area => {
        const score = areas[area];
        if (score < 60) {
            recommendations.push({
                title: `تحسين ${getProgressAreaLabel(area)}`,
                description: `يُنصح بزيادة التركيز على تطوير ${getProgressAreaLabel(area)} من خلال أنشطة مخصصة وجلسات إضافية.`
            });
        }
    });

    // Add general recommendations
    recommendations.push({
        title: 'المتابعة الدورية',
        description: 'يُنصح بإجراء تقييمات دورية كل 3 أشهر لمتابعة التقدم وتعديل الخطة التأهيلية حسب الحاجة.'
    });

    recommendations.push({
        title: 'إشراك الأسرة',
        description: 'تفعيل دور الأسرة في عملية التأهيل من خلال التدريب على الأنشطة المنزلية والمتابعة المستمرة.'
    });

    return recommendations;
}

function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-SA');
}
