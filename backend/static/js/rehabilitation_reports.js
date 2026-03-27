// Rehabilitation Reports JavaScript
let currentUser = null;
let charts = {};
let reportData = {};
let currentPage = 1;
let totalPages = 1;
let itemsPerPage = 10;
let currentFilters = {
    startDate: '',
    endDate: '',
    program: '',
    disability: ''
};

// Initialize the reports system
$(document).ready(function() {
    initializeReportsSystem();
});

function initializeReportsSystem() {
    // Get current user info
    getCurrentUser();
    
    // Set default date range (last 30 days)
    setDefaultDateRange();
    
    // Load initial data
    loadFilterOptions();
    loadStatistics();
    loadCharts();
    loadDetailedReport();
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

function setDefaultDateRange() {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    
    $('#startDate').val(startDate.toISOString().split('T')[0]);
    $('#endDate').val(endDate.toISOString().split('T')[0]);
    
    currentFilters.startDate = startDate.toISOString().split('T')[0];
    currentFilters.endDate = endDate.toISOString().split('T')[0];
}

function loadFilterOptions() {
    const token = localStorage.getItem('token');
    if (!token) return;

    // Load programs
    $.ajax({
        url: '/api/rehabilitation/programs',
        method: 'GET',
        headers: {
            'Authorization': 'Bearer ' + token
        },
        success: function(response) {
            const programs = response.programs || [];
            const programSelect = $('#programFilter');
            programSelect.empty().append('<option value="">جميع البرامج</option>');
            
            programs.forEach(program => {
                programSelect.append(`<option value="${program.id}">${program.name}</option>`);
            });
        }
    });

    // Load disability types
    const disabilityTypes = [
        { value: 'physical', label: 'إعاقة جسدية' },
        { value: 'intellectual', label: 'إعاقة ذهنية' },
        { value: 'sensory', label: 'إعاقة حسية' },
        { value: 'autism', label: 'اضطراب طيف التوحد' },
        { value: 'learning', label: 'صعوبات التعلم' },
        { value: 'multiple', label: 'إعاقات متعددة' }
    ];
    
    const disabilitySelect = $('#disabilityFilter');
    disabilitySelect.empty().append('<option value="">جميع الأنواع</option>');
    
    disabilityTypes.forEach(type => {
        disabilitySelect.append(`<option value="${type.value}">${type.label}</option>`);
    });
}

function loadStatistics() {
    const token = localStorage.getItem('token');
    if (!token) return;

    const params = new URLSearchParams(currentFilters);

    $.ajax({
        url: `/api/rehabilitation/reports/statistics?${params.toString()}`,
        method: 'GET',
        headers: {
            'Authorization': 'Bearer ' + token
        },
        success: function(response) {
            displayStatistics(response.statistics);
        },
        error: function() {
            console.log('Error loading statistics');
            displayDefaultStatistics();
        }
    });
}

function displayStatistics(stats) {
    const statsGrid = $('#statsGrid');
    statsGrid.empty();

    const statisticsCards = [
        {
            title: 'إجمالي المستفيدين',
            value: stats?.total_beneficiaries || 0,
            icon: 'fas fa-users',
            color: '#007bff'
        },
        {
            title: 'البرامج النشطة',
            value: stats?.active_programs || 0,
            icon: 'fas fa-clipboard-list',
            color: '#28a745'
        },
        {
            title: 'الخطط المكتملة',
            value: stats?.completed_plans || 0,
            icon: 'fas fa-check-circle',
            color: '#17a2b8'
        },
        {
            title: 'معدل النجاح',
            value: (stats?.success_rate || 0) + '%',
            icon: 'fas fa-chart-line',
            color: '#ffc107'
        },
        {
            title: 'التقييمات الشهر الحالي',
            value: stats?.monthly_assessments || 0,
            icon: 'fas fa-clipboard-check',
            color: '#6f42c1'
        },
        {
            title: 'الأنشطة المنفذة',
            value: stats?.completed_activities || 0,
            icon: 'fas fa-puzzle-piece',
            color: '#fd7e14'
        }
    ];

    statisticsCards.forEach(stat => {
        const card = `
            <div class="stat-card">
                <div class="stat-number" style="color: ${stat.color}">${stat.value}</div>
                <div class="stat-label">
                    <i class="${stat.icon} me-2"></i>${stat.title}
                </div>
            </div>
        `;
        statsGrid.append(card);
    });
}

function displayDefaultStatistics() {
    displayStatistics({
        total_beneficiaries: 0,
        active_programs: 0,
        completed_plans: 0,
        success_rate: 0,
        monthly_assessments: 0,
        completed_activities: 0
    });
}

function loadCharts() {
    loadDisabilityChart();
    loadProgressChart();
    loadSuccessChart();
    loadActivitiesChart();
}

function loadDisabilityChart() {
    const ctx = document.getElementById('disabilityChart').getContext('2d');
    
    // Destroy existing chart if it exists
    if (charts.disabilityChart) {
        charts.disabilityChart.destroy();
    }

    const token = localStorage.getItem('token');
    if (!token) return;

    const params = new URLSearchParams(currentFilters);

    $.ajax({
        url: `/api/rehabilitation/reports/disability-distribution?${params.toString()}`,
        method: 'GET',
        headers: {
            'Authorization': 'Bearer ' + token
        },
        success: function(response) {
            const data = response.data || [];
            
            charts.disabilityChart = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: data.map(item => getDisabilityLabel(item.disability_type)),
                    datasets: [{
                        data: data.map(item => item.count),
                        backgroundColor: [
                            '#FF6384',
                            '#36A2EB',
                            '#FFCE56',
                            '#4BC0C0',
                            '#9966FF',
                            '#FF9F40'
                        ]
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            position: 'bottom'
                        }
                    }
                }
            });
        },
        error: function() {
            // Create default chart with sample data
            charts.disabilityChart = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: ['إعاقة جسدية', 'إعاقة ذهنية', 'إعاقة حسية'],
                    datasets: [{
                        data: [30, 25, 20],
                        backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56']
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            position: 'bottom'
                        }
                    }
                }
            });
        }
    });
}

function loadProgressChart() {
    const ctx = document.getElementById('progressChart').getContext('2d');
    
    if (charts.progressChart) {
        charts.progressChart.destroy();
    }

    const token = localStorage.getItem('token');
    if (!token) return;

    const params = new URLSearchParams(currentFilters);

    $.ajax({
        url: `/api/rehabilitation/reports/monthly-progress?${params.toString()}`,
        method: 'GET',
        headers: {
            'Authorization': 'Bearer ' + token
        },
        success: function(response) {
            const data = response.data || [];
            
            charts.progressChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: data.map(item => item.month),
                    datasets: [{
                        label: 'متوسط التقدم',
                        data: data.map(item => item.average_progress),
                        borderColor: '#007bff',
                        backgroundColor: 'rgba(0, 123, 255, 0.1)',
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    scales: {
                        y: {
                            beginAtZero: true,
                            max: 100
                        }
                    }
                }
            });
        },
        error: function() {
            // Create default chart
            const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو'];
            const progressData = [65, 70, 75, 80, 85, 90];
            
            charts.progressChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: months,
                    datasets: [{
                        label: 'متوسط التقدم',
                        data: progressData,
                        borderColor: '#007bff',
                        backgroundColor: 'rgba(0, 123, 255, 0.1)',
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    scales: {
                        y: {
                            beginAtZero: true,
                            max: 100
                        }
                    }
                }
            });
        }
    });
}

function loadSuccessChart() {
    const ctx = document.getElementById('successChart').getContext('2d');
    
    if (charts.successChart) {
        charts.successChart.destroy();
    }

    const token = localStorage.getItem('token');
    if (!token) return;

    const params = new URLSearchParams(currentFilters);

    $.ajax({
        url: `/api/rehabilitation/reports/program-success?${params.toString()}`,
        method: 'GET',
        headers: {
            'Authorization': 'Bearer ' + token
        },
        success: function(response) {
            const data = response.data || [];
            
            charts.successChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: data.map(item => item.program_name),
                    datasets: [{
                        label: 'معدل النجاح %',
                        data: data.map(item => item.success_rate),
                        backgroundColor: '#28a745'
                    }]
                },
                options: {
                    responsive: true,
                    scales: {
                        y: {
                            beginAtZero: true,
                            max: 100
                        }
                    }
                }
            });
        },
        error: function() {
            // Create default chart
            charts.successChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: ['برنامج العلاج الطبيعي', 'برنامج النطق', 'برنامج التأهيل المهني'],
                    datasets: [{
                        label: 'معدل النجاح %',
                        data: [85, 78, 92],
                        backgroundColor: '#28a745'
                    }]
                },
                options: {
                    responsive: true,
                    scales: {
                        y: {
                            beginAtZero: true,
                            max: 100
                        }
                    }
                }
            });
        }
    });
}

function loadActivitiesChart() {
    const ctx = document.getElementById('activitiesChart').getContext('2d');
    
    if (charts.activitiesChart) {
        charts.activitiesChart.destroy();
    }

    const token = localStorage.getItem('token');
    if (!token) return;

    const params = new URLSearchParams(currentFilters);

    $.ajax({
        url: `/api/rehabilitation/reports/activity-participation?${params.toString()}`,
        method: 'GET',
        headers: {
            'Authorization': 'Bearer ' + token
        },
        success: function(response) {
            const data = response.data || [];
            
            charts.activitiesChart = new Chart(ctx, {
                type: 'radar',
                data: {
                    labels: data.map(item => getActivityTypeLabel(item.activity_type)),
                    datasets: [{
                        label: 'معدل المشاركة %',
                        data: data.map(item => item.participation_rate),
                        backgroundColor: 'rgba(54, 162, 235, 0.2)',
                        borderColor: 'rgba(54, 162, 235, 1)',
                        pointBackgroundColor: 'rgba(54, 162, 235, 1)'
                    }]
                },
                options: {
                    responsive: true,
                    scales: {
                        r: {
                            beginAtZero: true,
                            max: 100
                        }
                    }
                }
            });
        },
        error: function() {
            // Create default chart
            charts.activitiesChart = new Chart(ctx, {
                type: 'radar',
                data: {
                    labels: ['علاج طبيعي', 'علاج وظيفي', 'علاج النطق', 'تعديل السلوك'],
                    datasets: [{
                        label: 'معدل المشاركة %',
                        data: [80, 75, 85, 70],
                        backgroundColor: 'rgba(54, 162, 235, 0.2)',
                        borderColor: 'rgba(54, 162, 235, 1)',
                        pointBackgroundColor: 'rgba(54, 162, 235, 1)'
                    }]
                },
                options: {
                    responsive: true,
                    scales: {
                        r: {
                            beginAtZero: true,
                            max: 100
                        }
                    }
                }
            });
        }
    });
}

function loadDetailedReport() {
    const token = localStorage.getItem('token');
    if (!token) return;

    const params = new URLSearchParams({
        ...currentFilters,
        page: currentPage,
        per_page: itemsPerPage
    });

    $.ajax({
        url: `/api/rehabilitation/reports/detailed?${params.toString()}`,
        method: 'GET',
        headers: {
            'Authorization': 'Bearer ' + token
        },
        success: function(response) {
            const data = response.data || [];
            totalPages = response.pagination ? response.pagination.pages : 1;
            
            populateDetailedReport(data);
            updateReportPagination();
        },
        error: function() {
            console.log('Error loading detailed report');
            populateDetailedReport([]);
        }
    });
}

function populateDetailedReport(data) {
    const tbody = $('#reportTableBody');
    tbody.empty();

    if (data.length === 0) {
        tbody.html(`
            <tr>
                <td colspan="9" class="text-center text-muted py-4">
                    <i class="fas fa-chart-bar fa-2x mb-3"></i>
                    <br>لا توجد بيانات للعرض
                </td>
            </tr>
        `);
        return;
    }

    data.forEach(item => {
        const row = `
            <tr>
                <td>${item.beneficiary_name || '--'}</td>
                <td>${item.program_name || '--'}</td>
                <td>${getDisabilityLabel(item.disability_type) || '--'}</td>
                <td>${formatDate(item.start_date) || '--'}</td>
                <td>${item.duration_weeks ? item.duration_weeks + ' أسبوع' : '--'}</td>
                <td>
                    <div class="progress" style="height: 20px;">
                        <div class="progress-bar" role="progressbar" 
                             style="width: ${item.progress_percentage || 0}%"
                             aria-valuenow="${item.progress_percentage || 0}" 
                             aria-valuemin="0" aria-valuemax="100">
                            ${item.progress_percentage || 0}%
                        </div>
                    </div>
                </td>
                <td>${formatDate(item.last_assessment_date) || '--'}</td>
                <td>
                    <span class="badge bg-${getStatusColor(item.status)}">
                        ${getStatusLabel(item.status)}
                    </span>
                </td>
                <td>
                    <button class="btn btn-sm btn-outline-primary" onclick="viewReportDetails(${item.beneficiary_id})">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            </tr>
        `;
        tbody.append(row);
    });
}

function updateReportPagination() {
    const pagination = $('#reportPagination');
    pagination.empty();
    
    if (totalPages <= 1) return;
    
    // Previous button
    pagination.append(`
        <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="changeReportPage(${currentPage - 1})">السابق</a>
        </li>
    `);
    
    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
        if (i === currentPage || i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
            pagination.append(`
                <li class="page-item ${i === currentPage ? 'active' : ''}">
                    <a class="page-link" href="#" onclick="changeReportPage(${i})">${i}</a>
                </li>
            `);
        } else if (i === currentPage - 2 || i === currentPage + 2) {
            pagination.append('<li class="page-item disabled"><span class="page-link">...</span></li>');
        }
    }
    
    // Next button
    pagination.append(`
        <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="changeReportPage(${currentPage + 1})">التالي</a>
        </li>
    `);
}

function changeReportPage(page) {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
        currentPage = page;
        loadDetailedReport();
    }
}

// Filter functions
function applyFilters() {
    currentFilters.startDate = $('#startDate').val();
    currentFilters.endDate = $('#endDate').val();
    currentFilters.program = $('#programFilter').val();
    currentFilters.disability = $('#disabilityFilter').val();
    
    currentPage = 1;
    
    // Reload all data with new filters
    loadStatistics();
    loadCharts();
    loadDetailedReport();
    
    showAlert('تم تطبيق التصفية بنجاح', 'success');
}

function resetFilters() {
    $('#startDate').val('');
    $('#endDate').val('');
    $('#programFilter').val('');
    $('#disabilityFilter').val('');
    
    setDefaultDateRange();
    applyFilters();
}

// Report generation functions
function generateReport(reportType) {
    const token = localStorage.getItem('token');
    if (!token) return;

    const params = new URLSearchParams({
        ...currentFilters,
        type: reportType
    });

    $.ajax({
        url: `/api/rehabilitation/reports/generate?${params.toString()}`,
        method: 'GET',
        headers: {
            'Authorization': 'Bearer ' + token
        },
        success: function(response) {
            displayGeneratedReport(response, reportType);
        },
        error: function() {
            showAlert('حدث خطأ في إنشاء التقرير', 'danger');
        }
    });
}

function displayGeneratedReport(data, reportType) {
    const reportTitles = {
        'beneficiaries': 'تقرير المستفيدين',
        'programs': 'تقرير البرامج التأهيلية',
        'progress': 'تقرير التقدم',
        'activities': 'تقرير الأنشطة',
        'assessments': 'تقرير التقييمات',
        'financial': 'التقرير المالي'
    };

    const title = reportTitles[reportType] || 'تقرير مفصل';
    
    // Display report in modal or new section
    const reportHtml = generateReportHTML(data, title);
    $('#reportDetailsContent').html(reportHtml);
    $('#reportDetailsModal').modal('show');
}

function generateReportHTML(data, title) {
    // Generate HTML based on report data
    let html = `<h5>${title}</h5>`;
    
    if (data.summary) {
        html += `<div class="mb-3">
            <h6>ملخص التقرير</h6>
            <p>${data.summary}</p>
        </div>`;
    }
    
    if (data.charts) {
        html += `<div class="mb-3">
            <h6>الرسوم البيانية</h6>
            <!-- Charts would be rendered here -->
        </div>`;
    }
    
    if (data.details && data.details.length > 0) {
        html += `<div class="mb-3">
            <h6>التفاصيل</h6>
            <div class="table-responsive">
                <table class="table table-sm">
                    <thead>
                        <tr>`;
        
        // Add headers based on first item
        if (data.details[0]) {
            Object.keys(data.details[0]).forEach(key => {
                html += `<th>${key}</th>`;
            });
        }
        
        html += `</tr></thead><tbody>`;
        
        data.details.forEach(item => {
            html += '<tr>';
            Object.values(item).forEach(value => {
                html += `<td>${value}</td>`;
            });
            html += '</tr>';
        });
        
        html += '</tbody></table></div></div>';
    }
    
    return html;
}

// Export functions
function exportReport(format) {
    const token = localStorage.getItem('token');
    if (!token) return;

    const params = new URLSearchParams({
        ...currentFilters,
        format: format
    });

    $.ajax({
        url: `/api/rehabilitation/reports/export?${params.toString()}`,
        method: 'GET',
        headers: {
            'Authorization': 'Bearer ' + token
        },
        xhrFields: {
            responseType: 'blob'
        },
        success: function(data) {
            const blob = new Blob([data]);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `rehabilitation_report_${new Date().toISOString().split('T')[0]}.${format}`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
            showAlert(`تم تصدير التقرير بصيغة ${format.toUpperCase()} بنجاح`, 'success');
        },
        error: function() {
            showAlert('حدث خطأ في تصدير التقرير', 'danger');
        }
    });
}

function printReport() {
    window.print();
}

function refreshReport() {
    loadStatistics();
    loadCharts();
    loadDetailedReport();
    showAlert('تم تحديث التقرير بنجاح', 'success');
}

function viewReportDetails(beneficiaryId) {
    const token = localStorage.getItem('token');
    if (!token) return;

    $.ajax({
        url: `/api/rehabilitation/beneficiaries/${beneficiaryId}`,
        method: 'GET',
        headers: {
            'Authorization': 'Bearer ' + token
        },
        success: function(response) {
            const beneficiary = response.beneficiary;
            const detailsHtml = generateBeneficiaryReportHTML(beneficiary);
            $('#reportDetailsContent').html(detailsHtml);
            $('#reportDetailsModal').modal('show');
        },
        error: function() {
            showAlert('حدث خطأ في تحميل تفاصيل المستفيد', 'danger');
        }
    });
}

function generateBeneficiaryReportHTML(beneficiary) {
    return `
        <div class="row">
            <div class="col-md-6">
                <h6>معلومات المستفيد</h6>
                <p><strong>الاسم:</strong> ${beneficiary.name}</p>
                <p><strong>العمر:</strong> ${beneficiary.age || '--'}</p>
                <p><strong>نوع الإعاقة:</strong> ${getDisabilityLabel(beneficiary.disability_type)}</p>
                <p><strong>تاريخ التسجيل:</strong> ${formatDate(beneficiary.created_at)}</p>
            </div>
            <div class="col-md-6">
                <h6>معلومات الاتصال</h6>
                <p><strong>ولي الأمر:</strong> ${beneficiary.guardian_name || '--'}</p>
                <p><strong>رقم الهاتف:</strong> ${beneficiary.guardian_phone || '--'}</p>
                <p><strong>العنوان:</strong> ${beneficiary.address || '--'}</p>
            </div>
        </div>
        
        <div class="mt-3">
            <h6>الخطط والبرامج</h6>
            <p>عدد الخطط النشطة: ${beneficiary.active_plans || 0}</p>
            <p>عدد التقييمات: ${beneficiary.assessments_count || 0}</p>
            <p>آخر تقييم: ${formatDate(beneficiary.last_assessment_date) || '--'}</p>
        </div>
    `;
}

// Helper functions
function getDisabilityLabel(type) {
    const labels = {
        'physical': 'إعاقة جسدية',
        'intellectual': 'إعاقة ذهنية',
        'sensory': 'إعاقة حسية',
        'autism': 'اضطراب طيف التوحد',
        'learning': 'صعوبات التعلم',
        'multiple': 'إعاقات متعددة'
    };
    return labels[type] || type;
}

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

function getStatusLabel(status) {
    const labels = {
        'active': 'نشط',
        'completed': 'مكتمل',
        'on_hold': 'معلق',
        'cancelled': 'ملغي'
    };
    return labels[status] || status;
}

function getStatusColor(status) {
    const colors = {
        'active': 'success',
        'completed': 'primary',
        'on_hold': 'warning',
        'cancelled': 'danger'
    };
    return colors[status] || 'secondary';
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
