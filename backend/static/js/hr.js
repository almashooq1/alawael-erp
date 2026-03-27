// نظام إدارة الموارد البشرية
class HRManager {
    constructor() {
        this.employees = [];
        this.attendance = [];
        this.leaveRequests = [];
        this.evaluations = [];
        this.init();
    }

    init() {
        this.loadEmployees();
        this.loadAttendance();
        this.loadLeaveRequests();
        this.setupEventListeners();
    }

    setupEventListeners() {
        document.addEventListener('DOMContentLoaded', () => {
            setInterval(() => {
                if (document.getElementById('employees').style.display !== 'none') {
                    this.loadEmployees();
                    this.loadAttendance();
                }
            }, 60000);
        });
    }

    async loadEmployees() {
        try {
            const response = await fetch('/api/employees', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                this.employees = data.employees;
                this.renderEmployees();
                this.updateHRStats();
            }
        } catch (error) {
            console.error('خطأ في تحميل الموظفين:', error);
        }
    }

    async loadAttendance() {
        try {
            const response = await fetch('/api/employee-attendance', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                this.attendance = data.attendance;
                this.renderAttendance();
            }
        } catch (error) {
            console.error('خطأ في تحميل الحضور:', error);
        }
    }

    async loadLeaveRequests() {
        try {
            const response = await fetch('/api/leave-requests', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                this.leaveRequests = data.leave_requests;
                this.renderLeaveRequests();
            }
        } catch (error) {
            console.error('خطأ في تحميل طلبات الإجازة:', error);
        }
    }

    renderEmployees() {
        const tbody = document.getElementById('employeesTableBody');
        if (!tbody) return;

        tbody.innerHTML = '';

        this.employees.forEach(employee => {
            const row = document.createElement('tr');
            
            row.innerHTML = `
                <td>
                    <div class="d-flex align-items-center">
                        <div class="profile-placeholder me-2">
                            ${employee.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <strong>${employee.name}</strong>
                            <br>
                            <small class="text-muted">${employee.employee_id || 'لا يوجد رقم'}</small>
                        </div>
                    </div>
                </td>
                <td>${employee.position || 'غير محدد'}</td>
                <td>${employee.department || 'غير محدد'}</td>
                <td>${employee.phone || 'غير محدد'}</td>
                <td>${employee.email || 'غير محدد'}</td>
                <td>
                    <span class="badge bg-${this.getEmployeeStatusColor(employee.status)}">
                        ${this.getEmployeeStatusText(employee.status)}
                    </span>
                </td>
                <td>${employee.hire_date ? new Date(employee.hire_date).toLocaleDateString('ar-SA') : 'غير محدد'}</td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary" onclick="hrManager.viewEmployee(${employee.id})">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-outline-success" onclick="hrManager.editEmployee(${employee.id})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-outline-info" onclick="hrManager.viewAttendance(${employee.id})">
                            <i class="fas fa-calendar-check"></i>
                        </button>
                    </div>
                </td>
            `;
            
            tbody.appendChild(row);
        });
    }

    renderAttendance() {
        const tbody = document.getElementById('attendanceTableBody');
        if (!tbody) return;

        tbody.innerHTML = '';

        // عرض حضور اليوم فقط
        const today = new Date().toDateString();
        const todayAttendance = this.attendance.filter(a => 
            new Date(a.date).toDateString() === today
        );

        todayAttendance.forEach(record => {
            const row = document.createElement('tr');
            
            row.innerHTML = `
                <td>
                    <div class="d-flex align-items-center">
                        <div class="profile-placeholder me-2">
                            ${record.employee.name.charAt(0).toUpperCase()}
                        </div>
                        <strong>${record.employee.name}</strong>
                    </div>
                </td>
                <td>${record.check_in_time ? new Date(record.check_in_time).toLocaleTimeString('ar-SA') : 'لم يحضر'}</td>
                <td>${record.check_out_time ? new Date(record.check_out_time).toLocaleTimeString('ar-SA') : 'لم ينصرف'}</td>
                <td>
                    <span class="badge bg-${this.getAttendanceStatusColor(record.status)}">
                        ${this.getAttendanceStatusText(record.status)}
                    </span>
                </td>
                <td>${record.notes || 'لا توجد ملاحظات'}</td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary" onclick="hrManager.editAttendance(${record.id})">
                            <i class="fas fa-edit"></i>
                        </button>
                    </div>
                </td>
            `;
            
            tbody.appendChild(row);
        });
    }

    renderLeaveRequests() {
        const tbody = document.getElementById('leaveRequestsTableBody');
        if (!tbody) return;

        tbody.innerHTML = '';

        this.leaveRequests.forEach(request => {
            const row = document.createElement('tr');
            
            row.innerHTML = `
                <td>
                    <div class="d-flex align-items-center">
                        <div class="profile-placeholder me-2">
                            ${request.employee.name.charAt(0).toUpperCase()}
                        </div>
                        <strong>${request.employee.name}</strong>
                    </div>
                </td>
                <td>
                    <span class="badge bg-${this.getLeaveTypeColor(request.leave_type)}">
                        ${this.getLeaveTypeText(request.leave_type)}
                    </span>
                </td>
                <td>${new Date(request.start_date).toLocaleDateString('ar-SA')}</td>
                <td>${new Date(request.end_date).toLocaleDateString('ar-SA')}</td>
                <td>${request.days_requested}</td>
                <td>
                    <span class="badge bg-${this.getRequestStatusColor(request.status)}">
                        ${this.getRequestStatusText(request.status)}
                    </span>
                </td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary" onclick="hrManager.viewLeaveRequest(${request.id})">
                            <i class="fas fa-eye"></i>
                        </button>
                        ${request.status === 'pending' ? `
                            <button class="btn btn-outline-success" onclick="hrManager.approveLeaveRequest(${request.id})">
                                <i class="fas fa-check"></i>
                            </button>
                            <button class="btn btn-outline-danger" onclick="hrManager.rejectLeaveRequest(${request.id})">
                                <i class="fas fa-times"></i>
                            </button>
                        ` : ''}
                    </div>
                </td>
            `;
            
            tbody.appendChild(row);
        });
    }

    updateHRStats() {
        const totalEmployees = this.employees.length;
        const activeEmployees = this.employees.filter(e => e.status === 'active').length;
        const pendingLeaves = this.leaveRequests.filter(r => r.status === 'pending').length;
        
        // حساب الحضور اليوم
        const today = new Date().toDateString();
        const todayAttendance = this.attendance.filter(a => 
            new Date(a.date).toDateString() === today
        );
        const presentToday = todayAttendance.filter(a => a.status === 'present').length;

        document.getElementById('totalEmployees').textContent = totalEmployees;
        document.getElementById('activeEmployees').textContent = activeEmployees;
        document.getElementById('presentToday').textContent = presentToday;
        document.getElementById('pendingLeaves').textContent = pendingLeaves;
    }

    getEmployeeStatusColor(status) {
        const colors = {
            'active': 'success',
            'inactive': 'secondary',
            'terminated': 'danger'
        };
        return colors[status] || 'secondary';
    }

    getEmployeeStatusText(status) {
        const texts = {
            'active': 'نشط',
            'inactive': 'غير نشط',
            'terminated': 'منتهي الخدمة'
        };
        return texts[status] || 'غير محدد';
    }

    getAttendanceStatusColor(status) {
        const colors = {
            'present': 'success',
            'absent': 'danger',
            'late': 'warning',
            'early_leave': 'info'
        };
        return colors[status] || 'secondary';
    }

    getAttendanceStatusText(status) {
        const texts = {
            'present': 'حاضر',
            'absent': 'غائب',
            'late': 'متأخر',
            'early_leave': 'انصراف مبكر'
        };
        return texts[status] || 'غير محدد';
    }

    getLeaveTypeColor(type) {
        const colors = {
            'annual': 'primary',
            'sick': 'warning',
            'emergency': 'danger',
            'maternity': 'info',
            'other': 'secondary'
        };
        return colors[type] || 'secondary';
    }

    getLeaveTypeText(type) {
        const texts = {
            'annual': 'سنوية',
            'sick': 'مرضية',
            'emergency': 'طارئة',
            'maternity': 'أمومة',
            'other': 'أخرى'
        };
        return texts[type] || 'غير محدد';
    }

    getRequestStatusColor(status) {
        const colors = {
            'pending': 'warning',
            'approved': 'success',
            'rejected': 'danger'
        };
        return colors[status] || 'secondary';
    }

    getRequestStatusText(status) {
        const texts = {
            'pending': 'في الانتظار',
            'approved': 'موافق عليها',
            'rejected': 'مرفوضة'
        };
        return texts[status] || 'غير محدد';
    }

    async viewEmployee(employeeId) {
        try {
            const response = await fetch(`/api/employees/${employeeId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (response.ok) {
                const employee = await response.json();
                this.showEmployeeModal(employee);
            }
        } catch (error) {
            console.error('خطأ في عرض الموظف:', error);
        }
    }

    showEmployeeModal(employee) {
        const modalHtml = `
            <div class="modal fade" id="employeeModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">
                                <i class="fas fa-user-tie me-2"></i>
                                ${employee.name}
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="row">
                                <div class="col-md-6">
                                    <p><strong>رقم الموظف:</strong> ${employee.employee_id || 'غير محدد'}</p>
                                    <p><strong>المنصب:</strong> ${employee.position || 'غير محدد'}</p>
                                    <p><strong>القسم:</strong> ${employee.department || 'غير محدد'}</p>
                                    <p><strong>الحالة:</strong> 
                                        <span class="badge bg-${this.getEmployeeStatusColor(employee.status)}">
                                            ${this.getEmployeeStatusText(employee.status)}
                                        </span>
                                    </p>
                                </div>
                                <div class="col-md-6">
                                    <p><strong>الهاتف:</strong> ${employee.phone || 'غير محدد'}</p>
                                    <p><strong>البريد الإلكتروني:</strong> ${employee.email || 'غير محدد'}</p>
                                    <p><strong>تاريخ التوظيف:</strong> ${employee.hire_date ? new Date(employee.hire_date).toLocaleDateString('ar-SA') : 'غير محدد'}</p>
                                    <p><strong>الراتب:</strong> ${employee.salary ? employee.salary + ' ريال' : 'غير محدد'}</p>
                                </div>
                            </div>
                            
                            ${employee.address ? `
                                <hr>
                                <p><strong>العنوان:</strong> ${employee.address}</p>
                            ` : ''}
                            
                            ${employee.emergency_contact ? `
                                <hr>
                                <h6>جهة الاتصال في حالات الطوارئ:</h6>
                                <p><strong>الاسم:</strong> ${employee.emergency_contact.name || 'غير محدد'}</p>
                                <p><strong>الهاتف:</strong> ${employee.emergency_contact.phone || 'غير محدد'}</p>
                                <p><strong>العلاقة:</strong> ${employee.emergency_contact.relationship || 'غير محدد'}</p>
                            ` : ''}
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-success" onclick="hrManager.editEmployee(${employee.id})">
                                <i class="fas fa-edit me-2"></i>تعديل
                            </button>
                            <button type="button" class="btn btn-info" onclick="hrManager.viewAttendance(${employee.id})">
                                <i class="fas fa-calendar-check me-2"></i>الحضور
                            </button>
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">إغلاق</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        const existingModal = document.getElementById('employeeModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        const modal = new bootstrap.Modal(document.getElementById('employeeModal'));
        modal.show();
    }

    async approveLeaveRequest(requestId) {
        if (confirm('هل أنت متأكد من الموافقة على هذا الطلب؟')) {
            try {
                const response = await fetch(`/api/leave-requests/${requestId}/approve`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });
                
                if (response.ok) {
                    this.loadLeaveRequests();
                    showAlert('تم الموافقة على الطلب', 'success');
                }
            } catch (error) {
                console.error('خطأ في الموافقة على الطلب:', error);
                showAlert('حدث خطأ في الموافقة على الطلب', 'error');
            }
        }
    }

    async rejectLeaveRequest(requestId) {
        if (confirm('هل أنت متأكد من رفض هذا الطلب؟')) {
            try {
                const response = await fetch(`/api/leave-requests/${requestId}/reject`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });
                
                if (response.ok) {
                    this.loadLeaveRequests();
                    showAlert('تم رفض الطلب', 'success');
                }
            } catch (error) {
                console.error('خطأ في رفض الطلب:', error);
                showAlert('حدث خطأ في رفض الطلب', 'error');
            }
        }
    }

    // فلترة الموظفين
    filterEmployees() {
        const departmentFilter = document.getElementById('employeeDepartmentFilter').value;
        const statusFilter = document.getElementById('employeeStatusFilter').value;
        const searchTerm = document.getElementById('employeeSearch').value.toLowerCase();

        let filteredEmployees = this.employees;

        if (departmentFilter) {
            filteredEmployees = filteredEmployees.filter(e => e.department === departmentFilter);
        }

        if (statusFilter) {
            filteredEmployees = filteredEmployees.filter(e => e.status === statusFilter);
        }

        if (searchTerm) {
            filteredEmployees = filteredEmployees.filter(e => 
                e.name.toLowerCase().includes(searchTerm) || 
                (e.employee_id && e.employee_id.toLowerCase().includes(searchTerm))
            );
        }

        const originalEmployees = this.employees;
        this.employees = filteredEmployees;
        this.renderEmployees();
        this.employees = originalEmployees;
    }

    editEmployee(employeeId) {
        console.log('تعديل الموظف:', employeeId);
        // سيتم تنفيذه لاحقاً
    }

    viewAttendance(employeeId) {
        console.log('عرض حضور الموظف:', employeeId);
        // سيتم تنفيذه لاحقاً
    }

    editAttendance(attendanceId) {
        console.log('تعديل الحضور:', attendanceId);
        // سيتم تنفيذه لاحقاً
    }

    viewLeaveRequest(requestId) {
        console.log('عرض طلب الإجازة:', requestId);
        // سيتم تنفيذه لاحقاً
    }
}

// إنشاء مثيل عام
const hrManager = new HRManager();

// دالة مساعدة للتنقل
function showEmployeesSection() {
    hideAllSections();
    document.getElementById('employees').style.display = 'block';
    hrManager.loadEmployees();
    hrManager.loadAttendance();
    hrManager.loadLeaveRequests();
}
