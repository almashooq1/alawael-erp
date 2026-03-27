/**
 * Maintenance Management System JavaScript
 * إدارة نظام الأعطال والصيانة
 */

class MaintenanceManager {
    constructor() {
        this.currentTab = 'dashboard';
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.token = localStorage.getItem('token');
        this.charts = {};
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadDashboard();
        this.showTab('dashboard');
    }

    setupEventListeners() {
        // Tab navigation
        document.querySelectorAll('[data-tab]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const tab = e.target.closest('[data-tab]').dataset.tab;
                this.showTab(tab);
            });
        });

        // Filters
        document.getElementById('fault-branch-filter')?.addEventListener('change', () => this.loadFaultReports());
        document.getElementById('fault-type-filter')?.addEventListener('change', () => this.loadFaultReports());
        document.getElementById('fault-status-filter')?.addEventListener('change', () => this.loadFaultReports());
        document.getElementById('fault-priority-filter')?.addEventListener('change', () => this.loadFaultReports());

        // Form submissions
        document.getElementById('faultReportForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.submitFaultReport();
        });
    }

    showTab(tabName) {
        // Hide all tabs
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.style.display = 'none';
            tab.classList.remove('active');
        });

        // Show selected tab
        const selectedTab = document.getElementById(`${tabName}-tab`);
        if (selectedTab) {
            selectedTab.style.display = 'block';
            selectedTab.classList.add('active');
        }

        // Update sidebar navigation
        document.querySelectorAll('.sidebar .nav-link').forEach(link => {
            link.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`)?.classList.add('active');

        this.currentTab = tabName;

        // Load tab content
        switch (tabName) {
            case 'dashboard':
                this.loadDashboard();
                break;
            case 'fault-reports':
                this.loadFaultReports();
                break;
            case 'maintenance-requests':
                this.loadMaintenanceRequests();
                break;
            case 'maintenance-schedules':
                this.loadMaintenanceSchedules();
                break;
            case 'equipment-inventory':
                this.loadEquipmentInventory();
                break;
            case 'maintenance-logs':
                this.loadMaintenanceLogs();
                break;
            case 'reports':
                this.loadReports();
                break;
        }
    }

    async loadDashboard() {
        try {
            this.showLoading('dashboard');
            
            const response = await fetch('/api/maintenance-dashboard', {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.updateDashboardStats(data);
                this.createCharts(data);
                this.loadRecentActivities();
            } else {
                this.showError('فشل في تحميل بيانات لوحة التحكم');
            }
        } catch (error) {
            console.error('Error loading dashboard:', error);
            this.showError('حدث خطأ في تحميل لوحة التحكم');
        } finally {
            this.hideLoading('dashboard');
        }
    }

    updateDashboardStats(data) {
        document.getElementById('total-fault-reports').textContent = data.totalFaultReports || 0;
        document.getElementById('open-fault-reports').textContent = data.openFaultReports || 0;
        document.getElementById('pending-requests').textContent = data.pendingRequests || 0;
        document.getElementById('total-equipment').textContent = data.totalEquipment || 0;
    }

    createCharts(data) {
        // Fault Type Distribution Chart
        const faultTypeCtx = document.getElementById('faultTypeChart');
        if (faultTypeCtx && data.faultTypeDistribution) {
            if (this.charts.faultType) {
                this.charts.faultType.destroy();
            }
            
            this.charts.faultType = new Chart(faultTypeCtx, {
                type: 'doughnut',
                data: {
                    labels: Object.keys(data.faultTypeDistribution),
                    datasets: [{
                        data: Object.values(data.faultTypeDistribution),
                        backgroundColor: [
                            '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0',
                            '#9966FF', '#FF9F40', '#FF6384', '#C9CBCF'
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
        }

        // Maintenance Status Chart
        const maintenanceStatusCtx = document.getElementById('maintenanceStatusChart');
        if (maintenanceStatusCtx && data.maintenanceStatusDistribution) {
            if (this.charts.maintenanceStatus) {
                this.charts.maintenanceStatus.destroy();
            }
            
            this.charts.maintenanceStatus = new Chart(maintenanceStatusCtx, {
                type: 'bar',
                data: {
                    labels: Object.keys(data.maintenanceStatusDistribution),
                    datasets: [{
                        label: 'عدد الطلبات',
                        data: Object.values(data.maintenanceStatusDistribution),
                        backgroundColor: '#667eea'
                    }]
                },
                options: {
                    responsive: true,
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            });
        }
    }

    async loadRecentActivities() {
        try {
            const response = await fetch('/api/maintenance-recent-activities', {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.displayRecentActivities(data.activities);
            }
        } catch (error) {
            console.error('Error loading recent activities:', error);
        }
    }

    displayRecentActivities(activities) {
        const container = document.getElementById('recent-activities');
        if (!container) return;

        if (!activities || activities.length === 0) {
            container.innerHTML = '<p class="text-muted text-center">لا توجد أنشطة حديثة</p>';
            return;
        }

        const html = activities.map(activity => `
            <div class="d-flex align-items-center mb-3 p-3 bg-light rounded">
                <div class="me-3">
                    <i class="fas ${this.getActivityIcon(activity.type)} text-primary"></i>
                </div>
                <div class="flex-grow-1">
                    <h6 class="mb-1">${activity.title}</h6>
                    <p class="mb-0 text-muted small">${activity.description}</p>
                    <small class="text-muted">${this.formatDate(activity.created_at)}</small>
                </div>
            </div>
        `).join('');

        container.innerHTML = html;
    }

    getActivityIcon(type) {
        const icons = {
            'fault_report': 'fa-exclamation-triangle',
            'maintenance_request': 'fa-clipboard-list',
            'maintenance_schedule': 'fa-calendar-alt',
            'equipment_added': 'fa-plus-circle',
            'maintenance_completed': 'fa-check-circle'
        };
        return icons[type] || 'fa-info-circle';
    }

    async loadFaultReports() {
        try {
            this.showLoading('fault-reports');
            
            const params = new URLSearchParams({
                page: this.currentPage,
                per_page: this.itemsPerPage
            });

            // Add filters
            const branchFilter = document.getElementById('fault-branch-filter')?.value;
            const typeFilter = document.getElementById('fault-type-filter')?.value;
            const statusFilter = document.getElementById('fault-status-filter')?.value;
            const priorityFilter = document.getElementById('fault-priority-filter')?.value;

            if (branchFilter) params.append('branch_id', branchFilter);
            if (typeFilter) params.append('fault_type', typeFilter);
            if (statusFilter) params.append('status', statusFilter);
            if (priorityFilter) params.append('priority', priorityFilter);

            const response = await fetch(`/api/fault-reports?${params}`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.displayFaultReports(data.reports);
                this.updatePagination('fault-reports', data.pagination);
            } else {
                this.showError('فشل في تحميل تقارير الأعطال');
            }
        } catch (error) {
            console.error('Error loading fault reports:', error);
            this.showError('حدث خطأ في تحميل تقارير الأعطال');
        } finally {
            this.hideLoading('fault-reports');
        }
    }

    displayFaultReports(reports) {
        const tbody = document.getElementById('fault-reports-table');
        if (!tbody) return;

        if (!reports || reports.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">لا توجد تقارير أعطال</td></tr>';
            return;
        }

        const html = reports.map(report => `
            <tr>
                <td>#${report.id}</td>
                <td>${report.branch_name}</td>
                <td>${this.getFaultTypeLabel(report.fault_type)}</td>
                <td>${report.fault_title}</td>
                <td>
                    <span class="badge priority-${report.priority_level}">
                        ${this.getPriorityLabel(report.priority_level)}
                    </span>
                </td>
                <td>
                    <span class="badge status-${report.status}">
                        ${this.getStatusLabel(report.status)}
                    </span>
                </td>
                <td>${this.formatDate(report.reported_at)}</td>
                <td>
                    <div class="btn-group">
                        <button class="btn btn-sm btn-outline-primary" onclick="viewFaultReport(${report.id})" title="عرض">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-warning" onclick="editFaultReport(${report.id})" title="تعديل">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteFaultReport(${report.id})" title="حذف">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');

        tbody.innerHTML = html;
    }

    async submitFaultReport() {
        try {
            const form = document.getElementById('faultReportForm');
            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());
            
            // Convert checkboxes to boolean
            data.safety_risk = formData.has('safety_risk');
            data.service_disruption = formData.has('service_disruption');
            
            // Get branch name
            const branchSelect = form.querySelector('[name="branch_id"]');
            data.branch_name = branchSelect.options[branchSelect.selectedIndex].text;

            const response = await fetch('/api/fault-reports', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                const result = await response.json();
                this.showSuccess('تم إنشاء تقرير العطل بنجاح');
                
                // Close modal and refresh data
                const modal = bootstrap.Modal.getInstance(document.getElementById('faultReportModal'));
                modal.hide();
                form.reset();
                
                if (this.currentTab === 'fault-reports') {
                    this.loadFaultReports();
                }
                this.loadDashboard();
            } else {
                const error = await response.json();
                this.showError(error.error || 'فشل في إنشاء تقرير العطل');
            }
        } catch (error) {
            console.error('Error submitting fault report:', error);
            this.showError('حدث خطأ في إرسال تقرير العطل');
        }
    }

    // Placeholder methods for other tabs
    async loadMaintenanceRequests() {
        console.log('Loading maintenance requests...');
        // Implementation similar to loadFaultReports
    }

    async loadMaintenanceSchedules() {
        console.log('Loading maintenance schedules...');
        // Implementation for maintenance schedules
    }

    async loadEquipmentInventory() {
        console.log('Loading equipment inventory...');
        // Implementation for equipment inventory
    }

    async loadMaintenanceLogs() {
        console.log('Loading maintenance logs...');
        // Implementation for maintenance logs
    }

    async loadReports() {
        console.log('Loading reports...');
        // Implementation for reports and analytics
    }

    // Utility methods
    getFaultTypeLabel(type) {
        const labels = {
            'electrical': 'كهربائي',
            'plumbing': 'سباكة',
            'hvac': 'تكييف وتهوية',
            'equipment': 'معدات',
            'structural': 'إنشائي',
            'it': 'تقنية معلومات',
            'safety': 'سلامة'
        };
        return labels[type] || type;
    }

    getPriorityLabel(priority) {
        const labels = {
            'critical': 'حرجة',
            'high': 'عالية',
            'normal': 'عادية',
            'low': 'منخفضة'
        };
        return labels[priority] || priority;
    }

    getStatusLabel(status) {
        const labels = {
            'reported': 'مُبلغ عنه',
            'acknowledged': 'مُستلم',
            'assigned': 'مُكلف',
            'in_progress': 'قيد التنفيذ',
            'completed': 'مكتمل',
            'closed': 'مغلق'
        };
        return labels[status] || status;
    }

    formatDate(dateString) {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString('ar-SA', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    updatePagination(type, pagination) {
        const container = document.getElementById(`${type}-pagination`);
        if (!container || !pagination) return;

        let html = '';
        
        // Previous button
        if (pagination.has_prev) {
            html += `<li class="page-item">
                <a class="page-link" href="#" onclick="maintenanceManager.changePage(${pagination.page - 1})">السابق</a>
            </li>`;
        }

        // Page numbers
        for (let i = 1; i <= pagination.pages; i++) {
            const active = i === pagination.page ? 'active' : '';
            html += `<li class="page-item ${active}">
                <a class="page-link" href="#" onclick="maintenanceManager.changePage(${i})">${i}</a>
            </li>`;
        }

        // Next button
        if (pagination.has_next) {
            html += `<li class="page-item">
                <a class="page-link" href="#" onclick="maintenanceManager.changePage(${pagination.page + 1})">التالي</a>
            </li>`;
        }

        container.innerHTML = html;
    }

    changePage(page) {
        this.currentPage = page;
        
        switch (this.currentTab) {
            case 'fault-reports':
                this.loadFaultReports();
                break;
            case 'maintenance-requests':
                this.loadMaintenanceRequests();
                break;
            // Add other cases as needed
        }
    }

    showLoading(section) {
        const loadingElements = document.querySelectorAll(`#${section}-tab .loading`);
        loadingElements.forEach(el => el.style.display = 'block');
    }

    hideLoading(section) {
        const loadingElements = document.querySelectorAll(`#${section}-tab .loading`);
        loadingElements.forEach(el => el.style.display = 'none');
    }

    showSuccess(message) {
        this.showAlert(message, 'success');
    }

    showError(message) {
        this.showAlert(message, 'danger');
    }

    showAlert(message, type) {
        const alertHtml = `
            <div class="alert alert-${type} alert-dismissible fade show" role="alert">
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;
        
        // Insert at the top of the main content
        const mainContent = document.querySelector('.main-content');
        mainContent.insertAdjacentHTML('afterbegin', alertHtml);
        
        // Auto-dismiss after 5 seconds
        setTimeout(() => {
            const alert = mainContent.querySelector('.alert');
            if (alert) {
                const bsAlert = new bootstrap.Alert(alert);
                bsAlert.close();
            }
        }, 5000);
    }
}

// Global functions for button clicks
function viewFaultReport(id) {
    console.log('Viewing fault report:', id);
    // Implementation for viewing fault report details
}

function editFaultReport(id) {
    console.log('Editing fault report:', id);
    // Implementation for editing fault report
}

function deleteFaultReport(id) {
    if (confirm('هل أنت متأكد من حذف هذا التقرير؟')) {
        console.log('Deleting fault report:', id);
        // Implementation for deleting fault report
    }
}

function refreshDashboard() {
    maintenanceManager.loadDashboard();
}

function submitFaultReport() {
    maintenanceManager.submitFaultReport();
}

// Initialize the maintenance manager when the page loads
let maintenanceManager;
document.addEventListener('DOMContentLoaded', function() {
    maintenanceManager = new MaintenanceManager();
});
