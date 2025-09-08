/**
 * Quality Management System JavaScript
 * نظام إدارة الجودة والاعتماد
 */

class QualityManager {
    constructor() {
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.currentTab = 'standards';
        this.charts = {};
        
        this.init();
    }

    init() {
        this.loadDashboardData();
        this.loadStandards();
        this.setupEventListeners();
        this.setupTabSwitching();
    }

    setupEventListeners() {
        // Search and filter events
        document.getElementById('standardSearch')?.addEventListener('input', 
            this.debounce(() => this.loadStandards(), 300));
        
        document.getElementById('standardCategoryFilter')?.addEventListener('change', 
            () => this.loadStandards());
    }

    setupTabSwitching() {
        const tabButtons = document.querySelectorAll('#qualityTabs button[data-bs-toggle="tab"]');
        tabButtons.forEach(button => {
            button.addEventListener('shown.bs.tab', (event) => {
                const targetTab = event.target.getAttribute('data-bs-target').substring(1);
                this.currentTab = targetTab;
                this.handleTabSwitch(targetTab);
            });
        });
    }

    handleTabSwitch(tab) {
        switch(tab) {
            case 'standards':
                this.loadStandards();
                break;
            case 'audits':
                this.loadAudits();
                break;
            case 'certificates':
                this.loadCertificates();
                break;
            case 'indicators':
                this.loadIndicators();
                break;
            case 'checklists':
                this.loadChecklists();
                break;
            case 'analytics':
                this.loadAnalytics();
                break;
        }
    }

    async loadDashboardData() {
        try {
            this.showLoading();
            const response = await fetch('/api/quality/dashboard', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.updateDashboardStats(data);
            }
        } catch (error) {
            console.error('Error loading dashboard data:', error);
            this.showAlert('خطأ في تحميل بيانات لوحة التحكم', 'danger');
        } finally {
            this.hideLoading();
        }
    }

    updateDashboardStats(data) {
        document.getElementById('totalStandards').textContent = data.summary.total_standards;
        document.getElementById('completedAudits').textContent = data.summary.completed_audits;
        document.getElementById('activeAudits').textContent = data.summary.active_audits;
        document.getElementById('activeCertificates').textContent = data.summary.active_certificates;
    }

    async loadStandards() {
        try {
            this.showLoading();
            const category = document.getElementById('standardCategoryFilter')?.value || '';
            const search = document.getElementById('standardSearch')?.value || '';
            
            const params = new URLSearchParams({
                page: this.currentPage,
                per_page: this.itemsPerPage
            });
            
            if (category) params.append('category', category);
            if (search) params.append('search', search);

            const response = await fetch(`/api/quality/standards?${params}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.renderStandards(data.standards);
                this.updatePagination(data.total, data.pages, data.current_page);
                this.populateStandardSelects(data.standards);
            }
        } catch (error) {
            console.error('Error loading standards:', error);
            this.showAlert('خطأ في تحميل معايير الجودة', 'danger');
        } finally {
            this.hideLoading();
        }
    }

    renderStandards(standards) {
        const tbody = document.getElementById('standardsTableBody');
        if (!tbody) return;

        tbody.innerHTML = '';

        standards.forEach(standard => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${standard.standard_code}</td>
                <td>${standard.standard_name}</td>
                <td>
                    <span class="badge bg-primary">${standard.category}</span>
                </td>
                <td>${standard.target_score}%</td>
                <td>${standard.international_standard || '-'}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary" onclick="qualityManager.viewStandard(${standard.id})">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-warning" onclick="qualityManager.editStandard(${standard.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    async loadAudits() {
        try {
            this.showLoading();
            const response = await fetch('/api/quality/audits', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.renderAudits(data.audits);
            }
        } catch (error) {
            console.error('Error loading audits:', error);
            this.showAlert('خطأ في تحميل التدقيقات', 'danger');
        } finally {
            this.hideLoading();
        }
    }

    renderAudits(audits) {
        const tbody = document.getElementById('auditsTableBody');
        if (!tbody) return;

        tbody.innerHTML = '';

        audits.forEach(audit => {
            const statusBadge = this.getStatusBadge(audit.status);
            const scoreDisplay = audit.overall_score ? `${audit.overall_score}%` : '-';
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${audit.audit_code}</td>
                <td>${audit.audit_title}</td>
                <td>
                    <span class="badge bg-info">${audit.audit_type}</span>
                </td>
                <td>${audit.auditor_name}</td>
                <td>${this.formatDate(audit.planned_date)}</td>
                <td>${statusBadge}</td>
                <td>${scoreDisplay}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary" onclick="qualityManager.viewAudit(${audit.id})">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-warning" onclick="qualityManager.editAudit(${audit.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    async loadAnalytics() {
        try {
            this.showLoading();
            const response = await fetch('/api/quality/dashboard', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.renderCharts(data);
            }
        } catch (error) {
            console.error('Error loading analytics:', error);
            this.showAlert('خطأ في تحميل التحليلات', 'danger');
        } finally {
            this.hideLoading();
        }
    }

    renderCharts(data) {
        // Audit Types Chart
        const auditTypesCtx = document.getElementById('auditTypesChart');
        if (auditTypesCtx && data.audit_types) {
            if (this.charts.auditTypes) {
                this.charts.auditTypes.destroy();
            }
            
            this.charts.auditTypes = new Chart(auditTypesCtx, {
                type: 'doughnut',
                data: {
                    labels: data.audit_types.map(item => item.type),
                    datasets: [{
                        data: data.audit_types.map(item => item.count),
                        backgroundColor: [
                            '#FF6384',
                            '#36A2EB',
                            '#FFCE56',
                            '#4BC0C0',
                            '#9966FF'
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

        // Standard Categories Chart
        const standardCategoriesCtx = document.getElementById('standardCategoriesChart');
        if (standardCategoriesCtx && data.standard_categories) {
            if (this.charts.standardCategories) {
                this.charts.standardCategories.destroy();
            }
            
            this.charts.standardCategories = new Chart(standardCategoriesCtx, {
                type: 'bar',
                data: {
                    labels: data.standard_categories.map(item => item.category),
                    datasets: [{
                        label: 'عدد المعايير',
                        data: data.standard_categories.map(item => item.count),
                        backgroundColor: '#36A2EB',
                        borderColor: '#36A2EB',
                        borderWidth: 1
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

    async addStandard() {
        try {
            const form = document.getElementById('addStandardForm');
            const formData = new FormData(form);
            const data = Object.fromEntries(formData);

            const response = await fetch('/api/quality/standards', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                const result = await response.json();
                this.showAlert('تم إضافة معيار الجودة بنجاح', 'success');
                bootstrap.Modal.getInstance(document.getElementById('addStandardModal')).hide();
                form.reset();
                this.loadStandards();
                this.loadDashboardData();
            } else {
                const error = await response.json();
                this.showAlert(error.error || 'خطأ في إضافة معيار الجودة', 'danger');
            }
        } catch (error) {
            console.error('Error adding standard:', error);
            this.showAlert('خطأ في إضافة معيار الجودة', 'danger');
        }
    }

    async addAudit() {
        try {
            const form = document.getElementById('addAuditForm');
            const formData = new FormData(form);
            const data = Object.fromEntries(formData);

            const response = await fetch('/api/quality/audits', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                const result = await response.json();
                this.showAlert('تم إضافة التدقيق بنجاح', 'success');
                bootstrap.Modal.getInstance(document.getElementById('addAuditModal')).hide();
                form.reset();
                this.loadAudits();
                this.loadDashboardData();
            } else {
                const error = await response.json();
                this.showAlert(error.error || 'خطأ في إضافة التدقيق', 'danger');
            }
        } catch (error) {
            console.error('Error adding audit:', error);
            this.showAlert('خطأ في إضافة التدقيق', 'danger');
        }
    }

    populateStandardSelects(standards) {
        const select = document.getElementById('auditStandardSelect');
        if (select) {
            select.innerHTML = '<option value="">اختر المعيار</option>';
            standards.forEach(standard => {
                const option = document.createElement('option');
                option.value = standard.id;
                option.textContent = `${standard.standard_code} - ${standard.standard_name}`;
                select.appendChild(option);
            });
        }
    }

    // Placeholder methods for future implementation
    async loadCertificates() {
        console.log('Loading certificates...');
    }

    async loadIndicators() {
        console.log('Loading indicators...');
    }

    async loadChecklists() {
        console.log('Loading checklists...');
    }

    viewStandard(id) {
        console.log('Viewing standard:', id);
    }

    editStandard(id) {
        console.log('Editing standard:', id);
    }

    viewAudit(id) {
        console.log('Viewing audit:', id);
    }

    editAudit(id) {
        console.log('Editing audit:', id);
    }

    // Utility methods
    getStatusBadge(status) {
        const statusMap = {
            'مخطط': 'bg-secondary',
            'جاري': 'bg-primary',
            'مكتمل': 'bg-success',
            'ملغي': 'bg-danger'
        };
        
        const badgeClass = statusMap[status] || 'bg-secondary';
        return `<span class="badge ${badgeClass}">${status}</span>`;
    }

    formatDate(dateString) {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString('ar-SA');
    }

    updatePagination(total, pages, currentPage) {
        // Pagination implementation would go here
        console.log(`Pagination: ${currentPage}/${pages} (${total} total)`);
    }

    showLoading() {
        const spinner = document.getElementById('loadingSpinner');
        if (spinner) {
            spinner.classList.remove('d-none');
        }
    }

    hideLoading() {
        const spinner = document.getElementById('loadingSpinner');
        if (spinner) {
            spinner.classList.add('d-none');
        }
    }

    showAlert(message, type = 'info') {
        // Create alert element
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        // Insert at top of main content
        const main = document.querySelector('main');
        if (main) {
            main.insertBefore(alertDiv, main.firstChild);
            
            // Auto-dismiss after 5 seconds
            setTimeout(() => {
                if (alertDiv.parentNode) {
                    alertDiv.remove();
                }
            }, 5000);
        }
    }

    debounce(func, wait) {
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
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.qualityManager = new QualityManager();
});
