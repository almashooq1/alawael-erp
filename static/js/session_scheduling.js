// Session Scheduling and Calendar JavaScript
let calendar;
let currentUser = null;
let selectedTherapist = null;
let selectedDate = null;
let sessionData = {
    beneficiaries: [],
    programs: [],
    therapists: [],
    rooms: [],
    sessions: []
};

// Initialize the scheduling system
$(document).ready(function() {
    initializeSchedulingSystem();
});

function initializeSchedulingSystem() {
    // Get current user info
    getCurrentUser();
    
    // Load initial data
    loadBeneficiaries();
    loadPrograms();
    loadTherapists();
    loadRooms();
    
    // Initialize calendar
    initializeCalendar();
    
    // Load dashboard data
    loadDashboardStats();
    loadTodaySchedule();
    loadAvailableTimeSlots();
    
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

function initializeCalendar() {
    const calendarEl = document.getElementById('calendar');
    
    calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        locale: 'ar',
        direction: 'rtl',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek'
        },
        buttonText: {
            today: 'اليوم',
            month: 'شهر',
            week: 'أسبوع',
            day: 'يوم',
            list: 'قائمة'
        },
        height: 'auto',
        editable: true,
        droppable: true,
        selectable: true,
        selectMirror: true,
        dayMaxEvents: true,
        weekends: true,
        
        // Event sources
        events: function(info, successCallback, failureCallback) {
            loadCalendarEvents(info.startStr, info.endStr, successCallback, failureCallback);
        },
        
        // Event interactions
        eventClick: function(info) {
            showSessionDetails(info.event);
        },
        
        eventDrop: function(info) {
            updateSessionTime(info.event, info.delta);
        },
        
        eventResize: function(info) {
            updateSessionDuration(info.event, info.endDelta);
        },
        
        select: function(info) {
            openScheduleModal(info.startStr, info.endStr);
        },
        
        dateClick: function(info) {
            selectedDate = info.dateStr;
            loadAvailableTimeSlots(info.dateStr);
        },
        
        // Custom rendering
        eventContent: function(arg) {
            const event = arg.event;
            const props = event.extendedProps;
            
            let html = `
                <div class="fc-event-main-frame">
                    <div class="fc-event-title-container">
                        <div class="fc-event-title">${event.title}</div>
                    </div>
                    <div class="fc-event-time">${event.start.toLocaleTimeString('ar-SA', {hour: '2-digit', minute: '2-digit'})}</div>
                `;
            
            if (props.status === 'cancelled') {
                html += '<div class="fc-event-cancelled">ملغاة</div>';
            }
            
            if (props.hasConflict) {
                html += '<div class="conflict-indicator"></div>';
            }
            
            html += '</div>';
            
            return { html: html };
        }
    });
    
    calendar.render();
}

function loadCalendarEvents(startStr, endStr, successCallback, failureCallback) {
    const token = localStorage.getItem('token');
    if (!token) {
        failureCallback('No authentication token');
        return;
    }
    
    const params = new URLSearchParams({
        start_date: startStr,
        end_date: endStr
    });
    
    // Add filters
    const therapistFilter = $('#therapistFilter').val();
    const roomFilter = $('#roomFilter').val();
    const sessionTypeFilter = $('#sessionTypeFilter').val();
    const statusFilter = $('#statusFilter').val();
    
    if (therapistFilter) params.append('therapist_id', therapistFilter);
    if (roomFilter) params.append('room_id', roomFilter);
    if (sessionTypeFilter) params.append('session_type', sessionTypeFilter);
    if (statusFilter) params.append('status', statusFilter);
    
    $.ajax({
        url: `/api/scheduling/calendar/events?${params.toString()}`,
        method: 'GET',
        headers: {
            'Authorization': 'Bearer ' + token
        },
        success: function(response) {
            if (response.success) {
                successCallback(response.events);
            } else {
                failureCallback(response.message);
            }
        },
        error: function(xhr) {
            failureCallback('Error loading calendar events');
        }
    });
}

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
            if (response.success) {
                sessionData.beneficiaries = response.beneficiaries;
                populateBeneficiarySelect();
            }
        }
    });
}

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
            if (response.success) {
                sessionData.programs = response.programs;
                populateProgramSelect();
            }
        }
    });
}

function loadTherapists() {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    $.ajax({
        url: '/api/users',
        method: 'GET',
        headers: {
            'Authorization': 'Bearer ' + token
        },
        data: { role: 'therapist' },
        success: function(response) {
            if (response.success) {
                sessionData.therapists = response.users;
                populateTherapistSelects();
                displayTherapistList();
            }
        }
    });
}

function loadRooms() {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    $.ajax({
        url: '/api/scheduling/rooms',
        method: 'GET',
        headers: {
            'Authorization': 'Bearer ' + token
        },
        success: function(response) {
            if (response.success) {
                sessionData.rooms = response.rooms;
                populateRoomSelects();
                displayRoomStatus();
            }
        }
    });
}

function populateBeneficiarySelect() {
    const select = $('#beneficiarySelect');
    select.empty().append('<option value="">اختر المستفيد</option>');
    
    sessionData.beneficiaries.forEach(beneficiary => {
        select.append(`<option value="${beneficiary.id}">${beneficiary.first_name} ${beneficiary.last_name}</option>`);
    });
}

function populateProgramSelect() {
    const select = $('#programSelect');
    select.empty().append('<option value="">اختر البرنامج</option>');
    
    sessionData.programs.forEach(program => {
        select.append(`<option value="${program.id}">${program.name}</option>`);
    });
}

function populateTherapistSelects() {
    const selects = ['#therapistSelect', '#assistantTherapistSelect', '#therapistFilter'];
    
    selects.forEach(selector => {
        const select = $(selector);
        const placeholder = selector === '#therapistFilter' ? 'جميع المعالجين' : 
                          selector === '#assistantTherapistSelect' ? 'اختر المعالج المساعد' : 'اختر المعالج';
        
        select.empty().append(`<option value="">${placeholder}</option>`);
        
        sessionData.therapists.forEach(therapist => {
            const name = therapist.full_name || therapist.username;
            select.append(`<option value="${therapist.id}">${name}</option>`);
        });
    });
}

function populateRoomSelects() {
    const selects = ['#roomSelect', '#roomFilter'];
    
    selects.forEach(selector => {
        const select = $(selector);
        const placeholder = selector === '#roomFilter' ? 'جميع الغرف' : 'اختر الغرفة';
        
        select.empty().append(`<option value="">${placeholder}</option>`);
        
        sessionData.rooms.forEach(room => {
            select.append(`<option value="${room.id}">${room.name} (${room.room_code})</option>`);
        });
    });
}

function displayTherapistList() {
    const container = $('#therapistList');
    container.empty();
    
    sessionData.therapists.forEach(therapist => {
        const name = therapist.full_name || therapist.username;
        const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2);
        
        const item = `
            <div class="therapist-item" onclick="selectTherapist(${therapist.id})">
                <div class="therapist-avatar">${initials}</div>
                <div>
                    <div class="fw-bold">${name}</div>
                    <small class="text-muted">متاح</small>
                </div>
            </div>
        `;
        container.append(item);
    });
}

function displayRoomStatus() {
    const container = $('#roomStatus');
    container.empty();
    
    sessionData.rooms.forEach(room => {
        const statusClass = Math.random() > 0.5 ? 'available' : 'occupied';
        const statusText = statusClass === 'available' ? 'متاحة' : 'محجوزة';
        
        const card = `
            <div class="room-card ${statusClass}" onclick="selectRoom(${room.id})">
                <div class="fw-bold">${room.name}</div>
                <small class="text-muted">${room.room_code}</small>
                <div class="mt-1">
                    <span class="badge bg-${statusClass === 'available' ? 'success' : 'danger'}">${statusText}</span>
                </div>
            </div>
        `;
        container.append(card);
    });
}

function loadDashboardStats() {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    // Mock statistics for now
    const stats = [
        { label: 'جلسات اليوم', value: 12, icon: 'fas fa-calendar-day', color: '#007bff' },
        { label: 'جلسات الأسبوع', value: 45, icon: 'fas fa-calendar-week', color: '#28a745' },
        { label: 'معدل الحضور', value: '85%', icon: 'fas fa-chart-line', color: '#17a2b8' },
        { label: 'الغرف المتاحة', value: 8, icon: 'fas fa-door-open', color: '#ffc107' },
        { label: 'المعالجون النشطون', value: 15, icon: 'fas fa-user-md', color: '#6f42c1' },
        { label: 'التعارضات', value: 2, icon: 'fas fa-exclamation-triangle', color: '#dc3545' }
    ];
    
    const container = $('#statsRow');
    container.empty();
    
    stats.forEach(stat => {
        const card = `
            <div class="stat-card">
                <div class="stat-number" style="color: ${stat.color}">${stat.value}</div>
                <div class="stat-label">
                    <i class="${stat.icon} me-2"></i>${stat.label}
                </div>
            </div>
        `;
        container.append(card);
    });
    
    // Update quick action counts
    $('#todaySessionsCount').text('12 جلسة');
    $('#conflictsCount').text('2 تعارض');
    $('#availableRoomsCount').text('8 غرف');
    $('#pendingCount').text('5 جلسات');
}

function loadTodaySchedule() {
    const container = $('#todaySchedule');
    container.empty();
    
    // Mock today's schedule
    const todaySessions = [
        { time: '09:00', patient: 'أحمد محمد', therapist: 'د. سارة', room: 'غرفة 1', status: 'confirmed' },
        { time: '10:00', patient: 'فاطمة علي', therapist: 'د. محمد', room: 'غرفة 2', status: 'in_progress' },
        { time: '11:00', patient: 'عبدالله سالم', therapist: 'د. نورا', room: 'غرفة 3', status: 'draft' }
    ];
    
    todaySessions.forEach(session => {
        const statusColors = {
            'draft': 'secondary',
            'confirmed': 'primary',
            'in_progress': 'warning',
            'completed': 'success'
        };
        
        const item = `
            <div class="d-flex justify-content-between align-items-center mb-2 p-2 border rounded">
                <div>
                    <div class="fw-bold">${session.time}</div>
                    <small class="text-muted">${session.patient}</small>
                </div>
                <span class="badge bg-${statusColors[session.status]}">${session.room}</span>
            </div>
        `;
        container.append(item);
    });
}

function loadAvailableTimeSlots(date = null) {
    const container = $('#availableTimeSlots');
    container.empty();
    
    // Mock available time slots
    const timeSlots = [
        { time: '08:00', available: true },
        { time: '09:00', available: false },
        { time: '10:00', available: false },
        { time: '11:00', available: true },
        { time: '12:00', available: true },
        { time: '13:00', available: false },
        { time: '14:00', available: true },
        { time: '15:00', available: true },
        { time: '16:00', available: false }
    ];
    
    timeSlots.forEach(slot => {
        const slotClass = slot.available ? 'available' : 'occupied';
        const slotText = slot.available ? 'متاح' : 'محجوز';
        
        const item = `
            <div class="time-slot ${slotClass}" onclick="${slot.available ? `selectTimeSlot('${slot.time}')` : ''}">
                <div class="d-flex justify-content-between align-items-center">
                    <span>${slot.time}</span>
                    <small class="text-muted">${slotText}</small>
                </div>
            </div>
        `;
        container.append(item);
    });
}

function setupEventListeners() {
    // Form validation
    $('#scheduleSessionForm').on('submit', function(e) {
        e.preventDefault();
        saveSession();
    });
    
    // Real-time conflict checking
    $('#sessionDate, #sessionStartTime, #sessionDuration, #therapistSelect, #roomSelect').on('change', function() {
        if ($('#sessionDate').val() && $('#sessionStartTime').val() && $('#therapistSelect').val()) {
            checkConflicts();
        }
    });
}

// Modal functions
function openScheduleModal(startDate = null, endDate = null) {
    if (startDate) {
        $('#sessionDate').val(startDate.split('T')[0]);
        if (startDate.includes('T')) {
            $('#sessionStartTime').val(startDate.split('T')[1].substring(0, 5));
        }
    }
    
    $('#scheduleSessionModal').modal('show');
}

function openBulkScheduleModal() {
    $('#bulkScheduleModal').modal('show');
}

function checkConflicts() {
    const formData = {
        beneficiary_id: $('#beneficiarySelect').val(),
        therapist_id: $('#therapistSelect').val(),
        room_id: $('#roomSelect').val(),
        scheduled_date: $('#sessionDate').val(),
        scheduled_start_time: $('#sessionStartTime').val(),
        duration_minutes: $('#sessionDuration').val()
    };
    
    if (!formData.scheduled_date || !formData.scheduled_start_time || !formData.therapist_id) {
        $('#conflictWarnings').hide();
        return;
    }
    
    const token = localStorage.getItem('token');
    if (!token) return;
    
    $.ajax({
        url: '/api/scheduling/check-conflicts',
        method: 'POST',
        headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json'
        },
        data: JSON.stringify(formData),
        success: function(response) {
            if (response.conflicts && response.conflicts.length > 0) {
                displayConflictWarnings(response.conflicts);
            } else {
                $('#conflictWarnings').hide();
            }
        },
        error: function() {
            console.log('Error checking conflicts');
        }
    });
}

function displayConflictWarnings(conflicts) {
    const conflictList = $('#conflictList');
    conflictList.empty();
    
    conflicts.forEach(conflict => {
        conflictList.append(`<li>${conflict.message}</li>`);
    });
    
    $('#conflictWarnings').show();
}

function saveSession() {
    const formData = {
        beneficiary_id: $('#beneficiarySelect').val(),
        program_id: $('#programSelect').val(),
        therapist_id: $('#therapistSelect').val(),
        assistant_therapist_id: $('#assistantTherapistSelect').val() || null,
        scheduled_date: $('#sessionDate').val(),
        scheduled_start_time: $('#sessionStartTime').val(),
        duration_minutes: parseInt($('#sessionDuration').val()),
        room_id: $('#roomSelect').val() || null,
        session_type: $('#sessionType').val(),
        session_objectives: $('#sessionObjectives').val().split('\n').filter(obj => obj.trim()),
        preparation_notes: $('#preparationNotes').val(),
        recurrence_type: $('#recurrenceType').val(),
        recurrence_end_date: $('#recurrenceEndDate').val() || null
    };
    
    // Validate required fields
    if (!formData.beneficiary_id || !formData.program_id || !formData.therapist_id || 
        !formData.scheduled_date || !formData.scheduled_start_time) {
        showAlert('يرجى ملء جميع الحقول المطلوبة', 'warning');
        return;
    }
    
    const token = localStorage.getItem('token');
    if (!token) return;
    
    $.ajax({
        url: '/api/scheduling/sessions',
        method: 'POST',
        headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json'
        },
        data: JSON.stringify(formData),
        success: function(response) {
            if (response.success) {
                showAlert('تم حفظ الجلسة بنجاح', 'success');
                $('#scheduleSessionModal').modal('hide');
                $('#scheduleSessionForm')[0].reset();
                calendar.refetchEvents();
                loadDashboardStats();
                loadTodaySchedule();
            } else {
                if (response.conflicts) {
                    displayConflictWarnings(response.conflicts);
                } else {
                    showAlert(response.message || 'حدث خطأ في حفظ الجلسة', 'danger');
                }
            }
        },
        error: function(xhr) {
            const response = xhr.responseJSON;
            if (response && response.conflicts) {
                displayConflictWarnings(response.conflicts);
            } else {
                showAlert('حدث خطأ في حفظ الجلسة', 'danger');
            }
        }
    });
}

// Calendar interaction functions
function showSessionDetails(event) {
    const sessionId = event.extendedProps.session_id;
    
    const detailsHtml = `
        <div class="mb-3">
            <h6>معلومات الجلسة</h6>
            <p><strong>المستفيد:</strong> ${event.extendedProps.beneficiary_name}</p>
            <p><strong>البرنامج:</strong> ${event.extendedProps.program_name}</p>
            <p><strong>المعالج:</strong> ${event.extendedProps.therapist_name}</p>
            <p><strong>الغرفة:</strong> ${event.extendedProps.room_name}</p>
            <p><strong>الوقت:</strong> ${event.start.toLocaleString('ar-SA')}</p>
            <p><strong>الحالة:</strong> ${getStatusLabel(event.extendedProps.status)}</p>
        </div>
        <div class="d-grid gap-2">
            <button class="btn btn-primary" onclick="editSession(${sessionId})">
                <i class="fas fa-edit me-2"></i>تعديل الجلسة
            </button>
            <button class="btn btn-success" onclick="startSession(${sessionId})">
                <i class="fas fa-play me-2"></i>بدء الجلسة
            </button>
            <button class="btn btn-warning" onclick="rescheduleSession(${sessionId})">
                <i class="fas fa-calendar-alt me-2"></i>إعادة جدولة
            </button>
            <button class="btn btn-danger" onclick="cancelSession(${sessionId})">
                <i class="fas fa-times me-2"></i>إلغاء الجلسة
            </button>
        </div>
    `;
    
    $('#sessionPanelContent').html(detailsHtml);
    $('#sessionDetailsPanel').addClass('open');
}

function closeSessionPanel() {
    $('#sessionDetailsPanel').removeClass('open');
}

function updateSessionTime(event, delta) {
    // Handle drag and drop time changes
    const sessionId = event.extendedProps.session_id;
    const newStart = event.start;
    
    // Update session time via API
    console.log(`Moving session ${sessionId} to ${newStart}`);
}

function updateSessionDuration(event, delta) {
    // Handle resize duration changes
    const sessionId = event.extendedProps.session_id;
    const newEnd = event.end;
    
    // Update session duration via API
    console.log(`Resizing session ${sessionId} to end at ${newEnd}`);
}

// Filter functions
function filterCalendar() {
    calendar.refetchEvents();
}

function selectTherapist(therapistId) {
    selectedTherapist = therapistId;
    $('.therapist-item').removeClass('active');
    $(`.therapist-item[onclick="selectTherapist(${therapistId})"]`).addClass('active');
    
    $('#therapistFilter').val(therapistId);
    filterCalendar();
}

function selectRoom(roomId) {
    $('#roomFilter').val(roomId);
    filterCalendar();
}

function selectTimeSlot(time) {
    $('#sessionStartTime').val(time);
    if (selectedDate) {
        $('#sessionDate').val(selectedDate);
    }
    openScheduleModal();
}

// Quick action functions
function showTodaySessions() {
    calendar.changeView('timeGridDay');
    calendar.gotoDate(new Date());
}

function showConflicts() {
    // Implementation for showing conflicts
    showAlert('عرض التعارضات قيد التطوير', 'info');
}

function showAvailableRooms() {
    // Implementation for showing available rooms
    showAlert('عرض الغرف المتاحة قيد التطوير', 'info');
}

function showPendingConfirmations() {
    // Implementation for showing pending confirmations
    showAlert('عرض الجلسات المعلقة قيد التطوير', 'info');
}

function optimizeSchedule() {
    showAlert('تحسين الجدولة قيد التطوير', 'info');
}

// Session management functions
function editSession(sessionId) {
    // Implementation for editing session
    showAlert('تعديل الجلسة قيد التطوير', 'info');
}

function startSession(sessionId) {
    // Implementation for starting session
    showAlert('بدء الجلسة قيد التطوير', 'info');
}

function rescheduleSession(sessionId) {
    // Implementation for rescheduling session
    showAlert('إعادة الجدولة قيد التطوير', 'info');
}

function cancelSession(sessionId) {
    if (confirm('هل أنت متأكد من إلغاء هذه الجلسة؟')) {
        const token = localStorage.getItem('token');
        if (!token) return;
        
        $.ajax({
            url: `/api/scheduling/sessions/${sessionId}/cancel`,
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            },
            data: JSON.stringify({
                cancellation_reason: 'إلغاء من التقويم'
            }),
            success: function(response) {
                if (response.success) {
                    showAlert('تم إلغاء الجلسة بنجاح', 'success');
                    calendar.refetchEvents();
                    closeSessionPanel();
                } else {
                    showAlert(response.message || 'حدث خطأ في إلغاء الجلسة', 'danger');
                }
            },
            error: function() {
                showAlert('حدث خطأ في إلغاء الجلسة', 'danger');
            }
        });
    }
}

// Utility functions
function toggleRecurrenceSettings() {
    const recurrenceType = $('#recurrenceType').val();
    if (recurrenceType === 'none') {
        $('#recurrenceEndDiv').hide();
    } else {
        $('#recurrenceEndDiv').show();
    }
}

function getStatusLabel(status) {
    const labels = {
        'draft': 'مسودة',
        'confirmed': 'مؤكدة',
        'in_progress': 'قيد التنفيذ',
        'completed': 'مكتملة',
        'cancelled': 'ملغاة',
        'rescheduled': 'معاد جدولتها',
        'no_show': 'لم يحضر'
    };
    return labels[status] || status;
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
