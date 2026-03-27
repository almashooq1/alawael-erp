/**
 * Performance Monitoring System JavaScript
 * Real-time performance monitoring and analytics for Al-Awael Centers
 */

class PerformanceMonitoringManager {
    constructor() {
        this.currentPage = 1;
        this.itemsPerPage = 20;
        this.refreshInterval = null;
        this.charts = {};
        this.currentDashboard = null;
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadInitialData();
        this.startAutoRefresh();
    }

    bindEvents() {
        // Refresh button
        document.getElementById('refreshBtn')?.addEventListener('click', () => {
            this.loadInitialData();
        });

        // Export button
        document.getElementById('exportBtn')?.addEventListener('click', () => {
            this.exportData();
        });

        // Tab switching
        document.querySelectorAll('#mainTabs .nav-link').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const targetTab = e.target.getAttribute('href').substring(1);
                this.handleTabSwitch(targetTab);
            });
        });

        // Metrics filters
        document.getElementById('metricsSearch')?.addEventListener('input', 
            this.debounce(() => this.loadMetrics(), 300));
        document.getElementById('metricTypeFilter')?.addEventListener('change', () => this.loadMetrics());
        document.getElementById('metricStatusFilter')?.addEventListener('change', () => this.loadMetrics());

        // Alert filters
        document.getElementById('alertLevelFilter')?.addEventListener('change', () => this.loadAlerts());
        document.getElementById('alertStatusFilter')?.addEventListener('change', () => this.loadAlerts());

        // Dashboard selection
        document.getElementById('dashboardSelect')?.addEventListener('change', (e) => {
            if (e.target.value) {
                this.loadDashboard(e.target.value);
            }
        });

        // Add metric button
        document.getElementById('addMetricBtn')?.addEventListener('click', () => {
            this.showAddMetricModal();
        });

        // Save metric button
        document.getElementById('saveMetricBtn')?.addEventListener('click', () => {
            this.saveMetric();
        });
    }

    async loadInitialData() {
        try {
            await Promise.all([
                this.loadSummaryData(),
                this.loadDashboards(),
                this.loadMetrics(),
                this.loadAlerts(),
                this.loadSystemHealth()
            ]);
        } catch (error) {
            console.error('Error loading initial data:', error);
            this.showAlert('خطأ في تحميل البيانات', 'error');
        }
    }

    async loadSummaryData() {
        try {
            const response = await fetch('/api/performance/dashboard', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) throw new Error('Failed to load summary data');

            const data = await response.json();
            
            if (data.success) {
                this.updateSummaryCards(data.summary);
            }
        } catch (error) {
            console.error('Error loading summary data:', error);
        }
    }

    updateSummaryCards(summary) {
        document.getElementById('totalMetrics').textContent = summary.total_metrics || 0;
        document.getElementById('activeMetrics').textContent = summary.active_metrics || 0;
        document.getElementById('activeAlerts').textContent = 
            (summary.critical_alerts || 0) + (summary.warning_alerts || 0);
        
        const healthPercentage = summary.total_systems > 0 
            ? Math.round((summary.healthy_systems / summary.total_systems) * 100)
            : 100;
        document.getElementById('systemHealth').textContent = `${healthPercentage}%`;
    }

    async loadDashboards() {
        try {
            const response = await fetch('/api/performance/dashboards', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) throw new Error('Failed to load dashboards');

            const data = await response.json();
            
            if (data.success) {
                this.populateDashboardSelect(data.dashboards);
            }
        } catch (error) {
            console.error('Error loading dashboards:', error);
        }
    }

    populateDashboardSelect(dashboards) {
        const select = document.getElementById('dashboardSelect');
        if (!select) return;

        select.innerHTML = '<option value="">اختر لوحة التحكم...</option>';
        
        dashboards.forEach(dashboard => {
            const option = document.createElement('option');
            option.value = dashboard.id;
            option.textContent = dashboard.name_ar || dashboard.name;
            if (dashboard.is_default) {
                option.selected = true;
            }
            select.appendChild(option);
        });

        // Load default dashboard if exists
        const defaultDashboard = dashboards.find(d => d.is_default);
        if (defaultDashboard) {
            this.loadDashboard(defaultDashboard.id);
        }
    }

    async loadDashboard(dashboardId) {
        try {
            const response = await fetch(`/api/performance/dashboards/${dashboardId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) throw new Error('Failed to load dashboard');

            const data = await response.json();
            
            if (data.success) {
                this.currentDashboard = data.dashboard;
                this.renderDashboardWidgets(data.dashboard.widgets);
            }
        } catch (error) {
            console.error('Error loading dashboard:', error);
            this.showAlert('خطأ في تحميل لوحة التحكم', 'error');
        }
    }

    renderDashboardWidgets(widgets) {
        const container = document.getElementById('dashboardWidgets');
        if (!container) return;

        container.innerHTML = '';

        if (!widgets || widgets.length === 0) {
            container.innerHTML = `
                <div class="col-12 text-center py-5">
                    <i class="fas fa-chart-line fa-3x text-muted mb-3"></i>
                    <h5 class="text-muted">لا توجد عناصر في لوحة التحكم</h5>
                    <p class="text-muted">قم بإضافة عناصر لعرض البيانات</p>
                </div>
            `;
            return;
        }

        widgets.forEach(widget => {
            const widgetElement = this.createWidgetElement(widget);
            container.appendChild(widgetElement);
        });
    }

    createWidgetElement(widget) {
        const div = document.createElement('div');
        div.className = `col-md-${Math.min(widget.width || 4, 12)}`;
        
        let content = '';
        
        if (widget.widget_type === 'counter') {
            content = `
                <div class="widget-container">
                    <h6>${widget.title_ar || widget.title}</h6>
                    <div class="metric-value text-primary">
                        ${widget.current_value || 0}
                        ${widget.metric?.unit || ''}
                    </div>
                    ${widget.metric?.target_value ? 
                        `<small class="text-muted">الهدف: ${widget.metric.target_value}</small>` : ''}
                </div>
            `;
        } else if (widget.widget_type === 'chart') {
            const chartId = `chart_${widget.id}`;
            content = `
                <div class="widget-container">
                    <h6>${widget.title_ar || widget.title}</h6>
                    <canvas id="${chartId}" style="max-height: 250px;"></canvas>
                </div>
            `;
            
            // Create chart after element is added to DOM
            setTimeout(() => {
                this.createChart(chartId, widget);
            }, 100);
        } else if (widget.widget_type === 'gauge') {
            content = `
                <div class="widget-container text-center">
                    <h6>${widget.title_ar || widget.title}</h6>
                    <div class="gauge-container">
                        <div class="metric-value text-info">
                            ${widget.current_value || 0}${widget.metric?.unit || ''}
                        </div>
                        <div class="progress mt-2">
                            <div class="progress-bar" style="width: ${this.calculateGaugePercentage(widget)}%"></div>
                        </div>
                    </div>
                </div>
            `;
        }
        
        div.innerHTML = content;
        return div;
    }

    createChart(chartId, widget) {
        const ctx = document.getElementById(chartId);
        if (!ctx) return;

        const chartData = widget.chart_data || [];
        
        const config = {
            type: 'line',
            data: {
                datasets: [{
                    label: widget.metric?.name_ar || widget.title_ar,
                    data: chartData,
                    borderColor: '#007bff',
                    backgroundColor: 'rgba(0, 123, 255, 0.1)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            parser: 'YYYY-MM-DDTHH:mm:ss'
                        }
                    },
                    y: {
                        beginAtZero: true
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        };

        this.charts[chartId] = new Chart(ctx, config);
    }

    calculateGaugePercentage(widget) {
        if (!widget.metric?.target_value || !widget.current_value) return 0;
        return Math.min((widget.current_value / widget.metric.target_value) * 100, 100);
    }

    async loadMetrics() {
        try {
            const params = new URLSearchParams({
                page: this.currentPage,
                per_page: this.itemsPerPage
            });

            // Add filters
            const search = document.getElementById('metricsSearch')?.value;
            const type = document.getElementById('metricTypeFilter')?.value;
            const status = document.getElementById('metricStatusFilter')?.value;

            if (search) params.append('search', search);
            if (type) params.append('type', type);
            if (status) params.append('status', status);

            const response = await fetch(`/api/performance/metrics?${params}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) throw new Error('Failed to load metrics');

            const data = await response.json();
            
            if (data.success) {
                this.renderMetricsTable(data.metrics);
                this.renderPagination('metricsPagination', data.pagination, () => this.loadMetrics());
            }
        } catch (error) {
            console.error('Error loading metrics:', error);
            this.showAlert('خطأ في تحميل المقاييس', 'error');
        }
    }

    renderMetricsTable(metrics) {
        const tbody = document.getElementById('metricsTableBody');
        if (!tbody) return;

        tbody.innerHTML = '';

        if (!metrics || metrics.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center py-4">
                        <i class="fas fa-search fa-2x text-muted mb-2"></i>
                        <p class="text-muted">لا توجد مقاييس</p>
                    </td>
                </tr>
            `;
            return;
        }

        metrics.forEach(metric => {
            const row = document.createElement('tr');
            
            const trendIcon = this.getTrendIcon(metric.trend_direction);
            const statusBadge = this.getStatusBadge(metric.status);
            
            row.innerHTML = `
                <td>
                    <strong>${metric.name_ar || metric.name}</strong>
                    <br><small class="text-muted">${metric.description || ''}</small>
                </td>
                <td>${this.translateMetricType(metric.metric_type)}</td>
                <td>
                    <span class="metric-value">${metric.latest_value || '-'}</span>
                    ${metric.unit ? `<small> ${metric.unit}</small>` : ''}
                </td>
                <td>${metric.target_value || '-'}</td>
                <td>${trendIcon}</td>
                <td>${statusBadge}</td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary" onclick="performanceManager.viewMetricDetails(${metric.id})">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-outline-secondary" onclick="performanceManager.editMetric(${metric.id})">
                            <i class="fas fa-edit"></i>
                        </button>
                    </div>
                </td>
            `;
            
            tbody.appendChild(row);
        });
    }

    getTrendIcon(direction) {
        const icons = {
            'up': '<i class="fas fa-arrow-up trend-up"></i> صاعد',
            'down': '<i class="fas fa-arrow-down trend-down"></i> هابط',
            'stable': '<i class="fas fa-minus trend-stable"></i> مستقر',
            'volatile': '<i class="fas fa-random trend-stable"></i> متقلب'
        };
        return icons[direction] || icons['stable'];
    }

    getStatusBadge(status) {
        const badges = {
            'active': '<span class="badge bg-success">نشط</span>',
            'paused': '<span class="badge bg-warning">متوقف</span>',
            'disabled': '<span class="badge bg-secondary">معطل</span>',
            'maintenance': '<span class="badge bg-info">صيانة</span>'
        };
        return badges[status] || badges['active'];
    }

    translateMetricType(type) {
        const translations = {
            'system_performance': 'أداء النظام',
            'user_activity': 'نشاط المستخدمين',
            'business_kpi': 'مؤشرات الأعمال',
            'therapy_outcome': 'نتائج العلاج',
            'financial': 'مالي',
            'operational': 'تشغيلي',
            'quality': 'جودة',
            'satisfaction': 'رضا'
        };
        return translations[type] || type;
    }

    async loadAlerts() {
        try {
            const params = new URLSearchParams({
                page: this.currentPage,
                per_page: this.itemsPerPage
            });

            const level = document.getElementById('alertLevelFilter')?.value;
            const isActive = document.getElementById('alertStatusFilter')?.value;

            if (level) params.append('level', level);
            if (isActive) params.append('is_active', isActive);

            const response = await fetch(`/api/performance/alerts?${params}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) throw new Error('Failed to load alerts');

            const data = await response.json();
            
            if (data.success) {
                this.renderAlertsList(data.alerts);
                this.renderPagination('alertsPagination', data.pagination, () => this.loadAlerts());
            }
        } catch (error) {
            console.error('Error loading alerts:', error);
            this.showAlert('خطأ في تحميل التنبيهات', 'error');
        }
    }

    renderAlertsList(alerts) {
        const container = document.getElementById('alertsList');
        if (!container) return;

        container.innerHTML = '';

        if (!alerts || alerts.length === 0) {
            container.innerHTML = `
                <div class="text-center py-5">
                    <i class="fas fa-bell-slash fa-3x text-muted mb-3"></i>
                    <h5 class="text-muted">لا توجد تنبيهات</h5>
                </div>
            `;
            return;
        }

        alerts.forEach(alert => {
            const alertElement = this.createAlertElement(alert);
            container.appendChild(alertElement);
        });
    }

    createAlertElement(alert) {
        const div = document.createElement('div');
        div.className = `alert alert-${this.getAlertClass(alert.alert_level)} alert-dismissible mb-3`;
        
        const timeAgo = this.formatTimeAgo(alert.triggered_at);
        
        div.innerHTML = `
            <div class="d-flex justify-content-between align-items-start">
                <div>
                    <h6 class="alert-heading mb-1">${alert.title}</h6>
                    <p class="mb-1">${alert.message}</p>
                    <small class="text-muted">
                        <i class="fas fa-clock"></i> ${timeAgo}
                        ${alert.metric ? `• ${alert.metric.name_ar}` : ''}
                    </small>
                </div>
                <div class="btn-group btn-group-sm">
                    ${alert.is_active ? `
                        <button class="btn btn-outline-success" onclick="performanceManager.acknowledgeAlert(${alert.id})">
                            <i class="fas fa-check"></i> تأكيد
                        </button>
                    ` : `
                        <span class="badge bg-success">مؤكد</span>
                    `}
                </div>
            </div>
        `;
        
        return div;
    }

    getAlertClass(level) {
        const classes = {
            'critical': 'danger',
            'warning': 'warning',
            'info': 'info',
            'error': 'danger'
        };
        return classes[level] || 'info';
    }

    async loadSystemHealth() {
        try {
            const response = await fetch('/api/performance/health', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) throw new Error('Failed to load system health');

            const data = await response.json();
            
            if (data.success) {
                this.renderSystemHealth(data.health_checks, data.overall_health);
            }
        } catch (error) {
            console.error('Error loading system health:', error);
        }
    }

    renderSystemHealth(healthChecks, overallHealth) {
        const container = document.getElementById('healthChecks');
        if (!container) return;

        container.innerHTML = '';

        if (!healthChecks || healthChecks.length === 0) {
            container.innerHTML = `
                <div class="col-12 text-center py-5">
                    <i class="fas fa-heartbeat fa-3x text-muted mb-3"></i>
                    <h5 class="text-muted">لا توجد فحوصات صحة النظام</h5>
                </div>
            `;
            return;
        }

        healthChecks.forEach(check => {
            const checkElement = this.createHealthCheckElement(check);
            container.appendChild(checkElement);
        });
    }

    createHealthCheckElement(check) {
        const div = document.createElement('div');
        div.className = 'col-md-4 mb-3';
        
        const statusClass = check.is_healthy ? 'success' : 'danger';
        const statusIcon = check.is_healthy ? 'check-circle' : 'exclamation-circle';
        
        div.innerHTML = `
            <div class="card">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <h6 class="card-title mb-0">${check.check_name}</h6>
                        <i class="fas fa-${statusIcon} text-${statusClass}"></i>
                    </div>
                    <p class="card-text">
                        <small class="text-muted">${check.check_type}</small>
                    </p>
                    <div class="row text-center">
                        <div class="col-6">
                            <small class="text-muted">وقت الاستجابة</small>
                            <div>${check.response_time_ms || 0} ms</div>
                        </div>
                        <div class="col-6">
                            <small class="text-muted">التوفر</small>
                            <div>${check.availability_percentage || 0}%</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        return div;
    }

    async acknowledgeAlert(alertId) {
        try {
            const response = await fetch(`/api/performance/alerts/${alertId}/acknowledge`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) throw new Error('Failed to acknowledge alert');

            const data = await response.json();
            
            if (data.success) {
                this.showAlert('تم تأكيد التنبيه بنجاح', 'success');
                this.loadAlerts();
            }
        } catch (error) {
            console.error('Error acknowledging alert:', error);
            this.showAlert('خطأ في تأكيد التنبيه', 'error');
        }
    }

    showAddMetricModal() {
        const modal = new bootstrap.Modal(document.getElementById('addMetricModal'));
        modal.show();
    }

    async saveMetric() {
        try {
            const form = document.getElementById('addMetricForm');
            const formData = new FormData(form);
            
            const metricData = {};
            for (let [key, value] of formData.entries()) {
                if (value) {
                    metricData[key] = value;
                }
            }

            const response = await fetch('/api/performance/metrics', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(metricData)
            });

            if (!response.ok) throw new Error('Failed to save metric');

            const data = await response.json();
            
            if (data.success) {
                this.showAlert('تم حفظ المقياس بنجاح', 'success');
                bootstrap.Modal.getInstance(document.getElementById('addMetricModal')).hide();
                form.reset();
                this.loadMetrics();
            }
        } catch (error) {
            console.error('Error saving metric:', error);
            this.showAlert('خطأ في حفظ المقياس', 'error');
        }
    }

    handleTabSwitch(tabName) {
        switch (tabName) {
            case 'dashboardTab':
                if (this.currentDashboard) {
                    this.loadDashboard(this.currentDashboard.id);
                }
                break;
            case 'metricsTab':
                this.loadMetrics();
                break;
            case 'alertsTab':
                this.loadAlerts();
                break;
            case 'healthTab':
                this.loadSystemHealth();
                break;
        }
    }

    startAutoRefresh() {
        // Refresh every 5 minutes
        this.refreshInterval = setInterval(() => {
            this.loadSummaryData();
            if (this.currentDashboard) {
                this.loadDashboard(this.currentDashboard.id);
            }
        }, 300000);
    }

    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }

    renderPagination(containerId, pagination, callback) {
        const container = document.getElementById(containerId);
        if (!container) return;

        if (pagination.pages <= 1) {
            container.innerHTML = '';
            return;
        }

        let paginationHTML = '<ul class="pagination justify-content-center">';
        
        // Previous button
        paginationHTML += `
            <li class="page-item ${pagination.page === 1 ? 'disabled' : ''}">
                <a class="page-link" href="#" data-page="${pagination.page - 1}">السابق</a>
            </li>
        `;
        
        // Page numbers
        for (let i = 1; i <= pagination.pages; i++) {
            if (i === pagination.page || 
                i === 1 || 
                i === pagination.pages || 
                (i >= pagination.page - 2 && i <= pagination.page + 2)) {
                paginationHTML += `
                    <li class="page-item ${i === pagination.page ? 'active' : ''}">
                        <a class="page-link" href="#" data-page="${i}">${i}</a>
                    </li>
                `;
            } else if (i === pagination.page - 3 || i === pagination.page + 3) {
                paginationHTML += '<li class="page-item disabled"><span class="page-link">...</span></li>';
            }
        }
        
        // Next button
        paginationHTML += `
            <li class="page-item ${pagination.page === pagination.pages ? 'disabled' : ''}">
                <a class="page-link" href="#" data-page="${pagination.page + 1}">التالي</a>
            </li>
        `;
        
        paginationHTML += '</ul>';
        container.innerHTML = paginationHTML;
        
        // Bind pagination events
        container.querySelectorAll('.page-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = parseInt(e.target.getAttribute('data-page'));
                if (page && page !== this.currentPage) {
                    this.currentPage = page;
                    callback();
                }
            });
        });
    }

    formatTimeAgo(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);
        
        if (diffInSeconds < 60) return 'منذ لحظات';
        if (diffInSeconds < 3600) return `منذ ${Math.floor(diffInSeconds / 60)} دقيقة`;
        if (diffInSeconds < 86400) return `منذ ${Math.floor(diffInSeconds / 3600)} ساعة`;
        return `منذ ${Math.floor(diffInSeconds / 86400)} يوم`;
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
                alertDiv.remove();
            }
        }, 5000);
    }

    exportData() {
        // Implementation for data export
        this.showAlert('جاري تحضير البيانات للتصدير...', 'info');
    }

    viewMetricDetails(metricId) {
        // Implementation for viewing metric details
        console.log('View metric details:', metricId);
    }

    editMetric(metricId) {
        // Implementation for editing metric
        console.log('Edit metric:', metricId);
    }
}

// Initialize the performance monitoring manager when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.performanceManager = new PerformanceMonitoringManager();
});

// Cleanup on page unload
window.addEventListener('beforeunload', function() {
    if (window.performanceManager) {
        window.performanceManager.stopAutoRefresh();
    }
});
