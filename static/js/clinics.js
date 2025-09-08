// Clinic Management JavaScript
let clinicsData = [];
let specialistsData = [];
let appointmentsData = [];
let employeesData = [];

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    loadInitialData();
    setupEventListeners();
});

// Load initial data
async function loadInitialData() {
    try {
        await Promise.all([
            loadClinicsStats(),
            loadClinics(),
            loadRecentAppointments(),
            loadEmployees()
        ]);
    } catch (error) {
        console.error('Error loading initial data:', error);
        showAlert('حدث خطأ في تحميل البيانات', 'error');
    }
}

// Load clinic statistics
async function loadClinicsStats() {
    try {
        const response = await fetch('/api/clinics/stats', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const stats = await response.json();
            document.getElementById('totalClinics').textContent = stats.total_clinics || 0;
            document.getElementById('totalSpecialists').textContent = stats.total_specialists || 0;
            document.getElementById('todayAppointments').textContent = stats.today_appointments || 0;
            document.getElementById('activeSessions').textContent = stats.active_sessions || 0;
        }
    } catch (error) {
        console.error('Error loading stats:', error);
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
            displayClinics();
        }
    } catch (error) {
        console.error('Error loading clinics:', error);
    }
}

// Display clinics
function displayClinics() {
    const container = document.getElementById('clinicsContainer');
    container.innerHTML = '';
    
    clinicsData.forEach(clinic => {
        const clinicCard = createClinicCard(clinic);
        container.appendChild(clinicCard);
    });
}

// Create clinic card
function createClinicCard(clinic) {
    const col = document.createElement('div');
    col.className = 'col-lg-4 col-md-6';
    
    col.innerHTML = `
        <div class="clinic-card">
            <div class="card-header text-center" style="background-color: ${clinic.color}; color: white;">
                <i class="${clinic.icon} clinic-icon"></i>
                <h5>${clinic.clinic_name}</h5>
                <p class="mb-0">${clinic.description || ''}</p>
            </div>
            <div class="card-body">
                <div class="row text-center mb-3">
                    <div class="col-4">
                        <div class="stats-number text-primary">${clinic.specialists_count || 0}</div>
                        <div class="stats-label">أخصائي</div>
                    </div>
                    <div class="col-4">
                        <div class="stats-number text-success">${clinic.appointments_today || 0}</div>
                        <div class="stats-label">مواعيد اليوم</div>
                    </div>
                    <div class="col-4">
                        <div class="stats-number text-info">${clinic.sessions_count || 0}</div>
                        <div class="stats-label">جلسة</div>
                    </div>
                </div>
                
                <div class="mb-3">
                    <h6>الأخصائيون:</h6>
                    <div id="specialists-${clinic.id}">
                        <!-- Specialists will be loaded here -->
                    </div>
                </div>
                
                <div class="text-center">
                    <button class="btn btn-sm btn-outline-primary mx-1" onclick="viewClinicDetails(${clinic.id})">
                        <i class="fas fa-eye"></i> عرض التفاصيل
                    </button>
                    <button class="btn btn-sm btn-outline-success mx-1" onclick="bookAppointment(${clinic.id})">
                        <i class="fas fa-calendar-plus"></i> حجز موعد
                    </button>
                    <button class="btn btn-sm btn-outline-info mx-1" onclick="viewSessions(${clinic.id})">
                        <i class="fas fa-notes-medical"></i> الجلسات
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // Load specialists for this clinic
    loadClinicSpecialists(clinic.id);
    
    return col;
}

// Load specialists for a specific clinic
async function loadClinicSpecialists(clinicId) {
    try {
        const response = await fetch(`/api/clinic-specialists?clinic_id=${clinicId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const specialists = await response.json();
            const container = document.getElementById(`specialists-${clinicId}`);
            
            if (specialists.length === 0) {
                container.innerHTML = '<span class="text-muted">لا يوجد أخصائيون</span>';
            } else {
                container.innerHTML = specialists.map(specialist => 
                    `<span class="specialist-badge">${specialist.employee_name}</span>`
                ).join('');
            }
        }
    } catch (error) {
        console.error('Error loading specialists:', error);
    }
}

// Load recent appointments
async function loadRecentAppointments() {
    try {
        const response = await fetch('/api/clinic-appointments?limit=10', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const appointments = await response.json();
            displayRecentAppointments(appointments);
        }
    } catch (error) {
        console.error('Error loading appointments:', error);
    }
}

// Display recent appointments
function displayRecentAppointments(appointments) {
    const tbody = document.getElementById('recentAppointmentsTable');
    tbody.innerHTML = '';
    
    if (appointments.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">لا توجد مواعيد</td></tr>';
        return;
    }
    
    appointments.forEach(appointment => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${formatDate(appointment.appointment_date)}</td>
            <td>${formatTime(appointment.appointment_time)}</td>
            <td>${appointment.clinic_name}</td>
            <td>${appointment.specialist_name}</td>
            <td>${appointment.student_name}</td>
            <td><span class="appointment-status status-${appointment.status}">${getStatusText(appointment.status)}</span></td>
            <td>
                <button class="btn btn-sm btn-outline-primary" onclick="viewAppointment(${appointment.id})">
                    <i class="fas fa-eye"></i>
                </button>
                ${appointment.status === 'scheduled' ? 
                    `<button class="btn btn-sm btn-outline-success" onclick="startSession(${appointment.id})">
                        <i class="fas fa-play"></i>
                    </button>` : ''
                }
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Load employees
async function loadEmployees() {
    try {
        const response = await fetch('/api/employees', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            employeesData = await response.json();
            populateEmployeeSelect();
        }
    } catch (error) {
        console.error('Error loading employees:', error);
    }
}

// Populate employee select dropdown
function populateEmployeeSelect() {
    const select = document.getElementById('specialistEmployee');
    select.innerHTML = '<option value="">اختر الموظف</option>';
    
    employeesData.forEach(employee => {
        const option = document.createElement('option');
        option.value = employee.id;
        option.textContent = employee.full_name;
        select.appendChild(option);
    });
}

// Setup event listeners
function setupEventListeners() {
    // Filter appointments
    document.getElementById('filterClinic')?.addEventListener('change', filterAppointments);
    document.getElementById('filterDate')?.addEventListener('change', filterAppointments);
    document.getElementById('filterStatus')?.addEventListener('change', filterAppointments);
}

// Modal functions
function showAddClinicModal() {
    const modal = new bootstrap.Modal(document.getElementById('addClinicModal'));
    modal.show();
}

function showAddSpecialistModal() {
    populateClinicSelect();
    const modal = new bootstrap.Modal(document.getElementById('addSpecialistModal'));
    modal.show();
}

function showAppointmentsModal() {
    loadAllAppointments();
    const modal = new bootstrap.Modal(document.getElementById('appointmentsModal'));
    modal.show();
}

// Populate clinic select dropdown
function populateClinicSelect() {
    const select = document.getElementById('specialistClinic');
    select.innerHTML = '<option value="">اختر العيادة</option>';
    
    clinicsData.forEach(clinic => {
        const option = document.createElement('option');
        option.value = clinic.id;
        option.textContent = clinic.clinic_name;
        select.appendChild(option);
    });
}

// Add new clinic
async function addClinic() {
    const form = document.getElementById('addClinicForm');
    const formData = new FormData(form);
    
    const clinicData = {
        clinic_name: document.getElementById('clinicName').value,
        description: document.getElementById('clinicDescription').value,
        icon: document.getElementById('clinicIcon').value,
        color: document.getElementById('clinicColor').value
    };
    
    try {
        const response = await fetch('/api/clinic-types', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(clinicData)
        });
        
        if (response.ok) {
            showAlert('تم إضافة العيادة بنجاح', 'success');
            bootstrap.Modal.getInstance(document.getElementById('addClinicModal')).hide();
            form.reset();
            loadClinics();
            loadClinicsStats();
        } else {
            const error = await response.json();
            showAlert(error.message || 'حدث خطأ في إضافة العيادة', 'error');
        }
    } catch (error) {
        console.error('Error adding clinic:', error);
        showAlert('حدث خطأ في إضافة العيادة', 'error');
    }
}

// Add new specialist
async function addSpecialist() {
    const specialistData = {
        clinic_type_id: parseInt(document.getElementById('specialistClinic').value),
        employee_id: parseInt(document.getElementById('specialistEmployee').value),
        specialization: document.getElementById('specialization').value,
        license_number: document.getElementById('licenseNumber').value,
        experience_years: parseInt(document.getElementById('experienceYears').value) || 0,
        max_daily_appointments: parseInt(document.getElementById('maxAppointments').value) || 8,
        appointment_duration: parseInt(document.getElementById('appointmentDuration').value) || 30,
        qualifications: document.getElementById('qualifications').value
    };
    
    try {
        const response = await fetch('/api/clinic-specialists', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(specialistData)
        });
        
        if (response.ok) {
            showAlert('تم إضافة الأخصائي بنجاح', 'success');
            bootstrap.Modal.getInstance(document.getElementById('addSpecialistModal')).hide();
            document.getElementById('addSpecialistForm').reset();
            loadClinics();
            loadClinicsStats();
        } else {
            const error = await response.json();
            showAlert(error.message || 'حدث خطأ في إضافة الأخصائي', 'error');
        }
    } catch (error) {
        console.error('Error adding specialist:', error);
        showAlert('حدث خطأ في إضافة الأخصائي', 'error');
    }
}

// Load all appointments
async function loadAllAppointments() {
    try {
        const response = await fetch('/api/clinic-appointments', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            appointmentsData = await response.json();
            displayAppointments(appointmentsData);
            populateFilterOptions();
        }
    } catch (error) {
        console.error('Error loading appointments:', error);
    }
}

// Display appointments in modal
function displayAppointments(appointments) {
    const tbody = document.getElementById('appointmentsTable');
    tbody.innerHTML = '';
    
    if (appointments.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">لا توجد مواعيد</td></tr>';
        return;
    }
    
    appointments.forEach(appointment => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${formatDate(appointment.appointment_date)}</td>
            <td>${formatTime(appointment.appointment_time)}</td>
            <td>${appointment.clinic_name}</td>
            <td>${appointment.specialist_name}</td>
            <td>${appointment.student_name}</td>
            <td><span class="appointment-status status-${appointment.status}">${getStatusText(appointment.status)}</span></td>
            <td>
                <button class="btn btn-sm btn-outline-primary" onclick="viewAppointment(${appointment.id})" title="عرض التفاصيل">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn btn-sm btn-outline-warning" onclick="editAppointment(${appointment.id})" title="تعديل">
                    <i class="fas fa-edit"></i>
                </button>
                ${appointment.status === 'scheduled' ? 
                    `<button class="btn btn-sm btn-outline-success" onclick="startSession(${appointment.id})" title="بدء الجلسة">
                        <i class="fas fa-play"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="cancelAppointment(${appointment.id})" title="إلغاء">
                        <i class="fas fa-times"></i>
                    </button>` : ''
                }
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Populate filter options
function populateFilterOptions() {
    const clinicFilter = document.getElementById('filterClinic');
    clinicFilter.innerHTML = '<option value="">جميع العيادات</option>';
    
    const uniqueClinics = [...new Set(appointmentsData.map(app => app.clinic_name))];
    uniqueClinics.forEach(clinicName => {
        const option = document.createElement('option');
        option.value = clinicName;
        option.textContent = clinicName;
        clinicFilter.appendChild(option);
    });
}

// Filter appointments
function filterAppointments() {
    const clinicFilter = document.getElementById('filterClinic').value;
    const dateFilter = document.getElementById('filterDate').value;
    const statusFilter = document.getElementById('filterStatus').value;
    
    let filteredAppointments = appointmentsData;
    
    if (clinicFilter) {
        filteredAppointments = filteredAppointments.filter(app => app.clinic_name === clinicFilter);
    }
    
    if (dateFilter) {
        filteredAppointments = filteredAppointments.filter(app => app.appointment_date === dateFilter);
    }
    
    if (statusFilter) {
        filteredAppointments = filteredAppointments.filter(app => app.status === statusFilter);
    }
    
    displayAppointments(filteredAppointments);
}

// Utility functions
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-SA');
}

function formatTime(timeString) {
    return timeString.substring(0, 5);
}

function getStatusText(status) {
    const statusMap = {
        'scheduled': 'مجدول',
        'completed': 'مكتمل',
        'cancelled': 'ملغي',
        'no-show': 'لم يحضر'
    };
    return statusMap[status] || status;
}

function showAlert(message, type = 'info') {
    // Create alert element
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type === 'error' ? 'danger' : type} alert-dismissible fade show position-fixed`;
    alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(alertDiv);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.remove();
        }
    }, 5000);
}

// Placeholder functions for future implementation
function viewClinicDetails(clinicId) {
    showAlert('سيتم تنفيذ هذه الميزة قريباً', 'info');
}

function bookAppointment(clinicId) {
    showAlert('سيتم تنفيذ هذه الميزة قريباً', 'info');
}

function viewSessions(clinicId) {
    showAlert('سيتم تنفيذ هذه الميزة قريباً', 'info');
}

function viewAppointment(appointmentId) {
    showAlert('سيتم تنفيذ هذه الميزة قريباً', 'info');
}

function editAppointment(appointmentId) {
    showAlert('سيتم تنفيذ هذه الميزة قريباً', 'info');
}

function startSession(appointmentId) {
    showAlert('سيتم تنفيذ هذه الميزة قريباً', 'info');
}

function cancelAppointment(appointmentId) {
    if (confirm('هل أنت متأكد من إلغاء هذا الموعد؟')) {
        showAlert('سيتم تنفيذ هذه الميزة قريباً', 'info');
    }
}

function showNewAppointmentForm() {
    showAlert('سيتم تنفيذ هذه الميزة قريباً', 'info');
}

function showReportsModal() {
    showAlert('سيتم تنفيذ هذه الميزة قريباً', 'info');
}
