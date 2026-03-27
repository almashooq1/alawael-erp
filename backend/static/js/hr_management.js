// HR Management System JavaScript
let currentPage = 1;
let currentTab = 'employees';

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    loadDashboardStats();
    loadEmployees();
    loadDepartments();
    loadLeaveTypes();
    initializeYearOptions();
    setupEventListeners();
    createModals();
});

// Setup event listeners
function setupEventListeners() {
    // Tab change events
    document.querySelectorAll('[data-bs-toggle="pill"]').forEach(tab => {
        tab.addEventListener('shown.bs.tab', function(e) {
            const targetId = e.target.getAttribute('data-bs-target');
            currentTab = targetId.replace('#', '').replace('-tab', '');
            loadTabContent(currentTab);
        });
    });

    // Search and filter events
    document.getElementById('employeeSearch')?.addEventListener('input', debounce(loadEmployees, 300));
    document.getElementById('departmentFilter')?.addEventListener('change', loadEmployees);
    document.getElementById('statusFilter')?.addEventListener('change', loadEmployees);
}

// Load dashboard statistics
async function loadDashboardStats() {
    try {
        const response = await fetch('/api/hr/dashboard', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                document.getElementById('totalEmployees').textContent = data.stats.total_employees || 0;
                document.getElementById('presentToday').textContent = data.stats.present_today || 0;
                document.getElementById('pendingLeaves').textContent = data.stats.pending_leaves || 0;
                document.getElementById('avgPerformance').textContent = (data.stats.avg_performance || 0) + '%';
            }
        }
    } catch (error) {
        console.error('Error loading dashboard stats:', error);
    }
}

// Load employees data
async function loadEmployees(page = 1) {
    try {
        const search = document.getElementById('employeeSearch')?.value || '';
        const department = document.getElementById('departmentFilter')?.value || '';
        const status = document.getElementById('statusFilter')?.value || '';
        
        const params = new URLSearchParams({
            page: page,
            per_page: 10,
            search: search,
            department_id: department,
            status: status
        });

        const response = await fetch(`/api/hr/employees?${params}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                displayEmployees(data.employees);
                updatePagination('employeesPagination', data.pagination, loadEmployees);
            }
        }
    } catch (error) {
        console.error('Error loading employees:', error);
        showAlert('حدث خطأ في تحميل بيانات الموظفين', 'danger');
    }
}

// Display employees in table
function displayEmployees(employees) {
    const tbody = document.getElementById('employeesTable');
    if (!tbody) return;

    tbody.innerHTML = employees.map(employee => `
        <tr>
            <td>${employee.employee_id || '-'}</td>
            <td>
                <div class="d-flex align-items-center">
                    <div class="avatar-sm bg-primary rounded-circle d-flex align-items-center justify-content-center me-2">
                        <i class="fas fa-user text-white"></i>
                    </div>
                    <div>
                        <div class="fw-bold">${employee.first_name} ${employee.last_name}</div>
                        <small class="text-muted">${employee.email}</small>
                    </div>
                </div>
            </td>
            <td>${employee.department?.name || '-'}</td>
            <td>${employee.position?.title || '-'}</td>
            <td>${employee.salary ? formatCurrency(employee.salary) : '-'}</td>
            <td>
                <span class="badge ${employee.status === 'active' ? 'bg-success' : 'bg-secondary'}">
                    ${employee.status === 'active' ? 'نشط' : 'غير نشط'}
                </span>
            </td>
            <td>
                <div class="btn-group" role="group">
                    <button class="btn btn-sm btn-outline-primary btn-action" onclick="viewEmployee(${employee.id})" title="عرض">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-warning btn-action" onclick="editEmployee(${employee.id})" title="تعديل">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-info btn-action" onclick="analyzePerformance(${employee.id})" title="تحليل الأداء">
                        <i class="fas fa-chart-line"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-success btn-action" onclick="recommendSalary(${employee.id})" title="توصية الراتب">
                        <i class="fas fa-money-bill-wave"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// Load attendance records
async function loadAttendanceRecords() {
    try {
        const date = document.getElementById('attendanceDate')?.value || '';
        const employeeId = document.getElementById('attendanceEmployee')?.value || '';
        
        const params = new URLSearchParams({
            date: date,
            employee_id: employeeId
        });

        const response = await fetch(`/api/hr/attendance?${params}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                displayAttendance(data.records);
            }
        }
    } catch (error) {
        console.error('Error loading attendance:', error);
        showAlert('حدث خطأ في تحميل بيانات الحضور', 'danger');
    }
}

// Display attendance records
function displayAttendance(records) {
    const tbody = document.getElementById('attendanceTable');
    if (!tbody) return;

    tbody.innerHTML = records.map(record => `
        <tr>
            <td>${record.employee.name}</td>
            <td>${formatDate(record.date)}</td>
            <td>${record.check_in_time || '-'}</td>
            <td>${record.check_out_time || '-'}</td>
            <td>${record.hours_worked || '-'}</td>
            <td>
                <span class="badge ${getStatusBadgeClass(record.status)}">
                    ${getStatusText(record.status)}
                </span>
            </td>
        </tr>
    `).join('');
}

// Load leave requests
async function loadLeaveRequests() {
    try {
        const status = document.getElementById('leaveStatusFilter')?.value || '';
        const type = document.getElementById('leaveTypeFilter')?.value || '';
        
        const params = new URLSearchParams({
            status: status,
            leave_type_id: type
        });

        const response = await fetch(`/api/hr/leave-requests?${params}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                displayLeaveRequests(data.requests);
            }
        }
    } catch (error) {
        console.error('Error loading leave requests:', error);
        showAlert('حدث خطأ في تحميل طلبات الإجازة', 'danger');
    }
}

// Display leave requests
function displayLeaveRequests(requests) {
    const tbody = document.getElementById('leavesTable');
    if (!tbody) return;

    tbody.innerHTML = requests.map(request => `
        <tr>
            <td>${request.employee.name}</td>
            <td>${request.leave_type.name}</td>
            <td>${formatDate(request.start_date)}</td>
            <td>${formatDate(request.end_date)}</td>
            <td>${request.days_count}</td>
            <td>
                <span class="badge ${getStatusBadgeClass(request.status)}">
                    ${getStatusText(request.status)}
                </span>
            </td>
            <td>
                ${request.status === 'pending' ? `
                    <button class="btn btn-sm btn-success btn-action me-1" onclick="approveLeave(${request.id})">
                        <i class="fas fa-check"></i>
                    </button>
                    <button class="btn btn-sm btn-danger btn-action" onclick="rejectLeave(${request.id})">
                        <i class="fas fa-times"></i>
                    </button>
                ` : '-'}
            </td>
        </tr>
    `).join('');
}

// Load salary records
async function loadSalaryRecords() {
    try {
        const month = document.getElementById('salaryMonth')?.value || '';
        const year = document.getElementById('salaryYear')?.value || '';
        
        const params = new URLSearchParams({
            month: month,
            year: year
        });

        const response = await fetch(`/api/hr/salary-records?${params}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                displaySalaryRecords(data.records);
            }
        }
    } catch (error) {
        console.error('Error loading salary records:', error);
        showAlert('حدث خطأ في تحميل بيانات الرواتب', 'danger');
    }
}

// Display salary records
function displaySalaryRecords(records) {
    const tbody = document.getElementById('salaryTable');
    if (!tbody) return;

    tbody.innerHTML = records.map(record => `
        <tr>
            <td>${record.employee.name}</td>
            <td>${record.month}/${record.year}</td>
            <td>${formatCurrency(record.basic_salary)}</td>
            <td>${formatCurrency(Object.values(record.allowances || {}).reduce((a, b) => a + b, 0))}</td>
            <td>${formatCurrency(Object.values(record.bonuses || {}).reduce((a, b) => a + b, 0))}</td>
            <td>${formatCurrency(Object.values(record.deductions || {}).reduce((a, b) => a + b, 0))}</td>
            <td class="fw-bold">${formatCurrency(record.net_salary)}</td>
            <td>
                <span class="badge ${record.status === 'paid' ? 'bg-success' : 'bg-warning'}">
                    ${record.status === 'paid' ? 'مدفوع' : 'معلق'}
                </span>
            </td>
        </tr>
    `).join('');
}

// AI Functions
async function analyzePerformance(employeeId) {
    try {
        const response = await fetch(`/api/hr/ai/analyze-performance/${employeeId}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                showAIAnalysisModal('تحليل الأداء', data.analysis);
            }
        }
    } catch (error) {
        console.error('Error analyzing performance:', error);
        showAlert('حدث خطأ في تحليل الأداء', 'danger');
    }
}

async function recommendSalary(employeeId) {
    try {
        const response = await fetch(`/api/hr/ai/recommend-salary/${employeeId}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                showAIAnalysisModal('توصية الراتب', data.recommendation);
            }
        }
    } catch (error) {
        console.error('Error recommending salary:', error);
        showAlert('حدث خطأ في توصية الراتب', 'danger');
    }
}

// Show AI Analysis Modal
function showAIAnalysisModal(title, analysis) {
    const modal = document.createElement('div');
    modal.className = 'modal fade';
    modal.innerHTML = `
        <div class="modal-dialog modal-lg">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">${title}</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <div class="alert alert-info">
                        <i class="fas fa-robot me-2"></i>
                        ${analysis.message}
                    </div>
                    <div class="row">
                        <div class="col-md-6">
                            <h6>مستوى الثقة</h6>
                            <div class="progress mb-3">
                                <div class="progress-bar" style="width: ${analysis.confidence}%">
                                    ${analysis.confidence}%
                                </div>
                            </div>
                        </div>
                    </div>
                    <h6>التوصيات:</h6>
                    <ul class="list-group">
                        ${analysis.recommendations.map(rec => `
                            <li class="list-group-item">${rec}</li>
                        `).join('')}
                    </ul>
                    ${analysis.data ? `
                        <h6 class="mt-3">البيانات التفصيلية:</h6>
                        <pre class="bg-light p-3 rounded">${JSON.stringify(analysis.data, null, 2)}</pre>
                    ` : ''}
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();
    
    modal.addEventListener('hidden.bs.modal', () => {
        document.body.removeChild(modal);
    });
}

// Load tab content based on current tab
function loadTabContent(tab) {
    switch(tab) {
        case 'employees':
            loadEmployees();
            break;
        case 'attendance':
            loadAttendanceRecords();
            break;
        case 'leaves':
            loadLeaveRequests();
            break;
        case 'salary':
            loadSalaryRecords();
            break;
        case 'performance':
            loadPerformanceReviews();
            break;
        case 'training':
            loadTrainingPrograms();
            break;
        case 'recruitment':
            loadJobApplications();
            break;
    }
}

// Load departments for filters
async function loadDepartments() {
    try {
        const response = await fetch('/api/hr/departments', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                const select = document.getElementById('departmentFilter');
                if (select) {
                    select.innerHTML = '<option value="">جميع الأقسام</option>' +
                        data.departments.map(dept => `<option value="${dept.id}">${dept.name}</option>`).join('');
                }
            }
        }
    } catch (error) {
        console.error('Error loading departments:', error);
    }
}

// Load leave types
async function loadLeaveTypes() {
    try {
        const response = await fetch('/api/hr/leave-types', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                const select = document.getElementById('leaveTypeFilter');
                if (select) {
                    select.innerHTML = '<option value="">جميع الأنواع</option>' +
                        data.leave_types.map(type => `<option value="${type.id}">${type.name}</option>`).join('');
                }
            }
        }
    } catch (error) {
        console.error('Error loading leave types:', error);
    }
}

// Initialize year options
function initializeYearOptions() {
    const currentYear = new Date().getFullYear();
    const yearSelect = document.getElementById('salaryYear');
    if (yearSelect) {
        yearSelect.innerHTML = '<option value="">السنة</option>';
        for (let year = currentYear - 2; year <= currentYear + 1; year++) {
            yearSelect.innerHTML += `<option value="${year}">${year}</option>`;
        }
    }
}

// Create modals dynamically
function createModals() {
    const modalsContainer = document.getElementById('modalsContainer');
    if (!modalsContainer) return;

    // Add Employee Modal
    modalsContainer.innerHTML += `
        <div class="modal fade" id="addEmployeeModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">إضافة موظف جديد</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="addEmployeeForm">
                            <div class="row">
                                <div class="col-md-6">
                                    <div class="mb-3">
                                        <label class="form-label">الاسم الأول</label>
                                        <input type="text" class="form-control" name="first_name" required>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="mb-3">
                                        <label class="form-label">الاسم الأخير</label>
                                        <input type="text" class="form-control" name="last_name" required>
                                    </div>
                                </div>
                            </div>
                            <div class="row">
                                <div class="col-md-6">
                                    <div class="mb-3">
                                        <label class="form-label">البريد الإلكتروني</label>
                                        <input type="email" class="form-control" name="email" required>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="mb-3">
                                        <label class="form-label">رقم الهاتف</label>
                                        <input type="tel" class="form-control" name="phone">
                                    </div>
                                </div>
                            </div>
                            <div class="row">
                                <div class="col-md-6">
                                    <div class="mb-3">
                                        <label class="form-label">القسم</label>
                                        <select class="form-select" name="department_id" required>
                                            <option value="">اختر القسم</option>
                                        </select>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="mb-3">
                                        <label class="form-label">المنصب</label>
                                        <select class="form-select" name="position_id" required>
                                            <option value="">اختر المنصب</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">إلغاء</button>
                        <button type="button" class="btn btn-primary" onclick="saveEmployee()">حفظ</button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Utility functions
function formatCurrency(amount) {
    return new Intl.NumberFormat('ar-SA', {
        style: 'currency',
        currency: 'SAR'
    }).format(amount);
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('ar-SA');
}

function getStatusBadgeClass(status) {
    const classes = {
        'present': 'bg-success',
        'absent': 'bg-danger',
        'late': 'bg-warning',
        'pending': 'bg-warning',
        'approved': 'bg-success',
        'rejected': 'bg-danger',
        'paid': 'bg-success'
    };
    return classes[status] || 'bg-secondary';
}

function getStatusText(status) {
    const texts = {
        'present': 'حاضر',
        'absent': 'غائب',
        'late': 'متأخر',
        'pending': 'معلق',
        'approved': 'موافق عليه',
        'rejected': 'مرفوض',
        'paid': 'مدفوع'
    };
    return texts[status] || status;
}

function updatePagination(containerId, pagination, loadFunction) {
    const container = document.getElementById(containerId);
    if (!container) return;

    let html = '';
    
    // Previous button
    if (pagination.page > 1) {
        html += `<li class="page-item">
            <a class="page-link" href="#" onclick="${loadFunction.name}(${pagination.page - 1})">السابق</a>
        </li>`;
    }
    
    // Page numbers
    for (let i = 1; i <= pagination.pages; i++) {
        html += `<li class="page-item ${i === pagination.page ? 'active' : ''}">
            <a class="page-link" href="#" onclick="${loadFunction.name}(${i})">${i}</a>
        </li>`;
    }
    
    // Next button
    if (pagination.page < pagination.pages) {
        html += `<li class="page-item">
            <a class="page-link" href="#" onclick="${loadFunction.name}(${pagination.page + 1})">التالي</a>
        </li>`;
    }
    
    container.innerHTML = html;
}

function showAlert(message, type = 'info') {
    const alert = document.createElement('div');
    alert.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
    alert.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
    alert.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(alert);
    
    setTimeout(() => {
        if (alert.parentNode) {
            alert.parentNode.removeChild(alert);
        }
    }, 5000);
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
