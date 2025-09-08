/**
 * نظام إدارة علاقات العملاء - CRM Management Dashboard
 * يدير جميع وظائف لوحة التحكم التحليلية الشاملة
 */

class CRMDashboardManager {
    constructor() {
        this.charts = {};
        this.data = {};
        this.refreshInterval = null;
        this.init();
    }

    /**
     * تهيئة النظام
     */
    async init() {
        try {
            this.showLoading(true);
            await this.loadDashboardData();
            this.initializeCharts();
            this.setupEventListeners();
            this.startAutoRefresh();
            this.showLoading(false);
        } catch (error) {
            console.error('خطأ في تهيئة النظام:', error);
            this.showAlert('خطأ في تحميل البيانات', 'danger');
            this.showLoading(false);
        }
    }

    /**
     * تحميل بيانات لوحة التحكم
     */
    async loadDashboardData() {
        try {
            const [
                customersData,
                leadsData,
                opportunitiesData,
                activitiesData,
                communicationsData,
                campaignsData,
                supportData,
                reportsData
            ] = await Promise.all([
                this.fetchData('/api/crm/customers/analytics'),
                this.fetchData('/api/crm/leads/analytics'),
                this.fetchData('/api/crm/opportunities/analytics'),
                this.fetchData('/api/crm/activities/analytics'),
                this.fetchData('/api/crm/communications/analytics'),
                this.fetchData('/api/crm/campaigns/analytics'),
                this.fetchData('/api/crm/support/analytics'),
                this.fetchData('/api/crm/reports/sales-summary')
            ]);

            this.data = {
                customers: customersData,
                leads: leadsData,
                opportunities: opportunitiesData,
                activities: activitiesData,
                communications: communicationsData,
                campaigns: campaignsData,
                support: supportData,
                reports: reportsData
            };

            this.updateStatistics();
            this.loadRecentActivities();

        } catch (error) {
            console.error('خطأ في تحميل البيانات:', error);
            throw error;
        }
    }

    /**
     * جلب البيانات من API
     */
    async fetchData(url) {
        try {
            const token = localStorage.getItem('access_token');
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            return result.success ? result : { analytics: {}, overview: {} };
        } catch (error) {
            console.error(`خطأ في جلب البيانات من ${url}:`, error);
            return { analytics: {}, overview: {} };
        }
    }

    /**
     * تحديث الإحصائيات
     */
    updateStatistics() {
        try {
            // إحصائيات العملاء
            const customersStats = this.data.customers.analytics?.overview || {};
            document.getElementById('totalCustomers').textContent = 
                this.formatNumber(customersStats.total_customers || 0);
            document.getElementById('customersGrowth').textContent = 
                `+${customersStats.growth_rate || 0}%`;

            // إحصائيات العملاء المحتملين
            const leadsStats = this.data.leads.analytics?.overview || {};
            document.getElementById('totalLeads').textContent = 
                this.formatNumber(leadsStats.total_leads || 0);
            document.getElementById('leadsGrowth').textContent = 
                `+${leadsStats.growth_rate || 0}%`;

            // إحصائيات الفرص التجارية
            const opportunitiesStats = this.data.opportunities.analytics?.overview || {};
            document.getElementById('totalOpportunities').textContent = 
                this.formatNumber(opportunitiesStats.total_opportunities || 0);
            document.getElementById('opportunitiesGrowth').textContent = 
                `+${opportunitiesStats.growth_rate || 0}%`;

            // إحصائيات الإيرادات
            const reportsStats = this.data.reports.summary || {};
            document.getElementById('totalRevenue').textContent = 
                `${this.formatCurrency(reportsStats.total_sales || 0)} ر.س`;
            document.getElementById('revenueGrowth').textContent = 
                `+${reportsStats.growth_rate || 0}%`;

            // إحصائيات الأنشطة
            const activitiesStats = this.data.activities.analytics?.overview || {};
            document.getElementById('totalActivities').textContent = 
                this.formatNumber(activitiesStats.total_activities || 0);
            document.getElementById('activitiesGrowth').textContent = 
                `+${activitiesStats.growth_rate || 0}%`;

            // إحصائيات التواصل
            const communicationsStats = this.data.communications.analytics?.overview || {};
            document.getElementById('totalCommunications').textContent = 
                this.formatNumber(communicationsStats.total_communications || 0);
            document.getElementById('communicationsGrowth').textContent = 
                `+${communicationsStats.growth_rate || 0}%`;

            // إحصائيات الحملات
            const campaignsStats = this.data.campaigns.analytics?.overview || {};
            document.getElementById('totalCampaigns').textContent = 
                this.formatNumber(campaignsStats.total_campaigns || 0);
            document.getElementById('campaignsGrowth').textContent = 
                `+${campaignsStats.growth_rate || 0}%`;

            // إحصائيات الدعم
            const supportStats = this.data.support.analytics?.overview || {};
            document.getElementById('totalTickets').textContent = 
                this.formatNumber(supportStats.total_tickets || 0);
            document.getElementById('ticketsGrowth').textContent = 
                `+${supportStats.growth_rate || 0}%`;

        } catch (error) {
            console.error('خطأ في تحديث الإحصائيات:', error);
        }
    }

    /**
     * تهيئة الرسوم البيانية
     */
    initializeCharts() {
        this.createSalesTrendChart();
        this.createCustomerDistributionChart();
        this.createSalesFunnelChart();
        this.createTeamPerformanceChart();
        this.createRevenueAnalysisChart();
        this.createCampaignPerformanceChart();
        this.createConversionRatesChart();
        this.createSupportStatsChart();
        this.createResponseTimeChart();
    }

    /**
     * رسم بياني لاتجاهات المبيعات
     */
    createSalesTrendChart() {
        const ctx = document.getElementById('salesTrendChart');
        if (!ctx) return;

        const monthlyData = this.data.reports.monthly_breakdown || [];
        const labels = monthlyData.map(item => `${item.month}/${item.year}`);
        const salesData = monthlyData.map(item => item.total_sales || 0);

        this.charts.salesTrend = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'المبيعات الشهرية',
                    data: salesData,
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4
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
                        beginAtZero: true,
                        ticks: {
                            callback: (value) => this.formatCurrency(value) + ' ر.س'
                        }
                    }
                }
            }
        });
    }

    /**
     * رسم بياني لتوزيع العملاء
     */
    createCustomerDistributionChart() {
        const ctx = document.getElementById('customerDistributionChart');
        if (!ctx) return;

        const customersByType = this.data.customers.analytics?.customers_by_type || [];
        const labels = customersByType.map(item => item.type || 'غير محدد');
        const data = customersByType.map(item => item.count || 0);

        this.charts.customerDistribution = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: [
                        '#28a745',
                        '#ffc107',
                        '#17a2b8',
                        '#6f42c1',
                        '#fd7e14'
                    ]
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

    /**
     * رسم بياني لقمع المبيعات
     */
    createSalesFunnelChart() {
        const ctx = document.getElementById('salesFunnelChart');
        if (!ctx) return;

        const pipelineData = this.data.opportunities.analytics?.pipeline_data || [];
        const labels = pipelineData.map(item => item.stage || 'غير محدد');
        const data = pipelineData.map(item => item.count || 0);

        this.charts.salesFunnel = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'عدد الفرص',
                    data: data,
                    backgroundColor: [
                        '#28a745',
                        '#ffc107',
                        '#17a2b8',
                        '#6f42c1',
                        '#dc3545'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y',
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    /**
     * رسم بياني لأداء الفريق
     */
    createTeamPerformanceChart() {
        const ctx = document.getElementById('teamPerformanceChart');
        if (!ctx) return;

        const teamData = this.data.activities.analytics?.activities_by_user || [];
        const labels = teamData.map(item => item.user || 'غير محدد');
        const completedData = teamData.map(item => item.completed || 0);
        const totalData = teamData.map(item => item.total || 0);

        this.charts.teamPerformance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'المكتملة',
                        data: completedData,
                        backgroundColor: '#28a745'
                    },
                    {
                        label: 'الإجمالي',
                        data: totalData,
                        backgroundColor: '#6c757d'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    /**
     * رسم بياني لتحليل الإيرادات
     */
    createRevenueAnalysisChart() {
        const ctx = document.getElementById('revenueAnalysisChart');
        if (!ctx) return;

        const monthlyData = this.data.reports.monthly_breakdown || [];
        const labels = monthlyData.map(item => `${item.month}/${item.year}`);
        const revenueData = monthlyData.map(item => item.total_sales || 0);
        const targetData = monthlyData.map(item => (item.total_sales || 0) * 1.2); // هدف 20% أعلى

        this.charts.revenueAnalysis = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'الإيرادات الفعلية',
                        data: revenueData,
                        borderColor: '#28a745',
                        backgroundColor: 'rgba(40, 167, 69, 0.1)',
                        borderWidth: 3,
                        fill: true
                    },
                    {
                        label: 'الهدف',
                        data: targetData,
                        borderColor: '#ffc107',
                        borderWidth: 2,
                        borderDash: [5, 5],
                        fill: false
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: (value) => this.formatCurrency(value) + ' ر.س'
                        }
                    }
                }
            }
        });
    }

    /**
     * رسم بياني لأداء الحملات
     */
    createCampaignPerformanceChart() {
        const ctx = document.getElementById('campaignPerformanceChart');
        if (!ctx) return;

        const campaignsByType = this.data.campaigns.analytics?.campaigns_by_type || [];
        const labels = campaignsByType.map(item => item.type || 'غير محدد');
        const data = campaignsByType.map(item => item.count || 0);

        this.charts.campaignPerformance = new Chart(ctx, {
            type: 'radar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'عدد الحملات',
                    data: data,
                    borderColor: '#e83e8c',
                    backgroundColor: 'rgba(232, 62, 140, 0.2)',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    r: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    /**
     * رسم بياني لمعدلات التحويل
     */
    createConversionRatesChart() {
        const ctx = document.getElementById('conversionRatesChart');
        if (!ctx) return;

        const conversionData = this.data.leads.analytics?.conversion_by_source || [];
        const labels = conversionData.map(item => item.source || 'غير محدد');
        const rates = conversionData.map(item => item.conversion_rate || 0);

        this.charts.conversionRates = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'معدل التحويل (%)',
                    data: rates,
                    backgroundColor: '#17a2b8'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        ticks: {
                            callback: (value) => value + '%'
                        }
                    }
                }
            }
        });
    }

    /**
     * رسم بياني لإحصائيات الدعم
     */
    createSupportStatsChart() {
        const ctx = document.getElementById('supportStatsChart');
        if (!ctx) return;

        const ticketsByPriority = this.data.support.analytics?.tickets_by_priority || [];
        const labels = ticketsByPriority.map(item => item.priority || 'غير محدد');
        const data = ticketsByPriority.map(item => item.count || 0);

        this.charts.supportStats = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: [
                        '#dc3545',
                        '#ffc107',
                        '#28a745'
                    ]
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

    /**
     * رسم بياني لأوقات الاستجابة
     */
    createResponseTimeChart() {
        const ctx = document.getElementById('responseTimeChart');
        if (!ctx) return;

        const supportOverview = this.data.support.analytics?.overview || {};
        const avgResponseTime = supportOverview.avg_resolution_hours || 0;
        const targetTime = 24; // هدف 24 ساعة

        this.charts.responseTime = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['متوسط الاستجابة', 'الهدف المتبقي'],
                datasets: [{
                    data: [avgResponseTime, Math.max(0, targetTime - avgResponseTime)],
                    backgroundColor: [
                        avgResponseTime <= targetTime ? '#28a745' : '#dc3545',
                        '#e9ecef'
                    ]
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

    /**
     * تحميل الأنشطة الأخيرة
     */
    async loadRecentActivities() {
        try {
            const activitiesData = await this.fetchData('/api/crm/activities/recent');
            const activities = activitiesData.activities || [];
            
            const container = document.getElementById('recentActivitiesList');
            if (!container) return;

            if (activities.length === 0) {
                container.innerHTML = '<p class="text-muted text-center">لا توجد أنشطة حديثة</p>';
                return;
            }

            container.innerHTML = activities.map(activity => `
                <div class="activity-item ${activity.type || 'default'}">
                    <div class="d-flex justify-content-between align-items-start">
                        <div>
                            <h6 class="mb-1">${activity.title || 'نشاط غير محدد'}</h6>
                            <p class="mb-1 text-muted small">${activity.description || ''}</p>
                            <small class="text-muted">
                                <i class="fas fa-user me-1"></i>${activity.assigned_to || 'غير محدد'}
                                <i class="fas fa-clock me-1 ms-3"></i>${this.formatDate(activity.created_at)}
                            </small>
                        </div>
                        <span class="badge bg-${this.getStatusColor(activity.status)} rounded-pill">
                            ${this.getStatusText(activity.status)}
                        </span>
                    </div>
                </div>
            `).join('');

        } catch (error) {
            console.error('خطأ في تحميل الأنشطة الأخيرة:', error);
        }
    }

    /**
     * إعداد مستمعي الأحداث
     */
    setupEventListeners() {
        // تحديث البيانات عند تغيير التبويب
        document.querySelectorAll('#crmTabs button[data-bs-toggle="tab"]').forEach(tab => {
            tab.addEventListener('shown.bs.tab', (event) => {
                const targetTab = event.target.getAttribute('data-bs-target');
                this.handleTabChange(targetTab);
            });
        });

        // تحديث الرسوم البيانية عند تغيير حجم النافذة
        window.addEventListener('resize', () => {
            Object.values(this.charts).forEach(chart => {
                if (chart && typeof chart.resize === 'function') {
                    chart.resize();
                }
            });
        });
    }

    /**
     * معالجة تغيير التبويب
     */
    handleTabChange(targetTab) {
        // تحديث الرسوم البيانية حسب التبويب المحدد
        setTimeout(() => {
            Object.values(this.charts).forEach(chart => {
                if (chart && typeof chart.resize === 'function') {
                    chart.resize();
                }
            });
        }, 100);
    }

    /**
     * بدء التحديث التلقائي
     */
    startAutoRefresh() {
        // تحديث البيانات كل 5 دقائق
        this.refreshInterval = setInterval(() => {
            this.refreshDashboard();
        }, 300000);
    }

    /**
     * تحديث لوحة التحكم
     */
    async refreshDashboard() {
        try {
            this.showAlert('جاري تحديث البيانات...', 'info', 2000);
            await this.loadDashboardData();
            this.updateCharts();
            this.showAlert('تم تحديث البيانات بنجاح', 'success', 3000);
        } catch (error) {
            console.error('خطأ في تحديث البيانات:', error);
            this.showAlert('خطأ في تحديث البيانات', 'danger');
        }
    }

    /**
     * تحديث الرسوم البيانية
     */
    updateCharts() {
        Object.values(this.charts).forEach(chart => {
            if (chart && typeof chart.update === 'function') {
                chart.update();
            }
        });
    }

    /**
     * تصدير التقرير
     */
    async exportReport() {
        try {
            this.showAlert('جاري تحضير التقرير...', 'info');
            
            const reportData = {
                date: new Date().toISOString(),
                statistics: this.data,
                charts: Object.keys(this.charts)
            };

            // إنشاء ملف JSON للتصدير
            const dataStr = JSON.stringify(reportData, null, 2);
            const dataBlob = new Blob([dataStr], {type: 'application/json'});
            
            const link = document.createElement('a');
            link.href = URL.createObjectURL(dataBlob);
            link.download = `crm_report_${new Date().toISOString().split('T')[0]}.json`;
            link.click();

            this.showAlert('تم تصدير التقرير بنجاح', 'success');
        } catch (error) {
            console.error('خطأ في تصدير التقرير:', error);
            this.showAlert('خطأ في تصدير التقرير', 'danger');
        }
    }

    /**
     * عرض/إخفاء مؤشر التحميل
     */
    showLoading(show) {
        const spinner = document.getElementById('loadingSpinner');
        const container = document.getElementById('statsContainer');
        
        if (spinner && container) {
            spinner.style.display = show ? 'block' : 'none';
            container.style.display = show ? 'none' : 'block';
        }
    }

    /**
     * عرض التنبيهات
     */
    showAlert(message, type = 'info', duration = 5000) {
        const container = document.getElementById('alertContainer');
        if (!container) return;

        const alertId = 'alert_' + Date.now();
        const alertHtml = `
            <div id="${alertId}" class="alert alert-${type} alert-custom alert-dismissible fade show" role="alert">
                <i class="fas fa-${this.getAlertIcon(type)} me-2"></i>
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;

        container.insertAdjacentHTML('beforeend', alertHtml);

        if (duration > 0) {
            setTimeout(() => {
                const alert = document.getElementById(alertId);
                if (alert) {
                    alert.remove();
                }
            }, duration);
        }
    }

    /**
     * الحصول على أيقونة التنبيه
     */
    getAlertIcon(type) {
        const icons = {
            'success': 'check-circle',
            'danger': 'exclamation-triangle',
            'warning': 'exclamation-circle',
            'info': 'info-circle'
        };
        return icons[type] || 'info-circle';
    }

    /**
     * الحصول على لون الحالة
     */
    getStatusColor(status) {
        const colors = {
            'completed': 'success',
            'in_progress': 'warning',
            'pending': 'secondary',
            'cancelled': 'danger'
        };
        return colors[status] || 'secondary';
    }

    /**
     * الحصول على نص الحالة
     */
    getStatusText(status) {
        const texts = {
            'completed': 'مكتمل',
            'in_progress': 'قيد التنفيذ',
            'pending': 'معلق',
            'cancelled': 'ملغي'
        };
        return texts[status] || 'غير محدد';
    }

    /**
     * تنسيق الأرقام
     */
    formatNumber(num) {
        return new Intl.NumberFormat('ar-SA').format(num);
    }

    /**
     * تنسيق العملة
     */
    formatCurrency(amount) {
        return new Intl.NumberFormat('ar-SA', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    }

    /**
     * تنسيق التاريخ
     */
    formatDate(dateString) {
        if (!dateString) return 'غير محدد';
        
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('ar-SA', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    }

    /**
     * تنظيف الموارد
     */
    destroy() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }

        Object.values(this.charts).forEach(chart => {
            if (chart && typeof chart.destroy === 'function') {
                chart.destroy();
            }
        });

        this.charts = {};
        this.data = {};
    }
}

// متغيرات عامة
let crmDashboard;

// تهيئة النظام عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', function() {
    crmDashboard = new CRMDashboardManager();
});

// وظائف عامة للاستخدام في HTML
function refreshDashboard() {
    if (crmDashboard) {
        crmDashboard.refreshDashboard();
    }
}

function exportReport() {
    if (crmDashboard) {
        crmDashboard.exportReport();
    }
}

// تنظيف الموارد عند مغادرة الصفحة
window.addEventListener('beforeunload', function() {
    if (crmDashboard) {
        crmDashboard.destroy();
    }
});
