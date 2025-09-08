/**
 * نظام إدارة المواعيد والتقويم
 * Appointments and Calendar Management System
 */

class AppointmentManager {
    constructor() {
        this.calendar = null;
        this.currentAppointment = null;
        this.currentPage = 1;
        this.init();
    }

    init() {
        this.initCalendar();
        this.loadStats();
        this.loadAppointments();
        this.setupEventListeners();
        this.loadUsers();
    }

    // تهيئة التقويم
    initCalendar() {
        const calendarEl = document.getElementById('fullCalendar');
        
        this.calendar = new FullCalendar.Calendar(calendarEl, {
            locale: 'ar',
            direction: 'rtl',
            initialView: 'dayGridMonth',
            headerToolbar: {
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,timeGridDay'
            },
            buttonText: {
                today: 'اليوم',
                month: 'شهر',
                week: 'أسبوع',
                day: 'يوم'
            },
            events: (info, successCallback, failureCallback) => {
                this.loadCalendarEvents(info.start, info.end, successCallback, failureCallback);
            },
            eventClick: (info) => {
                this.showAppointmentDetails(info.event.id);
            },
            dateClick: (info) => {
                this.showAddModal(info.date);
            },
            eventDidMount: (info) => {
                // تخصيص ألوان الأحداث حسب النوع والحالة
                const event = info.event;
                const status = event.extendedProps.status;
                const priority = event.extendedProps.priority;
                
                let backgroundColor = '#667eea';
                if (status === 'completed') backgroundColor = '#4caf50';
                else if (status === 'cancelled') backgroundColor = '#f44336';
                else if (status === 'in_progress') backgroundColor = '#ff9800';
                else if (priority === 'urgent') backgroundColor = '#e91e63';
                
                info.el.style.backgroundColor = backgroundColor;
            }
        });
        
        this.calendar.render();
    }

    // تحميل أحداث التقويم
    async loadCalendarEvents(start, end, successCallback, failureCallback) {
        try {
            const startDate = start.toISOString().split('T')[0];
            const endDate = end.toISOString().split('T')[0];
            
            const response = await fetch(`/api/appointments/?start_date=${startDate}&end_date=${endDate}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                const events = data.appointments.map(appointment => ({
                    id: appointment.id,
                    title: appointment.title,
                    start: appointment.start_datetime,
                    end: appointment.end_datetime,
                    extendedProps: {
                        status: appointment.status,
                        priority: appointment.priority,
                        type: appointment.type,
                        location: appointment.location
                    }
                }));
                successCallback(events);
            } else {
                failureCallback('خطأ في تحميل المواعيد');
            }
        } catch (error) {
            console.error('Error loading calendar events:', error);
            failureCallback(error.message);
        }
    }

    // تحميل الإحصائيات
    async loadStats() {
        try {
            const response = await fetch('/api/appointments/stats', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                const stats = data.stats;
                
                document.getElementById('todayAppointments').textContent = stats.today_appointments;
                document.getElementById('upcomingAppointments').textContent = stats.upcoming_appointments;
                document.getElementById('completedThisMonth').textContent = stats.completed_this_month;
                document.getElementById('unresolvedConflicts').textContent = stats.unresolved_conflicts;
            }
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    }

    // تحميل قائمة المواعيد
    async loadAppointments(page = 1) {
        try {
            const status = document.getElementById('statusFilter')?.value || '';
            const type = document.getElementById('typeFilter')?.value || '';
            const startDate = document.getElementById('startDateFilter')?.value || '';
            const endDate = document.getElementById('endDateFilter')?.value || '';
            
            let url = `/api/appointments/?page=${page}&per_page=10`;
            if (status) url += `&status=${status}`;
            if (type) url += `&type=${type}`;
            if (startDate) url += `&start_date=${startDate}`;
            if (endDate) url += `&end_date=${endDate}`;
            
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                this.renderAppointmentsList(data.appointments);
                this.renderPagination(data.pagination);
            }
        } catch (error) {
            console.error('Error loading appointments:', error);
        }
    }

    // عرض قائمة المواعيد
    renderAppointmentsList(appointments) {
        const container = document.getElementById('appointmentsList');
        
        if (appointments.length === 0) {
            container.innerHTML = '<div class="text-center text-muted py-4">لا توجد مواعيد</div>';
            return;
        }
        
        container.innerHTML = appointments.map(appointment => `
            <div class="appointment-card priority-${appointment.priority}" onclick="appointmentManager.showAppointmentDetails(${appointment.id})">
                <div class="row align-items-center">
                    <div class="col-md-6">
                        <h6 class="mb-1">${appointment.title}</h6>
                        <p class="text-muted mb-1">${appointment.description || 'لا يوجد وصف'}</p>
                        <small class="text-muted">
                            <i class="fas fa-calendar me-1"></i>
                            ${new Date(appointment.start_datetime).toLocaleDateString('ar-SA')}
                            ${new Date(appointment.start_datetime).toLocaleTimeString('ar-SA', {hour: '2-digit', minute: '2-digit'})}
                        </small>
                    </div>
                    <div class="col-md-3">
                        <span class="appointment-status status-${appointment.status}">
                            ${this.getStatusText(appointment.status)}
                        </span>
                        <br>
                        <small class="text-muted">${this.getTypeText(appointment.type)}</small>
                    </div>
                    <div class="col-md-3 text-end">
                        ${appointment.location ? `<small class="text-muted"><i class="fas fa-map-marker-alt me-1"></i>${appointment.location}</small><br>` : ''}
                        ${appointment.therapist ? `<small class="text-muted">${appointment.therapist.name}</small>` : ''}
                    </div>
                </div>
            </div>
        `).join('');
    }

    // عرض تفاصيل الموعد
    async showAppointmentDetails(appointmentId) {
        try {
            const response = await fetch(`/api/appointments/${appointmentId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                const appointment = data.appointment;
                this.currentAppointment = appointment;
                
                const content = document.getElementById('appointmentDetailsContent');
                content.innerHTML = `
                    <div class="row">
                        <div class="col-md-6">
                            <h6>معلومات أساسية</h6>
                            <table class="table table-sm">
                                <tr><td><strong>العنوان:</strong></td><td>${appointment.title}</td></tr>
                                <tr><td><strong>النوع:</strong></td><td>${this.getTypeText(appointment.type)}</td></tr>
                                <tr><td><strong>الحالة:</strong></td><td><span class="appointment-status status-${appointment.status}">${this.getStatusText(appointment.status)}</span></td></tr>
                                <tr><td><strong>الأولوية:</strong></td><td>${this.getPriorityText(appointment.priority)}</td></tr>
                                <tr><td><strong>التاريخ:</strong></td><td>${new Date(appointment.start_datetime).toLocaleDateString('ar-SA')}</td></tr>
                                <tr><td><strong>الوقت:</strong></td><td>${new Date(appointment.start_datetime).toLocaleTimeString('ar-SA', {hour: '2-digit', minute: '2-digit'})} - ${new Date(appointment.end_datetime).toLocaleTimeString('ar-SA', {hour: '2-digit', minute: '2-digit'})}</td></tr>
                                <tr><td><strong>المدة:</strong></td><td>${appointment.duration_minutes} دقيقة</td></tr>
                            </table>
                        </div>
                        <div class="col-md-6">
                            <h6>تفاصيل إضافية</h6>
                            <table class="table table-sm">
                                <tr><td><strong>المنظم:</strong></td><td>${appointment.organizer?.name || 'غير محدد'}</td></tr>
                                <tr><td><strong>الأخصائي:</strong></td><td>${appointment.therapist?.name || 'غير محدد'}</td></tr>
                                <tr><td><strong>الموقع:</strong></td><td>${appointment.location || 'غير محدد'}</td></tr>
                                <tr><td><strong>الغرفة:</strong></td><td>${appointment.room_number || 'غير محدد'}</td></tr>
                                <tr><td><strong>التكلفة:</strong></td><td>${appointment.cost ? appointment.cost + ' ريال' : 'غير محدد'}</td></tr>
                            </table>
                        </div>
                    </div>
                    
                    ${appointment.description ? `
                        <div class="mt-3">
                            <h6>الوصف</h6>
                            <p>${appointment.description}</p>
                        </div>
                    ` : ''}
                    
                    ${appointment.notes ? `
                        <div class="mt-3">
                            <h6>ملاحظات</h6>
                            <p>${appointment.notes}</p>
                        </div>
                    ` : ''}
                    
                    ${appointment.reminders && appointment.reminders.length > 0 ? `
                        <div class="mt-3">
                            <h6>التذكيرات</h6>
                            <div class="row">
                                ${appointment.reminders.map(reminder => `
                                    <div class="col-md-4 mb-2">
                                        <div class="reminder-item">
                                            <small>
                                                <i class="fas fa-bell me-1"></i>
                                                ${this.getReminderTypeText(reminder.type)} - 
                                                ${reminder.minutes_before} دقيقة قبل الموعد
                                                ${reminder.is_sent ? '<span class="text-success">(تم الإرسال)</span>' : ''}
                                            </small>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                `;
                
                const modal = new bootstrap.Modal(document.getElementById('appointmentDetailsModal'));
                modal.show();
            }
        } catch (error) {
            console.error('Error loading appointment details:', error);
            this.showAlert('خطأ في تحميل تفاصيل الموعد', 'danger');
        }
    }

    // إظهار نموذج إضافة موعد
    showAddModal(selectedDate = null) {
        this.currentAppointment = null;
        document.getElementById('appointmentModalTitle').textContent = 'موعد جديد';
        document.getElementById('appointmentForm').reset();
        
        if (selectedDate) {
            const dateStr = selectedDate.toISOString().slice(0, 16);
            document.getElementById('appointmentStartDateTime').value = dateStr;
            
            // تعيين وقت النهاية بعد ساعة
            const endDate = new Date(selectedDate);
            endDate.setHours(endDate.getHours() + 1);
            document.getElementById('appointmentEndDateTime').value = endDate.toISOString().slice(0, 16);
        }
        
        const modal = new bootstrap.Modal(document.getElementById('appointmentModal'));
        modal.show();
    }

    // حفظ الموعد
    async saveAppointment() {
        const form = document.getElementById('appointmentForm');
        const formData = new FormData(form);
        
        const appointmentData = {
            title: document.getElementById('appointmentTitle').value,
            description: document.getElementById('appointmentDescription').value,
            appointment_type: document.getElementById('appointmentType').value,
            start_datetime: document.getElementById('appointmentStartDateTime').value,
            end_datetime: document.getElementById('appointmentEndDateTime').value,
            therapist_id: document.getElementById('appointmentTherapist').value || null,
            beneficiary_id: document.getElementById('appointmentBeneficiary').value || null,
            location: document.getElementById('appointmentLocation').value,
            room_number: document.getElementById('appointmentRoom').value,
            priority: document.getElementById('appointmentPriority').value,
            notes: document.getElementById('appointmentNotes').value,
            cost: document.getElementById('appointmentCost').value || null,
            is_recurring: document.getElementById('isRecurring').checked,
            ignore_conflicts: document.getElementById('ignoreConflicts')?.checked || false
        };
        
        // إضافة بيانات التكرار
        if (appointmentData.is_recurring) {
            appointmentData.recurrence_type = document.getElementById('recurrenceType').value;
            appointmentData.recurrence_end_date = document.getElementById('recurrenceEndDate').value;
        }
        
        // إضافة التذكيرات
        const reminders = [];
        document.querySelectorAll('#remindersList .reminder-item').forEach(item => {
            const type = item.querySelector('.reminder-type').value;
            const minutes = parseInt(item.querySelector('.reminder-minutes').value);
            if (type && minutes) {
                reminders.push({ type, minutes_before: minutes });
            }
        });
        appointmentData.reminders = reminders;
        
        try {
            const url = this.currentAppointment ? 
                `/api/appointments/${this.currentAppointment.id}` : 
                '/api/appointments/';
            const method = this.currentAppointment ? 'PUT' : 'POST';
            
            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(appointmentData)
            });
            
            const data = await response.json();
            
            if (response.ok) {
                this.showAlert(this.currentAppointment ? 'تم تحديث الموعد بنجاح' : 'تم إنشاء الموعد بنجاح', 'success');
                bootstrap.Modal.getInstance(document.getElementById('appointmentModal')).hide();
                this.calendar.refetchEvents();
                this.loadAppointments();
                this.loadStats();
            } else if (response.status === 409) {
                // عرض التعارضات
                this.showConflicts(data.conflicts);
            } else {
                this.showAlert(data.error || 'خطأ في حفظ الموعد', 'danger');
            }
        } catch (error) {
            console.error('Error saving appointment:', error);
            this.showAlert('خطأ في حفظ الموعد', 'danger');
        }
    }

    // عرض التعارضات
    showConflicts(conflicts) {
        const alertDiv = document.getElementById('conflictsAlert');
        const conflictsList = alertDiv.querySelector('#conflictsList');
        
        conflictsList.innerHTML = conflicts.map(conflict => `
            <div class="mb-2">
                <strong>تعارض مع:</strong> ${conflict.conflicting_title}<br>
                <small>الوقت: ${new Date(conflict.conflict_start).toLocaleString('ar-SA')} - ${new Date(conflict.conflict_end).toLocaleString('ar-SA')}</small>
            </div>
        `).join('');
        
        alertDiv.style.display = 'block';
    }

    // إضافة تذكير
    addReminder() {
        const remindersList = document.getElementById('remindersList');
        const reminderItem = document.createElement('div');
        reminderItem.className = 'reminder-item';
        reminderItem.innerHTML = `
            <div class="row">
                <div class="col-md-4">
                    <select class="form-select reminder-type">
                        <option value="email">بريد إلكتروني</option>
                        <option value="sms">رسالة نصية</option>
                        <option value="push">إشعار فوري</option>
                    </select>
                </div>
                <div class="col-md-4">
                    <input type="number" class="form-control reminder-minutes" placeholder="دقائق قبل الموعد" value="15">
                </div>
                <div class="col-md-4">
                    <button type="button" class="btn btn-outline-danger btn-sm" onclick="this.parentElement.parentElement.parentElement.remove()">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
        remindersList.appendChild(reminderItem);
    }

    // تحميل المستخدمين
    async loadUsers() {
        // هذه دالة مؤقتة - يجب ربطها بـ API المستخدمين الفعلي
        const therapistSelect = document.getElementById('appointmentTherapist');
        const beneficiarySelect = document.getElementById('appointmentBeneficiary');
        const availabilityUserSelect = document.getElementById('availabilityUser');
        
        // بيانات تجريبية
        const users = [
            { id: 1, name: 'د. أحمد محمد', type: 'therapist' },
            { id: 2, name: 'أ. فاطمة علي', type: 'therapist' },
            { id: 3, name: 'محمد أحمد', type: 'beneficiary' },
            { id: 4, name: 'سارة محمد', type: 'beneficiary' }
        ];
        
        users.forEach(user => {
            if (user.type === 'therapist') {
                therapistSelect.innerHTML += `<option value="${user.id}">${user.name}</option>`;
                availabilityUserSelect.innerHTML += `<option value="${user.id}">${user.name}</option>`;
            } else {
                beneficiarySelect.innerHTML += `<option value="${user.id}">${user.name}</option>`;
            }
        });
    }

    // إعداد مستمعي الأحداث
    setupEventListeners() {
        // فلاتر قائمة المواعيد
        ['statusFilter', 'typeFilter', 'startDateFilter', 'endDateFilter'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('change', () => this.loadAppointments());
            }
        });
        
        // نموذج التحقق من التوفر
        const availabilityForm = document.getElementById('availabilityForm');
        if (availabilityForm) {
            availabilityForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.checkAvailability();
            });
        }
    }

    // التحقق من التوفر
    async checkAvailability() {
        const userId = document.getElementById('availabilityUser').value;
        const date = document.getElementById('availabilityDate').value;
        
        if (!userId || !date) {
            this.showAlert('يرجى اختيار المستخدم والتاريخ', 'warning');
            return;
        }
        
        try {
            const response = await fetch(`/api/appointments/availability?user_id=${userId}&start_date=${date}&end_date=${date}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                this.renderAvailabilityResults(data);
            }
        } catch (error) {
            console.error('Error checking availability:', error);
            this.showAlert('خطأ في التحقق من التوفر', 'danger');
        }
    }

    // عرض نتائج التوفر
    renderAvailabilityResults(data) {
        const container = document.getElementById('availabilityResults');
        
        if (data.busy_slots.length === 0) {
            container.innerHTML = '<div class="alert alert-success">المستخدم متاح طوال اليوم</div>';
            return;
        }
        
        container.innerHTML = `
            <div class="alert alert-info">الأوقات المحجوزة:</div>
            ${data.busy_slots.map(slot => `
                <div class="time-slot busy mb-2">
                    <strong>${slot.title}</strong><br>
                    <small>${new Date(slot.start).toLocaleTimeString('ar-SA', {hour: '2-digit', minute: '2-digit'})} - ${new Date(slot.end).toLocaleTimeString('ar-SA', {hour: '2-digit', minute: '2-digit'})}</small>
                </div>
            `).join('')}
        `;
    }

    // عرض رسالة تنبيه
    showAlert(message, type = 'info') {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
        alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        document.body.appendChild(alertDiv);
        
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.parentNode.removeChild(alertDiv);
            }
        }, 5000);
    }

    // دوال مساعدة للنصوص
    getStatusText(status) {
        const statusTexts = {
            'scheduled': 'مجدول',
            'confirmed': 'مؤكد',
            'in_progress': 'جاري',
            'completed': 'مكتمل',
            'cancelled': 'ملغي',
            'no_show': 'غياب'
        };
        return statusTexts[status] || status;
    }

    getTypeText(type) {
        const typeTexts = {
            'therapy_session': 'جلسة علاجية',
            'assessment': 'تقييم',
            'consultation': 'استشارة',
            'meeting': 'اجتماع',
            'training': 'تدريب',
            'workshop': 'ورشة عمل'
        };
        return typeTexts[type] || type;
    }

    getPriorityText(priority) {
        const priorityTexts = {
            'low': 'منخفضة',
            'medium': 'متوسطة',
            'high': 'عالية',
            'urgent': 'عاجلة'
        };
        return priorityTexts[priority] || priority;
    }

    getReminderTypeText(type) {
        const reminderTexts = {
            'email': 'بريد إلكتروني',
            'sms': 'رسالة نصية',
            'push': 'إشعار فوري',
            'whatsapp': 'واتساب'
        };
        return reminderTexts[type] || type;
    }

    // عرض الترقيم
    renderPagination(pagination) {
        const container = document.getElementById('appointmentsPagination');
        if (!container || pagination.pages <= 1) {
            if (container) container.innerHTML = '';
            return;
        }
        
        let paginationHTML = '';
        
        // زر السابق
        if (pagination.has_prev) {
            paginationHTML += `<li class="page-item"><a class="page-link" href="#" onclick="appointmentManager.loadAppointments(${pagination.page - 1})">السابق</a></li>`;
        }
        
        // أرقام الصفحات
        for (let i = 1; i <= pagination.pages; i++) {
            const active = i === pagination.page ? 'active' : '';
            paginationHTML += `<li class="page-item ${active}"><a class="page-link" href="#" onclick="appointmentManager.loadAppointments(${i})">${i}</a></li>`;
        }
        
        // زر التالي
        if (pagination.has_next) {
            paginationHTML += `<li class="page-item"><a class="page-link" href="#" onclick="appointmentManager.loadAppointments(${pagination.page + 1})">التالي</a></li>`;
        }
        
        container.innerHTML = paginationHTML;
    }

    // تعديل موعد
    editAppointment() {
        if (!this.currentAppointment) return;
        
        // إغلاق نموذج التفاصيل
        bootstrap.Modal.getInstance(document.getElementById('appointmentDetailsModal')).hide();
        
        // ملء النموذج بالبيانات الحالية
        document.getElementById('appointmentModalTitle').textContent = 'تعديل الموعد';
        document.getElementById('appointmentTitle').value = this.currentAppointment.title;
        document.getElementById('appointmentDescription').value = this.currentAppointment.description || '';
        document.getElementById('appointmentType').value = this.currentAppointment.type;
        document.getElementById('appointmentStartDateTime').value = this.currentAppointment.start_datetime.slice(0, 16);
        document.getElementById('appointmentEndDateTime').value = this.currentAppointment.end_datetime.slice(0, 16);
        document.getElementById('appointmentLocation').value = this.currentAppointment.location || '';
        document.getElementById('appointmentRoom').value = this.currentAppointment.room_number || '';
        document.getElementById('appointmentPriority').value = this.currentAppointment.priority;
        document.getElementById('appointmentNotes').value = this.currentAppointment.notes || '';
        document.getElementById('appointmentCost').value = this.currentAppointment.cost || '';
        
        // إظهار النموذج
        const modal = new bootstrap.Modal(document.getElementById('appointmentModal'));
        modal.show();
    }

    // إلغاء موعد
    async cancelAppointment() {
        if (!this.currentAppointment) return;
        
        const reason = prompt('سبب الإلغاء (اختياري):');
        if (reason === null) return; // المستخدم ألغى العملية
        
        try {
            const response = await fetch(`/api/appointments/${this.currentAppointment.id}/cancel`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ reason: reason || 'لم يتم تحديد السبب' })
            });
            
            if (response.ok) {
                this.showAlert('تم إلغاء الموعد بنجاح', 'success');
                bootstrap.Modal.getInstance(document.getElementById('appointmentDetailsModal')).hide();
                this.calendar.refetchEvents();
                this.loadAppointments();
                this.loadStats();
            } else {
                const data = await response.json();
                this.showAlert(data.error || 'خطأ في إلغاء الموعد', 'danger');
            }
        } catch (error) {
            console.error('Error cancelling appointment:', error);
            this.showAlert('خطأ في إلغاء الموعد', 'danger');
        }
    }
}
