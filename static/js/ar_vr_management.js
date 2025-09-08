/*!
 * AR/VR Management System JavaScript
 * Comprehensive management for Augmented Reality and Virtual Reality features
 */

class ARVRManager {
    constructor() {
        this.currentPage = 1;
        this.itemsPerPage = 12;
        this.currentFilters = {};
        this.charts = {};
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.loadDashboardData();
        this.loadContent();
        this.loadStudentsAndContent();
    }
    
    setupEventListeners() {
        // Tab change events
        document.querySelectorAll('#arvrTabs button[data-bs-toggle="pill"]').forEach(tab => {
            tab.addEventListener('shown.bs.tab', (e) => {
                const target = e.target.getAttribute('data-bs-target');
                this.handleTabChange(target);
            });
        });
        
        // Filter events
        document.getElementById('experienceTypeFilter')?.addEventListener('change', () => this.applyFilters());
        document.getElementById('categoryFilter')?.addEventListener('change', () => this.applyFilters());
        document.getElementById('difficultyFilter')?.addEventListener('change', () => this.applyFilters());
        document.getElementById('searchContent')?.addEventListener('input', this.debounce(() => this.applyFilters(), 500));
        
        // Therapy filters
        document.getElementById('therapyTypeFilter')?.addEventListener('change', () => this.loadTherapyScenarios());
        document.getElementById('conditionFilter')?.addEventListener('change', () => this.loadTherapyScenarios());
    }
    
    handleTabChange(target) {
        switch(target) {
            case '#content':
                this.loadContent();
                break;
            case '#sessions':
                this.loadSessions();
                break;
            case '#environments':
                this.loadEnvironments();
                break;
            case '#therapy':
                this.loadTherapyScenarios();
                break;
            case '#analytics':
                this.loadAnalytics();
                break;
        }
    }
    
    async loadDashboardData() {
        try {
            this.showLoading();
            
            const response = await fetch('/api/ar-vr/analytics/dashboard', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                this.updateDashboardStats(data.dashboard);
            }
        } catch (error) {
            console.error('Error loading dashboard data:', error);
            this.showAlert('خطأ في تحميل بيانات لوحة التحكم', 'danger');
        } finally {
            this.hideLoading();
        }
    }
    
    updateDashboardStats(dashboard) {
        // Update stat cards
        const arCount = dashboard.experience_distribution.find(d => d.type === 'ar')?.sessions || 0;
        const vrCount = dashboard.experience_distribution.find(d => d.type === 'vr')?.sessions || 0;
        const mrCount = dashboard.experience_distribution.find(d => d.type === 'mr')?.sessions || 0;
        
        document.getElementById('arContentCount').textContent = arCount;
        document.getElementById('vrContentCount').textContent = vrCount;
        document.getElementById('mrContentCount').textContent = mrCount;
        document.getElementById('totalSessions').textContent = dashboard.total_sessions;
        
        // Update performance circles
        document.getElementById('avgDurationCircle').textContent = `${dashboard.avg_session_duration} د`;
        document.getElementById('completionRateCircle').textContent = `${dashboard.completion_rate}%`;
        document.getElementById('activeUsersCircle').textContent = dashboard.active_users;
        document.getElementById('motionSicknessCircle').textContent = dashboard.motion_sickness_incidents;
    }
    
    async loadContent() {
        try {
            this.showLoading();
            
            const params = new URLSearchParams({
                page: this.currentPage,
                per_page: this.itemsPerPage,
                ...this.currentFilters
            });
            
            const response = await fetch(`/api/ar-vr/content?${params}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                this.renderContent(data.content);
                this.renderPagination(data.pagination, 'contentPagination');
            }
        } catch (error) {
            console.error('Error loading content:', error);
            this.showAlert('خطأ في تحميل المحتوى', 'danger');
        } finally {
            this.hideLoading();
        }
    }
    
    renderContent(content) {
        const container = document.getElementById('contentList');
        if (!container) return;
        
        if (content.length === 0) {
            container.innerHTML = `
                <div class="col-12">
                    <div class="text-center py-5">
                        <i class="fas fa-cube fa-3x text-muted mb-3"></i>
                        <h5 class="text-muted">لا يوجد محتوى متاح</h5>
                        <p class="text-muted">قم بإضافة محتوى AR/VR جديد للبدء</p>
                    </div>
                </div>
            `;
            return;
        }
        
        container.innerHTML = content.map(item => `
            <div class="col-lg-4 col-md-6">
                <div class="content-item">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <h6 class="mb-0">${item.title_ar}</h6>
                        <span class="experience-badge badge-${item.experience_type}">
                            ${this.getExperienceTypeText(item.experience_type)}
                        </span>
                    </div>
                    
                    ${item.title_en ? `<p class="text-muted small mb-2">${item.title_en}</p>` : ''}
                    
                    <p class="text-muted small mb-2">${item.description_ar || 'لا يوجد وصف'}</p>
                    
                    <div class="row text-center mb-2">
                        <div class="col-4">
                            <small class="text-muted">الفئة</small><br>
                            <small><strong>${this.getCategoryText(item.category)}</strong></small>
                        </div>
                        <div class="col-4">
                            <small class="text-muted">المستوى</small><br>
                            <small><strong>${this.getDifficultyText(item.difficulty_level)}</strong></small>
                        </div>
                        <div class="col-4">
                            <small class="text-muted">المدة</small><br>
                            <small><strong>${item.duration_minutes || 'غير محدد'} د</strong></small>
                        </div>
                    </div>
                    
                    <div class="d-flex justify-content-between align-items-center">
                        <small class="text-muted">
                            ${item.target_age_min && item.target_age_max ? 
                                `العمر: ${item.target_age_min}-${item.target_age_max}` : 
                                'جميع الأعمار'
                            }
                        </small>
                        <div>
                            ${item.requires_supervision ? 
                                '<i class="fas fa-eye text-warning" title="يتطلب إشراف"></i>' : 
                                '<i class="fas fa-user-check text-success" title="مستقل"></i>'
                            }
                        </div>
                    </div>
                    
                    <div class="mt-3">
                        <button class="btn btn-sm btn-primary me-2" onclick="arvrManager.viewContentDetails('${item.id}')">
                            <i class="fas fa-eye me-1"></i>عرض
                        </button>
                        <button class="btn btn-sm btn-success" onclick="arvrManager.startSessionWithContent('${item.id}')">
                            <i class="fas fa-play me-1"></i>بدء جلسة
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }
    
    async loadSessions() {
        try {
            this.showLoading();
            
            // For now, show a placeholder since we need to implement session listing
            const container = document.getElementById('sessionsList');
            if (container) {
                container.innerHTML = `
                    <div class="text-center py-5">
                        <i class="fas fa-play-circle fa-3x text-muted mb-3"></i>
                        <h5 class="text-muted">جلسات AR/VR</h5>
                        <p class="text-muted">سيتم عرض الجلسات النشطة والمكتملة هنا</p>
                        <button class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#startSessionModal">
                            <i class="fas fa-plus me-2"></i>بدء جلسة جديدة
                        </button>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Error loading sessions:', error);
        } finally {
            this.hideLoading();
        }
    }
    
    async loadEnvironments() {
        try {
            this.showLoading();
            
            const response = await fetch('/api/ar-vr/environments', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                this.renderEnvironments(data.environments);
            }
        } catch (error) {
            console.error('Error loading environments:', error);
            this.showAlert('خطأ في تحميل البيئات', 'danger');
        } finally {
            this.hideLoading();
        }
    }
    
    renderEnvironments(environments) {
        const container = document.getElementById('environmentsList');
        if (!container) return;
        
        if (environments.length === 0) {
            container.innerHTML = `
                <div class="col-12">
                    <div class="text-center py-5">
                        <i class="fas fa-globe fa-3x text-muted mb-3"></i>
                        <h5 class="text-muted">لا توجد بيئات افتراضية</h5>
                        <p class="text-muted">سيتم إضافة البيئات الافتراضية قريباً</p>
                    </div>
                </div>
            `;
            return;
        }
        
        container.innerHTML = environments.map(env => `
            <div class="col-lg-4 col-md-6">
                <div class="content-item">
                    <h6 class="mb-2">${env.name_ar}</h6>
                    ${env.name_en ? `<p class="text-muted small mb-2">${env.name_en}</p>` : ''}
                    <p class="text-muted small mb-2">${env.description_ar || 'لا يوجد وصف'}</p>
                    
                    <div class="row text-center mb-2">
                        <div class="col-6">
                            <small class="text-muted">النوع</small><br>
                            <small><strong>${this.getEnvironmentTypeText(env.environment_type)}</strong></small>
                        </div>
                        <div class="col-6">
                            <small class="text-muted">الواقعية</small><br>
                            <small><strong>${this.getRealismLevelText(env.realism_level)}</strong></small>
                        </div>
                    </div>
                    
                    <div class="mt-3">
                        <span class="badge bg-info me-1">${env.navigation_type}</span>
                        ${env.physics_enabled ? '<span class="badge bg-success">فيزياء</span>' : ''}
                    </div>
                </div>
            </div>
        `).join('');
    }
    
    async loadTherapyScenarios() {
        try {
            this.showLoading();
            
            const therapyType = document.getElementById('therapyTypeFilter')?.value || '';
            const targetCondition = document.getElementById('conditionFilter')?.value || '';
            
            const params = new URLSearchParams();
            if (therapyType) params.append('therapy_type', therapyType);
            if (targetCondition) params.append('target_condition', targetCondition);
            
            const response = await fetch(`/api/ar-vr/therapy-scenarios?${params}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                this.renderTherapyScenarios(data.scenarios);
            }
        } catch (error) {
            console.error('Error loading therapy scenarios:', error);
            this.showAlert('خطأ في تحميل سيناريوهات العلاج', 'danger');
        } finally {
            this.hideLoading();
        }
    }
    
    renderTherapyScenarios(scenarios) {
        const container = document.getElementById('therapyScenariosList');
        if (!container) return;
        
        if (scenarios.length === 0) {
            container.innerHTML = `
                <div class="text-center py-5">
                    <i class="fas fa-heartbeat fa-3x text-muted mb-3"></i>
                    <h5 class="text-muted">لا توجد سيناريوهات علاج</h5>
                    <p class="text-muted">سيتم إضافة سيناريوهات العلاج قريباً</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = scenarios.map(scenario => `
            <div class="content-item mb-3">
                <div class="row">
                    <div class="col-md-8">
                        <h6 class="mb-2">${scenario.name_ar}</h6>
                        ${scenario.name_en ? `<p class="text-muted small mb-2">${scenario.name_en}</p>` : ''}
                        <p class="text-muted small mb-2">${scenario.scenario_description || 'لا يوجد وصف'}</p>
                    </div>
                    <div class="col-md-4">
                        <div class="text-center">
                            <span class="badge bg-primary mb-2">${this.getTherapyTypeText(scenario.therapy_type)}</span><br>
                            <span class="badge bg-secondary">${this.getConditionText(scenario.target_condition)}</span>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }
    
    async loadAnalytics() {
        try {
            this.showLoading();
            
            const response = await fetch('/api/ar-vr/analytics/dashboard', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                this.renderAnalyticsCharts(data.dashboard);
            }
        } catch (error) {
            console.error('Error loading analytics:', error);
            this.showAlert('خطأ في تحميل التحليلات', 'danger');
        } finally {
            this.hideLoading();
        }
    }
    
    renderAnalyticsCharts(dashboard) {
        // Experience Type Distribution Chart
        this.renderExperienceTypeChart(dashboard.experience_distribution);
        
        // Content Usage Chart
        this.renderContentUsageChart(dashboard.content_usage);
    }
    
    renderExperienceTypeChart(data) {
        const ctx = document.getElementById('experienceTypeChart');
        if (!ctx) return;
        
        if (this.charts.experienceType) {
            this.charts.experienceType.destroy();
        }
        
        this.charts.experienceType = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: data.map(d => this.getExperienceTypeText(d.type)),
                datasets: [{
                    data: data.map(d => d.sessions),
                    backgroundColor: [
                        '#e91e63',
                        '#2196f3',
                        '#4caf50'
                    ],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }
    
    renderContentUsageChart(data) {
        const ctx = document.getElementById('contentUsageChart');
        if (!ctx) return;
        
        if (this.charts.contentUsage) {
            this.charts.contentUsage.destroy();
        }
        
        this.charts.contentUsage = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.map(d => d.name),
                datasets: [{
                    label: 'عدد الجلسات',
                    data: data.map(d => d.sessions),
                    backgroundColor: 'rgba(102, 126, 234, 0.8)',
                    borderColor: 'rgba(102, 126, 234, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
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
    
    async loadStudentsAndContent() {
        try {
            // Load students for session modal
            const studentsResponse = await fetch('/api/students', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (studentsResponse.ok) {
                const studentsData = await studentsResponse.json();
                const studentSelect = document.getElementById('sessionStudentSelect');
                if (studentSelect && studentsData.students) {
                    studentSelect.innerHTML = '<option value="">اختر الطالب</option>' +
                        studentsData.students.map(student => 
                            `<option value="${student.id}">${student.name}</option>`
                        ).join('');
                }
            }
            
            // Load content for session modal
            const contentResponse = await fetch('/api/ar-vr/content', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (contentResponse.ok) {
                const contentData = await contentResponse.json();
                const contentSelect = document.getElementById('sessionContentSelect');
                if (contentSelect && contentData.content) {
                    contentSelect.innerHTML = '<option value="">اختر المحتوى</option>' +
                        contentData.content.map(content => 
                            `<option value="${content.id}">${content.title_ar}</option>`
                        ).join('');
                }
            }
        } catch (error) {
            console.error('Error loading students and content:', error);
        }
    }
    
    async createContent() {
        try {
            const form = document.getElementById('addContentForm');
            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());
            
            // Convert checkbox to boolean
            data.requires_supervision = formData.has('requires_supervision');
            
            // Convert numbers
            if (data.target_age_min) data.target_age_min = parseInt(data.target_age_min);
            if (data.target_age_max) data.target_age_max = parseInt(data.target_age_max);
            if (data.duration_minutes) data.duration_minutes = parseInt(data.duration_minutes);
            
            const response = await fetch('/api/ar-vr/content', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            
            const result = await response.json();
            
            if (response.ok) {
                this.showAlert(result.message, 'success');
                bootstrap.Modal.getInstance(document.getElementById('addContentModal')).hide();
                form.reset();
                this.loadContent();
                this.loadDashboardData();
            } else {
                this.showAlert(result.message, 'danger');
            }
        } catch (error) {
            console.error('Error creating content:', error);
            this.showAlert('خطأ في إنشاء المحتوى', 'danger');
        }
    }
    
    async startSession() {
        try {
            const form = document.getElementById('startSessionForm');
            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());
            
            // Convert student_id to number
            data.student_id = parseInt(data.student_id);
            
            const response = await fetch('/api/ar-vr/sessions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            
            const result = await response.json();
            
            if (response.ok) {
                this.showAlert(result.message, 'success');
                bootstrap.Modal.getInstance(document.getElementById('startSessionModal')).hide();
                form.reset();
                this.loadSessions();
                this.loadDashboardData();
            } else {
                this.showAlert(result.message, 'danger');
            }
        } catch (error) {
            console.error('Error starting session:', error);
            this.showAlert('خطأ في بدء الجلسة', 'danger');
        }
    }
    
    startSessionWithContent(contentId) {
        const contentSelect = document.getElementById('sessionContentSelect');
        if (contentSelect) {
            contentSelect.value = contentId;
        }
        
        const modal = new bootstrap.Modal(document.getElementById('startSessionModal'));
        modal.show();
    }
    
    viewContentDetails(contentId) {
        // Placeholder for content details view
        this.showAlert('سيتم إضافة عرض تفاصيل المحتوى قريباً', 'info');
    }
    
    applyFilters() {
        this.currentFilters = {
            experience_type: document.getElementById('experienceTypeFilter')?.value || '',
            category: document.getElementById('categoryFilter')?.value || '',
            difficulty: document.getElementById('difficultyFilter')?.value || '',
            search: document.getElementById('searchContent')?.value || ''
        };
        
        // Remove empty filters
        Object.keys(this.currentFilters).forEach(key => {
            if (!this.currentFilters[key]) {
                delete this.currentFilters[key];
            }
        });
        
        this.currentPage = 1;
        this.loadContent();
    }
    
    renderPagination(pagination, containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        if (pagination.pages <= 1) {
            container.innerHTML = '';
            return;
        }
        
        let paginationHTML = '';
        
        // Previous button
        if (pagination.page > 1) {
            paginationHTML += `
                <li class="page-item">
                    <a class="page-link" href="#" onclick="arvrManager.changePage(${pagination.page - 1})">السابق</a>
                </li>
            `;
        }
        
        // Page numbers
        const startPage = Math.max(1, pagination.page - 2);
        const endPage = Math.min(pagination.pages, pagination.page + 2);
        
        for (let i = startPage; i <= endPage; i++) {
            paginationHTML += `
                <li class="page-item ${i === pagination.page ? 'active' : ''}">
                    <a class="page-link" href="#" onclick="arvrManager.changePage(${i})">${i}</a>
                </li>
            `;
        }
        
        // Next button
        if (pagination.page < pagination.pages) {
            paginationHTML += `
                <li class="page-item">
                    <a class="page-link" href="#" onclick="arvrManager.changePage(${pagination.page + 1})">التالي</a>
                </li>
            `;
        }
        
        container.innerHTML = paginationHTML;
    }
    
    changePage(page) {
        this.currentPage = page;
        this.loadContent();
    }
    
    // Helper methods for text translations
    getExperienceTypeText(type) {
        const types = {
            'ar': 'واقع معزز',
            'vr': 'واقع افتراضي',
            'mr': 'واقع مختلط'
        };
        return types[type] || type;
    }
    
    getCategoryText(category) {
        const categories = {
            'educational': 'تعليمي',
            'therapeutic': 'علاجي',
            'social_skills': 'مهارات اجتماعية',
            'life_skills': 'مهارات حياتية',
            'motor_skills': 'مهارات حركية',
            'communication': 'تواصل'
        };
        return categories[category] || category;
    }
    
    getDifficultyText(difficulty) {
        const difficulties = {
            'beginner': 'مبتدئ',
            'intermediate': 'متوسط',
            'advanced': 'متقدم'
        };
        return difficulties[difficulty] || difficulty;
    }
    
    getEnvironmentTypeText(type) {
        const types = {
            'classroom': 'فصل دراسي',
            'home': 'منزل',
            'playground': 'ملعب',
            'clinic': 'عيادة'
        };
        return types[type] || type;
    }
    
    getRealismLevelText(level) {
        const levels = {
            'realistic': 'واقعي',
            'stylized': 'منمق',
            'abstract': 'مجرد'
        };
        return levels[level] || level;
    }
    
    getTherapyTypeText(type) {
        const types = {
            'exposure': 'العلاج بالتعرض',
            'social_skills': 'المهارات الاجتماعية',
            'phobia': 'علاج الرهاب',
            'anxiety': 'علاج القلق'
        };
        return types[type] || type;
    }
    
    getConditionText(condition) {
        const conditions = {
            'autism': 'طيف التوحد',
            'adhd': 'فرط الحركة',
            'anxiety': 'القلق',
            'phobia': 'الرهاب'
        };
        return conditions[condition] || condition;
    }
    
    // Utility methods
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
    
    showLoading() {
        const spinner = document.getElementById('loadingSpinner');
        if (spinner) {
            spinner.style.display = 'block';
        }
    }
    
    hideLoading() {
        const spinner = document.getElementById('loadingSpinner');
        if (spinner) {
            spinner.style.display = 'none';
        }
    }
    
    showAlert(message, type = 'info') {
        // Create alert element
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
        alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        document.body.appendChild(alertDiv);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.parentNode.removeChild(alertDiv);
            }
        }, 5000);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    if (typeof window.arvrManager === 'undefined') {
        window.arvrManager = new ARVRManager();
    }
});
