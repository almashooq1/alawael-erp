/**
 * Speech Therapy Management System
 * JavaScript for managing speech therapy programs
 */

class SpeechTherapyManager {
    constructor() {
        this.currentPage = {
            clients: 1,
            assessments: 1,
            therapyPlans: 1,
            sessions: 1
        };
        this.filters = {
            clients: {
                search: '',
                status: '',
                gender: ''
            },
            assessments: {
                client_id: '',
                assessment_type: ''
            }
        };
        this.init();
    }

    init() {
        this.loadStats();
        this.loadClients();
        this.loadClientsForSelect();
        this.setupEventListeners();
        this.setupTabHandlers();
    }

    setupEventListeners() {
        // Search input with debounce
        const clientSearch = document.getElementById('clientSearch');
        if (clientSearch) {
            let searchTimeout;
            clientSearch.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.filters.clients.search = e.target.value;
                    this.currentPage.clients = 1;
                    this.loadClients();
                }, 500);
            });
        }

        // Auto-refresh every 5 minutes
        setInterval(() => {
            this.refreshCurrentTab();
        }, 300000);
    }

    setupTabHandlers() {
        const tabs = document.querySelectorAll('#mainTabs button[data-bs-toggle="tab"]');
        tabs.forEach(tab => {
            tab.addEventListener('shown.bs.tab', (e) => {
                const targetTab = e.target.getAttribute('data-bs-target');
                this.handleTabChange(targetTab);
            });
        });
    }

    handleTabChange(targetTab) {
        switch (targetTab) {
            case '#clients':
                this.loadClients();
                break;
            case '#assessments':
                this.loadAssessments();
                break;
            case '#therapy-plans':
                this.loadTherapyPlans();
                break;
            case '#sessions':
                this.loadSessions();
                break;
            case '#analytics':
                this.loadAnalytics();
                break;
        }
    }

    async loadStats() {
        try {
            const response = await fetch('/api/speech-therapy/stats', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.updateStatsCards(data.stats);
            }
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    }

    updateStatsCards(stats) {
        document.getElementById('totalClients').textContent = stats.total_clients || 0;
        document.getElementById('totalAssessments').textContent = stats.total_assessments || 0;
        document.getElementById('activeTherapyPlans').textContent = stats.active_therapy_plans || 0;
        document.getElementById('sessionsThisMonth').textContent = stats.sessions_this_month || 0;
    }

    async loadClients() {
        try {
            const params = new URLSearchParams({
                page: this.currentPage.clients,
                per_page: 12,
                search: this.filters.clients.search,
                is_active: this.filters.clients.status || 'true'
            });

            if (this.filters.clients.gender) {
                params.append('gender', this.filters.clients.gender);
            }

            const response = await fetch(`/api/speech-therapy/clients?${params}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.renderClients(data.clients);
                this.renderClientsPagination(data.pagination);
            }
        } catch (error) {
            console.error('Error loading clients:', error);
            this.showAlert('خطأ في تحميل المستفيدين', 'danger');
        }
    }

    renderClients(clients) {
        const container = document.getElementById('clientsList');
        if (!container) return;

        if (clients.length === 0) {
            container.innerHTML = `
                <div class="col-12">
                    <div class="alert alert-info text-center">
                        <i class="fas fa-info-circle me-2"></i>
                        لا توجد مستفيدين مطابقين للبحث
                    </div>
                </div>
            `;
            return;
        }

        container.innerHTML = clients.map(client => `
            <div class="col-lg-4 col-md-6">
                <div class="client-card">
                    <div class="d-flex justify-content-between align-items-start mb-3">
                        <div>
                            <h5 class="mb-1">${client.full_name}</h5>
                            <small class="text-muted">${client.client_number}</small>
                        </div>
                        <span class="badge ${client.is_active ? 'bg-success' : 'bg-secondary'}">
                            ${client.is_active ? 'نشط' : 'غير نشط'}
                        </span>
                    </div>
                    
                    <div class="row mb-3">
                        <div class="col-6">
                            <small class="text-muted">العمر</small>
                            <div class="fw-bold">${client.age} سنة</div>
                        </div>
                        <div class="col-6">
                            <small class="text-muted">الجنس</small>
                            <div class="fw-bold">${this.translateGender(client.gender)}</div>
                        </div>
                    </div>
                    
                    ${client.guardian_name ? `
                        <div class="mb-3">
                            <small class="text-muted">ولي الأمر</small>
                            <div class="fw-bold">${client.guardian_name}</div>
                        </div>
                    ` : ''}
                    
                    <div class="d-flex gap-2">
                        <button class="btn btn-outline-primary btn-sm flex-fill" onclick="viewClient(${client.id})">
                            <i class="fas fa-eye me-1"></i>عرض
                        </button>
                        <button class="btn btn-outline-success btn-sm flex-fill" onclick="addAssessmentForClient(${client.id})">
                            <i class="fas fa-plus me-1"></i>تقييم
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    renderClientsPagination(pagination) {
        const container = document.getElementById('clientsPagination');
        if (!container || pagination.pages <= 1) {
            container.innerHTML = '';
            return;
        }

        let paginationHTML = '';
        
        // Previous button
        if (pagination.page > 1) {
            paginationHTML += `
                <li class="page-item">
                    <a class="page-link" href="#" onclick="speechTherapyManager.changePage('clients', ${pagination.page - 1})">السابق</a>
                </li>
            `;
        }

        // Page numbers
        for (let i = 1; i <= pagination.pages; i++) {
            if (i === pagination.page) {
                paginationHTML += `<li class="page-item active"><span class="page-link">${i}</span></li>`;
            } else {
                paginationHTML += `
                    <li class="page-item">
                        <a class="page-link" href="#" onclick="speechTherapyManager.changePage('clients', ${i})">${i}</a>
                    </li>
                `;
            }
        }

        // Next button
        if (pagination.page < pagination.pages) {
            paginationHTML += `
                <li class="page-item">
                    <a class="page-link" href="#" onclick="speechTherapyManager.changePage('clients', ${pagination.page + 1})">التالي</a>
                </li>
            `;
        }

        container.innerHTML = paginationHTML;
    }

    async loadAssessments() {
        try {
            const params = new URLSearchParams({
                page: this.currentPage.assessments,
                per_page: 20
            });

            if (this.filters.assessments.client_id) {
                params.append('client_id', this.filters.assessments.client_id);
            }

            if (this.filters.assessments.assessment_type) {
                params.append('assessment_type', this.filters.assessments.assessment_type);
            }

            const response = await fetch(`/api/speech-therapy/assessments?${params}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.renderAssessments(data.assessments);
                this.renderAssessmentsPagination(data.pagination);
            }
        } catch (error) {
            console.error('Error loading assessments:', error);
            this.showAlert('خطأ في تحميل التقييمات', 'danger');
        }
    }

    renderAssessments(assessments) {
        const tbody = document.getElementById('assessmentsTableBody');
        if (!tbody) return;

        if (assessments.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center py-4">
                        <i class="fas fa-info-circle me-2"></i>
                        لا توجد تقييمات
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = assessments.map(assessment => `
            <tr>
                <td>${assessment.assessment_number}</td>
                <td>${assessment.client_name}</td>
                <td>${assessment.therapist_name}</td>
                <td>${this.translateAssessmentType(assessment.assessment_type)}</td>
                <td>${this.formatDate(assessment.assessment_date)}</td>
                <td>${this.translateDisorderType(assessment.primary_disorder)}</td>
                <td>
                    <span class="badge ${this.getSeverityBadgeClass(assessment.severity_level)}">
                        ${this.translateSeverityLevel(assessment.severity_level)}
                    </span>
                </td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary" onclick="viewAssessment(${assessment.id})">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-outline-success" onclick="editAssessment(${assessment.id})">
                            <i class="fas fa-edit"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    async loadClientsForSelect() {
        try {
            const response = await fetch('/api/speech-therapy/clients?per_page=100', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                const select = document.getElementById('assessmentClientSelect');
                if (select) {
                    select.innerHTML = '<option value="">اختر المستفيد</option>' +
                        data.clients.map(client => 
                            `<option value="${client.id}">${client.full_name} (${client.client_number})</option>`
                        ).join('');
                }
            }
        } catch (error) {
            console.error('Error loading clients for select:', error);
        }
    }

    async loadAnalytics() {
        try {
            const response = await fetch('/api/speech-therapy/stats', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.renderCharts(data.stats);
            }
        } catch (error) {
            console.error('Error loading analytics:', error);
        }
    }

    renderCharts(stats) {
        // Disorder Distribution Chart
        const disorderCtx = document.getElementById('disorderChart');
        if (disorderCtx && stats.disorder_distribution) {
            new Chart(disorderCtx, {
                type: 'doughnut',
                data: {
                    labels: stats.disorder_distribution.map(item => this.translateDisorderType(item.disorder)),
                    datasets: [{
                        data: stats.disorder_distribution.map(item => item.count),
                        backgroundColor: [
                            '#667eea', '#764ba2', '#f093fb', '#f5576c',
                            '#4facfe', '#00f2fe', '#43e97b', '#38f9d7'
                        ]
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: true,
                            text: 'توزيع أنواع الاضطرابات'
                        },
                        legend: {
                            position: 'bottom'
                        }
                    }
                }
            });
        }

        // Severity Distribution Chart
        const severityCtx = document.getElementById('severityChart');
        if (severityCtx && stats.severity_distribution) {
            new Chart(severityCtx, {
                type: 'bar',
                data: {
                    labels: stats.severity_distribution.map(item => this.translateSeverityLevel(item.severity)),
                    datasets: [{
                        label: 'عدد الحالات',
                        data: stats.severity_distribution.map(item => item.count),
                        backgroundColor: [
                            '#43e97b', '#4facfe', '#f093fb', '#f5576c'
                        ]
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: true,
                            text: 'توزيع مستويات الشدة'
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            });
        }
    }

    changePage(type, page) {
        this.currentPage[type] = page;
        switch (type) {
            case 'clients':
                this.loadClients();
                break;
            case 'assessments':
                this.loadAssessments();
                break;
        }
    }

    applyClientFilters() {
        this.filters.clients.status = document.getElementById('clientStatusFilter').value;
        this.filters.clients.gender = document.getElementById('clientGenderFilter').value;
        this.currentPage.clients = 1;
        this.loadClients();
    }

    async saveClient() {
        const form = document.getElementById('addClientForm');
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        try {
            const response = await fetch('/api/speech-therapy/clients', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                const result = await response.json();
                this.showAlert('تم إضافة المستفيد بنجاح', 'success');
                bootstrap.Modal.getInstance(document.getElementById('addClientModal')).hide();
                form.reset();
                this.loadClients();
                this.loadStats();
                this.loadClientsForSelect();
            } else {
                const error = await response.json();
                this.showAlert(error.error || 'خطأ في إضافة المستفيد', 'danger');
            }
        } catch (error) {
            console.error('Error saving client:', error);
            this.showAlert('خطأ في الاتصال بالخادم', 'danger');
        }
    }

    async saveAssessment() {
        const form = document.getElementById('addAssessmentForm');
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        try {
            const response = await fetch('/api/speech-therapy/assessments', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                const result = await response.json();
                this.showAlert('تم إضافة التقييم بنجاح', 'success');
                bootstrap.Modal.getInstance(document.getElementById('addAssessmentModal')).hide();
                form.reset();
                this.loadAssessments();
                this.loadStats();
            } else {
                const error = await response.json();
                this.showAlert(error.error || 'خطأ في إضافة التقييم', 'danger');
            }
        } catch (error) {
            console.error('Error saving assessment:', error);
            this.showAlert('خطأ في الاتصال بالخادم', 'danger');
        }
    }

    refreshCurrentTab() {
        const activeTab = document.querySelector('#mainTabs .nav-link.active');
        if (activeTab) {
            const targetTab = activeTab.getAttribute('data-bs-target');
            this.handleTabChange(targetTab);
        }
    }

    // Translation helpers
    translateGender(gender) {
        const translations = {
            'male': 'ذكر',
            'female': 'أنثى'
        };
        return translations[gender] || gender;
    }

    translateAssessmentType(type) {
        const translations = {
            'initial': 'تقييم أولي',
            'progress': 'تقييم تقدم',
            'final': 'تقييم نهائي',
            'diagnostic': 'تقييم تشخيصي'
        };
        return translations[type] || type;
    }

    translateDisorderType(disorder) {
        const translations = {
            'articulation': 'اضطراب النطق',
            'language': 'اضطراب اللغة',
            'fluency': 'اضطراب الطلاقة',
            'voice': 'اضطراب الصوت',
            'hearing': 'اضطراب السمع',
            'swallowing': 'اضطراب البلع',
            'cognitive': 'اضطراب معرفي',
            'autism': 'طيف التوحد',
            'developmental': 'تأخر نمائي'
        };
        return translations[disorder] || disorder;
    }

    translateSeverityLevel(severity) {
        const translations = {
            'mild': 'خفيف',
            'moderate': 'متوسط',
            'severe': 'شديد',
            'profound': 'شديد جداً'
        };
        return translations[severity] || severity;
    }

    getSeverityBadgeClass(severity) {
        const classes = {
            'mild': 'bg-success',
            'moderate': 'bg-warning',
            'severe': 'bg-danger',
            'profound': 'bg-dark'
        };
        return classes[severity] || 'bg-secondary';
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('ar-SA');
    }

    showAlert(message, type = 'info') {
        const alertContainer = document.createElement('div');
        alertContainer.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
        alertContainer.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
        alertContainer.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        document.body.appendChild(alertContainer);
        
        setTimeout(() => {
            if (alertContainer.parentNode) {
                alertContainer.parentNode.removeChild(alertContainer);
            }
        }, 5000);
    }

    loadTherapyPlans() {
        // Placeholder for therapy plans loading
        const container = document.getElementById('therapyPlansList');
        if (container) {
            container.innerHTML = `
                <div class="alert alert-info text-center">
                    <i class="fas fa-info-circle me-2"></i>
                    سيتم تطوير إدارة الخطط العلاجية قريباً
                </div>
            `;
        }
    }

    loadSessions() {
        // Placeholder for sessions loading
        const container = document.getElementById('sessionsList');
        if (container) {
            container.innerHTML = `
                <div class="alert alert-info text-center">
                    <i class="fas fa-info-circle me-2"></i>
                    سيتم تطوير إدارة الجلسات العلاجية قريباً
                </div>
            `;
        }
    }
}

// Global functions
function refreshData() {
    if (window.speechTherapyManager) {
        window.speechTherapyManager.loadStats();
        window.speechTherapyManager.refreshCurrentTab();
    }
}

function applyClientFilters() {
    if (window.speechTherapyManager) {
        window.speechTherapyManager.applyClientFilters();
    }
}

function saveClient() {
    if (window.speechTherapyManager) {
        window.speechTherapyManager.saveClient();
    }
}

function saveAssessment() {
    if (window.speechTherapyManager) {
        window.speechTherapyManager.saveAssessment();
    }
}

function viewClient(clientId) {
    // Placeholder for client details view
    alert(`عرض تفاصيل المستفيد رقم: ${clientId}`);
}

function addAssessmentForClient(clientId) {
    const modal = new bootstrap.Modal(document.getElementById('addAssessmentModal'));
    const clientSelect = document.getElementById('assessmentClientSelect');
    if (clientSelect) {
        clientSelect.value = clientId;
    }
    modal.show();
}

function viewAssessment(assessmentId) {
    // Placeholder for assessment details view
    alert(`عرض تفاصيل التقييم رقم: ${assessmentId}`);
}

function editAssessment(assessmentId) {
    // Placeholder for assessment editing
    alert(`تعديل التقييم رقم: ${assessmentId}`);
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.speechTherapyManager = new SpeechTherapyManager();
});
