/**
 * ML Analytics Manager - إدارة نظام التحليلات المتقدمة بالذكاء الاصطناعي
 */
class MLAnalyticsManager {
    constructor() {
        this.currentPage = {
            models: 1,
            predictions: 1,
            patterns: 1,
            insights: 1,
            alerts: 1
        };
        this.filters = {
            models: { type: '', status: '', search: '' },
            predictions: { model_id: '', type: '' },
            patterns: { type: '' },
            insights: { category: '', status: '' },
            alerts: { severity: '', status: '' }
        };
        this.charts = {};
        this.init();
    }

    init() {
        this.loadDashboard();
        this.setupEventListeners();
        this.initializeCharts();
    }

    setupEventListeners() {
        // Tab switching
        document.querySelectorAll('#mlTabs button[data-bs-toggle="pill"]').forEach(tab => {
            tab.addEventListener('shown.bs.tab', (e) => {
                const target = e.target.getAttribute('data-bs-target');
                this.handleTabSwitch(target);
            });
        });
    }

    handleTabSwitch(target) {
        switch(target) {
            case '#models':
                this.loadModels();
                break;
            case '#predictions':
                this.loadPredictions();
                break;
            case '#patterns':
                this.loadPatterns();
                break;
            case '#insights':
                this.loadInsights();
                break;
            case '#alerts':
                this.loadAlerts();
                break;
        }
    }

    async loadDashboard() {
        try {
            this.showLoading();
            const response = await this.apiCall('/api/ml-analytics/dashboard');
            
            if (response.success) {
                this.updateStatistics(response.dashboard.statistics);
                this.updateCharts(response.dashboard);
            }
        } catch (error) {
            this.showAlert('خطأ في تحميل لوحة التحكم: ' + error.message, 'danger');
        } finally {
            this.hideLoading();
        }
    }

    updateStatistics(stats) {
        document.getElementById('totalModels').textContent = stats.total_models || 0;
        document.getElementById('activeModels').textContent = stats.active_models || 0;
        document.getElementById('totalPredictions').textContent = stats.total_predictions || 0;
        document.getElementById('activeAlerts').textContent = stats.active_alerts || 0;
    }

    updateCharts(data) {
        // Models by type chart
        if (data.models_by_type && data.models_by_type.length > 0) {
            this.createModelsTypeChart(data.models_by_type);
        }
    }

    createModelsTypeChart(data) {
        const ctx = document.getElementById('modelsTypeChart');
        if (this.charts.modelsType) {
            this.charts.modelsType.destroy();
        }
        
        this.charts.modelsType = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: data.map(item => this.translateModelType(item.type)),
                datasets: [{
                    data: data.map(item => item.count),
                    backgroundColor: ['#667eea', '#764ba2', '#f093fb', '#4facfe']
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

    async loadModels() {
        try {
            const params = new URLSearchParams({
                page: this.currentPage.models,
                per_page: 10,
                ...this.filters.models
            });
            
            const response = await this.apiCall(`/api/ml-analytics/models?${params}`);
            
            if (response.success) {
                this.renderModels(response.models);
                this.renderPagination('models', response.pagination);
            }
        } catch (error) {
            this.showAlert('خطأ في تحميل النماذج: ' + error.message, 'danger');
        }
    }

    renderModels(models) {
        const container = document.getElementById('modelsList');
        
        if (models.length === 0) {
            container.innerHTML = '<div class="col-12"><div class="alert alert-info">لا توجد نماذج متاحة</div></div>';
            return;
        }
        
        container.innerHTML = models.map(model => `
            <div class="col-md-6 mb-3">
                <div class="card model-card">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <h6 class="card-title">${model.name}</h6>
                            <span class="badge bg-${model.status_color}">${this.translateModelStatus(model.status)}</span>
                        </div>
                        <p class="card-text text-muted small">${model.description || 'لا يوجد وصف'}</p>
                        <div class="row text-center mb-2">
                            <div class="col-3">
                                <small class="text-muted">الدقة</small>
                                <div class="fw-bold">${((model.accuracy_score || 0) * 100).toFixed(1)}%</div>
                            </div>
                            <div class="col-3">
                                <small class="text-muted">الدقة</small>
                                <div class="fw-bold">${((model.precision_score || 0) * 100).toFixed(1)}%</div>
                            </div>
                            <div class="col-3">
                                <small class="text-muted">الاستدعاء</small>
                                <div class="fw-bold">${((model.recall_score || 0) * 100).toFixed(1)}%</div>
                            </div>
                            <div class="col-3">
                                <small class="text-muted">F1</small>
                                <div class="fw-bold">${((model.f1_score || 0) * 100).toFixed(1)}%</div>
                            </div>
                        </div>
                        <div class="performance-bar mb-2">
                            <div class="performance-fill bg-success" style="width: ${(model.performance_score || 0) * 100}%"></div>
                        </div>
                        <div class="d-flex justify-content-between align-items-center">
                            <small class="text-muted">${model.algorithm} • ${model.predictions_count} تنبؤ</small>
                            <div class="btn-group btn-group-sm">
                                <button class="btn btn-outline-primary" onclick="mlAnalytics.trainModel(${model.id})" ${model.status === 'training' ? 'disabled' : ''}>
                                    <i class="fas fa-play"></i>
                                </button>
                                <button class="btn btn-outline-info" onclick="mlAnalytics.viewModelDetails(${model.id})">
                                    <i class="fas fa-eye"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    async createModel() {
        try {
            const form = document.getElementById('createModelForm');
            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());
            
            const response = await this.apiCall('/api/ml-analytics/models', {
                method: 'POST',
                body: JSON.stringify(data)
            });
            
            if (response.success) {
                this.showAlert('تم إنشاء النموذج بنجاح', 'success');
                bootstrap.Modal.getInstance(document.getElementById('createModelModal')).hide();
                form.reset();
                this.loadModels();
            }
        } catch (error) {
            this.showAlert('خطأ في إنشاء النموذج: ' + error.message, 'danger');
        }
    }

    async trainModel(modelId) {
        try {
            this.showLoading();
            const response = await this.apiCall(`/api/ml-analytics/models/${modelId}/train`, {
                method: 'POST',
                body: JSON.stringify({
                    training_data_size: 1000,
                    features_count: 10
                })
            });
            
            if (response.success) {
                this.showAlert('تم تدريب النموذج بنجاح', 'success');
                this.loadModels();
            }
        } catch (error) {
            this.showAlert('خطأ في تدريب النموذج: ' + error.message, 'danger');
        } finally {
            this.hideLoading();
        }
    }

    // Utility methods
    translateModelType(type) {
        const translations = {
            'classification': 'تصنيف',
            'regression': 'انحدار', 
            'clustering': 'تجميع',
            'forecasting': 'تنبؤ'
        };
        return translations[type] || type;
    }

    translateModelStatus(status) {
        const translations = {
            'training': 'قيد التدريب',
            'ready': 'جاهز',
            'deployed': 'مُنشر',
            'deprecated': 'مُهمل'
        };
        return translations[status] || status;
    }

    async apiCall(url, options = {}) {
        const token = localStorage.getItem('access_token');
        const defaultOptions = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        };
        
        const response = await fetch(url, { ...defaultOptions, ...options });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    }

    showLoading() {
        document.getElementById('loadingSpinner').classList.remove('d-none');
    }

    hideLoading() {
        document.getElementById('loadingSpinner').classList.add('d-none');
    }

    showAlert(message, type = 'info') {
        // Create and show alert
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
                alertDiv.remove();
            }
        }, 5000);
    }

    showCreateModelModal() {
        new bootstrap.Modal(document.getElementById('createModelModal')).show();
    }

    refreshDashboard() {
        this.loadDashboard();
        this.loadModels();
    }

    // Placeholder methods for other functionalities
    async loadPredictions() {
        console.log('Loading predictions...');
    }

    async loadPatterns() {
        console.log('Loading patterns...');
    }

    async loadInsights() {
        console.log('Loading insights...');
    }

    async loadAlerts() {
        console.log('Loading alerts...');
    }

    filterModels() {
        const typeFilter = document.getElementById('modelTypeFilter').value;
        const statusFilter = document.getElementById('modelStatusFilter').value;
        
        this.filters.models.type = typeFilter;
        this.filters.models.status = statusFilter;
        this.currentPage.models = 1;
        
        this.loadModels();
    }

    searchModels() {
        const searchInput = document.getElementById('modelSearchInput').value;
        this.filters.models.search = searchInput;
        this.currentPage.models = 1;
        
        clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(() => {
            this.loadModels();
        }, 500);
    }

    renderPagination(type, pagination) {
        const container = document.getElementById(`${type}Pagination`);
        
        if (pagination.pages <= 1) {
            container.innerHTML = '';
            return;
        }
        
        let paginationHTML = '<ul class="pagination justify-content-center">';
        
        // Previous button
        paginationHTML += `
            <li class="page-item ${!pagination.has_prev ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="mlAnalytics.changePage('${type}', ${pagination.page - 1})">
                    <i class="fas fa-chevron-right"></i>
                </a>
            </li>
        `;
        
        // Page numbers
        for (let i = 1; i <= pagination.pages; i++) {
            if (i === pagination.page || i === 1 || i === pagination.pages || 
                (i >= pagination.page - 2 && i <= pagination.page + 2)) {
                paginationHTML += `
                    <li class="page-item ${i === pagination.page ? 'active' : ''}">
                        <a class="page-link" href="#" onclick="mlAnalytics.changePage('${type}', ${i})">${i}</a>
                    </li>
                `;
            } else if (i === pagination.page - 3 || i === pagination.page + 3) {
                paginationHTML += '<li class="page-item disabled"><span class="page-link">...</span></li>';
            }
        }
        
        // Next button
        paginationHTML += `
            <li class="page-item ${!pagination.has_next ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="mlAnalytics.changePage('${type}', ${pagination.page + 1})">
                    <i class="fas fa-chevron-left"></i>
                </a>
            </li>
        `;
        
        paginationHTML += '</ul>';
        container.innerHTML = paginationHTML;
    }

    changePage(type, page) {
        this.currentPage[type] = page;
        
        switch(type) {
            case 'models':
                this.loadModels();
                break;
            case 'predictions':
                this.loadPredictions();
                break;
            case 'patterns':
                this.loadPatterns();
                break;
            case 'insights':
                this.loadInsights();
                break;
            case 'alerts':
                this.loadAlerts();
                break;
        }
    }

    initializeCharts() {
        // Initialize empty charts
        const ctx = document.getElementById('modelsTypeChart');
        if (ctx) {
            this.charts.modelsType = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: [],
                    datasets: [{
                        data: [],
                        backgroundColor: []
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false
                }
            });
        }
    }
}
