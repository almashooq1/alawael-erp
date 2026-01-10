class FamilyChildManager {
    constructor() {
        this.currentPage = 1;
        this.perPage = 10;
        this.charts = {};
        this.init();
    }

    init() {
        this.loadDashboardData();
        this.setupEventListeners();
        this.initializeCharts();
    }

    setupEventListeners() {
        // Tab change events
        document.querySelectorAll('#mainTabs button[data-bs-toggle="tab"]').forEach(tab => {
            tab.addEventListener('shown.bs.tab', (event) => {
                const targetTab = event.target.getAttribute('data-bs-target');
                this.handleTabChange(targetTab);
            });
        });

        // Search events
        document.getElementById('childrenSearch')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.loadChildren();
        });

        document.getElementById('familiesSearch')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.loadFamilies();
        });
    }

    handleTabChange(targetTab) {
        switch(targetTab) {
            case '#children':
                this.loadChildren();
                break;
            case '#families':
                this.loadFamilies();
                break;
            case '#appointments':
                this.loadAppointments();
                break;
            case '#overview':
                this.updateCharts();
                break;
        }
    }

    async loadDashboardData() {
        try {
            this.showLoading(true);
            const response = await fetch('/api/family-child-dashboard', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.updateStatistics(data.statistics);
            }
        } catch (error) {
            console.error('Error loading dashboard data:', error);
            this.showAlert('حدث خطأ في تحميل بيانات لوحة التحكم', 'danger');
        } finally {
            this.showLoading(false);
        }
    }

    updateStatistics(stats) {
        document.getElementById('totalChildren').textContent = stats.children.total;
        document.getElementById('totalFamilies').textContent = stats.families.total;
        document.getElementById('todayAppointments').textContent = stats.appointments.today;
        document.getElementById('todayCommunications').textContent = stats.communications.today;
    }

    async loadChildren(page = 1) {
        try {
            this.showLoading(true);
            const search = document.getElementById('childrenSearch').value;
            const status = document.getElementById('childrenStatusFilter').value;
            
            const params = new URLSearchParams({
                page: page,
                per_page: this.perPage,
                search: search,
                status: status
            });

            const response = await fetch(`/api/child-profiles?${params}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.renderChildrenTable(data.profiles);
                this.renderPagination(data.pagination, 'childrenPagination', 'loadChildren');
            }
        } catch (error) {
            console.error('Error loading children:', error);
            this.showAlert('حدث خطأ في تحميل بيانات الأطفال', 'danger');
        } finally {
            this.showLoading(false);
        }
    }

    renderChildrenTable(children) {
        const tbody = document.getElementById('childrenTableBody');
        tbody.innerHTML = '';

        children.forEach(child => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${child.full_name}</td>
                <td>${child.birth_date ? new Date(child.birth_date).toLocaleDateString('ar-SA') : '-'}</td>
                <td>${child.gender === 'male' ? 'ذكر' : 'أنثى'}</td>
                <td>${child.primary_diagnosis || '-'}</td>
                <td>
                    <span class="badge ${this.getStatusBadgeClass(child.status)}">
                        ${this.getStatusText(child.status)}
                    </span>
                </td>
                <td>${child.enrollment_date ? new Date(child.enrollment_date).toLocaleDateString('ar-SA') : '-'}</td>
                <td>
                    <button class="btn btn-sm btn-primary me-1" onclick="viewChildProfile(${child.id})">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-warning me-1" onclick="editChildProfile(${child.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-info" onclick="viewChildProgress(${child.id})">
                        <i class="fas fa-chart-line"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    async loadFamilies(page = 1) {
        try {
            this.showLoading(true);
            const search = document.getElementById('familiesSearch').value;
            
            const params = new URLSearchParams({
                page: page,
                per_page: this.perPage,
                search: search
            });

            const response = await fetch(`/api/family-profiles?${params}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.renderFamiliesTable(data.families);
                this.renderPagination(data.pagination, 'familiesPagination', 'loadFamilies');
            }
        } catch (error) {
            console.error('Error loading families:', error);
            this.showAlert('حدث خطأ في تحميل بيانات الأسر', 'danger');
        } finally {
            this.showLoading(false);
        }
    }

    renderFamiliesTable(families) {
        const tbody = document.getElementById('familiesTableBody');
        tbody.innerHTML = '';

        families.forEach(family => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${family.family_code}</td>
                <td>${family.family_name}</td>
                <td>${family.primary_phone || '-'}</td>
                <td>${family.email || '-'}</td>
                <td>${family.city || '-'}</td>
                <td>
                    <span class="badge bg-info">${family.children_count}</span>
                </td>
                <td>${family.registration_date ? new Date(family.registration_date).toLocaleDateString('ar-SA') : '-'}</td>
                <td>
                    <button class="btn btn-sm btn-primary me-1" onclick="viewFamilyProfile(${family.id})">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-warning me-1" onclick="editFamilyProfile(${family.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-success" onclick="addFamilyMember(${family.id})">
                        <i class="fas fa-user-plus"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    async loadAppointments(page = 1) {
        try {
            this.showLoading(true);
            
            const params = new URLSearchParams({
                page: page,
                per_page: this.perPage
            });

            const response = await fetch(`/api/smart-appointments?${params}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.renderAppointmentsTable(data.appointments);
            }
        } catch (error) {
            console.error('Error loading appointments:', error);
            this.showAlert('حدث خطأ في تحميل بيانات المواعيد', 'danger');
        } finally {
            this.showLoading(false);
        }
    }

    renderAppointmentsTable(appointments) {
        const tbody = document.getElementById('appointmentsTableBody');
        tbody.innerHTML = '';

        appointments.forEach(appointment => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${appointment.appointment_code}</td>
                <td>${appointment.title}</td>
                <td>${appointment.appointment_type}</td>
                <td>${new Date(appointment.scheduled_date).toLocaleDateString('ar-SA')}</td>
                <td>${appointment.scheduled_time}</td>
                <td>${appointment.child_name || '-'}</td>
                <td>${appointment.family_name || '-'}</td>
                <td>
                    <span class="badge ${this.getAppointmentStatusBadgeClass(appointment.status)}">
                        ${this.getAppointmentStatusText(appointment.status)}
                    </span>
                </td>
                <td>
                    <button class="btn btn-sm btn-primary me-1" onclick="viewAppointment(${appointment.id})">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-warning me-1" onclick="editAppointment(${appointment.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-success" onclick="confirmAppointment(${appointment.id})">
                        <i class="fas fa-check"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    renderPagination(pagination, containerId, functionName) {
        const container = document.getElementById(containerId);
        if (!container) return;

        let paginationHtml = '<ul class="pagination justify-content-center">';
        
        // Previous button
        if (pagination.page > 1) {
            paginationHtml += `
                <li class="page-item">
                    <a class="page-link" href="#" onclick="${functionName}(${pagination.page - 1})">السابق</a>
                </li>
            `;
        }

        // Page numbers
        for (let i = 1; i <= pagination.pages; i++) {
            const activeClass = i === pagination.page ? 'active' : '';
            paginationHtml += `
                <li class="page-item ${activeClass}">
                    <a class="page-link" href="#" onclick="${functionName}(${i})">${i}</a>
                </li>
            `;
        }

        // Next button
        if (pagination.page < pagination.pages) {
            paginationHtml += `
                <li class="page-item">
                    <a class="page-link" href="#" onclick="${functionName}(${pagination.page + 1})">التالي</a>
                </li>
            `;
        }

        paginationHtml += '</ul>';
        container.innerHTML = paginationHtml;
    }

    initializeCharts() {
        // Children Status Chart
        const childrenCtx = document.getElementById('childrenStatusChart');
        if (childrenCtx) {
            this.charts.childrenStatus = new Chart(childrenCtx, {
                type: 'doughnut',
                data: {
                    labels: ['نشط', 'غير نشط', 'متخرج'],
                    datasets: [{
                        data: [0, 0, 0],
                        backgroundColor: ['#28a745', '#dc3545', '#ffc107']
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: true,
                            text: 'توزيع حالات الأطفال'
                        }
                    }
                }
            });
        }

        // Appointments Chart
        const appointmentsCtx = document.getElementById('appointmentsChart');
        if (appointmentsCtx) {
            this.charts.appointments = new Chart(appointmentsCtx, {
                type: 'bar',
                data: {
                    labels: ['مجدولة', 'مؤكدة', 'مكتملة', 'ملغية'],
                    datasets: [{
                        label: 'عدد المواعيد',
                        data: [0, 0, 0, 0],
                        backgroundColor: ['#007bff', '#28a745', '#17a2b8', '#dc3545']
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: true,
                            text: 'حالة المواعيد'
                        }
                    }
                }
            });
        }

        // Families Chart
        const familiesCtx = document.getElementById('familiesChart');
        if (familiesCtx) {
            this.charts.families = new Chart(familiesCtx, {
                type: 'pie',
                data: {
                    labels: ['أسر نشطة', 'أسر غير نشطة'],
                    datasets: [{
                        data: [0, 0],
                        backgroundColor: ['#007bff', '#6c757d']
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: true,
                            text: 'حالة الأسر'
                        }
                    }
                }
            });
        }

        // Communications Chart
        const communicationsCtx = document.getElementById('communicationsChart');
        if (communicationsCtx) {
            this.charts.communications = new Chart(communicationsCtx, {
                type: 'line',
                data: {
                    labels: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو'],
                    datasets: [{
                        label: 'عدد الرسائل',
                        data: [0, 0, 0, 0, 0, 0],
                        borderColor: '#dc3545',
                        backgroundColor: 'rgba(220, 53, 69, 0.1)',
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: true,
                            text: 'اتجاه التواصل الشهري'
                        }
                    }
                }
            });
        }
    }

    updateCharts() {
        // Update charts with real data
        // This would be implemented with actual API calls
    }

    getStatusBadgeClass(status) {
        switch(status) {
            case 'active': return 'bg-success';
            case 'inactive': return 'bg-danger';
            case 'graduated': return 'bg-warning';
            default: return 'bg-secondary';
        }
    }

    getStatusText(status) {
        switch(status) {
            case 'active': return 'نشط';
            case 'inactive': return 'غير نشط';
            case 'graduated': return 'متخرج';
            default: return 'غير محدد';
        }
    }

    getAppointmentStatusBadgeClass(status) {
        switch(status) {
            case 'scheduled': return 'bg-primary';
            case 'confirmed': return 'bg-success';
            case 'completed': return 'bg-info';
            case 'cancelled': return 'bg-danger';
            case 'no_show': return 'bg-warning';
            default: return 'bg-secondary';
        }
    }

    getAppointmentStatusText(status) {
        switch(status) {
            case 'scheduled': return 'مجدول';
            case 'confirmed': return 'مؤكد';
            case 'completed': return 'مكتمل';
            case 'cancelled': return 'ملغي';
            case 'no_show': return 'لم يحضر';
            default: return 'غير محدد';
        }
    }

    showLoading(show) {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.style.display = show ? 'block' : 'none';
        }
    }

    showAlert(message, type = 'info') {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        const container = document.querySelector('.container-fluid');
        container.insertBefore(alertDiv, container.firstChild);
        
        setTimeout(() => {
            alertDiv.remove();
        }, 5000);
    }
}

// Global functions for button clicks
function refreshDashboard() {
    manager.loadDashboardData();
}

function showAddChildModal() {
    // Implementation for add child modal
    manager.showAlert('سيتم تطوير نافذة إضافة الطفل قريباً', 'info');
}

function showAddFamilyModal() {
    // Implementation for add family modal
    manager.showAlert('سيتم تطوير نافذة إضافة الأسرة قريباً', 'info');
}

function showAddAppointmentModal() {
    // Implementation for add appointment modal
    manager.showAlert('سيتم تطوير نافذة حجز الموعد قريباً', 'info');
}

function showProgressTrackingModal() {
    // Implementation for progress tracking modal
    manager.showAlert('سيتم تطوير نافذة تتبع التقدم قريباً', 'info');
}

function showCommunicationModal() {
    // Implementation for communication modal
    manager.showAlert('سيتم تطوير نافذة التواصل قريباً', 'info');
}

function showSurveyModal() {
    // Implementation for survey modal
    manager.showAlert('سيتم تطوير نافذة الاستطلاع قريباً', 'info');
}

function viewChildProfile(id) {
    manager.showAlert(`عرض ملف الطفل رقم ${id}`, 'info');
}

function editChildProfile(id) {
    manager.showAlert(`تعديل ملف الطفل رقم ${id}`, 'info');
}

function viewChildProgress(id) {
    manager.showAlert(`عرض تقدم الطفل رقم ${id}`, 'info');
}

function viewFamilyProfile(id) {
    manager.showAlert(`عرض ملف الأسرة رقم ${id}`, 'info');
}

function editFamilyProfile(id) {
    manager.showAlert(`تعديل ملف الأسرة رقم ${id}`, 'info');
}

function addFamilyMember(id) {
    manager.showAlert(`إضافة فرد للأسرة رقم ${id}`, 'info');
}

function viewAppointment(id) {
    manager.showAlert(`عرض الموعد رقم ${id}`, 'info');
}

function editAppointment(id) {
    manager.showAlert(`تعديل الموعد رقم ${id}`, 'info');
}

function confirmAppointment(id) {
    manager.showAlert(`تأكيد الموعد رقم ${id}`, 'success');
}

function loadChildren(page) {
    manager.loadChildren(page);
}

function loadFamilies(page) {
    manager.loadFamilies(page);
}

// Initialize the manager when the page loads
let manager;
document.addEventListener('DOMContentLoaded', function() {
    manager = new FamilyChildManager();
});
