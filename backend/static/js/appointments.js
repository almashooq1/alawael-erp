// Appointment Management JavaScript
let currentStep = 1;
let appointmentData = {
    clinicType: null,
    specialist: null,
    student: null,
    date: null,
    time: null,
    type: 'consultation',
    priority: 'normal',
    reason: ''
};

let clinicsData = [];
let specialistsData = [];
let studentsData = [];
let appointmentsData = [];
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    loadInitialData();
    generateCalendar();
    setupEventListeners();
});

// Load initial data
async function loadInitialData() {
    try {
        await Promise.all([
            loadClinics(),
            loadAppointments(),
            loadAppointmentStats()
        ]);
        loadTodayAppointments();
    } catch (error) {
        console.error('Error loading initial data:', error);
        showAlert('حدث خطأ في تحميل البيانات', 'error');
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

// Load appointments
async function loadAppointments() {
    try {
        const response = await fetch('/api/clinic-appointments', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            appointmentsData = await response.json();
            displayAppointments();
        }
    } catch (error) {
        console.error('Error loading appointments:', error);
    }
}

// Load appointment statistics
async function loadAppointmentStats() {
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
    document.getElementById('totalAppointments').textContent = stats.total_appointments || 0;
    document.getElementById('completedAppointments').textContent = stats.completed_appointments || 0;
    document.getElementById('pendingAppointments').textContent = stats.pending_appointments || 0;
    document.getElementById('cancelledAppointments').textContent = stats.cancelled_appointments || 0;
}

// Generate calendar
function generateCalendar() {
    const calendarGrid = document.getElementById('calendarGrid');
    const monthNames = [
        'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
        'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
    ];
    
    document.getElementById('currentMonth').textContent = `${monthNames[currentMonth]} ${currentYear}`;
    
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    calendarGrid.innerHTML = '';
    
    // Add day headers
    const dayHeaders = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    dayHeaders.forEach(day => {
        const dayHeader = document.createElement('div');
        dayHeader.className = 'col text-center font-weight-bold mb-2';
        dayHeader.textContent = day;
        calendarGrid.appendChild(dayHeader);
    });
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
        const emptyDay = document.createElement('div');
        emptyDay.className = 'col calendar-day disabled';
        calendarGrid.appendChild(emptyDay);
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
        const dayElement = document.createElement('div');
        dayElement.className = 'col calendar-day';
        dayElement.innerHTML = `
            <div class="fw-bold">${day}</div>
            <div class="small" id="appointments-${currentYear}-${currentMonth + 1}-${day}">
                ${getAppointmentsForDay(currentYear, currentMonth + 1, day)}
            </div>
        `;
        dayElement.onclick = () => selectCalendarDate(currentYear, currentMonth + 1, day);
        calendarGrid.appendChild(dayElement);
    }
}

// Get appointments for a specific day
function getAppointmentsForDay(year, month, day) {
    const dateStr = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    const dayAppointments = appointmentsData.filter(app => app.appointment_date === dateStr);
    
    if (dayAppointments.length === 0) return '';
    
    return `<span class="badge bg-primary">${dayAppointments.length}</span>`;
}

// Select calendar date
function selectCalendarDate(year, month, day) {
    // Remove previous selection
    document.querySelectorAll('.calendar-day.selected').forEach(el => {
        el.classList.remove('selected');
    });
    
    // Add selection to clicked day
    event.target.closest('.calendar-day').classList.add('selected');
    
    // Load appointments for selected day
    const dateStr = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    loadAppointmentsForDate(dateStr);
}

// Load appointments for specific date
function loadAppointmentsForDate(date) {
    const dayAppointments = appointmentsData.filter(app => app.appointment_date === date);
    // Update the appointments table or display
    displayAppointments(dayAppointments);
}

// Navigate calendar
function previousMonth() {
    currentMonth--;
    if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
    }
    generateCalendar();
}

function nextMonth() {
    currentMonth++;
    if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
    }
    generateCalendar();
}

// Load today's appointments
function loadTodayAppointments() {
    const today = new Date().toISOString().split('T')[0];
    const todayAppointments = appointmentsData.filter(app => app.appointment_date === today);
    
    const container = document.getElementById('todayAppointmentsList');
    
    if (todayAppointments.length === 0) {
        container.innerHTML = '<p class="text-muted text-center">لا توجد مواعيد اليوم</p>';
        return;
    }
    
    container.innerHTML = todayAppointments.map(appointment => `
        <div class="d-flex justify-content-between align-items-center mb-2 p-2 border rounded">
            <div>
                <div class="fw-bold">${appointment.student_name}</div>
                <small class="text-muted">${appointment.clinic_name}</small>
            </div>
            <div class="text-end">
                <div class="fw-bold">${formatTime(appointment.appointment_time)}</div>
                <span class="appointment-status status-${appointment.status}">
                    ${getStatusText(appointment.status)}
                </span>
            </div>
        </div>
    `).join('');
}

// Display appointments
function displayAppointments(appointments = appointmentsData) {
    const tbody = document.getElementById('appointmentsTableBody');
    tbody.innerHTML = '';
    
    if (appointments.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center">لا توجد مواعيد</td></tr>';
        return;
    }
    
    appointments.forEach(appointment => {
        const row = document.createElement('tr');
        row.className = `priority-${appointment.priority}`;
        row.innerHTML = `
            <td>
                <div>${formatDate(appointment.appointment_date)}</div>
                <small class="text-muted">${formatTime(appointment.appointment_time)}</small>
            </td>
            <td>${appointment.clinic_name}</td>
            <td>${appointment.specialist_name}</td>
            <td>${appointment.student_name}</td>
            <td>${getAppointmentTypeText(appointment.appointment_type)}</td>
            <td>
                <span class="appointment-status status-${appointment.status}">
                    ${getStatusText(appointment.status)}
                </span>
            </td>
            <td>
                <span class="badge bg-${getPriorityColor(appointment.priority)}">
                    ${getPriorityText(appointment.priority)}
                </span>
            </td>
            <td>
                <button class="btn btn-sm btn-outline-primary" onclick="viewAppointmentDetails(${appointment.id})" title="عرض التفاصيل">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn btn-sm btn-outline-warning" onclick="editAppointment(${appointment.id})" title="تعديل">
                    <i class="fas fa-edit"></i>
                </button>
                ${appointment.status === 'scheduled' || appointment.status === 'confirmed' ? 
                    `<button class="btn btn-sm btn-outline-success" onclick="startSession(${appointment.id})" title="بدء الجلسة">
                        <i class="fas fa-play"></i>
                    </button>` : ''
                }
                <button class="btn btn-sm btn-outline-danger" onclick="cancelAppointment(${appointment.id})" title="إلغاء">
                    <i class="fas fa-times"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Populate clinic select dropdowns
function populateClinicSelects() {
    const selects = ['appointmentClinicType', 'filterClinicType'];
    
    selects.forEach(selectId => {
        const select = document.getElementById(selectId);
        if (select) {
            const currentValue = select.value;
            select.innerHTML = '<option value="">اختر العيادة</option>';
            
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

// Setup event listeners
function setupEventListeners() {
    // Filter event listeners
    document.getElementById('filterClinicType')?.addEventListener('change', filterAppointments);
    document.getElementById('filterStatus')?.addEventListener('change', filterAppointments);
    document.getElementById('filterDate')?.addEventListener('change', filterAppointments);
    
    // Set minimum date for appointment booking
    const appointmentDateInput = document.getElementById('appointmentDate');
    if (appointmentDateInput) {
        const today = new Date().toISOString().split('T')[0];
        appointmentDateInput.min = today;
    }
}

// Modal functions
function showNewAppointmentModal() {
    resetAppointmentForm();
    const modal = new bootstrap.Modal(document.getElementById('newAppointmentModal'));
    modal.show();
}

function resetAppointmentForm() {
    currentStep = 1;
    appointmentData = {
        clinicType: null,
        specialist: null,
        student: null,
        date: null,
        time: null,
        type: 'consultation',
        priority: 'normal',
        reason: ''
    };
    
    updateStepIndicator();
    showStep(1);
}

// Step navigation
function nextStep() {
    if (validateCurrentStep()) {
        if (currentStep < 4) {
            currentStep++;
            updateStepIndicator();
            showStep(currentStep);
        }
    }
}

function previousStep() {
    if (currentStep > 1) {
        currentStep--;
        updateStepIndicator();
        showStep(currentStep);
    }
}

function showStep(step) {
    // Hide all steps
    document.querySelectorAll('.appointment-step').forEach(el => {
        el.style.display = 'none';
    });
    
    // Show current step
    document.getElementById(`appointmentStep${step}`).style.display = 'block';
    
    // Update buttons
    document.getElementById('prevStepBtn').style.display = step > 1 ? 'inline-block' : 'none';
    document.getElementById('nextStepBtn').style.display = step < 4 ? 'inline-block' : 'none';
    document.getElementById('confirmAppointmentBtn').style.display = step === 4 ? 'inline-block' : 'none';
    
    // Load data for current step
    if (step === 4) {
        generateAppointmentSummary();
    }
}

function updateStepIndicator() {
    for (let i = 1; i <= 4; i++) {
        const stepEl = document.getElementById(`step${i}`);
        stepEl.classList.remove('active', 'completed');
        
        if (i < currentStep) {
            stepEl.classList.add('completed');
        } else if (i === currentStep) {
            stepEl.classList.add('active');
        }
    }
}

function validateCurrentStep() {
    switch (currentStep) {
        case 1:
            if (!appointmentData.clinicType || !appointmentData.specialist) {
                showAlert('يرجى اختيار العيادة والأخصائي', 'warning');
                return false;
            }
            break;
        case 2:
            if (!appointmentData.student) {
                showAlert('يرجى اختيار الطالب', 'warning');
                return false;
            }
            break;
        case 3:
            if (!appointmentData.date || !appointmentData.time) {
                showAlert('يرجى اختيار التاريخ والوقت', 'warning');
                return false;
            }
            break;
    }
    return true;
}

// Load specialists for appointment
async function loadSpecialistsForAppointment() {
    const clinicId = document.getElementById('appointmentClinicType').value;
    appointmentData.clinicType = clinicId;
    
    if (!clinicId) {
        document.getElementById('specialistsList').innerHTML = '';
        return;
    }
    
    try {
        const response = await fetch(`/api/clinic-specialists?clinic_id=${clinicId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const specialists = await response.json();
            displaySpecialistsList(specialists);
        }
    } catch (error) {
        console.error('Error loading specialists:', error);
    }
}

function displaySpecialistsList(specialists) {
    const container = document.getElementById('specialistsList');
    
    if (specialists.length === 0) {
        container.innerHTML = '<p class="text-muted">لا يوجد أخصائيون متاحون</p>';
        return;
    }
    
    container.innerHTML = specialists.map(specialist => `
        <div class="specialist-card" onclick="selectSpecialist(${specialist.id}, '${specialist.employee_name}')">
            <div class="d-flex justify-content-between align-items-center">
                <div>
                    <div class="fw-bold">${specialist.employee_name}</div>
                    <small class="text-muted">${specialist.specialization || 'أخصائي'}</small>
                </div>
                <div class="text-end">
                    <small class="text-muted">${specialist.experience_years || 0} سنوات خبرة</small>
                </div>
            </div>
        </div>
    `).join('');
}

function selectSpecialist(specialistId, specialistName) {
    // Remove previous selection
    document.querySelectorAll('.specialist-card.selected').forEach(el => {
        el.classList.remove('selected');
    });
    
    // Add selection to clicked specialist
    event.target.closest('.specialist-card').classList.add('selected');
    
    appointmentData.specialist = specialistId;
    appointmentData.specialistName = specialistName;
}

// Search students
async function searchStudents() {
    const searchTerm = document.getElementById('studentSearch').value;
    
    if (searchTerm.length < 2) {
        document.getElementById('studentsSearchResults').innerHTML = '';
        return;
    }
    
    try {
        const response = await fetch(`/api/students?search=${encodeURIComponent(searchTerm)}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const students = await response.json();
            displayStudentsSearchResults(students);
        }
    } catch (error) {
        console.error('Error searching students:', error);
    }
}

function displayStudentsSearchResults(students) {
    const container = document.getElementById('studentsSearchResults');
    
    if (students.length === 0) {
        container.innerHTML = '<p class="text-muted">لم يتم العثور على طلاب</p>';
        return;
    }
    
    container.innerHTML = students.slice(0, 10).map(student => `
        <div class="specialist-card" onclick="selectStudent(${student.id}, '${student.full_name}', '${student.student_id}')">
            <div class="d-flex justify-content-between align-items-center">
                <div>
                    <div class="fw-bold">${student.full_name}</div>
                    <small class="text-muted">رقم الطالب: ${student.student_id}</small>
                </div>
                <div class="text-end">
                    <small class="text-muted">${student.level_name || ''}</small>
                </div>
            </div>
        </div>
    `).join('');
}

function selectStudent(studentId, studentName, studentNumber) {
    appointmentData.student = studentId;
    appointmentData.studentName = studentName;
    appointmentData.studentNumber = studentNumber;
    
    document.getElementById('selectedStudent').innerHTML = `
        <div class="fw-bold">${studentName}</div>
        <small class="text-muted">رقم الطالب: ${studentNumber}</small>
    `;
    
    // Clear search results
    document.getElementById('studentsSearchResults').innerHTML = '';
    document.getElementById('studentSearch').value = '';
}

// Load available time slots
async function loadAvailableSlots() {
    const date = document.getElementById('appointmentDate').value;
    appointmentData.date = date;
    
    if (!date || !appointmentData.specialist) {
        return;
    }
    
    try {
        const response = await fetch(`/api/clinic-specialists/${appointmentData.specialist}/available-slots?date=${date}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const slots = await response.json();
            displayTimeSlots(slots);
        }
    } catch (error) {
        console.error('Error loading time slots:', error);
        // Generate default time slots as fallback
        generateDefaultTimeSlots();
    }
}

function generateDefaultTimeSlots() {
    const slots = [];
    for (let hour = 8; hour < 17; hour++) {
        for (let minute = 0; minute < 60; minute += 30) {
            const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
            slots.push({
                time: timeStr,
                available: Math.random() > 0.3 // Random availability for demo
            });
        }
    }
    displayTimeSlots(slots);
}

function displayTimeSlots(slots) {
    const container = document.getElementById('availableTimeSlots');
    
    container.innerHTML = slots.map(slot => `
        <div class="col-3 mb-2">
            <div class="time-slot ${slot.available ? 'available' : 'booked'}" 
                 ${slot.available ? `onclick="selectTimeSlot('${slot.time}')"` : ''}>
                ${slot.time}
            </div>
        </div>
    `).join('');
}

function selectTimeSlot(time) {
    // Remove previous selection
    document.querySelectorAll('.time-slot.selected').forEach(el => {
        el.classList.remove('selected');
    });
    
    // Add selection to clicked slot
    event.target.classList.add('selected');
    
    appointmentData.time = time;
}

// Generate appointment summary
function generateAppointmentSummary() {
    const clinicName = clinicsData.find(c => c.id == appointmentData.clinicType)?.clinic_name || '';
    
    document.getElementById('appointmentSummary').innerHTML = `
        <div class="row">
            <div class="col-md-6">
                <strong>العيادة:</strong> ${clinicName}<br>
                <strong>الأخصائي:</strong> ${appointmentData.specialistName}<br>
                <strong>الطالب:</strong> ${appointmentData.studentName}
            </div>
            <div class="col-md-6">
                <strong>التاريخ:</strong> ${formatDate(appointmentData.date)}<br>
                <strong>الوقت:</strong> ${appointmentData.time}<br>
                <strong>النوع:</strong> ${getAppointmentTypeText(document.getElementById('appointmentType').value)}
            </div>
        </div>
    `;
}

// Confirm appointment
async function confirmAppointment() {
    // Collect final form data
    appointmentData.type = document.getElementById('appointmentType').value;
    appointmentData.priority = document.getElementById('appointmentPriority').value;
    appointmentData.reason = document.getElementById('appointmentReason').value;
    
    const appointmentPayload = {
        clinic_type_id: parseInt(appointmentData.clinicType),
        specialist_id: parseInt(appointmentData.specialist),
        student_id: parseInt(appointmentData.student),
        appointment_date: appointmentData.date,
        appointment_time: appointmentData.time,
        appointment_type: appointmentData.type,
        priority: appointmentData.priority,
        reason: appointmentData.reason
    };
    
    try {
        const response = await fetch('/api/clinic-appointments', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(appointmentPayload)
        });
        
        if (response.ok) {
            showAlert('تم حجز الموعد بنجاح', 'success');
            bootstrap.Modal.getInstance(document.getElementById('newAppointmentModal')).hide();
            loadAppointments();
            loadTodayAppointments();
            generateCalendar();
        } else {
            const error = await response.json();
            showAlert(error.message || 'حدث خطأ في حجز الموعد', 'error');
        }
    } catch (error) {
        console.error('Error confirming appointment:', error);
        showAlert('حدث خطأ في حجز الموعد', 'error');
    }
}

// Filter appointments
function filterAppointments() {
    const clinicFilter = document.getElementById('filterClinicType').value;
    const statusFilter = document.getElementById('filterStatus').value;
    const dateFilter = document.getElementById('filterDate').value;
    
    let filteredAppointments = appointmentsData;
    
    if (clinicFilter) {
        filteredAppointments = filteredAppointments.filter(app => app.clinic_type_id == clinicFilter);
    }
    
    if (statusFilter) {
        filteredAppointments = filteredAppointments.filter(app => app.status === statusFilter);
    }
    
    if (dateFilter) {
        filteredAppointments = filteredAppointments.filter(app => app.appointment_date === dateFilter);
    }
    
    displayAppointments(filteredAppointments);
}

// Quick action functions
function showTodayAppointments() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('filterDate').value = today;
    filterAppointments();
}

function showUpcomingAppointments() {
    const today = new Date().toISOString().split('T')[0];
    const upcomingAppointments = appointmentsData.filter(app => 
        app.appointment_date >= today && (app.status === 'scheduled' || app.status === 'confirmed')
    );
    displayAppointments(upcomingAppointments);
}

function showAppointmentHistory() {
    const completedAppointments = appointmentsData.filter(app => 
        app.status === 'completed' || app.status === 'cancelled'
    );
    displayAppointments(completedAppointments);
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
        'confirmed': 'مؤكد',
        'completed': 'مكتمل',
        'cancelled': 'ملغي',
        'no-show': 'لم يحضر'
    };
    return statusMap[status] || status;
}

function getAppointmentTypeText(type) {
    const typeMap = {
        'consultation': 'استشارة',
        'follow-up': 'متابعة',
        'assessment': 'تقييم',
        'therapy': 'جلسة علاج'
    };
    return typeMap[type] || type;
}

function getPriorityText(priority) {
    const priorityMap = {
        'normal': 'عادية',
        'medium': 'متوسطة',
        'high': 'عالية'
    };
    return priorityMap[priority] || priority;
}

function getPriorityColor(priority) {
    const colorMap = {
        'normal': 'success',
        'medium': 'warning',
        'high': 'danger'
    };
    return colorMap[priority] || 'secondary';
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
function viewAppointmentDetails(appointmentId) {
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
