// Clinic Reports JavaScript
let reportData = {};
let charts = {};

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    initializeDateFilters();
    loadInitialData();
    setupEventListeners();
});

// Initialize date filters
function initializeDateFilters() {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    document.getElementById('startDate').value = firstDayOfMonth.toISOString().split('T')[0];
    document.getElementById('endDate').value = lastDayOfMonth.toISOString().split('T')[0];
}

// Load initial data
async function loadInitialData() {
    try {
        await Promise.all([
            loadClinics(),
            loadSpecialists(),
            generateReport()
        ]);
    } catch (error) {
        console.error('Error loading initial data:', error);
        showAlert('حدث خطأ في تحميل البيانات', 'error');
    }
}

// Load clinics for filter
async function loadClinics() {
    try {
        const response = await fetch('/api/clinic-types', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const clinics = await response.json();
            populateClinicFilter(clinics);
        }
    } catch (error) {
        console.error('Error loading clinics:', error);
    }
}

// Load specialists for filter
async function loadSpecialists() {
    try {
        const response = await fetch('/api/clinic-specialists', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const specialists = await response.json();
            populateSpecialistFilter(specialists);
        }
    } catch (error) {
        console.error('Error loading specialists:', error);
    }
}

// Populate filter dropdowns
function populateClinicFilter(clinics) {
    const select = document.getElementById('filterClinic');
    select.innerHTML = '<option value="">جميع العيادات</option>';
    
    clinics.forEach(clinic => {
        const option = document.createElement('option');
        option.value = clinic.id;
        option.textContent = clinic.clinic_name;
        select.appendChild(option);
    });
}

function populateSpecialistFilter(specialists) {
    const select = document.getElementById('filterSpecialist');
    select.innerHTML = '<option value="">جميع الأخصائيين</option>';
    
    specialists.forEach(specialist => {
        const option = document.createElement('option');
        option.value = specialist.id;
        option.textContent = specialist.employee_name;
        select.appendChild(option);
    });
}

// Setup event listeners
function setupEventListeners() {
    document.getElementById('reportPeriod').addEventListener('change', handlePeriodChange);
}

// Handle period change
function handlePeriodChange() {
    const period = document.getElementById('reportPeriod').value;
    const today = new Date();
    let startDate, endDate;
    
    switch (period) {
        case 'week':
            const weekStart = new Date(today);
            weekStart.setDate(today.getDate() - today.getDay());
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 6);
            startDate = weekStart;
            endDate = weekEnd;
            break;
            
        case 'month':
            startDate = new Date(today.getFullYear(), today.getMonth(), 1);
            endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
            break;
            
        case 'quarter':
            const quarter = Math.floor(today.getMonth() / 3);
            startDate = new Date(today.getFullYear(), quarter * 3, 1);
            endDate = new Date(today.getFullYear(), quarter * 3 + 3, 0);
            break;
            
        case 'year':
            startDate = new Date(today.getFullYear(), 0, 1);
            endDate = new Date(today.getFullYear(), 11, 31);
            break;
            
        case 'custom':
            // Don't change dates for custom period
            return;
    }
    
    if (startDate && endDate) {
        document.getElementById('startDate').value = startDate.toISOString().split('T')[0];
        document.getElementById('endDate').value = endDate.toISOString().split('T')[0];
    }
}

// Generate report
async function generateReport() {
    const filters = {
        start_date: document.getElementById('startDate').value,
        end_date: document.getElementById('endDate').value,
        clinic_id: document.getElementById('filterClinic').value,
        specialist_id: document.getElementById('filterSpecialist').value
    };
    
    try {
        showLoading(true);
        
        // Load report data
        await Promise.all([
            loadKPIData(filters),
            loadChartData(filters),
            loadDetailedStats(filters),
            loadTreatmentOutcomes(filters),
            loadTopPerformers(filters)
        ]);
        
        showLoading(false);
        showAlert('تم إنشاء التقرير بنجاح', 'success');
        
    } catch (error) {
        console.error('Error generating report:', error);
        showAlert('حدث خطأ في إنشاء التقرير', 'error');
        showLoading(false);
    }
}

// Load KPI data
async function loadKPIData(filters) {
    try {
        const response = await fetch('/api/clinics/stats?' + new URLSearchParams(filters), {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            updateKPIDisplay(data);
        }
    } catch (error) {
        console.error('Error loading KPI data:', error);
        // Use mock data for demonstration
        updateKPIDisplay({
            total_appointments: 156,
            completed_sessions: 142,
            active_patients: 89,
            satisfaction_rate: 92,
            appointments_change: 12,
            sessions_change: 8,
            patients_change: 0,
            satisfaction_change: 5
        });
    }
}

// Update KPI display
function updateKPIDisplay(data) {
    document.getElementById('totalAppointments').textContent = data.total_appointments || 0;
    document.getElementById('completedSessions').textContent = data.completed_sessions || 0;
    document.getElementById('activePatients').textContent = data.active_patients || 0;
    document.getElementById('satisfactionRate').textContent = (data.satisfaction_rate || 0) + '%';
    
    updateChangeIndicator('appointmentsChange', data.appointments_change || 0);
    updateChangeIndicator('sessionsChange', data.sessions_change || 0);
    updateChangeIndicator('patientsChange', data.patients_change || 0);
    updateChangeIndicator('satisfactionChange', data.satisfaction_change || 0);
}

// Update change indicators
function updateChangeIndicator(elementId, change) {
    const element = document.getElementById(elementId);
    const absChange = Math.abs(change);
    
    element.className = 'metric-change';
    
    if (change > 0) {
        element.classList.add('metric-increase');
        element.innerHTML = `<i class="fas fa-arrow-up"></i> +${absChange}%`;
    } else if (change < 0) {
        element.classList.add('metric-decrease');
        element.innerHTML = `<i class="fas fa-arrow-down"></i> -${absChange}%`;
    } else {
        element.classList.add('metric-stable');
        element.innerHTML = `<i class="fas fa-minus"></i> ${absChange}%`;
    }
}

// Load chart data
async function loadChartData(filters) {
    // Generate mock data for demonstration
    const appointmentsData = generateMockAppointmentsData();
    const clinicPerformanceData = generateMockClinicPerformanceData();
    const treatmentProgressData = generateMockTreatmentProgressData();
    const specialistWorkloadData = generateMockSpecialistWorkloadData();
    const sessionTypesData = generateMockSessionTypesData();
    const monthlyTrendsData = generateMockMonthlyTrendsData();
    
    createAppointmentsChart(appointmentsData);
    createClinicPerformanceChart(clinicPerformanceData);
    createTreatmentProgressChart(treatmentProgressData);
    createSpecialistWorkloadChart(specialistWorkloadData);
    createSessionTypesChart(sessionTypesData);
    createMonthlyTrendsChart(monthlyTrendsData);
}

// Create appointments chart
function createAppointmentsChart(data) {
    const ctx = document.getElementById('appointmentsChart').getContext('2d');
    
    if (charts.appointments) {
        charts.appointments.destroy();
    }
    
    charts.appointments = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.labels,
            datasets: [{
                label: 'المواعيد المجدولة',
                data: data.scheduled,
                borderColor: '#fd7e14',
                backgroundColor: 'rgba(253, 126, 20, 0.1)',
                tension: 0.4
            }, {
                label: 'المواعيد المكتملة',
                data: data.completed,
                borderColor: '#28a745',
                backgroundColor: 'rgba(40, 167, 69, 0.1)',
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top'
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

// Create clinic performance chart
function createClinicPerformanceChart(data) {
    const ctx = document.getElementById('clinicPerformanceChart').getContext('2d');
    
    if (charts.clinicPerformance) {
        charts.clinicPerformance.destroy();
    }
    
    charts.clinicPerformance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: data.labels,
            datasets: [{
                data: data.values,
                backgroundColor: [
                    '#fd7e14',
                    '#e83e8c',
                    '#6f42c1',
                    '#20c997',
                    '#ffc107',
                    '#dc3545'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

// Create treatment progress chart
function createTreatmentProgressChart(data) {
    const ctx = document.getElementById('treatmentProgressChart').getContext('2d');
    
    if (charts.treatmentProgress) {
        charts.treatmentProgress.destroy();
    }
    
    charts.treatmentProgress = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.labels,
            datasets: [{
                label: 'معدل التحسن (%)',
                data: data.values,
                backgroundColor: 'rgba(253, 126, 20, 0.8)',
                borderColor: '#fd7e14',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100
                }
            }
        }
    });
}

// Create specialist workload chart
function createSpecialistWorkloadChart(data) {
    const ctx = document.getElementById('specialistWorkloadChart').getContext('2d');
    
    if (charts.specialistWorkload) {
        charts.specialistWorkload.destroy();
    }
    
    charts.specialistWorkload = new Chart(ctx, {
        type: 'horizontalBar',
        data: {
            labels: data.labels,
            datasets: [{
                label: 'عدد الجلسات',
                data: data.values,
                backgroundColor: 'rgba(111, 66, 193, 0.8)',
                borderColor: '#6f42c1',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    beginAtZero: true
                }
            }
        }
    });
}

// Create session types chart
function createSessionTypesChart(data) {
    const ctx = document.getElementById('sessionTypesChart').getContext('2d');
    
    if (charts.sessionTypes) {
        charts.sessionTypes.destroy();
    }
    
    charts.sessionTypes = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: data.labels,
            datasets: [{
                data: data.values,
                backgroundColor: [
                    '#fd7e14',
                    '#e83e8c',
                    '#6f42c1',
                    '#20c997'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

// Create monthly trends chart
function createMonthlyTrendsChart(data) {
    const ctx = document.getElementById('monthlyTrendsChart').getContext('2d');
    
    if (charts.monthlyTrends) {
        charts.monthlyTrends.destroy();
    }
    
    charts.monthlyTrends = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.labels,
            datasets: [{
                label: 'المواعيد',
                data: data.appointments,
                borderColor: '#fd7e14',
                backgroundColor: 'rgba(253, 126, 20, 0.1)',
                tension: 0.4
            }, {
                label: 'الجلسات',
                data: data.sessions,
                borderColor: '#28a745',
                backgroundColor: 'rgba(40, 167, 69, 0.1)',
                tension: 0.4
            }, {
                label: 'المرضى الجدد',
                data: data.newPatients,
                borderColor: '#6f42c1',
                backgroundColor: 'rgba(111, 66, 193, 0.1)',
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top'
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

// Load detailed statistics
async function loadDetailedStats(filters) {
    // Generate mock data for demonstration
    const mockData = [
        {
            clinic: 'العيادة الطبية',
            specialist: 'د. أحمد محمد',
            scheduled: 45,
            completed: 42,
            completionRate: 93.3,
            avgDuration: 35,
            performance: 'ممتاز'
        },
        {
            clinic: 'عيادة النطق والتخاطب',
            specialist: 'أ. فاطمة علي',
            scheduled: 38,
            completed: 36,
            completionRate: 94.7,
            avgDuration: 40,
            performance: 'ممتاز'
        },
        {
            clinic: 'العيادة النفسية',
            specialist: 'د. سارة أحمد',
            scheduled: 32,
            completed: 30,
            completionRate: 93.8,
            avgDuration: 45,
            performance: 'ممتاز'
        }
    ];
    
    displayDetailedStats(mockData);
}

// Display detailed statistics
function displayDetailedStats(data) {
    const tbody = document.getElementById('detailedStatsTable');
    tbody.innerHTML = '';
    
    data.forEach(row => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${row.clinic}</td>
            <td>${row.specialist}</td>
            <td>${row.scheduled}</td>
            <td>${row.completed}</td>
            <td>
                <span class="trend-indicator trend-up">
                    ${row.completionRate.toFixed(1)}%
                </span>
            </td>
            <td>${row.avgDuration} دقيقة</td>
            <td>
                <span class="badge bg-success">${row.performance}</span>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// Load treatment outcomes
async function loadTreatmentOutcomes(filters) {
    // Generate mock data for demonstration
    const outcomes = {
        improvement: 87,
        completion: 78,
        attendance: 92,
        retention: 85
    };
    
    updateProgressRings(outcomes);
}

// Update progress rings
function updateProgressRings(data) {
    updateProgressRing('improvementRing', 'improvementRate', data.improvement);
    updateProgressRing('completionRing', 'completionRate', data.completion);
    updateProgressRing('attendanceRing', 'attendanceRate', data.attendance);
    updateProgressRing('retentionRing', 'retentionRate', data.retention);
}

// Update individual progress ring
function updateProgressRing(ringId, textId, percentage) {
    const ring = document.getElementById(ringId);
    const text = document.getElementById(textId);
    
    const circumference = 2 * Math.PI * 52;
    const offset = circumference - (percentage / 100) * circumference;
    
    ring.style.strokeDashoffset = offset;
    text.textContent = percentage + '%';
}

// Load top performers
async function loadTopPerformers(filters) {
    // Generate mock data for demonstration
    const topSpecialists = [
        { name: 'د. أحمد محمد', clinic: 'العيادة الطبية', score: 95, sessions: 42 },
        { name: 'أ. فاطمة علي', clinic: 'النطق والتخاطب', score: 94, sessions: 36 },
        { name: 'د. سارة أحمد', clinic: 'العيادة النفسية', score: 93, sessions: 30 },
        { name: 'أ. محمد حسن', clinic: 'العلاج الطبيعي', score: 91, sessions: 28 },
        { name: 'د. نور الدين', clinic: 'العلاج الوظيفي', score: 89, sessions: 25 }
    ];
    
    displayTopPerformers(topSpecialists);
}

// Display top performers
function displayTopPerformers(specialists) {
    const container = document.getElementById('topSpecialists');
    
    container.innerHTML = specialists.map((specialist, index) => `
        <div class="d-flex justify-content-between align-items-center mb-3 p-3 border rounded">
            <div class="d-flex align-items-center">
                <div class="badge bg-primary me-3">${index + 1}</div>
                <div>
                    <div class="fw-bold">${specialist.name}</div>
                    <small class="text-muted">${specialist.clinic}</small>
                </div>
            </div>
            <div class="text-end">
                <div class="fw-bold text-success">${specialist.score}%</div>
                <small class="text-muted">${specialist.sessions} جلسة</small>
            </div>
        </div>
    `).join('');
}

// Mock data generators
function generateMockAppointmentsData() {
    return {
        labels: ['الأسبوع 1', 'الأسبوع 2', 'الأسبوع 3', 'الأسبوع 4'],
        scheduled: [45, 52, 48, 55],
        completed: [42, 49, 45, 52]
    };
}

function generateMockClinicPerformanceData() {
    return {
        labels: ['العيادة الطبية', 'النطق والتخاطب', 'العيادة النفسية', 'العلاج الطبيعي', 'العلاج الوظيفي'],
        values: [25, 20, 18, 22, 15]
    };
}

function generateMockTreatmentProgressData() {
    return {
        labels: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو'],
        values: [75, 82, 78, 85, 87]
    };
}

function generateMockSpecialistWorkloadData() {
    return {
        labels: ['د. أحمد محمد', 'أ. فاطمة علي', 'د. سارة أحمد', 'أ. محمد حسن'],
        values: [42, 36, 30, 28]
    };
}

function generateMockSessionTypesData() {
    return {
        labels: ['تقييم', 'علاج', 'استشارة', 'متابعة'],
        values: [30, 45, 15, 25]
    };
}

function generateMockMonthlyTrendsData() {
    return {
        labels: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو'],
        appointments: [120, 135, 128, 142, 156, 148],
        sessions: [115, 128, 122, 135, 142, 140],
        newPatients: [25, 30, 28, 32, 35, 33]
    };
}

// Export functions
function exportToPDF() {
    showAlert('سيتم تنفيذ تصدير PDF قريباً', 'info');
}

function exportToExcel() {
    showAlert('سيتم تنفيذ تصدير Excel قريباً', 'info');
}

function printReport() {
    window.print();
}

function scheduleReport() {
    const modal = new bootstrap.Modal(document.getElementById('scheduleReportModal'));
    modal.show();
}

function saveScheduledReport() {
    const reportData = {
        name: document.getElementById('reportName').value,
        frequency: document.getElementById('reportFrequency').value,
        email: document.getElementById('reportEmail').value,
        startDate: document.getElementById('scheduleStartDate').value
    };
    
    if (!reportData.name || !reportData.email || !reportData.startDate) {
        showAlert('يرجى ملء جميع الحقول المطلوبة', 'warning');
        return;
    }
    
    // Here you would typically send the data to the server
    showAlert('تم حفظ جدولة التقرير بنجاح', 'success');
    bootstrap.Modal.getInstance(document.getElementById('scheduleReportModal')).hide();
    document.getElementById('scheduleReportForm').reset();
}

// Utility functions
function showLoading(show) {
    // You can implement a loading indicator here
    if (show) {
        console.log('Loading...');
    } else {
        console.log('Loading complete');
    }
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
