class VolunteerStaffManager {
    constructor() {
        this.staff = [];
        this.attendance = [];
        this.leaveRequests = [];
        this.evaluations = [];
        this.training = [];
        this.schedules = [];
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.totalPages = 1;
        this.currentSection = 'staff';
        this.filters = {
            search: '',
            staff_type: '',
            department: '',
            status: ''
        };
    }

    async init() {
        try {
            await this.loadStaff();
            await this.loadStatistics();
            this.setupEventListeners();
            this.populateStaffSelects();
        } catch (error) {
            console.error('Error initializing volunteer staff manager:', error);
            this.showAlert('خطأ في تحميل البيانات', 'error');
        }
    }

    setupEventListeners() {
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.filters.search = e.target.value;
            this.debounceSearch();
        });

        ['staffTypeFilter', 'departmentFilter', 'statusFilter'].forEach(id => {
            document.getElementById(id).addEventListener('change', (e) => {
                const filterType = id.replace('Filter', '').replace('Type', '_type');
                this.filters[filterType] = e.target.value;
                this.applyFilters();
            });
        });

        // تعيين التاريخ الحالي للنماذج
        const today = new Date().toISOString().split('T')[0];
        document.querySelectorAll('input[name="date"], input[name="hire_date"]').forEach(input => {
            if (!input.value) input.value = today;
        });
    }

    debounceSearch() {
        clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(() => {
            this.applyFilters();
        }, 500);
    }

    async loadStaff(page = 1) {
        try {
            const params = new URLSearchParams({
                page: page,
                per_page: this.itemsPerPage,
                ...this.filters
            });

            const response = await fetch(`/api/volunteer-staff?${params}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });

            if (response.ok) {
                const data = await response.json();
                this.staff = data.staff || [];
                this.currentPage = data.pagination?.page || 1;
                this.totalPages = data.pagination?.pages || 1;
                
                if (this.currentSection === 'staff') {
                    this.renderStaff();
                    this.renderPagination();
                }
            }
        } catch (error) {
            console.error('Error loading staff:', error);
            this.showAlert('خطأ في تحميل بيانات الموظفين', 'error');
        }
    }

    async loadStatistics() {
        try {
            const response = await fetch('/api/volunteer-staff/statistics', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });

            if (response.ok) {
                const stats = await response.json();
                this.updateStatistics(stats);
            }
        } catch (error) {
            console.error('Error loading statistics:', error);
        }
    }

    updateStatistics(stats) {
        document.getElementById('totalStaff').textContent = stats.total_staff || 0;
        document.getElementById('activeStaff').textContent = stats.active_staff || 0;
        document.getElementById('volunteers').textContent = stats.volunteers || 0;
        document.getElementById('pendingLeaveRequests').textContent = stats.pending_leave_requests || 0;
    }

    renderStaff() {
        const container = document.getElementById('contentContainer');
        
        if (this.staff.length === 0) {
            container.innerHTML = `
                <div class="text-center py-5">
                    <i class="fas fa-users fa-3x text-muted mb-3"></i>
                    <h5 class="text-muted">لا يوجد موظفون</h5>
                    <p class="text-muted">لم يتم العثور على موظفين مطابقين للمعايير المحددة</p>
                </div>
            `;
            return;
        }

        const staffHtml = this.staff.map(staff => `
            <div class="staff-card">
                <div class="row align-items-center">
                    <div class="col-md-8">
                        <div class="d-flex align-items-center mb-2">
                            <div class="me-3">
                                <div class="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center" style="width: 50px; height: 50px;">
                                    <i class="fas fa-user"></i>
                                </div>
                            </div>
                            <div>
                                <h5 class="mb-1">${staff.full_name}</h5>
                                <div class="d-flex gap-2 align-items-center">
                                    <span class="staff-type type-${staff.staff_type}">
                                        ${this.getStaffTypeText(staff.staff_type)}
                                    </span>
                                    <span class="staff-status status-${staff.status}">
                                        ${this.getStatusText(staff.status)}
                                    </span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="row text-muted small">
                            <div class="col-md-6">
                                <div><strong>رقم الهوية:</strong> ${staff.national_id}</div>
                                <div><strong>المنصب:</strong> ${staff.position || 'غير محدد'}</div>
                            </div>
                            <div class="col-md-6">
                                <div><strong>القسم:</strong> ${this.getDepartmentText(staff.department)}</div>
                                <div><strong>الهاتف:</strong> ${staff.phone || 'غير محدد'}</div>
                            </div>
                        </div>
                        
                        ${staff.performance_rating ? `
                            <div class="performance-rating mt-2">
                                <small class="text-muted me-2">التقييم:</small>
                                <div class="rating-stars">
                                    ${this.renderStars(staff.performance_rating)}
                                </div>
                                <span class="small text-muted">(${staff.performance_rating}/5)</span>
                            </div>
                        ` : ''}
                    </div>
                    
                    <div class="col-md-4 text-end">
                        <div class="mb-2">
                            <small class="text-muted">تاريخ التوظيف:</small><br>
                            <span>${this.formatDate(staff.hire_date)}</span>
                        </div>
                        
                        <div class="btn-group">
                            <button class="btn btn-sm btn-outline-primary" onclick="volunteerStaffManager.viewStaff(${staff.id})" title="عرض التفاصيل">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-secondary" onclick="volunteerStaffManager.editStaff(${staff.id})" title="تعديل">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-info" onclick="volunteerStaffManager.viewAttendance(${staff.id})" title="الحضور">
                                <i class="fas fa-clock"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-success" onclick="volunteerStaffManager.viewEvaluations(${staff.id})" title="التقييمات">
                                <i class="fas fa-star"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');

        container.innerHTML = staffHtml;
    }

    renderPagination() {
        const pagination = document.getElementById('staffPagination');
        if (this.totalPages <= 1) {
            pagination.innerHTML = '';
            return;
        }

        let paginationHtml = `
            <li class="page-item ${this.currentPage === 1 ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="volunteerStaffManager.loadStaff(${this.currentPage - 1})">السابق</a>
            </li>
        `;

        const startPage = Math.max(1, this.currentPage - 2);
        const endPage = Math.min(this.totalPages, this.currentPage + 2);

        for (let i = startPage; i <= endPage; i++) {
            paginationHtml += `
                <li class="page-item ${i === this.currentPage ? 'active' : ''}">
                    <a class="page-link" href="#" onclick="volunteerStaffManager.loadStaff(${i})">${i}</a>
                </li>
            `;
        }

        paginationHtml += `
            <li class="page-item ${this.currentPage === this.totalPages ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="volunteerStaffManager.loadStaff(${this.currentPage + 1})">التالي</a>
            </li>
        `;

        pagination.innerHTML = paginationHtml;
    }

    async populateStaffSelects() {
        try {
            const response = await fetch('/api/volunteer-staff?per_page=1000', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });

            if (response.ok) {
                const data = await response.json();
                const staff = data.staff || [];
                
                const selects = document.querySelectorAll('select[name="staff_id"]');
                selects.forEach(select => {
                    const firstOption = select.querySelector('option');
                    select.innerHTML = '';
                    if (firstOption) select.appendChild(firstOption);
                    
                    staff.forEach(member => {
                        const option = document.createElement('option');
                        option.value = member.id;
                        option.textContent = `${member.full_name} - ${member.national_id}`;
                        select.appendChild(option);
                    });
                });
            }
        } catch (error) {
            console.error('Error populating staff selects:', error);
        }
    }

    getStaffTypeText(type) {
        const typeMap = {
            'employee': 'موظف',
            'volunteer': 'متطوع',
            'contractor': 'متعاقد'
        };
        return typeMap[type] || type;
    }

    getStatusText(status) {
        const statusMap = {
            'active': 'نشط',
            'inactive': 'غير نشط',
            'suspended': 'موقوف',
            'terminated': 'منتهي الخدمة'
        };
        return statusMap[status] || status;
    }

    getDepartmentText(department) {
        const departmentMap = {
            'rehabilitation': 'التأهيل',
            'medical': 'الطبي',
            'education': 'التعليم',
            'administration': 'الإدارة',
            'support': 'الدعم'
        };
        return departmentMap[department] || department || 'غير محدد';
    }

    renderStars(rating) {
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 !== 0;
        let starsHtml = '';
        
        for (let i = 0; i < fullStars; i++) {
            starsHtml += '<i class="fas fa-star"></i>';
        }
        
        if (hasHalfStar) {
            starsHtml += '<i class="fas fa-star-half-alt"></i>';
        }
        
        const emptyStars = 5 - Math.ceil(rating);
        for (let i = 0; i < emptyStars; i++) {
            starsHtml += '<i class="far fa-star"></i>';
        }
        
        return starsHtml;
    }

    formatDate(dateString) {
        if (!dateString) return 'غير محدد';
        const date = new Date(dateString);
        return date.toLocaleDateString('ar-SA');
    }

    applyFilters() {
        this.currentPage = 1;
        this.loadStaff();
    }

    clearFilters() {
        this.filters = { search: '', staff_type: '', department: '', status: '' };
        document.getElementById('searchInput').value = '';
        document.getElementById('staffTypeFilter').value = '';
        document.getElementById('departmentFilter').value = '';
        document.getElementById('statusFilter').value = '';
        this.loadStaff();
    }

    showAddStaffModal() {
        document.getElementById('staffForm').reset();
        document.querySelector('#staffModal .modal-title').textContent = 'إضافة موظف جديد';
        const modal = new bootstrap.Modal(document.getElementById('staffModal'));
        modal.show();
    }

    async saveStaff() {
        const form = document.getElementById('staffForm');
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        try {
            const response = await fetch('/api/volunteer-staff', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                this.showAlert('تم إضافة الموظف بنجاح', 'success');
                bootstrap.Modal.getInstance(document.getElementById('staffModal')).hide();
                this.loadStaff();
                this.loadStatistics();
                this.populateStaffSelects();
            } else {
                const error = await response.json();
                this.showAlert(error.error || 'خطأ في إضافة الموظف', 'error');
            }
        } catch (error) {
            console.error('Error saving staff:', error);
            this.showAlert('خطأ في الاتصال بالخادم', 'error');
        }
    }

    showAttendanceModal() {
        document.getElementById('attendanceForm').reset();
        const today = new Date().toISOString().split('T')[0];
        document.querySelector('#attendanceForm input[name="date"]').value = today;
        
        const modal = new bootstrap.Modal(document.getElementById('attendanceModal'));
        modal.show();
    }

    async saveAttendance() {
        const form = document.getElementById('attendanceForm');
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        try {
            const response = await fetch('/api/staff-attendance', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                this.showAlert('تم تسجيل الحضور بنجاح', 'success');
                bootstrap.Modal.getInstance(document.getElementById('attendanceModal')).hide();
                if (this.currentSection === 'attendance') {
                    this.loadAttendance();
                }
            } else {
                const error = await response.json();
                this.showAlert(error.error || 'خطأ في تسجيل الحضور', 'error');
            }
        } catch (error) {
            console.error('Error saving attendance:', error);
            this.showAlert('خطأ في الاتصال بالخادم', 'error');
        }
    }

    showLeaveRequestModal() {
        document.getElementById('leaveRequestForm').reset();
        const modal = new bootstrap.Modal(document.getElementById('leaveRequestModal'));
        modal.show();
    }

    async saveLeaveRequest() {
        const form = document.getElementById('leaveRequestForm');
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        try {
            const response = await fetch('/api/staff-leave-requests', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                this.showAlert('تم إرسال طلب الإجازة بنجاح', 'success');
                bootstrap.Modal.getInstance(document.getElementById('leaveRequestModal')).hide();
                if (this.currentSection === 'leave-requests') {
                    this.loadLeaveRequests();
                }
                this.loadStatistics();
            } else {
                const error = await response.json();
                this.showAlert(error.error || 'خطأ في إرسال طلب الإجازة', 'error');
            }
        } catch (error) {
            console.error('Error saving leave request:', error);
            this.showAlert('خطأ في الاتصال بالخادم', 'error');
        }
    }

    async loadAttendance() {
        try {
            const response = await fetch('/api/staff-attendance', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });

            if (response.ok) {
                const data = await response.json();
                this.attendance = data.attendance || [];
                this.renderAttendance();
            }
        } catch (error) {
            console.error('Error loading attendance:', error);
            this.showAlert('خطأ في تحميل سجلات الحضور', 'error');
        }
    }

    renderAttendance() {
        const container = document.getElementById('contentContainer');
        
        if (this.attendance.length === 0) {
            container.innerHTML = `
                <div class="text-center py-5">
                    <i class="fas fa-clock fa-3x text-muted mb-3"></i>
                    <h5 class="text-muted">لا توجد سجلات حضور</h5>
                    <button class="btn btn-primary mt-3" onclick="volunteerStaffManager.showAttendanceModal()">
                        <i class="fas fa-plus me-2"></i>
                        تسجيل حضور جديد
                    </button>
                </div>
            `;
            return;
        }

        const attendanceHtml = this.attendance.map(record => `
            <div class="attendance-card">
                <div class="d-flex justify-content-between align-items-start">
                    <div>
                        <h6 class="mb-1">${record.staff_name}</h6>
                        <div class="text-muted small">
                            <div><strong>التاريخ:</strong> ${this.formatDate(record.date)}</div>
                            <div><strong>الحضور:</strong> ${record.check_in_time || 'غير محدد'}</div>
                            <div><strong>الانصراف:</strong> ${record.check_out_time || 'غير محدد'}</div>
                            ${record.total_hours ? `<div><strong>إجمالي الساعات:</strong> ${record.total_hours} ساعة</div>` : ''}
                        </div>
                    </div>
                    <div class="text-end">
                        <span class="staff-status status-${record.status}">
                            ${this.getAttendanceStatusText(record.status)}
                        </span>
                        ${record.notes ? `<div class="small text-muted mt-1">${record.notes}</div>` : ''}
                    </div>
                </div>
            </div>
        `).join('');

        container.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-3">
                <h5>سجلات الحضور والانصراف</h5>
                <button class="btn btn-primary" onclick="volunteerStaffManager.showAttendanceModal()">
                    <i class="fas fa-plus me-2"></i>
                    تسجيل حضور جديد
                </button>
            </div>
            ${attendanceHtml}
        `;
    }

    async loadLeaveRequests() {
        try {
            const response = await fetch('/api/staff-leave-requests', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });

            if (response.ok) {
                const data = await response.json();
                this.leaveRequests = data.leave_requests || [];
                this.renderLeaveRequests();
            }
        } catch (error) {
            console.error('Error loading leave requests:', error);
            this.showAlert('خطأ في تحميل طلبات الإجازات', 'error');
        }
    }

    renderLeaveRequests() {
        const container = document.getElementById('contentContainer');
        
        if (this.leaveRequests.length === 0) {
            container.innerHTML = `
                <div class="text-center py-5">
                    <i class="fas fa-calendar-times fa-3x text-muted mb-3"></i>
                    <h5 class="text-muted">لا توجد طلبات إجازات</h5>
                    <button class="btn btn-primary mt-3" onclick="volunteerStaffManager.showLeaveRequestModal()">
                        <i class="fas fa-plus me-2"></i>
                        طلب إجازة جديد
                    </button>
                </div>
            `;
            return;
        }

        const requestsHtml = this.leaveRequests.map(request => `
            <div class="leave-request-card">
                <div class="d-flex justify-content-between align-items-start">
                    <div>
                        <h6 class="mb-1">${request.staff_name}</h6>
                        <div class="text-muted small">
                            <div><strong>نوع الإجازة:</strong> ${this.getLeaveTypeText(request.leave_type)}</div>
                            <div><strong>من:</strong> ${this.formatDate(request.start_date)} <strong>إلى:</strong> ${this.formatDate(request.end_date)}</div>
                            <div><strong>عدد الأيام:</strong> ${request.total_days} يوم</div>
                            ${request.reason ? `<div><strong>السبب:</strong> ${request.reason}</div>` : ''}
                        </div>
                    </div>
                    <div class="text-end">
                        <span class="leave-status status-${request.status}">
                            ${this.getLeaveStatusText(request.status)}
                        </span>
                        <div class="mt-2">
                            ${request.status === 'pending' ? `
                                <button class="btn btn-sm btn-success me-1" onclick="volunteerStaffManager.approveLeaveRequest(${request.id})">
                                    <i class="fas fa-check"></i> موافقة
                                </button>
                                <button class="btn btn-sm btn-danger" onclick="volunteerStaffManager.rejectLeaveRequest(${request.id})">
                                    <i class="fas fa-times"></i> رفض
                                </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `).join('');

        container.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-3">
                <h5>طلبات الإجازات</h5>
                <button class="btn btn-primary" onclick="volunteerStaffManager.showLeaveRequestModal()">
                    <i class="fas fa-plus me-2"></i>
                    طلب إجازة جديد
                </button>
            </div>
            ${requestsHtml}
        `;
    }

    getAttendanceStatusText(status) {
        const statusMap = {
            'present': 'حاضر',
            'absent': 'غائب',
            'late': 'متأخر',
            'early_leave': 'انصراف مبكر',
            'sick_leave': 'إجازة مرضية',
            'vacation': 'إجازة'
        };
        return statusMap[status] || status;
    }

    getLeaveTypeText(type) {
        const typeMap = {
            'annual': 'إجازة سنوية',
            'sick': 'إجازة مرضية',
            'emergency': 'إجازة طارئة',
            'maternity': 'إجازة أمومة',
            'unpaid': 'إجازة بدون راتب'
        };
        return typeMap[type] || type;
    }

    getLeaveStatusText(status) {
        const statusMap = {
            'pending': 'معلق',
            'approved': 'موافق عليه',
            'rejected': 'مرفوض',
            'cancelled': 'ملغي'
        };
        return statusMap[status] || status;
    }

    async approveLeaveRequest(requestId) {
        if (!confirm('هل أنت متأكد من الموافقة على طلب الإجازة؟')) return;

        try {
            const response = await fetch(`/api/staff-leave-requests/${requestId}/approve`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ approval_notes: 'تمت الموافقة' })
            });

            if (response.ok) {
                this.showAlert('تمت الموافقة على طلب الإجازة', 'success');
                this.loadLeaveRequests();
                this.loadStatistics();
            }
        } catch (error) {
            console.error('Error approving leave request:', error);
            this.showAlert('خطأ في الموافقة على طلب الإجازة', 'error');
        }
    }

    // Navigation methods
    showStaffSection() {
        this.currentSection = 'staff';
        this.updateActiveNavLink('staff');
        this.loadStaff();
    }

    showAttendanceSection() {
        this.currentSection = 'attendance';
        this.updateActiveNavLink('attendance');
        this.loadAttendance();
    }

    showLeaveRequestsSection() {
        this.currentSection = 'leave-requests';
        this.updateActiveNavLink('leave-requests');
        this.loadLeaveRequests();
    }

    showEvaluationsSection() {
        this.currentSection = 'evaluations';
        this.updateActiveNavLink('evaluations');
        console.log('Show evaluations section');
    }

    showTrainingSection() {
        this.currentSection = 'training';
        this.updateActiveNavLink('training');
        console.log('Show training section');
    }

    showSchedulesSection() {
        this.currentSection = 'schedules';
        this.updateActiveNavLink('schedules');
        console.log('Show schedules section');
    }

    showReportsSection() {
        this.currentSection = 'reports';
        this.updateActiveNavLink('reports');
        console.log('Show reports section');
    }

    updateActiveNavLink(section) {
        document.querySelectorAll('.sidebar-menu .nav-link').forEach(link => {
            link.classList.remove('active');
        });
        // يمكن تحسين هذا لاحقاً لربط الروابط بالأقسام
    }

    // Placeholder methods for future implementation
    viewStaff(staffId) {
        console.log('View staff details:', staffId);
    }

    editStaff(staffId) {
        console.log('Edit staff:', staffId);
    }

    viewAttendance(staffId) {
        console.log('View staff attendance:', staffId);
    }

    viewEvaluations(staffId) {
        console.log('View staff evaluations:', staffId);
    }

    exportReports() {
        console.log('Export staff reports');
    }

    showAlert(message, type = 'info') {
        const alertClass = type === 'error' ? 'alert-danger' : 
                          type === 'success' ? 'alert-success' : 
                          type === 'warning' ? 'alert-warning' : 'alert-info';
        
        const alertHtml = `
            <div class="alert ${alertClass} alert-dismissible fade show" role="alert">
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;
        
        const container = document.querySelector('.main-content');
        container.insertAdjacentHTML('afterbegin', alertHtml);
        
        setTimeout(() => {
            const alert = container.querySelector('.alert');
            if (alert) {
                const bsAlert = new bootstrap.Alert(alert);
                bsAlert.close();
            }
        }, 5000);
    }
}

const volunteerStaffManager = new VolunteerStaffManager();
